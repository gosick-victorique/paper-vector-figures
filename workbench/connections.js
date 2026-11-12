(function(root,factory){const api=factory(typeof module==='object'?require('./model.js'):root.FigureModel,typeof module==='object'?require('./connection-routing.js'):root.FigureConnectionRouting);if(typeof module==='object')module.exports=api;else root.FigureConnections=api;})(typeof window==='object'?window:globalThis,function(M,R){
 'use strict';
 const sides=['left','right','top','bottom'];
 function routingIdentity(c){const value=JSON.parse(JSON.stringify(c));delete value.route;delete value.clearance;delete value.avoidConnections;for(const end of ['from','to']){delete value[end].side;delete value[end].offset;}return value;}
 function isModule(nodes,id){return nodes[id]?.type==='component'&&!Object.values(nodes).some(n=>n.parent===id&&n.connection);}
 function validate(nodes){for(const n of Object.values(nodes)){if(!n.connection)continue;const c=n.connection;
  if(n.type!=='leaf'||!c||!['straight','elbow','avoid'].includes(c.route)||typeof c.label!=='string'||c.label.length>120||c.color!==undefined&&!/^#[0-9a-f]{6}$/i.test(c.color)||c.width!==undefined&&(!Number.isFinite(c.width)||c.width<0||c.width>20)||c.clearance!==undefined&&(!Number.isFinite(c.clearance)||c.clearance<4||c.clearance>80)||c.opacity!==undefined&&(!Number.isFinite(c.opacity)||c.opacity<0||c.opacity>1))throw Error('连接格式无效');
  if(c.avoidConnections!==undefined&&typeof c.avoidConnections!=='boolean')throw Error('avoidConnections 必须是布尔值');
  for(const end of [c.from,c.to])if(!end||!isModule(nodes,end.node)||!sides.includes(end.side)||!Number.isFinite(end.offset)||end.offset<0||end.offset>1)throw Error('连接接口无效');
  if(c.from.node===c.to.node||[c.from.node,c.to.node].some(id=>M.ancestors({nodes},n.id).includes(id)))throw Error('连接不能指向自身或所属容器');
 }}
 function anchor(s,end){const b=M.bounds(s,end.node),t=end.offset;return end.side==='left'?{x:b.x,y:b.y+b.h*t}:end.side==='right'?{x:b.x+b.w,y:b.y+b.h*t}:end.side==='top'?{x:b.x+b.w*t,y:b.y}:{x:b.x+b.w*t,y:b.y+b.h};}
 function geometry(s,c,id,cache=new Map()){id??=Object.values(s.nodes).find(n=>n.connection===c)?.id;const a=anchor(s,c.from),b=anchor(s,c.to);let pts=[a];
  if(c.route==='elbow'){
   const h=['left','right'].includes(c.from.side),v=['top','bottom'].includes(c.to.side);
   if(h&&v)pts.push({x:b.x,y:a.y});else if(!h&&!v)pts.push({x:a.x,y:b.y});
   else if(h){const x=(a.x+b.x)/2;pts.push({x,y:a.y},{x,y:b.y});}else{const y=(a.y+b.y)/2;pts.push({x:a.x,y},{x:b.x,y});}
  }pts.push(b);if(c.route==='avoid'){
   const obstacles=[];
   if(c.avoidConnections){if(!id)throw Error('避让连线需要对象 ID');const others=Object.values(s.nodes).filter(n=>n.connection&&n.id!==id&&(n.connection.route!=='avoid'||!n.connection.avoidConnections||n.id<id)&&![n.connection.from.node,n.connection.to.node].some(key=>[c.from.node,c.to.node].includes(key))).sort((a,b)=>a.id<b.id?-1:1);
    if(others.length>80)throw Error('避让连线最多支持 80 条关联路径');for(const other of others){let g=cache.get(other.id);if(!g){g=geometry(s,other.connection,other.id,cache);cache.set(other.id,g);}const pad=4+(c.width??1.5)/2+(other.connection.width??1.5)/2;for(let i=1;i<g.points.length;i++){const p=g.points[i-1],q=g.points[i];obstacles.push({id:other.id,left:Math.min(p.x,q.x)-pad,right:Math.max(p.x,q.x)+pad,top:Math.min(p.y,q.y)-pad,bottom:Math.max(p.y,q.y)+pad});if(obstacles.length>160)throw Error('避让连线最多支持 160 个参考线段，请减少连线复杂度');}}
   }
   pts=R.route(s,c,a,b,obstacles);
  }pts=pts.filter((p,i)=>!i||Math.hypot(p.x-pts[i-1].x,p.y-pts[i-1].y)>.001);
  const prev=pts.at(-2)||{x:b.x-1,y:b.y},angle=Math.atan2(b.y-prev.y,b.x-prev.x),size=6;
  const wing=d=>({x:b.x-size*Math.cos(angle+d),y:b.y-size*Math.sin(angle+d)}),w1=wing(.5),w2=wing(-.5);
  const all=[...pts,w1,w2],x=Math.min(...all.map(p=>p.x)),y=Math.min(...all.map(p=>p.y)),w=Math.max(1,Math.max(...all.map(p=>p.x))-x),h=Math.max(1,Math.max(...all.map(p=>p.y))-y);
  const q=p=>`${+(p.x-x).toFixed(3)} ${+(p.y-y).toFixed(3)}`;
  return{x,y,w,h,points:pts,markup:`<g fill="none" stroke="${c.color||'#416f89'}" stroke-width="${c.width??1.5}" opacity="${c.opacity??1}" stroke-linejoin="round"><path d="M${pts.map(q).join('L')}"/><path d="M${q(w1)}L${q(b)}L${q(w2)}"/></g>`};
 }
 // Connection geometry is derived from module bounds, never guessed from old SVG paths.
 function sync(s,{baseline}={}){validate(s.nodes);const updates=[],cache=new Map();for(const n of Object.values(s.nodes)){if(!n.connection)continue;const b=cache.get(n.id)||geometry(s,n.connection,n.id,cache);cache.set(n.id,b);const p=n.parent?M.world(s,n.parent):{x:0,y:0,scale:1},next={x:(b.x-p.x)/p.scale,y:(b.y-p.y)/p.scale,w:b.w,h:b.h,scale:1/p.scale,originX:0,originY:0,markup:b.markup};if(baseline?.nodes[n.id]&&M.locked(baseline,n.id)&&Object.entries(next).some(([k,v])=>baseline.nodes[n.id][k]!==v))throw Error('修改会改变已锁定连线：'+n.id);updates.push([n,next]);}for(const [n,next]of updates)Object.assign(n,next);}
 return{validate,anchor,geometry,sync,isModule,sides,routingIdentity};
});
