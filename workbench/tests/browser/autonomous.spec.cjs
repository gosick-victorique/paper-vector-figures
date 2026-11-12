const {test,expect}=require('@playwright/test');
test('autonomous draft observes, revises, commits editable objects, and adopts in one undo',async({page},info)=>{
 await page.goto('/');await page.waitForFunction(()=>window.FigureAgent&&window.FigureEquation);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(()=>{document.querySelector('#agent-url').value='https://example.invalid/v1';document.querySelector('#agent-key').value='browser-test-only';document.querySelector('#agent-model').value='test-model';document.querySelector('#agent-connect').click();});await expect(page.locator('#agent-connection')).toHaveText('已配置');
 await page.evaluate(()=>FigureAgent.edit('generate'));await page.locator('#agent-execution-mode').selectOption('autonomous');await page.locator('#agent-independent').uncheck();await page.locator('#agent-auto-apply').uncheck();await page.locator('#agent-paper').fill('测试资料：Input 经 Encoder 产生 y=f(x)。测试数据 Step,Value: 1,2;2,4;3,3。');
 const response=page.waitForResponse(r=>r.url().endsWith('/api/jobs')&&r.request().method()==='POST');await page.locator('#agent-submit').click();const initial=await(await response).json();
 await expect.poll(async()=>page.evaluate(async id=>{const s=await(await fetch('/api/session')).json();return(await(await fetch('/api/jobs/'+id,{headers:{'X-Workbench-Token':s.token}})).json());},initial.id),{timeout:30000}).toMatchObject({status:'completed'});
 await expect(page.locator('#agent-adopt')).toBeEnabled({timeout:10000});expect(await page.evaluate(()=>Object.keys(FigureBoard.getState().nodes))).toEqual(['custom']);
 await page.screenshot({path:info.outputPath('draft-review.png')});await page.locator('#agent-adopt').click();await expect(page.locator('#agent-dialog')).not.toBeVisible();
 const state=await page.evaluate(()=>FigureBoard.getState());expect(state.nodes['ai-chart'].chart.text).toContain('Step,Value');expect(state.nodes['ai-formula'].equation.source).toBe('y = f(x)');expect(state.nodes['ai-wire'].connection.from.node).toBe('ai-input');expect(state.nodes['ai-input-e1'].markup).toContain('font-size="24"');expect(state.nodes['ai-network'].assetSource.id).toBe('network');
 await page.screenshot({path:info.outputPath('adopted-drawing.png')});
 // Independent browser inspection must agree with draft checks after adoption.
 const report=await page.evaluate(()=>FigureChecks.inspect(FigureBoard.snapshot()));expect(report.issues.filter(i=>i.severity==='error')).toEqual([]);
 await page.evaluate(()=>document.querySelector('#undo').click());expect(await page.evaluate(()=>Object.keys(FigureBoard.getState().nodes))).toEqual(['custom']);await page.evaluate(()=>{document.querySelector('#redo').click();return FigureBoard.flush();});await page.reload();await page.waitForFunction(()=>window.FigureAgent);expect(await page.evaluate(()=>FigureBoard.getState().nodes['ai-chart'].chart.type)).toBe('line');
 // Generated data remains editable through the ordinary workbench editors.
 await page.evaluate(()=>{const c=FigureBoard.getState().nodes['ai-chart'].chart;FigureBoard.saveChart('ai-chart',{...c,title:'User revision'});});expect(await page.evaluate(()=>FigureBoard.getState().nodes['ai-chart'].chart.title)).toBe('User revision');expect(errors).toEqual([]);
});
test('shared manual commands keep chart, equation, connection editing and undo usable',async({page})=>{
 await page.goto('/');await page.waitForFunction(()=>window.FigureEquation&&window.FigureAgent);
 await page.evaluate(async()=>{
  const leaf={markup:'<rect width="100" height="60"/>',w:100,h:60};FigureBoard.insertComponent({name:'A',w:100,h:60,leaves:[leaf]});FigureBoard.insertComponent({name:'B',w:100,h:60,leaves:[leaf]});const ids=Object.values(FigureBoard.getState().nodes).filter(n=>n.type==='component').map(n=>n.id);
  FigureBoard.editConnection(null,{from:{node:ids[0],side:'right',offset:.5},to:{node:ids[1],side:'left',offset:.5},route:'straight',label:''});const wire=Object.values(FigureBoard.getState().nodes).find(n=>n.connection);FigureBoard.editConnection(wire.id,{...wire.connection,route:'elbow'});
  const config={source:'x^2',fontPt:10,color:'#23313c'};FigureBoard.saveEquation(null,config,await FigureEquation.render(config));
 });expect(await page.evaluate(()=>Object.values(FigureBoard.getState().nodes).find(n=>n.connection).connection.route)).toBe('elbow');expect(await page.evaluate(()=>Object.values(FigureBoard.getState().nodes).some(n=>n.equation))).toBe(true);
 await page.evaluate(()=>document.querySelector('#undo').click());expect(await page.evaluate(()=>Object.values(FigureBoard.getState().nodes).some(n=>n.equation))).toBe(false);
});
