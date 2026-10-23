/* Direct manipulation stays on the same scene/undo stack as the inspector and AI. */
window.FigureCanvasEdit={mount(api){
 'use strict';
 const M=FigureModel,E=FigureDirectEdit,svg=api.svg,viewport=document.querySelector('#canvas-scroll'),NS='http://www.w3.org/2000/svg';
 let gesture=null,editor=null,panel='',lastSelection='',pointerText=null,primitive=null;
 const ui=document.createElement('div');ui.className='canvas-tools';ui.dataset.canvasUi='true';ui.hidden=true;
 ui.innerHTML=`<div class="canvas-tools-main" role="toolbar" aria-label="选区工具栏">
 <span class="canvas-tools-name"></span>
 <label title="填充颜色">填<input type="color" data-paint="fill" aria-label="选区填充颜色" value="#dfeaf0"></label>
 <label title="描边颜色">线<input type="color" data-paint="stroke" aria-label="选区描边颜色" value="#416f89"></label>
 <label title="文字颜色">字<input type="color" data-paint="textColor" aria-label="选区文字颜色" value="#23313c"></label>
 <button data-action="text" title="编辑文字">T</button><button data-panel="style" title="尺寸与样式">样式</button>
 <button data-panel="comment" title="给选区添加修改意见">意见</button><button data-panel="more" aria-label="更多选区操作">•••</button></div>
 <div class="canvas-popover" data-popover="style" hidden>
 <div class="canvas-fields"><label>宽<input type="number" data-size="w" min="2" aria-label="选区宽度"></label><label>高<input type="number" data-size="h" min="2" aria-label="选区高度"></label>
 <label>线宽<input type="number" data-number="strokeWidth" min="0" max="20" step="0.5" value="1.5"></label><label>不透明度 %<input type="number" data-number="opacity" min="0" max="100" value="100"></label>
 <label>字号<input type="number" data-number="fontSize" min="1" max="300" value="16"></label><label>旋转增量 °<input type="number" data-rotate min="-360" max="360" value="0"></label></div>
 <div class="canvas-actions"><button data-action="no-fill">无填充</button><button data-action="no-stroke">无描边</button><button data-action="rotate">旋转 90°</button></div>
 <div class="canvas-wire" hidden><label>连线路径 <select data-route><option value="elbow">折线</option><option value="straight">直线</option></select></label><button data-action="reverse">反向</button></div></div>
 <div class="canvas-popover" data-popover="comment" hidden><textarea rows="3" aria-label="选区修改意见" placeholder="描述要修改的地方"></textarea><button class="primary" data-action="comment">保存意见</button></div>
 <div class="canvas-popover" data-popover="more" hidden><div class="canvas-menu">
 <button data-action="duplicate">复制 <kbd>Ctrl D</kbd></button><button data-action="delete">删除 <kbd>Del</kbd></button>
 <button data-action="front">置于顶层</button><button data-action="back">置于底层</button>
 <button data-action="lock">锁定 / 解锁</button><button data-action="split">拆分图元</button>
 </div><div class="canvas-align" hidden><button data-align="left">左对齐</button><button data-align="center">水平居中</button><button data-align="top">顶对齐</button><button data-align="middle">垂直居中</button></div></div>`;
 viewport.append(ui);
 const q=s=>ui.querySelector(s),ids=()=>M.roots(api.read(),api.read().selection),point=e=>new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM().inverse());
 const zoom=()=>Math.hypot(svg.getScreenCTM().a,svg.getScreenCTM().b)||1;
 function element(tag,attrs){const e=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);api.overlay.append(e);return e;}
 function activeWire(){const s=api.read(),selected=ids();if(selected.length!==1)return null;return E.scope(s,selected).map(id=>s.nodes[id]).find(n=>n.connection);}
 function setPanel(next){panel=panel===next?'':next;ui.querySelectorAll('[data-popover]').forEach(e=>e.hidden=e.dataset.popover!==panel);ui.querySelectorAll('[data-panel]').forEach(e=>e.setAttribute('aria-expanded',String(e.dataset.panel===panel)));position();if(panel==='comment')q('textarea').focus();}
 function position(){if(ui.hidden)return;const s=api.read(),b=M.selectionBounds(s),m=svg.getScreenCTM(),r=viewport.getBoundingClientRect(),p=new DOMPoint(b.x+b.w/2,b.y).matrixTransform(m),bottom=new DOMPoint(b.x,b.y+b.h).matrixTransform(m);const width=ui.offsetWidth,height=ui.offsetHeight;let top=p.y-r.top-height-44;if(top<8)top=bottom.y-r.top+16;ui.style.left=Math.max(8,Math.min(viewport.clientWidth-width-8,p.x-r.left-width/2))+'px';ui.style.top=Math.max(8,Math.min(viewport.clientHeight-height-8,top))+'px';}
 function refresh(){
  const s=api.read(),sel=ids(),signature=sel.join('|');if(signature!==lastSelection){panel='';ui.querySelectorAll('[data-popover]').forEach(e=>e.hidden=true);q('textarea').value='';q('[data-rotate]').value=0;ui.querySelectorAll('[data-panel]').forEach(e=>e.setAttribute('aria-expanded','false'));lastSelection=signature;}
  ui.hidden=!sel.length||!!gesture||!!editor;if(ui.hidden)return;
  const editable=!E.scope(s,sel).some(id=>M.locked(s,id)),transformable=E.canTransform(s,sel),b=M.selectionBounds(s);
  q('.canvas-tools-name').textContent=sel.length>1?`${sel.length} 项`:s.nodes[sel[0]].type==='leaf'?'图元':s.nodes[sel[0]].type==='section'?'分组':'组件';
  ui.querySelectorAll('[data-paint],[data-number]').forEach(e=>e.disabled=!editable);
  ui.querySelectorAll('[data-size],[data-rotate],[data-action="rotate"],[data-action="duplicate"]').forEach(e=>e.disabled=!transformable);
  q('[data-action="delete"]').disabled=!editable;q('[data-action="front"]').disabled=q('[data-action="back"]').disabled=!editable;
  for(const key of ['w','h'])if(document.activeElement!==q(`[data-size="${key}"]`))q(`[data-size="${key}"]`).value=Number(b[key].toFixed(1));
  const leaves=E.scope(s,sel).map(id=>api.dom(id)).filter(Boolean),text=leaves.flatMap(g=>[...g.querySelectorAll('text')])[0],shape=leaves.flatMap(g=>[...g.querySelectorAll('path,rect:not([data-component-hit]),circle,ellipse,polygon,polyline')])[0];
  q('[data-action="text"]').disabled=!editable||!text;q('[data-number="fontSize"]').disabled=!editable||!text;
  function color(input,value){if(document.activeElement===input||!value)return;const c=value.match(/rgba?\((\d+)[, ]+(\d+)[, ]+(\d+)/);if(c)input.value='#'+c.slice(1,4).map(x=>Number(x).toString(16).padStart(2,'0')).join('');else if(/^#[0-9a-f]{6}$/i.test(value))input.value=value;}
  if(shape){color(q('[data-paint="fill"]'),getComputedStyle(shape).fill);color(q('[data-paint="stroke"]'),getComputedStyle(shape).stroke);}
  if(text){color(q('[data-paint="textColor"]'),getComputedStyle(text).fill);if(document.activeElement!==q('[data-number="fontSize"]'))q('[data-number="fontSize"]').value=parseFloat(getComputedStyle(text).fontSize)||16;}
  const wire=activeWire();q('.canvas-wire').hidden=!wire;if(wire)q('[data-route]').value=wire.connection.route;
  if(shape&&document.activeElement!==q('[data-number="strokeWidth"]'))q('[data-number="strokeWidth"]').value=parseFloat(getComputedStyle(shape).strokeWidth)||0;
  const painted=leaves.map(g=>g.querySelector('[data-object-paint]')).find(Boolean);if(document.activeElement!==q('[data-number="opacity"]'))q('[data-number="opacity"]').value=Math.round((painted?Number(painted.getAttribute('opacity')??1):1)*100);
  q('.canvas-align').hidden=sel.length<2;q('[data-action="split"]').disabled=sel.length!==1||s.nodes[sel[0]].type!=='leaf'||!editable;
  position();
 }
 function handles(){
  api.overlay.querySelectorAll('[data-direct-handle]').forEach(e=>e.remove());const s=api.read(),sel=ids();if(!E.canTransform(s,sel)||editor)return;
  const b=M.selectionBounds(s),z=zoom(),size=8/z;
  for(const [name,x,y]of [['nw',b.x,b.y],['n',b.x+b.w/2,b.y],['ne',b.x+b.w,b.y],['e',b.x+b.w,b.y+b.h/2],['se',b.x+b.w,b.y+b.h],['s',b.x+b.w/2,b.y+b.h],['sw',b.x,b.y+b.h],['w',b.x,b.y+b.h/2]])element('rect',{x:x-size/2,y:y-size/2,width:size,height:size,rx:1/z,'data-direct-handle':name,class:'canvas-handle','aria-label':name+' 缩放控制点',style:`cursor:${name}-resize`});
  element('line',{x1:b.x+b.w/2,x2:b.x+b.w/2,y1:b.y,y2:b.y-26/z,'data-direct-handle':'stem',class:'canvas-rotation-stem','pointer-events':'none'});
  element('circle',{cx:b.x+b.w/2,cy:b.y-30/z,r:5/z,'data-direct-handle':'rotate',class:'canvas-handle canvas-rotate','aria-label':'旋转控制点'});
 }
 function update(){handles();refresh();primitive?.draw();}
 function transaction(fn){api.change(()=>{const result=fn(api.read());if(result===false)api.toast('此操作受锁定、连线绑定或画板边界限制');return result;});}
 function transform(fn){transaction(s=>fn(s,ids()));}
 svg.addEventListener('pointerdown',e=>{const h=e.target.closest('[data-direct-handle]');if(!h||e.button!==0)return;e.preventDefault();e.stopImmediatePropagation();const s=api.read(),p=point(e),b=M.selectionBounds(s);gesture={handle:h.dataset.directHandle,p,box:b,before:M.clone(s),ids:ids(),changed:false};svg.setPointerCapture(e.pointerId);refresh();},true);
 svg.addEventListener('pointermove',e=>{if(!gesture)return;e.preventDefault();e.stopImmediatePropagation();const g=gesture,p=point(e),s=M.clone(g.before);let ok;
  if(g.handle==='rotate'){const c={x:g.box.x+g.box.w/2,y:g.box.y+g.box.h/2},angle=(Math.atan2(p.y-c.y,p.x-c.x)-Math.atan2(g.p.y-c.y,g.p.x-c.x))*180/Math.PI;ok=E.rotate(s,g.ids,e.shiftKey?Math.round(angle/15)*15:angle,api.markup);}
  else ok=E.resizeBox(s,g.ids,E.handleBox(g.box,g.handle,p.x-g.p.x,p.y-g.p.y,e.shiftKey),api.markup);
  if(ok){g.changed=true;api.preview(s);}
 },true);
 function finish(e,cancel=false){if(!gesture)return;e?.stopImmediatePropagation();const g=gesture;gesture=null;if(cancel||!g.changed)api.restore(g.before);else api.commit(g.before);if(e&&svg.hasPointerCapture(e.pointerId))svg.releasePointerCapture(e.pointerId);update();}
 svg.addEventListener('pointerup',e=>finish(e),true);svg.addEventListener('pointercancel',e=>finish(e,true),true);
 function editText(target){
  const leaf=target.closest('[data-type="leaf"]'),id=leaf?.dataset.id;if(!id||M.locked(api.read(),id))return;
  const index=[...leaf.querySelectorAll('text')].indexOf(target);api.select([id],'primitive');const fresh=api.dom(id).querySelectorAll('text')[index];if(!fresh)return;
  const r=fresh.getBoundingClientRect(),v=viewport.getBoundingClientRect(),style=getComputedStyle(fresh),matrix=fresh.getScreenCTM(),original=FigureCanvasText.read(fresh),visibility=fresh.style.visibility;
  fresh.style.visibility='hidden';
  editor=FigureCanvasText.mount({viewport,anchor:{x:r.left-v.left-6,y:r.top-v.top-6},value:original,minWidth:Math.max(64,r.width+16),fontSize:parseFloat(style.fontSize)*(Math.hypot(matrix.c,matrix.d)||1),fontFamily:style.fontFamily,fontWeight:style.fontWeight,fontStyle:style.fontStyle,color:style.fill,
   onClose:()=>{editor=null;fresh.style.visibility=visibility;update();},
   onCommit:value=>{if(original!==value)api.text(id,index,value);update();}
  });update();
 }
 svg.addEventListener('pointerdown',e=>{const text=e.target.closest('text'),leaf=text?.closest('[data-type="leaf"]');pointerText=leaf?{id:leaf.dataset.id,index:[...leaf.querySelectorAll('text')].indexOf(text)}:null;},true);
 svg.addEventListener('dblclick',e=>{const text=e.target.closest('text')||(pointerText&&api.dom(pointerText.id)?.querySelectorAll('text')[pointerText.index]);if(text?.closest('[data-type="leaf"]')){e.preventDefault();e.stopImmediatePropagation();editText(text);}},true);
 svg.addEventListener('pointerdown',e=>{if(!e.altKey||e.button!==0)return;const leaf=e.target.closest('[data-type="leaf"]');if(leaf){api.select([leaf.dataset.id],'primitive');}},true);

 ui.addEventListener('pointerdown',e=>e.stopPropagation());
 function commitControl(el){if(el.dataset.paint)api.paint({[el.dataset.paint]:el.value});
  if(el.hasAttribute('data-size')){const b=M.selectionBounds(api.read());transform((s,sel)=>E.resizeBox(s,sel,{...b,[el.dataset.size]:Number(el.value)},api.markup));}
  if(el.hasAttribute('data-number')){const key=el.dataset.number,value=Number(el.value);if(!Number.isFinite(value)||value<Number(el.min)||value>Number(el.max)){refresh();return;}if(key==='fontSize')api.fontSize(value);else api.paint({[key]:key==='opacity'?value/100:value});}
  if(el.hasAttribute('data-rotate')){const angle=Number(el.value);transform((s,sel)=>E.rotate(s,sel,angle,api.markup));el.value=0;}
  if(el.hasAttribute('data-route')){const wire=activeWire();if(wire)api.connection(wire.id,{...wire.connection,route:el.value});}
 }
 ui.addEventListener('change',e=>commitControl(e.target));
 ui.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches('input[type=number]')){e.preventDefault();e.target.blur();}});
 const actions={
  text(){const text=ids().flatMap(id=>[...api.dom(id).querySelectorAll('text')])[0];if(text)editText(text);},
  duplicate(){transaction(s=>{const map=E.duplicate(s,ids());if(map)api.remapCopies(map);return !!map;});},
  delete(){transaction(s=>E.remove(s,ids()));},front(){transaction(s=>E.layer(s,ids(),true));},back(){transaction(s=>E.layer(s,ids(),false));},
  lock(){document.querySelector('#lock').click();},split(){document.querySelector('#object-split').click();},
  'no-fill'(){api.paint({fill:'none'});},'no-stroke'(){api.paint({stroke:'none'});},rotate(){transform((s,sel)=>E.rotate(s,sel,90,api.markup));},
  comment(){const value=q('textarea').value.trim();if(!value)return;transaction(s=>!!M.addComment(s,ids(),value));q('textarea').value='';setPanel('');},
  reverse(){const n=activeWire();if(n)api.connection(n.id,{...n.connection,from:n.connection.to,to:n.connection.from});}
 };
 ui.addEventListener('click',e=>{const button=e.target.closest('button');if(!button)return;if(button.dataset.panel)setPanel(button.dataset.panel);if(button.dataset.action)actions[button.dataset.action]?.();if(button.dataset.align){const key=button.dataset.align;transaction(s=>{const sel=ids();if(!E.canTransform(s,sel))return false;const b=M.selectionBounds(s);for(const id of sel){const a=M.bounds(s,id);M.move(s,[id],key==='left'?b.x-a.x:key==='center'?b.x+b.w/2-a.x-a.w/2:0,key==='top'?b.y-a.y:key==='middle'?b.y+b.h/2-a.y-a.h/2:0);}return true;});}});
 document.addEventListener('keydown',e=>{if(e.target.closest('input,textarea,select,[contenteditable="true"],[role="menu"]')||document.querySelector('dialog[open]'))return;
  if(gesture){e.preventDefault();e.stopImmediatePropagation();if(e.key==='Escape')finish(null,true);return;}
  if(primitive?.busy())return;
  if(!ids().length)return;
  if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();e.stopImmediatePropagation();actions.delete();}
  else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='d'){e.preventDefault();e.stopImmediatePropagation();actions.duplicate();}
  else if(e.key==='Enter'){e.preventDefault();actions.text();}
 },true);
 window.addEventListener('figure-selection-change',update);window.addEventListener('figure-scene-change',update);window.addEventListener('figure-view-change',()=>{if(editor)editor.commit();update();});
 FigureContextMenu.mount({...api,action:name=>actions[name]?.(),panel:name=>{panel='';setPanel(name);}});
 primitive=FigurePrimitiveEdit.mount(api,{ui,position,update,editing:()=>!!editor||!!gesture,hide:()=>ui.hidden=true});
 update();
}};
