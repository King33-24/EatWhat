# docs/ 文档索引

本文档是 `docs/` 目录的入口索引，说明各子目录的用途和阅读顺序。

---

## 快速导航

| 你想了解什么 | 应该看哪个文件 |
|---|---|
| 项目目录每个文件夹是干嘛的 | [`project_structure.md`](project_structure.md) |
| 当前权威设计（功能、架构、技术栈）| [`design/eatwhat.md`](design/eatwhat.md) |
| 前后端/扩展接口约定 | [`api.md`](api.md) |
| 现在有哪些已知 bug、怎么记录新 bug | [`development/bug_tracker.md`](development/bug_tracker.md) |
| 比赛提交材料、答辩指南 | [`contest/`](contest/) 目录 |
| 开发迭代历史、迁移记录 | [`development/iterations/`](development/iterations/) 目录 |
| 旧版设计文档 | [`design/history/`](design/history/) 目录 |

---

## 子目录说明

### `design/` — 设计文档

- `eatwhat.md`：当前权威设计文档（v4.1 赛后打磨版），任何新功能、技术决策都以它为准。
- `history/`：历史版本归档，包括 ver1、ver2、ver3、update1.txt。

### `contest/` — 比赛相关材料

初赛、决赛提交的各种材料，包括：

- 比赛规则原图
- 技术报告书
- 商业化叙事草案
- 决赛答辩指南
- 宣传海报 prompt
- 技术速览 / 评委应对手册

### `development/` — 开发过程记录

- `bug_tracker.md`：统一 bug 追踪器，所有新 bug 和修复记录都写在这里。
- `copilot_bug_handling_prompt.md`：给 Copilot 的 bug 处理规范提示词。
- `iterations/`：开发迭代日志，包括任务拆解、数据源迁移、各轮 bug 修复记录。

---

## 文档维护规则

1. **权威设计文档只有一份**：`design/eatwhat.md`。旧版本只进 `design/history/`，不要出现多个"当前版本"。
2. **发现 bug 先记 bug_tracker.md**：修复前后都要更新状态，不要散落在聊天记录或 migration 文件里。
3. **移动文件要更新索引**：如果改了这个目录结构，同步更新 `docs/README.md` 和 `project_structure.md`。
4. **API 变更新先改 api.md**：`api.md` 是前后端对齐的唯一事实源，代码跟着契约走。
