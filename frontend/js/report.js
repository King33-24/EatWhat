'use strict';

(function initReportPage(global) {
  function createEmptyCard(text, borderColorClass) {
    var card = document.createElement('div');
    card.className = 'rounded-lg border border-dashed ' + borderColorClass + ' bg-white/70 p-4 text-sm text-base-content/80';
    card.textContent = text;
    return card;
  }

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

  function sleep(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function normalizeWeight(value) {
    var n = Number(value);
    if (!Number.isFinite(n)) {
      return 0;
    }
    return n;
  }

  function normalizePositionValue(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Math.max(-1, Math.min(1, value));
    }
    if (typeof value === 'string') {
      var numericValue = Number(value.trim());
      if (Number.isFinite(numericValue)) {
        return Math.max(-1, Math.min(1, numericValue));
      }
    }
    var text = String(value || '').toLowerCase();
    if (text.indexOf('支持') >= 0 || text.indexOf('正向') >= 0 || text.indexOf('positive') >= 0 || text.indexOf('pro') >= 0) {
      return 1;
    }
    if (text.indexOf('反对') >= 0 || text.indexOf('负向') >= 0 || text.indexOf('negative') >= 0 || text.indexOf('against') >= 0) {
      return -1;
    }
    return 0;
  }

  function normalizeLeanValue(value) {
    var lean = String(value || '').trim();
    if (lean === '正面' || lean === '负面' || lean === '中立' || lean === '两极分化') {
      return lean;
    }
    return '';
  }

  function inferLeanFromPosition(position) {
    var positionValue = normalizePositionValue(position);
    if (positionValue > 0) {
      return '正面';
    }
    if (positionValue < 0) {
      return '负面';
    }
    return '中立';
  }

  function formatPositionText(position, fallbackValue) {
    var text = String(position || '').trim();
    if (text) {
      return text;
    }
    if (fallbackValue >= 0.5) {
      return '支持';
    }
    if (fallbackValue <= -0.5) {
      return '反对';
    }
    return '中立';
  }

  function getLeanColor(lean) {
    if (lean === '正面') {
      return '#2d6a4f';
    }
    if (lean === '负面') {
      return '#c0392b';
    }
    if (lean === '两极分化') {
      return {
        type: 'linear',
        x: 0,
        y: 0,
        x2: 1,
        y2: 0,
        colorStops: [
          { offset: 0, color: '#2d6a4f' },
          { offset: 1, color: '#c0392b' }
        ]
      };
    }
    return '#888';
  }

  global.addEventListener('DOMContentLoaded', function () {
    var api = global.EatWhat && global.EatWhat.api;
    var logger = global.EatWhat && global.EatWhat.logger;
    var statusNode = document.getElementById('report-status');
    var reportMetaNode = document.getElementById('report-meta');
    var generateButton = document.getElementById('report-generate-btn');
    var interestMapNode = document.getElementById('interest-map');
    var opinionSpectrumNode = document.getElementById('opinion-spectrum');
    var opinionSpectrumTipNode = document.getElementById('opinion-spectrum-tip');
    var blindSpotsNode = document.getElementById('blind-spots-list');
    var emotionPatternNode = document.getElementById('emotion-pattern-list');
    var state = {
      reportId: null,
      generatedAt: null
    };
    var interestMapChart = null;
    var opinionSpectrumChart = null;
    var interestMapRenderTick = 0;
    var opinionSpectrumRenderTick = 0;

    function pageLog(level, message, context) {
      if (!logger) {
        return;
      }
      logger.log('frontend', level, message, Object.assign({ page: '/report.html' }, context || {}));
    }

    function markChartPlaceholder(node, message) {
      node.classList.add('eatwhat-chart-placeholder');
      node.style.height = '';
      node.textContent = message;
    }

    function mountChart(node) {
      node.classList.remove('eatwhat-chart-placeholder');
      node.textContent = '';
      node.style.height = '320px';
    }

    function setOpinionTip(text) {
      if (!opinionSpectrumTipNode) {
        return;
      }
      opinionSpectrumTipNode.textContent = text;
    }

    function renderInterestMap(items) {
      interestMapRenderTick += 1;
      if (!global.echarts) {
        markChartPlaceholder(interestMapNode, 'ECharts 未加载，无法绘制兴趣地图。');
        return;
      }
      if (!Array.isArray(items) || items.length === 0) {
        if (interestMapChart) {
          interestMapChart.dispose();
          interestMapChart = null;
        }
        markChartPlaceholder(interestMapNode, '暂无兴趣地图数据');
        return;
      }

      var renderTick = interestMapRenderTick;
      mountChart(interestMapNode);
      requestAnimationFrame(function () {
        if (renderTick !== interestMapRenderTick) {
          return;
        }
        if (!interestMapChart) {
          interestMapChart = global.echarts.init(interestMapNode);
        }
        interestMapChart.setOption({
          tooltip: { trigger: 'item' },
          legend: { bottom: 0 },
          series: [
            {
              name: '兴趣权重',
              type: 'pie',
              center: ['50%', '40%'],
              radius: ['35%', '60%'],
              itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
              label: { formatter: '{b}: {d}%' },
              data: items.map(function (item) {
                return {
                  name: String(item.topic || '未命名主题'),
                  value: normalizeWeight(item.weight)
                };
              })
            }
          ]
        });
        setTimeout(function () {
          if (interestMapChart) {
            interestMapChart.resize();
          }
        }, 100);
      });
    }

    function renderOpinionSpectrum(items) {
      opinionSpectrumRenderTick += 1;
      if (!global.echarts) {
        markChartPlaceholder(opinionSpectrumNode, 'ECharts 未加载，无法绘制观点光谱。');
        setOpinionTip('图表库未加载。');
        return;
      }
      if (!Array.isArray(items) || items.length === 0) {
        if (opinionSpectrumChart) {
          opinionSpectrumChart.dispose();
          opinionSpectrumChart = null;
        }
        markChartPlaceholder(opinionSpectrumNode, '暂无观点光谱数据');
        setOpinionTip('暂无可分析的观点项。');
        return;
      }

      var rows = items.map(function (item) {
        var rawValue = normalizePositionValue(item.position);
        var lean = normalizeLeanValue(item.lean) || inferLeanFromPosition(item.position);
        var chartValue = rawValue;
        if (lean === '两极分化' && chartValue === 0) {
          chartValue = 0.2;
        }
        return {
          issue: String(item.issue || '未命名议题'),
          value: chartValue,
          lean: lean,
          positionText: formatPositionText(item.position, rawValue)
        };
      });

      var neutralCount = rows.filter(function (row) {
        return row.lean === '中立';
      }).length;
      setOpinionTip(neutralCount > 0
        ? '已按倾向着色展示全部议题，其中 ' + neutralCount + ' 条为中立。'
        : '已按倾向着色展示全部议题。');

      var renderTick = opinionSpectrumRenderTick;
      mountChart(opinionSpectrumNode);
      requestAnimationFrame(function () {
        if (renderTick !== opinionSpectrumRenderTick) {
          return;
        }
        if (!opinionSpectrumChart) {
          opinionSpectrumChart = global.echarts.init(opinionSpectrumNode);
        }
        opinionSpectrumChart.setOption({
          tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: function (params) {
              if (!Array.isArray(params) || params.length === 0) {
                return '';
              }
              var row = params[0].data || {};
              return params[0].name + '<br>倾向：' + String(row.lean || '中立') + '<br>描述：' + String(row.positionText || '中立');
            }
          },
          grid: { left: 24, right: 20, top: 16, bottom: 24, containLabel: true },
          xAxis: {
            type: 'value',
            min: -1,
            max: 1,
            axisLabel: {
              formatter: function (value) {
                if (value === 1) {
                  return '支持';
                }
                if (value === -1) {
                  return '反对';
                }
                return '中立';
              }
            }
          },
          yAxis: {
            type: 'category',
            data: rows.map(function (row) {
              return row.issue;
            }),
            axisLabel: {
              width: 120,
              overflow: 'truncate'
            }
          },
          series: [
            {
              type: 'bar',
              data: rows.map(function (row) {
                return {
                  value: row.value,
                  lean: row.lean,
                  positionText: row.positionText,
                  itemStyle: {
                    color: getLeanColor(row.lean)
                  }
                };
              }),
              label: {
                show: true,
                formatter: function (params) {
                  var row = params.data || {};
                  return '【' + String(row.lean || '中立') + '】' + String(row.positionText || '中立');
                },
                position: function (params) {
                  return params.value < 0 ? 'left' : 'right';
                }
              }
            }
          ]
        });
        setTimeout(function () {
          if (opinionSpectrumChart) {
            opinionSpectrumChart.resize();
          }
        }, 100);
      });
    }

    function renderBlindSpots(items) {
      blindSpotsNode.innerHTML = '';
      if (!Array.isArray(items) || items.length === 0) {
        blindSpotsNode.appendChild(createEmptyCard('暂无盲区数据，建议先采集更多浏览记录。', 'border-[var(--eatwhat-alert)]'));
        return;
      }

      items.forEach(function (item, index) {
        var card = document.createElement('article');
        card.className = 'rounded-lg border border-[var(--eatwhat-alert)]/30 bg-[#fff7f7] p-4';

        var title = document.createElement('h3');
        title.className = 'mb-2 text-sm font-semibold text-[var(--eatwhat-alert)]';
        title.textContent = '盲区 #' + (index + 1) + ' · 缺失视角：' + String(item.missing_perspective || '未标注');

        var description = document.createElement('p');
        description.className = 'text-sm text-base-content/80';
        description.textContent = String(item.description || '暂无描述');

        var sample = document.createElement('p');
        sample.className = 'mt-2 text-xs text-base-content/60';
        sample.textContent = '相关样本数：' + String(item.sample_count || 0);

        card.appendChild(title);
        card.appendChild(description);
        card.appendChild(sample);
        blindSpotsNode.appendChild(card);
      });
    }

    function renderEmotionPattern(items) {
      emotionPatternNode.innerHTML = '';
      if (!Array.isArray(items) || items.length === 0) {
        emotionPatternNode.appendChild(createEmptyCard('暂无情绪模式数据。', 'border-base-300'));
        return;
      }

      items.forEach(function (item) {
        var card = document.createElement('article');
        card.className = 'rounded-lg border border-base-300 bg-white/80 p-4';

        var emotion = document.createElement('h3');
        emotion.className = 'text-sm font-semibold text-base-content';
        emotion.textContent = String(item.emotion || '未标注情绪');

        var weight = normalizeWeight(item.weight);
        var meter = document.createElement('progress');
        meter.className = 'progress progress-success mt-2 w-full';
        meter.max = 1;
        meter.value = Math.max(0, Math.min(1, weight));

        var examples = document.createElement('p');
        examples.className = 'mt-2 text-xs text-base-content/70';
        if (Array.isArray(item.examples) && item.examples.length > 0) {
          examples.textContent = '样例：' + item.examples.slice(0, 2).join(' / ');
        } else {
          examples.textContent = '样例：暂无';
        }

        card.appendChild(emotion);
        card.appendChild(meter);
        card.appendChild(examples);
        emotionPatternNode.appendChild(card);
      });
    }

    function updateSnapshot(report) {
      state.reportId = report ? report.id : null;
      state.generatedAt = report ? report.generated_at : null;
    }

    function renderReport(report) {
      updateSnapshot(report);
      if (!report) {
        reportMetaNode.textContent = '暂无报告';
        markChartPlaceholder(interestMapNode, '暂无兴趣地图数据');
        markChartPlaceholder(opinionSpectrumNode, '暂无观点光谱数据');
        renderBlindSpots([]);
        renderEmotionPattern([]);
        setStatus(statusNode, 'info', '还没有报告，先去小红书看一会再回来生成。');
        return;
      }

      reportMetaNode.textContent = '报告 #' + report.id + ' · 生成于 ' + report.generated_at;
      renderInterestMap(report.interest_map);
      renderOpinionSpectrum(report.opinion_spectrum);
      renderBlindSpots(report.blind_spots);
      renderEmotionPattern(report.emotion_pattern);
      setStatus(statusNode, 'info', '已加载最新报告数据。');
    }

    async function fetchLatestReport() {
      var result = await api.get('/api/report/latest');
      return result.data;
    }

    async function loadLatestReport() {
      if (!api) {
        setStatus(statusNode, 'error', '初始化失败：EatWhat.api 不可用');
        return;
      }
      var latest = await fetchLatestReport();
      renderReport(latest);
    }

    async function handleGenerateClick() {
      if (!api) {
        setStatus(statusNode, 'error', '请求失败：EatWhat.api 不可用');
        return;
      }
      var beforeReportId = state.reportId;
      var beforeGeneratedAt = state.generatedAt;
      generateButton.disabled = true;
      setStatus(statusNode, 'info', '分析中，预计需要 20-30 秒（每 3 秒自动检查一次）…');
      pageLog('INFO', '点击生成报告', { before_report_id: beforeReportId });

      try {
        await api.post('/api/report/generate');
        for (var i = 0; i < 20; i += 1) {
          await sleep(3000);
          var latest = await fetchLatestReport();
          if (latest && (latest.id !== beforeReportId || latest.generated_at !== beforeGeneratedAt)) {
            renderReport(latest);
            setStatus(statusNode, 'success', '报告已生成：#' + latest.id + '（' + latest.generated_at + '）');
            pageLog('INFO', '报告生成完成', { report_id: latest.id });
            return;
          }
        }
        setStatus(statusNode, 'error', '等待超时：报告仍在生成中，请稍后再试。');
        pageLog('WARN', '报告轮询超时');
      } catch (error) {
        setStatus(statusNode, 'error', '生成失败：' + error.message);
        pageLog('ERROR', '报告生成失败', { error: error.message });
      } finally {
        generateButton.disabled = false;
      }
    }

    if (generateButton) {
      generateButton.addEventListener('click', handleGenerateClick);
    }

    global.addEventListener('resize', function () {
      if (interestMapChart) {
        interestMapChart.resize();
      }
      if (opinionSpectrumChart) {
        opinionSpectrumChart.resize();
      }
    });

    loadLatestReport().catch(function (error) {
      setStatus(statusNode, 'error', '加载报告失败：' + error.message);
      pageLog('ERROR', '报告初始化失败', { error: error.message });
    });

    pageLog('INFO', '进入报告页');
  });
})(window);
