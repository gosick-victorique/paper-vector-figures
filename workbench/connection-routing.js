/* Orthogonal routes on a bounded visibility grid in board coordinates. */
(function(root,factory){const api=factory(typeof module==='object'?require('./model.js'):root.FigureModel);if(typeof module==='object')module.exports=api;else root.FigureConnectionRouting=api;})(globalThis,function(M){
 'use strict';
 const EPS=1e-7,directions={left:{x:-1,y:0},right:{x:1,y:0},top:{x:0,y:-1},bottom:{x:0,y:1}};
 const inside=(p,r)=>p.x>r.left+EPS&&p.x<r.right-EPS&&p.y>r.top+EPS&&p.y<r.bottom-EPS;
 function crosses(a,b,r){return Math.abs(a.y-b.y)<EPS?a.y>r.top+EPS&&a.y<r.bottom-EPS&&Math.max(a.x,b.x)>r.left+EPS&&Math.min(a.x,b.x)<r.right-EPS:a.x>r.left+EPS&&a.x<r.right-EPS&&Math.max(a.y,b.y)>r.top+EPS&&Math.min(a.y,b.y)<r.bottom-EPS;}
 function obstacles(s,c,pad){
  const nodes=Object.values(s.nodes),wireParents=new Set(nodes.filter(n=>n.connection).map(n=>n.parent)),modules=new Set(nodes.filter(n=>n.type==='component'&&!wireParents.has(n.id)).map(n=>n.id)),ends=[c.from.node,c.to.node];
  if(ends.some(id=>M.ancestors(s,id).some(p=>ends.includes(p))))throw Error('自动避障的端点模块不能相互包含');
  const containers=new Set(ends.flatMap(id=>M.ancestors(s,id)));
  const candidates=nodes.filter(n=>!containers.has(n.id)&&!n.connection&&(modules.has(n.id)||n.type==='leaf'&&!wireParents.has(n.parent)&&!M.ancestors(s,n.id).some(id=>modules.has(id)))&&!M.ancestors(s,n.id).some(id=>modules.has(id)&&!containers.has(id)));
  if(candidates.length>80)throw Error('自动避障最多支持 80 个模块或独立图元，请合并相关图元或使用普通折线');
  return candidates.map(n=>{const b=M.bounds(s,n.id);return{id:n.id,left:b.x-pad,right:b.x+b.w+pad,top:b.y-pad,bottom:b.y+b.h+pad};});
 }
 function heap(){
  const items=[],less=(a,b)=>a.f<b.f||a.f===b.f&&(a.g<b.g||a.g===b.g&&a.id<b.id);
  return{get size(){return items.length;},push(item){let i=items.length;items.push(item);while(i){const p=(i-1)>>1;if(!less(item,items[p]))break;items[i]=items[p];i=p;}items[i]=item;},pop(){const first=items[0],last=items.pop();if(items.length){let i=0;while(i*2+1<items.length){let child=i*2+1;if(child+1<items.length&&less(items[child+1],items[child]))child++;if(!less(items[child],last))break;items[i]=items[child];i=child;}items[i]=last;}return first;}};
 }
 function compact(points){return points.filter((p,i)=>!i||Math.abs(p.x-points[i-1].x)+Math.abs(p.y-points[i-1].y)>EPS).reduce((out,p)=>{while(out.length>1){const a=out.at(-2),b=out.at(-1);if(Math.abs((b.x-a.x)*(p.y-b.y)-(b.y-a.y)*(p.x-b.x))>EPS||(b.x-a.x)*(p.x-b.x)+(b.y-a.y)*(p.y-b.y)<0)break;out.pop();}out.push(p);return out;},[]);}
 function route(s,c,a,b,extraObstacles=[]){
  const pad=(c.clearance??12)+Math.max(3,(c.width??1.5)/2),margin=Math.max(1,(c.width??1.5)/2),canvas=M.canvas(s),rects=[...M.withGeometry(s,()=>obstacles(s,c,pad)),...extraObstacles],from=directions[c.from.side],to=directions[c.to.side];
  const start={x:a.x+from.x*pad,y:a.y+from.y*pad},end={x:b.x+to.x*pad,y:b.y+to.y*pad};
  const fail=detail=>{throw Error('自动避障无可用路径：'+detail+'；请调整接口、移动障碍物或减小 clearance 留白');};
  const inCanvas=p=>p.x>=margin-EPS&&p.x<=canvas.width-margin+EPS&&p.y>=margin-EPS&&p.y<=canvas.height-margin+EPS;
  if(!inCanvas(start)||!inCanvas(end))fail('接口朝向画板外侧');
  for(const [p,q,own]of [[a,start,c.from.node],[b,end,c.to.node]])if(rects.some(r=>r.id!==own&&(inside(p,r)||crosses(p,q,r))))fail('接口被其他对象或留白区域遮挡');
  const coords=(values,max)=>[...new Set(values.filter(n=>n>=margin-EPS&&n<=max-margin+EPS))].sort((a,b)=>a-b);
  const xs=coords([start.x,end.x,margin,canvas.width-margin,...rects.flatMap(r=>[r.left,r.right])],canvas.width),ys=coords([start.y,end.y,margin,canvas.height-margin,...rects.flatMap(r=>[r.top,r.bottom])],canvas.height),width=xs.length,count=width*ys.length;
  if(count>30000)throw Error('自动避障搜索网格过大，请合并相关模块或减少独立图元');
  // Mark all blocked vertices and neighboring segments once; search never scans obstacles.
  const blocked=new Uint8Array(count),right=new Uint8Array(count),down=new Uint8Array(count);
  for(const r of rects)for(let y=0;y<ys.length;y++)for(let x=0;x<width;x++){
   const id=y*width+x,inX=xs[x]>r.left+EPS&&xs[x]<r.right-EPS,inY=ys[y]>r.top+EPS&&ys[y]<r.bottom-EPS;
   if(inX&&inY)blocked[id]=1;
   if(inY&&x+1<width&&xs[x+1]>r.left+EPS&&xs[x]<r.right-EPS)right[id]=1;
   if(inX&&y+1<ys.length&&ys[y+1]>r.top+EPS&&ys[y]<r.bottom-EPS)down[id]=1;
  }
  const first=ys.indexOf(start.y)*width+xs.indexOf(start.x),last=ys.indexOf(end.y)*width+xs.indexOf(end.x);
  if(blocked[first]||blocked[last])fail('接口出口被遮挡');
  const distances=new Float64Array(count*2).fill(Infinity),previous=new Int32Array(count*2).fill(-1),queue=heap(),initial=first*2+(from.x?0:1),turn=24;
  const heuristic=id=>Math.abs(xs[id%width]-end.x)+Math.abs(ys[Math.floor(id/width)]-end.y);
  distances[initial]=0;queue.push({id:initial,g:0,f:heuristic(first)});let goal=-1,best=Infinity;
  while(queue.size){
   const current=queue.pop();if(current.f>=best-EPS)break;if(current.g!==distances[current.id])continue;
   const vertex=Math.floor(current.id/2),axis=current.id%2,x=vertex%width,y=Math.floor(vertex/width);
   if(vertex===last){const cost=current.g+(axis===(to.x?0:1)?0:turn);if(cost<best){best=cost;goal=current.id;}continue;}
   const neighbors=[];if(x&& !right[vertex-1])neighbors.push([vertex-1,0,xs[x]-xs[x-1]]);if(x+1<width&&!right[vertex])neighbors.push([vertex+1,0,xs[x+1]-xs[x]]);if(y&&!down[vertex-width])neighbors.push([vertex-width,1,ys[y]-ys[y-1]]);if(y+1<ys.length&&!down[vertex])neighbors.push([vertex+width,1,ys[y+1]-ys[y]]);
   for(const [next,orientation,length]of neighbors){if(blocked[next])continue;const id=next*2+orientation,g=current.g+length+(axis===orientation?0:turn);if(g>=distances[id]-EPS)continue;distances[id]=g;previous[id]=current.id;queue.push({id,g,f:g+heuristic(next)});}
  }
  if(goal<0)fail('障碍物阻断了画板内的通道');
  const points=[];for(let id=goal;id>=0;id=previous[id]){const v=Math.floor(id/2);points.push({x:xs[v%width],y:ys[Math.floor(v/width)]});}return compact([a,...points.reverse(),b]);
 }
 return{route};
});
