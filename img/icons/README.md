# Icônes SVG FitTrack Pro

## Style Phosphor - Premium & Cohérent

Toutes les icônes suivent le style **Phosphor Icons** :
- ✅ ViewBox **32×32px** optimisé
- ✅ Stroke **2px** consistant
- ✅ **Round caps & joins** pour un look moderne
- ✅ Opacité pour les détails secondaires
- ✅ Scalables à toute taille sans perte de qualité
- ✅ Poids léger (~400 octets par icône)

## Structure

```
img/icons/
├── muscles/          # 13 icônes pour les groupes musculaires
│   ├── chest.svg
│   ├── back.svg
│   ├── shoulders.svg
│   ├── rear-delts.svg
│   ├── biceps.svg
│   ├── triceps.svg
│   ├── quads.svg
│   ├── hamstrings.svg
│   ├── glutes.svg
│   ├── calves.svg
│   ├── traps.svg
│   ├── abs.svg
│   └── forearms.svg
└── food/             # 6 icônes pour les catégories d'aliments
    ├── protein.svg
    ├── carbs.svg
    ├── fats.svg
    ├── veggies.svg
    ├── fruits.svg
    └── dairy.svg
```

## Utilisation

### Dans le HTML

```html
<!-- Icône simple -->
<img src="img/icons/muscles/chest.svg" alt="Pectoraux" width="24" height="24">

<!-- Avec classe pour styling -->
<img src="img/icons/food/protein.svg" class="food-icon" alt="Protéines">
```

### Comme background-image en CSS

```css
.muscle-icon-chest {
    width: 32px;
    height: 32px;
    background-image: url('../img/icons/muscles/chest.svg');
    background-size: contain;
    background-repeat: no-repeat;
}
```

### Inline dans le HTML (pour animations)

```html
<div class="muscle-icon">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
        <!-- SVG content -->
    </svg>
</div>
```

## Mapping muscles → icônes

```javascript
const muscleIcons = {
    'chest': 'img/icons/muscles/chest.svg',
    'back': 'img/icons/muscles/back.svg',
    'shoulders': 'img/icons/muscles/shoulders.svg',
    'rear-delts': 'img/icons/muscles/rear-delts.svg',
    'biceps': 'img/icons/muscles/biceps.svg',
    'triceps': 'img/icons/muscles/triceps.svg',
    'quads': 'img/icons/muscles/quads.svg',
    'hamstrings': 'img/icons/muscles/hamstrings.svg',
    'glutes': 'img/icons/muscles/glutes.svg',
    'calves': 'img/icons/muscles/calves.svg',
    'traps': 'img/icons/muscles/traps.svg',
    'abs': 'img/icons/muscles/abs.svg',
    'forearms': 'img/icons/muscles/forearms.svg'
};
```

## Mapping catégories aliments → icônes

```javascript
const foodCategoryIcons = {
    'protein': 'img/icons/food/protein.svg',
    'carbs': 'img/icons/food/carbs.svg',
    'fats': 'img/icons/food/fats.svg',
    'veggies': 'img/icons/food/veggies.svg',
    'fruits': 'img/icons/food/fruits.svg',
    'dairy': 'img/icons/food/dairy.svg'
};
```

## Style Technique

Toutes les icônes utilisent :
- `stroke="currentColor"` → héritent de la couleur du contexte
- `fill="none"` → style line art minimaliste
- `viewBox="0 0 32 32"` → optimisé pour performance
- `stroke-width="2"` → consistant style Phosphor
- `stroke-linecap="round"` → terminaisons arrondies
- `stroke-linejoin="round"` → jointures lisses
- Compatible avec tous les navigateurs modernes

## Couleurs avec filtres CSS

Les icônes SVG peuvent être colorées avec des filtres CSS :

```css
/* Rouge (accent) */
.icon-red {
    filter: brightness(0) saturate(100%) invert(47%) sepia(79%) saturate(2000%) hue-rotate(346deg);
}

/* Blanc */
.icon-white {
    filter: brightness(0) saturate(100%) invert(100%);
}

/* Gris */
.icon-gray {
    filter: brightness(0) saturate(100%) invert(50%);
}

/* Vert */
.icon-green {
    filter: brightness(0) saturate(100%) invert(70%) sepia(50%) saturate(500%) hue-rotate(80deg);
}
```

**Avantage** : Une seule icône SVG peut avoir différentes couleurs sans dupliquer les fichiers.

## Exemples d'intégration

### 1. Dans la liste d'exercices

```javascript
function renderExerciseCard(exercise) {
    const muscleIcon = muscleIcons[exercise.muscle] || '';
    return `
        <div class="exercise-card">
            <img src="${muscleIcon}" class="exercise-muscle-icon" alt="${exercise.muscle}">
            <span>${exercise.name}</span>
        </div>
    `;
}
```

### 2. Dans les suggestions nutrition

```javascript
function renderFoodSuggestion(food) {
    const categoryIcon = foodCategoryIcons[food.category] || '';
    return `
        <div class="food-item">
            <img src="${categoryIcon}" class="food-category-icon" alt="${food.category}">
            <span>${food.name}</span>
        </div>
    `;
}
```

### 3. Dans les Smart Insights

```javascript
const insight = {
    muscle: 'chest',
    message: 'Pectoraux négligés depuis 7 jours'
};

const icon = muscleIcons[insight.muscle];
// Afficher avec l'icône
```

## Comparaison avant/après

### Avant
- ViewBox 64×64px (trop large)
- Stroke-width variable (2-3px)
- Formes complexes
- ~800 octets par icône

### Après (Style Phosphor)
- ✅ ViewBox 32×32px optimisé
- ✅ Stroke-width fixe 2px
- ✅ Formes épurées et reconnaissables
- ✅ ~400 octets par icône
- ✅ Cohérence visuelle totale

## Performance

- **Taille** : ~400 octets par icône (50% plus léger)
- **Rendu** : Instantané à toutes les tailles
- **Cache** : Excellente compressibilité
- **Accessible** : Fonctionne sans JavaScript
- **Dark mode** : Compatible natif

## Notes

- Toutes les icônes sont optimisées pour la performance
- Compatible tous navigateurs modernes
- Pas de dépendances externes
- Style consistant avec apps premium (Notion, Stripe, Linear...)
