(() => {
 'use strict';
 const $=s=>document.querySelector(s), workspace=$('.workspace'), left=$('.sidebar'), right=$('.inspector');
 const names=['properties','assets','connections','ai'], labels=['属性','素材','连线','AI 设置'];
 const key='figure-workbench-layout-v1', defaults={leftWidth:220,rightWidth:338,leftClosed:false,rightClosed:false,commentsClosed:false,panel:'properties'};
 let saved={};try{saved=JSON.parse(localStorage.getItem(key))||{};}catch{}
 const state={...defaults,leftClosed:window.innerWidth<=1000,rightClosed:window.innerWidth<=700};
 for(const k of ['leftClosed','rightClosed','commentsClosed'])if(typeof saved[k]==='boolean')state[k]=saved[k];
 for(const k of ['leftWidth','rightWidth'])if(Number.isFinite(saved[k]))state[k]=saved[k];
 if(names.includes(saved.panel))state.panel=saved.panel;
 let focus=false,drag=null;
 const persist=()=>{try{localStorage.setItem(key,JSON.stringify(state));}catch{}};
 const icon=path=>`<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
 const panelIcon=icon('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>');
 const symbols=[icon('<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="white"/><circle cx="15" cy="17" r="3" fill="white"/>'),icon('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'),icon('<circle cx="5" cy="6" r="3"/><circle cx="19" cy="18" r="3"/><path d="M5 9v9h11"/>'),icon('<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/>')];
 const content=document.createElement('div');content.className='sidebar-content';content.id='sidebar-content';
 while(left.firstChild)content.append(left.firstChild);left.append(content);
 function toggleButton(side,host){const b=document.createElement('button');b.className='panel-toggle';b.id=side+'-panel-toggle';b.innerHTML=panelIcon;b.setAttribute('aria-controls',side==='left'?'sidebar-content':'inspector-'+state.panel);host.prepend(b);b.onclick=()=>{state[side+'Closed']=!state[side+'Closed'];apply();persist();};return b;}
 const leftToggle=toggleButton('left',left),rightToggle=toggleButton('right',right);
 const rail=document.createElement('nav');rail.className='project-rail';rail.setAttribute('aria-label','项目快捷栏');
 [['项目','▤','.paper-card'],['图层','▱','#layers'],['版本','◷','#versions']].forEach(([label,glyph,target])=>{const b=document.createElement('button');b.textContent=glyph;b.title=label;b.setAttribute('aria-label','展开'+label);b.onclick=()=>{state.leftClosed=false;apply();persist();$(target).scrollIntoView({block:'nearest'});};rail.append(b);});left.append(rail);
 names.forEach((name,i)=>{const b=$('#inspector-tab-'+name);b.innerHTML=symbols[i]+`<span>${labels[i]}</span>`;b.title=labels[i];b.setAttribute('aria-label',labels[i]);});
 function showPanel(name){if(!names.includes(name))return;state.panel=name;state.rightClosed=false;focus=false;apply();persist();}
 $('.inspector-nav').addEventListener('click',e=>{const b=e.target.closest('[data-inspector]');if(b)showPanel(b.dataset.inspector);});
 $('.inspector-nav').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key))return;const current=names.indexOf(e.target.dataset.inspector);if(current<0)return;e.preventDefault();e.stopPropagation();const i=e.key==='Home'?0:e.key==='End'?3:(current+(['ArrowRight','ArrowDown'].includes(e.key)?1:-1)+4)%4;showPanel(names[i]);$('#inspector-tab-'+names[i]).focus();});
 const commentToggle=document.createElement('button');commentToggle.id='comments-toggle';commentToggle.setAttribute('aria-controls','comment-list');$('.comment-board .section-heading').append(commentToggle);
 commentToggle.onclick=()=>{state.commentsClosed=!state.commentsClosed;apply();persist();};
 const focusButton=document.createElement('button');focusButton.id='focus-canvas';focusButton.title='专注画布 · Esc 退出';$('.toolbar-meta').append(focusButton);
 focusButton.onclick=()=>{focus=!focus;apply();};
 function widthLimit(side){return side==='left'?[190,360]:[280,440];}
 function clampWidth(side,value){const [min,max]=widthLimit(side);return Math.round(Math.max(min,Math.min(max,value)));}
 function apply(){
  for(const side of ['left','right'])state[side+'Width']=clampWidth(side,state[side+'Width']);
  workspace.style.setProperty('--left-panel-width',state.leftWidth+'px');workspace.style.setProperty('--right-panel-width',state.rightWidth+'px');
  workspace.classList.toggle('left-closed',state.leftClosed);workspace.classList.toggle('right-closed',state.rightClosed);workspace.classList.toggle('canvas-focus',focus);
  for(const [side,b]of [['left',leftToggle],['right',rightToggle]]){const label=(state[side+'Closed']?'展开':'收起')+(side==='left'?'项目栏':'工具栏');b.title=label;b.setAttribute('aria-label',label);b.setAttribute('aria-expanded',String(!state[side+'Closed']));}
  content.inert=state.leftClosed;
  names.forEach(name=>{$('#inspector-'+name).hidden=state.rightClosed||state.panel!==name;$('#inspector-tab-'+name).setAttribute('aria-selected',String(state.panel===name));});
  rightToggle.setAttribute('aria-controls','inspector-'+state.panel);
  $('#comment-list').hidden=state.commentsClosed;$('.bottom-panel').classList.toggle('comments-closed',state.commentsClosed);commentToggle.textContent=state.commentsClosed?'展开':'收起';commentToggle.setAttribute('aria-label',(state.commentsClosed?'展开':'收起')+'修改意见');commentToggle.setAttribute('aria-expanded',String(!state.commentsClosed));
  focusButton.textContent=focus?'退出专注':'专注';focusButton.setAttribute('aria-label',focus?'退出专注画布':'专注画布');focusButton.setAttribute('aria-pressed',String(focus));
  document.querySelectorAll('.panel-resizer').forEach(h=>h.setAttribute('aria-valuenow',state[h.dataset.side+'Width']));
 }
 function finish(cancel=false){if(!drag)return;const d=drag;drag=null;if(cancel)state[d.side+'Width']=d.before;if(d.handle.hasPointerCapture(d.id))d.handle.releasePointerCapture(d.id);document.body.classList.remove('resizing-panels');apply();persist();}
 for(const side of ['left','right']){
  const h=document.createElement('div'),[min,max]=widthLimit(side);h.className='panel-resizer '+side+'-resizer';h.dataset.side=side;h.tabIndex=0;h.setAttribute('role','separator');h.setAttribute('aria-orientation','vertical');h.setAttribute('aria-label',side==='left'?'项目栏宽度':'工具栏宽度');h.setAttribute('aria-valuemin',min);h.setAttribute('aria-valuemax',max);h.title='拖动调宽 · 双击恢复';
  if(side==='left')left.after(h);else right.before(h);
  h.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();drag={side,handle:h,id:e.pointerId,x:e.clientX,before:state[side+'Width']};h.setPointerCapture(e.pointerId);document.body.classList.add('resizing-panels');};
  h.onpointermove=e=>{if(!drag||drag.handle!==h)return;state[side+'Width']=clampWidth(side,drag.before+(e.clientX-drag.x)*(side==='left'?1:-1));apply();};
  h.onpointerup=()=>finish();h.onpointercancel=()=>finish(true);h.onlostpointercapture=()=>finish(true);
  h.ondblclick=()=>{state[side+'Width']=defaults[side+'Width'];apply();persist();};
  h.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();e.stopPropagation();state[side+'Width']=e.key==='Home'?min:e.key==='End'?max:clampWidth(side,state[side+'Width']+(e.key==='ArrowRight'?1:-1)*(side==='left'?1:-1)*(e.shiftKey?30:10));apply();persist();};
 }
 document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;if(drag){finish(true);e.preventDefault();e.stopImmediatePropagation();return;}if(focus&&!e.target.closest('input,textarea,select,[contenteditable="true"]')&&!document.querySelector('dialog[open]')){focus=false;apply();e.preventDefault();e.stopImmediatePropagation();}},true);
 window.addEventListener('blur',()=>finish(true));
 window.FigureWorkbench={showPanel,showComments(){state.commentsClosed=false;focus=false;apply();persist();}};
 apply();
})();
