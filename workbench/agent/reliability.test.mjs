import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import Scene from '../scene-factory.js';
import Commands from '../editor-commands.js';
import Patch from './patch-contract.js';
import {createDraftSession} from './draft-session.mjs';
import {createWorkbenchServer,hash} from './server.mjs';
import {createReviewCoordinator} from './independent-review.mjs';
import {verifyExport,createReviewArtifacts} from './review-artifacts.mjs';
import {evaluationCases,evaluationTask,evaluateResult} from './evaluation-cases.mjs';
import {taskBudget} from './task-budget.mjs';
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="180mm" height="111mm" viewBox="0 0 1200 740"><rect width="1200" height="740" fill="white"/><g id="scene"><text x="50" y="100">Export label</text></g></svg>';
const checks={issues:[],skipped:0,truncated:false},runtime=()=>({catalog:async()=>[],render:async(_source,options={})=>{if(options.path)await fs.writeFile(options.path,'PNG');return{checks,measurement:{leaves:[],texts:[]},png:Buffer.from('PNG')};},close:async()=>{}});
const task=()=>{const state=Scene.blank();return{taskType:'generate',editMode:'generate',paperContent:'This is a recovery test with one illustrative box.',executionMode:'autonomous',reviewPolicy:'none',scene:state.nodes,scope:[{id:'custom'}],allComments:[],palette:0,pendingSelectionNote:'测试恢复',baseRevision:hash(Patch.revision(state)),currentSvg:svg};};
const insert={id:'ai-a',parent:'custom',x:20,y:20,w:100,h:60,leaves:[{markup:'<rect width="100" height="60"/>'}],requestId:'once',expectedRevision:0};
async function temp(t){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'figure-reliability-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));return dir;}
test('chart and formula updates preserve manual transforms, wrappers and appearance, but replace old text',()=>{
 for(const kind of ['chart','equation']){
  const command={type:'save_'+kind,id:'ai-'+kind,parent:'custom',x:50,y:60,config:kind==='chart'?{type:'bar',text:'x,y\nA,2\nB,3',x:0,series:[{column:1,color:'#416f89',name:'Y'}]}:{source:'x',fontPt:12},rendered:{w:100,h:30,markup:'<svg width="100" height="30"><text>x</text></svg>'}};
  let state=Commands.execute(Scene.blank(),command),leaf=state.nodes[command.id+'-content'];leaf.x=12;leaf.y=9;leaf.scale=.8;leaf.originX=3;leaf.appearance={opacity:.7};leaf.textOverride='obsolete';leaf.markup='<g transform="translate(2 3)">'+leaf.markup.replace('<svg','<svg transform="scale(1.2)"')+'</g>';
  const next=Commands.execute(state,{...command,config:{...command.config,title:'New'},rendered:{...command.rendered,markup:'<svg width="100" height="30"><text>y</text></svg>'}}),updated=next.nodes[leaf.id];
  assert.equal(updated.x,12);assert.equal(updated.y,9);assert.equal(updated.scale,.8);assert.equal(updated.originX,3);assert.deepEqual(updated.appearance,{opacity:.7});assert.equal(updated.textOverride,undefined);assert.match(updated.markup,/translate\(2 3\)/);assert.match(updated.markup,/scale\(1.2\)/);assert.equal(next.nodes[command.id].x,50);
 }
});
test('restored drafts keep receipts, evidence, checkpoints and enforce fresh render/check',async t=>{
 const dir=await temp(t),input=task(),first=await createDraftSession({task:input,dir,runtime:runtime()}),receipt=await first.call('create_component',insert);
 const checkpoint=JSON.parse((await first.call('checkpoint',{requestId:'cp',expectedRevision:1,name:'saved'})).content[0].text);
 const restored=await createDraftSession({task:input,dir,runtime:runtime(),resume:true});assert.equal(restored.revision,1);assert.deepEqual(await restored.call('create_component',insert),receipt);assert.equal(Object.keys(restored.getState().nodes).filter(id=>id==='ai-a').length,1);
 await assert.rejects(restored.call('commit',{requestId:'c',expectedRevision:1,summary:'done',warnings:[]}),/render_region/);
 await restored.call('rollback',{requestId:'back',expectedRevision:1,checkpointId:checkpoint.checkpointId});assert.equal(restored.revision,2);
 await assert.rejects(createDraftSession({task:{...input,pendingSelectionNote:'changed'},dir,runtime:runtime(),resume:true}),/不一致/);
});
test('review restarts reuse only successful reviewers of the identical snapshot',async t=>{
 const dir=await temp(t),snapshot={revision:1,scene:{},sources:[]},counts={},reviewer=async({role})=>{counts[role.id]=(counts[role.id]||0)+1;if(role.id==='scientific'&&counts[role.id]===1)throw Error('temporary');return{report:{summary:'Checked',findings:[],limitations:[]},threadId:role.id};};
 let coordinator=createReviewCoordinator({dir,config:{},reviewer});const round=await coordinator.start(snapshot,Buffer.from('PNG'));assert.equal((await coordinator.wait(round.id,1000)).status,'failed');await coordinator.close();
 coordinator=createReviewCoordinator({dir,config:{},reviewer});t.after(()=>coordinator.close());await coordinator.restore();const retry=await coordinator.start(snapshot,Buffer.from('PNG')),result=await coordinator.wait(retry.id,1000);assert.equal(result.verdict,'pass');assert.equal(counts.scientific,2);assert.equal(counts.readability,1);assert.equal(result.reports.filter(r=>r.reusedFrom).length,3);
});
test('export verification rerenders actual PDF, extracts text and supplies dense figure tiles',async()=>{
 const verified=await verifyExport(svg);assert.equal(verified.report.pages,1);assert.ok(Math.abs(verified.report.widthMm-180)<.01);assert.match(verified.report.text,/Export label/);assert.ok(verified.png.length>100);
 const regions=[],artifacts=await createReviewArtifacts({source:svg,canvas:{widthMm:180,heightMm:111,viewBox:[0,0,1200,740]},view:{measurement:{texts:[{fontPt:5}],leaves:[]}},runtime:{render:async(_source,options)=>{regions.push(options.region);assert.equal(options.maxEdge,2200);return{png:Buffer.from('PNG')};}}});assert.equal(regions.length,4);assert.equal(artifacts.images.length,5);assert.equal(artifacts.exportCheck.status,'verified');assert.equal(artifacts.files.length,2);
});
test('HTTP restart resumes the same draft and never repeats the already committed insertion',async t=>{
 const dir=await temp(t);let attempts=0,app,request;
 const runner=async({draft})=>{attempts++;if(attempts===1){await draft.call('create_component',insert);throw Error('connection lost');}assert.equal(draft.resumed,true);assert.equal(draft.revision,1);await draft.call('create_component',insert);await draft.call('render_region');await draft.call('check_figure');await draft.call('commit',{requestId:'finish',expectedRevision:1,summary:'Restored',warnings:[]});return{result:draft.result};};
 const boot=async()=>{app=createWorkbenchServer({jobsDir:dir,runner,runtimeFactory:async()=>runtime()});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+app.server.address().port,session=await(await fetch(base+'/api/session')).json();request=async(p,body)=>{const r=await fetch(base+p,{method:body?'POST':'GET',headers:{'X-Workbench-Token':session.token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return{status:r.status,data:await r.json()};};await request('/api/config',{baseUrl:'https://example.invalid/v1',model:'fixture',apiKey:'fixture'});};
 const terminal=async id=>{for(let i=0;i<100;i++){const r=await request('/api/jobs/'+id);if(['failed','completed'].includes(r.data.status)){await new Promise(r=>setTimeout(r,30));return r.data;}await new Promise(r=>setTimeout(r,20));}throw Error('timeout');};
 await boot();t.after(()=>app.close());const input=task(),initial=await request('/api/jobs',input);assert.equal(initial.status,202);let job=await terminal(initial.data.id);assert.equal(job.status,'failed');assert.equal(job.recoverable,true);await app.close();await boot();
 assert.equal((await request('/api/jobs/'+job.id+'/resume',{baseRevision:'wrong'})).status,409);
 assert.equal((await request('/api/jobs/'+job.id+'/resume',{baseRevision:input.baseRevision})).status,202);job=await terminal(job.id);assert.equal(job.status,'completed',job.error);assert.equal(job.attempts,2);assert.equal(job.draft.changes.filter(c=>c.id==='ai-a').length,1);
});

test('budgets reject invalid limits and exhausted drafts keep recovery available',async t=>{
 assert.throws(()=>taskBudget({minutes:31}),/预算/);assert.throws(()=>taskBudget({toolCalls:1}),/预算/);assert.throws(()=>taskBudget({reviewRounds:4}),/预算/);assert.throws(()=>taskBudget({money:1}),/预算/);
 const dir=await temp(t),draft=await createDraftSession({task:{...task(),budget:{toolCalls:20}},dir,runtime:runtime()});for(let i=0;i<20;i++)await draft.call('get_scene');await assert.rejects(draft.call('get_scene'),/20 次/);
});
test('benchmark detects preserved-word metadata without visible labels and wrong data',()=>{
 const item=evaluationCases.find(c=>c.id==='local-edit'),input=evaluationTask(item),leaf=input.scene['sample-e1'];
 const job={status:'completed',draft:{revision:1,changes:[{id:leaf.id,node:{...leaf,textOverride:'After'}}],checks,dossier:{review:{verdict:'pass',revision:1}}}};
 assert.ok(evaluateResult(item,input,job).every(c=>c.pass));job.draft.changes[0].node={...leaf,name:'After'};assert.ok(evaluateResult(item,input,job).some(c=>c.name==='可见标签 After'&&!c.pass));
 const chart=evaluationCases.find(c=>c.id==='chart'),chartTask=evaluationTask(chart),state=Commands.execute(Scene.blank(),{type:'save_chart',id:'ai-chart',parent:'custom',config:{type:'bar',text:chart.chartText.replace('A,12','A,99'),x:0,series:[{column:1,name:'Value',color:'#416f89'}]}});
 const result={status:'completed',draft:{revision:1,changes:Commands.diff({nodes:chartTask.scene},state),checks,dossier:{review:{verdict:'pass',revision:1}}}};assert.ok(evaluateResult(chart,chartTask,result).some(c=>c.name==='原始数据完全一致'&&!c.pass));
});
test('partial reviewer results are durable before the round completes; export failure blocks a model pass',async t=>{
 const dir=await temp(t);let release,persisted;const durable=new Promise(r=>persisted=r),paused=new Promise(r=>release=r),snapshot={revision:1,scene:{},sources:[],exportCheck:{status:'failed',error:'font unavailable'}};
 const coordinator=createReviewCoordinator({dir,config:{},onEvent:round=>{if(round.status==='running'&&round.reports.some(r=>r.role==='scientific'&&r.status==='completed'))persisted();},reviewer:async({role})=>{if(role.id!=='scientific')await paused;return{report:{summary:'Checked',findings:[],limitations:[]}};}});t.after(()=>coordinator.close());
 const started=await coordinator.start(snapshot,Buffer.from('PNG'));await durable;const saved=JSON.parse(await fs.readFile(path.join(dir,'reviews',started.id,'report.json')));assert.equal(saved.status,'running');assert.equal(saved.reports[0].role,'scientific');release();const completed=await coordinator.wait(started.id,1000);assert.equal(completed.verdict,'revise');assert.equal(completed.blockers,1);
});
