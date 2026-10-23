(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.FigureCanvasDraw=api;})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
 const clamp=p=>({x:Math.max(1,Math.min(1199,p.x)),y:Math.max(1,Math.min(739,p.y))});
 function geometry(start,end,square=false){const a=clamp(start);let b=clamp(end),dx=b.x-a.x,dy=b.y-a.y;if(square){const size=Math.min(Math.max(Math.abs(dx),Math.abs(dy)),dx<0?a.x-1:1199-a.x,dy<0?a.y-1:739-a.y);b={x:a.x+(dx<0?-size:size),y:a.y+(dy<0?-size:size)};}return{start:a,end:b,x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),w:Math.max(1,Math.abs(a.x-b.x)),h:Math.max(1,Math.abs(a.y-b.y))};}
 const lineKeys=['straight','bidirectional','association','elbow','curve','inhibit','leader'];
 function constrain(start,end,key,shift){if(!shift)return geometry(start,end);if(!lineKeys.includes(key))return geometry(start,end,true);const dx=end.x-start.x,dy=end.y-start.y,r=Math.hypot(dx,dy),a=Math.round(Math.atan2(dy,dx)/(Math.PI/4))*Math.PI/4;return geometry(start,{x:start.x+r*Math.cos(a),y:start.y+r*Math.sin(a)});}
 function markup(key,g,opt={},fallback){
  const color=/^#[0-9a-f]{6}$/i.test(opt.color||'')?opt.color:'#416f89',width=Math.max(.5,Math.min(6,Number(opt.strokeWidth)||1.8)),alpha=Math.max(0,Math.min(1,opt.fillOpacity??.12)),dash={solid:'',dashed:'6 4',dotted:'1 4'}[opt.lineStyle]||'',w=g.w,h=g.h;
  const style=`stroke="${color}" stroke-width="${width}" fill="${color}" fill-opacity="${alpha}" stroke-linecap="round" stroke-linejoin="round"${dash?` stroke-dasharray="${dash}"`:''}`;
  // Emit explicit fill once (duplicate SVG attributes are not valid XML).
  const line=d=>`<path d="${d}" ${style.replace(`fill="${color}"`,'fill="none"')}/>`;
  const head=(p,near,which='end')=>{const a=Math.atan2(p.y-near.y,p.x-near.x),length=Math.min(12,Math.max(5,Math.hypot(g.end.x-g.start.x,g.end.y-g.start.y)*.12)),co=Math.cos(a),si=Math.sin(a);return line(`M${p.x-length*co+length*.5*si} ${p.y-length*si-length*.5*co}L${p.x} ${p.y}L${p.x-length*co-length*.5*si} ${p.y-length*si+length*.5*co}`).replace(/ stroke-dasharray="[^"]*"/g,'').replace('<path ',`<path data-connector-end="${which}" `);};
  let body='';
  if(['rectangle','rounded','capsule'].includes(key))body=`<rect x="0" y="0" width="${w}" height="${h}" rx="${key==='rectangle'?0:key==='capsule'?Math.min(w,h)/2:Math.min(16,Math.min(w,h)/5)}" ${style}/>`;
  else if(key==='ellipse')body=`<ellipse cx="${w/2}" cy="${h/2}" rx="${w/2}" ry="${h/2}" ${style}/>`;
  else if(key==='diamond')body=`<polygon points="${w/2},0 ${w},${h/2} ${w/2},${h} 0,${h/2}" ${style}/>`;
  else if(key==='hexagon')body=`<polygon points="${w/4},0 ${w*.75},0 ${w},${h/2} ${w*.75},${h} ${w/4},${h} 0,${h/2}" ${style}/>`;
  else if(key==='caption')body=`<text x="0" y="20" font-size="20" font-family="Arial, Microsoft YaHei, sans-serif" fill="${color}">${String(opt.label||'文字').replace(/\r\n?/g,'\n').split('\n').map((line,i)=>`<tspan x="0" y="${20+i*24}" data-text-line="${i}">${escape(line.replace(/ /g,'\u00a0')||'\u200b')}</tspan>`).join('')}</text>`;
  else if(lineKeys.includes(key)){
   const a={x:g.start.x-g.x,y:g.start.y-g.y},b={x:g.end.x-g.x,y:g.end.y-g.y};let near=a;
   if(key==='curve'){const dx=b.x-a.x,dy=b.y-a.y,offset=Math.min(80,Math.hypot(dx,dy)*.3);const length=Math.hypot(dx,dy)||1,c={x:a.x+dx/3+dy/length*offset,y:a.y+dy/3-dx/length*offset};near={x:a.x+dx*2/3+dy/length*offset,y:a.y+dy*2/3-dx/length*offset};body=line(`M${a.x} ${a.y}C${c.x} ${c.y} ${near.x} ${near.y} ${b.x} ${b.y}`);}
   else if(key==='elbow'){const mid=(a.x+b.x)/2;body=line(`M${a.x} ${a.y}H${mid}V${b.y}H${b.x}`);near={x:mid,y:b.y};}
   else if(key==='leader'){body=line(`M${a.x} ${a.y}L${(a.x+b.x)/2} ${b.y}H${b.x}`)+`<circle data-connector-end="start" cx="${a.x}" cy="${a.y}" r="3" fill="${color}"/>`;}
   else body=line(`M${a.x} ${a.y}L${b.x} ${b.y}`);
   if(['straight','bidirectional','curve','elbow'].includes(key))body+=head(b,near);
   if(key==='bidirectional')body+=head(a,b,'start');
   if(key==='association')body+=`<circle data-connector-end="start" cx="${a.x}" cy="${a.y}" r="3" fill="${color}"/><circle data-connector-end="end" cx="${b.x}" cy="${b.y}" r="3" fill="${color}"/>`;
   if(key==='inhibit'){const angle=Math.atan2(b.y-a.y,b.x-a.x),dx=Math.sin(angle)*8,dy=Math.cos(angle)*8;body+=line(`M${b.x-dx} ${b.y+dy}L${b.x+dx} ${b.y-dy}`).replace(/ stroke-dasharray="[^"]*"/g,'').replace('<path ','<path data-connector-end="end" ');}
  }
  else return fallback;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${body}</svg>`;
 }
 function mount(api){
  const svg=api.svg,viewport=document.querySelector('#canvas-scroll'),NS='http://www.w3.org/2000/svg';let tool=null,drag=null,input=null;
  const bar=document.createElement('div');bar.className='draw-tools';bar.dataset.canvasUi='true';bar.setAttribute('role','toolbar');bar.setAttribute('aria-label','基础绘图工具');
  bar.innerHTML='<button data-draw="select" title="选择 · V" aria-label="选择工具" aria-pressed="true"><svg class="select-cursor-icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M5 3L5 19L9.5 14.5L13 21L16 19.5L12.5 13L19 13Z" fill="currentColor" stroke="white" stroke-width="1.3" stroke-linejoin="round"/></svg></button>'+[['rectangle','▭','矩形'],['ellipse','◯','椭圆'],['straight','↗','箭头'],['curve','⌒','曲线'],['caption','T','文字']].map(([key,icon,label])=>`<button data-draw="${key}" title="${label}" aria-label="绘制${label}" aria-pressed="false">${icon}</button>`).join('')+'<button data-draw="more" title="更多基础元素" aria-label="更多基础元素">＋</button><span class="draw-tool-name" hidden></span>';
  viewport.append(bar);
  const preview=document.createElementNS(NS,'g');preview.setAttribute('data-editor','true');preview.setAttribute('class','draw-preview');preview.setAttribute('pointer-events','none');svg.append(preview);
  function sync(){viewport.classList.toggle('drawing-mode',!!tool);bar.querySelectorAll('[data-draw]').forEach(b=>b.setAttribute('aria-pressed',String(tool?b.dataset.draw===tool.key:b.dataset.draw==='select')));const label=bar.querySelector('span');label.hidden=!tool;label.textContent=tool?tool.name+' · Esc 退出':'';window.dispatchEvent(new CustomEvent('figure-draw-tool',{detail:tool?.id||null}));}
  function cancel(){if(drag&&svg.hasPointerCapture(drag.pointerId))svg.releasePointerCapture(drag.pointerId);drag=null;preview.innerHTML='';if(input){const old=input;input=null;old.cancel();}}
  function activate(t){cancel();tool=t||null;if(tool&&document.querySelector('#pan-tool').getAttribute('aria-pressed')==='true')document.querySelector('#pan-tool').click();sync();}
  bar.addEventListener('click',e=>{const b=e.target.closest('[data-draw]');if(!b)return;if(b.dataset.draw==='select'){activate(null);return;}if(b.dataset.draw==='more'){document.querySelector('#open-foundations').click();return;}api.choose('foundation-'+b.dataset.draw);});
  const point=e=>new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM().inverse());
  function sample(e){const g=constrain(drag.start,point(e),tool.key,e.shiftKey),raw=markup(tool.key,g,drag.options,drag.fallback);return{g,raw,native:lineKeys.includes(tool.key)||['rectangle','rounded','capsule','ellipse','diamond','hexagon','caption'].includes(tool.key)};}
  function paint(sample){preview.innerHTML=sample.raw;const inner=preview.firstElementChild;if(inner){inner.setAttribute('x',sample.g.x);inner.setAttribute('y',sample.g.y);inner.setAttribute('width',sample.g.w);inner.setAttribute('height',sample.g.h);inner.setAttribute('preserveAspectRatio','none');inner.setAttribute('overflow','visible');}const rect=document.createElementNS(NS,'rect');for(const[k,v]of Object.entries({x:sample.g.x,y:sample.g.y,width:sample.g.w,height:sample.g.h,fill:'none',stroke:'#2b89b7','stroke-dasharray':'4 3','vector-effect':'non-scaling-stroke'}))rect.setAttribute(k,v);preview.append(rect);}
  function textAt(p,options){
   if(input)input.commit();const chosen=tool,r=viewport.getBoundingClientRect(),matrix=svg.getScreenCTM(),screen=new DOMPoint(p.x,p.y).matrixTransform(matrix),z=Math.hypot(matrix.c,matrix.d)||1;
   input=FigureCanvasText.mount({viewport,anchor:{x:screen.x-r.left,y:screen.y-r.top},fontSize:20*z,color:options.color,minWidth:120,label:'新建文字',onClose:()=>{input=null;},onCommit:value=>{
    if(!value.trim())return;const rows=FigureCanvasText.lines(value),g=geometry(p,{x:p.x+180,y:p.y+Math.max(28,rows.length*24)}),opts={...options,label:value};api.commit({g,raw:markup('caption',g,opts),native:true},chosen,opts);
   }});
  }
  svg.addEventListener('pointerdown',e=>{if(!tool||e.button!==0)return;e.preventDefault();e.stopImmediatePropagation();if(!api.canDraw()){api.toast('画板已锁定');return;}const p=clamp(point(e)),options=api.options();if(tool.key==='caption'){textAt(p,options);return;}drag={start:p,options,fallback:api.fallback(),pointerId:e.pointerId};svg.setPointerCapture(e.pointerId);},true);
  svg.addEventListener('pointermove',e=>{if(!drag)return;e.preventDefault();e.stopImmediatePropagation();paint(sample(e));},true);
  svg.addEventListener('pointerup',e=>{if(!tool)return;e.stopImmediatePropagation();if(!drag)return;const s=sample(e),distance=Math.hypot(s.g.end.x-s.g.start.x,s.g.end.y-s.g.start.y),options=drag.options;cancel();if(distance>=3)api.commit(s,tool,options);},true);
  svg.addEventListener('pointercancel',e=>{if(drag){e.stopImmediatePropagation();cancel();}},true);
  document.addEventListener('keydown',e=>{if(e.target.closest('input,textarea,select')||document.querySelector('dialog[open]'))return;if(e.key==='Escape'||!e.ctrlKey&&!e.metaKey&&e.key.toLowerCase()==='v'){if(tool){e.preventDefault();e.stopImmediatePropagation();activate(null);}}},true);
  for(const id of ['mode-group','mode-component','mode-primitive','box-select'])document.getElementById(id).addEventListener('click',()=>activate(null),true);
  document.getElementById('layers').addEventListener('click',()=>activate(null),true);
  document.getElementById('reset-view').addEventListener('click',()=>activate(null),true);
  window.addEventListener('blur',cancel);window.addEventListener('figure-board-change',()=>activate(null));sync();return{activate,active:()=>!!tool};
 }
 return{geometry,constrain,markup,mount};
});
