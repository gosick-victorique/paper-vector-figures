import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createWorkbenchServer} from '../agent/server.mjs';
import {fixtureReviewer,runReviewedScenario} from './review-scenario.mjs';
import {runDrawingScenario,drawingSteps} from './autonomous-scenario.mjs';
import {connectionCheckSteps} from './connection-check-scenario.mjs';
const jobsDir=await fs.mkdtemp(path.join(os.tmpdir(),'figure-browser-'));
const app=createWorkbenchServer({jobsDir,reviewer:fixtureReviewer,runner:async({task,draft})=>{
 if(task.pendingSelectionNote==='test-recovery'&&!draft.resumed){for(const [name,args]of drawingSteps.slice(0,4))await draft.call(name,args);throw Error('测试连接中断，草稿已保存');}
 if(draft&&task.pendingSelectionNote==='test-connection-warning'){for(const [name,args]of connectionCheckSteps.slice(0,8))await draft.call(name,args);await draft.call('commit',{requestId:'warning-commit',expectedRevision:draft.revision,summary:'测试交叉连线反馈',warnings:['当前两条连线交叉，需要核对后应用。']});return{result:draft.result};}
 return draft?(task.reviewPolicy==='independent'?await runReviewedScenario(draft):(await runDrawingScenario(draft),{result:draft.result})):({result:{baseRevision:task.baseRevision,summary:'浏览器测试结果',warnings:[],operations:[{op:'update',id:Object.values(task.scene).find(n=>n.kind==='text').id,payload:JSON.stringify(task.pendingSelectionNote==='test-overlap'?{markup:'<text x="15" y="45" font-size="24" fill="white">Alpha</text><text x="18" y="45" font-size="24" fill="white">Beta</text>'}:{textOverride:'Edited'})}]}});
}});
app.server.listen(4329,'127.0.0.1');
process.on('SIGTERM',()=>app.close().then(()=>process.exit()));
