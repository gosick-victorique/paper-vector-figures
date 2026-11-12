const {test,expect}=require('@playwright/test');
const PDFDocument=require('pdfkit');
async function ready(page){await page.goto('/');await page.waitForFunction(()=>window.FigureDocumentImport&&document.querySelector('#canvas-settings-open')&&document.querySelector('.app-menus'));}
async function pdf(){const doc=new PDFDocument({info:{Title:'Test paper'}}),chunks=[];const ready=new Promise(resolve=>{doc.on('data',b=>chunks.push(b));doc.on('end',()=>resolve(Buffer.concat(chunks)));});doc.text('First page: method input.');doc.addPage();doc.text('Second page: experimental evidence.');doc.end();return ready;}
test('PDF preview selects pages and only writes after apply; import can be undone',async({page},info)=>{
 await ready(page);await page.evaluate(()=>FigureBoard.setDocument({content:'Existing evidence'}));
 await page.getByRole('button',{name:'生成图片',exact:true}).click();await expect(page.locator('#agent-dialog')).toBeVisible();
 await page.locator('#agent-paper-file').setInputFiles({name:'paper.pdf',mimeType:'application/pdf',buffer:await pdf()});
 await expect(page.locator('#document-apply')).toBeEnabled();await expect(page.locator('#document-text')).toHaveValue(/First page[\s\S]*Second page/);
 expect(await page.evaluate(()=>FigureBoard.getState().document.content)).toBe('Existing evidence');
 await page.locator('#document-from').fill('2');await page.locator('#document-to').fill('2');await page.locator('#document-extract').click();await expect(page.locator('#document-text')).toHaveValue(/第 2 页/);await expect(page.locator('#document-text')).not.toHaveValue(/First page/);
 await page.screenshot({path:info.outputPath('pdf-import.png')});
 await page.locator('#document-mode').selectOption('append');await page.locator('#document-apply').click();expect(await page.evaluate(()=>FigureBoard.getState().document.content)).toMatch(/Existing evidence[\s\S]*Second page/);
 await expect(page.locator('#agent-paper')).toHaveValue(/Second page/);await page.locator('#agent-close').click();
 await page.evaluate(()=>document.querySelector('#undo').click());expect(await page.evaluate(()=>FigureBoard.getState().document.content)).toBe('Existing evidence');await expect(page.locator('#agent-paper')).toHaveValue('Existing evidence');
 await page.locator('#agent-paper-file').setInputFiles({name:'broken.pdf',mimeType:'application/pdf',buffer:Buffer.from('invalid')});await expect(page.locator('#document-status')).toContainText('有效');await expect(page.locator('#document-apply')).toBeDisabled();
});
test('custom canvas dimensions govern editing, undo, saved projects and exported size',async({page},info)=>{
 await ready(page);await page.getByRole('button',{name:'文件',exact:true}).click();await page.locator('#canvas-settings-open').click();await page.locator('#canvas-preset').selectOption('85,60');await page.screenshot({path:info.outputPath('canvas-settings.png')});await page.locator('#canvas-settings').getByRole('button',{name:'应用尺寸',exact:true}).click();
 await expect(page.locator('#board-size')).toHaveText('85 × 60 mm');await page.evaluate(()=>document.querySelector('#undo').click());await expect(page.locator('#board-size')).toHaveText('180 × 111 mm');
 await page.evaluate(()=>{FigureBoard.resizeCanvas(300,240);FigureBoard.insertComponent({name:'Module',w:100,h:60,leaves:[{type:'leaf',kind:'rect',name:'Rect',x:0,y:0,w:100,h:60,originX:0,originY:0,scale:1,locked:false,markup:'<rect width="100" height="60" fill="#416f89"/>'}]});});
 for(const [axis,value] of [['x',1400],['y',1000]])await page.evaluate(([axis,value])=>{const el=document.querySelector('#position-'+axis);el.value=value;el.dispatchEvent(new Event('change'));},[axis,value]);
 const before=await page.evaluate(()=>FigureBoard.getState());expect(Object.values(before.nodes).find(n=>n.type==='component').x).toBe(1400);expect(Object.values(before.nodes).find(n=>n.type==='component').y).toBe(1000);
 expect(await page.evaluate(()=>{try{FigureBoard.resizeCanvas(85,60);}catch(e){return e.message;}})).toContain('超出新画板');expect(await page.evaluate(()=>FigureBoard.getState())).toEqual(before);
 const svg=await page.evaluate(()=>FigureBoard.snapshot());expect(svg).toContain('width="300mm"');expect(svg).toContain('height="240mm"');expect(svg).toContain('viewBox="0 0 2000 1600"');
 await page.evaluate(()=>FigureBoard.flush());await page.reload();await page.waitForFunction(()=>window.FigureBoard);expect(await page.evaluate(()=>FigureBoard.canvas().widthMm)).toBe(300);
 const bounds=await page.locator('#stage>svg').boundingBox();expect(bounds.width/bounds.height).toBeCloseTo(300/240,2);
 await page.evaluate(()=>{document.querySelector('#new-board').click();FigureBoard.resizeCanvas(40,30);FigureBoard.insertComponent({name:'Oversized',w:800,h:600,leaves:[{type:'leaf',kind:'rect',name:'Rect',x:0,y:0,w:800,h:600,originX:0,originY:0,scale:1,locked:false,markup:'<rect width="800" height="600"/>'}]});});
 const box=await page.evaluate(()=>FigureModel.selectionBounds(FigureBoard.getState()));expect(box.x).toBeGreaterThanOrEqual(0);expect(box.y).toBeGreaterThanOrEqual(0);expect(box.x+box.w).toBeLessThanOrEqual(40*1200/180+.001);expect(box.y+box.h).toBeLessThanOrEqual(200.001);
});
test('dragging a dense scene preserves untouched SVG nodes and remains one undo step',async({page},info)=>{
 await ready(page);
 await page.evaluate(()=>{
  const task=FigureBoard.capture();task.canvas=FigureCanvasSize.fromMm(300,240);
  for(let i=0;i<200;i++){
   const id='dense-'+i,x=40+(i%20)*90,y=100+Math.floor(i/20)*100;
   task.scene[id]={id,type:'component',parent:'custom',name:id,x,y,w:70,h:70,scale:1,locked:false};
   for(let j=0;j<4;j++){const leaf=id+'-leaf-'+j;task.scene[leaf]={id:leaf,parent:id,type:'leaf',kind:'rect',name:leaf,x:(j%2)*30,y:Math.floor(j/2)*30,w:25,h:25,originX:0,originY:0,scale:1,locked:false,markup:'<rect width="25" height="25" fill="#416f89"/>'};}
  }
  task.scene.wire={id:'wire',parent:'custom',type:'leaf',kind:'path',name:'Wire',markup:'<path/>',x:0,y:0,w:1,h:1,scale:1,locked:false,appearance:{stroke:'#123456'},connection:{from:{node:'dense-0',side:'right',offset:.5},to:{node:'dense-1',side:'left',offset:.5},route:'elbow',label:''}};
  task.scope=[{id:'dense-0'}];FigureBoard.importTask(task);document.querySelector('#fit').click();window.untouched=document.querySelector('[data-id="dense-150"]');window.originalWire=FigureBoard.getState().nodes.wire.markup;
 });
 const point=await page.evaluate(()=>{const svg=document.querySelector('#stage>svg'),p=new DOMPoint(67.5,127.5).matrixTransform(svg.getScreenCTM());return{x:p.x,y:p.y};});
 await page.mouse.move(point.x,point.y);await page.mouse.down();await page.keyboard.down('Control');const started=Date.now();await page.mouse.move(point.x+20,point.y+10,{steps:12});
 expect(await page.evaluate(()=>window.untouched===document.querySelector('[data-id="dense-150"]'))).toBe(true);expect(await page.evaluate(()=>FigureBoard.getState().nodes.wire.markup!==window.originalWire)).toBe(true);await expect(page.locator('[data-id="wire"] path').first()).toHaveAttribute('stroke','#123456');await page.mouse.up();await page.keyboard.up('Control');
 const moved=await page.evaluate(()=>FigureBoard.getState().nodes['dense-0']);expect(moved.x).toBeGreaterThan(40);expect(moved.y).toBeGreaterThan(100);await page.evaluate(()=>document.querySelector('#undo').click());expect(await page.evaluate(()=>FigureBoard.getState().nodes['dense-0'].x)).toBe(40);
 await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x+25,point.y+15);await page.keyboard.press('Escape');await page.mouse.up();expect(await page.evaluate(()=>FigureBoard.getState().nodes['dense-0'].x)).toBe(40);
 await page.evaluate(()=>document.querySelector('#undo').click());expect(await page.evaluate(()=>FigureBoard.getState().nodes['dense-0'])).toBeUndefined();
 await info.attach('drag-duration',{body:Buffer.from(JSON.stringify({nodes:1002,pointerSteps:12,elapsedMs:Date.now()-started})),contentType:'application/json'});
});
