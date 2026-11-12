const fs=require('node:fs');
const path=require('node:path');
const sharp=require('sharp');
const PDFDocument=require('pdfkit');
const SVGtoPDF=require('svg-to-pdfkit');
const Safety=require('./svg-safety.cjs');

function dimension(value,fallback){
 const match=String(value).match(/^([\d.]+)mm$/);const n=match?Number(match[1]):fallback;
 if(!Number.isFinite(n)||n<1||n>1000)throw Error('导出尺寸无效');return n;
}
function fontFile(family,bold,italic,cjk){
 const windows=path.join(process.env.SystemRoot||'C:/Windows','Fonts');
 if(cjk){
  const candidates=[[path.join(windows,bold?'msyhbd.ttc':'msyh.ttc'),bold?'MicrosoftYaHei-Bold':'MicrosoftYaHei'],['/System/Library/Fonts/PingFang.ttc','PingFangSC-Regular'],['/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc','NotoSansCJKsc-Regular']];
  const found=candidates.find(([file])=>fs.existsSync(file));if(!found)throw Error('PDF 导出需要中文字体，请安装 Noto Sans CJK 或改用 SVG 导出');return found;
 }
 const serif=/Times|serif/i.test(family)&&!/sans-serif/i.test(family),mono=/Courier|mono/i.test(family),prefix=mono?'cour':serif?'times':'arial';
 const suffix=bold?(italic?'bi':'bd'):(italic?'i':'');
 const file=path.join(windows,prefix+suffix+'.ttf');
 if(fs.existsSync(file))return[file];
 return[mono?(bold?'Courier-Bold':'Courier'):serif?(bold?'Times-Bold':'Times-Roman'):(bold?'Helvetica-Bold':'Helvetica')];
}
async function exportFigure({svg,format,dpi=300}){
 if(!['svg','png','pdf'].includes(format))throw Error('不支持的导出格式');
 const doc=Safety.parse(svg),root=doc.documentElement;if(root.tagName!=='svg')throw Error('需要完整 SVG 画板');
 const vb=(root.getAttribute('viewBox')||'').trim().split(/[ ,]+/).map(Number);
 if(vb.length!==4||!vb.every(Number.isFinite)||vb[2]<=0||vb[3]<=0)throw Error('画板 viewBox 无效');
 const widthMm=dimension(root.getAttribute('width'),180),heightMm=dimension(root.getAttribute('height'),widthMm*vb[3]/vb[2]);
 if(format==='svg')return{type:'image/svg+xml',data:Buffer.from(Safety.serialize(doc))};
 if(format==='png'){
  dpi=Number(dpi);if(!Number.isInteger(dpi)||dpi<72||dpi>1200)throw Error('分辨率须为 72–1200 DPI');
  const width=Math.round(widthMm*dpi/25.4),height=Math.round(heightMm*dpi/25.4);if(width*height>40000000)throw Error('导出图片过大，请降低分辨率');
  root.setAttribute('width',width);root.setAttribute('height',height);
  return{type:'image/png',data:await sharp(Buffer.from(Safety.serialize(doc)),{limitInputPixels:40000000}).png().withMetadata({density:dpi}).toBuffer()};
 }
 // PDFKit accepts PNG/JPEG. Convert embedded WebP without changing vector content.
 for(const element of Array.from(doc.getElementsByTagName('image'))){
  const attribute=element.hasAttribute('href')?'href':'xlink:href',url=element.getAttribute(attribute);
  if(url?.startsWith('data:image/webp;base64,')){const pixels=await sharp(Buffer.from(url.split(',')[1],'base64'),{limitInputPixels:40000000}).png().toBuffer();element.setAttribute(attribute,'data:image/png;base64,'+pixels.toString('base64'));}
 }
 for(const element of [...Array.from(doc.getElementsByTagName('text')),...Array.from(doc.getElementsByTagName('tspan'))]){
  if(/[^\u0000-\u024f\u0370-\u03ff\u2000-\u206f]/.test(element.textContent))element.setAttribute('font-family','Figure CJK');
 }
 const width=widthMm*72/25.4,height=heightMm*72/25.4,pdf=new PDFDocument({size:[width,height],margin:0,compress:true});
 const chunks=[];const finished=new Promise((resolve,reject)=>{pdf.on('data',chunk=>chunks.push(chunk));pdf.on('end',()=>resolve(Buffer.concat(chunks)));pdf.on('error',reject);});
 root.setAttribute('width',width);root.setAttribute('height',height);
 const warnings=[],registeredFonts=new Set();
 try{
  SVGtoPDF(pdf,Safety.serialize(doc),0,0,{width,height,assumePt:true,
   fontCallback(family,bold,italic,options){const [file,collection]=fontFile(family,bold,italic,/Figure CJK/.test(family));const name=[file,collection,bold,italic].join('|');if(!registeredFonts.has(name)){pdf.registerFont(name,file,collection);registeredFonts.add(name);}if(/Figure CJK/.test(family)&&italic)options.fauxItalic=true;return name;},
   warningCallback:message=>warnings.push(message),imageCallback:url=>{if(!/^data:image\/(png|jpeg);base64,/.test(url))throw Error('PDF 图片格式不受支持');return url;}
  });
  if(warnings.length)throw Error('PDF 转换未能完整保留图稿，请导出 SVG：'+warnings[0]);
  pdf.end();return{type:'application/pdf',data:await finished};
 }catch(error){pdf.destroy(error);await finished.catch(()=>{});throw error;}
}
module.exports={exportFigure};
