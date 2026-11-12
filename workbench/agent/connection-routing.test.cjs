const {test}=require('node:test'),assert=require('node:assert/strict');
const Scene=require('../scene-factory.js'),M=require('../model.js'),C=require('../connections.js'),Commands=require('../editor-commands.js');
function add(s,id,x,y,w=120,h=80,parent='custom'){return Commands.execute(s,{type:'create_component',id,parent,name:id,x,y,w,h,leaves:[{markup:`<rect width="${w}" height="${h}"/>`}]});}
function connection(from='right',to='left'){return{from:{node:'ai-a',side:from,offset:.5},to:{node:'ai-b',side:to,offset:.5},route:'avoid',label:'feature'};}
function fixture(){let s=Scene.blank();s=add(s,'ai-a',80,210);s=add(s,'ai-b',800,210);s=add(s,'ai-obstacle',400,160,120,180);return Commands.execute(s,{type:'connect',id:'ai-wire',parent:'custom',connection:connection()});}
function crosses(a,b,r){return a.y===b.y?a.y>r.y&&a.y<r.y+r.h&&Math.max(a.x,b.x)>r.x&&Math.min(a.x,b.x)<r.x+r.w:a.x>r.x&&a.x<r.x+r.w&&Math.max(a.y,b.y)>r.y&&Math.min(a.y,b.y)<r.y+r.h;}
test('avoid routes remain orthogonal, respect ports and clear obstacles for every side pair',()=>{
 const s=fixture(),obstacle=M.bounds(s,'ai-obstacle'),pad=15,r={x:obstacle.x-pad,y:obstacle.y-pad,w:obstacle.w+2*pad,h:obstacle.h+2*pad},directions={left:[-1,0],right:[1,0],top:[0,-1],bottom:[0,1]};
 for(const from of C.sides)for(const to of C.sides){const c=connection(from,to),g=C.geometry(s,c),pts=g.points;assert.deepEqual(pts[0],C.anchor(s,c.from));assert.deepEqual(pts.at(-1),C.anchor(s,c.to));for(let i=1;i<pts.length;i++){assert.ok(pts[i].x===pts[i-1].x||pts[i].y===pts[i-1].y);assert.ok(!crosses(pts[i-1],pts[i],r));}const first=pts[0],next=pts[1],last=pts.at(-1),previous=pts.at(-2);assert.ok((next.x-first.x)*directions[from][0]+(next.y-first.y)*directions[from][1]>0);assert.ok((previous.x-last.x)*directions[to][0]+(previous.y-last.y)*directions[to][1]>0);assert.deepEqual(C.geometry(s,c),g);}
 const before=JSON.stringify(s);C.sync(s);assert.equal(JSON.stringify(s),before);
});
test('obstacle movement reroutes external wires and locks reject it atomically',()=>{
 const s=fixture(),command={type:'arrange',action:'grid',ids:['ai-obstacle'],x:400,y:40},next=Commands.execute(s,command);assert.notEqual(next.nodes['ai-wire'].markup,s.nodes['ai-wire'].markup);assert.deepEqual(next.nodes['ai-wire'].connection,s.nodes['ai-wire'].connection);Commands.validateTransition(s,next,{editMode:'layout',scope:[{id:'ai-obstacle'}]});
 s.nodes['ai-wire-group'].locked=true;const before=JSON.stringify(s);assert.throws(()=>Commands.execute(s,command),/锁定/);assert.equal(JSON.stringify(s),before);const preview=M.clone(s);preview.nodes['ai-obstacle'].y=40;assert.throws(()=>C.sync(preview,{baseline:s}),/锁定连线/);assert.deepEqual(preview.nodes['ai-wire'],s.nodes['ai-wire']);
});
test('blocked routes reject commands and sync never leaves partially updated wires',()=>{
 let s=fixture();s=Commands.execute(s,{type:'connect',id:'ai-straight',parent:'custom',connection:{...connection(),route:'straight'}});const before=JSON.stringify(s);
 assert.throws(()=>add(s,'ai-wall',550,0,80,740),/无可用路径/);assert.equal(JSON.stringify(s),before);
 const invalid=M.clone(s);invalid.nodes['ai-wire'].connection.route='straight';invalid.nodes['ai-straight'].connection.route='avoid';invalid.nodes['ai-obstacle'].y=0;invalid.nodes['ai-obstacle-e0'].h=740;invalid.nodes['ai-a'].y+=10;const wires=Object.values(invalid.nodes).filter(n=>n.connection).map(M.clone);assert.throws(()=>C.sync(invalid),/无可用路径/);assert.deepEqual(Object.values(invalid.nodes).filter(n=>n.connection),wires);
 const blocked=M.clone(s);blocked.nodes['ai-obstacle'].x=205;assert.throws(()=>C.sync(blocked),/接口/);
 for(const clearance of [0,81,NaN,'12']){const bad=M.clone(s);bad.nodes['ai-wire'].connection.clearance=clearance;assert.throws(()=>C.validate(bad.nodes),/格式/);}
});
test('nested and scaled modules route in world coordinates, excluding container backgrounds',()=>{
 let s=Scene.blank();s=add(s,'ai-container',30,40,1000,600);s.nodes['ai-container'].scale=.75;
 s=add(s,'ai-a',80,210,120,80,'ai-container');s=add(s,'ai-b',800,210,120,80,'ai-container');s=add(s,'ai-obstacle',400,160,120,180,'ai-container');s=Commands.execute(s,{type:'connect',id:'ai-wire',parent:'ai-container',connection:connection()});
 const c=s.nodes['ai-wire'].connection,g=C.geometry(s,c);assert.deepEqual(g.points[0],{x:180,y:227.5});assert.equal(s.nodes['ai-wire'].scale,1/.75);assert.equal(M.bounds(s,'ai-wire').x,g.x);for(let i=1;i<g.points.length;i++)assert.ok(!crosses(g.points[i-1],g.points[i],M.bounds(s,'ai-obstacle')));
 assert.throws(()=>C.geometry(s,{...c,to:{node:'ai-container',side:'left',offset:.5}}),/相互包含/);
});
test('routing has bounded scene size and includes independent text boxes as obstacles',()=>{
 const s=fixture();s.nodes['ai-label']={id:'ai-label',parent:'custom',type:'leaf',kind:'text',name:'label',x:550,y:120,w:100,h:200,scale:1,locked:false,markup:'<text>Label</text>'};C.sync(s);const pts=C.geometry(s,s.nodes['ai-wire'].connection).points;for(let i=1;i<pts.length;i++)assert.ok(!crosses(pts[i-1],pts[i],M.bounds(s,'ai-label')));
 for(let i=0;i<78;i++)s.nodes['ai-extra'+i]={id:'ai-extra'+i,parent:'custom',type:'component',kind:'network',name:'extra',x:20+i,y:600,w:1,h:1,scale:1,locked:false};assert.throws(()=>C.sync(s),/80/);
});
