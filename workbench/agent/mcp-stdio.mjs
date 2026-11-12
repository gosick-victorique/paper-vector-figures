// MCP stdio adapter. Only its own draft capability is supplied, never API keys.
import readline from 'node:readline';
import {drawingTools} from './drawing-tools.mjs';
const input=readline.createInterface({input:process.stdin,crlfDelay:Infinity});
const send=message=>process.stdout.write(JSON.stringify(message)+'\n');
let queue=Promise.resolve();
async function handle(line){
 let m;try{m=JSON.parse(line);}catch{return send({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Parse error'}});}
 if(m.id===undefined)return;
 try{
  let result;
  if(m.method==='initialize')result={protocolVersion:'2024-11-05',capabilities:{tools:{}},serverInfo:{name:'figure-workbench',version:'1.0.0'}};
  else if(m.method==='ping')result={};
  else if(m.method==='tools/list')result={tools:drawingTools};
  else if(m.method==='tools/call'){
   const r=await fetch(process.env.FIGURE_TOOL_URL,{method:'POST',headers:{authorization:'Bearer '+process.env.FIGURE_TOOL_TOKEN,'content-type':'application/json'},body:JSON.stringify({name:m.params?.name,args:m.params?.arguments||{}}),signal:AbortSignal.timeout(90000)});
   if(!r.ok)throw Error('Draft service unavailable');result=await r.json();
  }else return send({jsonrpc:'2.0',id:m.id,error:{code:-32601,message:'Method not found'}});
  send({jsonrpc:'2.0',id:m.id,result});
 }catch(e){send({jsonrpc:'2.0',id:m.id,result:{isError:true,content:[{type:'text',text:e.message}]}});}
}
input.on('line',line=>{queue=queue.then(()=>handle(line)).catch(()=>{});});
input.on('close',()=>void queue.finally(()=>process.exit(0)));
