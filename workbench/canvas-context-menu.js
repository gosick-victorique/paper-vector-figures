/* Context actions share the editor's scene transactions and undo history. */
window.FigureContextMenu={mount(api){
 'use strict';
 const M=FigureModel,E=FigureDirectEdit,menu=document.createElement('div');
 menu.className='canvas-context-menu';menu.dataset.canvasUi='true';menu.setAttribute('role','menu');menu.setAttribute('aria-label','画板右键菜单');menu.hidden=true;document.body.append(menu);
 let entries=[],clipboard=null,previousFocus=null,destination=menu;
 const ids=()=>M.roots(api.read(),api.read().selection);
 const close=()=>{menu.hidden=true;};
 function copy(){const s=api.read(),sel=ids();if(!sel.length||E.scope(s,sel).some(id=>s.nodes[id].connection))return false;clipboard={state:M.clone(s),roots:sel};for(const id of E.scope(s,sel))if(s.nodes[id].type==='leaf')clipboard.state.nodes[id].markup=api.markup(s.nodes[id]);api.toast('已复制到画板剪贴板');return true;}
 function paste(){if(!clipboard)return;api.change(()=>{const s=api.read(),source=clipboard.state,roots=clipboard.roots,all=E.scope(source,roots),map=Object.fromEntries(all.map(id=>[id,'paste-'+s.nextId++]));
  const parents=new Map(),wrappers=[];for(const id of roots){const n=source.nodes[id],parent=s.nodes[n.parent];let target=parent&&parent.type!=='leaf'&&!M.locked(s,parent.id)?parent.id:'custom';if(n.type==='leaf'&&s.nodes[target]?.type!=='component'){if(M.locked(s,'custom')){api.toast('目标分组已锁定');return false;}const wrapper='paste-group-'+s.nextId++;wrappers.push({id:wrapper,parent:'custom',type:'component',kind:'custom',name:n.name,x:0,y:0,w:0,h:0,scale:1,locked:false});target=wrapper;}if((!s.nodes[target]&&!wrappers.some(n=>n.id===target))||M.locked(s,target)){api.toast('目标分组已锁定');return false;}parents.set(id,n.type==='section'?null:target);}
  for(const n of wrappers)s.nodes[n.id]=n;
  for(const id of all){const n=M.clone(source.nodes[id]);n.id=map[id];n.locked=false;n.parent=map[n.parent]||n.parent;if(roots.includes(id)){const w=M.world(source,id),p=parents.get(id)?M.world(s,parents.get(id)):{x:0,y:0,scale:1};n.parent=parents.get(id);n.x=(w.x-p.x)/p.scale;n.y=(w.y-p.y)/p.scale;n.scale=w.scale/p.scale;n.name+=' 副本';}s.nodes[n.id]=n;}
  s.selection=roots.map(id=>map[id]);M.move(s,s.selection,20,20);api.remapCopies(map);return true;});}
 function arrange(key){api.change(()=>FigureArrange.arrange(api.read(),ids(),key));}
 function show(x,y){
  close();previousFocus=document.activeElement;const s=api.read(),sel=ids(),has=sel.length>0,all=E.scope(s,sel),editable=has&&!all.some(id=>M.locked(s,id)),transformable=E.canTransform(s,sel),hasWire=all.some(id=>s.nodes[id].connection),single=sel.length===1?s.nodes[sel[0]]:null;
  entries=[];menu.replaceChildren();destination=menu;const title=document.createElement('div');title.className='context-title';title.textContent=has?(sel.length===1?single.name:`${sel.length} 个对象`):'画板';menu.append(title);
  function add(label,run,enabled=true,key='',accent=false){const b=document.createElement('button');b.type='button';b.setAttribute('role','menuitem');b.disabled=!enabled;b.classList.toggle('context-accent',accent);const text=document.createElement('span');text.textContent=label;b.append(text);if(key){const k=document.createElement('kbd');k.textContent=key;b.append(k);}b.onclick=()=>{close();run();};destination.append(b);entries.push(b);}
  const sep=()=>{const line=document.createElement('div');line.className='context-divider';line.setAttribute('role','separator');menu.append(line);};
  const action=(name)=>()=>api.action(name);
  add('向 AI 提问…',()=>window.FigureAgent?.ask(),true,'',true);
  add(has?'让 AI 修改选区…':'生成图片…',()=>window.FigureAgent?.edit(has?'edit':'generate'),!has||editable);
  if(has)add('添加修改意见…',()=>api.panel('comment'));
  sep();
  if(has){
   add('编辑文字',action('text'),editable&&all.some(id=>api.dom(id)?.querySelector('text')),'Enter');
   add('尺寸与样式…',()=>api.panel('style'),editable);
   add('拆分图元',action('split'),editable&&single?.type==='leaf');
   sep();
   add('剪切',()=>{if(copy())api.action('delete');},editable&&!hasWire,'Ctrl X');
   add('复制',copy,!hasWire,'Ctrl C');
  }
  add('粘贴',paste,!!clipboard,'Ctrl V');
  if(has){add('创建副本',action('duplicate'),transformable,'Ctrl D');sep();
   add('置于顶层',action('front'),editable);add('置于底层',action('back'),editable);
   add('旋转 90°',action('rotate'),transformable);
   if(sel.length>1){sep();destination=document.createElement('div');destination.className='context-align-grid';destination.setAttribute('role','group');destination.setAttribute('aria-label','对齐与分布');menu.append(destination);for(const [key,label] of [['left','左对齐'],['center','水平居中'],['right','右对齐'],['top','顶对齐'],['middle','垂直居中'],['bottom','底对齐'],['distribute-x','水平等距分布'],['distribute-y','垂直等距分布']])add(label,()=>arrange(key),M.movable(s,sel)&&(!key.startsWith('distribute')||sel.length>2));destination=menu;}
   sep();
   add(sel.every(id=>s.nodes[id].locked)?'解锁':'锁定',action('lock'),!sel.some(id=>M.ancestors(s,id).some(p=>s.nodes[p].locked)));
   if(single?.parent)add('选择父级',()=>api.select([single.parent],s.nodes[single.parent].type==='section'?'group':'component'));
   if(single&&single.type!=='leaf')add('选择内部图元',()=>api.select(M.descendants(s,single.id).filter(id=>s.nodes[id].type==='leaf'),'primitive'));
   add('删除',action('delete'),editable,'Del');
  }
  sep();add('全选组件',()=>api.select(M.selectionIdsAtLevel(s,'component'),'component'),Object.values(s.nodes).some(n=>n.type==='component'));
  for(const [id,label,key]of [['undo','撤销','Ctrl Z'],['redo','重做','Ctrl Shift Z'],['fit','适应画板','0']])add(label,()=>document.getElementById(id).click(),!document.getElementById(id).disabled,key);
  menu.hidden=false;menu.style.left=Math.max(8,Math.min(innerWidth-menu.offsetWidth-8,x))+'px';menu.style.top=Math.max(8,Math.min(innerHeight-menu.offsetHeight-8,y))+'px';menu.scrollTop=0;entries.find(b=>!b.disabled)?.focus();
 }
 api.svg.addEventListener('contextmenu',e=>{e.preventDefault();e.stopImmediatePropagation();document.querySelector('[data-draw="select"]').click();const actual=e.target.closest('[data-id]')?.dataset.id,s=api.read();if(actual){const covered=ids().some(id=>id===actual||M.ancestors(s,actual).includes(id));if(!covered){const id=api.target(e.target)||actual;api.select([id]);}}else api.select([]);show(e.clientX,e.clientY);},true);
 document.addEventListener('pointerdown',e=>{if(!menu.contains(e.target))close();},true);
 menu.addEventListener('contextmenu',e=>e.preventDefault());menu.addEventListener('pointerdown',e=>e.stopPropagation());
 document.addEventListener('keydown',e=>{
  if(!menu.hidden){e.stopImmediatePropagation();if(e.key==='Escape'||e.key==='Tab'){e.preventDefault();close();previousFocus?.focus();return;}if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();const available=entries.filter(b=>!b.disabled),index=available.indexOf(document.activeElement),next=e.key==='Home'?0:e.key==='End'?available.length-1:(index+(e.key==='ArrowDown'?1:-1)+available.length)%available.length;available[next]?.focus();}return;}
  if(e.target.closest('input,textarea,select,[contenteditable="true"]')||document.querySelector('dialog[open]'))return;
  if(e.key==='ContextMenu'||e.shiftKey&&e.key==='F10'){e.preventDefault();const r=(api.dom(ids()[0])||api.svg).getBoundingClientRect();show(r.x+r.width/2,r.y+r.height/2);return;}
  if((e.ctrlKey||e.metaKey)&&['c','x','v'].includes(e.key.toLowerCase())){e.preventDefault();e.stopImmediatePropagation();if(e.key.toLowerCase()==='v')paste();else if(e.key.toLowerCase()==='c')copy();else if(ids().length&&!E.scope(api.read(),ids()).some(id=>M.locked(api.read(),id))&&copy())api.action('delete');}
 },true);
 for(const name of ['figure-scene-change','figure-selection-change','figure-view-change','resize','blur'])window.addEventListener(name,close);
}};
