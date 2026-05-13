'use strict';

(function attachEatWhatLogger(global) {
  var eatwhat = global.EatWhat || {};
  var logger = eatwhat.logger || {};
  var allowedLevels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];

  function normalizeLevel(level) {
    var upper = String(level || '').toUpperCase();
    return allowedLevels.indexOf(upper) >= 0 ? upper : 'INFO';
  }

  function writeConsole(level, source, message, context) {
    var line = '[EatWhat][' + source + '][' + level + '] ' + message;
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
      source: source || 'frontend',
      level: normalizedLevel,
      message: String(message || ''),
      context: context || {}
    };

    writeConsole(payload.level, payload.source, payload.message, payload.context);

    if (!eatwhat.api || typeof eatwhat.api.post !== 'function') {
      console.warn('[EatWhat][frontend][WARN] EatWhat.api 不可用，日志未发送到 /api/log', payload);
      return;
    }

    try {
      await eatwhat.api.post('/api/log', payload);
    } catch (error) {
      console.warn('[EatWhat][frontend][WARN] 日志上报失败', {
        error: error.message,
        payload: payload
      });
    }
  };

  eatwhat.logger = logger;
  global.EatWhat = eatwhat;
})(window);
