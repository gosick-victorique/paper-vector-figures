/* Diagnostics for rendered bound-wire polylines, in board coordinates. */
(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.FigureConnectionChecks=api;})(globalThis,function(){
 'use strict';
 const limits={maxConnections:200,maxSegments:2000,maxSegmentsPerWire:200,maxObstacles:1000,maxComparisons:250000,maxIssues:150},EPS=1e-6;
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y}),cross=(a,b)=>a.x*b.y-a.y*b.x;
 const point=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
 function region(points){let x=Infinity,y=Infinity,right=-Infinity,bottom=-Infinity;for(const p of points){x=Math.min(x,p.x);y=Math.min(y,p.y);right=Math.max(right,p.x);bottom=Math.max(bottom,p.y);}return{x:x-8,y:y-8,w:Math.max(16,right-x+16),h:Math.max(16,bottom-y+16)};}
 function intersection(a,b,c,d){
  const r=sub(b,a),s=sub(d,c),q=sub(c,a),den=cross(r,s),length=distance(a,b);
  if(length<EPS||distance(c,d)<EPS)return null;
  if(Math.abs(den)>EPS){const t=cross(q,s)/den,u=cross(q,r)/den;return t>=-EPS&&t<=1+EPS&&u>=-EPS&&u<=1+EPS?{points:[point(a,b,Math.max(0,Math.min(1,t)))],length:0}:null;}
  if(Math.abs(cross(q,r))>EPS*length)return null;
  const dot=p=>(p.x*r.x+p.y*r.y)/(length*length),lo=Math.max(0,Math.min(dot(q),dot(sub(d,a)))),hi=Math.min(1,Math.max(dot(q),dot(sub(d,a))));
  if(hi<lo-EPS)return null;return{points:[point(a,b,lo),point(a,b,hi)],length:Math.max(0,(hi-lo)*length)};
 }
 // A small inset excludes mere boundary touches and SVG rounding at bound ports.
 function through(a,b,box){
  const inset=Math.min(.5,box.w/4,box.h/4);if(box.w<=0||box.h<=0)return null;let lo=0,hi=1;
  for(const [key,min,max]of [['x',box.x+inset,box.x+box.w-inset],['y',box.y+inset,box.y+box.h-inset]]){const delta=b[key]-a[key];if(Math.abs(delta)<EPS){if(a[key]<=min||a[key]>=max)return null;continue;}const t=(min-a[key])/delta,u=(max-a[key])/delta;lo=Math.max(lo,Math.min(t,u));hi=Math.min(hi,Math.max(t,u));if(hi<=lo)return null;}
  return hi>lo&&distance(a,b)*(hi-lo)>.5?{points:[point(a,b,lo),point(a,b,hi)],length:distance(a,b)*(hi-lo)}:null;
 }
 function parsePolyline(d){
  if(typeof d!=='string'||d.length>30000||!/^\s*M/.test(d))return null;
  const tokens=d.match(/[ML]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/gi)||[];
  if(d.replace(/[ML]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?|[\s,]/gi,'')||tokens.length<3)return null;
  const out=[];let i=0;while(i<tokens.length){if(tokens[i]!== (i===0?'M':'L'))return null;i++;if(i+1>=tokens.length)return null;const x=Number(tokens[i++]),y=Number(tokens[i++]);if(!Number.isFinite(x)||!Number.isFinite(y))return null;out.push({x,y});}return out.length>=2?out:null;
 }
 function analyze({connections=[],boundWires=connections,modules=[],leaves=[],texts=[],connectionSkipped=0,connectionTruncated=false},options={}){
  const config={...limits,...options},issues=[];let truncated=connectionTruncated,comparisons=0,skipped=connectionSkipped,segmentCount=0;
  const moduleIds=new Set(modules.map(m=>m.id)),wires=[];
  for(const wire of connections){if(wires.length>=config.maxConnections){truncated=true;break;}if(!Array.isArray(wire.points)||wire.points.length<2||wire.points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y))){skipped++;continue;}const segments=wire.points.slice(1).map((p,i)=>[wire.points[i],p]).filter(([a,b])=>distance(a,b)>EPS);if(!segments.length){skipped++;continue;}if(segments.length>config.maxSegmentsPerWire||segmentCount+segments.length>config.maxSegments){truncated=true;continue;}segmentCount+=segments.length;wires.push({...wire,segments});}
  const wireIds=new Set(boundWires.map(w=>w.id)),wireParents=new Set(boundWires.map(w=>w.parent)),obstacles=[...modules.filter(m=>!wireParents.has(m.id)),...leaves.filter(l=>!wireIds.has(l.id)&&!wireParents.has(l.parent)&&!(l.ancestors||[]).some(id=>moduleIds.has(id)))];
  if(wires.length&&obstacles.length>config.maxObstacles)truncated=true;const bounded=obstacles.slice(0,config.maxObstacles);
  const tick=()=>{if(comparisons>=config.maxComparisons){truncated=true;return false;}comparisons++;return true;};
  function add(code,ids,message,magnitude,points,suggestion){if(issues.length>=config.maxIssues){truncated=true;return;}issues.push({key:code+':'+[...ids].sort().join(','),code,severity:'warning',ids,message,magnitude,region:region(points),suggestion});}
  const name=w=>w.name||w.id,shared=(a,b,p)=>['from','to'].some(e=>['from','to'].some(f=>a[e]&&a[e]===b[f]&&distance(p,e==='from'?a.points[0]:a.points.at(-1))<.5&&distance(p,f==='from'?b.points[0]:b.points.at(-1))<.5));
  outer:for(let i=0;i<wires.length;i++)for(let j=i+1;j<wires.length;j++){
   const a=wires[i],b=wires[j],hits=new Map(),overlaps=[],overlapEnds=new Set(),key=p=>p.x.toFixed(4)+','+p.y.toFixed(4);let length=0;
   for(const [p,q]of a.segments)for(const [r,s]of b.segments){if(!tick())break outer;const hit=intersection(p,q,r,s);if(!hit)continue;if(hit.length>.5){length+=hit.length;overlaps.push(...hit.points);hit.points.forEach(p=>overlapEnds.add(key(p)));}else if(!shared(a,b,hit.points[0]))hits.set(key(hit.points[0]),hit.points[0]);}
   if(length>.5)add('wire-overlap',[a.id,b.id],`${name(a)} 与 ${name(b)} 共线重叠约 ${length.toFixed(1)} 单位，可能难以区分分支`,length,overlaps,'核对是否为有意共用的分支；否则调整端口位置或模块间距，再渲染检查。');
   const crossings=[...hits].filter(([key])=>!overlapEnds.has(key)).map(([,p])=>p);if(crossings.length)add('wire-crossing',[a.id,b.id],`${name(a)} 与 ${name(b)} 有 ${crossings.length} 处交叉或非共用端口接触`,crossings.length,crossings,'调整分支顺序、模块位置或接口，使连接关系清晰；不要改变科学关系。');
  }
  obstacleLoop:for(const wire of wires){
   const ends=modules.filter(m=>[wire.from,wire.to].includes(m.id)),containers=new Set(ends.flatMap(m=>m.ancestors||[]));
   const candidates=bounded.filter(o=>!containers.has(o.id)&&!(o.ancestors||[]).some(id=>moduleIds.has(id)&&!containers.has(id)));
   for(const o of candidates){let length=0;const points=[];for(const [a,b]of wire.segments){if(!tick())break obstacleLoop;const hit=through(a,b,o.box);if(hit){length+=hit.length;points.push(...hit.points);}}if(length)add('wire-obstacle',[wire.id,o.id],`${name(wire)} 穿过 ${name(o)} 的图形边界区域约 ${length.toFixed(1)} 单位`,length,points,'查看局部渲染；可将连线切换为“自动避障”，或调整接口、模块位置与留白。包围框可能包含空白。');}
   const groups=new Map();for(const t of texts){if(t.id===wire.id)continue;for(const [a,b]of wire.segments){if(!tick())break obstacleLoop;const hit=through(a,b,t.box);if(hit){const group=groups.get(t.id)||{length:0,points:[]};group.length+=hit.length;group.points.push(...hit.points);groups.set(t.id,group);}}}
   for(const [id,hit]of groups)add('wire-text',[wire.id,id],`${name(wire)} 穿过文字区域，可能影响阅读`,hit.length,hit.points,'移动标签或调整连接路径，放大局部图确认字形与线条是否相交。');
  }
  return{issues,skipped,truncated,counts:{connections:wires.length,segments:segmentCount,comparisons},limits:config,limitations:['仅检查带绑定元数据的直线与折线路径；自由路径、曲线和位图中的连线不在检查范围。','图形和文字穿越按实际渲染的包围框估算；交叉或共线可能是有意设计，需要查看局部图。']};
 }
 return{analyze,parsePolyline,limits};
});
