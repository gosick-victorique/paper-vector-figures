// Live edit of a separate copy of the bundled FaceShield figure. Does not adopt into the board.
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import Patch from './patch-contract.js';
import Safety from './svg-safety.cjs';
const base='http://127.0.0.1:4318',out=path.resolve('agent-edit-test');await fs.mkdir(out,{recursive:true});
const session=await(await fetch(base+'/api/session')).json();if(!session.ready)throw Error('连接未配置');
const api=async(p,b)=>{const r=await fetch(base+p,{method:b?'POST':'GET',headers:{'Content-Type':'application/json','X-Workbench-Token':session.token},...(b?{body:JSON.stringify(b)}:{})});if(!r.ok)throw Error((await r.json()).error);return r;};
const ctx={window:{}};vm.runInNewContext(await fs.readFile('figure-data.js','utf8'),ctx);const doc=Safety.parse(ctx.window.FIGURE_SOURCE),root=doc.documentElement,group=Array.from(root.childNodes).find(n=>n.nodeType===1&&n.tagName==='g');
const elements=Array.from(group.childNodes).filter(n=>n.nodeType===1),selected=[12,13,14,15,16];
const nodes={background:{id:'background',type:'component',parent:null,name:'其余论文图：保持原样',x:0,y:0,w:1200,h:740,scale:1,locked:true},'background-art':{id:'background-art',parent:'background',type:'leaf',kind:'g',name:'未选内容',asset:'source-background',x:0,y:0,w:1200,h:740,originX:0,originY:0,scale:1,locked:false},projector:{id:'projector',type:'component',parent:null,name:'CLIP projector',x:198,y:132,w:129,h:71,scale:1,locked:false}};
const boxes=[[198,132,129,9],[315,132,12,71],[198,141,117,62],[228,145,56,25],[212,172,89,23]];
selected.forEach((i,k)=>{const[x,y,w,h]=boxes[k];nodes['element-'+i]={id:'element-'+i,parent:'projector',type:'leaf',kind:elements[i].tagName,name:i<15?'投影器块面':'投影器标签',x:x-198,y:y-132,w,h,originX:x,originY:y,scale:1,locked:false,markup:Safety.serialize(elements[i])};});
const defs=Safety.serialize(root.getElementsByTagName('defs')[0]);
const drawing=selected.map(i=>{const n=nodes['element-'+i];return`<g data-id="${n.id}" transform="translate(${n.x} ${n.y})"><g transform="translate(${-n.originX} ${-n.originY})">${n.markup}</g></g>`;}).join('');
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="740" viewBox="0 0 1200 740">${defs}<rect width="1200" height="740" fill="white"/><g id="scene" font-family="Arial, Helvetica, sans-serif" stroke-linejoin="round" stroke-linecap="round"><g data-id="background"><g data-id="background-art"><g>${elements.filter((_,i)=>!selected.includes(i)).map(e=>Safety.serialize(e)).join('')}</g></g></g><g data-id="projector" transform="translate(198 132)">${drawing}</g></g></svg>`;
const paper=await(await api('/api/paper/default')).json();
const task={schema:'paper-figure-workbench/0.4',paper:paper.title,paperContent:paper.text,purpose:'FaceShield 方法总览中的 CLIP projector 局部视觉优化',scene:nodes,scope:[{id:'projector',name:'CLIP projector'}],allComments:[],comments:[],palette:0,canvas:{viewBox:[0,0,1200,740],widthMm:180,heightMm:111},currentSvg:svg,pendingSelectionNote:'在现有 CLIP projector 模块位置做真正的图形重绘：将当前单个实心长方体改为三张彼此错开的浅立体特征层片，使空间层次更清楚；用中性浅蓝填充和蓝灰线条。保留 CLIP / projector 这两个标签及它们的正确含义，字不能被层片遮挡，整体紧凑。层片是抽象投影特征示意，不表示恰有三层网络或三次计算。允许删除原有三个形状、添加多个独立可编辑图元，并调整本模块内部标签位置。必须实际修改几何结构，不能仅改文字或颜色。不改 projector 父节点位置/缩放；所有新增几何保持在该模块原区域内（全图 x198–327、y132–203），不动外部箭头、其他模块和标题。本轮是快速局部修改，不做整图重构或四评委。输出精确的 operations。',reviewMode:'quick_local'};
task.baseRevision=createHash('sha256').update(Patch.revision({nodes,palette:0,comments:[]})).digest('hex');
let j=await(await api('/api/jobs',task)).json();console.log(JSON.stringify({jobId:j.id,model:session.model}));let last='',start=Date.now();
while(['queued','running','validating'].includes(j.status)){if(Date.now()-start>480000){j=await(await api(`/api/jobs/${j.id}/cancel`,{})).json();break;}await new Promise(r=>setTimeout(r,3000));j=await(await api(`/api/jobs/${j.id}`)).json();if(j.message!==last){last=j.message;console.log(JSON.stringify({status:j.status,message:j.message}));}}
if(j.status!=='completed'){console.log(JSON.stringify(j));throw Error(j.error||j.message);}
const next=Patch.apply({nodes,palette:0,comments:[]},task,{...j,baseRevision:task.baseRevision});
const unchanged=['background','background-art'].every(id=>Patch.stable(nodes[id])===Patch.stable(next.nodes[id]));
const geometryChanged=j.operations.some(o=>o.op!=='update'||Object.keys(JSON.parse(o.payload)).some(k=>['markup','x','y','scale'].includes(k)));
for(const name of ['before.svg','after.svg','before.png','after.png']){const response=await api(`/api/jobs/${j.id}/${name}`);await fs.writeFile(path.join(out,name),Buffer.from(await response.arrayBuffer()));}
const report={jobId:j.id,model:session.model,summary:j.summary,warnings:j.warnings,usage:j.usage,operations:j.operations,backgroundUnchanged:unchanged,geometryChanged};await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
await fs.writeFile(path.join(out,'index.html'),`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>FaceShield · Agent 真实局部修改测试</title><style>body{font-family:Arial,sans-serif;background:#f4f6f5;color:#243931;margin:30px auto;max-width:1400px;padding:20px}h1{font-size:24px}p{line-height:1.7}.comparison{display:grid;grid-template-columns:1fr 1fr;gap:20px}img{width:100%;background:white;border:1px solid #d5ded8}.detail{max-width:900px;display:grid;grid-template-columns:1fr 1fr;gap:20px}a{color:#3b6c85}small{color:#65756b}@media(max-width:800px){.comparison{grid-template-columns:1fr}}</style><h1>FaceShield · 真实 Agent 局部修改</h1><p>${escape(j.summary||'')}</p><p>模型：${escape(session.model)} · ${j.operations.length} 项修改 · 其他内容${unchanged?'保持原样':'发生变化'}。这是独立测试副本，你的画板未被采纳覆盖；四评委未运行。</p><h2>模块局部对比</h2><div class="detail"><div><h3>修改前</h3><img src="before-detail.png"></div><div><h3>修改后</h3><img src="after-detail.png"></div></div><h2>完整图稿</h2><div class="comparison"><div><h3>修改前</h3><a href="before.svg"><img src="before.svg"></a></div><div><h3>修改后</h3><a href="after.svg"><img src="after.svg"></a></div></div><p>${(j.warnings||[]).map(escape).join('<br>')}</p><a href="report.json">查看修改记录</a></html>`);
const sharp=(await import('sharp')).default;for(const side of ['before','after'])await sharp(await fs.readFile(path.join(out,side+'.svg'))).extract({left:188,top:122,width:149,height:91}).resize({width:596}).png().toFile(path.join(out,side+'-detail.png'));
console.log(JSON.stringify(report));if(!unchanged||!geometryChanged)process.exitCode=1;
