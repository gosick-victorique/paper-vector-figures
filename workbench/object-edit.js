(function(root,factory){const api=factory(typeof module==='object'?require('./model.js'):root.FigureModel);if(typeof module==='object')module.exports=api;else root.FigureObjectEdit=api;})(typeof window==='object'?window:globalThis,function(M){
 function leaves(s,ids){return [...new Set(M.roots(s,ids).flatMap(id=>[id,...M.descendants(s,id)]))].filter(id=>s.nodes[id].type==='leaf');}
 function resize(s,ids,width,height,getMarkup){
  if(!ids.length||!M.movable(s,ids)||![width,height].every(v=>Number.isFinite(v)&&v>0))return false;
  const box=M.union(M.roots(s,ids).map(id=>M.bounds(s,id)));if(box.x+width>1200||box.y+height>740||box.w<=0||box.h<=0)return false;
  const sx=width/box.w,sy=height/box.h,updates=[];
  for(const id of leaves(s,ids)){const n=s.nodes[id],w=M.world(s,id),p=n.parent?M.world(s,n.parent):{x:0,y:0,scale:1},ox=n.originX||0,oy=n.originY||0;
   updates.push({id,x:(box.x+(w.x-box.x)*sx-p.x)/p.scale,y:(box.y+(w.y-box.y)*sy-p.y)/p.scale,w:n.w*sx,h:n.h*sy,markup:`<g transform="translate(${ox} ${oy}) scale(${sx} ${sy}) translate(${-ox} ${-oy})">${getMarkup(n)}</g>`});
  }
  for(const u of updates)Object.assign(s.nodes[u.id],u);
  return true;
 }
 function paint(element,{fill,stroke,strokeWidth,opacity,textColor}){
  // Override inline styles as well as attributes, including inherited group paint.
  const set=(e,k,v)=>{if(v==null)return;e.setAttribute(k,v);if(e.style)e.style.removeProperty(k);else{const style=e.getAttribute('style');if(style)e.setAttribute('style',style.split(';').filter(x=>x.split(':')[0].trim()!==k).join(';'));}};
  const all=[element,...Array.from(element.getElementsByTagName('*'))];
  for(const e of all){const tag=e.localName||e.tagName;if(['text','tspan'].includes(tag)){set(e,'fill',textColor);continue;}if(!['path','rect','circle','ellipse','line','polygon','polyline'].includes(tag))continue;
   const openStroke=(tag==='path'&&!/[zZ]/.test(e.getAttribute('d')||'')||tag==='polyline')&&e.getAttribute('fill')==='none';
   if(fill!=null&&tag!=='line'&&!openStroke){set(e,'fill',fill);if(fill!=='none'&&e.hasAttribute('fill-opacity')&&Number(e.getAttribute('fill-opacity'))===0)set(e,'fill-opacity',1);}
   set(e,'stroke',stroke);set(e,'stroke-width',strokeWidth);
  }
  set(element,'opacity',opacity);return element;
 }
 return{leaves,resize,paint};
});
