(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.FigureStorage=api;})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 const dataPattern=/data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+/g;
 const refPattern=/figure-asset:([a-f0-9]{64})/g;
 async function pack(workspace){
  const assets={},ids=new Map(),json=JSON.stringify(workspace);
  for(const match of json.matchAll(dataPattern))if(!ids.has(match[0])){
   const url=match[0],hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(url));
   const id=Array.from(new Uint8Array(hash),v=>v.toString(16).padStart(2,'0')).join('');ids.set(url,id);assets[id]=url;
  }
  return{format:'figure-studio-project',version:1,workspace:JSON.parse(json.replace(dataPattern,url=>'figure-asset:'+ids.get(url))),assets};
 }
 function unpack(project){
  if(project?.format!=='figure-studio-project'||project.version!==1||!project.assets||typeof project.assets!=='object'||Array.isArray(project.assets))throw Error('不是受支持的项目备份');
  return JSON.parse(JSON.stringify(project.workspace).replace(refPattern,(_all,id)=>{
   const data=project.assets[id];if(typeof data!=='string'||!/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(data))throw Error('项目缺少图片资源：'+id);
   return data;
  }));
 }
 const request=req=>new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
 const complete=tx=>{const done=new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error||Error('项目保存已中止'));tx.onerror=()=>{};});done.catch(()=>{});return done;};
 function create({indexedDB=globalThis.indexedDB,name='figure-studio-projects',onStatus=()=>{},delay=180}={}){
  let db,revision=0,pending=null,writing=null,timer,lastError=null,blocked=false,recovered=false;
  async function open(){
   if(db)return db;if(!indexedDB)throw Error('此环境不支持项目存储，请下载备份');
   const req=indexedDB.open(name,1);req.onupgradeneeded=()=>{req.result.createObjectStore('workspace');req.result.createObjectStore('assets');};
   db=await request(req);db.onversionchange=()=>{blocked=true;db.close();onStatus('error',Error('项目存储已更新，请下载备份后刷新'));};return db;
  }
  async function readRecord(key){
   const tx=db.transaction(['workspace','assets'],'readonly'),done=complete(tx),record=await request(tx.objectStore('workspace').get(key));
   if(!record){await done;return null;}
   const assets={};await Promise.all((record.assetIds||[]).map(async id=>{assets[id]=await request(tx.objectStore('assets').get(id));}));await done;
   return{record,value:unpack({...record.project,assets})};
  }
  async function load(legacy,validate){
   await open();let currentError;
   try{const current=await readRecord('current');if(current){revision=current.record.revision;return{workspace:validate(current.value)};}}
   catch(e){currentError=e;}
   if(currentError){
    try{const backup=await readRecord('previous');if(backup){const value=validate(backup.value);const tx=db.transaction('workspace','readonly');const current=await request(tx.objectStore('workspace').get('current'));revision=current?.revision||backup.record.revision;recovered=true;return{workspace:value,recovered:true};}}
    catch{}
    blocked=true;throw Error('项目和恢复副本无法读取；原数据已保留，请导入项目备份');
   }
   legacy=typeof legacy==='function'?legacy():legacy;
   const workspace=validate(legacy);if(legacy){pending=workspace;try{await flush();}catch(e){return{workspace,migrationError:e.message};}}return{workspace,migrated:!!legacy};
  }
  async function write(value){
   if(blocked)throw Error('原项目不可读，已停止自动覆盖；请下载备份');
   const project=await pack(value),assetIds=Object.keys(project.assets),tx=db.transaction(['workspace','assets'],'readwrite'),done=complete(tx);
   let conflict;
   const store=tx.objectStore('workspace'),req=store.get('current');
   req.onsuccess=()=>{
    const current=req.result;
    if((current?.revision||0)!==revision){conflict=Error('另一窗口已保存此项目；请先下载当前项目备份，再刷新合并');tx.abort();return;}
    if(current&&!recovered)store.put(current,'previous');
    for(const id of assetIds)tx.objectStore('assets').put(project.assets[id],id);
    store.put({revision:revision+1,project:{...project,assets:undefined},assetIds,savedAt:new Date().toISOString()},'current');
    // Keep assets for both committed generations; reclaim older orphaned images.
    const previous=store.get('previous');previous.onsuccess=()=>{
     const archive=store.get('unreadable');archive.onsuccess=()=>{
      const retained=new Set([...assetIds,...(previous.result?.assetIds||[]),...(archive.result?.assetIds||[])]),cursor=tx.objectStore('assets').openKeyCursor();
      cursor.onsuccess=()=>{const c=cursor.result;if(c){if(!retained.has(c.key))tx.objectStore('assets').delete(c.key);c.continue();}};
     };
    };
   };
   try{await done;}catch(e){throw conflict||e;}revision++;recovered=false;
  }
  function save(value){pending=value;lastError=null;onStatus('pending');clearTimeout(timer);timer=setTimeout(()=>flush().catch(()=>{}),delay);}
  async function flush(){
   clearTimeout(timer);if(writing)return writing;
   writing=(async()=>{
    while(pending){const value=pending;pending=null;try{await write(value);}catch(e){pending=pending||value;lastError=e;onStatus('error',e);throw e;}}
    lastError=null;onStatus('saved');
   })();
   try{await writing;}finally{writing=null;}
  }
  async function recover(value){
   await open();const tx=db.transaction('workspace','readwrite'),done=complete(tx),store=tx.objectStore('workspace'),req=store.get('current');
   req.onsuccess=()=>{if(req.result){store.put(req.result,'unreadable');revision=req.result.revision||0;}};await done;
   blocked=false;recovered=true;pending=value;await flush();
  }
  return{load,save,flush,recover,isPending:()=>!!(pending||writing),error:()=>lastError,close:()=>{clearTimeout(timer);db?.close();}};
 }
 let taskDatabase;
 async function activeTask(action,value){
  if(!taskDatabase){const req=indexedDB.open('figure-studio-tasks',1);req.onupgradeneeded=()=>req.result.createObjectStore('session');taskDatabase=request(req).catch(e=>{taskDatabase=null;throw e;});}
  const db=await taskDatabase,tx=db.transaction('session',action==='read'?'readonly':'readwrite'),done=complete(tx),store=tx.objectStore('session');
  const result=await request(action==='read'?store.get('active'):action==='clear'?store.delete('active'):store.put(value,'active'));await done;return result;
 }
 return{pack,unpack,create,activeTask};
});
