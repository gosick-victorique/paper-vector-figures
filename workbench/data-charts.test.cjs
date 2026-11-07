const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('./data-charts.js');
const base={text:'X,A,Error,B\n1,10,2,8\n2,20,3,15',x:0,type:'line',series:[{column:1,error:2,name:'A & B',color:'#326c99'}]};
test('CSV and spreadsheet parsing preserves quoted headers and rejects malformed rows',()=>{
 assert.deepEqual(C.parse('"Step, count",Value\n1,2').headers,['Step, count','Value']);
 assert.deepEqual(C.parse('X\tY\r\n1\t2').rows,[['1','2']]);
 assert.throws(()=>C.parse('X,Y\n1,2,3'),/列数/);
 assert.throws(()=>C.parse('X,Y\n1,"2'),/引号/);
});
test('error bars affect automatic bounds; blanks never become zero',()=>{
 const {range,markup}=C.render(base);assert.ok(range.y0<8&&range.y1>23);assert.ok(markup.includes('A &amp; B'));assert.ok(!markup.includes('NaN'));
 assert.throws(()=>C.render({...base,text:'X,A,Error\n1,,2'}),/需要数值/);
 assert.throws(()=>C.render({...base,text:'X,A,Error\n1,10,-2'}),/不能为负/);
});
test('manual and log ranges validate data and uncertainty',()=>{
 assert.throws(()=>C.render({...base,yLog:true,text:'X,A,Error\n1,1,2'}),/下界/);
 assert.throws(()=>C.render({...base,yMin:20,yMax:10}),/范围无效/);
 const r=C.render({...base,yLog:true,yMin:1,yMax:100});assert.equal(r.range.y0,1);assert.equal(r.range.y1,100);
});
test('categorical bars include zero and group all series; labels are escaped',()=>{
 const r=C.render({...base,type:'bar',text:'X,A,Error,B\nCat,10,2,8\nDog,20,3,15',title:'<script>',series:[...base.series,{column:3,error:-1}]});
 assert.equal(r.range.y0,0);assert.match(r.markup,/Cat/);assert.match(r.markup,/&lt;script&gt;/);assert.equal((r.markup.match(/<rect /g)||[]).length,7);
});
test('manual ticks include zero, use exact intervals and reject excessive density',()=>{
 assert.deepEqual(C.ticks(-1,1,false,.5),[-1,-.5,0,.5,1]);
 assert.throws(()=>C.ticks(0,10,false,0),/刻度间距/);
 assert.throws(()=>C.ticks(0,100,false,.01),/100/);
 assert.deepEqual(C.ticks(1,100,true),[1,10,100]);
});
test('series styling appears in both plot and legend; layout reserves space for right legend',()=>{
 const r=C.render({...base,legendPosition:'right',series:[{...base.series[0],marker:'diamond',lineStyle:'dotted',lineWidth:3}]});
 assert.match(r.markup,/data-chart-part="axes"/);assert.match(r.markup,/data-chart-part="series"/);
 assert.equal((r.markup.match(/stroke-dasharray="2 4"/g)||[]).length,2);
 assert.equal((r.markup.match(/<polygon /g)||[]).length,3);
 assert.match(r.markup,/width="380"/);
});
test('style reuse preserves destination data, column mapping and series names',()=>{
 const source={...base,palette:'muted',legendPosition:'inside',series:[{...base.series[0],marker:'square',lineStyle:'dashed'}]},destination=structuredClone({...base,text:'X,Y\n3,40',series:[{column:1,error:-1,name:'New experiment'}]});
 C.applyStyle(destination,C.saveStyle(source));assert.equal(destination.text,'X,Y\n3,40');assert.equal(destination.series[0].error,-1);assert.equal(destination.series[0].name,'New experiment');assert.equal(destination.series[0].marker,'square');assert.equal(destination.legendPosition,'inside');
});
test('grid serialization round trips commas, quotes and line breaks',()=>{
 const table={headers:['X','Value, quoted'],rows:[['A "test"','2'],['multi\nline','3']]};assert.deepEqual(C.parse(C.toCSV(table)),table);
});
test('publication dimensions and pt font match the 180 mm board coordinate system',()=>{
 const c={...base,publication:true,widthMm:85,heightMm:60,fontPt:8},r=C.render(c);assert.ok(Math.abs(r.w-85*1200/180)<1e-9);assert.equal(r.h,400);assert.match(r.markup,new RegExp('font-size="'+(8*25.4/72*C.unitsPerMm)));
 assert.throws(()=>C.render({...c,widthMm:20}),/40–180/);assert.throws(()=>C.render({...c,widthMm:40,heightMm:30,fontPt:14}),/放不下/);
});
test('subplot layout aligns dimensions, shares ranges and preserves source data',()=>{
 const second={...base,text:'X,A,Error\n1,100,2\n2,120,3'},o={columns:2,widthMm:180,heightMm:70,gapMm:4,fontPt:8,sharedY:true},panels=C.layout([base,second],o);
 assert.equal(panels[0].config.panelLabel,'(a)');assert.equal(panels[1].config.panelLabel,'(b)');assert.equal(panels[0].result.w,panels[1].result.w);assert.equal(panels[1].x+panels[1].result.w,1200);assert.equal(panels[0].config.yMax,panels[1].config.yMax);assert.equal(panels[0].config.text,base.text);assert.equal(base.publication,undefined);
 assert.throws(()=>C.layout([base,{...second,yLog:true}],o),/对数轴/);
 assert.throws(()=>C.layout([base,second],{...o,widthMm:80}),/宽/);
});
test('shared categorical axes reject mismatched labels and ordering',()=>{
 const a={...base,type:'bar'},b={...base,type:'bar',text:'X,A,Error\n2,10,2\n1,20,3'};
 assert.throws(()=>C.layout([a,b],{columns:2,widthMm:180,heightMm:70,gapMm:4,fontPt:8,sharedX:true}),/标签与顺序/);
});
test('subplot plot areas align even with different titles and legend positions',()=>{
 const panels=C.layout([{...base,title:'Title',legendPosition:'bottom'},{...base,legendPosition:'right'}],{columns:2,widthMm:180,heightMm:85,gapMm:4,fontPt:8});assert.deepEqual(panels[0].result.insets,panels[1].result.insets);
});
