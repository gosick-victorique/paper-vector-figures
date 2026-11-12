const {test,expect}=require('@playwright/test');
async function setup(page){
 await page.goto('/');await page.waitForFunction(()=>window.FigureAgent&&window.FigureConnectionRouting);
 await page.evaluate(()=>{
  for(const [id,name,x,y,w,h]of [['ai-a','Input',80,210,120,80],['ai-b','Output',800,210,120,80],['ai-obstacle','Module',400,160,120,180]])FigureBoard.executeCommand({type:'create_component',id,parent:'custom',name,x,y,w,h,leaves:[{markup:`<rect width="${w}" height="${h}" rx="10" fill="#dfeaf0" stroke="#416f89"/>`},{kind:'text',markup:`<text x="20" y="48" font-size="24" fill="#23313c">${name}</text>`}]});
  FigureBoard.executeCommand({type:'connect',id:'ai-wire',parent:'custom',connection:{from:{node:'ai-a',side:'right',offset:.5},to:{node:'ai-b',side:'left',offset:.5},route:'avoid',label:''}});
 });
}
test('avoid routes are editable, persist through reload, and failed commands do not add undo entries',async({page},info)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await setup(page);const before=await page.evaluate(()=>FigureBoard.getState());
 expect(await page.evaluate(()=>{try{FigureBoard.executeCommand({type:'create_component',id:'ai-wall',parent:'custom',name:'Wall',x:550,y:0,w:80,h:740,leaves:[{markup:'<rect width="80" height="740"/>'}]});}catch(e){return e.message;}})).toContain('无可用路径');expect(await page.evaluate(()=>FigureBoard.getState().nodes)).toEqual(before.nodes);
 await page.evaluate(()=>document.querySelector('#undo').click());expect(await page.evaluate(()=>FigureBoard.getState().nodes['ai-wire'])).toBeUndefined();await page.evaluate(()=>document.querySelector('#redo').click());
 await page.locator('.canvas-tools [data-panel="style"]').click();await page.locator('.canvas-tools [data-route]').selectOption('elbow');expect(await page.evaluate(()=>FigureBoard.getState().nodes['ai-wire'].connection.route)).toBe('elbow');await page.locator('.canvas-tools [data-route]').selectOption('avoid');expect(await page.evaluate(()=>FigureBoard.getState().nodes['ai-wire'].markup)).toBe(before.nodes['ai-wire'].markup);
 await page.evaluate(()=>{FigureBoard.locate(['ai-obstacle']);document.querySelector('#fit').click();});await page.screenshot({path:info.outputPath('obstacle-route.png')});await page.evaluate(()=>FigureBoard.flush());await page.reload();await page.waitForFunction(()=>window.FigureAgent);expect(await page.evaluate(()=>FigureBoard.getState().nodes)).toEqual(before.nodes);expect(errors).toEqual([]);
});
test('dragging rejects blocked or locked reroutes and preserves history, while valid movement remains undoable',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await setup(page);
 await page.evaluate(()=>{FigureBoard.locate(['ai-wire-group']);document.querySelector('#lock').click();FigureBoard.locate(['ai-obstacle']);document.querySelector('#fit').click();});
 async function drag(dx,dy){const p=await page.evaluate(([dx,dy])=>{const m=document.querySelector('#stage>svg').getScreenCTM(),a=new DOMPoint(460,270).matrixTransform(m),b=new DOMPoint(460+dx,270+dy).matrixTransform(m);return{a:{x:a.x,y:a.y},b:{x:b.x,y:b.y}};},[dx,dy]);await page.mouse.move(p.a.x,p.a.y);await page.mouse.down();await page.keyboard.down('Control');await page.mouse.move(p.b.x,p.b.y);await page.mouse.up();await page.keyboard.up('Control');}
 const locked=await page.evaluate(()=>FigureBoard.getState().nodes);await drag(0,-120);expect(await page.evaluate(()=>FigureBoard.getState().nodes)).toEqual(locked);await expect(page.locator('#toast')).toContainText('锁定连线');
 await page.evaluate(()=>document.querySelector('#undo').click());expect(await page.evaluate(()=>FigureBoard.getState().nodes['ai-wire-group'].locked)).toBe(false);const before=await page.evaluate(()=>FigureBoard.getState().nodes);
 await drag(-195,0);expect(await page.evaluate(()=>FigureBoard.getState().nodes)).toEqual(before);await expect(page.locator('#toast')).toContainText('无可用路径');await expect(page.locator('#redo')).toBeEnabled();
 await drag(0,-120);const moved=await page.evaluate(()=>FigureBoard.getState().nodes);expect(moved['ai-obstacle'].y).toBeCloseTo(40,0);expect(moved['ai-wire'].markup).not.toBe(before['ai-wire'].markup);await page.evaluate(()=>document.querySelector('#undo').click());expect(await page.evaluate(()=>FigureBoard.getState().nodes)).toEqual(before);await page.evaluate(()=>document.querySelector('#redo').click());expect(await page.evaluate(()=>FigureBoard.getState().nodes)).toEqual(moved);expect(errors).toEqual([]);
});
