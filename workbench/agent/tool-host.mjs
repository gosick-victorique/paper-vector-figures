import http from 'node:http';
import {randomBytes} from 'node:crypto';
export async function hostDraftTools(draft,signal){
 const token=randomBytes(32).toString('hex');
 const server=http.createServer(async(req,res)=>{
  const send=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(value));};
  if(req.headers.host!==`127.0.0.1:${server.address().port}`||req.headers.authorization!==`Bearer ${token}`||req.headers.origin)return send(403,{error:'Forbidden'});
  if(req.method!=='POST'||req.url!=='/call')return send(404,{error:'Not found'});
  try{signal?.throwIfAborted();let bytes=0,parts=[];for await(const p of req){bytes+=p.length;if(bytes>2000000)throw Error('工具请求超过 2 MB');parts.push(p);}const {name,args}=JSON.parse(Buffer.concat(parts).toString());send(200,await draft.call(name,args));}catch(e){send(200,{isError:true,content:[{type:'text',text:JSON.stringify({error:e.message,revision:draft.revision})}]});}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 return{url:`http://127.0.0.1:${server.address().port}/call`,token,close:()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);})};
}
