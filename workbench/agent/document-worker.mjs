import {parentPort,workerData} from 'node:worker_threads';
import {createRequire} from 'node:module';
import path from 'node:path';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';

const require=createRequire(import.meta.url),pdfRoot=path.dirname(require.resolve('pdfjs-dist/package.json'));
const loading=getDocument({data:workerData.bytes,isEvalSupported:false,useSystemFonts:false,disableFontFace:true,stopAtErrors:true,useWorkerFetch:false,verbosity:0,
 cMapUrl:path.join(pdfRoot,'cmaps').replaceAll('\\','/')+'/',cMapPacked:true,standardFontDataUrl:path.join(pdfRoot,'standard_fonts').replaceAll('\\','/')+'/'});
try{
 const pdf=await loading.promise,pageCount=pdf.numPages,from=workerData.from,to=workerData.to??Math.min(pageCount,from+99);
 if(from>pageCount||to>pageCount)throw Error('页码超过文档总页数：'+pageCount);
 let title='';try{title=String((await pdf.getMetadata()).info.Title||'');}catch{}
 const pages=[],emptyPages=[];let length=0;
 for(let number=from;number<=to;number++){
  const page=await pdf.getPage(number),content=await page.getTextContent();let text='',lastY=null;
  // Retain PDF content order and line breaks; multi-column PDFs need user review.
  for(const item of content.items){if(typeof item.str!=='string')continue;const y=item.transform?.[5];if(lastY!==null&&Math.abs(y-lastY)>Math.max(3,item.height*.6)&&text&&!text.endsWith('\n'))text+='\n';text+=item.str;if(item.hasEOL)text+='\n';else if(item.str&&!/\s$/.test(item.str))text+=' ';lastY=y;}
  text=text.replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();length+=text.length;if(length>1000000)throw Error('提取正文超过 100 万字符，请缩小页码范围');
  if(!text)emptyPages.push(number);pages.push({number,text});page.cleanup();
 }
 const warnings=[];
 if(emptyPages.length)warnings.push('第 '+emptyPages.join('、')+' 页没有可提取文字，扫描页或转曲文字需要先做 OCR。');
 if(from!==1||to!==pageCount)warnings.push(`本次仅提取第 ${from}–${to} 页，文档共 ${pageCount} 页。`);
 warnings.push('请检查双栏阅读顺序、公式和图注；导入只保存提取的正文，不保存原 PDF 或图片。');
 parentPort.postMessage({result:{title,pageCount,from,to,pages,text:pages.map(p=>`[第 ${p.number} 页]\n${p.text}`).join('\n\n'),hasText:pages.some(p=>p.text.trim()),warnings}});
}catch(error){parentPort.postMessage({error:error.name==='PasswordException'?'PDF 已加密，请先提供可读取的副本':error.message||'PDF 无法解析'});}
finally{await loading.destroy();}
