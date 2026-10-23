const {test}=require('node:test'),assert=require('node:assert/strict');
const {DOMParser,XMLSerializer}=require('@xmldom/xmldom');
const T=require('../canvas-text.js'),D=require('../canvas-draw.js'),Safety=require('./svg-safety.cjs');
const parse=xml=>new DOMParser().parseFromString(xml,'image/svg+xml');
test('Chinese composition Enter and Escape do not commit or cancel text',()=>{
 for(const key of ['Enter','Escape']){assert.equal(T.keyAction({key,isComposing:true,ctrlKey:true}),null);assert.equal(T.keyAction({key,keyCode:229,ctrlKey:true}),null);assert.equal(T.keyAction({key,ctrlKey:true},true),null);}
 assert.equal(T.keyAction({key:'Enter'}),null);assert.equal(T.keyAction({key:'Enter',ctrlKey:true}),'commit');assert.equal(T.keyAction({key:'Enter',metaKey:true}),'commit');assert.equal(T.keyAction({key:'Escape'}),'cancel');
});
test('multiline text preserves empty lines, Unicode, spaces and SVG escaping',()=>{
 const text=parse('<svg xmlns="http://www.w3.org/2000/svg"><text x="30" y="40" fill="#123456" font-size="24">old</text></svg>').getElementsByTagName('text')[0];
 const value='中文 <encoder> & α\n\n  第三行';T.write(text,value);assert.equal(T.read(text),value);assert.equal(text.getAttribute('x'),'30');assert.equal(text.getAttribute('fill'),'#123456');assert.equal(text.getAttribute('font-size'),'24');
 const spans=text.getElementsByTagName('tspan');assert.equal(spans.length,3);assert.equal(Number(spans[1].getAttribute('y')),68.8);assert.equal(spans[2].getAttribute('x'),'30');
 const xml=new XMLSerializer().serializeToString(text);assert.ok(xml.includes('&lt;encoder&gt;'));Safety.validateMarkup(xml);
 T.write(text,'单行');assert.equal(T.read(text),'单行');assert.equal(text.getElementsByTagName('tspan').length,0);
});
test('existing multi-line SVG labels are not flattened when opened',()=>{
 const doc=parse('<svg><text x="4" y="10"><tspan x="4">First</tspan><tspan x="4" dy="1.2em">Second</tspan></text><text y="10"><tspan y="10">A</tspan><tspan y="30">B</tspan></text><text>p<tspan baseline-shift="sub">1</tspan></text></svg>');
 const texts=doc.getElementsByTagName('text');assert.equal(T.read(texts[0]),'First\nSecond');assert.equal(T.read(texts[1]),'A\nB');assert.equal(T.read(texts[2]),'p1');
});
test('newly drawn multiline labels survive markup parsing and retain separate lines',()=>{
 const g=D.geometry({x:100,y:100},{x:280,y:200}),svg=D.markup('caption',g,{label:'第一行\n第二行\n\n结束',color:'#123456'});Safety.parse(svg);const text=parse(svg).getElementsByTagName('text')[0];assert.equal(T.read(text),'第一行\n第二行\n\n结束');assert.equal(text.getElementsByTagName('tspan').length,4);
});
test('text editor stays inside the viewport for long text and edge anchors',()=>{
 for(const anchor of [{x:790,y:590},{x:-100,y:-20},{x:200,y:200}]){const b=T.box(anchor,1800,1200,{w:800,h:600});assert.ok(b.x>=4&&b.y>=4);assert.ok(b.x+b.w<=796);assert.ok(b.y+b.h<=596);}
});
test('mounted editor handles composition, multiline commit and blur exactly once',()=>{
 const previous=global.document;const fields=[];
 global.document={createElement(tag){if(tag==='canvas')return{getContext:()=>({measureText:s=>({width:s.length*14})})};const listeners={};const field={style:{},dataset:{},value:'',setAttribute(){},addEventListener(k,fn){listeners[k]=fn;},focus(){},select(){},remove(){this.removed=true;},emit(k,event={}){listeners[k]?.({stopPropagation(){},preventDefault(){},...event});}};fields.push(field);return field;}};
 try{
  const commits=[],closes=[],viewport={clientWidth:800,clientHeight:600,append(){}};
  const ed=T.mount({viewport,anchor:{x:100,y:100},value:'初始',fontSize:30,onCommit:v=>commits.push(v),onClose:()=>closes.push(true)}),field=ed.input;
  assert.equal(field.style.fontSize,'30px');field.emit('compositionstart');field.value='中文';field.emit('keydown',{key:'Enter'});assert.equal(field.removed,undefined);assert.equal(commits.length,0);
  field.emit('compositionend');field.value='中文\n第二行';field.emit('input');assert.equal(field.style.height,'84px');field.emit('keydown',{key:'Enter'});assert.equal(commits.length,0);
  field.emit('keydown',{key:'Enter',ctrlKey:true});field.emit('blur');assert.deepEqual(commits,['中文\n第二行']);assert.equal(closes.length,1);
  const cancelled=T.mount({viewport,anchor:{x:0,y:0},value:'保留',onCommit:v=>commits.push(v)});cancelled.input.value='丢弃';cancelled.input.emit('keydown',{key:'Escape'});cancelled.input.emit('blur');assert.equal(commits.length,1);
  const blurred=T.mount({viewport,anchor:{x:10,y:10},onCommit:v=>commits.push(v)});blurred.input.value='失焦保存';blurred.input.emit('blur');assert.equal(commits[1],'失焦保存');
 }finally{global.document=previous;}
});
