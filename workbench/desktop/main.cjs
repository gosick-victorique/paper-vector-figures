const {app,BrowserWindow,Menu,protocol,shell,dialog,session}=require('electron');
const path=require('node:path');
const fs=require('node:fs/promises');
const {pathToFileURL}=require('node:url');

// A stable, private origin keeps browser storage independent of the service port.
protocol.registerSchemesAsPrivileged([{scheme:'figure',privileges:{standard:true,secure:true,supportFetchAPI:true,stream:true}}]);
app.setName('Figure Studio');
app.setPath('userData',path.join(app.getPath('appData'),'FigureStudio'));
const home='figure://studio/';
const windows=new Set();
let backend,baseUrl,mainWindow,quitting=false;
const writeStatus=data=>fs.writeFile(path.join(app.getPath('userData'),'desktop-status.json'),JSON.stringify({version:app.getVersion(),pid:process.pid,time:new Date().toISOString(),...data},null,2)).catch(()=>{});
const local=url=>{try{const u=new URL(url);return u.protocol==='figure:'&&u.hostname==='studio'&&!u.port&&!u.username&&!u.password;}catch{return false;}};
async function openExternal(url){try{const u=new URL(url);if(u.protocol==='https:'&&!u.username&&!u.password)await shell.openExternal(u.href);}catch{}}

async function createWindow(url=home,primary=false){
 let bounds={width:1440,height:940};
 if(primary){try{const s=JSON.parse(await fs.readFile(path.join(app.getPath('userData'),'window.json'),'utf8'));if(Number.isFinite(s.width)&&Number.isFinite(s.height))bounds={width:Math.max(900,Math.min(2400,s.width)),height:Math.max(650,Math.min(1600,s.height))};}catch{}}
 const win=new BrowserWindow({...bounds,minWidth:900,minHeight:650,show:false,title:'Figure Studio',backgroundColor:'#f0f3f2',icon:path.join(__dirname,'icon.png'),webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}});
 windows.add(win);if(primary)mainWindow=win;
 win.webContents.setWindowOpenHandler(({url})=>{if(local(url))void createWindow(url).catch(reportError);else void openExternal(url);return{action:'deny'};});
 win.webContents.on('will-navigate',(event,url)=>{if(!local(url)){event.preventDefault();void openExternal(url);}});
 win.webContents.on('will-attach-webview',event=>event.preventDefault());
 win.on('close',()=>{if(primary&&!win.isDestroyed()){const b=win.getNormalBounds();void fs.writeFile(path.join(app.getPath('userData'),'window.json'),JSON.stringify({width:b.width,height:b.height})).catch(()=>{});}});
 win.on('closed',()=>windows.delete(win));
 win.once('ready-to-show',()=>win.show());
 await win.loadURL(url);if(primary)await writeStatus({state:'ready',origin:home,service:baseUrl});return win;
}
function reportError(error){void writeStatus({state:'error'});dialog.showErrorBox('Figure Studio',error?.message||'应用启动失败');}

async function start(){
 const root=app.getAppPath();
 process.env.FIGURE_SKILL_PATH=path.join(process.resourcesPath,'skill');
 if(!app.isPackaged)process.env.FIGURE_SKILL_PATH=path.join(root,'.desktop-resources','skill');
 await fs.mkdir(app.getPath('userData'),{recursive:true});
 await fs.access(path.join(process.env.FIGURE_SKILL_PATH,'SKILL.md'));
 const {createWorkbenchServer}=await import(pathToFileURL(path.join(root,'agent','server.mjs')).href);
 const {createConfigStore}=await import(pathToFileURL(path.join(root,'agent','config-store.mjs')).href);
 backend=createWorkbenchServer({jobsDir:path.join(app.getPath('userData'),'jobs'),configStore:createConfigStore()});
 await new Promise((resolve,reject)=>{backend.server.once('error',reject);backend.server.listen(0,'127.0.0.1',resolve);});
 baseUrl=`http://127.0.0.1:${backend.server.address().port}`;
 protocol.handle('figure',async request=>{
  if(!local(request.url))return new Response('Not found',{status:404});
  const u=new URL(request.url),headers=new Headers();
  for(const name of ['content-type','x-workbench-token','accept']){const value=request.headers.get(name);if(value)headers.set(name,value);}
  headers.set('origin',baseUrl);
  try{
   const options={method:request.method,headers,redirect:'error',signal:request.signal};
   if(!['GET','HEAD'].includes(request.method))options.body=Buffer.from(await request.arrayBuffer());
   const response=await fetch(baseUrl+u.pathname+u.search,options);
   return new Response(response.body,{status:response.status,headers:response.headers});
  }catch{return Response.json({error:'本地服务暂时不可用，请重新打开应用'},{status:503});}
 });
 session.defaultSession.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
 session.defaultSession.setPermissionCheckHandler(()=>false);
 Menu.setApplicationMenu(Menu.buildFromTemplate([
  {label:'文件',submenu:[{label:'打开数据目录',click:()=>shell.openPath(app.getPath('userData'))},{type:'separator'},{label:'退出',role:'quit'}]},
  {label:'编辑',submenu:[{label:'剪切',role:'cut'},{label:'复制',role:'copy'},{label:'粘贴',role:'paste'},{label:'全选',role:'selectAll'}]},
  {label:'视图',submenu:[{label:'刷新',role:'reload'},{label:'全屏',role:'togglefullscreen'}]},
  {label:'帮助',submenu:[{label:'导入网页版画板',click:()=>dialog.showMessageBox({type:'info',title:'导入画板',message:'在网页版下载画板 JSON，然后在桌面版左侧「导入 / 导出」中导入。'})},{label:'关于 Figure Studio',click:()=>dialog.showMessageBox({type:'info',title:'Figure Studio',message:`Figure Studio ${app.getVersion()}`,detail:'论文矢量绘图工作台\n内置英文核心指令与 paper-vector-figures skill。'})}]}
 ]));
 await createWindow(home,true);
}

if(!app.requestSingleInstanceLock())app.quit();
else{
 app.on('second-instance',()=>{if(mainWindow&&!mainWindow.isDestroyed()){if(mainWindow.isMinimized())mainWindow.restore();mainWindow.show();mainWindow.focus();}});
 app.whenReady().then(start).catch(error=>{reportError(error);app.quit();});
 app.on('window-all-closed',()=>app.quit());
 app.on('before-quit',event=>{
  if(quitting||!backend)return;
  event.preventDefault();quitting=true;void writeStatus({state:'closed'});
  const timer=setTimeout(()=>app.exit(),3000);
  backend.close().finally(()=>{clearTimeout(timer);app.exit();});
 });
}
