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