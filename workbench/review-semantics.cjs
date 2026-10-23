const fs=require('node:fs'),path=require('node:path');
const sharp=require('C:/Users/dell/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
require('./templates.js');require('./paper-library.js');require('./paper-renderer.js');require('./semantic-library.js');
const T=FigureTemplates,dir=path.join(__dirname,'semantic-review');fs.mkdirSync(dir,{recursive:true});
(async()=>{
const groups=[['components',T.semanticAdditions.filter(t=>t.unit)],['mechanisms',T.semanticAdditions.filter(t=>!t.unit)]];
for(const [name,items]of groups)for(let page=0;page<Math.ceil(items.length/24);page++){
 const chunk=items.slice(page*24,page*24+24),height=Math.ceil(chunk.length/4)*244+12;let body=`<rect width="1340" height="${height}" fill="#f3f5f0"/>`;
 chunk.forEach((t,i)=>{const x=10+i%4*332,y=10+Math.floor(i/4)*244;body+=`<rect x="${x}" y="${y}" width="322" height="234" fill="white" stroke="#d9e0d6"/><text x="${x+8}" y="${y+16}" font-family="Arial" font-size="10" fill="#475d40">${t.id}</text><svg x="${x}" y="${y+23}" width="322" height="207" viewBox="0 0 320 215">${T.markup(t.id,{label:''}).replace(/^<svg[^>]*>|<\/svg>$/g,'')}</svg>`;});
 await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1340" height="${height}">${body}</svg>`)).png().toFile(path.join(dir,`${name}-${page+1}.png`));
}
fs.writeFileSync(path.join(dir,'index.html'),`<!doctype html><meta charset="utf-8"><title>新增独立条目预览</title><style>body{margin:30px;background:#f3f5f0;font:16px sans-serif;color:#35462f}img{max-width:100%;display:block;margin:20px 0}p{max-width:850px;line-height:1.8}</style><h1>新增独立组件与机制</h1><p>70 个基础组件与 36 个独立机制；每项只展示一张。论文机制与通用机制的适用约束可在工作台中查看。此页用于比较图形，不代表实验结果。</p>`+groups.map(([name,items])=>Array.from({length:Math.ceil(items.length/24)},(_,i)=>`<img src="${name}-${i+1}.png" alt="${name} ${i+1}">`).join('')).join(''));
console.log('Rendered all 106 additions in five contact sheets.');
})();
