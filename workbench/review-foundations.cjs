const fs=require('node:fs'),path=require('node:path');
for(const file of ['templates','paper-library','paper-renderer','semantic-library','paper-inspiration-data','paper-inspired-templates','foundation-library'])require('./'+file+'.js');
const sharp=require('C:/Users/dell/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
(async()=>{
 const T=globalThis.FigureTemplates,out=path.join(__dirname,'foundations');fs.mkdirSync(out,{recursive:true});
 const entries=[...T.foundationIndex.values()];
 for(const t of entries)fs.writeFileSync(path.join(out,t.key+'.svg'),T.markup(t.id));
 for(let page=0;page<Math.ceil(entries.length/20);page++){
  const images=[];
  for(let i=0;i<20&&page*20+i<entries.length;i++){
   const t=entries[page*20+i],svg=T.markup(t.id),tile=`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="280"><rect width="320" height="280" fill="white"/><text x="16" y="25" font-family="Arial" font-size="14" fill="#425b68">${t.key}</text><g transform="translate(0 30)">${svg.replace(/<svg[^>]*>/,'').replace('</svg>','')}</g></svg>`;
   images.push({input:await sharp(Buffer.from(tile)).png().toBuffer(),left:i%4*335+7,top:Math.floor(i/4)*295+7});
  }
  await sharp({create:{width:1340,height:1475,channels:3,background:'#e6edef'}}).composite(images).png().toFile(path.join(out,`sheet-${page+1}.png`));
 }
 fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(entries,null,2));
 console.log(entries.length+' editable foundational assets rendered.');
})();
