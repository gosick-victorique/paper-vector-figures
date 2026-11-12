const {test}=require('node:test'),assert=require('node:assert/strict'),sharp=require('sharp');
const {exportFigure}=require('./export.cjs');
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="180mm" height="111mm" viewBox="0 0 1200 740"><rect width="1200" height="740" fill="white"/><rect x="50" y="50" width="300" height="200" fill="#416f89"/><text x="70" y="100" fill="white" font-size="24">Vector figure</text></svg>';
test('SVG preserves vectors and PNG honors page dimensions and density',async()=>{
 const vector=await exportFigure({svg,format:'svg'});assert.match(vector.data.toString(),/<rect/);assert.match(vector.data.toString(),/180mm/);
 const png=await exportFigure({svg,format:'png',dpi:300}),meta=await sharp(png.data).metadata();assert.equal(meta.width,2126);assert.equal(meta.height,1311);assert.equal(meta.density,300);
});
test('PDF is a physical-size vector page with embedded text',async()=>{
 const pdf=await exportFigure({svg,format:'pdf'}),text=pdf.data.toString('latin1');assert.match(text,/^%PDF-/);assert.match(text,/\/MediaBox \[0 0 510\.23622\d* 314\.64566\d*\]/);assert.doesNotMatch(text,/\/Subtype \/Image/);assert.match(text,/\/Font/);
});

test('custom paper size drives PDF media box and raster resolution',async()=>{
 const custom=svg.replace('180mm','300mm').replace('111mm','240mm').replace('0 0 1200 740','0 0 2000 1600');
 const pdf=await exportFigure({svg:custom,format:'pdf'}),box=pdf.data.toString('latin1').match(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/);
 assert.ok(box);assert.ok(Math.abs(Number(box[1])-300*72/25.4)<.001);assert.ok(Math.abs(Number(box[2])-240*72/25.4)<.001);
 const png=await exportFigure({svg:custom,format:'png',dpi:150}),meta=await sharp(png.data).metadata();assert.equal(meta.width,1772);assert.equal(meta.height,1417);
});
test('PDF supports embedded WebP and Chinese text',async()=>{
 const image=await sharp({create:{width:8,height:8,channels:3,background:'#ce713a'}}).webp().toBuffer();
 const sample=svg.replace('Vector figure','论文示意图').replace('</svg>',`<image x="400" y="50" width="100" height="100" href="data:image/webp;base64,${image.toString('base64')}"/></svg>`);
 const pdf=await exportFigure({svg:sample,format:'pdf'});assert.match(pdf.data.toString('latin1'),/\/Subtype \/Image/);
});
test('exports reject active SVG, external assets and unbounded raster sizes',async()=>{
 await assert.rejects(exportFigure({svg:'<svg><script/></svg>',format:'pdf'}));await assert.rejects(exportFigure({svg:svg.replace('</svg>','<image href="file:///secret.png"/></svg>'),format:'pdf'}));await assert.rejects(exportFigure({svg,format:'png',dpi:10000}));
});
test('static equation metadata permits LaTeX labels without relaxing active SVG restrictions',async()=>{
 const formula=svg.replace('</svg>','<svg x="400" y="200" width="200" height="100" viewBox="0 0 200 100" color="#23313c" aria-label="\\frac{a}{b}"><path d="M0 50 L150 50" stroke="currentColor"/></svg></svg>');
 assert.match((await exportFigure({svg:formula,format:'pdf'})).data.toString('latin1'),/^%PDF-/);
 await assert.rejects(exportFigure({svg:formula.replace('color="#23313c"','onclick="alert(1)"'),format:'pdf'}));
});
test('diagnostic object names remain inert text during export, while active attributes stay forbidden',async()=>{
 const named=svg.replace('<rect x="50"','<rect data-name="\\frac{a+b}{c} &amp; url(example)" x="50"');assert.match((await exportFigure({svg:named,format:'pdf'})).data.toString('latin1'),/^%PDF-/);
 await assert.rejects(exportFigure({svg:named.replace('x="50"','onclick="alert(1)" x="50"'),format:'pdf'}));await assert.rejects(exportFigure({svg:named.replace('fill="#416f89"','fill="url(https://example.invalid/paint)"'),format:'pdf'}));
});
