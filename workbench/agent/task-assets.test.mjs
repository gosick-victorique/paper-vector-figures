import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {compactTask,writeTaskAssets,restoreTaskAssets} from './task-assets.mjs';
import {buildAgentPrompt} from './prompts.mjs';
test('embedded images become small task references and round-trip through returned operations',async()=>{
 const bytes=Buffer.alloc(1024*1024,17),url='data:image/png;base64,'+bytes.toString('base64'),markup=`<image href="${url}"/>`;
 const task={taskType:'edit',scene:{a:{markup},b:{markup}},currentSvg:'<svg/>'},prepared=compactTask(task);
 assert.equal(prepared.assets.size,1);assert.ok(buildAgentPrompt(task).input.length<3000);assert.equal(task.scene.a.markup,markup);
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'figure-assets-test-')),assets=await writeTaskAssets(task,dir),asset=prepared.context.imageAssets[0];
 assert.deepEqual(await fs.readFile(path.join(dir,asset.file)),bytes);assert.ok((await fs.stat(path.join(dir,'input.json'))).size<2000);
 const result={operations:[{op:'update',id:'a',payload:JSON.stringify({markup:prepared.context.scene.a.markup})}]};assert.equal(JSON.parse(restoreTaskAssets(result,assets).operations[0].payload).markup,markup);
 assert.throws(()=>restoreTaskAssets({operations:[{payload:'figure-image:'+'0'.repeat(64)}]},assets),/不存在/);
});
