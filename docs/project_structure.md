# 问膳 EatWhat 项目目录说明

> 本文档实时描述项目目录结构，说明每个目录/文件的用途和维护责任人。若目录发生重大调整，需同步更新本文档。

---

## 根目录

| 文件/目录 | 用途 | 维护者 |
|---|---|---|
| `README.md` | 项目入口说明：简介、功能、安装运行、技术栈 | 双方 |
| `.gitignore` | Git 忽略规则：运行期数据、密钥、构建产物、.claude/ 等 | B 同学 |
| `.github/` | GitHub Copilot 项目级规范 `copilot-instructions.md` | B 同学 |
| `.claude/` | Claude Code 项目级设置（gitignored，不提交）| 自动 |
| `archive/` | 历史归档：不再活跃但暂时保留的代码/备份 | B 同学 |
| `backend/` | FastAPI 后端服务 | B 同学 |
| `frontend/` | Web Dashboard 前端页面 | F 同学 |
| `extension/` | Chrome 浏览器扩展（Manifest V3）| F 同学 |
| `openclaw_workspace/` | OpenClaw Agent 人格（SOUL.md）与 Skills | B 同学 |
| `data/` | 运行期数据（gitignored）：SQLite 数据库、日志 | 运行时生成 |
| `demo/` | 演示物料：截图、视频占位 | 双方 |
| `docs/` | 项目文档（见下文）| 双方 |

---

## `backend/` — FastAPI 后端

| 文件/目录 | 用途 |
|---|---|
| `main.py` | FastAPI 应用入口： lifespan、CORS、路由注册、静态文件挂载 |
| `config.py` | 全局配置：应用名/版本、数据库路径、DeepSeek Key 等 |
| `database.py` | SQLAlchemy engine 与 SessionLocal 初始化 |
| `models.py` | 5 张核心表的 ORM 模型（raw_observations / reports / bookshelf_items / cooldown_items / logs）|
| `logger.py` | loguru 配置 + 写 SQLite logs 表封装 |
| `requirements.txt` | Python 依赖 |
| `.env.example` | 环境变量模板（不含真实密钥）|
| `.env` | 真实环境变量（gitignored）|
| `routers/` | API 路由模块 |
| `routers/ingest.py` | `POST /ingest`：接收扩展上报的笔记数据 |
| `routers/import_url.py` | `POST /api/import-url`：用户粘贴小红书 URL 补录 |
| `routers/report.py` | `GET /api/report/*` + `POST /api/report/generate`：报告查询与异步生成 |
| `routers/bookshelf.py` | `GET /api/bookshelf` + `POST /api/bookshelf/refresh`：书架查询与刷新 |
| `routers/cooldown.py` | CRUD `/api/cooldown`：冷静期盒子，GET 时自动解锁到期项 |
| `routers/chat.py` | `POST /api/chat`：苏格拉底对话代理 |
| `routers/logs.py` | `POST /api/log`：跨端日志入库 |
| `tests/` | 接口测试占位（目前仅 `.gitkeep`）|

**注意**：FastAPI 只负责数据搬运和静态文件服务，**不直接调用 DeepSeek**；所有 AI 逻辑在 OpenClaw Skills 中。

---

## `frontend/` — Web Dashboard

技术栈：原生 HTML + 原生 JS + HTMX + Tailwind CSS + DaisyUI + ECharts（全 CDN，无构建工具）。

| 文件/目录 | 用途 |
|---|---|
| `index.html` | 主导航页 |
| `report.html` | 认知体检报告页 |
| `bookshelf.html` | 平行书架页 |
| `cooldown.html` | 冷静期盒子页 |
| `css/eatwhat.css` | 自定义样式补全 |
| `js/api.js` | 统一 fetch 封装（baseUrl、错误处理）|
| `js/logger.js` | 前端日志封装（console + POST /api/log）|
| `js/report.js` | 报告页 ECharts 渲染与轮询 |
| `js/bookshelf.js` | 书架页渲染与苏格拉底追问聊天框 |
| `js/cooldown.js` | 冷静期盒子渲染与倒计时 |
| `assets/` | 图标、图片占位 |

---

## `extension/` — Chrome 扩展

技术栈：Manifest V3 + 原生 JS。

| 文件/目录 | 用途 |
|---|---|
| `manifest.json` | 扩展配置（权限、匹配 URL、service worker）|
| `content.js` | 注入小红书笔记页，抓取公开 DOM，监听用户动作，追踪停留时间 |
| `background.js` | Service worker：接收 content.js 消息，转发到后端；右键菜单 |
| `popup.html` / `popup.js` | 点击扩展图标弹出的采集面板 |
| `cooldown_import.html` / `cooldown_import.js` | 冷静期盒子导入弹窗 |
| `logger.js` | 扩展日志封装 |
| `icons/` | 扩展图标（16/32/48/128 px）|

---

## `openclaw_workspace/` — OpenClaw Agent

| 文件/目录 | 用途 |
|---|---|
| `SOUL.md` | Agent 人格、总指令、模型配置 |
| `skills/analyze-cognition/` | 认知体检报告 Skill：读 DB → 调 DeepSeek → 写 reports |
| `skills/search-parallel-views/` | 平行书架 Skill：基于盲区生成推荐 |
| `skills/socratic-dialog/` | 苏格拉底追问 Skill：只追问不下结论 |
| `skills/cooldown-unlock/` | 冷静期解锁 Skill：cron 扫描到期项（兜底）|

**命名规范**：Skill 目录使用连字符（kebab-case），如 `analyze-cognition`，不使用下划线。

---

## `docs/` — 项目文档

| 文件/目录 | 用途 |
|---|---|
| `README.md` | 本文档的索引，说明 docs 各子目录 |
| `api.md` | **接口契约**：前后端 + 扩展 + OpenClaw 对齐的唯一事实源 |
| `project_structure.md` | 项目目录说明（本文档）|
| `design/` | 设计文档 |
| `design/eatwhat.md` | **当前权威设计文档**（v4.1 赛后打磨版）|
| `design/commercialization.md` | 商业化叙事草案 |
| `design/history/` | 历史设计文档归档（ver1/ver2/ver3/update1.txt）|
| `contest/` | 比赛相关材料 |
| `contest/contest_rules.jpg` | 比赛规则原图 |
| `contest/tech_report_draft.md` | 初赛提交技术报告书 |
| `contest/finals_presentation_guide.md` | 决赛答辩指南 |
| `contest/poster_prompt.md` | 宣传海报 AI 生成提示词 |
| `contest/tech_primer.md` | 技术速览 / 评委应对手册 |
| `development/` | 开发过程记录 |
| `development/bug_tracker.md` | **统一 bug 追踪器**（见该文件写入规范）|
| `development/copilot_bug_handling_prompt.md` | 给 Copilot 的 bug 处理提示词 |
| `development/iterations/` | 迭代日志与迁移指南 |

---

## `data/` — 运行期数据（gitignored）

| 文件/目录 | 用途 |
|---|---|
| `eatwhat.db` | SQLite 数据库（扩展采集、报告、书架、冷静期、日志）|
| `logs/` | 各端运行时日志 |

**注意**：该目录不会进入 Git，换机器/重装时需要重新生成。

---

## `demo/` — 演示物料

| 文件/目录 | 用途 |
|---|---|
| `screenshots/` | 产品截图占位（目前仅 `.gitkeep`）|
| `*.mp4` / `*.mov` | 演示视频（gitignored，太大，只放网盘）|

---

## `archive/` — 历史归档

| 文件/目录 | 用途 |
|---|---|
| `backup_20260514/extension/` | 2026-05-14 的旧扩展备份，当前 `extension/` 已演进，此处仅留档 |

---

## 维护规则

1. **新增目录前**：先在本文档里说明用途，避免目录无限膨胀。
2. **移动文件后**：同步更新本文档和相关文档中的相对路径。
3. **删除文件前**：确认是否有其他文档引用它。
4. **历史归档**：不再维护的文件移入 `archive/` 或 `docs/design/history/`，不要直接删除重要历史。
