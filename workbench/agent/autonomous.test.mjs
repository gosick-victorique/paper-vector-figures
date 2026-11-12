import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import Scene from '../scene-factory.js';
import Commands from '../editor-commands.js';
import Checks from '../figure-checks.js';
import Safety from './svg-safety.cjs';
import {createDraftSession} from './draft-session.mjs';
import {buildAgentPrompt} from './prompts.mjs';
import {runAgent} from './runner.mjs';
import {hostDraftTools} from './tool-host.mjs';
import Adoption from './adoption.js';
const base=()=>Scene.blank(),make=(id,x=20)=>({type:'create_component',id,parent:'custom',x,y:20,w:120,h:60,leaves:[{kind:'rect',w:120,h:60,markup:'<rect width="120" height="60" fill="#416f89"/>'}]}),task=s=>({taskType:'generate',editMode:'generate',executionMode:'autonomous',scene:s.nodes,scope:[{id:'custom'}],palette:0,allComments:[],baseRevision:'test',currentSvg:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 740"><g id="scene"/></svg>'});
test('rich commands are atomic and preserve locked descendants, comments and wire endpoints',()=>{
 let s=Commands.execute(base(),make('ai-a'),Safety.validateMarkup);s=Commands.execute(s,make('ai-b',300));const before=JSON.stringify(s);s.nodes['ai-a-e0'].locked=true;
 assert.throws(()=>Commands.execute(s,{type:'arrange',ids:['ai-a','ai-b'],action:'top'}),/锁定/);assert.equal(s.nodes['ai-b'].x,300);
 assert.throws(()=>Commands.execute(s,{type:'remove',ids:['ai-a']}),/锁定/);s.nodes['ai-a-e0'].locked=false;
 s=Commands.execute(s,{type:'connect',id:'ai-wire',parent:'custom',connection:{from:{node:'ai-a',side:'right',offset:.5},to:{node:'ai-b',side:'left',offset:.5},route:'straight',label:''}});
 assert.throws(()=>Commands.execute(s,{type:'remove',ids:['ai-a']}),/接口/);
 const updated=Commands.execute(s,{type:'connect',id:'ai-wire',connection:{...s.nodes['ai-wire'].connection,route:'elbow'}});assert.equal(updated.nodes['ai-wire'].connection.route,'elbow');
 s.nodes['ai-wire'].locked=true;assert.throws(()=>Commands.execute(s,{type:'arrange',ids:['ai-a','ai-b'],action:'grid',x:100}),/锁定/);assert.ok(before);
});
test('adoption rejects scope, protected text, new ID collisions, and malicious SVG resources',()=>{
 const a=Commands.execute(base(),make('ai-a')),s=Commands.execute(a,make('ai-b',300)),t={...task(s),taskType:'edit',editMode:'layout',scope:[{id:'ai-a'}]};
 const next=structuredClone(s);next.nodes['ai-b'].x=400;assert.throws(()=>Commands.validateTransition(s,next,t),/选区/);
 next.nodes['ai-b'].x=300;next.nodes['ai-a-e0'].markup='<text>Hello</text>';assert.throws(()=>Commands.validateTransition(s,next,t),/模式/);
 assert.throws(()=>Commands.execute(base(),{...make('ai-a'),leaves:[{markup:'<defs><marker id="other"/></defs><rect width="2" height="2"/>'}]},Safety.validateMarkup),/前缀/);
 assert.throws(()=>Commands.execute(s,make('ai-a')),/已存在/);
});
test('draft request idempotence, stale versions, failed mutations, checkpoints and commit gate',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'figure-draft-test-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const checks={issues:[],skipped:0,truncated:false},runtime={catalog:async()=>[],render:async()=>({checks,measurement:{leaves:[],texts:[]},png:Buffer.from('test')}),close:async()=>{}};
 const draft=await createDraftSession({task:task(base()),dir,runtime}),args={...make('ai-a'),requestId:'r1',expectedRevision:0};delete args.type;
 const first=await draft.call('create_component',args);assert.deepEqual(await draft.call('create_component',args),first);assert.equal(draft.revision,1);
 await assert.rejects(draft.call('create_component',{...args,x:2}),/requestId/);
 await assert.rejects(draft.call('create_component',{...args,requestId:'stale',id:'ai-stale'}),/版本冲突/);
 const cp=JSON.parse((await draft.call('checkpoint',{requestId:'cp',expectedRevision:1,name:'first'})).content[0].text);
 await draft.call('create_component',{...args,requestId:'r2',expectedRevision:1,id:'ai-b',x:300});
 await draft.call('rollback',{requestId:'back',expectedRevision:2,checkpointId:cp.checkpointId});assert.equal(draft.revision,3);assert.ok(!draft.getState().nodes['ai-b']);
 const commit={requestId:'commit',expectedRevision:3,summary:'done',warnings:[]};await assert.rejects(draft.call('commit',commit),/render_region/);
 await draft.call('render_region',{region:{x:0,y:0,w:100,h:100}});await draft.call('check_figure',{});await assert.rejects(draft.call('commit',commit),/render_region/);
 await draft.call('render_region',{});await draft.call('commit',commit);assert.ok(draft.result.draft.changes.length);await assert.rejects(draft.call('remove_objects',{requestId:'after',expectedRevision:3,ids:['ai-a']}),/已提交/);
 const live=Commands.adopt(base(),task(base()),draft.result,Safety.validateMarkup);assert.ok(live.nodes['ai-a']);assert.ok(!base().nodes['ai-a']);const stored=JSON.parse(await fs.readFile(path.join(dir,'draft.json')));assert.equal(stored.revision,3);assert.equal(stored.checkpoints.length,1);
});
test('same issue getting worse is a regression; an improvement is not',()=>{
 const sample=fontPt=>Checks.analyze({width:1200,height:740,texts:[{id:'label',owner:1,text:'Label',fontPt,box:{x:1,y:1,w:50,h:20}}]});
 assert.equal(Checks.regressions(sample(5),sample(2)).length,1);assert.equal(Checks.regressions(sample(2),sample(5)).length,0);
});
test('draft commits reject uninspected rollbacks, clipping and incomplete checks; cancellation disables tools',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'figure-draft-errors-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 let checks={issues:[],skipped:0,truncated:false};const controller=new AbortController(),runtime={catalog:async()=>[],render:async()=>({checks,measurement:{leaves:[],texts:[]},png:Buffer.from('test')})};
 const draft=await createDraftSession({task:task(base()),dir,runtime,signal:controller.signal});
 const cp=JSON.parse((await draft.call('checkpoint',{requestId:'cp',expectedRevision:0,name:'empty'})).content[0].text);
 await draft.call('render_region',{});await draft.call('check_figure',{});await draft.call('rollback',{requestId:'back',expectedRevision:0,checkpointId:cp.checkpointId});
 const commit={requestId:'commit',expectedRevision:1,summary:'done',warnings:['review']};await assert.rejects(draft.call('commit',commit),/render_region/);
 checks={issues:[{key:'outside:one',code:'outside',severity:'error',magnitude:4}],skipped:0,truncated:false};await draft.call('render_region',{});await draft.call('check_figure',{});await assert.rejects(draft.call('commit',commit),/错误/);
 checks={issues:[],skipped:0,truncated:true};await draft.call('check_figure',{});await assert.rejects(draft.call('commit',commit),/截断/);
 controller.abort(Error('cancelled'));await assert.rejects(draft.call('get_scene',{}),/cancelled/);assert.equal(draft.result,null);
});
test('draft transport isolates capabilities and autonomous adoption rejects changed observations',async t=>{
 let calls=0;const controller=new AbortController(),host=await hostDraftTools({revision:0,call:async()=>{calls++;return{content:[]};}},controller.signal);t.after(()=>host.close());
 const request=headers=>fetch(host.url,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify({name:'get_scene',args:{}})});
 assert.equal((await request({})).status,403);assert.equal((await request({authorization:'Bearer '+host.token,origin:'https://example.invalid'})).status,403);assert.equal(calls,0);
 assert.equal((await request({authorization:'Bearer '+host.token})).status,200);assert.equal(calls,1);controller.abort();const response=await(await request({authorization:'Bearer '+host.token})).json();assert.equal(response.isError,true);assert.equal(calls,1);
 const s=Commands.execute(base(),make('ai-a')),submitted={...task(s),taskType:'edit',editMode:'layout',svgDefs:''};s.nodes['ai-a'].x+=5;assert.equal(Adoption.assess(s,submitted).ok,true);submitted.scene=structuredClone(submitted.scene);s.nodes['ai-a'].x+=5;assert.equal(Adoption.assess(s,submitted).ok,false);
});
test('draft persistence failure leaves no mutation or successful request receipt',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'figure-draft-save-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 const runtime={catalog:async()=>[],render:async()=>({checks:{issues:[],skipped:0,truncated:false}})},draft=await createDraftSession({task:task(base()),dir,runtime});
 // A directory at the atomic temporary-file path deterministically simulates write failure.
 await fs.mkdir(path.join(dir,'draft.json.tmp'));const args={...make('ai-a'),requestId:'retry',expectedRevision:0};delete args.type;
 await assert.rejects(draft.call('create_component',args));assert.equal(draft.revision,0);assert.ok(!draft.getState().nodes['ai-a']);await fs.rmdir(path.join(dir,'draft.json.tmp'));
 await draft.call('create_component',args);assert.equal(draft.revision,1);assert.ok(draft.getState().nodes['ai-a']);
});
test('autonomous SDK registers the local MCP server and requires host-side commit',async()=>{
 let options;class Fake{constructor(o){options=o;}startThread(){return{runStreamed:async()=>({events:(async function*(){yield{type:'item.completed',item:{type:'agent_message',text:'{"summary":"fake","warnings":[]}'}};})()})};}}
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'figure-sdk-tools-')),input={task:task(base()),dir,config:{apiKey:'private-test',baseUrl:'http://127.0.0.1/v1',model:'test'},onEvent:()=>{},toolHost:{url:'http://127.0.0.1:1/call',token:'test-capability'},draft:{result:null}};
 try{await assert.rejects(runAgent(input,Fake),/尚未完成/);assert.match(options.config.mcp_servers.figure.args[0],/mcp-stdio.mjs/);assert.equal(options.config.mcp_servers.figure.env.FIGURE_TOOL_TOKEN,'test-capability');assert.ok(!JSON.stringify(options.config).includes('private-test'));const p=buildAgentPrompt(input.task);assert.match(p.instructions,/render_region/);assert.doesNotMatch(p.instructions,/do not launch reviewers or run repeated/);}finally{await fs.rm(dir,{recursive:true,force:true});}
});
