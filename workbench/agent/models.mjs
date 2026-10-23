export function normalizeBaseUrl(value){
 let u;try{u=new URL(value);}catch{throw Error('请填写有效的 API 地址');}
 if(!['https:','http:'].includes(u.protocol)||u.username||u.password||u.search||u.hash||u.protocol==='http:'&&!['localhost','127.0.0.1','[::1]'].includes(u.hostname))throw Error('API 地址需使用 HTTPS（本机地址可用 HTTP）');
 return u.href.replace(/\/+$/,'');
}
export function resolveConnection(input,saved){
 const baseUrl=normalizeBaseUrl(input.baseUrl||saved.baseUrl),typedKey=typeof input.apiKey==='string'?input.apiKey.trim():'';
 if(!typedKey&&baseUrl!==normalizeBaseUrl(saved.baseUrl))throw Error('API 地址已改变，请重新填写该服务的 Key');
 const apiKey=typedKey||saved.apiKey;if(!apiKey)throw Error('请先填写 API Key，再获取模型列表');
 return{baseUrl,apiKey};
}
export async function listModels(connection,{timeoutMs=15000}={}){
 let res;
 try{res=await fetch(connection.baseUrl+'/models',{headers:{Authorization:'Bearer '+connection.apiKey,Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(timeoutMs)});}catch(e){throw Error(e.name==='TimeoutError'?'获取模型超时，请重试':'无法连接模型列表接口，请检查 API 地址和网络（不跟随重定向）');}
 if(!res.ok){await res.body?.cancel();const reason={401:'Key 无效或已过期',403:'当前 Key 无权读取模型列表',404:'此服务未提供 /models 接口，可手动填写模型',429:'请求过于频繁或服务额度受限'}[res.status]||'模型服务返回错误';throw Error(`${reason}（HTTP ${res.status}）`);}
 let bytes=0,chunks=[];
 try{for await(const chunk of res.body){bytes+=chunk.length;if(bytes>2000000)throw Error('模型列表响应过大');chunks.push(chunk);}}catch(e){if(bytes>2000000)throw e;throw Error('读取模型列表超时或连接中断，请重试');}
 let payload;try{payload=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw Error('模型列表不是有效的 JSON，可手动填写模型');}
 if(!Array.isArray(payload.data))throw Error('模型列表格式不兼容：需要 data 数组，可手动填写模型');
 const models=[...new Set(payload.data.map(m=>m?.id).filter(id=>typeof id==='string'&&id.trim()&&id.length<=150))].sort((a,b)=>a.localeCompare(b));
 return{models,baseUrl:connection.baseUrl};
}
