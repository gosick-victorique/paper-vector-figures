import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import Commands from '../editor-commands.js';
import Model from '../model.js';
import Patch from './patch-contract.js';
import Renderer from './render.cjs';
import Safety from './svg-safety.cjs';
import Checks from '../figure-checks.js';
import {drawingTools} from './drawing-tools.mjs';
import {compactTask,restoreTaskAssets} from './task-assets.mjs';
import Evidence from '../evidence-contract.js';
import Graph from '../graph-layout.js';
import Repair from '../connection-repair.js';
import {createReviewArtifacts} from './review-artifacts.mjs';
import {taskBudget} from './task-budget.mjs';
const clone=Model.clone,text=value=>({type:'text',text:JSON.stringify(value)});
export async function createDraftSession({task,dir,runtime,signal,onEvent=()=>{},reviews=null,resume=false}){
 const base={nodes:clone(task.scene),comments:clone(task.allComments||[]),palette:task.palette,canvas:task.canvas,selection:[],svgDefs:task.svgDefs||''};
 let state=clone(base),revision=0,rendered=-1,checked=-1,lastChecks=null,committed=null,tail=Promise.resolve(),calls=0;
 let bindings={},lastReviewId=null,totalCalls=0;
 const independent=task.reviewPolicy==='independent',sources=Evidence.sources(task),digest=v=>createHash('sha256').update(v).digest('hex'),sourceDigest=digest(JSON.stringify(sources));
 if(independent&&!reviews)throw Error('独立评审服务未初始化');
 const requests=new Map(),checkpoints=new Map(),journal=[],catalog=await runtime.catalog();
 const suppliedAssets=compactTask(task).assets,budget=taskBudget(task.budget);
 const baseline=(await runtime.render(Renderer.render(task,base))).checks;
 const taskDigest=digest(Patch.stable(task));
 if(resume){
  const saved=JSON.parse(await fs.readFile(path.join(dir,'draft.json'),'utf8'));
  if(saved.schema!==3||saved.taskDigest!==taskDigest||saved.baseRevision!==task.baseRevision||saved.sourceDigest!==sourceDigest||!Number.isInteger(saved.revision)||saved.revision<0)throw Error('草稿与原任务不一致，无法恢复');
  Commands.validateTransition(base,saved.state,task,Safety.validateMarkup);
  if(!Array.isArray(saved.requests)||!Array.isArray(saved.checkpoints)||saved.checkpoints.length>8||!Array.isArray(saved.journal))throw Error('草稿恢复记录无效');
  for(const [key,value]of saved.checkpoints){Commands.validateTransition(base,value.state,task,Safety.validateMarkup);checkpoints.set(key,value);}
  for(const [key,value]of saved.requests){if(typeof key!=='string'||typeof value?.signature!=='string'||!Array.isArray(value.response?.content))throw Error('草稿命令回执无效');requests.set(key,value);}
  state=saved.state;revision=saved.revision;bindings=saved.bindings;lastReviewId=saved.lastReviewId;committed=saved.committed;totalCalls=saved.totalCalls||0;journal.push(...saved.journal);
 }
 async function persist(){const target=path.join(dir,'draft.json'),temp=target+'.tmp';await fs.writeFile(temp,JSON.stringify({schema:3,taskDigest,baseRevision:task.baseRevision,revision,state,sources,sourceDigest,bindings,lastReviewId,requests:[...requests],totalCalls,checkpoints:[...checkpoints],journal,committed},null,2));await fs.rename(temp,target);}
 const source=()=>Renderer.render(task,state);
 const differences=checks=>Checks.regressions?Checks.regressions(baseline,checks):checks.issues.filter(i=>!baseline.issues.some(b=>b.key===i.key));
 async function handle(name,args={}){
  signal?.throwIfAborted();const definition=drawingTools.find(t=>t.name===name);if(!definition)throw Error('未知绘图工具');
  if(!args||typeof args!=='object'||Array.isArray(args))throw Error('工具参数无效');
  for(const key of Object.keys(args))if(!Object.hasOwn(definition.inputSchema.properties,key))throw Error('未知参数：'+key);
  for(const key of definition.inputSchema.required)if(args[key]===undefined)throw Error('缺少参数：'+key);
  const write=!definition.annotations.readOnlyHint,signature=Patch.stable({name,args});
  if(write){
   if(typeof args.requestId!=='string'||!/^[-\w]{1,100}$/.test(args.requestId))throw Error('requestId 必须是 1–100 位字母数字或连字符');
   if(requests.has(args.requestId)){const saved=requests.get(args.requestId);if(saved.signature!==signature)throw Error('requestId 已用于另一项命令');return clone(saved.response);}
   if(args.expectedRevision!==revision)throw Error('草稿版本冲突；当前 revision='+revision+'，请重新读取场景');
   if(committed)throw Error('草稿已提交，不能继续修改');
  }
  if(++calls>budget.toolCalls)throw Error(`本次执行已达到 ${budget.toolCalls} 次工具调用上限，可从草稿继续`);totalCalls++;
  let result,image=null;
  if(name==='analyze_graph'){
   result=Graph.analyze(state,args.ids);
  }else if(name==='repair_connections'){
   Repair.validate(state,args);if(task.editMode==='appearance')throw Error('外观模式不能调整连线路径');
   const allowed=new Set(task.scope.flatMap(s=>[s.id,...Model.descendants(state,s.id)]));if(args.ids.some(id=>!allowed.has(id)))throw Error('所选连线超出本次任务选区，请把连线本身纳入选区');
   const repaired=await Repair.run(state,args,{signal,measure:next=>runtime.render(Renderer.render(task,next)),validateTransition:next=>Commands.validateTransition(base,next,task,Safety.validateMarkup)});
   if(repaired.report.changed.length){state=repaired.state;bindings=Evidence.prune(state,bindings);revision++;}
   result={...repaired.report,evidenceStale:Evidence.coverage(state,task,bindings).stale};
  }else if(name==='check_evidence'){
   result=Evidence.dataChecks(state,task,bindings);
  }else if(name==='get_evidence'){
   const offset=Math.max(0,args.offset||0),limit=Math.min(30,Math.max(1,args.limit||10)),q=String(args.query||'').toLowerCase(),found=sources.filter(s=>(!args.ids||args.ids.includes(s.id))&&(!q||s.text.toLowerCase().includes(q)));
   result={sourceDigest,sources:found.slice(offset,offset+limit),total:found.length,nextOffset:offset+limit<found.length?offset+limit:null,bindings:Object.values(bindings).map(({fingerprint,...record})=>record),coverage:Evidence.coverage(state,task,bindings),dataChecks:Evidence.dataChecks(state,task,bindings),reviewPolicy:independent?'independent':'none'};
  }else if(name==='bind_evidence'){
   bindings=Evidence.bind(state,task,sources,bindings,args.bindings);revision++;result={bound:args.bindings.map(r=>r.objectId),coverage:Evidence.coverage(state,task,bindings),dataChecks:Evidence.dataChecks(state,task,bindings)};
  }else if(name==='review_figure'){
   if(!independent||!reviews)throw Error('本次任务未启用独立评审');if(rendered!==revision||checked!==revision)throw Error('评审前请 render_region 整图观察并 check_figure');
   const coverage=Evidence.coverage(state,task,bindings);if(coverage.missing.length||coverage.unresolved.length||coverage.stale.length)throw Error('评审前请补齐、确认或更新证据：'+[...coverage.missing,...coverage.unresolved,...coverage.stale].slice(0,20).join(', '));
   const dataChecks=Evidence.dataChecks(state,task,bindings);if(dataChecks.issues.some(i=>i.severity==='error'))throw Error('图表数据未通过来源核验，请 check_evidence：'+dataChecks.issues.filter(i=>i.severity==='error').map(i=>i.objectId+' '+i.message).slice(0,8).join('; '));
   const view=await runtime.render(source()),snapshot={revision,scene:clone(state.nodes),canvas:Model.canvas(state),palette:state.palette,purpose:task.purpose||'',taskType:task.taskType,scope:task.scope,sourceDigest,sources,bindings,coverage,dataChecks,checks:view.checks,measurement:view.measurement};
   const artifacts=await createReviewArtifacts({source:source(),canvas:snapshot.canvas,view,runtime,signal});snapshot.exportCheck=artifacts.exportCheck;snapshot.media=artifacts.images.map(({data,...item})=>item);
   const round=await reviews.start(snapshot,view.png,artifacts);lastReviewId=round.id;result={roundId:round.id,...round};
  }else if(name==='get_review'){
   if(!reviews)throw Error('本次任务未启用独立评审');const id=args.roundId||lastReviewId;if(!id)throw Error('请先调用 review_figure');const round=await reviews.wait(id,Math.min(10,Math.max(0,args.waitSeconds||0))*1000);result={roundId:id,...round,reviewRevision:round.revision,stale:round.revision!==revision};
  }else if(name==='get_scene'){
   const limit=Math.max(1,Math.min(200,args.limit||80)),offset=Math.max(0,args.offset||0),all=Object.values(state.nodes).filter(n=>!args.ids||args.ids.includes(n.id)),nodes=all.slice(offset,offset+limit).map(n=>{const out={...n,bounds:Model.bounds(state,n.id),locked:Model.locked(state,n.id)};if(!args.includeMarkup&&out.markup){out.markupLength=out.markup.length;delete out.markup;}return out;});
   result={baseRevision:task.baseRevision,canvas:Model.canvas(state),scope:task.scope,editMode:task.editMode,preserveLabels:task.preserveLabels,reviewPolicy:independent?'independent':'none',lastReviewId,nodes:compactTask({nodes}).context.nodes,total:all.length,nextOffset:offset+nodes.length<all.length?offset+nodes.length:null,checkpoints:[...checkpoints].map(([id,v])=>({id,name:v.name,revision:v.revision}))};
  }else if(name==='search_assets'){
   const terms=String(args.query||'').toLowerCase().split(/\s+/).filter(Boolean),found=catalog.filter(a=>terms.every(t=>JSON.stringify(a).toLowerCase().includes(t))),offset=Math.max(0,args.offset||0),limit=Math.max(1,Math.min(50,args.limit||20));result={assets:found.slice(offset,offset+limit),total:found.length,nextOffset:offset+limit<found.length?offset+limit:null};
  }else if(name==='preview_asset'){
   const asset=await runtime.asset({id:args.assetId,options:args.options});Safety.validateMarkup(asset.markup);const view=await runtime.render(asset.markup);image=view.png;result={asset:asset.meta,w:asset.w,h:asset.h};
  }else if(['render_region','measure_objects','check_figure'].includes(name)){
   const view=await runtime.render(source(),{region:args.region,path:name==='render_region'?path.join(dir,'draft-preview.png'):undefined});
   if(name==='render_region'){image=view.png;if(!args.region)rendered=revision;result={region:args.region||Model.canvas(state).viewBox,checks:view.checks};}
   else if(name==='check_figure'){checked=revision;lastChecks=view.checks;result={...view.checks,regressions:differences(view.checks)};}
   else{const selected=new Set((args.ids||Object.keys(state.nodes)).flatMap(k=>[k,...Model.descendants(state,k)]));result={...view.measurement,leaves:view.measurement.leaves.filter(n=>selected.has(n.id)),texts:view.measurement.texts.filter(n=>selected.has(n.id))};}
  }else if(name==='checkpoint'){
   if(typeof args.name!=='string'||!args.name.trim()||args.name.length>120)throw Error('检查点名称无效');if(checkpoints.size>=8)throw Error('最多保存 8 个检查点');const checkpointId=randomUUID();checkpoints.set(checkpointId,{name:args.name,revision,state:clone(state),bindings:clone(bindings)});result={checkpointId,name:args.name};
  }else if(name==='rollback'){
   const saved=checkpoints.get(args.checkpointId);if(!saved)throw Error('检查点不存在');state=clone(saved.state);bindings=clone(saved.bindings||{});revision++;result={restored:args.checkpointId};
  }else if(name==='commit'){
   if(rendered!==revision||checked!==revision)throw Error('请先 render_region 整图观察，再 check_figure 检查当前版本');
   if(lastChecks.truncated||differences(lastChecks).some(i=>i.severity==='error'))throw Error('请先修复新增/恶化的错误或检查截断，再渲染并检查');
   if(typeof args.summary!=='string'||!args.summary.trim()||args.summary.length>8000||!Array.isArray(args.warnings)||args.warnings.length>30||args.warnings.some(w=>typeof w!=='string'||w.length>2000))throw Error('提交说明无效');
   if((lastChecks.issues.length||lastChecks.skipped)&&!args.warnings.length)throw Error('请在 warnings 中说明尚存检查项或无法检查的内容');
   const review=reviews?.get(lastReviewId),coverage=Evidence.coverage(state,task,bindings),dataChecks=Evidence.dataChecks(state,task,bindings);
   if(independent){
    if(coverage.missing.length||coverage.unresolved.length||coverage.stale.length)throw Error('证据映射缺失、待确认或已过期，请 get_evidence');
    if(dataChecks.issues.some(i=>i.severity==='error'))throw Error('图表数据未通过来源核验，请 check_evidence');
    if(dataChecks.issues.some(i=>i.severity==='warning')&&!args.warnings.length)throw Error('请说明数据尚未逐值核验的限制');
    if(!review||review.revision!==revision||review.status!=='completed'||review.verdict!=='pass')throw Error('当前版本尚未通过独立评审，请 get_review 查看结果并修订后重新评审');
    if((coverage.illustrative.length||review.reports.some(r=>r.report.findings.some(f=>f.severity==='warning')||r.report.limitations.length))&&!args.warnings.length)throw Error('请说明示意内容及评审保留意见');
   }
   Commands.validateTransition(base,state,task,Safety.validateMarkup);const changes=Commands.diff(base,state);
   const dossier=independent?{schema:2,revision,sourceDigest,paperDigest:digest(task.paperContent||''),sceneHash:digest(Patch.revision(state)),sources,bindings,coverage,dataChecks,review,history:reviews.all()}:null;
   committed={baseRevision:task.baseRevision,summary:args.summary,warnings:args.warnings,draft:{revision,changes,checks:lastChecks,journal:clone(journal),...(dossier?{dossier}:{})},operations:changes.map(c=>({op:c.node?(base.nodes[c.id]?'update':'insert'):'remove',id:c.id,payload:'{}'}))};result={committed:true,changedObjects:changes.length};
  }else{
   let command={...args};delete command.requestId;delete command.expectedRevision;
   if(name==='insert_asset'){const asset=await runtime.asset({id:args.assetId,options:args.options});command={...command,type:'create_component',w:asset.w,h:asset.h,asset:asset.meta,leaves:[{markup:asset.markup,customPaint:true}]};}
   else if(name==='save_equation')command={...command,type:name,rendered:await runtime.equation(args.config)};
   else if(name==='apply_ops')command={type:'patch',task,result:restoreTaskAssets({baseRevision:task.baseRevision,operations:args.operations},suppliedAssets)};
   else command.type={connect_objects:'connect',arrange_objects:'arrange',remove_objects:'remove'}[name]||name;
   const next=Commands.execute(state,command,Safety.validateMarkup);Commands.validateTransition(base,next,task,Safety.validateMarkup);
   const changed=Commands.diff(state,next).map(c=>c.id);state=next;bindings=Evidence.prune(state,bindings);revision++;result={changed,selection:state.selection,...(name==='layout_graph'?{graph:Graph.analyze(state,args.ids)}:{})};
  }
  signal?.throwIfAborted();
  const response={content:[text({...result,revision,callsRemaining:budget.toolCalls-calls}),...(image?[{type:'image',mimeType:'image/png',data:image.toString('base64')}]:[])]};
  journal.push({revision,tool:name,requestId:args.requestId,at:new Date().toISOString(),...(name==='check_figure'?{issues:result.issues.length,regressions:result.regressions.length,truncated:result.truncated}:{}),...(name==='repair_connections'?{status:result.status,changed:result.changed,before:result.before.issues.length,after:result.after.issues.length,trials:result.trials,searchLimited:result.searchLimited}:{})});
  if(write)requests.set(args.requestId,{signature,response:clone(response)});
  if(write||!['get_scene','get_evidence','get_review','search_assets','measure_objects','analyze_graph','check_evidence'].includes(name))await persist();
  try{onEvent({revision,tool:name,changed:result.changed?.length,committed:!!committed,checks:name==='check_figure'?result:undefined});}catch{}return response;
 }
 await persist();return{call(name,args){const next=tail.then(async()=>{
  const previous={state,revision,rendered,checked,lastChecks,committed,bindings,lastReviewId,requests:new Map(requests),checkpoints:new Map(checkpoints),length:journal.length};
  try{return await handle(name,args);}catch(e){({state,revision,rendered,checked,lastChecks,committed,bindings,lastReviewId}=previous);requests.clear();for(const [k,v]of previous.requests)requests.set(k,v);checkpoints.clear();for(const [k,v]of previous.checkpoints)checkpoints.set(k,v);journal.length=previous.length;throw e;}
 });tail=next.catch(()=>{});return next;},get result(){return committed&&clone(committed);},get revision(){return revision;},get resumed(){return resume;},get totalCalls(){return totalCalls;},getState:()=>clone(state),render:()=>source(),close:()=>runtime.close()};
}
