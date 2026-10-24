# Figure Studio 桌面版

Windows x64 免安装应用。双击 `Figure-Studio-0.5.0-Windows-x64.exe` 启动；无需另装 Node.js 或手动启动服务。

## 使用

- 本地绘图不需要 API。AI 生成、修改和问答需在「AI 设置」中配置服务。
- skill、图标库和 Agent 运行依赖随应用提供。不会打包开发者的 Key、画板或任务记录。
- 同一 Windows 用户下沿用现有加密 API 配置。其他电脑首次使用时配置自己的 Key。
- 桌面画板独立保存。迁移网页版画板：在网页「导入 / 导出」中下载 JSON，再在桌面版导入。
- 数据目录：`%APPDATA%/FigureStudio`，可通过「文件 → 打开数据目录」访问。连接配置仍使用 `%LOCALAPPDATA%/PaperFigureWorkbench`，Key 由 Windows 当前用户加密。
- 后台使用随机本机端口；界面使用固定的 `figure://studio` 来源保存数据。退出应用时关闭其后台，不影响独立运行的网页版。

## 构建

在工作台目录运行：

```sh
npm ci
npm run desktop:build
```

输出位于 `desktop-dist/`。`desktop:dev` 启动开发版。准备脚本优先使用仓库根目录的 skill，其次使用本机安装的 skill；可通过 `FIGURE_SKILL_PATH` 指定来源。

本版未进行代码签名；对外正式分发前可配置发布者证书。AI 功能仍需网络和模型服务额度。
