import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import sharp from 'sharp';
import Patch from './patch-contract.js';
import Safety from './svg-safety.cjs';
import Renderer from './render.cjs';
import Media from './media-import.cjs';
import Export from './export.cjs';
import Workspace from '../board-workspace.js';
import WorkspaceCanvas from '../canvas-size.js';
import Commands from '../editor-commands.js';
import {createBrowserRuntime} from './browser-runtime.mjs';
import {createDraftSession} from './draft-session.mjs';
import {hostDraftTools} from './tool-host.mjs';
import {createReviewCoordinator,runReviewer} from './independent-review.mjs';
import {importDocument} from './document-import.mjs';
import {taskBudget} from './task-budget.mjs';
import {reasoningEfforts,normalizeReasoning} from './reasoning.mjs';
import {prepareSkill,runAgent,buildAgentPrompt} from './runner.mjs';
import {resolveConnection,listModels} from './models.mjs';
import {createConfigStore} from './config-store.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const hash=s=>createHash('sha256').update(s).digest('hex');
export function createWorkbenchServer({runner=runAgent,jobsDir=path.join(root,'.agent-jobs'),configStore=null,runtimeFactory=createBrowserRuntime,reviewer=runReviewer}={}){
 const token=randomBytes(32).toString('hex'),jobs=new Map(),questions=new Set(),executions=new Map();
 let config={apiKey:process.env.OPENAI_API_KEY||'',baseUrl:process.env.OPENAI_BASE_URL||'https://api.openai.com/v1',model:process.env.FIGURE_MODEL||'',reasoningEffort:'auto'};
 let configWarning='';const initialized=configStore?configStore.load().then(c=>{if(c)config={...c,reasoningEffort:normalizeReasoning(c.reasoningEffort??'auto')};}).catch(()=>{configWarning='无法解密已保存配置，请重新填写并保存连接';}):Promise.resolve();
 const ready=()=>!!(config.apiKey&&config.model);
 const safeError=(e,key=config.apiKey)=>{let s=String(e.message||e);if(key)s=s.split(key).join('[redacted]');return s.replace(/(?:sk-[\w-]{10,}|Bearer\s+[^\s"']+)/g,'[redacted]').slice(0,4000);};
 const publicJob=j=>({id:j.id,status:j.status,message:j.message,createdAt:j.createdAt,updatedAt:j.updatedAt,baseRevision:j.task.baseRevision,summary:j.result?.summary,warnings:j.result?.warnings,operations:j.result?.operations,draft:j.result?.draft,progress:j.progress,review:j.review,usage:j.usage,totalUsage:j.totalUsage,attempts:j.attempts||1,recoverable:!!j.recoverable,skill:j.skill,promptProfile:j.promptProfile,jury:j.result?.draft?.dossier?'completed':j.review?.status||'not_run',error:j.error,events:j.events});
 function save(j){const target=path.join(j.dir,'status.json'),data=JSON.stringify(publicJob(j),null,2),operation=(j.saveTail||Promise.resolve()).then(async()=>{await fs.writeFile(target+'.tmp',data);await fs.rename(target+'.tmp',target);});j.saveTail=operation.catch(()=>{});return operation;}
 const usageSum=items=>{const total={input_tokens:0,output_tokens:0,cached_input_tokens:0};for(const usage of items.filter(Boolean))for(const key of Object.keys(total))total[key]+=Number(usage[key])||0;return total;};
 function update(j,status,message){j.status=status;j.message=message;j.updatedAt=new Date().toISOString();j.events.push({at:j.updatedAt,message});j.events=j.events.slice(-50);}
 function launch(j,cfg,resume=false){const pending=execute(j,cfg,resume);executions.set(j.id,pending);void pending.finally(()=>executions.delete(j.id));}
 async function execute(j,cfg,resume=false){
  let draft,toolHost,runtime,reviews;
  const budget=taskBudget(j.task.budget),timer=setTimeout(()=>j.controller.abort(new Error(`本次执行超过 ${budget.minutes} 分钟，可从草稿继续`)),budget.minutes*60*1000);
  try{
   await initialized;
   update(j,'running',j.task.taskType==='generate'?'读取生成 skill 与准备图像':'准备选区修改与图像');await save(j);
   const skill=await prepareSkill(j.dir,j.task);j.skill=skill.main?{version:skill.version,sha256:skill.sha256}:null;
   const prepared=buildAgentPrompt(j.task,skill);j.promptProfile=prepared.profile;await fs.writeFile(path.join(j.dir,'prompt-profile.json'),JSON.stringify(prepared.profile,null,2));await fs.writeFile(path.join(j.dir,'system-instructions.md'),prepared.instructions);
   await sharp(Buffer.from(j.task.currentSvg),{limitInputPixels:20000000}).resize({width:1600}).png().toFile(path.join(j.dir,'before.png'));
   if(j.controller.signal.aborted)throw j.controller.signal.reason;
   if(j.task.executionMode==='autonomous'){
    runtime=await runtimeFactory({url:`http://127.0.0.1:${server.address().port}`,signal:j.controller.signal});
    const labels={repair_connections:'尝试修复连线',analyze_graph:'分析连接关系',layout_graph:'按流程排版',check_evidence:'核验图表数据',get_scene:'读取画板',get_evidence:'读取原文证据',bind_evidence:'关联证据',review_figure:'开始独立评审',get_review:'读取评审意见',search_assets:'检索素材',preview_asset:'预览素材',insert_asset:'插入素材',create_component:'绘制组件',apply_ops:'修改图元',save_chart:'编辑图表',save_equation:'编辑公式',connect_objects:'连接模块',arrange_objects:'调整排版',remove_objects:'移除对象',render_region:'观察图稿',measure_objects:'测量对象',check_figure:'检查图稿',checkpoint:'保存检查点',rollback:'回滚草稿',commit:'提交草稿'};
    if(j.task.reviewPolicy==='independent')reviews=createReviewCoordinator({dir:j.dir,config:cfg,signal:j.controller.signal,reviewer,maxRounds:budget.reviewRounds,onEvent:round=>{j.review=round;if(j.status==='running')update(j,'running',`独立评审 · ${round.reports.length}/4 · ${round.verdict==='revise'?'需要修订':round.verdict==='pass'?'通过':round.status==='failed'?'未完成':'检查中'}`);}});
    if(resume)await reviews?.restore();
    draft=await createDraftSession({task:j.task,dir:j.dir,runtime,reviews,resume,signal:j.controller.signal,onEvent:event=>{j.progress=event;if(j.status==='running')update(j,'running',`草稿 v${event.revision} · ${labels[event.tool]||event.tool}`);}});
    j.recoverable=true;if(resume)await runtime.render(draft.render(),{path:path.join(j.dir,'draft-preview.png')});
    toolHost=await hostDraftTools(draft,j.controller.signal);
   }
   const run=draft?.result?{result:draft.result,usage:null}:await runner({task:j.task,dir:j.dir,config:cfg,signal:j.controller.signal,skill,draft,toolHost,onUsage:async usage=>{j.usage=usage;j.designerUsage=usageSum([j.designerUsage,usage]);await fs.writeFile(path.join(j.dir,'usage.json'),JSON.stringify(j.designerUsage));},onEvent:m=>{if(j.status==='running')update(j,'running',m);}});
   const result=draft?draft.result:run.result,usage=run.usage;if(!result)throw Error('自主草稿尚未提交');
   if(j.controller.signal.aborted)throw j.controller.signal.reason;
   update(j,'validating','校验修改范围、锁定状态与 SVG');
   const base={nodes:j.task.scene,comments:j.task.allComments||[],palette:j.task.palette,canvas:j.task.canvas};
   const next=draft?Commands.adopt(base,j.task,result,Safety.validateMarkup):Patch.apply(base,j.task,result,Safety.validateMarkup);
   const after=Renderer.render(j.task,next);Safety.parse(after);
   if(runtime)await runtime.render(after,{path:path.join(j.dir,'after.png')});else await sharp(Buffer.from(after),{limitInputPixels:20000000}).resize({width:1600}).png().toFile(path.join(j.dir,'after.png'));
   if(j.controller.signal.aborted)throw j.controller.signal.reason;
   await fs.writeFile(path.join(j.dir,'after.svg'),after);
   j.result=result;j.usage=usage;j.recoverable=false;
   update(j,'completed',result.operations.length?'新版本已就绪，等待查看与采纳':'Agent 未作修改，请查看说明');await save(j);
  }catch(e){if(j.status!=='cancelled'){j.error=safeError(e,cfg.apiKey);update(j,'failed',j.error);}await save(j).catch(()=>{});}
  finally{clearTimeout(timer);await reviews?.close().catch(()=>{});await toolHost?.close().catch(()=>{});await runtime?.close().catch(()=>{});const unique=new Map();for(const report of reviews?.all().flatMap(r=>r.reports)||[])if(report.usage)unique.set(report.threadId||report.role+report.instructionsHash,report.usage);j.totalUsage=usageSum([j.designerUsage,...unique.values()]);await save(j).catch(()=>{});}
 }
 async function body(req,limit=18000000){let size=0,b=[];for await(const chunk of req){size+=chunk.length;if(size>limit)throw Error('请求超过 '+Math.round(limit/1024/1024)+' MB');b.push(chunk);}return JSON.parse(Buffer.concat(b).toString('utf8'));}
 const server=http.createServer(async(req,res)=>{
  const json=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
  try{
   await initialized;
   const port=server.address().port,host=req.headers.host;
   if(![`127.0.0.1:${port}`,`localhost:${port}`].includes(host))return json(403,{error:'仅允许本机访问'});
   if(req.headers.origin&&req.headers.origin!==`http://${host}`)return json(403,{error:'请求来源不匹配，请从本地服务打开画板'});
   const url=new URL(req.url,`http://${host}`),p=url.pathname;
   if(p==='/api/session'&&req.method==='GET')return json(200,{token,ready:ready(),baseUrl:config.baseUrl,model:config.model,reasoningEffort:config.reasoningEffort,reasoningEfforts,hasKey:!!config.apiKey,persistent:!!configStore,configWarning});
   if(p.startsWith('/api/')){
    if(req.headers['x-workbench-token']!==token)return json(403,{error:'连接已过期，请刷新画板'});
    if(p==='/api/document/import'&&req.method==='POST'){
     const controller=new AbortController(),disconnect=()=>{if(!res.writableEnded)controller.abort();};res.on('close',disconnect);
     try{const result=await importDocument(await body(req,36*1024*1024),{signal:controller.signal});if(!res.destroyed)return json(200,result);}
     finally{res.off('close',disconnect);}return;
    }
    if(p==='/api/export'&&req.method==='POST'){
     const result=await Export.exportFigure(await body(req));res.writeHead(200,{'Content-Type':result.type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});return res.end(result.data);
    }
    if(p==='/api/workspace/validate'&&req.method==='POST'){
     const {workspace}=await body(req,128*1024*1024);if(workspace?.workspaceSchema!==1)throw Error('项目格式无效');
     Workspace.load(workspace,null,nodes=>{Patch.validateScene(nodes);for(const n of Object.values(nodes))if(n.markup)Safety.validateMarkup(n.markup);});
     for(const board of workspace.boards)for(const state of [board.state,...board.versions.map(v=>v.state)])if(state.svgDefs)Safety.parse('<svg xmlns="http://www.w3.org/2000/svg"><defs>'+state.svgDefs+'</defs></svg>');
     return json(200,{valid:true});
    }
    if(p==='/api/models'&&req.method==='POST'){
     const input=await body(req),connection=resolveConnection(input,config);
     return json(200,await listModels(connection));
    }
    if(p==='/api/config'&&req.method==='POST'){
     const b=await body(req),connection=resolveConnection(b,config);
     const model=String(b.model||'').trim();
     if(!model||model.length>150)throw Error('请填写模型名称');
     const reasoningEffort=normalizeReasoning(b.reasoningEffort??config.reasoningEffort??'auto');
     const nextConfig={...connection,model,reasoningEffort};await configStore?.save(nextConfig);config=nextConfig;configWarning='';
     return json(200,{ready:ready(),model,reasoningEffort,baseUrl:config.baseUrl,hasKey:true});
    }
    if(p==='/api/config'&&req.method==='DELETE'){await configStore?.clear();config.apiKey='';return json(200,{ready:false});}
    if(p==='/api/media/import'&&req.method==='POST')return json(200,await Media.importMedia(await body(req)));
    if(p==='/api/scene/validate'&&req.method==='POST'){
     const task=await body(req);Patch.validateScene(task.scene);WorkspaceCanvas.read(task);Safety.parse(task.currentSvg);
     for(const n of Object.values(task.scene))if(n.markup)Safety.validateMarkup(n.markup);
     return json(200,{valid:true});
    }
    if(p==='/api/ask'&&req.method==='POST'){
     if(!ready())return json(409,{error:'请先配置 API Key 和模型'});
     if(questions.size)return json(409,{error:'已有问答运行中，请等待或取消'});
     const input=await body(req);Patch.validateScene(input.scene);WorkspaceCanvas.read(input);Safety.parse(input.currentSvg);
     if(typeof input.question!=='string'||!input.question.trim()||input.question.length>12000)throw Error('请输入问题（最多 12000 字）');
     if(!Array.isArray(input.scope)||input.scope.some(s=>!Object.hasOwn(input.scene,s.id)))throw Error('选区已失效');
     for(const n of Object.values(input.scene))if(n.markup)Safety.validateMarkup(n.markup);
     const history=input.history||[];
     if(!Array.isArray(history)||history.length>12||history.some(m=>!['user','assistant'].includes(m.role)||typeof m.content!=='string'||m.content.length>24000))throw Error('问答历史无效');
     const task={taskType:'ask',question:input.question,scope:input.scope,scene:input.scene,currentSvg:input.currentSvg,paper:input.paper,paperContent:input.paperContent,purpose:input.purpose,canvas:input.canvas,comments:input.comments,history};
     const controller=new AbortController(),cfg={...config};questions.add(controller);
     const disconnect=()=>{if(!res.writableEnded)controller.abort(new Error('问答已取消'));};res.on('close',disconnect);
     const timer=setTimeout(()=>controller.abort(new Error('问答超时，请缩小问题后重试')),5*60*1000);
     try{
      const dir=path.join(jobsDir,'ask-'+randomUUID());await fs.mkdir(dir,{recursive:true});
      await fs.writeFile(path.join(dir,'input.json'),JSON.stringify(task));await fs.writeFile(path.join(dir,'before.svg'),task.currentSvg);
      const skill=await prepareSkill(dir,task);
      await sharp(Buffer.from(task.currentSvg),{limitInputPixels:20000000}).resize({width:1600}).png().toFile(path.join(dir,'before.png'));
      controller.signal.throwIfAborted();
      const aborted=new Promise((resolve,reject)=>controller.signal.addEventListener('abort',()=>reject(controller.signal.reason),{once:true}));
      const {result}=await Promise.race([runner({task,dir,config:cfg,signal:controller.signal,skill,onEvent:()=>{}}),aborted]);
      controller.signal.throwIfAborted();
      if(typeof result?.answer!=='string'||!result.answer.trim()||result.answer.length>24000)throw Error('AI 未返回有效回答');
      return json(200,{answer:result.answer});
     }catch(e){if(!res.destroyed)return json(400,{error:safeError(e,cfg.apiKey)});}
     finally{clearTimeout(timer);res.off('close',disconnect);questions.delete(controller);}return;
    }
    if(p==='/api/jobs'&&req.method==='POST'){
     if(!ready())return json(409,{error:'请先配置 API Key 和模型'});
     if(executions.size||[...jobs.values()].some(j=>['queued','running','validating'].includes(j.status)))return json(409,{error:'已有任务运行中，请等待或取消'});
     const task=await body(req);Patch.validateScene(task.scene);WorkspaceCanvas.read(task);taskBudget(task.budget);
     if(!Array.isArray(task.scope)||!task.scope.length||task.scope.some(s=>!Object.hasOwn(task.scene,s.id)))throw Error('请先选择有效对象');
     if(task.taskType&&!['generate','edit'].includes(task.taskType))throw Error('不支持的任务类型');
     if(task.executionMode!==undefined&&!['quick','autonomous'].includes(task.executionMode))throw Error('不支持的执行方式');
     if(task.reviewPolicy!==undefined&&!['none','independent'].includes(task.reviewPolicy)||task.reviewPolicy==='independent'&&task.executionMode!=='autonomous')throw Error('独立评审仅用于自主绘图任务');
     for(const n of Object.values(task.scene))if(n.markup)Safety.validateMarkup(n.markup);
     if(task.paperContent!==undefined&&typeof task.paperContent!=='string')throw Error('正文格式无效');
     if(task.taskType==='generate'&&!task.paperContent?.trim())throw Error('请填写论文相关段落');
     if(task.taskType==='generate'&&task.editMode!=='generate'||task.editMode==='generate'&&task.taskType!=='generate')throw Error('任务类型与模式不一致');
     if(task.taskType!=='generate'&&!task.pendingSelectionNote?.trim()&&!task.comments?.length)throw Error('请填写修改意见');
     if(hash(Patch.revision({nodes:task.scene,palette:task.palette,comments:task.allComments||[],canvas:task.canvas}))!==task.baseRevision)throw Error('提交版本不一致，请重新打开任务');
     Safety.parse(task.currentSvg);
     const id=randomUUID(),dir=path.join(jobsDir,id);await fs.mkdir(dir,{recursive:true});
     const j={id,dir,task,status:'queued',message:'等待执行',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),events:[],controller:new AbortController()};jobs.set(id,j);
     await fs.writeFile(path.join(dir,'task.json'),JSON.stringify(task));await fs.writeFile(path.join(dir,'input.json'),JSON.stringify(task));await fs.writeFile(path.join(dir,'before.svg'),task.currentSvg);await save(j);
     json(202,publicJob(j));launch(j,{...config});return;
    }
    const match=p.match(/^\/api\/jobs\/([\w-]+)(?:\/(cancel|resume|before\.svg|after\.svg|before\.png|after\.png|draft-preview\.png))?$/);
    if(match){
     let j=jobs.get(match[1]);
     if(!j&&(req.method==='GET'||match[2]==='resume')){
      try{const dir=path.join(jobsDir,match[1]);const saved=JSON.parse(await fs.readFile(path.join(dir,'status.json'),'utf8'));j={...saved,dir,task:{baseRevision:saved.baseRevision},result:{summary:saved.summary,warnings:saved.warnings,operations:saved.operations,draft:saved.draft},controller:null};if(['queued','running','validating'].includes(j.status)){j.status='interrupted';j.message='服务已重启，任务已中断；可从保存的草稿继续';}j.recoverable=await fs.readFile(path.join(dir,'draft.json'),'utf8').then(value=>JSON.parse(value).schema===3).catch(()=>false);jobs.set(j.id,j);}catch{return json(404,{error:'找不到任务'});}
     }
     if(!j)return json(404,{error:'找不到任务'});
     if(!match[2]&&req.method==='GET')return json(200,publicJob(j));
     if(match[2]==='resume'&&req.method==='POST'){
      if(!ready())return json(409,{error:'请先配置 API Key 和模型'});
      if(executions.size||[...jobs.values()].some(job=>['queued','running','validating'].includes(job.status)))return json(409,{error:'已有任务运行中，请等待结束后继续'});
      if(!j.recoverable||!['failed','cancelled','interrupted'].includes(j.status))return json(409,{error:'此任务没有可恢复的自主草稿'});
      const input=await body(req);if(input.baseRevision!==j.task.baseRevision)return json(409,{error:'原始任务版本不一致'});
      const task=JSON.parse(await fs.readFile(path.join(j.dir,'task.json'),'utf8'));if(task.executionMode!=='autonomous')throw Error('仅自主草稿可继续');taskBudget(task.budget);
      if(hash(Patch.revision({nodes:task.scene,palette:task.palette,comments:task.allComments||[],canvas:task.canvas}))!==task.baseRevision)throw Error('原始任务损坏');
      j.task=task;j.error=null;j.result=null;j.attempts=(j.attempts||1)+1;j.controller=new AbortController();j.designerUsage=await fs.readFile(path.join(j.dir,'usage.json'),'utf8').then(JSON.parse).catch(()=>null);
      update(j,'queued','从已保存草稿继续');await save(j);json(202,publicJob(j));launch(j,{...config},true);return;
     }
     if(match[2]==='cancel'&&req.method==='POST'){if(['queued','running','validating'].includes(j.status)){update(j,'cancelled','任务已取消');j.controller?.abort(new Error('已取消'));await save(j);}return json(200,publicJob(j));}
     if(req.method==='GET'&&/\.(svg|png)$/.test(match[2]||'')){const file=await fs.readFile(path.join(j.dir,match[2]));res.writeHead(200,{'Content-Type':match[2].endsWith('.svg')?'image/svg+xml':'image/png','Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; img-src data:; style-src 'unsafe-inline'"});return res.end(file);}
    }
    return json(404,{error:'未知接口'});
   }
   if(req.method!=='GET'&&req.method!=='HEAD')return json(405,{error:'不支持此请求'});
   const relative=decodeURIComponent(p==='/'?'/index.html':p).slice(1);
   if(relative.split(/[\\/]/).some(x=>x.startsWith('.')||['node_modules','agent'].includes(x))&&!['agent/patch-contract.js','agent/adoption.js','agent/client.js','agent/panel.css'].includes(relative))return json(404,{error:'未找到文件'});
   const file=path.resolve(root,relative);if(!file.startsWith(root+path.sep))return json(404,{error:'未找到文件'});
   const ext=path.extname(file),types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.json':'application/json','.md':'text/plain; charset=utf-8'};
   if(!types[ext])return json(404,{error:'未找到文件'});
   const content=await fs.readFile(file);res.writeHead(200,{'Content-Type':types[ext],'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'"});res.end(req.method==='HEAD'?undefined:content);
  }catch(e){if(!res.headersSent)json(e.code==='ENOENT'?404:400,{error:safeError(e)});else res.end();}
 });
 return {server,jobs,close:async()=>{for(const controller of questions)controller.abort();for(const j of jobs.values())j.controller?.abort();await Promise.allSettled([...executions.values()]);return new Promise(resolve=>server.close(resolve));}};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const app=createWorkbenchServer({configStore:createConfigStore()});app.server.listen(Number(process.env.PORT)||4318,'127.0.0.1',()=>console.log(`Figure Studio: http://127.0.0.1:${app.server.address().port} (Windows encrypted credential storage)`));
}
