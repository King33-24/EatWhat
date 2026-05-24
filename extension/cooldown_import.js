'use strict';

(function attachCooldownImport(global) {
  var extension = global.EatWhatExtension || {};
  var logger = extension.logger;
  var backendBaseUrls = extension.backendBaseUrls || [extension.backendBaseUrl || 'http://localhost:8000', 'http://127.0.0.1:8000'];

  function setStatus(node, message, tone) {
    if (!node) {
      return;
    }
    node.textContent = message;
    node.className = 'eatwhat-status';
    if (tone === 'success') {
      node.classList.add('eatwhat-status-success');
      return;
    }
    if (tone === 'error') {
      node.classList.add('eatwhat-status-error');
      return;
    }
    node.classList.add('eatwhat-status-info');
  }

  function postJson(path, payload) {
    var lastFetchError = null;
    return backendBaseUrls.reduce(function (promise, baseUrl) {
      return promise.catch(function () {
        return fetch(baseUrl + path, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }).then(function (response) {
          return response.json().then(function (result) {
            if (!response.ok || !result.success) {
              throw new Error((result && result.error) || ('请求失败: HTTP ' + response.status));
            }
            return result.data;
          });
        }).catch(function (error) {
          lastFetchError = error;
          return Promise.reject(error);
        });
      });
    }, Promise.reject())
      .catch(function () {
        throw new Error(
          (lastFetchError && lastFetchError.message) ||
          '无法连接后端，请确认 http://localhost:8000 或 http://127.0.0.1:8000 已启动'
        );
      });
  }

  function getQueryParam(name) {
    var params = new URLSearchParams(global.location.search);
    return params.get(name) || '';
  }

  global.addEventListener('DOMContentLoaded', function () {
    var urlInput = document.getElementById('cooldown-url');
    var titleInput = document.getElementById('cooldown-title');
    var noteInput = document.getElementById('cooldown-note');
    var daysInput = document.getElementById('cooldown-days');
    var submitButton = document.getElementById('cooldown-submit');
    var statusNode = document.getElementById('status');

    if (!submitButton) {
      return;
    }

    if (urlInput) {
      urlInput.value = getQueryParam('url');
    }
    if (titleInput) {
      titleInput.value = getQueryParam('title');
    }

    submitButton.addEventListener('click', async function () {
      var url = String(urlInput && urlInput.value || '').trim();
      var title = String(titleInput && titleInput.value || '').trim();
      var note = String(noteInput && noteInput.value || '').trim();
      var lockDays = Number(daysInput && daysInput.value || 7);

      if (!url) {
        setStatus(statusNode, '请先填写链接', 'error');
        return;
      }
      if (!Number.isFinite(lockDays) || lockDays < 1 || lockDays > 30) {
        setStatus(statusNode, '锁定天数需在 1-30 之间', 'error');
        return;
      }

      submitButton.disabled = true;
      setStatus(statusNode, '正在存入冷静期…', 'info');

      try {
        var payload = {
          url: url,
          title: title || null,
          user_note: note || null,
          lock_days: lockDays
        };
        var result = await postJson('/api/cooldown', payload);
        setStatus(statusNode, '已存入冷静期。', 'success');
        if (logger) {
          await logger.log('cooldown-import', 'INFO', '右键补录冷静期成功', {
            url: url,
            cooldown_id: result && result.id
          });
        }
      } catch (error) {
        setStatus(statusNode, '存入失败：' + error.message, 'error');
        if (logger) {
          await logger.log('cooldown-import', 'ERROR', '右键补录冷静期失败', {
            url: url,
            error: error.message
          });
        }
      } finally {
        submitButton.disabled = false;
      }
    });
  });
})(globalThis);
