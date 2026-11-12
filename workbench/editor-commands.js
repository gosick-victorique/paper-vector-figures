/* The editor and autonomous drafts use the same atomic scene commands. */
(function(root,factory){const get=n=>typeof module==='object'?require('./'+n[0]):root[n[1]];const api=factory(get(['model.js','FigureModel']),get(['connections.js','FigureConnections']),get(['canvas-arrange.js','FigureArrange']),get(['data-charts.js','FigureCharts']),get(['agent/patch-contract.js','FigurePatch']));if(typeof module==='object')module.exports=api;else root.FigureCommands=api;})(typeof window==='object'?window:globalThis,function(M,C,A,Charts,P){
 'use strict';
 const equal=(a,b)=>P.stable(a)===P.stable(b),clone=M.clone;
 function id(value){if(typeof value!=='string'||!/^[-\w]{1,90}$/.test(value)||['__proto__','constructor','prototype'].includes(value))throw Error('对象 ID 无效');return value;}
 function writable(s,key){if(!s.nodes[key])throw Error('对象不存在：'+key);if(M.locked(s,key)||M.descendants(s,key).some(k=>M.locked(s,k)))throw Error('对象或子对象已锁定：'+key);return s.nodes[key];}
 function parent(s,key){const n=s.nodes[key];if(!n||M.locked(s,key)||n.type==='leaf')throw Error('父对象必须是未锁定的分组或组件');return n;}
 function component(s,c,w,h,kind){
  id(c.id);if(s.nodes[c.id])throw Error('对象 ID 已存在');parent(s,c.parent);
  const n={id:c.id,parent:c.parent,type:'component',kind,name:c.name||kind,x:c.x??0,y:c.y??0,w,h,scale:c.scale??1,locked:false};s.nodes[n.id]=n;return n;
 }
 function content(s,n,kind,result,config){
  const field=kind+'Content',old=Object.values(s.nodes).find(v=>v.parent===n.id&&v[field]),key=old?.id||id(n.id+'-content');
  if(!old&&s.nodes[key])throw Error('内容 ID 已存在');
  let markup=result.markup;
  if(old){
   const DOM=typeof module==='object'?require('@xmldom/xmldom'):{DOMParser,XMLSerializer},parser=new DOM.DOMParser(),doc=parser.parseFromString('<svg xmlns="http://www.w3.org/2000/svg">'+old.markup+'</svg>','image/svg+xml'),original=doc.documentElement.getElementsByTagName('svg')[0];
   if(original){const fresh=parser.parseFromString(result.markup,'image/svg+xml').documentElement;for(const attr of ['x','y','transform'])if(original.hasAttribute(attr))fresh.setAttribute(attr,original.getAttribute(attr));original.parentNode.replaceChild(doc.importNode(fresh,true),original);markup=Array.from(doc.documentElement.childNodes).map(node=>new DOM.XMLSerializer().serializeToString(node)).join('');}
  }
  s.nodes[key]={id:key,parent:n.id,type:'leaf',kind:'svg',name:kind,x:0,y:0,scale:1,locked:false,customPaint:true,...old,w:result.w,h:result.h,[field]:true,markup};delete s.nodes[key].textOverride;
  n[kind]=clone(config);n.w=result.w;n.h=result.h;n.name=config.title||config.source?.slice(0,32)||n.name;
 }
 function execute(base,command,validateMarkup){
  const s=clone(base),c=clone(command);let affected=[];
  if(c.type==='patch')return P.apply(base,c.task,c.result,validateMarkup);
  if(c.type==='create_component'){
   if(!Array.isArray(c.leaves)||!c.leaves.length||c.leaves.length>400)throw Error('组件需要 1–400 个图元');
   if(c.leaves.some(leaf=>!leaf||typeof leaf.markup!=='string'||!leaf.markup.trim()))throw Error('每个图元需要 SVG markup');
   const n=component(s,c,c.w,c.h,c.kind||'network');
   c.leaves.forEach((leaf,i)=>{const key=id(c.id+'-e'+i);if(s.nodes[key])throw Error('图元 ID 已存在');s.nodes[key]={...leaf,id:key,parent:n.id,type:'leaf',kind:leaf.kind||'svg',name:leaf.name||n.name,x:leaf.x??0,y:leaf.y??0,w:leaf.w??c.w,h:leaf.h??c.h,scale:leaf.scale??1,locked:false};});
   if(c.asset)n.assetSource=clone(c.asset);affected=[n.id];
  }else if(c.type==='save_chart'||c.type==='save_equation'){
   const kind=c.type==='save_chart'?'chart':'equation',result=kind==='chart'?Charts.render(c.config):c.rendered;
   if(!result||typeof result.markup!=='string')throw Error('缺少公式渲染结果');
   const n=s.nodes[c.id]?writable(s,c.id):component(s,c,result.w,result.h,kind);
   if(n.type!=='component'||n.kind!==kind)throw Error('对象类型不匹配');content(s,n,kind,result,c.config);affected=[n.id];
  }else if(c.type==='connect'){
   let leaf=s.nodes[c.id];if(leaf){writable(s,c.id);if(!leaf.connection)throw Error('对象不是绑定连线');}
   else{const n=component(s,{...c,id:id(c.id+'-group')},0,0,'arrow');leaf={id:id(c.id),parent:n.id,type:'leaf',kind:'path',name:c.connection.label||'绑定连线',x:0,y:0,w:1,h:1,scale:1,locked:false};s.nodes[leaf.id]=leaf;}
   leaf.connection=clone(c.connection);affected=[leaf.parent];
  }else if(c.type==='reroute_connections'){
   if(!Array.isArray(c.updates)||!c.updates.length||c.updates.length>12||new Set(c.updates.map(u=>u.id)).size!==c.updates.length)throw Error('一次修复需要 1–12 条不同的绑定连线');
   for(const update of c.updates){const n=writable(s,update.id);if(!n.connection||!update.connection||!equal(C.routingIdentity(n.connection),C.routingIdentity(update.connection)))throw Error('修复只能调整路径和接口，不能改变连接对象、方向、含义或样式');n.connection=clone(update.connection);affected.push(n.id);}
  }else if(c.type==='remove'){
   for(const key of M.roots(s,c.ids)){writable(s,key);for(const k of [key,...M.descendants(s,key)])delete s.nodes[k];}affected=[];
  }else if(c.type==='layout_graph'){
   const graph=typeof module==='object'?require('./graph-layout.js'):globalThis.FigureGraphLayout;graph.layout(s,c);affected=c.ids;
  }else if(c.type==='arrange'){
   const ids=M.roots(s,c.ids);ids.forEach(k=>writable(s,k));
   if(c.action==='grid'){
    const columns=c.columns??ids.length,gap=c.gap??24,x=c.x??20,y=c.y??20;
    if(!Number.isInteger(columns)||columns<1||columns>20||![gap,x,y].every(Number.isFinite)||gap<0)throw Error('网格参数无效');
    const boxes=ids.map(k=>M.bounds(s,k)),w=Math.max(...boxes.map(b=>b.w)),h=Math.max(...boxes.map(b=>b.h));
    boxes.forEach((b,i)=>{const n=s.nodes[ids[i]],p=n.parent?M.world(s,n.parent):{scale:1};n.x+=(x+i%columns*(w+gap)-b.x)/p.scale;n.y+=(y+Math.floor(i/columns)*(h+gap)-b.y)/p.scale;});
   }else if(!A.arrange(s,ids,c.action)&&!A.actions.includes(c.action))throw Error('排版动作无效');
   affected=ids;
  }else throw Error('未知编辑命令');
  C.sync(s);P.validateScene(s.nodes);
  for(const n of Object.values(s.nodes))if(!equal(n,base.nodes[n.id])){
   if(typeof n.name!=='string'||n.name.length>1000||n.type!=='section'&&typeof n.kind!=='string')throw Error('对象名称或类别无效');
   for(const k of ['originX','originY'])if(n[k]!==undefined&&!Number.isFinite(n[k]))throw Error('图元原点无效');
  }
  // Locks also protect wire geometry derived from a moved endpoint.
  for(const n of Object.values(base.nodes))if(M.locked(base,n.id)&&!equal(n,s.nodes[n.id]))throw Error('修改影响锁定对象：'+n.id);
  for(const comment of base.comments||[])if(comment.targets.some(k=>!s.nodes[k]))throw Error('请先处理对象上的批注');
  for(const n of Object.values(s.nodes))if(n.markup&&n.markup!==base.nodes[n.id]?.markup)validateMarkup?.(n.markup,n.id);
  s.selection=affected;return s;
 }
 function diff(base,next){return [...new Set([...Object.keys(base.nodes),...Object.keys(next.nodes)])].filter(k=>!equal(base.nodes[k],next.nodes[k])).map(k=>({id:k,node:next.nodes[k]?clone(next.nodes[k]):null}));}
 // Validate a complete transition as well as each command. Used again on adoption.
 function validateTransition(base,next,task,validateMarkup){
  P.validateScene(next.nodes);const scope=task.scope.map(s=>s.id),allowed=new Set(scope.flatMap(k=>[k,...M.descendants(base,k)]));
  const mode=task.editMode||'redraw';if(!['generate','redraw','layout','appearance'].includes(mode))throw Error('修改模式无效');
  if(mode==='generate'&&task.taskType!=='generate')throw Error('任务类型不一致');
  const synced=clone(next);C.sync(synced);if(!equal(synced.nodes,next.nodes))throw Error('绑定连线几何未同步');
  for(const {id:key,node:n} of diff(base,next)){
   const old=base.nodes[key];
   if(old){
    // Only automatically derived geometry of existing unlocked wires may change outside scope.
    const derived=old.connection&&n&&equal(old.connection,n.connection)&&equal({...old,x:n.x,y:n.y,w:n.w,h:n.h,scale:n.scale,originX:n.originX,originY:n.originY,markup:n.markup},n);
    const rerouted=mode==='layout'&&old.connection&&n?.connection&&equal(C.routingIdentity(old.connection),C.routingIdentity(n.connection))&&equal({...old,connection:n.connection,x:n.x,y:n.y,w:n.w,h:n.h,scale:n.scale,originX:n.originX,originY:n.originY,markup:n.markup},n);
    if(!allowed.has(key)&&!derived)throw Error('修改超出选区：'+key);
    if(M.locked(base,key))throw Error('对象已锁定：'+key);
    if(n&&(n.parent!==old.parent||n.type!==old.type||n.locked!==old.locked))throw Error('不能更改身份、层级或锁定状态');
    if(!n&&(scope.includes(key)||(base.comments||[]).some(c=>c.targets.includes(key))))throw Error('不能删除选区根节点或有批注的对象');
    if(n&&['x','y','w','h','scale'].some(k=>n[k]!==old[k])&&M.descendants(base,key).some(k=>M.locked(base,k)))throw Error('不能移动包含锁定对象的容器');
    if(task.preserveLabels&&(old.kind==='text'||/<(?:text|tspan)\b/i.test(old.markup||''))&&(!n||n.markup!==old.markup||n.textOverride!==old.textOverride))throw Error('文字已保护，请关闭保留标签后再修改');
    if(!derived&&!rerouted&&['layout','appearance'].includes(mode)){
     const fields=mode==='layout'?['x','y','scale']:['appearance','customPaint'];
     if(!n||!equal(Object.fromEntries(Object.entries(old).filter(([k])=>!fields.includes(k))),Object.fromEntries(Object.entries(n).filter(([k])=>!fields.includes(k)))))throw Error('命令超出当前修改模式');
    }
   }else{
    if(!/^ai-/.test(key)||!n||n.locked!==false||!['component','leaf'].includes(n.type)||['layout','appearance'].includes(mode))throw Error('新增对象格式或模式无效');
    let p=n.parent,seen=new Set();while(p&&!allowed.has(p)){if(seen.has(p)||base.nodes[p])throw Error('新增对象超出选区');seen.add(p);p=next.nodes[p]?.parent;}if(!p||M.locked(next,p))throw Error('新增对象父层无效');
   }
   if(n?.markup&&n.markup!==old?.markup)validateMarkup?.(n.markup,n.id);
   if(n&&(n.chart||n.equation)&&n.type!=='component')throw Error('可编辑数据必须位于组件上');
  }
  if(mode==='redraw')for(const key of scope){const a=M.bounds(base,key),b=M.bounds(next,key);if(b.x<a.x-1||b.y<a.y-1||b.x+b.w>a.x+a.w+1||b.y+b.h>a.y+a.h+1)throw Error('重绘超出选区边界，请选择重新排布或生成模式');}
  return next;
 }
 function adopt(base,task,result,validateMarkup){
  if(result.baseRevision!==task.baseRevision||!result.draft||!Array.isArray(result.draft.changes)||result.draft.changes.length>5000)throw Error('自主草稿版本无效');
  const next=clone(base),seen=new Set();for(const change of result.draft.changes){id(change.id);if(seen.has(change.id))throw Error('草稿包含重复对象');seen.add(change.id);if(change.node===null)delete next.nodes[change.id];else next.nodes[change.id]=clone(change.node);}
  validateTransition(base,next,task,validateMarkup);if(task.reviewPolicy==='independent')(typeof module==='object'?require('./evidence-contract.js'):globalThis.FigureEvidence).validateCommit(result.draft.dossier,next,task);next.selection=(base.selection||[]).filter(k=>next.nodes[k]);return next;
 }
 return{execute,diff,validateTransition,adopt};
});
