import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';
const script=`$ErrorActionPreference='Stop'; [void][Reflection.Assembly]::LoadWithPartialName('System.Security'); $r=[Console]::In.ReadToEnd() | ConvertFrom-Json; $scope=[Security.Cryptography.DataProtectionScope]::CurrentUser; if($r.mode -eq 'protect'){ $bytes=[Text.Encoding]::UTF8.GetBytes($r.value); [Console]::Out.Write([Convert]::ToBase64String([Security.Cryptography.ProtectedData]::Protect($bytes,$null,$scope))) } else { $bytes=[Convert]::FromBase64String($r.value); [Console]::Out.Write([Text.Encoding]::UTF8.GetString([Security.Cryptography.ProtectedData]::Unprotect($bytes,$null,$scope))) }`;
function crypt(mode,value){return new Promise((resolve,reject)=>{
 if(process.platform!=='win32')return reject(Error('此版本的持久化凭据需要 Windows 用户加密服务'));
 const exe=path.join(process.env.SystemRoot||'C:/Windows','System32/WindowsPowerShell/v1.0/powershell.exe');
 const p=spawn(exe,['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],{windowsHide:true,stdio:['pipe','pipe','pipe']});let out='';
 p.stdout.on('data',b=>out+=b);p.stderr.resume();p.on('error',()=>reject(Error('无法启动本机凭据加密服务')));p.on('close',code=>code===0?resolve(out.trim()):reject(Error('无法读取或保存本机加密凭据')));p.stdin.on('error',()=>{});p.stdin.end(JSON.stringify({mode,value}));
});}
export function createConfigStore(file=path.join(process.env.LOCALAPPDATA||os.homedir(),'PaperFigureWorkbench','connection.json')){
 return{
  async load(){let c;try{c=JSON.parse(await fs.readFile(file,'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw Error('连接配置文件不可读，请重新保存连接');}return{baseUrl:c.baseUrl,model:c.model,reasoningEffort:c.reasoningEffort??'auto',apiKey:c.encryptedKey?await crypt('unprotect',c.encryptedKey):''};},
  async save(c){const encryptedKey=c.apiKey?await crypt('protect',c.apiKey):'';await fs.mkdir(path.dirname(file),{recursive:true});const temp=file+'.tmp';await fs.writeFile(temp,JSON.stringify({version:1,baseUrl:c.baseUrl,model:c.model,reasoningEffort:c.reasoningEffort??'auto',encryptedKey}),{mode:0o600});await fs.rename(temp,file);},
  async clear(){await fs.rm(file,{force:true});}
 };
}
