# Cap Budget

Une application web qui aide les étudiants à comprendre leurs dépenses, à prévoir la fin du mois et à garder une marge — en français et en dirhams marocains (DH).

Aucun compte, aucun serveur, aucune clé d'API : l'analyse tourne entièrement dans le navigateur et les données restent sur l'appareil.

## Démarrage

1. Ouvre le dossier du projet.
2. Double-clique sur `index.html`.

C'est tout. L'application fonctionne directement en `file://`, sans installation ni compilation. Si tu préfères passer par un petit serveur local :

```bash
python -m http.server 4173
```

puis ouvre <http://127.0.0.1:4173/>.

Au premier lancement, l'écran de bienvenue propose de saisir ton prénom, ton revenu, ton objectif d'épargne et tes charges fixes. Le bouton **« Explorer avec un exemple »** charge trois mois de dépenses fictives réalistes pour découvrir immédiatement les analyses.

## Ce que fait l'application

- **Tableau de bord** : reste à vivre, projection de fin de mois, épargne possible, répartition par catégorie, journal des dernières dépenses.
- **Transactions** : ajout, modification et suppression de dépenses, recherche et filtre par catégorie, regroupement par jour.
- **Analyses** : six derniers mois, comparaison fixe/variable, évolution par catégorie, rythme par jour de la semaine, plus grosses dépenses.
- **Conseils** : score de santé financière sur 100, alertes et recommandations personnalisées triées par priorité, simulateur de réduction des dépenses variables.
- **Charges fixes** : loyer, transport, abonnements… comptées automatiquement chaque mois.
- **Plafonds par catégorie** (optionnels) et mode « budget personnalisé » en plus du budget basé sur le revenu.

## Comment la prévision est calculée

Le moteur (`js/engine.js`) est entièrement local et n'utilise aucune API.

- Moyenne pondérée des dépenses variables : 14 derniers jours, moyenne du mois en cours et 60 jours précédents.
- Ajustement selon le jour de la semaine (les week-ends coûtent souvent plus cher).
- Fourchette de prévision à ±1,28 écart-type, avec un indicateur de fiabilité.
- Score de santé financière (0–100) basé sur le rythme de dépense, le poids des charges fixes, l'objectif d'épargne et les petites dépenses.
- Détection des catégories en anomalie par rapport aux mois précédents.

Les montants affichés dans les textes de conseils sont arrondis au dirham ; les listes détaillées conservent les centimes si tu en saisis.

## Données et confidentialité

- Tout est stocké dans le `localStorage` du navigateur, sous la clé `capbudget.v1`.
- **Réglages → Exporter** crée un fichier `capbudget-AAAA-MM-JJ.json` sur ton appareil.
- **Réglages → Importer** restaure une sauvegarde (les fichiers invalides sont refusés).
- **Réglages → Tout effacer** supprime les données de ce navigateur et relance l'accueil.
- Effacer les données du navigateur (ou utiliser un autre navigateur/appareil) revient à repartir de zéro : il n'y a pas de synchronisation.
- Aucune requête réseau n'est effectuée par l'application.

## Structure du projet

```
index.html          Page unique et ordre de chargement des scripts
css/base.css        Variables, navigation, boutons, modales, toasts, responsive
css/views.css       Tableau de bord, graphiques, analyses, coach, onboarding
js/engine.js        Moteur pur : prévision, score, conseils, données de démo
js/icons.js         Icônes SVG et logo
js/helpers.js       Composants réutilisables (graphiques SVG, donut, score, listes)
js/views.js         Vues Tableau de bord, Transactions, Analyses, Conseils
js/modals.js        Formulaires : onboarding, réglages, dépense, confirmation
js/app.js           État, stockage, événements, import/export, simulateur
```

Les scripts sont des scripts classiques (pas de modules ES) pour que l'application fonctionne même ouverte directement depuis le disque.

## Compatibilité

Testée dans Chrome (desktop et mobile simulé) aux largeurs 390 px, 800 px et 1440 px. L'interface est responsive : barre de navigation latérale sur grand écran, barre inférieure sur mobile.
