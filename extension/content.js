'use strict';

(function attachContentCollector(global) {
  var extension = global.EatWhatExtension || {};
  var logger = extension.logger;
  var latestNoteId = null;
  var collectLock = false;
  var dwellMs = 0;
  var activeSince = document.visibilityState === 'visible' ? Date.now() : 0;
  var lastInteractionAt = 0;
  var lastInteractionType = '';
  var debugPayloadLogEnabled = Boolean(global.EatWhatConfig && global.EatWhatConfig.debugPayload);

  function normalizeText(raw) {
    return String(raw || '').replace(/\s+/g, ' ').trim();
  }

  function parseCount(raw) {
    var text = normalizeText(raw).replace(/,/g, '');
    if (!text) {
      return 0;
    }
    if (text.indexOf('万') >= 0) {
      return Math.round(parseFloat(text.replace('万', '')) * 10000);
    }
    if (text.indexOf('亿') >= 0) {
      return Math.round(parseFloat(text.replace('亿', '')) * 100000000);
    }
    var digits = text.match(/\d+(\.\d+)?/);
    return digits ? Math.round(Number(digits[0])) : 0;
  }

  function queryUniqueElements(selectors) {
    var seen = new Set();
    var result = [];
    selectors.forEach(function (selector) {
      document.querySelectorAll(selector).forEach(function (element) {
        if (seen.has(element)) {
          return;
        }
        seen.add(element);
        result.push(element);
      });
    });
    return result;
  }

  function isElementVisible(element) {
    if (!element) {
      return false;
    }
    return Boolean(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
  }

  function getScriptTexts() {
    var scripts = document.querySelectorAll('script');
    var texts = [];
    scripts.forEach(function (script) {
      var text = script.textContent || '';
      if (text) {
        texts.push(text);
      }
    });
    return texts;
  }

  function extractScriptNumberByKeys(keys) {
    var scripts = getScriptTexts();
    for (var i = 0; i < scripts.length; i += 1) {
      for (var j = 0; j < keys.length; j += 1) {
        var pattern = new RegExp('"' + keys[j] + '"\\s*:\\s*"?([0-9.,万亿]+)"?', 'i');
        var matched = scripts[i].match(pattern);
        if (!matched || !matched[1]) {
          continue;
        }
        var value = parseCount(matched[1]);
        if (value >= 0) {
          return value;
        }
      }
    }
    return -1;
  }

  function extractScriptNumberNearNote(keys, noteId) {
    if (!noteId) {
      return -1;
    }
    var scripts = getScriptTexts();
    for (var i = 0; i < scripts.length; i += 1) {
      if (scripts[i].indexOf(noteId) < 0) {
        continue;
      }
      for (var j = 0; j < keys.length; j += 1) {
        var nearAfter = new RegExp(
          '"' + noteId + '"[\\s\\S]{0,4000}"' + keys[j] + '"\\s*:\\s*"?([0-9.,万亿]+)"?',
          'i'
        );
        var nearBefore = new RegExp(
          '"' + keys[j] + '"\\s*:\\s*"?([0-9.,万亿]+)"?[\\s\\S]{0,4000}"' + noteId + '"',
          'i'
        );
        var matched = scripts[i].match(nearAfter) || scripts[i].match(nearBefore);
        if (!matched || !matched[1]) {
          continue;
        }
        return parseCount(matched[1]);
      }
    }
    return -1;
  }

  function extractNumberToken(text) {
    var normalized = normalizeText(text);
    if (!normalized) {
      return -1;
    }
    var matched = normalized.match(/[0-9]+(?:\.[0-9]+)?(?:万|亿)?/);
    if (!matched || !matched[0]) {
      return -1;
    }
    return parseCount(matched[0]);
  }

  function extractCountFromElements(elements) {
    var found = false;
    for (var i = 0; i < elements.length; i += 1) {
      if (!isElementVisible(elements[i])) {
        continue;
      }
      var sourceTexts = [
        normalizeText(elements[i].getAttribute && elements[i].getAttribute('aria-label')),
        normalizeText(elements[i].getAttribute && elements[i].getAttribute('title')),
        normalizeText(elements[i].textContent)
      ];
      var preferredCountNode = elements[i].querySelector('[class*="count"], [class*="num"], [data-count]');
      if (preferredCountNode) {
        sourceTexts.unshift(normalizeText(preferredCountNode.textContent));
      }
      for (var j = 0; j < sourceTexts.length; j += 1) {
        if (!sourceTexts[j]) {
          continue;
        }
        var count = extractNumberToken(sourceTexts[j]);
        if (count >= 0) {
          found = true;
          return count;
        }
      }
    }
    return found ? 0 : -1;
  }

  function extractActionCount(type) {
    var selectorMap = {
      like: [
        '[class*="like"][class*="wrapper"]',
        '[class*="like"] [class*="count"]',
        '[class*="like"] [class*="num"]',
        '[class*="like"][role="button"]',
        '[data-testid*="like"]',
        '[aria-label*="赞"]'
      ],
      collect: [
        '[class*="collect"][class*="wrapper"]',
        '[class*="collect"] [class*="count"]',
        '[class*="collect"] [class*="num"]',
        '[class*="collect"][role="button"]',
        '[data-testid*="collect"]',
        '[aria-label*="收藏"]'
      ],
      comment: [
        '[class*="comment"][class*="wrapper"]',
        '[class*="comment"] [class*="count"]',
        '[class*="comment"] [class*="num"]',
        '[class*="comment"][role="button"]',
        '[data-testid*="comment"]',
        '[aria-label*="评论"]'
      ]
    };
    var typeMatcherMap = {
      like: /like|点赞|喜欢|赞/i,
      collect: /collect|收藏/i,
      comment: /comment|评论|留言/i
    };
    var scriptKeyMap = {
      like: ['likes_count', 'liked_count', 'likedCount', 'like_count', 'likeCount'],
      collect: ['collects_count', 'collected_count', 'collectedCount', 'collect_count', 'collectCount'],
      comment: ['comments_count', 'comment_count', 'commentCount']
    };
    var currentNoteId = extractNoteIdFromUrl(global.location.href);
    var fromScriptNear = extractScriptNumberNearNote(scriptKeyMap[type] || [], currentNoteId);
    if (fromScriptNear >= 0) {
      return fromScriptNear;
    }
    var fromScript = extractScriptNumberByKeys(scriptKeyMap[type] || []);
    if (fromScript >= 0) {
      return fromScript;
    }
    var visibleActionElements = queryUniqueElements(selectorMap[type] || []).filter(function (element) {
      if (!isElementVisible(element)) {
        return false;
      }
      return typeMatcherMap[type].test(
        normalizeText(
          (element.getAttribute && element.getAttribute('aria-label')) + ' ' +
          (element.getAttribute && element.getAttribute('title')) + ' ' +
          (element.getAttribute && element.getAttribute('data-testid')) + ' ' +
          (element.className && String(element.className)) + ' ' +
          (element.textContent || '')
        )
      );
    });
    var fromDom = extractCountFromElements(visibleActionElements);
    return fromDom >= 0 ? fromDom : 0;
  }

  function extractImagesCount() {
    var imageSelectors = [
      '.note-content img',
      '[class*="note-content"] img',
      '[class*="swiper-slide"] img',
      '[class*="note-slider"] img'
    ];
    var images = queryUniqueElements(imageSelectors);
    var uniqueUrls = [];
    images.forEach(function (image) {
      var src = normalizeText(image.currentSrc || image.src || '');
      var marker = (src + ' ' + (image.className || '') + ' ' + (image.alt || '')).toLowerCase();
      if (!src) {
        return;
      }
      if (/avatar|icon|emoji|logo/.test(marker)) {
        return;
      }
      if (uniqueUrls.indexOf(src) >= 0) {
        return;
      }
      uniqueUrls.push(src);
    });
    return uniqueUrls.length;
  }

  function textFromSelectors(selectors) {
    for (var i = 0; i < selectors.length; i += 1) {
      var elements = document.querySelectorAll(selectors[i]);
      for (var j = 0; j < elements.length; j += 1) {
        if (!isElementVisible(elements[j])) {
          continue;
        }
        var visibleText = normalizeText(elements[j].textContent);
        if (visibleText) {
          return visibleText;
        }
      }
      for (var k = 0; k < elements.length; k += 1) {
        var anyText = normalizeText(elements[k].textContent);
        if (anyText) {
          return anyText;
        }
      }
    }
    return '';
  }

  function extractNoteIdFromUrl(url) {
    var matched = String(url || '').match(/\/(?:explore|discovery\/item)\/([0-9a-f]{24})/i);
    return matched ? matched[1] : '';
  }

  function parseTagsFromContent(contentText) {
    var tags = [];
    String(contentText || '').replace(/#([^\s#]+)/g, function (_, tag) {
      if (tag && tags.indexOf(tag) === -1) {
        tags.push(tag);
      }
      return _;
    });
    return tags;
  }

  function extractTags() {
    var nodes = document.querySelectorAll('a[href*="search_result"], [class*="tag"], [data-tag]');
    var tags = [];
    nodes.forEach(function (node) {
      var text = normalizeText(node.textContent).replace(/^#/, '');
      if (!text || text.length > 20 || tags.indexOf(text) >= 0) {
        return;
      }
      if (text === '作者' || text.indexOf('作者') >= 0) {
        return;
      }
      if (/^[\u4e00-\u9fa5A-Za-z0-9_]+$/.test(text)) {
        tags.push(text);
      }
    });
    return tags.slice(0, 12);
  }

  function triggerInteractionCapture(interactionType, triggerSource) {
    var now = Date.now();
    if (interactionType === lastInteractionType && now - lastInteractionAt < 700) {
      return;
    }
    lastInteractionType = interactionType;
    lastInteractionAt = now;
    console.log('[EatWhat][content][interaction]', interactionType);
    collectAndIngest(triggerSource, interactionType).catch(async function (error) {
      if (logger) {
        await logger.log('content', 'WARN', '用户动作采集失败', {
          interaction_type: interactionType,
          trigger_source: triggerSource,
          error: error.message
        });
      }
    });
  }

  function bindInteractionButtons() {
    var buttonSelectorMap = {
      like: [
        'button[aria-label*="赞"]',
        '[role="button"][aria-label*="赞"]',
        '[data-testid*="like"]',
        '[class*="like"][class*="wrapper"]'
      ],
      collect: [
        'button[aria-label*="收藏"]',
        '[role="button"][aria-label*="收藏"]',
        '[data-testid*="collect"]',
        '[class*="collect"][class*="wrapper"]'
      ],
      comment: [
        'button[aria-label*="评论"]',
        '[role="button"][aria-label*="评论"]',
        '[data-testid*="comment"]',
        '[class*="comment"][class*="wrapper"]'
      ]
    };
    Object.keys(buttonSelectorMap).forEach(function (type) {
      var elements = queryUniqueElements(buttonSelectorMap[type]);
      elements.forEach(function (element) {
        if (!isElementVisible(element)) {
          return;
        }
        if (element.dataset && element.dataset.eatwhatBound === '1') {
          return;
        }
        if (element.dataset) {
          element.dataset.eatwhatBound = '1';
        }
        element.addEventListener('click', function () {
          var clickMarker = normalizeText(
            (element.getAttribute && element.getAttribute('aria-label')) + ' ' +
            (element.getAttribute && element.getAttribute('title')) + ' ' +
            (element.getAttribute && element.getAttribute('data-testid')) + ' ' +
            (element.className && String(element.className)) + ' ' +
            (element.textContent || '')
          ).toLowerCase();
          if (shouldSkipInteraction(type, clickMarker)) {
            return;
          }
          triggerInteractionCapture(type, 'interaction_bound_click');
        }, true);
      });
    });
  }

  function shouldSkipInteraction(type, marker) {
    if (type === 'like') {
      return /取消赞|取消点赞|已赞|unlike|liked/.test(marker);
    }
    if (type === 'collect') {
      return /取消收藏|已收藏|uncollect|collected/.test(marker);
    }
    return false;
  }

  function detectFallbackInteractionType(target) {
    var node = target;
    for (var i = 0; i < 8 && node; i += 1) {
      var tag = (node.tagName || '').toLowerCase();
      var role = normalizeText(node.getAttribute && node.getAttribute('role')).toLowerCase();
      var className = normalizeText(node.className && String(node.className)).toLowerCase();
      var marker = normalizeText(
        (node.getAttribute && node.getAttribute('aria-label')) + ' ' +
        (node.getAttribute && node.getAttribute('title')) + ' ' +
        (node.getAttribute && node.getAttribute('data-testid')) + ' ' +
        className
      ).toLowerCase();
      var clickable = tag === 'button' || tag === 'a' || role === 'button' || /(btn|button|wrapper|action|interact|icon)/.test(className);
      if (clickable) {
        if (/collect|收藏/.test(marker)) {
          if (shouldSkipInteraction('collect', marker)) {
            return '';
          }
          return 'collect';
        }
        if (/comment|评论|留言/.test(marker)) {
          return 'comment';
        }
        if (/like|点赞|喜欢|赞/.test(marker)) {
          if (shouldSkipInteraction('like', marker)) {
            return '';
          }
          return 'like';
        }
      }
      node = node.parentElement;
    }
    return '';
  }

  function pauseActiveTimer() {
    if (!activeSince) {
      return;
    }
    dwellMs += Date.now() - activeSince;
    activeSince = 0;
  }

  function resetDwellTimer() {
    dwellMs = 0;
    activeSince = document.visibilityState === 'visible' ? Date.now() : 0;
  }

  function resumeActiveTimer() {
    if (activeSince || document.visibilityState !== 'visible') {
      return;
    }
    activeSince = Date.now();
  }

  function getDwellSeconds() {
    var activeNow = activeSince ? Date.now() - activeSince : 0;
    var totalMs = dwellMs + activeNow;
    return Math.min(600, Math.max(0, Math.floor(totalMs / 1000)));
  }

  function extractNotePayload(interactionType) {
    var noteId = extractNoteIdFromUrl(global.location.href);
    var title = textFromSelectors([
      '.note-content .title',
      '[class*="note-content"] [class*="title"]'
    ]);
    if (!title) {
      title = normalizeText((document.querySelector('meta[property="og:title"]') || {}).content);
    }
    if (title.indexOf('猜你想搜') >= 0) {
      title = '-';
    }
    if (!title) {
      title = '-';
    }
    var author = textFromSelectors([
      '.author-container .name',
      '.author-wrapper .name',
      '[class*="author"] [class*="name"]',
      '[class*="user"] [class*="name"]'
    ]);
    if (!author) {
      author = normalizeText(
        (document.querySelector('meta[name="og:nickname"]') || {}).content ||
        (document.querySelector('meta[property="article:author"]') || {}).content
      );
    }
    var content = textFromSelectors([
      '.note-content .desc',
      '.note-content',
      '[class*="note-content"]',
      '[class*="desc"]'
    ]);
    if (!content) {
      content = normalizeText(
        (document.querySelector('meta[property="og:description"]') || {}).content ||
        (document.querySelector('meta[name="description"]') || {}).content
      );
    }
    if (!content && title) {
      content = title;
    }

    var tags = extractTags();
    if (tags.length === 0) {
      tags = parseTagsFromContent(content);
    }

    return {
      note_id: noteId,
      title: title,
      author: author,
      tags: tags,
      content: content,
      images_count: extractImagesCount(),
      likes_count: 0,
      collects_count: extractActionCount('collect'),
      comments_count: 0,
      interaction_type: interactionType || 'view',
      dwell_seconds: getDwellSeconds(),
      source_channel: 'extension'
    };
  }

  async function sendIngestMessage(payload, trigger) {
    return new Promise(function (resolve, reject) {
      chrome.runtime.sendMessage(
        {
          type: 'ingest_note',
          trigger: trigger,
          payload: payload
        },
        function (response) {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          if (!response || !response.ok) {
            reject(new Error((response && response.error) || 'background 未返回成功结果'));
            return;
          }
          resolve(response.data || null);
        }
      );
    });
  }

  async function collectAndIngest(trigger, interactionType) {
    if (collectLock) {
      return null;
    }
    collectLock = true;
    try {
      var payload = extractNotePayload(interactionType || 'view');
      if (debugPayloadLogEnabled) {
        console.log('[EatWhat][content][payload]', payload);
      }
      if (!payload.note_id || !payload.title || !payload.author || !payload.content) {
        throw new Error('页面信息不足，无法上报 ingest（缺少 note_id/title/author/content）');
      }
      latestNoteId = payload.note_id;
      if (logger) {
        await logger.log('content', 'INFO', '准备上报笔记采集数据', {
          trigger: trigger,
          note_id: payload.note_id,
          title: payload.title,
          author: payload.author,
          interaction_type: payload.interaction_type,
          dwell_seconds: payload.dwell_seconds
        });
      }
      var ingestResult = await sendIngestMessage(payload, trigger);
      if (logger) {
        await logger.log('content', 'INFO', '笔记采集上报成功', {
          trigger: trigger,
          note_id: payload.note_id,
          ingest_result: ingestResult
        });
      }
      return ingestResult;
    } catch (error) {
      if (logger) {
        await logger.log('content', 'ERROR', '笔记采集上报失败', {
          trigger: trigger,
          error: error.message,
          url: global.location.href
        });
      }
      throw error;
    } finally {
      collectLock = false;
    }
  }

  function sendDwellBeacon(trigger) {
    pauseActiveTimer();
    var payload = extractNotePayload('view');
    if (!payload.note_id || !payload.title || !payload.author || !payload.content) {
      return;
    }
    if (payload.dwell_seconds <= 0) {
      return;
    }
    chrome.runtime.sendMessage({
      type: 'ingest_note',
      trigger: trigger,
      payload: payload
    });
    if (logger) {
      logger.log('content', 'INFO', '停留时长已上报', {
        trigger: trigger,
        note_id: payload.note_id,
        dwell_seconds: payload.dwell_seconds
      });
    }
  }

  async function collectIfNoteChanged(trigger) {
    var currentNoteId = extractNoteIdFromUrl(global.location.href);
    if (!currentNoteId) {
      return;
    }
    if (currentNoteId !== latestNoteId) {
      resetDwellTimer();
    } else {
      return;
    }
    await collectAndIngest(trigger, 'view');
  }

  async function collectWithGuard(trigger) {
    try {
      await collectIfNoteChanged(trigger);
    } catch (error) {
      if (logger) {
        await logger.log('content', 'DEBUG', '自动采集触发失败', {
          trigger: trigger,
          error: error.message
        });
      }
    }
  }

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      pauseActiveTimer();
      return;
    }
    resumeActiveTimer();
  });

  global.addEventListener('beforeunload', function () {
    sendDwellBeacon('before_unload');
  });

  global.addEventListener('pagehide', function () {
    sendDwellBeacon('page_hide');
  });

  document.addEventListener('click', function (event) {
    var interactionType = detectFallbackInteractionType(event.target);
    if (!interactionType) {
      return;
    }
    triggerInteractionCapture(interactionType, 'interaction_fallback_click');
  }, true);

  chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (!message || message.type !== 'collect_current_note') {
      return;
    }
    collectAndIngest('popup_click', 'view')
      .then(function (result) {
        sendResponse({ ok: true, data: result });
      })
      .catch(function (error) {
        sendResponse({ ok: false, error: error.message });
      });
    return true;
  });

  global.extractNoteData = extractNotePayload;
  console.log('hello from content');

  if (logger) {
    logger.log('content', 'INFO', 'hello from content', {
      url: global.location.href
    });
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(function () {
      collectWithGuard('page_ready');
      bindInteractionButtons();
    }, 1500);
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(function () {
        collectWithGuard('dom_content_loaded');
        bindInteractionButtons();
      }, 1500);
    });
  }

  setInterval(function () {
    collectWithGuard('spa_navigation');
    bindInteractionButtons();
  }, 2500);
})(globalThis);
