// Real independent Codex SDK/CLI sessions, deterministic local Responses provider.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import Scene from '../scene-factory.js';
import Patch from './patch-contract.js';
import {createWorkbenchServer,hash} from './server.mjs';
import {createBrowserRuntime} from './browser-runtime.mjs';
import {createDraftSession} from './draft-session.mjs';
import {createReviewCoordinator} from './independent-review.mjs';
import {paper,runReviewedScenario} from '../tests/review-scenario.mjs';
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'figure-review-transport-')),service=createWorkbenchServer({jobsDir:dir}),controller=new AbortController();
let requests=0,runtime,reviews,failed;const received=[];
const provider=http.createServer(async(req,res)=>{
 try{
  if(req.method==='GET'){res.writeHead(200,{'Content-Type':'application/json'});return res.end('{"data":[]}');}
  let bytes=[];for await(const b of req)bytes.push(b);const data=JSON.parse(Buffer.concat(bytes).toString());requests++;
  const text=JSON.stringify(data),role=text.match(/Review role: (scientific|structure|readability|editability)/)?.[1];assert.ok(role);assert.ok(text.includes('input_image'));assert.ok(!data.tools.some(t=>t.name==='mcp__figure'));assert.match(text,/paper-0001/);
  const content=data.input.filter(i=>i.type==='message'&&i.role==='user').flatMap(i=>i.content||[]),inputText=content.find(c=>c.type==='input_text'&&c.text.includes('Snapshot: '))?.text;assert.ok(inputText);const snapshot=JSON.parse(inputText.split('Snapshot: ')[1]);assert.equal(snapshot.exportCheck.status,'verified');assert.ok(content.filter(c=>c.type==='input_image').length>=2);received.push({role,revision:snapshot.revision});
  const small=snapshot.scene['ai-network-e0'].markup.includes('font-size="14"'),report={summary:role+' local transport review',findings:role==='readability'&&small?[{severity:'blocker',objectIds:['ai-network'],sourceIds:[],message:'Encoder 标签过小',suggestion:'增大文字'}]:[],limitations:['Local scripted response; no external model assessment.']};
  const final=JSON.stringify(report),item={id:'msg_'+requests,type:'message',status:'completed',role:'assistant',content:[{type:'output_text',text:final,annotations:[]}]};
  res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache'});const send=e=>res.write(`event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`),responseId='resp_'+requests;
  send({type:'response.created',response:{id:responseId,status:'in_progress',output:[]}});send({type:'response.output_item.added',output_index:0,item:{...item,status:'in_progress',content:[]}});send({type:'response.content_part.added',item_id:item.id,output_index:0,content_index:0,part:{type:'output_text',text:'',annotations:[]}});send({type:'response.output_text.delta',item_id:item.id,output_index:0,content_index:0,delta:final});send({type:'response.output_text.done',item_id:item.id,output_index:0,content_index:0,text:final});send({type:'response.output_item.done',output_index:0,item});send({type:'response.completed',response:{id:responseId,status:'completed',output:[item],usage:{input_tokens:1,output_tokens:1,total_tokens:2}}});res.end();
 }catch(e){failed=e;res.writeHead(500);res.end('Local test assertion failed');controller.abort(e);}
});
await new Promise(r=>service.server.listen(0,'127.0.0.1',r));await new Promise(r=>provider.listen(0,'127.0.0.1',r));const timer=setTimeout(()=>controller.abort(Error('Review transport timeout')),90000);
try{
 const s=Scene.blank(),task={taskType:'generate',executionMode:'autonomous',reviewPolicy:'independent',editMode:'generate',scene:s.nodes,scope:[{id:'custom'}],allComments:[],palette:0,paperContent:paper,baseRevision:hash(Patch.revision(s)),currentSvg:'<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="740" viewBox="0 0 1200 740"><rect width="1200" height="740" fill="white"/><g id="scene" font-family="Arial, Helvetica, sans-serif"/></svg>'};
 runtime=await createBrowserRuntime({url:`http://127.0.0.1:${service.server.address().port}`,signal:controller.signal});reviews=createReviewCoordinator({dir,signal:controller.signal,config:{apiKey:'local-test-only',model:'gpt-5.4',baseUrl:`http://127.0.0.1:${provider.address().port}/v1`,reasoningEffort:'high'},onEvent:r=>console.log(`review v${r.revision}: ${r.reports.length}/4 ${r.verdict}`)});
 const draft=await createDraftSession({task,dir,runtime,reviews,signal:controller.signal});await runReviewedScenario(draft);assert.ok(!failed,failed?.message);assert.equal(requests,8);assert.equal(new Set(received.map(r=>r.role)).size,4);assert.equal(new Set(received.map(r=>r.revision)).size,2);
 const record=draft.result.draft.dossier;assert.deepEqual(record.history.map(r=>r.verdict),['revise','pass']);assert.equal(new Set(record.history.flatMap(r=>r.reports.map(v=>v.threadId))).size,8);assert.ok(record.bindings['ai-formula'].citations.length);await fs.writeFile(path.join(dir,'after.svg'),draft.render());await runtime.render(draft.render(),{path:path.join(dir,'after.png')});
 console.log(`PASS independent review: 8 real SDK/CLI sessions, 2 review rounds, evidence + revision + commit; artifact ${dir}. Provider responses are local fixtures.`);
}finally{clearTimeout(timer);controller.abort();await reviews?.close();await runtime?.close();await service.close();provider.closeAllConnections();await new Promise(r=>provider.close(r));}
