const {test}=require('node:test'),assert=require('node:assert/strict'),sharp=require('sharp');
const {importMedia,normalizeSvg}=require('./media-import.cjs'),Safety=require('./svg-safety.cjs');
test('normalizes ordinary exported SVG classes, inline styles and nonzero viewBox',()=>{
 const result=normalizeSvg('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="10 20 200 100"><style>.main {fill:#416f89;stroke:#23313c} rect{fill:red}</style><g transform="translate(12 5)"><rect class="main" width="80" height="30" style="fill:#ce713a"/></g></svg>');
 assert.deepEqual(result.viewBox,[10,20,200,100]);assert.match(result.svg,/fill="#ce713a"/);assert.match(result.svg,/stroke="#23313c"/);assert.doesNotMatch(result.svg,/<style/);Safety.parse(result.svg);
});
test('preserves gradients and clips; converts physical SVG sizes',()=>{
 const result=normalizeSvg('<svg xmlns="http://www.w3.org/2000/svg" width="25.4mm" height="1in"><defs><linearGradient id="paint"><stop offset="0" stop-color="red"/></linearGradient></defs><rect width="90" height="90" fill="url(#paint)"/></svg>');assert.equal(result.width,96);assert.equal(result.height,96);assert.match(result.svg,/url\(#paint\)/);
});
test('rejects scripts, external images, entities and unsupported rendering instead of executing or silently dropping them',()=>{
 for(const body of ['<script>alert(1)</script>','<image href="https://example.com/private.png"/>','<rect onclick="alert(1)"/>','<foreignObject/>','<filter/>','<style>@import "https://example.com/a.css";</style>'])assert.throws(()=>normalizeSvg(`<svg viewBox="0 0 100 100">${body}</svg>`));
 assert.throws(()=>normalizeSvg('<!DOCTYPE svg><svg viewBox="0 0 10 10"/>'));assert.throws(()=>normalizeSvg('<svg/>'));assert.throws(()=>normalizeSvg('<svg viewBox="0 0 10 10"><style>.a:hover{fill:red}</style></svg>'));
});
test('raster import embeds pixels, retains alpha and constrains large dimensions',async()=>{
 const raw=await sharp({create:{width:2200,height:400,channels:4,background:{r:12,g:30,b:80,alpha:.4}}}).png().toBuffer();const result=await importMedia({name:'photo.png',type:'image/png',data:raw.toString('base64')});assert.equal(result.kind,'image');assert.equal(result.width,2048);assert.equal(result.resized,true);const meta=await sharp(Buffer.from(result.url.split(',')[1],'base64')).metadata();assert.equal(meta.hasAlpha,true);assert.ok(result.height<400);
 await assert.rejects(importMedia({name:'bad.png',data:Buffer.from('not an image').toString('base64')}));
});
