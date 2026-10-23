(function(root){
'use strict';
const T=root.FigureTemplates,esc=T.escape,previous=T.markup,select=T.selectCatalog,independent=T.independentCatalog;
const groups={
 'f-connect':['连接与关系',[
 ['straight','单向箭头','局部前向关系；端点需手动对齐。'],['elbow','直角连接','绕开对象的正交路径。'],['curve','弧形连接','局部绕行；曲率不代表关系强度。'],['bidirectional','双向箭头','仅在两个方向都成立时使用。'],['fork','一分多连接','一个来源分送到多个目标。'],['merge','多入一连接','多路汇入一个目标；不预设具体运算。'],['local-loop','局部反馈回路','就近表达反馈，不环绕整张图。'],['inhibit','抑制端线','横杠端点表示抑制，需明确图例。'],['association','无向关联','关联关系；不自动表示数据流。'],['leader','说明引线','把说明关联到局部位置。']]],
 'f-container':['形状与分区',[
 ['rectangle','矩形容器','通用分区边界。'],['rounded','圆角容器','容纳同一组对象；不要给每个细节套框。'],['capsule','胶囊形','短状态或操作标签。'],['ellipse','椭圆区域','集合、局部范围或对象外轮廓。'],['diamond','菱形','条件或分支判断，需有真实判据。'],['hexagon','六边形','需要区别于普通框的对象。'],['bracket-group','开口分组框','只包围相关对象的三个边，降低边框密度。'],['corner-frame','角标定位框','聚焦局部选区而不过度遮挡内容。']]],
 'f-space':['空间基础体',[
 ['cuboid','长方体','维度含义由当前任务定义。'],['cylinder','圆柱体','圆柱对象或存储外形；不是通用网络默认形状。'],['cone','圆锥体','锥形范围或几何对象。'],['sphere','球体','空间点对象或材质承载体。'],['plane','倾斜平面','图像、截面或空间基面。'],['frustum','视锥体','视点与观测范围，核实近远面。'],['ellipsoid','透明椭球','不确定性或高斯基元；轴长为示意。'],['axes3d','三维坐标轴','坐标方向需要与对象视角一致。']]],
 'f-grid':['网格与表面',[
 ['square-grid','方格网','二维位置索引，不代表计算值。'],['triangle-mesh','三角网格','表面连接关系；三角形不对应真实网格数据。'],['voxel-grid','透明体素网格','三维空间离散，核实深度轴含义。'],['matrix-cells','矩阵单元','行列容器，不携带虚构权重。'],['point-cloud','空间点集','几何点集示意，不是采集数据。'],['contours','等值轮廓','同心层次表达；实测等值线应从数据生成。'],['hatching','剖面排线','表示截面、未知区或禁用区域，需要图例。'],['surface-mesh','曲面网格','连续空间表面示意；不是实测损失景观。']]],
 'f-note':['标注与定位',[
 ['caption','文字标签','只放必要的对象名或操作名。'],['panel-badge','子图编号','用于 (a)、(b) 等子图导航。'],['step-badge','步骤编号','只有真实顺序需要编号。'],['callout','气泡注释','局部说明；避免长句占据主图。'],['brace','集合花括号','将多个项视作同一集合或范围。'],['dimension','尺寸标注','端点与测量范围对齐；数值需有依据。'],['scale-bar','比例尺','插图缩放后必须同步核对物理尺度。'],['magnifier','局部放大标记','标明被放大的区域；内容必须同源。']]],
 'f-device':['设备与工具',[
 ['camera','相机','采集设备或视点。'],['robot-arm','机械臂','关节结构示意，末端和物体关系另行配置。'],['processor','处理芯片','计算硬件或处理单元。'],['server','服务器','计算设备，不默认意味着云端。'],['database','数据存储','持久化或数据集存储。'],['cloud','云端','远程服务或共享资源。'],['lens','光学透镜','光路或成像器件。'],['monitor','显示器','显示界面或图像输出。'],['satellite','卫星','遥感采集设备。'],['hand','手部轮廓','操作、交互或接触主体。']]],
 'f-object':['对象与场景',[
 ['person','人物','人员主体或交互参与者。'],['face','人脸轮廓','身份、视觉任务的示意对象，不替代真实样本。'],['eye','眼睛','观察、视线或视觉输入。'],['brain','脑部轮廓','仅表示研究对象；不默认代表所有 AI 网络。'],['vehicle','车辆','交通场景主体，非检测结果。'],['tree','树木','自然场景对象。'],['building','建筑','场景实体或空间参照。'],['globe','地球','地理范围或全球数据。']]],
 'f-symbol':['运算与状态符号',[
 ['plus','加法节点','相加或汇合必须在图例中区分。'],['multiply','乘法节点','点乘、矩阵乘与元素乘需依语义标明。'],['concatenate','拼接符号','拼接顺序与维度需由方法指定。'],['split-op','拆分符号','拆分不是复制。'],['lock','冻结锁','表示冻结或不可修改，需区分参数与位置。'],['flame','训练火焰','只用于可训练状态并配图例。'],['check','通过标记','表达已满足的条件。'],['cross','否定标记','失败、禁用或移除需在上下文区分。'],['warning','提示标记','指出读者确需关注的限定。'],['ellipsis','省略标记','省略同类项；不代表数量为零。']]],
 'f-chart':['读数与图例骨架',[
 ['axes2d','二维坐标轴','轴标签与单位由当前内容补充。'],['axis-break','坐标断轴','明确显示截断；不要掩盖数值差异。'],['error-bar','误差区间骨架','仅供构图；区间含义和数值来自实际分析。'],['legend','离散图例','颜色应与图中对象语义一致。'],['line-legend','线型图例','不同关系用不同线型并保持一致。'],['colorbar','连续色标','色标范围和映射需与真实数据一致。'],['distribution','分布曲线骨架','示意分布；不能当作测量数据。'],['timeline','时间轴','事件位置与时距含义需要明确。']]]
};
const index=new Map(),labelDefaults={caption:'Label','panel-badge':'a','step-badge':'1',callout:'Note',dimension:'d','scale-bar':'scale',axes3d:'',axes2d:'','error-bar':''};
for(const [category,[name,items]] of Object.entries(groups)){
 T.categories[category]=name;
 for(const [key,title,hint] of items){const small=category==='f-symbol'||['panel-badge','step-badge'].includes(key),line=category==='f-connect'||['dimension','scale-bar','brace','timeline'].includes(key);const t={id:'foundation-'+key,key,name:title,kind:'foundation',category,ref:'基础图形要素',semanticType:'foundation',depth:false,label:labelDefaults[key]||'',hint,tags:name+' '+key,preferredSize:small?{w:36,h:36}:line?{w:130,h:70}:category==='f-device'||category==='f-object'?{w:80,h:85}:{w:140,h:110}};index.set(t.id,t);T.catalog.push(t);}
}
function markup(t,opt={}){
 const c=/^#[\da-f]{6}$/i.test(opt.color||'')?opt.color:'#416f89',a=/^#[\da-f]{6}$/i.test(opt.accent||'')?opt.accent:'#c47a38',b='#8b9ba8',symbolColor=/^#[\da-f]{6}$/i.test(opt.color||'')?c:a;
 const width=Math.max(.5,Math.min(6,Number(opt.strokeWidth)||1.8)),alpha=Math.max(0,Math.min(1,opt.fillOpacity===undefined?.12:Number(opt.fillOpacity))),dash={solid:'',dashed:'6 4',dotted:'1 4'}[opt.lineStyle]||'',label=opt.label??t.label;
 const path=(d,col=c,fill='none',opacity=alpha,pattern=dash)=>`<path d="${d}" stroke="${col}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" ${pattern?`stroke-dasharray="${pattern}"`:''} fill="${fill}" fill-opacity="${opacity}"/>`;
 const line=(x,y,u,v,col=c,pattern=dash)=>path(`M${x} ${y}L${u} ${v}`,col,'none',1,pattern);
 const rect=(x,y,w,h,col=c,opacity=alpha,r=0)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" stroke="${col}" stroke-width="${width}" ${dash?`stroke-dasharray="${dash}"`:''} fill="${col}" fill-opacity="${opacity}"/>`;
 const ellipse=(x,y,rx,ry,col=c,opacity=alpha)=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" stroke="${col}" stroke-width="${width}" ${dash?`stroke-dasharray="${dash}"`:''} fill="${col}" fill-opacity="${opacity}"/>`;
 const dot=(x,y,r=3,col=c)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${col}"/>`;
 const text=(x,y,s,size=16,col=c)=>`<text x="${x}" y="${y}" text-anchor="middle" font-family="Arial, Microsoft YaHei, sans-serif" font-size="${size}" fill="${col}">${esc(s)}</text>`;
 const head=(x,y,angle,col=c,which='end')=>{let co=Math.cos(angle),si=Math.sin(angle);return path(`M${x-10*co+5*si} ${y-10*si-5*co}L${x} ${y}L${x-10*co-5*si} ${y-10*si+5*co}`,col,'none',1,'').replace('<path ',`<path data-connector-end="${which}" `);};
 const arrow=(x,y,u,v,col=c)=>line(x,y,u,v,col)+head(u,v,Math.atan2(v-y,u-x),col);
 const block=(x,y,w,h,dx=25,dy=18)=>path(`M${x} ${y}h${w}v${h}h${-w}Z`,c,c)+path(`M${x} ${y}l${dx} ${-dy}h${w}l${-dx} ${dy}Z`,c,c,alpha*.6)+path(`M${x+w} ${y}l${dx} ${-dy}v${h}l${-dx} ${dy}Z`,c,c,Math.min(1,alpha*1.8));
 const g=(x,y,k,body)=>`<g transform="translate(${x} ${y}) scale(${k})">${body}</g>`;
 let s='';const k=t.key;
 if(k==='straight')s=arrow(45,120,275,120);
 if(k==='elbow')s=path('M50 170H155V70H275')+head(275,70,0);
 if(k==='curve')s=path('M45 165C100 25 220 25 275 165')+head(275,165,1.2);
 if(k==='bidirectional')s=line(45,120,275,120)+head(45,120,Math.PI,c,'start')+head(275,120,0);
 if(k==='fork')s=line(45,120,150,120)+path('M150 65V175')+arrow(150,65,275,65)+arrow(150,175,275,175)+dot(150,120);
 if(k==='merge')s=path('M45 65H150V175H45')+arrow(150,120,275,120)+dot(150,120);
 if(k==='local-loop')s=path('M96 166C30 160 42 66 104 63H218C279 66 281 171 225 173H173')+head(173,173,Math.PI);
 if(k==='inhibit')s=line(45,120,266,120)+line(266,100,266,140,c,'').replace('<path ','<path data-connector-end="end" ');
 if(k==='association')s=line(45,120,275,120)+dot(45,120,5).replace('<circle ','<circle data-connector-end="start" ')+dot(275,120,5).replace('<circle ','<circle data-connector-end="end" ');
 if(k==='leader')s=dot(61,170,5,a).replace('<circle ','<circle data-connector-end="start" ')+path('M61 170L148 77H275');
 if(k==='rectangle')s=rect(53,58,214,124);
 if(k==='rounded')s=rect(53,58,214,124,c,alpha,15);
 if(k==='capsule')s=rect(44,83,232,74,c,alpha,37);
 if(k==='ellipse')s=ellipse(160,120,106,67);
 if(k==='diamond')s=path('M160 36L277 120 160 204 43 120Z',c,c);
 if(k==='hexagon')s=path('M93 51H227L278 120 227 189H93L42 120Z',c,c);
 if(k==='bracket-group')s=path('M97 39H64V201H97M223 39H256V201H223');
 if(k==='corner-frame')s=path('M53 95V52H98M222 52H267V95M267 146V188H222M98 188H53V146');
 if(k==='cuboid')s=block(65,77,155,118,35,27);
 if(k==='cylinder')s=path('M83 70V173C83 209 237 209 237 173V70',c,c)+ellipse(160,70,77,24)+path('M83 173C83 144 237 144 237 173',b,'none',1,'4 4');
 if(k==='cone')s=path('M160 38L71 178A89 25 0 0 0 249 178Z',c,c)+ellipse(160,178,89,25)+line(160,38,160,178,b,'4 4');
 if(k==='sphere'){s=ellipse(160,120,76,76)+ellipse(160,120,31,76,b,0)+ellipse(160,120,76,25,b,0);}
 if(k==='plane')s=path('M54 152L109 64 273 85 216 173Z',c,c);
 if(k==='frustum')s=path('M48 86L48 153 105 174 105 67Z',c,c)+path('M203 38V195L278 219V15Z',c,c,alpha*.5)+line(48,86,203,38)+line(48,153,203,195)+line(105,174,278,219)+line(105,67,278,15);
 if(k==='ellipsoid')s=g(160,120,1,`<g transform="rotate(-23)">${ellipse(0,0,112,43)}${ellipse(0,0,112,18,b,0)}${ellipse(0,0,32,43,b,0)}</g>`);
 if(k==='axes3d')s=arrow(145,145,269,174)+arrow(145,145,66,191)+arrow(145,145,145,34)+text(281,184,'x',13)+text(56,208,'y',13)+text(145,24,'z',13);
 if(k==='square-grid'||k==='matrix-cells'){for(let j=0;j<6;j++)for(let i=0;i<8;i++)s+=rect(56+i*26,42+j*26,26-(k==='matrix-cells'?4:0),26-(k==='matrix-cells'?4:0),c,k==='matrix-cells'?alpha:0,k==='matrix-cells'?2:0);}
 if(k==='triangle-mesh'){for(let j=0;j<4;j++)for(let i=0;i<6;i++){let x=48+i*36,y=50+j*35;s+=path(`M${x} ${y}h36l-18 35Z`,c,c,alpha*.5)+path(`M${x} ${y}l-18 35h36`,c);}}
 if(k==='voxel-grid'){s=block(65,72,144,132,38,30);for(let i=1;i<6;i++)s+=line(65+i*24,72,65+i*24,204)+line(65,72+i*22,209,72+i*22)+line(65+i*24,72,103+i*24,42)+line(209,72+i*22,247,42+i*22);for(let i=1;i<4;i++)s+=path(`M${65+i*9.5} ${72-i*7.5}h144v132`,b,'none',1,'3 3');}
 if(k==='point-cloud')for(let j=0;j<12;j++)for(let i=0;i<18;i++){let x=57+i*12+j*2,y=69+j*9+Math.sin(i*.4)*22;s+=dot(x,y,1.4+(i+j)%3*.3,j<5?c:b);}
 if(k==='contours')for(let i=0;i<6;i++)s+=path(`M${160-i*17} ${120-i*12}C${206+i*13} ${71-i*5} ${213+i*10} ${159+i*7} ${166+i*3} ${150+i*10}S${91-i*10} ${157+i*2} ${160-i*17} ${120-i*12}Z`);
 if(k==='hatching'){s=rect(65,45,190,150,c,0);for(let x=77;x<315;x+=12){let topX=Math.min(x,255),topY=45+Math.max(0,x-255)*2.5,bottomX=Math.max(65,x-60),bottomY=45+Math.min(60,x-65)*2.5;s+=line(bottomX,bottomY,topX,topY);}}
 if(k==='surface-mesh'){const p=(u,v)=>[160+(u-v)*30,150+(u+v)*12-50*Math.exp(-(u*u+v*v)/2)];for(let u=-2;u<=2;u+=.4){let points=[],q=[];for(let v=-2;v<=2.01;v+=.2){points.push(p(u,v));q.push(p(v,u));}s+=path('M'+points.map(p=>p.join(' ')).join('L'))+path('M'+q.map(p=>p.join(' ')).join('L'));}}
 if(k==='caption')s=text(160,133,label||'Label',34);
 if(k==='panel-badge')s=text(160,134,'('+String(label||'a')+')',38);
 if(k==='step-badge')s=ellipse(160,120,42,42)+text(160,135,label||'1',42);
 if(k==='callout')s=path('M55 52H265V154H176L133 193 139 154H55Z',c,c)+text(160,114,label||'Note',24);
 if(k==='brace')s=path('M47 74Q47 115 98 115H132Q159 115 160 143Q161 115 188 115H222Q273 115 273 74');
 if(k==='dimension')s=line(52,72,52,175,b)+line(268,72,268,175,b)+line(52,137,268,137)+head(52,137,Math.PI)+head(268,137,0)+text(160,116,label||'d',22);
 if(k==='scale-bar')s=rect(75,113,170,11,c,1)+line(75,102,75,136)+line(245,102,245,136)+text(160,90,label||'scale',20);
 if(k==='magnifier')s=ellipse(132,103,59,59,c,0)+path('M176 147L250 207')+ellipse(132,103,41,41,b,0);
 if(k==='camera')s=rect(66,77,190,112,c,alpha,9)+path('M100 77l15 -26h61l15 26',c,c)+ellipse(165,132,39,39)+ellipse(165,132,26,26,c,alpha)+rect(219,90,20,13,c,1);
 if(k==='robot-arm')s=rect(45,179,68,24)+line(78,179,106,116)+line(106,116,183,64)+line(183,64,241,111)+ellipse(106,116,15,15)+ellipse(183,64,13,13)+ellipse(241,111,9,9)+path('M232 119l-9 24 18 12M248 118l19 18 -10 18');
 if(k==='processor'){s=rect(92,53,136,136,c,alpha,5)+rect(118,79,84,84,c,alpha*2,3);for(let i=0;i<7;i++){let p=106+i*18,q=67+i*18;s+=line(p,35,p,53)+line(p,189,p,207)+line(74,q,92,q)+line(228,q,246,q);}}
 if(k==='server')for(let i=0;i<3;i++){let y=48+i*53;s+=block(80,y,137,38,20,12)+dot(95,y+19,3,a)+line(113,y+15,194,y+15)+line(113,y+24,194,y+24);}
 if(k==='database'){s=path('M85 60V183C85 214 235 214 235 183V60',c,c)+ellipse(160,60,75,24);[100,142,183].forEach(y=>s+=path(`M85 ${y}C85 ${y+30} 235 ${y+30} 235 ${y}`));}
 if(k==='cloud')s=path('M86 177C25 177 26 104 78 103C74 39 161 21 187 76C245 41 285 108 262 123C301 165 256 192 227 177Z',c,c);
 if(k==='lens')s=path('M160 40Q89 120 160 200Q231 120 160 40Z',c,c)+line(39,120,281,120,b,'4 4')+arrow(43,68,139,103,a)+arrow(181,137,277,171,a);
 if(k==='monitor')s=rect(53,43,214,140,c,alpha,7)+rect(65,55,190,112,c,0)+path('M143 183v23h-36m70 -23v23h36M107 206h106');
 if(k==='satellite'){s=block(136,88,47,70,18,13);for(let side=0;side<2;side++)for(let j=0;j<3;j++)for(let i=0;i<3;i++)s+=rect(39+side*168+i*23,84+j*25,20,22,c,alpha*1.5);s+=path('M159 82V51M143 41Q159 67 175 41')+line(109,120,136,120)+line(201,120,207,120);}
 if(k==='hand')s=path('M112 206L83 142Q69 109 84 110L111 141V62Q111 44 122 50V115L130 41Q134 23 145 37V111L155 43Q162 27 170 43V116L182 69Q190 52 197 69L191 146Q188 180 178 206Z',c,c);
 if(k==='person')s=ellipse(160,54,23,25)+path('M134 92Q160 80 186 92L199 150H179L183 212H165L160 157 155 212H137L141 150H121Z',c,c);
 if(k==='face')s=ellipse(160,115,64,84)+path('M105 86Q107 31 159 32Q213 32 217 86M149 98l-7 38h21M137 158Q160 173 183 158')+ellipse(133,100,11,6,c,0)+ellipse(185,100,11,6,c,0)+dot(134,100,3)+dot(184,100,3);
 if(k==='eye')s=path('M41 120Q160 13 279 120Q160 227 41 120Z',c,c)+ellipse(160,120,47,47)+ellipse(160,120,21,21,c,.9)+dot(147,104,6,'white');
 if(k==='brain')s=path('M159 193Q116 218 93 184Q49 185 62 143Q32 109 63 86Q61 45 105 47Q122 18 155 39Q193 16 214 50Q256 49 253 92Q285 118 253 146Q262 181 224 185Q198 219 163 191Z',c,c)+path('M159 43v146M106 52q-20 24 1 39t-13 45M211 55q20 23 -1 44t17 38M78 94q44 -8 42 29M224 102q-41 -6 -36 26M98 169q30 -37 45 -17M181 158q29 -23 44 13');
 if(k==='vehicle')s=path('M48 119L85 102 117 64H204L241 104 276 119V170H44Z',c,c)+path('M101 105L127 75H196L222 105Z',c,c,alpha*2)+line(166,75,166,168)+ellipse(94,172,25,25,c,.5)+ellipse(232,172,25,25,c,.5);
 if(k==='tree')s=path('M151 202V139H172V202Z',b,b,alpha*2)+path('M89 137Q40 100 99 78Q93 27 141 43Q166 6 191 44Q238 25 235 79Q285 109 237 140Z',c,c)+path('M160 153V81M160 121l-36 -23M160 112l35 -29');
 if(k==='building'){s=block(87,45,128,160,28,16);for(let j=0;j<4;j++)for(let i=0;i<3;i++)s+=rect(102+i*37,62+j*29,20,18,c,alpha*2);s+=rect(132,177,38,28,c,alpha*2);}
 if(k==='globe')s=ellipse(160,120,82,82)+ellipse(160,120,35,82,b,0)+ellipse(160,120,82,30,b,0)+path('M102 62l31 1 12 23 -23 15 -11 34 -22 -16M173 126l28 -24 35 13 -14 26 -8 36 -24 7Z',c,c,alpha*2);
 if(k==='plus'||k==='multiply'){s=ellipse(160,120,56,56);s+=k==='plus'?line(130,120,190,120)+line(160,90,160,150):line(137,97,183,143)+line(137,143,183,97);}
 if(k==='concatenate')s=rect(93,65,63,110,c,alpha)+rect(164,65,63,110,a,alpha)+path('M82 51H238M82 189H238');
 if(k==='split-op')s=rect(62,92,70,56,c,alpha)+path('M141 120H171V70H205M171 120V170H205')+rect(211,50,47,40,c,alpha)+rect(211,150,47,40,a,alpha);
 if(k==='lock')s=path('M121 110V73a39 39 0 0 1 78 0v37')+rect(103,110,114,94,c,alpha,6)+ellipse(160,148,9,9,c,.8)+line(160,156,160,174);
 if(k==='flame')s=path('M158 29Q164 79 196 84Q191 54 204 59Q250 107 217 167Q196 209 149 204Q92 202 99 143Q104 110 129 83Q118 123 146 125Q172 105 158 29Z',symbolColor,symbolColor,alpha);
 if(k==='check')s=path('M75 124L132 178 250 58');
 if(k==='cross')s=path('M92 52L228 188M92 188L228 52');
 if(k==='warning')s=path('M160 34L275 202H45Z',symbolColor,symbolColor,alpha)+line(160,93,160,147,symbolColor)+dot(160,175,5,symbolColor);
 if(k==='ellipsis')s=dot(107,120,8)+dot(160,120,8)+dot(213,120,8);
 if(k==='axes2d'){s=arrow(65,184,280,184)+arrow(65,184,65,38);for(let i=1;i<6;i++)s+=line(65+i*34,180,65+i*34,188);for(let i=1;i<4;i++)s+=line(61,184-i*35,69,184-i*35);s+=text(286,206,'x',14)+text(46,38,'y',14);}
 if(k==='axis-break')s=line(42,139,133,139)+path('M134 153l13 -28 13 28 13 -28')+arrow(175,139,278,139);
 if(k==='error-bar')s=line(160,51,160,190)+line(121,51,199,51)+line(121,190,199,190)+dot(160,120,9);
 if(k==='legend')s=rect(78,62,27,27,c,.45)+text(181,83,'group A',20)+rect(78,114,27,27,a,.45)+text(181,135,'group B',20)+rect(78,166,27,27,b,.45)+text(181,187,'group C',20);
 if(k==='line-legend')s=line(51,69,134,69,c,'')+text(214,76,'data',19)+line(51,123,134,123,c,'6 4')+text(214,130,'control',19)+line(51,177,134,177,c,'1 4')+text(214,184,'reference',19);
 if(k==='colorbar'){for(let i=0;i<24;i++)s+=`<rect x="${52+i*9}" y="96" width="9" height="36" fill="${c}" fill-opacity="${.04+i*.96/23}"/>`;s+=line(52,141,268,141)+line(52,137,52,149)+line(268,137,268,149)+text(52,173,'min',15)+text(268,173,'max',15);}
 if(k==='distribution')s=arrow(38,182,281,182)+path('M47 181C93 182 103 174 124 112C150 21 166 39 183 105C206 181 227 182 269 182',c,c,alpha);
 if(k==='timeline'){s=arrow(35,128,285,128);[73,151,242].forEach((x,i)=>s+=dot(x,128,5,i===1?a:c)+line(x,121,x,83)+text(x,69,'t'+i,17));}
 if(label&&t.category==='f-container')s+=text(160,126,label,20);
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240">${s}</svg>`;
}
T.foundationIndex=index;T.foundationGroups=groups;
T.markup=(id,opts)=>index.has(id)?markup(index.get(id),opts):previous(id,opts);
T.independentCatalog=()=>independent().filter(t=>t.semanticType!=='foundation');
T.selectCatalog=(opts={})=>opts.view==='foundations'?[...index.values()].filter(t=>(!opts.category||opts.category==='all'||opts.category===t.category)&&`${t.name} ${t.tags} ${t.hint}`.toLowerCase().includes((opts.query||'').trim().toLowerCase())):select(opts).filter(t=>t.semanticType!=='foundation');
})(typeof window==='object'?window:globalThis);
