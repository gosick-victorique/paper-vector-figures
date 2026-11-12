const {test}=require('node:test'),assert=require('node:assert/strict');
const A=require('./adoption.js'),P=require('./patch-contract.js'),M=require('../model.js'),F=require('../scene-factory.js'),C=require('../connections.js');
function fixture(){const state=F.blank();for(const [id,x]of [['a',30],['b',300],['c',600]]){state.nodes[id]={id,parent:'custom',type:'component',name:id,x,y:40,w:100,h:60,scale:1,locked:false};state.nodes[id+'-leaf']={id:id+'-leaf',parent:id,type:'leaf',kind:'rect',name:id,x:0,y:0,w:100,h:60,scale:1,locked:false,markup:'<rect width="100" height="60"/>'};}const task={scene:M.clone(state.nodes),allComments:[],palette:0,canvas:M.canvas(state),svgDefs:'',scope:[{id:'a'}],taskType:'edit',editMode:'appearance',baseRevision:'test'},result={baseRevision:'test',operations:[{op:'update',id:'a-leaf',payload:JSON.stringify({appearance:{fill:'#123456'}})}]};return{state,task,result};}
test('scoped adoption preserves independent edits, comments and new objects',()=>{
 const {state,task,result}=fixture();state.nodes.b.x=400;state.nodes.c.name='Manual';state.nodes.extra={...state.nodes['c-leaf'],id:'extra',parent:'c'};state.comments.push({id:'manual',targets:['c'],text:'Preserve'});
 assert.deepEqual(A.assess(state,task),{ok:true,rebased:true,reason:'未选区域已变化；应用时会保留这些修改。预览仍显示提交时的其他区域。',ids:[]});const next=P.apply(state,task,result);assert.equal(next.nodes.b.x,400);assert.equal(next.nodes.c.name,'Manual');assert.deepEqual(next.comments,state.comments);assert.deepEqual(next.nodes.extra,state.nodes.extra);assert.equal(next.nodes['a-leaf'].appearance.fill,'#123456');
});
test('selection edits, additions, removals, parent movement and locks conflict',()=>{
 for(const mutate of [s=>s.nodes.a.x++,s=>s.nodes['a-leaf'].locked=true,s=>delete s.nodes['a-leaf'],s=>s.nodes.new={...s.nodes['a-leaf'],id:'new'},s=>s.nodes.custom.scale=2,s=>s.comments.push({id:'note',targets:['a'],text:'New instruction'})]){const {state,task}=fixture();mutate(state);assert.equal(A.assess(state,task).ok,false);}
});
test('canvas, palette, shared definitions and generation require unchanged basis',()=>{
 for(const mutate of [s=>M.setCanvas(s,300,240),s=>s.palette=1,s=>s.svgDefs='<marker/>']){const {state,task}=fixture();mutate(state);assert.equal(A.assess(state,task).ok,false);}
 const {state,task}=fixture();task.taskType='generate';task.editMode='generate';state.nodes.c.x++;assert.equal(A.assess(state,task).ok,false);
});
test('bound wire endpoints are protected even when editing a single leaf',()=>{
 const {state,task}=fixture();state.nodes.wire={id:'wire',parent:'custom',type:'leaf',name:'Wire',x:0,y:0,w:1,h:1,scale:1,locked:false,connection:{from:{node:'a',side:'right',offset:.5},to:{node:'b',side:'left',offset:.5},route:'straight',label:''}};C.sync(state);task.scene=M.clone(state.nodes);task.scope=[{id:'a-leaf'}];state.nodes.b.x++;C.sync(state);assert.equal(A.assess(state,task).ok,false);
});
test('newly attached dependencies and inserted ID collisions cannot overwrite data',()=>{
 const {state,task,result}=fixture();state.nodes.wire={id:'wire',parent:'custom',type:'leaf',name:'Wire',x:0,y:0,w:1,h:1,scale:1,locked:false,connection:{from:{node:'a',side:'right',offset:.5},to:{node:'c',side:'left',offset:.5},route:'straight',label:''}};C.sync(state);assert.equal(A.assess(state,task).ok,false);
 delete state.nodes.wire;state.nodes['ai-new']={...state.nodes['c-leaf'],id:'ai-new'};task.editMode='redraw';result.operations=[{op:'insert',id:'ai-new',payload:JSON.stringify({...state.nodes['a-leaf'],id:'ai-new'})}];assert.equal(A.assess(state,task).ok,true);assert.throws(()=>P.apply(state,task,result));
});

test('adding geometry under a bound endpoint conflicts with a leaf edit',()=>{
 const {state,task}=fixture();state.nodes.wire={id:'wire',parent:'custom',type:'leaf',name:'Wire',x:0,y:0,w:1,h:1,scale:1,locked:false,connection:{from:{node:'a',side:'right',offset:.5},to:{node:'b',side:'left',offset:.5},route:'straight',label:''}};C.sync(state);task.scene=M.clone(state.nodes);task.scope=[{id:'a-leaf'}];state.nodes.new={...state.nodes['b-leaf'],id:'new',w:200};assert.equal(A.assess(state,task).ok,false);
});
