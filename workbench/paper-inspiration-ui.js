(function(root){
'use strict';
const refs=[...root.PaperInspiration].sort((a,b)=>(b.batch||1)-(a.batch||1)),esc=root.FigureTemplates.escape;
root.mountPaperInspiration=function(host,{prefix='',onBind,onPrototype}={}){
 host.innerHTML=`<div class="inspiration-tools"><input type="search" aria-label="搜索论文重绘组件" placeholder="搜索论文、对象或画法…"><select aria-label="组件类别"><option value="all">全部视觉关系</option>${[...new Set(refs.map(r=>r.category))].map(c=>`<option>${esc(c)}</option>`).join('')}</select><select class="inspiration-batch" aria-label="新增批次"><option value="all">全部 · 新增优先</option><option value="2">本次新增 · ${refs.filter(r=>r.batch===2).length} 种</option><option value="1">上一批重绘</option></select><span class="inspiration-count"></span></div><div class="inspiration-grid"></div>`;
 const input=host.querySelector('input'),filter=host.querySelector('select'),batch=host.querySelector('.inspiration-batch'),grid=host.querySelector('.inspiration-grid');
 function render(){const q=input.value.trim().toLowerCase(),rows=refs.filter(r=>(filter.value==='all'||r.category===filter.value)&&(batch.value==='all'||(r.batch||1)===Number(batch.value))&&[r.name,r.sourceTitle,r.observed,r.why,r.prompt].join(' ').toLowerCase().includes(q));
 host.querySelector('.inspiration-count').textContent=`${rows.length} 个矢量重绘组件 · 来自 ${new Set(rows.map(r=>r.paper)).size} 篇论文`;
 grid.innerHTML=rows.map(r=>`<article class="inspiration-card"><div class="inspiration-meta">${esc(r.venue)} · ${esc(r.category)}</div><h3>${esc(r.name)}</h3><a class="inspiration-image" href="${esc(prefix+'paper-inspiration/redrawn/'+r.id+'.svg')}" target="_blank" rel="noopener" aria-label="打开${esc(r.name)}矢量重绘">${root.FigureTemplates.markup('inspired-'+r.id,{label:''})}</a><details><summary>画法与出处</summary><p>${esc(r.observed)}</p><textarea readonly aria-label="${esc(r.name)}迁移提示词">${esc(r.prompt)}</textarea><a class="inspiration-source" href="${esc(r.sourceUrl)}" target="_blank" rel="noopener">${esc(r.sourceTitle)} · ${esc(r.figure)} ↗</a></details><div class="inspiration-actions">${onPrototype?`<button data-prototype="${r.id}">使用组件</button>`:`<a href="${esc(prefix+'paper-inspiration/redrawn/'+r.id+'.svg')}" download>下载 SVG</a>`}${onBind?`<button data-reference="${r.id}">应用画法</button>`:''}</div></article>`).join('');
 }
 input.oninput=filter.onchange=batch.onchange=render;
 grid.onclick=e=>{const b=e.target.closest('button');if(!b)return;const id=b.dataset.reference||b.dataset.prototype,r=refs.find(r=>r.id===id);if(!r)return;if(b.dataset.reference)onBind?.(r);else onPrototype?.(r);};render();
};
})(typeof window==='object'?window:globalThis);
