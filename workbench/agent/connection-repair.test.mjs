import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import Scene from '../scene-factory.js';
import Model from '../model.js';
import Connections from '../connections.js';
import Commands from '../editor-commands.js';
import Checks from '../figure-checks.js';
import Repair from '../connection-repair.js';
import Evidence from '../evidence-contract.js';
import {createDraftSession} from './draft-session.mjs';
function module(s,id,x,y,w=100,h=80){return Commands.execute(s,{type:'create_component',id,parent:'custom',name:id,x,y,w,h,leaves:[{markup:`<rect width="${w}" height="${h}"/>`}]});}
function wire(s,id,a,b,from='right',to='left'){return Commands.execute(s,{type:'connect',id,parent:'custom',connection:{from:{node:a,side:from,offset:.5},to:{node:b,side:to,offset:.5},route:'straight',label:'feature',color:'#416f89',width:1.5}});}
function fixture(){let s=Scene.blank();for(const [id,x,y]of [['a',80,200],['b',600,200],['c',320,60],['d',320,400]])s=module(s,'ai-'+id,x,y);s=wire(s,'ai-horizontal','ai-a','ai-b');return wire(s,'ai-vertical','ai-c','ai-d','bottom','top');}
function measured(s){const record=n=>({id:n.id,parent:n.parent,ancestors:Model.ancestors(s,n.id),box:Model.bounds(s,n.id)}),measurement={width:1200,height:740,modules:Object.values(s.nodes).filter(n=>n.type==='component').map(record),leaves:Object.values(s.nodes).filter(n=>n.type==='leaf').map(record),texts:[],connections:Object.values(s.nodes).filter(n=>n.connection).map(n=>({...record(n),from:n.connection.from.node,to:n.connection.to.node,points:Connections.geometry(s,n.connection).points}))};return{measurement,checks:Checks.analyze(measurement),png:Buffer.from('test')};}
test('repair reduces a crossing while retaining topology, style, modules and unrelated wires',async()=>{
 const s=fixture(),before=Model.clone(s);assert.ok(measured(s).checks.issues.some(i=>i.code==='wire-crossing'));
 const fixed=await Repair.run(s,{ids:['ai-horizontal'],adjustPorts:true},{measure:measured});assert.equal(fixed.report.status,'improved');assert.equal(fixed.report.after.issues.length,0);assert.deepEqual(s,before);assert.deepEqual(fixed.state.nodes['ai-vertical'],s.nodes['ai-vertical']);
 for(const id of ['ai-a','ai-b','ai-c','ai-d'])assert.deepEqual(fixed.state.nodes[id],s.nodes[id]);assert.deepEqual(Connections.routingIdentity(fixed.state.nodes['ai-horizontal'].connection),Connections.routingIdentity(s.nodes['ai-horizontal'].connection));
 const again=await Repair.run(fixed.state,{ids:['ai-horizontal'],adjustPorts:true},{measure:measured});assert.equal(again.report.status,'unchanged');assert.deepEqual(again.state,fixed.state);
 const originalPorts=await Repair.run(s,{ids:['ai-horizontal']},{measure:measured});assert.deepEqual(originalPorts.state.nodes['ai-horizontal'].connection.from,s.nodes['ai-horizontal'].connection.from);assert.deepEqual(originalPorts.state.nodes['ai-horizontal'].connection.to,s.nodes['ai-horizontal'].connection.to);
});
test('obstacle repair preserves ports by default and incomplete or worse rendered candidates never apply',async()=>{
 let s=Scene.blank();s=module(s,'ai-a',80,200);s=module(s,'ai-b',800,200);s=module(s,'ai-block',400,180,100,140);s=wire(s,'ai-wire','ai-a','ai-b');
 const repaired=await Repair.run(s,{ids:['ai-wire']},{measure:measured});assert.equal(repaired.report.status,'improved');assert.equal(repaired.state.nodes['ai-wire'].connection.route,'avoid');assert.deepEqual(repaired.state.nodes['ai-wire'].connection.from,s.nodes['ai-wire'].connection.from);
 let count=0;const rejected=await Repair.run(s,{ids:['ai-wire']},{measure:state=>{const view=measured(state);if(++count===2)view.checks.issues.push({key:'outside:test',code:'outside',severity:'error',ids:['ai-wire'],magnitude:10});return view;}});assert.equal(rejected.report.status,'unchanged');assert.deepEqual(rejected.state,s);assert.match(rejected.report.reason,/复查/);
 await assert.rejects(Repair.run(s,{ids:['ai-wire']},{measure:state=>{const v=measured(state);v.checks.connections.skipped=1;return v;}}),/不完整/);
});
test('repair commands preserve locks, allow scoped layout routing, and reject changes to relation identity',async()=>{
 const s=fixture(),fixed=await Repair.run(s,{ids:['ai-horizontal'],adjustPorts:true},{measure:measured}),task={editMode:'layout',scope:[{id:'ai-horizontal-group'}]};Commands.validateTransition(s,fixed.state,task);
 assert.throws(()=>Commands.validateTransition(s,fixed.state,{...task,scope:[{id:'ai-a'}]}),/选区/);assert.throws(()=>Commands.validateTransition(s,fixed.state,{...task,editMode:'appearance'}),/模式/);
 for(const corrupt of [c=>c.to.node='ai-c',c=>c.label='new',c=>c.color='#ff0000',c=>c.width=3]){const c=Model.clone(s.nodes['ai-horizontal'].connection);corrupt(c);assert.throws(()=>Commands.execute(s,{type:'reroute_connections',updates:[{id:'ai-horizontal',connection:c}]}),/只能调整/);}
 s.nodes['ai-horizontal-group'].locked=true;await assert.rejects(Repair.run(s,{ids:['ai-horizontal']},{measure:measured}),/锁定/);await assert.rejects(Repair.run(s,{ids:['ai-vertical'],adjustPorts:'yes'},{measure:measured}),/布尔/);await assert.rejects(Repair.run(s,{ids:['ai-a']},{measure:measured}),/绑定连线/);
});
test('routing changes invalidate relation evidence while retaining the binding for source revalidation',async()=>{
 const s=fixture(),task={scope:[{id:'custom'}],paperContent:'Input is passed to Output.'},sources=Evidence.sources(task),bindings=Evidence.bind(s,task,sources,{},[{objectId:'ai-horizontal',claim:'Input is passed to Output.',classification:'supported',rationale:'',citations:[{sourceId:sources[0].id,quote:sources[0].text}]}]);
 const fixed=await Repair.run(s,{ids:['ai-horizontal'],adjustPorts:true},{measure:measured});assert.ok(Evidence.coverage(fixed.state,task,bindings).stale.includes('ai-horizontal'));assert.ok(Evidence.prune(fixed.state,bindings)['ai-horizontal']);
});
test('repair cancellation never changes the supplied scene',async()=>{
 const s=fixture(),before=JSON.stringify(s),abort=new AbortController();abort.abort(Error('cancelled'));await assert.rejects(Repair.run(s,{ids:['ai-horizontal'],adjustPorts:true},{measure:measured,signal:abort.signal}),/cancelled/);assert.equal(JSON.stringify(s),before);
});
test('batch repair improves both selected wires together and a locked member rejects the whole batch',async()=>{
 let s=Scene.blank();for(const [prefix,y]of [['upper',80],['lower',400]]){s=module(s,'ai-'+prefix+'-a',80,y);s=module(s,'ai-'+prefix+'-b',800,y);s=module(s,'ai-'+prefix+'-block',400,y-20,100,140);s=wire(s,'ai-'+prefix,'ai-'+prefix+'-a','ai-'+prefix+'-b');}
 const ids=['ai-upper','ai-lower'],before=JSON.stringify(s),fixed=await Repair.run(s,{ids},{measure:measured});assert.equal(fixed.report.status,'improved');assert.deepEqual(fixed.report.changed.sort(),ids.sort());assert.equal(fixed.report.after.issues.length,0);assert.equal(JSON.stringify(s),before);
 s.nodes['ai-upper'].locked=true;await assert.rejects(Repair.run(s,{ids},{measure:measured}),/锁定/);assert.equal(s.nodes['ai-lower'].connection.route,'straight');
});
test('wire avoidance is deterministic across node order and updates dependent locks atomically',async()=>{
 const s=fixture(),fixed=await Repair.run(s,{ids:['ai-horizontal']},{measure:measured});assert.equal(fixed.state.nodes['ai-horizontal'].connection.avoidConnections,true);
 const reversed={...fixed.state,nodes:Object.fromEntries(Object.entries(fixed.state.nodes).reverse())};Connections.sync(reversed);assert.equal(reversed.nodes['ai-horizontal'].markup,fixed.state.nodes['ai-horizontal'].markup);const serialized=JSON.stringify(reversed);Connections.sync(reversed);assert.equal(JSON.stringify(reversed),serialized);
 const both=Commands.execute(fixed.state,{type:'connect',id:'ai-vertical',connection:{...fixed.state.nodes['ai-vertical'].connection,route:'avoid',avoidConnections:true}}),copy=Model.clone(both);Connections.sync(copy);assert.deepEqual(copy.nodes,both.nodes);
 fixed.state.nodes['ai-horizontal'].locked=true;const before=JSON.stringify(fixed.state);assert.throws(()=>Commands.execute(fixed.state,{type:'arrange',action:'grid',ids:['ai-c'],x:340,y:60}),/锁定/);assert.equal(JSON.stringify(fixed.state),before);
});
test('draft repair receipts survive recovery; no-op retains revision and rejected scope never invokes search',async t=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'figure-repair-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));const s=fixture(),task={scene:s.nodes,scope:[{id:'ai-horizontal-group'}],editMode:'layout',taskType:'edit',executionMode:'autonomous',palette:0,allComments:[],baseRevision:'r',currentSvg:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 740"><g id="scene"/></svg>'};
 // The draft renderer callback reads generated SVG wire transforms/ports; the browser tests cover DOM measurement separately.
 const {default:Safety}=await import('./svg-safety.cjs');const runtime={catalog:async()=>[],close:async()=>{},render:async source=>{const state=Model.clone(s),doc=Safety.parse(source);for(const g of Array.from(doc.getElementsByTagName('g'))){const id=g.getAttribute('data-id');if(!state.nodes[id]?.connection)continue;const p=g.getElementsByTagName('path')[0],xy=g.getAttribute('transform').match(/translate\(([-\d.]+) ([-\d.]+)\)/);state.nodes[id].observed=p&&xy?{points:ChecksForPaths(p.getAttribute('d')).map(v=>({x:v.x+Number(xy[1]),y:v.y+Number(xy[2])}))}:null;}const view=measured(state);view.measurement.connections.forEach(w=>{if(state.nodes[w.id].observed)w.points=state.nodes[w.id].observed.points;});view.checks=Checks.analyze(view.measurement);return view;}};
 const {default:Diagnostics}=await import('../connection-checks.js');function ChecksForPaths(d){return Diagnostics.parsePolyline(d);}
 let draft=await createDraftSession({task,dir,runtime});const args={ids:['ai-horizontal'],requestId:'repair',expectedRevision:0},first=await draft.call('repair_connections',args);assert.equal(JSON.parse(first.content[0].text).status,'improved');assert.equal(draft.revision,1);assert.deepEqual(await draft.call('repair_connections',args),first);
 await assert.rejects(draft.call('commit',{requestId:'early',expectedRevision:1,summary:'done',warnings:[]}),/render_region/);
 await assert.rejects(draft.call('repair_connections',{ids:['ai-vertical'],requestId:'scope',expectedRevision:1}),/选区/);assert.equal(draft.revision,1);
 draft=await createDraftSession({task,dir,runtime,resume:true});assert.deepEqual(await draft.call('repair_connections',args),first);const noop=JSON.parse((await draft.call('repair_connections',{...args,requestId:'again',expectedRevision:1})).content[0].text);assert.equal(noop.status,'unchanged');assert.equal(draft.revision,1);
 await draft.call('render_region',{});await draft.call('check_figure',{});await draft.call('commit',{requestId:'done',expectedRevision:1,summary:'done',warnings:[]});assert.equal(draft.result.draft.changes.length,1);
});
