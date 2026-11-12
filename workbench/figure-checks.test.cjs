const {test}=require('node:test'),assert=require('node:assert/strict'),C=require('./figure-checks.js');
const text=(id,box,extra={})=>({id,owner:id,box,text:id,fontPt:8,foreground:[0,0,0],background:[255,255,255],...extra});
test('preflight detects cropped geometry and physical-size labels',()=>{
 const report=C.analyze({width:1200,height:740,leaves:[{id:'outside',box:{x:1180,y:20,w:40,h:20}}],texts:[text('small',{x:20,y:20,w:50,h:10},{fontPt:4})]});assert.deepEqual(report.issues.map(i=>i.code),['outside','small-text']);assert.equal(report.issues[0].severity,'error');
});
test('overlap checks ignore touching boxes and group duplicate findings',()=>{
 const texts=[text('a',{x:10,y:10,w:60,h:20}),text('b',{x:35,y:10,w:60,h:20}),text('c',{x:95,y:10,w:40,h:20})];const report=C.analyze({width:1200,height:740,texts});assert.equal(report.issues.length,1);assert.deepEqual(report.issues[0].ids,['a','b']);
});
test('contrast is measured only against a known opaque background',()=>{
 assert.equal(C.contrast([0,0,0],[255,255,255]),21);assert.equal(C.rgb('rgba(1, 2, 3, 0.5)'),null);
 const report=C.analyze({width:1200,height:740,texts:[text('low',{x:0,y:0,w:40,h:20},{foreground:[220,220,220]}),text('unknown',{x:0,y:40,w:40,h:20},{foreground:[220,220,220],background:null})]});assert.equal(report.issues.length,1);assert.equal(report.issues[0].code,'contrast');
});
test('checks return explicit partial status instead of silently dropping findings',()=>{
 const report=C.analyze({width:100,height:100,leaves:Array.from({length:5},(_,i)=>({id:String(i),box:{x:110,y:0,w:20,h:20}}))},{maxIssues:2});assert.equal(report.issues.length,2);assert.equal(report.truncated,true);
});
