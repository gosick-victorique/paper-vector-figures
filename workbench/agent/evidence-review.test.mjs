import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import Evidence from '../evidence-contract.js';
import Scene from '../scene-factory.js';
import Commands from '../editor-commands.js';
import {createReviewCoordinator,roles,runReviewer} from './independent-review.mjs';
import {createDraftSession} from './draft-session.mjs';
import Adoption from './adoption.js';
const report=()=>({summary:'独立检查已完成',findings:[],limitations:[]});
function setup(){const state=Commands.execute(Scene.blank(),{type:'create_component',id:'ai-module',parent:'custom',x:20,y:20,w:100,h:60,leaves:[{markup:'<text x="0" y="24" font-size="24">Encoder</text>',kind:'text'}]});return{state,task:{scene:state.nodes,taskType:'generate',editMode:'generate',executionMode:'autonomous',reviewPolicy:'independent',scope:[{id:'custom'}],allComments:[],palette:0,baseRevision:'test',paperContent:'输入送入编码器 Encoder。输出 y = f(x)。',currentSvg:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 740"><g id="scene"/></svg>'}};}
const binding=()=>({objectId:'ai-module',claim:'输入送入编码器',classification:'supported',rationale:'',citations:[{sourceId:'paper-0001',quote:'输入送入编码器 Encoder。'}]});
async function temp(t){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'figure-review-test-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));return dir;}
test('source excerpts retain exact Unicode offsets and exact citations reject invented or ambiguous text',()=>{
 const {state,task}=setup(),source=Evidence.sources(task),bindings=Evidence.bind(state,task,source,{},[binding()]);assert.equal(bindings['ai-module'].citations[0].documentStart,0);
 assert.throws(()=>Evidence.bind(state,task,source,{},[{...binding(),citations:[{sourceId:'fake',quote:'输入'}]}]),/来源/);
 assert.throws(()=>Evidence.bind(state,task,source,{},[{...binding(),citations:[{sourceId:'paper-0001',quote:'Encoder is a decoder'}]}]),/逐字/);
 const long={paperContent:'😀中文\n'.repeat(600),pendingSelectionNote:'用户要求'},excerpts=Evidence.sources(long).filter(s=>s.kind==='paper');assert.ok(excerpts.length>1);for(const s of excerpts){assert.equal(long.paperContent.slice(s.start,s.end),s.text);assert.ok(s.text.length<=1800);}assert.equal(Evidence.sources({paperContent:'x'.repeat(1800)+'\nend'})[0].text.length,1800);
 const duplicate=Evidence.sources({paperContent:'abc abc'});assert.throws(()=>Evidence.bind(state,task,duplicate,{},[{...binding(),citations:[{sourceId:'paper-0001',quote:'abc'}]}]),/重复/);
 const bound=Evidence.bind(state,task,duplicate,{},[{...binding(),citations:[{sourceId:'paper-0001',quote:'abc',start:4}]}]);assert.equal(bound['ai-module'].citations[0].documentStart,4);
});
test('evidence coverage marks content changes stale, allows layout changes and includes bound relations',()=>{
 const {state,task}=setup(),bindings=Evidence.bind(state,task,Evidence.sources(task),{},[binding()]);assert.equal(Evidence.coverage(state,task,bindings).covered,1);state.nodes['ai-module'].x+=30;assert.deepEqual(Evidence.coverage(state,task,bindings).stale,[]);
 state.nodes['ai-module-e0'].markup='<text>Decoder</text>';assert.deepEqual(Evidence.coverage(state,task,bindings).stale,['ai-module']);
 const uncertain=Evidence.bind(state,task,Evidence.sources(task),{},[{...binding(),classification:'unresolved',citations:[],rationale:'缺少方法解释'}]);assert.deepEqual(Evidence.coverage(state,task,uncertain).unresolved,['ai-module']);
 let next=Commands.execute(state,{type:'create_component',id:'ai-next',parent:'custom',x:300,y:20,w:100,h:60,leaves:[{markup:'<rect width="100" height="60"/>'}]});next=Commands.execute(next,{type:'connect',id:'ai-wire',parent:'custom',connection:{from:{node:'ai-module',side:'right',offset:.5},to:{node:'ai-next',side:'left',offset:.5},route:'straight',label:''}});
 assert.deepEqual(Evidence.subjects(next,task).map(s=>s.id),['ai-module','ai-next','ai-wire']);assert.equal(Evidence.subjects(next,task).at(-1).from,'ai-module');
});
test('independent review coordinator limits concurrency, freezes snapshots, persists reports and reuses matching rounds',async t=>{
 const dir=await temp(t),{state,task}=setup(),snapshot={revision:2,scene:state.nodes,sources:Evidence.sources(task)};let active=0,peak=0,calls=0;
 const coordinator=createReviewCoordinator({dir,config:{model:'test'},reviewer:async({role,snapshot:s,dir})=>{calls++;active++;peak=Math.max(peak,active);assert.equal(s.scene['ai-module'].name,'network');s.scene['ai-module'].name=role.id;await new Promise(r=>setTimeout(r,12));active--;return{report:report(),threadId:role.id,model:'test'};}});t.after(()=>coordinator.close());
 const started=await coordinator.start(snapshot,Buffer.from('PNG'));assert.equal(started.status,'running');assert.equal((await coordinator.start(snapshot,Buffer.from('PNG'))).id,started.id);
 const complete=await coordinator.wait(started.id,1000);assert.equal(complete.status,'completed');assert.equal(complete.verdict,'pass');assert.equal(complete.reports.length,4);assert.equal(calls,4);assert.equal(peak,2);assert.equal(snapshot.scene['ai-module'].name,'network');assert.equal((await coordinator.start(snapshot,Buffer.from('PNG'))).id,started.id);
 const saved=JSON.parse(await fs.readFile(path.join(dir,'reviews',started.id,'report.json')));assert.equal(saved.verdict,'pass');
});
test('review failures, invalid object references, blockers and cancellation never become a pass',async t=>{
 const dir=await temp(t),{state,task}=setup(),snapshot={revision:0,scene:state.nodes,sources:Evidence.sources(task)};
 const bad=createReviewCoordinator({dir,config:{apiKey:'secret-test'},reviewer:async({role})=>{if(role.id==='scientific')throw Error('secret-test unavailable');return{report:{...report(),findings:[{severity:'blocker',objectIds:['unknown'],sourceIds:[],message:'bad',suggestion:''}]}};}});t.after(()=>bad.close());const started=await bad.start(snapshot,Buffer.from('PNG')),failed=await bad.wait(started.id,1000);assert.equal(failed.status,'failed');assert.equal(failed.verdict,'incomplete');assert.ok(!JSON.stringify(failed).includes('secret-test'));
 const controller=new AbortController(),cancel=createReviewCoordinator({dir,config:{},signal:controller.signal,reviewer:async()=>new Promise(()=>{})});t.after(()=>cancel.close());const pending=await cancel.start(snapshot,Buffer.from('PNG'));controller.abort(Error('Cancelled'));const cancelled=await cancel.wait(pending.id,1000);assert.equal(cancelled.status,'cancelled');assert.equal(cancelled.verdict,'incomplete');
});
test('reviewer SDK sessions receive only frozen material, image, read-only sandbox and distinct isolated homes',async t=>{
 const dir=await temp(t),{state,task}=setup(),snapshot={revision:1,scene:state.nodes,sources:Evidence.sources(task)},imagePath=path.join(dir,'image.png');await fs.writeFile(imagePath,'PNG');const options=[],threads=[],inputs=[];
 class Fake{constructor(o){options.push(o);}startThread(o){threads.push(o);return{runStreamed:async(input,run)=>{inputs.push(input);assert.ok(run.outputSchema.properties.findings);return{events:(async function*(){yield{type:'thread.started',thread_id:'review-'+inputs.length};yield{type:'item.completed',item:{type:'agent_message',text:JSON.stringify(report())}};})()};}};}}
 for(const role of roles)await runReviewer({role,snapshot,imagePath,dir:path.join(dir,role.id),config:{apiKey:'private',model:'test',baseUrl:'https://example.invalid/v1'},signal:AbortSignal.timeout(1000)},Fake);
 assert.equal(new Set(options.map(o=>o.env.CODEX_HOME)).size,4);for(const o of options){assert.ok(!o.config.mcp_servers);assert.match(o.config.developer_instructions,/independent read-only/);assert.ok(!JSON.stringify(o.config).includes('private'));}for(const o of threads){assert.equal(o.sandboxMode,'read-only');assert.equal(o.networkAccessEnabled,false);}for(const input of inputs){assert.equal(input[1].type,'local_image');assert.match(input[0].text,/Encoder/);}
});
test('draft requires exact-version review, keeps blocker reports immutable, restores evidence with checkpoints',async t=>{
 const dir=await temp(t),{state,task}=setup();let block=true;const reviews=createReviewCoordinator({dir,config:{},reviewer:async({role})=>({report:{...report(),findings:block&&role.id==='scientific'?[{severity:'blocker',objectIds:['ai-module'],sourceIds:['paper-0001'],message:'需要确认编码器标签',suggestion:'修改标签'}]:[]}})});t.after(()=>reviews.close());
 const runtime={catalog:async()=>[],render:async()=>({checks:{issues:[],skipped:0,truncated:false},measurement:{leaves:[],texts:[]},png:Buffer.from('PNG')})},draft=await createDraftSession({task,dir,runtime,reviews});
 const call=async(name,args={})=>JSON.parse((await draft.call(name,args)).content[0].text),write=(requestId,extra={})=>({requestId,expectedRevision:draft.revision,...extra});
 await call('render_region');await call('check_figure');await assert.rejects(call('review_figure',write('missing')),/补齐/);await assert.rejects(call('commit',write('early',{summary:'x',warnings:[]})),/证据/);
 await call('bind_evidence',write('bind',{bindings:[binding()]}));const cp=await call('checkpoint',write('cp',{name:'Evidence'}));await call('render_region');await call('check_figure');let round=await call('review_figure',write('review'));round=await call('get_review',{roundId:round.roundId,waitSeconds:1});assert.equal(round.verdict,'revise');await assert.rejects(call('commit',write('blocked',{summary:'x',warnings:[]})),/尚未通过/);
 block=false;await call('apply_ops',write('edit',{operations:[{op:'update',id:'ai-module-e0',payload:JSON.stringify({textOverride:'Encoder revised'})}]}));assert.deepEqual((await call('get_evidence')).coverage.stale,['ai-module']);await call('rollback',write('rollback',{checkpointId:cp.checkpointId}));assert.deepEqual((await call('get_evidence')).coverage.stale,[]);
 await call('render_region');await call('check_figure');await assert.rejects(call('commit',write('stale',{summary:'x',warnings:[]})),/尚未通过/);round=await call('review_figure',write('second'));round=await call('get_review',{roundId:round.roundId,waitSeconds:1});assert.equal(round.verdict,'pass');
 await call('commit',write('commit',{summary:'已复核',warnings:[]}));const record=draft.result.draft.dossier;assert.equal(record.history.length,2);assert.equal(record.history[0].verdict,'revise');assert.equal(record.history[1].verdict,'pass');Evidence.validateCommit(record,state,task);assert.throws(()=>Evidence.validateCommit({...record,review:{...record.review,revision:0}},state,task),/未通过/);
 assert.throws(()=>Evidence.validateRecord({...record,coverage:{}}),/覆盖/);const malformed=structuredClone(record);malformed.bindings['ai-module'].citations[0]=null;assert.throws(()=>Evidence.validateRecord(malformed),/引用/);
 state.document.content=task.paperContent;assert.equal(Adoption.assess(state,task).ok,true);state.document.content+='changed';assert.equal(Adoption.assess(state,task).ok,false);
});
