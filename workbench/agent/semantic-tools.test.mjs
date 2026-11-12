import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import Scene from '../scene-factory.js';
import Commands from '../editor-commands.js';
import Model from '../model.js';
import Graph from '../graph-layout.js';
import Evidence from '../evidence-contract.js';
import Data from '../evidence-data.js';
import {createDraftSession} from './draft-session.mjs';
import {createReviewCoordinator} from './independent-review.mjs';
function module(state,id,x=20,y=20,parent='custom'){return Commands.execute(state,{type:'create_component',id,parent,name:id,x,y,w:100,h:60,leaves:[{markup:'<rect width="100" height="60"/>',w:100,h:60}]});}
function connect(state,id,from,to){return Commands.execute(state,{type:'connect',id,parent:'custom',connection:{from:{node:from,side:'right',offset:.5},to:{node:to,side:'left',offset:.5},route:'elbow',label:'flow'}});}
function diamond(){let state=Scene.blank();for(const id of ['ai-a','ai-b','ai-c','ai-d'])state=module(state,id);for(const [from,to]of [['ai-a','ai-b'],['ai-a','ai-c'],['ai-b','ai-d'],['ai-c','ai-d']])state=connect(state,'ai-'+from.slice(3)+to.slice(3),from,to);return state;}
test('graph layout places a branching diamond in layers without changing topology, size or text',()=>{
 const state=diamond(),ids=['ai-a','ai-b','ai-c','ai-d'],before=structuredClone(state),analysis=Graph.analyze(state,ids);assert.deepEqual(analysis.layers,[['ai-a'],['ai-b','ai-c'],['ai-d']]);
 const next=Commands.execute(state,{type:'layout_graph',ids,x:50,y:50,gap:80,laneGap:40});assert.equal(JSON.stringify(state),JSON.stringify(before));
 assert.ok(Model.bounds(next,'ai-a').x<Model.bounds(next,'ai-b').x);assert.equal(Model.bounds(next,'ai-b').x,Model.bounds(next,'ai-c').x);assert.ok(Model.bounds(next,'ai-b').y+60<Model.bounds(next,'ai-c').y);assert.equal(Model.bounds(next,'ai-a').y,Model.bounds(next,'ai-d').y);
 for(const id of ids){assert.deepEqual(next.nodes[id+'-e0'],state.nodes[id+'-e0']);assert.equal(next.nodes[id].scale,state.nodes[id].scale);}for(const n of Object.values(state.nodes).filter(n=>n.connection))assert.deepEqual(next.nodes[n.id].connection,n.connection);
 const again=Commands.execute(next,{type:'layout_graph',ids,x:50,y:50,gap:80,laneGap:40});assert.deepEqual(again,next);
});
test('layout rejects cycles, locked connections, obstacles and overflow without partial changes',()=>{
 const ids=['ai-a','ai-b','ai-c','ai-d'];for(const mode of ['cycle','lock','obstacle','overflow']){
  let state=diamond();if(mode==='cycle')state=connect(state,'ai-loop','ai-d','ai-a');if(mode==='lock')state.nodes['ai-ab'].locked=true;if(mode==='obstacle')state=module(state,'ai-obstacle',50,100);
  const before=JSON.stringify(state),command={type:'layout_graph',ids,x:50,y:50,...(mode==='overflow'?{gap:500}: {})};assert.throws(()=>Commands.execute(state,command),/环|锁定|覆盖|超出/);assert.equal(JSON.stringify(state),before);
 }
});
test('vertical layout respects scaled parents and graph analysis identifies boundary connections',()=>{
 let state=Scene.blank();state.nodes.custom.scale=1.5;state=module(state,'ai-a',0,0);state=module(state,'ai-b',200,150);state=module(state,'ai-outside',600,100);state=connect(state,'ai-ab','ai-a','ai-b');state=connect(state,'ai-bo','ai-b','ai-outside');
 assert.equal(Graph.analyze(state,['ai-a','ai-b']).external[0].id,'ai-bo');const next=Commands.execute(state,{type:'layout_graph',ids:['ai-a','ai-b'],direction:'down',x:40,y:40});assert.equal(Model.bounds(next,'ai-a').x,40);assert.equal(Model.bounds(next,'ai-b').y,210);assert.equal(next.nodes.custom.scale,1.5);assert.deepEqual(next.nodes['ai-outside'],state.nodes['ai-outside']);
 const task={taskType:'edit',editMode:'layout',scope:[{id:'ai-a'},{id:'ai-b'}]};Commands.validateTransition(state,next,task);
});
test('numeric evidence compares exact decimal values, row identities, errors and unit headers',()=>{
 const citations=[{sourceId:'paper-0001',quote:'Condition,Time (ms),Error\n01,9007199254740993,0.5\n02,1.20,0.1'}],mapping={kind:'table',format:'csv',citationIndex:0},chart={type:'bar',x:0,series:[{column:1,error:2}],text:citations[0].quote};
 assert.equal(Data.compare(chart,mapping,citations).status,'matched');assert.equal(Data.compare({...chart,text:chart.text.replace('1.20','12e-1')},mapping,citations).status,'matched');
 for(const [from,to]of [['9007199254740993','9007199254740992'],['01,','1,'],['Time (ms)','Time (s)'],['0.5','0.6']])assert.equal(Data.compare({...chart,text:chart.text.replace(from,to)},mapping,citations).status,'mismatch');
 const reordered={...chart,text:'Condition,Time (ms),Error\n02,1.20,0.1\n01,9007199254740993,0.5'};assert.equal(Data.compare(reordered,mapping,citations).status,'mismatch');assert.equal(Data.compare(reordered,{...mapping,rows:[1,0]},citations).status,'matched');
});
test('Markdown and TSV sources preserve explicit row/column provenance and reject invalid mappings',()=>{
 const quotes=['| Case | Value | Unit |\n| --- | ---: | --- |\n| A | 2 | ms |\n| B | 4 | ms |','Case\tValue\tUnit\nA\t2\tms\nB\t4\tms'];
 for(const [i,format]of ['markdown','tsv'].entries()){
  const citations=[{sourceId:'paper-0001',quote:quotes[i]}],mapping={kind:'table',format,citationIndex:0,rows:[1],columns:[0,1]},result=Data.compare({type:'bar',x:0,series:[{column:1}],text:'Case,Value\nB,4'},mapping,citations);assert.equal(result.status,'matched');assert.deepEqual(result.sourceRows,[1]);assert.deepEqual(result.sourceColumns,[0,1]);assert.throws(()=>Data.normalize({...mapping,rows:[1,1]},citations),/重复/);assert.throws(()=>Data.normalize({...mapping,columns:[8]},citations),/索引/);
 }
 assert.throws(()=>Data.normalize({kind:'unstructured',reason:''},[]),/原因/);
});
test('data evidence survives checkpoints and recovery; rebinding a wrong table cannot bypass the review gate',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'figure-semantic-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));const table='Case,Value (ms)\nA,12\nB,18',state=Commands.execute(Scene.blank(),{type:'save_chart',id:'ai-chart',parent:'custom',x:40,y:40,config:{type:'bar',text:table,x:0,series:[{column:1,error:-1}],publication:true,widthMm:65,heightMm:40,fontPt:7}}),task={taskType:'generate',editMode:'generate',executionMode:'autonomous',reviewPolicy:'independent',baseRevision:'test',scene:state.nodes,allComments:[],palette:0,scope:[{id:'custom'}],paperContent:'Measurements:\n'+table,currentSvg:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 740"><g id="scene"/></svg>'};
 const reviews=createReviewCoordinator({dir,config:{},reviewer:async()=>({report:{summary:'Test',findings:[],limitations:[]}})});t.after(()=>reviews.close());const runtime={catalog:async()=>[],render:async()=>({checks:{issues:[],skipped:0,truncated:false},measurement:{leaves:[],texts:[]},png:Buffer.from('PNG')})};
 let draft=await createDraftSession({task,dir,runtime,reviews});const write=(id,extra={})=>({requestId:id,expectedRevision:draft.revision,...extra}),call=async(name,args)=>JSON.parse((await draft.call(name,args)).content[0].text),binding={objectId:'ai-chart',claim:'Measured values',classification:'supported',rationale:'',citations:[{sourceId:'paper-0001',quote:table}],data:{kind:'table',format:'csv',citationIndex:0}};
 await call('bind_evidence',write('bind',{bindings:[binding]}));assert.equal((await call('check_evidence')).matched,1);const cp=await call('checkpoint',write('cp',{name:'Verified data'}));
 await call('save_chart',write('wrong',{id:'ai-chart',config:{...state.nodes['ai-chart'].chart,text:table.replace('A,12','A,99')}}));await call('bind_evidence',write('bind-wrong',{bindings:[binding]}));assert.equal((await call('check_evidence')).results[0].status,'mismatch');await call('render_region');await call('check_figure');await assert.rejects(call('review_figure',write('bad-review')),/来源核验/);
 await call('rollback',write('restore',{checkpointId:cp.checkpointId}));draft=await createDraftSession({task,dir,runtime,reviews,resume:true});assert.equal((await call('check_evidence')).matched,1);await call('render_region');await call('check_figure');const round=await call('review_figure',write('review'));await call('get_review',{roundId:round.roundId,waitSeconds:1});await call('commit',write('finish',{summary:'Checked',warnings:[]}));assert.equal(draft.result.draft.dossier.schema,2);Evidence.validateCommit(draft.result.draft.dossier,draft.getState(),task);
 const tampered=structuredClone(draft.result.draft.dossier);tampered.dataChecks=null;assert.throws(()=>Evidence.validateRecord(tampered),/数据核验/);
});
test('unstructured numerical evidence is explicitly unverified, not counted as a table match',()=>{
 const state=Commands.execute(Scene.blank(),{type:'save_chart',id:'ai-chart',parent:'custom',config:{type:'bar',text:'Case,Value\nA,12',x:0,series:[{column:1}]}}),task={scope:[{id:'custom'}],paperContent:'A has value 12.'},binding={objectId:'ai-chart',claim:'A=12',classification:'supported',rationale:'',citations:[{sourceId:'paper-0001',quote:task.paperContent}],data:{kind:'unstructured',reason:'原文只有自然语言描述，没有表格。'}},bindings=Evidence.bind(state,task,Evidence.sources(task),{},[binding]),checks=Evidence.dataChecks(state,task,bindings);assert.equal(checks.matched,0);assert.equal(checks.results[0].status,'unverified');assert.equal(checks.issues[0].severity,'warning');
});
test('flow layout preserves evidence for unchanged relations while reversed connections invalidate it',()=>{
 const state=diamond(),task={scope:[{id:'custom'}],paperContent:'A sends to B and C; B and C send to D.'},bindings=Evidence.bind(state,task,Evidence.sources(task),{},Evidence.subjects(state,task).map(subject=>({objectId:subject.id,classification:'supported',claim:'Directed module relation',rationale:'',citations:[{sourceId:'paper-0001',quote:task.paperContent}]})));
 const next=Commands.execute(state,{type:'layout_graph',ids:['ai-a','ai-b','ai-c','ai-d'],x:50,y:50});assert.deepEqual(Evidence.coverage(next,task,bindings).stale,[]);const connection=next.nodes['ai-ab'].connection,reversed=Commands.execute(next,{type:'connect',id:'ai-ab',connection:{...connection,from:connection.to,to:connection.from}});assert.ok(Evidence.coverage(reversed,task,bindings).stale.includes('ai-ab'));
});
