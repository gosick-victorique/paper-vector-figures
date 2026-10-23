(function(root,factory){const api=factory(typeof module==='object'?require('./model.js'):root.FigureModel);if(typeof module==='object')module.exports=api;else root.FigureDirectEdit=api;})(typeof window==='object'?window:globalThis,function(M){
 'use strict';
 const scope=(s,ids)=>[...new Set(M.roots(s,ids).flatMap(id=>[id,...M.descendants(s,id)]))];
 function canTransform(s,ids){return !!ids.length&&M.movable(s,ids)&&!scope(s,ids).some(id=>s.nodes[id].connection);}
 function transform(s,ids,m,getMarkup){
  if(!canTransform(s,ids)||!Object.values(m).every(Number.isFinite))return false;
  const updates=[];
  for(const id of scope(s,ids).filter(id=>s.nodes[id].type==='leaf')){
   const n=s.nodes[id],w=M.world(s,id),p=n.parent?M.world(s,n.parent):{x:0,y:0,scale:1},box=M.transformBox(M.bounds(s,id),m);
   if(box.x<-.001||box.y<-.001||box.x+box.w>1200.001||box.y+box.h>740.001)return false;
   const ox=n.originX||0,oy=n.originY||0,e=(m.a*w.x+m.c*w.y+m.e-box.x)/w.scale-m.a*ox-m.c*oy,f=(m.b*w.x+m.d*w.y+m.f-box.y)/w.scale-m.b*ox-m.d*oy;
   updates.push({id,x:(box.x-p.x)/p.scale,y:(box.y-p.y)/p.scale,w:box.w/w.scale,h:box.h/w.scale,originX:0,originY:0,markup:`<g transform="matrix(${m.a} ${m.b} ${m.c} ${m.d} ${e} ${f})">${getMarkup(n)}</g>`});
  }
  updates.forEach(n=>Object.assign(s.nodes[n.id],n));return !!updates.length;
 }
 function resizeBox(s,ids,box,getMarkup){const old=M.union(ids.map(id=>M.bounds(s,id)));if(![box.x,box.y,box.w,box.h].every(Number.isFinite)||box.w<2||box.h<2||!old.w||!old.h)return false;const a=box.w/old.w,d=box.h/old.h;return transform(s,ids,{a,b:0,c:0,d,e:box.x-old.x*a,f:box.y-old.y*d},getMarkup);}
 function rotate(s,ids,degrees,getMarkup){const b=M.union(ids.map(id=>M.bounds(s,id))),x=b.x+b.w/2,y=b.y+b.h/2,r=degrees*Math.PI/180,a=Math.cos(r),v=Math.sin(r);return transform(s,ids,{a,b:v,c:-v,d:a,e:x-a*x+v*y,f:y-v*x-a*y},getMarkup);}
 function handleBox(b,handle,dx,dy,free=false){
  let w=b.w+(handle.includes('e')?dx:handle.includes('w')?-dx:0),h=b.h+(handle.includes('s')?dy:handle.includes('n')?-dy:0);
  w=Math.max(2,w);h=Math.max(2,h);
  if(handle.length===2&&!free){const ratio=Math.abs(w/b.w-1)>Math.abs(h/b.h-1)?w/b.w:h/b.h;w=b.w*ratio;h=b.h*ratio;}
  return{x:handle.includes('w')?b.x+b.w-w:b.x,y:handle.includes('n')?b.y+b.h-h:b.y,w,h};
 }
 function remove(s,ids){
  const doomed=new Set(scope(s,ids));
  // Remove empty component shells and their incident wires as one undoable edit.
  let count=-1;while(count!==doomed.size){count=doomed.size;
   for(const n of Object.values(s.nodes)){
    if(n.connection&&[n.connection.from.node,n.connection.to.node].some(id=>doomed.has(id))){doomed.add(n.id);if(s.nodes[n.parent]?.type==='component')doomed.add(n.parent);}
    if(n.type==='component'){const children=Object.values(s.nodes).filter(c=>c.parent===n.id);if(children.length&&children.every(c=>doomed.has(c.id)))doomed.add(n.id);}
   }
  }
  if([...doomed].some(id=>M.locked(s,id)))return false;
  for(const id of doomed)if(s.nodes[id]?.type!=='section')delete s.nodes[id];
  s.comments=s.comments.map(c=>({...c,targets:c.targets.filter(id=>s.nodes[id]&&!doomed.has(id))})).filter(c=>c.targets.length);s.selection=[];return true;
 }
 function duplicate(s,ids){
  ids=M.roots(s,ids);if(!ids.length||!canTransform(s,ids))return false;
  // A section is a persistent board container; copy its contents into a new section.
  const oldIds=scope(s,ids),map=Object.fromEntries(oldIds.map(id=>[id,'copy-'+s.nextId++]));
  for(const id of oldIds){const n=M.clone(s.nodes[id]);n.id=map[id];n.parent=map[n.parent]||n.parent;n.locked=false;if(ids.includes(id))n.name+=' 副本';s.nodes[n.id]=n;}
  s.selection=ids.map(id=>map[id]);M.move(s,s.selection,20,20);return map;
 }
 function layer(s,ids,front){
  ids=M.roots(s,ids);if(!ids.length||scope(s,ids).some(id=>M.locked(s,id)))return false;
  for(const parent of new Set(ids.map(id=>s.nodes[id].parent))){const siblings=Object.values(s.nodes).filter(n=>n.parent===parent),chosen=siblings.filter(n=>ids.includes(n.id)).sort((a,b)=>(a.zIndex||0)-(b.zIndex||0));const edge=(front?Math.max:Math.min)(...siblings.map(n=>n.zIndex||0));chosen.forEach((n,i)=>n.zIndex=front?edge+i+1:edge-chosen.length+i);}
  return true;
 }
 return{scope,canTransform,transform,resizeBox,rotate,handleBox,remove,duplicate,layer};
});
