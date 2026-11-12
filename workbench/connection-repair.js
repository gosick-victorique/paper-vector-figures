/* Bounded search over route/port settings; only verified improvements are applied. */
(function(root,factory){const get=(file,name)=>typeof module==='object'?require('./'+file):root[name];const api=factory(get('model.js','FigureModel'),get('connections.js','FigureConnections'),get('connection-checks.js','FigureConnectionChecks'),get('figure-checks.js','FigureChecks'),get('editor-commands.js','FigureCommands'));if(typeof module==='object')module.exports=api;else root.FigureConnectionRepair=api;})(globalThis,function(M,C,Diagnostics,Checks,Commands){
 'use strict';
 const limits={maxSelected:12,maxWires:80,maxCandidates:192,maxPerWire:32,passes:2},clone=M.clone;
 const wireIssues=report=>report.issues.filter(i=>i.code.startsWith('wire-'));
 function improves(before,after){const previous=new Map(before.map(i=>[i.key,i]));return after.every(i=>previous.has(i.key)&&i.magnitude<=(previous.get(i.key).magnitude??0)+.05)&&(after.length<before.length||after.some(i=>i.magnitude<(previous.get(i.key).magnitude??0)-.05));}
 function validate(state,{ids,adjustPorts=false}){
  if(!Array.isArray(ids)||!ids.length||ids.length>limits.maxSelected||new Set(ids).size!==ids.length||ids.some(id=>!state.nodes[id]?.connection))throw Error('请选择 1–12 条不同的绑定连线图元 ID');
  if(typeof adjustPorts!=='boolean')throw Error('adjustPorts 必须是布尔值');
  if(ids.some(id=>M.locked(state,id)))throw Error('所选连线或所属容器已锁定');
  if(Object.values(state.nodes).filter(n=>n.connection).length>limits.maxWires)throw Error('自动修复最多支持含 80 条绑定连线的画板');
 }
 function candidates(c,adjustPorts){
  const variants=[],seen=new Set([JSON.stringify(c)]),add=value=>{const key=JSON.stringify(value);if(!seen.has(key)){seen.add(key);variants.push(value);}};
  for(const avoidConnections of [false,true])for(const clearance of [c.clearance??12,24,40,4])add({...clone(c),route:'avoid',clearance,avoidConnections});
  if(adjustPorts){
   for(const sideFrom of [c.from.side,...C.sides.filter(s=>s!==c.from.side)])for(const sideTo of [c.to.side,...C.sides.filter(s=>s!==c.to.side)])add({...clone(c),route:'avoid',avoidConnections:true,from:{...c.from,side:sideFrom},to:{...c.to,side:sideTo}});
   for(const from of [c.from.offset,.25,.75])for(const to of [c.to.offset,.25,.75])add({...clone(c),route:'avoid',avoidConnections:true,from:{...c.from,offset:from},to:{...c.to,offset:to}});
  }
  return variants.slice(0,limits.maxPerWire);
 }
 function summary(report){return{issues:wireIssues(report),truncated:!!report.truncated,skipped:report.skipped||0};}
 function complete(view,count){return view?.measurement&&view.checks&&!view.checks.truncated&&!view.checks.connections?.skipped&&view.measurement.connections?.length===count;}
 async function plan(state,options,measurement,signal){
  validate(state,options);const {ids,adjustPorts=false}=options,selected=[...ids].sort(),origin=measurement.origin||{x:0,y:0},draft=clone(state),data=clone(measurement),wires=new Map(data.connections.map(w=>[w.id,w]));
  let current=Diagnostics.analyze(data),trials=0,unavailable=0,searchLimited=false;const initial=clone(current),canvas=M.canvas(state);
  if(current.truncated||current.skipped)throw Error('连线检查不完整，无法比较修复效果');
  search:for(let pass=0;pass<limits.passes;pass++){let improved=false;
   for(const id of selected){if(!current.issues.some(i=>i.ids.includes(id)))continue;const node=draft.nodes[id],original=clone(node.connection);let best=null,bestReport=current,bestPoints=null;
    for(const candidate of candidates(original,adjustPorts)){
     if(trials>=limits.maxCandidates){searchLimited=true;break search;}if(trials++%8===0)await new Promise(resolve=>setTimeout(resolve,0));signal?.throwIfAborted();
     let geometry;try{geometry=C.geometry(draft,candidate,id);}catch{unavailable++;continue;}
     if(geometry.x<0||geometry.y<0||geometry.x+geometry.w>canvas.width||geometry.y+geometry.h>canvas.height){unavailable++;continue;}
     const points=geometry.points.map(p=>({x:p.x-origin.x,y:p.y-origin.y})),trial={...data,connections:data.connections.map(w=>w.id===id?{...w,points}:w)},report=Diagnostics.analyze(trial);
     if(report.truncated||report.skipped){unavailable++;continue;}
     if(improves(bestReport.issues,report.issues)){best=candidate;bestReport=report;bestPoints=points;}
    }
    if(best){node.connection=best;wires.get(id).points=bestPoints;current=bestReport;improved=true;}
   }
   if(!improved)break;
  }
  const updates=selected.filter(id=>JSON.stringify(state.nodes[id].connection)!==JSON.stringify(draft.nodes[id].connection)).map(id=>({id,connection:draft.nodes[id].connection}));
  return{updates,report:{status:updates.length?'candidate':'unchanged',trials,unavailable,searchLimited,before:summary(initial),after:summary(current),limits,adjustPorts}};
 }
 async function run(state,options,{measure,validateTransition,signal}={}){
  validate(state,options);signal?.throwIfAborted();const count=Object.values(state.nodes).filter(n=>n.connection).length,before=await measure(state);
  if(!complete(before,count))throw Error('整图或绑定连线检查不完整，请先处理隐藏路径、复杂样式或检查上限');
  const planned=await plan(state,options,before.measurement,signal),report=planned.report;
  if(!planned.updates.length)return{state,report:{...report,reason:'本次有限搜索未找到不加重其他问题的改进方案；可调整模块位置后再试。',changed:[]}};
  let next;try{next=Commands.execute(state,{type:'reroute_connections',updates:planned.updates});}catch(error){return{state,report:{...report,status:'unchanged',reason:'候选方案未能安全更新整图，已保留原图：'+error.message,after:summary(before.checks),changed:[]}};}
  if(Commands.diff(state,next).some(change=>!options.ids.includes(change.id)))return{state,report:{...report,status:'unchanged',reason:'候选方案会改变未选对象，已保留原图。',after:summary(before.checks),changed:[]}};validateTransition?.(next);signal?.throwIfAborted();const after=await measure(next);signal?.throwIfAborted();
  if(!complete(after,count)||after.checks.skipped>before.checks.skipped||Checks.regressions(before.checks,after.checks).length||!improves(wireIssues(before.checks),wireIssues(after.checks)))return{state,report:{...report,status:'unchanged',reason:'候选方案未通过实际渲染复查，已保留原图。',before:summary(before.checks),after:summary(before.checks),changed:[]}};
  return{state:next,report:{...report,status:'improved',reason:'实际渲染确认连线问题减少，且没有新增或加重检查项。',before:summary(before.checks),after:summary(after.checks),changed:planned.updates.map(u=>u.id)}};
 }
 return{validate,plan,run,improves,limits};
});
