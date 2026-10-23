(function(root){
'use strict';
const T=root.FigureTemplates,oldMarkup=T.markup,oldSelect=T.selectCatalog,esc=T.escape;
const selected=root.PaperInspiration||[],index=new Map();
T.categories['paper-inspired']='论文画法重构';
function markup(id,options={}){
 const c=options.color||'#416f89',a=options.accent||'#c47a38',b='#8a9fbc';
 const path=(d,color=c,dash='',fill='none',opacity=1)=>`<path d="${d}" stroke="${color}" stroke-width="1.4" ${dash?`stroke-dasharray="${dash}"`:''} fill="${fill}" fill-opacity="${opacity}"/>`;
 const dot=(x,y,r=3,color=c)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${color}"/>`;
 const line=(x,y,u,v,color=c,dash='')=>path(`M${x} ${y}L${u} ${v}`,color,dash);
 const rect=(x,y,w,h,color=c,alpha=.1,dash='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${color}" fill-opacity="${alpha}" stroke="${color}" ${dash?`stroke-dasharray="${dash}"`:''}/>`;
 const txt=(x,y,t,size=10,color=c)=>`<text x="${x}" y="${y}" text-anchor="middle" font-family="Arial, Microsoft YaHei, sans-serif" font-size="${size}" fill="${color}">${esc(t)}</text>`;
 const arrow=(x,y,u,v,color=c)=>{let t=Math.atan2(v-y,u-x);return line(x,y,u,v,color)+path(`M${u-5*Math.cos(t)+2*Math.sin(t)} ${v-5*Math.sin(t)-2*Math.cos(t)}L${u} ${v}L${u-5*Math.cos(t)-2*Math.sin(t)} ${v-5*Math.sin(t)+2*Math.cos(t)}`,color);};
 const block=(x,y,w,h,dx,dy,color)=>path(`M${x} ${y}h${w}v${h}h${-w}Z`,color,'',color,.16)+path(`M${x} ${y}l${dx} ${-dy}h${w}l${-dx} ${dy}Z`,color,'',color,.1)+path(`M${x+w} ${y}l${dx} ${-dy}v${h}l${-dx} ${dy}Z`,color,'',color,.3);
 const plane=(x,y,w,h,color)=>block(x,y,w,h,8,7,color);
 const cube=(x,y,size,color)=>block(x,y,size,size,5,4,color);
 const group=(x,y,k,body)=>`<g transform="translate(${x} ${y}) scale(${k})">${body}</g>`;
 const ellipse=(x,y,rx,ry,color,alpha=.16)=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${color}" fill-opacity="${alpha}" stroke="${color}"/>`;
 const grid=(x,y,n,m,size,color,hot=[])=>{let out='';for(let j=0;j<m;j++)for(let i=0;i<n;i++)out+=rect(x+i*size,y+j*size,size,size,color,hot.some(p=>p[0]===i&&p[1]===j)?.75:.1);return out;};
 const chair=(color,tilt=0,mesh=false)=>{let out=path(`M27 65L${30+tilt} 16Q${52+tilt} -1 ${75+tilt} 16L78 65Z`,color,'',color,.18)+path('M18 68Q53 58 88 68L84 84H22Z',color,'',color,.27)+path('M18 68L13 42H22L27 65M88 68L93 42H84L78 65M25 84L20 111H26L32 84M77 84L84 111H78L70 84',color,'',color,.12);if(mesh)for(let i=0;i<4;i++)out+=path(`M${31+i*11+tilt} 22L${29+i*12} 62L${40+i*10+tilt} 22M25 ${68+i*4}H82`,color);return out;};
 const car=(color,wire=false)=>{let out=path('M4 40L21 31 36 12 73 12 94 32 111 38V60H4Z',color,'',color,wire?.04:.28)+path('M26 31L40 17H68L84 32Z',color,'',color,.35)+line(55,17,55,58,color)+line(5,43,109,43,color)+ellipse(26,60,10,10,color,.8)+ellipse(88,60,10,10,color,.8);if(wire)for(let i=0;i<7;i++)out+=path(`M${12+i*14} 39l8 19M8 ${45+i*2}H105`,color);return out;};
 const cloud=(x,y,color)=>{let out='';for(let j=0;j<7;j++)for(let i=0;i<15;i++){if(j<3&&i>3&&i<9||j>2)out+=dot(x+i*5+(j%2)*2,y+j*5+Math.sin(i*.6)*4,1.25,color);}return out;};
 const person=(x,y,color)=>group(x,y,1,ellipse(0,0,5,6,color,.65)+path('M-7 10Q0 6 7 10L10 34H-10ZM-5 34L-7 58M5 34L10 57M-8 13L-14 31M8 13L15 29',color,'',color,.32));
 const room=(x,y,w=116,h=75)=>rect(x,y,w,h,b,.05)+path(`M${x} ${y+h}l${w*.28} ${-h*.37}h${w*.72}M${x+w*.28} ${y+h*.63}V${y}`,b)+path(`M${x+w*.45} ${y+h*.35}h${w*.26}v${h*.3}h${-w*.26}Z`,b,'',b,.12);
 const robot=(x,y,k=1)=>group(x,y,k,path('M0 49h24v10H0Z',b,'',b,.3)+path('M12 49L21 23 49 9 69 28',c)+ellipse(21,23,6,6,c,.5)+ellipse(49,9,5,5,c,.5)+path('M65 25l10 5 -3 10M69 28l-3 12',a));
 const snow=(x,y)=>{let out='';for(let i=0;i<3;i++){let t=i*Math.PI/3,dx=9*Math.cos(t),dy=9*Math.sin(t);out+=line(x-dx,y-dy,x+dx,y+dy,c);}return out;};
 const bird=(color,patch=false)=>{let out=path('M8 50Q29 46 31 29Q34 10 48 14Q60 17 63 30L76 33 61 37Q54 63 31 64L9 75 19 57Z',color,'',color,.5)+path('M21 55Q30 33 48 36L45 58Z',color,'',color,.28)+dot(50,24,2,'#263a43')+path('M36 64l-3 10m13 -12l4 12',color);if(patch)out+=ellipse(57,31,9,7,a,.5)+ellipse(38,44,12,9,a,.24);return out;};
 let s='';
 if(id==='triangle-binding'){
  s=group(9,58,1.2,chair(b,0,true));
  s+=ellipse(79,101,12,15,a,.03)+line(90,89,158,77,a,'3 3')+line(91,112,158,153,a,'3 3');
  s+=path('M158 139L210 60 290 130Z',c,'',c,.06)+path('M158 139L210 60 290 130Z',c,'3 3');
  s+=`<ellipse cx="219" cy="116" rx="34" ry="16" transform="rotate(-25 219 116)" fill="${a}" fill-opacity=".25" stroke="${a}"/><ellipse cx="219" cy="116" rx="11" ry="34" transform="rotate(65 219 116)" fill="none" stroke="${a}"/>`;
  s+=arrow(219,116,273,122)+arrow(219,116,193,147,b)+arrow(219,116,228,68,a)+dot(219,116,4,a)+txt(75,213,'surface anchor')+txt(231,213,'local frame');
 }
 if(id==='feature-ribbons'){
  for(let i=0;i<3;i++){s+=plane(30+i*11,42,22,44,[c,b,a][i]);s+=plane(30+i*11,131,22,44,[a,c,b][i]);}
  s+=arrow(93,67,143,99)+arrow(93,155,143,118)+rect(149,89,20,40,c,.1)+txt(159,114,'⊕',14);
  for(let i=0;i<6;i++)s+=plane(194+i*12,89,16,45,[c,b,a,a,c,b][i]);
  s+=txt(62,28,'source A')+txt(62,119,'source B')+txt(239,165,'source identity retained',9);
 }
 if(id==='view-planes'){
  s=`<ellipse cx="159" cy="123" rx="110" ry="55" fill="none" stroke="${b}" stroke-dasharray="4 4"/>`;
  [[66,43,-17],[233,54,17],[60,141,-12],[236,150,12]].forEach(([x,y,r])=>{s+=line(x+13,y+18,159,126,b,'2 4')+`<g transform="rotate(${r} ${x+12} ${y+16})">${rect(x-15,y-13,56,39,c,.08)}${path(`M${x-12} ${y+27}L${x+12} ${y+53}L${x+37} ${y+27}`,b)}${dot(x+12,y+53,3,c)}</g>`;});
  s+=group(116,95,.8,car(a))+ellipse(150,115,42,12,a,.08)+ellipse(163,129,35,10,c,.07);
  s+=txt(159,206,'shared scene · view planes',9);
 }
 if(id==='cache-cadence'){
  const xs=[24,78,132,186,240,294];s+=txt(160,23,'fixed vs. adaptive reuse intervals',10);
  for(let row=0;row<2;row++)for(let i=0;i<6;i++){const cached=(row===0?[0,2,4]:[0,2,5]).includes(i),y=55+row*85;s+=rect(xs[i]-21,y,43,30,cached?c:a,.12,cached?'':'3 3')+txt(xs[i],y+18,cached?'cached':'reused',8);if(i<5)s+=arrow(xs[i]+23,y+15,xs[i+1]-24,y+15,b);}
  s+=path('M24 174v18h54v-18M132 174v18h108v-18M186 174v18',b)+txt(160,217,'one cached source → several reuse steps',9);
 }
 if(id==='hyperedge-clusters'){
  for(let side=0;side<2;side++)for(let cl=0;cl<2;cl++){let x=43+side*177+cl*62,y=105+(cl%2)*20;s+=`<ellipse cx="${x}" cy="${y}" rx="28" ry="46" fill="${b}" fill-opacity=".08" stroke="${c}" stroke-dasharray="5 4"/>`;for(let j=0;j<3;j++){let xx=x+(j===0?-12:j===1?10:0),yy=y+(j===2?20:-13);s+=ellipse(xx,yy,5,5,c,.04);s+=side?arrow(xx,yy-22,xx,yy-7,c):arrow(xx,yy-7,xx+(j%2?10:-10),yy-25,a);}}
  s+=arrow(143,114,172,114)+txt(75,190,'vertex → hyperedge',9)+txt(249,190,'hyperedge → vertex',9);
 }
 if(id==='layer-time-cells'){
  s+=txt(180,18,'time →',10)+txt(17,39,'layer',9);
  for(let col=0;col<3;col++){const x=61+col*83;s+=txt(x+27,39,col===1?'reuse':'compute',9);if(col===1)s+=rect(x-5,48,72,139,a,.06);for(let row=0;row<3;row++){const y=58+row*43;s+=rect(x-2,y-4,65,32,c,.05);for(let j=0;j<4;j++)s+=cube(x+3+j*14,y+4,9,j<(row===2?1:2)?a:b);if(col<2){const xx=x+64;s+=line(xx,y+10,xx+15,y+10,c,'2 2');if(row===2&&col===0)s+=path(`M${xx+3} ${y+5}l10 10m-10 0l10 -10`,a);}}}
  for(let row=0;row<3;row++)s+=txt(26,76+row*43,'L'+(row+1),9);
  s+=cube(52,204,8,a)+txt(109,213,'background',9)+cube(186,204,8,b)+txt(247,213,'foreground',9);
 }
 if(id==='deformation-pair'){
  s=txt(91,19,'geometry',10)+txt(244,19,'appearance',10);
  for(let row=0;row<2;row++){let y=30+row*98;s+=group(48,y,.76,chair(b,row===0?14:0,true))+group(202,y,.76,chair(c,row===0?14:0))+arrow(140,y+44,185,y+44)+ellipse(101,y+32,10,8,a,.05)+ellipse(255,y+32,10,8,a,.05);}
 }
 if(id==='field-volumes'){
  const volume=(x,y,col)=>{let q=block(x,y,78,78,24,24,col),inside='';for(let z=4;z>=0;z--){inside+=path(`M${x+z*6} ${y-z*6}h78v78h-78Z`,col);for(let i=1;i<5;i++)inside+=line(x+z*6+i*15.6,y-z*6,x+z*6+i*15.6,y-z*6+78,col)+line(x+z*6,y-z*6+i*15.6,x+z*6+78,y-z*6+i*15.6,col);}return q+`<g opacity=".35">${inside.replaceAll('stroke-width="1.4"','stroke-width=".6"')}</g>`;};
  s=volume(25,72,c)+volume(185,72,a)+txt(76,191,'SDF volume')+txt(236,191,'feature volume')+path('M57 43v-14h177v14',b,'3 3')+txt(146,18,'shared spatial domain',9);
 }
 if(id==='representation-stack'){
  s=group(19,79,.77,car(b,true))+group(122,79,.77,car(c))+arrow(108,112,120,112)+arrow(211,112,224,112)+txt(63,166,'mesh')+txt(166,166,'depth')+txt(267,166,'3D points');
  for(let y=0;y<12;y++)for(let x=0;x<20;x++)if((y>=5&&y<10)||(y>=1&&y<5&&x>=6-y&&x<=12+y)||(y>=10&&((x>2&&x<6)||(x>14&&x<18))))s+=dot(228+x*4,90+y*3.8,1.15,a);
  for(let i=0;i<6;i++)s+=path(`M${128+i*9} 111v18`,a,'',a,.2);
 }
 if(id==='camera-expansion'){
  s=ellipse(160,122,115,54,b,.03)+group(122,95,.68,car(b));
  for(let i=0;i<20;i++){let t=i*Math.PI/10,x=160+112*Math.cos(t),y=121+53*Math.sin(t),col=i%5===0?c:a;s+=path(`M${x-5} ${y-5}h10v8h-10Z M${x-5} ${y+3}L${x+(160-x)*.14} ${y+(121-y)*.14}L${x+5} ${y+3}`,col,'',col,i%5===0?.1:.35);}
  s+=rect(65,204,10,7,c,.1)+txt(111,211,'training',9)+rect(180,204,10,7,a,.35)+txt(229,211,'expanded',9);
 }
 if(id==='cloud-depth'){
  for(let row=0;row<2;row++){let y=40+row*100,col=row?a:c;s+=cloud(24,y+15,col)+arrow(110,y+35,162,y+35,col)+room(184,y,104,66);for(let i=0;i<5;i++)s+=rect(193+i*17,y+14,15,36,b,.12+i*.12);}
  s+=line(65,92,65,133,b,'4 4')+txt(146,24,'project & densify',10)+txt(65,222,'point clouds',9)+txt(234,222,'depth views',9);
 }
 if(id==='match-matrix'){
  s=plane(14,83,12,42,c)+arrow(44,107,73,107)+plane(90,28,38,12,a)+arrow(118,47,118,65)+grid(82,73,7,6,23,b);
  [[0,1],[1,4],[2,2],[4,0],[5,3],[6,5]].forEach(([x,y],i)=>s+=rect(82+x*23,73+y*23,23,23,a,.4+i*.09));s+=txt(171,225,'sparse correspondences',9)+arrow(249,141,273,141)+txt(289,130,'top-k',9);
 }
 if(id==='hypothesis-fanin'){
  for(let i=0;i<4;i++){let y=34+i*40;s+=plane(22,y,11,18,c)+plane(37,y,11,18,a)+arrow(66,y+9,103,y+9)+rect(111,y-3,58,25,b,.1)+txt(140,y+13,'R'+(i+1)+' , t'+(i+1),10)+path(`M175 ${y+9}H195V104H215`,b);}
  s+=rect(216,81,83,45,c,.1)+txt(257,101,'select',11)+txt(257,116,'transform',9)+arrow(257,132,257,155)+cloud(219,170,c)+cloud(222,171,a);
 }
 if(id==='motion-token'){
  s=room(30,143,110,61)+room(181,143,110,61)+robot(52,155,.65)+robot(193,150,.65)+txt(84,220,'frame t−1',9)+txt(235,220,'frame t',9)+arrow(157,153,157,128)+rect(105,91,104,28,b,.15)+txt(157,109,'image encoder',10)+snow(222,104)+arrow(157,89,157,72);
  for(let row=0;row<2;row++){s+=rect(28,23+row*29,265,22,b,.02);for(let i=0;i<8;i++)s+=rect(36+i*31,28+row*29,25,12,row===0&&i>=4?c:a,.3);}
  s+=txt(94,14,'previous tokens',8)+txt(232,14,'motion-aware tokens',8);
 }
 if(id==='waypoint-photo'){
  s=path('M62 55L205 26 260 158 103 203Z',b,'',b,.08)+path('M84 65L189 44 231 150 114 181Z',b)+path('M134 197L133 125Q125 115 128 102Q131 94 136 103L144 120 149 93Q152 85 156 94L157 122 166 108Q174 105 173 116L166 146 172 187Z',c,'',c,.18);
  const pts=[[118,67],[132,89],[144,111],[159,136],[176,161]];pts.forEach(([x,y],i)=>{if(i)s+=line(...pts[i-1],x,y,c);s+=dot(x,y,8,i===0?a:c)+txt(x,y+3,i+1,9,'white');});s+=txt(162,222,'contact trajectory · schematic',9);
 }
 if(id==='trainable-badge'){
  s=rect(36,58,248,53,b,.035,'4 3')+path('M63 95Q48 83 64 67Q61 79 69 81Q72 70 77 80Q88 96 73 101Q61 106 63 95Z',a,'',a,.7)+txt(180,89,'Trainable',16)+rect(36,131,248,53,b,.035,'4 3')+snow(72,157)+txt(180,163,'Frozen',16);
 }
 if(id==='dataset-mosaic'){
  for(let row=0;row<3;row++){let y=22+row*68;s+=rect(18,y,284,62,row===2?a:c,.05)+txt(51,y+13,['Robot','Human','Simulator'][row],9);for(let col=0;col<3;col++){let x=100+col*65;s+=room(x,y+7,57,46);if(row===1)s+=group(x+14,y+15,.42,person(0,0,b));else s+=robot(x+2,y+17,.5);for(let k=0;k<3;k++)s+=dot(x+28+k*7,y+29+k*3,2,a);}}
 }
 if(id==='local-score-cubes'){
  s=room(12,46,82,67)+rect(47,68,18,17,a,.15)+path('M65 68L115 47M65 85L115 106',b,'3 3')+grid(116,42,3,3,23,b);
  [[0,0,.2],[1,0,.4],[2,0,.1],[0,1,.7],[2,1,.3],[0,2,.8],[1,2,.9],[2,2,.6]].forEach(([x,y,n])=>s+=txt(127+x*23,57+y*23,n,9));s+=dot(150,76,4,a)+arrow(153,119,153,143);
  for(let i=0;i<4;i++){let x=98+i*30,y=168-i*8;s+=cube(x,y,20,i<2?a:c)+txt(x+10,y+15,i<2?'0':'1',10)+line(x+23,y+8,x+40,y+8,b);}
  s+=txt(58,134,'local patch',9)+txt(151,214,'neighbourhood → consistency',10)+txt(245,75,'threshold',9)+path('M206 103h78M235 98v10',b);
 }
 if(id==='dimension-matrices'){
  s=grid(14,79,4,6,10,c)+txt(34,66,'d',11)+txt(7,111,'N',10)+arrow(60,106,86,106)+grid(91,92,3,4,9,a)+txt(105,149,'W',11)+arrow(123,106,149,106)+grid(154,79,3,6,10,c)+txt(169,66,'d′',11)+grid(145,174,6,3,8,c)+path('M169 143v20',b)+txt(225,190,'transpose',8)+arrow(190,106,224,106)+grid(231,79,6,6,11,a)+txt(263,66,'N',11)+txt(157,28,'projection → pairwise relation',10);
 }
 if(id==='operator-legend'){
  [['F','multi-scale feature',c],['C','concatenate',b],['D','downsample',c],['U','upsample',c],['×','dot product',a],['+','add / normalize',a],['S','split',a]].forEach(([symbol,name,col],i)=>{let y=15+i*29;s+=rect(37,y,41,23,col,.25)+txt(58,y+16,symbol,14)+`<text x="94" y="${y+16}" font-size="12" font-family="Arial" fill="#334852">${name}</text>`;});
 }
 if(id==='denoise-intervals'){
  [0,1,2,3].forEach(i=>{let x=14+i*78;s+=plane(x+7,76,52,57,b)+rect(x,82,58,59,c,.05)+group(x+5,88,.53,car(c));for(let j=0;j<(3-i)*48;j++)s+=dot(x+3+(j*19%51),85+(j*31%52),.9,j%2?a:b);if(i<3)s+=arrow(x+61,110,x+73,110,b);s+=txt(x+28,164,'t'+i,10);});
  [[16,125,'long'],[130,226,'medium'],[231,299,'short']].forEach(([x,u,t])=>s+=path(`M${x} 187v7H${u}v-7`,b)+txt((x+u)/2,211,t,9));
 }
 if(id==='prediction-boxes'){
  for(let i=0;i<2;i++){let x=24+i*157;s+=room(x,40,113,142)+person(x+55+i*6,79,c)+rect(x+30,62,43,103,c,.01)+rect(x+43,64,43,103,a,.01,'5 3')+txt(x+30,199,'t'+i,10);}
  s+=line(54,220,74,220,c)+txt(108,224,'observed',9)+line(181,220,201,220,a,'4 3')+txt(239,224,'predicted',9);
 }
 if(id==='transform-quartet'){
  const patch=()=>{let out='';for(let y=0;y<10;y++)for(let x=0;x<10;x++)out+=rect(x*5,y*5,5,5,(x*17+y*11)%7<3?a:c,.15+((x*13+y*7)%9)/12);return out;};
  for(let i=0;i<4;i++){let x=52+(i%2)*150,y=30+Math.floor(i/2)*102;s+=rect(x-15,y-7,83,78,b,.03);if(i===0)s+=`<g transform="rotate(18 ${x+25} ${y+25})">${group(x,y,1,patch())}</g>`;if(i===1)s+=group(x+10,y+10,.65,patch());if(i===2){for(let j=0;j<5;j++)s+=`<g opacity=".2">${group(x+j*.7,y+j*.4,1,patch())}</g>`;}if(i===3)s+=group(x,y,1,patch())+rect(x,y,50,50,'#ffffff',.45);s+=txt(x+25,y+86,['rotation','scale','blur','brightness'][i],9);}
 }
 if(id==='identity-strip'){
  for(let frame=0;frame<2;frame++){let x=19+frame*157;s+=room(x,30,125,160)+person(x+42+frame*16,76,a)+person(x+85-frame*16,91,c)+rect(x+25+frame*16,60,36,97,a,.01)+rect(x+68-frame*16,76,37,98,c,.01)+txt(x+31+frame*16,56,frame?'3':'1',11,a)+txt(x+76-frame*16,72,frame?'1':'3',11,c)+txt(x+65,211,frame?'frame 10':'frame 5',10);}
 }
 if(id==='contrastive-explanation'){
  s=rect(19,19,95,95,b,.035)+group(24,26,1,bird(c,true))+rect(19,129,95,95,b,.035)+group(24,136,1,bird(c))+rect(173,85,128,120,b,.035)+group(184,97,1.3,bird(c,true))+txt(63,13,'target',9)+txt(64,125,'reference',9)+txt(237,226,'difference region',9)+txt(216,38,'What distinguishes them?',10)+path('M124 55H158V114H173M124 176H158V133H173',b)+ellipse(258,135,16,14,a,.04)+line(270,145,285,161,a);
 }
 if(id==='adaptive-cells'){
  const tree=(x,y)=>path(`M${x} ${y+81}v-39M${x} ${y+47}l-25 -19M${x} ${y+43}l24 -20`,b)+ellipse(x,y+18,36,26,b,.09);
  for(let k=0;k<2;k++){let x=18+k*164;s+=block(x,57,110,120,10,9,b)+tree(x+57,80);if(!k){for(let j=1;j<8;j++)s+=line(x+j*13.75,57,x+j*13.75,177,c)+line(x,57+j*15,x+110,57+j*15,c);}else{s+=line(x+55,57,x+55,177,c)+line(x,117,x+110,117,c);for(let i=1;i<4;i++)s+=line(x+i*27.5,57,x+i*27.5,117,c);s+=line(x,87,x+110,87,c);for(let i=0;i<4;i++)s+=line(x+27.5*i+13.75,87,x+27.5*i+13.75,117,a)+line(x+27.5*i,102,x+27.5*(i+1),102,a);}}
  s+=txt(74,207,'uniform subdivision',9)+txt(239,207,'detail-adaptive cells',9)+txt(160,26,'same geometry · visible cross-section',10);
 }
 if(id==='residual-tree'){
  const nodes=[[73,48],[39,105],[105,105],[20,166],[57,166],[91,166],[128,166]],cols=[c,b,a,b,b,a,a];
  const drawTree=(dx,delta)=>{let q='';[[0,1],[0,2],[1,3],[1,4],[2,5],[2,6]].forEach(([u,v])=>q+=line(nodes[u][0]+dx,nodes[u][1]+11,nodes[v][0]+dx,nodes[v][1]-10,b));nodes.forEach(([x,y],i)=>{q+=rect(x+dx-11,y-10,22,20,cols[i],delta&&i?.08:.36);if(delta&&i)q+=txt(x+dx,y+4,'Δ',11,cols[i]);});return q;};
  s=drawTree(0,false)+drawTree(173,true)+arrow(145,105,167,105)+txt(74,203,'pooled latent tree',9)+txt(246,203,'parent-relative residuals',9)+txt(160,224,'selected branches shown',8,b);
 }
 if(id==='breadth-tokens'){
  const nodes=[[160,36],[68,86],[160,86],[252,86],[125,132],[195,132]],cols=[c,b,b,b,a,a];
  [[0,1],[0,2],[0,3],[2,4],[2,5]].forEach(([u,v])=>s+=line(nodes[u][0],nodes[u][1]+11,nodes[v][0],nodes[v][1]-11,b));nodes.forEach(([x,y],i)=>s+=rect(x-16,y-11,31,22,cols[i],.2)+txt(x,y+4,'n'+i,10));
  s+=arrow(160,148,160,169);
  nodes.forEach((_,i)=>{let x=24+i*49;s+=rect(x,178,26,26,cols[i],.12)+txt(x+13,195,'n'+i,9)+rect(x+28,178,10,26,cols[i],.5);});s+=txt(160,224,'breadth-first order · node code + latent',9);
 }
 if(id==='centroid-shift'){
  s=grid(53,43,10,8,21,b)+ellipse(197,118,37,45,c,.16)+ellipse(156,142,33,26,a,.16)+ellipse(96,118,27,30,a,.03)+line(197,43,197,211,c,'4 4')+dot(197,118,4,c)+dot(156,142,4,a)+dot(96,118,3,a)+arrow(144,137,106,123,a)+txt(197,29,'reference centroid',9)+txt(98,29,'target',9)+txt(160,228,'source shifts left of the reference',9);
 }
 if(id==='transport-cost'){
  const heat=(x,y,after)=>{let q='';for(let j=0;j<6;j++)for(let i=0;i<7;i++){let col=i>3&&i<6?c:b,alpha=i>3&&i<6?.12+Math.exp(-((i-4.5)**2+(j-2.5)**2)/2)*.45:.045;q+=rect(x+i*17,y+j*17,17,17,col,alpha);}q+=ellipse(x+77,y+53,20,29,c,.04)+ellipse(x+(after?27:65),y+62,19,18,a,.3)+dot(x+77,y+53,3,c);if(!after)q+=path(`M${x+63} ${y+57}Q${x+50} ${y+15} ${x+26} ${y+39}`,a);return q;};
  s=heat(20,66,false)+heat(182,66,true)+arrow(145,117,174,117)+txt(81,194,'source + reference cost',9)+txt(241,194,'repositioned distribution',9)+txt(160,32,'high-cost region discourages overlap',10);
 }
 if(id==='wavelet-branches'){
  ['LL','LH','HL','HH'].forEach((name,i)=>{let y=31+i*43;s+=rect(24,y,39,31,i?c:a,.08);if(i===0)s+=ellipse(44,y+17,13,8,a,.25);else for(let j=0;j<4;j++)s+=i===1?line(28,y+5+j*6,59,y+5+j*6,c):i===2?line(31+j*8,y+4,31+j*8,y+27,c):path(`M${29+j*7} ${y+26}l10 -20`,c);s+=txt(78,y+20,name,9)+arrow(94,y+16,118,y+16)+rect(125,y,74,31,c,.1)+txt(162,y+20,'normalize',9)+path(`M207 ${y+16}H227V112H247`,b);});
  s+=rect(248,88,48,48,a,.12)+txt(272,117,'IDWT',10)+txt(160,222,'four frequency bands → spatial feature',9);
 }
 if(id==='distribution-realign'){
  const bell=(cx,cy,col,spread,height)=>{let q=path(`M${cx} ${cy-22}l55 22 -55 22 -55 -22Z`,col,'',col,.08);const proj=(u,v)=>[cx+(u-v)*13,cy+(u+v)*5-height*Math.exp(-(u*u+v*v)/spread)];for(let u=-2;u<=2;u+=.4){let pts=[];for(let v=-2;v<=2.01;v+=.2)pts.push(proj(u,v));q+=path('M'+pts.map(p=>p.join(' ')).join('L'),col);let pts2=[];for(let v=-2;v<=2.01;v+=.2)pts2.push(proj(v,u));q+=path('M'+pts2.map(p=>p.join(' ')).join('L'),col);}return `<g opacity=".75">${q.replaceAll('stroke-width="1.4"','stroke-width=".65"')}</g>`;};
  s=bell(160,82,c,1.5,43)+bell(70,177,b,3.5,24)+bell(251,177,a,1.6,40)+arrow(123,169,196,169,a)+path('M107 115Q115 91 123 86',b,'4 3')+path('M210 118Q202 96 196 89',a,'4 3')+txt(160,23,'full precision',10)+txt(70,221,'binary',10)+txt(251,221,'realigned',10)+txt(160,151,'normalize',9);
 }
 if(id==='prior-affine'){
  for(let i=0;i<6;i++)s+=rect(101+i*20,24,16,14,c,.2);s+=arrow(158,42,158,58)+rect(120,65,78,24,b,.08)+txt(159,81,'linear + split',9)+path('M140 91V112H111V157M180 91V112H215V157',b)+txt(99,116,'scale',9)+txt(229,116,'shift',9);
  s+=plane(18,148,37,48,c)+arrow(65,170,93,170)+ellipse(111,170,13,13,a,.12)+txt(111,174,'×',16)+arrow(128,170,195,170)+ellipse(215,170,13,13,a,.12)+txt(215,175,'+',17)+arrow(232,170,256,170)+plane(263,148,37,48,a)+txt(160,220,'prior-conditioned feature modulation',9);
 }
 if(id==='token-bypass'){
  [34,76,118,160].forEach((y,j)=>s+=rect(44,y,229,25,j===1||j===2?a:c,.07)+txt(158,y+16,['full layer','partial layer','partial layer','full layer'][j],9));
  for(let i=0;i<8;i++){let x=55+i*29,route=[1,6].includes(i);s+=rect(x-5,12,10,12,route?a:c,.25)+rect(x-5,204,10,12,route?a:c,.25)+line(x,25,x,33,b)+line(x,186,x,203,b);if(route)s+=path(`M${x} 61C${x-15} 83 ${x-15} 133 ${x} 156`,a);else{[61,102,145].forEach(y=>s+=line(x,y,x,y+12,b,'2 3'));}}
  s+=txt(160,235,'same tokens return after the skipped layers',8);
 }
 if(id==='subset-router'){
  for(let j=0;j<3;j++)for(let i=0;i<4;i++){let index=j*4+i,keep=[1,3,4,8,10].includes(index);s+=rect(24+i*25,67+j*30,19,22,c,.22)+rect(202+i*25,67+j*30,19,22,keep?c:b,keep?.22:.01,keep?'':'3 3');if(keep)s+=dot(211+i*25,78+j*30,2,a);}
  s+=arrow(131,108,185,108)+rect(141,45,30,30,a,.12);[[148,52],[163,52],[155,60],[148,68],[163,68]].forEach(p=>s+=dot(...p,2,a));s+=txt(70,191,'full token set',10)+txt(248,191,'selected subset',10)+txt(160,220,'empty slots preserve token identity',9);
 }
 if(id==='gaussian-occlusion'){
  s=ellipse(154,155,63,21,a,.18)+ellipse(196,171,57,20,c,.25)+ellipse(117,184,36,15,b,.2);
  [[61,47],[258,47]].forEach(([x,y],i)=>{s+=rect(x-12,y-7,25,16,b,.2)+ellipse(x,y,5,5,c,.5);for(let j=0;j<3;j++)s+=line(x,y+10,114+j*39,157+j*9,b,'2 4');for(let j=0;j<3;j++)s+=rect(x-24+j*17,y+31,17,7,(i?[c,a,b]:[a,b,c])[j],.6);});
  s+=txt(62,28,'view A',9)+txt(259,28,'view B',9)+txt(160,223,'view-dependent visibility order',9);
 }
 if(id==='masked-composite'){
  const mask=(x,y)=>rect(x,y,75,57,'#33434b',1)+group(x+10,y+17,.48,path('M4 40L21 31 36 12 73 12 94 32 111 38V60H4Z','#ffffff','','#ffffff',1)+ellipse(26,60,10,10,'#ffffff',1)+ellipse(88,60,10,10,'#ffffff',1));
  s=room(15,33,79,65)+txt(54,23,'background',9)+mask(122,37)+txt(160,23,'mask',9)+group(230,45,.65,car(a))+txt(267,23,'foreground',9)+path('M54 104V123H160M160 99v34M267 101v22H160',b)+arrow(160,128,160,143)+room(105,151,110,60)+group(123,167,.58,car(a))+txt(160,229,'foreground-only composition',9);
 }
 if(id==='gaussian-parameter-locks'){
  const lock=(x,y)=>path(`M${x-4} ${y}v-4a4 4 0 0 1 8 0v4M${x-6} ${y}h12v10h-12Z`,b,'',b,.15);
  s=ellipse(160,119,51,25,a,.18)+ellipse(160,119,18,49,c,.08)+arrow(160,119,211,140)+arrow(160,119,124,153)+arrow(160,119,160,64)+dot(160,119,3,a);
  [[52,49,'position'],[52,185,'shape'],[262,49,'opacity']].forEach(([x,y,t])=>s+=lock(x,y)+txt(x,y+26,t,9)+line(x+(x<160?18:-18),y+13,160+(x<160?-30:30),119+(y<119?-21:21),b,'3 3'));
  s+=rect(237,171,51,24,a,.2)+txt(262,187,'color',10,a)+arrow(210,140,246,166,a)+txt(160,223,'frozen geometry · editable appearance',9);
 }
 if(id==='basis-weights'||id==='basis-merge-prune'){
  const ball=(x,y,r,col,gloss=false)=>{let q=ellipse(x,y,r,r,col,1);for(let i=0;i<15;i++)q+=`<circle cx="${x-r*.24}" cy="${y-r*.25}" r="${r*(.69-i*.04)}" fill="white" opacity="${gloss?.03:.018}"/>`;if(gloss)q+=`<ellipse cx="${x-r*.3}" cy="${y-r*.32}" rx="${r*.11}" ry="${r*.09}" fill="white"/>`;return q;};
  if(id==='basis-weights'){
   const vase=(x,y,col,which)=>path(`M${x+13} ${y}h26l-5 17q20 33 8 48h-32q-12 -15 8 -48Z`,b,'',b,.05)+[path(`M${x+13} ${y}h26l-5 17H${x+18}Z`,col,'',col,.7),path(`M${x+18} ${y+17}h16q9 14 12 28H${x+6}q3 -14 12 -28Z`,col,'',col,.65),path(`M${x+6} ${y+45}h40q3 11 -4 20H${x+10}q-7 -9 -4 -20Z`,col,'',col,.65)][which];
   [0,1,2].forEach(i=>{let x=55+i*104,col=[c,a,b][i];s+=ball(x,52,23,col,i===1)+rect(x-38,94,76,87,b,.035)+vase(x-26,103,col,i)+txt(x,202,['base A','base B','base C'][i],10);});s+=txt(160,228,'material swatch ↔ spatial weight support',9);
  }else{
   [c,a,c,b].forEach((col,i)=>{let y=37+i*47;s+=ball(47,y,15,col,i===1)+rect(78,y-12,33,23,b,.04);for(let j=0;j<(i===3?1:9);j++)s+=dot(83+j%4*7,y-7+Math.floor(j/4)*7,2,col);});
   s+=path('M117 37H136V131H117M136 84H170',c)+txt(185,39,'similar response',8)+txt(185,51,'+ geometry',8)+arrow(170,84,225,84,c)+ball(265,84,23,c)+path('M117 178H197',b,'3 3')+path('M218 166l24 24m-24 0l24 -24',a)+txt(167,203,'low support → remove',9)+txt(265,124,'merge',10);
  }
 }
 if(id==='spatial-token-anchors'){
  for(let j=0;j<6;j++)for(let i=0;i<6;i++){let local=(i%3===1&&j%3===1),global=(i===4&&j===1||i===5&&j===2);s+=rect(19+i*21,45+j*23,18,20,global?a:c,local||global?.35:.045);if(local)s+=dot(28+i*21,55+j*23,3,c);if(global)s+=rect(17+i*21,43+j*23,22,24,a,0);}
  s+=line(81,42,81,185,b,'3 3')+line(16,113,146,113,b,'3 3')+arrow(154,113,191,113);
  [[213,83],[245,83],[213,119],[245,119],[276,101]].forEach(([x,y],i)=>s+=rect(x,y,21,23,i===4?a:c,.3)+(i<4?dot(x+10,y+11,3,c):''));
  s+=txt(83,209,'local + global anchors',9)+txt(249,169,'deduplicate',9)+txt(249,209,'retained anchors',9);
 }
 if(id==='transport-plan'){
  const w=[[.2,.1,0],[0,.2,.1],[.1,0,.3]];
  for(let i=0;i<3;i++)for(let j=0;j<3;j++)if(w[i][j])s+=`<path d="M42 ${64+i*48}L116 ${64+j*48}" stroke="${i===2?a:c}" stroke-width="${w[i][j]*12}" opacity=".5"/>`;
  for(let i=0;i<3;i++)s+=rect(28,54+i*48,16,20,c,.2)+rect(116,54+i*48,16,20,a,.2);
  s+=arrow(141,113,166,113);
  for(let i=0;i<3;i++)for(let j=0;j<3;j++){s+=rect(180+j*29,72+i*29,28,28,b,.03);if(w[i][j])s+=dot(194+j*29,86+i*29,Math.sqrt(w[i][j]/.3)*10,a);}
  for(let i=0;i<3;i++){let sum=w[i].reduce((x,y)=>x+y,0);s+=rect(272,75+i*29,sum*55,22,c,.3);let col=w.reduce((n,row)=>n+row[i],0);s+=rect(184+i*29,63-col*60,20,col*60,c,.3);}
  s+=txt(80,207,'soft assignment',9)+txt(230,207,'weights + marginals',9)+txt(160,229,'illustrative nonnegative mass · sum = 1',8);
 }
 if(id==='temporal-anchor'){
  s=rect(116,20,90,54,c,.08)+txt(161,41,'anchor frame',9);for(let j=0;j<4;j++)s+=rect(126+j*18,51,12,13,c,.2);
  [29,127,225].forEach((x,i)=>{s+=rect(x,135,67,42,b,.05)+txt(x+33,155,'frame '+(i+1),9);for(let j=0;j<4;j++)s+=rect(x+4+j*15,181,11,12,j===3?a:c,.25);s+=arrow(x+33,130,139+i*22,83,c)+path(`M${x+55} 197v12H293V89`,a,'3 3');});
  for(let i=0;i<3;i++)s+=rect(286,39+i*18,13,13,a,.25);s+=txt(160,111,'similar context aggregates',9)+txt(160,230,'distinct motion tokens remain separate',9);
 }
 const label=options.label??'';if(label)s+=txt(160,236,label,10,'#293a43');
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240">${s}</svg>`;
}
for(const r of selected){const t={id:'inspired-'+r.id,name:r.name,label:r.name,category:'paper-inspired',kind:'paper-inspired',ref:r.sourceTitle+' · '+r.figure,semanticType:'visual-pattern',depth:false,hint:r.why+' '+r.limit,tags:r.category+' '+r.sourceTitle,visualReference:{...r,image:'paper-inspiration/redrawn/'+r.id+'.svg',renderedAs:'vector_redraw',prototype:r.id},invariant:r.limit};index.set(t.id,t);T.catalog.push(t);}
T.markup=(id,opts)=>index.has(id)?markup(index.get(id).visualReference.id,opts):oldMarkup(id,opts);
const independent=T.independentCatalog;T.independentCatalog=()=>independent().filter(t=>t.semanticType!=='visual-pattern');
T.selectCatalog=opts=>opts?.view==='paper-patterns'?[...index.values()].filter(t=>(opts.category==='all'||!opts.category||opts.category===t.category)&&`${t.name} ${t.tags}`.toLowerCase().includes((opts.query||'').toLowerCase())):oldSelect(opts).filter(t=>t.semanticType!=='visual-pattern');
T.inspiredIndex=index;
})(typeof window==='object'?window:globalThis);
