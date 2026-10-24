const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const sharp=require('sharp');

async function main(){
 const root=path.resolve(__dirname,'..');
 const repoSkill=path.resolve(root,'..');
 const source=process.env.FIGURE_SKILL_PATH||(await fs.access(path.join(repoSkill,'SKILL.md')).then(()=>repoSkill).catch(()=>path.join(os.homedir(),'.codex','skills','paper-vector-figures')));
 const dest=path.join(root,'.desktop-resources','skill');
 // Rebuild only this generated staging directory; never traverse outside it.
 if(path.dirname(path.dirname(dest))!==root)throw Error('Invalid staging directory');
 await fs.rm(dest,{recursive:true,force:true});await fs.mkdir(dest,{recursive:true});
 await fs.copyFile(path.join(source,'SKILL.md'),path.join(dest,'SKILL.md'));
 await fs.cp(path.join(source,'references'),path.join(dest,'references'),{recursive:true,filter:async p=>(await fs.stat(p)).isDirectory()||p.endsWith('.md')});
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><rect width="256" height="256" rx="54" fill="#315842"/><path d="M71 192V63h112v27h-79v30h65v26h-65v46Z" fill="#f6faf7"/><path d="m162 174 25-14 25 14v29l-25 14-25-14Z" fill="#d4b073"/><path d="m162 174 25 15 25-15M187 189v28" fill="none" stroke="#315842" stroke-width="5"/></svg>';
 const png=await sharp(Buffer.from(svg)).png().toBuffer();await fs.writeFile(path.join(__dirname,'icon.png'),png);
 const header=Buffer.alloc(22);header.writeUInt16LE(1,2);header.writeUInt16LE(1,4);header.writeUInt16LE(1,10);header.writeUInt16LE(32,12);header.writeUInt32LE(png.length,14);header.writeUInt32LE(22,18);await fs.writeFile(path.join(__dirname,'icon.ico'),Buffer.concat([header,png]));
 console.log('Prepared bundled skill and application icon.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
