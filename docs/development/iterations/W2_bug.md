PART 1
需要 F同学处理的问题
  
  ① 图表首次加载空白（必改）
  ECharts 在隐藏元素上初始化时宽高为
  0，图表渲染失败。在图表初始化前或之后调用：
  chart.resize();
  或者用 setTimeout(() => chart.resize(), 100) 确保 DOM 已渲染。

  ② 圆饼图尺寸和文字重叠（必改）
  ECharts 配置里调大容器高度，或在 option 里设置 legend: { 
  bottom: 0 } 把图例挪到底部，避免和饼图重叠。

  ③ 冷静期锁定中的链接可直接跳转（必改）
  渲染列表时判断 status，锁定状态下把 URL 显示为纯文字而非 <a>
  标签：
  status === 'locked'
    ? `<span class="text-gray-400 
  line-through">${item.url}</span>`
    : `<a href=" " target="_blank">${item.url}</a >`

  ④ 书架轮询条件错误（必改）
  前端用 before_report_id 判断书架是否刷新，但书架刷新不会改变
  report_id。轮询条件应该改为比较书架条目数量：
  // 触发前记录当前条目数
  const beforeCount = currentItems.length;
  // 轮询时
  if (res.data.items.length > beforeCount) { // 有新内容了
    renderBookshelf(res.data);
    return;
  }
  
  ⑤ 加载等待提示（建议加）
  点击"生成报告"/"刷新书架"后立刻显示进度提示。参考文案：
  - 生成报告：分析中，预计需要 20-30 秒...
  - 刷新书架：正在生成推荐，预计需要 30-40 秒...

  ⑥ 观点倾向光谱不够直观（优化）
  "中立"偏多是数据问题，UI 上可以把光谱改成水平条形图（横向对比
  更清晰），或只显示非中立的条目。


PART 2
1. 给 F同学的新需求：opinion_spectrum 每条数据新增了 lean 字段，值为
  "正面" / "负面" / "中立" / "两极分化"。建议在光谱图中用颜色区分：

  ┌──────────┬────────────────┐
  │ lean 值  │    建议颜色    │
  ├──────────┼────────────────┤
  │ 正面     │ 绿色 #2d6a4f   │
  ├──────────┼────────────────┤
  │ 负面     │ 红色 #c0392b   │
  ├──────────┼────────────────┤
  │ 中立     │ 灰色 #888      │
  ├──────────┼────────────────┤
  │ 两极分化 │ 渐变色或双色条 │
  └──────────┴────────────────┘

  条形图比饼图更直观——每个 issue 一行，左边显示 issue
  名，右边显示带颜色的 lean 标签 + position
  描述，比光谱的圆点更一目了然。

2. 对于显示报告已生成时兴趣地图仍然是空的，但是复制标签页后新页面  
  会有图表的问题：找到根本原因了。mountChart() 设置 height = '320px'，但紧接着就同步调用
   echarts.init()，此时浏览器还没来得及完成 layout reflow，ECharts
  读到容器宽度是 0，画布就是空的。新标签页能显示是因为打开时 DOM
  已经稳定了。

  给 F同学的精确修改：

  report.js 第109-137行（renderInterestMap 函数），把 mountChart
  之后的初始化包进 requestAnimationFrame：

  改前（第109-137行）：
  mountChart(interestMapNode);
  if (!interestMapChart) {
    interestMapChart = global.echarts.init(interestMapNode);
  }
  interestMapChart.setOption({
    // ...
  });
  setTimeout(function () {
    if (interestMapChart) {
      interestMapChart.resize();
    }
  }, 100);

  改后：
  mountChart(interestMapNode);
  requestAnimationFrame(function () {
    if (!interestMapChart) {
      interestMapChart = global.echarts.init(interestMapNode);
    }
    interestMapChart.setOption({
      // 这里保持原来的 setOption 内容不变，原样复制过来
    });
    setTimeout(function () {
      if (interestMapChart) {
        interestMapChart.resize();
      }
    }, 100);
  });
  
  renderOpinionSpectrum 也要做完全相同的修改——把 echarts.init 和
  setOption 那段也包进 requestAnimationFrame。

  原理：requestAnimationFrame 确保回调在浏览器下一次绘制前执行，此时
  height: 320px 已经完成 layout，ECharts 能读到正确的宽高。