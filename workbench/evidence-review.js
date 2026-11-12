(()=>{
 'use strict';
 const B=FigureBoard,hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(v=>v.toString(16).padStart(2,'0')).join('');
 const dialog=document.createElement('dialog');dialog.id='evidence-review-dialog';dialog.innerHTML='<header><h2>独立评审与证据</h2><button id="evidence-review-close">关闭</button></header><p id="evidence-review-status" role="status"></p><div id="evidence-review-content"></div>';document.body.append(dialog);dialog.querySelector('button').onclick=()=>dialog.close();dialog.addEventListener('keydown',e=>e.stopPropagation());
 const button=document.createElement('button');button.id='evidence-review-open';button.textContent='独立评审与证据…';document.querySelector('.project-files').append(button);
 const section=document.createElement('details');section.id='agent-independent-review';section.hidden=true;section.innerHTML='<summary id="agent-independent-summary">独立评审与证据</summary><div id="agent-independent-content"></div>';document.querySelector('#agent-summary').after(section);
 function node(tag,text){const el=document.createElement(tag);el.textContent=text;return el;}
 function summary(review){return !review?'未运行独立评审':review.status==='running'?`独立评审进行中 · ${review.reports.length}/4`:review.status!=='completed'?'独立评审未完成':review.verdict==='revise'?`独立评审要求修订 · ${review.blockers} 项阻断问题`:'四项独立评审已通过';}
 function render(container,record,{locate}={}){
  container.replaceChildren();const review=record?.review||record;if(!review?.reports){container.append(node('p','此画板尚无独立评审记录。'));return;}
  container.append(node('p',summary(review)+` · 草稿 v${review.revision}`),node('p','四个独立会话使用当前配置的模型。引文匹配表示可追溯，仍需判断图中含义是否得到原文支持。'));
  if(review.exportCheck){const check=review.exportCheck;container.append(node('p',check.status==='verified'?`导出复核：SVG / PDF 已生成，PDF 已重新渲染 · ${check.widthMm.toFixed(1)} × ${check.heightMm.toFixed(1)} mm`:'导出复核未完成：'+check.error));}
  if(review.media?.length)container.append(node('p',`评审图像：整图及 ${review.media.length} 张局部或导出预览。`));
  if(record?.dataChecks){const checks=record.dataChecks;container.append(node('h3',`表格数据核验 · ${checks.matched}/${checks.total} 项逐值一致`));for(const check of checks.results){const subject=record.coverage?.required.find(s=>s.id===check.objectId),p=node('p',(subject?.name||check.objectId)+' · '+({matched:`引用表格与图表数据一致（${check.cells} 个单元格）`,mismatch:'数据不一致',unverified:'未逐值核验',missing:'缺少数据映射',invalid:'映射无效'}[check.status]));if(check.reason)p.append(node('span','：'+check.reason));location(p,[check.objectId]);container.append(p);}container.append(node('p','逐值核验针对数据和表头；轴标签含义、渲染标记及科学解释仍需核对。'));}
  function location(parent,ids){if(!locate||!ids.length)return;const b=node('button','定位图中对象');b.onclick=()=>locate(ids);parent.append(b);}
  for(const report of review.reports){const block=document.createElement('details');block.className='evidence-review-role';block.open=report.status!=='completed'||report.report?.findings.some(f=>f.severity==='blocker');block.append(node('summary',report.name+' · '+(report.status==='completed'?'已完成':'未完成')));
   if(report.status!=='completed')block.append(node('p',report.error||'尚未完成'));
   else{block.append(node('p',report.report.summary));for(const finding of report.report.findings){const p=node('p',({blocker:'阻断',warning:'提醒',info:'建议'}[finding.severity])+'：'+finding.message);if(finding.suggestion)p.append(node('span',' 修改建议：'+finding.suggestion));location(p,finding.objectIds);block.append(p);}for(const text of report.report.limitations)block.append(node('p','检查边界：'+text));}
   container.append(block);
  }
  if(record?.bindings){const heading=node('h3',`证据映射 · ${record.coverage.covered}/${record.coverage.total} 项`);container.append(heading);
   for(const binding of Object.values(record.bindings)){const item=document.createElement('details'),subject=record.coverage.required.find(s=>s.id===binding.objectId);item.className='evidence-binding';item.append(node('summary',`${subject?.name||binding.objectId} · ${{supported:'有资料依据',illustrative:'示意',unresolved:'待确认'}[binding.classification]}`),node('p',binding.claim));if(binding.rationale)item.append(node('p',binding.rationale));location(item,[binding.objectId]);
    if(binding.data?.kind==='table')item.append(node('p',`数据引用 #${binding.data.citationIndex+1} · 原表数据行 ${binding.data.rows?.map(i=>i+1).join(', ')||'全部'} · 原表列 ${binding.data.columns?.map(i=>i+1).join(', ')||'全部'}`));
    if(binding.data?.kind==='unstructured')item.append(node('p','未逐值核验：'+binding.data.reason));
    for(const citation of binding.citations){item.append(node('p',`${citation.sourceId} · 原文字符 ${citation.documentStart}–${citation.documentEnd}`),node('blockquote',citation.quote));const source=record.sources.find(s=>s.id===citation.sourceId);if(source){const context=document.createElement('details');context.append(node('summary','查看原文上下文'),node('pre',source.text));item.append(context);}}
    container.append(item);
   }
  }
  if(record?.history?.length>1){const history=document.createElement('details');history.append(node('summary',`评审轮次 · ${record.history.length}`));for(const previous of record.history){const item=document.createElement('details');item.append(node('summary',`草稿 v${previous.revision} · ${summary(previous)}`));for(const report of previous.reports||[])for(const finding of report.report?.findings||[])item.append(node('p',report.name+'：'+finding.message));history.append(item);}container.append(history);}
 }
 let previewUrl;
 function result(record,source,submitted,changes){
  section.hidden=!record;if(!record)return;section.open=true;document.getElementById('agent-independent-summary').textContent=summary(record.review);
  const next={nodes:structuredClone(submitted.scene)};for(const change of changes||[])if(change.node)next.nodes[change.id]=change.node;else delete next.nodes[change.id];
  render(document.getElementById('agent-independent-content'),record,{locate:ids=>{
   const boxes=ids.filter(id=>next.nodes[id]).map(id=>FigureModel.bounds(next,id));if(!boxes.length)return;const b=FigureModel.union(boxes),doc=new DOMParser().parseFromString(source,'image/svg+xml'),svg=doc.documentElement;svg.setAttribute('viewBox',[b.x-20,b.y-20,b.w+40,b.h+40].join(' '));svg.setAttribute('width','1000');svg.setAttribute('height','700');
   if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml'}));const zoom=document.getElementById('agent-zoom');zoom.querySelector('img').src=previewUrl;zoom.showModal();
  }});
 }
 button.onclick=async()=>{
  const state=B.getState(),record=state.reviewRecord,status=document.getElementById('evidence-review-status');status.textContent=record?'正在核对记录版本…':'尚无评审记录；请在自主绘图中开启独立评审。';render(document.getElementById('evidence-review-content'),record,{locate:ids=>{dialog.close();B.locate(ids);}});dialog.showModal();if(!record)return;
  const sceneBasis=FigurePatch.revision(state),paperBasis=state.document?.content||'',[scene,paper]=await Promise.all([hash(sceneBasis),hash(paperBasis)]),current=B.getState();status.textContent=scene===record.sceneHash&&paper===record.paperDigest&&sceneBasis===FigurePatch.revision(current)&&paperBasis===(current.document?.content||'')?'记录对应当前图稿与正文。':'图稿或正文已变化：以下是历史评审，不能视为当前版本已通过。';
 };
 window.FigureEvidenceReview={render,result,summary,clear(){section.hidden=true;document.getElementById('agent-independent-content').replaceChildren();if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null;}},progress(review){section.hidden=false;document.getElementById('agent-independent-summary').textContent=summary(review);render(document.getElementById('agent-independent-content'),review);}};
})();
