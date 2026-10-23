// Explicit live smoke test: uses the connection saved in the running local server.
// It creates a separate test scene and never adopts changes into the user's board.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import Patch from './patch-contract.js';
const base='http://127.0.0.1:4318';
const session=await(await fetch(base+'/api/session')).json();
console.log(JSON.stringify({ready:session.ready,model:session.model,hasKey:session.hasKey}));
if(!session.ready)throw Error('连接尚未保存完整，测试未发起');
const request=async(p,body)=>{const r=await fetch(base+p,{method:body?'POST':'GET',headers:{'Content-Type':'application/json','X-Workbench-Token':session.token},...(body?{body:JSON.stringify(body)}:{})});const data=await r.json();if(!r.ok)throw Error(data.error||'Request failed');return data;};
const models=await request('/api/models',{});console.log(JSON.stringify({modelCount:models.models.length,selectedModelListed:models.models.includes(session.model)}));
const nodes={
 'sample':{id:'sample',type:'component',parent:null,name:'连接测试模块',x:160,y:200,w:260,h:160,scale:1,locked:false},
 'sample-box':{id:'sample-box',type:'leaf',parent:'sample',kind:'rect',name:'模块外框',x:0,y:0,w:260,h:160,originX:0,originY:0,scale:1,locked:false,markup:'<rect width="260" height="160" rx="16" fill="#dfeaf0" stroke="#416f89" stroke-width="2"/>'},
 'sample-label':{id:'sample-label',type:'leaf',parent:'sample',kind:'text',name:'测试标签',x:50,y:60,w:160,h:40,originX:0,originY:0,scale:1,locked:false,markup:'<text x="0" y="30" font-family="Arial" font-size="28" fill="#23313c">Before</text>'},
 'preserved':{id:'preserved',type:'component',parent:null,name:'保持原样',x:660,y:200,w:260,h:160,scale:1,locked:true},
 'preserved-box':{id:'preserved-box',type:'leaf',parent:'preserved',kind:'rect',name:'未选模块',x:0,y:0,w:260,h:160,originX:0,originY:0,scale:1,locked:false,markup:'<rect width="260" height="160" rx="16" fill="#f7e8dc" stroke="#ce713a" stroke-width="2"/>'}
};
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="740" viewBox="0 0 1200 740"><rect width="1200" height="740" fill="white"/><g id="scene"><g data-id="sample" transform="translate(160 200)"><g data-id="sample-box"><g>${nodes['sample-box'].markup}</g></g><g data-id="sample-label" transform="translate(50 60)"><g>${nodes['sample-label'].markup}</g></g></g><g data-id="preserved" transform="translate(660 200)"><g data-id="preserved-box"><g>${nodes['preserved-box'].markup}</g></g></g></g></svg>`;
const task={schema:'paper-figure-workbench/0.4',paper:'Agent 连接测试 · 独立示意图',paperContent:'这是独立连接测试，不是论文图或科学结果。两个色块代表两个模块，右侧为锁定且未选对象。本轮只验证左侧标签编辑。',purpose:'验证真实 Agent 局部编辑闭环',scene:nodes,scope:[{id:'sample',name:'连接测试模块'}],allComments:[],comments:[],palette:0,canvas:{viewBox:[0,0,1200,740],widthMm:180,heightMm:111},currentSvg:svg,pendingSelectionNote:'这是一个极小范围连接测试。只将 sample-label 标签由 Before 改为 Connected（使用 textOverride 字段）。不移动、缩放、增删或重新设计任何图元，不改颜色，不运行四评委。无需读取其他文件或做空间探索。返回一项精确 update 操作即可。',reviewMode:'quick_local'};
task.baseRevision=createHash('sha256').update(Patch.revision({nodes,palette:0,comments:[]})).digest('hex');
let job=await request('/api/jobs',task);console.log(JSON.stringify({jobId:job.id,status:job.status}));
const report=path.resolve('agent/live-smoke-result.json');
let last='',started=Date.now();
while(['queued','running','validating'].includes(job.status)){
 if(Date.now()-started>240000){job=await request(`/api/jobs/${job.id}/cancel`,{});break;}
 await new Promise(r=>setTimeout(r,3000));job=await request(`/api/jobs/${job.id}`);
 if(job.message!==last){last=job.message;console.log(JSON.stringify({status:job.status,message:job.message}));}
}
const record={jobId:job.id,status:job.status,model:session.model,summary:job.summary,warnings:job.warnings,error:job.error,usage:job.usage,operations:job.operations};
if(job.status==='completed'){
 const next=Patch.apply({nodes,palette:0,comments:[]},task,{...job,baseRevision:task.baseRevision});
 record.labelChanged=next.nodes['sample-label'].textOverride==='Connected';
 record.otherNodesPreserved=Object.keys(nodes).filter(id=>id!=='sample-label').every(id=>Patch.stable(nodes[id])===Patch.stable(next.nodes[id]));
 const r=await fetch(base+`/api/jobs/${job.id}/after.png`,{headers:{'X-Workbench-Token':session.token}});record.previewAvailable=r.ok;
}
await fs.writeFile(report,JSON.stringify(record,null,2));console.log(JSON.stringify(record));
if(record.status!=='completed'||!record.labelChanged||!record.otherNodesPreserved||!record.previewAvailable)process.exitCode=1;
