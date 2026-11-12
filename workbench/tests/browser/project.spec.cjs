const {test,expect}=require('@playwright/test');
const fs=require('node:fs/promises');
async function ready(page){await page.goto('/');await page.waitForFunction(()=>window.FigureBoard&&document.querySelector('#backup-project'));}
async function sample(page){
 await page.evaluate(()=>{
  FigureBoard.insertComponent({name:'测试模块',w:200,h:100,leaves:[{type:'leaf',kind:'rect',name:'背景',x:0,y:0,w:200,h:100,originX:0,originY:0,scale:1,locked:false,markup:'<rect width="200" height="100" rx="8" fill="#416f89"/>'},{type:'leaf',kind:'text',name:'中文标签',x:15,y:20,w:150,h:30,originX:15,originY:20,scale:1,locked:false,markup:'<text x="15" y="45" font-size="24" fill="white">论文示意图</text>'}]});
  FigureBoard.setDocument({title:'导出验证',content:'Test paper'});
 });await page.evaluate(()=>FigureBoard.flush());
}
test('current canvas exports SVG, PNG and PDF without editor overlays',async({page},info)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await ready(page);await sample(page);
 await page.getByRole('button',{name:'文件',exact:true}).click();await page.locator('#export-figure').click();
 for(const format of ['svg','png','pdf']){
  if(!await page.locator('#export-dialog').isVisible())await page.evaluate(()=>document.querySelector('#export-figure').click());
  await page.locator('#export-format').selectOption(format);
  const pending=page.waitForEvent('download',{timeout:8000});await page.locator('#export-submit').click();const file=await pending;const out=info.outputPath('figure.'+format);await file.saveAs(out);const data=await fs.readFile(out);expect(data.length).toBeGreaterThan(100);
  if(format==='svg'){expect(data.toString()).toContain('论文示意图');expect(data.toString()).not.toContain('data-editor');expect(data.toString()).not.toContain('data-component-hit');}
  if(format==='pdf')expect(data.toString('latin1',0,5)).toBe('%PDF-');
 }
 await page.screenshot({path:info.outputPath('editor.png')});expect(errors).toEqual([]);
});
test('large documents survive reload and a complete backup imports boards and versions',async({page},info)=>{
 await ready(page);await sample(page);
 await page.evaluate(()=>{document.querySelector('#save-version').click();FigureBoard.setDocument({content:'正文'.repeat(3*1024*1024)});});await page.evaluate(()=>FigureBoard.flush());
 await page.reload();await page.waitForFunction(()=>window.FigureBoard&&document.querySelector('#backup-project'));expect(await page.evaluate(()=>FigureBoard.getState().document.content.length)).toBe(6*1024*1024);
 await page.evaluate(()=>document.querySelector('#new-board').click());await page.evaluate(()=>{FigureBoard.setDocument({title:'第二张'});document.querySelector('#save-version').click();});await page.evaluate(()=>FigureBoard.flush());
 const pending=page.waitForEvent('download');await page.evaluate(()=>document.querySelector('#backup-project').click());const backup=await pending,path=info.outputPath('project.json');await backup.saveAs(path);
 const saved=JSON.parse(await fs.readFile(path,'utf8'));expect(saved.workspace.boards).toHaveLength(2);expect(saved.workspace.boards[0].versions).toHaveLength(1);
 await page.locator('#project-file-input').setInputFiles(path);await expect.poll(()=>page.evaluate(()=>FigureBoard.project().boards.length)).toBe(4);await page.evaluate(()=>FigureBoard.flush());
 await page.reload();await page.waitForFunction(()=>window.FigureBoard);expect(await page.evaluate(()=>FigureBoard.project().boards.length)).toBe(4);expect(await page.evaluate(()=>FigureBoard.getState().document.title)).toBe('第二张');
});
test('legacy localStorage migrates automatically and preserves saved versions',async({page})=>{
 await ready(page);
 await page.evaluate(async()=>{
  const state=FigureScene.blank();state.document.title='旧版项目';localStorage.setItem('figure-studio-editor-3',JSON.stringify({state,versions:[{time:'12:00',state}]}));
 });
 await page.reload();await page.waitForFunction(()=>window.FigureBoard&&document.querySelector('#backup-project'));
 expect(await page.evaluate(()=>FigureBoard.getState().document.title)).toBe('旧版项目');expect(await page.evaluate(()=>FigureBoard.project().boards[0].versions.length)).toBe(1);expect(await page.evaluate(()=>localStorage.getItem('figure-studio-editor-3'))).toBeNull();
});
test('formula and chart remain editable after saving and export as vectors',async({page},info)=>{
 await ready(page);
 await page.evaluate(async()=>{
  const config={source:'\\frac{a+b}{c} + \\sum_{i=1}^{n}x_i',fontPt:12,color:'#23313c',display:true};
  FigureBoard.saveEquation(null,config,await FigureEquation.render(config));
  const y=document.querySelector('#position-y');y.value=40;y.dispatchEvent(new Event('change'));
  FigureBoard.saveChart(null,{title:'实验曲线',text:'X,A\n1,10\n2,20',x:0,type:'line',series:[{column:1,name:'Series A',color:'#326c99'}]});
 });await page.evaluate(()=>FigureBoard.flush());
 await page.reload();await page.waitForFunction(()=>window.FigureEquation&&document.querySelector('#export-figure'));
 expect(await page.evaluate(()=>Object.values(FigureBoard.getState().nodes).find(n=>n.equation)?.equation.source)).toContain('\\frac');
 expect(await page.evaluate(()=>Object.values(FigureBoard.getState().nodes).find(n=>n.chart)?.chart.text)).toBe('X,A\n1,10\n2,20');
 await page.evaluate(()=>document.querySelector('#export-figure').click());await page.locator('#export-format').selectOption('pdf');const download=page.waitForEvent('download',{timeout:8000});await page.locator('#export-submit').click();await(await download).saveAs(info.outputPath('equation.pdf'));
});
test('a second window reports a save conflict instead of overwriting the first',async({page,context})=>{
 await ready(page);const second=await context.newPage();await ready(second);
 await page.evaluate(()=>FigureBoard.setDocument({title:'第一窗口'}));await page.evaluate(()=>FigureBoard.flush());
 await second.evaluate(()=>FigureBoard.setDocument({title:'第二窗口'}));const error=await second.evaluate(()=>FigureBoard.flush().catch(e=>e.message));expect(error).toContain('另一窗口');await expect(second.locator('#save-state')).toContainText('保存失败');
 await page.reload();await page.waitForFunction(()=>window.FigureBoard);expect(await page.evaluate(()=>FigureBoard.getState().document.title)).toBe('第一窗口');
});
for(const failAdoption of [false,true])test(failAdoption?'failed automatic adoption keeps the result open and shows the error':'AI polling reconnects after a transient failure and adopts the result',async({page})=>{
 await ready(page);await sample(page);
 await page.evaluate(()=>{document.querySelector('#agent-url').value='https://example.invalid/v1';document.querySelector('#agent-key').value='browser-test-only';document.querySelector('#agent-model').value='test-model';document.querySelector('#agent-connect').click();});
 await expect(page.locator('#agent-connection')).toHaveText('已配置');
 let requests=0;
 await page.route('**/api/jobs/*',route=>{if(route.request().method()==='GET'&&!/\.(svg|png)$/.test(route.request().url())&&requests++===0&&!failAdoption)return route.abort();return route.continue();});
 if(failAdoption)await page.evaluate(()=>{FigureBoard.adopt=()=>{throw Error('测试采纳失败');};});
 await page.evaluate(()=>FigureAgent.edit('edit'));await expect(page.locator('#agent-dialog')).toBeVisible();await page.locator('#agent-instruction').fill('将标签改为 Edited');await page.locator('#agent-preserve-labels').uncheck();await page.locator('#agent-submit').click();
 if(failAdoption){await expect(page.locator('#agent-state')).toContainText('测试采纳失败',{timeout:15000});await expect(page.locator('#agent-dialog')).toBeVisible();expect(await page.evaluate(()=>Object.values(FigureBoard.getState().nodes).some(n=>n.textOverride==='Edited'))).toBe(false);}
 else{await expect(page.locator('#agent-dialog')).not.toBeVisible({timeout:15000});expect(requests).toBeGreaterThan(1);expect(await page.evaluate(()=>Object.values(FigureBoard.getState().nodes).some(n=>n.textOverride==='Edited'))).toBe(true);}
});
