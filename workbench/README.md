# Figure Studio

AI 协同论文绘图工作台，支持组件与图元编辑、素材选择和局部修改。

## 启动

需要 Node.js 22 或更新版本。在 PowerShell 中运行：

```powershell
cd workbench
npm ci
$env:FIGURE_SKILL_PATH = (Resolve-Path ..).Path
npm start
```

打开 http://127.0.0.1:4318/，在「AI 设置」配置 API 地址、Key、模型和思考强度。服务需支持 Responses API。

## 操作

- 新建空白画板，输入论文正文与提示词生成图片；已有草图和批注可一并参与生成。
- 分组、组件、图元三级选择，支持多选、移动、缩放、旋转、配色、锁定与撤销。
- 选择基础绘图工具后直接在画板绘制；双击文字编辑，Enter 换行，Ctrl+Enter 完成。
- 右键菜单提供对象操作和 AI 提问；选区意见可用于局部修改。
- 导入图片与 SVG，保存画板 JSON 和版本。
- 滚轮缩放，空格拖动平移；右侧按属性、素材、连线和 AI 设置分栏。

文档输入支持文本粘贴及 TXT / Markdown。AI 生成和选区修改使用独立提示词。工作台暂未接入 skill 的独立四评委执行流程。

连接配置见 [Agent 说明](agent/README.md)。第三方图标许可保留在 `external-icons/licenses/`。
