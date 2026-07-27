# 问膳技术速览——评委提问应对手册

> **这份文档的目的**：帮助你在不需要深入写代码的情况下，真正理解项目里每个技术选择的含义，以及"为什么这样做而不是那样做"。遇到评委技术提问时，你不需要背代码，只需要能用自己的话说出背后的逻辑。
>
> 通篇用比喻和白话解释，不堆术语。

---

## 一、整体架构——先建立全局感

把整个项目想象成一家餐厅：

| 餐厅角色 | 对应项目组件 | 职责 |
|---|---|---|
| 顾客 | 用户 | 正常使用小红书、浏览 Dashboard |
| 服务员 | 浏览器扩展 | 观察顾客点了什么，默默记录 |
| 收银台 / 后厨入口 | FastAPI 后端 | 接收订单、转发指令、返回结果 |
| 冰箱 | SQLite 数据库 | 把所有食材（数据）存在顾客自己家里 |
| 大厨 | OpenClaw 智能体 | 真正做分析、推荐、对话的核心角色 |
| 食谱库 | DeepSeek 大模型 | 大厨翻阅的知识来源 |
| 餐厅大堂 | Web Dashboard 前端 | 顾客看到的最终呈现界面 |

**关键特征：冰箱（数据库）在顾客自己家里，不在餐厅的中央仓库。** 这是为什么我们的产品能宣称"数据不上传服务器"——数据从来没离开过用户自己的电脑。

---

## 二、FastAPI——后端是什么，为什么选它

### 它是什么

FastAPI 是一个 Python 框架，用来搭建 **Web 服务器**——也就是一个能接收 HTTP 请求（浏览器发过来的）、处理数据、返回结果的程序。

类比：FastAPI 就是一个自动接电话的总机。扩展打来电话说"我抓到一条笔记"，总机接到后记录下来，说"好的收到"。前端打来电话说"给我最新报告"，总机去仓库翻出来返回过去。

### 为什么选 FastAPI 而不是其他框架

- **快**：处理速度快（特别是异步操作，下面会解释）
- **自动生成文档**：启动后访问 `localhost:8000/docs` 就能看到所有 API 列表和测试界面，联调很方便
- **Python 生态**：和 DeepSeek 的 SDK、SQLAlchemy、httpx 等都能无缝配合

### 异步（async）是什么意思

项目里生成报告要调 DeepSeek API，这个过程可能需要 20-30 秒。

如果是**同步模式**：总机接到"生成报告"的电话后，就一直拿着电话等 DeepSeek 回答，这期间任何其他电话都打不进来，整个服务"卡住"了。

如果是**异步模式**：总机接到电话后说"好的，我让后厨开始做，你可以先挂电话，我做好了会通知你"。前端立刻得到"任务已提交"的回复，然后每隔3秒自己来问"好了没"，不堵塞其他请求。

我们的 `POST /api/report/generate` 就是异步的——用了 FastAPI 的 `BackgroundTasks`，收到请求后立刻返回，在后台偷偷跑分析脚本。

---

## 三、SQLite 和 SQLAlchemy——数据库和数据模型

### SQLite 是什么

SQLite 是一个**文件型数据库**，整个数据库就是你电脑上的一个 `.db` 文件（我们的是 `data/eatwhat.db`）。不需要安装数据库服务器，不需要用户名密码，打开文件就能读写。

类比：SQLite 就像一本精心设计的 Excel 表格，放在用户本地，不联网。

**为什么不用 MySQL 或 PostgreSQL？**
- 我们是单用户本地工具，数据量小，没有并发多用户的问题
- SQLite 零依赖、零配置，用户安装项目时不需要额外装数据库
- 保证数据本地性——这是我们产品最重要的卖点之一

### 数据库里有几张表，分别存什么

| 表名 | 存什么 |
|---|---|
| `raw_observations` | 扩展采集的每一条笔记（标题、正文、互动类型等） |
| `reports` | 每一份认知体检报告（四板块都以 JSON 字符串存储） |
| `bookshelf_items` | 平行书架里的每一条推荐内容 |
| `cooldown_items` | 冷静期盒子里的每一条 URL |
| `logs` | 前端 / 扩展 / 后端 / OpenClaw 打的日志 |

### SQLAlchemy 是什么

SQLAlchemy 是一个 **ORM（对象关系映射）**工具，它让我们可以用 Python 对象来操作数据库，而不用手写 SQL 语句。

类比：SQLAlchemy 就像一个翻译官。你说"给我找所有 status 是 locked 的冷静期条目"，它帮你翻译成 `SELECT * FROM cooldown_items WHERE status='locked'` 发给数据库。

---

## 四、浏览器扩展——它是怎么工作的

### 三个文件各是什么角色

扩展由三个部分组成，职责完全不同：

**content.js（内容脚本）**
- 运行在小红书页面"里面"，能读取页面上的所有内容
- 类比：一个蹲在餐厅里的记者，能看到桌上的菜单
- 负责：扫描 DOM（页面结构），抓取笔记标题、正文、标签、互动数据
- **只能访问当前页面，不能直接发网络请求到其他域名**

**background.js（后台脚本）**
- 运行在浏览器后台，页面关了它还活着
- 类比：餐厅外面的通讯员，可以向任何地方发消息
- 负责：接收 content.js 发来的数据，POST 到 `localhost:8000/ingest`
- 还负责：注册右键菜单"存入冷静期盒子"

**popup.html（弹窗）**
- 点击扩展图标出现的小窗口
- 提供手动采集按钮和状态显示

### 为什么 content.js 不能直接发请求，要经过 background.js

这是浏览器安全机制决定的。content.js 注入到小红书页面里，从浏览器的角度看它"属于"小红书，不能随便向 localhost 发请求（会被 CORS 拦截）。background.js 则是扩展自己的进程，拥有 `host_permissions` 里声明的权限，可以向 localhost:8000 发请求。

类比：餐厅里的记者没有通行证，不能出门发报告；通讯员在外面，可以自由传递消息。

### SPA 路由检测是什么问题，怎么解决的

小红书是 **SPA（单页应用）**——翻页时不会真正刷新整个页面，只是 URL 悄悄变了，DOM 局部更新。

普通网站切换页面时，浏览器会重新加载，content.js 重新运行，一切正常。
小红书切换笔记时，URL 变了但页面没有"重新加载"信号，content.js 不知道该重新采集了。

**我们的解决方案**：让 content.js 每 2500ms 检查一次当前 URL，如果 URL 里的 note_id 变了，就触发一次重新采集。

类比：记者每隔几秒抬头看一眼桌上点了什么，发现菜单换了就重新记录。

### Manifest V3 是什么

这是 Chrome 扩展的版本规范。V3 是 2023 年后的新标准，V2 是旧的。主要区别是后台脚本从"长期存活的页面"改成了"Service Worker"（干完活自动休眠，下次有事再唤醒）。我们使用 V3 是因为：
1. 这是现在的标准，Chrome 商店要求
2. 更安全，权限管理更严格

---

## 五、OpenClaw 与 Skill——智能体框架是什么

### OpenClaw 是什么

OpenClaw 是一个**智能体运行框架**。可以把它想象成一个能自主决策的 AI 工作流平台：你给它一个人格设定（SOUL.md）和一套能力（Skills），它会根据输入决定调用哪些能力、用什么顺序、传什么参数。

类比：OpenClaw 是一个有个性的项目经理，SOUL.md 是他的性格设定，每个 Skill 是他能调动的不同专业顾问。

### Skill 是什么

Skill 是 OpenClaw 里的一个独立能力模块，相当于一个"专业工具"。我们写了三个：

| Skill 名 | 相当于 | 做什么 |
|---|---|---|
| `analyze_cognition` | 数据分析师 | 读近7天浏览记录，调 DeepSeek，生成4维报告 |
| `search_parallel_views` | 书单推荐官 | 读报告里的盲区，调 DeepSeek，生成平行书架内容 |
| `socratic_dialog` | 苏格拉底式辩手 | 接收用户消息，只追问不给答案，引导用户自己思考 |

每个 Skill 本质上是一个 Python 脚本，独立运行，通过 SQLite 数据库和 FastAPI 后端共享数据。

### 为什么用 OpenClaw 而不是直接调 DeepSeek

直接调 DeepSeek 只是一次性问答。OpenClaw 给了我们：
1. **状态管理**：苏格拉底追问需要记住对话历史，多轮对话
2. **模块化**：三个 Skill 可以独立迭代，不互相影响
3. **赛题要求**：赛道要求使用智能体框架，OpenClaw 是官方推荐之一

---

## 六、DeepSeek API 与 Prompt 工程

### DeepSeek API 是什么

DeepSeek 是一家中国 AI 公司，提供和 OpenAI GPT 类似的语言模型服务。我们通过 HTTP 请求向它发送"问题"，它返回"答案"。

调用格式：
- 你发给它：一段"系统提示"（告诉它扮演什么角色）+ 一段"用户消息"（具体要分析的数据）
- 它返回：一段文本（我们要求是 JSON 格式）

### response_format: json_object 是什么，为什么重要

大模型默认输出是自由格式的文本，有时候会输出"好的，以下是分析结果：..."这样的废话，也可能在 JSON 前后加 Markdown 的代码块符号，导致我们的程序解析失败。

`response_format: {"type": "json_object"}` 是 DeepSeek 的一个参数，告诉它：**只输出纯 JSON，不要任何其他文字**。

这是防止"幻觉"和格式错误的关键设置，没有它报告生成会时不时失败。

### 为什么分析"内容的倾向"而不是"用户的立场"

这是整个 Prompt 工程里最重要的设计决策，也是评委最可能深问的点。

**错误的做法**：让 AI 分析"用户持有什么观点"
- 但用户浏览了一条批评高考的笔记，不代表用户本人反对高考
- 用户可能只是好奇、随手划过、或者正在研究这个话题
- 从行为数据推断"个人立场"是一种过度解读，容易出错，也是信息伦理的红线

**正确的做法**：分析"用户接触的内容传递了什么倾向"
- 用户这周刷了 10 条批评高考的内容，说明他的信息流里充斥着负面情绪的教育议题
- 这是客观事实，不是对用户的判断
- 分析的是"信息环境"，而不是"人"

这也回答了"为什么这个产品的伦理是安全的"——我们不做人格分析，只做信息环境分析。

### 交互类型加权是什么意思

`interaction_type` 有四种：`view`（浏览）、`like`（点赞）、`collect`（收藏）、`comment`（评论）

用户刷到一条笔记随手滑过（view）和用户专门点收藏（collect），投入的注意力和认同程度完全不同。

我们在发给 DeepSeek 的数据里，给不同互动类型加了标记：
- 点赞/收藏：加上 `【高权重】` 前缀
- 评论：加上 `【中权重】` 前缀
- 普通浏览：不加标记

这样 DeepSeek 在分析时，会自动把高权重内容对结论的影响放大，让报告更准确反映用户真实的注意力投入。

---

## 七、HTMX 与 ECharts——前端技术

### HTMX 是什么

HTMX 是一个让 HTML 元素能直接发送 HTTP 请求的库。普通 HTML 点击按钮要么刷新页面，要么需要写 JavaScript 代码来发请求。HTMX 让你可以直接在 HTML 标签上写属性（比如 `hx-post="/api/cooldown"`），点击时自动发 POST 请求、把结果插入页面。

类比：普通 HTML 是只会点菜的顾客，HTMX 是会跑腿传菜的服务员，不需要另外召唤一个 React/Vue 这样的大厨。

**为什么选 HTMX 而不是 Vue/React？**
- 无需构建工具（Webpack/Vite），直接 CDN 引入，零配置
- 两名大一学生用 AI 辅助开发，HTMX 比 Vue/React 简单很多
- 项目是本地单用户工具，不需要复杂的前端状态管理
- 结论：够用且简单，选最简单能完成任务的工具

### ECharts 是什么

ECharts 是百度开源的**图表库**，提供饼图、柱状图等各类可视化组件。我们用它画认知体检报告里的兴趣地图（饼图）和观点倾向光谱（横向柱状图）。

### ECharts 生命周期问题——为什么必须 dispose → 清空 → init

这是项目里最典型的一个 Bug，说起来很能展示技术理解。

**问题场景**：用户点击"生成报告"，报告生成完成后，JavaScript 代码尝试更新图表。

**错误的做法**（就是 F 同学最初的写法）：
1. 清空 DOM 节点（`node.textContent = ''`）
2. 用旧的 chart 变量调 `setOption()` 更新图表

**为什么会出错**：
ECharts 初始化时，会在 `<div>` 节点里**创建一个 `<canvas>` 子元素**，把图画在这个 canvas 上。当你调 `node.textContent = ''` 时，这个 canvas 被删掉了，但 JavaScript 变量还指向已经销毁的 ECharts 实例。往一个内部 canvas 已经不存在的实例里塞数据，它静默失败——不报错，也不显示任何东西。

**正确的做法**：
1. 先调 `chart.dispose()`——告诉 ECharts "你可以销毁了，释放内存"
2. 再清空 DOM 节点
3. 再重新 `echarts.init(node)` 创建全新实例
4. 最后 `setOption()` 设置数据

类比：你想换一幅挂在墙上的画。错误做法是先把墙上的钉子拔了（DOM 清空），然后再往旧的相框（旧实例）里塞新画——但相框已经没有地方挂了。正确做法是先把旧相框整个拿下来（dispose），再重新钉钉子（clear），挂新相框（init）。

---

## 八、CORS——跨域是什么问题

### 是什么

CORS（跨源资源共享）是浏览器的安全机制。当一个网页（比如小红书，域名是 `xiaohongshu.com`）里的脚本试图向另一个域名（比如 `localhost:8000`）发请求时，浏览器会先问目标服务器"你允许来自 xiaohongshu.com 的请求吗？"如果服务器没有明确表示允许，浏览器就拒绝这个请求。

### 为什么我们需要配置 CORS

我们的浏览器扩展（content.js）运行在小红书页面里，需要向 `localhost:8000` 发数据。但 content.js 实际上是 background.js 在转发，background.js 有 `host_permissions`，所以 CORS 对扩展来说不是问题。

真正需要 CORS 的场景是：前端 Dashboard（`localhost:8000`）里的 JavaScript 向同一个后端发请求——虽然是同一个端口，但一些浏览器设置还是会触发 CORS 检查。另外 OpenClaw Dashboard（`localhost:18789`）也需要访问后端。

**我们的处理**：在 `main.py` 里加了 `CORSMiddleware`，当前 MVP 阶段用 `allow_origins=["*"]` 放行所有来源（方便开发），生产化时会收紧到具体域名。

---

## 九、API Key 子进程继承问题——一个真实的 Bug

### 问题描述

`DEEPSEEK_API_KEY` 存在 `~/.bashrc` 里（用 `export` 设置的环境变量）。当你在终端手动运行脚本时，一切正常——因为终端继承了 `.bashrc` 里的变量。

但当 FastAPI 用 `BackgroundTasks` 或 `subprocess.run()` 在后台启动 Python 脚本时，新启动的进程是 FastAPI 的"子进程"，它**不会**自动读取 `~/.bashrc`（bashrc 只在用户登录 shell 时执行）。子进程启动时环境变量里没有 `DEEPSEEK_API_KEY`，于是脚本读到空字符串，调用 DeepSeek 失败。

### 怎么解决的

在 `analyze_cognition.py` 的顶部加了一段代码，启动时**主动读取** `backend/.env` 文件并解析其中的键值对，用 `os.environ.setdefault()` 写入环境变量：

```python
_env_file = Path("/home/king/project/backend/.env")
if _env_file.exists():
    for _line in _env_file.read_text().splitlines():
        if _line and not _line.startswith("#") and "=" in _line:
            _k, _v = _line.split("=", 1)
            os.environ.setdefault(_k.strip(), _v.strip())
```

这样不管谁启动这个脚本，它都能找到自己需要的 API Key。

**评委可能的追问**：为什么用 `setdefault` 而不是直接赋值？
答：`setdefault` 是"如果环境变量不存在才设置，已经存在就不覆盖"。这保证了：如果用户在 shell 里显式 export 了 KEY，以 shell 值为准；只有在 shell 没有传递时，才 fallback 到 .env 文件。

---

## 十、整体数据流——当用户点击"生成报告"，发生了什么

**一步步走一遍，这是最容易被考到的问题：**

```
1. 用户点击前端"立即生成报告"按钮

2. 前端 JS 发送 POST 请求到 localhost:8000/api/report/generate

3. FastAPI 的 generate_report() 函数被调用
   - 立刻把 _run_analyze 函数加入 BackgroundTasks 队列
   - 立刻返回 {"status": "generating"} 给前端（不等待）

4. 前端收到响应，开始每3秒轮询 GET /api/report/latest

5. BackgroundTasks 在后台调用 subprocess.run() 启动 analyze_cognition.py

6. analyze_cognition.py 做了：
   a. 读 backend/.env 获取 DEEPSEEK_API_KEY
   b. 连接 SQLite，查询近7天的 raw_observations
   c. 把数据格式化成文本（加上互动类型的权重标记）
   d. 向 DeepSeek API 发请求，携带 system prompt + 用户数据
   e. 解析 DeepSeek 返回的 JSON
   f. 把结果写入 reports 表

7. 前端轮询时，GET /api/report/latest 终于返回新报告
   - 报告的 id 或 generated_at 和之前不同，说明是新的
   - 前端停止轮询，渲染图表

8. report.js 调用 renderInterestMap() 和 renderOpinionSpectrum()
   - dispose 旧 ECharts 实例
   - 清空 DOM 节点
   - 重新 init 新实例
   - 用新数据 setOption 渲染
```

**总耗时**：主要是第6步调 DeepSeek，大约 10-30 秒，其余步骤加起来不到 1 秒。

---

## 十一、如果评委问"你们真的懂这些技术吗"——怎么回答

这是最可能被问到的隐性问题。不需要假装全懂，也不能说"都是 AI 写的"。

**推荐的答法框架**：

> "我们采用了 AI 辅助开发的模式。AI 负责根据我们的需求生成代码，我们负责定义需求、设计接口、判断代码是否正确、测试验收和 Bug 定位。
>
> 在这个过程中，我们遇到过很多 AI 无法自动解决的问题——比如 ECharts 实例生命周期、API Key 的子进程继承、小红书 SPA 路由检测——这些都是我们自己理解问题、设计解决方案之后，再和 AI 合作实现的。
>
> 所以我们的能力体现在：能不能把一个复杂问题拆解清楚，能不能判断技术方案的对错，能不能在系统出问题时找到真正的根本原因——而不只是能写多少行代码。"

---

## 十二、高频技术问题速查

| 问题 | 一句话答案 |
|---|---|
| 为什么用 FastAPI 不用 Django？ | FastAPI 更轻量，原生支持异步，适合 API 服务；Django 更重，适合有模板渲染需求的传统 Web 应用 |
| 为什么用 SQLite 不用 MySQL？ | 单用户本地工具，SQLite 零依赖、零配置；MySQL 需要安装服务进程，对用户要求太高 |
| 为什么数据不上传云端？ | 本地隐私是核心产品定位；云端方案要加用户认证、多用户隔离，成本和复杂度都大幅上升 |
| 为什么浏览器扩展用 Manifest V3 不用 V2？ | V2 已被 Chrome 废弃，V3 是现行标准；Chrome 商店要求 V3 |
| content.js 和 background.js 有什么区别？ | content.js 运行在页面里，能读 DOM，不能跨域请求；background.js 在扩展进程里，能发任意网络请求 |
| 为什么要轮询而不是 WebSocket 实时推送？ | MVP 阶段报告生成频率很低（每次手动触发），轮询够用；WebSocket 需要保持长连接，实现更复杂，过度设计 |
| Prompt 里为什么要求严格 JSON 输出？ | 防止 LLM 在 JSON 前后加多余文字导致解析失败；`response_format: json_object` 是 DeepSeek 支持的参数，从 API 层强制保证格式 |
| 苏格拉底追问为什么不给结论？ | 给结论就变成了另一个推荐系统；苏格拉底方法的核心是帮助用户自己建立判断能力，不是替用户做决定 |
| 平行书架为什么不做真实网络搜索？ | 虚拟机环境网络受限（无法访问 DuckDuckGo 等外网接口）；同时 DeepSeek 知识库对书籍/学术内容的覆盖已足够，减少了"搜到假链接"的幻觉问题 |
| 本地模型支持是什么状态？ | 已预留架构接口——OpenClaw 的配置文件支持 `model:` 字段切换；只需修改一个配置项就能从 DeepSeek 切换到 Ollama 本地模型，不需要改代码 |

---

*阅读顺序建议：先看第一章（整体感），再看第十章（数据流），最后看第十二章（速查）。其余按需查阅。*
