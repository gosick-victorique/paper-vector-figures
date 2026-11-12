const {test,expect}=require('@playwright/test'),Renderer=require('../../agent/render.cjs');
async function fixture(page){
 await page.goto('/');await page.waitForFunction(()=>window.FigureReview&&window.FigureAgent);
 await page.evaluate(()=>{
  for(const [id,x,y,w,h]of [['a',80,250,120,80],['b',800,250,120,80],['c',470,40,120,80],['d',470,520,120,80],['obstacle',350,260,100,60]])FigureBoard.executeCommand({type:'create_component',id:'ai-'+id,parent:'custom',name:id,x,y,w,h,leaves:[{markup:`<rect width="${w}" height="${h}" fill="#dfeaf0" stroke="#416f89"/>`},{kind:'text',markup:`<text x="10" y="38" font-size="22">${id}</text>`}]});
  for(const [id,from,to,fromSide,toSide]of [['horizontal','a','b','right','left'],['vertical','c','d','bottom','top']])FigureBoard.executeCommand({type:'connect',id:'ai-'+id,parent:'custom',connection:{from:{node:'ai-'+from,side:fromSide,offset:.5},to:{node:'ai-'+to,side:toSide,offset:.5},route:'straight',label:id}});
 });
}
test('rendered connection issues agree with the agent renderer, locate objects and disappear after edits',async({page},info)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await fixture(page);
 const captured=await page.evaluate(async()=>({state:FigureBoard.getState(),task:FigureBoard.capture(),checks:await FigureChecks.inspect(FigureBoard.snapshot())}));
 const crossing=captured.checks.issues.find(i=>i.code==='wire-crossing');expect(crossing.ids.sort()).toEqual(['ai-horizontal','ai-vertical']);expect(crossing.region.x).toBeLessThan(530);expect(crossing.region.y).toBeLessThan(290);expect(captured.checks.issues.some(i=>i.code==='wire-obstacle'&&i.ids.includes('ai-obstacle'))).toBe(true);expect(captured.checks.issues.some(i=>i.code==='wire-text')).toBe(true);expect(captured.checks.counts.connections).toBe(2);expect(captured.checks.truncated).toBe(false);
 const source=Renderer.render(captured.task,captured.state),agentChecks=await page.evaluate(source=>FigureChecks.inspect(source),source);expect(agentChecks.issues.filter(i=>i.code.startsWith('wire-'))).toEqual(captured.checks.issues.filter(i=>i.code.startsWith('wire-')));
 await page.evaluate(()=>document.querySelector('#figure-review-open').click());await expect(page.locator('#figure-review-status')).toContainText('2 条绑定连线');await expect(page.locator('#figure-review-issues')).toContainText('交叉');await expect(page.locator('#figure-review-issues')).toContainText('调整分支顺序');await page.screenshot({path:info.outputPath('connection-diagnostics.png')});
 await page.locator('#figure-review-issues button').filter({hasText:'定位'}).first().click();expect(await page.evaluate(()=>FigureBoard.getState().selection.length)).toBeGreaterThan(0);await expect(page.locator('#figure-review-dialog')).not.toBeVisible();
 await page.evaluate(()=>{FigureBoard.executeCommand({type:'arrange',ids:['ai-c','ai-d'],action:'grid',columns:1,x:950,y:40,gap:400});const c=FigureBoard.getState().nodes['ai-horizontal'].connection;FigureBoard.editConnection('ai-horizontal',{...c,route:'avoid'});});
 const fixed=await page.evaluate(()=>FigureChecks.inspect(FigureBoard.snapshot()));expect(fixed.issues.filter(i=>i.code.startsWith('wire-'))).toEqual([]);
 await page.evaluate(()=>{document.querySelector('#undo').click();document.querySelector('#undo').click();});expect((await page.evaluate(()=>FigureChecks.inspect(FigureBoard.snapshot()))).issues.filter(i=>i.code.startsWith('wire-'))).toEqual(captured.checks.issues.filter(i=>i.code.startsWith('wire-')));expect(errors).toEqual([]);
});
test('connection measurement honors transforms and discloses hidden or unsupported paths',async({page})=>{
 await fixture(page);
 const report=await page.evaluate(async()=>{
  const source='<svg xmlns="http://www.w3.org/2000/svg" viewBox="50 60 600 400"><g transform="translate(50 60) scale(2)"><g data-id="a" data-type="leaf" data-connection-from="one" data-connection-to="two"><g fill="none" stroke="black"><path d="M10 50L100 50"/></g></g><g data-id="b" data-type="leaf" data-connection-from="three" data-connection-to="four"><path d="M50 10L50 100" fill="none" stroke="black"/></g><g data-id="curve" data-type="leaf" data-connection-from="five" data-connection-to="six"><path d="M0 0Q20 40 80 20" fill="none" stroke="black"/></g><g data-id="hidden" data-type="leaf" data-connection-from="seven" data-connection-to="eight"><g opacity="0"><path d="M0 20L100 20" fill="none" stroke="black"/></g></g></g></svg>';
  return FigureChecks.inspect(source);
 });
 expect(report.counts.connections).toBe(2);expect(report.connections.skipped).toBe(2);expect(report.skipped).toBeGreaterThanOrEqual(2);const issue=report.issues.find(i=>i.code==='wire-crossing');expect(issue.region.x).toBeCloseTo(142);expect(issue.region.y).toBeCloseTo(152);expect(report.connections.limitations.join(' ')).toContain('曲线');
});
test('new connection warnings pause automatic adoption and remain inspectable after reload',async({page})=>{
 await page.goto('/');await page.waitForFunction(()=>window.FigureAgent);
 await page.evaluate(()=>{document.querySelector('#agent-url').value='https://example.invalid/v1';document.querySelector('#agent-key').value='browser-test-only';document.querySelector('#agent-model').value='test-model';document.querySelector('#agent-connect').click();});await expect(page.locator('#agent-connection')).toHaveText('已配置');
 await page.evaluate(()=>FigureAgent.edit('generate'));await page.locator('#agent-execution-mode').selectOption('autonomous');await page.locator('#agent-independent').uncheck();await page.locator('#agent-auto-apply').check();await page.locator('#agent-instruction').fill('test-connection-warning');await page.locator('#agent-paper').fill('Synthetic test: a connects to b, c connects to d.');await page.locator('#agent-submit').click();
 await expect(page.locator('#agent-state')).toContainText('待核对',{timeout:15000});await expect(page.locator('#agent-checks-list')).toContainText('交叉');await expect(page.locator('#agent-adopt')).toBeEnabled();expect(await page.evaluate(()=>Object.keys(FigureBoard.getState().nodes))).toEqual(['custom']);
 await page.reload();await page.waitForFunction(()=>window.FigureAgent);await page.locator('#agent-result-open').click();await expect(page.locator('#agent-checks-list')).toContainText('交叉');expect(await page.evaluate(()=>Object.keys(FigureBoard.getState().nodes))).toEqual(['custom']);
 await page.locator('#agent-adopt').click();await expect(page.locator('#agent-dialog')).not.toBeVisible();expect(await page.evaluate(()=>FigureBoard.getState().nodes['ai-horizontal'].connection.route)).toBe('straight');await page.evaluate(()=>document.querySelector('#undo').click());expect(await page.evaluate(()=>Object.keys(FigureBoard.getState().nodes))).toEqual(['custom']);
});
