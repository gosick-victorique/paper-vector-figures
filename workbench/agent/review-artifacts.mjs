import {Worker} from 'node:worker_threads';
import {createHash} from 'node:crypto';
export function verifyExport(svg,{signal,timeoutMs=45000}={}){
 signal?.throwIfAborted();
 return new Promise((resolve,reject)=>{
  const worker=new Worker(new URL('./export-review-worker.mjs',import.meta.url),{workerData:{svg}});let settled=false;
  const finish=(error,value)=>{if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);void worker.terminate();error?reject(error):resolve(value);};
  const abort=()=>finish(signal.reason||Error('导出复核已取消')),timer=setTimeout(()=>finish(Error('导出复核超时')),timeoutMs);
  signal?.addEventListener('abort',abort,{once:true});
  worker.once('message',value=>finish(value.error?Error(value.error):null,value));worker.once('error',error=>finish(error));worker.once('exit',()=>finish(Error('导出复核进程提前退出')));
 });
}
export async function createReviewArtifacts({source,canvas,view,runtime,signal}){
 const images=[],files=[];const [x,y,w,h]=canvas.viewBox;
 // A bounded, overlapping tile set gives every reviewer full coverage of dense figures.
 const dense=(view.measurement?.texts||[]).some(t=>(t.fontPt||100)*canvas.viewBox[2]/canvas.widthMm*25.4/72*1500/Math.max(w,h)<18)||(view.measurement?.leaves?.length||0)>20;
 if(dense)for(let row=0;row<2;row++)for(let col=0;col<2;col++){
  signal?.throwIfAborted();const region={x:x+col*w*.46,y:y+row*h*.46,w:w*.54,h:h*.54},render=await runtime.render(source,{region,maxEdge:2200});
  images.push({file:`detail-${row*2+col+1}.png`,label:`图稿局部 ${row*2+col+1}`,region,data:render.png});
 }
 let exportCheck;
 try{
  const verified=await verifyExport(source,{signal});exportCheck=verified.report;
  if(Math.abs(exportCheck.widthMm-canvas.widthMm)>.1||Math.abs(exportCheck.heightMm-canvas.heightMm)>.1)throw Error('导出 PDF 的物理尺寸与画板不符');
  images.push({file:'export-preview.png',label:'实际导出 PDF 的栅格预览',data:Buffer.from(verified.png)});files.push({file:'figure.svg',data:Buffer.from(verified.svg)},{file:'figure.pdf',data:Buffer.from(verified.pdf)});
 }catch(error){signal?.throwIfAborted();exportCheck={status:'failed',error:error.message,limitations:['导出复核未完成，不能视为可交付文件。']};}
 for(const file of [...images,...files])file.sha256=createHash('sha256').update(file.data).digest('hex');
 return{images,files,exportCheck};
}
