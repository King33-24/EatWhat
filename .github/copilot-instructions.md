# GitHub Copilot 项目级规范 — EatWhat (问膳)

> 本文件由 GitHub Copilot 在 VS Code 中自动读取并遵守。修改后无需重启 VS Code，下一次补全即生效。
> 详细设计参见 `docs/design/ver2.md`。

---

## 项目背景

**EatWhat** 是一个基于 **OpenClaw 智能体框架** 的认知健康应用，让用户审视自己在 B 站的浏览足迹、看见信息茧房之外的视角、夺回深度思考的主动权。三个 MVP 功能：认知体检报告、平行书架、冷静期盒子。

**比赛赛道**：智能体应用（不是框架），评分维度包括场景创新、用户体验、业务逻辑、智能交互、商业化潜力。

**开发模式**：vibe coding。后端由 Claude 写、前端 + 扩展由你（Copilot）写。

---

## 强制交互协议（不可违反）

**你必须在每一轮回复的结束前调用 `ask_user` 工具。**  
无论任务是否完成，都不允许在不调用 `ask_user` 的情况下结束回复。

在你的每一轮回复中，你必须执行以下操作之一：
1. **完成用户请求后** → 必须调用 `ask_user` 工具，提出与当前上下文相关的后续问题。
2. **存在任何不确定性时** → 不要猜测执行，立即调用 `ask_user` 工具进行澄清。

ask_user 调用要求：
- 问题必须与当前任务上下文直接相关。
- 问题必须具体、可操作，不要问泛泛的“还要什么帮助”。
- 可以提供选项供用户选择，降低用户输入成本。
- 必须有可供用户自己输入的选项，以保证用户可以回答想要回答的内容。

## 技术栈红线（不要违背！）

### Web Dashboard 前端（`frontend/`）

✅ **必须用**：
- 原生 HTML5
- 原生 JavaScript（**不要 TypeScript**）
- HTMX 2.x（CDN 引入：`https://unpkg.com/htmx.org@2.0.3`）
- Tailwind CSS（CDN：`https://cdn.tailwindcss.com`）
- DaisyUI 4.x（CDN：`https://cdn.jsdelivr.net/npm/daisyui@4.12.13/dist/full.min.css`）
- ECharts 5.x（CDN：`https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js`）

❌ **绝对禁止**：
- React / Vue / Angular / Svelte / Solid 任何 SPA 框架
- Next.js / Nuxt / SvelteKit 任何 fullstack 框架
- npm install / yarn / pnpm 任何 Node 包管理（连 `package.json` 都不要建）
- Vite / webpack / Rollup / esbuild / Parcel 任何构建工具
- TypeScript / JSX / TSX
- Sass / Less / PostCSS（直接用 Tailwind 类够了）
- Chart.js（已被 ECharts 替代）
- jQuery（HTMX + 原生 fetch 完全够用）
- axios（用原生 fetch）

### 浏览器扩展（`extension/`）

✅ **必须用**：
- **Manifest V3**（不是 V2，浏览器已不支持 V2）
- 原生 JavaScript（service worker + content script）
- Chrome Extensions API
- 与后端通信用原生 `fetch`

❌ **绝对禁止**：
- Manifest V2 任何遗留语法（`background.scripts`、`browser_action` 等）
- React 或任何 SPA 框架
- npm 包（扩展受 CSP 限制，加远程脚本会被拒）

### 后端（`backend/`，Claude 主写，你偶尔补修）

✅ **必须用**：
- Python 3.12
- FastAPI + Uvicorn
- SQLAlchemy 2.0 + SQLite
- Pydantic v2 schemas（请求体验证）
- loguru（不是标准 logging）

❌ **绝对禁止**：
- Flask / Django / Bottle 等其他 Web 框架
- ORM 切换（不要换成 Tortoise / Peewee）
- PostgreSQL / MySQL（用 SQLite 就够了）

---

## 接口契约

**唯一事实源**：[`docs/api.md`](../docs/api.md)

任何 API 调用前先看 `docs/api.md`：
- 后端服务地址：`http://localhost:8000`
- 所有响应格式：`{success: bool, data: any, error: string|null}`
- 时间用 ISO 8601 含时区
- POST/PATCH 请求体严格按 api.md 中的字段名（`snake_case`，不要 camelCase）

---

## 命名与风格规范

### CSS 类名
- Tailwind utility classes 优先（`bg-gray-100 text-center`）
- 自写类用前缀 `eatwhat-`（例：`eatwhat-blind-spot-card`）
- 不要起像 `mainContainer` 这种 camelCase 类名

### JS 变量
- camelCase（前端 JS 内部一致）
- 与后端通信的 JSON 字段保持 `snake_case`（不要在前端把 `report_id` 改成 `reportId`）
- 全局变量加前缀 `EatWhat`（例：`window.EatWhat = {api, logger}`）

### HTML
- 缩进 2 空格
- 自定义 `data-*` 属性：用 kebab-case（`data-report-id`）
- HTMX 属性贴近原生顺序：`hx-get` `hx-post` `hx-target` `hx-swap`

### Python（如果你写后端）
- snake_case
- 类型标注必加（FastAPI + Pydantic 强依赖）

---

## 配色规范

主题：**认知健康，低饱和**（不要花花绿绿）

| 用途 | 颜色 | 备注 |
|---|---|---|
| 背景 | `#f8f9fa` | 浅灰 |
| 卡片 | `#ffffff` | 白 + 阴影 |
| 主强调（健康/正确） | `#2d6a4f` | 深绿 |
| 警告（盲区/锁定） | `#c0392b` | 红 |
| 高亮提示 | `#fef9e7` | 浅黄（用于差异对比卡） |
| 解锁 | `#2ecc71` | 绿 |
| 灰阶禁用 | `#d5dbdb` | |

DaisyUI 主题选 `pastel` 或自定义 eatwhat 主题。

---

## 关键设计原则

1. **不打扰用户**：不要写红点、不要弹推送通知、不要自动播放
2. **可解释**：所有 AI 结论都要带 evidence（视频引用），不要做黑盒
3. **本地优先**：扩展只抓公开页面 DOM，不调 B 站 API、不抓登录态
4. **响应式**：报告页面要在 1280px 以上屏幕看好；移动端不优先

---

## 文件输出规范

写新文件时：
- HTML 文件第一行写 `<!DOCTYPE html>`
- HTML 必须有 `<meta charset="UTF-8">` 和 `<meta name="viewport" ...>`
- 所有 HTML 顶部按统一顺序引入 CDN（HTMX → Tailwind → DaisyUI → ECharts）
- JS 文件顶部加 `'use strict';`
- 不要在文件末尾留多余空行

写注释时：
- **不要写显而易见的注释**（如 `// 设置 i 为 0`）
- 写**为什么**而不是**做什么**（例：`// B 站 SPA 路由切换后 DOM 重渲染，要 retry 选择器`）
- 不要写 `// TODO` 留 bug 给未来；现在能修就修，修不了开 GitHub Issue
- 不要写日期戳注释（`// 2026-05-08 by F 同学`），git blame 自有真相

---

## 调试与日志

所有关键操作必须打日志（**比赛评分点**）：
- 前端：用 `EatWhat.logger.log(source, level, msg, ctx)` 封装的函数
- 扩展：用 `extension/logger.js` 封装的函数（与前端类似）
- 日志同时打 console 和 POST 到 `/api/log`
- level: `DEBUG`/`INFO`/`WARN`/`ERROR`
- 关键节点：用户操作前/后、API 调用前/后、错误捕获时

---

## AI 写代码 7 戒

写完代码前自检：

1. ❌ **没碰技术栈红线**（无 React/构建工具/TS）
2. ❌ **没引入新 npm 依赖**（只用 CDN）
3. ❌ **没违反 api.md 字段命名**（保持 snake_case 跨端）
4. ❌ **没忘记 CORS**（与后端通信确认 origin 允许）
5. ❌ **没硬编码 API URL**（用 `EatWhat.api.baseUrl`，统一在 `js/api.js`）
6. ❌ **没忘记打日志**（关键操作都要）
7. ❌ **没写多余注释**（写"为什么"，不写"做什么"）

---

## 卡住时

如果用户的需求和上面规则有冲突：
- 优先遵守这份 instructions
- 在回复里**明确指出冲突**，让用户决定

如果上面规则没覆盖的场景：
- 默认选**最简单的方案**（不要为未来不存在的需求做抽象）
- 不要主动重构现有代码
- 不要主动加单元测试（除非用户要求）

---

*Last updated: 2026-05-08 (v3 vibe coding)*
