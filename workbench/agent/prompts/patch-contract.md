# 图元输出协议

仅返回指定 JSON：baseRevision 原样取 TASK.baseRevision，summary 为中文实际变化，warnings 为未解决事项数组，operations 为图元操作数组。没有足够依据或无法在边界内完成时返回空 operations 并解释；不要写代码修改文件。

## 程序强制的范围

- scope 是唯一可修改范围。所有锁定对象（含锁定父级或后代）、未选对象、绑定 connection 节点保持不变。
- editMode=appearance：仅 update 选区 leaf.appearance={fill,stroke,textColor,strokeWidth,opacity}。颜色为六位十六进制或 none，线宽 0–20，透明度 0–1。不得提交几何、文字、markup 或插入删除。
- editMode=layout：仅 update x/y/scale，scale 为正数等比缩放，不改变内容。
- editMode=redraw：允许选区内必要重绘，但各选区根节点最终图形不得超出原始 bounds。
- editMode=generate：结合整张画板生成，仍保留锁定对象、批注和现有连接约束。
- 缺省 legacy 用于旧任务兼容，仍遵守选区和最小修改原则，不视为自由重绘授权。
- preserveLabels=true 时，不能删除或改写 kind=text 的独立文字图元；可在模式允许范围内移动。混合 SVG 内文字也应保留，不能利用混合节点绕过用户保护意图。
- connection 表达模块间的绑定接口。不能直接修改、删除、新建绑定连线；移动模块后由程序更新现有连线。

## 操作结构

- update：id 必须存在；payload 是 JSON 字符串，只包含 x,y,w,h,scale,originX,originY,name,markup,textOverride,appearance 中必要字段。不能改 parent/id/type/locked。markup 只能用于 leaf。
- insert：新 ID 以 ai- 开头。payload 为完整 leaf：{id,parent,type:'leaf',kind,name,x,y,w,h,originX,originY,scale:1,locked:false,markup}。parent 必须是选区内的容器或本次已创建且属于该范围的容器。
- 仅 generate 允许新建 component：{id,parent,type:'component',kind,name,x,y,w,h,scale:1,locked:false}，不带 markup。先建容器再建子图元。修改模式需要重绘组件时在原容器内编辑/新增 leaf。
- remove：payload='{}'；不能删除选区根节点、带批注或锁定对象。

x/y 为父层局部坐标；originX/originY 是原始 SVG 坐标起点。渲染顺序为：减去 origin，再按 scale 缩放并平移到 x/y。所有几何字段必须是有限数，w/h 非负，scale 为正。修改几何时同步准确边界。

仅使用静态 SVG。禁止脚本、foreignObject、外部链接和 CSS 文件；形状与文字属性内联。保留已有嵌入图片；不伪造位图数据。markup 中资源 ID 必须以所属 leaf ID 加 -- 为前缀，url(#...) 同步更新，避免污染其他对象。不同对象和可编辑文字尽量保持独立。
