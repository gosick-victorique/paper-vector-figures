(function(root){
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const catalog=[
 {id:'network',name:'网络体块',kind:'network',category:'network',ref:'C3',hint:'定位一个网络或目标层；厚度不代表参数量。'},
 {id:'layers',name:'展开特征层',kind:'tensor',category:'tensor',ref:'C2',hint:'层间深度用于区分切片；需标明实际维度含义。'},
 {id:'matrix',name:'注意力矩阵',kind:'attention',category:'attention',ref:'C4',hint:'强调被选行；矩阵值为示意，不是实测响应。'},
 {id:'pyramid',name:'多尺度平面',kind:'multiscale',category:'space',ref:'C7',hint:'尺寸区别表示分辨率；核实对应关系与处理对象。'},
 {id:'vectors',name:'同源空间向量',kind:'vectors',category:'space',ref:'C8',hint:'适合方向或余弦关系；不可替代任意损失。'},
 {id:'voxel',name:'透明体素',kind:'voxel',category:'space',ref:'C9',hint:'显露体内选区；不应暗示论文中不存在的空间结构。'},
 {id:'mask',name:'掩膜叠层',kind:'mask',category:'tensor',ref:'C5',hint:'只表达选择关系；选区不是计算所得的 Sobel 掩膜。'},
 {id:'arrow',name:'局部连接箭头',kind:'arrow',category:'basic',ref:'连接',hint:'表达局部方向；需自行对齐输入和输出接口。'},
 {id:'label',name:'短标签',kind:'label',category:'basic',ref:'标签',hint:'用简短对象名辅助判读，长解释留给图注。'}
];
const categories={image:'图像与样本',network:'网络与模型',tensor:'特征与张量',attention:'注意力与选择',space:'空间与几何',operation:'运算与更新',memory:'记忆与关系',basic:'标注与连接'};
const extra=[
 ['photo-plane','图像承载面','image','image','C1','用正视图保留真实外观；当前是图片容器示意，需要换入真实素材。','image photo sample'],
 ['sample-pair','同源样本对照','image','image','C1','保持相同裁剪与尺度，比较两个状态；此处不声称真实模型输出。','before after comparison'],
 ['crop-zoom','局部放大窗口','image','image','C1','局部框与放大区域必须同源对应。','zoom crop inset'],
 ['patch-grid','图像分块展开','tensor','image','C2','显示图像 patch 的空间索引；不代表已计算的嵌入。','patch image tokens'],
 ['encoder-decoder','编码—解码结构','network','network','C3','层尺寸仅概括空间分辨率；跳连应按论文核实。','UNet encoder decoder'],
 ['parallel-ensemble','并列模型集合','network','network','C3','分支并列，不暗示串行执行或共享参数。','ensemble parallel backbone'],
 ['residual-block','残差局部支路','network','network','C3','仅在存在残差相加时使用；短跳连保留真实合并关系。','residual skip resnet'],
 ['target-layer','主干目标层抽出','network','network','C3','以整体主干定位关键操作层，避免所有层同等展开。','backbone selected layer'],
 ['mlp','全连接网络','network','network','C3','节点与连接仅为拓扑示意；不要当成真实宽度。','MLP fully connected'],
 ['tensor-cube','张量体块','tensor','tensor','C2','仅在轴含义明确时标注维度；体块不能默认代表 H×W×C。','tensor cube volume'],
 ['token-strip','Token 序列','tensor','tensor','C2','保持序列位置；序列不一定有二维空间邻接。','embedding sequence token'],
 ['feature-grid','二维特征读数','tensor','tensor','C2','密集读数保持正视；颜色是示意而非实测激活。','feature heatmap map'],
 ['slice-extract','体块切片抽出','tensor','tensor','C2','高亮原始位置并保留抽出切片的对应。','tensor slice extraction'],
 ['qkv','Q / K / V 对应','attention','attention','C4','核实 Q 与 K/V 的来源；此模板只表示对应关系。','query key value attention'],
 ['row-bars','单查询权重条带','attention','attention','C4','展示同一查询在 token 上的权重，不代替全矩阵统计。','query token weights'],
 ['head-stack','多头注意力展开','attention','attention','C4','深度用于区分 heads，行列仍是 query 与 key。','multi head attention'],
 ['variance-map','查询统计图与读数','attention','attention','C4','查询统计图与选中查询的权重读数分开，不能混同矩阵。','variance statistics attention'],
 ['multiview','共同对象多视图','multiscale','space','C9','共享空间对象与观察方向；不虚构相机标定。','camera views multiview'],
 ['point-cloud','稀疏点云与选区','voxel','space','C9','用稀疏点呈现表面或样本，坐标与密度为示意。','point cloud geometry'],
 ['cutaway','透明体剖面','voxel','space','C9','用剖面显露内部对象，透明度只用于避免遮挡。','volume cutaway section'],
 ['nested-scales','嵌套尺度窗口','multiscale','space','C7','同一位置的不同范围，不能误称独立图像内容。','scale nested window'],
 ['sum','多路加权汇合','fusion','operation','C6','用于求和或聚合；真实权重由论文确定。','weighted sum fusion'],
 ['concat','按轴拼接','fusion','operation','C6','输出保留来源边界；拼接轴需按方法核实。','concatenation concat fusion'],
 ['router','分支选择路由','fusion','operation','C6','高亮实际选择的分支，不能把全部路径同时表示为已选。','routing gate select'],
 ['gradient','梯度扰动更新','update','operation','C11','区分当前扰动、更新量与新状态；不是参数训练示意。','gradient noise perturbation update'],
 ['frequency','分块频域筛选','tensor','operation','C10','DCT 低频角仅适用于对应系数排列，返回仍是同一源块。','DCT frequency lowpass FFT'],
 ['local-loop','紧凑迭代单元','update','operation','C11','用短回路表达局部迭代，不画贯穿全图的大循环。','iteration loop local'],
 ['memory-bank','记忆槽与读取','memory','memory','C12','区分地址、内容与读取位置；条目数量为示意。','memory bank slots read'],
 ['graph','关系图与子图','graph','memory','C12','边表示关系，方向性须从论文确定；高亮实际子图。','graph nodes edges subgraph'],
 ['retrieval','查询与检索候选','memory','memory','C12','查询与候选集、选中项可追踪；不虚构相似度数值。','retrieval query topk'],
 ['bracket','分组括号与标题','label','basic','标注','将同一职责的元素聚合；括号不表达数据流。','bracket group annotation']
];
extra.forEach(([id,name,kind,category,ref,hint,tags])=>catalog.push({id,name,kind,category,ref,hint,tags}));
const depthIds=new Set(['layers','pyramid','voxel','parallel-ensemble','mlp','token-strip','head-stack','memory-bank','nested-scales']);
catalog.forEach(t=>t.depth=depthIds.has(t.id));
function extraMarkup(id,{c,a,n,label},text,plane){
 const rect=(x,y,w,h,fill=c,opacity=.13,stroke=c)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" fill-opacity="${opacity}" stroke="${stroke}" stroke-width="1.2"/>`;
 const line=(x,y,u,v,color=c,dash='')=>`<path d="M${x} ${y}L${u} ${v}" fill="none" stroke="${color}" stroke-width="1.3" ${dash?`stroke-dasharray="${dash}"`:''}/>`;
 const dot=(x,y,r=4,fill=c)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
 const arrow=(x,y,u,v,color=c)=>{const ang=Math.atan2(v-y,u-x),p=(off)=>`${u-6*Math.cos(ang)+off*Math.sin(ang)},${v-6*Math.sin(ang)-off*Math.cos(ang)}`;return line(x,y,u,v,color)+`<path d="M${u},${v}L${p(3)}L${p(-3)}Z" fill="${color}"/>`;};
 const grid=(x,y,rows=4,cols=5,size=12,selected=-1)=>{let z='';for(let r=0;r<rows;r++)for(let k=0;k<cols;k++)z+=rect(x+k*size,y+r*size,size-2,size-2,r===selected?a:c,.14+((r+k)%4)*.18,'none');return z;};
 const frame=(x,y,w,h)=>rect(x,y,w,h,'white',1)+`<path d="M${x+5} ${y+h-6}l${w*.22} -${h*.35} ${w*.17} ${h*.2} ${w*.22} -${h*.38} ${w*.25} ${h*.53}" fill="${c}" fill-opacity=".18" stroke="${c}"/>`+dot(x+w*.3,y+h*.27,3,a);
 let s='';
 if(id==='photo-plane')s=plane(22,28,110,64)+frame(29,35,95,49);
 if(id==='sample-pair')s=frame(10,30,59,60)+frame(91,30,59,60)+arrow(73,60,86,60)+text(39,105,'x',11)+text(120,105,'x′',11,a);
 if(id==='crop-zoom')s=frame(9,39,64,51)+rect(42,45,20,20,'none',0,a)+line(62,45,94,24,a)+line(62,65,94,80,a)+frame(94,24,54,56)+rect(95,25,52,54,'none',0,a);
 if(id==='patch-grid'){s=frame(12,26,66,66);for(let i=1;i<3;i++)s+=line(12+i*22,26,12+i*22,92,'#b3bdc3')+line(12,26+i*22,78,26+i*22,'#b3bdc3');s+=rect(56,26,22,22,a,.15,a)+line(78,26,106,18,a)+line(78,48,106,52,a)+plane(106,26,29,29);s+=grid(108,28,2,2,13);}
 if(id==='encoder-decoder'){const heights=[65,43,26,43,65];for(let i=0;i<5;i++)s+=plane(9+i*28,91-heights[i],16,heights[i]);s+=line(25,20,139,20,c,'3 3');}
 if(id==='parallel-ensemble'){const gap=73/(n-1);s+=dot(16,63,5);for(let i=0;i<n;i++){const y=20+i*gap;s+=line(21,63,54,y+9)+plane(54,y,47,16)+line(111,y+5,144,63);}s+=dot(144,63,5,a);}
 if(id==='residual-block')s=rect(33,45,54,37)+text(60,68,'F(x)',14)+arrow(9,64,30,64)+arrow(91,64,111,64)+`<circle cx="121" cy="64" r="11" fill="white" stroke="${a}"/>`+text(121,69,'+',16,a)+`<path d="M18 64V22H121V50" fill="none" stroke="${a}"/>`+arrow(133,64,152,64);
 if(id==='target-layer'){for(let i=0;i<4;i++)s+=plane(13+i*27,57,16,34);s+=rect(65,50,26,47,'none',0,a)+line(79,50,101,17,a)+plane(105,15,34,27)+grid(108,18,2,3,9);}
 if(id==='mlp'){for(let layer=0;layer<3;layer++){const count=layer===1?n:3,x=24+layer*56;for(let j=0;j<count;j++){const y=23+j*67/(count-1);if(layer<2){const next=layer===0?n:3;for(let k=0;k<next;k++)s+=line(x,y,x+56,23+k*67/(next-1),'#c1cbd0');}s+=dot(x,y,6,layer===1?a:c);}}}
 if(id==='tensor-cube'){s=plane(30,36,80,61)+`<path d="M30 36l29 -20h80v61l-29 20M40 28h80v61" fill="${c}" fill-opacity=".06" stroke="${c}"/>`;s+=grid(35,42,4,5,14);}
 if(id==='token-strip'){const w=124/n;for(let i=0;i<n;i++)s+=plane(12+i*w,40,Math.min(22,w-6),44)+text(22+i*w,103,String(i+1),10);}
 if(id==='feature-grid')s=grid(36,19,6,7,13)+rect(34,17,92,79,'none',0,c);
 if(id==='slice-extract'){s=plane(12,37,60,58)+rect(35,37,14,58,a,.22,a)+line(49,37,102,20,a,'3 3')+line(49,95,102,83,a,'3 3')+plane(105,25,29,58)+grid(108,29,4,2,12);}
 if(id==='qkv'){s=rect(9,25,28,23)+text(23,41,'Q',12)+rect(9,67,28,23)+text(23,83,'K',12)+arrow(41,37,66,47)+arrow(41,79,66,67)+grid(72,38,4,4,11)+rect(121,39,29,23,a,.15,a)+text(135,55,'V',12,a)+line(115,63,135,63,a);}
 if(id==='row-bars'){s=grid(10,33,5,5,10,2)+rect(8,51,51,12,'none',0,a)+arrow(64,57,79,57);for(let i=0;i<5;i++){const h=[12,19,44,9,16][i];s+=rect(84+i*13,89-h,9,h,i===2?a:c,.7,'none');}s+=line(81,90,150,90,'#bac4c8');}
 if(id==='head-stack'){for(let i=n-1;i>=0;i--){s+=rect(20+i*15,44-i*8,75,53,'white',1)+grid(24+i*15,48-i*8,4,6,11,i===0?1:-1);}}
 if(id==='variance-map'){s=grid(12,32,5,5,10)+rect(30,50,12,12,'none',0,a)+line(42,56,88,40,a,'3 3');s+=text(38,20,'query',10);for(let i=0;i<5;i++)s+=rect(86+i*12,85-[7,15,40,10,7][i],8,[7,15,40,10,7][i],i===2?a:c,.7,'none');s+=text(113,103,'tokens',10);}
 if(id==='multiview'){s=plane(62,42,30,36);for(const [x,y]of [[10,20],[119,17],[112,89]])s+=frame(x,y,30,21)+line(x+15,y+21,78,61,c,'3 3');}
 if(id==='point-cloud'){for(let i=0;i<64;i++){const z=1-2*(i+.5)/64,r=Math.sqrt(1-z*z),theta=i*2.39996,x=80+51*r*Math.cos(theta)+z*12,y=61+36*r*Math.sin(theta)-z*9;s+=dot(x,y,1.2+(z+1)*.55,x>65&&x<106&&y>40&&y<75?a:c);}s+=rect(65,40,41,35,'none',0,a);}
 if(id==='cutaway'){s=`<path d="M28 38l40 -20 62 24v54l-44 18 -58 -25Z" fill="${c}" fill-opacity=".07" stroke="${c}"/><path d="M57 24v75l30 13V38Z" fill="${a}" fill-opacity=".2" stroke="${a}"/>`;for(let i=0;i<4;i++)s+=line(61,40+i*15,81,48+i*15,a);}
 if(id==='nested-scales'){s=frame(15,20,130,86);for(let i=0;i<n;i++){const w=99-i*15,h=65-i*10;s+=rect(80-w/2,63-h/2,w,h,'none',0,i===n-1?a:c);}}
 if(id==='sum'){for(const y of [22,57,92])s+=plane(10,y,32,18)+arrow(53,y+9,78,63);s+=`<circle cx="91" cy="63" r="13" fill="white" stroke="${a}"/>`+text(91,69,'Σ',19,a)+arrow(107,63,126,63)+plane(129,51,20,25);}
 if(id==='concat'){for(let i=0;i<3;i++)s+=rect(12,22+i*28,31,18,i===1?a:c,.35)+line(44,31+i*28,87,47+i*12);s+=plane(91,32,52,54);for(let i=0;i<3;i++)s+=rect(92,33+i*17,50,16,i===1?a:c,.3,'none');}
 if(id==='router'){s=plane(12,49,29,27)+text(69,34,'gate',10);for(let i=0;i<3;i++){const y=17+i*38,color=i===1?a:'#bec8cd';s+=line(51,62,86,y+13,color)+rect(94,y,45,26,color,.12,color);}s+=dot(80,62,4,a);}
 if(id==='gradient'){s=plane(9,43,37,43);for(let i=0;i<3;i++)s+=`<path d="M13 ${52+i*11}l5 -4 5 9 5 -7 5 5 5 -4" fill="none" stroke="${c}"/>`;s+=arrow(58,63,93,63,a)+text(77,44,'∇',19,a)+plane(103,43,37,43);for(let i=0;i<3;i++)s+=`<path d="M107 ${52+i*11}q7 -5 14 0t14 0" fill="none" stroke="${a}"/>`;}
 if(id==='frequency'){s=grid(9,40,4,4,11)+arrow(57,62,83,62)+text(70,39,'DCT',10)+plane(94,36,50,50);for(let r=0;r<4;r++)for(let k=0;k<4;k++)s+=rect(96+k*12,38+r*12,10,10,r+k<3?a:c,r+k<3?.6:.09,'none');}
 if(id==='local-loop'){s=rect(47,40,68,38)+text(81,64,'update',13)+arrow(13,59,44,59)+arrow(118,59,151,59)+`<path d="M130 59V95H28V66" fill="none" stroke="${a}"/>`+arrow(28,70,28,59,a);}
 if(id==='memory-bank'){for(let i=0;i<n;i++)s+=rect(13,20+i*16,87,13,i===1?a:c,.18)+text(22,30+i*16,String(i),9);s+=arrow(103,42,140,42,a)+text(129,66,'read',11);}
 if(id==='graph'){const pts=[[22,58],[52,23],[83,58],[55,98],[124,25],[136,87]];for(const [i,j]of [[0,1],[0,3],[1,2],[2,3],[1,4],[2,4],[2,5],[3,5],[4,5]])s+=line(...pts[i],...pts[j],i===2||j===2?a:'#b5c1c6');pts.forEach(([x,y],i)=>s+=dot(x,y,7,i===2?a:c));}
 if(id==='retrieval'){s=plane(9,44,31,36)+text(25,33,'query',10);for(let i=0;i<4;i++){s+=rect(94,15+i*22,53,17,i===1?a:c,.14,i===1?a:c);s+=line(50,62,89,24+i*22,i===1?a:'#c9d1d5',i===1?'':'2 3');}s+=text(120,114,'candidates',10);}
 if(id==='bracket'){s=`<path d="M18 45V29H142V45" fill="none" stroke="${c}" stroke-width="1.5"/>`;for(let i=0;i<3;i++)s+=rect(20+i*43,55,32,32,c,.12);}
 return s+text(80,126,label,11);
}
function markup(id,options={}){
 const t=catalog.find(t=>t.id===id);if(!t)throw Error('Unknown template: '+id);
 const c=options.color||'#416f89',a=options.accent||'#ce713a',n=Math.max(2,Math.min(5,Number(options.depth)||3)),label=escape(options.label??t.name);
 const text=(x,y,t,size=13,fill='#23313c')=>`<text x="${x}" y="${y}" fill="${fill}" font-family="Arial, Microsoft YaHei, sans-serif" font-size="${size}" text-anchor="middle">${t}</text>`;
 const plane=(x,y,w,h,opacity=1)=>`<g opacity="${opacity}"><path d="M${x} ${y}l10 -8h${w}l-10 8Z" fill="${c}" fill-opacity=".12" stroke="${c}"/><path d="M${x+w} ${y}l10 -8v${h}l-10 8Z" fill="${c}" fill-opacity=".25" stroke="${c}"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="white" stroke="${c}"/></g>`;
 let s='';
 if(id==='network'){s=plane(22,25,106,47)+text(75,54,label,14);}
 if(id==='layers'){for(let i=n-1;i>=0;i--){s+=plane(20+i*12,38-i*8,80,43);for(let j=0;j<4;j++)s+=`<path d="M${28+i*12+j*16} ${43-i*8}v29" stroke="${c}" opacity=".18"/>`;}s+=text(80,103,label);}
 if(id==='matrix'){s=plane(31,21,96,64);for(let r=0;r<4;r++){for(let col=0;col<6;col++)s+=`<rect x="${33+col*16}" y="${23+r*16}" width="12" height="12" fill="${r===1?a:c}" opacity="${.18+((r+col)%4)*.18}"/>`;if(r===1)s+=`<rect x="29" y="36" width="100" height="18" fill="none" stroke="${a}" stroke-width="2"/>`;}s+=text(80,104,label);}
 if(id==='pyramid'){for(let i=n-1;i>=0;i--){const z=30+i*9;s+=`<path d="M${80-z} ${78-i*13}l${z} -17 ${z} 17 -${z} 17Z" fill="${c}" fill-opacity=".14" stroke="${c}"/>`;}s+=text(80,108,label);}
 if(id==='vectors'){s=`<path d="M32 78H133M32 78V17M32 78l-12 15" stroke="#b3bdc3" fill="none"/><path d="M32 78L125 53" stroke="${c}" stroke-width="3"/><path d="M125 53l-10 -2 4 9Z" fill="${c}"/><path d="M32 78L78 19" stroke="${a}" stroke-width="3"/><path d="M78 19l-11 5 8 6Z" fill="${a}"/><path d="M57 71q-2 -12 -7 -17" stroke="${a}" fill="none"/>`+text(80,108,label);}
 if(id==='voxel'){s=`<path d="M36 43l43 -23 44 23v43l-44 23 -43 -23Z" fill="${c}" fill-opacity=".06" stroke="${c}"/><path d="M36 43l43 23 44 -23M79 66v43M79 20v46" fill="none" stroke="${c}" opacity=".5"/><path d="M62 57l17 -9 18 9v18l-18 10 -17 -10Z" fill="${a}" fill-opacity=".7" stroke="${a}"/>`;for(let i=1;i<n;i++)s+=`<path d="M36 ${43+i*43/n}l43 23 44 -23" fill="none" stroke="${c}" opacity=".3"/>`;s+=text(80,123,label,12);}
 if(id==='mask'){s=plane(28,39,93,58);s+=`<path d="M31 33l16 -12h92l-17 12Z" fill="${c}" fill-opacity=".16" stroke="${c}"/><path d="M56 31l16 -12h27l-16 12Z" fill="${a}" fill-opacity=".65"/><path d="M64 39v58M90 39v58" stroke="${a}" stroke-dasharray="3 3"/>`+text(80,117,label);}
 if(id==='arrow')s=`<path d="M14 54H143" stroke="${c}" stroke-width="2.4"/><path d="M143 54l-12 -6v12Z" fill="${c}"/>`+text(80,41,label,12);
 if(id==='label')s=text(80,65,label,19,c);
 if(!s)s=extraMarkup(id,{c,a,n,label},text,plane);
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 130">${s}</svg>`;
}
root.FigureTemplates={catalog,categories,markup,escape};
})(typeof window==='object'?window:globalThis);
