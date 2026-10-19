/* Cap Budget — vues principales. */
(function () {
  'use strict';

  var E = window.BudgetEngine;
  var I = window.CapIcons;
  var H = window.CapUI;

  function addButton() {
    return '<button type="button" class="btn btn-primary" data-action="add-tx">' + I.icon('plus') + 'Nouvelle dépense</button>';
  }

  function statCard(iconName, label, value, sub, tone, isOver) {
    return '<article class="stat-card' + (isOver ? ' is-over' : '') + '">' +
      '<div class="stat-top"><span class="stat-label">' + H.esc(label) + '</span><span class="stat-icon tone-' + (tone || 'green') + '">' + I.icon(iconName) + '</span></div>' +
      '<strong class="stat-value">' + value + '</strong>' +
      '<span class="stat-sub">' + sub + '</span>' +
    '</article>';
  }

  function heroCard(a) {
    var meta = H.statusMeta(a);
    var value = a.isCurrent ? a.remainingBudget : a.budget - a.projectedTotal;
    var spentPct = a.budget > 0 ? E.clamp((a.spentToDate / a.budget) * 100, 0, 100) : 0;
    var note;
    if (a.isCurrent) {
      if (a.remainingBudget < 0) {
        note = 'Il te manque ' + H.moneyRound(-a.remainingBudget) + ' pour boucler le mois sereinement.';
      } else if (a.daysLeftInclusive === 1) {
        note = 'Dernier jour du mois. Il te reste ' + H.moneyRound(Math.max(0, a.remainingBudget)) + ' à utiliser.';
      } else if (!a.transactionCount) {
        note = 'Enveloppe calculée à partir de ton revenu et de tes charges fixes.';
      } else {
        note = 'Soit ' + H.moneyRound(Math.max(0, a.safeDaily)) + ' par jour jusqu’au ' + H.lastDayLabel(a) + '.';
      }
    } else {
      note = 'Mois terminé · ' + a.transactionCount + ' ' + H.plural(a.transactionCount, 'dépense', 'dépenses') + ' variable' + (a.transactionCount > 1 ? 's' : '') + '.';
    }
    return '<article class="hero-card">' +
      '<div class="hero-top">' +
        '<span class="hero-pill tone-' + meta.tone + '"><i></i>' + meta.label + '</span>' +
        '<span class="hero-month">' + E.monthLabel(a.ym) + '</span>' +
      '</div>' +
      '<p class="hero-label">' + (a.isCurrent ? 'Reste à vivre' : 'Solde du mois') + '</p>' +
      '<div class="hero-amount' + (value < 0 ? ' is-negative' : '') + '">' + H.moneyRoundNum(value) + '<span>DH</span></div>' +
      '<p class="hero-note">' + H.esc(note) + '</p>' +
      '<div class="hero-progress' + (a.spentToDate > a.budget ? ' is-over' : '') + '"><span style="width:' + spentPct.toFixed(1) + '%"></span></div>' +
      '<div class="hero-foot">' +
        '<span>Dépensé <strong>' + H.money(a.spentToDate) + '</strong></span>' +
        '<span>Budget <strong>' + H.money(a.budget) + '</strong></span>' +
      '</div>' +
    '</article>';
  }

  function coachMini(state, a, insights) {
    var first = insights[0];
    return '<article class="card coach-card">' +
      '<div class="card-head">' +
        '<div><p class="eyebrow">Santé financière</p><h2>Tes repères</h2></div>' +
        '<span class="status-dot ' + (a.score >= 70 ? 'is-good' : a.score >= 50 ? 'is-watch' : 'is-bad') + '"></span>' +
      '</div>' +
      '<div class="coach-score">' +
        H.scoreRing(a.score, 104) +
        '<div class="coach-score-copy"><strong>' + a.scoreLabel + '</strong><span>' + (a.isCurrent ? 'Projection basée sur ton rythme' : 'Performance du mois') + '</span></div>' +
      '</div>' +
      '<p class="coach-summary">' + H.esc(E.summaryFor(state, a)) + '</p>' +
      (first ? '<div class="mini-tip tone-' + first.tone + '">' +
        '<span class="mini-tip-icon">' + I.icon(first.icon) + '</span>' +
        '<div><strong>' + H.esc(first.title) + '</strong><p>' + H.esc(H.truncate(first.text, 118)) + '</p></div>' +
      '</div>' : '') +
      '<button type="button" class="text-link" data-action="nav" data-view="coach">Voir mes conseils' + I.icon('arrow-right') + '</button>' +
    '</article>';
  }

  function chartCard(a) {
    return '<article class="card chart-card">' +
      '<div class="card-head chart-head">' +
        '<div><p class="eyebrow">Rythme</p><h2>Ton budget, jour après jour</h2></div>' +
        '<div class="chart-legend">' +
          '<span><i class="legend-line is-solid"></i>Dépensé</span>' +
          '<span><i class="legend-line is-ideal"></i>Rythme idéal</span>' +
          (a.isCurrent ? '<span><i class="legend-line is-projection"></i>Projection</span>' : '') +
        '</div>' +
      '</div>' +
      '<div class="chart-wrap">' + H.renderLineChart(a) + '</div>' +
      '<div class="chart-foot">' + chartFoot(a) + '</div>' +
    '</article>';
  }

  function chartFoot(a) {
    if (a.isPast) {
      return '<span class="chart-foot-dot"></span><span>' + a.transactionCount + ' ' + H.plural(a.transactionCount, 'dépense', 'dépenses') + ' variable' + (a.transactionCount > 1 ? 's' : '') + ' · ' + H.money(a.fixedTotal) + ' de charges fixes</span>';
    }
    var idealNow = a.dim > 0 ? (a.budget / a.dim) * a.elapsed : 0;
    var delta = a.spentToDate - idealNow;
    if (Math.abs(delta) < 1) return '<span class="chart-foot-dot"></span><span>Tu es pile sur ton rythme théorique à date.</span>';
    if (delta > 0) {
      return '<span class="chart-foot-dot is-watch"></span><span>Tu es ' + H.moneyRound(delta) + ' au-dessus du rythme théorique à date. La projection tient compte de cet écart.</span>';
    }
    return '<span class="chart-foot-dot is-good"></span><span>Tu es ' + H.moneyRound(-delta) + ' sous le rythme théorique à date. Continue comme ça.</span>';
  }

  function categoriesCard(cats) {
    return '<article class="card categories-card">' +
      '<div class="card-head">' +
        '<div><p class="eyebrow">Répartition</p><h2>Où part ton argent</h2></div>' +
        '<button type="button" class="text-link" data-action="nav" data-view="analyses">Détails' + I.icon('arrow-right') + '</button>' +
      '</div>' +
      H.renderDonut(cats, 5) +
    '</article>';
  }

  function recentCard(state, ui) {
    var recent = E.getMonthTransactions(state, ui.month).slice(0, 5);
    return '<article class="card recent-card">' +
      '<div class="card-head">' +
        '<div><p class="eyebrow">Journal</p><h2>Dernières dépenses</h2></div>' +
        '<button type="button" class="text-link" data-action="nav" data-view="transactions">Tout voir' + I.icon('arrow-right') + '</button>' +
      '</div>' +
      (recent.length
        ? '<div class="tx-list">' + recent.map(function (t) { return H.txRow(t, { showDate: true }); }).join('') + '</div>'
        : H.emptyState('🧾', 'Aucune dépense ce mois-ci', 'Ajoute ta première dépense pour voir ton budget prendre vie.', '<button type="button" class="btn btn-primary btn-sm" data-action="add-tx">' + I.icon('plus') + 'Ajouter une dépense</button>')) +
    '</article>';
  }

  function savingsCard(a) {
    var goal = a.savingsGoal;
    var possible = Math.max(0, a.projectedSavings);
    var progress = goal > 0 ? E.clamp((possible / goal) * 100, 0, 100) : 0;
    var note;
    if (a.isPast) {
      note = possible >= goal
        ? 'Objectif atteint. Tu peux affecter cette somme à ton épargne.'
        : 'Il manquait ' + H.moneyRound(goal - possible) + ' pour atteindre ton objectif.';
    } else if (a.projectedSavings >= goal) {
      note = 'Objectif atteint à ce rythme. Tu peux même viser un peu plus haut.';
    } else if (a.projectedSavings > 0) {
      var missing = goal - possible;
      var perDay = a.daysLeftInclusive > 0 ? missing / a.daysLeftInclusive : 0;
      note = 'Encore ' + H.moneyRound(missing) + ' pour ton objectif' + (perDay > 0 ? ', soit ' + H.moneyRound(perDay) + ' par jour à ajuster.' : '.');
    } else {
      note = 'À ce rythme, le budget sera dépassé et il ne restera rien pour épargner. Ajustons ensemble.';
    }
    return '<article class="card goal-card">' +
      '<div class="card-head">' +
        '<div><p class="eyebrow">Objectif d’épargne</p><h2>' + (goal > 0 ? H.money(goal) : 'À définir') + '</h2></div>' +
        '<button type="button" class="icon-btn subtle" data-action="open-settings" aria-label="Modifier l’objectif d’épargne">' + I.icon('settings') + '</button>' +
      '</div>' +
      (goal > 0
        ? '<div class="goal-amount">' +
            '<span>Possible à ce rythme</span>' +
            '<strong class="' + (a.projectedSavings < 0 ? 'is-negative' : '') + '">' + H.moneyRound(possible) + '<small> / ' + H.money(goal) + '</small></strong>' +
          '</div>' +
          '<div class="goal-track' + (a.projectedSavings < 0 ? ' is-over' : '') + '"><span style="width:' + progress.toFixed(1) + '%"></span></div>' +
          '<div class="goal-scale"><span>' + Math.round(progress) + ' % de l’objectif</span><span>' + (a.isCurrent ? 'fin ' + E.monthLabel(a.ym).toLowerCase() : 'bilan du mois') + '</span></div>' +
          '<p class="goal-note">' + H.esc(note) + '</p>' +
          '<button type="button" class="btn btn-secondary btn-sm btn-block" data-action="nav" data-view="coach">' + I.icon('sparkles') + 'Ajuster avec mes conseils</button>'
        : H.emptyState('🎯', 'Aucun objectif défini', 'Même 200 DH par mois changent la donne. Fixe un cap à ta marge.', '<button type="button" class="btn btn-primary btn-sm" data-action="open-settings">Définir un objectif</button>')) +
    '</article>';
  }

  function dashboard(state, ui) {
    var a = E.analyzeMonth(state, ui.month);
    var insights = E.buildInsights(state, a);
    var cats = E.getCategoryTotals(state, ui.month);
    var name = (state.settings.name || '').trim();
    var spentSub = a.transactionCount
      ? 'dont ' + H.money(a.fixedPaid) + ' de charges fixes'
      : 'Aucune dépense enregistrée';
    var confidence = E.getConfidenceLabel(a.confidence);
    var flag = a.status === 'over' ? ' is-over' : a.status === 'watch' ? ' is-watch' : '';
    var welcome = '';
    if (!state.transactions.length) {
      welcome = '<div class="welcome-banner">' +
        '<span class="welcome-emoji">👋</span>' +
        '<div><strong>Bienvenue dans ton espace' + (name ? ', ' + H.esc(name) : '') + '.</strong><p>Ajoute une dépense ou charge trois mois d’exemple pour voir la prévision et les conseils en action.</p></div>' +
        '<button type="button" class="btn btn-secondary btn-sm" data-action="load-demo">' + I.icon('sparkles') + 'Charger un exemple</button>' +
      '</div>';
    }
    return H.pageHead({
      eyebrow: H.todayLong(),
      title: name ? 'Bonjour, ' + name + '.' : 'Bonjour.',
      subtitle: 'Voici où en est ton budget ' + (a.isCurrent ? 'ce mois-ci' : 'en ' + E.monthLabel(ui.month).toLowerCase()) + '.',
      actions: H.monthSwitcher(ui) + addButton()
    }) + welcome +
      '<section class="overview-grid">' + heroCard(a) + coachMini(state, a, insights) + '</section>' +
      '<section class="stat-grid">' +
        statCard('wallet', 'Budget du mois', H.money(a.budget), state.settings.budgetMode === 'custom' ? 'Budget personnalisé' : 'Basé sur ton revenu', 'green') +
        statCard('receipt', 'Dépensé', H.money(a.spentToDate), spentSub, 'clay', a.spentToDate > a.budget) +
        statCard('trend', 'Projection fin de mois', H.moneyRound(a.projectedTotal), 'Prévision ' + confidence.toLowerCase() + ' · ' + E.formatCompact(a.low) + '–' + E.formatCompact(a.high) + ' DH', 'gold', a.status === 'over') +
        statCard('target', 'Épargne possible', H.moneyRound(a.projectedSavings), a.savingsGoal > 0 ? 'Objectif ' + H.money(a.savingsGoal) : 'Aucun objectif défini', 'blue', a.projectedSavings < 0) +
      '</section>' +
      '<section class="dashboard-grid">' + chartCard(a) + categoriesCard(cats) + '</section>' +
      '<section class="dashboard-grid bottom-grid">' + recentCard(state, ui) + savingsCard(a) + '</section>' +
      '<p class="local-note">' + I.icon('lock') + 'Tes données restent dans ce navigateur. Aucun compte, aucun envoi sur Internet.</p>';
  }

  function filteredTransactions(state, ui) {
    var query = H.normalizeText(ui.search || '');
    return E.getMonthTransactions(state, ui.month).filter(function (t) {
      if (ui.category && ui.category !== 'all' && t.category !== ui.category) return false;
      if (!query) return true;
      var haystack = H.normalizeText(t.label + ' ' + E.getCategory(t.category).label);
      return haystack.indexOf(query) !== -1;
    });
  }

  function txGroups(state, ui) {
    var list = filteredTransactions(state, ui);
    if (!list.length) {
      var filtered = (ui.search || '') || (ui.category && ui.category !== 'all');
      return {
        count: 0,
        total: 0,
        html: H.emptyState(filtered ? '🔎' : '🧾', filtered ? 'Aucun résultat' : 'Aucune dépense ce mois-ci', filtered ? 'Essaie un autre mot-clé ou une autre catégorie.' : 'Ajoute ta première dépense pour commencer à suivre ton rythme.', filtered ? '<button type="button" class="btn btn-secondary btn-sm" data-action="clear-filters">Réinitialiser les filtres</button>' : '<button type="button" class="btn btn-primary btn-sm" data-action="add-tx">' + I.icon('plus') + 'Ajouter une dépense</button>')
      };
    }
    var groups = {};
    list.forEach(function (t) {
      if (!groups[t.date]) groups[t.date] = [];
      groups[t.date].push(t);
    });
    var dates = Object.keys(groups).sort(function (a, b) { return a < b ? 1 : -1; });
    var html = dates.map(function (date) {
      var rows = groups[date];
      var total = E.sum(rows, function (t) { return t.amount; });
      return '<section class="tx-day-group">' +
        '<div class="tx-day-head"><span>' + H.dayHeading(date) + '</span><strong>− ' + H.money(total) + '</strong></div>' +
        '<div class="tx-list">' + rows.map(function (t) { return H.txRow(t); }).join('') + '</div>' +
      '</section>';
    }).join('');
    return { count: list.length, total: E.sum(list, function (t) { return t.amount; }), html: html };
  }

  function transactions(state, ui) {
    var a = E.analyzeMonth(state, ui.month);
    var groups = txGroups(state, ui);
    var top = E.topExpenses(state, ui.month, 1)[0];
    var options = '<option value="all">Toutes les catégories</option>' + E.CATEGORIES.map(function (c) {
      return '<option value="' + c.id + '"' + (ui.category === c.id ? ' selected' : '') + '>' + H.esc(c.label) + '</option>';
    }).join('');
    return H.pageHead({
      eyebrow: 'Tout ton mois, ligne par ligne',
      title: 'Transactions',
      subtitle: 'Retrouve, filtre et corrige tes dépenses de ' + E.monthLabel(ui.month).toLowerCase() + '.',
      actions: H.monthSwitcher(ui) + addButton()
    }) +
    '<section class="mini-stats">' +
      '<div><span>Total variable</span><strong>' + H.money(a.variableSpent) + '</strong></div>' +
      '<div><span>Dépenses</span><strong>' + a.transactionCount + '</strong></div>' +
      '<div><span>Moyenne / jour</span><strong>' + H.money(a.avgDailyVariable) + '</strong></div>' +
      '<div><span>Plus grosse dépense</span><strong>' + (top ? H.money(top.amount) : '—') + '</strong></div>' +
    '</section>' +
    '<section class="tx-toolbar">' +
      '<label class="search-field">' + I.icon('search') + '<input id="tx-search" type="search" placeholder="Rechercher une dépense…" value="' + H.esc(ui.search || '') + '" autocomplete="off"></label>' +
      '<label class="select-field"><span class="sr-only">Filtrer par catégorie</span><select id="tx-category-filter">' + options + '</select></label>' +
      '<span class="filter-count" id="tx-filter-count">' + groups.count + ' ' + H.plural(groups.count, 'dépense', 'dépenses') + ' · ' + H.money(groups.total) + '</span>' +
    '</section>' +
    '<section class="card tx-card">' +
      '<div id="tx-list">' + groups.html + '</div>' +
    '</section>';
  }

  function analysesKpis(history, a) {
    var totals = history.map(function (m) { return m.total; });
    var avg = totals.length ? E.sum(totals) / totals.length : 0;
    var maxMonth = history.slice().sort(function (x, y) { return y.total - x.total; })[0];
    return '<section class="mini-stats analytics-kpis">' +
      '<div><span>Moyenne sur 6 mois</span><strong>' + H.money(avg) + '</strong></div>' +
      '<div><span>Mois le plus élevé</span><strong>' + H.money(maxMonth ? maxMonth.total : 0) + '</strong><small>' + (maxMonth ? E.monthLabel(maxMonth.ym) : '—') + '</small></div>' +
      '<div><span>Charges fixes</span><strong>' + H.money(a.fixedTotal) + '</strong><small>' + (a.budget > 0 ? Math.round((a.fixedTotal / a.budget) * 100) + ' % du budget' : '—') + '</small></div>' +
      '<div><span>Part variable</span><strong>' + H.money(a.variableSpent) + '</strong><small>' + (a.fixedTotal + a.variableSpent > 0 ? Math.round((a.variableSpent / (a.fixedTotal + a.variableSpent)) * 100) + ' % des dépenses' : '—') + '</small></div>' +
    '</section>';
  }

  function analyses(state, ui) {
    var a = E.analyzeMonth(state, ui.month);
    var history = E.getMonthlyHistory(state, ui.month, 6);
    var currentCats = E.getCategoryTotals(state, ui.month);
    var previousCats = E.getCategoryTotals(state, E.shiftMonth(ui.month, -1));
    var weekday = E.weekdayStats(state, ui.month);
    var top = E.topExpenses(state, ui.month, 5);
    var spentTotal = a.fixedTotal + a.variableSpent;
    var fixedShare = spentTotal > 0 ? (a.fixedTotal / spentTotal) * 100 : 0;
    var variableShare = spentTotal > 0 ? (a.variableSpent / spentTotal) * 100 : 0;
    return H.pageHead({
      eyebrow: 'Comprendre, pas juger',
      title: 'Analyses',
      subtitle: 'Tes habitudes, tes évolutions et les endroits où quelques dirhams se cachent.',
      actions: H.monthSwitcher(ui) + addButton()
    }) +
    analysesKpis(history, a) +
    '<section class="analytics-grid">' +
      '<article class="card history-card">' +
        '<div class="card-head"><div><p class="eyebrow">Tendance</p><h2>6 derniers mois</h2></div><span class="card-note">La barre pointillée représente ton budget</span></div>' +
        H.renderHistoryChart(history, a.budget) +
      '</article>' +
      '<article class="card split-card">' +
        '<div class="card-head"><div><p class="eyebrow">Structure</p><h2>Fixe ou variable ?</h2></div></div>' +
        (spentTotal > 0
          ? '<div class="split-amount">' + H.money(spentTotal) + '<span>engagés ce mois-ci</span></div>' +
            '<div class="split-bar"><span class="is-fixed" style="width:' + fixedShare.toFixed(1) + '%"></span><span class="is-variable" style="width:' + variableShare.toFixed(1) + '%"></span></div>' +
            '<div class="split-legend">' +
              '<div><i class="is-fixed"></i><span>Charges fixes</span><strong>' + H.money(a.fixedTotal) + '</strong><small>' + Math.round(fixedShare) + ' %</small></div>' +
              '<div><i class="is-variable"></i><span>Dépenses variables</span><strong>' + H.money(a.variableSpent) + '</strong><small>' + Math.round(variableShare) + ' %</small></div>' +
            '</div>' +
            '<p class="card-note block">Les charges fixes sont comptées automatiquement chaque mois. Ce sont elles qui réduisent le plus ta marge de manœuvre.</p>'
          : H.emptyState('🧩', 'Rien à répartir pour l’instant', 'Ajoute une dépense pour voir la structure de ton budget.')) +
      '</article>' +
    '</section>' +
    '<section class="analytics-grid">' +
      '<article class="card compare-card">' +
        '<div class="card-head"><div><p class="eyebrow">Catégories</p><h2>Ce qui a changé</h2></div><span class="card-note">vs ' + E.monthLabel(E.shiftMonth(ui.month, -1)).toLowerCase() + '</span></div>' +
        H.renderCategoryCompare(currentCats, previousCats) +
      '</article>' +
      '<article class="card weekday-card">' +
        '<div class="card-head"><div><p class="eyebrow">Habitudes</p><h2>Ton rythme hebdo</h2></div></div>' +
        H.renderWeekdayChart(weekday) +
        '<p class="card-note block">Dépense variable moyenne par jour de la semaine, charges fixes exclues.</p>' +
      '</article>' +
    '</section>' +
    '<section class="card top-card">' +
      '<div class="card-head"><div><p class="eyebrow">Points chauds</p><h2>Les plus grosses dépenses</h2></div><span class="card-note">' + E.monthLabel(ui.month) + '</span></div>' +
      (top.length
        ? '<div class="top-list">' + top.map(function (t, index) {
            return '<div class="top-row">' +
              '<span class="top-rank">' + (index + 1) + '</span>' +
              H.txRow(t, { showDate: true }) +
            '</div>';
          }).join('') + '</div>'
        : H.emptyState('🏜️', 'Aucune dépense ce mois-ci', 'Tes plus grosses dépenses apparaîtront ici.')) +
    '</section>';
  }

  function coach(state, ui) {
    var a = E.analyzeMonth(state, ui.month);
    var insights = E.buildInsights(state, a);
    var title;
    if (a.isPast) title = a.status === 'over' ? 'Un mois formateur.' : 'Un mois bien tenu.';
    else if (a.status === 'over') title = 'Un dernier effort pour finir le mois.';
    else if (a.status === 'watch') title = 'Tu es proche du but.';
    else title = 'Tu maîtrises ton budget.';
    var goalChip = a.savingsGoal > 0 ? Math.round(a.goalProgress * 100) + ' % de l’objectif' : 'Aucun objectif';
    return H.pageHead({
      eyebrow: 'Ton coach personnel',
      title: 'Conseils',
      subtitle: 'Des recommandations calculées à partir de tes vraies dépenses, pas de généralités.',
      actions: H.monthSwitcher(ui) + addButton()
    }) +
    '<section class="card coach-hero">' +
      '<div class="coach-hero-score">' +
        H.scoreRing(a.score, 148) +
        '<strong>' + a.scoreLabel + '</strong>' +
        '<span>santé financière</span>' +
      '</div>' +
      '<div class="coach-hero-main">' +
        '<p class="eyebrow">' + (a.isCurrent ? 'Analyse en direct' : 'Bilan de ' + E.monthLabel(ui.month).toLowerCase()) + '</p>' +
        '<h2>' + H.esc(title) + '</h2>' +
        '<p class="coach-hero-summary">' + H.esc(E.summaryFor(state, a)) + '</p>' +
        '<div class="coach-chips">' +
          '<span><small>Projection</small><strong>' + H.moneyRound(a.projectedTotal) + '</strong></span>' +
          '<span><small>' + (a.isCurrent ? 'Reste à vivre' : 'Dépensé') + '</small><strong>' + H.moneyRound(a.isCurrent ? Math.max(0, a.remainingBudget) : a.spentToDate) + '</strong></span>' +
          '<span><small>Objectif d’épargne</small><strong>' + goalChip + '</strong></span>' +
        '</div>' +
      '</div>' +
    '</section>' +
    '<div class="section-heading"><div><p class="eyebrow">Personnalisé</p><h2>Tes conseils du moment</h2></div><span class="count-badge">' + insights.length + ' ' + H.plural(insights.length, 'conseil') + '</span></div>' +
    '<section class="insights-grid">' + insights.map(function (insight) { return H.renderInsight(insight); }).join('') + '</section>' +
    (a.isCurrent ? simulator(a) : '') +
    '<section class="card how-card">' +
      '<div class="card-head"><div><p class="eyebrow">Transparence</p><h2>Comment je calcule ?</h2></div></div>' +
      '<div class="how-grid">' +
        '<div><span class="how-icon">' + I.icon('chart') + '</span><h3>J’apprends ton rythme</h3><p>Je regarde tes 14 derniers jours et tes trois mois précédents, en tenant compte des week-ends.</p></div>' +
        '<div><span class="how-icon">' + I.icon('trend') + '</span><h3>Je projette la fin du mois</h3><p>J’ajoute tes charges fixes restantes et une fourchette de prévision pour les jours à venir.</p></div>' +
        '<div><span class="how-icon">' + I.icon('lock') + '</span><h3>Je reste sur ton appareil</h3><p>Aucun compte, aucun serveur : tes données sont stockées uniquement dans ce navigateur.</p></div>' +
      '</div>' +
    '</section>';
  }

  function simulator(a) {
    var pct = window.CapApp ? window.CapApp.getReduction() : 15;
    var values = simulatorValues(a, pct);
    return '<section class="card simulator">' +
      '<div class="sim-head">' +
        '<div><p class="eyebrow">Simulateur</p><h2>Et si tu réduisais tes dépenses variables ?</h2><p>Fais glisser pour voir l’effet sur la fin du mois. Aucun changement n’est enregistré.</p></div>' +
        '<strong class="sim-percent" id="sim-percent">−' + pct + ' %</strong>' +
      '</div>' +
      '<input type="range" id="sim-range" min="0" max="40" step="5" value="' + pct + '" style="--fill:' + (pct / 40 * 100) + '%" aria-label="Pourcentage de réduction des dépenses variables">' +
      '<div class="sim-scale"><span>Ne rien changer</span><span>−40 %</span></div>' +
      '<div class="sim-results">' +
        '<div><span>Nouvelle projection</span><strong id="sim-projection">' + H.moneyRound(values.projection) + '</strong></div>' +
        '<div><span>Économies</span><strong class="is-good" id="sim-savings">' + H.moneyRound(values.savings) + '</strong></div>' +
        '<div><span>Fin du mois</span><strong id="sim-status" class="' + values.statusClass + '">' + values.status + '</strong></div>' +
      '</div>' +
    '</section>';
  }

  function simulatorValues(a, pct) {
    var future = Math.max(0, a.projectedVariable - a.variableSpent);
    var savings = future * (pct / 100);
    var projection = a.projectedTotal - savings;
    var gap = a.budget - projection;
    return {
      projection: projection,
      savings: savings,
      status: gap >= 0 ? 'Dans le budget' : 'Dépassement de ' + H.moneyRound(-gap),
      statusClass: gap >= 0 ? 'is-good' : 'is-bad'
    };
  }

  window.CapViews = {
    dashboard: dashboard,
    transactions: transactions,
    analyses: analyses,
    coach: coach,
    txGroups: txGroups,
    filteredTransactions: filteredTransactions,
    simulatorValues: simulatorValues
  };
})();
