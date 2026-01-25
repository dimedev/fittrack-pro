# 🧪 Tests à faire - Vérification Cohérence Macros

## État actuel

✅ Logs de debug ajoutés dans le code
✅ Page de test autonome créée (`test-macros.html`)
✅ Documentation de test créée (`TEST-MACROS-RESULTS.md`)

⏳ **EN ATTENTE:** Tests manuels dans l'application réelle

---

## Que faire maintenant ?

### Option 1 : Test rapide avec la page HTML autonome

1. Ouvrir [`test-macros.html`](test-macros.html) dans ton navigateur
2. Cliquer sur "Lancer tous les tests"
3. Vérifier que tous affichent ✅ Test RÉUSSI

**Résultat attendu:** Tous les tests passent (la logique de calcul est correcte)

---

### Option 2 : Test complet dans l'application

1. Lancer l'application FitTrack Pro
2. Ouvrir la console (F12)
3. Aller dans Nutrition
4. Suivre les instructions dans [`TEST-MACROS-RESULTS.md`](TEST-MACROS-RESULTS.md)

**Ce que tu vas voir dans la console :**

```
=== DEBUG MACROS - confirmAddFood ===
Aliment: Blanc de Poulet
Quantite grammes: 150
Macros/100g: {cal: 165, prot: 31, carbs: 0, fat: 3.6}
Multiplier: 1.5
Macros calculees pour cette quantite: {cal: 248, prot: 46.5, carbs: 0, fat: 5.4}
```

Puis après l'ajout :

```
=== DEBUG MACROS - calculateJournalMacros ===
Date: 2026-01-25
Nombre d'entrees: 1
Entree 1: Blanc de Poulet (150g) {cal: 248, prot: 46.5, carbs: 0, fat: 5.4}
TOTAL du jour: {cal: 248, prot: 46.5, carbs: 0, fat: 5.4}
```

---

## Logs de debug

Les logs suivants ont été ajoutés **temporairement** :

### Dans `confirmAddFood()` (ligne ~630)
- Affiche l'aliment, la quantité en grammes, les macros/100g
- Calcule et affiche les macros pour la quantité choisie

### Dans `calculateJournalMacros()` (ligne ~1195)
- Affiche la date et le nombre d'entrées
- Pour chaque entrée : nom, quantité, macros calculées
- Affiche le TOTAL du jour

---

## Prochaine étape

**Une fois que tu as vérifié que tout fonctionne correctement :**

1. Dis-moi : "Les tests sont OK" ou "J'ai trouvé un problème"
2. Si OK : je retire les logs de debug
3. Si problème : je corrige le code

---

## Si tout est OK

Les logs seront retirés de :
- [`js/modules/nutrition.js`](js/modules/nutrition.js) ligne ~630-643 (confirmAddFood)
- [`js/modules/nutrition.js`](js/modules/nutrition.js) ligne ~1195-1220 (calculateJournalMacros)

Les fichiers de test peuvent être conservés ou supprimés :
- `test-macros.html` (page de test autonome)
- `TEST-MACROS-RESULTS.md` (documentation des tests)
- `TESTS-A-FAIRE.md` (ce fichier)

---

## Résumé rapide

| Fichier | Action | Status |
|---------|--------|--------|
| `js/modules/nutrition.js` | Logs debug ajoutés | ✅ Fait |
| `test-macros.html` | Page de test créée | ✅ Fait |
| `TEST-MACROS-RESULTS.md` | Doc tests créée | ✅ Fait |
| **Tests manuels** | À faire par l'utilisateur | ⏳ En attente |
| **Cleanup logs** | Après validation | ⏳ En attente |

---

**🎯 Action requise : Teste l'application et dis-moi si tout est OK !**
