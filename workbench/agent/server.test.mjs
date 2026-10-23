import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createWorkbenchServer,hash} from './server.mjs';
import P from './patch-contract.js';
import F from '../scene-factory.js';
import M from '../model.js';
import {buildPrompt,buildQuestionPrompt} from './runner.mjs';
async function harness(t,runner){const jobsDir=await fs.mkdtemp(path.join(os.tmpdir(),'figure-agent-test-'));const app=createWorkbenchServer({runner,jobsDir});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));t.after(()=>app.close());const base=`http://127.0.0.1:${app.server.address().port}`;const session=await(await fetch(base+'/api/session')).json();const request=(p,body,method=body?'POST':'GET',extra={})=>fetch(base+p,{method,headers:{'Content-Type':'application/json','X-Workbench-Token':session.token,...extra},...(body?{body:JSON.stringify(body)}:{})});return{...app,base,request,jobsDir};}
function task(){const nodes={a:{id:'a',type:'component',parent:null,x:10,y:10,w:100,h:30,scale:1,locked:false,name:'A'},leaf:{id:'leaf',parent:'a',type:'leaf',kind:'text',name:'Label',x:0,y:0,w:60,h:20,originX:0,originY:0,scale:1,locked:false}};const t={scene:nodes,allComments:[],palette:0,scope:[{id:'a'}],canvas:{viewBox:[0,0,1200,740]},pendingSelectionNote:'把标签缩短为 AI',paperContent:'Test paper excerpt, schematic only.',paper:'Test',currentSvg:'<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="740" viewBox="0 0 1200 740"><rect width="1200" height="740" fill="white"/><g id="scene"><g data-id="a"><g data-id="leaf"><g><text x="0" y="20">Example</text></g></g></g></g></svg>'};t.baseRevision=hash(P.revision({nodes,palette:0,comments:[]}));return t;}
async function terminal(h,id){for(let i=0;i<100;i++){const j=await(await h.request('/api/jobs/'+id)).json();if(!['queued','running','validating'].includes(j.status))return j;await new Promise(r=>setTimeout(r,50));}throw Error('Test timed out');}
test('selection Q&A includes figure, paper and follow-ups; returns text only and creates no editing job',async t=>{
 const input={...task(),question:'这里如何突出重点？',history:[{role:'user',content:'讨论配色'},{role:'assistant',content:'减少辅助颜色'}]},original=JSON.stringify(input);
 const h=await harness(t,async({task,skill,dir})=>{assert.equal(task.taskType,'ask');assert.deepEqual(task.scope,input.scope);assert.equal(task.paperContent,input.paperContent);assert.deepEqual(task.history,input.history);assert.ok((await fs.stat(path.join(dir,'before.png'))).size>0);const prompt=buildQuestionPrompt(task,skill);assert.match(prompt,/只回答问题/);assert.match(prompt,/这里如何突出重点/);return{result:{answer:'测试回答：减少辅助元素的对比度。',operations:[{op:'remove',id:'leaf'}]}};});
 assert.equal((await h.request('/api/ask',input)).status,409);
 await h.request('/api/config',{baseUrl:'https://api.openai.com/v1',model:'test-only-model',apiKey:'test-only-secret'});
 const response=await h.request('/api/ask',input);assert.equal(response.status,200);assert.deepEqual(await response.json(),{answer:'测试回答：减少辅助元素的对比度。'});assert.equal(h.jobs.size,0);assert.equal(JSON.stringify(input),original);
 assert.equal((await h.request('/api/ask',{...input,question:''})).status,400);
 assert.equal((await h.request('/api/ask',{...input,scope:[{id:'missing'}]})).status,400);
 assert.equal((await h.request('/api/ask',{...input,history:[{role:'system',content:'x'}]})).status,400);
 assert.equal((await h.request('/api/ask',{...input,currentSvg:'<svg><script/></svg>'})).status,400);
 assert.equal((await fetch(h.base+'/api/ask',{method:'POST',body:JSON.stringify(input)})).status,403);
});
test('Q&A supports blank board without paper and redacts provider failures',async t=>{
 const h=await harness(t,async()=>{throw Error('Rejected test-only-secret');});await h.request('/api/config',{baseUrl:'https://api.openai.com/v1',model:'test-only-model',apiKey:'test-only-secret'});
 const response=await h.request('/api/ask',{...task(),scope:[],paperContent:'',question:'该怎样构图？'});assert.equal(response.status,400);const result=await response.json();assert.match(result.error,/Rejected/);assert.ok(!result.error.includes('test-only-secret'));
});
test('closing an in-flight Q&A cancels its runner and permits another question',async t=>{
 let started;const running=new Promise(r=>started=r),h=await harness(t,async({signal})=>{started();await new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}));});await h.request('/api/config',{baseUrl:'https://api.openai.com/v1',model:'test-only-model',apiKey:'test-only-secret'});
 const session=await(await fetch(h.base+'/api/session')).json(),controller=new AbortController();const pending=fetch(h.base+'/api/ask',{method:'POST',headers:{'Content-Type':'application/json','X-Workbench-Token':session.token},body:JSON.stringify({...task(),question:'测试取消'}),signal:controller.signal}).catch(e=>e.name);
 await running;assert.equal((await h.request('/api/ask',{...task(),question:'第二问'})).status,409);controller.abort();assert.equal(await pending,'AbortError');
});
test('HTTP job lifecycle: isolated test adapter -> validated editable result -> persisted preview',async t=>{
 let called=false;const h=await harness(t,async({task,config,skill})=>{called=true;assert.equal(config.apiKey,'test-only-secret');assert.equal(skill.main,'');return{result:{baseRevision:task.baseRevision,summary:'测试执行器，非真实 AI',warnings:[],operations:[{op:'update',id:'leaf',payload:'{"textOverride":"AI"}'}]},usage:null};});
 assert.equal((await h.request('/api/jobs',task())).status,409);
 assert.equal((await h.request('/api/config',{baseUrl:'https://api.openai.com/v1',model:'test-only-model',apiKey:'test-only-secret'})).status,200);
 const response=await h.request('/api/jobs',task());assert.equal(response.status,202);const j=await terminal(h,(await response.json()).id);assert.equal(j.status,'completed',j.error);assert.equal(j.jury,'not_run');assert.ok(called);
 const svg=await(await h.request(`/api/jobs/${j.id}/after.svg`)).text();assert.match(svg,/>AI<\/text>/);assert.match(svg,/data-id="leaf"/);
 assert.equal((await h.request(`/api/jobs/${j.id}/after.png`)).status,200);
 const stored=await fs.readFile(path.join(h.jobsDir,j.id,'input.json'),'utf8');assert.ok(!stored.includes('test-only-secret'));
 const session=await(await fetch(h.base+'/api/session')).text();assert.ok(!session.includes('test-only-secret'));
});
test('server rejects cross-origin, missing token, private files, stale revision and invalid SVG',async t=>{
 const h=await harness(t,async()=>{throw Error('must not run');});
 assert.equal((await fetch(h.base+'/api/config',{method:'POST',body:'{}'})).status,403);
 assert.equal((await h.request('/api/config',{},'POST',{Origin:'https://untrusted.example'})).status,403);
 assert.equal((await fetch(h.base+'/.agent-jobs/secret.json')).status,404);
 await h.request('/api/config',{baseUrl:'https://api.openai.com/v1',model:'test-only-model',apiKey:'test-only-secret'});
 assert.equal((await h.request('/api/jobs',{...task(),baseRevision:'stale'})).status,400);
 assert.equal((await h.request('/api/jobs',{...task(),currentSvg:'<svg><script/></svg>'})).status,400);
});
test('cancelled runner never publishes a result',async t=>{
 const h=await harness(t,async({signal})=>{await new Promise((resolve,reject)=>{if(signal.aborted)reject(signal.reason);else signal.addEventListener('abort',()=>reject(signal.reason),{once:true});});});
 await h.request('/api/config',{baseUrl:'https://api.openai.com/v1',model:'test-only-model',apiKey:'test-only-secret'});
 const j=await(await h.request('/api/jobs',task())).json();assert.equal((await h.request('/api/jobs',task())).status,409);
 assert.equal((await(await h.request(`/api/jobs/${j.id}/cancel`,{})).json()).status,'cancelled');
 assert.equal((await terminal(h,j.id)).status,'cancelled');
});
test('failed runner status redacts credentials and preserves actionable error',async t=>{const h=await harness(t,async()=>{throw Error('Provider rejected test-only-secret: unsupported model');});await h.request('/api/config',{baseUrl:'https://api.openai.com/v1',model:'test-only-model',apiKey:'test-only-secret'});const j=await(await h.request('/api/jobs',task())).json();const end=await terminal(h,j.id);assert.equal(end.status,'failed');assert.match(end.error,/unsupported model/);assert.ok(!JSON.stringify(end).includes('test-only-secret'));});

for(const withSketch of [false,true])test(`generation from document ${withSketch?'with board and prompt':'on empty board without extra prompt'}`,async t=>{
 const base=F.blank();
 if(withSketch)base.nodes.seed={id:'seed',parent:'custom',type:'component',kind:'network',name:'保留编码器位置',x:60,y:70,w:90,h:60,scale:1,locked:true};
 const input={taskType:'generate',editMode:'generate',scene:base.nodes,palette:0,scope:[{id:'custom'}],allComments:[],paper:'测试文档',paperContent:'两个编码器提取两路特征，通过融合模块得到结果。',pendingSelectionNote:withSketch?'保留左侧编码器，右侧展开融合模块':'',purpose:'方法总览',canvas:{viewBox:[0,0,1200,740]},currentSvg:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 740"><rect width="1200" height="740" fill="white"/><g id="scene"><g data-id="custom">${withSketch?'<g data-id="seed"/>':''}</g></g></svg>`};
 input.baseRevision=hash(P.revision(base));
 const component={id:'ai-fusion',parent:'custom',type:'component',kind:'network',name:'融合模块',x:400,y:200,w:120,h:100,scale:1,locked:false};
 const shape={id:'ai-face',parent:'ai-fusion',type:'leaf',kind:'rect',name:'主体',x:0,y:0,w:120,h:100,originX:0,originY:0,scale:1,locked:false,markup:'<rect width="120" height="100" fill="#dfeaf0"/>'};
 const h=await harness(t,async({task,skill})=>{assert.equal(task.paperContent,input.paperContent);assert.deepEqual(task.scene,input.scene);assert.equal(task.pendingSelectionNote,input.pendingSelectionNote);const prompt=buildPrompt(task,skill);assert.ok(prompt.includes(input.paperContent));assert.match(prompt,/任务：生成图片/);if(withSketch)assert.ok(prompt.includes('保留编码器位置'));return{result:{baseRevision:task.baseRevision,summary:'测试执行器，非模型绘制',warnings:[],operations:[component,shape].map(n=>({op:'insert',id:n.id,payload:JSON.stringify(n)}))}};});
 await h.request('/api/config',{baseUrl:'https://api.openai.com/v1',model:'test-only-model',apiKey:'test-only-secret'});
 const response=await h.request('/api/jobs',input);assert.equal(response.status,202);const end=await terminal(h,(await response.json()).id);assert.equal(end.status,'completed',end.error);
 const next=P.apply(base,input,end);assert.equal(next.nodes['ai-face'].parent,'ai-fusion');assert.equal(M.move(next,['ai-fusion'],20,10),true);if(withSketch)assert.deepEqual(next.nodes.seed,base.nodes.seed);
 assert.match(await(await h.request(`/api/jobs/${end.id}/after.svg`)).text(),/data-id="ai-fusion"/);
 assert.equal((await h.request('/api/jobs',{...input,paperContent:''})).status,400);
 assert.throws(()=>P.apply(base,{...input,taskType:'edit'},end),/模式/);
});

test('appearance editing works without paper and uses edit prompt profile',async t=>{
 const input={...task(),taskType:'edit',editMode:'appearance',paperContent:'',pendingSelectionNote:'把文字改为蓝色'};
 const h=await harness(t,async({task,skill})=>{assert.equal(skill.main,'');assert.deepEqual(skill.referenceIndex,[]);return{result:{baseRevision:task.baseRevision,summary:'文字改为蓝色',warnings:[],operations:[{op:'update',id:'leaf',payload:JSON.stringify({appearance:{textColor:'#416f89'}})}]}};});
 await h.request('/api/config',{baseUrl:'https://api.openai.com/v1',model:'test-only-model',apiKey:'test-only-secret'});
 const response=await h.request('/api/jobs',input);assert.equal(response.status,202);const end=await terminal(h,(await response.json()).id);assert.equal(end.status,'completed',end.error);assert.equal(end.promptProfile.name,'edit');assert.equal(end.promptProfile.skillMode,'none');assert.equal(end.skill,null);
 const profile=JSON.parse(await fs.readFile(path.join(h.jobsDir,end.id,'prompt-profile.json'),'utf8'));assert.equal(profile.sha256,end.promptProfile.sha256);
 assert.equal((await h.request('/api/jobs',{...input,taskType:'ask'})).status,400);
});
