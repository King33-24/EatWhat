# 问膳 (EatWhat) — 任务拆解与分工 v3

> **本文档依据 `docs/design/history/docs/design/history/ver2.md` 设计文档,按 16 天初赛 + 12 天决赛节奏拆解。v3 关键变更:从"自学+实操"模式改为 vibe coding(Claude 写后端 + Copilot 写前端)。任务粒度按"AI 协作单位"重新设计。**

---

## 1. 团队与分工

| 角色 | 代号 | 主负责范围 | AI 工具 |
|---|---|---|---|
| **后端工程师** | **B 同学**(用户) | FastAPI 后端、SQLite、OpenClaw Agent + Skills、运维 | Claude(对话式) |
| **前端工程师** | **F 同学**(队友) | 浏览器扩展、Web Dashboard、演示物料 | GitHub Copilot(IDE 补全) |

**共同**:环境配置、API 接口约定、联调、Demo 数据、答辩 PPT。

**vibe coding 协作纪律**:
- 接口契约(`docs/api.md`)是双方对齐的唯一事实源,任何接口变更必须先改它再改代码
- 技术栈红线见 `.github/copilot-instructions.md`,Copilot 不能写出 React/Vue/build 工具相关代码
- 每天晚上 8 点同步 10 分钟,过对方当天的 commit
- 卡 30 分钟以上的问题立刻叫对方 / Claude / Copilot Chat 看,别一个人闷头

---

## 2. GitHub 协作约定

1. **仓库名**:`EatWhat`
2. **分支模型**:
   - W1 主干开发(直接 push 到 `main`,3 周项目分支模型多余)
   - W2 起改用 `dev-frontend` / `dev-backend` 分支,每天 push,睡前合并
3. **Commit 消息**:中文,格式 `类型: 简短说明`
   - 例:`feat(backend): 实现 POST /ingest`
   - 例:`fix(extension): 修复 BV 号解析失败`
4. **Issue 用法**:卡住的问题→新建 Issue,打标签 `question` / `bug` / `help wanted`
5. **`.gitignore`**(项目初始化时已写好):见根目录 `.gitignore`

---

## 3. 时间线总览

### 3.1 初赛阶段(2026-05-08 ~ 05-24,16 天)

```
W1 (5/8 周五 ~ 5/14 周四) 骨架周
  目标:跑通最小链路(扩展抓→后端存→前端读)+ OpenClaw Hello World

W2 (5/15 周五 ~ 5/21 周四) 核心周
  目标:三件套全部实现并联调(报告 + 书架 + 冷静期)

收尾 (5/22 周五 ~ 5/24 周日) 提交周
  目标:Demo 数据 + 演示笔记 + PPT + 技术报告书 + 夸克网盘提交
```

**每天**约 5-6 小时(2 人 × 5h × 16 天 ≈ 160 人时,vibe coding 下足够)。

### 3.2 决赛准备阶段(2026-05-29 ~ 06-06,12 天)

> **看 5/29 决赛名单公布后是否入围再启动**。如未入围,自然结束。

```
T1 (5/29 ~ 6/2) 抛光周:UI 精修 + 增加亮点(他人之眼 demo / 本地模型展示)
T2 (6/3 ~ 6/5) 答辩周:答辩 PPT + 演讲稿 + 彩排
T3 (6/6) 决赛日:现场答辩
```

---

## 4. 任务编码规则

| 前缀 | 含义 | 负责 |
|---|---|---|
| `S-` | Shared(共同) | 双方 |
| `B-` | Backend | B 同学 |
| `F-` | Frontend(Web Dashboard) | F 同学 |
| `E-` | Extension(浏览器扩展) | F 同学 |
| `O-` | OpenClaw | B 同学 |
| `D-` | Deliverable(提交物) | 双方 |

**难度等级**:
- `★` 简单:AI 一两次就能写好,人工 30 分钟内验收
- `★★` 中等:AI 写完需要人工调试,2-4 小时
- `★★★` 难:容易卡住,可能需要反复试 prompt 或求助

---

## 阶段 0:启动准备(5/8 周五,Day 1)

### S-01:共建 GitHub 仓库 + 提交初始骨架
- **谁做**:B 同学主操,F 同学旁观学习
- **难度**:★
- **预计**:1h
- **怎么做**:
  1. B 同学注册/登录 GitHub,新建仓库 `EatWhat`(Public)
  2. 本地:`cd /home/king/project && git init && git remote add origin https://github.com/King33-24/EatWhat.git`
  3. 当前目录已经包含 docs、.gitignore 等(由本次 setup 阶段建好),直接 `git add . && git commit -m "init: 项目骨架(v3 vibe coding 重构)" && git push -u origin main`
  4. F 同学在自己电脑:`git clone https://github.com/King33-24/EatWhat.git`
- **验收**:两人都能看到一致的目录结构;远程仓库有 `docs/`、`.github/`、`backend/`(空) 等
- **资源**:[GitHub 快速入门](https://docs.github.com/zh/get-started/quickstart)

### S-02:申请 DeepSeek API Key 并测试
- **谁做**:B 同学
- **难度**:★
- **预计**:1h
- **怎么做**:
  1. <https://platform.deepseek.com/api_keys> 创建 API 密钥
  2. 用 curl 测试调用(测试命令见 `docs/api.md` 附录或问 Claude)
  3. 配置环境变量:`echo 'export DEEPSEEK_API_KEY=xxx' >> ~/.bashrc && source ~/.bashrc`
- **验收**:curl 返回成功响应
- **注意**:DeepSeek 按 token 计费(¥1 起充),初赛+决赛预算 ¥2 内

### S-03:确认 API 接口契约
- **谁做**:双方一起花 30 分钟过一遍 `docs/api.md`
- **难度**:★
- **预计**:30min
- **怎么做**:
  1. 双方各自打开 `docs/api.md`,逐个接口确认理解
  2. 记下任何疑问或不一致的地方
  3. 现场让 Claude 修订 api.md(如有不清楚)
- **验收**:双方都能口述 6 个 API 的用途和 JSON 格式

---

## 阶段 1:W1 骨架周(5/9 周六 ~ 5/14 周四)

### B-01:VM 环境 + 装基础软件(5/9)
- **谁做**:B 同学(F 同学也要装,可以并行)
- **难度**:★
- **预计**:3h
- **怎么做**:
  1. VMware Player 装 Ubuntu 24.04 LTS:内存 6GB / CPU 4 核 / 硬盘 40GB
  2. 装软件:Chrome、Python 3.12、VS Code、Git、Node.js
  3. VS Code 装 GitHub Copilot 插件(F 同学一定要,B 同学可选)
  4. 命令清单让 Claude 给(直接问"Ubuntu 24.04 装这些软件的命令")
- **验收**:能打开 Chrome、VS Code、终端 Python 3.12 OK
- **资源**:[VMware 教程](https://docs.vmware.com/en/VMware-Workstation-Player/index.html)

### B-02:跑通 OpenClaw Hello World(5/9 ~ 5/10)
- **谁做**:B 同学
- **难度**:★★★(最可能卡的一步)
- **预计**:6h(留 1.5 天)
- **怎么做**:
  1. <https://github.com/openclaw/openclaw> 看 README Installation
  2. 装好 + 配置 DeepSeek Key + 启动 → WebChat localhost:18789
  3. 用 Claude 协作:把官方 README 贴给 Claude,让它解释每一步
  4. 卡住先看 [datawhalechina/hello-claw](https://github.com/datawhalechina/hello-claw) 中文教程
  5. 还卡就跳过,先做 B-03,W1 末再回来
- **验收**:WebChat 能聊天,Agent 用 DeepSeek 回复
- **降级方案**:如果实在跑不起来,先用 Python 直接调 DeepSeek API 占位,后期再补

### B-03:FastAPI 骨架 + SQLite 初始化(5/10)
- **谁做**:B 同学(让 Claude 写)
- **难度**:★
- **预计**:2h
- **怎么做**:
  1. `cd backend && python3 -m venv .venv && source .venv/bin/activate`
  2. 让 Claude:"基于 docs/design/history/ver2.md §6 的 schema,在 backend/ 写 main.py、database.py、models.py、config.py,5 张表的 SQLAlchemy 模型,FastAPI 启动后自动 create_all。最小可运行版本。"
  3. `pip install fastapi uvicorn sqlalchemy loguru python-dotenv`
  4. 跑 `uvicorn main:app --reload --host 0.0.0.0 --port 8000` → 访问 `localhost:8000` 看到 OK
  5. 用 DBeaver 打开 `data/eatwhat.db`,确认 5 张表存在
- **验收**:浏览器访问 8000 看到 OK,DBeaver 看到 5 张表
- **AI 协作 tip**:Claude 写完后,让它解释每个文件的职责,你看一遍能跟上

### B-04:实现 POST /ingest + 后端日志 + URL 补录(5/11 上午)
- **谁做**:B 同学(让 Claude 写)
- **难度**:★
- **预计**:3h(含 B-04b)
- **怎么做(B-04a: POST /ingest)**:
  1. 让 Claude 按 `docs/api.md §1.1` 写 `backend/routers/ingest.py`
  2. 让 Claude 写 `backend/logger.py`(loguru + 写 SQLite logs 表)
  3. 在 `main.py` 注册 router
  4. 用 curl 测试:`curl -X POST localhost:8000/ingest -H "Content-Type: application/json" -d '{...}'`(完整 JSON 见 api.md)
- **怎么做(B-04b: POST /api/import-url,新增)**:
  1. 让 Claude 写 `backend/routers/import_url.py`
  2. 实现:校验 URL → httpx 抓小红书笔记页 → BeautifulSoup 解析 `title/author/content/tags/images_count/likes_count/collects_count/comments_count` → 入库,`source_channel='manual_url'`
  3. `main.py` 注册 `app.include_router(import_url.router, prefix="/api")`
  4. 在 `frontend/index.html` 加"补录笔记"输入框(或让 F 同学做)
- **验收**:curl /ingest 返回 success;curl /import-url 返回 success(可用真实小红书 URL 测试);DB 有记录;logs 表有日志
- **AI 协作 tip**:Claude 写完后让它告诉你 CORS 怎么配(扩展会跨域)

### F-01:Web Dashboard 骨架(5/10 ~ 5/11)
- **谁做**:F 同学(Copilot 写)
- **难度**:★
- **预计**:3h
- **怎么做**:
  1. `cd frontend`,创建 4 个 HTML 文件:`index.html`、`report.html`、`bookshelf.html`、`cooldown.html`
  2. 每个 HTML 顶部统一引入 CDN(让 Copilot 帮你写,提示它"按 .github/copilot-instructions.md 引入 HTMX、Tailwind、DaisyUI、ECharts CDN"):
     ```html
     <script src="https://unpkg.com/htmx.org@2.0.3"></script>
     <script src="https://cdn.tailwindcss.com"></script>
     <link href="https://cdn.jsdelivr.net/npm/daisyui@4.12.13/dist/full.min.css" rel="stylesheet">
     <script src="https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js"></script>
     ```
  3. `index.html` 做主导航:DaisyUI navbar + 三个卡片链接
  4. 其他三页先放骨架(标题 + 占位文字)
  5. 写 `js/api.js`(fetch 封装)、`js/logger.js`(打日志 POST 到 /api/log)
  6. 让 B 同学在 main.py 加静态文件 mount:`app.mount("/", StaticFiles(directory="../frontend", html=True))`
- **验收**:`localhost:8000` 看到主导航,点链接跳到 4 个页面
- **AI 协作 tip**:打开 `.github/copilot-instructions.md` 让 Copilot 自动遵守;写交互时优先尝试 HTMX 属性,不要写 React 风格代码

### E-01:浏览器扩展骨架 + 加载到 Chrome(5/11)
- **谁做**:F 同学(Copilot 写)
- **难度**:★★
- **预计**:3h
- **怎么做**:
  1. 让 Copilot 按 docs/design/history/ver2.md §7 在 `extension/` 写 `manifest.json`(Manifest V3,匹配 `*.xiaohongshu.com/video/*`)
  2. 写 `content.js`(先放 `console.log("hello from content")`)
  3. 写 `background.js`(空骨架)
  4. 写 `popup.html` + `popup.js`(简单弹窗,一个按钮)
  5. Chrome 打开 `chrome://extensions/` → 开发者模式 → 加载已解压扩展(选 `extension/` 文件夹)
  6. 打开 小红书笔记页 → F12 → Console 看到 hello
- **验收**:Chrome 加载扩展成功,小红书页面 F12 控制台有 hello
- **AI 协作 tip**:Copilot 在 Manifest V3 上偶尔会用 V2 老语法,看到 `background_page` 这种立刻让它改

### E-02:Content Script 抓 小红书 DOM(5/12)
- **谁做**:F 同学
- **难度**:★★★(小红书 DOM 选择器要试)
- **预计**:5h
- **怎么做**:
  1. 让 Copilot 写 `extractNoteData()` 函数:抓 note_id/title/author/tags/content/images_count/likes_count/collects_count/comments_count
     - ⚠️ **注意**:`content` 是笔记正文(远比 B 站 description 长,是主信息源);`images_count` 只数不抓图;小红书评论区是 Shadow DOM,**不抓 top_comments**
  2. 在 小红书笔记页 F12 Console 里粘贴函数测试,看返回值
  3. 选择器找不到的字段就 F12 Elements 用 Ctrl+Shift+C 点元素看 class
  4. 反复迭代,在 3 个不同笔记页都能正确返回
- **验收**:3 个笔记页运行 `extractVideoData()` 都能返回完整字段
- **卡住怎么办**:把抓不到的元素 HTML 片段贴给 Claude,让它给你 CSS 选择器

### E-03:Content → Background → FastAPI 全链路(5/13)
- **谁做**:F 同学
- **难度**:★★
- **预计**:3h
- **怎么做**:
  1. `content.js` 抓完数据后 `chrome.runtime.sendMessage({...payload})`
     - Payload 字段按 `docs/api.md §1.1` 最新版:`note_id/title/author/tags/content/images_count/likes_count/collects_count/comments_count/interaction_type/dwell_seconds/source_channel`
     - `source_channel` 固定填 `'extension'`
  2. `background.js` 接到 message 后 `fetch('http://localhost:8000/ingest', ...)`
  3. B 同学的 FastAPI 必须开着
  4. 测:打开 小红书笔记页 → DB raw_observations 有记录(含新增字段)
- **验收**:小红书打开笔记 → 数据库出现记录(DBeaver 查)
- **CORS 注意**:浏览器报 CORS 错让 B 同学加 CORSMiddleware(放行 `chrome-extension://*`)

### E-04:扩展 popup + 右键菜单(5/14 上午)
- **谁做**:F 同学(Copilot 写)
- **难度**:★★
- **预计**:3h
- **怎么做**:
  1. `popup.html`:DaisyUI 简洁弹窗,有"采集本笔记"按钮
  2. `popup.js`:点按钮 → 向当前 tab 发消息触发 content.js 重抓
  3. `background.js`:注册右键菜单"存入冷静期盒子"(对 link 触发,POST /api/cooldown)
  4. 测试:点扩展图标 → 弹窗 → 点采集 → 成功提示;在笔记链接上右键 → 看到菜单项
- **验收**:popup 和右键菜单都能用

### E-05:用户主动动作 hook(点赞/收藏/评论)—— 新增(v4)
- **谁做**:F 同学(Copilot 写)
- **难度**:★★
- **预计**:2h
- **怎么做**:
  1. `content.js` 增加全局 click 监听:用 `e.target.closest('button,div,span')` 识别点赞/收藏/评论按钮
  2. 通过按钮的 class 或 aria-label 判断动作类型:`like` / `collect` / `comment`
  3. 触发后 `chrome.runtime.sendMessage({type:'user_action', note_id, action_type})`
  4. `background.js` 收到后 `POST /ingest` 写入,`interaction_type` 设为对应动作
  5. **注意**:小红书 class 名经常变,先用 F12 看当前 class,再让 Copilot 写选择器;决赛前可能要迭代一次
- **验收**:在小红书笔记页点点赞 → DB `raw_observations` 出现一条 `interaction_type='like'` 的记录
- **卡住怎么办**:class 找不到时,用 `MutationObserver` 监听点赞按钮出现;或改用 `document.querySelectorAll('[aria-label*="赞"]')` 做兜底

### E-06:Dwell time(停留时间追踪)—— 新增(v4)
- **谁做**:F 同学(Copilot 写)
- **难度**:★
- **预计**:1.5h
- **怎么做**:
  1. `content.js` 在页面 load 时 `let startTime = Date.now(); let totalActiveMs = 0;`
  2. 监听 `document.visibilitychange`:切走 Tab 时累加并暂停计时;切回时重置 startTime
  3. 监听 `window.beforeunload`:页面关闭或跳走时累加最终时长
  4. 用 `navigator.sendBeacon('http://localhost:8000/ingest', JSON.stringify(payload))` 上报 — beacon 保证即使页面关闭也能送达
  5. Payload 含 `note_id` + `interaction_type='view'` + `dwell_seconds=Math.min(Math.round(totalActiveMs/1000), 600)`(上限 600s)
- **验收**:在小红书笔记页停留 30 秒后切走 → DB 该 note 的 `dwell_seconds` 在 25-35 秒之间(有网络延迟容差)
- **已知边缘情况**:人离开电脑不关页面 → `visibilitychange` 不切走时会被多计;上限 600s 截断可部分缓解;决赛 PPT 里主动提及此限制(见 `docs/design/eatwhat.md` §9.X)

### O-01:写第一个 OpenClaw Skill(Hello)(5/13 ~ 5/14)
- **谁做**:B 同学(让 Claude 写)
- **难度**:★★
- **预计**:3h
- **怎么做**:
  1. 让 Claude 解释 SOUL.md 和 SKILL.md 的结构(基于 hello-claw 教程)
  2. 在 `openclaw_workspace/` 写最小的 SOUL.md
  3. 在 `skills/` 写 `hello/SKILL.md`:让 Agent 收到"say hello"时回复"我是问膳,为你服务"
  4. WebChat 测试
- **验收**:WebChat 输入"say hello"→ Agent 返回自定义文案
- **降级方案**:OpenClaw 真不行的话,这步推迟到 W2,先用纯 Python 脚本调 DeepSeek 占位

### S-04:W1 末全链路联调 + 决定是否动 OpenClaw(5/14 晚)
- **谁做**:双方
- **难度**:★★
- **预计**:2h
- **怎么做**:
  1. 完整走一遍:小红书笔记页 → 扩展抓 → FastAPI 收 → SQLite 存 → 前端 Dashboard 主页能显示"已采集 N 条"
  2. 检查双方 GitHub 都已 push
  3. 决策:OpenClaw 跑通了吗?
     - **跑通了**:W2 按计划做 analyze_cognition Skill
     - **没跑通**:W2 用纯 Python 脚本顶,W3 末再尝试塞回 OpenClaw 框架
- **验收**:全链路通,数据可见

### W1 末检查清单
- [ ] GitHub 仓库 main 分支有完整骨架
- [ ] VM 环境 Chrome/VS Code/Python 都装好,Copilot 在 VS Code 工作正常
- [ ] FastAPI 跑起来 8000 端口能访问
- [ ] OpenClaw WebChat 能聊天(或降级到纯 Python 调 DeepSeek)
- [ ] SQLite 5 张表建好
- [ ] 扩展能加载,小红书页面能抓数据
- [ ] **全链路:小红书采集 → FastAPI → SQLite,通!**
- [ ] 前端 Dashboard 主页 + 4 个空白页能跳转

---

## 阶段 2:W2 核心周(5/15 周五 ~ 5/21 周四)

### O-02:设计 + 实现 analyze_cognition Skill(5/15 ~ 5/17)
- **谁做**:B 同学(让 Claude 协作 prompt 工程)
- **难度**:★★★
- **预计**:8h(分散 3 天)
- **怎么做**:
  1. **5/15 上午**:让 Claude 帮你写 prompt 草稿(参考 docs/design/history/ver2.md §2.1 报告四板块)
  2. **5/15 下午**:在 DeepSeek Playground(<https://platform.deepseek.com/playground>)或用 curl 脚本喂 20-30 条模拟笔记数据测试 prompt,迭代到输出稳定 JSON
  3. **5/16**:把最终 prompt 嵌入 SKILL.md 的 instructions 段;Skill 工作流:读 raw_observations 近 7 天 → 调 DeepSeek → 解析 JSON → 写 reports 表
  4. **5/17**:WebChat 测试触发,看 reports 表新增记录
- **验收**:WebChat 输入"生成本周认知体检报告"→ reports 表新增一条 + JSON 各字段完整
- **AI 协作 tip**:让 Claude 帮你设计 prompt 的"系统消息"和"few-shot 示例",并要求 DeepSeek 输出严格 JSON(用 `response_mime_type: application/json`)
- **降级**:OpenClaw 不行就写 `backend/skills/analyze_cognition.py` 纯脚本,FastAPI 启动时跑一次 cron(用 BackgroundTasks 或独立线程)

### O-03:实现 search_parallel_views Skill(5/18)
- **谁做**:B 同学
- **难度**:★★★
- **预计**:5h
- **怎么做**:
  1. Prompt 输入:reports.blind_spots
  2. 用 DeepSeek + Bing Search API(或 Serper.dev)做 grounding(检索外部观点)
  3. 让 Claude 设计 prompt:要求"理性、非煽动",输出 2-3 条/盲区
  4. 写入 bookshelf_items 表
  5. 在 analyze_cognition Skill 末尾自动触发(连带调用)
- **验收**:报告生成后,DB 新增对应 bookshelf_items
- **注意**:Bing/Serper 搜索 API 有调用限额(免费层 1000 次/月),演示前要预生成

### B-05:实现 GET /api/report/* 和 /api/bookshelf(5/16 并行)
- **谁做**:B 同学
- **难度**:★
- **预计**:2h
- **怎么做**:让 Claude 按 `docs/api.md §2 §3` 写 routers
- **验收**:curl 测全部接口返回正确 JSON

### B-06:实现 POST /api/report/generate + /api/bookshelf/refresh(5/16)
- **谁做**:B 同学
- **难度**:★★
- **预计**:3h
- **怎么做**:
  1. 接口收到请求后,后端写一条"任务"到协调表(或文件信号)
  2. OpenClaw Skill 监听该表/信号,触发执行
  3. 异步设计,前端轮询 latest 报告即可
- **验收**:前端调用 generate → 几秒后 reports 表出现新记录

### F-02:report.html 渲染(5/17 ~ 5/19)
- **谁做**:F 同学(Copilot 写)
- **难度**:★★
- **预计**:6h
- **怎么做**:
  1. **5/17**:用 DaisyUI 排好布局(标题 + 兴趣地图区 + 观点光谱区 + 盲区卡片 + 情绪卡片)
  2. **5/18**:`js/report.js` 调 `/api/report/latest`,把 JSON 填到 DOM;ECharts 画饼图(interest_map)和条形图(opinion_spectrum)
  3. **5/19**:盲区卡片(DaisyUI card)、情绪卡片;空数据态("还没有报告,先去 小红书看看吧"按钮 → htmx 触发 generate)
  4. 配色:浅灰背景 `#f8f9fa` + 白卡 + 强调色 `#2d6a4f` 深绿 + 警告色 `#c0392b` 红
- **验收**:报告页能完整显示四板块,数据来自真实 API
- **AI 协作 tip**:让 Copilot 写 ECharts 时给它一个 sample JSON(从 api.md 复制),它写得更准

### F-03:bookshelf.html 渲染(5/19 ~ 5/20)
- **谁做**:F 同学
- **难度**:★★
- **预计**:5h
- **怎么做**:
  1. DaisyUI list/card,每条推荐一张
  2. 卡片结构:标题 / 来源 badge / 作者背景灰字 / 差异对比卡(浅黄底 `#fef9e7` 突出) / 折叠展开
  3. "苏格拉底追问"按钮 → 展开内嵌聊天框，调用 `POST /api/chat` 代理到 OpenClaw Agent
- **验收**:能渲染所有书架项,折叠展开正常

### B-07:实现 CRUD /api/cooldown(5/20)
- **谁做**:B 同学
- **难度**:★★
- **预计**:3h
- **怎么做**:让 Claude 按 `docs/api.md §4` 写 router(POST 计算 unlock_at,GET 返回 remaining_seconds 等)

### O-04:cooldown_unlock cron Skill(5/20)
- **谁做**:B 同学
- **难度**:★
- **预计**:1h
- **怎么做**:每天 00:30 跑 SQL `UPDATE cooldown_items SET status='unlocked' WHERE unlock_at<datetime('now') AND status='locked'`
- **验收**:插一条 1 分钟后解锁的测试记录,看 1 分钟后是否 status 变化

### F-04:cooldown.html 渲染(5/20 ~ 5/21)
- **谁做**:F 同学
- **难度**:★★
- **预计**:4h
- **怎么做**:
  1. 左:输入区(URL + user_note + 存入按钮,htmx POST)
  2. 右:列表两栏(锁定中倒计时 / 已解锁链接)
  3. 倒计时用 setInterval 每秒刷
- **验收**:存入功能 + 列表显示 + 倒计时实时刷新

### O-05:socratic_dialog Skill(5/21)
- **谁做**:B 同学
- **难度**:★★
- **预计**:3h
- **怎么做**:Skill 的 prompt 核心"苏格拉底式,只追问不回答,每次一个问题,基于书架 contrast_card 上下文"
- **验收**:curl `POST /api/chat` 发消息"你怎么看躺平",Agent 只追问不下结论

### S-05:W2 末全链路联调(5/21 晚)
- **谁做**:双方
- **难度**:★★
- **预计**:3h
- **怎么做**:
  1. F 同学用扩展采集 10-20 个 小红书笔记
  2. 触发报告生成 + 书架刷新
  3. 刷新报告页和书架页 → 看效果
  4. 反复改 prompt:不准就让 Claude 改,改完再生成
  5. 这是 W2 最重要验收点
- **验收**:三件套全链路:扩展采集 → OpenClaw 处理 → 前端渲染,通且效果说得过去

### W2 末检查清单
- [ ] OpenClaw 跑通(或 fallback 方案有效)
- [ ] analyze_cognition + search_parallel_views + cooldown_unlock + socratic_dialog 4 个 Skill 都有
- [ ] report.html / bookshelf.html / cooldown.html 三个页面完整渲染
- [ ] 全链路:扩展采集 → 报告生成 → 书架推荐 → 冷静期盒子,通!
- [ ] 苏格拉底追问能通过 `/api/chat` 代理接口调用

---

## 阶段 3:收尾周(5/22 周五 ~ 5/24 周日,3 天)

> 这一阶段时间紧,严禁加新功能。只做提交准备。

### S-06:Demo 数据准备(5/22 上午)
- **谁做**:双方
- **难度**:★★
- **预计**:4h
- **怎么做**:
  1. 准备 2-3 个"虚拟人设"浏览数据(算法焦虑者 / 信息茧房型 / 理性消费者)
  2. 每个人设 30 条左右假数据,写成 SQL insert,存 `demo/seed_data.sql`
  3. 跑一遍报告生成,确认三人报告**显著不同**(亮点!)
  4. 保留生成的报告 JSON 作为"参考输出",演示时如果 DeepSeek 临场不给力直接放预生成版
- **验收**:`sqlite3 data/eatwhat.db < demo/seed_data.sql` 后能立刻生成有意义的报告

### S-07:UI 抛光 + 截图(5/22 下午)
- **谁做**:F 同学主操,B 同学协助
- **难度**:★
- **预计**:3h
- **怎么做**:
  1. 检查每个页面排版,空数据态、错误态都能看
  2. 截 4-6 张关键截图存 `demo/screenshots/`
  3. 不要再加新功能,只修明显丑/不能用的地方

### D-01:演示笔记录制(5/23)
- **谁做**:F 同学主操,B 同学旁白(可选)
- **难度**:★
- **预计**:3h
- **怎么做**:
  1. 写脚本(3-5 分钟):
     - 0-30s:痛点(信息茧房)
     - 30-90s:扩展采集 + 报告生成 + 四板块讲解
     - 90-150s:平行书架 + 差异卡片 + 苏格拉底追问
     - 150-210s:冷静期盒子
     - 210-240s:理念 + 未来规划 + 团队
  2. 用 Ubuntu 内置录屏(GNOME Screenshot)或 OBS Studio 录
  3. 录 3-5 遍选最好的
  4. 存 `demo/eatwhat_demo.mp4`(.gitignore 不传 GitHub,只上传到夸克网盘)
- **验收**:3-5 分钟笔记,清晰、流畅,主要功能都演示了

### D-02:答辩 PPT(5/23 ~ 5/24)
- **谁做**:双方
- **难度**:★★
- **预计**:5h
- **怎么做**:
  1. 按 docs/design/history/ver2.md §13.1 PPT 大纲做 6-8 页
  2. 风格:简洁、低饱和、和 Web UI 配色一致(以浅灰 + 深绿)
  3. 让 Claude 帮你润色文案
  4. 存 `demo/eatwhat_pitch.pdf` 和 .pptx 双格式
- **验收**:PPT 自洽,3 分钟内能讲完

### D-03:技术报告书(5/23 ~ 5/24)
- **谁做**:双方
- **难度**:★★
- **预计**:5h
- **怎么做**:
  1. 按 docs/design/history/ver2.md §13.2 大纲写
  2. 重点:架构图(用 [draw.io](https://app.diagrams.net) 或 [Excalidraw](https://excalidraw.com))、技术栈表、Skill prompt 设计、关键代码片段
  3. 商业化叙事直接从 `docs/design/commercialization.md` 拉简版
  4. 让 Claude 帮你审稿
  5. 存 `demo/tech_report.pdf`(同时存 .docx 备份)
- **验收**:文档完整、技术细节准、商业化叙事自洽

### D-04:打包提交夸克网盘(5/24)
- **谁做**:用户(B 同学)
- **难度**:★
- **预计**:1h
- **怎么做**:
  1. `git push` 一次最终代码到 GitHub(确保 README 完整)
  2. 打包:`eatwhat_submission_v1.zip` 含:
     - `eatwhat_pitch.pdf`(PPT)
     - `eatwhat_demo.mp4`(笔记)
     - `tech_report.pdf`
     - `screenshots/`
     - `seed_data.sql`
     - GitHub 仓库链接(写在 README 顶部)
  3. 上传夸克网盘 → 复制分享链接
  4. 提交链接到比赛系统
- **验收**:**5/24 24:00 前**链接已提交,自己用 cookie 隐身模式打开链接确认能下载

### 收尾周末检查清单
- [ ] Demo 数据导入后报告好看
- [ ] 演示笔记录好,不超过 5 分钟
- [ ] PPT 完成,6-8 页
- [ ] 技术报告书完成
- [ ] 截图齐全
- [ ] GitHub README 写好(让陌生人能照着跑起来)
- [ ] 夸克网盘链接提交
- [ ] 队友互相过一遍最终包

---

## 阶段 4:决赛准备(5/29 ~ 6/6,12 天,看入围再启动)

### 5/29 ~ 6/2 抛光周

#### S-08:UI 精修
- 用户访谈 2-3 个朋友,记录他们看不懂或难用的地方
- 优化 5-10 个细节(空数据态、错误提示、加载动画、移动端响应式)

#### S-09:加亮点功能(选其一)
- **选项 A**:他人之眼 demo 版(只做 1-2 个身份镜像)
- **选项 B**:本地模型对比 demo(在 SOUL.md 加注释展示切换)
- **选项 C**:观点变化历史(累积报告对比图)
- **建议**:选 A 或 B,工作量可控且有视觉冲击

### 6/3 ~ 6/5 答辩周

#### D-05:答辩 PPT 升级
- 从 6-8 页扩到 12-15 页
- 加上初赛后的优化(用户访谈数据、亮点功能截图)
- 加上"未来三个月路线图"(给商业化背书)

#### D-06:演讲稿 + 彩排
- 写完整演讲稿(精确到每页讲什么、控制 8-10 分钟)
- 至少彩排 3 次,计时
- 准备 Q&A:列出 10 个评委可能问的问题(技术栈选型、商业化、隐私、与竞品差异)
- 让 Claude 帮你做模拟评委追问

### 6/6 决赛日
- 准备:笔记本(双备份)、HDMI 转换头、移动电源
- 演示笔记提前下载到本地(不依赖网络)
- 心态:讲故事比讲技术更重要

---

## 5. 遇到困难时的流程(vibe coding 版)

1. **先问 AI**(Claude 或 Copilot Chat):把错误信息 + 上下文贴给它,5-10 分钟
2. **看官方文档**:30 分钟
3. **Google 错误信息 + 项目名**:30 分钟
4. **GitHub Issues**:15 分钟
5. **叫队友看**:一起查 30 分钟
6. **最后:发 GitHub Issue 求助** 或 **降级到备选方案**(每个关键任务都有降级方案,不要硬刚)

---

## 6. AI 协作 prompt 模板

### 后端类(给 Claude)
```
我现在要实现 [接口名]。
- 设计文档:docs/design/history/ver2.md §X
- 接口契约:docs/api.md §X
- 已有代码:[贴当前文件]
- 我希望:[期望结果]
请直接写好代码,告诉我每个文件的位置和职责。
```

### 前端类(给 Copilot Chat 或 Claude)
```
我要在 frontend/[page].html 实现 [功能]。
- API 是 [GET/POST] [path],响应格式见 docs/api.md §X
- 用 HTMX 属性优先,只在必要时(画图/复杂状态)写 JS
- UI 用 DaisyUI 组件,配色见 eatwhat.css
- 不要用 React/Vue/Vite/构建工具,纯 CDN
请写完整 HTML + 必要 JS。
```

### 调试类
```
我跑 [命令] 报错:
[完整错误日志]
当前代码:
[贴文件]
环境:Ubuntu 24.04 / Python 3.12 / Chrome 最新
请定位原因并给出修复方案。
```

---

*本文档定稿于 2026-05-08(v3),与 `docs/design/history/docs/design/history/ver2.md` 配套使用。任何任务变更同步更新本文档。*
