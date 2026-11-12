import {Codex} from '@openai/codex-sdk';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {reasoningOptions} from './reasoning.mjs';
import {providerConfig} from './provider.mjs';
import {buildAgentPrompt,referencePlan} from './prompts.mjs';
import {writeTaskAssets,restoreTaskAssets} from './task-assets.mjs';
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
  // References link to nested cases and image boards; preserve those paths.
  await fs.cp(path.join(source,'references'),path.join(dir,'skill','references'),{recursive:true,filter:async file=>{const stat=await fs.lstat(file);return !stat.isSymbolicLink()&&(stat.isDirectory()||/\.(md|png|jpe?g|webp|svg)$/i.test(file));}});
  for(const name of plan.inline)result.references.push({name,text:await fs.readFile(path.join(source,'references',name),'utf8')});
 }else{
  for(const ref of plan.optional){try{await fs.copyFile(path.join(source,'references',ref.name),path.join(dir,'skill','references',ref.name));result.referenceIndex.push(ref);}catch(e){if(e.code!=='ENOENT')throw e;result.warnings.push('设计参考不可用：'+ref.name);}}
 }
 return result;
}
export async function runAgent({task,dir,config,signal,onEvent,onUsage=()=>{},skill,toolHost,draft},CodexClient=Codex){
 const taskAssets=await writeTaskAssets(task,dir);
 // Separate home avoids inheriting unrelated project history, MCP servers or provider configuration.
 const agentHome=path.join(dir,'agent-home');await fs.mkdir(agentHome,{recursive:true});
 const env={};for(const key of ['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','ProgramFiles','ComSpec','PATHEXT'])if(process.env[key])env[key]=process.env[key];
 env.CODEX_HOME=agentHome;
 const prepared=buildAgentPrompt(task,skill);
 await fs.writeFile(path.join(dir,'system-instructions.md'),prepared.instructions);
 const autonomous=task.executionMode==='autonomous'&&task.taskType!=='ask';
 if(autonomous&&(!toolHost||!draft))throw Error('自主草稿工具未初始化');
 const toolConfig=autonomous?{mcp_servers:{figure:{command:process.execPath,args:[fileURLToPath(new URL('./mcp-stdio.mjs',import.meta.url))],env:{FIGURE_TOOL_URL:toolHost.url,FIGURE_TOOL_TOKEN:toolHost.token,ELECTRON_RUN_AS_NODE:'1'},startup_timeout_sec:20,tool_timeout_sec:90}}}:{};
 const codex=new CodexClient({apiKey:config.apiKey,env,config:{...providerConfig(config.baseUrl),...toolConfig,developer_instructions:prepared.instructions}});
 const thread=codex.startThread({model:config.model,...reasoningOptions(config),workingDirectory:dir,skipGitRepoCheck:true,sandboxMode:'read-only',approvalPolicy:'never',webSearchMode:'disabled',networkAccessEnabled:false});
 const asking=task.taskType==='ask';
 const prompt=prepared.input+(draft?.resumed?'\nRECOVERY: The host restored the saved draft at revision '+draft.revision+'. The task scene is the original baseline, NOT the current draft. The attached image shows the restored draft. First call get_scene/get_evidence/get_review as applicable. Continue existing work; do not recreate objects already present. Use new requestIds for new commands. Render/check the current version before committing.':'');
 const schema=asking?{type:'object',additionalProperties:false,required:['answer'],properties:{answer:{type:'string'}}}:autonomous?{type:'object',additionalProperties:false,required:['summary','warnings'],properties:{summary:{type:'string'},warnings:{type:'array',items:{type:'string'}}}}:outputSchema;
 const {events}=await thread.runStreamed([{type:'text',text:prompt},{type:'local_image',path:path.join(dir,draft?.resumed?'draft-preview.png':'before.png')}],{signal,outputSchema:schema});
 let final='',usage=null;
 for await(const event of events){
  if(event.type==='thread.started')onEvent('Agent 已启动');
  if(event.type==='item.started')onEvent(event.item.type==='command_execution'?'Agent 正在读取任务材料':'Agent 正在分析与设计');
  if(event.type==='item.completed'&&event.item.type==='agent_message')final=event.item.text;
  if(event.type==='turn.completed'){usage=event.usage;await onUsage(usage);}
  if(event.type==='turn.failed')throw Error(event.error.message);
  if(event.type==='error')throw Error(event.message);
 }
 if(autonomous){if(!draft.result)throw Error('Agent 尚未完成草稿的渲染、检查与提交');return{result:draft.result,usage};}
 if(!final)throw Error(asking?'Agent 未返回回答':'Agent 未返回图元操作');
 return{result:restoreTaskAssets(JSON.parse(final),taskAssets),usage};
}
