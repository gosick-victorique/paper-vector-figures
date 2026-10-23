const {parse,serialize}=require('./svg-safety.cjs');
function render(task,state){
 state=JSON.parse(JSON.stringify(state));require('../connections.js').sync(state);
 const doc=parse(task.currentSvg),root=doc.documentElement;
 const sourceGroups={};let oldScene;
 function visit(e){if(e.nodeType!==1)return;const id=e.getAttribute('data-id');if(id)sourceGroups[id]=e;if(e.getAttribute('id')==='scene')oldScene=e;Array.from(e.childNodes).forEach(visit);}visit(root);
 if(!oldScene)throw Error('图稿缺少 scene 层');
 const ns='http://www.w3.org/2000/svg',make=(tag,attrs)=>{const e=doc.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,String(v));return e;};
 const fresh=oldScene.cloneNode(false);oldScene.parentNode.replaceChild(fresh,oldScene);
 const byParent={};Object.values(state.nodes).sort((a,b)=>(a.zIndex||0)-(b.zIndex||0)).forEach(n=>(byParent[n.parent||'root']??=[]).push(n));
 function draw(n,parent){
  const g=make('g',{'data-id':n.id,'data-type':n.type,transform:`translate(${n.x} ${n.y}) scale(${n.scale})`});parent.appendChild(g);
  if(n.type==='leaf'){
   let content;
   // Reuse the submitted rendered leaf when markup is unchanged (palette and inherited styles included).
   if(sourceGroups[n.id]&&n.markup===task.scene[n.id]?.markup){content=Array.from(sourceGroups[n.id].childNodes).find(e=>e.nodeType===1)?.cloneNode(true);}
   if(!content){content=make('g',{});const parsed=parse('<svg xmlns="http://www.w3.org/2000/svg">'+(n.markup||'')+'</svg>');for(const child of Array.from(parsed.documentElement.childNodes))content.appendChild(doc.importNode(child,true));}
   content.setAttribute('transform',`translate(${-n.originX||0} ${-n.originY||0})`);
   if(n.textOverride!==undefined){const t=content.getElementsByTagName('text')[0];if(t)t.textContent=n.textOverride;}
   const palettes=[['#416f89','#ce713a','#dfeaf0','#f7e8dc'],['#4d7360','#ba8746','#e1ebe1','#f6eddb'],['#636a94','#b96b7a','#e8e9f2','#f5e5ea']],p=palettes[state.palette]||palettes[0],colors=Object.fromEntries(palettes[0].map((c,i)=>[c,p[i]]));
   if(!n.customPaint)for(const el of Array.from(content.getElementsByTagName('*')))for(const a of ['fill','stroke']){const v=el.getAttribute(a);if(colors[v])el.setAttribute(a,colors[v]);}
   if(n.appearance)require('../object-edit.js').paint(content,n.appearance);
   g.appendChild(content);
  }else (byParent[n.id]||[]).forEach(c=>draw(c,g));
 }(byParent.root||[]).forEach(n=>draw(n,fresh));
 root.setAttribute('width','1200');root.setAttribute('height','740');return serialize(doc);
}
module.exports={render};
