'use strict';

(function initBookshelfPage(global) {
  function setStatus(node, kind, message) {
    node.className = 'alert text-sm text-base-content/80';
    if (kind === 'success') {
      node.classList.add('bg-[#eafaf1]');
    } else if (kind === 'error') {
      node.classList.add('bg-[#fdecea]');
    } else {
      node.classList.add('bg-[var(--eatwhat-highlight)]');
    }
    node.textContent = message;
  }

  function sleep(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function normalizeItems(data) {
    if (!data || !Array.isArray(data.items)) {
      return [];
    }
    return data.items;
  }

  function createBookshelfFingerprint(data) {
    var items = normalizeItems(data);
    if (items.length === 0) {
      return 'empty';
    }
    var latestCreatedAt = '';
    items.forEach(function (item) {
      if (item.created_at && item.created_at > latestCreatedAt) {
        latestCreatedAt = item.created_at;
      }
    });
    return String(data.report_id || '') + ':' + String(items.length) + ':' + latestCreatedAt;
  }

  global.addEventListener('DOMContentLoaded', function () {
    var api = global.EatWhat && global.EatWhat.api;
    var logger = global.EatWhat && global.EatWhat.logger;
    var refreshButton = document.getElementById('bookshelf-refresh-btn');
    var statusNode = document.getElementById('bookshelf-status');
    var listNode = document.getElementById('bookshelf-list');
    var chatState = {};
    var snapshot = {
      fingerprint: 'empty',
      reportId: null,
      itemCount: 0
    };

    function pageLog(level, message, context) {
      if (!logger) {
        return;
      }
      logger.log('frontend', level, message, Object.assign({ page: '/bookshelf.html' }, context || {}));
    }

    function getChatState(itemId) {
      if (!chatState[itemId]) {
        chatState[itemId] = {
          sessionId: null,
          context: ''
        };
      }
      return chatState[itemId];
    }

    function appendChatMessage(itemId, role, message) {
      var list = document.getElementById('chat-messages-' + itemId);
      if (!list) {
        return;
      }

      var bubble = document.createElement('div');
      bubble.className = 'rounded-md px-3 py-2 text-sm';
      bubble.style.maxWidth = '85%';
      bubble.style.wordBreak = 'break-word';
      if (role === 'user') {
        bubble.style.marginLeft = 'auto';
        bubble.style.backgroundColor = '#dcfce7';
        bubble.style.color = '#14532d';
        bubble.style.border = '1px solid #86efac';
        bubble.textContent = '我：' + message;
      } else {
        bubble.style.marginRight = 'auto';
        bubble.style.backgroundColor = '#eef2f7';
        bubble.style.color = '#1f2937';
        bubble.style.border = '1px solid #d1d5db';
        bubble.textContent = '问膳：' + message;
      }
      list.appendChild(bubble);
      list.scrollTop = list.scrollHeight;
    }

    function resetChat(itemId, contextText) {
      var state = getChatState(itemId);
      var list = document.getElementById('chat-messages-' + itemId);
      if (!list) {
        return;
      }
      state.sessionId = null;
      state.context = contextText || '';
      list.innerHTML = '';
      appendChatMessage(itemId, 'assistant', '你好，我会基于这条书架内容继续追问你。');
    }

    async function sendChat(itemId, message) {
      var state = getChatState(itemId);
      var body = {
        message: message,
        session_id: state.sessionId
      };
      if (state.context && !state.sessionId) {
        body.context = state.context;
      }
      var result = await api.post('/api/chat', body);
      state.sessionId = result.data.session_id;
      return result.data.reply;
    }

    function buildItemCard(item) {
      var card = document.createElement('article');
      card.className = 'card eatwhat-card bg-base-100';

      var body = document.createElement('div');
      body.className = 'card-body gap-3';

      var titleRow = document.createElement('div');
      titleRow.className = 'flex items-center justify-between gap-2';

      var title = document.createElement('h2');
      title.className = 'card-title text-lg';
      title.textContent = String(item.title || '未命名推荐项');

      var source = document.createElement('span');
      source.className = 'badge badge-outline';
      source.textContent = String(item.source_type || 'unknown');

      titleRow.appendChild(title);
      titleRow.appendChild(source);

      var link = document.createElement('a');
      link.className = 'link link-primary break-all text-sm';
      link.href = String(item.url || '#');
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = String(item.url || '无链接');

      var contrastCard = document.createElement('div');
      contrastCard.className = 'rounded-md border border-[var(--eatwhat-main)]/30 bg-[var(--eatwhat-highlight)] p-3 text-sm';
      contrastCard.textContent = String(item.contrast_card || '暂无差异对比说明');

      var authorIntro = document.createElement('div');
      authorIntro.className = 'rounded-md border border-base-300 bg-white/80 p-3 text-sm text-base-content/75';
      authorIntro.textContent = String(item.author_intro || '暂无作者背景信息');

      var actionRow = document.createElement('div');
      actionRow.className = 'card-actions justify-end';

      var toggleButton = document.createElement('button');
      toggleButton.className = 'btn btn-sm eatwhat-btn-main';
      toggleButton.type = 'button';
      toggleButton.setAttribute('data-chat-toggle', 'true');
      toggleButton.setAttribute('data-item-id', String(item.id));
      toggleButton.textContent = '苏格拉底追问';
      actionRow.appendChild(toggleButton);

      var panel = document.createElement('div');
      panel.className = 'hidden rounded-md border border-base-300 bg-white/80 p-3';
      panel.id = 'chat-panel-' + item.id;
      panel.setAttribute('data-context', String(item.contrast_card || ''));

      var messages = document.createElement('div');
      messages.className = 'mb-3 flex max-h-56 flex-col gap-2 overflow-y-auto text-sm';
      messages.id = 'chat-messages-' + item.id;

      var form = document.createElement('form');
      form.className = 'flex gap-2';
      form.setAttribute('data-chat-form', 'true');
      form.setAttribute('data-item-id', String(item.id));

      var input = document.createElement('input');
      input.className = 'input input-bordered input-sm flex-1';
      input.name = 'message';
      input.placeholder = '输入你想追问的问题';
      input.required = true;

      var submitButton = document.createElement('button');
      submitButton.className = 'btn btn-sm eatwhat-btn-main';
      submitButton.type = 'submit';
      submitButton.textContent = '发送';

      form.appendChild(input);
      form.appendChild(submitButton);
      panel.appendChild(messages);
      panel.appendChild(form);

      body.appendChild(titleRow);
      body.appendChild(link);
      body.appendChild(contrastCard);
      body.appendChild(authorIntro);
      body.appendChild(actionRow);
      body.appendChild(panel);
      card.appendChild(body);
      return card;
    }

    function renderBookshelf(data) {
      var items = normalizeItems(data);
      listNode.innerHTML = '';
      chatState = {};

      if (items.length === 0) {
        var emptyCard = document.createElement('article');
        emptyCard.className = 'card eatwhat-card bg-base-100';
        var emptyBody = document.createElement('div');
        emptyBody.className = 'card-body text-sm text-base-content/70';
        emptyBody.textContent = '书架还没有推荐项。先生成报告，再点“刷新书架”。';
        emptyCard.appendChild(emptyBody);
        listNode.appendChild(emptyCard);
        return;
      }

      items.forEach(function (item) {
        listNode.appendChild(buildItemCard(item));
      });
    }

    function updateSnapshot(data) {
      var items = normalizeItems(data);
      snapshot.fingerprint = createBookshelfFingerprint(data);
      snapshot.reportId = data && data.report_id ? data.report_id : null;
      snapshot.itemCount = items.length;
    }

    async function fetchBookshelf() {
      var result = await api.get('/api/bookshelf');
      return result.data;
    }

    async function loadBookshelf() {
      if (!api) {
        setStatus(statusNode, 'error', '初始化失败：EatWhat.api 不可用');
        return;
      }
      var data = await fetchBookshelf();
      updateSnapshot(data);
      renderBookshelf(data);
      if (snapshot.itemCount > 0) {
        setStatus(statusNode, 'info', '当前书架 report_id=' + snapshot.reportId + '，共 ' + snapshot.itemCount + ' 条推荐。');
      } else {
        setStatus(statusNode, 'info', '当前书架为空。点击“刷新书架”后将自动轮询最新结果。');
      }
    }

    async function refreshBookshelf() {
      if (!api) {
        setStatus(statusNode, 'error', '请求失败：EatWhat.api 不可用');
        return;
      }

      var beforeFingerprint = snapshot.fingerprint;
      refreshButton.disabled = true;
      setStatus(statusNode, 'info', '书架刷新任务已触发，正在处理中（每 3 秒自动检查一次）…');
      pageLog('INFO', '点击刷新书架', { before_report_id: snapshot.reportId });

      try {
        await api.post('/api/bookshelf/refresh');
        for (var i = 0; i < 20; i += 1) {
          await sleep(3000);
          var latest = await fetchBookshelf();
          var latestFingerprint = createBookshelfFingerprint(latest);
          if (latestFingerprint !== beforeFingerprint) {
            updateSnapshot(latest);
            renderBookshelf(latest);
            setStatus(statusNode, 'success', '书架已更新：report_id=' + (snapshot.reportId || '-') + '，共 ' + snapshot.itemCount + ' 条推荐。');
            pageLog('INFO', '书架刷新完成', { report_id: snapshot.reportId, item_count: snapshot.itemCount });
            return;
          }
        }
        setStatus(statusNode, 'error', '等待超时：书架仍在刷新中，请稍后再试。');
        pageLog('WARN', '书架轮询超时');
      } catch (error) {
        setStatus(statusNode, 'error', '刷新失败：' + error.message);
        pageLog('ERROR', '书架刷新失败', { error: error.message });
      } finally {
        refreshButton.disabled = false;
      }
    }

    listNode.addEventListener('click', function (event) {
      var button = event.target.closest('[data-chat-toggle]');
      if (!button) {
        return;
      }

      var itemId = button.getAttribute('data-item-id');
      var panel = document.getElementById('chat-panel-' + itemId);
      if (!panel) {
        return;
      }

      var shouldOpen = panel.classList.contains('hidden');
      panel.classList.toggle('hidden');
      button.textContent = shouldOpen ? '收起追问' : '苏格拉底追问';
      if (shouldOpen) {
        resetChat(itemId, panel.getAttribute('data-context') || '');
      }
    });

    listNode.addEventListener('submit', async function (event) {
      var form = event.target.closest('[data-chat-form]');
      if (!form) {
        return;
      }
      event.preventDefault();

      var itemId = form.getAttribute('data-item-id');
      var input = form.querySelector('input[name="message"]');
      var submitButton = form.querySelector('button[type="submit"]');
      var message = input.value.trim();
      if (!message) {
        return;
      }

      input.value = '';
      appendChatMessage(itemId, 'user', message);
      submitButton.disabled = true;

      try {
        var reply = await sendChat(itemId, message);
        appendChatMessage(itemId, 'assistant', reply);
      } catch (error) {
        appendChatMessage(itemId, 'assistant', '请求失败：' + error.message);
      } finally {
        submitButton.disabled = false;
      }
    });

    if (refreshButton) {
      refreshButton.addEventListener('click', refreshBookshelf);
    }

    loadBookshelf().catch(function (error) {
      setStatus(statusNode, 'error', '初始化失败：' + error.message);
      pageLog('ERROR', '书架初始化失败', { error: error.message });
    });

    pageLog('INFO', '进入平行书架页');
  });
})(window);
