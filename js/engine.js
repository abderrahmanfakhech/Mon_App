/* Cap Budget — moteur d'analyse local.
   Aucune dépendance, aucune donnée envoyée sur le réseau.
   Exposé comme window.BudgetEngine dans le navigateur et module.exports sous Node. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BudgetEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var CATEGORIES = [
    { id: 'alimentation', label: 'Alimentation', emoji: '🥗', color: '#E07A5F' },
    { id: 'logement', label: 'Logement', emoji: '🏠', color: '#3D5A80' },
    { id: 'transport', label: 'Transport', emoji: '🚌', color: '#4C956C' },
    { id: 'sorties', label: 'Sorties & loisirs', emoji: '🎬', color: '#9B5DE5' },
    { id: 'etudes', label: 'Études', emoji: '📚', color: '#F4A261' },
    { id: 'abonnements', label: 'Abonnements', emoji: '📱', color: '#457B9D' },
    { id: 'sante', label: 'Santé', emoji: '🩺', color: '#E76F51' },
    { id: 'shopping', label: 'Shopping', emoji: '🛍️', color: '#D4A373' },
    { id: 'autres', label: 'Autres', emoji: '✨', color: '#8D99AE' }
  ];

  var CATEGORY_MAP = {};
  CATEGORIES.forEach(function (c) { CATEGORY_MAP[c.id] = c; });

  var MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  var MONTHS_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  var WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  var WEEKDAYS_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  var LEVERS = ['alimentation', 'sorties', 'shopping', 'transport', 'etudes', 'sante', 'autres'];

  function pad(n) { return String(n).padStart(2, '0'); }

  function toISO(date) {
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }

  function parseISO(iso) {
    var parts = String(iso).split('-').map(Number);
    return new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1);
  }

  function todayISO(now) {
    return toISO(now || new Date());
  }

  function monthKey(input) {
    if (input instanceof Date) return input.getFullYear() + '-' + pad(input.getMonth() + 1);
    var str = String(input || '');
    return /^\d{4}-\d{2}$/.test(str) ? str : monthKey(new Date());
  }

  function currentMonthKey(now) {
    return monthKey(now || new Date());
  }

  function shiftMonth(ym, delta) {
    var parts = String(ym).split('-').map(Number);
    var d = new Date(parts[0], parts[1] - 1 + delta, 1);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1);
  }

  function daysInMonth(ym) {
    var parts = String(ym).split('-').map(Number);
    return new Date(parts[0], parts[1], 0).getDate();
  }

  function lastDayISO(ym) {
    return ym + '-' + pad(daysInMonth(ym));
  }

  function monthLabel(ym) {
    var parts = String(ym).split('-').map(Number);
    var label = MONTHS[parts[1] - 1] + ' ' + parts[0];
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  function monthLabelShort(ym) {
    var parts = String(ym).split('-').map(Number);
    return MONTHS_SHORT[parts[1] - 1] + ' ' + String(parts[0]).slice(2);
  }

  function formatMoney(value) {
    var n = Number(value);
    if (!isFinite(n)) n = 0;
    var hasCents = Math.abs(n - Math.round(n)) > 0.004;
    var formatted = new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: hasCents ? 2 : 0
    }).format(n);
    return formatted.replace('-', '−') + ' DH';
  }

  function formatMoneyRound(value) {
    return formatMoney(Math.round(Number(value) || 0));
  }

  function formatCompact(value) {
    var n = Number(value) || 0;
    if (Math.abs(n) >= 1000) {
      var k = n / 1000;
      var rounded = Math.abs(k) >= 10 || Math.abs(k - Math.round(k)) < 0.05 ? Math.round(k) : Math.round(k * 10) / 10;
      return String(rounded).replace('.', ',') + 'k';
    }
    return String(Math.round(n));
  }

  function formatPercent(value) {
    return Math.round(Number(value) * 100) + ' %';
  }

  function sum(list, fn) {
    var total = 0;
    for (var i = 0; i < list.length; i++) total += Number(fn ? fn(list[i]) : list[i]) || 0;
    return total;
  }

  function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }

  function uid(prefix) {
    return (prefix || 'id') + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  function roundTo(n, step) {
    var s = step || 1;
    return Math.round(n / s) * s;
  }

  function getCategory(id) {
    return CATEGORY_MAP[id] || CATEGORY_MAP.autres;
  }

  function getBudget(state) {
    var s = (state && state.settings) || {};
    var income = Math.max(0, Number(s.monthlyIncome) || 0);
    if (s.budgetMode === 'custom') return Math.max(0, Number(s.customBudget) || 0);
    return income;
  }

  function getFixedCharges(state) {
    return ((state && state.fixedCharges) || []).filter(function (c) {
      return c && Number(c.amount) > 0 && c.active !== false;
    });
  }

  function getMonthTransactions(state, ym) {
    var key = monthKey(ym);
    return ((state && state.transactions) || []).filter(function (t) {
      return t && typeof t.date === 'string' && t.date.slice(0, 7) === key && Number(t.amount) > 0;
    }).sort(function (a, b) {
      if (a.date === b.date) return String(b.id).localeCompare(String(a.id));
      return a.date < b.date ? 1 : -1;
    });
  }

  function variableByCategory(state, ym) {
    var out = {};
    CATEGORIES.forEach(function (c) { out[c.id] = 0; });
    getMonthTransactions(state, ym).forEach(function (t) {
      var id = CATEGORY_MAP[t.category] ? t.category : 'autres';
      out[id] += Number(t.amount) || 0;
    });
    return out;
  }

  function getCategoryTotals(state, ym) {
    var map = {};
    CATEGORIES.forEach(function (c) {
      map[c.id] = { id: c.id, label: c.label, emoji: c.emoji, color: c.color, amount: 0, variable: 0, fixed: 0 };
    });
    getMonthTransactions(state, ym).forEach(function (t) {
      var id = CATEGORY_MAP[t.category] ? t.category : 'autres';
      var amount = Number(t.amount) || 0;
      map[id].amount += amount;
      map[id].variable += amount;
    });
    getFixedCharges(state).forEach(function (c) {
      var id = CATEGORY_MAP[c.category] ? c.category : 'autres';
      var amount = Number(c.amount) || 0;
      map[id].amount += amount;
      map[id].fixed += amount;
    });
    var total = sum(Object.keys(map).map(function (k) { return map[k].amount; }));
    return Object.keys(map).map(function (k) {
      map[k].pct = total > 0 ? map[k].amount / total : 0;
      return map[k];
    }).filter(function (c) { return c.amount > 0; })
      .sort(function (a, b) { return b.amount - a.amount; });
  }

  function weekdayStats(state, ym, now) {
    var dim = daysInMonth(ym);
    var currentKey = currentMonthKey(now);
    var elapsed = ym === currentKey ? Math.min((now || new Date()).getDate(), dim) : (ym < currentKey ? dim : 0);
    var tx = getMonthTransactions(state, ym);
    var totals = [0, 0, 0, 0, 0, 0, 0];
    var counts = [0, 0, 0, 0, 0, 0, 0];
    for (var d = 1; d <= elapsed; d++) {
      var dow = new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 1, d).getDay();
      counts[dow] += 1;
    }
    tx.forEach(function (t) {
      var dow = parseISO(t.date).getDay();
      totals[dow] += Number(t.amount) || 0;
    });
    var order = [1, 2, 3, 4, 5, 6, 0];
    var rows = order.map(function (dow) {
      return {
        dow: dow,
        label: WEEKDAYS_SHORT[dow],
        total: totals[dow],
        days: counts[dow],
        average: counts[dow] ? totals[dow] / counts[dow] : 0
      };
    });
    var maxAverage = Math.max.apply(null, rows.map(function (r) { return r.average; }).concat([1]));
    rows.forEach(function (r) { r.ratio = r.average / maxAverage; });
    return rows;
  }

  function topExpenses(state, ym, limit) {
    return getMonthTransactions(state, ym).slice().sort(function (a, b) {
      return (Number(b.amount) || 0) - (Number(a.amount) || 0);
    }).slice(0, limit || 5);
  }

  /* ------------------------------------------------------------------ */
  /* Prévision                                                          */
  /* ------------------------------------------------------------------ */

  function forecastVariable(state, ym, now, ctx) {
    var dim = daysInMonth(ym);
    var elapsed = Math.max(0, Math.min(ctx.elapsed, dim));
    var remainingCount = Math.max(0, dim - elapsed);
    var allowance = Math.max(0, ctx.budget - ctx.fixedTotal) / dim;
    var variableSpent = ctx.variableSpent;

    if (remainingCount === 0) {
      return {
        projectedVariable: variableSpent,
        projectedRemaining: 0,
        rate: 0,
        dailyProjection: [],
        low: variableSpent,
        high: variableSpent,
        sigma: 0,
        confidence: 'high'
      };
    }

    var transactions = ((state && state.transactions) || []).filter(function (t) {
      return t && typeof t.date === 'string' && Number(t.amount) > 0;
    });
    var dayValues = {};
    var dayCounts = {};
    var earliest = null;
    transactions.forEach(function (t) {
      dayValues[t.date] = (dayValues[t.date] || 0) + (Number(t.amount) || 0);
      dayCounts[t.date] = (dayCounts[t.date] || 0) + 1;
      if (!earliest || t.date < earliest) earliest = t.date;
    });

    var base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    function backISO(n) {
      var d = new Date(base);
      d.setDate(d.getDate() - n);
      return toISO(d);
    }
    function windowAverage(days) {
      var total = 0, count = 0;
      for (var i = 0; i < days; i++) {
        var iso = backISO(i);
        if (earliest && iso < earliest) continue;
        total += dayValues[iso] || 0;
        count += 1;
      }
      return count ? total / count : 0;
    }

    var last14 = windowAverage(14);
    var currentAverage = elapsed > 0 ? variableSpent / elapsed : 0;

    var monthStart = ym + '-01';
    var monthFirst = parseISO(monthStart);
    var priorSum = 0, priorDays = 0, priorTxCount = 0;
    for (var p = 1; p <= 60; p++) {
      var priorDate = new Date(monthFirst);
      priorDate.setDate(priorDate.getDate() - p);
      var priorISO = toISO(priorDate);
      if (earliest && priorISO < earliest) break;
      priorSum += dayValues[priorISO] || 0;
      priorTxCount += dayCounts[priorISO] || 0;
      priorDays += 1;
    }
    var priorAverage = priorDays ? priorSum / priorDays : 0;
    var hasHistory = priorDays >= 7 && priorTxCount >= 5;

    var rate;
    if (hasHistory) {
      rate = (last14 * 0.45) + (currentAverage * 0.20) + (priorAverage * 0.35);
    } else if (last14 > 0) {
      rate = (last14 * 0.65) + (allowance * 0.35);
    } else {
      rate = allowance * 0.7;
    }
    if (allowance > 0) rate = Math.min(rate, allowance * 2.5);
    rate = Math.max(0, rate);

    // Profil par jour de la semaine (week-ends souvent plus chers).
    var dowSum = [0, 0, 0, 0, 0, 0, 0];
    var dowDays = [0, 0, 0, 0, 0, 0, 0];
    var histTotal = 0, histDays = 0;
    for (var h = 0; h < 90; h++) {
      var hISO = backISO(h);
      if (earliest && hISO < earliest) break;
      var dow = parseISO(hISO).getDay();
      dowSum[dow] += dayValues[hISO] || 0;
      dowDays[dow] += 1;
      histTotal += dayValues[hISO] || 0;
      histDays += 1;
    }
    var overallAvg = histDays ? histTotal / histDays : 0;
    var factors = [1, 1, 1, 1, 1, 1, 1];
    for (var f = 0; f < 7; f++) {
      if (dowDays[f] >= 3 && overallAvg > 0) {
        factors[f] = clamp((dowSum[f] / dowDays[f]) / overallAvg, 0.65, 1.5);
      }
    }

    var dailyProjection = [];
    var expectedRemaining = 0;
    for (var d = elapsed + 1; d <= dim; d++) {
      var date = new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 1, d);
      var expected = rate * factors[date.getDay()];
      dailyProjection.push({ day: d, expected: expected });
      expectedRemaining += expected;
    }

    // Écart-type des dépenses quotidiennes (jours sans dépense inclus).
    var values = [];
    for (var s = 0; s < 60; s++) {
      var sISO = backISO(s);
      if (earliest && sISO < earliest) break;
      values.push(dayValues[sISO] || 0);
    }
    var mean = values.length ? sum(values) / values.length : 0;
    var variance = values.length > 1
      ? sum(values.map(function (v) { return Math.pow(v - mean, 2); })) / (values.length - 1)
      : 0;
    var dailyStd = Math.sqrt(variance);

    var historyTx90 = 0;
    transactions.forEach(function (t) {
      if (t.date >= backISO(89) && t.date <= todayISO(now)) historyTx90 += 1;
    });
    var confidence = 'low';
    if (historyTx90 >= 30 && elapsed >= 10) confidence = 'high';
    else if (historyTx90 >= 8 && elapsed >= 4) confidence = 'medium';

    var sigma = dailyStd * Math.sqrt(Math.max(1, dailyProjection.length));
    if (confidence === 'low') sigma = Math.max(sigma, expectedRemaining * 0.35);
    var projectedVariable = variableSpent + expectedRemaining;
    var low = variableSpent + Math.max(0, expectedRemaining - 1.28 * sigma);
    var high = variableSpent + expectedRemaining + 1.28 * sigma;

    return {
      projectedVariable: projectedVariable,
      projectedRemaining: expectedRemaining,
      rate: rate,
      dailyProjection: dailyProjection,
      low: low,
      high: high,
      sigma: sigma,
      confidence: confidence
    };
  }

  function computeScore(state, a) {
    var score = 70;
    var ratio = a.budget > 0 ? a.projectedTotal / a.budget : 1;
    if (ratio <= 0.75) score += 16;
    else if (ratio <= 0.9) score += 10;
    else if (ratio <= 1) score += 4;
    else score -= Math.min(38, 8 + (ratio - 1) * 90);

    var burden = a.budget > 0 ? a.fixedTotal / a.budget : 0;
    if (burden > 0.7) score -= 12;
    else if (burden > 0.55) score -= 6;
    else if (burden < 0.4) score += 4;

    if (a.savingsGoal > 0) {
      var p = a.projectedSavings / a.savingsGoal;
      if (p >= 1) score += 8;
      else if (p >= 0.5) score += 3;
      else if (p < 0) score -= 7;
      else score -= 2;
    }

    var tx = getMonthTransactions(state, a.ym);
    var smallSum = sum(tx.filter(function (t) { return Number(t.amount) <= 50; }), function (t) { return t.amount; });
    if (a.variableSpent > 0 && smallSum / a.variableSpent > 0.3) score -= 3;

    var noSpend = 0;
    var today = new Date();
    for (var i = 0; i < 7; i++) {
      var d = new Date(today);
      d.setDate(d.getDate() - i);
      var iso = toISO(d);
      if (iso.slice(0, 7) !== a.ym) continue;
      if (!tx.some(function (t) { return t.date === iso; })) noSpend += 1;
    }
    if (noSpend >= 3) score += 4;

    return clamp(Math.round(score), 5, 99);
  }

  function getScoreLabel(score) {
    if (score >= 85) return 'Excellent';
    if (score >= 70) return 'Solide';
    if (score >= 50) return 'À surveiller';
    return 'Fragile';
  }

  function getConfidenceLabel(confidence) {
    if (confidence === 'high') return 'Fiable';
    if (confidence === 'medium') return 'Correcte';
    return 'À affiner';
  }

  function analyzeMonth(state, ym, now) {
    now = now || new Date();
    ym = monthKey(ym);
    var dim = daysInMonth(ym);
    var currentKey = currentMonthKey(now);
    var isCurrent = ym === currentKey;
    var isPast = ym < currentKey;
    var isFuture = ym > currentKey;
    var elapsed = isCurrent ? Math.min(now.getDate(), dim) : (isPast ? dim : 0);
    var remainingDays = isCurrent ? Math.max(0, dim - elapsed) : 0;
    var daysLeftInclusive = isCurrent ? remainingDays + 1 : 0;

    var budget = getBudget(state);
    var savingsGoal = Math.max(0, Number((state.settings || {}).savingsGoal) || 0);
    var tx = getMonthTransactions(state, ym);
    var variableSpent = sum(tx, function (t) { return t.amount; });
    var today = todayISO(now);
    var todaySpent = isCurrent ? sum(tx.filter(function (t) { return t.date === today; }), function (t) { return t.amount; }) : 0;

    var charges = getFixedCharges(state);
    var fixedTotal = sum(charges, function (c) { return c.amount; });
    var fixedPaid = isPast ? fixedTotal : sum(charges.filter(function (c) {
      return Math.min(Number(c.day) || 1, dim) <= elapsed;
    }), function (c) { return c.amount; });
    var fixedRemaining = Math.max(0, fixedTotal - fixedPaid);
    var spentToDate = variableSpent + fixedPaid;

    var forecast = forecastVariable(state, ym, now, {
      elapsed: elapsed,
      budget: budget,
      fixedTotal: fixedTotal,
      variableSpent: variableSpent
    });

    var projectedVariable = isCurrent ? forecast.projectedVariable : variableSpent;
    var projectedTotal = projectedVariable + fixedTotal;
    var projectedSavings = budget - projectedTotal;
    var remainingBudget = budget - spentToDate - fixedRemaining;
    var safeDaily = daysLeftInclusive > 0 ? remainingBudget / daysLeftInclusive : 0;
    var ratio = budget > 0 ? projectedTotal / budget : 1;
    var status = ratio > 1.02 ? 'over' : ratio >= 0.9 ? 'watch' : 'good';

    var fixedByDay = {};
    charges.forEach(function (c) {
      var day = clamp(Number(c.day) || 1, 1, dim);
      fixedByDay[day] = (fixedByDay[day] || 0) + (Number(c.amount) || 0);
    });
    var variableByDay = {};
    tx.forEach(function (t) {
      variableByDay[t.date] = (variableByDay[t.date] || 0) + (Number(t.amount) || 0);
    });

    var actual = [];
    var projected = [];
    var ideal = [];
    var activeLimit = isPast ? dim : elapsed;
    var cumVar = 0, cumFixed = 0;
    for (var d = 1; d <= dim; d++) {
      var iso = ym + '-' + pad(d);
      if (d <= activeLimit) {
        cumVar += variableByDay[iso] || 0;
        cumFixed += fixedByDay[d] || 0;
        actual.push(cumVar + cumFixed);
      } else {
        actual.push(null);
      }
      ideal.push(budget > 0 ? (budget / dim) * d : 0);
    }

    var baseline = activeLimit > 0 ? actual[activeLimit - 1] : 0;
    var expectedByDay = {};
    forecast.dailyProjection.forEach(function (p) { expectedByDay[p.day] = p.expected; });
    var running = baseline;
    for (var pday = 1; pday <= dim; pday++) {
      if (!isCurrent) { projected.push(null); continue; }
      if (pday < elapsed) { projected.push(null); continue; }
      if (pday === elapsed) { projected.push(baseline); continue; }
      running += (expectedByDay[pday] || 0) + (fixedByDay[pday] || 0);
      projected.push(running);
    }

    var result = {
      ym: ym,
      isCurrent: isCurrent,
      isPast: isPast,
      isFuture: isFuture,
      dim: dim,
      elapsed: elapsed,
      remainingDays: remainingDays,
      daysLeftInclusive: daysLeftInclusive,
      budget: budget,
      savingsGoal: savingsGoal,
      fixedTotal: fixedTotal,
      fixedPaid: fixedPaid,
      fixedRemaining: fixedRemaining,
      variableSpent: variableSpent,
      spentToDate: spentToDate,
      projectedVariable: projectedVariable,
      projectedTotal: projectedTotal,
      projectedSavings: projectedSavings,
      remainingBudget: remainingBudget,
      safeDaily: safeDaily,
      todaySpent: todaySpent,
      ratio: ratio,
      status: status,
      confidence: forecast.confidence,
      low: forecast.low + fixedTotal,
      high: forecast.high + fixedTotal,
      forecastRate: forecast.rate,
      expectedRemaining: forecast.projectedRemaining,
      transactionCount: tx.length,
      avgDailyVariable: elapsed > 0 ? variableSpent / elapsed : 0,
      series: { actual: actual, projected: projected, ideal: ideal }
    };

    result.score = computeScore(state, result);
    result.scoreLabel = getScoreLabel(result.score);
    result.goalProgress = savingsGoal > 0 ? clamp(projectedSavings / savingsGoal, 0, 1) : null;
    return result;
  }

  /* ------------------------------------------------------------------ */
  /* Conseils                                                           */
  /* ------------------------------------------------------------------ */

  function priorCategoryAverage(state, ym, months) {
    var totals = {};
    var counts = {};
    var sampleMonths = 0;
    for (var i = 1; i <= (months || 3); i++) {
      var key = shiftMonth(ym, -i);
      var monthTx = getMonthTransactions(state, key);
      if (monthTx.length) sampleMonths += 1;
      monthTx.forEach(function (t) {
        var cat = CATEGORY_MAP[t.category] ? t.category : 'autres';
        totals[cat] = (totals[cat] || 0) + (Number(t.amount) || 0);
        counts[cat] = (counts[cat] || 0) + 1;
      });
    }
    var out = {};
    Object.keys(totals).forEach(function (cat) {
      out[cat] = sampleMonths ? totals[cat] / sampleMonths : 0;
    });
    return { averages: out, sampleMonths: sampleMonths };
  }

  function adviceForCategory(cat) {
    var map = {
      alimentation: 'Prépare deux ou trois repas à la maison et fais une liste avant les courses.',
      sorties: 'Fixe une enveloppe sorties pour le week-end et privilégie une activité gratuite.',
      shopping: 'Attends 48 h avant tout achat non prévu : souvent, l’envie passe.',
      transport: 'Regroupe tes trajets et compare le coût d’un abonnement mensuel.',
      etudes: 'Vérifie les ressources gratuites de ta fac et les offres étudiantes avant d’acheter.',
      sante: 'Garde cette dépense : ta santé passe avant le budget.',
      autres: 'Regarde ce qui revient le plus souvent dans cette catégorie.',
      abonnements: 'Fais le tri : un abonnement peu utilisé peut financer plusieurs semaines de courses.',
      logement: 'Renégocier le loyer est difficile, mais vérifie les aides au logement disponibles.'
    };
    return map[cat] || 'Garde un œil sur cette catégorie pour les prochains jours.';
  }

  function buildInsights(state, a) {
    var insights = [];
    var settings = state.settings || {};
    var diff = a.projectedTotal - a.budget;

    if (a.budget <= 0) {
      return [{
        id: 'no-budget', tone: 'warn', tag: 'À compléter', icon: 'wallet',
        title: 'Renseigne ton budget',
        text: 'Ajoute ton revenu mensuel ou un budget personnalisé dans les réglages pour que je puisse calculer ta marge et te conseiller.'
      }];
    }

    if (!a.isPast && a.transactionCount < 4) {
      insights.push({
        id: 'data', tone: 'tip', tag: 'Pour commencer', icon: 'sparkles', rank: 2,
        title: 'Encore un peu de données',
        text: 'Ajoute tes dépenses des derniers jours pour que la prévision et les conseils collent à ton rythme réel. Un café, un trajet, des courses : tout compte.'
      });
    }

    if (a.isCurrent) {
      if (diff > 1) {
        var perDay = diff / Math.max(1, a.daysLeftInclusive);
        insights.push({
          id: 'forecast', tone: 'alert', tag: 'Prévision', icon: 'alert', rank: 0,
          title: 'Risque de dépassement',
          text: 'À ton rythme, tu terminerais le mois ' + formatMoneyRound(diff) + ' au-dessus de ton budget. Réduis tes dépenses variables d’environ ' + formatMoneyRound(perDay) + ' par jour pour revenir à l’équilibre.'
        });
      } else if (a.projectedTotal > a.budget * 0.9) {
        insights.push({
          id: 'forecast', tone: 'warn', tag: 'Prévision', icon: 'trend', rank: 1,
          title: 'Une marge un peu serrée',
          text: 'Il te resterait environ ' + formatMoneyRound(-diff) + ' à la fin du mois. Un ou deux ajustements suffisent pour finir sereinement.'
        });
      } else {
        insights.push({
          id: 'forecast', tone: 'good', tag: 'Prévision', icon: 'check', rank: 3,
          title: 'Trajectoire maîtrisée',
          text: 'À ce rythme, tu devrais terminer le mois avec ' + formatMoneyRound(-diff) + ' de marge. C’est le bon moment pour mettre un peu de côté.'
        });
      }
    } else if (a.isPast) {
      if (diff > 1) {
        insights.push({
          id: 'forecast', tone: 'warn', tag: 'Bilan', icon: 'trend', rank: 1,
          title: 'Un mois terminé dans le rouge',
          text: 'Tu as dépassé ton budget de ' + formatMoneyRound(diff) + '. Regarde les catégories qui ont le plus augmenté pour préparer le mois prochain.'
        });
      } else {
        insights.push({
          id: 'forecast', tone: 'good', tag: 'Bilan', icon: 'check', rank: 3,
          title: 'Un mois bouclé dans le vert',
          text: 'Tu as terminé avec ' + formatMoneyRound(-diff) + ' de marge sur ton budget. Tu peux les affecter à ton objectif d’épargne.'
        });
      }
    }

    var burden = a.fixedTotal / a.budget;
    if (burden >= 0.6) {
      insights.push({
        id: 'fixed', tone: 'warn', tag: 'Charges fixes', icon: 'home', rank: 1,
        title: 'Des charges fixes qui pèsent',
        text: 'Elles représentent ' + formatPercent(burden) + ' de ton budget (' + formatMoneyRound(a.fixedTotal) + '). Ce qui reste pour le quotidien est limité : évite d’ajouter de nouveaux abonnements ce mois-ci.'
      });
    }

    var currentVar = variableByCategory(state, a.ym);
    var prior = priorCategoryAverage(state, a.ym, 3);
    var anomalies = [];
    if (prior.sampleMonths > 0) {
      LEVERS.forEach(function (cat) {
        var avg = prior.averages[cat] || 0;
        if (avg < 40 || currentVar[cat] < 80) return;
        var expected = a.isCurrent ? avg * (a.elapsed / a.dim) : avg;
        var excess = currentVar[cat] - expected;
        if (expected > 0 && currentVar[cat] >= expected * 1.35 && excess >= 80) {
          anomalies.push({ cat: cat, amount: currentVar[cat], expected: expected, excess: excess });
        }
      });
      anomalies.sort(function (x, y) { return y.excess - x.excess; });
      anomalies.slice(0, 2).forEach(function (an) {
        var cat = getCategory(an.cat);
        insights.push({
          id: 'cat-' + an.cat, tone: an.excess > 250 ? 'warn' : 'tip', tag: cat.label, icon: 'chart', rank: an.excess > 250 ? 1 : 2,
          title: cat.label + ' : ' + formatMoneyRound(an.excess) + ' au-dessus de ton habitude',
          text: 'Ce mois-ci : ' + formatMoneyRound(an.amount) + ', contre environ ' + formatMoneyRound(an.expected) + ' à cette période d’un mois normal. ' + adviceForCategory(an.cat)
        });
      });
    }

    var caps = settings.categoryCaps || {};
    var capInsight = null;
    Object.keys(caps).forEach(function (cat) {
      var cap = Number(caps[cat]) || 0;
      if (cap <= 0) return;
      if (currentVar[cat] > cap && !capInsight) {
        var c = getCategory(cat);
        capInsight = {
          id: 'cap-' + cat, tone: 'alert', tag: 'Plafond', icon: 'alert', rank: 0,
          title: 'Plafond dépassé : ' + c.label,
          text: 'Tu as dépensé ' + formatMoneyRound(currentVar[cat]) + ', soit ' + formatMoneyRound(currentVar[cat] - cap) + ' au-dessus du plafond de ' + formatMoneyRound(cap) + ' que tu t’étais fixé.'
        };
      }
    });
    if (capInsight) insights.push(capInsight);

    if (a.isCurrent && a.daysLeftInclusive > 0 && a.todaySpent > Math.max(60, a.safeDaily * 1.2)) {
      insights.push({
        id: 'today', tone: 'warn', tag: 'Aujourd’hui', icon: 'clock', rank: 1,
        title: 'Journée au-dessus de ton enveloppe',
        text: 'Tu as dépensé ' + formatMoneyRound(a.todaySpent) + ' aujourd’hui, pour une enveloppe quotidienne d’environ ' + formatMoneyRound(Math.max(0, a.safeDaily)) + '. Rien de grave : les prochains jours peuvent rééquilibrer la balance.'
      });
    }

    if (a.isCurrent) {
      var start = new Date();
      start.setDate(start.getDate() - 6);
      var startISO = toISO(start);
      var small = getMonthTransactions(state, a.ym).filter(function (t) {
        return t.date >= startISO && Number(t.amount) <= 50;
      });
      var smallTotal = sum(small, function (t) { return t.amount; });
      if (small.length >= 4 && smallTotal >= 100) {
        insights.push({
          id: 'small', tone: 'tip', tag: 'Petites dépenses', icon: 'coffee', rank: 2,
          title: 'Les petites dépenses s’accumulent',
          text: small.length + ' achats de moins de 50 DH cette semaine, pour ' + formatMoneyRound(smallTotal) + ' au total. Avant un achat réflexe, laisse passer 24 h : c’est souvent là que se cache la marge.'
        });
      }
    }

    var subscriptions = getFixedCharges(state).filter(function (c) { return c.category === 'abonnements'; });
    var subTotal = sum(subscriptions, function (c) { return c.amount; });
    if (subTotal >= 100) {
      insights.push({
        id: 'subscriptions', tone: 'tip', tag: 'Abonnements', icon: 'phone', rank: 2,
        title: 'Fais le tri dans tes abonnements',
        text: formatMoneyRound(subTotal) + ' par mois, soit ' + formatMoneyRound(subTotal * 12) + ' par an. Vérifie les doublons et les offres étudiantes : un abonnement oublié est de l’argent qui dort.'
      });
    }

    if (a.savingsGoal > 0) {
      if (a.projectedSavings >= a.savingsGoal) {
        insights.push({
          id: 'goal', tone: 'good', tag: 'Épargne', icon: 'target', rank: 3,
          title: 'Objectif d’épargne en vue',
          text: 'À ce rythme, tu peux mettre ' + formatMoneyRound(a.projectedSavings) + ' de côté, soit ' + formatPercent(a.projectedSavings / a.savingsGoal) + ' de ton objectif de ' + formatMoneyRound(a.savingsGoal) + '.'
        });
      } else if (a.projectedSavings > 0) {
        var missing = a.savingsGoal - a.projectedSavings;
        var daily = a.isCurrent && a.daysLeftInclusive > 0 ? missing / a.daysLeftInclusive : 0;
        insights.push({
          id: 'goal', tone: 'tip', tag: 'Épargne', icon: 'target', rank: 2,
          title: 'Un coup de pouce pour ton objectif',
          text: 'Il manque ' + formatMoneyRound(missing) + ' pour atteindre ton objectif de ' + formatMoneyRound(a.savingsGoal) + '.' +
            (daily > 0 ? ' Réduire tes dépenses variables de ' + formatMoneyRound(daily) + ' par jour suffirait.' : ' Tu peux ajuster l’objectif ou réduire une catégorie le mois prochain.')
        });
      } else {
        insights.push({
          id: 'goal', tone: 'warn', tag: 'Épargne', icon: 'target', rank: 1,
          title: 'Objectif d’épargne compromis',
          text: 'À ce rythme, tu ne dégagerais pas d’épargne ce mois-ci. Commence par une petite somme : ' + formatMoneyRound(Math.max(50, Math.round(a.savingsGoal * 0.25))) + ' est déjà un bon début.'
        });
      }
    }

    var tx = getMonthTransactions(state, a.ym);
    var weekend = { total: 0, days: 0 };
    var weekday = { total: 0, days: 0 };
    for (var day = 1; day <= a.elapsed; day++) {
      var date = new Date(Number(a.ym.slice(0, 4)), Number(a.ym.slice(5, 7)) - 1, day);
      var dow = date.getDay();
      var iso = a.ym + '-' + pad(day);
      var dayTotal = sum(tx.filter(function (t) { return t.date === iso; }), function (t) { return t.amount; });
      if (dow === 0 || dow === 6) { weekend.total += dayTotal; weekend.days += 1; }
      else { weekday.total += dayTotal; weekday.days += 1; }
    }
    if (a.elapsed >= 7 && weekend.days >= 2 && weekday.days > 0) {
      var weekendAvg = weekend.total / weekend.days;
      var weekdayAvg = weekday.total / weekday.days;
      if (weekendAvg > weekdayAvg * 1.45 && weekend.total > 100) {
        insights.push({
          id: 'weekend', tone: 'tip', tag: 'Rythme', icon: 'calendar', rank: 2,
          title: 'Le week-end coûte plus cher',
          text: 'En moyenne ' + formatMoneyRound(weekendAvg) + ' le week-end contre ' + formatMoneyRound(weekdayAvg) + ' en semaine. Fixe-toi une enveloppe pour samedi-dimanche avant de sortir.'
        });
      }
    }

    if (a.isCurrent) {
      var noSpendDays = 0;
      for (var n = 0; n < 7; n++) {
        var nd = new Date();
        nd.setDate(nd.getDate() - n);
        var ndISO = toISO(nd);
        if (ndISO.slice(0, 7) !== a.ym) continue;
        if (!tx.some(function (t) { return t.date === ndISO; })) noSpendDays += 1;
      }
      if (noSpendDays >= 2) {
        insights.push({
          id: 'nospend', tone: 'good', tag: 'Bonne habitude', icon: 'leaf', rank: 3,
          title: noSpendDays + ' journées sans dépense cette semaine',
          text: 'C’est un excellent réflexe : ces journées laissent plus de marge pour la fin du mois. Continue à repérer celles qui sont faciles à reproduire.'
        });
      }
    }

    insights.sort(function (x, y) { return (x.rank || 2) - (y.rank || 2); });

    // Évite les doublons de bonnes nouvelles si le mois est déjà bien rempli.
    var seen = {};
    return insights.filter(function (i) {
      if (seen[i.id]) return false;
      seen[i.id] = true;
      return true;
    });
  }

  function summaryFor(state, a) {
    if (!a.budget) return 'Renseigne ton revenu ou un budget pour que je puisse analyser ta situation.';
    if (!a.transactionCount) return 'Ajoute ta première dépense pour lancer l’analyse de ton rythme.';
    var diff = a.budget - a.projectedTotal;
    if (a.isCurrent) {
      if (diff >= 0) {
        return 'À ton rythme actuel, tu devrais finir le mois avec ' + formatMoneyRound(diff) + ' de marge' +
          (a.savingsGoal > 0 ? ', soit ' + formatPercent(Math.max(0, diff) / a.savingsGoal) + ' de ton objectif d’épargne.' : '.');
      }
      return 'À ton rythme actuel, tu terminerais le mois avec ' + formatMoneyRound(-diff) + ' de dépassement. Quelques ajustements ciblés peuvent encore changer la trajectoire.';
    }
    if (diff >= 0) return 'Tu as bouclé le mois avec ' + formatMoneyRound(diff) + ' de marge. Regarde ce qui a bien fonctionné pour le reproduire.';
    return 'Tu as terminé le mois avec ' + formatMoneyRound(-diff) + ' de dépassement. Les analyses par catégorie t’aident à préparer le suivant.';
  }

  function getMonthlyHistory(state, ym, count) {
    var out = [];
    var n = count || 6;
    for (var i = n - 1; i >= 0; i--) {
      var key = shiftMonth(ym, -i);
      var a = analyzeMonth(state, key);
      out.push({
        ym: key,
        label: monthLabelShort(key),
        total: a.isCurrent ? a.projectedTotal : a.projectedTotal,
        budget: a.budget,
        isCurrent: a.isCurrent,
        status: a.status
      });
    }
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* Données d'exemple                                                  */
  /* ------------------------------------------------------------------ */

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a += 0x6D2B79F5;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var DEMO_LABELS = {
    alimentation: ['Courses au marché', 'Déjeuner au campus', 'Café & msemen', 'Supermarché du quartier', 'Sandwich rapide', 'Épicerie', 'Pizza du vendredi'],
    transport: ['Tramway', 'Bus', 'Petit taxi', 'Essence scooter'],
    sorties: ['Cinéma', 'Café entre amis', 'Resto du vendredi', 'Concert', 'Sortie bowling', 'Thé en terrasse'],
    etudes: ['Photocopies', 'Livre de cours', 'Fournitures', 'Licence logicielle'],
    shopping: ['Vêtements', 'Chaussures', 'Accessoire téléphone', 'Déco chambre'],
    sante: ['Pharmacie', 'Consultation', 'Vitamines'],
    autres: ['Cadeau', 'Lessive', 'Coupe de cheveux', 'Réparation vélo']
  };

  function generateDemoData(baseState) {
    var state = JSON.parse(JSON.stringify(baseState || {}));
    state.settings = state.settings || {};
    if (!state.settings.name) state.settings.name = 'Yasmine';
    if (!Number(state.settings.monthlyIncome)) state.settings.monthlyIncome = 5000;
    state.settings.budgetMode = 'income';
    state.settings.customBudget = state.settings.monthlyIncome;
    if (!Number(state.settings.savingsGoal)) state.settings.savingsGoal = 500;
    state.settings.categoryCaps = state.settings.categoryCaps || {};
    if (!Array.isArray(state.fixedCharges) || !state.fixedCharges.length) {
      state.fixedCharges = [
        { id: 'demo-charge-1', label: 'Loyer', amount: 1700, category: 'logement', day: 1 },
        { id: 'demo-charge-2', label: 'Transport', amount: 250, category: 'transport', day: 2 },
        { id: 'demo-charge-3', label: 'Téléphone & internet', amount: 150, category: 'abonnements', day: 5 }
      ];
    }

    var transactions = [];
    var now = new Date();
    var currentKey = currentMonthKey(now);
    var seed = 20260101 + (state.settings.name || '').split('').reduce(function (s, c) { return s + c.charCodeAt(0); }, 0);
    var counter = 0;
    var recentUses = {};
    var dayIndex = 0;

    for (var back = 2; back >= 0; back--) {
      var ym = shiftMonth(currentKey, -back);
      var dim = daysInMonth(ym);
      var isCurrent = back === 0;
      var lastDay = isCurrent ? Math.min(now.getDate(), dim) : dim;
      var rng = mulberry32(seed + back * 7919 + Number(ym.slice(0, 4)) * 31 + Number(ym.slice(5, 7)) * 17);

      for (var day = 1; day <= lastDay; day++) {
        var date = new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 1, day);
        var dow = date.getDay();
        var weekend = dow === 0 || dow === 6;
        var iso = ym + '-' + pad(day);
        var items = [];
        dayIndex += 1;

        if (rng() < 0.7) {
          var food = roundTo(25 + rng() * 34, 5);
          items.push({ category: 'alimentation', amount: Math.max(10, food) });
          if (rng() < 0.16) items.push({ category: 'alimentation', amount: roundTo(10 + rng() * 22, 5) });
        }
        if (rng() < 0.45) items.push({ category: 'transport', amount: Math.max(5, roundTo(8 + rng() * 22, 5)) });
        if ((weekend && rng() < 0.48) || (!weekend && rng() < 0.06)) {
          items.push({ category: 'sorties', amount: roundTo(45 + rng() * 130, 5) });
        }
        if (rng() < 0.035) items.push({ category: 'shopping', amount: roundTo(80 + rng() * 220, 5) });
        if (rng() < 0.025) items.push({ category: 'etudes', amount: roundTo(30 + rng() * 160, 5) });
        if (rng() < 0.012) items.push({ category: 'sante', amount: roundTo(40 + rng() * 110, 5) });
        if (rng() < 0.04) items.push({ category: 'autres', amount: roundTo(20 + rng() * 80, 5) });

        items.forEach(function (item) {
          var labels = DEMO_LABELS[item.category] || DEMO_LABELS.autres;
          var label = labels[Math.floor(rng() * labels.length)];
          for (var attempt = 0; attempt < 4 && recentUses[label] && dayIndex - recentUses[label] <= 2; attempt++) {
            label = labels[Math.floor(rng() * labels.length)];
          }
          recentUses[label] = dayIndex;
          counter += 1;
          transactions.push({
            id: 'demo-' + ym + '-' + pad(day) + '-' + counter,
            date: iso,
            amount: Math.max(5, item.amount),
            category: item.category,
            label: label
          });
        });
      }

      // Quelques achats marquants pour rendre les analyses plus parlantes.
      if (back === 1) {
        transactions.push({ id: 'demo-special-1', date: ym + '-14', amount: 380, category: 'sorties', label: 'Week-end improvisé' });
      }
      if (back === 2) {
        transactions.push({ id: 'demo-special-2', date: ym + '-08', amount: 449, category: 'shopping', label: 'Casque audio' });
      }
    }

    state.transactions = transactions.sort(function (a, b) {
      if (a.date === b.date) return a.id < b.id ? -1 : 1;
      return a.date < b.date ? -1 : 1;
    });
    state.settings.createdAt = state.settings.createdAt || new Date().toISOString();
    return state;
  }

  return {
    CATEGORIES: CATEGORIES,
    LEVERS: LEVERS,
    MONTHS: MONTHS,
    WEEKDAYS: WEEKDAYS,
    WEEKDAYS_SHORT: WEEKDAYS_SHORT,
    pad: pad,
    toISO: toISO,
    parseISO: parseISO,
    todayISO: todayISO,
    monthKey: monthKey,
    currentMonthKey: currentMonthKey,
    shiftMonth: shiftMonth,
    daysInMonth: daysInMonth,
    lastDayISO: lastDayISO,
    monthLabel: monthLabel,
    monthLabelShort: monthLabelShort,
    formatMoney: formatMoney,
    formatMoneyRound: formatMoneyRound,
    formatCompact: formatCompact,
    formatPercent: formatPercent,
    sum: sum,
    clamp: clamp,
    uid: uid,
    getCategory: getCategory,
    getBudget: getBudget,
    getFixedCharges: getFixedCharges,
    getMonthTransactions: getMonthTransactions,
    getCategoryTotals: getCategoryTotals,
    variableByCategory: variableByCategory,
    weekdayStats: weekdayStats,
    topExpenses: topExpenses,
    analyzeMonth: analyzeMonth,
    buildInsights: buildInsights,
    summaryFor: summaryFor,
    getScoreLabel: getScoreLabel,
    getConfidenceLabel: getConfidenceLabel,
    getMonthlyHistory: getMonthlyHistory,
    generateDemoData: generateDemoData
  };
});
