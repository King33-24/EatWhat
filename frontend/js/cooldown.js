'use strict';

(function initCooldownPage(global) {
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

  function formatDate(isoText) {
    if (!isoText) {
      return '-';
    }
    var date = new Date(isoText);
    if (Number.isNaN(date.getTime())) {
      return String(isoText);
    }
    return date.toLocaleString('zh-CN', { hour12: false });
  }

  function formatRemaining(seconds) {
    var total = Math.max(0, Number(seconds) || 0);
    var day = Math.floor(total / 86400);
    var hour = Math.floor((total % 86400) / 3600);
    var minute = Math.floor((total % 3600) / 60);
    var second = total % 60;
    if (day > 0) {
      return day + '天 ' + hour + '时 ' + minute + '分';
    }
    return hour + '时 ' + minute + '分 ' + second + '秒';
  }

  function createEmptyCard(text, borderClass) {
    var card = document.createElement('div');
    card.className = 'rounded-lg border ' + borderClass + ' bg-white/80 p-3 text-sm text-base-content/70';
    card.textContent = text;
    return card;
  }

  global.addEventListener('DOMContentLoaded', function () {
    var api = global.EatWhat && global.EatWhat.api;
    var logger = global.EatWhat && global.EatWhat.logger;
    var form = document.getElementById('cooldown-form');
    var statusNode = document.getElementById('cooldown-status');
    var lockedListNode = document.getElementById('cooldown-locked-list');
    var unlockedListNode = document.getElementById('cooldown-unlocked-list');
    var countdownTimer = null;
    var refreshTimer = null;

    function pageLog(level, message, context) {
      if (!logger) {
        return;
      }
      logger.log('frontend', level, message, Object.assign({ page: '/cooldown.html' }, context || {}));
    }

    function getCooldownItemsByStatus(items, status) {
      return items.filter(function (item) {
        return item.status === status;
      });
    }

    function buildLockedCard(item) {
      var card = document.createElement('article');
      card.className = 'rounded-lg border border-[var(--eatwhat-alert)]/30 bg-white/80 p-3';

      var title = document.createElement('h3');
      title.className = 'text-sm font-semibold';
      title.textContent = String(item.title || '未命名链接');

      var link = document.createElement('span');
      link.className = 'mt-1 block break-all text-sm text-gray-400 line-through';
      link.textContent = String(item.url || '无链接');

      var note = document.createElement('p');
      note.className = 'mt-2 text-xs text-base-content/70';
      note.textContent = '备注：' + String(item.user_note || '无');

      var unlockAt = document.createElement('p');
      unlockAt.className = 'mt-1 text-xs text-base-content/60';
      unlockAt.textContent = '解锁时间：' + formatDate(item.unlock_at);

      var remaining = document.createElement('p');
      remaining.className = 'mt-2 text-sm font-semibold text-[var(--eatwhat-alert)]';
      remaining.setAttribute('data-remaining-seconds', String(item.remaining_seconds || 0));
      remaining.textContent = '剩余：' + formatRemaining(item.remaining_seconds || 0);

      card.appendChild(title);
      card.appendChild(link);
      card.appendChild(note);
      card.appendChild(unlockAt);
      card.appendChild(remaining);
      return card;
    }

    function buildUnlockedCard(item) {
      var card = document.createElement('article');
      card.className = 'rounded-lg border border-[var(--eatwhat-unlock)]/30 bg-white/80 p-3';

      var title = document.createElement('h3');
      title.className = 'text-sm font-semibold';
      title.textContent = String(item.title || '未命名链接');

      var link = document.createElement('a');
      link.className = 'link link-primary mt-1 block break-all text-sm';
      link.href = String(item.url || '#');
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = String(item.url || '无链接');

      var note = document.createElement('p');
      note.className = 'mt-2 text-xs text-base-content/70';
      note.textContent = '备注：' + String(item.user_note || '无');

      var unlockAt = document.createElement('p');
      unlockAt.className = 'mt-1 text-xs text-base-content/60';
      unlockAt.textContent = '已解锁：' + formatDate(item.unlock_at);

      var actions = document.createElement('div');
      actions.className = 'mt-3 flex justify-end';

      var discardBtn = document.createElement('button');
      discardBtn.className = 'btn btn-xs btn-outline';
      discardBtn.type = 'button';
      discardBtn.setAttribute('data-discard-id', String(item.id));
      discardBtn.textContent = '丢弃';

      actions.appendChild(discardBtn);
      card.appendChild(title);
      card.appendChild(link);
      card.appendChild(note);
      card.appendChild(unlockAt);
      card.appendChild(actions);
      return card;
    }

    function startCountdownTicker() {
      if (countdownTimer) {
        clearInterval(countdownTimer);
      }
      countdownTimer = setInterval(function () {
        var shouldRefresh = false;
        document.querySelectorAll('[data-remaining-seconds]').forEach(function (node) {
          var current = Number(node.getAttribute('data-remaining-seconds')) || 0;
          var next = Math.max(0, current - 1);
          node.setAttribute('data-remaining-seconds', String(next));
          node.textContent = next > 0 ? '剩余：' + formatRemaining(next) : '已到解锁时间，等待状态刷新…';
          if (current > 0 && next === 0) {
            shouldRefresh = true;
          }
        });
        if (shouldRefresh) {
          loadCooldown();
        }
      }, 1000);
    }

    function renderCooldown(items) {
      var lockedItems = getCooldownItemsByStatus(items, 'locked');
      var unlockedItems = getCooldownItemsByStatus(items, 'unlocked');

      lockedListNode.innerHTML = '';
      unlockedListNode.innerHTML = '';

      if (lockedItems.length === 0) {
        lockedListNode.appendChild(createEmptyCard('当前没有锁定中的链接。', 'border-[var(--eatwhat-alert)]/20'));
      } else {
        lockedItems.sort(function (a, b) {
          return String(a.unlock_at).localeCompare(String(b.unlock_at));
        });
        lockedItems.forEach(function (item) {
          lockedListNode.appendChild(buildLockedCard(item));
        });
      }

      if (unlockedItems.length === 0) {
        unlockedListNode.appendChild(createEmptyCard('当前没有已解锁链接。', 'border-[var(--eatwhat-unlock)]/20'));
      } else {
        unlockedItems.sort(function (a, b) {
          return String(b.unlock_at).localeCompare(String(a.unlock_at));
        });
        unlockedItems.forEach(function (item) {
          unlockedListNode.appendChild(buildUnlockedCard(item));
        });
      }

      startCountdownTicker();
    }

    async function loadCooldown() {
      if (!api) {
        setStatus(statusNode, 'error', '初始化失败：EatWhat.api 不可用');
        return;
      }
      var result = await api.get('/api/cooldown');
      var items = Array.isArray(result.data) ? result.data : [];
      renderCooldown(items);
      var lockedCount = getCooldownItemsByStatus(items, 'locked').length;
      var unlockedCount = getCooldownItemsByStatus(items, 'unlocked').length;
      setStatus(statusNode, 'info', '已加载冷静期列表：locked=' + lockedCount + '，unlocked=' + unlockedCount + '。');
    }

    async function submitCooldownForm(event) {
      event.preventDefault();
      if (!api) {
        setStatus(statusNode, 'error', '请求失败：EatWhat.api 不可用');
        return;
      }

      var submitButton = form.querySelector('button[type="submit"]');
      var formData = new FormData(form);
      var payload = {
        url: String(formData.get('url') || '').trim(),
        title: String(formData.get('title') || '').trim() || null,
        user_note: String(formData.get('user_note') || '').trim() || null,
        lock_days: Number(formData.get('lock_days') || 7)
      };

      submitButton.disabled = true;
      setStatus(statusNode, 'info', '正在存入冷静期…');
      pageLog('INFO', '提交冷静期表单', { lock_days: payload.lock_days });

      try {
        await api.post('/api/cooldown', payload);
        form.reset();
        var lockDaysInput = form.querySelector('input[name="lock_days"]');
        lockDaysInput.value = '7';
        setStatus(statusNode, 'success', '已存入冷静期，列表已更新。');
        pageLog('INFO', '存入冷静期成功');
        await loadCooldown();
      } catch (error) {
        setStatus(statusNode, 'error', '存入失败：' + error.message);
        pageLog('ERROR', '存入冷静期失败', { error: error.message });
      } finally {
        submitButton.disabled = false;
      }
    }

    unlockedListNode.addEventListener('click', async function (event) {
      var button = event.target.closest('[data-discard-id]');
      if (!button) {
        return;
      }

      if (!api) {
        setStatus(statusNode, 'error', '请求失败：EatWhat.api 不可用');
        return;
      }

      var itemId = button.getAttribute('data-discard-id');
      button.disabled = true;
      try {
        await api.patch('/api/cooldown/' + itemId, { status: 'discarded' });
        setStatus(statusNode, 'success', '已丢弃链接 #' + itemId + '。');
        pageLog('INFO', '丢弃冷静期项', { id: Number(itemId) });
        await loadCooldown();
      } catch (error) {
        setStatus(statusNode, 'error', '丢弃失败：' + error.message);
        pageLog('ERROR', '丢弃冷静期项失败', { id: Number(itemId), error: error.message });
      } finally {
        button.disabled = false;
      }
    });

    if (form) {
      form.addEventListener('submit', submitCooldownForm);
    }

    if (refreshTimer) {
      clearInterval(refreshTimer);
    }
    refreshTimer = setInterval(function () {
      loadCooldown().catch(function (error) {
        pageLog('WARN', '冷静期周期刷新失败', { error: error.message });
      });
    }, 60000);

    loadCooldown().catch(function (error) {
      setStatus(statusNode, 'error', '初始化失败：' + error.message);
      pageLog('ERROR', '冷静期初始化失败', { error: error.message });
    });

    pageLog('INFO', '进入冷静期页');
  });
})(window);
