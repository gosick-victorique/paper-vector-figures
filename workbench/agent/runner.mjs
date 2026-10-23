import {Codex} from '@openai/codex-sdk';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {reasoningOptions} from './reasoning.mjs';
import {providerConfig} from './provider.mjs';
import {buildAgentPrompt,referencePlan} from './prompts.mjs';
export {buildPrompt,buildQuestionPrompt,buildAgentPrompt} from './prompts.mjs';
const outputSchema={
 type:'object',additionalProperties:false,required:['baseRevision','summary','warnings','operations'],
 properties:{
  baseRevision:{type:'string'},summary:{type:'string'},warnings:{type:'array',items:{type:'string'}},
  operations:{type:'array',items:{type:'object',additionalProperties:false,required:['op','id','payload'],properties:{op:{type:'string',enum:['update','insert','remove']},id:{type:'string'},payload:{type:'string'}}}}
 }
};
const skillDefault=path.join(os.homedir(),'.codex','skills','paper-vector-figures');
export async function prepareSkill(dir,task={taskType:'generate'}){
 const source=process.env.FIGURE_SKILL_PATH||skillDefault,plan=referencePlan(task);
 const result={version:null,sha256:null,main:'',references:[],referenceIndex:[],warnings:[]};
 if(!plan.includeMain&&!plan.optional.length)return result;
 await fs.mkdir(path.join(dir,'skill','references'),{recursive:true});
 if(plan.includeMain){
  result.main=await fs.readFile(path.join(source,'SKILL.md'),'utf8');
  result.version=result.main.match(/version:\s*"([^"]+)"/)?.[1]||'unknown';result.sha256=createHash('sha256').update(result.main).digest('hex');
  await fs.writeFile(path.join(dir,'skill','SKILL.md'),result.main);
  // Make the original skill's Markdown references available without injecting all of them.
  for(const entry of await fs.readdir(path.join(source,'references'),{withFileTypes:true}))if(entry.isFile()&&entry.name.endsWith('.md'))await fs.copyFile(path.join(source,'references',entry.name),path.join(dir,'skill','references',entry.name));
  for(const name of plan.inline)result.references.push({name,text:await fs.readFile(path.join(source,'references',name),'utf8')});
 }else{
  for(const ref of plan.optional){try{await fs.copyFile(path.join(source,'references',ref.name),path.join(dir,'skill','references',ref.name));result.referenceIndex.push(ref);}catch(e){if(e.code!=='ENOENT')throw e;result.warnings.push('设计参考不可用：'+ref.name);}}
 }
 return result;
}
export async function runAgent({task,dir,config,signal,onEvent,skill},CodexClient=Codex){
 // Separate home avoids inheriting unrelated project history, MCP servers or provider configuration.
 const agentHome=path.join(dir,'agent-home');await fs.mkdir(agentHome,{recursive:true});
 const env={};for(const key of ['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','ProgramFiles','ComSpec','PATHEXT'])if(process.env[key])env[key]=process.env[key];
 env.CODEX_HOME=agentHome;
 const prepared=buildAgentPrompt(task,skill);
 await fs.writeFile(path.join(dir,'system-instructions.md'),prepared.instructions);
 const codex=new CodexClient({apiKey:config.apiKey,env,config:{...providerConfig(config.baseUrl),developer_instructions:prepared.instructions}});
 const thread=codex.startThread({model:config.model,...reasoningOptions(config),workingDirectory:dir,skipGitRepoCheck:true,sandboxMode:'read-only',approvalPolicy:'never',webSearchMode:'disabled',networkAccessEnabled:false});
 const asking=task.taskType==='ask';
 const prompt=prepared.input;
 const schema=asking?{type:'object',additionalProperties:false,required:['answer'],properties:{answer:{type:'string'}}}:outputSchema;
 const {events}=await thread.runStreamed([{type:'text',text:prompt},{type:'local_image',path:path.join(dir,'before.png')}],{signal,outputSchema:schema});
 let final='',usage=null;
 for await(const event of events){
  if(event.type==='thread.started')onEvent('Agent 已启动');
  if(event.type==='item.started')onEvent(event.item.type==='command_execution'?'Agent 正在读取任务材料':'Agent 正在分析与设计');
  if(event.type==='item.completed'&&event.item.type==='agent_message')final=event.item.text;
  if(event.type==='turn.completed')usage=event.usage;
  if(event.type==='turn.failed')throw Error(event.error.message);
  if(event.type==='error')throw Error(event.message);
 }
 if(!final)throw Error(asking?'Agent 未返回回答':'Agent 未返回图元操作');
 return{result:JSON.parse(final),usage};
}
