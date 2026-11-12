import {parentPort,workerData} from 'node:worker_threads';
import {createRequire} from 'node:module';
import path from 'node:path';
import Export from './export.cjs';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
const require=createRequire(import.meta.url),pdfRoot=path.dirname(require.resolve('pdfjs-dist/package.json'));
let loading;
try{
 const svg=await Export.exportFigure({svg:workerData.svg,format:'svg'}),pdf=await Export.exportFigure({svg:workerData.svg,format:'pdf'});
 loading=getDocument({data:new Uint8Array(pdf.data),isEvalSupported:false,useSystemFonts:false,useWorkerFetch:false,verbosity:0,standardFontDataUrl:path.join(pdfRoot,'standard_fonts').replaceAll('\\','/')+'/'});
 const document=await loading.promise;if(document.numPages!==1)throw Error('导出 PDF 页数异常');
 const page=await document.getPage(1),physical=page.getViewport({scale:1}),viewport=page.getViewport({scale:Math.min(300/72,2400/Math.max(physical.width,physical.height))});
 const surface=document.canvasFactory.create(Math.ceil(viewport.width),Math.ceil(viewport.height));
 try{
  await page.render({canvasContext:surface.context,viewport}).promise;
  const content=await page.getTextContent(),text=content.items.map(item=>item.str||'').join(' ');
  parentPort.postMessage({svg:svg.data,pdf:pdf.data,png:surface.canvas.toBuffer('image/png'),report:{status:'verified',widthMm:physical.width*25.4/72,heightMm:physical.height*25.4/72,pages:document.numPages,text,checks:['SVG 已通过静态校验','PDF 已生成并重新栅格化'],limitations:['字体替换及视觉差异由评审结合 PDF 预览核对；栅格化成功不代表科学内容正确。']}});
 }finally{document.canvasFactory.destroy(surface);}
}catch(error){parentPort.postMessage({error:error.message||'导出复核失败'});}
finally{await loading?.destroy();}
