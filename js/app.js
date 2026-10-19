/* Cap Budget — logique applicative, stockage local et événements. */
(function () {
  'use strict';

  var E = window.BudgetEngine;
  var I = window.CapIcons;
  var H = window.CapUI;
  var V = window.CapViews;
  var M = window.CapModals;
  var STORAGE_KEY = 'capbudget.v1';

  var state = null;
  var lastFocus = null;
  var deleteResetTimer = null;

  var ui = {
    view: 'dashboard',
    month: E.currentMonthKey(),
    search: '',
    category: 'all',
    coachReduction: 15
  };

  function $(selector, root) {
    return (root || document).querySelector(selector);
  }

  function $$(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  window.CapApp = {
    getState: function () { return state; },
    getReduction: function () { return ui.coachReduction; }
  };

  /* ------------------------------------------------------------------ */
  /* Stockage                                                           */
  /* ------------------------------------------------------------------ */

  function toAmount(value) {
    var n = Number(value);
    return isFinite(n) && n >= 0 ? n : 0;
  }

  function normalizeState(raw) {
    if (!raw || typeof raw !== 'object' || !raw.settings) return null;
    var settings = raw.settings;
    var caps = {};
    if (settings.categoryCaps && typeof settings.categoryCaps === 'object') {
      E.LEVERS.forEach(function (id) {
        var value = Number(settings.categoryCaps[id]);
        if (value > 0) caps[id] = value;
      });
    }
    var fixedCharges = (Array.isArray(raw.fixedCharges) ? raw.fixedCharges : []).filter(function (c) {
      return c && Number(c.amount) > 0;
    }).map(function (c) {
      var cat = E.getCategory(c.category);
      return {
        id: c.id || E.uid('charge'),
        label: String(c.label || cat.label).slice(0, 60),
        amount: toAmount(c.amount),
        category: cat.id,
        day: E.clamp(parseInt(c.day, 10) || 1, 1, 31)
      };
    });
    var transactions = (Array.isArray(raw.transactions) ? raw.transactions : []).filter(function (t) {
      return t && /^\d{4}-\d{2}-\d{2}$/.test(String(t.date || '')) && Number(t.amount) > 0;
    }).map(function (t) {
      var cat = E.getCategory(t.category);
      return {
        id: t.id || E.uid('tx'),
        date: String(t.date),
        amount: toAmount(t.amount),
        category: cat.id,
        label: String(t.label || cat.label).slice(0, 70)
      };
    }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });

    return {
      version: 2,
      settings: {
        name: String(settings.name || '').slice(0, 40),
        monthlyIncome: toAmount(settings.monthlyIncome),
        budgetMode: settings.budgetMode === 'custom' ? 'custom' : 'income',
        customBudget: toAmount(settings.customBudget),
        savingsGoal: toAmount(settings.savingsGoal),
        categoryCaps: caps,
        currency: 'MAD',
        createdAt: settings.createdAt || new Date().toISOString()
      },
      fixedCharges: fixedCharges,
      transactions: transactions
    };
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return normalizeState(JSON.parse(raw));
    } catch (error) {
      return null;
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (error) {
      toast('Impossible d’enregistrer les données dans ce navigateur.', 'warn');
      return false;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Coquille de navigation                                             */
  /* ------------------------------------------------------------------ */

  var NAV = [
    { view: 'dashboard', label: 'Vue d’ensemble', short: 'Accueil', icon: 'dashboard' },
    { view: 'transactions', label: 'Transactions', short: 'Dépenses', icon: 'receipt' },
    { view: 'analyses', label: 'Analyses', short: 'Analyses', icon: 'chart' },
    { view: 'coach', label: 'Conseils', short: 'Coach', icon: 'sparkles' }
  ];

  function initShell() {
    var sidebar = $('#sidebar');
    var mobile = $('#mobile-nav');
    if (!sidebar || !mobile) return;

    var navHtml = NAV.map(function (item) {
      return '<button type="button" class="nav-item" data-action="nav" data-view="' + item.view + '">' +
        I.icon(item.icon) + '<span>' + item.label + '</span>' +
      '</button>';
    }).join('');

    sidebar.innerHTML =
      '<div class="brand">' +
        '<span class="brand-mark">' + I.logo + '</span>' +
        '<div><strong>capbudget<span>.</span></strong><small>Ton budget étudiant</small></div>' +
      '</div>' +
      '<nav class="nav" aria-label="Navigation principale">' + navHtml + '</nav>' +
      '<p class="sidebar-note">' + I.icon('lock') + 'Tes données restent sur cet appareil.</p>' +
      '<div class="sidebar-user">' +
        '<span class="avatar js-avatar">CB</span>' +
        '<div class="sidebar-user-copy"><strong class="js-user-name">Mon espace</strong><span>Espace personnel</span></div>' +
        '<button type="button" class="icon-btn sidebar-settings" data-action="open-settings" aria-label="Ouvrir les réglages">' + I.icon('settings') + '</button>' +
      '</div>';

    mobile.innerHTML = NAV.map(function (item) {
      return '<button type="button" class="mobile-nav-item" data-action="nav" data-view="' + item.view + '">' +
        I.icon(item.icon) + '<span>' + item.short + '</span>' +
      '</button>';
    }).join('') +
    '<button type="button" class="mobile-nav-item" data-action="open-settings">' + I.icon('settings') + '<span>Réglages</span></button>';
  }

  function updateShell() {
    var name = state && state.settings.name ? state.settings.name.trim() : '';
    $$('.js-user-name').forEach(function (el) { el.textContent = name || 'Mon espace'; });
    $$('.js-avatar').forEach(function (el) { el.textContent = H.initials(name); });
    $$('[data-view]').forEach(function (el) {
      var active = el.getAttribute('data-view') === ui.view;
      el.classList.toggle('is-active', active);
      if (active) el.setAttribute('aria-current', 'page');
      else el.removeAttribute('aria-current');
    });
  }

  function navigate(view) {
    if (!NAV.some(function (item) { return item.view === view; })) return;
    ui.view = view;
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function render() {
    if (!state) {
      renderOnboarding();
      return;
    }
    var html;
    if (ui.view === 'transactions') html = V.transactions(state, ui);
    else if (ui.view === 'analyses') html = V.analyses(state, ui);
    else if (ui.view === 'coach') html = V.coach(state, ui);
    else html = V.dashboard(state, ui);
    $('#view-root').innerHTML = '<div class="view view-enter">' + html + '</div>';
    updateShell();
    if (ui.view === 'coach') updateSimulator();
  }

  function changeMonth(delta) {
    var next = E.shiftMonth(ui.month, delta);
    if (next > E.currentMonthKey()) return;
    ui.month = next;
    ui.search = '';
    ui.category = 'all';
    render();
  }

  /* ------------------------------------------------------------------ */
  /* Fenêtres                                                           */
  /* ------------------------------------------------------------------ */

  function openModal(html, options) {
    var opts = options || {};
    lastFocus = document.activeElement;
    var root = $('#modal-root');
    root.innerHTML = '<div class="modal-overlay" data-overlay>' +
      '<div class="modal ' + (opts.className || '') + '" role="dialog" aria-modal="true"' +
      (opts.labelledBy ? ' aria-labelledby="' + opts.labelledBy + '"' : '') + '>' + html + '</div>' +
    '</div>';
    document.body.classList.add('modal-open');
    var overlay = root.querySelector('.modal-overlay');
    var modal = root.querySelector('.modal');
    // Petit délai pour déclencher l'animation d'entrée.
    window.requestAnimationFrame(function () { overlay.classList.add('is-open'); });
    var target = modal.querySelector('[data-autofocus]') ||
      modal.querySelector('input:not([type="hidden"]):not([disabled])') ||
      modal.querySelector('select:not([disabled])') ||
      modal.querySelector('.btn-primary') ||
      modal.querySelector('button');
    if (target) window.setTimeout(function () { target.focus(); }, 60);
    if (opts.onOpen) opts.onOpen(modal);
  }

  function closeModal() {
    var root = $('#modal-root');
    var overlay = root.querySelector('.modal-overlay');
    if (!overlay) return;
    overlay.classList.remove('is-open');
    document.body.classList.remove('modal-open');
    window.setTimeout(function () {
      if (root.querySelector('.modal-overlay:not(.is-open)')) root.innerHTML = '';
    }, 220);
    if (lastFocus && lastFocus.isConnected && typeof lastFocus.focus === 'function') {
      window.setTimeout(function () { lastFocus.focus(); }, 80);
    }
  }

  function modalIsOnboarding() {
    return !!$('#modal-root .modal.onboarding-modal');
  }

  function trapFocus(event) {
    var modal = $('#modal-root .modal');
    if (!modal) return;
    var nodes = $$('a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', modal)
      .filter(function (el) { return el.offsetParent !== null || el === document.activeElement; });
    if (!nodes.length) return;
    var first = nodes[0];
    var last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function toast(message, tone) {
    var root = $('#toast-root');
    if (!root) return;
    var type = tone || 'success';
    var iconName = type === 'warn' ? 'alert' : type === 'info' ? 'info' : 'check';
    var el = document.createElement('div');
    el.className = 'toast toast-' + type;
    el.innerHTML = '<span class="toast-icon">' + I.icon(iconName) + '</span><span>' + H.esc(message) + '</span>';
    root.appendChild(el);
    window.requestAnimationFrame(function () { el.classList.add('is-visible'); });
    window.setTimeout(function () {
      el.classList.remove('is-visible');
      window.setTimeout(function () { el.remove(); }, 250);
    }, 3400);
  }

  /* ------------------------------------------------------------------ */
  /* Onboarding                                                         */
  /* ------------------------------------------------------------------ */

  function renderOnboarding() {
    initShell();
    openModal(M.onboarding(), { className: 'onboarding-modal', labelledBy: 'onboarding-title' });
    updateShell();
  }

  function readCharges(container) {
    if (!container) return [];
    return $$('.charge-row', container).map(function (row) {
      var labelInput = $('[name="chargeLabel"]', row);
      var amountInput = $('[name="chargeAmount"]', row);
      var categoryInput = $('[name="chargeCategory"]', row);
      var dayInput = $('[name="chargeDay"]', row);
      var label = labelInput ? labelInput.value.trim() : '';
      var amount = amountInput ? parseFloat(amountInput.value) : 0;
      if (!label && !(amount > 0)) return null;
      if (!(amount > 0)) return null;
      var cat = E.getCategory(categoryInput ? categoryInput.value : 'autres');
      return {
        id: E.uid('charge'),
        label: label || cat.label,
        amount: amount,
        category: cat.id,
        day: E.clamp(parseInt(dayInput ? dayInput.value : 1, 10) || 1, 1, 31)
      };
    }).filter(Boolean);
  }

  function handleOnboarding(event) {
    event.preventDefault();
    var form = event.target;
    var mode = event.submitter && event.submitter.value ? event.submitter.value : 'demo';
    var name = (form.querySelector('[name="name"]').value || '').trim().slice(0, 40);
    var income = parseFloat(form.querySelector('[name="income"]').value);
    var savingsGoal = Math.max(0, parseFloat(form.querySelector('[name="savingsGoal"]').value) || 0);
    if (!(income > 0)) {
      toast('Ajoute un revenu mensuel supérieur à 0 pour créer ton budget.', 'warn');
      form.querySelector('[name="income"]').focus();
      return;
    }
    var charges = readCharges($('#onboarding-charges'));
    var base = {
      version: 2,
      settings: {
        name: name,
        monthlyIncome: income,
        budgetMode: 'income',
        customBudget: income,
        savingsGoal: savingsGoal,
        categoryCaps: {},
        currency: 'MAD',
        createdAt: new Date().toISOString()
      },
      fixedCharges: charges,
      transactions: []
    };
    state = mode === 'demo' ? E.generateDemoData(base) : base;
    persist();
    ui.month = E.currentMonthKey();
    ui.view = 'dashboard';
    ui.search = '';
    ui.category = 'all';
    closeModal();
    initShell();
    render();
    toast(mode === 'demo' ? 'Ton espace est prêt, avec trois mois d’exemple.' : 'Ton espace est prêt. Ajoute ta première dépense !');
  }

  /* ------------------------------------------------------------------ */
  /* Réglages                                                           */
  /* ------------------------------------------------------------------ */

  function openSettings() {
    if (!state) return;
    openModal(M.settings(state), { className: 'settings-modal', labelledBy: 'settings-title' });
  }

  function toggleBudgetMode(mode) {
    var field = $('#custom-budget-field');
    if (!field) return;
    var input = field.querySelector('input');
    var isCustom = mode === 'custom';
    field.classList.toggle('is-muted', !isCustom);
    if (input) input.disabled = !isCustom;
    $$('.radio-card').forEach(function (label) {
      var radio = label.querySelector('input');
      label.classList.toggle('is-selected', !!(radio && radio.checked));
    });
  }

  function handleSettings(event) {
    event.preventDefault();
    var form = event.target;
    var modeRadio = form.querySelector('[name="budgetMode"]:checked');
    var mode = modeRadio ? modeRadio.value : 'income';
    var income = Math.max(0, parseFloat(form.querySelector('[name="income"]').value) || 0);
    var custom = Math.max(0, parseFloat(form.querySelector('[name="customBudget"]').value) || 0);
    var savingsGoal = Math.max(0, parseFloat(form.querySelector('[name="savingsGoal"]').value) || 0);
    var name = (form.querySelector('[name="name"]').value || '').trim().slice(0, 40);
    if (mode === 'income' && !(income > 0)) {
      toast('Indique ton revenu mensuel ou choisis un budget personnalisé.', 'warn');
      form.querySelector('[name="income"]').focus();
      return;
    }
    if (mode === 'custom' && !(custom > 0)) {
      toast('Indique un budget personnalisé supérieur à 0.', 'warn');
      form.querySelector('[name="customBudget"]').focus();
      return;
    }
    var charges = readCharges($('#settings-charges'));
    var caps = {};
    E.LEVERS.forEach(function (id) {
      var input = form.querySelector('[name="cap_' + id + '"]');
      var value = input ? parseFloat(input.value) : 0;
      if (value > 0) caps[id] = value;
    });
    state.settings.name = name;
    state.settings.monthlyIncome = income;
    state.settings.customBudget = custom || income;
    state.settings.budgetMode = mode;
    state.settings.savingsGoal = savingsGoal;
    state.settings.categoryCaps = caps;
    state.fixedCharges = charges;
    persist();
    closeModal();
    initShell();
    render();
    toast('Tes réglages sont enregistrés.');
  }

  /* ------------------------------------------------------------------ */
  /* Transactions                                                       */
  /* ------------------------------------------------------------------ */

  function openTransaction(id) {
    if (!state) return;
    var tx = id ? state.transactions.find(function (t) { return t.id === id; }) : null;
    var defaultDate = ui.month === E.currentMonthKey() ? E.todayISO() : E.lastDayISO(ui.month);
    openModal(M.transaction(tx, ui, defaultDate), { className: 'tx-modal', labelledBy: 'tx-title' });
  }

  function handleTransaction(event) {
    event.preventDefault();
    var form = event.target;
    var amount = parseFloat(form.querySelector('[name="amount"]').value);
    var date = form.querySelector('[name="date"]').value;
    var category = E.getCategory(form.querySelector('[name="category"]').value);
    var labelInput = form.querySelector('[name="label"]');
    var label = (labelInput.value || '').trim().slice(0, 70) || category.label;
    if (!(amount > 0)) {
      toast('Ajoute un montant supérieur à 0.', 'warn');
      form.querySelector('[name="amount"]').focus();
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      toast('Choisis une date valide.', 'warn');
      return;
    }
    var id = form.querySelector('[name="id"]').value;
    if (id) {
      var existing = state.transactions.find(function (t) { return t.id === id; });
      if (existing) {
        existing.amount = amount;
        existing.date = date;
        existing.category = category.id;
        existing.label = label;
      }
    } else {
      state.transactions.push({
        id: E.uid('tx'),
        date: date,
        amount: amount,
        category: category.id,
        label: label
      });
    }
    state.transactions.sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    ui.month = date.slice(0, 7);
    ui.search = '';
    ui.category = 'all';
    persist();
    closeModal();
    render();
    toast(id ? 'Dépense modifiée.' : 'Dépense ajoutée.');
  }

  function requestDelete(button) {
    if (!button) return;
    if (button.getAttribute('data-armed') === '1') {
      deleteTransaction(button.getAttribute('data-id'));
      return;
    }
    button.setAttribute('data-armed', '1');
    button.setAttribute('data-original', button.innerHTML);
    button.classList.add('is-armed');
    button.innerHTML = I.icon('alert') + 'Confirmer la suppression';
    window.clearTimeout(deleteResetTimer);
    deleteResetTimer = window.setTimeout(function () {
      if (button.isConnected) {
        button.removeAttribute('data-armed');
        button.classList.remove('is-armed');
        button.innerHTML = button.getAttribute('data-original') || (I.icon('trash') + 'Supprimer');
      }
    }, 4000);
  }

  function deleteTransaction(id) {
    state.transactions = state.transactions.filter(function (t) { return t.id !== id; });
    persist();
    closeModal();
    render();
    toast('Dépense supprimée.');
  }

  function updateTransactionList() {
    var container = $('#tx-list');
    if (!container) return;
    var groups = V.txGroups(state, ui);
    container.innerHTML = groups.html;
    var count = $('#tx-filter-count');
    if (count) count.textContent = groups.count + ' ' + H.plural(groups.count, 'dépense', 'dépenses') + ' · ' + H.money(groups.total);
  }

  /* ------------------------------------------------------------------ */
  /* Simulateur                                                         */
  /* ------------------------------------------------------------------ */

  function updateSimulator() {
    var range = $('#sim-range');
    if (!range) return;
    var a = E.analyzeMonth(state, ui.month);
    var pct = Number(range.value) || 0;
    range.style.setProperty('--fill', (pct / 40 * 100) + '%');
    var values = V.simulatorValues(a, pct);
    var label = $('#sim-percent');
    var projection = $('#sim-projection');
    var savings = $('#sim-savings');
    var status = $('#sim-status');
    if (label) label.textContent = pct === 0 ? '0 %' : '−' + pct + ' %';
    if (projection) projection.textContent = H.moneyRound(values.projection);
    if (savings) savings.textContent = H.moneyRound(values.savings);
    if (status) {
      status.textContent = values.status;
      status.className = values.statusClass;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Données                                                            */
  /* ------------------------------------------------------------------ */

  function applyDemo() {
    if (!state) return;
    state = E.generateDemoData(state);
    persist();
    closeModal();
    ui.month = E.currentMonthKey();
    ui.view = 'dashboard';
    ui.search = '';
    ui.category = 'all';
    initShell();
    render();
    toast('Trois mois d’exemple chargés. Explore les analyses !');
  }

  function loadDemo() {
    if (!state) return;
    if (state.transactions.length) {
      openModal(M.confirm({
        title: 'Charger les données d’exemple ?',
        text: 'Cela remplacera tes dépenses actuelles par trois mois de dépenses fictives. Ton profil, tes charges fixes et ton objectif seront conservés.',
        label: 'Charger l’exemple',
        action: 'confirm-demo',
        icon: 'sparkles',
        tone: 'warn'
      }), { className: 'confirm-modal', labelledBy: 'confirm-title' });
      return;
    }
    applyDemo();
  }

  function resetAll() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (error) { /* ignore */ }
    state = null;
    ui.view = 'dashboard';
    ui.month = E.currentMonthKey();
    ui.search = '';
    ui.category = 'all';
    closeModal();
    initShell();
    renderOnboarding();
    toast('Espace réinitialisé.', 'info');
  }

  function exportData() {
    if (!state) return;
    var blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = 'capbudget-' + E.todayISO() + '.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1200);
    toast('Sauvegarde exportée.', 'success');
  }

  function importFile(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var parsed = JSON.parse(String(reader.result));
        var normalized = normalizeState(parsed);
        if (!normalized) throw new Error('format');
        state = normalized;
        persist();
        closeModal();
        ui.month = E.currentMonthKey();
        ui.view = 'dashboard';
        ui.search = '';
        ui.category = 'all';
        initShell();
        render();
        toast('Sauvegarde importée.');
      } catch (error) {
        toast('Ce fichier n’est pas une sauvegarde Cap Budget valide.', 'warn');
      }
    };
    reader.readAsText(file);
  }

  /* ------------------------------------------------------------------ */
  /* Événements                                                         */
  /* ------------------------------------------------------------------ */

  function handleClick(event) {
    if (event.target.classList && event.target.classList.contains('modal-overlay')) {
      if (!modalIsOnboarding()) closeModal();
      return;
    }
    var actionEl = event.target.closest ? event.target.closest('[data-action]') : null;
    if (!actionEl) return;
    var action = actionEl.getAttribute('data-action');

    if (action === 'nav') {
      event.preventDefault();
      navigate(actionEl.getAttribute('data-view'));
      return;
    }

    event.preventDefault();

    if (action === 'prev-month') changeMonth(-1);
    else if (action === 'next-month') changeMonth(1);
    else if (action === 'add-tx') openTransaction();
    else if (action === 'edit-tx') openTransaction(actionEl.getAttribute('data-id'));
    else if (action === 'open-settings') openSettings();
    else if (action === 'close-modal') closeModal();
    else if (action === 'add-charge') {
      var target = document.getElementById(actionEl.getAttribute('data-target'));
      if (target) {
        target.insertAdjacentHTML('beforeend', M.chargeRow({}));
        var newRow = target.lastElementChild;
        var labelInput = newRow ? newRow.querySelector('[name="chargeLabel"]') : null;
        if (labelInput) labelInput.focus();
      }
    } else if (action === 'remove-charge') {
      var row = actionEl.closest('.charge-row');
      if (row) row.remove();
    } else if (action === 'pick-category') {
      var form = actionEl.closest('form');
      if (form) {
        var hidden = form.querySelector('[name="category"]');
        if (hidden) hidden.value = actionEl.getAttribute('data-cat');
        $$('.category-chip', form).forEach(function (chip) { chip.classList.remove('is-selected'); });
        actionEl.classList.add('is-selected');
      }
    } else if (action === 'quick-amount') {
      var amountInput = $('#tx-form [name="amount"]');
      if (amountInput) {
        amountInput.value = actionEl.getAttribute('data-amount');
        amountInput.focus();
      }
    } else if (action === 'delete-tx') requestDelete(actionEl);
    else if (action === 'clear-filters') {
      ui.search = '';
      ui.category = 'all';
      render();
    } else if (action === 'export-data') exportData();
    else if (action === 'import-data') {
      var input = $('#import-input');
      if (input) input.click();
    } else if (action === 'load-demo') loadDemo();
    else if (action === 'confirm-demo') applyDemo();
    else if (action === 'reset-data') {
      openModal(M.confirm({
        title: 'Tout effacer ?',
        text: 'Tes dépenses, tes charges fixes et tes réglages seront supprimés de ce navigateur. Pense à exporter une sauvegarde avant si tu veux les retrouver.',
        label: 'Tout effacer',
        action: 'confirm-reset',
        icon: 'trash',
        tone: 'alert',
        danger: true
      }), { className: 'confirm-modal', labelledBy: 'confirm-title' });
    } else if (action === 'confirm-reset') resetAll();
  }

  function handleSubmit(event) {
    // Attention : un champ nommé « id » (formulaire de dépense) masque form.id.
    var formId = event.target && event.target.getAttribute ? event.target.getAttribute('id') : '';
    if (formId === 'onboarding-form') handleOnboarding(event);
    else if (formId === 'settings-form') handleSettings(event);
    else if (formId === 'tx-form') handleTransaction(event);
  }

  function handleInput(event) {
    if (event.target.id === 'tx-search') {
      ui.search = event.target.value;
      updateTransactionList();
    } else if (event.target.id === 'sim-range') {
      ui.coachReduction = Number(event.target.value) || 0;
      updateSimulator();
    }
  }

  function handleChange(event) {
    if (event.target.id === 'tx-category-filter') {
      ui.category = event.target.value;
      updateTransactionList();
    } else if (event.target.name === 'budgetMode') {
      toggleBudgetMode(event.target.value);
    } else if (event.target.id === 'import-input') {
      importFile(event.target.files && event.target.files[0]);
      event.target.value = '';
    }
  }

  function handleKeydown(event) {
    if (!$('#modal-root .modal')) return;
    if (event.key === 'Escape') {
      if (!modalIsOnboarding()) closeModal();
      return;
    }
    if (event.key === 'Tab') trapFocus(event);
  }

  function init() {
    initShell();
    var loaded = loadState();
    if (loaded) {
      state = loaded;
      ui.month = E.currentMonthKey();
      render();
    } else {
      renderOnboarding();
    }
    document.addEventListener('click', handleClick);
    document.addEventListener('submit', handleSubmit);
    document.addEventListener('input', handleInput);
    document.addEventListener('change', handleChange);
    document.addEventListener('keydown', handleKeydown);
  }

  init();
})();
