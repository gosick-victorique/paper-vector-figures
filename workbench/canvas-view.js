(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.FigureCanvasView=api;})(typeof window==='object'?window:globalThis,function(){
 const clamp=z=>Math.max(.1,Math.min(8,z));
 function zoomAt(view,scale,point){const z=clamp(scale),ratio=z/view.z;return{z,x:point.x-(point.x-view.x)*ratio,y:point.y-(point.y-view.y)*ratio};}
 function fitView(width,height){const z=clamp(Math.min(Math.max(1,width-64)/1200,Math.max(1,height-64)/740));return{z,x:(width-1200*z)/2,y:(height-740*z)/2};}
 function mount(){
  const $=s=>document.querySelector(s),viewport=$('#canvas-scroll'),board=$('#stage-wrap');let view=fitView(viewport.clientWidth,viewport.clientHeight),panning=null,space=false,hand=false,fitted=true;
  function draw(){board.style.transform=`translate(${view.x}px,${view.y}px) scale(${view.z})`;$('#zoom-input').value=Math.round(view.z*100);$('#zoom-label').textContent=Math.round(view.z*100)+'%';viewport.classList.toggle('pan-ready',space||hand);viewport.classList.toggle('panning',!!panning);$('#pan-tool').setAttribute('aria-pressed',String(hand));window.dispatchEvent(new Event('figure-view-change'));}
  const center=()=>({x:viewport.clientWidth/2,y:viewport.clientHeight/2});
  function zoom(scale,point=center()){if(!Number.isFinite(scale))return;view=zoomAt(view,scale,point);fitted=false;draw();}
  function fit(){view=fitView(viewport.clientWidth,viewport.clientHeight);fitted=true;draw();}
  $('#zoom-in').onclick=()=>zoom(view.z*1.2);$('#zoom-out').onclick=()=>zoom(view.z/1.2);$('#fit').onclick=fit;
  $('#zoom-input').onchange=e=>zoom(Number(e.target.value)/100);$('#zoom-input').onkeydown=e=>{if(e.key==='Enter'){zoom(Number(e.target.value)/100);e.target.blur();}};
  $('#pan-tool').onclick=()=>{hand=!hand;draw();};
  viewport.addEventListener('wheel',e=>{if(e.target.closest('[data-canvas-ui]'))return;e.preventDefault();const r=viewport.getBoundingClientRect(),delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?viewport.clientHeight:1);zoom(view.z*Math.exp(-Math.max(-400,Math.min(400,delta))*.002),{x:e.clientX-r.left,y:e.clientY-r.top});},{passive:false});
  viewport.addEventListener('pointerdown',e=>{if(e.target.closest('[data-canvas-ui]'))return;if(e.button!==1&&!(e.button===0&&(space||hand||!e.target.closest('svg'))))return;e.preventDefault();e.stopImmediatePropagation();panning={id:e.pointerId,x:e.clientX,y:e.clientY,before:{...view}};viewport.setPointerCapture(e.pointerId);draw();},true);
  viewport.addEventListener('pointermove',e=>{if(!panning||e.pointerId!==panning.id)return;e.preventDefault();e.stopImmediatePropagation();view={...view,x:panning.before.x+e.clientX-panning.x,y:panning.before.y+e.clientY-panning.y};fitted=false;draw();},true);
  function finish(e,cancel=false){if(!panning||e.pointerId!==panning.id)return;e.stopImmediatePropagation();if(cancel)view=panning.before;if(viewport.hasPointerCapture(e.pointerId))viewport.releasePointerCapture(e.pointerId);panning=null;draw();}
  viewport.addEventListener('pointerup',e=>finish(e),true);viewport.addEventListener('pointercancel',e=>finish(e,true),true);
  viewport.addEventListener('auxclick',e=>{if(e.button===1)e.preventDefault();});
  const typing=e=>e.target.closest('input,textarea,select,[contenteditable="true"]')||document.querySelector('dialog[open]');
  document.addEventListener('keydown',e=>{if(typing(e))return;if(e.code==='Space'){e.preventDefault();space=true;draw();}if(e.key==='Escape'){space=false;hand=false;draw();}if(!e.ctrlKey&&!e.metaKey&&['+','=','-','0'].includes(e.key)){e.preventDefault();e.key==='0'?fit():zoom(view.z*(e.key==='-'?1/1.2:1.2));}},true);
  document.addEventListener('keyup',e=>{if(e.code==='Space'){space=false;draw();}});
  window.addEventListener('blur',()=>{space=false;panning=null;draw();});
  new ResizeObserver(()=>{if(fitted)fit();else draw();}).observe(viewport);draw();
 }
 return{zoomAt,fitView,mount};
});
