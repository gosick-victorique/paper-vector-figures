(function(root,factory){const api=factory(typeof module==='object'?require('./model.js'):root.FigureModel);if(typeof module==='object')module.exports=api;else root.FigureArrange=api;})(typeof window==='object'?window:globalThis,function(M){
 'use strict';
 const actions=['left','center','right','top','middle','bottom','distribute-x','distribute-y'];
 function arrange(s,ids,key){
  ids=M.roots(s,ids);if(!actions.includes(key)||ids.length<2||!M.movable(s,ids))return false;
  const boxes=ids.map(id=>({id,...M.bounds(s,id)})),b=M.union(boxes),moves=[];
  if(key.startsWith('distribute')){
   if(ids.length<3)return false;
   const axis=key.endsWith('x')?'x':'y',size=axis==='x'?'w':'h';boxes.sort((a,b)=>a[axis]-b[axis]);
   // Keep the first and last objects stationary; distribute the space between them.
   const first=boxes[0],last=boxes.at(-1),gap=(last[axis]+last[size]-first[axis]-boxes.reduce((n,a)=>n+a[size],0))/(boxes.length-1);
   if(gap<0)return false;
   let cursor=first[axis]+first[size]+gap;
   for(const a of boxes.slice(1,-1)){moves.push({id:a.id,dx:axis==='x'?cursor-a.x:0,dy:axis==='y'?cursor-a.y:0});cursor+=a[size]+gap;}
  }else for(const a of boxes)moves.push({id:a.id,dx:key==='left'?b.x-a.x:key==='center'?b.x+b.w/2-a.x-a.w/2:key==='right'?b.x+b.w-a.x-a.w:0,dy:key==='top'?b.y-a.y:key==='middle'?b.y+b.h/2-a.y-a.h/2:key==='bottom'?b.y+b.h-a.y-a.h:0});
  const next=M.clone(s);for(const m of moves)if(!M.move(next,[m.id],m.dx,m.dy,false))return false;
  if(!moves.some(m=>Math.abs(m.dx)+Math.abs(m.dy)>1e-7))return false;
  for(const m of moves){const b=M.bounds(next,m.id);if(b.x<0||b.y<0||b.x+b.w>1200.001||b.y+b.h>740.001)return false;}
  for(const m of moves){s.nodes[m.id].x=next.nodes[m.id].x;s.nodes[m.id].y=next.nodes[m.id].y;}return true;
 }
 function targets(s,ids,level){
  const excluded=new Set(ids.flatMap(id=>[id,...M.descendants(s,id),...M.ancestors(s,id)]));
  return M.selectionIdsAtLevel(s,level).filter(id=>!excluded.has(id)&&!s.nodes[id].connection).map(id=>M.bounds(s,id));
 }
 function snap(box,dx,dy,others,zoom=1,{enabled=true,axis=null}={}){
  if(axis==='x')dy=0;if(axis==='y')dx=0;
  dx=Math.max(-box.x,Math.min(1200-box.x-box.w,dx));dy=Math.max(-box.y,Math.min(740-box.y-box.h,dy));
  if(!enabled)return{dx,dy,guides:[]};
  const moved={...box,x:box.x+dx,y:box.y+dy},tolerance=6/Math.max(.1,zoom),matches=[];
  for(const dimension of ['x','y']){
   if(axis&&axis!==dimension)continue;
   const size=dimension==='x'?'w':'h',cross=dimension==='x'?'y':'x',crossSize=dimension==='x'?'h':'w',limit=dimension==='x'?1200:740;
   const anchors=[moved[dimension],moved[dimension]+moved[size]/2,moved[dimension]+moved[size]],candidates=[];
   const references=others.concat([{x:0,y:0,w:1200,h:740,board:true}]);
   for(const ref of references)for(const coordinate of [ref[dimension],ref[dimension]+ref[size]/2,ref[dimension]+ref[size]])for(const anchor of anchors){
    const offset=coordinate-anchor,pos=moved[dimension]+offset;
    if(Math.abs(offset)<=tolerance&&pos>=0&&pos+moved[size]<=limit)candidates.push({dimension,offset,coordinate,ref});
   }
   candidates.sort((a,b)=>Math.abs(a.offset)-Math.abs(b.offset)||Number(a.ref.board||false)-Number(b.ref.board||false));
   const best=candidates[0];if(best){matches.push({...best,from:Math.min(moved[cross],best.ref[cross]),to:Math.max(moved[cross]+moved[crossSize],best.ref[cross]+best.ref[crossSize])});if(dimension==='x')dx+=best.offset;else dy+=best.offset;}
  }
  return{dx,dy,guides:matches.map(({dimension,coordinate,from,to})=>({dimension,coordinate,from,to}))};
 }
 return{arrange,targets,snap};
});
