# EatWhat Bug Tracker

> 统一 bug 追踪器。所有已知 bug、修复状态、修复方案都记录在此。
>
> **规则**：> 1. 发现新 bug 时在表格顶部追加一行；> 2. 修复后更新「状态」「处理方式」「相关文件」列；> 3. 不要删除历史行；> 4. 模块限定为：frontend / backend / extension / openclaw / docs / multi。

---

## Bug 列表

| ID | 发现时间 | 模块 | 现象 | 根因 | 修复方案 | 状态 | 处理人 | 相关文件 |
|---|---|---|---|---|---|---|---|---|
| B-001 | 2026-05-18 | frontend/backend | 点击「生成报告」或「刷新书架」后前端无变化 | 后端接口是异步返回 `{"status":"generating"}`，前端没有轮询最新结果 | 前端点击后每 3 秒轮询 `/api/report/latest` / `/api/bookshelf`，检测到新数据再渲染 | fixed | F 同学 | `frontend/js/report.js`, `frontend/js/bookshelf.js` |
| B-002 | 2026-05-18 | frontend/backend | 冷静期盒子表单提交报 422 | HTMX 默认发送 `application/x-www-form-urlencoded`，但后端 FastAPI 期望 JSON | 引入 `json-enc` 扩展：`hx-ext="json-enc"`，让 HTMX 以 JSON 发送表单 | fixed | F 同学 | `frontend/cooldown.html` |
| B-003 | 2026-05-19 | frontend | 图表首次加载空白 | ECharts 在隐藏元素上初始化时宽高为 0 | 初始化后调用 `chart.resize()` 或 `setTimeout(() => chart.resize(), 100)` | fixed | F 同学 | `frontend/js/report.js` |
| B-004 | 2026-05-19 | frontend | 兴趣地图圆饼图尺寸和文字重叠 | 容器高度不足，图例与饼图重叠 | 调大容器高度，或在 ECharts option 中设置 `legend: { bottom: 0 }` | fixed | F 同学 | `frontend/js/report.js` |
| B-005 | 2026-05-19 | frontend | 冷静期锁定中的链接仍可点击跳转 | 前端渲染时未根据 `status` 区分可点击/不可点击 | 锁定状态用 `<span>` 显示 URL；已解锁状态才用 `<a>` | fixed | F 同学 | `frontend/js/cooldown.js` |
| B-006 | 2026-05-19 | frontend | 书架刷新轮询条件错误，永远等不到更新 | 前端用 `report_id` 判断书架是否刷新，但书架刷新不改变 `report_id` | 改为比较书架条目数量：`items.length > beforeCount` | fixed | F 同学 | `frontend/js/bookshelf.js` |
| B-007 | 2026-05-19 | frontend/UX | 点击生成报告/刷新书架后没有加载提示 | 缺少用户反馈，容易以为没反应 | 点击后立刻显示进度提示文案（如「分析中，预计 20-30 秒」） | fixed | F 同学 | `frontend/js/report.js`, `frontend/js/bookshelf.js` |
| B-008 | 2026-05-19 | frontend/UX | 观点倾向光谱不够直观，中立偏多 | 用圆点/数值表达方向，视觉上不清晰 | 改为横向条形图，x 轴刻度为 负面/中立/正面，按 `lean` 着色 | fixed | F 同学 | `frontend/js/report.js` |
| B-009 | 2026-05-19 | frontend | `opinion_spectrum` 新增 `lean` 字段后前端未做颜色区分 | 前端没接收新字段 | 条形图按 `lean` 值着色：正面绿、负面红、中立灰、两极分化黄 | fixed | F 同学 | `frontend/js/report.js` |
| B-010 | 2026-05-19 | frontend | 报告生成时兴趣地图空白，复制到新标签页才显示 | `mountChart()` 清空 DOM 后同步 `echarts.init()`，此时容器宽度仍为 0 | 用 `requestAnimationFrame` 包裹 `echarts.init()` 和 `setOption()`，确保 layout 完成 | fixed | F 同学 | `frontend/js/report.js` |
| B-011 | 2026-05-21 | frontend | 报告更新后图表仍空白（ECharts 实例失效） | `mountChart()` 清空容器时销毁了 `<canvas>`，但变量仍持有旧实例引用，`setOption` 静默失败 | `renderInterestMap` / `renderOpinionSpectrum` 中先 `dispose()` 旧实例，再 `mountChart()`，再 `init()` 新实例 | fixed | F 同学 | `frontend/js/report.js` |
| B-012 | 2026-05-21 | frontend | 观点倾向光谱 x 轴混乱、方向错误 | `normalizePositionValue()` 把长句解析为 -1/0/1 失败，全部返回 0 | 直接后端输出 `lean` + `weight`，前端改为横向条形图，用 `lean` 决定方向，`weight` 决定长度 | fixed | B 同学 + F 同学 | `backend/routers/report.py`, `openclaw_workspace/skills/analyze-cognition/scripts/analyze_cognition.py`, `frontend/js/report.js` |
| B-013 | 2026-05-21 | frontend/backend | 冷静期项到期后仍停留在「锁定中」列 | 后端 GET `/api/cooldown` 只读不更新；前端倒计时归零后没有刷新列表 | 后端：GET 时自动将 `unlock_at <= now` 的 locked 项更新为 unlocked；前端：倒计时归零调用 `loadCooldownList()` | fixed | B 同学 + F 同学 | `backend/routers/cooldown.py`, `frontend/js/cooldown.js` |
| B-014 | 2026-05-18 | extension | 小红书点赞/评论数抓取不准 | 小红书 SPA 懒加载，数字等页面滚动到视口才渲染，固定延迟不够 | 方案 A（已尝试）：滚动到底再滚回 + 2000ms 延迟；方案 B（更稳）：用 `MutationObserver` 等待数字元素出现 | partial | F 同学 | `extension/content.js` |

---

## 状态说明

| 状态 | 含义 |
|---|---|
| `open` | 已知但未修复 |
| `fixed` | 已修复，需验证 |
| `verified` | 已修复并验证通过 |
| `wontfix` | 确认不修复（需注明原因）|
| `partial` | 部分修复 / 有已知限制 |

---

## 如何添加新 Bug

复制下面模板，在表格顶部新增一行：

```markdown
| B-XXX | YYYY-MM-DD | frontend/backend/extension/openclaw/docs/multi | 一句话现象 | 根因 | 修复方案 | open/fixed/verified/wontfix/partial | 处理人 | 相关文件 |
```

填写要求：
- **现象**：用户可见的问题，不要写实现细节；
- **根因**：技术层面的原因；
- **修复方案**：具体改什么、怎么改；
- **相关文件**：修复涉及的所有文件路径，便于回溯。

---

## 赛后打磨阶段待确认项

以下问题需要在赛后打磨阶段重新验证或补充：

1. B-014 小红书懒加载问题：当前 2000ms 延迟方案是否足够稳定？是否需要升级到 `MutationObserver`？
2. B-003 ~ B-012 中标记为 `fixed` 的 bug，是否在当前代码中确实生效？建议逐条跑一遍端到端验证。
3. 评委反馈中提出的新问题：待补充到本表。
