# 问膳 (EatWhat) — 设计文档 v3

> **本文档是 EatWhat 项目的权威设计文档**（文件名仍为 `ver2.md`，内容已升级到 v3，保持文件名稳定）。整合自 ver1.md（初稿）和 update1.txt（澄清答复），并经多轮 Claude 协作澄清后定稿。任何后续代码、文档、AI 协作都以本文档为准；ver1.md 与 update1.txt 仅作历史归档（位于 `docs/design/`）。

## 0. 文档元信息

| 字段 | 值 |
|---|---|
| 项目名 | 问膳 EatWhat |
| Slogan | 面墙而立,破壁而观 |
| 版本 | v3.0 |
| 定稿日期 | 2026-05-08 |
| 作者团队 | 2 名计算机大一学生(零基础) |
| 开发模式 | **vibe coding**(Claude 写后端 + GitHub Copilot 写前端) |
| 总开发周期 | 16 天初赛 + 12 天决赛准备 |
| 比赛主题 | 基于 OpenClaw 等智能体框架的应用比赛 |
| **比赛赛道** | **赛道 2「智能体应用」** |
| **初赛截止** | **2026-05-24 24:00** |
| **决赛日期** | **2026-06-06(暂定)** |
| 工作目录 | `/home/king/project/` |
| 代码托管 | GitHub |

### 0.1 修订历史

- **v1**(2026-05-07):初稿,列出 5 个功能 + 初步技术栈
- **v2**(2026-05-08 上午):经澄清后定稿
  - 砍 5 → 3 个 MVP 功能(① 体检报告、② 平行书架、⑤ 冷静期盒子)
  - 修正 OpenClaw 的角色:它是主体型 Agent 运行时,不是被代码调用的库
  - 切换 LLM 后端:Gemini → DeepSeek(以 V4 Flash 为主)
  - 确定混合架构:FastAPI 当被动入口和 Web Dashboard,OpenClaw 当智能主体
  - 数据采集策略:公开页面 + 用户主动指定(不碰登录态历史)
- **v3**(2026-05-08 晚上):vibe coding 重构 + 比赛规则确认
  - 团队改用 vibe coding 模式(Claude 写后端 + Copilot 写前端),去掉自学环节
  - **前端栈调整**:原生 HTML+JS+Tailwind+Chart.js → HTML+**HTMX**+Tailwind+**DaisyUI**+**ECharts**(无构建工具,AI 写更顺手,UI 更精致)
  - **比赛信息确认**:选赛道 2「智能体应用」;初赛 2026-05-24 截止,决赛 2026-06-06
  - **新增 §12 商业化潜力**(草案见 `docs/contest/commercialization.md`)
  - **新增 §13 提交物清单**
  - **§11 比赛要求**从"待补"改为完整版
  - 文件结构调整:历史归档(ver1, update1, contest_rules)放入 `docs/design/`,新增 `.github/copilot-instructions.md`

---

## 1. 项目理念

不推送、不说教、不替你思考的认知健康智能体。它通过审视用户的数字足迹,帮 TA 看见信息茧房之外的世界,并重新掌握深度思考的主动权。它从不替用户做决定,只做三件事——**呈现、追问、邀请**。

---

## 2. MVP 功能(必做,三件套)

### 2.1 ① 认知体检报告

**做什么**:扫描用户在 B 站近 7 天的浏览/点赞/收藏行为,生成一份"认知体检报告"。

**触发**:用户主动点"生成报告"按钮立即生成;或每周自动生成一次(OpenClaw 内置 cron skill 定时触发)。

**报告四个板块**:
1. **兴趣地图**:本周关注最多的 5 个话题域(饼图)
2. **观点倾向光谱**:在几个关键议题(AI 发展 / 教育内卷 / 消费主义等)上,用户接收的内容落在观点的哪个区间(条形图)
3. **思维盲区快照**:1-2 个被系统性忽略的视角(文字卡片)
   > 例:"你这周看了 8 个关于'数字游民'的视频,但没有任何内容讨论这种生活方式的可持续性风险。"
4. **情绪共鸣模式**:用户点赞/收藏的高频内容勾起了哪种共同情绪(文字卡片)

**数据来源**:浏览器扩展从 B 站视频页公开 DOM 抓取的字段(标题、UP 主、tag、视频简介、Top5 高赞评论、用户互动类型)。**不抓登录态历史、不抓弹幕、不做视频内容 ASR**。

### 2.2 ② 平行书架

**做什么**:基于体检报告中的"思维盲区",为每个盲区匹配 2-3 个高质量对立/中立视角的内容源。

**核心设计原则**:
- **不打扰**:无任何红点或弹窗,用户主动点入"平行书架"标签页才能看到
- **理性优先**:只选论述理性、非煽动情绪的创作者或媒体;不选边缘极端言论

**每条推荐包含**:
- 标题、来源类型(公众号/文章/视频/播客)、URL
- **作者背景说明**:"这篇的作者是一位长期研究 XXX 的学者,他的核心关切是 YYY。"
- **差异对比卡片**:"它和你常看的内容,在最根本的假设上有什么不同 / 为什么一些理性的人会持有这个观点。"

**苏格拉底式追问入口**:每条推荐下有"追问"按钮，点击展开内嵌聊天框，通过 `POST /api/chat` 代理给 OpenClaw Agent（`socratic_dialog` Skill），无需跳转外部页面。

**实现方式**:先用 Bing Search API(或 Serper.dev)实时搜索,把搜索结果作为上下文喂给 DeepSeek,让它筛选 + 总结。

### 2.3 ⑤ 冷静期盒子

**做什么**:当用户想点开自己潜意识知道是"低质但上瘾"的内容时,把链接存入"7 天后解锁"的盒子。7 天后如果还想看,链接还在;也可能用户根本想不起来。

**功能点**:
- 三种入口:① Web Dashboard 输入框;② 浏览器扩展右键菜单"存入冷静期盒子";③ 在 OpenClaw 对话里发送链接
- 列表两栏:**锁定中**(显示倒计时)、**已解锁**(显示原始 URL)
- 用户可写"为什么想看"的备注(一周后回看自己当时的状态)
- 解锁机制:OpenClaw 的 cron skill 每日扫描 `unlock_at < now` 改 `status='unlocked'`

---

## 3. 后期精进功能(不在 MVP 内,作为规划展示)

### 3.1 ③ 他人之眼

让用户选择一个预设"身份镜像"(小镇退休教师 / 一线城市外卖员 / 大厂 HR / 备考的高三学生),用 LLM 角色扮演生成该群体典型的首页信息流预览。**不是真实数据集**,纯靠 DeepSeek prompt 生成"非真实的"5 分钟另一个人的世界。体验完后 Agent 引导用户记录"最意外的共鸣点 / 最深刻的差异"。

**为什么放后期**:UI 工作量大(要做信息流的视觉模拟),且 prompt 工程要花时间打磨"角色逼真度"。

### 3.2 ④ 沧海遗珠

基于用户深度消费的内容(完整看完、反复观看、主动搜索),用 DeepSeek 自带知识 + Bing/Serper 搜索 API 检索全网被算法埋没的经典(长文、纪录片)。每条附一封"小信":"这篇 2019 年的长文,和你上周痴迷的那个系列,在 XXX 问题上一脉相承,但走得更远。"

**为什么放后期**:检索质量不可控,"被埋没的经典"是个模糊判断,搜索 API 返回结果质量难控,流于表面。

### 3.3 隐私增强:本地模型选项

OpenClaw 支持通过 Ollama 接本地模型(Llama 3.1 8B / Qwen 2.5 7B 等)。"换"的方式是改 SOUL.md 里 `model:` 字段。

**MVP 阶段不真做的原因**:
- 8B 级模型分析"思维盲区"的质量明显弱于 DeepSeek Flash,演示效果会打折
- 用户要装 Ollama + 拉 4-8GB 模型,对最终用户不友好
- 需要至少 16GB 内存的电脑

**展示策略**:在答辩 PPT 里展示"隐私模式架构图",说明只需替换一个配置就能切换,作为隐私加分项。

---

## 4. 技术栈(v3 调整)

| 层 | 选型 | 版本/说明 | 理由 |
|---|---|---|---|
| 操作系统 | Ubuntu 24.04 LTS(VMware Player 内) | 内存 ≥ 6GB / CPU ≥ 4 核 | 隔离开发环境与主机 |
| 浏览器 | Google Chrome for Linux | 最新稳定版 | 支持 Manifest V3 扩展 |
| 监测站点 | B 站网页版 | bilibili.com/video/* | 用户主动指定 + 公开页面 |
| **Agent 主体** | **OpenClaw**(github.com/openclaw/openclaw) | latest | 比赛要求;本地运行 + Skill 系统 |
| **大模型** | **DeepSeek V4 Flash**(主) + **DeepSeek V3**(轻任务) | 通过 DeepSeek 开放平台申请,按 token 计费(¥1 起充,初赛+决赛预计 ¥1 内够用) |
| **Web 后端** | FastAPI + Uvicorn | Python 3.12 | 轻量、文档好、AI 写顺手 |
| **数据库** | SQLite | 内嵌,单文件 | 无需服务,零配置 |
| ORM | SQLAlchemy 2.0 | - | 比裸 sqlite3 更易维护 |
| **Web Dashboard** | HTML + **HTMX**(CDN) + Tailwind CSS(CDN) + **DaisyUI**(CDN) + **ECharts**(CDN) | **v3 调整** | vibe coding 友好;无构建工具;DaisyUI 提供成品组件;HTMX 让 HTML 属性驱动交互;ECharts 演示效果优于 Chart.js |
| 浏览器扩展 | Manifest V3(content script + service worker) | 原生 JS(Manifest V3 强制) | 当前 Chrome 唯一支持的版本 |
| 定时任务 | **OpenClaw 内置 cron skill** | - | 替代 APScheduler,少装一个东西 |
| 后端日志 | loguru | - | 比标准 logging 易用 |
| 前端 / 扩展日志 | 自封装 logger.js(console + POST /api/log) | - | 满足"前后端都要日志"要求 |
| 协作 / 编辑 | GitHub + VS Code(+ GitHub Copilot 学生会员) | - | 已确定 |
| **AI 协作** | **Claude(后端 + 架构)+ Copilot(前端补全)** | v3 新增 | vibe coding 模式分工 |

### 4.1 不引入的东西(v3 更新版)

- ~~APScheduler~~ → 用 OpenClaw cron skill
- ~~向量数据库~~ → MVP 三件套不需要语义检索;如果做"思维盲区聚类"再加 Chroma
- ~~缓存层(Redis 等)~~ → 三周原型加缓存是过度工程,FastAPI 进程内 dict + SQLite 够
- ~~React / Vue / Next.js / Svelte 等 SPA 框架~~ → AI 写代码时容易"飘"到这些栈,需要在 `.github/copilot-instructions.md` 显式约束
- ~~npm / Vite / 任何前端构建工具~~ → **v3 强调**:前端全 CDN 引入,避免 build 链路坑
- ~~TypeScript(前端)~~ → 多一层编译多一处出错;AI 写原生 JS 足够
- ~~Chart.js~~ → 替换为 ECharts(v3 调整)
- ~~视频字幕 ASR / 弹幕抓取~~ → 复杂且收益小
- ~~B 站登录态采集(个人浏览历史)~~ → 合规风险,且 update1 已确定走"公开页面 + 主动指定"
- ~~本地大模型(MVP 阶段)~~ → 留作"隐私增强"演进展示

---

## 5. 混合架构

### 5.1 整体拓扑

```
本机(Windows)
└── VMware Player 窗口
    └── 虚拟机 Ubuntu 24.04
        │
        ├── Chrome 浏览器
        │   ├── B 站视频页 ──┐
        │   │               │ content.js 注入抓取
        │   │               ↓
        │   ├── 自写扩展 (background.js) ──HTTP POST──┐
        │   │                                        │
        │   ├── 打开 localhost:8000 (Web Dashboard)  │
        │   │   ├── 报告页(/report.html)             │
        │   │   ├── 平行书架页(/bookshelf.html)      │
        │   │   ├── 冷静期盒子页(/cooldown.html)     │
        │   │   └── 对话框 (新标签页 → :18789 Dashboard)│
        │   │                                        │
        │   └── OpenClaw Dashboard(localhost:18789)  │
        │       └─── 苏格拉底对话入口                │
        │                                            │
        ├── 进程 1: FastAPI + Uvicorn(localhost:8000)
        │   ├── POST /ingest  ←─────────────────────┘
        │   ├── GET /api/report/*
        │   ├── GET /api/bookshelf/*
        │   ├── CRUD /api/cooldown
        │   ├── POST /api/log
        │   └── 静态文件服务(frontend/)
        │           ↕ 读写
        │   ┌───────────────────────┐
        │   │  SQLite (data/eatwhat.db) │ ← 共享通道
        │   └───────────────────────┘
        │           ↕ 读写
        ├── 进程 2: OpenClaw Agent
        │   ├── SOUL.md(Agent 人格)
        │   └── Skills/
        │       ├── analyze_cognition       (周更 / 主动触发:读 DB → 调 DeepSeek → 写 reports)
        │       ├── search_parallel_views   (报告生成后:Bing/Serper 搜索 + DeepSeek 筛选 → 写 bookshelf_items)
        │       ├── socratic_dialog         (/api/chat 代理:基于书架 / 报告上下文追问，通过后端 subprocess 调用)
        │       └── cooldown_unlock         (cron 每日:扫描 unlock_at<now → status='unlocked')
        │
        └── VS Code(写代码 + Copilot)
```

### 5.2 进程分工

- **FastAPI(被动)**:只做"数据搬运"——接收扩展上报、给前端提供只读 API、CRUD 冷静期盒子。**它不调用 DeepSeek**,所有 AI 智能逻辑都在 OpenClaw。
- **OpenClaw(主动)**:所有需要"思考"的事——生成报告、检索平行书架、苏格拉底追问、定时解锁冷静期。这是项目的 AI 灵魂。
- **共享通道**:SQLite 数据库。两个进程都直接读写同一个 `data/eatwhat.db` 文件。

**为什么这样设计**:让 OpenClaw 承担所有 AI 工作 → 比赛叙事是"以 OpenClaw 为主体的应用"立得住;FastAPI 只是它的"被动 IO 外壳",做扩展兼容和 Web UI 渲染。

### 5.3 数据流

| # | 触发 | 路径 |
|---|---|---|
| 1 | 用户在 B 站打开视频 + 点扩展"采集" | `content.js` 抓 DOM → `background.js` → `POST :8000/ingest` → FastAPI → 写 `raw_observations` 表 |
| 2 | 周日 23:00 / 用户点"生成报告" | OpenClaw cron / 用户消息 → `analyze_cognition` Skill → 读 `raw_observations` 近 7 天 → 调 DeepSeek V4 Flash → 写 `reports` 表 |
| 3 | 报告生成后自动 / 用户点"刷新书架" | `search_parallel_views` Skill → 读最新 `reports.blind_spots` → Bing/Serper 搜索 + DeepSeek 筛选 → 写 `bookshelf_items` 表 |
| 4 | 用户访问 `/report.html` | 浏览器 → FastAPI → 读 `reports` 最新一条 → 渲染 HTML + ECharts |
| 5 | 用户点"苏格拉底追问" | 浏览器 → `POST :8000/api/chat`（FastAPI 代理）→ `openclaw agent --local` → `socratic_dialog` Skill → DeepSeek 多轮对话 |
| 6 | 用户存"冷静期盒子" | 扩展右键 / Web 输入框 → FastAPI → 写 `cooldown_items` 表 |
| 7 | 每天 00:30 | OpenClaw cron → `cooldown_unlock` Skill → 更新 `status='unlocked'` |

---

## 6. 数据库 Schema

```sql
-- 浏览器扩展上报的原始观察数据
CREATE TABLE raw_observations (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    bvid            TEXT NOT NULL,           -- B 站视频 ID(如 BV1xx411x7xx)
    title           TEXT,
    uploader        TEXT,
    tags            TEXT,                    -- JSON 数组字符串
    description     TEXT,
    top_comments    TEXT,                    -- JSON 数组:[{author, content, likes}]
    interaction_type TEXT,                   -- 'view' | 'like' | 'favorite' | 'coin'
    observed_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 认知体检报告(每周一份)
CREATE TABLE reports (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    period_start    TIMESTAMP NOT NULL,
    period_end      TIMESTAMP NOT NULL,
    interest_map    TEXT,    -- JSON: [{topic, weight, sample_videos}]
    opinion_spectrum TEXT,   -- JSON: [{issue, position, evidence}]
    blind_spots     TEXT,    -- JSON: [{description, missing_perspective, sample_count}]
    emotion_pattern TEXT,    -- JSON: [{emotion, weight, examples}]
    generated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 平行书架推荐项
CREATE TABLE bookshelf_items (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id       INTEGER REFERENCES reports(id),
    blind_spot_index INTEGER,                -- 对应 reports.blind_spots 第几项
    title           TEXT,
    source_type     TEXT,                    -- 'wechat' | 'article' | 'video' | 'podcast'
    url             TEXT,
    contrast_card   TEXT,                    -- 差异对比卡片正文
    author_intro    TEXT,                    -- 作者背景说明
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 冷静期盒子
CREATE TABLE cooldown_items (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    url             TEXT NOT NULL,
    title           TEXT,
    user_note       TEXT,                    -- "为什么想看" 备注
    locked_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    unlock_at       TIMESTAMP NOT NULL,
    status          TEXT DEFAULT 'locked'    -- 'locked' | 'unlocked' | 'discarded'
);

-- 跨端日志(前端 / 扩展 / 后端 / OpenClaw 都写入)
CREATE TABLE logs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    source          TEXT,                    -- 'backend' | 'frontend' | 'extension' | 'openclaw'
    level           TEXT,                    -- 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'
    message         TEXT,
    context         TEXT,                    -- JSON
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 7. 项目目录结构(v3 调整)

```
/home/king/project/
├── README.md                       # 项目入口(怎么跑起来)
├── .gitignore
├── .github/
│   └── copilot-instructions.md     # Copilot 项目级规范(v3 新增)
│
├── docs/                           # 项目文档
│   ├── api.md                      # 接口契约(前后端对齐核心文件)
│   ├── architecture.md             # 详细架构图(后续补)
│   ├── openclaw_skills.md          # Skills 开发指南(后续补)
│   ├── deployment.md               # 部署/运行说明(后续补)
│   └── design/                     # 设计文档与历史归档(v3 新增子目录)
│       ├── ver2.md                 # 当前权威设计文档(本文件,内容已升级到 v3)
│       ├── ver1.md                 # 历史归档:初稿
│       ├── update1.txt             # 历史归档:初次澄清
│       ├── tasks.md                # 任务拆解 + 前后端分工(v3 重排)
│       ├── commercialization.md    # 商业化叙事草案(v3 新增)
│       └── contest_rules.jpg       # 比赛规则图(v3 新增)
│
├── backend/                        # FastAPI 后端(用户主负责,Claude 写)
│   ├── main.py                     # FastAPI 应用入口
│   ├── config.py                   # 配置:端口、DB 路径、DeepSeek Key
│   ├── database.py                 # SQLAlchemy engine 初始化
│   ├── models.py                   # ORM 模型(对应 schema 5 张表)
│   ├── logger.py                   # loguru 配置 + 写 SQLite logs 表
│   ├── requirements.txt
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── ingest.py               # POST /ingest
│   │   ├── report.py               # GET/POST /api/report/*
│   │   ├── bookshelf.py            # GET/POST /api/bookshelf/*
│   │   ├── cooldown.py             # CRUD /api/cooldown
│   │   └── logs.py                 # POST /api/log
│   └── tests/                      # 简单接口测试(可选)
│
├── frontend/                       # Web Dashboard(队友主负责,Copilot 写)
│   ├── index.html                  # 主导航
│   ├── report.html                 # 认知体检报告
│   ├── bookshelf.html              # 平行书架
│   ├── cooldown.html               # 冷静期盒子
│   ├── css/
│   │   └── eatwhat.css               # 自写样式(基础用 Tailwind + DaisyUI CDN)
│   ├── js/
│   │   ├── api.js                  # fetch 封装(统一 baseUrl + 错误处理)
│   │   ├── logger.js               # 前端日志封装
│   │   ├── report.js               # 报告页 ECharts 渲染
│   │   ├── bookshelf.js
│   │   └── cooldown.js
│   └── assets/                     # icon、图片
│
├── extension/                      # 浏览器扩展 Manifest V3(队友主负责,原生 JS)
│   ├── manifest.json
│   ├── background.js               # service worker:转发到 backend
│   ├── content.js                  # 注入 B 站视频页抓 DOM
│   ├── popup.html                  # 点扩展图标弹出
│   ├── popup.js
│   ├── logger.js                   # 扩展日志封装
│   └── icons/                      # 16/32/48/128 px
│
├── openclaw_workspace/             # OpenClaw Agent 工作区(用户主负责)
│   ├── SOUL.md                     # Agent 人格 / 任务总指令
│   └── skills/
│       ├── analyze_cognition/
│       │   ├── SKILL.md
│       │   └── (脚本)
│       ├── search_parallel_views/
│       │   ├── SKILL.md
│       │   └── (脚本)
│       ├── socratic_dialog/
│       │   └── SKILL.md
│       └── cooldown_unlock/
│           └── SKILL.md
│
├── data/                           # 运行期数据(git ignore)
│   ├── eatwhat.db                    # SQLite 数据库
│   └── logs/                       # loguru 文件日志
│
└── demo/                           # 演示物料
    ├── seed_data.sql               # 预制 demo 数据(注入即得报告)
    ├── screenshots/
    └── demo_video.mp4              # (git ignore,太大)
```

---

## 8. 关键技术决策与理由

| 决策 | 选择 | 为什么 |
|---|---|---|
| OpenClaw 角色 | **主体型 Agent**,所有 AI 逻辑在 Skill 里 | 比赛主题要求;OpenClaw 是 config-first 框架,不是被代码调用的库 |
| Web Dashboard 前端 | HTML + HTMX + DaisyUI(不用 SPA 框架) | v3:vibe coding 下避免 build 工具链坑;DaisyUI 让 UI 有"成品感" |
| 图表库 | ECharts | v3:演示效果优于 Chart.js |
| 浏览器扩展 | 原生 JS(Manifest V3 强制) | 无替代,与 Dashboard 不共享代码 |
| 定时任务 | OpenClaw cron skill | OpenClaw 内置,少一个 APScheduler 依赖 |
| 数据采集深度 | 公开页面 + 用户主动指定 | 不碰登录态,避开合规风险和 B 站风控 |
| 前后端通信 | 同一台机器 localhost,FastAPI 起 :8000 | 简单直接;CORS 也好处理 |
| FastAPI 与 OpenClaw 通信 | **共享 SQLite 文件** | 不需要再加 RPC / 消息队列 |
| DeepSeek 模型 | 用 deepseek-chat(V4 Flash 别名)| 国内直连无需代理,OpenAI 兼容接口 |
| 数据库 | SQLite(不是 PostgreSQL) | 单文件零配置;体量小够用 |
| 隐私模式 | 设计上预留 SOUL.md model 切换接口,不真实现 | MVP 阶段时间不够,作为加分项展示 |
| Demo 数据 | 预制 30-50 条 + 用户实采混合 | 评委演示时用预制数据保证报告质量稳定 |
| AI 协作分工 | **Claude 写后端 + 架构;Copilot 写前端补全** | v3:发挥各自工具长处 |

---

## 9. 已知风险与应对

| 风险 | 影响 | 应对 |
|---|---|---|
| OpenClaw 文档新、坑多 | 学习成本高,可能卡进度 | 预留 W1 整周用于环境 + 学 SOUL.md/SKILL.md;datawhalechina/hello-claw 中文教程可参考 |
| DeepSeek 内容审核拦截 | "情绪/政治议题"分析可能触发审核 | Prompt 强调"分析者口吻、客观描述";触发后改写 prompt 重试 |
| DeepSeek API 偶发限流或抖动 | 演示时实时调用失败 | 演示前提前生成好报告并存 DB;演示时只展示数据库里的结果 |
| 浏览器扩展跨域 / 反爬 | 抓取失败 | content script 直接读 DOM,不走 B 站 API 不会触发反爬;CORS 在 FastAPI 里配 `Access-Control-Allow-Origin: chrome-extension://...` |
| "思维盲区" 分析效果主观 | 演示时被质疑 | Prompt 里要求 DeepSeek 给出 evidence(具体视频引用),让结论可追溯 |
| 前后端 + 扩展三端联调耗时 | 16 天来不及 | W1 末就跑通最小链路(哪怕只抓 1 个字段),之后是迭代 |
| VMware 性能 | Chrome + DevTools + VS Code 可能卡 | VM 给 6GB 内存 + 4 核;不开太多浏览器 tab |
| **vibe coding 失控**(v3 新增) | AI 写出与设计偏离的代码 | `.github/copilot-instructions.md` 严格约束;每天互相 code review |
| **AI 偏向 React**(v3 新增) | Copilot 写出 React 风格代码 | instructions 文件明确"原生 HTML + HTMX,禁止 React/Vue/build 工具" |

---

## 10. 演进规划(答辩时展示,不真做)

- **他人之眼**(功能 ③):身份镜像 + LLM 角色扮演
- **沧海遗珠**(功能 ④):Bing/Serper 搜索 + DeepSeek 筛选检索被埋没经典 + "小信" 文案
- **本地模型隐私模式**:Ollama + Llama 3.1 8B 替换 DeepSeek
- **观点变化历史**:累积报告对比,画"我一年的认知变迁曲线"
- **多平台扩展**:从 B 站扩展到知乎 / 小红书 / Twitter
- **去中心化数据**:把数据存进用户本地 + 加密同步,不再依赖单机数据库

---

## 11. 比赛要求

### 11.1 赛道选择

**赛道 2「智能体应用」**(赛道 1 是智能体框架,需要造框架;我们走应用赛道)。

赛道 2 核心定位:**聚焦场景落地与创意实现,基于现有框架构建创新应用,助力智能体真正服务千行百业。**

### 11.2 评分维度

赛道 2 重点考核(来自比赛规则图):
- **场景创新与用户体验设计**
- **业务逻辑与智能交互实现**
- **商业化潜力与推广价值**
- 基于"龙虾"(OpenClaw)等框架构建创新应用

### 11.3 关键时间节点

| 节点 | 日期 | 备注 |
|---|---|---|
| 预报名 | 2026-04-25 ~ 04-30 | (已过) |
| 初赛开发 | 2026-04-30 ~ 05-24 | 进行中 |
| **初赛作品提交** | **2026-05-24 24:00** | **核心 deadline** |
| 决赛名单公布 | 2026-05-29 | |
| 决赛路演 | 2026-06-06(暂定) | 现场答辩、颁奖 |

### 11.4 初赛提交物(来自比赛规则图)

1. 应用展示 PPT 或视频
2. 技术报告书
3. 上传至**夸克网盘** → 提交网盘链接

### 11.5 比赛规则原始素材

`docs/design/contest_rules.jpg`

---

## 12. 商业化潜力(草案)

完整草案见 [`docs/contest/commercialization.md`](../../contest/commercialization.md)。

**简版核心**(用于初赛技术报告书):

- **目标用户**:被算法困住、想夺回深度思考能力的知识工作者(互联网/媒体从业者、大学生、内容创作者)
- **价值主张**:"市面上的工具都在帮你**多看**,EatWhat 帮你**看清自己看了什么**。"
- **差异化**:不推送、不替你做决定、可解释 —— 在所有产品都抢用户注意力的时代,"反推送"本身就是稀缺资源
- **商业模式**:
  - C 端 Freemium(基础免费 + 高级功能 ¥19/月)
  - 中期 B 端 SaaS(教育机构「班级信息素养仪表盘」)
  - 远期 数据洞察服务
- **推广路径**:B 站知识区 KOL → 内容自传播 → 学校渠道 → 跨界 app 联推

> 答辩 PPT 时,根据 `docs/contest/commercialization.md` 的完整版做 1-2 页。

---

## 13. 初赛提交物清单(5/24 24:00 截止)

| # | 内容 | 负责 | 文件位置 / 说明 |
|---|---|---|---|
| 1 | 应用展示 **PPT** 或 **demo 视频** | 双方共建 | `demo/eatwhat_pitch.pdf` 或 `demo/eatwhat_demo.mp4` |
| 2 | **技术报告书** | 双方共建 | `demo/tech_report.pdf`,含架构图、技术选型、关键代码片段、商业化叙事 |
| 3 | 完整可运行代码(含 README) | 双方 | git push 到 GitHub + 打包 zip |
| 4 | Demo 数据 + 演示截图 | 双方 | `demo/seed_data.sql`、`demo/screenshots/` |
| 5 | 上传**夸克网盘** → 提交网盘链接 | 用户 | 含上述 4 项打包 |

### 13.1 PPT 大纲(6-8 页)

1. **封面**:项目名 + Slogan + 团队
2. **痛点**:信息茧房、算法投喂(引用研究文献加分)
3. **解决方案**:三个 MVP 功能(一图概括)
4. **技术架构**:架构图 + 技术栈表
5. **演示**:截图 / 录屏关键帧 + 数据流示意
6. **商业化潜力**:目标用户 + 商业模式 + 推广路径
7. **演进规划**:砍掉的功能 + 隐私增强(加分项)
8. **致谢 + 团队介绍**

### 13.2 技术报告书大纲

1. 项目背景与目标
2. 系统架构(详细图 + 文字说明)
3. 技术选型与理由
4. 核心功能实现(重点:OpenClaw Skill 设计、DeepSeek Prompt 工程)
5. 数据库设计
6. 关键代码片段(不超过 5 处)
7. 测试与运行结果
8. 商业化潜力分析
9. 未来演进
10. 团队分工与心得

---

## 14. 参考资料链接

- OpenClaw 主仓库:<https://github.com/openclaw/openclaw>
- OpenClaw 官方文档:<https://docs.openclaw.ai>
- 中文教程(datawhale):<https://github.com/datawhalechina/hello-claw>
- Awesome OpenClaw Skills:<https://github.com/topics/openclaw>
- DeepSeek API 文档:<https://api-docs.deepseek.com>
- FastAPI 官方教程:<https://fastapi.tiangolo.com/zh/tutorial/>
- HTMX 官方文档:<https://htmx.org/docs/>
- DaisyUI 组件库:<https://daisyui.com/components/>
- ECharts 官方文档:<https://echarts.apache.org/handbook/zh/get-started/>
- Tailwind CSS(CDN 版):<https://tailwindcss.com/docs/installation/play-cdn>
- Manifest V3 扩展开发:<https://developer.chrome.com/docs/extensions/develop>
- GitHub Copilot 项目级规范:<https://docs.github.com/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot>
