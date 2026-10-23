(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.FigurePrimitiveGeometry=api;})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 const counts={M:2,L:2,H:1,V:1,C:6,S:4,Q:4,T:2,A:7,Z:0},round=x=>Number(x.toFixed(5)),copy=x=>JSON.parse(JSON.stringify(x));
 // Normalize shorthand and relative commands once, preserving cubic, quadratic and arc geometry.
 function parsePath(d){
  const tokens=d.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g)||[];
  if(tokens.length>20000||d.replace(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?|[\s,]/g,''))return null;
  let i=0,cmd='',x=0,y=0,sx=0,sy=0,prev=null;const out=[];
  while(i<tokens.length){if(/^[a-zA-Z]$/.test(tokens[i]))cmd=tokens[i++];const upper=cmd.toUpperCase(),count=counts[upper],relative=cmd!==upper;if(count===undefined||(!out.length&&upper!=='M'))return null;
   if(!count){out.push({cmd:'Z',v:[],start:[x,y],end:[sx,sy]});x=sx;y=sy;cmd='';prev=out.at(-1);continue;}
   if(i+count>tokens.length)return null;const v=tokens.slice(i,i+count).map(Number);if(v.some(n=>!Number.isFinite(n)))return null;i+=count;const start=[x,y];let normalized=upper,a=v.slice();
   const xy=(k)=>{if(relative){a[k]+=x;a[k+1]+=y;}};
   if(['M','L','T'].includes(upper))xy(0);
   if(upper==='H'){a=[v[0]+(relative?x:0),y];normalized='L';}
   if(upper==='V'){a=[x,v[0]+(relative?y:0)];normalized='L';}
   if(upper==='C'){xy(0);xy(2);xy(4);}
   if(upper==='S'){xy(0);xy(2);const c=prev?.cmd==='C'?[2*x-prev.v[2],2*y-prev.v[3]]:[x,y];a=[...c,...a];normalized='C';}
   if(upper==='Q'){xy(0);xy(2);}
   if(upper==='T'){const c=prev?.cmd==='Q'?[2*x-prev.v[0],2*y-prev.v[1]]:[x,y];a=[...c,...a];normalized='Q';}
   if(upper==='A'){xy(5);if(a[0]<0||a[1]<0||![0,1].includes(a[3])||![0,1].includes(a[4]))return null;}
   x=a.at(-2);y=a.at(-1);if(upper==='M'){sx=x;sy=y;cmd=relative?'l':'L';}
   prev={cmd:normalized,v:a,start,end:[x,y]};out.push(prev);
  }
  return out;
 }
 function pathString(segments){return segments.map(s=>s.cmd+s.v.map(round).join(' ')).join(' ');}
 function pathHandles(segments){const out=[];segments.forEach((s,i)=>{if(s.cmd==='Z')return;out.push({key:`p-${i}`,x:s.end[0],y:s.end[1],kind:'anchor',label:i===0?'起点':`节点 ${i}`});if(s.cmd==='C'){out.push({key:`c-${i}-0`,x:s.v[0],y:s.v[1],kind:'control',anchor:s.start,label:'出控制柄'});out.push({key:`c-${i}-2`,x:s.v[2],y:s.v[3],kind:'control',anchor:s.end,label:'入控制柄'});}if(s.cmd==='Q')out.push({key:`c-${i}-0`,x:s.v[0],y:s.v[1],kind:'control',anchor:s.end,label:'曲线控制柄'});});return out;}
 function movePath(segments,key,p){const next=copy(segments),parts=key.split('-'),i=Number(parts[1]),s=next[i];if(!s||s.cmd==='Z')return null;
  if(parts[0]==='c'){const k=Number(parts[2]);s.v[k]=p.x;s.v[k+1]=p.y;}
  else{const dx=p.x-s.end[0],dy=p.y-s.end[1],k=s.v.length-2;s.v[k]=p.x;s.v[k+1]=p.y;
   if(s.cmd==='C'){s.v[2]+=dx;s.v[3]+=dy;}
   const after=next[i+1];if(after?.cmd==='C'||after?.cmd==='Q'){after.v[0]+=dx;after.v[1]+=dy;}
  }
  return parsePath(pathString(next));
 }
 function describe(tag,a){const n=(k,f=0)=>Number(a[k]??f),out={tag,a:{...a},handles:[]},add=(key,x,y,label,kind='anchor')=>out.handles.push({key,x,y,label,kind});
  if(tag==='rect'){const x=n('x'),y=n('y'),w=n('width'),h=n('height'),r=Math.min(w/2,h/2,n('rx',n('ry')));out.label='矩形';out.fields=[['rx','圆角 X',r],['ry','圆角 Y',n('ry',r)]];add('corner',x+r,y+r,'圆角半径','radius');}
  else if(tag==='circle'||tag==='ellipse'){const x=n('cx'),y=n('cy'),rx=n(tag==='circle'?'r':'rx'),ry=n(tag==='circle'?'r':'ry');out.label=tag==='circle'?'圆形':'椭圆';out.fields=tag==='circle'?[['r','半径',rx]]:[['rx','水平半径',rx],['ry','垂直半径',ry]];add('rx',x+rx,y,'水平半径','radius');add('ry',x,y+ry,'垂直半径','radius');}
  else if(tag==='line'){out.label='直线';add('start',n('x1'),n('y1'),'起点');add('end',n('x2'),n('y2'),'终点');out.fields=[];}
  else if(tag==='polygon'||tag==='polyline'){const numbers=(a.points||'').trim().split(/[\s,]+/).map(Number);if(numbers.length%2||numbers.some(v=>!Number.isFinite(v)))return null;out.points=[];for(let i=0;i<numbers.length;i+=2){out.points.push([numbers[i],numbers[i+1]]);add(`v-${i/2}`,numbers[i],numbers[i+1],`顶点 ${i/2+1}`);}out.label=tag==='polygon'?'多边形':'折线';out.fields=[];}
  else if(tag==='path'){out.segments=parsePath(a.d||'');if(!out.segments)return null;out.handles=pathHandles(out.segments);out.label=out.segments.length===2&&out.segments[1].cmd==='L'?'线段':'路径';out.fields=[];}
  else if(tag==='text'){out.label='文字';out.fields=[['letter-spacing','字间距',n('letter-spacing')]];}
  else if(tag==='image'){out.label='图片';out.fields=[];}
  else return null;
  return out;
 }
 function drag(shape,key,p){const a={...shape.a};const n=k=>Number(a[k]||0);
  if(shape.tag==='rect'){const r=Math.max(0,Math.min(n('width')/2,n('height')/2,(p.x-n('x')+p.y-n('y'))/2));a.rx=a.ry=round(r);}
  else if(shape.tag==='circle')a.r=round(Math.max(.1,Math.hypot(p.x-n('cx'),p.y-n('cy'))));
  else if(shape.tag==='ellipse')a[key]=round(Math.max(.1,Math.abs(key==='rx'?p.x-n('cx'):p.y-n('cy'))));
  else if(shape.tag==='line'){a[key==='start'?'x1':'x2']=round(p.x);a[key==='start'?'y1':'y2']=round(p.y);}
  else if(shape.points){const pts=copy(shape.points);pts[Number(key.split('-')[1])]=[round(p.x),round(p.y)];a.points=pts.map(p=>p.join(',')).join(' ');}
  else if(shape.segments){const seg=movePath(shape.segments,key,p);if(!seg)return null;a.d=pathString(seg);}
  return a;
 }
 function ends(shape){if(shape.tag==='line')return{start:[+shape.a.x1||0,+shape.a.y1||0],next:[+shape.a.x2||0,+shape.a.y2||0],end:[+shape.a.x2||0,+shape.a.y2||0],previous:[+shape.a.x1||0,+shape.a.y1||0]};const seg=shape.segments;if(!seg||seg.length<2||seg.some(s=>s.cmd==='Z'))return null;const first=seg[1],last=seg.at(-1);return{start:seg[0].end,next:['C','Q'].includes(first.cmd)?first.v.slice(0,2):first.end,end:last.end,previous:last.cmd==='C'?last.v.slice(2,4):last.cmd==='Q'?last.v.slice(0,2):last.start};}
 function nearestEnd(ends,p){const distance=q=>(q[0]-p.x)**2+(q[1]-p.y)**2;return distance(ends.start)<=distance(ends.end)?'start':'end';}
 return{parsePath,pathString,pathHandles,movePath,describe,drag,ends,nearestEnd};
});
