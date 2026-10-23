(function(root){
'use strict';
const T=root.FigureTemplates,L=root.PaperFigureLibrary,previous=T.markup,esc=T.escape;
Object.assign(T.categories,{convolution:'卷积与重采样',algebra:'张量与代数操作',position:'位置与稀疏结构',surface:'表面与投影',correspondence:'检测与对应',signal:'信号与不确定性',learning:'学习与适配'});
Object.assign(T.sources,{
 dyt:{title:'Transformers without Normalization',year:2025,venue:'CVPR',url:'https://openaccess.thecvf.com/content/CVPR2025/html/Zhu_Transformers_without_Normalization_CVPR_2025_paper.html',read:'官方摘要与引言摘录',note:'以可学习缩放的逐元素 tanh 替代归一化。'},
 diffattn:{title:'Differential Transformer',year:2025,venue:'ICLR',url:'https://proceedings.iclr.cc/paper_files/paper/2025/file/00b67df24009747e8bbed4c2c6f9c825-Paper-Conference.pdf',read:'摘要、引言与方法开头',note:'两个 softmax 注意力图做带权差分，用于共同噪声抵消。'},
 dinov3:{title:'DINOv3',year:2025,venue:'arXiv',url:'https://arxiv.org/html/2508.10104v1',read:'第 4.2、4.3 与 5.2 节',note:'图像内 patch 关系的 Gram 锚定、高分辨率教师特征及共享教师推理的多学生蒸馏。'},
 urepa:{title:'U-REPA: Aligning Diffusion U-Nets to ViTs',year:2025,venue:'arXiv v1',url:'https://arxiv.org/html/2503.18414v1',read:'摘要与第 3.3 节',note:'选中 U-Net 中间特征，先 MLP 再上采样，并约束样本间相对相似关系。'},
 haste:{title:'HASTE: Early-Stopped Holistic Alignment',year:2025,venue:'arXiv v1',url:'https://arxiv.org/html/2505.16792v1',read:'摘要与第 2.4 节',note:'训练早期同时对齐特征和注意力；切换后停用两项辅助约束，保留去噪目标。'}
});
const carried=[
 ['gaussians','各向异性高斯集合','gaussian','椭球中心与形状分别编码，数量不代表真实场景密度。'],
 ['ellipsoid','协方差椭球','gaussian','椭球轴表示方向与尺度，不能默认是置信区间。'],
 ['trajectory','空间轨迹','robotics','连续路径与离散采样点并置；箭头方向需按任务补充。'],
 ['texture','纹理区域','image','承载局部纹理，不作为真实实验样本。'],
 ['boundary','不规则边界带','segmentation','表示轮廓及邻域，不默认等于计算所得边缘。'],
 ['tree','候选搜索树','memory','父子边表示扩展关系，不能误读为空间邻近。'],
 ['timeline','时间轴与事件片段','video','片段长度仅作示意，不暗示实测时长。'],
 ['interpolate','已知点与插值点','sampling','区分观测与估计，补点不是新增观测。'],
 ['noise','扰动场','robustness','稀疏纹理为噪声载体，不代表实际扰动频谱。'],
 ['latent','潜在表示叠层','diffusion','强调隐空间对象，不默认保留像素几何。'],
 ['targets','双目标靶心','constraint','表示两个优化目标，不表示两类样本距离。'],
 ['spectrum','低高频系数平面','frequency','频率方向依具体变换确认，不等同图像空间。'],
 ['sphere','球面坐标网','surface','经纬网表示球面参数域，不表示均匀采样。'],
 ['object','实体表面体块','surface','用于空间占位，不能替代具体对象几何。'],
 ['contact','表面接触点与法线','robotics','法线和接触位置属于同一表面。'],
 ['robot','关节机械臂','robotics','关节数与可达范围需按实际装置调整。'],
 ['rank','排序条目','retrieval','相对条目顺序为示意，不是实验成绩。'],
 ['answer','文本结果容器','retrieval','承载回答内容；标记不代表事实验证。'],
 ['shield','保护目标标记','robustness','只作防护语义标记，不表示已达到鲁棒保证。'],
 ['factor','矩阵因子乘积','compression','左右因子共享内维，区别于逐元素相乘。'],
 ['basis','共享基集合','compression','区分基元素和组合后的对象。'],
 ['bounds','可行域与内部候选','constraint','边界形状示意，真实范数或约束应由正文指定。']
];
const authored=[
 ['conv-kernel','滑动卷积核','convolution','局部核位置与输出位置对应；默认不表示核权值。'],
 ['depthwise','逐通道卷积','convolution','各通道独立空间计算，尚未混合通道。'],
 ['pointwise','逐点通道混合','convolution','固定空间位置汇合通道，不扩大空间感受野。'],
 ['dilation','空洞采样网格','convolution','间隔采样与连续大核不同。'],
 ['pool','局部池化','convolution','多个局部值汇为一个读数，具体聚合规则另定。'],
 ['upsample','上采样对应','convolution','展开网格不表示新增观测信息。'],
 ['transpose','矩阵转置','algebra','行列互换，原元素身份必须对应。'],
 ['reshape','张量重排形状','algebra','元素总数和线性顺序保留，不是插值。'],
 ['shuffle','通道交错置换','algebra','保持元素身份，仅改变通道顺序。'],
 ['softmax','归一化权重','algebra','示意相对权重，不能用虚构值作概率结论。'],
 ['normalize','特征中心化与缩放','algebra','统计轴需按 Layer、Batch 或 Group 规范指定。'],
 ['tanh','饱和激活映射','algebra','有界非线性，不是硬截断。'],
 ['rope','成对坐标旋转','position','位置影响二维向量对的旋转，不是移动 token。'],
 ['causal','因果注意力可见域','position','查询只能访问当前位置及先前位置，轴方向必须一致。'],
 ['window','分窗局部连接','position','局部窗口边界限制交互范围。'],
 ['block-sparse','块稀疏可见域','position','稀疏块表示允许连接，不表示权重已为零。'],
 ['kv-cache','键值成对缓存','memory','Key 与 Value 同索引更新，缓存不同于模型参数。'],
 ['register','辅助寄存器 Token','position','辅助 token 与图像 patch 分开，不对应额外像素。'],
 ['stopgrad','停止梯度接口','learning','前向传递仍发生，仅反向梯度被截断。'],
 ['ema','指数移动平均状态','learning','历史状态与当前值加权，不是复制当前参数。'],
 ['quantize','量化阶梯','compression','连续值映射离散级别；级数示意。'],
 ['codebook','离散码本','compression','高亮最近原型，实际距离与分配规则需确认。'],
 ['prune','结构化删除掩膜','compression','删除单元与保留单元明确区分，不仅改变颜色。'],
 ['lora','低秩旁路接口','learning','冻结主路与可训练低秩支路合并，不能全标可训练。'],
 ['mesh','三角网格表面','surface','点与面邻接明确，网格不是体素。'],
 ['sdf','有符号距离等值线','surface','零等值线界定表面，内外符号需遵循约定。'],
 ['frustum','相机视锥','surface','相机中心、近远平面共享观察方向。'],
 ['ray','射线采样点','surface','点按射线深度排序，不是独立相机。'],
 ['epipolar','极线与对应候选','correspondence','候选受极线约束，不能画成已唯一匹配。'],
 ['correspondence','稀疏关键点匹配','correspondence','连接保持点身份，示意匹配不等于实测匹配。'],
 ['flow','二维运动向量场','correspondence','位移定义在图像坐标，不默认代表三维速度。'],
 ['boxes','检测框集合','correspondence','框属于同一图像坐标系，重叠不意味着同一实例。'],
 ['keypoints','人体关键点骨架','correspondence','点和骨骼连接为示意，需匹配目标数据集定义。'],
 ['superpixel','超像素区域划分','segmentation','不规则区域是邻接分区，不等同语义类别。'],
 ['octree','八叉空间层次','surface','空间细分与树的父子层级对应，当前仅局部展开。'],
 ['triplane','三正交特征平面','surface','三个平面共享坐标原点，区别于三个相机视图。'],
 ['warp','可变形采样网格','correspondence','网格变形表示坐标映射，不表示物体表面本身。'],
 ['wavelet','小波子带划分','signal','低频与方向细节子带按实际变换排列。'],
 ['stft','时频窗口','signal','横轴时间纵轴频率，窗口不是图像 patch。'],
 ['uncertainty','分布区间','signal','仅表示分布宽度；置信水平必须由数据确定。'],
 ['morphology','区域膨胀邻域','segmentation','展示集合外扩，不改变原始区域身份。'],
 ['matching','二分图指派','algebra','一对一匹配与任意多对多关系不同。'],
 ['sinkhorn','交替行列归一化','algebra','交替约束两条轴，不是一次 softmax。'],
 ['distribution','离散分布桶','signal','桶的宽度、范围与计数均需在具体图中指定。'],
 ['scatter','索引分发写入','algebra','根据目标索引写入；重复索引的规约规则另定。'],
 ['gather','索引选择读取','algebra','取出指定项并保留顺序，不表示移动原存储。'],
 ['crossproduct','三维叉积方向','algebra','方向垂直于两个输入，正负遵循右手系。'],
 ['correlation','两组特征相关体','correspondence','每个单元是成对匹配读数，不是单幅图像像素。']
];
function draw(id,c,a){
 const rect=(x,y,w,h,color=c,alpha=.14)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}" fill-opacity="${alpha}" stroke="${color}" stroke-width="1.2"/>`;
 const line=(x,y,u,v,color=c,dash=false)=>`<path d="M${x} ${y}L${u} ${v}" stroke="${color}" stroke-width="1.5" fill="none" ${dash?'stroke-dasharray="3 3"':''}/>`;
 const path=(d,color=c,width=1.5)=>`<path d="${d}" stroke="${color}" stroke-width="${width}" fill="none"/>`;
 const dot=(x,y,r=3,color=c)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${color}"/>`;
 const txt=(x,y,s,color=c)=>`<text x="${x}" y="${y}" fill="${color}" font-family="Arial" text-anchor="middle" font-size="9">${esc(s)}</text>`;
 const arr=(x,y,u,v,color=c)=>{let t=Math.atan2(v-y,u-x);return line(x,y,u,v,color)+path(`M${u-5*Math.cos(t)+2.5*Math.sin(t)} ${v-5*Math.sin(t)-2.5*Math.cos(t)}L${u} ${v}L${u-5*Math.cos(t)-2.5*Math.sin(t)} ${v-5*Math.sin(t)+2.5*Math.cos(t)}`,color);};
 const grid=(x,y,n,m,size=12,choose=()=>false)=>{let s='';for(let j=0;j<n;j++)for(let k=0;k<m;k++)s+=rect(x+k*size,y+j*size,size-2,size-2,choose(j,k)?a:c,choose(j,k)?.45:.08);return s;};
 let s='';
 if(id==='subtract')s=`<circle cx="80" cy="65" r="29" fill="white" stroke="${a}" stroke-width="2"/>`+line(64,65,96,65,a);
 if(id==='loss-off')s=path('M18 44H75',a,4)+path('M85 93H143',c,4)+line(80,19,80,111,'#aab8c1',true)+txt(43,33,'on',a)+txt(116,83,'off')+txt(80,125,'τ');
 if(id==='shift-offset'){for(let i=0;i<6;i++){s+=rect(13+i*23,21,17,16,i<3?c:a);const j=(i+2)%6;s+=rect(13+j*23,92,17,16,i<3?c:a)+line(21+i*23,41,21+j*23,87,i<3?c:a);}}
 if(id==='shift-partition')s=grid(30,16,7,7,14,(r,k)=>Math.floor((k+2)/3)===Math.floor((r+2)/3));
 if(id==='coarse-graph')s=line(31,90,80,27)+line(80,27,132,91)+line(31,90,132,91)+dot(31,90,9)+dot(80,27,9,a)+dot(132,91,9);
 if(id==='conv-kernel')s=grid(10,20,6,6,14)+rect(24,34,40,40,a,.13)+line(64,34,118,48,a)+line(64,74,118,70,a)+grid(118,34,4,2,13, (r,k)=>r===1&&k===0);
 if(id==='depthwise'){for(let i=0;i<3;i++){let y=20+i*31;s+=grid(12,y,2,3,11, (r,k)=>r===0&&k===i)+arr(49,y+10,100,y+10)+rect(109,y,33,20,i===1?a:c);}}
 if(id==='pointwise'){for(let i=0;i<4;i++){s+=rect(12,18+i*23,19,17,i%2?a:c)+line(34,26+i*23,86,64);}s+=rect(86,35,12,58,a,.22)+arr(101,64,123,64)+rect(129,46,17,35);}
 if(id==='dilation'){s=grid(28,15,7,7,14);for(const r of [0,3,6])for(const k of [0,3,6])s+=dot(34+k*14,21+r*14,4,a);s+=rect(30,17,94,94,a,.02);}
 if(id==='pool'){s=grid(12,25,4,4,17,(r,k)=>r<2&&k<2)+line(46,25,113,43,a)+line(46,59,113,69,a)+grid(113,42,2,2,18,(r,k)=>r===0&&k===0);}
 if(id==='upsample')s=grid(14,47,2,2,18)+arr(55,65,85,65)+grid(93,29,4,4,18,(r,k)=>r<2&&k<2);
 if(id==='transpose')s=grid(10,29,3,4,15,(r,k)=>r===0)+arr(76,63,90,63)+grid(98,23,4,3,15,(r,k)=>k===0);
 if(id==='reshape'){s=grid(11,42,2,6,12,(r,k)=>r===0&&k<2)+arr(88,64,100,64)+grid(107,24,4,3,12,(r,k)=>r===0&&k<2)+txt(43,89,'12')+txt(123,89,'12');}
 if(id==='shuffle'){for(let i=0;i<6;i++){let j=[0,3,1,4,2,5][i];s+=rect(16,14+i*17,20,11,i<3?c:a)+line(39,19+i*17,120,19+j*17,i<3?c:a)+rect(124,14+j*17,20,11,i<3?c:a);}}
 if(id==='softmax'){for(let i=0;i<4;i++){s+=rect(14+i*13,90-[19,59,33,43][i],9,[19,59,33,43][i])+rect(99+i*13,90-[9,43,15,23][i],9,[9,43,15,23][i],a);}s+=arr(70,62,92,62)+path('M97 98h53',a)+txt(123,112,'sum = 1');}
 if(id==='normalize'){s=line(10,63,150,63,'#b9c5ce');[27,44,54,68].forEach(x=>s+=dot(x,37));[93,106,119,132].forEach(x=>s+=dot(x,89,3,a));s+=arr(68,40,90,81)+line(113,72,113,104,a,true)+txt(113,117,'center');}
 if(id==='tanh'){s=line(19,65,144,65,'#bdc8ce')+line(80,16,80,113,'#bdc8ce')+path('M22 99C62 99 64 99 80 65S99 31 139 31',a,3);}
 if(id==='rope'){s=`<circle cx="80" cy="65" r="42" fill="none" stroke="${c}" stroke-opacity=".2"/>`+arr(80,65,122,65)+arr(80,65,105,31,a)+path('M105 64A25 25 0 0 0 96 44',a)+txt(57,94,'pair');}
 if(['causal','window','block-sparse'].includes(id))s=grid(30,16,7,7,14,(r,k)=>id==='causal'?k<=r:id==='window'?Math.floor(k/3)===Math.floor(r/3):r===k||(r<2&&k>4));
 if(id==='kv-cache'){s=txt(50,20,'K')+txt(109,20,'V');for(let i=0;i<5;i++)s+=rect(31,28+i*15,38,11,i===4?a:c)+rect(90,28+i*15,38,11,i===4?a:c);s+=path('M69 99h21',a)+arr(80,118,80,99,a);}
 if(id==='register'){s=grid(12,38,2,4,19)+line(94,25,94,95,'#b3c1c9',true)+rect(107,39,15,15,a)+rect(130,39,15,15,a)+txt(126,83,'aux');}
 if(id==='stopgrad'){s=arr(12,45,145,45)+arr(145,84,91,84,a)+path('M79 70v29M85 70v29',a,3)+line(16,84,68,84,a,true)+txt(41,105,'grad');}
 if(id==='ema')s=rect(12,23,40,28)+rect(12,82,40,28,a)+arr(57,37,91,63)+arr(57,95,91,67,a)+`<circle cx="105" cy="65" r="12" fill="white" stroke="${c}"/>`+txt(105,68,'+')+arr(119,65,150,65)+txt(31,17,'history')+txt(32,124,'current');
 if(id==='quantize')s=line(20,108,145,108,'#b5c3cc')+line(20,108,20,15,'#b5c3cc')+line(25,103,138,24,c,true)+path('M25 101H48V82H71V63H94V44H117V25H140',a,3);
 if(id==='codebook'){for(let i=0;i<6;i++)s+=rect(72+i%2*36,15+Math.floor(i/2)*34,27,23,i===2?a:c);s+=dot(22,65,7,a)+arr(32,65,69,61,a)+rect(70,47,31,27,a,.04);}
 if(id==='prune'){s=grid(17,24,4,6,20);for(let r=0;r<4;r++)for(const k of [1,4])s+=path(`M${19+k*20} ${26+r*20}l14 14m-14 0l14 -14`,a);}
 if(id==='lora')s=rect(54,17,50,30)+txt(79,36,'frozen')+rect(47,79,20,29,a)+rect(91,79,20,29,a)+line(15,32,15,94)+line(15,32,51,32)+arr(15,94,44,94,a)+arr(69,94,87,94,a)+line(108,32,141,32)+line(141,32,141,65)+arr(113,94,141,65,a)+dot(141,65,4)+arr(141,65,156,65);
 if(id==='mesh'){const p=[[17,75],[44,30],[87,18],[135,50],[141,97],[90,111],[51,84],[88,61]];[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,0],[1,6],[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]].forEach(([i,j])=>s+=line(...p[i],...p[j]));p.forEach(([x,y])=>s+=dot(x,y,3,a));}
 if(id==='sdf'){for(let i=0;i<4;i++)s+=`<ellipse cx="80" cy="65" rx="${19+i*15}" ry="${12+i*12}" fill="none" stroke="${i===1?a:c}" stroke-width="${i===1?3:1}"/>`;s+=txt(80,68,'−',a)+txt(139,19,'+');}
 if(id==='frustum'){s=dot(17,91,5,a)+path('M17 91L112 14 144 34 143 106 110 115Z')+path('M112 14L110 115M144 34L17 91M17 91L143 106')+path('M55 59L71 69 71 96 54 100Z',a);}
 if(id==='ray'){s=arr(15,107,146,20)+path('M84 28v76l31 14V16Z',c);[.16,.35,.56,.77].forEach(t=>s+=dot(15+131*t,107-87*t,4,a));}
 if(id==='epipolar'){s=rect(10,30,54,70)+rect(98,20,54,70)+dot(33,60,4,a)+line(34,60,146,66,a,true)+line(102,63,146,66,a);for(const x of [108,124,140])s+=dot(x,63+(x-102)*3/44,3,a);}
 if(id==='correspondence'){s=rect(8,24,54,80)+rect(99,18,54,80);[[25,39,114,41],[45,69,130,62],[28,91,118,82]].forEach(([x,y,u,v])=>s+=line(x,y,u,v,c,true)+dot(x,y,4,a)+dot(u,v,4,a));}
 if(id==='flow'){s=rect(14,15,133,100);for(let r=0;r<4;r++)for(let k=0;k<5;k++)s+=arr(23+k*24,28+r*24,34+k*24+r*1.8,22+r*24+k*2,(r+k)%3===0?a:c);}
 if(id==='boxes')s=rect(13,16,133,99,c,.03)+rect(24,37,56,58)+rect(69,30,58,47,a)+rect(92,71,40,34)+dot(24,37,3)+dot(69,30,3,a);
 if(id==='keypoints'){s=`<circle cx="80" cy="22" r="9" fill="none" stroke="${c}"/>`;const p=[[80,34],[51,49],[110,48],[39,72],[129,64],[72,77],[95,77],[56,112],[114,109]];[[0,1],[0,2],[1,3],[2,4],[0,5],[0,6],[5,6],[5,7],[6,8]].forEach(([i,j])=>s+=line(...p[i],...p[j]));p.forEach(([x,y])=>s+=dot(x,y,3,a));}
 if(id==='superpixel')s=rect(13,18,133,95)+path('M13 50L49 43 72 18M49 43L61 79 40 113M61 79L107 70 146 85M107 70L99 34 72 18M99 34L146 42',a);
 if(id==='octree'){
  const project=(x,y,z)=>[25+x*74+y*37,111-y*24-z*72];
  for(const x of [0,.5,1])for(const y of [0,.5,1])s+=line(...project(x,y,0),...project(x,y,1),x===.5||y===.5?a:c);
  for(const z of [0,.5,1]){for(const y of [0,.5,1])s+=line(...project(0,y,z),...project(1,y,z),z===.5?a:c);for(const x of [0,.5,1])s+=line(...project(x,0,z),...project(x,1,z),z===.5?a:c);}
 }
 if(id==='triplane')s=`<path d="M22 85l65 -24 49 22 -64 28Z" fill="${c}" fill-opacity=".15" stroke="${c}"/><path d="M72 111V29l64 -21v75Z" fill="${c}" fill-opacity=".1" stroke="${c}"/><path d="M22 85V9l50 20v82Z" fill="${a}" fill-opacity=".13" stroke="${a}"/>`;
 if(id==='warp'){for(let i=0;i<6;i++){s+=path(`M${22+i*23} 20Q${2+i*27} 68 ${22+i*23} 109`)+path(`M22 ${20+i*18}Q80 ${34+i*13} 137 ${20+i*18}`,i===2?a:c);}}
 if(id==='wavelet')s=rect(22,15,108,100)+rect(22,15,54,50,a)+line(76,15,76,115)+line(22,65,130,65)+line(49,15,49,65,a)+line(22,40,76,40,a)+txt(36,31,'LL')+txt(102,43,'HL')+txt(49,95,'LH')+txt(102,95,'HH');
 if(id==='stft'){s=line(14,109,146,109,'#bac4ca')+line(14,109,14,13,'#bac4ca');for(let r=0;r<5;r++)for(let k=0;k<8;k++)s+=rect(20+k*15,20+r*16,12,13,Math.abs(r-(k%4))<1?a:c,.23);s+=rect(62,17,30,84,a,.03);}
 if(id==='uncertainty')s=line(15,104,148,104,'#bac4ca')+path('M17 103C48 103 50 25 80 25S112 103 145 103',c,2)+rect(55,24,50,80,a,.09)+line(80,19,80,109,a,true);
 if(id==='morphology')s=`<path d="M22 35L80 16 139 48 129 98 62 115 18 86Z" fill="${a}" fill-opacity=".1" stroke="${a}" stroke-dasharray="4 3"/><path d="M42 47L79 37 114 59 108 83 65 94 38 77Z" fill="${c}" fill-opacity=".2" stroke="${c}"/>`;
 if(id==='matching'){for(let i=0;i<4;i++){let j=[2,0,3,1][i];s+=line(33,22+i*28,127,22+j*28,i===1?a:c)+dot(30,22+i*28,6)+rect(125,16+i*28,12,12,a);}}
 if(id==='sinkhorn')s=grid(35,29,5,5,16,(r,k)=>r===2||k===2)+arr(22,32,22,101,a)+arr(36,15,112,15)+txt(126,65,'col')+txt(76,121,'row');
 if(id==='distribution'){s=line(14,106,148,106,'#bcc8ce');[15,29,56,79,60,36,19].forEach((h,i)=>s+=rect(18+i*18,103-h,13,h,i===3?a:c,.25));}
 if(id==='scatter'||id==='gather'){const idx=[1,4,2];for(let i=0;i<6;i++)s+=rect(111,10+i*18,26,12,idx.includes(i)?a:c);idx.forEach((j,i)=>{s+=rect(17,30+i*29,22,16,a);s+=id==='scatter'?arr(42,38+i*29,107,16+j*18):arr(107,16+j*18,42,38+i*29);});}
 if(id==='crossproduct')s=arr(57,88,130,88)+arr(57,88,26,110)+arr(57,88,57,15,a)+path('M72 88V76H57',a)+txt(131,102,'u')+txt(20,118,'v')+txt(75,22,'u × v',a);
 if(id==='correlation'){s=grid(14,20,5,1,16)+grid(52,9,1,5,16)+grid(52,34,5,5,16,(r,k)=>r===k)+line(32,60,48,60,a)+line(92,26,92,30,a);}
 if(!s)throw new Error('Unimplemented semantic component: '+id);
 return s;
}
const additions=[],index=new Map();
function register(t){additions.push(t);index.set(t.id,t);}
for(const [glyph,name,category,hint] of carried)register({id:'unit-'+glyph,name,category,hint,kind:category,ref:'基础对象',unit:glyph,unitOrigin:'carried',depth:false,tags:glyph,semanticType:'component',invariant:hint});
for(const [glyph,name,category,hint] of authored)register({id:'unit-'+glyph,name,category,hint,kind:category,ref:'基础操作',unit:glyph,unitOrigin:'authored',depth:false,tags:glyph,semanticType:'component',invariant:hint});
function icon(kind,c,a){if(['subtract','loss-off','shift-offset','shift-partition','coarse-graph'].includes(kind))return draw(kind,c,a);return index.has('unit-'+kind)?(index.get('unit-'+kind).unitOrigin==='carried'?L.glyph(kind,c,a):draw(kind,c,a)):L.glyph(kind,c,a);}
// Nodes declare their own roles and placements. No layout multiplication adds mechanisms.
const N=(id,icon,x,y,w,label)=>({id,icon,x,y,w,label});
const E=(from,to,role='data',via)=>({from,to,role,via});
function mechanism(id,name,category,source,invariant,nodes,edges,inputs,outputs){register({id:'mechanism-'+id,name,label:name,category,kind:category,ref:source?T.sources[source].venue+' '+T.sources[source].year:'通用机制',source:source||undefined,evidence:source?'direct':'generic',semanticType:'mechanism',depth:false,tags:id+' '+nodes.map(n=>n.icon).join(' ')+' '+(source?T.sources[source].title:''),hint:invariant,invariant,nodes,edges,inputs,outputs});}
mechanism('differential','双路 Softmax 差分注意力','attention','diffattn','两个归一化注意力图带权相减，再作用于 V；不同于先减 logits 再 softmax。',
 [N('q1','matrix',45,42,65,'Q₁K₁'),N('q2','matrix',45,148,65,'Q₂K₂'),N('s1','softmax',132,42,60,'softmax'),N('s2','softmax',132,148,60,'softmax'),N('sub','subtract',218,95,55,'A₁ − λA₂'),N('v','tokens',283,157,50,'V'),N('out','features',283,47,55,'output')],
 [E('q1','s1'),E('q2','s2'),E('s1','sub'),E('s2','sub'),E('sub','out'),E('v','out')],['Q1,K1,Q2,K2,V'],['差分加权表示']);
mechanism('dynamic-tanh','可学习缩放饱和激活','learning','dyt','逐元素缩放后经 tanh 压缩极值；该操作不计算输入均值或方差。',
 [N('x','distribution',45,96,73,'activation'),N('scale','vectors',127,96,65,'learned scale'),N('f','tanh',216,96,83,'tanh'),N('y','tokens',289,96,45,'output')],[E('x','scale'),E('scale','f'),E('f','y')],['激活、可学习缩放'],['有界中间激活']);
mechanism('gram-anchor','图像内 Patch 关系锚定','training','dinov3','对齐同一图像内的归一化 patch 两两相似关系；不是逐 token 特征坐标直接拟合。',
 [N('s','features',43,43,63,'student'),N('t','features',43,147,63,'Gram teacher'),N('gs','correlation',151,43,73,'Gram S'),N('gt','correlation',151,147,73,'Gram T'),N('loss','targets',271,95,64,'relation loss')],
 [E('s','gs'),E('t','gt'),E('gs','loss','constraint'),E('gt','loss','constraint')],['学生与 Gram 教师 patch 特征'],['图像内关系约束']);
mechanism('hires-gram','高分辨率教师关系蒸馏','training','dinov3','教师先读取高分辨率图像，特征下采样到学生尺寸后再计算 Gram。',
 [N('img','frame',36,46,61,'high-res'),N('t','network',118,46,64,'teacher'),N('down','pool',205,46,65,'downsample'),N('gram','correlation',284,46,55,'Gram T'),N('student','correlation',205,150,65,'Gram S'),N('loss','targets',284,150,50,'loss')],
 [E('img','t'),E('t','down'),E('down','gram'),E('gram','loss','constraint'),E('student','loss','constraint')],['高分辨率图像、学生关系'],['平滑高分辨率关系目标']);
mechanism('shared-distill','共享教师推理的多学生蒸馏','training','dinov3','同一教师推理结果经汇集广播供多个学生训练；学生参数不共享。',
 [N('t','network',44,95,76,'teacher'),N('g','gather',139,95,65,'all-gather'),N('s1','network',257,33,52,'student 1'),N('s2','network',257,96,63,'student 2'),N('s3','network',257,164,74,'student 3')],
 [E('t','g'),E('g','s1','supervision'),E('g','s2','supervision'),E('g','s3','supervision')],['教师输出与样本'],['多个独立学生']);
mechanism('unet-align','中间层投影后上采样对齐','training','urepa','抽取 U-Net 中间特征，经 MLP 后上采样；不把教师特征先降采样。',
 [N('u','network',40,42,63,'U-Net mid'),N('p','network',125,42,56,'MLP'),N('up','upsample',210,42,65,'upsample'),N('loss','targets',284,100,47,'align'),N('vit','network',125,151,62,'ViT'),N('f','features',210,151,65,'teacher')],
 [E('u','p'),E('p','up'),E('up','loss','constraint'),E('vit','f'),E('f','loss','constraint')],['U-Net 中间层、ViT 特征'],['空间尺寸对齐后的监督']);
mechanism('manifold-align','样本间相对相似关系约束','training','urepa','比较样本间关系，不能与图像内 patch Gram 锚定混为一谈。',
 [N('s','frames',39,45,65,'student batch'),N('t','frames',39,149,65,'teacher batch'),N('a','graph',148,45,74,'sample relations'),N('b','graph',148,149,74,'sample relations'),N('loss','targets',272,96,61,'manifold')],
 [E('s','a'),E('t','b'),E('a','loss','constraint'),E('b','loss','constraint')],['学生与教师批次表示'],['样本关系约束']);
mechanism('alignment-stop','分阶段终止辅助对齐','training','haste','早期同时对齐特征和注意力；切换后两项对齐均关闭，去噪损失继续。',
 [N('f','features',40,42,60,'features'),N('a','matrix',40,149,60,'attention'),N('l','targets',130,96,64,'align losses'),N('g','loss-off',216,96,66,'off at τ'),N('d','noise',281,42,50,'denoising'),N('train','network',281,153,56,'train')],
 [E('f','l','constraint'),E('a','l','constraint'),E('l','g','schedule'),E('g','train','schedule'),E('d','train')],['特征、注意力、训练阶段'],['分阶段训练目标']);
mechanism('separable','深度可分离卷积','convolution',null,'先逐通道空间卷积，再逐点混合通道；两个操作的职责不同。',
 [N('x','features',39,98,65,'channels'),N('d','depthwise',131,98,83,'spatial'),N('p','pointwise',234,98,83,'channel mix')],[E('x','d'),E('d','p')],['多通道特征'],['混合后特征']);
mechanism('deform-conv','偏移预测驱动可变形采样','convolution',null,'输入同时生成偏移与采样值；偏移决定坐标，采样后才聚合。',
 [N('x','features',40,96,63,'input'),N('o','flow',140,39,72,'offsets'),N('g','warp',140,153,72,'sample grid'),N('y','conv-kernel',265,96,80,'aggregate')],[E('x','o'),E('x','g'),E('o','g','control'),E('g','y')],['特征'],['变形采样聚合']);
mechanism('channel-gate','全局池化生成通道门控','network',null,'空间池化产生通道摘要，预测通道权重后回乘原特征。',
 [N('x','features',40,145,63,'input'),N('p','pool',40,42,62,'pool'),N('g','bars',151,42,70,'channel gate'),N('y','features',270,145,74,'reweight')],[E('x','p'),E('p','g'),E('g','y','control'),E('x','y')],['多通道特征'],['通道加权特征']);
mechanism('shift-windows','错位窗口跨区交换','attention',null,'相邻层改变窗口分区，跨窗口信息通过新分区传播；非全局注意力。',
 [N('a','window',47,96,82,'partition A'),N('b','shift-offset',157,96,72,'shift'),N('c','shift-partition',268,96,82,'partition B')],[E('a','b'),E('b','c')],['空间 token'],['跨窗交互后的 token']);
mechanism('kv-reuse','自回归键值缓存复用','attention',null,'新 token 只追加当前 K/V，历史 K/V 复用；当前查询仍读取可见缓存。',
 [N('old','kv-cache',47,42,68,'history'),N('new','tokens',47,151,63,'new token'),N('cache','kv-cache',162,96,85,'append K/V'),N('out','matrix',278,96,65,'query read')],[E('old','cache'),E('new','cache'),E('cache','out')],['历史 K/V、新 token'],['扩展缓存与当前注意力']);
mechanism('vq','最近原型离散编码','compression',null,'连续向量分配到码本原型，再用对应索引读取离散向量；不能把索引当向量。',
 [N('z','vectors',37,96,62,'latent'),N('cb','codebook',134,96,83,'nearest'),N('idx','tokens',229,42,60,'index'),N('out','features',282,151,53,'embedding')],[E('z','cb'),E('cb','idx'),E('idx','out')],['连续潜向量、码本'],['码本索引与量化向量']);
mechanism('lora-adapt','冻结主干低秩适配','learning',null,'主干冻结，低秩 A/B 分支可训练；两路在同一输出空间相加。',
 [N('x','tokens',40,96,60,'input'),N('w','network',151,38,74,'frozen W'),N('ab','factor',151,150,85,'train A/B'),N('out','sum',278,96,62,'sum')],[E('x','w'),E('x','ab'),E('w','out'),E('ab','out')],['输入、冻结权重、低秩因子'],['适配后的输出']);
mechanism('ema-teacher','学生参数驱动 EMA 教师','training',null,'教师更新来自学生参数的移动平均，教师输出对学生提供监督；两类边不能混同。',
 [N('s','network',49,145,74,'student'),N('ema','ema',153,145,67,'EMA weights'),N('t','network',266,145,74,'teacher'),N('loss','targets',153,40,65,'prediction loss')],[E('s','ema','parameter'),E('ema','t','parameter'),E('s','loss','constraint'),E('t','loss','supervision')],['学生参数与教师历史参数'],['EMA 教师和训练约束']);
mechanism('contrastive','正负样本对比学习','training',null,'同源正样本拉近，不同源负样本对照；示意距离不作为实验结论。',
 [N('q','vectors',43,96,67,'query'),N('p','vectors',151,39,65,'positive'),N('n','basis',151,151,74,'negatives'),N('loss','targets',277,96,61,'contrast')],[E('q','p','constraint'),E('q','n','constraint'),E('p','loss','constraint'),E('n','loss','constraint')],['查询、正样本、负样本'],['对比约束']);
mechanism('masked-reconstruct','可见区域编码与掩码重建','training',null,'编码器仅处理可见部分，重建目标位于被遮盖区域；输入与监督分别表示。',
 [N('img','patches',38,96,65,'image'),N('mask','prune',126,96,72,'mask'),N('enc','network',219,42,65,'visible encode'),N('out','patches',280,150,62,'reconstruct')],[E('img','mask'),E('mask','enc'),E('enc','out'),E('img','out','supervision',[[38,198],[280,198]])],['图像 patch、遮盖位置'],['缺失区域重建']);
mechanism('pseudo-label','置信筛选伪标签监督','training',null,'教师预测先过滤再监督学生，被拒绝样本不进入该监督项。',
 [N('t','network',38,42,64,'teacher'),N('pred','mask',127,42,62,'pseudo labels'),N('g','rank',220,42,65,'threshold'),N('s','network',127,151,64,'student'),N('loss','targets',272,151,60,'accepted only')],[E('t','pred'),E('pred','g'),E('g','loss','supervision'),E('s','loss','constraint')],['教师预测、置信度、学生预测'],['筛选后的监督']);
mechanism('distill-logits','温度软目标蒸馏','training',null,'师生 logits 使用相应温度处理后比较，软分布不同于硬类别标签。',
 [N('t','network',40,43,66,'teacher'),N('s','network',40,149,66,'student'),N('pt','softmax',150,43,80,'temperature'),N('ps','softmax',150,149,80,'temperature'),N('loss','targets',278,96,58,'distribution loss')],[E('t','pt'),E('s','ps'),E('pt','loss','supervision'),E('ps','loss','constraint')],['师生 logits、温度'],['分布蒸馏约束']);
mechanism('quant-aware','训练时模拟量化误差','compression',null,'前向量化后反量化，训练保留浮点参数；梯度近似需按方法说明。',
 [N('w','matrix',39,97,65,'float weights'),N('q','quantize',138,97,82,'Q / DQ'),N('out','network',264,97,76,'forward')],[E('w','q'),E('q','out')],['浮点权重、量化参数'],['模拟量化前向']);
mechanism('structured-prune','重要性筛选后压缩结构','compression',null,'先按通道或头评分，删除指定结构，再形成紧凑计算对象。',
 [N('w','features',37,96,60,'units'),N('score','rank',126,96,64,'importance'),N('mask','prune',214,96,69,'remove'),N('small','features',291,96,38,'compact')],[E('w','score'),E('score','mask'),E('mask','small')],['结构单元、重要性'],['压缩结构']);
mechanism('epipolar-match','极线约束候选匹配','geometry',null,'相机几何限制候选范围，再比较特征；几何约束本身不保证唯一对应。',
 [N('cams','frustum',40,42,67,'cameras'),N('line','epipolar',156,42,82,'candidate line'),N('features','features',40,150,65,'descriptors'),N('match','correspondence',271,100,78,'match')],[E('cams','line','control'),E('line','match','control'),E('features','match')],['相机、特征点与描述子'],['受约束匹配']);
mechanism('triangulate','多视线三角化','geometry',null,'由多个相机的对应观测估计空间点；实际有噪声时不强制射线精确相交。',
 [N('c1','frustum',50,42,74,'view 1'),N('c2','frustum',50,155,74,'view 2'),N('r','ray',167,96,78,'rays'),N('p','points',279,96,63,'3D point')],[E('c1','r'),E('c2','r'),E('r','p')],['相机和对应像点'],['三维点估计']);
mechanism('alpha-compose','射线透射率累积合成','gaussian',null,'样本按深度排序，颜色贡献受透明度与前方透射率共同控制。',
 [N('r','ray',40,96,71,'depth samples'),N('a','distribution',144,40,72,'opacity'),N('c','features',144,151,72,'color'),N('sum','sum',274,96,67,'composite')],[E('r','a'),E('r','c'),E('a','sum','control'),E('c','sum')],['有序深度样本、颜色、密度或透明度'],['像素颜色']);
mechanism('triplane-query','三平面投影特征查询','surface',null,'同一三维点分别投影到三个平面，插值读取后融合，不等于多视图渲染。',
 [N('p','points',37,96,60,'3D query'),N('planes','triplane',145,96,90,'project'),N('f','features',266,43,68,'sample features'),N('out','network',266,155,65,'decoder')],[E('p','planes'),E('planes','f'),E('f','out')],['查询点、平面特征'],['点属性']);
mechanism('sdf-surface','零等值面提取网格','surface',null,'从有符号距离场的零等值面提取表面；不能把任意等值线都当物体边界。',
 [N('field','sdf',46,96,89,'distance field'),N('zero','boundary',160,96,80,'zero level'),N('mesh','mesh',276,96,77,'surface mesh')],[E('field','zero'),E('zero','mesh')],['有符号距离场'],['零等值表面']);
mechanism('flow-warp','光流驱动特征对齐','video',null,'由位移场定义采样坐标，对历史特征重采样后与当前特征融合。',
 [N('flow','flow',43,42,73,'flow'),N('old','features',43,151,66,'previous'),N('warp','warp',155,96,82,'resample'),N('cur','features',274,42,61,'current'),N('sum','sum',274,151,62,'fuse')],[E('flow','warp','control'),E('old','warp'),E('warp','sum'),E('cur','sum')],['历史特征、光流、当前特征'],['时间对齐特征']);
mechanism('set-match','集合预测一对一指派','correspondence',null,'代价矩阵决定预测与标注的指派；没有匹配的预测需单独处理。',
 [N('pred','boxes',42,42,72,'predictions'),N('gt','boxes',42,151,72,'targets'),N('cost','correlation',153,96,76,'cost'),N('m','matching',273,96,78,'assignment')],[E('pred','cost'),E('gt','cost'),E('cost','m')],['预测集合、标注集合、代价'],['一对一指派']);
mechanism('soft-transport','熵正则软运输指派','algebra',null,'两侧边际约束通过迭代缩放满足，软运输矩阵不同于离散一对一匹配。',
 [N('cost','correlation',42,96,76,'cost'),N('sink','sinkhorn',159,96,86,'row / column'),N('plan','matrix',279,96,65,'soft plan')],[E('cost','sink'),E('sink','plan')],['代价矩阵、边际分布'],['软运输计划']);
mechanism('wavelet-fusion','频带分解与细节融合','frequency',null,'先分离低频与方向细节，再按职责处理并重建；不能当作统一低通。',
 [N('x','frame',34,96,58,'input'),N('bands','wavelet',121,96,76,'subbands'),N('low','network',217,40,62,'low band'),N('high','boundary',217,153,62,'details'),N('out','frame',291,96,44,'inverse')],[E('x','bands'),E('bands','low'),E('bands','high'),E('low','out'),E('high','out')],['信号或图像'],['融合后重建']);
mechanism('roi-align','候选区域连续采样对齐','correspondence',null,'在连续坐标上采样固定网格；候选框与特征尺度需对应。',
 [N('b','boxes',42,42,75,'ROI'),N('f','features',42,150,68,'features'),N('grid','warp',158,96,78,'sample grid'),N('out','matrix',280,96,63,'fixed size')],[E('b','grid','control'),E('f','grid'),E('grid','out')],['候选区域、特征图'],['固定尺寸区域特征']);
mechanism('point-voxel','点到体素聚合与回读','surface',null,'空间索引将点分桶，桶内规约后保留点与体素映射供回读。',
 [N('p','points',36,96,61,'points'),N('idx','scatter',127,96,70,'voxel index'),N('v','voxel',220,96,73,'aggregate'),N('read','gather',286,34,50,'point read')],[E('p','idx'),E('idx','v'),E('v','read')],['点与体素索引'],['体素特征与点级回读']);
mechanism('graph-pool','节点到簇的层次聚合','memory',null,'软或硬簇指派将细图汇合为粗图，保留簇与节点关系。',
 [N('g','graph',42,96,77,'fine graph'),N('assign','matching',158,96,78,'cluster assign'),N('coarse','coarse-graph',279,96,65,'coarse graph')],[E('g','assign'),E('assign','coarse')],['图、簇指派'],['粗粒度图']);
mechanism('bounded-project','梯度步后投影回可行域','robustness',null,'先做更新，再投影或裁剪到指定约束集；两者不是同一个算子。',
 [N('x','noise',38,96,61,'current'),N('grad','gradient',133,96,77,'gradient step'),N('proj','bounds',233,96,79,'project'),N('out','noise',289,36,43,'feasible')],[E('x','grad'),E('grad','proj'),E('proj','out')],['当前扰动、梯度、约束集'],['可行扰动']);
mechanism('uncertainty-fuse','不确定性加权观测融合','signal',null,'权重来自估计不确定性；宽分布与高权重不可无说明地同时出现。',
 [N('a','uncertainty',45,42,77,'observation A'),N('b','uncertainty',45,151,77,'observation B'),N('w','bars',157,96,70,'precision weights'),N('out','sum',277,96,70,'estimate')],[E('a','w','control'),E('b','w','control'),E('w','out','control'),E('a','out','data',[[170,12],[277,12]]),E('b','out','data',[[170,194],[277,194]])],['观测及不确定性'],['加权估计']);

function drawMechanism(t,c,a){
 const map=Object.fromEntries(t.nodes.map(n=>[n.id,n])),segments=[];let body='';
 for(const e of t.edges){const p=map[e.from],q=map[e.to];const route=e.via||[],first=route[0]||q,last=route.at(-1)||p;
  const fx=Array.isArray(first)?first[0]:first.x,fy=Array.isArray(first)?first[1]:first.y,lx=Array.isArray(last)?last[0]:last.x,ly=Array.isArray(last)?last[1]:last.y;
  const clip=(n,dx,dy)=>{const k=Math.min((n.w/2+4)/(Math.abs(dx)||.0001),(n.w*130/320+4)/(Math.abs(dy)||.0001));return[n.x+dx*k,n.y+dy*k];};
  const start=clip(p,fx-p.x,fy-p.y),end=clip(q,lx-q.x,ly-q.y),pts=[start,...route,end];const color=e.role==='data'?c:a;
  for(let i=1;i<pts.length;i++)segments.push([pts[i-1],pts[i]]);
  body+=`<path d="M${pts.map(p=>p.join(' ')).join('L')}" fill="none" stroke="${color}" stroke-width="1.3" ${e.role==='data'?'':'stroke-dasharray="3 3"'}/>`;
  const prev=pts.at(-2),ang=Math.atan2(end[1]-prev[1],end[0]-prev[0]);body+=`<path d="M${end[0]-5*Math.cos(ang)+2.5*Math.sin(ang)} ${end[1]-5*Math.sin(ang)-2.5*Math.cos(ang)}L${end.join(' ')}L${end[0]-5*Math.cos(ang)-2.5*Math.sin(ang)} ${end[1]-5*Math.sin(ang)+2.5*Math.cos(ang)}" fill="none" stroke="${color}" stroke-width="1.3"/>`;
 }
 const boxes=t.nodes.map(n=>({x:n.x-n.w/2,y:n.y-n.w*130/320,w:n.w,h:n.w*130/160})),labels=[];
 const overlap=(p,q)=>p.x<q.x+q.w&&p.x+p.w>q.x&&p.y<q.y+q.h&&p.y+p.h>q.y;
 const hits=(segment,b)=>{const [[x,y],[u,v]]=segment;let lo=0,hi=1;for(const [p,q]of [[x-u,x-b.x],[u-x,b.x+b.w-x],[y-v,y-b.y],[v-y,b.y+b.h-y]]){if(!p){if(q<0)return false;}else{const r=q/p;if(p<0)lo=Math.max(lo,r);else hi=Math.min(hi,r);if(lo>hi)return false;}}return true;};
 for(const n of t.nodes){const x=n.x-n.w/2,y=n.y-n.w*130/320;body+=`<g transform="translate(${x} ${y}) scale(${n.w/160})">${icon(n.icon,c,a)}</g>`;}
 for(let i=0;i<t.nodes.length;i++){const n=t.nodes[i],b=boxes[i],w=n.label.length*4.2+6,h=12;
  const candidates=[{x:n.x-w/2,y:b.y-h-4,w,h},{x:n.x-w/2,y:b.y+b.h+4,w,h},{x:b.x-w-4,y:n.y-h/2,w,h},{x:b.x+b.w+4,y:n.y-h/2,w,h}];
  const score=r=>(r.x<2||r.x+r.w>318||r.y<1||r.y+r.h>214?1000:0)+boxes.filter(b=>overlap(b,r)).length*80+segments.filter(s=>hits(s,r)).length*20+labels.filter(b=>overlap(b,r)).length*100;
  const r=candidates.sort((p,q)=>score(p)-score(q))[0];labels.push(r);
  body+=`<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="white" fill-opacity=".95"/><text x="${r.x+r.w/2}" y="${r.y+9}" text-anchor="middle" font-family="Arial" font-size="8" fill="#556570">${esc(n.label)}</text>`;
 }return body;
}
T.catalog.forEach(t=>t.semanticType=t.family?'mechanism':'component');
T.catalog.push(...additions);
T.semanticAdditions=additions;T.semanticIndex=index;
T.independentCatalog=()=>T.catalog.filter(t=>!t.family||t.view==='flow');
T.libraryStats=()=>{const items=T.independentCatalog();return{components:items.filter(t=>t.semanticType==='component').length,mechanisms:items.filter(t=>t.semanticType==='mechanism').length,independent:items.length,schemes:T.catalog.length,sources:Object.keys(T.sources).length};};
T.selectCatalog=function({category='all',query='',source='all',view='families'}={}){
 const independent=t=>!t.family||t.view==='flow';
 const matchView=t=>view==='all'||view==='families'&&independent(t)||view==='base'&&t.semanticType==='component'||view==='mechanisms'&&t.semanticType==='mechanism'&&independent(t)||view==='new'&&index.has(t.id)||t.view===view;
 const rank=t=>t.unitOrigin==='authored'?0:index.has(t.id)&&!t.unit?1:index.has(t.id)?2:3;
 return T.catalog.filter(t=>(category==='all'||t.category===category)&&(source==='all'||(source==='generic'?!t.source:t.source===source))&&matchView(t)&&`${t.name} ${T.categories[t.category]} ${t.tags||''} ${t.hint} ${t.id}`.toLowerCase().includes(query.trim().toLowerCase())).sort((a,b)=>rank(a)-rank(b));
};
T.baseCount=T.libraryStats().components;
T.markup=function(id,options={}){const t=index.get(id);if(!t)return previous(id,options);const c=options.color||'#416f89',a=options.accent||'#ce713a',label=esc(options.label??t.name);let body=t.unit?`<g transform="translate(64 16) scale(1.2)">${icon(t.unit,c,a)}</g>`:drawMechanism(t,c,a);if(label)body+=`<text x="160" y="231" font-family="Arial, Microsoft YaHei, sans-serif" font-size="11" text-anchor="middle" fill="#23313c">${label}</text>`;return`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240">${body}</svg>`;};
})(typeof window==='object'?window:globalThis);
