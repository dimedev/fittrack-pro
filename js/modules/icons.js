// ==================== ICÔNES SVG MODULE ====================
// Mapping des groupes musculaires et catégories d'aliments vers leurs icônes SVG

// Mapping muscles → icônes
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
    'forearms': 'img/icons/muscles/forearms.svg',
    // Aliases communs
    'legs': 'img/icons/muscles/quads.svg',
    'arms': 'img/icons/muscles/biceps.svg',
    'core': 'img/icons/muscles/abs.svg',
    'upper-back': 'img/icons/muscles/back.svg',
    'lower-back': 'img/icons/muscles/back.svg'
};

// Labels français des muscles
const muscleLabels = {
    'chest': 'Pectoraux',
    'back': 'Dos',
    'shoulders': 'Épaules',
    'rear-delts': 'Épaules arrière',
    'biceps': 'Biceps',
    'triceps': 'Triceps',
    'quads': 'Quadriceps',
    'hamstrings': 'Ischio-jambiers',
    'glutes': 'Fessiers',
    'calves': 'Mollets',
    'traps': 'Trapèzes',
    'abs': 'Abdominaux',
    'forearms': 'Avant-bras',
    'legs': 'Jambes',
    'arms': 'Bras',
    'core': 'Core',
    'upper-back': 'Haut du dos',
    'lower-back': 'Bas du dos'
};

// Mapping catégories d'aliments → icônes
const foodCategoryIcons = {
    'protein': 'img/icons/food/protein.svg',
    'carbs': 'img/icons/food/carbs.svg',
    'fat': 'img/icons/food/fats.svg',
    'vegetable': 'img/icons/food/veggies.svg',
    'fruit': 'img/icons/food/fruits.svg',
    'dairy': 'img/icons/food/dairy.svg'
};

// Helper: Obtenir l'icône d'un muscle
function getMuscleIcon(muscle) {
    if (!muscle) return null;
    const normalized = muscle.toLowerCase().trim();
    return muscleIcons[normalized] || null;
}

// Helper: Obtenir le label français d'un muscle
function getMuscleLabel(muscle) {
    if (!muscle) return muscle;
    const normalized = muscle.toLowerCase().trim();
    return muscleLabels[normalized] || muscle;
}

// Helper: Obtenir l'icône d'une catégorie d'aliment
function getFoodCategoryIcon(category) {
    if (!category) return null;
    const normalized = category.toLowerCase().trim();
    return foodCategoryIcons[normalized] || null;
}

// Helper: Générer le HTML d'une icône muscle
function renderMuscleIcon(muscle, size = '20px') {
    const icon = getMuscleIcon(muscle);
    const label = getMuscleLabel(muscle);
    if (!icon) return '';
    
    return `<img src="${icon}" alt="${label}" class="muscle-icon" style="width: ${size}; height: ${size}; vertical-align: middle;">`;
}

// Helper: Générer le HTML d'une icône catégorie aliment
function renderFoodCategoryIcon(category, size = '20px') {
    const icon = getFoodCategoryIcon(category);
    if (!icon) return '';
    
    return `<img src="${icon}" alt="${category}" class="food-category-icon" style="width: ${size}; height: ${size}; vertical-align: middle;">`;
}

// Helper: Générer un tag muscle avec icône
function renderMuscleTag(muscle) {
    const icon = getMuscleIcon(muscle);
    const label = getMuscleLabel(muscle);
    if (!icon) return `<span class="muscle-tag">${label}</span>`;
    
    return `
        <span class="muscle-tag">
            <img src="${icon}" alt="${label}" class="muscle-tag-icon">
            ${label}
        </span>
    `;
}

// Exporter les fonctions et objets
window.MuscleIcons = {
    muscleIcons,
    muscleLabels,
    foodCategoryIcons,
    getMuscleIcon,
    getMuscleLabel,
    getFoodCategoryIcon,
    renderMuscleIcon,
    renderFoodCategoryIcon,
    renderMuscleTag
};
