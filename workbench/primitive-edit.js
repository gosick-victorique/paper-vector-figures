window.FigurePrimitiveEdit={mount(api,host){
 'use strict';
 const G=FigurePrimitiveGeometry,M=FigureModel,E=FigureDirectEdit,svg=api.svg,NS='http://www.w3.org/2000/svg',selector='rect,circle,ellipse,line,polygon,polyline,path,text,image';
 let active=false,selection='',index=0,current=null,gesture=null;
 const button=document.createElement('button');button.textContent='形状';button.dataset.primitiveToggle='true';button.title='编辑形状 · A';
 host.ui.querySelector('[data-panel="style"]').before(button);
 const panel=document.createElement('div');panel.className='canvas-popover primitive-properties';panel.hidden=true;host.ui.append(panel);
 const drawable=g=>[...(g?.querySelectorAll(selector)||[])].filter(e=>!e.closest('defs,clipPath,mask,marker,pattern')&&!e.hasAttribute('data-component-hit'));
 const isConnector=n=>/^foundation-(straight|bidirectional|curve|elbow|association|inhibit|leader|local-loop)$/.test(n?.template?.id||'');
 function connectorShaft(children){
  // Library leaders put their dot first; native leaders put their shaft first.
  return children.find(n=>['path','line'].includes(drawable(api.dom(n.id))[0]?.localName));
 }
 function target(){const s=api.read(),ids=M.roots(s,s.selection);if(ids.length!==1)return null;let n=s.nodes[ids[0]];
  if(n.type==='component'){const children=Object.values(s.nodes).filter(c=>c.parent===n.id);if(children.length===1)n=children[0];else if(isConnector(n))n=connectorShaft(children)||n;else return null;}
  if(n.type!=='leaf'||n.connection)return null;const g=api.dom(n.id);if(!g)return null;const list=drawable(g),el=list[Math.min(index,list.length-1)];if(!el)return null;
  const a=Object.fromEntries([...el.attributes].map(a=>[a.name,a.value])),shape=G.describe(el.localName,a);if(!shape)return null;
  return{id:n.id,el,shape,index:list.indexOf(el),count:list.length,matrix:svg.getScreenCTM().inverse().multiply(el.getScreenCTM())};
 }
 const point=(p,m)=>new DOMPoint(p.x,p.y).matrixTransform(m);
 function add(tag,a){const el=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(a))el.setAttribute(k,v);el.setAttribute('data-primitive-overlay','true');api.overlay.append(el);return el;}
 function draw(){
  api.overlay.querySelectorAll('[data-primitive-overlay]').forEach(e=>e.remove());current=target();const sig=api.read().selection.join('|');
  if(selection!==sig){selection=sig;index=0;current=target();active=!!current&&api.read().nodes[current.id].type==='leaf';panel.dataset.signature='';}
  button.hidden=!current;button.disabled=!!current&&!M.movable(api.read(),[current.id]);button.setAttribute('aria-pressed',String(active));
  panel.hidden=!current||!active||host.editing()||!!gesture;
  const leaves=api.read().selection.flatMap(id=>[id,...M.descendants(api.read(),id)]).filter(id=>api.read().nodes[id]?.type==='leaf'),elements=leaves.flatMap(id=>drawable(api.dom(id)));
  const hasText=elements.some(e=>e.localName==='text'),hasShape=elements.some(e=>!['text','image'].includes(e.localName)),hasFill=elements.some(e=>!['text','image','line'].includes(e.localName));
  host.ui.querySelector('[data-paint="textColor"]').parentElement.hidden=!hasText;host.ui.querySelector('[data-action="text"]').hidden=!hasText;host.ui.querySelector('[data-paint="fill"]').parentElement.hidden=!hasFill;host.ui.querySelector('[data-paint="stroke"]').parentElement.hidden=!hasShape;
  if(!current||!active||host.editing())return;
  if(!['rect','text','image'].includes(current.shape.tag))api.overlay.querySelectorAll('[data-direct-handle]').forEach(e=>e.remove());
  if(!M.movable(api.read(),[current.id])){panel.hidden=true;return;}
  const {shape,matrix}=current,z=Math.hypot(svg.getScreenCTM().a,svg.getScreenCTM().b),r=4/z;
  for(const h of shape.handles){let pos={x:h.x,y:h.y};if(h.key==='corner'&&+shape.a.rx===0){const localScale=Math.hypot(matrix.a,matrix.b)*z;pos.x+=12/localScale;pos.y+=12/localScale;}
   const p=point(pos,matrix);if(h.anchor){const a=point({x:h.anchor[0],y:h.anchor[1]},matrix);add('line',{x1:a.x,y1:a.y,x2:p.x,y2:p.y,class:'primitive-tangent','pointer-events':'none'});}
   const attrs={'data-primitive-handle':h.key,'aria-label':h.label,class:'primitive-handle '+h.kind};
   if(h.kind==='anchor')add('rect',{...attrs,x:p.x-r,y:p.y-r,width:2*r,height:2*r});else add('circle',{...attrs,cx:p.x,cy:p.y,r:h.kind==='radius'?5/z:r});
  }
  const signature=current.id+'|'+current.index+'|'+shape.tag;
  if(panel.dataset.signature!==signature){panel.dataset.signature=signature;
   panel.innerHTML='<div class="primitive-heading"><strong></strong><span></span></div><div class="primitive-fields"></div><div class="primitive-options"></div>';
   panel.querySelector('strong').textContent=shape.label;
   panel.querySelector('span').textContent=shape.tag==='path'?'拖动节点与控制柄':shape.tag==='rect'?'拖动圆点调整圆角':shape.tag==='text'?'双击文字编辑':shape.tag==='image'?'按原比例调整':'拖动控制点调整形状';
   const fields=panel.querySelector('.primitive-fields');for(const [key,name,value]of shape.fields||[]){const label=document.createElement('label');label.textContent=name;const input=document.createElement('input');input.type='number';input.step='.5';input.dataset.primitiveField=key;input.value=value;label.append(input);fields.append(label);}
   const opts=panel.querySelector('.primitive-options');
   if(!['text','image'].includes(shape.tag))opts.innerHTML='<label>线型 <select data-line-pattern aria-label="图元线型"><option value="">实线</option><option value="6 4">虚线</option><option value="1 4">点线</option></select></label><label>端点 <select data-line-cap aria-label="线端样式"><option value="round">圆头</option><option value="butt">平头</option><option value="square">方头</option></select></label>';
   if(shape.tag==='text')opts.innerHTML='<button data-text-style="bold">加粗</button><button data-text-style="italic">斜体</button><select aria-label="文字对齐" data-text-align><option value="start">左对齐</option><option value="middle">居中</option><option value="end">右对齐</option></select>';
   if(shape.tag==='image')opts.innerHTML='<select aria-label="图片适配方式" data-image-fit><option value="xMidYMid meet">完整显示</option><option value="xMidYMid slice">填满裁切</option><option value="none">拉伸</option></select><button data-image-reset>恢复原比例</button>';
   if(current.count>1){const label=document.createElement('label');label.textContent='内部形状 ';const select=document.createElement('select');select.dataset.primitivePart='true';drawable(api.dom(current.id)).forEach((e,i)=>{const option=document.createElement('option');option.value=i;option.textContent=`${i+1} · ${e.localName}`;select.append(option);});select.value=current.index;label.append(select);opts.append(label);}
  }
  for(const[key,,value]of shape.fields||[]){const input=panel.querySelector(`[data-primitive-field="${key}"]`);if(input&&document.activeElement!==input)input.value=Number((Number(value)*fieldScale(key)).toFixed(2));}
  const pattern=panel.querySelector('[data-line-pattern]');if(pattern)pattern.value=shape.a['stroke-dasharray']==='none'?'':shape.a['stroke-dasharray']||'';const cap=panel.querySelector('[data-line-cap]');if(cap)cap.value=shape.a['stroke-linecap']||'round';
  const align=panel.querySelector('[data-text-align]');if(align)align.value=shape.a['text-anchor']||'start';
  const fit=panel.querySelector('[data-image-fit]');if(fit)fit.value=shape.a.preserveAspectRatio||'xMidYMid meet';
  host.position();
 }
 function linkedHeads(t){
  const s=api.read(),n=s.nodes[t.id],parent=s.nodes[n.parent];
  if(!isConnector(parent))return [];
  const children=Object.values(s.nodes).filter(c=>c.parent===parent.id);if(connectorShaft(children)?.id!==t.id)return [];
  const ends=G.ends(t.shape);if(!ends)return [];
  const start=point({x:ends.start[0],y:ends.start[1]},t.matrix),end=point({x:ends.end[0],y:ends.end[1]},t.matrix),worldEnds={start:[start.x,start.y],end:[end.x,end.y]};
  return children.filter(n=>n.id!==t.id).map(n=>{const b=M.bounds(s,n.id);return{id:n.id,which:drawable(api.dom(n.id))[0]?.getAttribute('data-connector-end')||G.nearestEnd(worldEnds,{x:b.x+b.w/2,y:b.y+b.h/2})};});
 }
 function fieldScale(key,t=current){return key==='ry'?Math.hypot(t.matrix.c,t.matrix.d):Math.hypot(t.matrix.a,t.matrix.b);}
 function setAttributes(t,attrs){const s=api.read(),n=s.nodes[t.id],g=document.createElementNS(NS,'g');g.innerHTML=api.markup(n);const el=drawable(g)[t.index];if(!el)return false;
  for(const[k,v]of Object.entries(attrs)){el.setAttribute(k,String(v));if(['rx','ry','r','font-weight','font-style','letter-spacing','text-anchor','stroke-dasharray','stroke-linecap'].includes(k))el.style.removeProperty(k);}
  n.markup=g.innerHTML;return true;
 }
 function apply(before,t,attrs,heads){
  api.preview(M.clone(before));if(!setAttributes(t,attrs))return false;
  const nextShape=G.describe(t.shape.tag,{...t.shape.a,...attrs});
  const oldEnds=G.ends(t.shape),newEnds=G.ends(nextShape);
  for(const head of heads){if(M.locked(api.read(),head.id))return false;const end=head.which,near=end==='start'?'next':'previous',old=point({x:oldEnds[end][0],y:oldEnds[end][1]},t.matrix),next=point({x:newEnds[end][0],y:newEnds[end][1]},t.matrix),oldNear=point({x:oldEnds[near][0],y:oldEnds[near][1]},t.matrix),newNear=point({x:newEnds[near][0],y:newEnds[near][1]},t.matrix),angle=Math.atan2(next.y-newNear.y,next.x-newNear.x)-Math.atan2(old.y-oldNear.y,old.x-oldNear.x),a=Math.cos(angle),b=Math.sin(angle);
   if(!E.transform(api.read(),[head.id],{a,b,c:-b,d:a,e:next.x-a*old.x+b*old.y,f:next.y-b*old.x-a*old.y},api.markup))return false;
  }
  api.remeasure(t.id);const bounds=M.bounds(api.read(),t.id);return bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.w<=1200&&bounds.y+bounds.h<=740;
 }
 function changeAttrs(attrs){if(!current||!M.movable(api.read(),[current.id]))return;const t=current,before=M.clone(api.read()),heads=linkedHeads(t);if(apply(before,t,attrs,heads))api.commit(before);else{api.restore(before);api.toast('此操作受锁定或画板边界限制');}draw();}
 button.onclick=()=>{active=!active;panel.dataset.signature='';host.update();draw();};
 svg.addEventListener('pointerdown',e=>{const h=e.target.closest('[data-primitive-handle]');if(!h||e.button!==0||!current)return;e.preventDefault();e.stopImmediatePropagation();const t=current,heads=linkedHeads(t);if(heads.some(h=>M.locked(api.read(),h.id))){api.toast('箭头尖端已锁定');return;}
  gesture={before:M.clone(api.read()),last:M.clone(api.read()),target:t,heads,key:h.dataset.primitiveHandle,inverse:t.el.getScreenCTM().inverse(),changed:false};svg.setPointerCapture(e.pointerId);host.hide();panel.hidden=true;
 },true);
 svg.addEventListener('pointermove',e=>{if(!gesture)return;e.preventDefault();e.stopImmediatePropagation();const g=gesture,p=point({x:e.clientX,y:e.clientY},g.inverse),attrs=G.drag(g.target.shape,g.key,p);if(!attrs)return;
  if(apply(g.before,g.target,attrs,g.heads)){g.changed=true;g.last=M.clone(api.read());}else api.preview(M.clone(g.last));host.hide();draw();
 },true);
 function finish(e,cancel=false){if(!gesture)return;e?.stopImmediatePropagation();const g=gesture;gesture=null;if(cancel||!g.changed)api.restore(g.before);else api.commit(g.before);if(e&&svg.hasPointerCapture(e.pointerId))svg.releasePointerCapture(e.pointerId);host.update();draw();}
 svg.addEventListener('pointerup',e=>finish(e),true);svg.addEventListener('pointercancel',e=>finish(e,true),true);
 document.addEventListener('keydown',e=>{if(e.target.closest('input,textarea,select')||document.querySelector('dialog[open]'))return;if(gesture){e.preventDefault();e.stopImmediatePropagation();if(e.key==='Escape')finish(null,true);return;}if(!e.ctrlKey&&!e.metaKey&&e.key.toLowerCase()==='a'&&current){e.preventDefault();button.click();}if(e.key.toLowerCase()==='v'&&active){active=false;host.update();draw();}},true);
 panel.addEventListener('change',e=>{const el=e.target;if(el.dataset.primitivePart){index=Number(el.value);panel.dataset.signature='';draw();return;}if(el.dataset.primitiveField){const key=el.dataset.primitiveField,value=Number(el.value)/fieldScale(key);if(!Number.isFinite(value)||key!=='letter-spacing'&&value<0)return;const attrs={[key]:value};if(current.shape.tag==='rect')attrs[key]=Math.min(value,Number(current.shape.a[key==='rx'?'width':'height'])/2);changeAttrs(attrs);}if(el.hasAttribute('data-line-pattern'))changeAttrs({'stroke-dasharray':el.value||'none'});if(el.hasAttribute('data-line-cap'))changeAttrs({'stroke-linecap':el.value});if(el.hasAttribute('data-text-align'))changeAttrs({'text-anchor':el.value});if(el.hasAttribute('data-image-fit'))changeAttrs({preserveAspectRatio:el.value});});
 panel.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.tagName==='INPUT'){e.preventDefault();e.target.blur();}});
 panel.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!current)return;if(b.dataset.textStyle){const bold=b.dataset.textStyle==='bold',key=bold?'font-weight':'font-style',value=bold?'bold':'italic';changeAttrs({[key]:current.shape.a[key]===value?'normal':value});}
  if(b.hasAttribute('data-image-reset')){const image=new Image(),t=current;image.onload=()=>{if(current?.id===t.id)changeAttrs({height:Number(t.shape.a.width)*image.naturalHeight/image.naturalWidth,preserveAspectRatio:'xMidYMid meet'});};image.src=t.el.getAttribute('href')||t.el.getAttribute('xlink:href');}
 });
 for(const name of ['figure-selection-change','figure-scene-change','figure-view-change'])window.addEventListener(name,draw);
 return{draw,active:()=>active&&!!current,busy:()=>!!gesture};
}};
