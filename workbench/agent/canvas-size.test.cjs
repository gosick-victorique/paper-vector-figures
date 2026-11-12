const {test}=require('node:test'),assert=require('node:assert/strict');
const M=require('../model.js'),Size=require('../canvas-size.js'),F=require('../scene-factory.js'),P=require('./patch-contract.js'),Draw=require('../canvas-draw.js'),Arrange=require('../canvas-arrange.js'),View=require('../canvas-view.js'),E=require('../direct-edit.js');
function state(){const s=F.blank();s.nodes.item={id:'item',type:'component',parent:'custom',name:'模块',x:20,y:20,w:100,h:60,scale:1,locked:false};s.nodes.leaf={id:'leaf',type:'leaf',parent:'item',name:'主体',x:0,y:0,w:100,h:60,scale:1,originX:0,originY:0,locked:false,markup:'<rect width="100" height="60"/>'};return s;}
test('canvas changes preserve physical geometry and validate shrink before mutation',()=>{
 const s=state(),before=M.clone(s.nodes);M.setCanvas(s,85,60);assert.deepEqual(s.nodes,before);assert.equal(M.canvas(s).height,400);M.move(s,['item'],10000,10000);assert.ok(Math.abs(M.bounds(s,'item').x+100-M.canvas(s).width)<1e-8);assert.equal(M.bounds(s,'item').y,340);
 const old=M.clone(s);assert.throws(()=>M.setCanvas(s,40,30),/超出/);assert.deepEqual(s,old);assert.throws(()=>M.setCanvas(s,NaN,60));assert.throws(()=>Size.read({widthMm:85,heightMm:60,viewBox:[0,0,1200,740]}),/不一致/);
});
test('drawing, snapping, resizing and fit use a non-default canvas',()=>{
 const s=state();M.setCanvas(s,300,240);const c=M.canvas(s);M.move(s,['item'],1700,900);assert.equal(M.bounds(s,'item').x,1720);
 assert.equal(E.resizeBox(s,['item'],{x:1720,y:920,w:150,h:90},node=>node.markup),true);
 const drawn=Draw.geometry({x:1900,y:1500},{x:2100,y:1700},false,c);assert.equal(drawn.end.x,1999);assert.equal(drawn.end.y,1599);
 const snap=Arrange.snap({x:1900,y:1500,w:50,h:50},49,49,[],1,{width:c.width,height:c.height});assert.equal(snap.dx,50);assert.equal(snap.dy,50);
 const fit=View.fitView(900,700,c.width,c.height);assert.ok(c.width*fit.z<=836&&c.height*fit.z<=636);
});
test('AI revision changes with canvas size and rejects patches outside actual boundaries',()=>{
 const s=state(),revision=P.revision(s);M.setCanvas(s,85,60);assert.notEqual(P.revision(s),revision);
 const task={baseRevision:'test',scope:[{id:'item'}],canvas:s.canvas,editMode:'layout'},result={baseRevision:'test',operations:[{op:'update',id:'item',payload:JSON.stringify({x:600})}]};assert.throws(()=>P.apply(s,task,result),/超出画布/);
});
test('frame-local geometry indexes never survive later edits',()=>{
 const s=state(),first=M.bounds(s,'item');M.withGeometry(s,()=>{assert.deepEqual(M.bounds(s,'item'),first);assert.deepEqual(M.bounds(s,'leaf'),first);});s.nodes.item.x=200;assert.equal(M.withGeometry(s,()=>M.bounds(s,'leaf')).x,200);
});
