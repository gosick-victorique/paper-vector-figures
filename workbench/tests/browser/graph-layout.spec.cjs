const {test,expect}=require('@playwright/test');
test('flow layout stays editable, keeps bound branches and is one undoable change',async({page},info)=>{
 await page.goto('/');await page.waitForFunction(()=>window.FigureGraphLayout&&window.FigureAgent);
 const before=await page.evaluate(()=>{
  for(const [id,name,x,y]of [['ai-a','Input',80,80],['ai-b','Vision',400,80],['ai-c','Text',80,380],['ai-d','Fusion',500,380]])FigureBoard.executeCommand({type:'create_component',id,parent:'custom',name,x,y,w:150,h:90,leaves:[{markup:'<rect width="150" height="90" rx="10" fill="#dfeaf0" stroke="#416f89"/>'},{kind:'text',markup:`<text x="25" y="53" font-size="24" fill="#23313c">${name}</text>`}]});
  for(const [from,to]of [['ai-a','ai-b'],['ai-a','ai-c'],['ai-b','ai-d'],['ai-c','ai-d']])FigureBoard.executeCommand({type:'connect',id:'ai-wire-'+from.slice(3)+to.slice(3),parent:'custom',connection:{from:{node:from,side:'right',offset:.5},to:{node:to,side:'left',offset:.5},route:'elbow',label:''}});
  return FigureBoard.getState();
 });
 await page.evaluate(()=>FigureBoard.executeCommand({type:'layout_graph',ids:['ai-a','ai-b','ai-c','ai-d'],x:80,y:80,direction:'right'}));
 const after=await page.evaluate(()=>FigureBoard.getState());expect(after.nodes['ai-b'].x).toBe(after.nodes['ai-c'].x);expect(after.nodes['ai-c'].y).toBeGreaterThan(after.nodes['ai-b'].y);expect(after.nodes['ai-wire-ab'].connection).toEqual(before.nodes['ai-wire-ab'].connection);expect(after.nodes['ai-a-e1'].markup).toEqual(before.nodes['ai-a-e1'].markup);
 expect(await page.evaluate(async()=>(await FigureChecks.inspect(FigureBoard.snapshot())).issues.filter(i=>i.severity==='error'))).toEqual([]);await page.screenshot({path:info.outputPath('flow-layout.png')});
 await page.evaluate(()=>document.querySelector('#undo').click());expect(await page.evaluate(()=>FigureBoard.getState().nodes)).toEqual(before.nodes);await page.evaluate(()=>{document.querySelector('#redo').click();return FigureBoard.flush();});await page.reload();await page.waitForFunction(()=>window.FigureAgent);expect(await page.evaluate(()=>FigureBoard.getState().nodes)).toEqual(after.nodes);
});
