# 三维论文示意图参考索引

首批筛选于 2026-10-15。按会议年份收录 2025–2026 年的具体方法论文，后续持续更新。以下为目视检查原 PDF 后的设计观察，不代表作者实际使用的绘图软件，也不保证原图为纯矢量。部分论文初始预印本早于会议年份。

2026-10-17 增补的 Tetris3D、DecomVoxel、SAM-V 见[跨领域图谱中的近期视觉原图板](reference-atlas.md#近期视觉原图主次约束与身份)。分别研究总览与局部展开、透明空间约束、跨表示身份；其中 DecomVoxel Fig.3 尤其适合参考透明体素的区域语义。

可查看 [第一批参考板](reference-board-a.png) 和 [新增参考板](reference-board-b.png)。参考板是带来源标签的论文局部截图，只用于风格研究；不要直接作为新论文的图形资产。PDF 页码均为从 1 开始的文件页序。

## 最优先参考

| 论文与来源 | 定位 | 取其所长 / 使用边界 |
|---|---|---|
| [ALOcc — ICCV 2025](https://arxiv.org/pdf/2411.07725) | Fig. 3，p4；另看 Fig. 4–5，p5 | 同视角体素比较、像素到体素的射线、透明度编码权重。最适合轻盈的三维几何风格；白底细线需检查缩印对比度。预印本始于 2024 年。 |
| [SDGOCC — CVPR 2025](https://arxiv.org/pdf/2507.17083) | Fig. 3，p4 | 彩色分支，体积沿 z 轴压平为 BEV 薄片。学习用形状表示数据维度；真实场景图保留为图像证据。 |
| [PVT — WACV 2025](https://openaccess.thecvf.com/content/WACV2025/papers/Fan_PVT_An_Implicit_Surface_Reconstruction_Framework_via_Point_Voxel_Geometric-Aware_WACV_2025_paper.pdf) | Fig. 4，p5；Fig. 3，p4 | 体素邻域、坐标轴、角度弧与点。适合精确空间标注；不要照搬小图中拥挤的文字密度。 |
| [TokenSplat — CVPR 2026](https://arxiv.org/pdf/2603.00697) | Fig. 1，p3，下方右侧模块 | 虚线空间框中放 token 条，连至融合后的表示。适合把局部三维表达融入平面流程；不必把全图三维化。 |

## 新增参考

### GaussianFormer-2 — CVPR 2025

[论文 PDF](https://openaccess.thecvf.com/content/CVPR2025/papers/Huang_GaussianFormer-2_Probabilistic_Gaussian_Superposition_for_Efficient_3D_Occupancy_Prediction_CVPR_2025_paper.pdf)

**Figure 2，p2。** 并列比较体素、平面、不同高斯表示。橙色标记用于表示空区域的元素，体素线框、三平面和椭球共用比较主题。适合参考“同一对象、不同空间表示”的对比构图。高斯有明显光照渲染感；矢量重画时可用简化椭圆和有限明暗，不必复刻材质。

### GaussRender — ICCV 2025

[论文 PDF](https://openaccess.thecvf.com/content/ICCV2025/papers/Chambon_GaussRender_Learning_3D_Occupancy_with_Gaussian_Rendering_ICCV_2025_paper.pdf)

**Figure 2，p3。** 三平面、多尺度体素、体素转高斯，以及相机和二维渲染结果在一张流程图中对应；底部有局部解释区。适合学习“多种表示→统一操作”的组织方式。

**Figure 3，同页。** 传感器视角、抬高的虚拟视角、正交俯视并排说明可见性。这是二维剖面空间解释，适合相机射线组件，不能称为完整三维渲染。

### GaussianFlowOcc — ICCV 2025

[论文 PDF](https://openaccess.thecvf.com/content/ICCV2025/papers/Boeder_GaussianFlowOcc_Sparse_and_Weakly_Supervised_Occupancy_Estimation_using_Gaussian_Splatting_ICCV_2025_paper.pdf)

**Figure 2，p4。** 空间盒中放置点、特征条和椭圆；从初始表示到最终高斯，再分成体素预测和图像监督，底部连接时间传播。适合时序与训练/推理分支的示意。原图竖排模块标签较多，重画时可优先水平标签。

### TriTex — CVPR 2025

[论文 PDF](https://openaccess.thecvf.com/content/CVPR2025/papers/Cohen-Bar_TriTex_Learning_Texture_from_a_Single_Mesh_via_Triplane_Semantic_CVPR_2025_paper.pdf)

**Figure 2，p3，上方 Features to Colors 局部。** 三个颜色区分的正交网格面、三维查询点和特征采样，连接至颜色预测。适合三平面组件与局部放大框。鱼形网格属于渲染输入/输出，不是要矢量描摹的装饰。

### QuickSplat — ICCV 2025（补充）

[论文 PDF](https://openaccess.thecvf.com/content/ICCV2025/papers/Liu_QuickSplat_Fast_3D_Surface_Reconstruction_via_Learned_Gaussian_Initialization_ICCV_2025_paper.pdf)

**Figure 2，p3。** 主流程下方用局部小框说明梯度、新增高斯及更新前后结果；新增高斯小图用空间格与圆盘。适合将机制细节挂接到主流程，三维部分较少，因此不是首选整体风格。

## 这轮没有优先收录的例子

检查过 Reference-Based 3D-Aware Image Editing with Triplanes（CVPR 2025）的 Figures 3–5：方法图主要使用图像缩略图和二维模块，三正交平面的几何表现不明显。虽然主题属于 3D，不作为本 skill 的核心三维视觉参考。

## 按绘图任务选参考

- 体素、投影、透明度：ALOcc。
- 三维特征体与二维特征平面的转换：SDGOCC。
- 三平面和查询点：TriTex。
- 稀疏/稠密表示对比：GaussianFormer-2。
- 相机、视线、渲染分支：GaussRender。
- token/高斯空间容器和时序：TokenSplat、GaussianFlowOcc。
- 几何标注：PVT。
- 总览与局部机制的连接：QuickSplat。
