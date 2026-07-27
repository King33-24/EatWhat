1. 今晚改动清单（给F同学）

  后端新增/改动了什么

  ① 新文件：backend/routers/chat.py
  新增 POST /api/chat 接口，把前端消息代理给 OpenClaw
  Agent，实现嵌入式苏格拉底对话。

  请求体：
  {
    "message": "你怎么看躺平？",
    "session_id": null,
    "context": "（可选）书架卡片的对比文字"
  }
  响应：
  {
    "success": true,
    "data": {
      "reply": "你觉得躺平背后最根本的原因是什么？",
      "session_id": "550e8400-e29b-41d4-a716-446655440000"
    },
    "error": null
  }

  ② POST /ingest 新增字段 note_type
  值为 "image" 或 "video"。后端会自动推断（images_count==0
  时认为是视频），但如果前端能主动传更准确。

  ---
  F同学需要做的改动
  
  改动一：bookshelf.html — 内嵌聊天框（代替原来跳转 WebChat）

  每条书架卡片下的"苏格拉底追问"按钮，点击后展开一个聊天框，
  用 JS 调用 /api/chat：

  // js/chat.js 或直接写在 bookshelf.html 的 <script> 里
  let sessionId = null;

  async function sendChat(message, contextText = null) {
    const body = { message, session_id: sessionId };
    if (contextText && !sessionId) body.context =
  contextText;

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const json = await res.json();
    if (json.success) {
      sessionId = json.data.session_id;   // 保存，下轮传回
      return json.data.reply;
    }
    throw new Error(json.error);
  }

  每次打开一条新书架卡片的聊天时，把 sessionId 重置为
  null，这样每张卡片是独立的对话。

  改动二：content.js — 上报 note_type

  在 extractNoteData() 里加一行判断：
  const isVideo = document.querySelector('video') !== null;
  // 然后在 payload 里加：
  note_type: isVideo ? 'video' : 'image',

  改动三：content.js — 点赞/评论数加延迟

  小红书是 SPA，点赞/评论数会懒加载，建议在抓取前加 500ms
  等待：
  // 把 extractNoteData() 的调用包一层
  setTimeout(() => {
    const data = extractNoteData();
    chrome.runtime.sendMessage(data);
  }, 500);
  
点赞/评论数延时也没用（有空再修）
  
  500ms 不够，因为小红书不是等固定时间加载，而是等页面滚到对应位置才
  渲染（懒加载 + 视口触发）。纯延时解决不了。

  有两个可用方案，按难度排：

  方案A（推荐，简单）— 加长延时 + 滚动触发

  在 content.js 里，先模拟滚动一次让数据区进入视口，再等更长时间：

  // 触发懒加载
  window.scrollTo(0, document.body.scrollHeight);
  setTimeout(() => window.scrollTo(0, 0), 300);

  // 等足够长再抓
  setTimeout(() => {
    const data = extractNoteData();
    chrome.runtime.sendMessage(data);
  }, 2000);  // 500ms 改成 2000ms

  方案B（更稳，稍复杂）— MutationObserver 等元素出现

  function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const el = document.querySelector(selector);
      if (el) return resolve(el);
      const observer = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) { observer.disconnect(); resolve(el); }
      });
      observer.observe(document.body, { childList: true, subtree:
  true });
      setTimeout(() => { observer.disconnect(); reject(); },
  timeout);
    });
  }

  // 等点赞数元素出现再抓
  waitForElement('.like-count选择器')  // 改成实际的 class
    .then(() => {
      const data = extractNoteData();
      chrome.runtime.sendMessage(data);
    })
    .catch(() => {
      // 超时了也发，数字可能不准
      chrome.runtime.sendMessage(extractNoteData());
    });

  实际建议：先让F同学试方案A（改成2000ms +
  加滚动），成本低。如果还是不行再上方案B。另外，点赞/评论数对
  analyze_cognition
  分析影响有限，主要信息源是笔记正文和标签，数字不准不影响核心功能，
  可以在技术报告里注明"受平台懒加载机制影响，互动数据为近似值"。

  ---
