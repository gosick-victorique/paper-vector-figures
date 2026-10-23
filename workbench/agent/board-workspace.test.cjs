const {test}=require('node:test');
const assert=require('node:assert/strict');
const W=require('../board-workspace.js'),F=require('../scene-factory.js'),P=require('./patch-contract.js');
test('migrates the existing board and saved versions without losing document or comments',()=>{
 const state=F.blank();state.document={title:'论文',content:'正文',prompt:'要求'};state.comments=[{id:'c1',targets:['custom'],text:'保留'}];
 const saved={state,versions:[{time:'12:00',state:structuredClone(state)}]},ws=W.load(saved,F.blank(),P.validateScene);
 assert.deepEqual(W.current(ws).state,state);assert.deepEqual(W.current(ws).versions,saved.versions);
 W.current(ws).state.document.title='修改';assert.equal(saved.state.document.title,'论文');
});
test('new board is empty and isolated; switching and reload preserve each board and its versions',()=>{
 let ws=W.load(null,F.blank(),P.validateScene),first=W.current(ws);first.state.document.title='旧论文';first.state.palette=2;first.versions=[{state:structuredClone(first.state)}];const firstSaved=structuredClone(first);
 ws=W.create(ws,F.blank());const second=ws.activeBoardId;assert.notEqual(second,first.id);assert.deepEqual(W.current(ws).state,F.blank());assert.deepEqual(W.current(ws).versions,[]);
 const edited=structuredClone(W.current(ws).state);edited.document.content='第二篇论文';ws=W.snapshot(ws,edited,[{state:edited}]);assert.deepEqual(ws.boards[0],firstSaved);
 ws=W.select(ws,first.id);assert.deepEqual(W.current(ws),firstSaved);ws=W.load(JSON.parse(JSON.stringify(ws)),F.blank(),P.validateScene);assert.equal(ws.activeBoardId,first.id);
 ws=W.select(ws,second);assert.equal(W.current(ws).state.document.content,'第二篇论文');assert.equal(W.current(ws).versions.length,1);
});
test('rejects invalid workspaces instead of silently replacing saved boards',()=>{
 const ws=W.load(null,F.blank(),P.validateScene);assert.throws(()=>W.select(ws,'missing'));
 assert.throws(()=>W.load({...ws,activeBoardId:'missing'},F.blank(),P.validateScene));
 assert.throws(()=>W.load({...ws,boards:[ws.boards[0],ws.boards[0]]},F.blank(),P.validateScene));
 const broken=structuredClone(ws);broken.boards[0].state.nodes.custom.parent='missing';assert.throws(()=>W.load(broken,F.blank(),P.validateScene));
});
