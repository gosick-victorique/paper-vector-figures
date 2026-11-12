const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const {EventEmitter}=require('node:events');
function harness(){
 const app=new EventEmitter(),events=[],choices=[];let finishSave;
 const saved=new Promise(resolve=>finishSave=resolve);
 Object.assign(app,{setName(){},setPath(){},getPath:()=>'/test',getVersion:()=> 'test',requestSingleInstanceLock:()=>true,whenReady:()=>new Promise(()=>{}),exit:()=>events.push('exit'),quit:()=>app.emit('before-quit',{preventDefault(){events.push('prevent');}})});
 class Window extends EventEmitter{
  constructor(){super();this.webContents=new EventEmitter();Object.assign(this.webContents,{setWindowOpenHandler(){},executeJavaScript:()=>saved});}
  isDestroyed(){return false;}getNormalBounds(){return{width:1000,height:800};}async loadURL(){}close(){this.emit('close',{preventDefault(){events.push('prevent-close');}});}show(){}
 }
 const electron={app,BrowserWindow:Window,Menu:{},protocol:{registerSchemesAsPrivileged(){}},shell:{},session:{},dialog:{async showMessageBox(){return{response:choices.shift()||0};}}};
 const context={require:name=>name==='electron'?electron:name==='node:fs/promises'?{async writeFile(){},async readFile(){throw Error('No saved window');}}:require(name),__dirname:path.resolve(__dirname,'../desktop'),process,console,setTimeout,clearTimeout};
 vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../desktop/main.cjs'),'utf8')+'\nglobalThis.hooks={createWindow,confirmSaved,setBackend(value){backend=value;},windows};',context);
 return{app,events,choices,hooks:context.hooks,finishSave};
}
test('desktop quit waits for renderer persistence before closing its backend',async()=>{
 const h=harness();h.hooks.windows.add({isDestroyed:()=>false,webContents:{executeJavaScript:()=>new Promise(resolve=>{h.release=resolve;})}});
 h.hooks.setBackend({close:async()=>h.events.push('backend-close')});h.app.quit();h.app.quit();assert.deepEqual(h.events,['prevent','prevent']);h.release();await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(h.events,['prevent','prevent','backend-close','exit']);
});
test('desktop save failure lets users return to backup or explicitly discard changes',async()=>{
 const h=harness(),win={isDestroyed:()=>false,webContents:{executeJavaScript:async()=>{throw Error('quota');}}};
 assert.equal(await h.hooks.confirmSaved([win]),false);h.choices.push(1);assert.equal(await h.hooks.confirmSaved([win]),true);
});

test('closing a secondary window waits for pending storage writes',async()=>{
 const h=harness(),win=await h.hooks.createWindow('figure://studio/',false);win.close();
 assert.deepEqual(h.events,['prevent-close']);h.finishSave();await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(h.events,['prevent-close']);
});
