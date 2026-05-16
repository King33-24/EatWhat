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
  
  ---
