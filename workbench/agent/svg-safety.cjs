const {DOMParser,XMLSerializer}=require('@xmldom/xmldom');
const tags=new Set('svg g defs marker linearGradient radialGradient stop clipPath mask path rect circle ellipse line polygon polyline text tspan title desc image'.split(' '));
const attrs=new Set('xmlns xmlns:xlink version id class viewBox width height x y x1 x2 y1 y2 cx cy r rx ry d points transform fill fill-opacity fill-rule stroke stroke-width stroke-opacity stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit opacity font-family font-size font-weight font-style text-anchor dominant-baseline alignment-baseline letter-spacing marker-start marker-mid marker-end markerWidth markerHeight markerUnits refX refY orient preserveAspectRatio href xlink:href offset stop-color stop-opacity gradientUnits gradientTransform spreadMethod clip-path clipPathUnits mask maskUnits maskContentUnits style aria-label role'.split(' '));
const styleProps=new Set('fill stroke fill-opacity stroke-opacity opacity stroke-width stroke-dasharray stroke-linejoin stroke-linecap font-size font-family font-weight font-style text-anchor pointer-events'.split(' '));
function parse(text){
 if(typeof text!=='string'||text.length>16000000||/<!DOCTYPE|<!ENTITY|<\?/i.test(text))throw Error('SVG 内容无效');
 let bad=false;const doc=new DOMParser({errorHandler:{warning:()=>bad=true,error:()=>bad=true,fatalError:()=>bad=true}}).parseFromString(text,'image/svg+xml');
 if(bad||!doc.documentElement)throw Error('SVG XML 无法解析');
 function walk(e){
  if(e.nodeType!==1)return;
  if(!tags.has(e.tagName))throw Error('不支持的 SVG 元素：'+e.tagName);
  for(const a of Array.from(e.attributes)){
   if(!attrs.has(a.name)&&!/^data-[\w-]+$/.test(a.name))throw Error('不支持的 SVG 属性：'+a.name);
   const v=a.value;
   if(/[\\\u0000-\u0008]/.test(v)||/javascript:|@import|expression\s*\(/i.test(v))throw Error('SVG 包含主动内容');
   if(a.name==='href'||a.name==='xlink:href'){if(!/^#[\w-]+$/.test(v)&&!(e.tagName==='image'&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=\s]+$/.test(v)))throw Error('SVG 不能引用外部资源');}
   if(/url\s*\(/i.test(v)&&!/^url\(#[\w-]+\)$/.test(v.trim()))throw Error('SVG 资源引用无效');
   if(a.name==='style')for(const entry of v.split(';').filter(x=>x.trim())){const colon=entry.indexOf(':');if(colon<0||!styleProps.has(entry.slice(0,colon).trim()))throw Error('SVG 样式不受支持');}
  }
  Array.from(e.childNodes).forEach(walk);
 }walk(doc.documentElement);return doc;
}
function validateMarkup(s,nodeId){const d=parse('<svg xmlns="http://www.w3.org/2000/svg">'+s+'</svg>');if(!Array.from(d.documentElement.childNodes).some(n=>n.nodeType===1))throw Error('图元内容为空');if(nodeId)for(const e of Array.from(d.getElementsByTagName('*'))){const id=e.getAttribute('id');if(id&&!id.startsWith(nodeId+'--'))throw Error('新增 SVG 资源 ID 必须以图元 ID 加 -- 为前缀，避免影响其他对象');}return s;}
module.exports={parse,validateMarkup,serialize:d=>new XMLSerializer().serializeToString(d)};
