/* A DOM-only rendering worker: no editor storage or model credentials. */
window.FigureRuntime=(()=>{
 const host=document.getElementById('drawing');
 function mount(source){host.innerHTML=source;const svg=host.querySelector('svg');if(!svg)throw Error('缺少 SVG');svg.style.display='block';return svg;}
 function catalog(){return [...FigureTemplates.catalog.map(t=>({id:t.id,name:t.name,category:t.category,tags:t.tags||'',hint:t.hint||'',source:t.ref||'',kind:'template'})),...(DownloadedIcons.icons||[]).map(t=>({id:'icon:'+t.id,name:t.name,category:t.categories.join(','),tags:t.categoryNames.join(' '),hint:t.isBrand?'品牌标志，请确认使用场景':'',source:t.sourceUrl,license:t.license,kind:'icon'}))];}
 async function asset({id,options={}}){
  if(!options||Array.isArray(options)||typeof options!=='object')throw Error('素材参数无效');
  for(const [key,value]of Object.entries(options)){
   if(['color','accent'].includes(key)){if(typeof value!=='string'||!/^#[\da-f]{6}$/i.test(value))throw Error('素材颜色必须是 #RRGGBB');}
   else if(key==='label'){if(typeof value!=='string'||value.length>500)throw Error('素材标签无效');}
   else if(['depth','strokeWidth','fillOpacity'].includes(key)){if(!Number.isFinite(value)||value<0||value>20)throw Error('素材数值无效');}
   else if(key==='lineStyle'){if(!['solid','dashed','dotted'].includes(value))throw Error('素材线型无效');}
   else throw Error('不支持的素材参数：'+key);
  }
  let markup,meta=catalog().find(t=>t.id===id);if(!meta)throw Error('素材不存在');
  if(meta.kind==='icon'){const item=DownloadedIcons.icons.find(t=>'icon:'+t.id===id);const r=await fetch('external-icons/'+item.path);if(!r.ok)throw Error('素材文件不可用');markup=await r.text();}
  else markup=FigureTemplates.markup(id,options);
  const svg=mount(markup);await document.fonts.ready;const b=svg.getBBox();
  const vb=svg.viewBox.baseVal;const x=b.width?b.x:vb.x,y=b.height?b.y:vb.y,w=Math.max(1,b.width||vb.width),h=Math.max(1,b.height||vb.height);
  svg.setAttribute('viewBox',[x-2,y-2,w+4,h+4].join(' '));svg.setAttribute('width',w+4);svg.setAttribute('height',h+4);svg.removeAttribute('style');
  return{markup:svg.outerHTML,w:w+4,h:h+4,meta};
 }
  async function show({source,region,maxEdge=1500}){
  const svg=mount(source),vb=svg.viewBox.baseVal;svg.setAttribute('width',vb.width);svg.setAttribute('height',vb.height);await document.fonts.ready;
  await Promise.all([...svg.querySelectorAll('image')].map(el=>new Promise(resolve=>{const img=new Image();img.onload=img.onerror=resolve;img.src=el.getAttribute('href')||el.getAttribute('xlink:href')||'';if(img.complete)resolve();})));
  const measurement=FigureChecks.measure(svg),checks=FigureChecks.analyze(measurement);
  if(region){if(![region.x,region.y,region.w,region.h].every(Number.isFinite)||region.w<=0||region.h<=0)throw Error('预览区域无效');svg.setAttribute('viewBox',[region.x,region.y,region.w,region.h].join(' '));}
   if(!Number.isInteger(maxEdge)||maxEdge<256||maxEdge>3200)throw Error('预览最长边须为 256–3200 像素');
   const view=svg.viewBox.baseVal,factor=maxEdge/Math.max(view.width,view.height),width=Math.max(1,Math.round(view.width*factor)),height=Math.max(1,Math.round(view.height*factor));svg.setAttribute('width',width);svg.setAttribute('height',height);
  return{measurement,checks,width,height};
 }
 async function raster(){
  const svg=host.querySelector('svg'),canvas=document.createElement('canvas');canvas.width=Number(svg.getAttribute('width'));canvas.height=Number(svg.getAttribute('height'));
  const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml'}));
  try{const image=new Image();image.src=url;await image.decode();const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0);return canvas.toDataURL('image/png').split(',')[1];}finally{URL.revokeObjectURL(url);}
 }
 return{catalog,asset,show,raster,equation:config=>FigureEquation.render(config)};
})();
