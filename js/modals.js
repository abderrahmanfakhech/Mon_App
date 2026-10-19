/* Cap Budget — fenêtres et formulaires. */
(function () {
  'use strict';

  var E = window.BudgetEngine;
  var I = window.CapIcons;
  var H = window.CapUI;

  function categoryOptions(selected) {
    return E.CATEGORIES.map(function (cat) {
      return '<option value="' + cat.id + '"' + (cat.id === selected ? ' selected' : '') + '>' + H.esc(cat.label) + '</option>';
    }).join('');
  }

  function chargeRow(charge) {
    var c = charge || { label: '', amount: '', category: 'logement', day: 1 };
    return '<div class="charge-row">' +
      '<input class="input" name="chargeLabel" value="' + H.esc(c.label) + '" placeholder="Loyer, transport…" aria-label="Libellé de la charge">' +
      '<div class="input-suffix compact"><input class="input" name="chargeAmount" type="number" min="0" step="1" value="' + (Number(c.amount) || '') + '" placeholder="0" aria-label="Montant de la charge"><span>DH</span></div>' +
      '<select class="input" name="chargeCategory" aria-label="Catégorie de la charge">' + categoryOptions(c.category) + '</select>' +
      '<input class="input charge-day" name="chargeDay" type="number" min="1" max="31" value="' + (Number(c.day) || 1) + '" aria-label="Jour du prélèvement">' +
      '<button type="button" class="icon-btn danger-ghost" data-action="remove-charge" aria-label="Supprimer cette charge">' + I.icon('trash') + '</button>' +
    '</div>';
  }

  function onboarding(charges) {
    var defaultCharges = charges && charges.length ? charges : [
      { label: 'Loyer', amount: 1700, category: 'logement', day: 1 },
      { label: 'Transport', amount: 250, category: 'transport', day: 2 },
      { label: 'Téléphone & internet', amount: 150, category: 'abonnements', day: 5 }
    ];
    return '<div class="onboarding">' +
      '<aside class="onboarding-aside">' +
        '<div class="brand on-dark">' +
          '<span class="brand-mark">' + I.logo + '</span>' +
          '<div><strong>capbudget<span>.</span></strong><small>Ton budget étudiant</small></div>' +
        '</div>' +
        '<div class="onboarding-pitch">' +
          '<span class="onboarding-badge">' + I.icon('sparkles') + 'Analyse locale</span>' +
          '<h2>Ton budget,<br>sans prise de tête.</h2>' +
          '<p>Trois minutes pour comprendre où part ton argent, anticiper la fin du mois et garder un peu de marge.</p>' +
        '</div>' +
        '<ul class="feature-list">' +
          '<li><span>' + I.icon('chart') + '</span><div><strong>Analyse automatique</strong><small>Catégories, habitudes, anomalies.</small></div></li>' +
          '<li><span>' + I.icon('trend') + '</span><div><strong>Prévision de fin de mois</strong><small>Une fourchette, pas une boule de cristal.</small></div></li>' +
          '<li><span>' + I.icon('sparkles') + '</span><div><strong>Conseils personnalisés</strong><small>Des actions concrètes, en dirhams.</small></div></li>' +
        '</ul>' +
        '<p class="onboarding-privacy">' + I.icon('lock') + '100 % local · aucun compte requis</p>' +
      '</aside>' +
      '<div class="onboarding-main">' +
        '<p class="eyebrow">Bienvenue</p>' +
        '<h2 id="onboarding-title">Créons ton espace</h2>' +
        '<p class="onboarding-lede">Quelques informations suffisent pour démarrer. Tu pourras tout modifier dans les réglages.</p>' +
        '<form id="onboarding-form">' +
          '<div class="form-grid two">' +
            '<label class="field"><span>Ton prénom</span><input class="input" name="name" placeholder="Yasmine" data-autofocus maxlength="40"></label>' +
            '<label class="field"><span>Revenu mensuel</span><div class="input-suffix"><input class="input" name="income" type="number" min="0" step="50" value="5000" required><span>DH</span></div></label>' +
          '</div>' +
          '<label class="field"><span>Objectif d’épargne du mois <small>optionnel</small></span><div class="input-suffix"><input class="input" name="savingsGoal" type="number" min="0" step="50" value="500"><span>DH</span></div></label>' +
          '<div class="section-head">' +
            '<div><h3>Charges fixes</h3><p>Loyer, transport, abonnements : elles sont comptées chaque mois automatiquement.</p></div>' +
            '<button type="button" class="btn btn-ghost btn-sm" data-action="add-charge" data-target="onboarding-charges">' + I.icon('plus') + 'Ajouter</button>' +
          '</div>' +
          '<div class="charge-table-head"><span>Libellé</span><span>Montant</span><span>Catégorie</span><span>Jour</span><span></span></div>' +
          '<div class="charge-list" id="onboarding-charges">' + defaultCharges.map(chargeRow).join('') + '</div>' +
          '<div class="onboarding-actions">' +
            '<button type="submit" class="btn btn-primary" name="mode" value="demo">' + I.icon('sparkles') + 'Explorer avec un exemple</button>' +
            '<button type="submit" class="btn btn-secondary" name="mode" value="empty">Partir de zéro</button>' +
          '</div>' +
          '<p class="form-note">L’exemple ajoute trois mois de dépenses fictives réalistes pour découvrir l’analyse. Tu peux effacer ces données à tout moment.</p>' +
        '</form>' +
      '</div>' +
    '</div>';
  }

  function settings(state) {
    var s = state.settings;
    var incomeMode = s.budgetMode !== 'custom';
    var caps = s.categoryCaps || {};
    var capFields = E.LEVERS.map(function (id) {
      var cat = E.getCategory(id);
      var value = Number(caps[id]) > 0 ? Number(caps[id]) : '';
      return '<label class="cap-field">' +
        '<span><i style="background:' + cat.color + '1c">' + cat.emoji + '</i>' + H.esc(cat.label) + '</span>' +
        '<div class="input-suffix compact"><input class="input" name="cap_' + id + '" type="number" min="0" step="50" value="' + value + '" placeholder="—"><span>DH</span></div>' +
      '</label>';
    }).join('');

    return '<form id="settings-form">' +
      '<div class="modal-head">' +
        '<div><p class="eyebrow">Personnalisation</p><h2 id="settings-title">Tes réglages</h2></div>' +
        '<button type="button" class="icon-btn subtle" data-action="close-modal" aria-label="Fermer">' + I.icon('close') + '</button>' +
      '</div>' +
      '<div class="settings-body">' +
        '<section class="settings-section">' +
          '<div class="settings-section-head"><h3>Ton profil</h3><p>La base de tous les calculs.</p></div>' +
          '<div class="form-grid two">' +
            '<label class="field"><span>Prénom</span><input class="input" name="name" maxlength="40" value="' + H.esc(s.name || '') + '" placeholder="Ton prénom"></label>' +
            '<label class="field"><span>Revenu mensuel</span><div class="input-suffix"><input class="input" name="income" type="number" min="0" step="50" value="' + (Number(s.monthlyIncome) || '') + '"><span>DH</span></div></label>' +
          '</div>' +
          '<div class="field"><span>Comment calculer ton budget ?</span>' +
            '<div class="radio-cards">' +
              '<label class="radio-card' + (incomeMode ? ' is-selected' : '') + '"><input type="radio" name="budgetMode" value="income"' + (incomeMode ? ' checked' : '') + '><span><strong>Mon revenu</strong><small>Le budget est égal à ton revenu mensuel.</small></span></label>' +
              '<label class="radio-card' + (!incomeMode ? ' is-selected' : '') + '"><input type="radio" name="budgetMode" value="custom"' + (!incomeMode ? ' checked' : '') + '><span><strong>Budget personnalisé</strong><small>Tu décides du plafond à ne pas dépasser.</small></span></label>' +
            '</div>' +
          '</div>' +
          '<div class="form-grid two">' +
            '<label class="field' + (incomeMode ? ' is-muted' : '') + '" id="custom-budget-field"><span>Budget personnalisé</span><div class="input-suffix"><input class="input" name="customBudget" type="number" min="0" step="50" value="' + (Number(s.customBudget) || '') + '"' + (incomeMode ? ' disabled' : '') + '><span>DH</span></div></label>' +
            '<label class="field"><span>Objectif d’épargne du mois</span><div class="input-suffix"><input class="input" name="savingsGoal" type="number" min="0" step="50" value="' + (Number(s.savingsGoal) || 0) + '"><span>DH</span></div></label>' +
          '</div>' +
        '</section>' +
        '<section class="settings-section">' +
          '<div class="section-head">' +
            '<div><h3>Charges fixes</h3><p>Comptées chaque mois, sans devoir les ressaisir.</p></div>' +
            '<button type="button" class="btn btn-ghost btn-sm" data-action="add-charge" data-target="settings-charges">' + I.icon('plus') + 'Ajouter</button>' +
          '</div>' +
          '<div class="charge-table-head"><span>Libellé</span><span>Montant</span><span>Catégorie</span><span>Jour</span><span></span></div>' +
          '<div class="charge-list" id="settings-charges">' + (state.fixedCharges.length ? state.fixedCharges.map(chargeRow).join('') : chargeRow()) + '</div>' +
          '<p class="form-hint">Ne les ajoute pas aussi comme transactions : elles sont déjà incluses dans le budget.</p>' +
        '</section>' +
        '<section class="settings-section">' +
          '<div class="settings-section-head"><h3>Plafonds par catégorie</h3><p>Optionnel. Laisse vide pour ne pas fixer de limite.</p></div>' +
          '<div class="cap-grid">' + capFields + '</div>' +
        '</section>' +
        '<section class="settings-section">' +
          '<div class="settings-section-head"><h3>Tes données</h3><p>Une sauvegarde, un import, ou un nouveau départ.</p></div>' +
          '<div class="data-actions">' +
            '<button type="button" class="btn btn-secondary btn-sm" data-action="export-data">' + I.icon('download') + 'Exporter</button>' +
            '<button type="button" class="btn btn-secondary btn-sm" data-action="import-data">' + I.icon('upload') + 'Importer</button>' +
            '<button type="button" class="btn btn-secondary btn-sm" data-action="load-demo">' + I.icon('sparkles') + 'Charger un exemple</button>' +
            '<button type="button" class="btn btn-danger-ghost btn-sm" data-action="reset-data">' + I.icon('trash') + 'Tout effacer</button>' +
          '</div>' +
          '<input type="file" id="import-input" accept="application/json,.json" hidden>' +
          '<p class="privacy-note">' + I.icon('lock') + 'Tes données restent dans ce navigateur. L’export crée un fichier de sauvegarde sur ton appareil.</p>' +
        '</section>' +
      '</div>' +
      '<div class="modal-actions">' +
        '<button type="button" class="btn btn-secondary" data-action="close-modal">Annuler</button>' +
        '<button type="submit" class="btn btn-primary">Enregistrer</button>' +
      '</div>' +
    '</form>';
  }

  function transaction(tx, ui, defaultDate) {
    var editing = !!tx;
    var category = tx ? tx.category : 'alimentation';
    var date = tx ? tx.date : defaultDate;
    var picker = E.CATEGORIES.map(function (cat) {
      return '<button type="button" class="category-chip' + (cat.id === category ? ' is-selected' : '') + '" data-action="pick-category" data-cat="' + cat.id + '">' +
        '<span>' + cat.emoji + '</span>' + H.esc(cat.label) +
      '</button>';
    }).join('');
    return '<form id="tx-form">' +
      '<div class="modal-head">' +
        '<div><p class="eyebrow">' + (editing ? 'Modifier' : 'Ajouter') + '</p><h2 id="tx-title">' + (editing ? 'Cette dépense' : 'Nouvelle dépense') + '</h2></div>' +
        '<button type="button" class="icon-btn subtle" data-action="close-modal" aria-label="Fermer">' + I.icon('close') + '</button>' +
      '</div>' +
      '<div class="tx-form-body">' +
        '<input type="hidden" name="id" value="' + (editing ? H.esc(tx.id) : '') + '">' +
        '<input type="hidden" name="category" value="' + H.esc(category) + '">' +
        '<label class="amount-field">' +
          '<span>Montant</span>' +
          '<div class="amount-input"><input name="amount" type="number" min="0.01" step="0.01" inputmode="decimal" placeholder="0" value="' + (editing ? tx.amount : '') + '" data-autofocus required><span>DH</span></div>' +
        '</label>' +
        '<div class="quick-amounts">' +
          '<span>Rapide</span>' +
          [20, 50, 100].map(function (amount) { return '<button type="button" class="quick-amount" data-action="quick-amount" data-amount="' + amount + '">' + amount + ' DH</button>'; }).join('') +
        '</div>' +
        '<div class="form-grid two">' +
          '<label class="field"><span>Date</span><input class="input" name="date" type="date" value="' + H.esc(date) + '" max="' + E.todayISO() + '" required></label>' +
          '<label class="field"><span>Libellé</span><input class="input" name="label" maxlength="70" placeholder="Ex. Courses au marché" value="' + (editing ? H.esc(tx.label) : '') + '"></label>' +
        '</div>' +
        '<div class="field"><span>Catégorie</span><div class="category-picker">' + picker + '</div></div>' +
        '<p class="form-hint">Le libellé est optionnel : la catégorie suffit pour l’analyse.</p>' +
      '</div>' +
      '<div class="modal-actions">' +
        (editing ? '<button type="button" class="btn btn-danger-ghost" data-action="delete-tx" data-id="' + H.esc(tx.id) + '">' + I.icon('trash') + 'Supprimer</button>' : '') +
        '<span class="spacer"></span>' +
        '<button type="button" class="btn btn-secondary" data-action="close-modal">Annuler</button>' +
        '<button type="submit" class="btn btn-primary">' + (editing ? 'Enregistrer' : 'Ajouter la dépense') + '</button>' +
      '</div>' +
    '</form>';
  }

  function confirm(options) {
    var opts = options || {};
    return '<div>' +
      '<div class="modal-head">' +
        '<div><p class="eyebrow">Confirmation</p><h2 id="confirm-title">' + H.esc(opts.title || 'Tu es sûr ?') + '</h2></div>' +
        '<button type="button" class="icon-btn subtle" data-action="close-modal" aria-label="Fermer">' + I.icon('close') + '</button>' +
      '</div>' +
      '<div class="confirm-body">' +
        '<span class="confirm-icon tone-' + (opts.tone || 'warn') + '">' + I.icon(opts.icon || 'alert') + '</span>' +
        '<p>' + H.esc(opts.text || '') + '</p>' +
      '</div>' +
      '<div class="modal-actions">' +
        '<button type="button" class="btn btn-secondary" data-action="close-modal">Annuler</button>' +
        '<button type="button" class="btn ' + (opts.danger ? 'btn-danger' : 'btn-primary') + '" data-action="' + H.esc(opts.action) + '">' + H.esc(opts.label || 'Confirmer') + '</button>' +
      '</div>' +
    '</div>';
  }

  window.CapModals = {
    onboarding: onboarding,
    settings: settings,
    transaction: transaction,
    confirm: confirm,
    chargeRow: chargeRow
  };
})();
