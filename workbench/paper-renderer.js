(function(root){
'use strict';
const T=root.FigureTemplates,L=root.PaperFigureLibrary,esc=T.escape;
const glyphTemplates={frame:'photo-plane',frames:'sample-pair',network:'network',matrix:'matrix',features:'layers',tokens:'token-strip',mask:'mask',masks:'head-stack',bars:'row-bars',heatmap:'feature-grid',camera:'multiview',depth:'feature-grid',points:'point-cloud',voxel:'voxel',axes:'vectors',pyramid:'pyramid',vectors:'vectors',patches:'patch-grid',slice:'slice-extract',experts:'parallel-ensemble',sum:'sum',graph:'graph',documents:'memory-bank',memory:'memory-bank',gate:'router',heads:'head-stack'};
function glyph(kind,c,a){
 if(glyphTemplates[kind])return L.baseMarkup(glyphTemplates[kind],{label:'',color:c,accent:a}).replace(/^<svg[^>]*>|<\/svg>$/g,'');
 const rect=(x,y,w,h,color=c,alpha=.15)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}" fill-opacity="${alpha}" stroke="${color}"/>`;
 const line=(x,y,u,v,color=c,dash='')=>`<path d="M${x} ${y}L${u} ${v}" fill="none" stroke="${color}" stroke-width="2" ${dash?`stroke-dasharray="${dash}"`:''}/>`;
 const dot=(x,y,r=4,color=c)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${color}"/>`;
 let s='';
 if(kind==='gaussians'||kind==='ellipsoid'){const shapes=kind==='ellipsoid'?[[80,65,53,27]]:[[41,47,27,14],[96,30,32,16],[113,80,26,18],[58,91,31,14],[76,62,24,19]];for(const [x,y,rx,ry]of shapes)s+=`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${c}" fill-opacity=".12" stroke="${c}"/><ellipse cx="${x}" cy="${y}" rx="${rx*.6}" ry="${ry*.6}" fill="${a}" fill-opacity=".1" stroke="${a}" stroke-opacity=".5"/>`+dot(x,y,2,a);}
 if(kind==='trajectory'){s='<path d="M12 105C30 95 20 46 58 55S105 12 146 27" fill="none" stroke="'+c+'" stroke-width="3"/>';[[12,105],[32,76],[58,55],[101,37],[146,27]].forEach(([x,y],i)=>s+=dot(x,y,5,i===4?a:c));}
 if(kind==='texture'){s=rect(19,19,122,91,c,.03);for(let i=0;i<8;i++)s+=`<path d="M25 ${26+i*10}q12 -8 24 0t24 0t24 0t24 0" fill="none" stroke="${i>2&&i<6?a:c}" stroke-width="2"/>`;}
 if(kind==='boundary'){s=rect(20,20,120,90,c,.06)+`<path d="M27 103L41 79 65 85 78 56 103 63 128 29" fill="none" stroke="${a}" stroke-width="10" stroke-opacity=".2"/><path d="M27 103L41 79 65 85 78 56 103 63 128 29" fill="none" stroke="${a}" stroke-width="2"/>`;}
 if(kind==='tree'){const p=[[14,65],[55,28],[55,101],[104,14],[104,47],[104,83],[104,116],[145,14],[145,47],[145,83]];[[0,1],[0,2],[1,3],[1,4],[2,5],[2,6],[3,7],[4,8],[5,9]].forEach(([i,j])=>s+=line(...p[i],...p[j],i===1||i===4?a:'#b7c4cc'));p.forEach(([x,y],i)=>s+=dot(x,y,5,[0,1,4,8].includes(i)?a:c));}
 if(kind==='timeline'){s=line(12,99,148,99,'#b7c4cc');for(let i=0;i<5;i++)s+=rect(12+i*28,25+i%2*15,20,48,c,.12)+line(22+i*28,84,22+i*28,104,a);}
 if(kind==='interpolate'){s=line(15,65,145,65,'#b7c4cc');for(let i=0;i<5;i++)s+=rect(13+i*28,37,20,54,i===0||i===4?c:a,i===0||i===4?.35:.1);}
 if(kind==='noise'){s=rect(20,22,120,87,c,.06);for(let i=0;i<66;i++)s+=rect(25+(i*29%108),27+(i*43%72),3,3,i%4===0?a:c,.55);}
 if(kind==='latent'){for(let i=3;i>=0;i--)s+=rect(28+i*13,37-i*7,80,60,c,.08);for(let r=0;r<4;r++)for(let k=0;k<5;k++)s+=rect(31+k*15,40+r*13,12,10,(r+k)%4===0?a:c,.35);}
 if(kind==='gradient'){s=line(23,101,137,101,'#b7c4cc')+line(23,101,23,21,'#b7c4cc')+`<path d="M30 35Q65 118 137 51" fill="none" stroke="${c}" stroke-width="2"/><path d="M43 38L83 79l-13 -1 10 -10" fill="none" stroke="${a}" stroke-width="4"/>`;}
 if(kind==='targets'){for(const [x,y,r]of [[49,65,29],[112,65,29]])for(let k=3;k>=1;k--)s+=`<circle cx="${x}" cy="${y}" r="${r*k/3}" fill="none" stroke="${x===49?c:a}"/>`;s+=dot(49,65,3)+dot(112,65,3,a);}
 if(kind==='spectrum'){s=rect(24,16,108,99,c,.03);for(let r=0;r<6;r++)for(let k=0;k<6;k++)s+=rect(28+k*17,20+r*15,14,12,r+k<4?a:c,r+k<4?.65:.1);}
 if(kind==='sphere'){s=`<circle cx="80" cy="65" r="47" fill="${c}" fill-opacity=".04" stroke="${c}"/>`;for(const r of [17,32])s+=`<ellipse cx="80" cy="65" rx="${r}" ry="47" fill="none" stroke="${c}" opacity=".5"/><ellipse cx="80" cy="65" rx="47" ry="${r}" fill="none" stroke="${c}" opacity=".5"/>`;s+=`<path d="M42 93Q60 20 112 34" stroke="${a}" stroke-width="4" fill="none"/>`;}
 if(kind==='object'){s=`<path d="M27 43l48 -24 55 25v56l-49 23 -54 -26Z" fill="${c}" fill-opacity=".1" stroke="${c}"/><path d="M27 43l54 25 49 -24M81 68v55" fill="none" stroke="${c}"/>`;}
 if(kind==='contact'){s=`<path d="M25 101Q30 19 103 34L137 92Z" fill="${c}" fill-opacity=".1" stroke="${c}"/>`+dot(82,39,7,a)+line(82,13,82,31,a)+line(82,39,115,21,a);}
 if(kind==='robot'){s=rect(22,102,37,12)+`<path d="M40 100L55 63 92 38 121 65" fill="none" stroke="${c}" stroke-width="9" stroke-linecap="round"/>`+dot(55,63,8,a)+dot(92,38,8,a)+`<path d="M112 70l13 15M126 60l15 13" stroke="${a}" stroke-width="4"/>`;}
 if(kind==='rank'){for(let i=0;i<4;i++){s+=rect(23,16+i*26,113-i*19,18,i===0?a:c,.15)+dot(13,25+i*26,3,i===0?a:c);}}
 if(kind==='answer'){s=rect(25,20,108,87,c,.04);for(let i=0;i<4;i++)s+=line(37,37+i*15,120-i%2*23,37+i*15,c);s+=dot(125,101,11,a)+`<path d="M119 101l4 4 8 -9" stroke="white" stroke-width="2" fill="none"/>`;}
 if(kind==='shield'){s=`<path d="M80 14L130 33v34q-4 30 -50 50Q34 97 30 67V33Z" fill="${c}" fill-opacity=".09" stroke="${c}" stroke-width="2"/><path d="M52 66l19 18 38 -43" fill="none" stroke="${a}" stroke-width="5"/>`;}
 if(kind==='factor'){s=rect(12,27,50,72,c,.2)+rect(83,27,19,72,a,.2)+rect(113,27,36,28,c,.2)+line(70,54,77,54,c)+line(70,66,77,66,c);}
 if(kind==='basis'){for(let i=0;i<3;i++){const x=15+i*46;s+=rect(x,31,35,64,i===1?a:c,.11);for(let r=0;r<4;r++)for(let k=0;k<2;k++)s+=rect(x+5+k*14,37+r*13,10,9,i===1?a:c,.4);}}
 if(kind==='bounds'){s=rect(26,20,108,94,c,.03)+rect(47,39,65,57,a,.08)+dot(79,69,4,a)+line(79,69,103,47,a)+line(26,114,144,114,'#b7c4cc');}
 if(!s)throw Error('No glyph for '+kind);
 return s;
}
function render(t,options={}){
 const r=t.recipe,v=t.viewIndex,c=options.color||'#416f89',a=options.accent||'#ce713a',label=esc(options.label??r.name);
 const slots=[[[42,106,66],[158,106,83],[277,106,66]],[[42,54,61],[162,110,119],[279,166,60]],[[80,36,61],[174,108,87],[80,180,60]],[[48,163,70],[161,108,96],[276,52,68]]][v];
 let body='',nodes=[],edges=[];
 function node(role,kind,x,y,w,tag,muted=false){const n={id:role,kind,x,y,w,tag,muted};nodes.push(n);return n;}
 function fromSlot(i,role,kind,tag){return node(role,kind,...slots[i],tag);}
 const [A,B,C]=r.atoms;
 if(r.topology==='parallel'){
  const y1=v===1?57:66,y2=v===1?159:155;
  if(v===2){for(let i=0;i<2;i++){const x=78+i*160;node('a'+i,A,x,33,51,'in '+(i+1));node('b'+i,B,x,105,67,'');node('c'+i,C,x,177,50,'out '+(i+1));edges.push(['a'+i,'b'+i],['b'+i,'c'+i]);}}
  else for(let i=0;i<2;i++){const y=i?y2:y1;node('a'+i,A,37+(v===3?i*12:0),y,52,'in '+(i+1));node('b'+i,B,158,y,70,'');node('c'+i,C,281-(v===3?i*12:0),y,52,'out '+(i+1));edges.push(['a'+i,'b'+i],['b'+i,'c'+i]);}
 }else if(r.topology==='merge'){
  if(v===0){node('a',A,40,48,62,'A');node('c',C,40,161,62,'B');node('b',B,224,106,105,'');}
  if(v===1){node('a',A,37,49,58,'A');node('c',C,282,49,58,'B');node('b',B,161,143,110,'');}
  if(v===2){node('a',A,66,40,67,'A');node('c',C,249,40,67,'B');node('b',B,159,155,95,'');}
  if(v===3){node('a',A,58,162,65,'A');node('c',C,260,43,65,'B');node('b',B,161,112,105,'');}edges.push(['a','b'],['c','b']);
 }else if(r.topology==='fanout'){
  if(v===2){node('a',A,160,28,56,'in');node('b',B,160,95,80,'');node('c1',C,65,177,58,'1');node('c2',C,257,177,58,'2');}
  else {node('a',A,32,v===3?166:107,58,'in');node('b',B,143,107,v===1?105:84,'');node('c1',C,279,45,58,'1');node('c2',C,279,167,58,'2');}edges.push(['a','b'],['b','c1'],['b','c2']);
 }else if(r.topology==='select'){
  fromSlot(0,'a',A,'candidates');fromSlot(1,'b',B,'select');fromSlot(2,'c',C,'kept');edges.push(['a','b'],['b','c']);
  const p=slots[2];node('discard',C,v===2?254:p[0],v===2?180:p[1]>110?45:179,34,'unused',true);edges.push(['b','discard','dashed']);
 }else if(r.topology==='detail'){
  fromSlot(0,'a',A,'context');fromSlot(1,'b',B,'detail');fromSlot(2,'c',C,'readout');edges.push(['a','b','callout'],['b','c','callout']);
 }else if(r.topology==='paired'){
  if(v===2){node('a',A,75,38,75,'before');node('c',C,75,172,75,'after');node('b',B,245,105,76,'operation');edges.push(['a','c'],['b','a','callout'],['b','c','callout']);}
  else {node('a',A,57,v===3?157:142,v===1?93:78,'before');node('c',C,266,v===3?72:142,v===1?93:78,'after');node('b',B,160,v===3?40:43,61,'operation');edges.push(['a','c'],['b','a','callout'],['b','c','callout']);}
 }else{fromSlot(0,'a',A,'input');fromSlot(1,'b',B,'');fromSlot(2,'c',C,'output');edges.push(['a','b'],['b','c']);}
 const map=Object.fromEntries(nodes.map(n=>[n.id,n]));
 function edge(from,to,type){const p=map[from],q=map[to],dx=q.x-p.x,dy=q.y-p.y,angle=Math.atan2(dy,dx),length=Math.hypot(dx,dy),r1=p.w*.38,r2=q.w*.4;if(length<r1+r2+4)return '';const x=p.x+Math.cos(angle)*r1,y=p.y+Math.sin(angle)*r1,u=q.x-Math.cos(angle)*r2,z=q.y-Math.sin(angle)*r2,color=type?'#aab9c2':c;let s=`<path d="M${x} ${y}L${u} ${z}" fill="none" stroke="${color}" stroke-width="1.4" ${type?'stroke-dasharray="3 3"':''}/>`;if(type!=='callout'){const px=u-5*Math.cos(angle),py=z-5*Math.sin(angle);s+=`<path d="M${u} ${z}L${px+2.4*Math.sin(angle)} ${py-2.4*Math.cos(angle)}L${px-2.4*Math.sin(angle)} ${py+2.4*Math.cos(angle)}Z" fill="${color}"/>`;}return s;}
 edges.forEach(e=>body+=edge(...e));
 for(const n of nodes){const w=n.w,h=w*130/160,x=n.x-w/2,y=n.y-h/2;
  if(v===3)body+=`<path d="M${x-5} ${y+h+3}l12 -7h${w}l-12 7Z" fill="${c}" fill-opacity=".05" stroke="${c}" stroke-opacity=".18"/>`;
  // Muted objects use explicit leaf colors; no inherited opacity is lost on insertion.
  body+=`<g transform="translate(${x} ${y}) scale(${w/160})">${glyph(n.kind,n.muted?'#bbc4ca':c,n.muted?'#c6cdd1':a)}</g>`;
  if(n.tag){
   // Keep a label beside the object when a connector leaves its lower edge.
   const crossesBelow=edges.some(([from,to])=>{const other=from===n.id?map[to]:to===n.id?map[from]:null;return other&&other.y>n.y&&Math.abs(other.x-n.x)<Math.abs(other.y-n.y)*.45;});
   const side=n.x+w/2+48<320?1:-1;
   const tx=crossesBelow?n.x+side*(w/2+4):n.x,ty=crossesBelow?n.y+3:Math.min(207,y+h+12);
   body+=`<text x="${tx}" y="${ty}" text-anchor="${crossesBelow?(side===1?'start':'end'):'middle'}" fill="#73808a" font-family="Arial" font-size="8">${esc(n.tag)}</text>`;
  }
 }
 if(label)body+=`<text x="160" y="231" text-anchor="middle" fill="#23313c" font-family="Arial, Microsoft YaHei, sans-serif" font-size="11">${label}</text>`;
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240">${body}</svg>`;
}
T.markup=function(id,options={}){const entry=L.index.get(id);return entry?render(entry,options):L.baseMarkup(id,options);};
L.glyph=glyph;
})(typeof window==='object'?window:globalThis);
