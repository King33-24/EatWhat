'use strict';

(function attachEatWhatApi(global) {
  var eatwhat = global.EatWhat || {};
  var api = eatwhat.api || {};

  api.baseUrl =
    (global.EatWhatConfig && global.EatWhatConfig.apiBaseUrl) ||
    global.location.protocol + '//' + global.location.host;

  function buildUrl(path) {
    if (/^https?:\/\//i.test(path)) {
      return path;
    }
    if (path.charAt(0) === '/') {
      return api.baseUrl + path;
    }
    return api.baseUrl + '/' + path;
  }

  async function request(path, options) {
    var settings = options || {};
    var method = settings.method || 'GET';
    var headers = settings.headers || {};
    var payload = settings.body;
    var body = payload;

    if (payload && typeof payload === 'object' && !(payload instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(payload);
    }

    var response = await fetch(buildUrl(path), {
      method: method,
      headers: headers,
      body: body
    });

    var result = null;
    try {
      result = await response.json();
    } catch (error) {
      throw new Error('接口返回格式不是 JSON');
    }

    if (!response.ok || !result.success) {
      throw new Error((result && result.error) || ('请求失败: HTTP ' + response.status));
    }

    return result;
  }

  api.request = request;
  api.get = function (path, options) {
    return request(path, Object.assign({}, options, { method: 'GET' }));
  };
  api.post = function (path, body, options) {
    return request(path, Object.assign({}, options, { method: 'POST', body: body }));
  };
  api.patch = function (path, body, options) {
    return request(path, Object.assign({}, options, { method: 'PATCH', body: body }));
  };
  api.delete = function (path, options) {
    return request(path, Object.assign({}, options, { method: 'DELETE' }));
  };

  eatwhat.api = api;
  global.EatWhat = eatwhat;
})(window);
