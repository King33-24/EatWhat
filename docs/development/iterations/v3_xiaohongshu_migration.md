# B 站 → 小红书 迁移指南(v4 变更清单)

> **用途**:供 B 同学(后端)和 F 同学(前端/扩展)对齐的"改了什么/要重做哪些/哪些不用动"。
> **变更日期**:2026-05-12
> **权威设计**:`docs/design/history/ver3.md`（当前权威见 `docs/design/eatwhat.md`）

---

## 一、为什么要改

B 站 Web 版能抓的文字信息密度不足(标题 + 简介 + 弹幕 + 评论都被抓不到/不稳定)。小红书笔记正文是主要信息载体,文字密集,更适合 LLM 做"兴趣/价值观/情绪"分析。

---

## 二、改了哪些文件

| 文件 | 改动内容 | 谁看 |
|---|---|---|
| `docs/design/history/ver3.md` | 完整 v4 数据源迁移设计文档,包含双通道采集、字段表、边缘情况 | **两人都要看** |
| `docs/development/iterations/tasks.md` | E-01~E-04 小红书重写;新增 E-05/E-06;新增 B-04b | **两人都要看** |
| `docs/api.md` | POST /ingest payload 字段更新;新增 POST /api/import-url | **两人都要看** |
| `backend/models.py` | `RawObservation` 表字段更新(bvid→note_id 等) | **B 同学** |
| `backend/main.py` | 合并队友的 router/static mount + 我们的 lifespan/DB 创建 | **B 同学** |
| `docs/contest/commercialization.md` | "B 站"→"小红书"少量替换 | 选看 |
| `README.md` | "B 站"→"小红书"少量替换 | 选看 |
| `.github/copilot-instructions.md` | "B 站"→"小红书"少量替换 | F 同学看 |
| `frontend/index.html` | "B 站"→"小红书"少量替换 | F 同学看 |

---

## 三、API 变化(前后端对齐重点)

### 3.1 POST /ingest

**请求体字段变更**:

| 字段 | 旧(ver2) | 新(ver3) | 说明 |
|---|---|---|---|
| `bvid` | ✅ 必填 | **删除**,改为 `note_id` | B 站独有,小红书没有 |
| `note_id` | 无 | ✅ 新增必填 | 小红书笔记 ID(从 URL 末段或 DOM data attr) |
| `uploader` | ✅ | 改名为 `author` | 语义平移 |
| `description` | ✅ | 改名为 `content` | 小红书笔记正文远长于 B 站简介 |
| `top_comments` | ✅ | **删除** | 技术受限(Shadow DOM),不抓 |
| `interaction_type` | `view/like/favorite/coin` | `view/like/collect/comment` | `favorite`→`collect`;`coin`→`comment` |
| `images_count` | 无 | 新增 int | 图片数量(元信息,不读图) |
| `likes_count` | 无 | 新增 int | 点赞数 |
| `collects_count` | 无 | 新增 int | 收藏数 |
| `comments_count` | 无 | 新增 int | 评论数 |
| `dwell_seconds` | 无 | 新增 int | 用户停留秒数(上限 600s) |
| `source_channel` | 无 | 新增 string | `'extension'`(扩展自动) / `'manual_url'`(用户粘贴补录) |

**保留不变的字段**: `title`, `tags`, `observed_at`

### 3.2 新增 POST /api/import-url

- **用途**:用户从小红书 App 复制单条笔记 URL → 粘贴到 Dashboard → 后端抓取该笔记内容 → 入库
- **请求体**:
  ```json
  {"url": "https://www.xiaohongshu.com/explore/abc123"}
  ```
- **成功响应**:和 /ingest 成功响应相同格式
- **错误**:400(非法 URL);500(后端抓取失败)

---

## 四、重做 vs 保留清单

### 🔴 完全重做(从头写)

| 任务 | 谁 | 原因 | 预计耗时 |
|---|---|---|---|
| **E-02** 扩展 Content Script 抓小红书 DOM | F 同学 | 小红书 DOM 结构和 B 站完全不同 | 4-5h |

### 🟡 调整修改(改几行到几十行)

| 任务 | 谁 | 改什么 | 预计耗时 |
|---|---|---|---|
| **E-01** 扩展 manifest | F 同学 | `matches`: `*.bilibili.com/video/*` → `*.xiaohongshu.com/explore/*` | 5min |
| **E-03** Content → FastAPI 链路 | F 同学 | Payload 字段: `bvid`→`note_id`;`description`→`content`;去 `top_comments`;加 `images_count/likes_count/collects_count/comments_count/dwell_seconds/source_channel` | 15min |
| **E-04** popup + 右键菜单 | F 同学 | "采集本视频" → "采集本笔记";`chrome-extension://*` CORS 不变 | 15min |
| **B-03** FastAPI models.py | B 同学 | `RawObservation` 字段:bvid→note_id, uploader→author, description→content;删 top_comments;加 6 个新字段 | 20min(我来改) |
| **B-03** FastAPI main.py | B 同学 | 合并队友的 router + static mount + 我们的 lifespan/DB 创建 | 10min(我来改) |
| **B-04** POST /ingest | B 同学 | 按新字段接收和写入;改字段校验 | 30min |
| **api.md** 接口契约 | 双方 | §1.1 字段表改;新增 §1.2 /import-url;改 /api 里的 B 站 URL 示例 | 我来做 |

### ✅ 完全不用改(保留现状)

| 任务 | 谁 | 原因 |
|---|---|---|
| **F-01** Dashboard 骨架(4 个 HTML) | F 同学 | 页面结构、路由、CDN 引入均与数据源平台无关 |
| **F-02** report.html 渲染 | F 同学 | 只渲染 `reports` 表 JSON,与数据源无关 |
| **F-03** bookshelf.html 渲染 | F 同学 | 只渲染 `bookshelf_items` 表 JSON,与数据源无关 |
| **F-04** cooldown.html 渲染 | F 同学 | 只操作 `cooldown_items` 表,与数据源无关 |
| **B-05** GET /api/report/* | B 同学 | 只读 `reports` 表,与数据源无关 |
| **B-06** POST /api/report/generate | B 同学 | 异步触发 Skill,字段无关 |
| **B-07** CRUD /api/cooldown | B 同学 | 只操作 `cooldown_items`,与数据源无关 |
| **O-01** OpenClaw Skill(Hello) | B 同学 | 基础 SOUL.md/SKILL.md,与数据源无关 |
| **O-02~O-05** Skill 工程 | B 同学 | Prompt 里"近 7 天的 raw_observations"逻辑不变,只是 prompt 例子从视频改为笔记(几句话即可) |
| **数据库** 其他 4 张表 | — | `reports`/`bookshelf_items`/`cooldown_items`/`logs` 完全不受影响 |
| **前端** js/api.js | F 同学 | fetch 封装方式不变,API 端点路径不变 |

---

## 五、新增任务(E-05 / E-06 / B-04b)

| 新任务 | 谁 | 做什么 | 算入 W1 还是 W2 |
|---|---|---|---|
| **E-05** 用户动作 hook | F 同学 | content script 监听点赞/收藏/评论按钮 click → `chrome.runtime.sendMessage` → `interaction_type` | W1(E-04 后) |
| **E-06** Dwell time 追踪 | F 同学 | content script `visibilitychange` + `beforeunload` → 累加 active 停留时间 → `sendBeacon` 上报 | W1(E-04 后) |
| **B-04b** URL 补录接口 | B 同学 | `POST /api/import-url` → httpx 抓小红书笔记页 → BeautifulSoup 解析 → 入库 | W1(B-04 中) |

---

## 六、已生效的变更(我这边已经做完)

- ✅ `docs/design/history/ver3.md` 已新建,含完整字段表、双通道采集设计、边缘情况章节
- ✅ `docs/development/iterations/v3_xiaohongshu_migration.md` 本文件已生成(就是你正在看的)
- ✅ `backend/models.py` 已更新字段(见上述 3.1)
- ✅ `backend/main.py` 已合并
- ✅ `docs/api.md` 已更新 + 新增 /import-url
- ✅ `docs/development/iterations/tasks.md` 已更新任务列表
- ✅ 其余文件(`README.md`/`commercialization.md`/`copilot-instructions.md`/`frontend/index.html`) 已完成字面替换

---

## 七、你和队友下一步动作

**B 同学(你)**:
1. 读 `docs/design/history/ver3.md` §2.1 + §5.4 + §9.X(10 分钟)
2. 确认 `backend/models.py` + `backend/main.py` 合并无误(B-03 验收:看 8000 能访问 + DB 有 5 张表)
3. 写 B-04(POST /ingest + 后端日志) — 按新字段
4. 写 B-04b(POST /api/import-url) — 新接口

**F 同学(队友)**:
1. 读 `docs/design/history/ver3.md` §2.1 + §5.4(5 分钟)
2. 改 `extension/manifest.json` matches(1 分钟)
3. 重做 E-02(抓小红书 DOM) — 这是最大工作量,可能需要你的帮助确认选择器
4. 调整 E-03 payload 字段(15 分钟)
5. 加 E-05 + E-06(用户动作 hook + dwell time)
6. Dashboard 前端 `frontend/index.html` 里的"B 站"文案已自动替换,她确认即可
