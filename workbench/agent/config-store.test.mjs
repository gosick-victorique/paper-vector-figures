import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createConfigStore} from './config-store.mjs';
import {createWorkbenchServer} from './server.mjs';
test('Windows user-encrypted configuration survives restart without plaintext secrets', {skip:process.platform!=='win32'}, async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'figure-key-store-')),file=path.join(dir,'connection.json'),store=createConfigStore(file),config={apiKey:'test-only-persistent-key',baseUrl:'https://api.openai.com/v1',model:'test-model',reasoningEffort:'high'};
 assert.equal(await store.load(),null);await store.save(config);const raw=await fs.readFile(file,'utf8');assert.ok(!raw.includes(config.apiKey));assert.deepEqual(await createConfigStore(file).load(),config);await store.save({...config,model:'other'});assert.equal((await store.load()).model,'other');await store.clear();assert.equal(await store.load(),null);
});
test('server loads before first session and saves/clears persisted credentials',async t=>{
 let saved={apiKey:'persisted-test-key',baseUrl:'https://api.openai.com/v1',model:'persisted-model'},cleared=false;
 const store={async load(){await new Promise(r=>setTimeout(r,20));return saved;},async save(c){saved=c;},async clear(){cleared=true;saved=null;}};
 const app=createWorkbenchServer({configStore:store});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));t.after(()=>app.close());const base=`http://127.0.0.1:${app.server.address().port}`,session=await(await fetch(base+'/api/session')).json();assert.equal(session.ready,true);assert.equal(session.model,'persisted-model');assert.equal(session.reasoningEffort,'auto');assert.ok(session.reasoningEfforts.includes('high'));assert.equal(session.apiKey,undefined);const headers={'Content-Type':'application/json','X-Workbench-Token':session.token};await fetch(base+'/api/config',{method:'POST',headers,body:JSON.stringify({baseUrl:session.baseUrl,model:'updated',reasoningEffort:'xhigh'})});assert.equal(saved.model,'updated');assert.equal(saved.reasoningEffort,'xhigh');assert.equal((await(await fetch(base+'/api/session')).json()).reasoningEffort,'xhigh');const invalid=await fetch(base+'/api/config',{method:'POST',headers,body:JSON.stringify({baseUrl:session.baseUrl,model:'updated',reasoningEffort:'invented'})});assert.equal(invalid.status,400);assert.equal(saved.reasoningEffort,'xhigh');assert.equal(saved.apiKey,'persisted-test-key');await fetch(base+'/api/config',{method:'DELETE',headers});assert.equal(cleared,true);assert.equal((await(await fetch(base+'/api/session')).json()).hasKey,false);
});
