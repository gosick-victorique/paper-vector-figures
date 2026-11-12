(function(root,factory){const api=factory(typeof module==='object'?require('./connection-checks.js'):root.FigureConnectionChecks);if(typeof module==='object')module.exports=api;else root.FigureChecks=api;})(typeof window==='object'?window:globalThis,function(ConnectionChecks){
 'use strict';
 const limits={minFontPt:6,minContrast:3,maxElements:6000,maxText:1200,maxIssues:150};
 const intersect=(a,b)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
 function rgb(value){const m=String(value).match(/^rgba?\(\s*([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/);return m&&(!m[4]||Number(m[4])===1)?m.slice(1,4).map(Number):null;}
 function contrast(a,b){const luminance=c=>c.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0),x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
 function analyze(measurement,options={}){
  const {width,height,leaves=[],texts=[],skipped=0,truncated=false}=measurement;
  const config={...limits,...options},issues=[],keys=new Set();let capped=false;
  function add(code,severity,ids,message,magnitude=1){const key=code+':'+[...ids].sort().join(',');if(keys.has(key)){const old=issues.find(i=>i.key===key);if(old&&magnitude>old.magnitude)Object.assign(old,{message,magnitude});return;}keys.add(key);if(issues.length>=config.maxIssues){capped=true;return;}issues.push({key,code,severity,ids,message,magnitude});}
  for(const leaf of leaves){const b=leaf.box;if(b.x<-.5||b.y<-.5||b.x+b.w>width+.5||b.y+b.h>height+.5)add('outside','error',[leaf.id],`${leaf.name||leaf.id} 超出画板，导出时可能被裁切`,Math.max(0,-b.x,-b.y,b.x+b.w-width,b.y+b.h-height));}
  const sorted=texts.filter(t=>t.box.w>0&&t.box.h>0).sort((a,b)=>a.box.x-b.box.x);
  for(let i=0;i<sorted.length;i++){
   const t=sorted[i],label=t.text.replace(/\s+/g,' ').slice(0,40);
   if(t.fontPt<config.minFontPt)add('small-text','warning',[t.id],`“${label}”约 ${t.fontPt.toFixed(1)} pt，小于 ${config.minFontPt} pt 检查阈值`,config.minFontPt-t.fontPt);
   if(t.foreground&&t.background){const ratio=contrast(t.foreground,t.background);if(ratio<config.minContrast)add('contrast','warning',[t.id],`“${label}”与已知纯色背景对比度约 ${ratio.toFixed(1)}:1，建议检查可读性`,config.minContrast-ratio);}
   for(let j=i+1;j<sorted.length&&sorted[j].box.x<t.box.x+t.box.w;j++){
    const other=sorted[j];if(t.owner===other.owner)continue;
    const area=intersect(t.box,other.box),minArea=Math.min(t.box.w*t.box.h,other.box.w*other.box.h);
    if(area>4&&area/minArea>.2)add('text-overlap','warning',[...new Set([t.id,other.id])],`“${label}”与“${other.text.replace(/\s+/g,' ').slice(0,40)}”的文字区域可能重叠`,area/minArea);
   }
  }
  const connections=ConnectionChecks.analyze(measurement,{...options,maxIssues:Math.max(0,config.maxIssues-issues.length)});issues.push(...connections.issues);
  const origin=measurement.origin||{x:0,y:0};for(const issue of connections.issues){const r=issue.region,x=Math.max(0,Math.min(width-1,r.x)),y=Math.max(0,Math.min(height-1,r.y));issue.region={x:x+origin.x,y:y+origin.y,w:Math.max(1,Math.min(width,r.x+r.w)-x),h:Math.max(1,Math.min(height,r.y+r.h)-y)};}
  return{issues,skipped:skipped+connections.skipped,truncated:truncated||capped||connections.truncated,counts:{leaves:leaves.length,texts:texts.length,connections:connections.counts.connections},limits:config,connections:{...connections,issues:undefined}};
 }
 function measure(svg){
  const vb=svg.viewBox.baseVal,rootInverse=svg.getScreenCTM().inverse(),leaves=[],texts=[],backgrounds=[],modules=[],connections=[];let skipped=0,truncated=false,order=0;
  const ancestors=el=>{const ids=[];for(let p=el.parentElement;p&&p!==svg;p=p.parentElement)if(p.hasAttribute('data-id')&&p.getAttribute('data-type')!=='leaf')ids.push(p.getAttribute('data-id'));return ids;};
  const wireElements=[...svg.querySelectorAll('[data-type="leaf"][data-connection-from]')],boundWires=wireElements.map(el=>({id:el.getAttribute('data-id'),parent:el.parentElement.closest('[data-id]')?.getAttribute('data-id')}));
  const elements=[...svg.querySelectorAll('*')];if(elements.length>limits.maxElements)truncated=true;
  const box=(el,m)=>{const b=el.getBBox(),ps=[[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].map(([x,y])=>({x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f})),x=Math.min(...ps.map(p=>p.x)),y=Math.min(...ps.map(p=>p.y));return{x:x-vb.x,y:y-vb.y,w:Math.max(...ps.map(p=>p.x))-x,h:Math.max(...ps.map(p=>p.y))-y};};
  for(const el of elements.slice(0,limits.maxElements)){
   if(el.closest('defs,[data-editor]'))continue;order++;
   const style=getComputedStyle(el);if(style.display==='none'||style.visibility==='hidden')continue;
   let opacity=1,complex=false;for(let p=el;p&&p!==svg.parentElement;p=p.parentElement){const css=getComputedStyle(p);opacity*=Number(css.opacity);if(css.display==='none')opacity=0;if(css.filter!=='none'||css.clipPath!=='none'||css.maskImage!=='none')complex=true;}
   if(opacity===0)continue;
   let m,b;try{m=rootInverse.multiply(el.getScreenCTM());b=box(el,m);}catch{skipped++;continue;}
   const id=el.closest('[data-type="leaf"][data-id]')?.getAttribute('data-id');
   if(el.matches('[data-type="leaf"],[data-type="component"]')){const record={id:el.getAttribute('data-id'),name:el.getAttribute('data-name')||el.getAttribute('data-id'),parent:el.parentElement.closest('[data-id]')?.getAttribute('data-id'),ancestors:ancestors(el),box:b};if(el.matches('[data-type="leaf"]'))leaves.push(record);else modules.push(record);
    if(el.hasAttribute('data-connection-from')){try{const path=el.querySelector('path'),css=path&&getComputedStyle(path),points=path&&ConnectionChecks.parsePolyline(path.getAttribute('d'));let visible=true;for(let p=path;p&&p!==el;p=p.parentElement){const style=getComputedStyle(p);if(style.display==='none'||style.visibility==='hidden'||Number(style.opacity)===0||style.filter!=='none'||style.clipPath!=='none'||style.maskImage!=='none')visible=false;}if(points&&visible&&!complex&&css.stroke!=='none'&&parseFloat(css.strokeWidth)>0&&Number(css.strokeOpacity)>0){const matrix=rootInverse.multiply(path.getScreenCTM());connections.push({...record,from:el.getAttribute('data-connection-from'),to:el.getAttribute('data-connection-to'),points:points.map(p=>({x:matrix.a*p.x+matrix.c*p.y+matrix.e-vb.x,y:matrix.b*p.x+matrix.d*p.y+matrix.f-vb.y}))});}}catch{}}
   }
   const fill=style.fill,solid=opacity===1&&Number(style.fillOpacity)===1&&!complex;
   if(['rect','circle','ellipse','path','polygon','polyline','image','use','foreignObject'].includes(el.localName)&&!el.hasAttribute('data-component-hit')&&(fill!=='none'||['image','use','foreignObject'].includes(el.localName))){backgrounds.push({box:b,order,color:el.localName==='rect'&&solid&&Math.abs(m.b)+Math.abs(m.c)<.001&&!Number(el.getAttribute('rx'))&&!Number(el.getAttribute('ry'))?rgb(fill):null});}
   if(el.localName!=='text'||!id||!el.textContent.trim())continue;
   if(texts.length>=limits.maxText){truncated=true;continue;}
   const fontPt=parseFloat(style.fontSize)*Math.hypot(m.c,m.d)/((1200/180)*25.4/72);
   let background=[255,255,255],unknown=!solid||!rgb(fill)||el.querySelector('tspan[fill],tspan[style]')!==null;
   for(let j=backgrounds.length-1;j>=0;j--){const bg=backgrounds[j];if(!intersect(b,bg.box))continue;const covers=bg.box.x<=b.x&&bg.box.y<=b.y&&bg.box.x+bg.box.w>=b.x+b.w&&bg.box.y+bg.box.h>=b.y+b.h;if(bg.color&&covers){background=bg.color;break;}unknown=true;break;}
   if(unknown)skipped++;
   texts.push({id,owner:order,box:b,text:el.textContent,fontPt,foreground:solid&&!unknown?rgb(fill):null,background:unknown?null:background});
  }
  return{width:vb.width,height:vb.height,origin:{x:vb.x,y:vb.y},leaves,texts,modules,connections,boundWires,connectionSkipped:wireElements.length-connections.length,skipped,truncated};
 }
 async function inspect(source,{includeMeasurement=false}={}){
  const doc=new DOMParser().parseFromString(source,'image/svg+xml');if(doc.querySelector('parsererror')||doc.documentElement.localName!=='svg')throw Error('图稿无法读取');
  const svg=document.importNode(doc.documentElement,true),host=document.createElement('div');host.style.cssText='position:fixed;left:-100000px;top:0;pointer-events:none';host.setAttribute('aria-hidden','true');
  // Sources come from the editor or the server's validated SVG output.
  svg.querySelectorAll('[data-editor],[data-component-hit]').forEach(n=>n.remove());host.append(svg);document.body.append(host);
  try{svg.setAttribute('width',svg.viewBox.baseVal.width);svg.setAttribute('height',svg.viewBox.baseVal.height);await document.fonts.ready;const measurement=measure(svg),checks=analyze(measurement);return includeMeasurement?{measurement,checks}:checks;}finally{host.remove();}
 }
 function regressions(before,after){const previous=new Map(before.issues.map(i=>[i.key,i]));return after.issues.filter(i=>{const old=previous.get(i.key);return !old||i.severity==='error'&&old.severity!=='error'||i.magnitude>(old.magnitude??0)+.05;});}
 return{analyze,inspect,measure,contrast,rgb,limits,regressions};
});
