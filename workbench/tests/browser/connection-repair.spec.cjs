const {test,expect}=require('@playwright/test');
async function fixture(page){await page.goto('/');await page.waitForFunction(()=>window.FigureAgent&&window.FigureConnectionRepair&&document.querySelector('#link-repair'));await page.evaluate(()=>{
 for(const [id,x,y]of [['a',80,200],['b',600,200],['c',320,60],['d',320,400]])FigureBoard.executeCommand({type:'create_component',id:'ai-'+id,parent:'custom',name:id,x,y,w:100,h:80,leaves:[{markup:'<rect width="100" height="80" rx="8" fill="#dfeaf0" stroke="#416f89"/>'},{kind:'text',markup:`<text x="20" y="45" font-size="24">${id}</text>`}]});
 for(const [id,a,b,from,to]of [['horizontal','a','b','right','left'],['vertical','c','d','bottom','top']])FigureBoard.executeCommand({type:'connect',id:'ai-'+id,parent:'custom',connection:{from:{node:'ai-'+a,side:from,offset:.5},to:{node:'ai-'+b,side:to,offset:.5},route:'straight',label:id}});
 FigureBoard.locate(['ai-horizontal']);document.querySelector('#fit').click();
});}
test('manual repair rechecks rendered paths, preserves modules and ports, and adds one undo step',async({page},info)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await fixture(page);const before=await page.evaluate(()=>FigureBoard.getState());
 await page.getByRole('tab',{name:'连线',exact:true}).click();await page.locator('#link-repair').click();await expect(page.locator('#link-repair-status')).toContainText('已调整 1 条连线',{timeout:10000});const after=await page.evaluate(()=>FigureBoard.getState());
 expect(after.nodes['ai-horizontal'].connection.avoidConnections).toBe(true);expect(after.nodes['ai-horizontal'].connection.from).toEqual(before.nodes['ai-horizontal'].connection.from);expect(after.nodes['ai-vertical']).toEqual(before.nodes['ai-vertical']);for(const id of ['ai-a','ai-b','ai-c','ai-d'])expect(after.nodes[id]).toEqual(before.nodes[id]);
 const checks=await page.evaluate(()=>FigureChecks.inspect(FigureBoard.snapshot()));expect(checks.issues.filter(i=>i.code.startsWith('wire-'))).toEqual([]);await page.screenshot({path:info.outputPath('repaired-path.png')});
 const noop=await page.evaluate(()=>FigureBoard.repairConnections({ids:['ai-horizontal']}));expect(noop.status).toBe('unchanged');await page.evaluate(()=>document.querySelector('#undo').click());expect(await page.evaluate(()=>FigureBoard.getState().nodes)).toEqual(before.nodes);
 await page.evaluate(()=>{document.querySelector('#redo').click();return FigureBoard.flush();});await page.reload();await page.waitForFunction(()=>window.FigureAgent);expect(await page.evaluate(()=>FigureBoard.getState().nodes)).toEqual(after.nodes);expect(errors).toEqual([]);
});
test('repair cannot overwrite a concurrent board edit and rejects locked selections',async({page})=>{
 await fixture(page);const result=await page.evaluate(async()=>{const pending=FigureBoard.repairConnections({ids:['ai-horizontal']}).catch(e=>e.message);FigureBoard.executeCommand({type:'arrange',ids:['ai-b'],action:'grid',x:650,y:200});return pending;});expect(result).toContain('图稿或任务状态已变化');expect(await page.evaluate(()=>FigureBoard.getState().nodes['ai-b'].x)).toBe(650);expect(await page.evaluate(()=>FigureBoard.getState().nodes['ai-horizontal'].connection.route)).toBe('straight');
 await page.evaluate(()=>{FigureBoard.locate(['ai-horizontal']);document.querySelector('#lock').click();});expect(await page.evaluate(()=>FigureBoard.repairConnections({ids:['ai-horizontal']}).catch(e=>e.message))).toContain('锁定');
});
