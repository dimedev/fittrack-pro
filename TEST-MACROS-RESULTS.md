# Résultats des Tests de Cohérence Macros

## Instructions de test

1. Ouvrir l'application FitTrack Pro
2. Aller dans la section Nutrition
3. Ouvrir la console (F12) pour voir les logs de debug
4. Effectuer les tests ci-dessous
5. Vérifier que les valeurs affichées correspondent aux valeurs attendues

---

## Scénario A : Aliment en grammes (150g Poulet)

### Données de base
- **Aliment:** Blanc de Poulet
- **Macros/100g:** 165 kcal, 31g prot, 0g carbs, 3.6g fat
- **Quantité:** 150g

### Valeurs attendues
```
Calories: 248 kcal  (165 × 1.5 = 247.5 → arrondi 248)
Protéines: 46.5g    (31 × 1.5 = 46.5)
Glucides: 0g        (0 × 1.5 = 0)
Lipides: 5.4g       (3.6 × 1.5 = 5.4)
```

### Procédure de test
1. Rechercher "Poulet" dans la barre de recherche
2. Sélectionner "Blanc de Poulet"
3. Dans le modal de quantité, entrer 150g
4. Vérifier que l'affichage montre: **248 kcal | P: 46.5g · G: 0g · L: 5.4g**
5. Confirmer l'ajout
6. Vérifier dans la console les logs:
   - `=== DEBUG MACROS - confirmAddFood ===`
   - Quantite grammes: 150
   - Macros calculees: {cal: 248, prot: 46.5, carbs: 0, fat: 5.4}
7. Vérifier dans le journal que le total affiche les mêmes valeurs

### Résultat
- [ ] Affichage modal correct
- [ ] Logs console corrects
- [ ] Total journal correct
- [ ] Status: ⬜ À tester | ✅ PASS | ❌ FAIL

---

## Scénario B : Unité naturelle (2 œufs)

### Données de base
- **Aliment:** Œufs entiers
- **Macros/100g:** 155 kcal, 13g prot, 1.1g carbs, 11g fat
- **Unité:** 1 œuf = 50g
- **Quantité:** 2 œufs = 100g

### Valeurs attendues
```
Calories: 155 kcal  (155 × 1 = 155)
Protéines: 13g      (13 × 1 = 13)
Glucides: 1.1g      (1.1 × 1 = 1.1)
Lipides: 11g        (11 × 1 = 11)
```

### Procédure de test
1. Rechercher "Œufs" dans la barre de recherche
2. Sélectionner "Œufs entiers"
3. Dans le modal de quantité, vérifier que l'interface propose "œuf" comme unité
4. Entrer 2 (pour 2 œufs)
5. Vérifier que l'affichage montre: **155 kcal | P: 13g · G: 1.1g · L: 11g**
6. Confirmer l'ajout
7. Vérifier dans la console les logs:
   - `=== DEBUG MACROS - confirmAddFood ===`
   - Quantite grammes: 100 (conversion automatique 2 œufs → 100g)
   - Macros calculees: {cal: 155, prot: 13, carbs: 1.1, fat: 11}
8. Vérifier dans le journal que le total affiche les mêmes valeurs

### Résultat
- [ ] Affichage unité "œuf" correct
- [ ] Conversion 2 œufs → 100g correcte
- [ ] Affichage modal correct
- [ ] Logs console corrects
- [ ] Total journal correct
- [ ] Status: ⬜ À tester | ✅ PASS | ❌ FAIL

---

## Scénario C : Mix d'aliments (100g Riz + 100g Poulet)

### Données de base
**Riz Blanc (cuit):**
- Macros/100g: 130 kcal, 2.7g prot, 28g carbs, 0.3g fat

**Blanc de Poulet:**
- Macros/100g: 165 kcal, 31g prot, 0g carbs, 3.6g fat

### Valeurs attendues pour chaque aliment

**100g Riz:**
```
Calories: 130 kcal
Protéines: 2.7g
Glucides: 28g
Lipides: 0.3g
```

**100g Poulet:**
```
Calories: 165 kcal
Protéines: 31g
Glucides: 0g
Lipides: 3.6g
```

**TOTAL (100g Riz + 100g Poulet):**
```
Calories: 295 kcal   (130 + 165)
Protéines: 33.7g     (2.7 + 31)
Glucides: 28g        (28 + 0)
Lipides: 3.9g        (0.3 + 3.6)
```

### Procédure de test
1. Ajouter 100g de Riz Blanc (cuit)
   - Vérifier modal: **130 kcal | P: 2.7g · G: 28g · L: 0.3g**
   - Vérifier logs console: {cal: 130, prot: 2.7, carbs: 28, fat: 0.3}
   
2. Ajouter 100g de Blanc de Poulet
   - Vérifier modal: **165 kcal | P: 31g · G: 0g · L: 3.6g**
   - Vérifier logs console: {cal: 165, prot: 31, carbs: 0, fat: 3.6}

3. Vérifier le TOTAL dans le journal
   - Console: `=== DEBUG MACROS - calculateJournalMacros ===`
   - Entrée 1: Riz Blanc (100g) {cal: 130, prot: 2.7, carbs: 28, fat: 0.3}
   - Entrée 2: Blanc de Poulet (100g) {cal: 165, prot: 31, carbs: 0, fat: 3.6}
   - **TOTAL du jour: {cal: 295, prot: 33.7, carbs: 28, fat: 3.9}**

4. Vérifier l'affichage dans l'UI du journal
   - Barre de progression calories: 295 / objectif
   - Barres détaillées: P: 33.7g · G: 28g · L: 3.9g

### Résultat
- [ ] Riz: affichage modal correct
- [ ] Riz: logs console corrects
- [ ] Poulet: affichage modal correct
- [ ] Poulet: logs console corrects
- [ ] Total: logs console corrects
- [ ] Total: affichage UI correct
- [ ] Status: ⬜ À tester | ✅ PASS | ❌ FAIL

---

## Page de test autonome

Une page HTML de test autonome a été créée: [`test-macros.html`](test-macros.html)

Pour l'utiliser:
1. Ouvrir `test-macros.html` dans un navigateur
2. Cliquer sur les boutons de test
3. Vérifier que tous les tests affichent ✅ Test RÉUSSI

Cette page teste la logique de calcul des macros de manière isolée.

---

## Résumé des tests

| Scénario | Description | Status |
|----------|-------------|--------|
| A | 150g Poulet | ⬜ À tester |
| B | 2 œufs (100g) | ⬜ À tester |
| C | 100g Riz + 100g Poulet | ⬜ À tester |

---

## Notes importantes

### Arrondis
- **Calories:** Arrondi à l'entier le plus proche (`Math.round()`)
- **Protéines, Glucides, Lipides:** Arrondi à 1 décimale (`Math.round(x * 10) / 10`)

### Conversion unités naturelles
- Les unités naturelles (œuf, tranche, etc.) sont automatiquement converties en grammes
- La conversion se fait via `unitWeight` défini dans la base d'aliments
- Exemple: 1 œuf = 50g, donc 2 œufs = 100g

### Logs de debug
Les logs de debug ajoutés temporairement permettent de:
1. Tracer la quantité en grammes utilisée pour le calcul
2. Vérifier le multiplier (quantity / 100)
3. Voir les macros calculées pour chaque aliment
4. Voir le total du jour avec le détail de chaque entrée

**Ces logs seront retirés après validation des tests.**

---

## Checklist finale

Après avoir effectué tous les tests:
- [ ] Tous les scénarios A, B, C sont ✅ PASS
- [ ] Les valeurs affichées dans les modals correspondent aux calculs
- [ ] Les logs console montrent les valeurs correctes
- [ ] Les totaux du journal sont cohérents
- [ ] Aucune erreur JavaScript dans la console
- [ ] Les unités naturelles sont correctement converties
- [ ] Les arrondis sont corrects (0 décimale pour kcal, 1 décimale pour P/G/L)

Si tous les tests sont ✅ PASS, retirer les logs de debug du code.
