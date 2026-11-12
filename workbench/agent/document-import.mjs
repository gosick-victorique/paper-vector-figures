import {Worker} from 'node:worker_threads';

export async function importDocument(input,{signal,timeoutMs=30000}={}){
 if(typeof input.data!=='string'||input.data.length>35000000||!input.data.length||!/^[A-Za-z0-9+/]*={0,2}$/.test(input.data))throw Error('文档数据无效，PDF 最大 25 MB');
 const bytes=Buffer.from(input.data,'base64');if(bytes.length>25*1024*1024||bytes.subarray(0,1024).indexOf('%PDF-')<0)throw Error('不是有效的 PDF 文件，最大 25 MB');
 const from=input.from==null?1:Number(input.from),to=input.to==null?null:Number(input.to);
 if(!Number.isInteger(from)||from<1||to!==null&&(!Number.isInteger(to)||to<from||to-from>=100))throw Error('页码范围无效，一次最多提取 100 页');
 signal?.throwIfAborted();
 return new Promise((resolve,reject)=>{
  const worker=new Worker(new URL('./document-worker.mjs',import.meta.url),{workerData:{bytes:new Uint8Array(bytes),from,to},resourceLimits:{maxOldGenerationSizeMb:256}});
  let settled=false;
  const finish=(error,result)=>{if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);void worker.terminate();error?reject(error):resolve(result);};
  const abort=()=>finish(Error('文档导入已取消')),timer=setTimeout(()=>finish(Error('PDF 解析超时，请缩小页码范围或简化文件')),timeoutMs);
  signal?.addEventListener('abort',abort,{once:true});
  worker.once('message',message=>finish(message.error?Error(message.error):null,message.result));
  worker.once('error',()=>finish(Error('PDF 解析失败，请检查文件或缩小页码范围')));
  worker.once('exit',code=>{if(!settled)finish(Error('PDF 解析进程已退出（'+code+'）'));});
 });
}
