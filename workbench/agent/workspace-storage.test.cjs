const {test}=require('node:test');
const assert=require('node:assert/strict');
const {IDBFactory}=require('fake-indexeddb');
const Storage=require('../workspace-storage.js'),W=require('../board-workspace.js'),F=require('../scene-factory.js'),P=require('./patch-contract.js');
const validate=value=>W.load(value,F.blank(),P.validateScene);
const blank=()=>validate(null);
const get=req=>new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
const finish=tx=>new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);});
test('full backups deduplicate images and retain boards, versions, comments and drafts',async()=>{
 let workspace=blank(),state=workspace.boards[0].state;
 const image='data:image/png;base64,'+Buffer.alloc(1024).toString('base64');
 state.nodes.picture={id:'picture',type:'leaf',parent:'custom',kind:'image',name:'图',x:0,y:0,w:10,h:10,scale:1,markup:`<image href="${image}"/>`};
 state.comments=[{id:'c',text:'保留',targets:['picture']}];state.drafts.picture='未提交意见';workspace.boards[0].versions=[{state:structuredClone(state)}];workspace=W.create(workspace,state);
 const packed=await Storage.pack(workspace);assert.equal(Object.keys(packed.assets).length,1);assert.deepEqual(Storage.unpack(packed),workspace);assert.equal(JSON.stringify(packed).split(image).length-1,1);
 const missing=structuredClone(packed);missing.assets={};assert.throws(()=>Storage.unpack(missing),/缺少图片/);
 const restored=W.merge(blank(),validate(Storage.unpack(packed)));assert.equal(restored.boards.length,3);assert.equal(restored.boards[1].versions.length,1);assert.deepEqual(restored.boards[2].state.drafts,state.drafts);
});
test('legacy migration commits before reload and coalesces edits into the newest saved state',async()=>{
 const indexedDB=new IDBFactory(),events=[],storage=Storage.create({indexedDB,onStatus:s=>events.push(s),delay:10000});
 const legacy={state:F.blank(),versions:[]};legacy.state.document.title='旧画板';let {workspace}=await storage.load(()=>legacy,validate);
 workspace.boards[0].state.document.title='第一次';storage.save(structuredClone(workspace));workspace.boards[0].state.document.title='最后一次';storage.save(workspace);assert.equal(storage.isPending(),true);await storage.flush();assert.equal(storage.isPending(),false);storage.close();
 const reader=Storage.create({indexedDB});const loaded=await reader.load(()=>{throw Error('必须先读新存储');},validate);assert.equal(loaded.workspace.boards[0].state.document.title,'最后一次');assert.equal(events.at(-1),'saved');reader.close();
});
test('concurrent windows cannot overwrite newer saved work',async()=>{
 const indexedDB=new IDBFactory(),a=Storage.create({indexedDB,delay:10000}),b=Storage.create({indexedDB,delay:10000});await a.load(null,validate);await b.load(null,validate);
 const first=blank();first.boards[0].state.document.title='窗口 A';a.save(first);await a.flush();b.save(blank());await assert.rejects(b.flush(),/另一窗口/);assert.equal(b.isPending(),true);
 const c=Storage.create({indexedDB});assert.equal((await c.load(null,validate)).workspace.boards[0].state.document.title,'窗口 A');a.close();b.close();c.close();
});
test('invalid current data recovers the previous generation and preserves it on next save',async()=>{
 const indexedDB=new IDBFactory(),storage=Storage.create({indexedDB,delay:10000});await storage.load(null,validate);
 const one=blank();one.boards[0].state.document.title='可恢复';storage.save(one);await storage.flush();storage.save(blank());await storage.flush();storage.close();
 const db=await get(indexedDB.open('figure-studio-projects',1));let tx=db.transaction('workspace','readwrite'),done=finish(tx),record=await get(tx.objectStore('workspace').get('current'));record.project.workspace.boards=[];tx.objectStore('workspace').put(record,'current');await done;
 const reader=Storage.create({indexedDB,delay:10000}),loaded=await reader.load(null,validate);assert.equal(loaded.recovered,true);assert.equal(loaded.workspace.boards[0].state.document.title,'可恢复');reader.save(loaded.workspace);await reader.flush();
 tx=db.transaction('workspace','readonly');const previous=await get(tx.objectStore('workspace').get('previous'));assert.equal(previous.project.workspace.boards[0].state.document.title,'可恢复');reader.close();db.close();
});
test('explicit backup import can recover broken storage while retaining the unreadable record',async()=>{
 const indexedDB=new IDBFactory(),a=Storage.create({indexedDB,delay:10000});await a.load(null,validate);a.save(blank());await a.flush();a.close();
 const db=await get(indexedDB.open('figure-studio-projects',1)),tx=db.transaction('workspace','readwrite'),done=finish(tx),record=await get(tx.objectStore('workspace').get('current'));record.project.workspace.boards=[];tx.objectStore('workspace').put(record,'current');await done;
 const b=Storage.create({indexedDB});await assert.rejects(b.load(null,validate),/无法读取/);await b.recover(blank());assert.ok(await get(db.transaction('workspace').objectStore('workspace').get('unreadable')));b.close();db.close();
});
test('an aborted legacy migration keeps the old project visible and pending for retry',async()=>{
 const indexedDB=new IDBFactory(),open=indexedDB.open.bind(indexedDB);
 indexedDB.open=(...args)=>{const req=open(...args);req.addEventListener('success',()=>{const db=req.result,transaction=db.transaction.bind(db);db.transaction=(stores,mode)=>{const tx=transaction(stores,mode);if(mode==='readwrite')queueMicrotask(()=>tx.abort());return tx;};});return req;};
 const storage=Storage.create({indexedDB}),legacy={state:F.blank(),versions:[]};legacy.state.document.title='迁移失败仍可备份';
 const loaded=await storage.load(legacy,validate);assert.ok(loaded.migrationError);assert.equal(loaded.workspace.boards[0].state.document.title,legacy.state.document.title);assert.equal(storage.isPending(),true);storage.close();
});
