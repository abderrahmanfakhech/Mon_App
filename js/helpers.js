/* Cap Budget — composants d'interface réutilisables. */
(function () {
  'use strict';

  var E = window.BudgetEngine;
  var I = window.CapIcons;

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizeText(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  function capitalize(value) {
    var str = String(value || '');
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function money(value) {
    return E.formatMoney(value);
  }

  function moneyRound(value) {
    return E.formatMoneyRound(value);
  }

  function moneyNum(value) {
    return E.formatMoney(value).replace(' DH', '');
  }

  function moneyRoundNum(value) {
    return E.formatMoneyRound(value).replace(' DH', '');
  }

  function signedMoney(value) {
    var n = Number(value) || 0;
    return (n > 0 ? '+' : '') + E.formatMoney(n);
  }

  function plural(count, singular, pluralForm) {
    return Number(count) > 1 ? (pluralForm || singular + 's') : singular;
  }

  function truncate(value, length) {
    var str = String(value || '');
    return str.length > length ? str.slice(0, length - 1).trimEnd() + '…' : str;
  }

  function initials(name) {
    var parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'CB';
    return parts.slice(0, 2).map(function (part) { return part.charAt(0).toUpperCase(); }).join('');
  }

  function niceCeil(value) {
    var v = Math.max(1, Number(value) || 1);
    var pow = Math.pow(10, Math.floor(Math.log10(v)));
    var n = v / pow;
    var steps = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
    var nice = steps[steps.length - 1];
    for (var i = 0; i < steps.length; i++) {
      if (n <= steps[i]) { nice = steps[i]; break; }
    }
    return nice * pow;
  }

  function todayLong() {
    return capitalize(new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }));
  }

  function shortDate(iso) {
    return E.parseISO(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }

  function fullDate(iso) {
    return capitalize(E.parseISO(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }));
  }

  function dayHeading(iso) {
    var today = E.todayISO();
    var yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (iso === today) return 'Aujourd’hui';
    if (iso === E.toISO(yesterday)) return 'Hier';
    return fullDate(iso);
  }

  function lastDayLabel(a) {
    return E.parseISO(a.ym + '-' + E.pad(a.dim)).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  }

  function statusMeta(a) {
    if (a.isPast) {
      if (a.status === 'over') return { label: 'Budget dépassé', tone: 'over' };
      if (a.status === 'watch') return { label: 'Budget juste tenu', tone: 'watch' };
      return { label: 'Budget respecté', tone: 'good' };
    }
    if (a.status === 'over') return { label: 'Risque de dépassement', tone: 'over' };
    if (a.status === 'watch') return { label: 'À surveiller', tone: 'watch' };
    return { label: 'Dans les temps', tone: 'good' };
  }

  function scoreRing(score, size) {
    var s = size || 100;
    var stroke = Math.max(7, Math.round(s * 0.075));
    var radius = (s - stroke) / 2 - 2;
    var circumference = 2 * Math.PI * radius;
    var dash = circumference * (Math.max(0, Math.min(100, score)) / 100);
    var color = score >= 70 ? '#0D5C4A' : score >= 50 ? '#C58B1E' : '#DD5C44';
    return '' +
      '<div class="score-ring-wrap" style="width:' + s + 'px;height:' + s + 'px">' +
        '<svg viewBox="0 0 ' + s + ' ' + s + '" role="img" aria-label="Score de santé financière : ' + score + ' sur 100">' +
          '<circle cx="' + (s / 2) + '" cy="' + (s / 2) + '" r="' + radius + '" fill="none" stroke="#ECE7DC" stroke-width="' + stroke + '"/>' +
          '<circle cx="' + (s / 2) + '" cy="' + (s / 2) + '" r="' + radius + '" fill="none" stroke="' + color + '" stroke-width="' + stroke + '" stroke-linecap="round" stroke-dasharray="' + dash + ' ' + circumference + '" transform="rotate(-90 ' + (s / 2) + ' ' + (s / 2) + ')"/>' +
        '</svg>' +
        '<div class="score-ring-center"><strong>' + score + '</strong><span>/ 100</span></div>' +
      '</div>';
  }

  function monthSwitcher(ui) {
    var current = E.currentMonthKey();
    var isCurrent = ui.month === current;
    return '' +
      '<div class="month-switch" aria-label="Changer de mois">' +
        '<button type="button" class="icon-btn" data-action="prev-month" aria-label="Mois précédent">' + I.icon('chevron-left') + '</button>' +
        '<div class="month-switch-label">' +
          '<span>' + E.monthLabel(ui.month) + '</span>' +
          '<em class="' + (isCurrent ? 'is-current' : '') + '">' + (isCurrent ? 'En cours' : 'Clôturé') + '</em>' +
        '</div>' +
        '<button type="button" class="icon-btn" data-action="next-month" aria-label="Mois suivant" ' + (isCurrent ? 'disabled' : '') + '>' + I.icon('chevron-right') + '</button>' +
      '</div>';
  }

  function pageHead(options) {
    var opts = options || {};
    return '' +
      '<header class="page-head">' +
        '<div class="page-title">' +
          '<p class="eyebrow">' + esc(opts.eyebrow || '') + '</p>' +
          '<h1>' + esc(opts.title || '') + '</h1>' +
          (opts.subtitle ? '<p class="page-sub">' + opts.subtitle + '</p>' : '') +
        '</div>' +
        (opts.actions ? '<div class="head-actions">' + opts.actions + '</div>' : '') +
      '</header>';
  }

  function txRow(t, opts) {
    var options = opts || {};
    var cat = E.getCategory(t.category);
    var meta = cat.label + (options.showDate ? ' · ' + shortDate(t.date) : '');
    return '' +
      '<button type="button" class="tx-row" data-action="edit-tx" data-id="' + esc(t.id) + '">' +
        '<span class="tx-icon" style="background:' + cat.color + '1c">' + cat.emoji + '</span>' +
        '<span class="tx-main">' +
          '<strong>' + esc(t.label) + '</strong>' +
          '<small>' + esc(meta) + '</small>' +
        '</span>' +
        '<span class="tx-amount">− ' + moneyNum(t.amount) + ' <small>DH</small></span>' +
        '<span class="tx-arrow">' + I.icon('chevron-right') + '</span>' +
      '</button>';
  }

  function emptyState(emoji, title, text, cta) {
    return '' +
      '<div class="empty-state">' +
        '<span class="empty-emoji">' + emoji + '</span>' +
        '<strong>' + esc(title) + '</strong>' +
        '<p>' + esc(text) + '</p>' +
        (cta || '') +
      '</div>';
  }

  function buildPath(values, xFor, yFor) {
    var d = '';
    var started = false;
    for (var i = 0; i < values.length; i++) {
      var value = values[i];
      if (value == null || !isFinite(value)) continue;
      d += (started ? ' L' : 'M') + xFor(i + 1).toFixed(1) + ' ' + yFor(value).toFixed(1);
      started = true;
    }
    return d;
  }

  function renderLineChart(a) {
    var W = 760;
    var H = 278;
    var padL = 48;
    var padR = 16;
    var padT = 20;
    var padB = 30;
    var plotW = W - padL - padR;
    var plotH = H - padT - padB;
    var actual = a.series.actual;
    var projected = a.series.projected;
    var ideal = a.series.ideal;
    var dim = a.dim;
    var maxValue = Math.max(a.budget || 0, 1);
    actual.concat(projected).forEach(function (v) {
      if (v != null && v > maxValue) maxValue = v;
    });
    var maxY = niceCeil(maxValue * 1.04);
    var xFor = function (day) {
      return padL + ((day - 1) / Math.max(1, dim - 1)) * plotW;
    };
    var yFor = function (value) {
      return padT + (1 - Math.max(0, value) / maxY) * plotH;
    };

    var grid = '';
    for (var i = 0; i <= 4; i++) {
      var tickValue = (maxY / 4) * i;
      var y = yFor(tickValue);
      grid += '<line class="chart-grid" x1="' + padL + '" y1="' + y.toFixed(1) + '" x2="' + (W - padR) + '" y2="' + y.toFixed(1) + '"/>';
      grid += '<text class="chart-axis-label" x="' + (padL - 10) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end">' + E.formatCompact(tickValue) + '</text>';
    }

    var actualPath = buildPath(actual, xFor, yFor);
    var projectedPath = buildPath(projected, xFor, yFor);
    var idealPath = buildPath(ideal, xFor, yFor);

    var firstActual = -1;
    var lastActual = -1;
    for (var d1 = 0; d1 < actual.length; d1++) {
      if (actual[d1] != null) {
        if (firstActual === -1) firstActual = d1;
        lastActual = d1;
      }
    }
    var areaPath = '';
    if (firstActual !== -1) {
      areaPath = actualPath +
        ' L' + xFor(lastActual + 1).toFixed(1) + ' ' + yFor(0).toFixed(1) +
        ' L' + xFor(firstActual + 1).toFixed(1) + ' ' + yFor(0).toFixed(1) + ' Z';
    }

    var lastProjectedDay = -1;
    var lastProjectedValue = null;
    for (var d2 = 0; d2 < projected.length; d2++) {
      if (projected[d2] != null) {
        lastProjectedDay = d2 + 1;
        lastProjectedValue = projected[d2];
      }
    }

    var marker = '';
    if (a.isCurrent && a.elapsed > 0) {
      var todayX = xFor(Math.min(a.elapsed, dim));
      marker += '<line class="chart-today-line" x1="' + todayX.toFixed(1) + '" y1="' + padT + '" x2="' + todayX.toFixed(1) + '" y2="' + (padT + plotH) + '"/>';
      marker += '<text class="chart-today-label" x="' + todayX.toFixed(1) + '" y="' + (padT - 6) + '" text-anchor="middle">Auj.</text>';
    }

    var dots = '';
    if (lastActual !== -1) {
      dots += '<circle class="chart-dot" cx="' + xFor(lastActual + 1).toFixed(1) + '" cy="' + yFor(actual[lastActual]).toFixed(1) + '" r="4.5"/>';
    }
    if (lastProjectedDay !== -1 && a.isCurrent) {
      dots += '<circle class="chart-dot chart-dot-projected" cx="' + xFor(lastProjectedDay).toFixed(1) + '" cy="' + yFor(lastProjectedValue).toFixed(1) + '" r="4.5"/>';
    }

    var hovers = '';
    var step = plotW / Math.max(1, dim - 1);
    for (var h = 1; h <= dim; h++) {
      var value = actual[h - 1] != null ? actual[h - 1] : projected[h - 1];
      if (value == null) continue;
      var isProjection = actual[h - 1] == null;
      var tip = E.parseISO(a.ym + '-' + E.pad(h)).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) +
        ' — ' + (isProjection ? 'projection : ' : '') + money(value);
      hovers += '<rect class="chart-hover" x="' + (xFor(h) - step / 2).toFixed(1) + '" y="' + padT + '" width="' + step.toFixed(1) + '" height="' + plotH + '"><title>' + esc(tip) + '</title></rect>';
    }

    var labels = '';
    var marks = dim > 1 ? [1, Math.round(dim / 2), dim] : [1];
    marks.forEach(function (day) {
      labels += '<text class="chart-day-label" x="' + xFor(day).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle">' + day + '</text>';
    });

    var monthLabel = E.monthLabel(a.ym).toLowerCase();
    return '' +
      '<svg class="budget-chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Évolution des dépenses de ' + esc(monthLabel) + ', comparée au rythme idéal et à la projection de fin de mois">' +
        '<desc>Dépenses cumulées, rythme idéal et projection pour ' + esc(monthLabel) + '.</desc>' +
        '<defs><linearGradient id="capChartGradient" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0%" stop-color="#0D5C4A" stop-opacity="0.18"/>' +
          '<stop offset="100%" stop-color="#0D5C4A" stop-opacity="0"/>' +
        '</linearGradient></defs>' +
        grid +
        (areaPath ? '<path class="chart-area" d="' + areaPath + '" fill="url(#capChartGradient)"/>' : '') +
        '<path class="chart-ideal" d="' + idealPath + '"/>' +
        (actualPath ? '<path class="chart-actual" d="' + actualPath + '"/>' : '') +
        (projectedPath && a.isCurrent ? '<path class="chart-projection" d="' + projectedPath + '"/>' : '') +
        marker + dots + labels + hovers +
      '</svg>';
  }

  function renderDonut(categories, limit) {
    var list = (categories || []).slice();
    if (!list.length) {
      return '<div class="donut-empty">' +
        '<span class="empty-emoji">🌱</span>' +
        '<strong>Aucune dépense ce mois-ci</strong>' +
        '<p>Ta répartition apparaîtra ici dès ta première dépense.</p>' +
      '</div>';
    }
    var keep = limit || 5;
    var top = list.slice(0, keep);
    var rest = list.slice(keep);
    var segments = top.map(function (c) {
      return { label: c.label, amount: c.amount, color: c.color, emoji: c.emoji };
    });
    if (rest.length) {
      segments.push({
        label: 'Autres catégories',
        amount: E.sum(rest, function (c) { return c.amount; }),
        color: '#B8B0A2'
      });
    }
    var total = E.sum(segments, function (s) { return s.amount; });
    var radius = 64;
    var circumference = 2 * Math.PI * radius;
    var offset = 0;
    var rings = segments.map(function (segment) {
      var portion = total > 0 ? segment.amount / total : 0;
      var length = portion * circumference;
      var gap = 2.6;
      var dash = Math.max(0.6, length - gap);
      var ring = '<circle cx="90" cy="90" r="' + radius + '" fill="none" stroke="' + segment.color + '" stroke-width="21" stroke-dasharray="' + dash.toFixed(2) + ' ' + circumference.toFixed(2) + '" stroke-dashoffset="' + (-offset).toFixed(2) + '" transform="rotate(-90 90 90)"><title>' + esc(segment.label) + ' : ' + money(segment.amount) + '</title></circle>';
      offset += length;
      return ring;
    }).join('');

    var legend = segments.map(function (segment) {
      return '<div class="donut-legend-row">' +
        '<span class="donut-dot" style="background:' + segment.color + '"></span>' +
        '<span class="donut-legend-label">' + esc(segment.label) + '</span>' +
        '<span class="donut-legend-pct">' + Math.round((segment.amount / total) * 100) + ' %</span>' +
        '<span class="donut-legend-amount">' + money(segment.amount) + '</span>' +
      '</div>';
    }).join('');

    return '<div class="donut-layout">' +
      '<div class="donut-wrap">' +
        '<svg viewBox="0 0 180 180" role="img" aria-label="Répartition des dépenses par catégorie">' + rings + '</svg>' +
        '<div class="donut-center"><strong>' + E.formatCompact(total) + ' DH</strong><span>ce mois</span></div>' +
      '</div>' +
      '<div class="donut-legend">' + legend + '</div>' +
    '</div>';
  }

  function renderHistoryChart(history, budget) {
    var maxValue = Math.max.apply(null, [budget || 0, 1].concat(history.map(function (m) { return m.total; })));
    var maxY = niceCeil(maxValue * 1.08);
    var budgetPos = budget > 0 ? Math.min(100, (budget / maxY) * 100) : 0;
    var bars = history.map(function (m) {
      var ratio = Math.min(100, (m.total / maxY) * 100);
      var color = m.status === 'over' ? '#DD5C44' : m.status === 'watch' ? '#D3A13C' : '#0D5C4A';
      return '<div class="history-col" style="--h:' + ratio.toFixed(1) + '%">' +
        '<span class="history-amount">' + E.formatCompact(m.total) + '</span>' +
        '<div class="history-bar" style="height:' + ratio.toFixed(1) + '%;background:' + color + '" title="' + esc(E.monthLabel(m.ym) + ' : ' + money(m.total)) + '"></div>' +
        '<span class="history-month">' + esc(m.label) + (m.isCurrent ? '<i></i>' : '') + '</span>' +
      '</div>';
    }).join('');

    return '<div class="history-chart">' +
      '<div class="history-plot">' +
        (budget > 0 ? '<div class="history-budget-line" style="bottom:' + budgetPos.toFixed(1) + '%"><span>Budget ' + E.formatCompact(budget) + ' DH</span></div>' : '') +
        '<div class="history-bars">' + bars + '</div>' +
      '</div>' +
    '</div>';
  }

  function renderCategoryCompare(current, previous) {
    var currentMap = {};
    var prevMap = {};
    (current || []).forEach(function (c) { currentMap[c.id] = c; });
    (previous || []).forEach(function (c) { prevMap[c.id] = c; });
    var ids = Object.keys(currentMap).concat(Object.keys(prevMap)).filter(function (id, index, arr) {
      return arr.indexOf(id) === index;
    }).filter(function (id) {
      return (currentMap[id] && currentMap[id].amount > 0) || (prevMap[id] && prevMap[id].amount > 0);
    }).sort(function (a, b) {
      return ((currentMap[b] || {}).amount || 0) - ((currentMap[a] || {}).amount || 0);
    });

    if (!ids.length) {
      return emptyState('📊', 'Pas encore de comparaison', 'Ajoute des dépenses ce mois-ci et le mois précédent pour voir les évolutions.');
    }

    var maxCurrent = Math.max.apply(null, [1].concat(ids.map(function (id) { return (currentMap[id] || {}).amount || 0; })));
    return '<div class="compare-list">' + ids.map(function (id) {
      var cur = currentMap[id];
      var prev = prevMap[id];
      var cat = E.getCategory(id);
      var curAmount = cur ? cur.amount : 0;
      var prevAmount = prev ? prev.amount : 0;
      var deltaHtml = '';
      if (prevAmount > 0) {
        var delta = (curAmount - prevAmount) / prevAmount;
        var cls = delta > 0.05 ? 'is-up' : delta < -0.05 ? 'is-down' : 'is-flat';
        deltaHtml = '<span class="delta ' + cls + '">' + (delta > 0 ? '+' : '') + Math.round(delta * 100) + ' %</span>';
      } else if (curAmount > 0) {
        deltaHtml = '<span class="delta is-new">Nouveau</span>';
      } else {
        deltaHtml = '<span class="delta is-flat">—</span>';
      }
      return '<div class="compare-row">' +
        '<div class="compare-name">' +
          '<span class="cat-emoji" style="background:' + cat.color + '1c">' + cat.emoji + '</span>' +
          '<div><strong>' + esc(cat.label) + '</strong><small>' + money(prevAmount) + ' le mois dernier</small></div>' +
        '</div>' +
        '<div class="compare-track"><span style="width:' + Math.max(2, (curAmount / maxCurrent) * 100) + '%;background:' + cat.color + '"></span></div>' +
        '<div class="compare-value"><strong>' + money(curAmount) + '</strong>' + deltaHtml + '</div>' +
      '</div>';
    }).join('') + '</div>';
  }

  function renderWeekdayChart(rows) {
    var maxAverage = Math.max.apply(null, [1].concat(rows.map(function (r) { return r.average; })));
    var todayDow = new Date().getDay();
    return '<div class="weekday-chart">' + rows.map(function (row) {
      var height = Math.max(0, (row.average / maxAverage) * 100);
      var isToday = row.dow === todayDow;
      return '<div class="weekday-col ' + (isToday ? 'is-today' : '') + '">' +
        '<span class="weekday-value">' + E.formatCompact(row.average) + '</span>' +
        '<div class="weekday-track"><span style="height:' + Math.max(3, height).toFixed(1) + '%;background:' + (isToday ? '#E9B44C' : '#0D5C4A') + '" title="' + esc(row.label + ' : ' + money(row.average) + ' en moyenne') + '"></span></div>' +
        '<span class="weekday-label">' + row.label + '</span>' +
      '</div>';
    }).join('') + '</div>';
  }

  function toneTag(tone) {
    return { alert: 'Alerte', warn: 'À surveiller', tip: 'Conseil', good: 'Bonne nouvelle' }[tone] || 'Conseil';
  }

  function renderInsight(insight, mini) {
    if (!insight) return '';
    var tone = insight.tone || 'tip';
    return '<article class="insight-card tone-' + tone + (mini ? ' is-mini' : '') + '">' +
      '<span class="insight-icon">' + I.icon(insight.icon || 'sparkles') + '</span>' +
      '<div class="insight-body">' +
        '<span class="insight-tag">' + esc(insight.tag || toneTag(tone)) + '</span>' +
        '<h3>' + esc(insight.title) + '</h3>' +
        '<p>' + esc(insight.text) + '</p>' +
      '</div>' +
    '</article>';
  }

  window.CapUI = {
    esc: esc,
    normalizeText: normalizeText,
    capitalize: capitalize,
    money: money,
    moneyRound: moneyRound,
    moneyNum: moneyNum,
    moneyRoundNum: moneyRoundNum,
    signedMoney: signedMoney,
    plural: plural,
    truncate: truncate,
    initials: initials,
    niceCeil: niceCeil,
    todayLong: todayLong,
    shortDate: shortDate,
    fullDate: fullDate,
    dayHeading: dayHeading,
    lastDayLabel: lastDayLabel,
    statusMeta: statusMeta,
    scoreRing: scoreRing,
    monthSwitcher: monthSwitcher,
    pageHead: pageHead,
    txRow: txRow,
    emptyState: emptyState,
    renderLineChart: renderLineChart,
    renderDonut: renderDonut,
    renderHistoryChart: renderHistoryChart,
    renderCategoryCompare: renderCategoryCompare,
    renderWeekdayChart: renderWeekdayChart,
    toneTag: toneTag,
    renderInsight: renderInsight
  };
})();
