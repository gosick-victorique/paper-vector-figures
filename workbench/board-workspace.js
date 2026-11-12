(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.FigureBoardWorkspace=api;})(typeof window==='object'?window:globalThis,function(){
 const clone=value=>JSON.parse(JSON.stringify(value));
 function validateState(state,validate){
  (typeof module==='object'?require('./canvas-size.js'):globalThis.FigureCanvasSize).read(state);
  if(state?.schema!==3||!Array.isArray(state.selection)||!Array.isArray(state.comments)||!state.drafts||typeof state.drafts!=='object'||![0,1,2].includes(state.palette)||!Number.isSafeInteger(state.nextId)||state.nextId<1)throw Error('画板数据无效');
  validate(state.nodes);
  if(state.reviewRecord)(typeof module==='object'?require('./evidence-contract.js'):globalThis.FigureEvidence).validateRecord(state.reviewRecord);
  if(state.selection.some(id=>!Object.hasOwn(state.nodes,id))||state.comments.some(c=>!c||typeof c.text!=='string'||!Array.isArray(c.targets)||c.targets.some(id=>!Object.hasOwn(state.nodes,id))))throw Error('画板选区或批注无效');
 }
 function load(saved,blank,validate){
  if(saved?.workspaceSchema===1){
   if(!Array.isArray(saved.boards)||!saved.boards.length||!Number.isSafeInteger(saved.nextBoard)||saved.nextBoard<1)throw Error('画板列表无效');
   const ids=new Set();for(const board of saved.boards){if(!board.id||ids.has(board.id)||typeof board.name!=='string'||!Array.isArray(board.versions))throw Error('画板数据无效');validateState(board.state,validate);for(const version of board.versions)validateState(version.state,validate);ids.add(board.id);}
   if(!ids.has(saved.activeBoardId))throw Error('当前画板无效');return clone(saved);
  }
  if(saved&&saved.state?.schema!==3)throw Error('不支持的项目格式');
  const state=saved?.state?.schema===3?saved.state:blank;validateState(state,validate);for(const version of saved?.versions||[])validateState(version.state,validate);
  return{workspaceSchema:1,activeBoardId:'board-1',nextBoard:2,boards:[{id:'board-1',name:'画板 1',state:clone(state),versions:clone(saved?.versions||[])}]};
 }
 function current(workspace){return workspace.boards.find(b=>b.id===workspace.activeBoardId);}
 function snapshot(workspace,state,versions){return{...workspace,boards:workspace.boards.map(board=>board.id===workspace.activeBoardId?{...board,state:clone(state),versions:clone(versions)}:board)};}
 function create(workspace,blank){const next=clone(workspace);let number=next.nextBoard||next.boards.length+1;while(next.boards.some(b=>b.id==='board-'+number))number++;const board={id:'board-'+number,name:'画板 '+number,state:clone(blank),versions:[]};next.boards.push(board);next.activeBoardId=board.id;next.nextBoard=number+1;return next;}
 function select(workspace,id){if(!workspace.boards.some(b=>b.id===id))throw Error('画板不存在');return{...workspace,activeBoardId:id};}
 function merge(workspace,incoming){
  const next=clone(workspace);let first;
  for(const source of incoming.boards){let id;do{id='board-'+next.nextBoard++;}while(next.boards.some(b=>b.id===id));const board={...clone(source),id};next.boards.push(board);if(source.id===incoming.activeBoardId)first=id;}
  next.activeBoardId=first||next.boards.at(-1).id;return next;
 }
 return{load,current,snapshot,create,select,merge,validateState};
});
