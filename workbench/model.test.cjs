const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const M=require('./model.js');
require('./templates.js');require('./paper-library.js');require('./paper-renderer.js');require('./semantic-library.js');
let passed=0;
function test(name,fn){fn();passed++;process.stdout.write('PASS '+name+'\n');}
function fixture(){return{nodes:{
 group:{id:'group',type:'section',x:0,y:0,scale:1},
 a:{id:'a',parent:'group',type:'component',name:'Clean',x:100,y:100,w:100,h:80,scale:1},
 al:{id:'al',parent:'a',type:'leaf',x:0,y:0,w:100,h:80,scale:1},
 b:{id:'b',parent:'group',type:'component',name:'Protected',x:300,y:100,w:100,h:80,scale:1},
 bl:{id:'bl',parent:'b',type:'leaf',x:0,y:0,w:100,h:80,scale:1},
 c:{id:'c',parent:'group',type:'component',name:'Untouched',x:500,y:100,w:100,h:80,scale:1},
 cl:{id:'cl',parent:'c',type:'leaf',x:0,y:0,w:100,h:80,scale:1}},selection:[],comments:[],nextId:1};}
test('multi-selection moves only chosen components',()=>{const s=fixture();M.choose(s,['a','b']);M.move(s,s.selection,20,15);assert.equal(s.nodes.a.x,120);assert.equal(s.nodes.b.x,320);assert.equal(s.nodes.c.x,500);assert.equal(M.bounds(s,'al').y,115);});
test('parent-child mixed selection does not double movement',()=>{const s=fixture();M.choose(s,['a','al']);assert.deepEqual(s.selection,['a']);M.move(s,s.selection,25,0);assert.equal(M.bounds(s,'al').x,125);});
test('shift selection toggles and preserves other selections',()=>{const s=fixture();M.choose(s,['a']);M.choose(s,['b'],true);assert.deepEqual(s.selection,['a','b']);M.choose(s,['a'],true);assert.deepEqual(s.selection,['b']);});
test('primitive can move without moving its parent or siblings',()=>{const s=fixture();s.nodes.a.scale=2;M.move(s,['al'],20,10);assert.equal(s.nodes.al.x,10);assert.equal(s.nodes.al.y,5);assert.equal(s.nodes.a.x,100);assert.equal(s.nodes.bl.x,0);assert.equal(M.bounds(s,'al').x,120);});
test('locked primitive blocks whole group movement atomically',()=>{const s=fixture();s.nodes.al.locked=true;assert.equal(M.move(s,['a','b'],30,10),false);assert.equal(s.nodes.a.x,100);assert.equal(s.nodes.b.x,300);});
test('ancestor locks prevent primitive movement',()=>{const s=fixture();s.nodes.a.locked=true;assert.equal(M.locked(s,'al'),true);assert.equal(M.move(s,['al'],1,1),false);});
test('multi-object movement clamps as one unit at page edge',()=>{const s=fixture();M.move(s,['a','b'],-200,0);assert.equal(s.nodes.a.x,0);assert.equal(s.nodes.b.x,200);M.move(s,['a','b'],1100,0);assert.equal(s.nodes.b.x,1100);assert.equal(s.nodes.a.x,900);});
test('marquee distinguishes component and primitive levels',()=>{const s=fixture();const box={x:90,y:90,w:320,h:100};assert.deepEqual(M.marquee(s,box,'component'),['a','b']);assert.deepEqual(M.marquee(s,box,'primitive'),['al','bl']);});
test('joint comment retains exact IDs and follows movement',()=>{const s=fixture();const c=M.addComment(s,['a','b'],'  Keep these aligned  ');assert.deepEqual(c.targets,['a','b']);assert.equal(c.text,'Keep these aligned');M.move(s,['a'],30,0);assert.deepEqual(M.commentsFor(s,['a']),[c]);assert.deepEqual(M.commentsFor(s,['al']),[c]);assert.deepEqual(M.commentsFor(s,['c']),[]);});
test('template replacement preserves component comments',()=>{const s=fixture();M.addComment(s,['a','b'],'align');const result=M.replaceChildren(s,'a',[{id:'new',parent:'a',type:'leaf',x:0,y:0,w:50,h:50,scale:1}]);assert.equal(result.ok,true);assert.ok(!s.nodes.al);assert.ok(s.nodes.new);assert.deepEqual(s.comments[0].targets,['a','b']);assert.ok(s.nodes.bl);});
test('template replacement refuses to orphan primitive comments',()=>{const s=fixture();M.addComment(s,['al'],'Make this line darker');const result=M.replaceChildren(s,'a',[]);assert.equal(result.ok,false);assert.ok(s.nodes.al);});
test('template replacement respects descendant lock',()=>{const s=fixture();s.nodes.al.locked=true;assert.equal(M.replaceChildren(s,'a',[]).ok,false);assert.ok(s.nodes.al);});
test('saved snapshot restores transforms, comments and locks',()=>{const s=fixture();M.choose(s,['a','b']);M.addComment(s,s.selection,'joint');M.setLocks(s,['a'],true);const saved=JSON.stringify(s);s.nodes.a.x=800;s.comments=[];const restored=JSON.parse(saved);assert.equal(restored.nodes.a.x,100);assert.equal(restored.comments.length,1);assert.equal(restored.nodes.a.locked,true);assert.deepEqual(restored.selection,['a','b']);});
test('new project starts with an empty editable board and no sample document',()=>{const F=require('./scene-factory.js'),s=F.blank();assert.equal(Object.values(s.nodes).filter(n=>n.type!=='section').length,0);assert.deepEqual(s.document,{title:'',content:'',prompt:''});assert.ok(s.nodes.custom);const next=F.blank();s.document.content='example';assert.equal(next.document.content,'');});
test('every HTML control referenced by app exists',()=>{const html=fs.readFileSync(__dirname+'/index.html','utf8'),js=fs.readFileSync(__dirname+'/app-v2.js','utf8');const ids=[...html.matchAll(/id="([\w-]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);for(const match of js.matchAll(/\$\('#([\w-]+)'\)/g))assert.ok(ids.includes(match[1]),match[1]);for(const match of html.matchAll(/(?:src|href)="([^"]+\.(?:css|js))"/g))assert.ok(fs.existsSync(__dirname+'/'+match[1]),match[1]);});
test('all catalog templates render graphic content and escape labels',()=>{assert.equal(FigureTemplates.catalog.length,546);assert.equal(new Set(FigureTemplates.catalog.map(t=>t.id)).size,546);assert.ok(Object.keys(FigureTemplates.categories).length>=20);for(const t of FigureTemplates.catalog){const svg=FigureTemplates.markup(t.id,{label:'<script>alert(1)</script>'});assert.ok(!svg.includes('<script>'));assert.ok(svg.includes('&lt;script&gt;'));assert.ok(svg.includes('<svg'));assert.ok(t.id==='label'||/<(?:path|rect|circle|ellipse)\b/.test(svg),t.id);assert.ok(!/NaN|undefined|Infinity/.test(svg),t.id);}});
test('canvas hits resolve to group, component or primitive independently',()=>{const s=fixture();assert.equal(M.idAtLevel(s,'al','group'),'group');assert.equal(M.idAtLevel(s,'al','component'),'a');assert.equal(M.idAtLevel(s,'al','primitive'),'al');assert.equal(M.idAtLevel(s,'a','group'),'group');assert.equal(M.idAtLevel(s,'group','component'),null);});
test('group movement keeps descendants together without modifying their local coordinates',()=>{const s=fixture();M.choose(s,['group']);M.move(s,s.selection,40,25);assert.equal(s.nodes.group.x,40);assert.equal(s.nodes.a.x,100);assert.equal(M.bounds(s,'al').x,140);assert.equal(M.bounds(s,'bl').x,340);assert.equal(M.bounds(s,'cl').y,125);});
test('group resize keeps its visible top-left fixed',()=>{const s=fixture(),old=M.bounds(s,'group');assert.equal(M.resize(s,'group',1.5),true);const next=M.bounds(s,'group');assert.equal(next.x,old.x);assert.equal(next.y,old.y);assert.equal(next.w,old.w*1.5);assert.equal(M.bounds(s,'bl').x-M.bounds(s,'al').x,300);});
test('group resize cannot bypass a locked descendant',()=>{const s=fixture();s.nodes.bl.locked=true;assert.equal(M.resize(s,'group',1.5),false);assert.equal(s.nodes.group.scale,1);});
test('group marquee ignores empty sections and global page decorations',()=>{const s=fixture();s.nodes.layout={id:'layout',type:'section',x:0,y:0,scale:1};s.nodes.empty={id:'empty',type:'section',x:0,y:0,scale:1};assert.deepEqual(M.marquee(s,{x:0,y:0,w:1200,h:740},'group'),['group']);});
test('group comments are available from its internal components',()=>{const s=fixture();const c=M.addComment(s,['group'],'Maintain the hierarchy');assert.deepEqual(c.targets,['group']);assert.deepEqual(M.commentsFor(s,['a']),[c]);assert.deepEqual(M.commentsFor(s,['al']),[c]);});
test('100 recipe families have four explicit layouts with referenced evidence',()=>{const T=FigureTemplates;assert.equal(T.recipes.length,100);assert.equal(Object.keys(T.sources).length,21);for(const r of T.recipes){assert.ok(T.sources[r.source]?.url.startsWith('https://'));assert.ok(r.invariant);assert.ok(['direct','context'].includes(r.evidence));const variants=T.catalog.filter(t=>t.family===r.id);assert.equal(variants.length,4);assert.equal(new Set(variants.map(v=>v.view)).size,4);}});
test('drawings are unique even after removing all text and fixing colors',()=>{const crypto=require('node:crypto'),hashes=new Map();for(const t of FigureTemplates.catalog){const svg=FigureTemplates.markup(t.id,{label:'',color:'#416f89',accent:'#ce713a'}).replace(/<text[\s\S]*?<\/text>/g,'');const hash=crypto.createHash('sha256').update(svg).digest('hex');assert.ok(!hashes.has(hash),t.id+' duplicates '+hashes.get(hash));hashes.set(hash,t.id);}assert.equal(hashes.size,546);});
test('nested scaled template glyphs retain placement when flattened',()=>{assert.deepEqual(M.transformBox({x:10,y:20,w:30,h:40},{a:.5,b:0,c:0,d:.5,e:100,f:50}),{x:105,y:60,w:15,h:20});assert.deepEqual(M.transformBox({x:0,y:0,w:20,h:30},{a:0,b:1,c:-1,d:0,e:50,f:10}),{x:20,y:10,w:30,h:20});});
test('independent browsing never multiplies layout variants',()=>{
 const T=FigureTemplates;assert.deepEqual(T.libraryStats(),{components:110,mechanisms:136,independent:246,schemes:546,sources:21});
 assert.equal(T.selectCatalog().length,246);assert.equal(T.selectCatalog({view:'base'}).length,110);assert.equal(T.selectCatalog({view:'mechanisms'}).length,136);assert.equal(T.selectCatalog({view:'new'}).length,106);
 assert.equal(T.selectCatalog({view:'all'}).length,546);assert.equal(T.selectCatalog({view:'spatial'}).length,100);
 assert.ok(T.selectCatalog({source:'dinov3'}).every(t=>t.source==='dinov3'));
 assert.equal(T.selectCatalog({query:'不存在的机制'}).length,0);assert.ok(T.selectCatalog({query:'卷积'}).length>=4);
 const html=fs.readFileSync(__dirname+'/index.html','utf8');assert.ok(html.includes('value="families" selected'));
});
test('new mechanisms define distinct computation relations and valid interfaces',()=>{
 const signatures=new Set();for(const t of FigureTemplates.semanticAdditions.filter(t=>t.semanticType==='mechanism')){
  assert.ok(t.inputs.length&&t.outputs.length&&t.invariant);const names=t.nodes.map(n=>n.id);assert.equal(names.length,new Set(names).size);
  for(const e of t.edges){assert.ok(names.includes(e.from)&&names.includes(e.to));assert.notEqual(e.from,e.to);assert.ok(['data','constraint','supervision','parameter','schedule','control'].includes(e.role));}
  for(const n of t.nodes){assert.ok(t.edges.some(e=>e.from===n.id||e.to===n.id));assert.ok(n.x-n.w/2>=0&&n.x+n.w/2<=320);}
  const signature=JSON.stringify([t.nodes.map(n=>n.icon),t.edges.map(e=>[names.indexOf(e.from),names.indexOf(e.to),e.role])]);assert.ok(!signatures.has(signature),t.id);signatures.add(signature);
 }
 assert.equal(signatures.size,36);
});
test('inserted templates carry their meaning into the skill task scene',()=>{
 const js=fs.readFileSync(__dirname+'/app-v2.js','utf8');assert.ok(js.includes('n.template=templateRecord()'));assert.ok(js.includes('template:templateRecord()'));assert.ok(js.includes('invariant:t.invariant||t.recipe?.invariant||t.hint'));
});
process.stdout.write(passed+' model / contract checks passed. No browser rendering is simulated by these checks.\n');
