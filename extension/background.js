'use strict';

importScripts('logger.js');

(function attachBackgroundWorker(global) {
  var extension = global.EatWhatExtension || {};
  var logger = extension.logger;
  var backendBaseUrls = extension.backendBaseUrls || [extension.backendBaseUrl || 'http://localhost:8000', 'http://127.0.0.1:8000'];
  var contextMenuId = 'eatwhat-save-to-cooldown';

  async function postJson(path, payload) {
    var lastFetchError = null;
    for (var i = 0; i < backendBaseUrls.length; i += 1) {
      var baseUrl = backendBaseUrls[i];
      var response = null;
      try {
        response = await fetch(baseUrl + path, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
      } catch (error) {
        lastFetchError = error;
        continue;
      }

      var result = null;
      try {
        result = await response.json();
      } catch (error) {
        throw new Error('接口返回格式不是 JSON');
      }
      if (!response.ok || !result.success) {
        throw new Error((result && result.error) || ('请求失败: HTTP ' + response.status));
      }
      return result.data;
    }
    throw new Error(
      (lastFetchError && lastFetchError.message) ||
      '无法连接后端，请确认 http://localhost:8000 或 http://127.0.0.1:8000 已启动'
    );
  }

  chrome.runtime.onInstalled.addListener(async function () {
    chrome.contextMenus.create(
      {
        id: contextMenuId,
        title: '存入冷静期盒子',
        contexts: ['link']
      },
      async function () {
        if (chrome.runtime.lastError) {
          if (logger) {
            await logger.log('background', 'ERROR', '创建右键菜单失败', {
              error: chrome.runtime.lastError.message
            });
          }
          return;
        }
        if (logger) {
          await logger.log('background', 'INFO', '右键菜单创建成功', {
            menu_id: contextMenuId
          });
        }
      }
    );
  });

  chrome.contextMenus.onClicked.addListener(async function (info, tab) {
    if (info.menuItemId !== contextMenuId || !info.linkUrl) {
      return;
    }
    try {
      var cooldown = await postJson('/api/cooldown', {
        url: info.linkUrl,
        title: info.selectionText || '',
        user_note: '来自扩展右键菜单',
        lock_days: 7
      });
      if (logger) {
        await logger.log('background', 'INFO', '右键菜单存入冷静期成功', {
          tab_id: tab && tab.id,
          url: info.linkUrl,
          cooldown_id: cooldown.id
        });
      }
    } catch (error) {
      if (logger) {
        await logger.log('background', 'ERROR', '右键菜单存入冷静期失败', {
          tab_id: tab && tab.id,
          url: info.linkUrl,
          error: error.message
        });
      }
    }
  });

  chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (!message || message.type !== 'ingest_note') {
      return;
    }
    postJson('/ingest', message.payload)
      .then(async function (data) {
        if (logger) {
          await logger.log('background', 'INFO', '笔记 ingest 上报成功', {
            trigger: message.trigger || 'unknown',
            tab_id: sender.tab && sender.tab.id,
            url: sender.tab && sender.tab.url,
            ingest_id: data.id
          });
        }
        sendResponse({ ok: true, data: data });
      })
      .catch(async function (error) {
        if (logger) {
          await logger.log('background', 'ERROR', '笔记 ingest 上报失败', {
            trigger: message.trigger || 'unknown',
            tab_id: sender.tab && sender.tab.id,
            url: sender.tab && sender.tab.url,
            error: error.message
          });
        }
        sendResponse({ ok: false, error: error.message });
      });
    return true;
  });
})(globalThis);
