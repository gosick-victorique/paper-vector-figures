const {test}=require('node:test'),assert=require('node:assert/strict'),C=require('./connection-checks.js'),Checks=require('./figure-checks.js');
const wire=(id,points,extra={})=>({id,points:points.map(([x,y])=>({x,y})),from:id+'-from',to:id+'-to',parent:id+'-group',...extra});
const box=(id,x,y,w,h,ancestors=[])=>({id,box:{x,y,w,h},ancestors});
test('connection diagnostics handle diagonal crossings, corner contacts, common ports and reversed overlaps',()=>{
 const a=wire('a',[[0,0],[100,100]]),b=wire('b',[[0,100],[50,50],[100,0]]),report=C.analyze({connections:[a,b]});assert.equal(report.issues.length,1);assert.equal(report.issues[0].code,'wire-crossing');assert.equal(report.issues[0].magnitude,1);assert.deepEqual(report.issues[0].ids,['a','b']);assert.ok(report.issues[0].region.x<50);assert.ok(report.issues[0].suggestion);
 const overlap=C.analyze({connections:[a,wire('c',[[80,80],[20,20]])]});assert.equal(overlap.issues.length,1);assert.equal(overlap.issues[0].code,'wire-overlap');assert.ok(Math.abs(overlap.issues[0].magnitude-Math.sqrt(2)*60)<.001);
 assert.equal(C.analyze({connections:[wire('a',[[0,0],[100,0]],{from:'shared'}),wire('b',[[0,0],[0,100]],{from:'shared'})]}).issues.length,0);
 assert.equal(C.analyze({connections:[wire('a',[[0,0],[100,0]]),wire('b',[[0,0],[0,100]])]}).issues[0].code,'wire-crossing');
 assert.equal(C.analyze({connections:[wire('a',[[0,0],[10,10]]),wire('b',[[20,20],[30,30]])]}).issues.length,0);
});
test('nested containers and endpoint boundary contacts are excluded, but penetration and text are reported',()=>{
 const connections=[wire('a',[[20,50],[180,50]],{from:'start',to:'end'})],modules=[box('container',0,0,220,120),box('start',0,30,20,40,['container']),box('end',180,30,20,40,['container']),box('obstacle',80,30,40,40,['container']),box('nested',85,35,20,20,['obstacle','container'])];
 const report=C.analyze({connections,modules,texts:[box('label',120,40,20,20),box('label',145,40,20,20)]});assert.deepEqual(report.issues.map(i=>i.code),['wire-obstacle','wire-text']);assert.deepEqual(report.issues[0].ids,['a','obstacle']);assert.deepEqual(report.issues[1].ids,['a','label']);
 assert.equal(C.analyze({connections:[wire('a',[[20,50],[10,50],[10,110]],{from:'start'})],modules}).issues.find(i=>i.code==='wire-obstacle').ids[1],'start');
 assert.equal(C.analyze({connections:[wire('a',[[0,30],[100,30]])],modules:[box('edge',20,30,20,20)]}).issues.length,0);
});
test('unmeasured bound wires never become fake module obstacles; standalone objects are checked',()=>{
 const connections=[wire('a',[[0,50],[200,50]])],boundWires=[...connections,{id:'hidden',parent:'hidden-group'}],modules=[box('hidden-group',10,20,150,50)],leaves=[{...box('hidden',10,20,150,50),parent:'hidden-group'},box('loose',100,40,30,30)];
 const report=C.analyze({connections,boundWires,modules,leaves,connectionSkipped:1});assert.equal(report.skipped,1);assert.equal(report.issues.length,1);assert.deepEqual(report.issues[0].ids,['a','loose']);
});
test('path parsing accepts only supported rendered polylines and reports bounded partial results',()=>{
 assert.deepEqual(C.parsePolyline('M1e2 -3.5L120 50'),[{x:100,y:-3.5},{x:120,y:50}]);for(const d of ['M0 0 Q20 20 30 0','m0 0l2 2','M0 0LNaN 1','M0 0L2','M0 0M2 2'])assert.equal(C.parsePolyline(d),null);
 const data={connections:[wire('a',[[0,0],[100,100]]),wire('b',[[0,100],[100,0]])]},before=JSON.stringify(data);
 assert.equal(C.analyze(data,{maxComparisons:0}).truncated,true);assert.equal(C.analyze(data,{maxConnections:1}).truncated,true);assert.equal(C.analyze(data,{maxSegments:1}).truncated,true);assert.equal(C.analyze(data,{maxIssues:0}).truncated,true);assert.equal(JSON.stringify(data),before);
 assert.equal(C.analyze({modules:[box('one',0,0,100,100)]},{maxObstacles:0}).truncated,false);assert.equal(C.analyze({connections:[wire('zero',[[0,0],[0,0]])]}).skipped,1);
});
test('combined checks give stable regressions, crop coordinates and explicit coverage',()=>{
 const data={width:300,height:200,origin:{x:50,y:60},connections:[wire('a',[[10,50],[200,50]])],modules:[box('block',40,30,30,40)]},before=Checks.analyze(data),after=Checks.analyze({...data,modules:[box('block',40,30,60,40)]});
 assert.equal(before.counts.connections,1);assert.equal(before.connections.skipped,0);assert.ok(before.connections.limitations.length);assert.equal(after.issues[0].key,before.issues[0].key);assert.equal(Checks.regressions(before,after).length,1);assert.ok(before.issues[0].region.x>50);assert.equal(before.issues[0].severity,'warning');
 const capped=Checks.analyze({...data,leaves:[box('outside',400,0,20,20)]},{maxIssues:1});assert.equal(capped.issues.length,1);assert.equal(capped.truncated,true);
 assert.equal(Checks.analyze({...data,connectionSkipped:2}).skipped,2);
});
