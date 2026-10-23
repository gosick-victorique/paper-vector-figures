(function(root,factory){const api=factory(typeof module==='object'?require('../model.js'):root.FigureModel);if(typeof module==='object')module.exports=api;else root.FigurePatch=api;})(typeof window==='object'?window:globalThis,function(M){
 'use strict';
 const clone=M.clone, own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
 const fields=new Set(['x','y','w','h','scale','originX','originY','name','markup','textOverride','appearance']);
 const numeric=new Set(['x','y','w','h','scale','originX','originY']);
 function stable(v){if(Array.isArray(v))return '['+v.map(stable).join(',')+']';if(v&&typeof v==='object')return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}';return JSON.stringify(v);}
 function revision(state){return stable({nodes:state.nodes,palette:state.palette,comments:state.comments});}
 function validateAppearance(a){const keys=['fill','stroke','textColor','strokeWidth','opacity'];if(!a||Array.isArray(a)||typeof a!=='object'||Object.keys(a).some(k=>!keys.includes(k)))throw Error('外观参数无效');for(const[k,v]of Object.entries(a)){if(['fill','stroke','textColor'].includes(k)&&!(typeof v==='string'&&/^(#[0-9a-f]{6}|none)$/i.test(v)))throw Error('颜色参数无效');if(k==='strokeWidth'&&(!Number.isFinite(v)||v<0||v>20)||k==='opacity'&&(!Number.isFinite(v)||v<0||v>1))throw Error('外观数值无效');}}
 function validateScene(nodes){
  if(!nodes||Array.isArray(nodes)||typeof nodes!=='object'||Object.keys(nodes).length>5000)throw Error('图稿结构无效');
  for(const [id,n] of Object.entries(nodes)){
   if(!/^[\w-]{1,100}$/.test(id)||id==='__proto__'||n.id!==id||!['section','component','leaf'].includes(n.type))throw Error('对象 ID 或类型无效');
   if(n.appearance)validateAppearance(n.appearance);
   if(n.zIndex!==undefined&&(!Number.isFinite(n.zIndex)||Math.abs(n.zIndex)>1000000))throw Error('图层顺序无效');
   for(const k of ['x','y','w','h','scale'])if(!Number.isFinite(n[k])||Math.abs(n[k])>100000||(k==='scale'&&n[k]<=0)||(k==='w'||k==='h')&&n[k]<0)throw Error('对象尺寸无效：'+id);
   const seen=new Set([id]);let p=n.parent;
   while(p){if(!own(nodes,p)||seen.has(p)||nodes[p].type==='leaf')throw Error('图层父子关系无效：'+id);seen.add(p);p=nodes[p].parent;}
  }
  const C=typeof module==='object'?require('../connections.js'):globalThis.FigureConnections;C?.validate(nodes);
 }
 function apply(base,task,result,checkMarkup){
  validateScene(base.nodes);
  if(!result||!Array.isArray(result.operations)||result.operations.length>800)throw Error('Agent 返回的修改列表无效');
  if(result.baseRevision!==task.baseRevision)throw Error('Agent 返回了错误的基础版本');
  const scope=task.scope.map(s=>s.id);if(!scope.length||scope.some(id=>!own(base.nodes,id)))throw Error('选区不存在');
  const allowed=new Set(scope.flatMap(id=>[id,...M.descendants(base,id)]));
  const next=clone(base),removed=new Set();
  const mode=task.editMode||'legacy';if(!['legacy','appearance','redraw','layout','generate'].includes(mode))throw Error('修改模式无效');
  if(mode==='generate'&&task.taskType!=='generate'||task.taskType==='generate'&&mode!=='generate')throw Error('生成任务类型与模式不一致');
  for(const op of result.operations){
   if(!op||!['update','insert','remove'].includes(op.op)||typeof op.id!=='string')throw Error('修改操作无效');
   let p;try{p=JSON.parse(op.payload);}catch{throw Error('修改内容不是有效 JSON');}
   if(!p||Array.isArray(p)||typeof p!=='object')throw Error('修改内容必须是对象');
   if('appearance'in p)validateAppearance(p.appearance);
   if(next.nodes[op.id]?.connection||op.op==='remove'&&M.descendants(next,op.id).some(id=>next.nodes[id].connection))throw Error('绑定连线由模块接口自动更新，请在画板修改连接');
   if(mode==='appearance'&&(op.op!=='update'||Object.keys(p).some(k=>k!=='appearance')||next.nodes[op.id]?.type!=='leaf'))throw Error('只改外观模式不能修改几何、文字或对象结构');
   if(mode==='layout'&&(op.op!=='update'||Object.keys(p).some(k=>!['x','y','scale'].includes(k))))throw Error('重新排布模式只允许位置和等比缩放');
   if(task.preserveLabels&&base.nodes[op.id]?.kind==='text'&&(op.op==='remove'||'markup'in p||'textOverride'in p))throw Error('标签已保护，请关闭保留标签后再修改文字图元');
   if(task.preserveLabels&&op.op==='remove'&&M.descendants(base,op.id).some(id=>base.nodes[id].kind==='text'))throw Error('标签已保护，不能删除包含文字图元的组件');
   if(op.op==='insert'){
    const component=mode==='generate'&&p.type==='component';
    if(!/^ai-[\w-]{1,90}$/.test(op.id)||own(next.nodes,op.id)||p.id!==op.id||!component&&p.type!=='leaf'||!allowed.has(p.parent)||!next.nodes[p.parent]||next.nodes[p.parent].type==='leaf'||M.locked(next,p.parent))throw Error('新增图元超出选区或父层已锁定');
    if(mode==='generate'&&(component?next.nodes[p.parent].type!=='section':next.nodes[p.parent].type!=='component'))throw Error('生成图片须按画板、组件、图元分层');
    const keys=new Set(['id','parent','type','kind','locked',...fields]);
    if(Object.keys(p).some(k=>!keys.has(k))||p.locked!==false||(!component&&typeof p.markup!=='string')||(component&&('markup'in p||'textOverride'in p)))throw Error('新增图元格式无效');
    if(!component)checkMarkup?.(p.markup,op.id);
    // New shapes go below existing sibling labels. Preserve all existing sibling
    // order and keep consecutive inserted shapes in the agent's requested order.
    const label=p.kind!=='text'&&Object.values(next.nodes).find(n=>n.parent===p.parent&&n.kind==='text');
    if(label){const ordered={};for(const[id,n]of Object.entries(next.nodes)){if(id===label.id)ordered[op.id]=p;ordered[id]=n;}next.nodes=ordered;}
    else next.nodes[op.id]=p;
    allowed.add(op.id);
   }else{
    if(!allowed.has(op.id)||!own(next.nodes,op.id))throw Error('修改超出选区：'+op.id);
    if(M.locked(next,op.id))throw Error('对象已锁定：'+op.id);
    if(op.op==='remove'){
     const ids=[op.id,...M.descendants(next,op.id)];
     if(scope.includes(op.id)||ids.some(id=>M.locked(next,id))||(next.comments||[]).some(c=>c.targets.some(id=>ids.includes(id))))throw Error('不能删除选区根节点、锁定对象或有批注的对象');
     ids.forEach(id=>{delete next.nodes[id];removed.add(id);});
    }else{
     if(Object.keys(p).some(k=>!fields.has(k)))throw Error('不允许修改对象身份、层级或锁定状态');
     if(Object.keys(p).some(k=>numeric.has(k))&&M.descendants(next,op.id).some(id=>next.nodes[id].locked))throw Error('内部对象已锁定，不能改变父层几何');
     if(('markup'in p||'textOverride'in p)&&next.nodes[op.id].type!=='leaf')throw Error('只能修改基础图元内容');
     if('markup'in p){checkMarkup?.(p.markup,op.id);delete next.nodes[op.id].textOverride;}
     if(p.appearance)p.appearance={...next.nodes[op.id].appearance,...p.appearance};Object.assign(next.nodes[op.id],p);
     if(p.appearance)next.nodes[op.id].customPaint=true;
    }
   }
   for(const [k,v]of Object.entries(p)){
    if(numeric.has(k)&&(!Number.isFinite(v)||Math.abs(v)>100000||k==='scale'&&v<=0))throw Error('修改包含无效数值');
    if(['name','markup','textOverride'].includes(k)&&typeof v!=='string')throw Error('修改包含无效文本');
   }
  }
  validateScene(next.nodes);
  if(mode==='generate')for(const n of Object.values(next.nodes))if(!base.nodes[n.id]&&n.type==='component'&&!Object.values(next.nodes).some(c=>c.parent===n.id&&c.type==='leaf'))throw Error('生成的组件缺少图元');
  if(mode==='redraw')for(const id of scope){const a=M.bounds(base,id),b=M.bounds(next,id);if(b.x<a.x-1||b.y<a.y-1||b.x+b.w>a.x+a.w+1||b.y+b.h>a.y+a.h+1)throw Error('局部重绘超出原选区边界，请使用重新排布或调整选区');}
  const C=typeof module==='object'?require('../connections.js'):globalThis.FigureConnections;C?.sync(next);for(const n of Object.values(base.nodes))if(n.connection&&M.locked(base,n.id)&&stable(n)!==stable(next.nodes[n.id]))throw Error('绑定连线已锁定，不能移动关联接口');
  const vb=task.canvas?.viewBox||[0,0,1200,740];
  for(const id of allowed){if(!next.nodes[id]||stable(next.nodes[id])===stable(base.nodes[id]))continue;const b=M.bounds(next,id);if(b.x<vb[0]-1||b.y<vb[1]-1||b.x+b.w>vb[0]+vb[2]+1||b.y+b.h>vb[1]+vb[3]+1)throw Error('修改后对象超出画布：'+id);}
  next.selection=(next.selection||[]).filter(id=>!removed.has(id));
  return next;
 }
 return{apply,revision,stable,validateScene};
});
