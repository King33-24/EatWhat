# 问膳（EatWhat）—— 技术报告书

**基于 OpenClaw 的认知健康智能体应用**

| 项目 | 内容 |
|------|------|
| 项目名称 | 问膳 EatWhat |
| Slogan | 面墙而立，破壁而观 |
| 参赛赛道 | 赛道 2「智能体应用」|
| 报告版本 | v1.0 |
| 提交日期 | 2026-05-24 |

---

## 一、项目背景与目标

### 1.1 问题描述

在算法推荐主导的今天，用户在小红书等内容平台上的浏览行为正在被算法塑造——不是用户在选择内容，而是内容在选择用户。这带来三个层面的问题：

- **兴趣固化**：算法持续投喂用户已感兴趣的话题，导致视野日益收窄；
- **观点极化**：用户长期接触单一立场的内容，对"理性的人为何会持不同观点"丧失理解；
- **冲动消费**：算法对情绪刺激内容的加权分发，催生大量"明知无用却停不下来"的低质浏览行为。

上述问题的共同根源是：**用户对自己的信息摄入缺乏感知**。人们无法反思自己看不见的东西。

### 1.2 解决思路

问膳的核心设计哲学是：**不推送、不说教、不替用户思考**。它通过审视用户的数字足迹，帮助用户"看见信息茧房之外的世界"，并重新掌握深度思考的主动权。智能体从不替用户做决定，只做三件事——**呈现、追问、邀请**。

### 1.3 目标用户

被算法困住、希望夺回深度思考能力的知识工作者，包括：互联网从业者、大学生、内容创作者、媒体从业者。

---

## 二、系统架构

### 2.1 整体拓扑

问膳采用**双进程混合架构**，以 OpenClaw 为 AI 主体，FastAPI 为被动 I/O 外壳，通过共享 SQLite 数据库实现进程间协作。

```
本机（Windows）
└── VMware 虚拟机（Ubuntu 24.04）
    │
    ├── Chrome 浏览器
    │   ├── 小红书笔记页 ──[content.js 注入采集]──┐
    │   │                                        │
    │   └── Web Dashboard（localhost:8000）       │
    │       ├── /index.html    主导航             │
    │       ├── /report.html   认知体检报告        │
    │       ├── /bookshelf.html 平行书架          │
    │       └── /cooldown.html 冷静期盒子         │
    │                                            ↓
    ├── 进程 1：FastAPI + Uvicorn（localhost:8000）
    │   ├── POST /ingest              ← 扩展上报笔记
    │   ├── POST /api/import-url      ← 用户 URL 补录
    │   ├── GET  /api/report/latest   ← 报告查询
    │   ├── POST /api/report/generate ← 触发报告生成（异步）
    │   ├── GET  /api/bookshelf       ← 书架查询
    │   ├── POST /api/bookshelf/refresh ← 触发书架刷新（异步）
    │   ├── CRUD /api/cooldown        ← 冷静期盒子
    │   ├── POST /api/chat            ← 苏格拉底对话代理
    │   ├── POST /api/log             ← 跨端日志
    │   └── GET  /（静态文件服务）
    │           ↕ 共享 SQLite
    │   ┌──────────────────────────┐
    │   │  data/eatwhat.db         │
    │   └──────────────────────────┘
    │           ↕ 共享 SQLite
    └── 进程 2：OpenClaw Agent（localhost:18789）
        ├── SOUL.md（Agent 人格）
        └── Skills/
            ├── analyze-cognition     读 DB → DeepSeek → 写 reports 表
            ├── search-parallel-views 读盲区 → DeepSeek 生成 → 写 bookshelf_items 表
            ├── socratic-dialog       /api/chat 代理调用，苏格拉底式追问
            └── cooldown-unlock       cron 每日扫描到期项
```

### 2.2 进程分工原则

| 进程 | 角色 | 负责内容 |
|------|------|----------|
| **FastAPI** | 被动 I/O 外壳 | 接收数据上报、提供 REST API、服务前端静态文件；**不调用 DeepSeek** |
| **OpenClaw** | AI 主体 | 所有需要"思考"的工作：报告生成、书架推荐、苏格拉底对话、定时解锁 |
| **SQLite** | 共享通道 | 两个进程共读同一个 `data/eatwhat.db` 文件，无需额外 IPC |

这种设计使比赛叙事清晰：**OpenClaw 是应用的 AI 灵魂**，FastAPI 是它的 I/O 外壳。

### 2.3 数据流

| 序号 | 触发 | 完整路径 |
|------|------|----------|
| 1 | 用户在小红书浏览笔记 | `content.js` 抓 DOM → `background.js` → `POST /ingest` → FastAPI → 写 `raw_observations` |
| 2 | 用户从 App 复制 URL 到补录框 | 前端 → `POST /api/import-url` → FastAPI 用 httpx 抓取页面 → 写 `raw_observations` |
| 3 | 用户点"生成报告"按钮 | 前端 → `POST /api/report/generate` → FastAPI 后台启动子进程 → `analyze_cognition.py` → DeepSeek → 写 `reports` |
| 4 | 前端轮询报告结果 | 前端每 3 秒 `GET /api/report/latest` → 检测到新 `generated_at` → 渲染 ECharts |
| 5 | 用户访问平行书架页 | 前端 → `GET /api/bookshelf` → 读 `bookshelf_items` → 渲染卡片 |
| 6 | 用户点"追问"按钮 | 前端 → `POST /api/chat` → FastAPI 子进程调 `openclaw agent --local` → `socratic-dialog` Skill → DeepSeek 多轮对话 |
| 7 | 用户存入冷静期 | 前端/扩展 → `POST /api/cooldown` → 写 `cooldown_items`；`GET /api/cooldown` 时自动解锁到期项 |

---

## 三、技术选型与理由

### 3.1 技术栈总览

| 层 | 选型 | 理由 |
|----|------|------|
| **AI 主体框架** | OpenClaw（比赛指定框架） | Skill 系统架构清晰；SOUL.md + SKILL.md 配置驱动；本地运行保证数据隐私 |
| **大语言模型** | DeepSeek（deepseek-chat）| 国内直连无需代理；OpenAI 兼容接口；¥1 起充，初赛费用可控 |
| **Web 后端** | FastAPI + Uvicorn（Python 3.12）| 轻量；自动生成 OpenAPI 文档；异步 `BackgroundTasks` 支持报告生成不阻塞前端 |
| **数据库** | SQLite（单文件） | 零配置；两进程直接共享文件，省去 RPC 层 |
| **ORM** | SQLAlchemy 2.0 | 类型安全；`create_all` 自动建表 |
| **Web 前端** | HTML + HTMX + Tailwind CSS + DaisyUI + ECharts（全 CDN） | 无构建工具；AI 协作友好；ECharts 可视化效果强于 Chart.js |
| **浏览器扩展** | Manifest V3（原生 JS） | Chrome 当前唯一支持版本；content script 直接读 DOM，无反爬风险 |
| **日志** | loguru（后端）+ 自封装 logger.js（前端/扩展）+ SQLite logs 表（跨端集中） | 前后端日志统一入库，便于审查 |

### 3.2 关键架构决策

**为什么不用 SPA 框架（React/Vue）**：前端全 CDN 引入，无构建链路；HTMX 通过 HTML 属性驱动大部分交互，只有报告页因需 ECharts 才写 JS。避免了 AI 协作中 Copilot "飘"到 npm 生态的风险。

**为什么 FastAPI 不直接调 DeepSeek**：保持比赛叙事一致性——所有 AI 智能逻辑在 OpenClaw Skill 内，FastAPI 仅做数据搬运。报告生成通过 `subprocess` 调用 Python 脚本，书架刷新同理。

**为什么用共享 SQLite 而不是消息队列**：原型规模下，两进程直接读写同一文件的方案比 Redis/RabbitMQ 简单两个数量级。SQLite 的 WAL 模式保证并发读写安全。

---

## 四、核心功能实现

### 4.1 功能一：认知体检报告

#### 4.1.1 双通道数据采集

**主通道（扩展自动监测）**：浏览器扩展在小红书笔记页（`xiaohongshu.com/explore/*`）注入 `content.js`，实现：

- **笔记元数据提取**：通过多组 CSS 选择器 + `meta` 标签 fallback，提取 `note_id`（从 URL 末段）、`title`、`author`、`content`、`tags`（话题标签）；
- **互动数据**：通过 DOM 选择器 + 页面内嵌 `<script>` JSON 数据双路径提取 `likes_count`、`collects_count`、`comments_count`；
- **用户动作监听**：为点赞/收藏/评论按钮绑定 click 监听，记录 `interaction_type`；
- **停留时间追踪**：基于 `visibilitychange` 事件精确累计活跃停留时长（`dwell_seconds`），设 600 秒上限截断异常值；
- **SPA 导航适配**：每 2500ms 轮询 URL 变化，适配小红书无刷新的单页跳转。

**补充通道（URL 粘贴补录）**：用户将小红书 App 内的分享链接粘贴到 Web Dashboard，后端通过 `httpx` 抓取对应 Web 版页面，`BeautifulSoup` 解析标题/作者/正文入库（`source_channel = 'manual_url'`）。

#### 4.1.2 DeepSeek Prompt 设计

采集到的原始观察数据经结构化处理后输入 DeepSeek，系统 Prompt 核心设计要点：

1. **互动权重标记**：点赞/收藏记录前标注 `【高权重·点赞】`/`【高权重·收藏】`，评论记录标注 `【中权重·评论】`，普通浏览不标注——引导 LLM 在分析时对主动互动内容赋予更高权重；

2. **观点光谱分析原则**（关键设计）：明确要求 LLM 分析"用户接触到的内容所传达的观点倾向"而非"用户个人立场"。例如：用户浏览了大量批评应试教育的笔记，`lean` 标为 `负面`；用户浏览励志备考内容，`lean` 标为 `正面`。只有内容本身客观中立时才标 `中立`；

3. **强制 JSON 输出**：使用 `response_format: {"type": "json_object"}` 确保输出可解析，避免 Markdown 代码块包裹；

4. **输出格式约束**：兴趣地图最多 5 个话题且权重和为 1.0；观点光谱 1-3 个议题，每项含 `lean`（正面/负面/中立/两极分化）和 `weight`（浏览频率占比）；盲区 1-2 条，描述需可追溯（引用笔记数量）。

#### 4.1.3 异步触发机制

前端点击"生成报告"→ `POST /api/report/generate` → FastAPI `BackgroundTasks` 后台启动 `analyze_cognition.py` 子进程（立即返回 `status: "generating"`）→ 前端每 3 秒轮询 `GET /api/report/latest`，检测到新 `generated_at` 即渲染图表。整个分析过程 20-30 秒，不阻塞页面交互。

#### 4.1.4 可视化

- **兴趣地图**：ECharts 环形饼图，各话题按权重占比展示；
- **观点倾向光谱**：ECharts 横向条形图，x 轴三点（负面/中立/正面），各议题条形向对应方向延伸，长度与浏览频率成比例；
- **思维盲区** / **情绪共鸣模式**：HTML 卡片列表，带颜色标记和样本计数。

### 4.2 功能二：平行书架

#### 4.2.1 盲区匹配推荐

基于报告中的 `blind_spots` 字段，调用 DeepSeek 知识库为每个盲区推荐 2-3 条补充视角内容。Prompt 核心约束：

- **话题强相关**：推荐内容必须与盲区话题直接相关，禁止跨域（避免出现"盲区是情感问题却推荐理财书"的情况）；
- **来源可靠**：仅推荐知名书籍（有 ISBN）、知名纪录片/电影、主流学术理论或知名学者公开演讲；
- **不生成虚假 URL**：`url` 字段一律留空，杜绝 LLM 编造不存在的链接；
- **差异对比卡片**：每条推荐含 `contrast_card`（与用户已接触视角的具体差异，≤80字）和 `author_intro`（来源权威性简介，≤50字）。

#### 4.2.2 苏格拉底追问

每条书架推荐下方设"追问"按钮，点击后展开嵌入式聊天框。前端通过 `POST /api/chat` 将消息代理给 OpenClaw Agent（`socratic-dialog` Skill）。首轮可携带书架卡片的 `contrast_card` 内容作为 `context`，引导追问从"为什么有理性的人会持不同立场"切入。

**Skill 核心规则**：只问问题，永远不给答案或结论；每次只问一个问题；问题指向用户的前提假设而非事实性信息；基于多轮上下文深化追问。

### 4.3 功能三：冷静期盒子

用户将"明知低质但想看"的链接存入冷静期（默认锁定 7 天，可选 1-30 天），到期后才能访问。

**三种入口**：① Web Dashboard 输入框；② 浏览器扩展右键菜单；③ OpenClaw 苏格拉底对话中发送链接。

**自动解锁机制**：后端 `GET /api/cooldown` 接口在返回列表前，首先检查并更新所有 `unlock_at ≤ now` 的锁定项为已解锁状态，无需依赖外部 cron。前端倒计时归零后自动触发列表刷新。

---

## 五、数据库设计

系统包含 5 张 SQLite 表，设计遵循最小化原则：

```sql
-- 原始观察数据（主通道 + 补充通道共用）
raw_observations: id, note_id, title, author, content, tags,
                  images_count, likes_count, collects_count, comments_count,
                  interaction_type, dwell_seconds, source_channel, observed_at

-- 认知体检报告（每份报告完整存储为 JSON 字段）
reports: id, period_start, period_end,
         interest_map(JSON), opinion_spectrum(JSON),
         blind_spots(JSON), emotion_pattern(JSON), generated_at

-- 平行书架推荐项
bookshelf_items: id, report_id, blind_spot_index,
                 title, source_type, url, contrast_card, author_intro, created_at

-- 冷静期盒子
cooldown_items: id, url, title, user_note,
                locked_at, unlock_at, status(locked|unlocked|discarded)

-- 跨端统一日志
logs: id, source(backend|frontend|extension|openclaw), level, message, context(JSON), created_at
```

**设计亮点**：
- `reports` 表的四个分析字段均存 JSON 字符串，方便 LLM 输出直接序列化入库，也便于前端按需解析；
- `logs` 表统一收集四端日志，`source` 字段区分来源，支持跨端追踪问题；
- `cooldown_items.status` 的状态流转（locked → unlocked → discarded）完全由后端控制，前端只读。

---

## 六、关键代码片段

### 片段 1：content.js — 停留时间精确计算

```javascript
// 基于 visibilitychange 事件，精确追踪"页面活跃"时间
// activeSince: 页面变为可见的时间点；dwellMs: 已累计的隐藏期毫秒数
function getDwellSeconds() {
  var activeNow = activeSince ? Date.now() - activeSince : 0;
  var totalMs = dwellMs + activeNow;
  return Math.min(600, Math.max(0, Math.floor(totalMs / 1000)));
}

document.addEventListener('visibilitychange', function () {
  if (document.visibilityState === 'hidden') {
    pauseActiveTimer();  // 页面隐藏：冻结计时
    return;
  }
  resumeActiveTimer();   // 页面重新可见：恢复计时
});
```

**设计要点**：以 `visibilityState` 切换为边界，而非 `setInterval` 累计（避免标签切走期间虚增停留时间）；600 秒硬上限截断"忘记关标签"等异常值。

### 片段 2：analyze_cognition.py — 互动权重标注

```python
_WEIGHT_LABEL = {
    "like":    "【高权重·点赞】",
    "collect": "【高权重·收藏】",
    "comment": "【中权重·评论】",
    "view":    "",   # 普通浏览不标注，减少噪音
}

def build_user_message(observations: list[dict]) -> str:
    lines = [f"以下是用户近7天的 {len(observations)} 条小红书浏览记录：\n"]
    for i, obs in enumerate(observations, 1):
        interaction = obs.get("interaction_type") or "view"
        weight_label = _WEIGHT_LABEL.get(interaction, "")
        parts = [f"{i}. {weight_label}标题：{obs['title'] or '(无标题)'}"]
        # ... 拼接 author、content、tags
        lines.append("，".join(parts))
    return "\n".join(lines)
```

**设计要点**：点赞/收藏是用户主动认可信号，在 Prompt 中显式标注，引导 LLM 对其赋予更高分析权重，使报告更准确反映用户真实偏好。

### 片段 3：report.py — 异步报告生成（不阻塞前端）

```python
def _run_analyze():
    result = subprocess.run([_VENV_PYTHON, _ANALYZE_SCRIPT],
                            capture_output=True, text=True)
    if result.returncode != 0:
        log(source="backend", level="ERROR",
            message="报告生成脚本失败", context={"stderr": result.stderr[-500:]})

@router.post("/generate")
def generate_report(background_tasks: BackgroundTasks):
    background_tasks.add_task(_run_analyze)   # 后台执行，立即返回
    log(source="backend", level="INFO", message="报告生成任务已启动")
    return {"success": True, "data": {"status": "generating"}, "error": None}
```

**设计要点**：FastAPI `BackgroundTasks` 使分析脚本在独立线程中运行，`POST /generate` 立即返回（不等待 DeepSeek 响应），前端以 3 秒轮询方式等待结果，用户体验不卡顿。

### 片段 4：cooldown.py — GET 时自动解锁到期项

```python
@router.get("")
def list_cooldown(status: str | None = None, db: Session = Depends(get_db)):
    now = datetime.utcnow()
    # 一次性批量解锁所有到期项，无需外部 cron
    expired = (db.query(CooldownItem)
               .filter(CooldownItem.status == "locked", CooldownItem.unlock_at <= now)
               .all())
    for item in expired:
        item.status = "unlocked"
    if expired:
        db.commit()
    # 按 status 过滤后返回列表 ...
```

**设计要点**：将解锁逻辑内嵌于 GET 请求，每次前端刷新列表时自动触发状态迁移，消除对外部 cron 的强依赖，保证"到期即可见"的用户体验。

### 片段 5：SKILL.md — 苏格拉底追问规则（OpenClaw Skill 设计）

```markdown
## 核心规则
1. 只问问题，永远不给答案或结论
2. 每次只问一个问题，问完停下，等用户回答
3. 问题指向用户的前提假设，而不是事实性信息
4. 不评价用户对错，保持中立语气
5. 若有 contrast_card 上下文，从"为什么有理性的人会持不同立场"切入

## 禁止行为
❌ 说"你说得对"/"这个观点很好"
❌ 直接反驳用户
❌ 一次提多个问题
❌ 替用户下结论
```

**设计要点**：OpenClaw 的 SKILL.md 是纯自然语言规则文件，Agent 加载后严格遵循；"只追问不下结论"的设计确保工具保持中立立场，不对用户施加价值判断。

---

## 七、测试与运行结果

### 7.1 接口联调验证

对全部 9 个 API 端点进行了端到端联调测试，核心结果：

| 接口 | 状态 | 备注 |
|------|------|------|
| `POST /ingest` | ✅ | 扩展上报成功，含互动类型、停留时间 |
| `POST /api/import-url` | ✅ | URL 补录入库正常 |
| `POST /api/report/generate` | ✅ | 异步触发，20-30 秒生成完成 |
| `GET /api/report/latest` | ✅ | 返回完整四板块 JSON |
| `GET /api/bookshelf` | ✅ | 返回 DeepSeek 生成的书架推荐 |
| `POST /api/bookshelf/refresh` | ✅ | 异步刷新，与报告生成同样机制 |
| `CRUD /api/cooldown` | ✅ | 含自动解锁逻辑 |
| `POST /api/chat` | ✅ | OpenClaw 苏格拉底对话正常响应 |
| `POST /api/log` | ✅ | 前端/扩展/后端日志统一入库 |

### 7.2 扩展采集验证

在小红书 Web 版实际浏览后，后端收到如下典型数据（脱敏）：

```json
{
  "note_id": "6826de8c000000001301e54f",
  "title": "...",
  "author": "...",
  "content": "...",
  "interaction_type": "view",
  "dwell_seconds": 23,
  "source_channel": "extension"
}
```

单次浏览会话累计采集 38 条记录，成功触发报告生成（`observation_count: 38`）。

### 7.3 报告生成效果示例

DeepSeek 对 38 条浏览记录的分析输出（部分）：

```json
{
  "interest_map": [
    {"topic": "AI 技术动态", "weight": 0.35},
    {"topic": "学习方法与效率", "weight": 0.25}
  ],
  "opinion_spectrum": [
    {
      "issue": "AI 对就业的影响",
      "position": "用户接触的内容普遍传递AI将取代大量工作岗位的悲观信号",
      "lean": "负面",
      "weight": 0.4
    }
  ],
  "blind_spots": [
    {
      "description": "你这周看了多篇关于AI发展的笔记，但没有任何内容讨论AI监管与伦理视角",
      "missing_perspective": "AI 治理与伦理",
      "sample_count": 7
    }
  ]
}
```

### 7.4 已知限制（主动披露）

| 限制项 | 原因 | 影响 |
|--------|------|------|
| 图片内容不分析 | DeepSeek API 为纯文本模式 | LLM 仅分析标题+正文；图片数量作为元信号记录 |
| 评论无法抓取 | 小红书评论区使用 Shadow DOM + 动态加载 | 缺少"受众反应"维度，用互动计数作为替代信号 |
| App 数据不可批量导入 | 小红书无官方数据导出 API | 依赖双通道（扩展 Web 监测 + URL 粘贴补录）覆盖 |
| 停留时间精度上限 | `visibilitychange` 无法区分"盯着看"与"去倒水" | 600 秒截断 + 中位数统计规避异常值影响 |

---

## 八、商业化潜力分析

### 8.1 市场定位

问膳定位于**认知健康工具**赛道，差异化核心在于：

> "市面上所有推荐系统都在帮你**多看**，问膳帮你**看清自己看了什么**。"

在信息过载时代，"反推送、可解释、不替用户做决定"本身就是稀缺资源。

### 8.2 目标用户

- **核心用户**：互联网/媒体从业者、大学生、内容创作者（约 1500 万人，信息消费量大、自我认知需求强）
- **扩展用户**：关注信息素养教育的高校教师/图书馆员（潜在 B 端场景）

### 8.3 商业模式

| 阶段 | 模式 | 定价 |
|------|------|------|
| C 端 Freemium | 基础报告免费；高级功能（更长周期分析、多平台数据）付费 | ¥19/月 |
| B 端 SaaS（中期）| 面向高校：班级信息素养仪表盘，期末认知健康报告 | ¥5000-20000/年/校 |
| 数据洞察服务（远期）| 匿名聚合分析，向媒体/研究机构提供"大众认知图谱" | 定制报价 |

### 8.4 推广路径

小红书知识区 KOL 首发（与产品数据源同平台，天然形成内容闭环）→ 用户自传播（报告截图具有分享价值）→ 高校信息素养课程合作 → 跨界 App 联推（时间管理工具、知识付费平台）。

---

## 九、未来演进规划

| 优先级 | 功能 | 说明 |
|--------|------|------|
| 高 | **他人之眼** | 选择一个预设"身份镜像"（退休教师/外卖员/高三学生），LLM 角色扮演生成该群体典型信息流预览，体验认知差异 |
| 高 | **观点变化历史** | 累积多份报告，画出"用户一年的认知变迁曲线" |
| 中 | **沧海遗珠** | 基于深度消费行为，检索算法未推送的长尾经典（长文/纪录片） |
| 中 | **本地模型隐私模式** | 通过修改 OpenClaw SOUL.md 中的 `model:` 字段，一键切换 Ollama 本地模型（Llama 3.1 8B），数据完全不出本机 |
| 低 | **多平台支持** | 扩展至知乎、微博、Twitter/X |
| 低 | **去中心化数据** | 用户数据本地加密存储，跨设备加密同步 |

**本地隐私模式是一个已设计好的架构预留口**：OpenClaw 的 config-first 设计使模型切换只需改一个配置项，无需修改代码——体现了架构的前瞻性。

---

## 十、团队分工与开发心得

### 10.1 团队分工

| 成员 | 主要负责 | 工具 |
|------|----------|------|
| B 同学 | 后端（FastAPI + SQLite）、OpenClaw Skill 开发、架构设计 | Claude Code（AI 辅助编程） |
| F 同学 | 前端（HTML/HTMX/ECharts）、浏览器扩展（content.js） | GitHub Copilot |

### 10.2 开发模式：Vibe Coding

本项目采用 **vibe coding** 开发模式——由 AI（Claude）负责后端架构与代码生成，由 AI 辅助工具（Copilot）负责前端实现，两名大一学生主要承担需求定义、代码 review 和集成调试工作。

**这不是"让 AI 替我们做作业"**：两人全程参与需求澄清、接口契约制定、测试验证和 bug 定位，在这个过程中深度学习了 FastAPI 异步机制、SQLite 并发、Chrome 扩展 Manifest V3、ECharts 生命周期等知识。Vibe coding 降低了工具使用门槛，但提高了对"什么是正确的系统设计"的要求。

### 10.3 主要技术挑战与解决方案

1. **小红书 SPA 导航检测**：小红书使用无刷新路由切换，常规 `load` 事件无法触发。解决：扩展以 2500ms 轮询 URL 变化，检测到 `note_id` 改变后重新采集；

2. **ECharts 在动态更新时的实例生命周期**：`mountChart()` 函数清空 DOM 节点导致 ECharts 内部 `<canvas>` 被销毁，但 JS 变量仍持有失效实例引用。解决：严格遵循 `dispose → 清空节点 → 重新 init` 的三步顺序；

3. **DeepSeek 环境依赖**：虚拟机环境中 `.bashrc` 中的 `DEEPSEEK_API_KEY` 不被子进程继承。解决：Python 脚本启动时主动读取 `backend/.env` 文件并 `os.environ.setdefault`；

4. **外网不可访问**：虚拟机网络受限，DuckDuckGo 等搜索 API 无法调用。解决：平行书架改为完全依托 DeepSeek 自身知识库生成推荐，并在 Prompt 中添加严格的话题相关性和来源可靠性约束，有效规避了幻觉问题。

---

*本报告由团队两人共同撰写，代码托管于 GitHub，可运行版本已提交至夸克网盘。*
