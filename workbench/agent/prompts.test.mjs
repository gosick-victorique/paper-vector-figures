import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {buildAgentPrompt,referencePlan,promptProfile} from './prompts.mjs';
import {prepareSkill,runAgent} from './runner.mjs';
const original={main:'ORIGINAL_SKILL_SENTINEL',references:[{name:'layout.md',text:'FULL_GENERATION_REFERENCE'}],referenceIndex:[{name:'spatial-exploration.md',purpose:'三维重绘'}]};
test('generation uses original skill; modification and Q&A do not inherit its workflow',()=>{
 const generate=buildAgentPrompt({taskType:'generate',paperContent:'paper'},original),edit=buildAgentPrompt({taskType:'edit',editMode:'redraw',generationPrompt:'OLD_INITIAL_REQUEST',pendingSelectionNote:'只重绘编码器'},original),ask=buildAgentPrompt({taskType:'ask',question:'解释这个模块'},original);
 assert.match(generate.input,/ORIGINAL_SKILL_SENTINEL/);assert.match(generate.input,/FULL_GENERATION_REFERENCE/);
 for(const p of [edit,ask]){assert.doesNotMatch(p.instructions+p.input,/ORIGINAL_SKILL_SENTINEL|FULL_GENERATION_REFERENCE|OLD_INITIAL_REQUEST/);assert.notEqual(p.profile.sha256,generate.profile.sha256);}
 assert.match(edit.input,/skill\/references\/spatial-exploration.md/);assert.match(edit.instructions,/minimum necessary/);assert.match(edit.instructions,/never silently expand/);assert.match(ask.instructions,/Answer questions only/);assert.doesNotMatch(ask.input,/skill\/references/);
 for(const p of [generate,edit,ask]){assert.equal(p.profile.version,'2');assert.equal(p.profile.instructionLanguage,'en');}
 assert.ok(edit.input.includes('只重绘编码器'));assert.ok(ask.input.includes('解释这个模块'));
});
test('task materials remain in the input channel; output and editing boundaries are in developer instructions',()=>{
 const p=buildAgentPrompt({taskType:'edit',editMode:'appearance',pendingSelectionNote:'USER_REQUEST_MARKER',paperContent:'PAPER_UNTRUSTED_MARKER',scene:{},currentSvg:'SVG_ONLY_IN_ATTACHMENT'});
 assert.doesNotMatch(p.instructions,/USER_REQUEST_MARKER|PAPER_UNTRUSTED_MARKER/);assert.match(p.input,/USER_REQUEST_MARKER/);assert.match(p.input,/PAPER_UNTRUSTED_MARKER/);assert.doesNotMatch(p.input,/SVG_ONLY_IN_ATTACHMENT/);
 for(const rule of ['appearance','layout','redraw','preserveLabels','connection','baseRevision'])assert.ok(p.instructions.includes(rule));
 assert.deepEqual(referencePlan({taskType:'edit',editMode:'appearance'}).optional,[]);assert.deepEqual(referencePlan({taskType:'edit',editMode:'layout'}).optional,[]);assert.deepEqual(referencePlan({taskType:'ask'}).optional,[]);
 assert.throws(()=>promptProfile({taskType:'unknown'}));
});
test('reference preparation copies main skill only for generation and keeps ordinary edits independent',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'figure-prompts-'));
 for(const profile of ['generate','redraw','appearance','ask']){
  const task=profile==='generate'||profile==='ask'?{taskType:profile}:{taskType:'edit',editMode:profile},dir=path.join(root,profile);await fs.mkdir(dir);
  const skill=await prepareSkill(dir,task);
  if(profile==='generate'){assert.match(skill.main,/Paper Vector Figures/);assert.ok(skill.references.length);assert.ok((await fs.stat(path.join(dir,'skill','SKILL.md'))).isFile());}
  else{assert.equal(skill.main,'');assert.deepEqual(skill.references,[]);await assert.rejects(fs.access(path.join(dir,'skill','SKILL.md')));if(profile==='redraw')assert.ok(skill.referenceIndex.length);else assert.deepEqual(skill.referenceIndex,[]);}
 }
});
test('runner supplies distinct developer instructions to SDK and keeps paper in task input',async()=>{
 let options,inputs,runOptions;
 class FakeCodex{constructor(value){options=value;}startThread(thread){assert.equal(thread.sandboxMode,'read-only');assert.equal(thread.modelReasoningEffort,'high');return{async runStreamed(input,opts){inputs=input;runOptions=opts;return{events:(async function*(){yield{type:'item.completed',item:{type:'agent_message',text:'{"answer":"测试回答"}'}};yield{type:'turn.completed',usage:{}};})()};}};}}
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'figure-prompt-sdk-'));const task={taskType:'ask',question:'QUESTION_MARKER',paperContent:'PAPER_MARKER'};
 const result=await runAgent({task,dir,config:{apiKey:'fake-test-key',baseUrl:'https://example.invalid/v1',model:'fake-model',reasoningEffort:'high'},skill:{},onEvent:()=>{}},FakeCodex);
 assert.match(options.config.developer_instructions,/Answer questions only/);assert.doesNotMatch(options.config.developer_instructions,/PAPER_MARKER/);assert.match(inputs[0].text,/PAPER_MARKER/);assert.equal(inputs[1].type,'local_image');assert.deepEqual(runOptions.outputSchema.required,['answer']);assert.equal(result.result.answer,'测试回答');
 assert.equal(options.config.model_provider,'figure_api');
 assert.equal(options.config.model_providers.figure_api.supports_websockets,false);
 assert.equal(options.config.model_providers.figure_api.env_key,'CODEX_API_KEY');
 assert.equal(options.config.model_providers.figure_api.base_url,'https://example.invalid/v1');
 assert.ok(!JSON.stringify(options.config).includes('fake-test-key'));
});
