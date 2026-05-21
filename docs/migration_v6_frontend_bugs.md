# Frontend Bug Fix Guide — v6

> 给 F同学 / Copilot：以下三个 bug 需在 `frontend/js/report.js` 和 `frontend/js/cooldown.js` 中修复。
> 后端已同步修复配套问题，前端按本文档操作即可。

---

## Bug 1：兴趣地图 & 观点光谱在"报告已生成"后仍为空白，刷新后才出现

### 根本原因

`mountChart(node)` 函数（report.js 约第 146 行）执行了 `node.textContent = ''`，这会清空 DOM 节点，
**同时销毁 ECharts 在该节点内创建的 `<canvas>` 子元素**。
但 `interestMapChart` / `opinionSpectrumChart` 变量仍持有已失效的 ECharts 实例引用。
后续 `setOption` 在失效实例上调用，静默失败，图表不显示。

### 修复方法

在 `renderInterestMap` 和 `renderOpinionSpectrum` 函数中，**先 dispose 旧实例，再调 mountChart，再 init 新实例**。

#### 修改 `renderInterestMap`（约第 159 行）

将：
```js
var renderTick = interestMapRenderTick;
if (interestMapChart) {
  interestMapChart.dispose();
  interestMapChart = null;
}
mountChart(interestMapNode);
requestAnimationFrame(function () {
  if (renderTick !== interestMapRenderTick) {
    return;
  }
  interestMapChart = global.echarts.init(interestMapNode);
```

确认顺序是：**dispose → mountChart → requestAnimationFrame 内 init**。
如果当前代码顺序不对（比如 dispose 在 mountChart 之后），调整为上面顺序即可。

同时，在函数开头的"数据为空"分支中，也要先 dispose：
```js
if (!Array.isArray(items) || items.length === 0) {
  if (interestMapChart) {
    interestMapChart.dispose();
    interestMapChart = null;
  }
  markChartPlaceholder(interestMapNode, '暂无兴趣地图数据');
  return;
}
```

#### 修改 `renderOpinionSpectrum`（约第 213 行）

当前 `renderOpinionSpectrum` 已改为 HTML card 渲染（不再用 ECharts）：
- 函数开头直接 dispose 旧 ECharts 实例并置 null
- **不要调用 `mountChart`**，直接操作 `opinionSpectrumNode.innerHTML = ''` 或逐个 `appendChild`

如果当前代码仍在调用 `mountChart(opinionSpectrumNode)`，请删除该调用，改为：
```js
opinionSpectrumNode.innerHTML = '';
opinionSpectrumNode.style.height = '';  // 重置高度，让内容自然撑开
```

---

## Bug 2：观点倾向光谱显示不清晰（x 轴混乱、方向错误）

### 期望效果

- ECharts 横向条形图
- x 轴只有三个刻度：**负面（左）/ 中立（中）/ 正面（右）**，数值范围 `-1` 到 `1`
- 每个议题一条横条，从 x=0 向左（负面）或向右（正面）延伸
- 延伸长度 = `weight` 字段（0.0-1.0，后端已输出），表示浏览频率占比
- 颜色：正面→绿色 `#2d6a4f`，负面→红色 `#c0392b`，中立→灰色 `#888`

### 后端数据格式（已更新）

`GET /api/report/latest` 返回的 `opinion_spectrum` 数组中，每项现在包含 `weight` 字段：
```json
{
  "issue": "高考与学业压力",
  "position": "用户接触的内容普遍传递焦虑和压力",
  "lean": "负面",
  "weight": 0.6,
  "evidence": "..."
}
```

### 修复方法

**完整替换 `renderOpinionSpectrum` 函数**，用以下实现：

```js
function renderOpinionSpectrum(items) {
  opinionSpectrumRenderTick += 1;

  // dispose 旧 ECharts 实例（如有）
  if (opinionSpectrumChart) {
    opinionSpectrumChart.dispose();
    opinionSpectrumChart = null;
  }

  opinionSpectrumNode.innerHTML = '';
  opinionSpectrumNode.style.height = '';
  setOpinionTip('');

  if (!Array.isArray(items) || items.length === 0) {
    markChartPlaceholder(opinionSpectrumNode, '暂无观点倾向数据');
    return;
  }

  if (!global.echarts) {
    markChartPlaceholder(opinionSpectrumNode, 'ECharts 未加载，无法绘制观点光谱。');
    return;
  }

  var renderTick = opinionSpectrumRenderTick;
  opinionSpectrumNode.style.height = (items.length * 48 + 80) + 'px';

  // 将 lean 转换为方向值：正面=1，负面=-1，中立=0
  function leanToDir(lean) {
    if (lean === '正面') return 1;
    if (lean === '负面') return -1;
    return 0;
  }

  // 颜色映射
  function leanToColor(lean) {
    if (lean === '正面') return '#2d6a4f';
    if (lean === '负面') return '#c0392b';
    if (lean === '两极分化') return '#b7791f';
    return '#888';
  }

  var seriesData = items.map(function (item) {
    var dir = leanToDir(item.lean || '');
    var w = typeof item.weight === 'number' ? Math.max(0, Math.min(1, item.weight)) : 0.3;
    return {
      value: dir * w,
      itemStyle: { color: leanToColor(item.lean || '') }
    };
  });

  requestAnimationFrame(function () {
    if (renderTick !== opinionSpectrumRenderTick) return;

    opinionSpectrumChart = global.echarts.init(opinionSpectrumNode);
    opinionSpectrumChart.setOption({
      grid: { left: '30%', right: '8%', top: 20, bottom: 40 },
      xAxis: {
        type: 'value',
        min: -1,
        max: 1,
        axisLabel: {
          formatter: function (v) {
            if (v === -1) return '负面';
            if (v === 0) return '中立';
            if (v === 1) return '正面';
            return '';
          },
          interval: 1
        },
        splitLine: { lineStyle: { type: 'dashed', color: '#ddd' } },
        axisLine: { show: true }
      },
      yAxis: {
        type: 'category',
        data: items.map(function (item) { return String(item.issue || '未命名'); }),
        axisLabel: {
          width: 120,
          overflow: 'truncate',
          fontSize: 12
        }
      },
      tooltip: {
        trigger: 'item',
        formatter: function (params) {
          var item = items[params.dataIndex];
          return (item.issue || '') + '<br/>' + (item.position || '') + '<br/>倾向：' + (item.lean || '中立');
        }
      },
      series: [{
        type: 'bar',
        data: seriesData,
        barMaxWidth: 24,
        label: {
          show: true,
          position: function (params) {
            return params.value >= 0 ? 'right' : 'left';
          },
          formatter: function (params) {
            var item = items[params.dataIndex];
            return item.lean || '中立';
          },
          fontSize: 11
        }
      }]
    });

    setTimeout(function () {
      if (opinionSpectrumChart) opinionSpectrumChart.resize();
    }, 100);
  });

  var neutralCount = items.filter(function (i) { return (i.lean || '') === '中立'; }).length;
  setOpinionTip(neutralCount > 0
    ? '共 ' + items.length + ' 个议题，其中 ' + neutralCount + ' 个内容客观中立'
    : '共 ' + items.length + ' 个议题');
}
```

> **注意**：`opinionSpectrumNode.style.height` 要在 `requestAnimationFrame` 前设置，
> 这样 ECharts init 时容器已有高度，不会画成 0px。

---

## Bug 3：冷静期项到期后仍停留在"锁定中"列，不自动移入"已解锁"

### 根本原因

**后端**：`GET /api/cooldown` 只读数据，不更新状态——到期项 `status` 字段在 DB 里仍是 `locked`。  
（后端已在本次 v6 中修复：GET 请求时自动将 `unlock_at <= now` 的 locked 项更新为 unlocked。）

**前端**：倒计时归零后没有重新请求数据，界面停留在旧状态。

### 修复方法（`frontend/js/cooldown.js`）

在倒计时逻辑中，当剩余时间归零时，**自动调用一次数据刷新函数**（即重新 fetch `/api/cooldown` 并重新渲染列表）。

伪代码示意：
```js
// 假设现有倒计时逻辑大致如下：
function startCountdown(itemId, remainingSeconds, onExpire) {
  var timer = setInterval(function () {
    remainingSeconds -= 1;
    updateCountdownDisplay(itemId, remainingSeconds);
    if (remainingSeconds <= 0) {
      clearInterval(timer);
      onExpire();  // ← 这里触发刷新
    }
  }, 1000);
}

// 调用时传入刷新函数：
startCountdown(item.id, item.remaining_seconds, function () {
  loadCooldownList();  // 重新 fetch 并渲染整个列表
});
```

如果当前代码没有倒计时到零的回调，找到 `setInterval` 更新倒计时的地方，在 `remaining <= 0` 分支加：
```js
clearInterval(timer);
loadCooldownList();  // 或你的列表刷新函数名
```

后端已确保：刷新请求发出后，到期项的 `status` 会是 `unlocked`，前端按 `status` 分栏渲染即可正确显示。

---

## 修改文件汇总

| 文件 | 修改内容 |
|------|----------|
| `frontend/js/report.js` | 1. `renderInterestMap`：确认 dispose→mountChart→init 顺序；空数据分支也先 dispose |
| `frontend/js/report.js` | 2. 完整替换 `renderOpinionSpectrum`：改用 ECharts 横条图，x 轴 负面/中立/正面，用 `lean` + `weight` 字段 |
| `frontend/js/cooldown.js` | 3. 倒计时归零时调用列表刷新函数 |

后端已修改（无需前端额外操作）：
- `backend/routers/cooldown.py`：GET 时自动解锁到期项
- `openclaw_workspace/skills/analyze-cognition/scripts/analyze_cognition.py`：opinion_spectrum 各项新增 `weight` 字段
