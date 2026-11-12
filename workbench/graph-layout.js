/* Deterministic layout of existing directed connections; never invents edges. */
(function(root,factory){const api=factory(typeof module==='object'?require('./model.js'):root.FigureModel,typeof module==='object'?require('./connections.js'):root.FigureConnections);if(typeof module==='object')module.exports=api;else root.FigureGraphLayout=api;})(globalThis,function(M,C){
 'use strict';
 function analyze(state,ids){
  if(!Array.isArray(ids)||!ids.length||ids.length>80||new Set(ids).size!==ids.length||ids.some(id=>!C.isModule(state.nodes,id))||M.roots(state,ids).length!==ids.length)throw Error('请选择 1–80 个互不包含的模块，不能选择连线分组');
  const selected=new Set(ids),incoming=new Map(ids.map(id=>[id,[]])),outgoing=new Map(ids.map(id=>[id,[]])),edges=[],external=[];
  for(const node of Object.values(state.nodes)){const c=node.connection;if(!c)continue;const from=selected.has(c.from.node),to=selected.has(c.to.node);if(from&&to){edges.push({id:node.id,from:c.from.node,to:c.to.node});if(!outgoing.get(c.from.node).includes(c.to.node)){outgoing.get(c.from.node).push(c.to.node);incoming.get(c.to.node).push(c.from.node);}}else if(from||to)external.push({id:node.id,from:c.from.node,to:c.to.node});}
  const remaining=new Map(ids.map(id=>[id,incoming.get(id).length])),rank=new Map(ids.map(id=>[id,0])),queue=ids.filter(id=>!remaining.get(id)),ordered=[];
  while(queue.length){const id=queue.shift();ordered.push(id);for(const next of outgoing.get(id)){rank.set(next,Math.max(rank.get(next),rank.get(id)+1));remaining.set(next,remaining.get(next)-1);if(!remaining.get(next))queue.push(next);}}
  const visited=new Set(),components=[];for(const id of ids){if(visited.has(id))continue;const group=[],stack=[id];visited.add(id);while(stack.length){const next=stack.pop();group.push(next);for(const neighbor of [...incoming.get(next),...outgoing.get(next)])if(!visited.has(neighbor)){visited.add(neighbor);stack.push(neighbor);}}components.push(group);}
  const blockedByCycles=ids.filter(id=>!ordered.includes(id)),layers=[];if(!blockedByCycles.length)for(const id of ids)(layers[rank.get(id)]??=[]).push(id);
  return{nodes:ids.map(id=>({id,name:state.nodes[id].name,predecessors:incoming.get(id),successors:outgoing.get(id),rank:blockedByCycles.includes(id)?null:rank.get(id)})),edges,external,layers,components,blockedByCycles,roots:ids.filter(id=>!incoming.get(id).length),sinks:ids.filter(id=>!outgoing.get(id).length)};
 }
 const intersects=(a,b,pad=0)=>a.x<b.x+b.w+pad&&a.x+a.w>b.x-pad&&a.y<b.y+b.h+pad&&a.y+a.h>b.y-pad;
 function layout(state,{ids,direction='right',gap=80,laneGap=40,x,y}){
  const graph=analyze(state,ids);if(ids.length<2)throw Error('流程排版至少需要两个模块');if(!['right','down'].includes(direction)||![gap,laneGap].every(n=>Number.isFinite(n)&&n>=8&&n<=500))throw Error('排版方向须为 right/down，间距须为 8–500');
  if(graph.blockedByCycles.length)throw Error('连接存在环或依赖环的节点，无法自动分层：'+graph.blockedByCycles.join(', '));
  if(!graph.edges.length)throw Error('所选模块之间没有绑定连线，请先连接模块');if(!M.movable(state,ids))throw Error('模块、子图元或关联连线已锁定');
  const bounds=new Map(ids.map(id=>[id,M.bounds(state,id)])),original=M.union([...bounds.values()]);x??=original.x;y??=original.y;if(![x,y].every(Number.isFinite))throw Error('排版起点无效');
  const horizontal=direction==='right',along=horizontal?'w':'h',across=horizontal?'h':'w',cross=horizontal?'y':'x',layers=graph.layers.map(layer=>[...layer].sort((a,b)=>bounds.get(a)[cross]-bounds.get(b)[cross]||a.localeCompare(b)));
  const data=new Map(graph.nodes.map(n=>[n.id,n]));
  // Alternate sweeps keep branches near their predecessors/successors without changing graph topology.
  for(let pass=0;pass<4;pass++){const forward=pass%2===0,order=Array.from({length:layers.length},(_,i)=>forward?i:layers.length-1-i),positions=new Map();for(const layer of layers)layer.forEach((id,index)=>positions.set(id,index));for(const i of order){const old=new Map(layers[i].map((id,index)=>[id,index])),score=id=>{const neighbors=data.get(id)[forward?'predecessors':'successors'];return neighbors.length?neighbors.reduce((v,n)=>v+positions.get(n),0)/neighbors.length:old.get(id);};layers[i].sort((a,b)=>score(a)-score(b)||old.get(a)-old.get(b));layers[i].forEach((id,index)=>positions.set(id,index));}}
  const depths=layers.map(layer=>Math.max(...layer.map(id=>bounds.get(id)[along]))),spans=layers.map(layer=>layer.reduce((sum,id)=>sum+bounds.get(id)[across],0)+(layer.length-1)*laneGap),span=Math.max(...spans),depth=depths.reduce((a,b)=>a+b,0)+(layers.length-1)*gap;
  const area={x,y,w:horizontal?depth:span,h:horizontal?span:depth},canvas=M.canvas(state);if(x<0||y<0||x+area.w>canvas.width+.001||y+area.h>canvas.height+.001)throw Error(`流程排版需要 ${Math.ceil(area.w)} × ${Math.ceil(area.h)} 单位，超出画板；请缩小间距、切换方向或扩大画板`);
  const moves=[];let cursor=horizontal?x:y;for(let i=0;i<layers.length;i++){let lane=(horizontal?y:x)+(span-spans[i])/2;for(const id of layers[i]){const b=bounds.get(id),p=cursor+(depths[i]-b[along])/2,next={x:horizontal?p:lane,y:horizontal?lane:p,w:b.w,h:b.h};moves.push({id,box:next,dx:next.x-b.x,dy:next.y-b.y});lane+=b[across]+laneGap;}cursor+=depths[i]+gap;}
  const excluded=new Set(ids.flatMap(id=>[id,...M.descendants(state,id),...M.ancestors(state,id)])),obstacles=Object.values(state.nodes).filter(n=>!excluded.has(n.id)&&!n.connection&&(C.isModule(state.nodes,n.id)||n.type==='leaf'&&!M.ancestors(state,n.id).some(id=>C.isModule(state.nodes,id))));
  for(const move of moves)for(const obstacle of obstacles)if(intersects(move.box,M.bounds(state,obstacle.id),4))throw Error('排版会覆盖未选对象：'+obstacle.id+'；请调整起点或扩大选区');
  for(const move of moves){const node=state.nodes[move.id],scale=node.parent?M.world(state,node.parent).scale:1;node.x+=move.dx/scale;node.y+=move.dy/scale;}
  return{...graph,layers,area};
 }
 return{analyze,layout};
});
