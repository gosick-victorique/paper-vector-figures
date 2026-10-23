(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.FigureBoardWorkspace=api;})(typeof window==='object'?window:globalThis,function(){
 const clone=value=>JSON.parse(JSON.stringify(value));
 function load(saved,blank,validate){
  if(saved?.workspaceSchema===1){
   if(!Array.isArray(saved.boards)||!saved.boards.length)throw Error('画板列表无效');
   const ids=new Set();for(const board of saved.boards){if(!board.id||ids.has(board.id)||board.state?.schema!==3)throw Error('画板数据无效');validate(board.state.nodes);ids.add(board.id);}
   if(!ids.has(saved.activeBoardId))throw Error('当前画板无效');return clone(saved);
  }
  const state=saved?.state?.schema===3?saved.state:blank;validate(state.nodes);
  return{workspaceSchema:1,activeBoardId:'board-1',nextBoard:2,boards:[{id:'board-1',name:'画板 1',state:clone(state),versions:clone(saved?.versions||[])}]};
 }
 function current(workspace){return workspace.boards.find(b=>b.id===workspace.activeBoardId);}
 function snapshot(workspace,state,versions){const next=clone(workspace),board=current(next);board.state=clone(state);board.versions=clone(versions);return next;}
 function create(workspace,blank){const next=clone(workspace);let number=next.nextBoard||next.boards.length+1;while(next.boards.some(b=>b.id==='board-'+number))number++;const board={id:'board-'+number,name:'画板 '+number,state:clone(blank),versions:[]};next.boards.push(board);next.activeBoardId=board.id;next.nextBoard=number+1;return next;}
 function select(workspace,id){if(!workspace.boards.some(b=>b.id===id))throw Error('画板不存在');return{...workspace,activeBoardId:id};}
 return{load,current,snapshot,create,select};
});
