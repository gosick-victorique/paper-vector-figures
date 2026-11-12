(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FigureCharts=api;})(globalThis,function(){
 'use strict';
 const palettes={blue:['#326c99','#cf783c','#57947b','#926ca5','#ba5969','#7d823b'],muted:['#4b727a','#b67e60','#879465','#947b99','#bc6574','#78879a'],mono:['#263844','#506574','#788b97','#9cabb4','#bdc8cf','#d6dfe4']};
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
 function parse(text){
  text=String(text).replace(/^\uFEFF/,'').trim();if(!text)throw Error('请粘贴数据或导入 CSV');if(text.length>1000000)throw Error('数据不能超过 1 MB');
  const first=text.split(/\r?\n/)[0],sep=first.includes('\t')?'\t':first.includes(',')?',':';';let rows=[],row=[],cell='',quoted=false;
  for(let i=0;i<=text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(!quoted&&(c===sep||c==='\n'||c===undefined)){row.push(cell.trim());cell='';if(c!==sep){if(row.some(Boolean))rows.push(row);row=[];}}else if(c!=='\r'&&c!==undefined)cell+=c;}
  if(quoted)throw Error('CSV 引号未闭合');if(rows.length<2||rows[0].length<2)throw Error('需要列名，以及至少一行 X、Y 数据');if(rows.length>2001||rows[0].length>30)throw Error('最多 2000 行、30 列');const headers=rows.shift();if(headers.some(h=>!h)||new Set(headers).size!==headers.length)throw Error('列名不能为空或重复');if(rows.some(r=>r.length!==headers.length))throw Error('每行列数须与表头一致');return{headers,rows};
 }
 const number=(v,label)=>{if(String(v).trim()===''||!Number.isFinite(Number(v)))throw Error(label+'需要数值');return Number(v);};
 function ticks(lo,hi,log,interval){
  if(log){const out=[];for(let p=Math.ceil(Math.log10(lo));p<=Math.floor(Math.log10(hi));p++)out.push(10**p);return out.length>1?out:[lo,hi];}
  const raw=(hi-lo)/5,base=10**Math.floor(Math.log10(raw)),manual=interval!==''&&interval!=null,step=manual?number(interval,'刻度间距'):[1,2,2.5,5,10].map(x=>x*base).find(x=>x>=raw)||base*10;
  if(!(step>0)||!Number.isFinite(step)||(hi-lo)/step>100)throw Error('刻度间距须大于 0，且每轴不超过 100 个刻度');
  const start=Math.ceil(lo/step-1e-10)*step,out=[];for(let i=0;i<=101;i++){const value=start+i*step;if(value>hi+step*1e-9)break;if(value>=lo-step*1e-9)out.push(Math.abs(value)<step*1e-10?0:value);}return out;
 }
 const dash=style=>style==='dashed'?'7 4':style==='dotted'?'2 4':'';
 function marker(shape,x,y,size,color){const attr=`fill="${color}" stroke="white" stroke-width="1"`;if(shape==='none')return '';if(shape==='square')return `<rect x="${x-size}" y="${y-size}" width="${size*2}" height="${size*2}" ${attr}/>`;if(shape==='triangle')return `<polygon points="${x},${y-size*1.2} ${x+size*1.1},${y+size} ${x-size*1.1},${y+size}" ${attr}/>`;if(shape==='diamond')return `<polygon points="${x},${y-size*1.3} ${x+size*1.1},${y} ${x},${y+size*1.3} ${x-size*1.1},${y}" ${attr}/>`;return `<circle cx="${x}" cy="${y}" r="${size}" ${attr}/>`;}
 const format=n=>Math.abs(n)>=1e5||Math.abs(n)>0&&Math.abs(n)<.001?n.toExponential(1):String(Number(n.toPrecision(5)));
 const unitsPerMm=1200/180;
 function toCSV(table){return [table.headers,...table.rows].map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n');}
 function publication(c){
  if(!c.publication)return null;
  const width=number(c.widthMm,'宽度'),height=number(c.heightMm,'高度'),pt=number(c.fontPt,'字号');
  if(width<40||width>500||height<30||height>500||pt<6||pt>14)throw Error('宽 40–500 mm，高 30–500 mm，字号 6–14 pt');
  return{w:width*unitsPerMm,h:height*unitsPerMm,font:pt*25.4/72*unitsPerMm};
 }
 function render(c){
  const table=parse(c.text),type=c.type||'line',bar=type==='bar',log=c.yLog===true;
  if(!['line','scatter','bar'].includes(type))throw Error('图型无效');if(!Number.isInteger(c.x)||c.x<0||c.x>=table.headers.length)throw Error('请选择 X 列');
  if(!c.series?.length||c.series.length>6)throw Error('请选择 1–6 个数据系列');if(bar&&log)throw Error('柱状图请使用线性 Y 轴');
  const xs=table.rows.map((r,i)=>bar?r[c.x]:number(r[c.x],`第 ${i+2} 行 X 列`));
  const sets=c.series.map((s,k)=>{if(!Number.isInteger(s.column)||s.column<0||s.column>=table.headers.length)throw Error('Y 列无效');const color=/^#[\da-f]{6}$/i.test(s.color)?s.color:(palettes[c.palette]||palettes.blue)[k];return{...s,name:s.name||table.headers[s.column],color,points:table.rows.map((r,i)=>{const y=number(r[s.column],`第 ${i+2} 行 ${table.headers[s.column]} 列`),error=s.error>=0?number(r[s.error],`第 ${i+2} 行误差列`):0;if(error<0)throw Error('误差值不能为负');if(log&&y-error<=0)throw Error('对数轴的数据及误差下界必须大于 0');return{y,error};})};});
  let vals=sets.flatMap(s=>s.points.flatMap(p=>[p.y-p.error,p.y+p.error])),y0=Math.min(...vals),y1=Math.max(...vals),x0=bar?-.5:Math.min(...xs),x1=bar?xs.length-.5:Math.max(...xs);
  if(bar){y0=Math.min(0,y0);y1=Math.max(0,y1);}if(y0===y1){if(log){y0/=2;y1*=2;}else{const d=Math.max(1,Math.abs(y0)*.1);y0-=d;y1+=d;}}else if(!bar){if(log){const d=(Math.log10(y1)-Math.log10(y0))*.06;y0/=10**d;y1*=10**d;}else{const d=(y1-y0)*.07;y0-=d;y1+=d;}}else{const d=(y1-y0)*.08;if(y0<0)y0-=d;if(y1>0)y1+=d;}
  if(x0===x1){x0-=.5;x1+=.5;}
  else if(!bar){const padding=(x1-x0)*.025;x0-=padding;x1+=padding;}
  for(const key of ['xMin','xMax','yMin','yMax'])if(c[key]!==''&&c[key]!=null){const n=number(c[key],key);if(key==='xMin')x0=n;if(key==='xMax')x1=n;if(key==='yMin')y0=n;if(key==='yMax')y1=n;}
  if(![x0,x1,y0,y1,x1-x0,y1-y0].every(Number.isFinite)||x0>=x1||y0>=y1||log&&y0<=0)throw Error('坐标范围无效：最小值须小于最大值；对数轴须大于 0');
  const legend=c.legend!==false,position=['bottom','right','inside'].includes(c.legendPosition)?c.legendPosition:'bottom';
  const pub=publication(c),W=pub?.w||620,H=pub?.h||410,font=pub?.font||Math.max(10,Math.min(22,Number(c.font)||13)),fs=pub?font/13:1;
  const legendCols=pub?Math.max(1,Math.min(3,Math.floor((W-100*fs)/(150*fs)))):3,legendRows=Math.ceil(sets.length/legendCols);
  const reserve=c.layoutInsets||{},L=Math.max(76*fs,Number(reserve.L)||0),R=Math.max((legend&&position==='right'?164:24)*fs,Number(reserve.R)||0),T=Math.max((c.title?48:c.panelLabel?42:28)*fs,Number(reserve.T)||0),B=Math.max((legend&&position==='bottom'?Math.max(105,67+legendRows*23):68)*fs,Number(reserve.B)||0),pw=W-L-R,ph=H-T-B;
  if(pw<70||ph<60)throw Error('当前尺寸放不下坐标轴和图例，请增大尺寸、减小字号或调整图例位置');
  const px=x=>L+(x-x0)/(x1-x0)*pw,py=y=>T+ph-(log?(Math.log10(y)-Math.log10(y0))/(Math.log10(y1)-Math.log10(y0)):(y-y0)/(y1-y0))*ph;
  const lw=Math.max(.5,Math.min(5,Number(c.lineWidth)||2)),parts=[];
  const line=(x1,y1,x2,y2,attrs='')=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${attrs}/>`;
  const text=(x,y,t,attrs='')=>`<text x="${x}" y="${y}" ${attrs}>${esc(t)}</text>`;
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="none"><rect width="${W}" height="${H}" fill="white"/><g font-family="Arial, Helvetica, sans-serif" font-size="${font}" fill="#283641">`);
  if(c.title)parts.push(text(W/2,26*fs,c.title,`data-chart-part="style" text-anchor="middle" font-weight="600" font-size="${17*fs}"`));
  if(c.panelLabel)parts.push(text(12*fs,24*fs,c.panelLabel,'font-weight="700"'));
  parts.push('<g data-chart-part="axes" data-chart-axis="y">');
  for(const y of ticks(y0,y1,log,c.yTick)){const p=py(y);if(c.grid!==false)parts.push(line(L,p,W-R,p,'stroke="#e4e9ed" pointer-events="none"'));parts.push(line(L-5,p,L,p,'stroke="#586570"'),text(L-10,p+font*.33,format(y),'text-anchor="end"'));}
  parts.push(line(L,T,L,T+ph,'stroke="#586570"'),text(0,0,c.yLabel||'Value',`transform="translate(${20*fs} ${T+ph/2}) rotate(-90)" text-anchor="middle"`),'</g><g data-chart-part="axes" data-chart-axis="x">');
  const xt=bar?xs.map((_,i)=>i).filter(i=>i%Math.ceil(xs.length/10)===0):ticks(x0,x1,false,c.xTick);
  for(const x of xt){const p=px(x);if(p<L||p>W-R)continue;parts.push(line(p,T+ph,p,T+ph+5,'stroke="#586570"'),text(p,T+ph+font+9,bar?String(xs[x]).slice(0,20):format(x),'text-anchor="middle"'));}
  parts.push(line(L,T+ph,W-R,T+ph,'stroke="#586570"'),text(L+pw/2,T+ph+font+33*fs,c.xLabel||table.headers[c.x],'text-anchor="middle"'),'</g>');
  parts.push(`<svg x="${L}" y="${T}" width="${pw}" height="${ph}" viewBox="${L} ${T} ${pw} ${ph}" overflow="hidden">`);
  sets.forEach((s,k)=>{const points=s.points.map((p,i)=>({x:px(bar?i:xs[i]),...p})),width=Math.max(.5,Math.min(5,Number(s.lineWidth)||lw)),pattern=dash(s.lineStyle||(c.dashed?'dashed':'solid')),shape=s.marker||(type==='scatter'||c.markers!==false?'circle':'none'),size=Math.max(2,Math.min(8,Number(s.markerSize)||3.5));
   parts.push(`<g data-chart-part="series" data-chart-series="${k}">`);
   if(type==='line')parts.push(`<polyline points="${points.map(p=>`${p.x},${py(p.y)}`).join(' ')}" fill="none" stroke="${s.color}" stroke-width="${width}" ${pattern?`stroke-dasharray="${pattern}"`:''}/>`);
   points.forEach((p,i)=>{const y=py(p.y),width=pw/(x1-x0)*.74/sets.length,cx=bar?p.x+(k-(sets.length-1)/2)*width:p.x;if(bar)parts.push(`<rect x="${cx-width*.44}" y="${Math.min(y,py(0))}" width="${width*.88}" height="${Math.abs(y-py(0))}" fill="${s.color}"/>`);else parts.push(marker(shape,cx,y,size,s.color));
    if(p.error){const a=py(p.y-p.error),b=py(p.y+p.error),attr=`stroke="${bar?'#283641':s.color}" stroke-width="1.4"`;parts.push(line(cx,a,cx,b,attr),line(cx-4,a,cx+4,a,attr),line(cx-4,b,cx+4,b,attr));}
   });parts.push('</g>');
  });parts.push('</svg>');
  if(legend){const lf=pub?font:Math.min(font,14),rowHeight=lf+9*fs,cols=position==='bottom'?legendCols:1,cell=position==='bottom'?pw/cols:142*fs,originX=position==='right'?W-R+15*fs:position==='inside'?W-R-151*fs:L,originY=position==='bottom'?H-(legendRows-1)*rowHeight-16*fs:position==='inside'?T+20*fs:T+14*fs;
   parts.push('<g data-chart-part="style" data-chart-legend="true">');
   if(position==='inside')parts.push(`<rect x="${originX-8}" y="${originY-15*fs}" width="${151*fs}" height="${sets.length*rowHeight+8}" rx="4" fill="white" fill-opacity="0.92" stroke="#e4e9ed"/>`);
   sets.forEach((s,k)=>{const x=originX+(k%cols)*cell,y=originY+Math.floor(k/cols)*rowHeight,max=Math.floor((cell-32)/(lf*.58)),label=s.name.length>max?s.name.slice(0,Math.max(1,max-1))+'…':s.name,pattern=dash(s.lineStyle||(c.dashed?'dashed':'solid'));
    parts.push(`<g data-chart-series="${k}"><title>${esc(s.name)}</title>`);
    if(bar)parts.push(`<rect x="${x}" y="${y-10}" width="18" height="10" fill="${s.color}"/>`);
    else{if(type==='line')parts.push(line(x,y-4,x+20,y-4,`stroke="${s.color}" stroke-width="${Number(s.lineWidth)||lw}" ${pattern?`stroke-dasharray="${pattern}"`:''}`));parts.push(marker(s.marker||(type==='scatter'||c.markers!==false?'circle':'none'),x+10,y-4,3,s.color));}
    parts.push(text(x+27,y,label,`font-size="${lf}"`),'</g>');});parts.push('</g>');}
  parts.push('</g></svg>');return{markup:parts.join(''),w:W,h:H,table,range:{x0,x1,y0,y1},insets:{L,R,T,B}};
 }
 function replaceMarkup(previous,markup){const container=document.createElementNS('http://www.w3.org/2000/svg','g'),fresh=container.cloneNode();container.innerHTML=previous;fresh.innerHTML=markup;const original=container.querySelector('svg'),replacement=fresh.firstElementChild;if(!original)return markup;for(const attr of ['width','height','x','y','transform'])if(original.hasAttribute(attr))replacement.setAttribute(attr,original.getAttribute(attr));original.replaceWith(replacement);return container.innerHTML;}
 const styleKeys=['palette','font','lineWidth','legend','legendPosition','markers','dashed','grid'],seriesKeys=['color','lineWidth','lineStyle','marker','markerSize'];
 function saveStyle(c){return{...Object.fromEntries(styleKeys.filter(k=>c[k]!==undefined).map(k=>[k,c[k]])),series:c.series.map(s=>Object.fromEntries(seriesKeys.filter(k=>s[k]!==undefined).map(k=>[k,s[k]])))};}
 function applyStyle(c,style){for(const k of styleKeys)if(k in style)c[k]=style[k];if(!palettes[c.palette])c.palette='blue';c.series.forEach((s,i)=>{seriesKeys.forEach(k=>delete s[k]);s.color=palettes[c.palette][i%6];const source=style.series?.[i];if(source)for(const k of seriesKeys)if(k in source)s[k]=source[k];});return c;}
 function layout(configs,o){
  const count=configs.length,cols=Number(o.columns),width=Number(o.widthMm),height=Number(o.heightMm),gap=Number(o.gapMm),font=Number(o.fontPt);
  if(count<2||count>12||!Number.isInteger(cols)||cols<1||cols>count||!Number.isFinite(gap)||gap<0||gap>20)throw Error('选择 2–12 张图，列数不能超过图数，间距为 0–20 mm');
  const rows=Math.ceil(count/cols),w=(width-(cols-1)*gap)/cols,h=(height-(rows-1)*gap)/rows;
  if(width>(o.canvas?.widthMm||500)||height>(o.canvas?.heightMm||500))throw Error('排版总尺寸不能超过当前画板');
  const next=configs.map((c,i)=>({...JSON.parse(JSON.stringify(c)),layoutInsets:null,publication:true,widthMm:w,heightMm:h,fontPt:font,panelLabel:o.labels===false?'':`(${String.fromCharCode(97+i)})`}));
  if(o.sharedX){
   if(next.some(c=>c.type==='bar')&&!next.every(c=>c.type==='bar'))throw Error('分类轴与数值轴不能统一 X 范围');
   if(next.every(c=>c.type==='bar')){const categories=next.map(c=>parse(c.text).rows.map(r=>r[c.x]));if(categories.some(x=>JSON.stringify(x)!==JSON.stringify(categories[0])))throw Error('分类轴的标签与顺序须一致');}
  }
  if(o.sharedY&&new Set(next.map(c=>!!c.yLog)).size>1)throw Error('对数轴与线性轴不能统一 Y 范围');
  for(const axis of ['x','y'])if(o[axis==='x'?'sharedX':'sharedY']){
   if(axis==='x'&&next.every(c=>c.type==='bar'))continue;
   const ranges=next.map(c=>render({...c,[axis+'Min']:'',[axis+'Max']:''}).range),lo=Math.min(...ranges.map(r=>r[axis+'0'])),hi=Math.max(...ranges.map(r=>r[axis+'1']));
   next.forEach(c=>{c[axis+'Min']=lo;c[axis+'Max']=hi;c[axis+'Tick']='';});
  }
  const margins=next.map(c=>render(c).insets),common=Object.fromEntries(['L','R','T','B'].map(key=>[key,Math.max(...margins.map(m=>m[key]))]));next.forEach(c=>c.layoutInsets=common);
  return next.map((config,i)=>({config,result:render(config),x:(i%cols)*(w+gap)*unitsPerMm,y:Math.floor(i/cols)*(h+gap)*unitsPerMm}));
 }
 return{parse,toCSV,publication,layout,unitsPerMm,render,ticks,replaceMarkup,saveStyle,applyStyle,palettes,escape:esc};
});
