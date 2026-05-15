'use strict';

(function attachExtensionLogger(global) {
  var extension = global.EatWhatExtension || {};
  var logger = extension.logger || {};
  var configuredBaseUrl =
    (global.EatWhatConfig && global.EatWhatConfig.apiBaseUrl) ||
    'http://localhost:8000';
  var backendBaseUrls = [configuredBaseUrl, 'http://127.0.0.1:8000']
    .filter(function (url, index, arr) {
      return arr.indexOf(url) === index;
    });
  var allowedLevels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];

  function normalizeLevel(level) {
    var upper = String(level || '').toUpperCase();
    return allowedLevels.indexOf(upper) >= 0 ? upper : 'INFO';
  }

  function writeConsole(source, level, message, context) {
    var line = '[EatWhat][extension][' + source + '][' + level + '] ' + message;
    if (level === 'ERROR') {
      console.error(line, context || {});
      return;
    }
    if (level === 'WARN') {
      console.warn(line, context || {});
      return;
    }
    if (level === 'DEBUG') {
      console.debug(line, context || {});
      return;
    }
    console.info(line, context || {});
  }

  logger.log = async function (source, level, message, context) {
    var normalizedLevel = normalizeLevel(level);
    var payload = {
      source: 'extension',
      level: normalizedLevel,
      message: String(message || ''),
      context: Object.assign(
        {
          module: source || 'unknown'
        },
        context || {}
      )
    };

    writeConsole(source || 'unknown', normalizedLevel, payload.message, payload.context);

    try {
      var delivered = false;
      var lastError = null;
      for (var i = 0; i < backendBaseUrls.length; i += 1) {
        try {
          var response = await fetch(backendBaseUrls[i] + '/api/log', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          });
          if (response.ok) {
            delivered = true;
            break;
          }
          lastError = new Error('HTTP ' + response.status);
        } catch (innerError) {
          lastError = innerError;
        }
      }
      if (!delivered) {
        throw lastError || new Error('日志上报通道不可达');
      }
    } catch (error) {
      console.warn('[EatWhat][extension][logger][WARN] 日志上报失败', {
        error: error.message,
        payload: payload
      });
    }
  };

  extension.logger = logger;
  extension.backendBaseUrl = backendBaseUrls[0];
  extension.backendBaseUrls = backendBaseUrls;
  global.EatWhatExtension = extension;
})(globalThis);
