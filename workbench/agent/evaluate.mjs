import fs from 'node:fs/promises';
import path from 'node:path';
import {evaluationCases,evaluationTask,evaluateResult} from './evaluation-cases.mjs';
const args=process.argv.slice(2),value=(flag,fallback)=>args.includes(flag)?args[args.indexOf(flag)+1]:fallback,live=args.includes('--live');
const selected=value('--case','all'),cases=selected==='all'?evaluationCases:evaluationCases.filter(c=>c.id===selected);if(!cases.length)throw Error('未知评测案例');
const repeat=Number(value('--repeat','1'));if(!Number.isInteger(repeat)||repeat<1||repeat>5)throw Error('--repeat 须为 1–5');
const out=path.resolve(value('--out',path.join('evaluation-results',new Date().toISOString().replace(/[:.]/g,'-'))));await fs.mkdir(out,{recursive:true});
const report={schema:1,mode:live?'live':'prepared',createdAt:new Date().toISOString(),dataset:'synthetic-v1',graderVersion:2,results:[],limitations:['自动检查只验证明确的标签、数据、连线和约束。真实科学含义与视觉质量需要人工验收。','用量是服务返回的 token 记录，不是货币费用；服务或供应商中途失败可能缺少用量。']};
const save=()=>fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
if(!live){for(const item of cases){await fs.writeFile(path.join(out,item.id+'-task.json'),JSON.stringify(evaluationTask(item),null,2));report.results.push({case:item.id,name:item.name,status:'prepared',humanReview:{status:'pending',factualErrors:null,manualEdits:null,visualNotes:''}});}await save();console.log('评测任务已生成，未调用模型：'+out);}
else{
 const origin=new URL(value('--origin','http://127.0.0.1:4318'));if(origin.protocol!=='http:'||!['127.0.0.1','localhost'].includes(origin.hostname))throw Error('评测仅连接本机工作台服务');
 const session=await(await fetch(new URL('/api/session',origin))).json();if(!session.ready)throw Error('工作台尚未配置模型连接；评测未发起');report.model=session.model;report.reasoningEffort=session.reasoningEffort;
 const request=async(p,body)=>{const response=await fetch(new URL(p,origin),{method:body?'POST':'GET',headers:{'Content-Type':'application/json','X-Workbench-Token':session.token},...(body?{body:JSON.stringify(body)}:{})});const data=await response.json();if(!response.ok)throw Error(data.error||'评测请求失败');return data;};
 let running;process.once('SIGINT',()=>{if(running)void request('/api/jobs/'+running+'/cancel',{}).finally(()=>process.exit(130));else process.exit(130);});
 for(let run=1;run<=repeat;run++)for(const item of cases){const task=evaluationTask(item),started=Date.now(),entry={case:item.id,name:item.name,run,status:'starting',humanReview:{status:'pending',factualErrors:null,manualEdits:null,visualNotes:''}};report.results.push(entry);await save();
  try{let job=await request('/api/jobs',task);entry.jobId=running=job.id;await save();while(['queued','running','validating'].includes(job.status)){if(Date.now()-started>16*60*1000){await request('/api/jobs/'+job.id+'/cancel',{});throw Error('评测等待超时');}await new Promise(r=>setTimeout(r,1600));job=await request('/api/jobs/'+job.id);}
   Object.assign(entry,{status:job.status,summary:job.summary,error:job.error,checks:evaluateResult(item,task,job),usage:job.totalUsage||job.usage,reviewRounds:job.draft?.dossier?.history.length||0,toolCalls:job.draft?.journal.length||0});
   if(job.status==='completed'){for(const ext of ['svg','png']){const r=await fetch(new URL(`/api/jobs/${job.id}/after.${ext}`,origin),{headers:{'X-Workbench-Token':session.token}});if(!r.ok)throw Error('评测预览下载失败');await fs.writeFile(path.join(out,`${item.id}-${run}.${ext}`),Buffer.from(await r.arrayBuffer()));}}
  }catch(error){entry.status='failed';entry.error=error.message;}finally{running=null;entry.elapsedMs=Date.now()-started;await save();console.log(JSON.stringify({case:entry.case,status:entry.status,elapsedMs:entry.elapsedMs,automaticChecksPassed:entry.checks?.every(c=>c.pass)}));}
 }
 report.totals={cases:report.results.length,completed:report.results.filter(r=>r.status==='completed').length,automaticPass:report.results.filter(r=>r.checks?.every(c=>c.pass)).length,humanVerified:0};await save();console.log('评测报告：'+path.join(out,'report.json'));if(report.totals.automaticPass!==report.totals.cases)process.exitCode=1;
}
