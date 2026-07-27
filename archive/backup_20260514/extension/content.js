'use strict';

(function attachContentCollector(global) {
  var extension = global.EatWhatExtension || {};
  var logger = extension.logger;
  var latestBvid = null;
  var collectLock = false;

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

  function collectSearchRoots() {
    var roots = [document];
    var walker = document.createTreeWalker(document, NodeFilter.SHOW_ELEMENT);
    while (walker.nextNode()) {
      var node = walker.currentNode;
      if (node.shadowRoot) {
        roots.push(node.shadowRoot);
      }
    }
    return roots;
  }

  function queryAllDeep(selector) {
    var roots = collectSearchRoots();
    var items = [];
    roots.forEach(function (root) {
      root.querySelectorAll(selector).forEach(function (element) {
        items.push(element);
      });
    });
    return items;
  }

  function textFromSelectors(selectors) {
    var roots = collectSearchRoots();
    for (var i = 0; i < selectors.length; i += 1) {
      for (var j = 0; j < roots.length; j += 1) {
        var element = roots[j].querySelector(selectors[i]);
        var text = normalizeText(element && element.textContent);
        if (text) {
          return text;
        }
      }
    }
    return '';
  }

  function textFromSelectorsInNode(node, selectors) {
    for (var i = 0; i < selectors.length; i += 1) {
      var element = node.querySelector(selectors[i]);
      var text = normalizeText(element && element.textContent);
      if (text) {
        return text;
      }
    }
    return '';
  }

  function parseDescriptionFromLdJson() {
    var scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (var i = 0; i < scripts.length; i += 1) {
      try {
        var payload = JSON.parse(scripts[i].textContent || '{}');
        var list = Array.isArray(payload) ? payload : [payload];
        for (var j = 0; j < list.length; j += 1) {
          var item = list[j];
          var text = normalizeText(item && item.description);
          if (text) {
            return text;
          }
        }
      } catch (error) {
        console.debug('[EatWhat][extension][content][DEBUG] ld+json 解析失败', {
          error: error.message
        });
      }
    }
    return '';
  }

  function getInitialState() {
    var state = global.__INITIAL_STATE__;
    if (state && typeof state === 'object') {
      return state;
    }
    return null;
  }

  function extractDescriptionFromInitialState() {
    var state = getInitialState();
    if (!state || !state.videoData) {
      return '';
    }
    var text = normalizeText(state.videoData.desc);
    if (text) {
      return text;
    }
    if (Array.isArray(state.videoData.desc_v2)) {
      var merged = normalizeText(
        state.videoData.desc_v2
          .map(function (item) {
            return item && (item.raw_text || item.text || '');
          })
          .join(' ')
      );
      if (merged) {
        return merged;
      }
    }
    return '';
  }

  function extractDescription() {
    var fromDom = textFromSelectors([
      '#v_desc .desc-info-text',
      '.video-desc-container .desc-info-text',
      '.desc-info-text',
      '.video-desc',
      '.desc',
      '[data-testid="video-desc"]'
    ]);
    if (fromDom) {
      return fromDom;
    }

    var fromMeta = normalizeText(
      (document.querySelector('meta[property="og:description"]') || {}).content ||
      (document.querySelector('meta[name="description"]') || {}).content
    );
    if (fromMeta) {
      return fromMeta;
    }

    var fromLdJson = parseDescriptionFromLdJson();
    if (fromLdJson) {
      return fromLdJson;
    }

    return extractDescriptionFromInitialState();
  }

  function extractTags() {
    var nodes = queryAllDeep(
      '.video-tag-container a, .tag-link, .video-tag-list a, .topic-link, .tag-panel .tag'
    );
    var tags = [];
    nodes.forEach(function (node) {
      var text = normalizeText(node.textContent).replace(/^#/, '');
      if (text && tags.indexOf(text) === -1) {
        tags.push(text);
      }
    });
    return tags.slice(0, 12);
  }

  function normalizeCommentFromState(rawComment) {
    var author = normalizeText(
      (rawComment && rawComment.member && rawComment.member.uname) ||
      (rawComment && rawComment.user && rawComment.user.name) ||
      (rawComment && rawComment.uname)
    );
    var content = normalizeText(
      (rawComment && rawComment.content && rawComment.content.message) ||
      (rawComment && rawComment.content && rawComment.content.text) ||
      (rawComment && rawComment.message)
    );
    var likes = parseCount(
      (rawComment && rawComment.like) ||
      (rawComment && rawComment.likes) ||
      0
    );
    if (!author || !content) {
      return null;
    }
    return {
      author: author,
      content: content,
      likes: likes
    };
  }

  function extractTopCommentsFromInitialState() {
    var state = getInitialState();
    if (!state) {
      return [];
    }
    var candidates = [];
    if (state.reply && Array.isArray(state.reply.replyList)) {
      candidates = state.reply.replyList;
    } else if (Array.isArray(state.replyList)) {
      candidates = state.replyList;
    } else if (state.commentData && Array.isArray(state.commentData.topReplies)) {
      candidates = state.commentData.topReplies;
    }
    return candidates
      .map(normalizeCommentFromState)
      .filter(function (item) {
        return Boolean(item);
      })
      .slice(0, 5);
  }

  function extractTopCommentsFromDom() {
    var items = queryAllDeep(
      '#commentapp .reply-item, .reply-list .reply-item, .comment-list .reply-item, .reply-wrap, .comment-item'
    );
    var comments = [];
    items.forEach(function (item) {
      if (comments.length >= 5) {
        return;
      }
      var author = textFromSelectorsInNode(item, [
        '.user-name',
        '.sub-user-name',
        '.user-name-text',
        '.name',
        '.username',
        '.reply-user-name'
      ]);
      var content = textFromSelectorsInNode(item, [
        '.reply-content',
        '.reply-content-text',
        '.content-warp',
        '.text',
        '.content',
        '.reply-main',
        '.comment-content'
      ]);
      var likesText = textFromSelectorsInNode(item, [
        '.like-count',
        '.reply-like span',
        '.count',
        '.like-num',
        '.up-count',
        '.like'
      ]);
      if (!author || !content) {
        return;
      }
      comments.push({
        author: author,
        content: content,
        likes: parseCount(likesText)
      });
    });
    return comments;
  }

  function extractTopComments() {
    var fromDom = extractTopCommentsFromDom();
    if (fromDom.length > 0) {
      return fromDom;
    }
    return extractTopCommentsFromInitialState();
  }

  function extractBvidFromUrl(url) {
    var matched = String(url || '').match(/\/video\/(BV[0-9A-Za-z]{10})/i);
    return matched ? matched[1] : '';
  }

  function extractVideoData() {
    var state = getInitialState();
    var bvid = extractBvidFromUrl(global.location.href) || normalizeText(state && state.bvid);
    var title = textFromSelectors([
      'h1.video-title',
      '.video-title-container h1',
      '.video-info-title-inner',
      'h1'
    ]);
    if (!title && state && state.videoData) {
      title = normalizeText(state.videoData.title);
    }
    if (!title) {
      title = normalizeText(document.title).replace(/_哔哩哔哩_bilibili$/i, '');
    }
    var uploader = textFromSelectors([
      '.up-name',
      '.up-name__text',
      '.username',
      '.staff-name',
      '.up-info-name'
    ]);
    if (!uploader && state && state.videoData && state.videoData.owner) {
      uploader = normalizeText(state.videoData.owner.name);
    }
    var description = extractDescription();
    var tags = extractTags();
    if (tags.length === 0 && state && state.videoData && state.videoData.tname) {
      tags = [normalizeText(state.videoData.tname)];
    }
    var topComments = extractTopComments();

    return {
      bvid: bvid,
      title: title,
      uploader: uploader,
      tags: tags,
      description: description,
      top_comments: topComments,
      interaction_type: 'view'
    };
  }

  async function sendIngestMessage(payload, trigger) {
    return new Promise(function (resolve, reject) {
      chrome.runtime.sendMessage(
        {
          type: 'ingest_video',
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

  async function collectAndIngest(trigger) {
    if (collectLock) {
      return null;
    }
    collectLock = true;
    try {
      var payload = extractVideoData();
      //console.log('[完整采集数据]', payload);
      if (!payload.bvid || !payload.title || !payload.uploader) {
        throw new Error('页面信息不足，无法上报 ingest（缺少 bvid/title/uploader）');
      }
      if (logger) {
        if (payload.top_comments.length === 0) {
          await logger.log('content', 'WARN', '当前页面评论不可见，按空数组继续上报', {
            trigger: trigger,
            bvid: payload.bvid
          });
        }
        await logger.log('content', 'INFO', '准备上报视频采集数据', {
          trigger: trigger,
          bvid: payload.bvid,
          title: payload.title,
          has_description: Boolean(payload.description),
          top_comment_count: payload.top_comments.length
        });
      }
      var ingestResult = await sendIngestMessage(payload, trigger);
      latestBvid = payload.bvid;
      if (logger) {
        await logger.log('content', 'INFO', '视频采集上报成功', {
          trigger: trigger,
          bvid: payload.bvid,
          ingest_result: ingestResult
        });
      }
      return ingestResult;
    } catch (error) {
      if (logger) {
        await logger.log('content', 'ERROR', '视频采集上报失败', {
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

  async function collectIfBvidChanged(trigger) {
    var currentBvid = extractBvidFromUrl(global.location.href);
    if (!currentBvid || currentBvid === latestBvid) {
      return;
    }
    await collectAndIngest(trigger);
  }

  async function collectWithGuard(trigger) {
    try {
      await collectIfBvidChanged(trigger);
    } catch (error) {
      if (logger) {
        await logger.log('content', 'WARN', '自动采集触发失败', {
          trigger: trigger,
          error: error.message
        });
      }
    }
  }

  chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (!message || message.type !== 'collect_current_video') {
      return;
    }
    collectAndIngest('popup_click')
      .then(function (result) {
        sendResponse({ ok: true, data: result });
      })
      .catch(function (error) {
        sendResponse({ ok: false, error: error.message });
      });
    return true;
  });

  global.extractVideoData = extractVideoData;
  console.log('hello from content');

  if (logger) {
    logger.log('content', 'INFO', 'hello from content', {
      url: global.location.href
    });
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(function () {
      collectWithGuard('page_ready');
    }, 1500);
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(function () {
        collectWithGuard('dom_content_loaded');
      }, 1500);
    });
  }

  setInterval(function () {
    collectWithGuard('spa_navigation');
  }, 2500);
})(globalThis);
