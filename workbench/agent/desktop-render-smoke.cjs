// Launch with Electron. All BrowserWindows remain hidden; no external service.
const {app}=require('electron');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
app.whenReady().then(async()=>{
 let service,runtime;const dir=await fs.mkdtemp(path.join(os.tmpdir(),'figure-electron-render-'));
 try{
  const {createWorkbenchServer}=await import('./server.mjs'),{createBrowserRuntime}=await import('./browser-runtime.mjs');
  service=createWorkbenchServer({jobsDir:dir});await new Promise(r=>service.server.listen(0,'127.0.0.1',r));
  runtime=await createBrowserRuntime({url:`http://127.0.0.1:${service.server.address().port}`});
  const catalog=await runtime.catalog();assert.ok(catalog.some(a=>a.id.startsWith('icon:')));assert.ok(catalog.some(a=>a.id.startsWith('foundation-')));
  for(const prefix of ['icon:','foundation-','inspired-','paper-']){const item=catalog.find(a=>a.id.startsWith(prefix));assert.ok(item);const asset=await runtime.asset({id:item.id});require('./svg-safety.cjs').validateMarkup(asset.markup,'ai-asset-e0');assert.ok(asset.w>0&&asset.h>0);}
  await assert.rejects(runtime.asset({id:'network',options:{color:'"><script/>'}}));
  const result=await runtime.equation({source:'\\sum_{i=1}^n x_i',fontPt:12,color:'#23313c'});assert.ok(result.markup.includes('<path'));
  const source=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200"><rect width="400" height="200" fill="white"/><g data-id="formula" data-type="leaf" transform="translate(20 30)">${result.markup}</g></svg>`;
  const view=await runtime.render(source,{path:path.join(dir,'equation.png')});assert.ok(view.png.length>1000);assert.equal(view.measurement.leaves.length,1);assert.equal(view.checks.issues.length,0);
  const {verifyExport}=await import('./review-artifacts.mjs'),exported=await verifyExport(source);assert.equal(exported.report.status,'verified');assert.ok(exported.png.length>100);await fs.writeFile(path.join(dir,'export-preview.png'),exported.png);
  console.log('PASS bundled Electron hidden rendering / MathJax / catalog / PNG: '+dir);
 }finally{await runtime?.close();await service?.close();}
}).then(()=>app.exit(0),e=>{console.error(e);app.exit(1);});
