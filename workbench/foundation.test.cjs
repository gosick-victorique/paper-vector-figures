const assert=require('node:assert/strict'),fs=require('node:fs');
for(const file of ['templates','paper-library','paper-renderer','semantic-library','paper-inspiration-data','paper-inspired-templates','foundation-library'])require('./'+file+'.js');
const T=globalThis.FigureTemplates,entries=[...T.foundationIndex.values()];
assert.equal(entries.length,78);assert.equal(Object.keys(T.foundationGroups).length,9);
assert.equal(T.independentCatalog().length,246);assert.equal(T.selectCatalog({view:'paper-patterns'}).length,43);
assert.equal(T.selectCatalog({view:'foundations'}).length,78);
assert.equal(T.selectCatalog({view:'foundations',category:'f-device'}).length,10);
assert.equal(T.selectCatalog({view:'foundations',query:'相机'})[0].key,'camera');
const shapes=new Set();
for(const t of entries){const svg=T.markup(t.id),custom=T.markup(t.id,{strokeWidth:4,fillOpacity:.6,lineStyle:'dashed',color:'#276678',label:'<unsafe> &'});assert.ok(!/NaN|undefined|<image|<script|foreignObject/.test(custom),t.id);assert.ok(svg.includes('<svg'));shapes.add(svg.replace(/<text[\s\S]*?<\/text>/g,''));assert.ok(t.preferredSize.w>0&&t.preferredSize.h>0);assert.equal(t.semanticType,'foundation');if(t.key!=='colorbar'&&t.key!=='ellipsis'&&t.key!=='caption'&&t.key!=='panel-badge'&&t.key!=='point-cloud')assert.ok(custom.includes('stroke-width="4"'),t.id);}
// Text-only templates deliberately share the empty geometry signature.
assert.ok(shapes.size>=76);
assert.ok(T.markup('foundation-caption',{label:'<unsafe> &'}).includes('&lt;unsafe&gt; &amp;'));
assert.ok(!T.selectCatalog({view:'families'}).some(t=>t.semanticType==='foundation'));
const app=fs.readFileSync(__dirname+'/app-v2.js','utf8');
assert.ok(app.includes('materializeTemplate(id,size)'));assert.ok(app.includes('strokeWidth:Number'));assert.ok(app.includes("accent:palettes[state.palette][2]"));
console.log('78 foundational assets: filtering, separate accounting, SVG geometry, parameter application and insertion contracts passed.');
