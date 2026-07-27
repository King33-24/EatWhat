联调发现两个问题，一个是点击生成报告或者刷新书架后前端看不到，一个是冷静期盒子我尝试存存不进去

1. 给F同学的反馈（前端点击无反应）：

  后端 POST /api/report/generate 是异步的，立刻返回
  {"status":"generating"}，脚本在后台跑 15-20 秒。前端点击后需要轮询 GET
  /api/report/latest，检测到新报告再刷新页面。

  参考逻辑：
  async function generateAndPoll() {
    await fetch('/api/report/generate', { method: 'POST' });
    // 每3秒轮询一次，最多等60秒
    const before = currentReportId; // 记录触发前的报告 id
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 3000));
      const res = await fetch('/api/report/latest').then(r => r.json());
      if (res.data && res.data.id !== before) {
        // 有新报告了，刷新页面展示
        renderReport(res.data);
        return;
      }
    }
    // 超时提示
    alert('报告生成超时，请稍后刷新页面');
  }
  书架刷新的 POST /api/bookshelf/refresh 也是同样逻辑。

2. 冷静期盒子 422 — 前后端数据格式不匹配
  
  根本原因：HTMX 表单默认发送 application/x-www-form-urlencoded，但后端
  FastAPI 期望 application/json。

  给 F同学的修复方案（改两处）：

  在 cooldown.html 的 <head> 里加一行 JS 扩展：
  <script 
  src="https://unpkg.com/htmx-ext-json-enc@2.0.1/json-enc.js"></script>
  
  然后在 <form> 标签加 hx-ext="json-enc"：
  <form hx-post="/api/cooldown"
        hx-ext="json-enc"
        hx-target="#cooldown-status"
        ...>

  这样 HTMX 就会把表单字段序列化成 JSON 发给后端，422 消失。