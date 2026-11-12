(function(root,factory){const api=factory(typeof module==='object'?require('../model.js'):root.FigureModel,typeof module==='object'?require('./patch-contract.js'):root.FigurePatch);if(typeof module==='object')module.exports=api;else root.FigureAdoption=api;})(typeof window==='object'?window:globalThis,function(M,P){
 'use strict';
 const same=(a,b)=>P.stable(a)===P.stable(b);
 function assess(current,task){
  const base={nodes:task.scene,comments:task.allComments||[],palette:task.palette,canvas:task.canvas};
  const fail=(reason,ids=[])=>({ok:false,rebased:false,reason,ids});
  if(!base.nodes||!Array.isArray(task.scope)||!task.scope.length)return fail('任务选区无效，请重新提交');
  if(task.reviewPolicy==='independent'&&(current.document?.content||'')!==(task.paperContent||''))return fail('独立评审所依据的正文已变化，请重新提交');
  if(!same(M.canvas(current),M.canvas(base)))return fail('画板尺寸已变化，请重新提交');
  if(current.palette!==base.palette)return fail('整图配色已变化，请重新提交');
  if(task.svgDefs===undefined&&current.svgDefs)return fail('旧任务缺少共享 SVG 定义快照，请重新提交');
  if(task.svgDefs!==undefined&&task.svgDefs!==(current.svgDefs||''))return fail('共享 SVG 定义已变化，请重新提交');
  const changed=P.revision(current)!==P.revision(base);
  if(!changed)return{ok:true,rebased:false,reason:'',ids:[]};
  if(task.executionMode==='autonomous')return fail('自主绘图观察过整张画板；画板已变化，请重新提交');
  if(task.taskType==='generate'||task.editMode==='generate')return fail('生成任务的画板已变化，请重新提交');
  const scope=new Set(task.scope.flatMap(s=>[s.id,...M.descendants(base,s.id)]));
  const protectedIds=new Set([...scope,...task.scope.flatMap(s=>M.ancestors(base,s.id))]);
  const modules=new Set([...protectedIds].filter(id=>base.nodes[id]?.type==='component'));
  for(const id of task.relatedContext||[]){protectedIds.add(id);M.ancestors(base,id).forEach(x=>protectedIds.add(x));[...M.descendants(base,id),...M.descendants(current,id)].forEach(x=>protectedIds.add(x));}
  // Bound interfaces depend on both endpoints, even when one is outside the selection.
  for(const n of [...Object.values(base.nodes),...Object.values(current.nodes)])if(n.connection&&[n.connection.from.node,n.connection.to.node].some(id=>modules.has(id))){
   protectedIds.add(n.id);
   for(const id of [n.connection.from.node,n.connection.to.node]){protectedIds.add(id);[...M.descendants(base,id),...M.descendants(current,id)].forEach(x=>protectedIds.add(x));M.ancestors(base,id).forEach(x=>protectedIds.add(x));}
  }
  for(const root of task.scope)for(const id of M.descendants(current,root.id))protectedIds.add(id);
  const conflicts=[...protectedIds].filter(id=>!same(base.nodes[id],current.nodes[id]));
  if(conflicts.length){const names=conflicts.slice(0,3).map(id=>current.nodes[id]?.name||base.nodes[id]?.name||id);return fail('选区或关联对象已变化：'+names.join('、')+'。请重新提交',conflicts);}
  const relevant=comments=>comments.filter(c=>c.targets.some(id=>protectedIds.has(id)));
  if(!same(relevant(base.comments),relevant(current.comments)))return fail('选区或关联对象的意见已变化，请重新提交');
  return{ok:true,rebased:true,reason:'未选区域已变化；应用时会保留这些修改。预览仍显示提交时的其他区域。',ids:[]};
 }
 return{assess};
});
