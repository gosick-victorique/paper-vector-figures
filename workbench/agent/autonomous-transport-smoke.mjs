// Real Codex SDK/CLI -> stdio MCP -> draft host -> browser. Scripted provider only.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import Scene from '../scene-factory.js';
import Patch from './patch-contract.js';
import {createWorkbenchServer,hash} from './server.mjs';
import {createBrowserRuntime} from './browser-runtime.mjs';
import {createDraftSession} from './draft-session.mjs';
import {hostDraftTools} from './tool-host.mjs';
import {runAgent} from './runner.mjs';
import {drawingSteps as standardSteps} from '../tests/autonomous-scenario.mjs';
import {connectionCheckSteps,connectionRepairSteps} from '../tests/connection-check-scenario.mjs';
const repairScenario=process.argv.includes('--repair'),connectionScenario=repairScenario||process.argv.includes('--connections'),drawingSteps=repairScenario?connectionRepairSteps:connectionScenario?connectionCheckSteps:standardSteps;
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'figure-autonomous-transport-')),board=createWorkbenchServer({jobsDir:dir}),controller=new AbortController();
let step=0,toolOutputs=0,imageOutputs=0,checkReports=[],failed=null,runtime,host;
const provider=http.createServer(async(req,res)=>{
 try{
  if(req.method==='GET'){res.writeHead(200,{'Content-Type':'application/json'});return res.end('{"data":[]}');}
  let bytes=[];for await(const b of req)bytes.push(b);const data=JSON.parse(Buffer.concat(bytes).toString());
  const input=JSON.stringify(data.input);if(input.includes('function_call_output'))toolOutputs++;
  if(step>4&&(input.match(/"type":"input_image"/g)||[]).length>1)imageOutputs++;
  let item;
  if(step<drawingSteps.length){
   const [name,args]=drawingSteps[step],available=(data.tools||[]).filter(t=>t.type==='function'),namespace=(data.tools||[]).find(t=>t.type==='namespace'&&t.name==='mcp__figure'),tool=namespace?.tools.find(t=>t.name===name)||available.find(t=>(t.name||t.function?.name||'').endsWith('__'+name));
   if(!tool)await fs.writeFile(path.join(dir,'available-tools.json'),JSON.stringify(data.tools,null,2));assert.ok(tool,`Missing ${name}; available: ${available.map(t=>t.name).join(',')}; tools written to ${dir}`);
   item={id:'fc_'+step,type:'function_call',status:'completed',call_id:'call_'+step,name:tool.name,...(namespace?{namespace:namespace.name}:{}),arguments:JSON.stringify(args)};
  }else item={id:'msg_final',type:'message',status:'completed',role:'assistant',content:[{type:'output_text',text:'{"summary":"Local transport verified","warnings":["Scripted test"]}',annotations:[]}]};
  res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache'});const send=e=>res.write(`event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`),responseId='resp_'+step++;
  send({type:'response.created',response:{id:responseId,status:'in_progress',output:[]}});
  send({type:'response.output_item.added',output_index:0,item:{...item,status:'in_progress',...(item.type==='function_call'?{arguments:''}:{content:[]})}});
  if(item.type==='function_call'){
   send({type:'response.function_call_arguments.delta',item_id:item.id,output_index:0,delta:item.arguments});send({type:'response.function_call_arguments.done',item_id:item.id,output_index:0,arguments:item.arguments});
  }else{
   send({type:'response.content_part.added',item_id:item.id,output_index:0,content_index:0,part:{type:'output_text',text:'',annotations:[]}});
   send({type:'response.output_text.delta',item_id:item.id,output_index:0,content_index:0,delta:item.content[0].text});send({type:'response.output_text.done',item_id:item.id,output_index:0,content_index:0,text:item.content[0].text});
  }
  send({type:'response.output_item.done',output_index:0,item});send({type:'response.completed',response:{id:responseId,status:'completed',output:[item],usage:{input_tokens:1,output_tokens:1,total_tokens:2}}});res.end();
 }catch(e){failed=e;res.writeHead(500);res.end(e.message);controller.abort(e);}
});
await new Promise(r=>board.server.listen(0,'127.0.0.1',r));await new Promise(r=>provider.listen(0,'127.0.0.1',r));
const timer=setTimeout(()=>controller.abort(Error('Transport test timed out')),90000);
try{
 const s=Scene.blank(),task={taskType:'generate',executionMode:'autonomous',editMode:'generate',scene:s.nodes,scope:[{id:'custom'}],allComments:[],palette:0,paperContent:'Local transport fixture. Data: Step,Value: 1,2;2,4;3,3.',baseRevision:hash(Patch.revision(s)),currentSvg:'<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="740" viewBox="0 0 1200 740"><rect width="1200" height="740" fill="white"/><g id="scene" font-family="Arial, Helvetica, sans-serif"/></svg>'};
 await fs.writeFile(path.join(dir,'before.svg'),task.currentSvg);await sharp(Buffer.from(task.currentSvg)).png().toFile(path.join(dir,'before.png'));
 runtime=await createBrowserRuntime({url:`http://127.0.0.1:${board.server.address().port}`,signal:controller.signal});
 const draft=await createDraftSession({task,dir,runtime,signal:controller.signal,onEvent:e=>{console.log(`tool ${e.tool} revision=${e.revision}`);if(e.checks)checkReports.push(e.checks);}});host=await hostDraftTools(draft,controller.signal);
 const output=await runAgent({task,dir,config:{apiKey:'local-test-only',model:'gpt-5.4',baseUrl:`http://127.0.0.1:${provider.address().port}/v1`,reasoningEffort:'high'},signal:controller.signal,skill:{},draft,toolHost:host,onEvent:()=>{}});
 assert.ok(!failed,failed?.message);assert.equal(output.result.draft.revision,connectionScenario?7:8);assert.ok(toolOutputs>0);assert.ok(imageOutputs>0,'MCP images must reach later provider requests beyond the original attached PNG');
 if(connectionScenario){const issue=checkReports[0].issues.find(i=>i.code==='wire-crossing');assert.ok(issue);assert.deepEqual(issue.ids.sort(),['ai-horizontal','ai-vertical']);assert.ok(issue.region&&issue.suggestion);assert.equal(checkReports.at(-1).counts.connections,2);assert.ok(!checkReports.at(-1).issues.some(i=>i.code.startsWith('wire-')));}
 else{assert.ok(checkReports[0].issues.some(i=>i.key==='small-text:ai-input-e1'));assert.ok(!checkReports.at(-1).issues.some(i=>i.key==='small-text:ai-input-e1'));assert.ok(output.result.draft.journal.some(e=>e.tool==='save_equation'));assert.ok(output.result.draft.journal.some(e=>e.tool==='layout_graph'));}
 if(repairScenario){assert.ok(output.result.draft.journal.some(e=>e.tool==='repair_connections'&&e.status==='improved'));assert.equal(draft.getState().nodes['ai-c'].x,320);assert.equal(draft.getState().nodes['ai-horizontal'].connection.avoidConnections,true);}
 await fs.writeFile(path.join(dir,'after.svg'),draft.render());await runtime.render(draft.render(),{path:path.join(dir,'after.png')});console.log(`PASS real SDK/CLI + MCP tool/image loop, ${step} provider turns; artifact ${dir}. No external model call.`);
}finally{clearTimeout(timer);controller.abort();await host?.close();await runtime?.close();await board.close();provider.closeAllConnections();await new Promise(r=>provider.close(r));}
