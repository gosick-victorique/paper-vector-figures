import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

// Keep large binary data outside model text. Identifiers refer only to images
// already supplied in this task, and are restored before patch validation.
export function compactTask(task){
 const assets=new Map(),source={...task};delete source.currentSvg;
 const json=JSON.stringify(source).replace(/data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+/g,(url,type)=>{
  const id=createHash('sha256').update(url).digest('hex');assets.set(id,{url,file:`assets/${id}.${type==='jpeg'?'jpg':type}`});return'figure-image:'+id;
 });
 const context=JSON.parse(json);
 if(assets.size)context.imageAssets=Array.from(assets,([id,asset])=>({id:'figure-image:'+id,file:asset.file}));
 return{context,assets};
}
export async function writeTaskAssets(task,dir){
 const prepared=compactTask(task);if(prepared.assets.size)await fs.mkdir(path.join(dir,'assets'),{recursive:true});
 for(const asset of prepared.assets.values())await fs.writeFile(path.join(dir,asset.file),Buffer.from(asset.url.slice(asset.url.indexOf(',')+1),'base64'));
 await fs.writeFile(path.join(dir,'input.json'),JSON.stringify(prepared.context));return prepared.assets;
}
export function restoreTaskAssets(result,assets){
 if(!Array.isArray(result?.operations))return result;
 return{...result,operations:result.operations.map(operation=>({...operation,payload:typeof operation.payload==='string'?operation.payload.replace(/figure-image:([a-f0-9]{64})/g,(_all,id)=>{
  const asset=assets.get(id);if(!asset)throw Error('Agent 引用了任务中不存在的图片');return asset.url;
 }):operation.payload}))};
}
