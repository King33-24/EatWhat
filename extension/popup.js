'use strict';

(function attachPopup(global) {
  var extension = global.EatWhatExtension || {};
  var logger = extension.logger;
  var statusElement = null;

  function setStatus(message, tone) {
    statusElement.textContent = message;
    statusElement.className = 'eatwhat-status';
    if (tone === 'success') {
      statusElement.classList.add('eatwhat-status-success');
      return;
    }
    if (tone === 'error') {
      statusElement.classList.add('eatwhat-status-error');
      return;
    }
    statusElement.classList.add('eatwhat-status-info');
  }

  function queryActiveTab() {
    return new Promise(function (resolve, reject) {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (!tabs || !tabs[0]) {
          reject(new Error('未找到当前激活标签页'));
          return;
        }
        resolve(tabs[0]);
      });
    });
  }

  function sendCollectMessage(tabId) {
    return new Promise(function (resolve, reject) {
      chrome.tabs.sendMessage(tabId, { type: 'collect_current_video' }, function (response) {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (!response || !response.ok) {
          reject(new Error((response && response.error) || 'content script 未返回成功结果'));
          return;
        }
        resolve(response.data || null);
      });
    });
  }

  async function handleCollectClick() {
    try {
      setStatus('采集中...', 'info');
      var tab = await queryActiveTab();
      if (!/^https?:\/\/[^/]*bilibili\.com\/video\//i.test(tab.url || '')) {
        throw new Error('请先切到 B 站视频页');
      }
      var result = await sendCollectMessage(tab.id);
      setStatus('采集成功，已上报后端', 'success');
      if (logger) {
        await logger.log('popup', 'INFO', '弹窗采集成功', {
          tab_id: tab.id,
          url: tab.url,
          ingest_result: result
        });
      }
    } catch (error) {
      setStatus(error.message, 'error');
      if (logger) {
        await logger.log('popup', 'ERROR', '弹窗采集失败', {
          error: error.message
        });
      }
    }
  }

  document.addEventListener('DOMContentLoaded', async function () {
    statusElement = document.getElementById('status');
    var button = document.getElementById('collect-button');
    button.addEventListener('click', handleCollectClick);
    if (logger) {
      await logger.log('popup', 'INFO', '弹窗已打开', {});
    }
  });
})(globalThis);
