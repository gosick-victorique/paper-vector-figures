/* MathJax 3.2.2 is bundled locally; SVG output contains its own glyph paths. */
window.FigureEquation=(()=>{
 let loading;
 function source(value){let s=String(value||'').trim();if(s.startsWith('$$')&&s.endsWith('$$'))s=s.slice(2,-2);else if(s.startsWith('$')&&s.endsWith('$'))s=s.slice(1,-1);else if((s.startsWith('\\[')&&s.endsWith('\\]'))||(s.startsWith('\\(')&&s.endsWith('\\)')))s=s.slice(2,-2);if(!s.trim())throw Error('请输入公式');if(s.length>6000)throw Error('公式最长 6000 字符');return s.trim();}
 function load(){if(loading)return loading;loading=new Promise((resolve,reject)=>{
  window.MathJax={startup:{typeset:false},tex:{packages:['base','ams','newcommand'],maxBuffer:12000,maxMacros:1000,formatError:(_jax,error)=>{throw error;}},svg:{fontCache:'none'},options:{enableMenu:false}};
  const script=document.createElement('script');script.src='vendor/mathjax/tex-svg.js';script.onload=()=>window.MathJax.startup.promise.then(resolve,reject);script.onerror=()=>{loading=null;script.remove();reject(Error('公式引擎加载失败，请刷新重试'));};document.head.append(script);
 });return loading;}
 async function render(config){
  const tex=source(config.source),fontPt=Number(config.fontPt),color=config.color;
  if(!Number.isFinite(fontPt)||fontPt<4||fontPt>72)throw Error('字号为 4–72 pt');if(!/^#[\da-f]{6}$/i.test(color))throw Error('请选择颜色');
  await load();const container=await MathJax.tex2svgPromise(tex,{display:config.display!==false});
  if(container.querySelector('[data-mml-node="merror"]'))throw Error('公式语法有误');const original=container.querySelector('svg');if(!original)throw Error('公式无法渲染');
  const svg=original.cloneNode(true),vb=svg.getAttribute('viewBox').split(/\s+/).map(Number);if(vb.length!==4||!vb.every(Number.isFinite)||vb[2]<=0||vb[3]<=0)throw Error('公式没有可见内容');
  const size=fontPt*25.4/72*(1200/180),w=vb[2]/1000*size,h=vb[3]/1000*size;
  if(w>3333.334||h>3333.334)throw Error('公式超出画板，请减小字号或分行');
  const allowed=new Set(['svg','g','path','rect','line','polygon','polyline','circle','ellipse','text','tspan','title','desc']);
  for(const el of [svg,...svg.querySelectorAll('*')]){
   if(!allowed.has(el.localName)){el.remove();continue;}
   for(const attr of [...el.attributes]){
    if(/^on/i.test(attr.name)||['href','xlink:href','style','id','class','tabindex','role','focusable'].includes(attr.name)||/url\(/i.test(attr.value))el.removeAttribute(attr.name);
    else if(attr.value==='currentColor')el.setAttribute(attr.name,color);
   }
  }
  svg.removeAttribute('aria-hidden');svg.setAttribute('role','img');svg.setAttribute('xmlns','http://www.w3.org/2000/svg');svg.setAttribute('width',w);svg.setAttribute('height',h);svg.setAttribute('fill',color);svg.setAttribute('color',color);svg.setAttribute('aria-label',tex);svg.setAttribute('preserveAspectRatio','xMinYMin meet');
  return{markup:new XMLSerializer().serializeToString(svg),w,h};
 }
 return{render,source};
})();
