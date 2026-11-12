(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FigureModel=api;})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 const clone=v=>JSON.parse(JSON.stringify(v));
 const C=typeof module==='object'?require('./canvas-size.js'):globalThis.FigureCanvasSize;
 let geometry=null;
 function withGeometry(s,fn){const previous=geometry,children=new Map();for(const n of Object.values(s.nodes)){if(!children.has(n.parent))children.set(n.parent,[]);children.get(n.parent).push(n);}geometry={state:s,children,worlds:new Map(),boxes:new Map()};try{return fn();}finally{geometry=previous;}}
 function canvas(s){const c=C.read(s);return{...c,width:c.viewBox[2],height:c.viewBox[3]};}
 function setCanvas(s,widthMm,heightMm){
  const next=C.fromMm(widthMm,heightMm),leaves=Object.values(s.nodes).filter(n=>n.type==='leaf');
  for(const leaf of leaves){const b=bounds(s,leaf.id);if(b.x<-.01||b.y<-.01||b.x+b.w>next.viewBox[2]+.01||b.y+b.h>next.viewBox[3]+.01)throw Error('现有图元超出新画板，请先移动或缩小内容');}
  s.canvas=next;return next;
 }
 function transformBox(b,m){const points=[[b.x,b.y],[b.x+b.w,b.y],[b.x,b.y+b.h],[b.x+b.w,b.y+b.h]].map(([x,y])=>({x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f})),x=Math.min(...points.map(p=>p.x)),y=Math.min(...points.map(p=>p.y));return{x,y,w:Math.max(1,Math.max(...points.map(p=>p.x))-x),h:Math.max(1,Math.max(...points.map(p=>p.y))-y)};}
 function ancestors(s,id){const out=[];let n=s.nodes[id];while(n?.parent){out.push(n.parent);n=s.nodes[n.parent];}return out;}
 function roots(s,ids){const set=new Set(ids.filter(id=>s.nodes[id]));return [...set].filter(id=>!ancestors(s,id).some(p=>set.has(p)));}
 function descendants(s,id){return Object.values(s.nodes).filter(n=>ancestors(s,n.id).includes(id)).map(n=>n.id);}
 function world(s,id){const cache=geometry?.state===s?geometry.worlds:null;if(cache?.has(id))return cache.get(id);const n=s.nodes[id];if(!n)return null;const p=n.parent?world(s,n.parent):{x:0,y:0,scale:1},result={x:p.x+n.x*p.scale,y:p.y+n.y*p.scale,scale:p.scale*n.scale};cache?.set(id,result);return result;}
 function bounds(s,id){const cache=geometry?.state===s?geometry.boxes:null;if(cache?.has(id))return cache.get(id);const n=s.nodes[id],t=world(s,id);if(!n)return null;let result;if(n.type!=='leaf'){const children=geometry?.state===s?(geometry.children.get(id)||[]):Object.values(s.nodes).filter(c=>c.parent===id);if(children.length)result=union(children.map(c=>bounds(s,c.id)));}result??={x:t.x,y:t.y,w:Math.max(1,n.w*t.scale),h:Math.max(1,n.h*t.scale)};cache?.set(id,result);return result;}
 function union(boxes){if(!boxes.length)return{x:0,y:0,w:0,h:0};const x=Math.min(...boxes.map(b=>b.x)),y=Math.min(...boxes.map(b=>b.y));return{x,y,w:Math.max(...boxes.map(b=>b.x+b.w))-x,h:Math.max(...boxes.map(b=>b.y+b.h))-y};}
 function selectionBounds(s){return union(roots(s,s.selection).map(id=>bounds(s,id)));}
 function locked(s,id){return [id,...ancestors(s,id)].some(k=>s.nodes[k]?.locked);}
 function movable(s,ids){const affected=new Set(ids.flatMap(id=>[id,...descendants(s,id)]));if(Object.values(s.nodes).some(n=>n.connection&&locked(s,n.id)&&[n.connection.from.node,n.connection.to.node].some(id=>affected.has(id))))return false;return roots(s,ids).every(id=>!s.nodes[id].connection&&!(s.nodes[id].type==='component'&&Object.values(s.nodes).some(n=>n.parent===id&&n.connection))&&!locked(s,id)&&!descendants(s,id).some(k=>s.nodes[k].locked));}
 function move(s,ids,dx,dy,limit=true){const selected=roots(s,ids);if(!selected.length||!movable(s,selected))return false;const box=union(selected.map(id=>bounds(s,id)));if(limit){dx=Math.max(-box.x,Math.min(canvas(s).width-box.x-box.w,dx));dy=Math.max(-box.y,Math.min(canvas(s).height-box.y-box.h,dy));}for(const id of selected){const n=s.nodes[id],p=n.parent?world(s,n.parent):{scale:1};n.x+=dx/p.scale;n.y+=dy/p.scale;}return true;}
 function choose(s,ids,add=false){if(!add)s.selection=roots(s,ids);else{const set=new Set(s.selection);ids.forEach(id=>set.has(id)?set.delete(id):set.add(id));s.selection=roots(s,[...set]);}}
 function setLocks(s,ids,value){roots(s,ids).forEach(id=>s.nodes[id].locked=value);}
 function addComment(s,ids,text){const targets=roots(s,ids);if(!targets.length||!text.trim())return null;const c={id:'comment-'+s.nextId++,targets,text:text.trim(),createdAt:new Date().toISOString()};s.comments.push(c);return c;}
 function commentsFor(s,ids){const scope=new Set(ids.flatMap(id=>[id,...ancestors(s,id),...descendants(s,id)]));return s.comments.filter(c=>c.targets.some(id=>scope.has(id)));}
 function idAtLevel(s,id,level){const n=s.nodes[id];if(!n)return null;if(level==='group')return n.type==='section'?id:ancestors(s,id).find(k=>s.nodes[k].type==='section')||null;if(level==='component')return n.type==='component'?id:n.type==='leaf'?n.parent:null;return n.type==='leaf'?id:null;}
 function selectionIdsAtLevel(s,level){const type=level==='group'?'section':level==='primitive'?'leaf':'component';return Object.values(s.nodes).filter(n=>n.type===type&&(type!=='section'||n.id!=='layout'&&Object.values(s.nodes).some(c=>c.parent===n.id))).map(n=>n.id);}
 function resize(s,id,scale){if(!s.nodes[id]||!movable(s,[id])||!Number.isFinite(scale)||scale<=0)return false;const n=s.nodes[id],old=clone(n),b=bounds(s,id),parentScale=n.parent?world(s,n.parent).scale:1;n.scale=scale;const next=bounds(s,id);n.x+=(b.x-next.x)/parentScale;n.y+=(b.y-next.y)/parentScale;const result=bounds(s,id);if(result.x<0||result.y<0||result.x+result.w>canvas(s).width||result.y+result.h>canvas(s).height){Object.assign(n,old);return false;}return true;}
 function marquee(s,box,level){return selectionIdsAtLevel(s,level).filter(id=>{const b=bounds(s,id);return b.x>=box.x&&b.y>=box.y&&b.x+b.w<=box.x+box.w&&b.y+b.h<=box.y+box.h;});}
 function replaceChildren(s,id,newNodes){const old=descendants(s,id),refs=s.comments.some(c=>c.targets.some(x=>old.includes(x)));if(refs)return{ok:false,reason:'子图元上已有意见，请先处理这些意见，再替换组件。'};if(!movable(s,[id]))return{ok:false,reason:'所选对象或内部图元已锁定，请先解锁。'};old.forEach(k=>delete s.nodes[k]);newNodes.forEach(n=>s.nodes[n.id]=n);s.selection=[id];return{ok:true};}
 return{clone,canvas,setCanvas,withGeometry,transformBox,ancestors,roots,descendants,world,bounds,union,selectionBounds,locked,movable,move,choose,setLocks,addComment,commentsFor,idAtLevel,selectionIdsAtLevel,resize,marquee,replaceChildren};
});
