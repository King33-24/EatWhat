'use strict';

(function attachExtensionLogger(global) {
  var extension = global.EatWhatExtension || {};
  var logger = extension.logger || {};
  var backendBaseUrl =
    (global.EatWhatConfig && global.EatWhatConfig.apiBaseUrl) ||
    'http://localhost:8000';
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
      var response = await fetch(backendBaseUrl + '/api/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error('HTTP ' + response.status);
      }
    } catch (error) {
      console.warn('[EatWhat][extension][logger][WARN] 日志上报失败', {
        error: error.message,
        payload: payload
      });
    }
  };

  extension.logger = logger;
  extension.backendBaseUrl = backendBaseUrl;
  global.EatWhatExtension = extension;
})(globalThis);
