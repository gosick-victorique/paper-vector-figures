const {test,expect}=require('@playwright/test');
test('saved autonomous draft survives reload and resumes through the visible recovery button',async({page},info)=>{
 await page.goto('/');await page.waitForFunction(()=>window.FigureAgent&&window.FigureEquation);
 await page.evaluate(()=>{document.querySelector('#agent-url').value='https://example.invalid/v1';document.querySelector('#agent-key').value='fixture';document.querySelector('#agent-model').value='fixture';document.querySelector('#agent-connect').click();});await expect(page.locator('#agent-connection')).toHaveText('已配置');
 await page.evaluate(()=>FigureAgent.edit('generate'));await page.locator('#agent-execution-mode').selectOption('autonomous');await page.locator('#agent-independent').uncheck();await page.locator('#agent-auto-apply').uncheck();await page.locator('#agent-instruction').fill('test-recovery');await page.locator('#agent-paper').fill('测试资料 Input 经 Encoder 产生 y=f(x)。');
 await page.locator('#agent-budget summary').click();await page.locator('#agent-budget-minutes').fill('10');await page.locator('#agent-budget-calls').fill('80');
 await page.locator('#agent-submit').click();await expect(page.locator('#agent-resume')).toBeVisible({timeout:20000});await expect(page.locator('#agent-state')).toContainText('草稿已保存');
 await page.reload();await page.waitForFunction(()=>window.FigureAgent);await page.locator('#agent-result-open').click();await expect(page.locator('#agent-resume')).toBeVisible({timeout:10000});expect(await page.locator('#agent-budget-minutes').inputValue()).toBe('10');
 await page.screenshot({path:info.outputPath('recovery.png')});await page.locator('#agent-resume').click();await expect(page.locator('#agent-adopt')).toBeEnabled({timeout:20000});await expect(page.locator('#agent-resume')).toBeHidden();await page.locator('#agent-adopt').click();
 expect(await page.evaluate(()=>Object.values(FigureBoard.getState().nodes).filter(n=>n.id==='ai-input').length)).toBe(1);expect(await page.evaluate(()=>FigureBoard.getState().nodes['ai-formula'].equation.source)).toBe('y = f(x)');
});
