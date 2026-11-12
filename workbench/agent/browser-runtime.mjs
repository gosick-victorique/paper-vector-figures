import fs from 'node:fs/promises';
export async function createBrowserRuntime({url,signal}){
 let evaluate,dispose;
 if(process.versions.electron){
  const {BrowserWindow,session}=await import('electron'),isolated=session.fromPartition('figure-render-'+crypto.randomUUID());
  isolated.webRequest.onBeforeRequest((details,callback)=>callback({cancel:!details.url.startsWith(url+'/')&&!details.url.startsWith('data:')&&!details.url.startsWith('blob:')}));
  const win=new BrowserWindow({show:false,width:1600,height:1600,webPreferences:{session:isolated,nodeIntegration:false,contextIsolation:true,sandbox:true,backgroundThrottling:false}});
  dispose=async()=>{if(!win.isDestroyed())win.destroy();};
  try{await win.loadURL(url+'/agent-runtime.html');}catch(e){await dispose();throw e;}
  evaluate=(method,arg)=>win.webContents.executeJavaScript(`window.FigureRuntime[${JSON.stringify(method)}](${JSON.stringify(arg??null)})`);
 }else{
  const {chromium}=await import('playwright-core');
  const options={headless:true};if(process.env.FIGURE_BROWSER_PATH)options.executablePath=process.env.FIGURE_BROWSER_PATH;else options.channel='msedge';
  let browser;try{browser=await chromium.launch(options);}catch{throw Error('自主绘图需要浏览器渲染。请安装 Microsoft Edge，或设置 FIGURE_BROWSER_PATH 指向 Chromium；桌面版使用内置浏览器。');}
  dispose=()=>browser.close();const page=await browser.newPage({viewport:{width:1600,height:1600}});
  await page.route('**/*',route=>route.request().url().startsWith(url+'/')||route.request().url().startsWith('data:')?route.continue():route.abort());
  try{await page.goto(url+'/agent-runtime.html');}catch(e){await dispose();throw e;}
  evaluate=(method,arg)=>page.evaluate(({method,arg})=>window.FigureRuntime[method](arg),{method,arg});
 }
 const abort=()=>void dispose();signal?.addEventListener('abort',abort,{once:true});
 if(signal?.aborted){await dispose();signal.throwIfAborted();}
 return{
  catalog:()=>evaluate('catalog'),asset:arg=>evaluate('asset',arg),equation:arg=>evaluate('equation',arg),
  async render(source,{region,path,maxEdge}={}){signal?.throwIfAborted();const data=await evaluate('show',{source,region,maxEdge});const png=Buffer.from(await evaluate('raster'),'base64');if(path)await fs.writeFile(path,png);return{...data,png};},
  close:async()=>{signal?.removeEventListener('abort',abort);await dispose();}
 };
}
