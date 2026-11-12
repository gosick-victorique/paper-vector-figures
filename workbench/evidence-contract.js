/* Evidence validation is shared by the draft host and the workbench. */
(function(root,factory){const api=factory(typeof module==='object'?require('./model.js'):root.FigureModel);if(typeof module==='object')module.exports=api;else root.FigureEvidence=api;})(typeof window==='object'?window:globalThis,function(M){
 'use strict';
 const own=(v,k)=>Object.prototype.hasOwnProperty.call(v,k),clone=M.clone;
 const Data=typeof module==='object'?require('./evidence-data.js'):globalThis.FigureEvidenceData;
 function sources(task){
  const output=[];
  for(const [kind,value]of [['paper',task.paperContent],['request',task.pendingSelectionNote||task.generationPrompt]]){
   const text=String(value||'');if(text.length>2000000)throw Error('证据正文超过 200 万字符，请缩小资料范围');let index=0;
   // Keep exact UTF-16 offsets into the original submitted text, including newlines.
   for(let start=0;start<text.length;){let end=Math.min(text.length,start+1800);if(end<text.length){const newline=text.lastIndexOf('\n',end-1);if(newline>start+600)end=newline+1;}if(text.slice(start,end).trim())output.push({id:kind+'-'+String(++index).padStart(4,'0'),kind,start,end,text:text.slice(start,end)});start=end;}
  }
  return output;
 }
 function subjects(state,task){
  const scope=new Set(task.scope.flatMap(s=>[s.id,...M.descendants(state,s.id)]));
  return Object.values(state.nodes).filter(n=>scope.has(n.id)&&(n.connection||n.type==='component'&&!Object.values(state.nodes).some(c=>c.parent===n.id&&c.connection)||n.type==='leaf'&&!scope.has(n.parent)&&!n.connection||n.type==='leaf'&&state.nodes[n.parent]?.type==='section')).map(n=>({id:n.id,name:n.name,kind:n.connection?'relation':n.chart?'data':n.equation?'equation':n.type==='leaf'?'annotation':'module',...(n.connection?{from:n.connection.from.node,to:n.connection.to.node}:{})}));
 }
 function fingerprint(state,id,legacy=false){const stable=v=>v&&typeof v==='object'?(Array.isArray(v)?'['+v.map(stable).join(',')+']':'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}'):JSON.stringify(v);const ignored=new Set(['x','y','w','h','scale','originX','originY','appearance','locked']);return stable([id,...M.descendants(state,id)].sort().map(k=>Object.fromEntries(Object.entries(state.nodes[k]).filter(([key])=>!ignored.has(key)&&!(key==='markup'&&state.nodes[k].connection&&!legacy)))));}
 function bind(state,task,sourceList,bindings,records){
  if(!Array.isArray(records)||!records.length||records.length>100)throw Error('一次绑定 1–100 个对象');const allowed=new Set(subjects(state,task).map(n=>n.id)),sourceMap=new Map(sourceList.map(s=>[s.id,s])),next=clone(bindings),seen=new Set();
  for(const record of records){
   if(!record||!allowed.has(record.objectId)||seen.has(record.objectId))throw Error('证据对象不存在、重复或超出本次评审范围');seen.add(record.objectId);
   if(typeof record.claim!=='string'||!record.claim.trim()||record.claim.length>2000||typeof record.rationale!=='string'||record.rationale.length>2000||!['supported','illustrative','unresolved'].includes(record.classification))throw Error('证据说明或分类无效');
   if(!Array.isArray(record.citations)||record.citations.length>12||record.classification==='supported'&&!record.citations.length)throw Error('有依据的对象必须引用提交资料');
   if(record.classification!=='supported'&&!record.rationale.trim())throw Error('示意或待确认对象需要说明原因');
   const citations=record.citations.map(c=>{
    const source=sourceMap.get(c?.sourceId);if(!source||typeof c.quote!=='string'||!c.quote.trim()||c.quote.length>1800)throw Error('引用来源或原文无效');
    const start=c.start===undefined?source.text.indexOf(c.quote):c.start;
    if(!Number.isInteger(start)||start<0||source.text.slice(start,start+c.quote.length)!==c.quote)throw Error('引用必须逐字匹配资料原文');
    if(c.start===undefined&&source.text.indexOf(c.quote,start+1)!==-1)throw Error('原文中存在重复引文，请提供 start 字符位置');
    return{sourceId:source.id,start,end:start+c.quote.length,quote:c.quote,documentStart:source.start+start,documentEnd:source.start+start+c.quote.length};
   });
   if(record.data!==undefined&&!state.nodes[record.objectId]?.chart)throw Error('数据映射仅适用于可编辑图表');
   next[record.objectId]={objectId:record.objectId,claim:record.claim.trim(),classification:record.classification,rationale:record.rationale.trim(),citations,fingerprint:fingerprint(state,record.objectId),...(record.data!==undefined?{data:Data.normalize(record.data,citations)}:{})};
  }
  if(Object.keys(next).length>5000)throw Error('证据绑定过多');return next;
 }
 function coverage(state,task,bindings){
  const required=subjects(state,task),missing=required.filter(s=>!own(bindings,s.id)).map(s=>s.id),unresolved=required.filter(s=>bindings[s.id]?.classification==='unresolved').map(s=>s.id),illustrative=required.filter(s=>bindings[s.id]?.classification==='illustrative').map(s=>s.id);
  const stale=required.filter(s=>bindings[s.id]&&bindings[s.id].fingerprint!==fingerprint(state,s.id)&&bindings[s.id].fingerprint!==fingerprint(state,s.id,true)).map(s=>s.id);
  return{required,missing,unresolved,illustrative,stale,covered:required.length-missing.length-stale.length,total:required.length};
 }
 function prune(state,bindings){return Object.fromEntries(Object.entries(bindings).filter(([id])=>own(state.nodes,id)));}
 function validateRecord(record){
  if(!record||![1,2].includes(record.schema)||!Number.isSafeInteger(record.revision)||!Array.isArray(record.sources)||record.sources.length>4000||!record.bindings||Array.isArray(record.bindings)||!record.coverage||!record.review||!Array.isArray(record.review.reports)||record.review.reports.length!==4||!Array.isArray(record.history)||record.history.length>3)throw Error('证据评审记录格式无效');
  for(const key of ['sceneHash','paperDigest','sourceDigest'])if(!/^[a-f0-9]{64}$/.test(record[key]))throw Error('评审版本标识无效');
  if(record.schema===2){const checks=record.dataChecks;if(!checks||!Array.isArray(checks.results)||checks.results.length>5000||checks.total!==checks.results.length||!Number.isInteger(checks.matched)||checks.matched<0||checks.matched>checks.total||!Array.isArray(checks.issues)||checks.issues.length>5000||checks.results.some(r=>!r||typeof r.objectId!=='string'||!['matched','mismatch','unverified','missing','invalid'].includes(r.status))||checks.issues.some(i=>!i||typeof i.objectId!=='string'||!['error','warning'].includes(i.severity)||typeof i.message!=='string'))throw Error('数据核验记录无效');}
  const sourceMap=new Map();for(const source of record.sources){if(!source||typeof source.id!=='string'||sourceMap.has(source.id)||typeof source.text!=='string'||source.text.length>1800||!Number.isInteger(source.start)||source.start<0||source.end!==source.start+source.text.length)throw Error('评审来源记录无效');sourceMap.set(source.id,source);}
  const coverage=record.coverage;if(!Array.isArray(coverage.required)||coverage.required.length>5000||coverage.required.some(s=>!s||typeof s.id!=='string'||typeof s.name!=='string')||coverage.total!==coverage.required.length||!Number.isInteger(coverage.covered)||coverage.covered<0||coverage.covered>coverage.total)throw Error('证据覆盖记录无效');
  for(const [key,binding]of Object.entries(record.bindings)){
   if(!binding||key!==binding.objectId||typeof binding.claim!=='string'||typeof binding.rationale!=='string'||typeof binding.fingerprint!=='string'||!Array.isArray(binding.citations)||binding.citations.length>12||!['supported','illustrative','unresolved'].includes(binding.classification))throw Error('评审证据记录无效');
   for(const c of binding.citations){const source=sourceMap.get(c?.sourceId);if(!source||typeof c.quote!=='string'||!Number.isInteger(c.start)||c.start<0||c.end!==c.start+c.quote.length||source.text.slice(c.start,c.end)!==c.quote||c.documentStart!==source.start+c.start||c.documentEnd!==source.start+c.end)throw Error('评审引用记录无效');}
   if(binding.data!==undefined)Data.normalize(binding.data,binding.citations);
  }
  const strings=v=>Array.isArray(v)&&v.every(s=>typeof s==='string');
  for(const round of [record.review,...record.history]){
   if(!round||!Number.isInteger(round.revision)||!Array.isArray(round.reports)||round.reports.length>4)throw Error('评审轮次记录无效');
   for(const report of round.reports){if(!report||typeof report.name!=='string'||typeof report.role!=='string')throw Error('评审角色记录无效');if(report.status!=='completed'){if(round===record.review)throw Error('最终评审未完成');continue;}
    const value=report.report;if(!value||typeof value.summary!=='string'||!Array.isArray(value.findings)||value.findings.length>40||!strings(value.limitations)||value.findings.some(f=>!f||!strings(f.objectIds)||!strings(f.sourceIds)||!['blocker','warning','info'].includes(f.severity)||typeof f.message!=='string'||typeof f.suggestion!=='string'))throw Error('独立评审报告格式无效');
   }
  }
  return record;
 }
 function validateCommit(record,state,task){
  validateRecord(record);const review=record.review;
  if(review.status!=='completed'||review.verdict!=='pass'||review.revision!==record.revision||new Set(review.reports.map(r=>r.role)).size!==4||review.reports.some(r=>!['scientific','structure','readability','editability'].includes(r.role)||r.report.findings.some(f=>f.severity==='blocker')))throw Error('当前结果未通过独立评审');
  if(JSON.stringify(record.sources)!==JSON.stringify(sources(task)))throw Error('评审来源与本次任务不一致');
  const values=Object.values(record.bindings);let verified={};for(let i=0;i<values.length;i+=100)verified=bind(state,task,record.sources,verified,values.slice(i,i+100));const status=coverage(state,task,verified);if(status.missing.length||status.unresolved.length||coverage(state,task,record.bindings).stale.length)throw Error('评审证据缺失或与结果不一致');if(record.schema===2&&dataChecks(state,task,verified).issues.some(i=>i.severity==='error'))throw Error('图表数据未通过来源核验');return record;
 }
 function dataChecks(state,task,bindings){return Data.check(state,subjects(state,task),bindings);}
 return{sources,subjects,bind,coverage,prune,validateRecord,validateCommit,dataChecks};
});
