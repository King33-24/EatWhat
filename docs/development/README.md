# development/ 开发过程记录

本目录存放开发过程中的迭代日志、bug 追踪、Copilot 提示词等工程管理文档。

---

## 文件说明

| 文件 | 用途 |
|---|---|
| [`bug_tracker.md`](bug_tracker.md) | **统一 bug 追踪器**。所有已知 bug、修复状态、修复方案都记录在此。 |
| [`copilot_bug_handling_prompt.md`](copilot_bug_handling_prompt.md) | 给 F 同学 / Copilot 的 bug 处理规范提示词，可直接粘贴到 Copilot Chat。 |
| [`iterations/`](iterations/) | 开发迭代日志，包括任务拆解、迁移指南、各轮 bug 修复记录。 |

---

## `iterations/` 说明

| 文件 | 内容 |
|---|---|
| [`tasks.md`](iterations/tasks.md) | 初赛 16 天任务拆解与前后端分工（v3 vibe coding 版）。 |
| [`v3_xiaohongshu_migration.md`](iterations/v3_xiaohongshu_migration.md) | B 站 → 小红书数据源迁移指南（v4 变更清单）。 |
| [`v4_api_video_likes.md`](iterations/v4_api_video_likes.md) | 新增 `/api/chat`、点赞/评论数延迟、视频类型等变更。 |
| [`v5_map_showcase.md`](iterations/v5_map_showcase.md) | 报告图表空白、观点光谱不清晰的修复方案。 |
| [`v6_frontend_bugs.md`](iterations/v6_frontend_bugs.md) | 前端 v6 轮 bug 修复：ECharts 生命周期、观点光谱、冷静期自动解锁。 |
| [`W1_bug.md`](iterations/W1_bug.md) | W1 联调 bug：报告/书架异步轮询、冷静期 422。 |
| [`W2_bug.md`](iterations/W2_bug.md) | W2 前端 bug：图表空白、饼图重叠、锁定链接可跳转、书架轮询条件、加载提示、观点光谱优化。 |

---

## 使用规则

1. **发现新 bug 立即写入 `bug_tracker.md`**，不要在聊天记录或 iteration 文件里零散记录。
2. **修复完 bug 必须更新 `bug_tracker.md`**：状态改为 fixed，补充相关文件路径和处理方式。
3. **大型变更才写 iteration 文件**：日常小修复直接走 bug_tracker。
4. **Copilot 处理 bug 前**：先把 `copilot_bug_handling_prompt.md` 发给它，统一输出格式。
