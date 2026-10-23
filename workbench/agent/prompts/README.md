# 工作台提示词

- `generate.md`：初版生成，读取原 paper-vector-figures skill 与设计参考。当前工作台采用快速生成，四评委尚未接入。
- `edit.md`：已有图稿的局部修改。普通改色和排布不加载 skill；局部重绘只提供相关文档索引，由模型按需要读取，不加载主 SKILL.md。
- `ask.md`：图文问答，仅输出回答，不执行图元修改。
- `patch-contract.md`：生成与修改共用的输出协议；操作范围仍由 patch-contract.js 强制校验。

路由在 `../prompts.mjs`，参考准备与执行在 `../runner.mjs`。角色与协议通过 SDK 的 developer_instructions 注入；本次要求、论文和画板作为独立任务输入。初版生成要求不会在后续修改时重放。

绘图任务保存 prompt-profile.json（角色、版本、指令哈希、参考模式）与 system-instructions.md。修改模板后需重启本地服务。

生成仍要求正文；普通编辑不强制正文，涉及方法语义且资料不足时应指出证据缺口。

接入依据：[OpenAI 官方配置说明](https://learn.chatgpt.com/docs/config-file/config-reference)。
