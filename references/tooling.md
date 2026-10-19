# 工具与导出

## 内置组件

`scripts/vector3d.py` 仅依赖 Python 标准库生成 SVG；PDF 导出可选依赖 `reportlab`。运行前检查目标环境提供的 Python 和依赖，不硬编码本机运行时路径。

生成组件演示：

```sh
python <skill-dir>/scripts/vector3d.py --demo --out <output-dir>/vector3d-demo
# 环境已有 reportlab 时另加 --pdf
python <skill-dir>/scripts/check_svg.py <output-dir>/vector3d-demo.svg --require-pure
```

演示为原创合成示意，不对应具体论文。用于确认投影、导出和样式，不能作为任意论文的成品。

自定义脚本可将 `<skill-dir>/scripts` 放入 `sys.path` 后导入：

```python
from vector3d import Figure, Iso
fig = Figure(720, 280, width_mm=180, title="Method overview")
space = Iso(160, 135, 36)
fig.box(space, (0, 0, 0), (3, 3, 2), color="#6C9CCB", grid=(3, 3, 2), name="volume")
fig.text(160, 240, "Spatial features", size=12, anchor="middle")
fig.save_svg("figure.svg")
fig.save_pdf("figure.pdf")  # optional reportlab
```

`Figure` 支持 `polygon`、`line`、`arrow`、`ellipse`、`text`、`plane`、`box`、`wirebox`、`triplane`、`group`。查看脚本中的函数签名及演示以了解参数。`Iso.point` 将三维坐标投影为画布坐标。`triplane` 将相交平面拆分并按固定视角排序，避免整面覆盖导致前后关系错误。

盒体网格只画可见面，不能自动处理任意相交物体遮挡。椭圆是二维示意。默认 SVG 使用 Arial/Helvetica 字体回退，PDF 使用 Helvetica。PDF 内置字体导出仅接受可编码的西文文本；其他语言或数学字体传 `font_path`（TrueType 字体）并核对字体覆盖和渲染。复杂排版使用专门的 SVG/TikZ 工具更合适。

### 透明体素（v0.2）

```python
fig.voxel_volume(
    Iso(150, 100, 28), shape=(3, 3, 2), origin=(-1.5, -1.5, -1),
    selected=[
        {"index": (0, 1, 0), "color": "#6C9CCB", "opacity": 0.4},
        {"index": (1, 1, 1), "color": "#DCA06C", "opacity": 0.55},
    ],
)
fig.triplane(Iso(380, 100, 24), opacity=0.65)
```

`voxel_volume` 按给定整数网格画外框与稀疏透明高亮，背景网格前后采用不同对比度；每个选中格子的三个朝向观察者的面按视深排序。它是固定轴测视角下的机制示意，不是物理体渲染。selected 必须在 shape 内且不重复。所有透明度保留为 SVG/PDF 的矢量透明度，不依赖模糊滤镜或位图阴影。

所有尺寸采用画布坐标；`width_mm` 决定最终物理宽度。PDF 以相同缩放系数导出，保持文字为文字、几何为路径。生成器输出只覆盖指定输出文件，不修改用户论文。

## 检查与预览

`check_svg.py` 检查 XML、重复 ID、缺失的本地引用、外部链接、嵌入图像和脚本/foreignObject/filter 等。`--require-pure` 在存在 image 或 foreignObject 时失败。非纯矢量模式也会列出 image，便于交付说明。

该工具不检查科学正确性、文字碰撞、SVG 的所有 CSS/渲染行为，也不证明可编辑性。检查通过后仍须渲染查看。

- 已有 Poppler：`pdftoppm -singlefile -scale-to 1800 -png figure.pdf preview`。
- 已有 Inkscape：可将 SVG 导出为 PDF/PNG；核对字体、渐变、透明度及是否出现局部栅格化。
- 可用浏览器：打开 SVG 目视查看或截图作为 PNG 预览；截图只作为预览，不作为矢量成品。

优先使用现有可用工具。若只能生成 SVG，直接交付并说明 PDF/预览的未完成状态，不以改变文件后缀充当转换成功。复杂外部 SVG 不能交给本组件的 `save_pdf` 转换：它导出的是同一 Figure 场景，不是通用 SVG 转换器。
