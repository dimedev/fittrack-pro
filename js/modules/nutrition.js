// ==================== NUTRITION MODULE ====================
// Version MVP - Journal uniquement (Menu du Jour supprimé)

// ==================== CONSTANTES DE VALIDATION ====================
const MAX_CALORIES = 10000;     // kcal pour 100g
const MAX_MACRO = 1000;         // g pour 100g (protéines, glucides, lipides)
const MAX_NAME_LENGTH = 100;    // caractères pour nom d'aliment
const MAX_QUANTITY = 10000;     // g (10kg max par entrée)
const MIN_QUANTITY = 1;         // g minimum

// Variables pour sélection multiple
let selectedFoodsToAdd = [];
let multiSelectModeActive = false;
let selectedFoodsFromBase = [];

// Variables pour suggestions refresh
let suggestionRefreshCount = 0;
const MAX_SUGGESTION_REFRESHES = 2;
let shownSuggestionIds = [];

// Variables pour filtrage et tri avancés
let currentNutritionFilter = 'all';
let currentNutritionSort = 'relevance';

// Catégories d'aliments
const foodCategories = {
    'protein': { name: 'Protéines', icon: '🥩' },
    'carbs': { name: 'Glucides', icon: '🍚' },
    'fat': { name: 'Lipides', icon: '🥑' },
    'vegetable': { name: 'Légumes', icon: '🥦' },
    'fruit': { name: 'Fruits', icon: '🍎' },
    'dairy': { name: 'Produits Laitiers', icon: '🥛' },
    'other': { name: 'Autre', icon: '📦' }
};

// ==================== UNITÉS NATURELLES ====================

// Labels pour les types d'unités
const UNIT_LABELS = {
    g: { singular: 'g', plural: 'g' },
    piece: { singular: '', plural: '' }, // Le label est dans unitLabel de l'aliment
    slice: { singular: 'tranche', plural: 'tranches' },
    cup: { singular: 'pot', plural: 'pots' },
    tbsp: { singular: 'c. à soupe', plural: 'c. à soupe' }
};

// Pluraliser un label français
function pluralizeFr(label, count) {
    if (count <= 1) return label;
    
    // Règles de pluriel français simples
    const irregulars = {
        'œuf': 'œufs',
        'blanc': 'blancs'
    };
    
    if (irregulars[label]) return irregulars[label];
    
    // Terminaisons qui ne changent pas au pluriel
    if (label.endsWith('s') || label.endsWith('x') || label.endsWith('z')) {
        return label;
    }
    
    return label + 's';
}

// Formater la quantité pour l'affichage
function formatQuantityDisplay(food, quantityGrams) {
    // Aliment sans unité spéciale ou unité gramme
    if (!food.unit || food.unit === 'g') {
        return `${quantityGrams}g`;
    }
    
    // Calculer le nombre d'unités
    const units = Math.round((quantityGrams / food.unitWeight) * 10) / 10;
    
    // Obtenir le label approprié
    let label;
    if (food.unit === 'piece' && food.unitLabel) {
        label = pluralizeFr(food.unitLabel, units);
    } else {
        const unitInfo = UNIT_LABELS[food.unit] || UNIT_LABELS.g;
        label = units > 1 ? unitInfo.plural : unitInfo.singular;
    }
    
    // Format d'affichage
    if (units === Math.floor(units)) {
        // Nombre entier
        return `${Math.floor(units)} ${label}`;
    } else {
        // Nombre décimal - montrer approximation en grammes
        return `${units} ${label} (~${quantityGrams}g)`;
    }
}

// Obtenir les presets de quantité adaptés à l'aliment
function getQuantityPresets(food) {
    if (!food.unit || food.unit === 'g') {
        // Presets en grammes
        return [
            { value: 50, label: '50g' },
            { value: 100, label: '100g' },
            { value: 150, label: '150g' },
            { value: 200, label: '200g' }
        ];
    }
    
    // Presets en unités
    const unitWeight = food.unitWeight || 100;
    const unitLabel = food.unitLabel || '';
    
    return [
        { value: unitWeight, label: `1 ${unitLabel}` },
        { value: unitWeight * 2, label: `2 ${pluralizeFr(unitLabel, 2)}` },
        { value: unitWeight * 3, label: `3 ${pluralizeFr(unitLabel, 3)}` }
    ];
}

// Vérifier si un aliment utilise des unités naturelles
function hasNaturalUnit(food) {
    return food.unit && food.unit !== 'g' && food.unitWeight;
}

// Convertir une quantité en unités vers grammes
function unitsToGrams(food, unitCount) {
    if (!food.unitWeight) return unitCount;
    return Math.round(unitCount * food.unitWeight);
}

// Convertir une quantité en grammes vers unités
function gramsToUnits(food, grams) {
    if (!food.unitWeight) return grams;
    return Math.round((grams / food.unitWeight) * 10) / 10;
}

// ==================== BASE D'ALIMENTS ====================

// Afficher la liste des aliments (accordéon par catégorie)
function renderFoodsList() {
    const container = document.getElementById('foods-list');
    if (!container) return;
    
    // Filtrer les aliments personnalisés uniquement
    const customFoods = state.foods.filter(f => !defaultFoods.find(df => df.id === f.id));
    
    // Afficher/cacher la section selon s'il y a des aliments personnalisés
    const customFoodsSection = document.getElementById('custom-foods-section');
    const customFoodsCount = document.getElementById('custom-foods-count');
    
    if (customFoods.length === 0) {
        if (customFoodsSection) customFoodsSection.style.display = 'none';
        container.innerHTML = '';
        return;
    }
    
    if (customFoodsSection) customFoodsSection.style.display = 'block';
    if (customFoodsCount) customFoodsCount.textContent = customFoods.length;
    
    // Initialiser l'état des accordéons si nécessaire
    if (!state.foodAccordionState) {
        state.foodAccordionState = {};
    }
    
    // Utiliser seulement les aliments personnalisés
    const filteredFoods = customFoods;

    let html = '';
    Object.entries(foodCategories).forEach(([catId, cat]) => {
        const catFoods = filteredFoods.filter(f => f.category === catId);
        if (catFoods.length === 0) return;
        
        // État de l'accordéon (toujours fermé par défaut, sauf si explicitement ouvert)
        const isOpen = state.foodAccordionState[catId] === true;

        html += `
            <div class="food-category-accordion" data-category="${catId}">
                <div class="food-category-header" onclick="toggleFoodCategory('${catId}')">
                    <div class="food-category-header-left">
                        <span class="food-category-toggle">${isOpen ? '▼' : '▶'}</span>
                        <span class="food-category-icon">${cat.icon}</span>
                        <span class="food-category-name">${cat.name}</span>
                        <span class="food-category-count">${catFoods.length} aliments</span>
                    </div>
                </div>
                <div class="food-category-content" style="display: ${isOpen ? 'block' : 'none'};">
                    ${catFoods.map(food => {
                        const hasUnit = food.unit && food.unitLabel && food.unitWeight;
                        const unitInfo = hasUnit ? ` • 1 ${food.unitLabel} = ${food.unitWeight}g` : '';
                        
                        return `
                            <div class="food-select-item">
                                <div class="food-select-info" onclick="quickAddFromSearch('${food.id}')" style="flex: 1; cursor: pointer;">
                                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                        <strong>${food.name}</strong>
                                        ${hasUnit ? '<span style="font-size: 0.8rem; color: var(--text-secondary);">📊</span>' : ''}
                                    </div>
                                    <div class="food-search-macros">
                                        <span>🔥 ${food.calories} kcal</span>
                                        <span>P: ${food.protein}g</span>
                                        <span>G: ${food.carbs}g</span>
                                        <span>L: ${food.fat}g</span>
                                    </div>
                                    ${hasUnit ? `<div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">${unitInfo}</div>` : ''}
                                </div>
                                <button class="food-btn" onclick="event.stopPropagation(); deleteCustomFood('${food.id}')" title="Supprimer">🗑️</button>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    });

    container.innerHTML = html || '<p style="color: var(--text-secondary);">Aucun aliment trouvé</p>';
}

// Toggle section mes aliments
function toggleCustomFoods() {
    const content = document.getElementById('custom-foods-content');
    const toggle = document.getElementById('custom-foods-toggle');
    const header = document.querySelector('.custom-foods-header');
    
    if (!content || !toggle) return;
    
    if (content.style.display === 'none' || !content.style.display) {
        content.style.display = 'block';
        toggle.textContent = '▼';
        toggle.classList.add('open');
    } else {
        content.style.display = 'none';
        toggle.textContent = '▶';
        toggle.classList.remove('open');
    }
}

// Toggle accordéon de catégorie d'aliments
function toggleFoodCategory(categoryId) {
    if (!state.foodAccordionState) {
        state.foodAccordionState = {};
    }
    
    // Toggle l'état
    state.foodAccordionState[categoryId] = !state.foodAccordionState[categoryId];
    
    // Mettre à jour l'UI directement sans re-render complet
    const accordion = document.querySelector(`.food-category-accordion[data-category="${categoryId}"]`);
    if (accordion) {
        const content = accordion.querySelector('.food-category-content');
        const toggle = accordion.querySelector('.food-category-toggle');
        
        if (state.foodAccordionState[categoryId]) {
            content.style.display = 'block';
            toggle.textContent = '▼';
        } else {
            content.style.display = 'none';
            toggle.textContent = '▶';
        }
    }
}

// ==================== COMPTEUR SIMPLE D'AJOUTS ====================

let foodsAddedCount = 0;
let foodCounterTimeout = null;

function showFoodCounterBadge() {
    const badge = document.getElementById('food-counter-badge');
    const text = document.getElementById('food-counter-text');
    
    if (!badge || !text) return;
    
    // Mettre à jour le texte
    text.textContent = `+${foodsAddedCount} au journal`;
    
    // Afficher le badge
    badge.style.display = 'flex';
    
    // Clear timeout existant
    if (foodCounterTimeout) {
        clearTimeout(foodCounterTimeout);
    }
    
    // Auto-hide après 5 secondes
    foodCounterTimeout = setTimeout(() => {
        badge.style.display = 'none';
        foodsAddedCount = 0;
    }, 5000);
}

function resetFoodCounter() {
    foodsAddedCount = 0;
    const badge = document.getElementById('food-counter-badge');
    if (badge) badge.style.display = 'none';
    if (foodCounterTimeout) {
        clearTimeout(foodCounterTimeout);
        foodCounterTimeout = null;
    }
}

// Ajout rapide au journal depuis la base d'aliments (tap simple)
function quickAddToJournal(foodId) {
    const food = state.foods.find(f => f.id === foodId);
    if (!food) return;
    
    // S'assurer qu'on est sur la date du jour
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('journal-date');
    if (dateInput) {
        dateInput.value = today;
    }
    
    // Ajouter au journal
    addToJournalDirect(food.id, 100);
    
    // Incrémenter le compteur et afficher le badge
    foodsAddedCount++;
    showFoodCounterBadge();
    
    // Toast simple
    showToast(`${food.name} ajouté`, 'success');
}

function filterFoods() {
    renderFoodsList();
}

/**
 * Recherche unifiée pour l'écran nutrition
 */
/**
 * Normalise une chaîne pour la recherche (accents + ligatures)
 * Convertit : é→e, œ→oe, æ→ae, etc.
 */
function normalizeForSearch(str) {
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
        .replace(/œ/g, 'oe')             // Ligature œ → oe
        .replace(/æ/g, 'ae');            // Ligature æ → ae
}

function searchUnifiedFoods() {
    const searchTerm = document.getElementById('unified-food-search').value;
    const container = document.getElementById('search-results-list');
    const resultsContainer = document.getElementById('search-results-container');

    if (searchTerm.length < 2) {
        resultsContainer.style.display = 'none';
        return;
    }

    // Normaliser la requête (boeuf = bœuf, oeuf = œuf)
    const normalizedQuery = normalizeForSearch(searchTerm);
    
    const results = state.foods.filter(f => {
        const normalizedName = normalizeForSearch(f.name);
        return normalizedName.includes(normalizedQuery);
    }).slice(0, 12);

    if (results.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">Aucun résultat</p>';
        resultsContainer.style.display = 'block';
        return;
    }

    container.innerHTML = results.map(food => {
        const macroText = `P: ${food.protein}g · G: ${food.carbs}g · L: ${food.fat}g`;
        return `
            <div class="search-result-item" id="search-item-${food.id}" onclick="quickAddFromSearch('${food.id}')" style="cursor: pointer; padding: 12px; border-bottom: 1px solid var(--border-color); transition: all 0.3s;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">${food.name}</div>
                        <div style="font-size: 0.85rem; color: var(--text-secondary);">${macroText}</div>
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 2px;">
                        <span style="font-weight: 700; color: var(--accent-primary);">${food.calories} kcal</span>
                        <span style="font-size: 0.75rem; color: var(--text-muted);">100g</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    resultsContainer.style.display = 'block';
}

/**
 * Variables pour le bottom sheet dosage
 */
let selectedFoodForQuantity = null;
let currentQuantity = 100;
let currentUnitCount = 1;
let isEditMode = false;
let editMealType = null;

/**
 * Ouvrir le bottom sheet pour choisir la quantité (adaptatif: unités ou grammes)
 */
function quickAddFromSearch(foodId) {
    const food = state.foods.find(f => f.id === foodId);
    if (!food) return;
    
    isEditMode = false;
    editMealType = null;
    openQuantitySheet(food, hasNaturalUnit(food) ? food.unitWeight : 100);
}

/**
 * Ouvrir le sheet en mode édition
 */
function openFoodQuantitySheetForEdit(food, currentGrams, mealType) {
    isEditMode = true;
    editMealType = mealType;
    openQuantitySheet(food, currentGrams);
    
    // Changer le texte du bouton
    const confirmBtn = document.getElementById('quantity-confirm-btn');
    if (confirmBtn) confirmBtn.textContent = 'Modifier';
}

/**
 * Ouvrir le bottom sheet de quantité (interne)
 */
function openQuantitySheet(food, initialGrams) {
    selectedFoodForQuantity = food;
    currentQuantity = initialGrams;
    
    // Preserve the meal type from meal-add-sheet if active
    const sheet = document.getElementById('food-quantity-sheet');
    if (sheet && currentMealType) {
        sheet.dataset.mealType = currentMealType;
    }
    
    const isUnitFood = hasNaturalUnit(food);
    currentUnitCount = isUnitFood ? gramsToUnits(food, initialGrams) : initialGrams;
    
    // Titre
    document.getElementById('quantity-food-name').textContent = food.name;
    
    // Label de base (adaptatif)
    const baseLabel = document.getElementById('quantity-base-label');
    if (isUnitFood) {
        const unitLabel = food.unitLabel || 'unité';
        baseLabel.textContent = `Pour 1 ${unitLabel} (~${food.unitWeight}g) :`;
        const multiplier = food.unitWeight / 100;
        document.getElementById('quantity-macros-base').innerHTML = `
            <span>🔥 ${Math.round(food.calories * multiplier)} kcal</span>
            <span>P: ${Math.round(food.protein * multiplier * 10) / 10}g</span>
            <span>G: ${Math.round(food.carbs * multiplier * 10) / 10}g</span>
            <span>L: ${Math.round(food.fat * multiplier * 10) / 10}g</span>
        `;
    } else {
        baseLabel.textContent = 'Pour 100g :';
        document.getElementById('quantity-macros-base').innerHTML = `
            <span>🔥 ${food.calories} kcal</span>
            <span>P: ${food.protein}g</span>
            <span>G: ${food.carbs}g</span>
            <span>L: ${food.fat}g</span>
        `;
    }
    
    // Générer les presets adaptés
    renderQuantityPresets(food);
    
    // Configurer l'input personnalisé
    const input = document.getElementById('custom-quantity-input');
    const unitLabel = document.getElementById('quantity-unit-label');
    const gramsInput = document.getElementById('quantity-grams-value');
    
    if (isUnitFood) {
        input.value = currentUnitCount;
        input.step = '0.5';
        input.min = '0.5';
        unitLabel.textContent = pluralizeFr(food.unitLabel || 'unité', currentUnitCount);
        gramsInput.value = unitsToGrams(food, currentUnitCount);
    } else {
        input.value = initialGrams;
        input.step = '10';
        input.min = '10';
        unitLabel.textContent = 'g';
        gramsInput.value = initialGrams;
    }
    
    // Configurer les boutons +/-
    const minusBtn = document.getElementById('qty-minus-btn');
    const plusBtn = document.getElementById('qty-plus-btn');
    minusBtn.textContent = isUnitFood ? '-1' : '-10';
    plusBtn.textContent = isUnitFood ? '+1' : '+10';
    minusBtn.onclick = () => adjustQuantityUnit(isUnitFood ? -1 : -10);
    plusBtn.onclick = () => adjustQuantityUnit(isUnitFood ? 1 : 10);
    
    // Mettre à jour le total
    updateQuantityTotal();
    
    // Reset le texte du bouton
    const confirmBtn = document.getElementById('quantity-confirm-btn');
    if (confirmBtn && !isEditMode) confirmBtn.textContent = 'Ajouter au repas';
    
    // Afficher le bottom sheet (réutiliser la variable sheet déclarée plus haut)
    if (sheet) {
        sheet.style.display = 'flex';
        sheet.offsetHeight;
        sheet.classList.add('animate-in');
        document.body.style.overflow = 'hidden';
    }
}

/**
 * Générer les presets de quantité adaptés
 */
function renderQuantityPresets(food) {
    const container = document.getElementById('quantity-presets-container');
    if (!container) return;
    
    const presets = getQuantityPresets(food);
    
    container.innerHTML = presets.map(preset => `
        <button class="quantity-preset" onclick="selectQuantityPresetAdaptive(${preset.value})">${preset.label}</button>
    `).join('');
}

/**
 * Sélectionner un preset de quantité (adaptatif)
 */
function selectQuantityPresetAdaptive(gramsValue) {
    if (!selectedFoodForQuantity) return;
    
    currentQuantity = gramsValue;
    const isUnitFood = hasNaturalUnit(selectedFoodForQuantity);
    
    const input = document.getElementById('custom-quantity-input');
    const unitLabel = document.getElementById('quantity-unit-label');
    const gramsInput = document.getElementById('quantity-grams-value');
    
    if (isUnitFood) {
        currentUnitCount = gramsToUnits(selectedFoodForQuantity, gramsValue);
        input.value = currentUnitCount;
        unitLabel.textContent = pluralizeFr(selectedFoodForQuantity.unitLabel || 'unité', currentUnitCount);
    } else {
        input.value = gramsValue;
    }
    
    gramsInput.value = gramsValue;
    updateQuantityTotal();
    
    // Highlight le preset sélectionné
    document.querySelectorAll('.quantity-preset').forEach(btn => {
        btn.classList.remove('selected');
        if (parseInt(btn.textContent) === gramsValue || btn.textContent.includes(currentUnitCount)) {
            btn.classList.add('selected');
        }
    });
}

/**
 * Sélectionner un preset de quantité (legacy)
 */
function selectQuantityPreset(quantity) {
    selectQuantityPresetAdaptive(quantity);
}

/**
 * Ajuster la quantité en unités ou grammes
 */
function adjustQuantityUnit(delta) {
    if (!selectedFoodForQuantity) return;
    
    const isUnitFood = hasNaturalUnit(selectedFoodForQuantity);
    const input = document.getElementById('custom-quantity-input');
    const gramsInput = document.getElementById('quantity-grams-value');
    const unitLabel = document.getElementById('quantity-unit-label');
    
    if (!input) return;
    
    if (isUnitFood) {
        currentUnitCount = Math.max(0.5, (parseFloat(input.value) || 1) + delta);
        input.value = currentUnitCount;
        currentQuantity = unitsToGrams(selectedFoodForQuantity, currentUnitCount);
        if (unitLabel) {
            unitLabel.textContent = pluralizeFr(selectedFoodForQuantity.unitLabel || 'unité', currentUnitCount);
        }
    } else {
        currentQuantity = Math.max(10, (parseInt(input.value) || 100) + delta);
        input.value = currentQuantity;
    }
    
    if (gramsInput) gramsInput.value = currentQuantity;
    updateQuantityTotal();
}

/**
 * Ajuster la quantité (+/-) avec validation (legacy)
 */
function adjustQuantity(delta) {
    const input = document.getElementById('custom-quantity-input');
    const current = parseInt(input.value) || 0;
    let newValue = current + delta;
    
    if (newValue > MAX_QUANTITY) {
        showToast(`Maximum ${MAX_QUANTITY}g`, 'warning');
        newValue = MAX_QUANTITY;
    } else if (newValue < MIN_QUANTITY) {
        newValue = MIN_QUANTITY;
    }
    
    input.value = newValue;
    currentQuantity = newValue;
    updateQuantityTotal();
}

/**
 * Mettre à jour l'affichage du total
 */
function updateQuantityTotal() {
    if (!selectedFoodForQuantity) return;
    
    const isUnitFood = hasNaturalUnit(selectedFoodForQuantity);
    const input = document.getElementById('custom-quantity-input');
    const gramsInput = document.getElementById('quantity-grams-value');
    const unitLabel = document.getElementById('quantity-unit-label');
    
    if (!input) return;
    
    // Calculer les grammes à partir des unités ou directement
    if (isUnitFood) {
        currentUnitCount = parseFloat(input.value) || 1;
        currentQuantity = unitsToGrams(selectedFoodForQuantity, currentUnitCount);
        if (unitLabel) {
            unitLabel.textContent = pluralizeFr(selectedFoodForQuantity.unitLabel || 'unité', currentUnitCount);
        }
    } else {
        currentQuantity = parseInt(input.value) || 100;
    }
    
    // IMPORTANT: Mettre à jour l'input caché avec les grammes calculés
    if (gramsInput) {
        gramsInput.value = currentQuantity;
    }
    
    const multiplier = currentQuantity / 100;
    const calories = Math.round(selectedFoodForQuantity.calories * multiplier);
    const protein = Math.round(selectedFoodForQuantity.protein * multiplier * 10) / 10;
    const carbs = Math.round(selectedFoodForQuantity.carbs * multiplier * 10) / 10;
    const fat = Math.round(selectedFoodForQuantity.fat * multiplier * 10) / 10;
    
    // Affichage adaptatif
    const qtyDisplay = isUnitFood 
        ? formatQuantityDisplay(selectedFoodForQuantity, currentQuantity)
        : `${currentQuantity}g`;
    
    document.getElementById('quantity-total-display').innerHTML = `
        <div style="font-size: 1.5rem; font-weight: 700; color: var(--accent-primary);">${calories} kcal</div>
        <div style="font-size: 0.9rem; color: var(--text-secondary); margin-top: 4px;">
            P: ${protein}g · G: ${carbs}g · L: ${fat}g
        </div>
        <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">${qtyDisplay}</div>
    `;
}

/**
 * Confirmer et ajouter l'aliment au journal
 */
async function confirmAddFood() {
    if (!selectedFoodForQuantity) return;
    
    // S'assurer que currentQuantity est à jour
    updateQuantityTotal();
    
    // Utiliser currentQuantity qui est déjà en grammes
    const gramsInput = document.getElementById('quantity-grams-value');
    const quantity = currentQuantity || parseInt(gramsInput?.value) || 100;
    
    // Mode édition ?
    if (isEditMode && window.editingMealItem) {
        // Mettre à jour l'entrée existante
        const { mealType, idx, entry } = window.editingMealItem;
        updateMealItemQuantity(mealType, idx, quantity);
        closeFoodQuantitySheet();
        showToast('Quantité modifiée', 'success');
        window.editingMealItem = null;
        return;
    }
    
    // Ajouter au journal avec mealType si disponible
    const sheet = document.getElementById('food-quantity-sheet');
    const mealType = sheet?.dataset.mealType || inferMealType(Date.now());
    
    await addToJournalWithMealType(selectedFoodForQuantity.id, quantity, mealType);
    
    // Toast avec format adaptatif
    const qtyDisplay = formatQuantityDisplay(selectedFoodForQuantity, quantity);
    showToast(`${qtyDisplay} de ${selectedFoodForQuantity.name} ajouté`, 'success', 3000);
    
    // Fermer le bottom sheet
    closeFoodQuantitySheet();
}

/**
 * Fermer le bottom sheet dosage
 */
function closeFoodQuantitySheet() {
    const sheet = document.getElementById('food-quantity-sheet');
    if (sheet) {
        sheet.style.display = 'none';
        document.body.style.overflow = '';
        document.body.classList.remove('modal-open');
    }
    selectedFoodForQuantity = null;
}

/**
 * Animation de confirmation sur l'item
 */
function animateFoodAdded(foodId) {
    const item = document.getElementById(`search-item-${foodId}`);
    if (!item) return;
    
    // Animation pulse
    item.style.background = 'var(--accent-glow)';
    item.style.transform = 'scale(0.98)';
    
    setTimeout(() => {
        item.style.background = '';
        item.style.transform = '';
    }, 300);
}

// Écouter les changements sur l'input pour mettre à jour le total en temps réel
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        const quantityInput = document.getElementById('custom-quantity-input');
        if (quantityInput) {
            quantityInput.addEventListener('input', updateQuantityTotal);
        }
        
        // Event listeners pour le toggle unités
        initCustomFoodUnitToggle();
    });
}

/**
 * Toggle affichage de la liste accordéon
 */
function toggleFoodBrowse() {
    const container = document.getElementById('foods-accordion-container');
    const btnText = document.getElementById('browse-btn-text');
    const btnIcon = document.getElementById('browse-btn-icon');
    
    if (!container) return;
    
    const isVisible = container.style.display !== 'none';
    
    if (isVisible) {
        // Fermer
        container.style.display = 'none';
        btnText.textContent = 'Parcourir';
        btnIcon.textContent = '▼';
    } else {
        // Ouvrir
        container.style.display = 'block';
        btnText.textContent = 'Masquer';
        btnIcon.textContent = '▲';
        
        // Render la liste
        renderFoodsList();
    }
}

// ==================== ALIMENTS PERSONNALISÉS ====================

function openCustomFoodModal() {
    document.getElementById('custom-food-name').value = '';
    document.getElementById('custom-food-calories').value = '';
    document.getElementById('custom-food-protein').value = '';
    document.getElementById('custom-food-carbs').value = '';
    document.getElementById('custom-food-fat').value = '';
    document.getElementById('custom-food-category').value = 'protein';
    
    // Reset des champs unités
    const hasUnitCheckbox = document.getElementById('custom-food-has-unit');
    const unitContainer = document.getElementById('unit-fields-container');
    if (hasUnitCheckbox) hasUnitCheckbox.checked = false;
    if (unitContainer) unitContainer.style.display = 'none';
    document.getElementById('custom-food-unit-label').value = '';
    document.getElementById('custom-food-unit-weight').value = '';
    
    // Reset du label
    const nutritionLabel = document.getElementById('nutrition-values-label');
    if (nutritionLabel) nutritionLabel.textContent = 'Valeurs pour 100g :';
    
    openModal('custom-food-modal');
}

async function saveCustomFood() {
    const btn = document.querySelector('#custom-food-modal .btn-primary');
    
    if (btn) {
        btn.classList.add('loading');
        btn.disabled = true;
    }
    
    try {
        const name = document.getElementById('custom-food-name').value.trim();
        const calories = parseFloat(document.getElementById('custom-food-calories').value);
        const protein = parseFloat(document.getElementById('custom-food-protein').value) || 0;
        const carbs = parseFloat(document.getElementById('custom-food-carbs').value) || 0;
        const fat = parseFloat(document.getElementById('custom-food-fat').value) || 0;
        const category = document.getElementById('custom-food-category').value;
        
        // Récupérer les infos d'unité
        const hasUnit = document.getElementById('custom-food-has-unit').checked;
        const unitLabel = document.getElementById('custom-food-unit-label').value.trim();
        const unitWeight = parseFloat(document.getElementById('custom-food-unit-weight').value);

        // Validation du nom
        if (!name) {
            showToast('Nom requis', 'error');
            return;
        }
        
        if (name.length > MAX_NAME_LENGTH) {
            showToast(`Nom trop long (max ${MAX_NAME_LENGTH} caractères)`, 'error');
            return;
        }
        
        // Validation des calories
        if (isNaN(calories) || calories < 0) {
            showToast('Calories invalides', 'error');
            return;
        }
        
        if (calories > MAX_CALORIES) {
            showToast(`Maximum ${MAX_CALORIES} kcal`, 'error');
            return;
        }
        
        // Validation des macros
        if (protein < 0 || protein > MAX_MACRO) {
            showToast(`Protéines : 0-${MAX_MACRO}g`, 'error');
            return;
        }
        
        if (carbs < 0 || carbs > MAX_MACRO) {
            showToast(`Glucides : 0-${MAX_MACRO}g`, 'error');
            return;
        }
        
        if (fat < 0 || fat > MAX_MACRO) {
            showToast(`Lipides : 0-${MAX_MACRO}g`, 'error');
            return;
        }
        
        // Validation des unités si activé
        if (hasUnit) {
            if (!unitLabel) {
                showToast('Nom de l\'unité requis', 'error');
                return;
            }
            if (isNaN(unitWeight) || unitWeight <= 0) {
                showToast('Poids de l\'unité invalide', 'error');
                return;
            }
            if (unitWeight > 10000) {
                showToast('Poids maximum 10000g', 'error');
                return;
            }
        }

        // Construire l'objet food
        const food = {
            id: 'custom-' + Date.now(),
            name,
            calories,
            protein: protein || 0,
            carbs: carbs || 0,
            fat: fat || 0,
            category
        };
        
        // Ajouter les propriétés d'unité si activé
        if (hasUnit && unitLabel && unitWeight > 0) {
            food.unit = 'piece'; // Type générique
            food.unitLabel = unitLabel;
            food.unitWeight = unitWeight;
        }

        state.foods.push(food);
        saveState();
        
        // Sync avec Supabase si connecté
        let supabaseId = null;
        if (typeof isLoggedIn === 'function' && isLoggedIn()) {
            supabaseId = await saveCustomFoodToSupabase(food);
            if (supabaseId) {
                // CRITIQUE : Mettre à jour l'ID dans le state avec l'ID Supabase
                const foodIndex = state.foods.findIndex(f => f.id === food.id);
                if (foodIndex !== -1) {
                    state.foods[foodIndex].id = supabaseId;
                    food.id = supabaseId; // Aussi mettre à jour la référence locale
                }
                saveState(); // Re-sauvegarder avec le bon ID
            }
        }
        
        closeModal('custom-food-modal');
        renderFoodsList();
        
        // Feedback utilisateur consolidé
        if (supabaseId) {
            showToast('Aliment ajouté !', 'success');
        } else if (typeof isLoggedIn === 'function' && isLoggedIn()) {
            showToast('Aliment ajouté (sync en attente)', 'warning');
        } else {
            showToast('Aliment ajouté !', 'success');
        }
        
    } finally {
        if (btn) {
            btn.classList.remove('loading');
            btn.disabled = false;
        }
    }
}

// ==================== GESTION DU TOGGLE UNITÉS CUSTOM FOOD ====================

function initCustomFoodUnitToggle() {
    const hasUnitCheckbox = document.getElementById('custom-food-has-unit');
    const unitContainer = document.getElementById('unit-fields-container');
    const unitLabelInput = document.getElementById('custom-food-unit-label');
    const unitWeightInput = document.getElementById('custom-food-unit-weight');
    const nutritionLabel = document.getElementById('nutrition-values-label');
    const unitLabelPreview = document.getElementById('unit-label-preview');
    
    if (!hasUnitCheckbox) return;
    
    // Toggle affichage des champs unités
    hasUnitCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) {
            unitContainer.style.display = 'block';
            updateNutritionLabel();
        } else {
            unitContainer.style.display = 'none';
            nutritionLabel.textContent = 'Valeurs pour 100g :';
        }
    });
    
    // Mise à jour du label quand on change le nom de l'unité
    unitLabelInput?.addEventListener('input', updateNutritionLabel);
    unitWeightInput?.addEventListener('input', updateNutritionLabel);
    
    function updateNutritionLabel() {
        const unitLabel = unitLabelInput.value.trim() || 'unité';
        const unitWeight = unitWeightInput.value || '?';
        
        if (hasUnitCheckbox.checked) {
            nutritionLabel.textContent = `Valeurs pour 1 ${unitLabel} (~${unitWeight}g) :`;
            unitLabelPreview.textContent = unitLabel;
        }
    }
}

function deleteCustomFood(foodId) {
    if (!confirm('Supprimer cet aliment ?')) return;
    
    state.foods = state.foods.filter(f => f.id !== foodId);
    saveState();
    
    // Sync avec Supabase si connecté
    if (typeof isLoggedIn === 'function' && isLoggedIn()) {
        deleteCustomFoodFromSupabase(foodId);
    }
    
    renderFoodsList();
    showToast('Aliment supprimé', 'success');
}

// ==================== JOURNAL ALIMENTAIRE ====================

// Initialiser le journal
function initJournal() {
    const dateInput = document.getElementById('journal-date');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
        loadJournalDay();
    }
}

// Charger les entrées du journal pour une date
function loadJournalDay() {
    const date = document.getElementById('journal-date')?.value;
    if (!date) return;
    
    if (!state.foodJournal) state.foodJournal = {};

    renderJournalEntries();
    updateJournalSummary();
    
    // Mettre à jour les anneaux du dashboard
    updateMacroRings();
}

// Recherche d'aliments pour le journal (sélection multiple)
function searchFoodsForJournal() {
    const searchTerm = document.getElementById('journal-food-search').value;
    const container = document.getElementById('journal-food-results');

    if (searchTerm.length < 2) {
        container.innerHTML = '';
        updateSelectedFoodsUI();
        return;
    }

    // Normaliser la requête (boeuf = bœuf, oeuf = œuf)
    const normalizedQuery = normalizeForSearch(searchTerm);
    
    const results = state.foods.filter(f => {
        const normalizedName = normalizeForSearch(f.name);
        return normalizedName.includes(normalizedQuery);
    }).slice(0, 12);

    if (results.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 15px;">Aucun résultat</p>';
        return;
    }

    container.innerHTML = results.map(food => {
        const isSelected = selectedFoodsToAdd.some(f => f.id === food.id);
        return `
            <div class="food-search-item-selectable ${isSelected ? 'selected' : ''}" onclick="toggleFoodSelection('${food.id}')">
                <div class="food-check"></div>
                <div class="food-select-info-multi">
                    <strong>${food.name}</strong>
                    <div class="food-search-macros">
                        <span>🔥 ${food.calories} kcal</span>
                        <span>P: ${food.protein}g</span>
                        <span>G: ${food.carbs}g</span>
                        <span>L: ${food.fat}g</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    updateSelectedFoodsUI();
}

// Toggle la sélection d'un aliment
function toggleFoodSelection(foodId) {
    const food = state.foods.find(f => f.id === foodId);
    if (!food) return;
    
    const existingIndex = selectedFoodsToAdd.findIndex(f => f.id === foodId);
    
    if (existingIndex >= 0) {
        selectedFoodsToAdd.splice(existingIndex, 1);
    } else {
        selectedFoodsToAdd.push(food);
    }
    
    // Mettre à jour l'UI
    searchFoodsForJournal();
}

// Supprimer un aliment de la sélection
function removeFromSelection(foodId) {
    selectedFoodsToAdd = selectedFoodsToAdd.filter(f => f.id !== foodId);
    searchFoodsForJournal();
}

// Mettre à jour l'UI des aliments sélectionnés
function updateSelectedFoodsUI() {
    const container = document.getElementById('journal-selected-foods');
    const listContainer = document.getElementById('selected-foods-list');
    const countEl = document.getElementById('selected-foods-count');
    
    if (!container || !listContainer) return;
    
    if (selectedFoodsToAdd.length === 0) {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'block';
    countEl.textContent = selectedFoodsToAdd.length;
    
    listContainer.innerHTML = selectedFoodsToAdd.map(food => `
        <span class="selected-food-chip">
            ${food.name}
            <span class="remove-chip" onclick="removeFromSelection('${food.id}')">×</span>
        </span>
    `).join('');
}

// Ajouter tous les aliments sélectionnés au journal
async function addSelectedFoodsToJournal() {
    if (selectedFoodsToAdd.length === 0) return;
    
    const date = document.getElementById('journal-date')?.value || new Date().toISOString().split('T')[0];
    
    for (const food of selectedFoodsToAdd) {
        await addToJournalDirect(food.id, 100);
    }
    
    const count = selectedFoodsToAdd.length;
    selectedFoodsToAdd = [];
    
    // Vider la recherche
    document.getElementById('journal-food-search').value = '';
    document.getElementById('journal-food-results').innerHTML = '';
    updateSelectedFoodsUI();
    
    showToast(`${count} aliment${count > 1 ? 's' : ''} ajouté${count > 1 ? 's' : ''} au journal`, 'success');
}

// Ajouter un aliment au journal (avec UI)
async function addToJournal(foodId) {
    const date = document.getElementById('journal-date').value;
    const food = state.foods.find(f => f.id === foodId);

    if (!food) return;

    await addToJournalDirect(foodId, 100);

    // Vider la recherche
    document.getElementById('journal-food-search').value = '';
    document.getElementById('journal-food-results').innerHTML = '';

    showToast(`${food.name} ajouté au journal`, 'success');
}

// Ajouter directement au journal (sans UI)
async function addToJournalDirect(foodId, quantity) {
    // Validation stricte du foodId
    if (!foodId || typeof foodId !== 'string') {
        console.error('addToJournalDirect: foodId invalide', foodId);
        showToast('Erreur: aliment non valide', 'error');
        return;
    }
    
    const date = document.getElementById('journal-date')?.value || new Date().toISOString().split('T')[0];
    const food = state.foods.find(f => f.id === foodId);

    if (!food) {
        console.error('addToJournalDirect: aliment non trouvé', foodId);
        showToast('Aliment introuvable', 'error');
        return;
    }
    
    // Validation stricte de la quantité
    quantity = Math.max(MIN_QUANTITY, parseInt(quantity) || 100);
    if (quantity > MAX_QUANTITY) {
        showToast(`Quantité trop élevée (max ${MAX_QUANTITY/1000}kg)`, 'error');
        return;
    }

    if (!state.foodJournal) state.foodJournal = {};
    if (!state.foodJournal[date]) state.foodJournal[date] = [];

    // Inférer le mealType pour le quick add (basé sur l'heure)
    const mealType = inferMealType(Date.now());
    
    const entry = {
        foodId: food.id,
        quantity: quantity,
        addedAt: Date.now(),
        mealType: mealType,
        isNew: true // Marquer comme nouvelle pour l'animation
    };
    
    // Sync avec Supabase si connecté
    if (typeof isLoggedIn === 'function' && isLoggedIn()) {
        const supabaseId = await addJournalEntryToSupabase(date, food.id, quantity, mealType);
        if (supabaseId) entry.supabaseId = supabaseId;
    }
    
    state.foodJournal[date].push(entry);
    saveState();

    renderJournalEntries();
    updateJournalSummary();
    updateMacroRings();
    
    // Retirer le flag isNew après l'animation
    setTimeout(() => {
        if (state.foodJournal[date]) {
            state.foodJournal[date].forEach(e => delete e.isNew);
        }
    }, 2000);
}

// Afficher les entrées du journal
function renderJournalEntries() {
    const container = document.getElementById('journal-entries');
    const date = document.getElementById('journal-date')?.value;

    if (!date) return;

    if (!state.foodJournal) state.foodJournal = {};
    const entries = state.foodJournal[date] || [];

    if (entries.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="padding: 30px;">
                <div class="empty-state-icon">📋</div>
                <div class="empty-state-title">Journal vide</div>
                <p>Recherchez et ajoutez ce que vous avez mangé aujourd'hui</p>
            </div>
        `;
        return;
    }

    container.innerHTML = entries.map((entry, idx) => {
        const food = state.foods.find(f => f.id === entry.foodId);
        if (!food) return '';

        const multiplier = entry.quantity / 100;
        const cals = Math.round(food.calories * multiplier);
        const protein = Math.round(food.protein * multiplier * 10) / 10;
        const carbs = Math.round(food.carbs * multiplier * 10) / 10;
        const fat = Math.round(food.fat * multiplier * 10) / 10;

        const animationClass = entry.isNew ? 'entry-added entry-highlight' : '';
        
        return `
            <div class="journal-entry ${animationClass}">
                <div class="journal-entry-main">
                    <div class="journal-entry-header">
                        <div class="journal-entry-name">${food.name}</div>
                        <div class="journal-entry-cals">${cals} kcal</div>
                    </div>
                    <div class="journal-entry-macros">
                        <span class="macro-badge macro-badge-protein">P ${protein}g</span>
                        <span class="macro-badge macro-badge-carbs">G ${carbs}g</span>
                        <span class="macro-badge macro-badge-fat">L ${fat}g</span>
                    </div>
                </div>
                <div class="journal-entry-actions">
                    <div class="journal-entry-qty">
                        <input type="number" value="${entry.quantity}" min="1" step="10" 
                               onchange="updateJournalQuantity(${idx}, this.value)">
                        <span>g</span>
                    </div>
                    <button class="journal-entry-delete" onclick="removeFromJournal(${idx})" title="Supprimer">
                        🗑️
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Mettre à jour la quantité d'une entrée (avec feedback)
function updateJournalQuantity(index, quantity) {
    const date = document.getElementById('journal-date').value;
    const rawQuantity = parseInt(quantity) || 100;
    
    // Validation avec feedback si hors limites
    if (rawQuantity < MIN_QUANTITY) {
        showToast(`Minimum ${MIN_QUANTITY}g`, 'warning');
        quantity = MIN_QUANTITY;
    } else if (rawQuantity > MAX_QUANTITY) {
        showToast(`Maximum ${MAX_QUANTITY}g`, 'warning');
        quantity = MAX_QUANTITY;
    } else {
        quantity = rawQuantity;
    }

    if (state.foodJournal[date] && state.foodJournal[date][index]) {
        const entry = state.foodJournal[date][index];
        entry.quantity = quantity;
        saveState();
        
        // Sync avec Supabase si connecté
        if (typeof isLoggedIn === 'function' && isLoggedIn() && entry.supabaseId) {
            updateJournalEntryInSupabase(entry.supabaseId, quantity)
                .catch(err => console.error('Erreur sync quantité:', err));
        }
        
        renderJournalEntries();
        updateJournalSummary();
        updateMacroRings();
    }
}

// Supprimer une entrée du journal
function removeFromJournal(index) {
    const date = document.getElementById('journal-date').value;

    if (state.foodJournal[date]) {
        const entry = state.foodJournal[date][index];
        
        // Sync avec Supabase si connecté
        if (typeof isLoggedIn === 'function' && isLoggedIn() && entry.supabaseId) {
            deleteJournalEntryFromSupabase(entry.supabaseId);
        }
        
        state.foodJournal[date].splice(index, 1);
        saveState();
        renderJournalEntries();
        updateJournalSummary();
        updateMacroRings();
        showToast('Aliment supprimé', 'success');
    }
}

// Vider le menu du jour
function clearJournalDay() {
    const date = document.getElementById('journal-date').value;

    if (!state.foodJournal[date] || state.foodJournal[date].length === 0) {
        showToast('Le journal est déjà vide', 'error');
        return;
    }

    if (confirm('Vider le journal de cette journée ?')) {
        // Sync avec Supabase si connecté
        if (typeof isLoggedIn === 'function' && isLoggedIn()) {
            clearJournalDayInSupabase(date);
        }
        
        state.foodJournal[date] = [];
        saveState();
        renderJournalEntries();
        updateJournalSummary();
        updateMacroRings();
        showToast('Journal vidé', 'success');
    }
}

// ==================== CALCUL DES MACROS ====================

// Calculer les macros du jour depuis le journal
function calculateJournalMacros(date) {
    if (!date) {
        date = new Date().toISOString().split('T')[0];
    }
    
    const entries = state.foodJournal?.[date] || [];
    
    let calories = 0, protein = 0, carbs = 0, fat = 0;
    
    entries.forEach(entry => {
        const food = state.foods.find(f => f.id === entry.foodId);
        if (food) {
            const multiplier = entry.quantity / 100;
            calories += food.calories * multiplier;
            protein += food.protein * multiplier;
            carbs += food.carbs * multiplier;
            fat += food.fat * multiplier;
        }
    });
    
    return {
        calories: Math.round(calories),
        protein: Math.round(protein * 10) / 10,
        carbs: Math.round(carbs * 10) / 10,
        fat: Math.round(fat * 10) / 10
    };
}

// Calculer et afficher le résumé des macros du journal avec barres de progression
function updateJournalSummary() {
    const date = document.getElementById('journal-date')?.value;
    if (!date) return;
    
    const macros = calculateJournalMacros(date);
    
    // Objectifs
    const targets = {
        calories: state.profile?.targetCalories || 2000,
        protein: state.profile?.macros?.protein || 150,
        carbs: state.profile?.macros?.carbs || 250,
        fat: state.profile?.macros?.fat || 70
    };
    
    // Calculer le déficit net (calories - cardio)
    const cardioCalories = typeof getTodayCardioCalories === 'function' ? getTodayCardioCalories() : 0;
    const netCalories = macros.calories - cardioCalories;
    
    // Mettre à jour le sticky header
    updateNutritionStickyHeader(macros, targets);

    // Mettre à jour les barres de progression
    const bars = [
        { id: 'cals', current: macros.calories, target: targets.calories, unit: 'kcal' },
        { id: 'prot', current: macros.protein, target: targets.protein, unit: 'g' },
        { id: 'carbs', current: macros.carbs, target: targets.carbs, unit: 'g' },
        { id: 'fat', current: macros.fat, target: targets.fat, unit: 'g' }
    ];
    
    bars.forEach(bar => {
        const valuesEl = document.getElementById(`journal-${bar.id}-values`);
        const fillEl = document.getElementById(`journal-${bar.id}-bar`);
        
        if (valuesEl) {
            // Pour les calories, afficher aussi le déficit net si cardio > 0
            if (bar.id === 'cals' && cardioCalories > 0) {
                valuesEl.innerHTML = `${bar.current} / ${bar.target}${bar.unit} <span class="net-deficit-inline">(net: ${netCalories})</span>`;
            } else {
                valuesEl.textContent = `${bar.current} / ${bar.target}${bar.unit}`;
            }
        }
        
        if (fillEl) {
            const percent = Math.min((bar.current / bar.target) * 100, 100);
            fillEl.style.width = `${percent}%`;
            
            // Ajouter les classes pour l'état
            fillEl.classList.remove('complete', 'over');
            if (bar.current >= bar.target) {
                fillEl.classList.add('complete');
            }
            if (bar.current > bar.target * 1.1) {
                fillEl.classList.add('over');
            }
        }
    });
    
    // Afficher le résumé du déficit net si du cardio a été fait
    const netDeficitEl = document.getElementById('net-deficit-summary');
    if (netDeficitEl) {
        if (cardioCalories > 0) {
            const remaining = targets.calories - netCalories;
            netDeficitEl.innerHTML = `
                <div class="net-deficit-card">
                    <span class="deficit-icon">🔥</span>
                    <div class="deficit-details">
                        <span class="deficit-label">Déficit net</span>
                        <span class="deficit-value">${netCalories} kcal consommées - ${cardioCalories} kcal brûlées = <strong>${remaining} kcal restantes</strong></span>
                    </div>
                </div>
            `;
            netDeficitEl.style.display = 'block';
        } else {
            netDeficitEl.style.display = 'none';
        }
    }
    
    // Mettre à jour le graphique des calories
    if (typeof renderCaloriesChart === 'function') {
        renderCaloriesChart(currentCaloriesPeriod);
    }
}

// Fonction de compatibilité pour l'ancien système (utilisée par updateMacroBars dans profile.js)
function calculateConsumedMacros() {
    // Maintenant, on utilise UNIQUEMENT le menu du jour
    const today = new Date().toISOString().split('T')[0];
    return calculateJournalMacros(today);
}

// Mettre à jour le sticky header avec calories restantes
function updateNutritionStickyHeader(macros, targets) {
    // Calculer les calories brûlées par le cardio
    const cardioCalories = typeof getTodayCardioCalories === 'function' ? getTodayCardioCalories() : 0;
    
    // Déficit net = calories consommées - calories brûlées (cardio)
    const netCalories = macros.calories - cardioCalories;
    const caloriesRemaining = targets.calories - netCalories;
    
    const caloriesRemainingEl = document.getElementById('sticky-cals-remaining');
    
    if (caloriesRemainingEl) {
        // Afficher avec indication du cardio si applicable
        if (cardioCalories > 0) {
            caloriesRemainingEl.innerHTML = `${caloriesRemaining} kcal <span class="cardio-burned-badge">(-${cardioCalories})</span>`;
        } else {
            caloriesRemainingEl.textContent = `${caloriesRemaining} kcal`;
        }
        
        // Couleur selon le status
        if (caloriesRemaining < 0) {
            caloriesRemainingEl.style.color = '#ff6b6b'; // Rouge si dépassé
        } else if (caloriesRemaining < 200) {
            caloriesRemainingEl.style.color = '#ffd93d'; // Jaune si proche
        } else {
            caloriesRemainingEl.style.color = 'var(--accent-primary)'; // Vert normal
        }
    }
    
    // Mettre à jour les mini barres
    const bars = [
        { id: 'protein', current: macros.protein, target: targets.protein },
        { id: 'carbs', current: macros.carbs, target: targets.carbs },
        { id: 'fat', current: macros.fat, target: targets.fat }
    ];
    
    bars.forEach(bar => {
        const fillEl = document.getElementById(`sticky-bar-${bar.id}`);
        if (fillEl) {
            const percent = Math.min((bar.current / bar.target) * 100, 100);
            fillEl.style.width = `${percent}%`;
        }
    });
}

// Gérer la visibilité du sticky header au scroll
function initNutritionStickyScroll() {
    const stickyHeader = document.getElementById('nutrition-sticky-header');
    if (!stickyHeader) return;
    
    let lastScroll = 0;
    
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        const nutritionSection = document.getElementById('nutrition');
        
        // Afficher le header uniquement si on est dans la section nutrition et qu'on a scrollé
        if (nutritionSection && nutritionSection.classList.contains('active')) {
            if (currentScroll > 150) {
                stickyHeader.classList.add('visible');
            } else {
                stickyHeader.classList.remove('visible');
            }
        } else {
            stickyHeader.classList.remove('visible');
        }
        
        lastScroll = currentScroll;
    });
}

// Mettre à jour les anneaux de macros du dashboard
function updateMacroRings() {
    const today = new Date().toISOString().split('T')[0];
    const consumed = calculateJournalMacros(today);
    
    if (!state.profile) return;
    
    const targets = {
        calories: state.profile.targetCalories || 2000,
        protein: state.profile.macros?.protein || 150,
        carbs: state.profile.macros?.carbs || 250,
        fat: state.profile.macros?.fat || 70
    };
    
    // Mettre à jour les anneaux si PremiumUI est disponible
    if (typeof window.PremiumUI !== 'undefined' && window.PremiumUI.createProgressRing) {
        const ringConfigs = [
            { id: 'ring-calories', value: consumed.calories, max: targets.calories, label: 'Calories', type: 'calories' },
            { id: 'ring-protein', value: consumed.protein, max: targets.protein, label: 'Protéines', type: 'protein' },
            { id: 'ring-carbs', value: consumed.carbs, max: targets.carbs, label: 'Glucides', type: 'carbs' },
            { id: 'ring-fat', value: consumed.fat, max: targets.fat, label: 'Lipides', type: 'fat' }
        ];
        
        ringConfigs.forEach(config => {
            const container = document.getElementById(config.id);
            if (container) {
                window.PremiumUI.createProgressRing(container, {
                    value: config.value,
                    max: config.max,
                    label: config.label,
                    type: config.type,
                    size: 100
                });
            }
        });
        
        // Mettre à jour les détails sous les anneaux
        const calsDetail = document.getElementById('ring-calories-detail');
        const protDetail = document.getElementById('ring-protein-detail');
        const carbsDetail = document.getElementById('ring-carbs-detail');
        const fatDetail = document.getElementById('ring-fat-detail');
        
        if (calsDetail) calsDetail.textContent = `${consumed.calories} / ${targets.calories} kcal`;
        if (protDetail) protDetail.textContent = `${consumed.protein} / ${targets.protein}g`;
        if (carbsDetail) carbsDetail.textContent = `${consumed.carbs} / ${targets.carbs}g`;
        if (fatDetail) fatDetail.textContent = `${consumed.fat} / ${targets.fat}g`;
    }
    
    // Aussi mettre à jour les barres de fallback
    updateMacroBars();
}

// Mise à jour des barres de macros (fallback mobile)
function updateMacroBars() {
    const consumed = calculateConsumedMacros();
    
    if (!state.profile) return;
    
    const targets = {
        protein: state.profile.macros?.protein || 150,
        carbs: state.profile.macros?.carbs || 250,
        fat: state.profile.macros?.fat || 70
    };
    
    // Protéines
    const proteinPercent = Math.min((consumed.protein / targets.protein) * 100, 100);
    const proteinValue = document.getElementById('macro-protein-value');
    const proteinBar = document.getElementById('macro-protein-bar');
    if (proteinValue) proteinValue.textContent = `${consumed.protein} / ${targets.protein}g`;
    if (proteinBar) proteinBar.style.width = `${proteinPercent}%`;
    
    // Glucides
    const carbsPercent = Math.min((consumed.carbs / targets.carbs) * 100, 100);
    const carbsValue = document.getElementById('macro-carbs-value');
    const carbsBar = document.getElementById('macro-carbs-bar');
    if (carbsValue) carbsValue.textContent = `${consumed.carbs} / ${targets.carbs}g`;
    if (carbsBar) carbsBar.style.width = `${carbsPercent}%`;
    
    // Lipides
    const fatPercent = Math.min((consumed.fat / targets.fat) * 100, 100);
    const fatValue = document.getElementById('macro-fat-value');
    const fatBar = document.getElementById('macro-fat-bar');
    if (fatValue) fatValue.textContent = `${consumed.fat} / ${targets.fat}g`;
    if (fatBar) fatBar.style.width = `${fatPercent}%`;
}

// ==================== GESTION PAR REPAS ====================

// État du meal sheet
let currentMealType = null;
let mealSectionStates = { breakfast: true, lunch: true, snack: false, dinner: true };

// Toggle une section de repas
function toggleMealSection(mealType) {
    const section = document.querySelector(`.meal-section[data-meal="${mealType}"]`);
    if (!section) return;
    
    mealSectionStates[mealType] = !mealSectionStates[mealType];
    section.classList.toggle('expanded', mealSectionStates[mealType]);
}

// Ouvrir le bottom sheet d'ajout de repas
function openMealSheet(mealType) {
    currentMealType = mealType;
    const sheet = document.getElementById('meal-add-sheet');
    const title = document.getElementById('meal-sheet-title');
    
    if (!sheet) return;
    
    const mealLabels = {
        breakfast: 'Petit-déjeuner',
        lunch: 'Déjeuner', 
        snack: 'Collation',
        dinner: 'Dîner'
    };
    
    title.textContent = `Ajouter au ${mealLabels[mealType] || 'repas'}`;
    
    // RESET: Vider la recherche et réinitialiser les sections
    const searchInput = document.getElementById('meal-food-search');
    const resultsSection = document.getElementById('meal-results-section');
    const suggestionsSection = document.getElementById('meal-suggestions-section');
    const quickSection = document.getElementById('meal-quick-section');
    
    if (searchInput) searchInput.value = '';
    if (resultsSection) resultsSection.style.display = 'none';
    if (suggestionsSection) suggestionsSection.style.display = 'block';
    if (quickSection) quickSection.style.display = 'block';
    
    // Reset des filtres et tri
    currentNutritionFilter = 'all';
    currentNutritionSort = 'relevance';
    document.querySelectorAll('.filter-chip').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === 'all');
    });
    const sortSelect = document.getElementById('nutrition-sort');
    if (sortSelect) sortSelect.value = 'relevance';
    
    // Réinitialiser le compteur de refresh des suggestions
    resetSuggestionRefresh();
    
    // Charger les suggestions fraîches
    renderMealSuggestions(mealType);
    renderQuickMeals(mealType);
    
    // Reset des styles transform/transition pour éviter les bugs de réouverture
    const innerSheet = sheet.querySelector('.bottom-sheet');
    if (innerSheet) {
        innerSheet.style.transform = '';
        innerSheet.style.transition = '';
    }
    
    // CRITIQUE : Bloquer le scroll de la page derrière la modal
    document.body.style.overflow = 'hidden';
    document.body.classList.add('modal-open');
    
    sheet.style.display = 'flex';
    setTimeout(() => sheet.classList.add('active'), 10);
}

// Fermer le bottom sheet d'ajout de repas
function closeMealSheet() {
    const sheet = document.getElementById('meal-add-sheet');
    if (!sheet) return;
    
    sheet.classList.remove('active');
    
    // CRITIQUE : Réactiver le scroll de la page
    document.body.style.overflow = '';
    document.body.classList.remove('modal-open');
    
    // Reset du padding clavier
    resetKeyboardPaddingFix();
    
    // Reset propre des styles transform/transition
    const innerSheet = sheet.querySelector('.bottom-sheet');
    if (innerSheet) {
        innerSheet.style.transform = '';
        innerSheet.style.transition = '';
    }
    
    setTimeout(() => {
        sheet.style.display = 'none';
        currentMealType = null;
        
        // Reset complet pour la prochaine ouverture
        const searchInput = document.getElementById('meal-food-search');
        const resultsSection = document.getElementById('meal-results-section');
        if (searchInput) searchInput.value = '';
        if (resultsSection) resultsSection.style.display = 'none';
    }, 300);
}

// ==================== FILTRES RECHERCHE AVANCÉS ====================

/**
 * Appliquer un filtre de catégorie
 */
function setNutritionFilter(filter) {
    currentNutritionFilter = filter;
    
    // Mettre à jour les classes actives
    document.querySelectorAll('.filter-chip').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    
    // Relancer la recherche
    searchFoodsForMeal();
}

/**
 * Appliquer un tri
 */
function setNutritionSort(sort) {
    currentNutritionSort = sort;
    searchFoodsForMeal();
}

/**
 * Trier les résultats de recherche
 */
function sortFoodResults(foods, sortType) {
    switch (sortType) {
        case 'alpha':
            return foods.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
        case 'calories-asc':
            return foods.sort((a, b) => a.calories - b.calories);
        case 'calories-desc':
            return foods.sort((a, b) => b.calories - a.calories);
        case 'protein-desc':
            return foods.sort((a, b) => b.protein - a.protein);
        default: // relevance
            return foods.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    }
}

// Recherche d'aliments pour un repas
function searchFoodsForMeal() {
    const searchInput = document.getElementById('meal-food-search');
    const resultsSection = document.getElementById('meal-results-section');
    const resultsList = document.getElementById('meal-results-list');
    const suggestionsSection = document.getElementById('meal-suggestions-section');
    const quickSection = document.getElementById('meal-quick-section');
    
    if (!searchInput || !resultsSection || !resultsList) return;
    
    const query = searchInput.value.trim();
    
    if (query.length < 2) {
        resultsSection.style.display = 'none';
        if (suggestionsSection) suggestionsSection.style.display = 'block';
        if (quickSection) quickSection.style.display = 'block';
        return;
    }
    
    // Masquer les autres sections
    if (suggestionsSection) suggestionsSection.style.display = 'none';
    if (quickSection) quickSection.style.display = 'none';
    
    // Recherche avec normalisation
    const normalizedQuery = normalizeForSearch(query);
    let results = state.foods.filter(f => {
        const normalizedName = normalizeForSearch(f.name);
        const matchesName = normalizedName.includes(normalizedQuery);
        
        // Filtre par catégorie
        const matchesFilter = currentNutritionFilter === 'all' || 
            f.category === currentNutritionFilter ||
            (currentNutritionFilter === 'veggies' && (f.category === 'veggies' || f.category === 'fruits'));
        
        return matchesName && matchesFilter;
    });
    
    // Appliquer le tri
    results = sortFoodResults(results, currentNutritionSort);
    
    // Limiter à 15 résultats
    results = results.slice(0, 15);
    
    if (results.length === 0) {
        resultsList.innerHTML = '<div class="meal-empty">Aucun résultat</div>';
    } else {
        resultsList.innerHTML = results.map(food => `
            <div class="meal-result-item" onclick="selectFoodForMeal('${food.id}')">
                <div class="meal-item-icon-wrap">${foodCategories[food.category]?.icon || '📦'}</div>
                <div class="meal-item-text">
                    <div class="meal-item-title">${food.name}</div>
                    <div class="meal-item-subtitle">P: ${food.protein}g · G: ${food.carbs}g · L: ${food.fat}g</div>
                </div>
                <div class="meal-item-cals">${food.calories} kcal</div>
            </div>
        `).join('');
    }
    
    resultsSection.style.display = 'block';
}

// Sélectionner un aliment pour le repas
function selectFoodForMeal(foodId) {
    const food = state.foods.find(f => f.id === foodId);
    if (!food) return;
    
    closeMealSheet();
    
    // Ouvrir le bottom sheet de quantité avec le mealType
    openFoodQuantitySheetForMeal(food, currentMealType);
}

// Ouvrir le sheet de quantité pour un repas spécifique
function openFoodQuantitySheetForMeal(food, mealType) {
    const sheet = document.getElementById('food-quantity-sheet');
    if (!sheet) return;
    
    // Stocker le mealType pour l'ajout
    sheet.dataset.mealType = mealType;
    sheet.dataset.foodId = food.id;
    
    // Stocker l'aliment sélectionné
    selectedFoodForQuantity = food;
    isEditMode = false;
    
    // Calculer la quantité initiale selon le type d'unité
    const isUnitFood = hasNaturalUnit(food);
    const initialGrams = isUnitFood ? food.unitWeight : 100; // 1 unité ou 100g
    currentQuantity = initialGrams;
    currentUnitCount = isUnitFood ? 1 : initialGrams;
    
    // Mettre à jour le titre
    document.getElementById('quantity-food-name').textContent = food.name;
    
    // Label de base (adaptatif)
    const baseLabel = document.getElementById('quantity-base-label');
    const baseMacros = document.getElementById('quantity-macros-base');
    
    if (isUnitFood) {
        const unitLabel = food.unitLabel || 'unité';
        if (baseLabel) baseLabel.textContent = `Pour 1 ${unitLabel} (~${food.unitWeight}g) :`;
        const multiplier = food.unitWeight / 100;
        if (baseMacros) {
            baseMacros.innerHTML = `
                <span>🔥 ${Math.round(food.calories * multiplier)} kcal</span>
                <span>P: ${Math.round(food.protein * multiplier * 10) / 10}g</span>
                <span>G: ${Math.round(food.carbs * multiplier * 10) / 10}g</span>
                <span>L: ${Math.round(food.fat * multiplier * 10) / 10}g</span>
            `;
        }
    } else {
        if (baseLabel) baseLabel.textContent = 'Pour 100g :';
        if (baseMacros) {
            baseMacros.innerHTML = `
                <span>🔥 ${food.calories} kcal</span>
                <span>P: ${food.protein}g</span>
                <span>G: ${food.carbs}g</span>
                <span>L: ${food.fat}g</span>
            `;
        }
    }
    
    // Générer les presets adaptés
    renderQuantityPresets(food);
    
    // Configurer l'input personnalisé
    const input = document.getElementById('custom-quantity-input');
    const unitLabel = document.getElementById('quantity-unit-label');
    const gramsInput = document.getElementById('quantity-grams-value');
    
    if (isUnitFood) {
        if (input) {
            input.value = 1; // 1 unité par défaut
            input.step = '0.5';
            input.min = '0.5';
        }
        if (unitLabel) unitLabel.textContent = food.unitLabel || 'unité';
        if (gramsInput) gramsInput.value = food.unitWeight;
    } else {
        if (input) {
            input.value = 100;
            input.step = '10';
            input.min = '10';
        }
        if (unitLabel) unitLabel.textContent = 'g';
        if (gramsInput) gramsInput.value = 100;
    }
    
    // Configurer les boutons +/-
    const minusBtn = document.getElementById('qty-minus-btn');
    const plusBtn = document.getElementById('qty-plus-btn');
    if (minusBtn) {
        minusBtn.textContent = isUnitFood ? '-1' : '-10';
        minusBtn.onclick = () => adjustQuantityUnit(isUnitFood ? -1 : -10);
    }
    if (plusBtn) {
        plusBtn.textContent = isUnitFood ? '+1' : '+10';
        plusBtn.onclick = () => adjustQuantityUnit(isUnitFood ? 1 : 10);
    }
    
    // Mettre à jour le total
    updateQuantityTotal();
    
    // Reset le texte du bouton
    const confirmBtn = document.getElementById('quantity-confirm-btn');
    if (confirmBtn) confirmBtn.textContent = 'Ajouter au repas';
    
    // Bloquer le scroll de la page
    document.body.style.overflow = 'hidden';
    document.body.classList.add('modal-open');
    
    sheet.style.display = 'flex';
    setTimeout(() => sheet.classList.add('active'), 10);
}

// Rendre les entrées par repas
function renderMealsByType() {
    const date = document.getElementById('journal-date')?.value || new Date().toISOString().split('T')[0];
    const entries = state.foodJournal?.[date] || [];
    
    // Grouper par type de repas
    const mealGroups = {
        breakfast: [],
        lunch: [],
        snack: [],
        dinner: []
    };
    
    entries.forEach(entry => {
        const mealType = entry.mealType || inferMealType(entry.addedAt);
        if (mealGroups[mealType]) {
            mealGroups[mealType].push(entry);
        }
    });
    
    // Rendre chaque groupe
    Object.keys(mealGroups).forEach(mealType => {
        renderMealItems(mealType, mealGroups[mealType]);
        updateMealCalories(mealType, mealGroups[mealType]);
    });
    
    // Mettre à jour la suggestion
    updateNutritionSuggestion();
}

// Rendre les items d'un repas
function renderMealItems(mealType, entries) {
    const container = document.getElementById(`meal-items-${mealType}`);
    if (!container) return;
    
    if (entries.length === 0) {
        container.innerHTML = '<div class="meal-empty">Aucun aliment ajouté</div>';
        return;
    }
    
    container.innerHTML = entries.map((entry, idx) => {
        const food = state.foods.find(f => f.id === entry.foodId);
        if (!food) return '';
        
        const cals = Math.round((food.calories * entry.quantity) / 100);
        const qtyDisplay = formatQuantityDisplay(food, entry.quantity);
        
        return `
            <div class="meal-item" data-entry-idx="${idx}">
                <div class="meal-item-info">
                    <div class="meal-item-name">${food.name}</div>
                    <div class="meal-item-details">${qtyDisplay} · ${cals} kcal</div>
                </div>
                <div class="meal-item-actions">
                    <button class="meal-item-edit" onclick="editMealItemQuantity('${mealType}', ${idx})">✏️</button>
                    <button class="meal-item-delete" onclick="removeMealItem('${mealType}', ${idx})">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
    
    // Ouvrir la section si elle a des items
    const section = document.querySelector(`.meal-section[data-meal="${mealType}"]`);
    if (section && entries.length > 0) {
        mealSectionStates[mealType] = true;
        section.classList.add('expanded');
    }
}

// Mettre à jour les calories d'un repas
function updateMealCalories(mealType, entries) {
    const caloriesEl = document.getElementById(`meal-cals-${mealType}`);
    if (!caloriesEl) return;
    
    let totalCals = 0;
    entries.forEach(entry => {
        const food = state.foods.find(f => f.id === entry.foodId);
        if (food) {
            totalCals += Math.round((food.calories * entry.quantity) / 100);
        }
    });
    
    caloriesEl.textContent = totalCals > 0 ? `${totalCals} kcal` : '0 kcal';
    caloriesEl.classList.toggle('has-items', totalCals > 0);
}

// Mettre à jour la quantité d'un item de repas
function updateMealItemQuantity(mealType, idx, newQuantity) {
    const date = document.getElementById('journal-date')?.value || new Date().toISOString().split('T')[0];
    const entries = state.foodJournal?.[date] || [];
    
    // Trouver l'entrée correspondante
    const mealEntries = entries.filter(e => (e.mealType || inferMealType(e.addedAt)) === mealType);
    const entry = mealEntries[idx];
    
    if (!entry) return;
    
    const quantity = Math.max(MIN_QUANTITY, Math.min(MAX_QUANTITY, parseInt(newQuantity) || 100));
    entry.quantity = quantity;
    
    // Sync Supabase si connecté
    if (entry.supabaseId && typeof updateJournalEntryInSupabase === 'function') {
        updateJournalEntryInSupabase(entry.supabaseId, quantity);
    }
    
    saveState();
    renderMealsByType();
    updateJournalSummary();
    updateMacroRings();
}

// Éditer la quantité d'un item de repas
function editMealItemQuantity(mealType, idx) {
    const date = document.getElementById('journal-date')?.value || new Date().toISOString().split('T')[0];
    const entries = state.foodJournal?.[date] || [];
    
    const mealEntries = entries.filter(e => (e.mealType || inferMealType(e.addedAt)) === mealType);
    const entry = mealEntries[idx];
    
    if (!entry) return;
    
    const food = state.foods.find(f => f.id === entry.foodId);
    if (!food) return;
    
    // Stocker l'info pour l'édition
    window.editingMealItem = {
        mealType: mealType,
        idx: idx,
        entry: entry,
        food: food
    };
    
    // Ouvrir le bottom sheet de quantité en mode édition
    openFoodQuantitySheetForEdit(food, entry.quantity, mealType);
}

// Supprimer un item de repas
function removeMealItem(mealType, idx) {
    const date = document.getElementById('journal-date')?.value || new Date().toISOString().split('T')[0];
    
    if (!state.foodJournal?.[date]) return;
    
    // Trouver et supprimer l'entrée
    const entries = state.foodJournal[date];
    const mealEntries = entries.filter(e => (e.mealType || inferMealType(e.addedAt)) === mealType);
    const entryToRemove = mealEntries[idx];
    
    if (!entryToRemove) return;
    
    // Supprimer de Supabase si synchronisé
    if (entryToRemove.supabaseId && typeof deleteJournalEntryFromSupabase === 'function') {
        deleteJournalEntryFromSupabase(entryToRemove.supabaseId);
    }
    
    // Trouver l'index réel dans le tableau
    const realIdx = entries.indexOf(entryToRemove);
    if (realIdx > -1) {
        entries.splice(realIdx, 1);
    }
    
    saveState();
    renderMealsByType();
    updateJournalSummary();
    updateMacroRings();
    showToast('Aliment supprimé', 'success');
}

// Rendre les suggestions pour un repas (max 3, scoring intelligent)
function renderMealSuggestions(mealType, excludeIds = []) {
    const container = document.getElementById('meal-suggestions-list');
    if (!container) return;
    
    // Utiliser le nouveau module de suggestions intelligentes
    let suggestions = [];
    
    if (window.NutritionSuggestions) {
        suggestions = NutritionSuggestions.generate(mealType, excludeIds);
    } else {
        // Fallback si le module n'est pas chargé
        const popularFoods = state.foods
            .filter(f => f.priority >= 8 && f.mealTags?.includes(mealType))
            .filter(f => !excludeIds.includes(f.id))
            .slice(0, 3);
        suggestions = popularFoods.map(f => ({
            food: f,
            reason: 'Populaire',
            quantity: f.unitWeight || 100
        }));
    }
    
    if (suggestions.length === 0) {
        container.innerHTML = '<div class="meal-empty">Plus de suggestions disponibles</div>';
        updateRefreshButtonVisibility();
        return;
    }
    
    // Ajouter les IDs des suggestions affichées
    suggestions.forEach(s => {
        if (!shownSuggestionIds.includes(s.food.id)) {
            shownSuggestionIds.push(s.food.id);
        }
    });
    
    // Icône contextuelle selon le type de suggestion
    const typeIcons = {
        habit: '🔄',
        objective: '🎯',
        post_workout: '💪',
        post_cardio: '🏃',
        rest_day: '🧘',
        quick: '⚡',
        balanced: '⚖️',
        time_based: '🕐'
    };
    
    container.innerHTML = suggestions.map(s => {
        // Utiliser l'icône SVG si disponible, sinon emoji
        let iconHtml = typeIcons[s.type] || foodCategories[s.food.category]?.icon || '📦';
        if (window.MuscleIcons && s.food.category) {
            const svgIcon = window.MuscleIcons.getFoodCategoryIcon(s.food.category);
            if (svgIcon) {
                iconHtml = `<img src="${svgIcon}" alt="${s.food.category}" style="width: 32px; height: 32px;">`;
            }
        }
        
        const qtyDisplay = hasNaturalUnit(s.food) 
            ? formatQuantityDisplay(s.food, s.quantity)
            : `${s.quantity}g`;
        const cals = Math.round((s.food.calories * s.quantity) / 100);
        const protein = Math.round((s.food.protein * s.quantity) / 100);
        
        return `
            <div class="meal-suggestion-item premium" onclick="addSuggestionDirect('${s.food.id}', ${s.quantity}, '${mealType}')">
                <div class="suggestion-icon">${iconHtml}</div>
                <div class="suggestion-content">
                    <div class="suggestion-title">${s.food.name}</div>
                    <div class="suggestion-reason">${s.reason}</div>
                    <div class="suggestion-macros">${qtyDisplay} · ${cals} kcal · ${protein}g prot</div>
                </div>
                <button class="suggestion-add-btn" title="Ajouter">+</button>
            </div>
        `;
    }).join('');
    
    // Mettre à jour la visibilité du bouton refresh
    updateRefreshButtonVisibility();
}

// Rafraîchir les suggestions (max 2 fois)
function refreshSuggestions(mealType) {
    if (suggestionRefreshCount >= MAX_SUGGESTION_REFRESHES) {
        showToast('Plus de suggestions disponibles', 'info');
        return;
    }
    
    suggestionRefreshCount++;
    
    // Recharger avec exclusion des suggestions déjà montrées
    renderMealSuggestions(mealType, shownSuggestionIds);
}

// Mettre à jour la visibilité du bouton refresh
function updateRefreshButtonVisibility() {
    const btn = document.getElementById('suggestions-refresh-btn');
    if (!btn) return;
    
    if (suggestionRefreshCount >= MAX_SUGGESTION_REFRESHES) {
        btn.style.display = 'none';
    } else {
        btn.style.display = 'block';
        btn.textContent = suggestionRefreshCount === 0 
            ? 'Autres suggestions' 
            : `Autres suggestions (${MAX_SUGGESTION_REFRESHES - suggestionRefreshCount} restant)`;
    }
}

// Réinitialiser le compteur de refresh quand on ouvre un nouveau repas
function resetSuggestionRefresh() {
    suggestionRefreshCount = 0;
    shownSuggestionIds = [];
    updateRefreshButtonVisibility();
}

// Ajouter une suggestion directement (1 tap)
async function addSuggestionDirect(foodId, quantity, mealType) {
    const food = state.foods.find(f => f.id === foodId);
    if (!food) return;
    
    await addToJournalWithMealType(foodId, quantity, mealType);
    
    const qtyDisplay = formatQuantityDisplay(food, quantity);
    showToast(`${qtyDisplay} de ${food.name} ajouté`, 'success');
    
    // Animation feedback
    closeMealSheet();
    renderMealsByType();
    updateJournalSummary();
    updateMacroRings();
    
    // Check goal
    checkGoalReached();
}

// Rendre les repas rapides
function renderQuickMeals(mealType) {
    // Utiliser le nouveau système de templates
    if (window.MealTemplates) {
        MealTemplates.render(mealType);
    } else {
        // Fallback simple si module pas chargé
        const container = document.getElementById('meal-quick-list');
        if (container) {
            container.innerHTML = '<div class="meal-empty">Templates non disponibles</div>';
        }
    }
}

// Ajouter un repas rapide
async function addQuickMeal(mealType, mealIdx) {
    const quickMeals = {
        breakfast: [
            { foods: ['eggs'], qty: [150] },
            { foods: ['oatmeal', 'whole-milk'], qty: [50, 200] }
        ],
        lunch: [
            { foods: ['chicken-breast', 'rice-white'], qty: [150, 150] },
            { foods: ['tuna-canned', 'mixed-salad'], qty: [100, 150] }
        ],
        snack: [
            { foods: ['apple', 'almonds'], qty: [150, 30] },
            { foods: ['greek-yogurt'], qty: [150] }
        ],
        dinner: [
            { foods: ['salmon-fillet', 'broccoli'], qty: [150, 200] },
            { foods: ['beef-steak', 'potato'], qty: [150, 200] }
        ]
    };
    
    const meal = quickMeals[mealType]?.[mealIdx];
    if (!meal) return;
    
    closeMealSheet();
    
    const date = document.getElementById('journal-date')?.value || new Date().toISOString().split('T')[0];
    
    if (!state.foodJournal) state.foodJournal = {};
    if (!state.foodJournal[date]) state.foodJournal[date] = [];
    
    for (let i = 0; i < meal.foods.length; i++) {
        const foodId = meal.foods[i];
        const qty = Array.isArray(meal.qty) ? meal.qty[i] : meal.qty;
        const food = state.foods.find(f => f.id === foodId);
        
        if (food) {
            const entry = {
                foodId: food.id,
                quantity: qty,
                addedAt: Date.now(),
                mealType: mealType
            };
            
            // Sync Supabase si connecté (avec mealType)
            if (typeof isLoggedIn === 'function' && isLoggedIn()) {
                const supabaseId = await addJournalEntryToSupabase(date, food.id, qty, mealType);
                if (supabaseId) entry.supabaseId = supabaseId;
            }
            
            state.foodJournal[date].push(entry);
        }
    }
    
    saveState();
    renderMealsByType();
    updateJournalSummary();
    updateMacroRings();
    showToast('Repas ajouté !', 'success');
}

// Mettre à jour la suggestion de nutrition (utilise le module intelligent)
function updateNutritionSuggestion() {
    const container = document.getElementById('nutrition-suggestion');
    const textEl = document.getElementById('suggestion-text');
    const iconEl = document.getElementById('suggestion-icon');
    
    if (!container || !textEl) return;
    
    // Utiliser le nouveau module si disponible
    let message = null;
    
    if (window.NutritionSuggestions) {
        message = NutritionSuggestions.getDailyMessage();
    }
    
    if (!message) {
        // Fallback simple
        const consumed = typeof calculateConsumedMacros === 'function' 
            ? calculateConsumedMacros() 
            : { calories: 0, protein: 0 };
        const targets = {
            calories: state.profile?.targetCalories || 2000,
            protein: state.profile?.macros?.protein || 150
        };
        
        const remaining = Math.max(0, targets.calories - consumed.calories);
        if (remaining > 0) {
            message = {
                text: `Il te reste ~${remaining} kcal pour aujourd'hui`,
                type: 'info',
                icon: '📊'
            };
        }
    }
    
    if (message) {
        textEl.textContent = message.text;
        if (iconEl) iconEl.textContent = message.icon || '💡';
        
        // Style selon le type
        container.className = 'nutrition-suggestion';
        if (message.type) container.classList.add(`suggestion-${message.type}`);
        
        container.style.display = 'flex';
    } else {
        container.style.display = 'none';
    }
}

// ==================== GESTION DU CARDIO ====================

// État du cardio sheet
let cardioState = {
    type: 'running',
    duration: 30,
    intensity: 'moderate'
};

// Ouvrir le bottom sheet cardio
// Flag pour éviter les ouvertures/fermetures en double
let cardioSheetClosing = false;
let lastCardioSheetCloseTime = 0; // Timestamp de la dernière fermeture

function openCardioSheet() {
    const sheet = document.getElementById('cardio-add-sheet');
    if (!sheet) return;
    
    // Ne pas ouvrir si en train de fermer
    if (cardioSheetClosing) return;
    
    // Ne pas ouvrir si déjà ouvert
    if (sheet.style.display === 'flex') return;
    
    // DEBOUNCE : Ne pas ouvrir si on vient de fermer (< 500ms)
    const timeSinceLastClose = Date.now() - lastCardioSheetCloseTime;
    if (timeSinceLastClose < 500) {
        return;
    }
    
    // CRITIQUE : Bloquer le scroll de la page derrière la modal
    document.body.style.overflow = 'hidden';
    document.body.classList.add('modal-open');
    
    // Reset état
    cardioState = { type: 'running', duration: 30, intensity: 'moderate' };
    
    // Mettre à jour l'UI
    updateCardioSheetUI();
    updateCardioEstimate();
    
    // Afficher le poids de l'utilisateur
    const weightEl = document.getElementById('cardio-user-weight');
    if (weightEl) {
        weightEl.textContent = state.profile?.weight || 70;
    }
    
    // Reset des styles transform/transition pour éviter les bugs de réouverture
    const innerSheet = sheet.querySelector('.bottom-sheet');
    if (innerSheet) {
        innerSheet.style.transform = '';
        innerSheet.style.transition = '';
    }
    
    sheet.style.display = 'flex';
    setTimeout(() => sheet.classList.add('active'), 10);
}

// Fermer le bottom sheet cardio
function closeCardioSheet() {
    const sheet = document.getElementById('cardio-add-sheet');
    if (!sheet) return;
    
    // Ne pas fermer si déjà en train de fermer ou déjà fermé
    if (cardioSheetClosing || sheet.style.display === 'none') return;
    
    cardioSheetClosing = true;
    sheet.classList.remove('active');
    
    // CRITIQUE : Réactiver le scroll de la page
    document.body.style.overflow = '';
    document.body.classList.remove('modal-open');
    
    // Reset propre des styles transform/transition
    const innerSheet = sheet.querySelector('.bottom-sheet');
    if (innerSheet) {
        innerSheet.style.transform = '';
        innerSheet.style.transition = '';
    }
    
    // Enregistrer le timestamp de fermeture pour le debounce
    lastCardioSheetCloseTime = Date.now();
    
    setTimeout(() => {
        sheet.style.display = 'none';
        cardioSheetClosing = false;
    }, 300);
}

// Sélectionner le type de cardio
function selectCardioType(type) {
    cardioState.type = type;
    updateCardioSheetUI();
    updateCardioEstimate();
}

// Sélectionner la durée
function selectCardioDuration(duration) {
    cardioState.duration = duration;
    updateCardioSheetUI();
    updateCardioEstimate();
}

// Sélectionner l'intensité
function selectCardioIntensity(intensity) {
    cardioState.intensity = intensity;
    updateCardioSheetUI();
    updateCardioEstimate();
}

// Mettre à jour l'UI du sheet cardio
function updateCardioSheetUI() {
    // Type
    document.querySelectorAll('.cardio-type-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.type === cardioState.type);
    });
    
    // Durée
    document.querySelectorAll('.cardio-duration-btn').forEach(btn => {
        const dur = parseInt(btn.textContent);
        btn.classList.toggle('selected', dur === cardioState.duration);
    });
    
    // Intensité
    document.querySelectorAll('.cardio-intensity-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.intensity === cardioState.intensity);
    });
}

// Mettre à jour l'estimation de calories
function updateCardioEstimate() {
    const estimateEl = document.getElementById('cardio-estimate-calories');
    if (!estimateEl) return;
    
    const weight = state.profile?.weight || 70;
    const calories = calculateCardioCalories(cardioState.type, cardioState.duration, cardioState.intensity, weight);
    
    estimateEl.textContent = `~${calories} kcal`;
}

// Ajouter une session cardio
async function addCardioSession() {
    const date = document.getElementById('journal-date')?.value || new Date().toISOString().split('T')[0];
    
    const duration = cardioState.duration;
    const weight = state.profile?.weight || 70;
    const calories = calculateCardioCalories(cardioState.type, duration, cardioState.intensity, weight);
    
    const session = {
        type: cardioState.type,
        duration: duration,
        intensity: cardioState.intensity,
        calories: calories,
        addedAt: Date.now()
    };
    
    // Sauvegarder
    if (!state.cardioLog) state.cardioLog = {};
    if (!state.cardioLog[date]) state.cardioLog[date] = [];
    
    state.cardioLog[date].push(session);
    
    // Sync Supabase si disponible
    if (typeof saveCardioSessionToSupabase === 'function' && typeof isLoggedIn === 'function' && isLoggedIn()) {
        const supabaseId = await saveCardioSessionToSupabase(date, session);
        if (supabaseId) session.supabaseId = supabaseId;
    }
    
    saveState();
    closeCardioSheet();
    renderCardioItems();
    updateCardioTotal();
    
    showToast(`${CARDIO_TYPES[cardioState.type]?.label || 'Activité'} ajouté !`, 'success');
}

// Rendre les items cardio
function renderCardioItems() {
    const container = document.getElementById('cardio-items');
    if (!container) return;
    
    const date = document.getElementById('journal-date')?.value || new Date().toISOString().split('T')[0];
    const sessions = state.cardioLog?.[date] || [];
    
    if (sessions.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = sessions.map((session, idx) => {
        const typeInfo = CARDIO_TYPES[session.type] || CARDIO_TYPES.other;
        const intensityLabel = CARDIO_INTENSITIES[session.intensity]?.label || 'Modérée';
        
        return `
            <div class="cardio-item">
                <div class="cardio-item-info">
                    <span class="cardio-item-icon">${typeInfo.icon}</span>
                    <div class="cardio-item-details">
                        <span class="cardio-item-type">${typeInfo.label} ${session.duration}min</span>
                        <span class="cardio-item-meta">${intensityLabel}</span>
                    </div>
                </div>
                <span class="cardio-item-calories">-${session.calories} kcal</span>
                <button class="cardio-item-delete" onclick="removeCardioSession(${idx})">🗑️</button>
            </div>
        `;
    }).join('');
}

// Mettre à jour le total cardio
function updateCardioTotal() {
    const totalEl = document.getElementById('cardio-total-calories');
    if (!totalEl) return;
    
    const date = document.getElementById('journal-date')?.value || new Date().toISOString().split('T')[0];
    const sessions = state.cardioLog?.[date] || [];
    
    const total = sessions.reduce((sum, s) => sum + (s.calories || 0), 0);
    
    totalEl.textContent = total > 0 ? `-${total} kcal` : '0 kcal';
    totalEl.classList.toggle('has-sessions', total > 0);
}

// Supprimer une session cardio
function removeCardioSession(idx) {
    const date = document.getElementById('journal-date')?.value || new Date().toISOString().split('T')[0];
    
    if (!state.cardioLog?.[date]) return;
    
    const session = state.cardioLog[date][idx];
    
    // Sync Supabase si disponible
    if (session?.supabaseId && typeof deleteCardioSessionFromSupabase === 'function') {
        deleteCardioSessionFromSupabase(session.supabaseId);
    }
    
    state.cardioLog[date].splice(idx, 1);
    
    saveState();
    renderCardioItems();
    updateCardioTotal();
    showToast('Activité supprimée', 'success');
}

// Obtenir les calories cardio du jour
function getTodayCardioCalories() {
    const date = new Date().toISOString().split('T')[0];
    const sessions = state.cardioLog?.[date] || [];
    return sessions.reduce((sum, s) => sum + (s.calories || 0), 0);
}

// ==================== INIT & LOAD ====================

// Modifier loadJournalDay pour utiliser la nouvelle UI
const originalLoadJournalDay = typeof loadJournalDay === 'function' ? loadJournalDay : null;

function loadJournalDay() {
    // Appeler l'original si disponible pour la compatibilité
    if (originalLoadJournalDay) {
        // Pas d'appel car on remplace la logique
    }
    
    // Rendre par repas
    renderMealsByType();
    
    // Rendre le cardio
    renderCardioItems();
    updateCardioTotal();
    
    // Mettre à jour les macros
    updateJournalSummary();
    updateMacroRings();
    
    // Afficher la section "Mes Aliments"
    renderFoodsList();
}

// Override confirmAddFood pour supporter le mealType
const originalConfirmAddFood = typeof confirmAddFood === 'function' ? confirmAddFood : null;

// NOTE: Cette fonction est définie plus haut dans le fichier (ligne ~615)
// avec gestion complète des unités naturelles et mode édition

// Ajouter au journal avec mealType (supporte les unités naturelles)
async function addToJournalWithMealType(foodId, quantity, mealType) {
    const date = document.getElementById('journal-date')?.value || new Date().toISOString().split('T')[0];
    const food = state.foods.find(f => f.id === foodId);
    
    if (!food) return;
    
    if (!state.foodJournal) state.foodJournal = {};
    if (!state.foodJournal[date]) state.foodJournal[date] = [];
    
    // Calculer les informations d'unités
    const unitType = food.unit || 'g';
    const unitCount = hasNaturalUnit(food) ? gramsToUnits(food, quantity) : null;
    
    const entry = {
        foodId: food.id,
        quantity: quantity, // Toujours en grammes
        addedAt: Date.now(),
        mealType: mealType,
        // Nouvelles infos d'unités
        unitType: unitType,
        unitCount: unitCount
    };
    
    // Sync Supabase si connecté (avec infos d'unités et mealType)
    if (typeof isLoggedIn === 'function' && isLoggedIn()) {
        const supabaseId = await addJournalEntryToSupabase(date, food.id, quantity, mealType, unitType, unitCount);
        if (supabaseId) entry.supabaseId = supabaseId;
    }
    
    state.foodJournal[date].push(entry);
    saveState();
    
    // Mettre à jour le badge de sync
    if (typeof window.updatePendingSyncBadge === 'function') {
        window.updatePendingSyncBadge();
    }
    
    // Refresh UI
    renderMealsByType();
    updateJournalSummary();
    updateMacroRings();
    
    // Animation sur le dernier item ajouté
    setTimeout(() => {
        const items = document.querySelectorAll(`#meal-items-${mealType} .meal-item`);
        const lastItem = items[items.length - 1];
        if (lastItem) {
            lastItem.classList.add('just-added');
            setTimeout(() => lastItem.classList.remove('just-added'), 600);
        }
    }, 50);
    
    // Vérifier si objectif atteint
    checkGoalReached();
    
    showToast(`${food.name} ajouté !`, 'success');
}

// ==================== FEEDBACK VISUEL & CÉLÉBRATION ====================

// Vérifier si les objectifs sont atteints et célébrer
function checkGoalReached() {
    if (!state.profile) return;
    
    const consumed = calculateConsumedMacros();
    const targets = {
        calories: state.profile.targetCalories || 2000,
        protein: state.profile.macros?.protein || 150
    };
    
    // Calculer les pourcentages
    const caloriePercent = (consumed.calories / targets.calories) * 100;
    const proteinPercent = (consumed.protein / targets.protein) * 100;
    
    // Célébrer si protéines atteintes (90-110%)
    if (proteinPercent >= 90 && proteinPercent <= 110) {
        const key = `protein_goal_${new Date().toISOString().split('T')[0]}`;
        if (!sessionStorage.getItem(key)) {
            sessionStorage.setItem(key, 'true');
            showGoalCelebration('🎯 Objectif protéines atteint !');
        }
    }
    
    // Célébrer si calories atteintes (90-110%)
    if (caloriePercent >= 90 && caloriePercent <= 110) {
        const key = `calories_goal_${new Date().toISOString().split('T')[0]}`;
        if (!sessionStorage.getItem(key)) {
            sessionStorage.setItem(key, 'true');
            showGoalCelebration('🎉 Objectif calories atteint !');
        }
    }
}

// Afficher une célébration
function showGoalCelebration(message) {
    // Ne pas montrer si on a déjà célébré récemment
    if (document.querySelector('.goal-celebration')) return;
    
    const celebration = document.createElement('div');
    celebration.className = 'goal-celebration';
    celebration.textContent = message;
    document.body.appendChild(celebration);
    
    // Vibration si supportée
    if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
    }
    
    // Retirer après 3 secondes
    setTimeout(() => {
        celebration.style.opacity = '0';
        celebration.style.transform = 'translateX(-50%) translateY(20px)';
        setTimeout(() => celebration.remove(), 300);
    }, 3000);
}

// Initialiser le swipe-to-delete sur les items de repas
function initMealSwipeToDelete() {
    const mealItems = document.querySelectorAll('.meal-item');
    
    mealItems.forEach(item => {
        let startX = 0;
        let currentX = 0;
        let isDragging = false;
        
        item.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            isDragging = true;
            item.classList.remove('swiped');
        }, { passive: true });
        
        item.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            
            currentX = e.touches[0].clientX;
            const diff = startX - currentX;
            
            if (diff > 20) {
                item.classList.add('swiping');
                item.style.transform = `translateX(-${Math.min(diff, 80)}px)`;
            }
        }, { passive: true });
        
        item.addEventListener('touchend', () => {
            isDragging = false;
            item.classList.remove('swiping');
            
            const diff = startX - currentX;
            
            if (diff > 60) {
                // Swipe suffisant - demander confirmation
                item.classList.add('swiped');
                
                // Auto-reset après 3 secondes si pas de confirmation
                setTimeout(() => {
                    if (item.classList.contains('swiped')) {
                        item.classList.remove('swiped');
                        item.style.transform = '';
                    }
                }, 3000);
            } else {
                item.style.transform = '';
            }
        });
    });
}

// Appliquer une suggestion rapide
function applySuggestion() {
    // Ouvrir le sheet du repas actuel selon l'heure
    const hour = new Date().getHours();
    let mealType = 'lunch';
    
    if (hour >= 5 && hour < 10) mealType = 'breakfast';
    else if (hour >= 11 && hour < 14) mealType = 'lunch';
    else if (hour >= 15 && hour < 17) mealType = 'snack';
    else if (hour >= 18) mealType = 'dinner';
    
    openMealSheet(mealType);
}

// ==================== SWIPE-DOWN TO CLOSE BOTTOM SHEETS ====================

// Flag pour éviter les event listeners en double
let nutritionSwipeInitialized = false;

function initNutritionSwipeToClose() {
    // Éviter d'ajouter les listeners plusieurs fois
    if (nutritionSwipeInitialized) return;
    nutritionSwipeInitialized = true;
    
    const sheets = [
        { id: 'food-quantity-sheet', closeFunc: closeFoodQuantitySheet },
        { id: 'meal-add-sheet', closeFunc: closeMealSheet },
        { id: 'cardio-add-sheet', closeFunc: closeCardioSheet }
    ];
    
    sheets.forEach(({ id, closeFunc }) => {
        const overlay = document.getElementById(id);
        if (!overlay) return;
        
        const sheet = overlay.querySelector('.bottom-sheet');
        if (!sheet) return;
        
        // Détecter l'élément scrollable (différent selon la modal)
        const scrollableContent = sheet.querySelector('.meal-scrollable-content') || 
                                  sheet.querySelector('.bottom-sheet-content');
        const header = sheet.querySelector('.bottom-sheet-header');
        const stickyHeader = sheet.querySelector('.meal-sticky-header');
        
        // Fermer si on clique sur l'overlay (pas sur le sheet)
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay && closeFunc) {
                closeFunc();
            }
        });
        
        // Empêcher la propagation des clics dans le bottom sheet
        sheet.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        // Swipe-to-close - variables locales pour chaque sheet
        let startY = 0;
        let currentY = 0;
        let canDrag = false;
        
        // Header principal : toujours autoriser le swipe-to-close
        if (header) {
            header.addEventListener('touchstart', (e) => {
                startY = e.touches[0].clientY;
                currentY = startY;
                canDrag = true;
            }, { passive: true });
        }
        
        // Header sticky : toujours autoriser le swipe-to-close
        if (stickyHeader) {
            stickyHeader.addEventListener('touchstart', (e) => {
                startY = e.touches[0].clientY;
                currentY = startY;
                canDrag = true;
            }, { passive: true });
        }
        
        // Contenu scrollable : autoriser UNIQUEMENT si on est en haut (scrollTop <= 5px)
        if (scrollableContent) {
            scrollableContent.addEventListener('touchstart', (e) => {
                startY = e.touches[0].clientY;
                currentY = startY;
                // CRITIQUE : Ne permettre le drag que si on est en haut du scroll
                canDrag = scrollableContent.scrollTop <= 5;
            }, { passive: true });
        }
        
        sheet.addEventListener('touchmove', (e) => {
            // CRITIQUE : Ne pas interférer avec le scroll si canDrag est false
            if (!canDrag) return;
            
            currentY = e.touches[0].clientY;
            const diff = currentY - startY;
            
            // Ne déplacer que si on swipe vers le bas
            if (diff > 10) {
                sheet.style.transform = `translateY(${diff}px)`;
                sheet.style.transition = 'none';
                sheet.classList.add('dragging');
                // CRITIQUE : Empêcher le scroll de la page pendant le drag
                e.preventDefault();
            }
        }, { passive: false }); // IMPORTANT : passive:false pour permettre preventDefault
        
        sheet.addEventListener('touchend', () => {
            const diff = currentY - startY;
            
            sheet.style.transition = 'transform 0.3s ease';
            sheet.classList.remove('dragging');
            
            // Si on a swipé plus de 100px vers le bas, on ferme
            if (canDrag && diff > 100) {
                sheet.style.transform = 'translateY(100%)';
                setTimeout(() => {
                    if (closeFunc) closeFunc();
                    sheet.style.transform = '';
                    sheet.style.transition = '';
                }, 300);
            } else {
                // Sinon on revient en position
                sheet.style.transform = '';
            }
            
            // Reset des variables
            startY = 0;
            currentY = 0;
            canDrag = false;
        }, { passive: true });
    });
}

// ==================== GRAPHIQUE CALORIES ====================

let caloriesChart = null;
let currentCaloriesPeriod = 7; // jours par défaut

function renderCaloriesChart(days = 7) {
    currentCaloriesPeriod = days;
    
    const ctx = document.getElementById('calories-chart');
    if (!ctx) return;
    
    // Détruire le graphique existant
    if (caloriesChart) {
        caloriesChart.destroy();
        caloriesChart = null;
    }
    
    // Mettre à jour les boutons actifs
    document.querySelectorAll('#calories-chart-card .filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (parseInt(btn.dataset.days) === days) {
            btn.classList.add('active');
        }
    });
    
    // Calculer les calories par jour
    const dailyCalories = [];
    const labels = [];
    const target = state.profile?.targetCalories || 2000;
    
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const entries = state.foodJournal?.[dateStr] || [];
        let totalCals = 0;
        
        entries.forEach(entry => {
            const food = state.foods?.find(f => f.id === entry.foodId);
            if (food) {
                // Calculer les calories selon l'unité
                if (entry.unit && entry.unit !== 'g') {
                    const unitData = food.units?.find(u => u.unit === entry.unit);
                    if (unitData) {
                        totalCals += (food.calories * unitData.grams / 100) * entry.quantity;
                    } else {
                        totalCals += (food.calories * entry.quantity / 100);
                    }
                } else {
                    totalCals += (food.calories * entry.quantity / 100);
                }
            }
        });
        
        // Ajouter les calories du cardio (en négatif)
        const cardioEntries = state.cardioLog?.[dateStr] || [];
        const cardioCals = cardioEntries.reduce((sum, c) => sum + (c.calories || 0), 0);
        totalCals -= cardioCals;
        
        dailyCalories.push(Math.round(totalCals));
        
        // Format de la date
        if (days <= 7) {
            labels.push(date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }));
        } else {
            labels.push(date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }));
        }
    }
    
    // Vérifier s'il y a des données
    const hasData = dailyCalories.some(c => c > 0);
    if (!hasData) {
        const canvas = ctx;
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = '#606070';
        context.font = '14px Outfit';
        context.textAlign = 'center';
        context.fillText('Aucune donnée pour cette période', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    caloriesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Calories',
                data: dailyCalories,
                backgroundColor: dailyCalories.map(c => {
                    if (c > target * 1.1) return 'rgba(255, 100, 100, 0.7)';
                    if (c < target * 0.9) return 'rgba(100, 170, 255, 0.7)';
                    return 'rgba(0, 255, 136, 0.7)';
                }),
                borderRadius: 8,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#16161f',
                    titleColor: '#ffffff',
                    bodyColor: '#a0a0b0',
                    borderColor: '#2a2a3a',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed.y;
                            const diff = value - target;
                            const sign = diff > 0 ? '+' : '';
                            return [
                                `${value} kcal`,
                                `Objectif: ${target} kcal`,
                                `${sign}${diff} kcal`
                            ];
                        }
                    }
                },
                annotation: {
                    annotations: {
                        targetLine: {
                            type: 'line',
                            yMin: target,
                            yMax: target,
                            borderColor: '#ffffff',
                            borderWidth: 2,
                            borderDash: [5, 5],
                            label: {
                                display: true,
                                content: 'Objectif',
                                position: 'end',
                                backgroundColor: 'rgba(22, 22, 31, 0.8)',
                                color: '#ffffff',
                                font: {
                                    family: 'Outfit',
                                    size: 11
                                }
                            }
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#606070',
                        font: { family: 'Outfit' }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        color: '#a0a0b0',
                        font: { family: 'Space Mono' },
                        callback: function(value) {
                            return value + ' kcal';
                        }
                    }
                }
            }
        }
    });
}

// ==================== GESTION DYNAMIQUE DU PADDING CLAVIER ====================

let keyboardPaddingInitialized = false;

function initKeyboardPaddingFix() {
    if (keyboardPaddingInitialized) return;
    keyboardPaddingInitialized = true;
    
    const scrollableContent = document.querySelector('.meal-scrollable-content');
    if (!scrollableContent) return;
    
    // Détection du clavier via visualViewport (API moderne)
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', () => {
            const keyboardHeight = window.innerHeight - window.visualViewport.height;
            
            // Si le clavier est ouvert (hauteur > 150px typiquement)
            if (keyboardHeight > 150) {
                scrollableContent.style.paddingBottom = `${keyboardHeight + 120}px`;
            } else {
                scrollableContent.style.paddingBottom = '80px';
            }
        });
    }
    
    // Fallback : détecter focus sur les inputs
    const inputs = document.querySelectorAll('#meal-add-sheet input, #meal-add-sheet select');
    inputs.forEach(input => {
        input.addEventListener('focus', () => {
            // Sur mobile, le clavier prend ~300-350px
            if (window.innerWidth <= 768) {
                scrollableContent.style.paddingBottom = '400px';
                // Scroll vers l'input après un court délai
                setTimeout(() => {
                    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
            }
        });
        
        input.addEventListener('blur', () => {
            // Remettre le padding normal après fermeture du clavier
            setTimeout(() => {
                if (!document.querySelector('#meal-add-sheet input:focus, #meal-add-sheet select:focus')) {
                    scrollableContent.style.paddingBottom = '80px';
                }
            }, 300);
        });
    });
}

// Réinitialiser le flag quand la modal se ferme
function resetKeyboardPaddingFix() {
    keyboardPaddingInitialized = false;
    const scrollableContent = document.querySelector('.meal-scrollable-content');
    if (scrollableContent) {
        scrollableContent.style.paddingBottom = '80px';
    }
}

// Initialiser au chargement du DOM
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        initNutritionSwipeToClose();
    });
}
