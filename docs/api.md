# EatWhat API 接口契约 v1.0

> **用途**：前后端 + 浏览器扩展 + OpenClaw 之间的接口约定。任何一方修改前先在群里同步。
> **后端服务地址**：`http://localhost:8000`
> **OpenClaw WebChat**：`http://localhost:8001`（不属于本契约范畴）

---

## 0. 公共约定

### 0.1 响应格式

所有响应统一为：

```json
{
  "success": true,
  "data": { /* 实际数据 */ },
  "error": null
}
```

出错时：

```json
{
  "success": false,
  "data": null,
  "error": "人话错误描述"
}
```

### 0.2 认证

MVP 阶段**不做认证**（单机本地运行）。生产化时再加。

### 0.3 CORS

后端允许以下来源跨域：
- `chrome-extension://*`（浏览器扩展）
- `http://localhost:8000`（前端 Dashboard）
- `http://localhost:8001`（OpenClaw WebChat）

### 0.4 时间格式

ISO 8601 含时区：`2026-05-08T20:30:00+08:00`

### 0.5 HTTP 状态码

| 状态码 | 含义 |
|---|---|
| 200 | 成功 |
| 400 | 请求格式错（缺字段、字段类型错、JSON 解析失败） |
| 404 | 资源不存在（report_id / cooldown_id 找不到） |
| 422 | 参数语义错（unlock_at 早于 locked_at、interaction_type 不在允许集合） |
| 500 | 服务器内部错（DB 不可用、DeepSeek 调用失败） |

---

## 1. 数据采集

### 1.1 `POST /ingest`

浏览器扩展上报 B 站视频公开元数据。

**调用方**：`extension/background.js`

**请求体**：
```json
{
  "bvid": "BV1xx411x7xx",
  "title": "GPT-5 发布会全程",
  "uploader": "AI 资讯",
  "tags": ["AI", "GPT", "发布会"],
  "description": "OpenAI 发布 GPT-5 模型...",
  "top_comments": [
    {"author": "用户A", "content": "这次更新太强了", "likes": 1024}
  ],
  "interaction_type": "view"
}
```

**字段说明**：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `bvid` | string | ✅ | B 站视频唯一 ID（格式 `BV` + 10 位字符） |
| `title` | string | ✅ | 视频标题 |
| `uploader` | string | ✅ | UP 主名 |
| `tags` | string[] | ❌ | 标签数组，可空 |
| `description` | string | ❌ | 视频简介，可空 |
| `top_comments` | object[] | ❌ | 高赞评论数组（最多 5 条），每项 `{author, content, likes}` |
| `interaction_type` | string | ✅ | 取值：`view` / `like` / `favorite` / `coin` |

**成功响应**：
```json
{
  "success": true,
  "data": {
    "id": 42,
    "observed_at": "2026-05-08T20:30:00+08:00"
  },
  "error": null
}
```

**错误情况**：
- 400：缺 `bvid` / `title` / `uploader` / `interaction_type`
- 422：`interaction_type` 不在允许集合
- 500：DB 写入失败

---

## 2. 认知体检报告

### 2.1 `GET /api/report/latest`

获取最新一份报告。

**调用方**：`frontend/js/report.js`（页面加载时）

**Query 参数**：无

**成功响应**：
```json
{
  "success": true,
  "data": {
    "id": 7,
    "period_start": "2026-05-01T00:00:00+08:00",
    "period_end": "2026-05-08T00:00:00+08:00",
    "interest_map": [
      {"topic": "AI", "weight": 0.45, "sample_videos": ["GPT-5 发布", "Claude 5 评测"]}
    ],
    "opinion_spectrum": [
      {"issue": "AI 取代人工", "position": "支持", "evidence": "5 个视频均认为 AI 将取代..."}
    ],
    "blind_spots": [
      {
        "description": "你这周看了 8 个数字游民视频，但没有任何内容讨论可持续性风险",
        "missing_perspective": "可持续性",
        "sample_count": 8
      }
    ],
    "emotion_pattern": [
      {"emotion": "焦虑", "weight": 0.6, "examples": ["AI 失业潮", "内卷困局"]}
    ],
    "generated_at": "2026-05-08T23:00:00+08:00"
  },
  "error": null
}
```

**当无报告时**：
```json
{"success": true, "data": null, "error": null}
```

### 2.2 `GET /api/report/{id}`

获取指定 ID 的报告。

**Path 参数**：`id` - 报告 ID（整数）

**响应**：与 `2.1` 相同的 `data` 结构

**错误**：
- 404：`report_id` 不存在

### 2.3 `POST /api/report/generate`

立即触发一次报告生成（OpenClaw 调 `analyze_cognition` Skill）。

**调用方**：`frontend/js/report.js`（用户点"立即生成报告"按钮）

**请求体**（可选）：
```json
{"period_days": 7}
```

| 字段 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `period_days` | int | ❌ | 7 | 分析过去多少天的数据，可选 7/14/30 |

**成功响应**：
```json
{
  "success": true,
  "data": {
    "task_id": "rep-20260508-203000",
    "status": "queued"
  },
  "error": null
}
```

**说明**：异步触发。前端轮询 `GET /api/report/latest`，看到新的 `generated_at` 即视为完成。**轮询间隔建议 3 秒，最多轮询 60 秒**。

**错误**：
- 422：`raw_observations` 表近 7 天数据为 0，无法生成

---

## 3. 平行书架

### 3.1 `GET /api/bookshelf`

列出某份报告的书架。不传参数则取最新报告的书架。

**调用方**：`frontend/js/bookshelf.js`

**Query 参数**：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `report_id` | int | ❌ | 不传则用最新 `report_id` |

**成功响应**：
```json
{
  "success": true,
  "data": {
    "report_id": 7,
    "items": [
      {
        "id": 13,
        "blind_spot_index": 0,
        "title": "数字游民的中年困境：当浪漫破灭后",
        "source_type": "article",
        "url": "https://example.com/article/123",
        "contrast_card": "你常看的内容假设地点自由 = 自由；本文揭示这种自由是建立在年轻+健康+经济上行的临时窗口...",
        "author_intro": "作者是 X 大学社会学系教授，长期研究...",
        "created_at": "2026-05-08T23:05:00+08:00"
      }
    ]
  },
  "error": null
}
```

**source_type 取值**：`wechat` / `article` / `video` / `podcast`

### 3.2 `POST /api/bookshelf/refresh`

立即刷新书架（OpenClaw 调 `search_parallel_views` Skill）。

**请求体**（可选）：
```json
{"report_id": 7}
```

**响应**：同 `report/generate` 风格，返回 `task_id` 和 `status: "queued"`。

---

## 4. 冷静期盒子

### 4.1 `GET /api/cooldown`

列出冷静期项。

**Query 参数**：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `status` | string | ❌ | `locked` / `unlocked` / `discarded`；不传 = 全部 |

**成功响应**：
```json
{
  "success": true,
  "data": [
    {
      "id": 5,
      "url": "https://www.bilibili.com/video/BV1xx",
      "title": "标题",
      "user_note": "我知道我又在刷无聊视频",
      "locked_at": "2026-05-08T15:00:00+08:00",
      "unlock_at": "2026-05-15T15:00:00+08:00",
      "status": "locked",
      "remaining_seconds": 540000
    }
  ],
  "error": null
}
```

**说明**：`remaining_seconds` 仅当 `status=locked` 时返回；其余情况为 `null`。

### 4.2 `POST /api/cooldown`

存入冷静期。

**调用方**：
- `frontend/cooldown.html` 输入框
- `extension/background.js` 右键菜单
- OpenClaw `socratic_dialog` Skill（用户在对话中发链接）

**请求体**：
```json
{
  "url": "https://example.com",
  "title": "可选标题",
  "user_note": "为什么想看",
  "lock_days": 7
}
```

| 字段 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `url` | string | ✅ | - | URL（http/https） |
| `title` | string | ❌ | 后端尝试 fetch html 抓 `<title>` | |
| `user_note` | string | ❌ | `""` | 用户写的"为什么想看" |
| `lock_days` | int | ❌ | 7 | 锁定天数，1-30 |

**成功响应**：
```json
{
  "success": true,
  "data": {"id": 5, "unlock_at": "2026-05-15T15:00:00+08:00"},
  "error": null
}
```

**错误**：
- 400：`url` 不是合法 URL
- 422：`lock_days` 超出 1-30 范围

### 4.3 `PATCH /api/cooldown/{id}`

更新备注或手动改变状态（如丢弃）。

**Path 参数**：`id`

**请求体**（部分更新，传哪个改哪个）：
```json
{
  "user_note": "新备注",
  "status": "discarded"
}
```

**成功响应**：返回更新后的完整记录

**错误**：
- 404：`id` 不存在
- 422：`status` 不在 `locked`/`unlocked`/`discarded` 中

### 4.4 `DELETE /api/cooldown/{id}`

物理删除一项。

**响应**：
```json
{"success": true, "data": {"id": 5, "deleted": true}, "error": null}
```

**错误**：
- 404：`id` 不存在

---

## 5. 跨端日志

### 5.1 `POST /api/log`

前端、扩展、OpenClaw 都可以打日志到这里。**关键操作必须打日志**（评分点）。

**调用方**：所有

**请求体**：
```json
{
  "source": "frontend",
  "level": "INFO",
  "message": "用户点击了'生成报告'按钮",
  "context": {"user_action": "click_generate_report", "page": "/report"}
}
```

| 字段 | 类型 | 必填 | 取值 |
|---|---|---|---|
| `source` | string | ✅ | `backend` / `frontend` / `extension` / `openclaw` |
| `level` | string | ✅ | `DEBUG` / `INFO` / `WARN` / `ERROR` |
| `message` | string | ✅ | 人话日志 |
| `context` | object | ❌ | 任意结构化数据 |

**成功响应**：
```json
{"success": true, "data": {"id": 1234}, "error": null}
```

---

## 6. 健康检查

### 6.1 `GET /`

基础存活检查。

**响应**：
```json
{
  "message": "EatWhat Backend OK",
  "version": "1.0.0",
  "openclaw_status": "running"
}
```

---

## 7. HTMX 调用示例

由于 Web Dashboard 用 HTMX，简单交互通过 HTML 属性直接驱动，不写 JS：

```html
<!-- 立即生成报告，结果显示在 #status -->
<button class="btn btn-primary"
        hx-post="/api/report/generate"
        hx-target="#status"
        hx-swap="innerHTML">立即生成报告</button>
<div id="status"></div>

<!-- 存入冷静期盒子 -->
<form hx-post="/api/cooldown" hx-target="#cooldown-list" hx-swap="afterbegin">
  <input name="url" placeholder="URL" class="input input-bordered" required>
  <textarea name="user_note" placeholder="为什么想看？" class="textarea"></textarea>
  <button type="submit" class="btn">存入</button>
</form>
<div id="cooldown-list"></div>
```

但**报告页因为要画图（ECharts），必须写 JS**：
```html
<script>
fetch('/api/report/latest').then(r => r.json()).then(({data}) => {
  if (!data) {
    document.getElementById('empty').classList.remove('hidden');
    return;
  }
  // 渲染 ECharts 兴趣地图、观点光谱
  echarts.init(document.getElementById('interest-map')).setOption({...});
});
</script>
```

---

## 8. 后端实现备忘（给后端工程师）

### 8.1 路由分文件

```python
# backend/main.py
from fastapi import FastAPI
from routers import ingest, report, bookshelf, cooldown, logs

app = FastAPI(title="EatWhat Backend")
app.include_router(ingest.router)
app.include_router(report.router, prefix="/api/report")
app.include_router(bookshelf.router, prefix="/api/bookshelf")
app.include_router(cooldown.router, prefix="/api/cooldown")
app.include_router(logs.router, prefix="/api")

@app.get("/")
def health():
    return {"message": "EatWhat Backend OK", "version": "1.0.0"}
```

### 8.2 统一响应包装

```python
def ok(data=None):
    return {"success": True, "data": data, "error": None}

def err(message, status=400):
    raise HTTPException(status_code=status, detail={"success": False, "data": None, "error": message})
```

### 8.3 OpenClaw 触发约定

后端**不直接调** DeepSeek。`POST /api/report/generate` 和 `POST /api/bookshelf/refresh` 的实现是：
1. 写一条"触发任务"记录到 SQLite 的某张协调表
2. OpenClaw 端持续监听该表（轮询或文件信号）
3. OpenClaw 跑完 Skill 后写入对应的 `reports` / `bookshelf_items` 表

具体协调机制由后端工程师 + OpenClaw 工程师对齐（详见 `docs/openclaw_skills.md`，待补）。

---

## 9. 变更历史

| 版本 | 日期 | 变更 |
|---|---|---|
| v1.0 | 2026-05-08 | 初版定稿 |

---

*本契约一旦定稿，前后端任一方修改都需在群里通知对方并更新本文档。*
