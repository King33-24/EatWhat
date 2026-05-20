# v5 联测：Map Showcase 两个 Bug 修复方案

## Bug 1：报告生成后图表空白（只有新标签页显示）

**现象**：点击「立即生成报告」后提示生成完成，但兴趣地图和观点倾向光谱为空白；复制到新标签页后才显示。

**根因**：`mountChart` 里 `node.textContent = ''` 会清空容器子节点，而 ECharts 的 `<canvas>` 就挂在该节点上。报告更新时再次调用 `mountChart`，导致图表实例失效，但变量仍指向旧实例，`setOption` 静默失败。

**修复**：在 `renderInterestMap` 与（仍使用 ECharts 的）`renderOpinionSpectrum` 中，`mountChart` 之前先销毁旧实例，并把 `if (!chart)` 改为直接 `init`。

```js
// renderInterestMap 中（mountChart 之前）
if (interestMapChart) {
  interestMapChart.dispose();
  interestMapChart = null;
}
mountChart(interestMapNode); // 已存在

// 直接 init（不再用 if 判断）
interestMapChart = global.echarts.init(interestMapNode);
```

```js
// renderOpinionSpectrum 中（仍使用 ECharts 的场景）
if (opinionSpectrumChart) {
  opinionSpectrumChart.dispose();
  opinionSpectrumChart = null;
}
mountChart(opinionSpectrumNode); // 已存在

opinionSpectrumChart = global.echarts.init(opinionSpectrumNode);
```

> 若已按 Bug 2 的方案改为 HTML 卡片，则无需对 `renderOpinionSpectrum` 做此修复。

## Bug 2：观点倾向光谱不清晰

**现象**：观点倾向光谱一眼看不明白。

**根因**：`normalizePositionValue(item.position)` 试图把长句解析为 -1/0/1，但无法匹配，全部返回 0，条形堆叠在中间。

**修复**：放弃 ECharts，改为 HTML 卡片列表，更清晰且不依赖数值解析。

```js
function renderOpinionSpectrum(items) {
  // 不再使用 ECharts，改为 HTML 卡片列表
  if (opinionSpectrumChart) {
    opinionSpectrumChart.dispose();
    opinionSpectrumChart = null;
  }
  // 重置容器
  opinionSpectrumNode.classList.remove('eatwhat-chart-placeholder');
  opinionSpectrumNode.style.height = '';
  opinionSpectrumNode.textContent = '';

  if (!Array.isArray(items) || items.length === 0) {
    markChartPlaceholder(opinionSpectrumNode, '暂无观点倾向数据');
    setOpinionTip('');
    return;
  }

  var leanStyleMap = {
    '正面': { bg: '#f0faf4', border: '#2d6a4f', badge: '#2d6a4f', text: '正面 ↑' },
    '负面': { bg: '#fff5f5', border: '#c0392b', badge: '#c0392b', text: '负面 ↓' },
    '两极分化': { bg: '#fffbeb', border: '#b7791f', badge: '#b7791f', text: '两极分化' },
    '中立': { bg: '#f9f9f9', border: '#aaa', badge: '#888', text: '中立' }
  };

  items.forEach(function (item) {
    var lean = normalizeLeanValue(item.lean) || inferLeanFromPosition(item.position) || '中立';
    var style = leanStyleMap[lean] || leanStyleMap['中立'];

    var card = document.createElement('div');
    card.style.cssText = 'background:' + style.bg + ';border:1px solid ' + style.border + ';border-radius:8px;padding:12px 16px;margin-bottom:10px;';

    var header = document.createElement('div');
    header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;';

    var issue = document.createElement('span');
    issue.style.cssText = 'font-weight:600;font-size:14px;';
    issue.textContent = String(item.issue || '未命名议题');

    var badge = document.createElement('span');
    badge.style.cssText = 'font-size:12px;padding:2px 8px;border-radius:99px;background:' + style.badge + ';color:#fff;white-space:nowrap;';
    badge.textContent = style.text;

    header.appendChild(issue);
    header.appendChild(badge);

    var position = document.createElement('p');
    position.style.cssText = 'font-size:13px;color:#555;margin:0;line-height:1.5;';
    position.textContent = String(item.position || '');

    card.appendChild(header);
    card.appendChild(position);
    opinionSpectrumNode.appendChild(card);
  });

  var neutralCount = items.filter(function (i) {
    return (normalizeLeanValue(i.lean) || '中立') === '中立';
  }).length;
  setOpinionTip(neutralCount > 0
    ? '共 ' + items.length + ' 个议题，其中 ' + neutralCount + ' 个内容客观中立'
    : '共 ' + items.length + ' 个议题');
}
```
