(function(root,factory){const api=factory(typeof module==='object'?require('./model.js'):root.FigureModel);if(typeof module==='object')module.exports=api;else root.FigureConnections=api;})(typeof window==='object'?window:globalThis,function(M){
 'use strict';
 const sides=['left','right','top','bottom'];
 function isModule(nodes,id){return nodes[id]?.type==='component'&&!Object.values(nodes).some(n=>n.parent===id&&n.connection);}
 function validate(nodes){for(const n of Object.values(nodes)){if(!n.connection)continue;const c=n.connection;
  if(n.type!=='leaf'||!c||!['straight','elbow'].includes(c.route)||typeof c.label!=='string'||c.label.length>120||c.color!==undefined&&!/^#[0-9a-f]{6}$/i.test(c.color)||c.width!==undefined&&(!Number.isFinite(c.width)||c.width<0||c.width>20)||c.opacity!==undefined&&(!Number.isFinite(c.opacity)||c.opacity<0||c.opacity>1))throw Error('连接格式无效');
  for(const end of [c.from,c.to])if(!end||!isModule(nodes,end.node)||!sides.includes(end.side)||!Number.isFinite(end.offset)||end.offset<0||end.offset>1)throw Error('连接接口无效');
  if(c.from.node===c.to.node||[c.from.node,c.to.node].some(id=>M.ancestors({nodes},n.id).includes(id)))throw Error('连接不能指向自身或所属容器');
 }}
 function anchor(s,end){const b=M.bounds(s,end.node),t=end.offset;return end.side==='left'?{x:b.x,y:b.y+b.h*t}:end.side==='right'?{x:b.x+b.w,y:b.y+b.h*t}:end.side==='top'?{x:b.x+b.w*t,y:b.y}:{x:b.x+b.w*t,y:b.y+b.h};}
 function geometry(s,c){const a=anchor(s,c.from),b=anchor(s,c.to);let pts=[a];
  if(c.route==='elbow'){
   const h=['left','right'].includes(c.from.side),v=['top','bottom'].includes(c.to.side);
   if(h&&v)pts.push({x:b.x,y:a.y});else if(!h&&!v)pts.push({x:a.x,y:b.y});
   else if(h){const x=(a.x+b.x)/2;pts.push({x,y:a.y},{x,y:b.y});}else{const y=(a.y+b.y)/2;pts.push({x:a.x,y},{x:b.x,y});}
  }pts.push(b);pts=pts.filter((p,i)=>!i||Math.hypot(p.x-pts[i-1].x,p.y-pts[i-1].y)>.001);
  const prev=pts.at(-2)||{x:b.x-1,y:b.y},angle=Math.atan2(b.y-prev.y,b.x-prev.x),size=6;
  const wing=d=>({x:b.x-size*Math.cos(angle+d),y:b.y-size*Math.sin(angle+d)}),w1=wing(.5),w2=wing(-.5);
  const all=[...pts,w1,w2],x=Math.min(...all.map(p=>p.x)),y=Math.min(...all.map(p=>p.y)),w=Math.max(1,Math.max(...all.map(p=>p.x))-x),h=Math.max(1,Math.max(...all.map(p=>p.y))-y);
  const q=p=>`${+(p.x-x).toFixed(3)} ${+(p.y-y).toFixed(3)}`;
  return{x,y,w,h,markup:`<g fill="none" stroke="${c.color||'#416f89'}" stroke-width="${c.width??1.5}" opacity="${c.opacity??1}" stroke-linejoin="round"><path d="M${pts.map(q).join('L')}"/><path d="M${q(w1)}L${q(b)}L${q(w2)}"/></g>`};
 }
 // Connection geometry is derived from module bounds, never guessed from old SVG paths.
 function sync(s){validate(s.nodes);for(const n of Object.values(s.nodes)){if(!n.connection)continue;const b=geometry(s,n.connection),p=n.parent?M.world(s,n.parent):{x:0,y:0,scale:1};Object.assign(n,{x:(b.x-p.x)/p.scale,y:(b.y-p.y)/p.scale,w:b.w,h:b.h,scale:1/p.scale,originX:0,originY:0,markup:b.markup});}}
 return{validate,anchor,geometry,sync,isModule,sides};
});
