const {DOMParser,XMLSerializer}=require('@xmldom/xmldom');
const Safety=require('./svg-safety.cjs');
const sharp=require('sharp');
const properties=new Set('fill stroke fill-opacity stroke-opacity opacity stroke-width stroke-dasharray stroke-dashoffset stroke-linejoin stroke-linecap stroke-miterlimit fill-rule font-size font-family font-weight font-style text-anchor dominant-baseline letter-spacing clip-path mask marker-start marker-mid marker-end stop-color stop-opacity'.split(' '));
function declarations(text){return text.split(';').filter(v=>v.trim()).map(part=>{const colon=part.indexOf(':');const key=part.slice(0,colon).trim(),value=part.slice(colon+1).trim();if(colon<0||!properties.has(key)||!value||/!important|[{}@]/.test(value))throw Error('SVG 含不支持的样式，请导出为使用内联属性的 SVG');return[key,value];});}
function normalizeSvg(text){
 text=text.replace(/^\uFEFF/,'').replace(/^\s*<\?xml[^?]*\?>/,'');
 if(/<!DOCTYPE|<!ENTITY|<\?/i.test(text))throw Error('SVG 不支持文档实体或外部指令');
 let bad=false;const doc=new DOMParser({errorHandler:{warning:()=>bad=true,error:()=>bad=true,fatalError:()=>bad=true}}).parseFromString(text,'image/svg+xml'),root=doc.documentElement;
 if(bad||root?.localName!=='svg')throw Error('不是有效的 SVG 文件');
 const elements=Array.from(doc.getElementsByTagName('*'));if(elements.length>6000)throw Error('SVG 元素过多，请简化后导入');
 const rules=[];let order=0;
 for(const style of elements.filter(e=>e.tagName==='style')){
  const css=style.textContent.replace(/\/\*[\s\S]*?\*\//g,'');let consumed='';const regex=/([^{}]+)\{([^{}]*)\}/g;let match;
  while((match=regex.exec(css))){consumed+=match[0];for(const selector of match[1].split(',').map(v=>v.trim())){if(!/^(?:[.#][\w-]+|[a-zA-Z]+)$/.test(selector))throw Error('SVG 样式选择器过于复杂，请导出为内联样式');rules.push({selector,values:declarations(match[2]),rank:selector[0]==='#'?100:selector[0]==='.'?10:1,order:order++});}}
  if(consumed.replace(/\s/g,'')!==css.replace(/\s/g,''))throw Error('SVG 样式表不受支持');style.parentNode.removeChild(style);
 }
 rules.sort((a,b)=>a.rank-b.rank||a.order-b.order);
 for(const e of elements){if(e.tagName==='style')continue;
  if(['metadata','namedview'].includes(e.localName)){e.parentNode?.removeChild(e);continue;}
  for(const a of Array.from(e.attributes))if(/^(?:inkscape:|sodipodi:|xmlns:(?:inkscape|sodipodi|rdf|dc|cc))/.test(a.name))e.removeAttribute(a.name);
  const matches=rules.filter(r=>r.selector[0]==='.'?(e.getAttribute('class')||'').split(/\s+/).includes(r.selector.slice(1)):r.selector[0]==='#'?e.getAttribute('id')===r.selector.slice(1):e.tagName===r.selector);
  const inline=e.hasAttribute('style')?declarations(e.getAttribute('style')):[];
  for(const [key,value] of [...matches.flatMap(r=>r.values),...inline])e.setAttribute(key,value);e.removeAttribute('style');
 }
 let box=(root.getAttribute('viewBox')||'').trim().split(/[\s,]+/).map(Number);
 const length=value=>{const m=String(value).match(/^([\d.]+)(px|pt|mm|cm|in)?$/);return m?Number(m[1])*({px:1,pt:96/72,mm:96/25.4,cm:96/2.54,in:96}[m[2]]||1):NaN;};
 if(box.length!==4)box=[0,0,length(root.getAttribute('width')),length(root.getAttribute('height'))];
 if(!box.every(Number.isFinite)||box[2]<=0||box[3]<=0||box.some(v=>Math.abs(v)>100000))throw Error('SVG 缺少有效的 viewBox 或宽高');
 root.setAttribute('viewBox',box.join(' '));root.setAttribute('width',box[2]);root.setAttribute('height',box[3]);root.setAttribute('xmlns','http://www.w3.org/2000/svg');
 const serialized=new XMLSerializer().serializeToString(root);Safety.parse(serialized);
 return{kind:'svg',svg:serialized,width:box[2],height:box[3],viewBox:box};
}
async function importMedia(input){
 if(typeof input.data!=='string'||input.data.length>14500000||!input.data.length||!/^[A-Za-z0-9+/]*={0,2}$/.test(input.data))throw Error('文件数据无效或超过 10 MB');
 const buffer=Buffer.from(input.data,'base64');if(buffer.length>10*1024*1024)throw Error('文件超过 10 MB');
 if(input.type==='image/svg+xml'||/\.svg$/i.test(input.name||''))return normalizeSvg(buffer.toString('utf8'));
 const image=sharp(buffer,{limitInputPixels:40000000}),meta=await image.metadata();
 if(!['png','jpeg','webp'].includes(meta.format))throw Error('支持 PNG、JPEG、WebP 和 SVG');
 if(meta.pages>1)throw Error('请先将动画转换为静态图片');
 if(!meta.orientation&&meta.width<=2048&&meta.height<=2048&&buffer.length<=2*1024*1024)return{kind:'image',width:meta.width,height:meta.height,url:'data:image/'+meta.format+';base64,'+buffer.toString('base64'),resized:false};
 const {data,info}=await image.rotate().resize({width:2048,height:2048,fit:'inside',withoutEnlargement:true}).webp({quality:92}).toBuffer({resolveWithObject:true});
 return{kind:'image',width:info.width,height:info.height,url:'data:image/webp;base64,'+data.toString('base64'),resized:meta.width>2048||meta.height>2048};
}
module.exports={importMedia,normalizeSvg};
