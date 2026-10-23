// Optional local protocol test. This starts the real SDK/CLI against an in-process
// fake Responses server; no credentials, external requests or real AI are used.
import http from 'node:http';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {Codex} from '@openai/codex-sdk';
import {providerConfig} from './provider.mjs';
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'figure-sdk-smoke-'));
let requests=0;
const fake=http.createServer(async(req,res)=>{
 let body='';for await(const b of req)body+=b;
 if(req.method==='GET'){res.writeHead(200,{'Content-Type':'application/json'});res.end('{"data":[]}');return;}
 requests++;assert.match(req.url,/responses/);assert.equal(req.headers.authorization,'Bearer local-test-only');
 const data=JSON.parse(body);assert.ok(data.input);assert.ok(data.text?.format?.schema);assert.equal(data.reasoning.effort,'high');
 const text='{"ok":true}',item={id:'msg_test',type:'message',status:'completed',role:'assistant',content:[{type:'output_text',text,annotations:[]}]};
 res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache'});
 const send=e=>res.write(`event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`);
 send({type:'response.created',response:{id:'resp_test',status:'in_progress',output:[]}});
 send({type:'response.output_item.added',output_index:0,item:{...item,status:'in_progress',content:[]}});
 send({type:'response.content_part.added',item_id:item.id,output_index:0,content_index:0,part:{type:'output_text',text:'',annotations:[]}});
 send({type:'response.output_text.delta',item_id:item.id,output_index:0,content_index:0,delta:text});
 send({type:'response.output_text.done',item_id:item.id,output_index:0,content_index:0,text});
 send({type:'response.output_item.done',output_index:0,item});
 send({type:'response.completed',response:{id:'resp_test',status:'completed',output:[item],usage:{input_tokens:1,output_tokens:1,total_tokens:2}}});res.end();
});
await new Promise(r=>fake.listen(0,'127.0.0.1',r));
const env={};for(const key of ['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','ProgramFiles','ComSpec','PATHEXT'])if(process.env[key])env[key]=process.env[key];env.CODEX_HOME=dir;
try{
 const codex=new Codex({apiKey:'local-test-only',env,config:providerConfig(`http://127.0.0.1:${fake.address().port}/v1`)});
 const thread=codex.startThread({model:'gpt-5.4',modelReasoningEffort:'high',workingDirectory:dir,skipGitRepoCheck:true,sandboxMode:'read-only',approvalPolicy:'never',webSearchMode:'disabled',networkAccessEnabled:false});
 const turn=await thread.run('Return {"ok":true} without calling any tools.',{signal:AbortSignal.timeout(30000),outputSchema:{type:'object',additionalProperties:false,required:['ok'],properties:{ok:{type:'boolean'}}}});
 assert.deepEqual(JSON.parse(turn.finalResponse),{ok:true});assert.ok(requests>0);console.log('PASS real SDK / CLI against local test Responses transport (not a model call).');
}finally{await new Promise(r=>fake.close(r));}
