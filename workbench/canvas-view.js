(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.FigureCanvasView=api;})(typeof window==='object'?window:globalThis,function(){
 const clamp=z=>Math.max(.1,Math.min(8,z));
 function zoomAt(view,scale,point){const z=clamp(scale),ratio=z/view.z;return{z,x:point.x-(point.x-view.x)*ratio,y:point.y-(point.y-view.y)*ratio};}
 function fitView(width,height,canvasWidth=1200,canvasHeight=740){const z=clamp(Math.min(Math.max(1,width-64)/canvasWidth,Math.max(1,height-64)/canvasHeight));return{z,x:(width-canvasWidth*z)/2,y:(height-canvasHeight*z)/2};}
 function mount(){
  const $=s=>document.querySelector(s),viewport=$('#canvas-scroll'),board=$('#stage-wrap'),size=()=>{const v=document.querySelector('#stage>svg').viewBox.baseVal;return{width:v.width,height:v.height};};let view=fitView(viewport.clientWidth,viewport.clientHeight,size().width,size().height),panning=null,space=false,hand=false,fitted=true;
  // Resize the SVG viewport rather than magnifying a cached CSS compositor layer.
  function draw(){board.style.width=size().width*view.z+'px';board.style.height=size().height*view.z+'px';board.style.left=view.x+'px';board.style.top=view.y+'px';$('#zoom-input').value=Math.round(view.z*100);$('#zoom-label').textContent=Math.round(view.z*100)+'%';viewport.classList.toggle('pan-ready',space||hand);viewport.classList.toggle('panning',!!panning);$('#pan-tool').setAttribute('aria-pressed',String(hand));window.dispatchEvent(new Event('figure-view-change'));}
  const center=()=>({x:viewport.clientWidth/2,y:viewport.clientHeight/2});
  function zoom(scale,point=center()){if(!Number.isFinite(scale))return;view=zoomAt(view,scale,point);fitted=false;draw();}
  function fit(){view=fitView(viewport.clientWidth,viewport.clientHeight,size().width,size().height);fitted=true;draw();}
  $('#zoom-in').onclick=()=>zoom(view.z*1.2);$('#zoom-out').onclick=()=>zoom(view.z/1.2);$('#fit').onclick=fit;
  $('#zoom-input').onchange=e=>zoom(Number(e.target.value)/100);$('#zoom-input').onkeydown=e=>{if(e.key==='Enter'){zoom(Number(e.target.value)/100);e.target.blur();}};
  $('#pan-tool').onclick=()=>{hand=!hand;draw();};
  viewport.addEventListener('wheel',e=>{if(e.target.closest('[data-canvas-ui]'))return;e.preventDefault();const r=viewport.getBoundingClientRect(),delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?viewport.clientHeight:1);zoom(view.z*Math.exp(-Math.max(-400,Math.min(400,delta))*.002),{x:e.clientX-r.left,y:e.clientY-r.top});},{passive:false});
  viewport.addEventListener('pointerdown',e=>{if(e.target.closest('[data-canvas-ui]'))return;if(e.button!==1&&!(e.button===0&&(space||hand||!e.target.closest('svg'))))return;e.preventDefault();e.stopImmediatePropagation();panning={id:e.pointerId,x:e.clientX,y:e.clientY,before:{...view}};viewport.setPointerCapture(e.pointerId);draw();},true);
  viewport.addEventListener('pointermove',e=>{if(!panning||e.pointerId!==panning.id)return;e.preventDefault();e.stopImmediatePropagation();view={...view,x:panning.before.x+e.clientX-panning.x,y:panning.before.y+e.clientY-panning.y};fitted=false;draw();},true);
  function finish(e,cancel=false){if(!panning||e.pointerId!==panning.id)return;e.stopImmediatePropagation();if(cancel)view=panning.before;if(viewport.hasPointerCapture(e.pointerId))viewport.releasePointerCapture(e.pointerId);panning=null;draw();}
  viewport.addEventListener('pointerup',e=>finish(e),true);viewport.addEventListener('pointercancel',e=>finish(e,true),true);
  viewport.addEventListener('auxclick',e=>{if(e.button===1)e.preventDefault();});
  const typing=e=>e.target.closest('input,textarea,select,[contenteditable="true"],.app-menus')||document.querySelector('dialog[open]');
  document.addEventListener('keydown',e=>{if(typing(e))return;if(e.code==='Space'){e.preventDefault();space=true;draw();}if(e.key==='Escape'){space=false;hand=false;draw();}if(!e.ctrlKey&&!e.metaKey&&['+','=','-','0'].includes(e.key)){e.preventDefault();e.key==='0'?fit():zoom(view.z*(e.key==='-'?1/1.2:1.2));}},true);
  document.addEventListener('keyup',e=>{if(e.code==='Space'){space=false;draw();}});
  window.addEventListener('blur',()=>{space=false;panning=null;draw();});
  window.addEventListener('figure-canvas-change',fit);
  window.addEventListener('figure-focus-region',e=>{const b=e.detail;if(!b||![b.x,b.y,b.w,b.h].every(Number.isFinite))return;const z=clamp(Math.min(2,(viewport.clientWidth-80)/Math.max(1,b.w),(viewport.clientHeight-80)/Math.max(1,b.h)));view={z,x:viewport.clientWidth/2-(b.x+b.w/2)*z,y:viewport.clientHeight/2-(b.y+b.h/2)*z};fitted=false;draw();});
  new ResizeObserver(()=>{if(fitted)fit();else draw();}).observe(viewport);draw();
 }
 return{zoomAt,fitView,mount};
});
