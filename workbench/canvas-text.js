(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.FigureCanvasText=api;})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 const NS='http://www.w3.org/2000/svg';
 const lines=value=>String(value).replace(/\r\n?/g,'\n').split('\n');
 function read(text){
  let value='',seen=false,lastY=text.getAttribute('y');
  for(const node of Array.from(text.childNodes)){
   if(node.nodeType===1){const y=node.getAttribute('y'),dy=parseFloat(node.getAttribute('dy'));
    if(seen&&(node.hasAttribute('data-text-line')||Number.isFinite(dy)&&dy!==0||y!==''&&y!=null&&lastY!=null&&y!==lastY))value+='\n';
    if(y!==''&&y!=null)lastY=y;
   }
   value+=node.textContent;seen=true;
  }
  return value.replace(/\u200b/g,'').replace(/\u00a0/g,' ');
 }
 function write(text,value){
  const parts=lines(value),first=text.getElementsByTagName('tspan')[0],x=text.getAttribute('x')||first?.getAttribute('x')||'0',y=parseFloat(text.getAttribute('y')||first?.getAttribute('y'))||0,size=parseFloat(text.getAttribute('font-size')||first?.getAttribute('font-size'))||16;
  if(!text.hasAttribute('x'))text.setAttribute('x',x);
  if(!text.hasAttribute('y'))text.setAttribute('y',String(y));
  while(text.firstChild)text.removeChild(text.firstChild);
  if(parts.length===1){text.textContent=parts[0].replace(/ /g,'\u00a0');return;}
  parts.forEach((line,i)=>{const span=text.ownerDocument.createElementNS(NS,'tspan');span.setAttribute('x',x);span.setAttribute('y',String(y+i*size*(Number(text.getAttribute('data-line-height'))||1.2)));span.setAttribute('data-text-line',String(i));span.textContent=line.replace(/ /g,'\u00a0')||'\u200b';text.appendChild(span);});
 }
 function keyAction(e,composing=false){if(composing||e.isComposing||e.keyCode===229)return null;if(e.key==='Escape')return 'cancel';if(e.key==='Enter'&&(e.ctrlKey||e.metaKey))return 'commit';return null;}
 function box(anchor,width,height,viewport){const w=Math.min(Math.max(64,width),Math.max(64,viewport.w-8)),h=Math.min(Math.max(30,height),Math.max(30,viewport.h-8));return{x:Math.max(4,Math.min(anchor.x,viewport.w-w-4)),y:Math.max(4,Math.min(anchor.y,viewport.h-h-4)),w,h};}
 function mount({viewport,anchor,value='',fontSize=20,fontFamily='Arial, Microsoft YaHei, sans-serif',fontWeight='400',fontStyle='normal',lineHeight=1.2,color='#23313c',minWidth=120,label='画板文字',onCommit,onClose=()=>{}}){
  const field=document.createElement('textarea');field.className='canvas-text-editor';field.dataset.canvasUi='true';field.setAttribute('aria-label',label);field.title='Enter 换行 · Ctrl+Enter 完成 · Esc 取消';field.rows=1;field.wrap='off';field.spellcheck=false;field.value=value.replace(/\u200b/g,'');
  Object.assign(field.style,{fontSize:fontSize+'px',fontFamily,fontWeight,fontStyle,color,lineHeight:String(lineHeight)});
  let closed=false,composing=false;const measure=document.createElement('canvas').getContext('2d');
  function resize(){measure.font=`${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;const rows=lines(field.value),width=Math.max(minWidth,...rows.map(line=>measure.measureText(line||' ').width+18)),b=box(anchor,width,rows.length*fontSize*lineHeight+12,{w:viewport.clientWidth,h:viewport.clientHeight});Object.assign(field.style,{left:b.x+'px',top:b.y+'px',width:b.w+'px',height:b.h+'px'});}
  function close(save){if(closed)return;closed=true;const value=field.value;field.remove();onClose();if(save)onCommit(value);}
  field.addEventListener('pointerdown',e=>e.stopPropagation());field.addEventListener('input',resize);
  field.addEventListener('compositionstart',()=>composing=true);field.addEventListener('compositionend',()=>{composing=false;resize();});
  field.addEventListener('keydown',e=>{e.stopPropagation();const action=keyAction(e,composing);if(action){e.preventDefault();close(action==='commit');}});
  field.addEventListener('blur',()=>close(true));viewport.append(field);resize();field.focus();field.select();
  return{input:field,cancel:()=>close(false),commit:()=>close(true)};
 }
 return{read,write,lines,keyAction,box,mount};
});
