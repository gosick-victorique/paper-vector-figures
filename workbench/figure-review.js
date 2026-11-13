(()=>{
 'use strict';
 const B=FigureBoard,dialog=document.createElement('dialog');dialog.id='figure-review-dialog';dialog.setAttribute('aria-labelledby','figure-review-title');
 dialog.innerHTML='<header><h2 id="figure-review-title">检查图稿</h2><button id="figure-review-close" aria-label="关闭图稿检查">关闭</button></header><p class="review-description">检查越界、小字号、文字重叠、对比度、过长说明文字、过多公式，以及绑定连线的交叉、共线和穿越图文。穿越按包围框估算，共用分支可能是有意设计。自由曲线、位图内容及论文机制需另行核对。</p><p id="figure-review-status" role="status"></p><ul id="figure-review-issues" class="figure-review-issues"></ul><footer><button id="figure-review-refresh">重新检查</button></footer>';
 document.body.append(dialog);const $=s=>dialog.querySelector(s);let sequence=0;
 const open=document.createElement('button');open.id='figure-review-open';open.textContent='检查图稿…';document.querySelector('.project-files').append(open);
 function renderList(container,report,{locate}={}){
  container.replaceChildren();for(const issue of report.issues){const li=document.createElement('li'),text=document.createElement('span');text.textContent=(issue.severity==='error'?'错误 · ':'提示 · ')+issue.message;if(issue.suggestion){const hint=document.createElement('small');hint.style.cssText='display:block;font-size:inherit;color:#53635d';hint.textContent=issue.suggestion;text.append(hint);}li.append(text);if(locate){const button=document.createElement('button');button.textContent='定位';button.setAttribute('aria-label','定位：'+issue.message);button.onclick=()=>locate(issue.ids,issue.region);li.append(button);}container.append(li);}
 }
 function summary(report){return(report.issues.length?`发现 ${report.issues.length} 项待检查问题`:'未发现这些规则可识别的问题')+` · ${report.counts.texts} 处文字`+(report.counts.equations?` · ${report.counts.equations} 个公式`:'')+(report.counts.connections?` · ${report.counts.connections} 条绑定连线`:'')+(report.skipped?` · ${report.skipped} 处未能判断`:'')+(report.connections?.skipped?`（含 ${report.connections.skipped} 条连线）`:'')+(report.truncated?' · 已达检查上限，结果不完整':'');}
 async function run(){const current=++sequence,boardId=B.capture().boardId,revision=FigurePatch.revision(B.getState()),source=B.snapshot();$('#figure-review-status').textContent='正在检查…';$('#figure-review-issues').replaceChildren();$('#figure-review-refresh').disabled=true;
  try{const report=await FigureChecks.inspect(source);if(current!==sequence)return;if(B.capture().boardId!==boardId||revision!==FigurePatch.revision(B.getState()))throw Error('图稿已变化，请重新检查');$('#figure-review-status').textContent=summary(report);renderList($('#figure-review-issues'),report,{locate:(ids,region)=>{dialog.close();B.locate(ids);if(region)window.dispatchEvent(new CustomEvent('figure-focus-region',{detail:region}));}});}catch(e){if(current===sequence)$('#figure-review-status').textContent=e.message;}finally{if(current===sequence)$('#figure-review-refresh').disabled=false;}
 }
 open.onclick=()=>{dialog.showModal();void run();};$('#figure-review-close').onclick=()=>dialog.close();$('#figure-review-refresh').onclick=run;dialog.addEventListener('keydown',e=>e.stopPropagation());dialog.addEventListener('close',()=>sequence++);
 window.FigureReview={renderList,summary};
})();
