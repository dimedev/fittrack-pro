// ==================== NUTRITION MODULE ====================

// Variables temporaires pour les modales
let selectedFoodForAdd = null;
let selectedMealForAdd = null;
let swapTarget = null;
let removeTarget = null; // Pour la suppression avec options
let selectedFoodsForMenu = new Set(); // Aliments sélectionnés pour générer le menu

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

// Afficher la liste des aliments avec checkboxes et badges (accordéon par catégorie)
function renderFoodsList() {
    const container = document.getElementById('foods-list');
    const searchTerm = document.getElementById('food-search')?.value?.toLowerCase() || '';
    
    // Initialiser la sélection par défaut si première fois
    initDefaultFoodSelection();
    
    // Initialiser l'état des accordéons si nécessaire
    if (!state.foodAccordionState) {
        state.foodAccordionState = {};
    }
    
    const filteredFoods = state.foods.filter(food => 
        food.name.toLowerCase().includes(searchTerm)
    );

    let html = '';
    Object.entries(foodCategories).forEach(([catId, cat]) => {
        const catFoods = filteredFoods.filter(f => f.category === catId);
        if (catFoods.length === 0) return;
        
        // Compter les aliments sélectionnés dans cette catégorie
        const selectedInCat = catFoods.filter(f => selectedFoodsForMenu.has(f.id)).length;
        
        // État de l'accordéon (ouvert par défaut si recherche active ou si c'est la première catégorie)
        const isOpen = searchTerm.length > 0 || state.foodAccordionState[catId] === true;

        html += `
            <div class="food-category-accordion" data-category="${catId}">
                <div class="food-category-header" onclick="toggleFoodCategory('${catId}')">
                    <div class="food-category-header-left">
                        <span class="food-category-toggle">${isOpen ? '▼' : '▶'}</span>
                        <span class="food-category-icon">${cat.icon}</span>
                        <span class="food-category-name">${cat.name}</span>
                        <span class="food-category-count">${catFoods.length} aliments</span>
                        ${selectedInCat > 0 ? `<span class="food-category-selected">${selectedInCat} sélectionné${selectedInCat > 1 ? 's' : ''}</span>` : ''}
                    </div>
                    <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); selectAllCategory('${catId}')" style="padding: 4px 10px; font-size: 0.75rem;">
                        ${catFoods.every(f => selectedFoodsForMenu.has(f.id)) ? 'Désélectionner' : 'Tout'}
                    </button>
                </div>
                <div class="food-category-content" style="display: ${isOpen ? 'block' : 'none'};">
                    ${catFoods.map(food => {
                        const isSelected = selectedFoodsForMenu.has(food.id);
                        const mealBadges = getMealBadges(food);
                        return `
                            <div class="food-select-item ${isSelected ? 'selected' : ''}" onclick="toggleFoodSelection('${food.id}')">
                                <div class="food-select-checkbox">
                                    <div class="checkbox ${isSelected ? 'checked' : ''}">
                                        ${isSelected ? '✓' : ''}
                                    </div>
                                </div>
                                <div class="food-select-info">
                                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                        <strong>${food.name}</strong>
                                        ${mealBadges}
                                    </div>
                                    <div class="food-search-macros">
                                        <span>🔥 ${food.calories} kcal</span>
                                        <span>P: ${food.protein}g</span>
                                        <span>G: ${food.carbs}g</span>
                                        <span>L: ${food.fat}g</span>
                                    </div>
                                </div>
                                ${!defaultFoods.find(df => df.id === food.id) ? `
                                    <button class="food-btn" onclick="event.stopPropagation(); deleteCustomFood('${food.id}')" title="Supprimer">🗑️</button>
                                ` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    });

    container.innerHTML = html || '<p style="color: var(--text-secondary);">Aucun aliment trouvé</p>';
    
    // Mettre à jour le bouton de génération avec validation
    updateGenerateButtonWithValidation();
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

function getMealBadges(food) {
    if (!food.mealTags || food.mealTags.length === 0) return '';
    
    const badges = {
        'breakfast': '<span style="font-size: 0.7rem; background: rgba(255, 200, 0, 0.2); color: #ffaa00; padding: 2px 6px; border-radius: 4px; margin-right: 3px;">🌅</span>',
        'lunch': '<span style="font-size: 0.7rem; background: rgba(255, 150, 0, 0.2); color: #ff9000; padding: 2px 6px; border-radius: 4px; margin-right: 3px;">☀️</span>',
        'dinner': '<span style="font-size: 0.7rem; background: rgba(100, 100, 255, 0.2); color: #8888ff; padding: 2px 6px; border-radius: 4px; margin-right: 3px;">🌙</span>',
        'snack': '<span style="font-size: 0.7rem; background: rgba(0, 255, 100, 0.2); color: #00dd66; padding: 2px 6px; border-radius: 4px; margin-right: 3px;">🍌</span>'
    };
    
    return food.mealTags.map(tag => badges[tag] || '').join('');
}

function toggleFoodSelection(foodId) {
    if (selectedFoodsForMenu.has(foodId)) {
        selectedFoodsForMenu.delete(foodId);
    } else {
        selectedFoodsForMenu.add(foodId);
    }
    renderFoodsList();
}

function selectAllCategory(categoryId) {
    const categoryFoods = state.foods.filter(f => f.category === categoryId);
    const allSelected = categoryFoods.every(f => selectedFoodsForMenu.has(f.id));
    
    categoryFoods.forEach(food => {
        if (allSelected) {
            selectedFoodsForMenu.delete(food.id);
        } else {
            selectedFoodsForMenu.add(food.id);
        }
    });
    
    renderFoodsList();
}

function clearFoodSelection() {
    selectedFoodsForMenu.clear();
    renderFoodsList();
}

function resetToDefaultSelection() {
    selectedFoodsForMenu.clear();
    initDefaultFoodSelection();
    renderFoodsList();
    showToast('Sélection réinitialisée avec 19 aliments par défaut', 'success');
}

function updateGenerateButtonWithValidation() {
    let btnContainer = document.getElementById('generate-from-selection-container');
    
    if (!btnContainer) {
        // Créer le conteneur s'il n'existe pas
        const foodsCard = document.getElementById('foods-list').parentElement;
        btnContainer = document.createElement('div');
        btnContainer.id = 'generate-from-selection-container';
        btnContainer.style.cssText = 'position: sticky; bottom: 0; background: var(--bg-card); padding: 15px 0; margin-top: 15px; border-top: 1px solid var(--border-color);';
        foodsCard.appendChild(btnContainer);
    }
    
    const count = selectedFoodsForMenu.size;
    
    if (count === 0) {
        btnContainer.innerHTML = `
            <p style="font-size: 0.85rem; color: var(--text-muted); text-align: center;">
                👆 Sélectionnez les aliments que vous avez dans votre cuisine pour générer un menu personnalisé
            </p>
        `;
        return;
    }
    
    // Vérifier la couverture des repas
    const selectedFoods = [];
    selectedFoodsForMenu.forEach(foodId => {
        const food = state.foods.find(f => f.id === foodId);
        if (food) selectedFoods.push(food);
    });
    
    const validation = validateFoodSelection(selectedFoods);
    const coverage = getMealCoverage(selectedFoods);
    
    let coverageHTML = `
        <div style="margin-bottom: 15px;">
            <div style="font-size: 0.85rem; font-weight: 600; margin-bottom: 8px; color: var(--text-primary);">
                Couverture des repas :
            </div>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
                ${coverage.map(meal => `
                    <div style="padding: 8px; background: ${meal.ok ? 'rgba(0, 255, 100, 0.1)' : 'rgba(255, 150, 0, 0.1)'}; border-radius: 6px; font-size: 0.8rem;">
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span>${meal.icon}</span>
                            <span style="font-weight: 600; color: ${meal.ok ? 'var(--accent-primary)' : 'var(--warning)'};">
                                ${meal.name}
                            </span>
                        </div>
                        <div style="color: var(--text-secondary); font-size: 0.75rem; margin-top: 2px;">
                            ${meal.message}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    btnContainer.innerHTML = coverageHTML + `
        <div style="display: flex; gap: 10px; align-items: center;">
            <button 
                class="btn ${validation.valid ? 'btn-primary' : 'btn-secondary'}" 
                onclick="${validation.valid ? 'generateMenuFromSelection()' : 'showValidationError()'}" 
                style="flex: 1;"
                ${validation.valid ? '' : 'disabled'}>
                ${validation.valid ? '🍽️' : '⚠️'} ${validation.valid ? `Générer menu avec ${count} aliment${count > 1 ? 's' : ''}` : 'Menu incomplet'}
            </button>
            <button class="btn btn-secondary" onclick="clearFoodSelection()" title="Effacer la sélection">
                ✕
            </button>
        </div>
        ${!validation.valid ? `
            <p style="font-size: 0.8rem; color: var(--warning); margin-top: 8px; text-align: center;">
                ${validation.message}
            </p>
        ` : ''}
    `;
}

function getMealCoverage(foods) {
    const breakfastFoods = getFoodsForMeal(foods, 'breakfast');
    const lunchFoods = getFoodsForMeal(foods, 'lunch');
    const dinnerFoods = getFoodsForMeal(foods, 'dinner');
    const snackFoods = getFoodsForMeal(foods, 'snack');
    
    return [
        {
            name: 'Petit-déj',
            icon: '🌅',
            ok: breakfastFoods.some(f => f.category === 'carbs') && 
                breakfastFoods.some(f => f.category === 'protein' || f.category === 'dairy'),
            message: breakfastFoods.length > 0 ? `${breakfastFoods.length} aliment${breakfastFoods.length > 1 ? 's' : ''}` : 'Aucun aliment'
        },
        {
            name: 'Déjeuner',
            icon: '☀️',
            ok: lunchFoods.some(f => f.category === 'protein') && 
                lunchFoods.some(f => f.category === 'carbs') &&
                lunchFoods.some(f => f.category === 'vegetable'),
            message: lunchFoods.length > 0 ? `${lunchFoods.length} aliment${lunchFoods.length > 1 ? 's' : ''}` : 'Aucun aliment'
        },
        {
            name: 'Collation',
            icon: '🍌',
            ok: snackFoods.length > 0,
            message: snackFoods.length > 0 ? `${snackFoods.length} aliment${snackFoods.length > 1 ? 's' : ''}` : 'Aucun aliment'
        },
        {
            name: 'Dîner',
            icon: '🌙',
            ok: dinnerFoods.some(f => f.category === 'protein') && 
                dinnerFoods.some(f => f.category === 'carbs'),
            message: dinnerFoods.length > 0 ? `${dinnerFoods.length} aliment${dinnerFoods.length > 1 ? 's' : ''}` : 'Aucun aliment'
        }
    ];
}

function showValidationError() {
    const selectedFoods = [];
    selectedFoodsForMenu.forEach(foodId => {
        const food = state.foods.find(f => f.id === foodId);
        if (food) selectedFoods.push(food);
    });
    
    const validation = validateFoodSelection(selectedFoods);
    showToast(validation.message, 'error');
}

// Génération de menu INTELLIGENTE basée sur la sélection
function generateMenuFromSelection() {
    if (!state.profile) {
        showToast('Configurez d\'abord votre profil', 'error');
        return;
    }
    
    if (selectedFoodsForMenu.size === 0) {
        showToast('Sélectionnez au moins quelques aliments', 'error');
        return;
    }
    
    // Récupérer les aliments sélectionnés avec leurs tags
    const selectedFoods = [];
    selectedFoodsForMenu.forEach(foodId => {
        const food = state.foods.find(f => f.id === foodId);
        if (food) {
            selectedFoods.push(food);
        }
    });
    
    // ==================== VALIDATION ====================
    const validation = validateFoodSelection(selectedFoods);
    
    if (!validation.valid) {
        showToast(validation.message, 'error');
        return;
    }
    
    // ==================== FILTRAGE PAR REPAS ====================
    const breakfastFoods = getFoodsForMeal(selectedFoods, 'breakfast');
    const lunchFoods = getFoodsForMeal(selectedFoods, 'lunch');
    const dinnerFoods = getFoodsForMeal(selectedFoods, 'dinner');
    const snackFoods = getFoodsForMeal(selectedFoods, 'snack');
    
    // Répartition des calories par repas
    const targetCals = state.profile.targetCalories;
    const mealDistribution = {
        breakfast: 0.25,  // 25%
        lunch: 0.35,      // 35%
        snack: 0.10,      // 10%
        dinner: 0.30      // 30%
    };
    
    const menu = {
        breakfast: [],
        lunch: [],
        snack: [],
        dinner: []
    };
    
    // Helper pour calculer la quantité
    function calcQuantityForCalories(food, targetCalories) {
        return Math.round((targetCalories / food.calories) * 100 / 5) * 5;
    }
    
    // Helper pour ajouter un aliment
    function addToMeal(meal, food, quantity) {
        quantity = Math.max(20, Math.min(400, quantity));
        menu[meal].push({ food, quantity });
    }
    
    // ==================== PETIT-DÉJEUNER (25%) ====================
    const breakfastCals = targetCals * mealDistribution.breakfast;
    buildBreakfast(breakfastFoods, breakfastCals, addToMeal, calcQuantityForCalories);
    
    // ==================== DÉJEUNER (35%) ====================
    const lunchCals = targetCals * mealDistribution.lunch;
    buildLunch(lunchFoods, lunchCals, addToMeal, calcQuantityForCalories);
    
    // ==================== COLLATION (10%) ====================
    const snackCals = targetCals * mealDistribution.snack;
    buildSnack(snackFoods, snackCals, addToMeal, calcQuantityForCalories);
    
    // ==================== DÎNER (30%) ====================
    const dinnerCals = targetCals * mealDistribution.dinner;
    buildDinner(dinnerFoods, lunchFoods, dinnerCals, addToMeal, calcQuantityForCalories, menu);
    
    // ==================== AJUSTEMENT PROTÉINES ====================
    adjustProteinIfNeeded(menu, state.profile.macros.protein);
    
    // Sauvegarder le menu
    state.dailyMenu = menu;
    saveState();
    
    // Afficher le menu
    renderDailyMenu();
    updateMacroBars();
    
    // Passer à l'onglet Menu
    document.querySelector('[data-tab="menu"]').click();
    
    showToast('Menu généré avec vos aliments ! 🎉', 'success');
}

// ==================== HELPERS DE FILTRAGE ====================

function getFoodsForMeal(foods, mealType) {
    return foods
        .filter(food => food.mealTags && food.mealTags.includes(mealType))
        .sort((a, b) => (b.priority || 0) - (a.priority || 0));
}

function validateFoodSelection(foods) {
    const breakfastFoods = getFoodsForMeal(foods, 'breakfast');
    const lunchFoods = getFoodsForMeal(foods, 'lunch');
    const dinnerFoods = getFoodsForMeal(foods, 'dinner');
    const snackFoods = getFoodsForMeal(foods, 'snack');
    
    // Vérifier petit-déjeuner
    const hasBreakfastCarbs = breakfastFoods.some(f => f.category === 'carbs');
    const hasBreakfastProtein = breakfastFoods.some(f => 
        f.category === 'protein' || f.category === 'dairy'
    );
    
    if (!hasBreakfastCarbs) {
        return {
            valid: false,
            message: '❌ Ajoutez des glucides pour le petit-déjeuner (avoine, pain)'
        };
    }
    
    if (!hasBreakfastProtein) {
        return {
            valid: false,
            message: '❌ Ajoutez une source de protéines pour le petit-déjeuner (œufs, yaourt, whey)'
        };
    }
    
    // Vérifier déjeuner
    const hasLunchProtein = lunchFoods.some(f => f.category === 'protein');
    const hasLunchCarbs = lunchFoods.some(f => f.category === 'carbs');
    const hasLunchVeggies = lunchFoods.some(f => f.category === 'vegetable');
    
    if (!hasLunchProtein) {
        return {
            valid: false,
            message: '❌ Ajoutez une protéine pour le déjeuner (poulet, poisson, viande)'
        };
    }
    
    if (!hasLunchCarbs) {
        return {
            valid: false,
            message: '❌ Ajoutez des glucides pour le déjeuner (riz, pâtes, pomme de terre)'
        };
    }
    
    if (!hasLunchVeggies) {
        return {
            valid: false,
            message: '❌ Ajoutez des légumes pour un menu équilibré'
        };
    }
    
    // Vérifier dîner
    const hasDinnerProtein = dinnerFoods.some(f => f.category === 'protein');
    const hasDinnerCarbs = dinnerFoods.some(f => f.category === 'carbs');
    
    if (!hasDinnerProtein) {
        return {
            valid: false,
            message: '❌ Ajoutez une protéine pour le dîner'
        };
    }
    
    if (!hasDinnerCarbs) {
        return {
            valid: false,
            message: '❌ Ajoutez des glucides pour le dîner'
        };
    }
    
    // Vérifier collation
    if (snackFoods.length === 0) {
        return {
            valid: false,
            message: '❌ Ajoutez au moins 1 aliment pour la collation (fruit, noix, yaourt)'
        };
    }
    
    return { valid: true };
}

// ==================== CONSTRUCTION DES REPAS ====================

function buildBreakfast(foods, targetCals, addToMeal, calcQuantity) {
    // Prioriser : dairy/protein + carbs + fruit + fat
    
    // 1. Protéine/Dairy (35% des calories)
    const dairy = foods.find(f => f.category === 'dairy' || f.category === 'protein');
    if (dairy) {
        addToMeal('breakfast', dairy, calcQuantity(dairy, targetCals * 0.35));
    }
    
    // 2. Glucides (40% des calories)
    const carbs = foods.find(f => f.category === 'carbs');
    if (carbs) {
        addToMeal('breakfast', carbs, calcQuantity(carbs, targetCals * 0.40));
    }
    
    // 3. Fruit (15% des calories)
    const fruit = foods.find(f => f.category === 'fruit');
    if (fruit) {
        addToMeal('breakfast', fruit, calcQuantity(fruit, targetCals * 0.15));
    }
    
    // 4. Lipides (10% des calories)
    const fat = foods.find(f => f.category === 'fat');
    if (fat) {
        addToMeal('breakfast', fat, Math.max(10, calcQuantity(fat, targetCals * 0.10)));
    }
}

function buildLunch(foods, targetCals, addToMeal, calcQuantity) {
    // Prioriser : protein + carbs + vegetable + fat
    
    // 1. Protéine (40% des calories)
    const protein = foods.find(f => f.category === 'protein');
    if (protein) {
        addToMeal('lunch', protein, calcQuantity(protein, targetCals * 0.40));
    }
    
    // 2. Glucides (35% des calories)
    const carbs = foods.find(f => f.category === 'carbs');
    if (carbs) {
        addToMeal('lunch', carbs, calcQuantity(carbs, targetCals * 0.35));
    }
    
    // 3. Légumes (15% des calories)
    const veggie = foods.find(f => f.category === 'vegetable');
    if (veggie) {
        addToMeal('lunch', veggie, Math.max(100, calcQuantity(veggie, targetCals * 0.15)));
    }
    
    // 4. Lipides (10% des calories) - huile de cuisson
    const fat = foods.find(f => f.category === 'fat' && f.name.toLowerCase().includes('huile'));
    if (fat) {
        addToMeal('lunch', fat, Math.max(5, Math.min(15, calcQuantity(fat, targetCals * 0.10))));
    }
}

function buildSnack(foods, targetCals, addToMeal, calcQuantity) {
    // Prioriser : dairy/protein + fruit OU fat
    
    // Option 1 : Whey ou dairy
    const protein = foods.find(f => 
        f.name.toLowerCase().includes('whey') || 
        f.name.toLowerCase().includes('protéine') ||
        f.category === 'dairy'
    );
    
    if (protein) {
        addToMeal('snack', protein, calcQuantity(protein, targetCals * 0.5));
    }
    
    // Option 2 : Fruit
    const fruit = foods.find(f => f.category === 'fruit');
    if (fruit) {
        addToMeal('snack', fruit, calcQuantity(fruit, targetCals * 0.4));
    }
    
    // Option 3 : Noix/lipides si pas assez
    if (!protein && !fruit) {
        const fat = foods.find(f => f.category === 'fat');
        if (fat) {
            addToMeal('snack', fat, Math.max(20, calcQuantity(fat, targetCals)));
        }
    }
}

function buildDinner(foods, lunchFoods, targetCals, addToMeal, calcQuantity, menu) {
    // Varier par rapport au déjeuner
    
    // 1. Protéine DIFFÉRENTE du déjeuner (40%)
    const lunchProteinId = menu.lunch.find(m => m.food.category === 'protein')?.food.id;
    const protein = foods.find(f => 
        f.category === 'protein' && f.id !== lunchProteinId
    ) || foods.find(f => f.category === 'protein');
    
    if (protein) {
        addToMeal('dinner', protein, calcQuantity(protein, targetCals * 0.40));
    }
    
    // 2. Glucides DIFFÉRENTS du déjeuner (35%)
    const lunchCarbsId = menu.lunch.find(m => m.food.category === 'carbs')?.food.id;
    const carbs = foods.find(f => 
        f.category === 'carbs' && f.id !== lunchCarbsId
    ) || foods.find(f => f.category === 'carbs');
    
    if (carbs) {
        addToMeal('dinner', carbs, calcQuantity(carbs, targetCals * 0.35));
    }
    
    // 3. Légumes DIFFÉRENTS du déjeuner (15%)
    const lunchVeggieId = menu.lunch.find(m => m.food.category === 'vegetable')?.food.id;
    const veggie = foods.find(f => 
        f.category === 'vegetable' && f.id !== lunchVeggieId
    ) || foods.find(f => f.category === 'vegetable');
    
    if (veggie) {
        addToMeal('dinner', veggie, Math.max(100, calcQuantity(veggie, targetCals * 0.15)));
    }
    
    // 4. Lipides (10%)
    const fat = lunchFoods.find(f => f.category === 'fat' && f.name.toLowerCase().includes('huile'));
    if (fat) {
        addToMeal('dinner', fat, Math.max(5, Math.min(15, calcQuantity(fat, targetCals * 0.10))));
    }
}

function adjustProteinIfNeeded(menu, targetProtein) {
    let totalProtein = 0;
    
    Object.values(menu).forEach(meal => {
        meal.forEach(item => {
            totalProtein += item.food.protein * item.quantity / 100;
        });
    });
    
    // Si on est loin des protéines cibles, ajuster
    if (totalProtein < targetProtein * 0.85) {
        const proteinDeficit = targetProtein - totalProtein;
        
        // Augmenter les portions de protéines proportionnellement
        Object.values(menu).forEach(meal => {
            meal.forEach(item => {
                if (item.food.category === 'protein' || 
                    (item.food.category === 'dairy' && item.food.protein >= 8)) {
                    const increase = Math.min(50, (proteinDeficit / 3) * (100 / item.food.protein));
                    item.quantity = Math.round((item.quantity + increase) / 5) * 5;
                    item.quantity = Math.max(20, Math.min(400, item.quantity));
                }
            });
        });
    }
}

function filterFoods() {
    renderFoodsList();
}

// Aliments personnalisés
function openCustomFoodModal() {
    document.getElementById('custom-food-name').value = '';
    document.getElementById('custom-food-calories').value = '';
    document.getElementById('custom-food-protein').value = '';
    document.getElementById('custom-food-carbs').value = '';
    document.getElementById('custom-food-fat').value = '';
    document.getElementById('custom-food-category').value = 'protein';
    openModal('custom-food-modal');
}

function saveCustomFood() {
    const name = document.getElementById('custom-food-name').value.trim();
    const calories = parseFloat(document.getElementById('custom-food-calories').value);
    const protein = parseFloat(document.getElementById('custom-food-protein').value);
    const carbs = parseFloat(document.getElementById('custom-food-carbs').value);
    const fat = parseFloat(document.getElementById('custom-food-fat').value);
    const category = document.getElementById('custom-food-category').value;

    if (!name) {
        showToast('Nom requis', 'error');
        return;
    }
    
    if (isNaN(calories) || calories < 0) {
        showToast('Calories invalides', 'error');
        return;
    }

    const food = {
        id: 'custom-' + Date.now(),
        name,
        calories,
        protein: protein || 0,
        carbs: carbs || 0,
        fat: fat || 0,
        category
    };

    state.foods.push(food);
    saveState();
    
    // Sync avec Supabase si connecté
    if (typeof isLoggedIn === 'function' && isLoggedIn()) {
        saveCustomFoodToSupabase(food);
    }
    
    closeModal('custom-food-modal');
    renderFoodsList();
    showToast('Aliment ajouté !', 'success');
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

// ==================== SÉLECTION PAR DÉFAUT ====================

function initDefaultFoodSelection() {
    // Si aucune sélection et pas encore initialisé
    if (selectedFoodsForMenu.size === 0) {
        const defaultSelection = [
            // Protéines (3)
            'chicken-breast', 'salmon', 'eggs',
            // Glucides (3)
            'rice-white', 'pasta', 'oats',
            // Légumes (5)
            'broccoli', 'spinach', 'tomato', 'carrots', 'zucchini',
            // Fruits (3)
            'banana', 'apple', 'berries-mixed',
            // Dairy (2)
            'greek-yogurt-0', 'cottage-cheese',
            // Lipides (3)
            'olive-oil', 'almonds', 'avocado'
        ];
        
        defaultSelection.forEach(foodId => {
            if (state.foods.find(f => f.id === foodId)) {
                selectedFoodsForMenu.add(foodId);
            }
        });
    }
}

// Affichage du menu quotidien avec accordéons
function renderDailyMenu() {
    const container = document.getElementById('daily-menu');
    const meals = {
        breakfast: { name: 'Petit-déjeuner', icon: '🌅' },
        lunch: { name: 'Déjeuner', icon: '☀️' },
        snack: { name: 'Collation', icon: '🍌' },
        dinner: { name: 'Dîner', icon: '🌙' }
    };

    const hasFood = Object.values(state.dailyMenu).some(m => m.length > 0);
    
    if (!hasFood) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🥗</div>
                <div class="empty-state-title">Aucun repas planifié</div>
                <p>Générez un menu ou ajoutez des aliments manuellement</p>
            </div>
        `;
        return;
    }

    let html = '';
    Object.entries(meals).forEach(([mealId, meal]) => {
        const mealFoods = state.dailyMenu[mealId];
        const mealCalories = mealFoods.reduce((sum, item) => 
            sum + (item.food.calories * item.quantity / 100), 0
        );
        const foodCount = mealFoods.length;

        html += `
            <div class="meal-card" data-meal="${mealId}">
                <div class="meal-header" onclick="toggleMealAccordion('${mealId}')">
                    <div class="meal-header-left">
                        <span class="meal-toggle">▶</span>
                        <span class="meal-name">${meal.icon} ${meal.name}</span>
                    </div>
                    <div class="meal-header-right">
                        <span class="meal-count">${foodCount} aliment${foodCount > 1 ? 's' : ''}</span>
                        <span class="meal-calories">${Math.round(mealCalories)} kcal</span>
                    </div>
                </div>
                <div class="meal-foods">
                    ${mealFoods.length === 0 ? '<p style="color: var(--text-muted); font-size: 0.9rem;">Aucun aliment</p>' : ''}
                    ${mealFoods.map((item, idx) => `
                        <div class="food-item">
                            <div class="food-item-info">
                                <span>${item.food.name}</span>
                                <span class="food-item-qty">${item.quantity}g</span>
                            </div>
                            <div class="food-item-actions">
                                <button class="food-btn" onclick="adjustQuantity('${mealId}', ${idx}, -25)" title="-25g">−</button>
                                <button class="food-btn" onclick="adjustQuantity('${mealId}', ${idx}, 25)" title="+25g">+</button>
                                <button class="food-btn" onclick="openSwapModal('${mealId}', ${idx})" title="Échanger">🔄</button>
                                <button class="food-btn" onclick="removeFood('${mealId}', ${idx})" title="Supprimer">×</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });

    // Total
    const consumed = calculateConsumedMacros();
    const targetCals = state.profile?.targetCalories || 0;
    const caloriesDiff = consumed.calories - targetCals;
    const diffColor = Math.abs(caloriesDiff) < 100 ? 'var(--accent-primary)' : 
                      caloriesDiff > 0 ? 'var(--warning)' : 'var(--info)';
    
    html += `
        <div style="margin-top: 20px; padding: 15px; background: var(--bg-tertiary); border-radius: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 600;">Total du jour</span>
                <span style="font-family: 'Space Mono', monospace; color: ${diffColor};">
                    ${consumed.calories} kcal
                    ${targetCals > 0 ? `<span style="font-size: 0.8rem; color: var(--text-muted);">/ ${targetCals}</span>` : ''}
                </span>
            </div>
            <div style="display: flex; gap: 20px; margin-top: 10px; font-size: 0.85rem; color: var(--text-secondary);">
                <span>P: ${consumed.protein}g</span>
                <span>G: ${consumed.carbs}g</span>
                <span>L: ${consumed.fat}g</span>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

// Toggle accordéon repas
function toggleMealAccordion(mealId) {
    const card = document.querySelector(`.meal-card[data-meal="${mealId}"]`);
    if (card) {
        card.classList.toggle('open');
    }
}

// Ajustement des quantités avec redistribution intelligente
function adjustQuantity(mealId, foodIndex, delta) {
    const meal = state.dailyMenu[mealId];
    const targetItem = meal[foodIndex];
    const oldQuantity = targetItem.quantity;
    const newQuantity = Math.max(10, oldQuantity + delta);
    
    // Calculer la différence de calories
    const oldCalories = targetItem.food.calories * oldQuantity / 100;
    const newCalories = targetItem.food.calories * newQuantity / 100;
    const caloriesDelta = newCalories - oldCalories;
    
    // Appliquer le changement à l'aliment cible
    targetItem.quantity = newQuantity;
    
    // Si on augmente les calories, il faut redistribuer (réduire d'autres aliments)
    if (caloriesDelta > 0) {
        redistributeCalories(mealId, foodIndex, caloriesDelta);
    }
    
    saveState();
    renderDailyMenu();
    updateMacroBars();
    
    // Toast informatif
    if (caloriesDelta > 0) {
        showToast(`+${Math.round(caloriesDelta)} kcal compensé automatiquement`, 'info');
    }
}

// Fonction de redistribution intelligente des calories
function redistributeCalories(mealId, excludeIndex, excessCalories) {
    const meal = state.dailyMenu[mealId];
    const targetFood = meal[excludeIndex].food;
    
    // Trouver les autres aliments du repas (en excluant celui qu'on vient d'augmenter)
    const otherItems = meal
        .map((item, idx) => ({ item, idx }))
        .filter(({ idx }) => idx !== excludeIndex);
    
    if (otherItems.length === 0) {
        // Pas d'autres aliments pour compenser
        return;
    }
    
    // Stratégie 1: Prioriser les aliments de la même catégorie
    const sameCategoryItems = otherItems.filter(
        ({ item }) => item.food.category === targetFood.category
    );
    
    let itemsToAdjust = sameCategoryItems.length > 0 ? sameCategoryItems : otherItems;
    
    // Stratégie 2: Ne pas toucher aux légumes (faibles calories)
    itemsToAdjust = itemsToAdjust.filter(
        ({ item }) => item.food.category !== 'vegetable' || itemsToAdjust.length === 1
    );
    
    if (itemsToAdjust.length === 0) {
        itemsToAdjust = otherItems; // Fallback: ajuster tout
    }
    
    // Calculer les calories totales des aliments à ajuster
    const totalAdjustableCalories = itemsToAdjust.reduce(
        (sum, { item }) => sum + (item.food.calories * item.quantity / 100),
        0
    );
    
    // Calculer le facteur de réduction proportionnel
    const targetTotalCalories = totalAdjustableCalories - excessCalories;
    const reductionFactor = Math.max(0.5, targetTotalCalories / totalAdjustableCalories); // Min 50% de réduction
    
    // Appliquer la réduction proportionnelle
    itemsToAdjust.forEach(({ item }) => {
        const newQuantity = Math.round(item.quantity * reductionFactor / 5) * 5; // Arrondi à 5g
        item.quantity = Math.max(20, Math.min(400, newQuantity)); // Entre 20g et 400g
    });
}

// Suppression d'aliment avec options
function removeFood(mealId, foodIndex) {
    const item = state.dailyMenu[mealId][foodIndex];
    const calories = Math.round(item.food.calories * item.quantity / 100);
    
    // Sauvegarder la cible pour les actions suivantes
    removeTarget = { mealId, foodIndex, item, calories };
    
    // Remplir la modale
    document.getElementById('remove-food-name').textContent = item.food.name;
    document.getElementById('remove-food-calories').textContent = calories;
    
    // Trouver une suggestion de remplacement
    const suggestion = findReplacementFood(item.food, calories);
    const suggestionContainer = document.getElementById('remove-food-suggestion');
    const suggestionContent = document.getElementById('remove-food-suggestion-content');
    
    if (suggestion) {
        suggestionContainer.style.display = 'block';
        suggestionContent.innerHTML = `
            <div class="food-search-item" onclick="acceptReplacementSuggestion()">
                <div>
                    <strong>${suggestion.food.name}</strong>
                    <span style="color: var(--accent-primary); margin-left: 10px;">${suggestion.quantity}g</span>
                    <div class="food-search-macros">
                        <span>🔥 ${Math.round(suggestion.food.calories * suggestion.quantity / 100)} kcal</span>
                        <span>P: ${Math.round(suggestion.food.protein * suggestion.quantity / 100)}g</span>
                    </div>
                </div>
                <span style="color: var(--accent-primary);">Choisir →</span>
            </div>
        `;
        removeTarget.suggestion = suggestion;
    } else {
        suggestionContainer.style.display = 'none';
    }
    
    openModal('remove-food-modal');
}

// Trouver un aliment de remplacement similaire
function findReplacementFood(currentFood, targetCalories) {
    // Chercher dans la même catégorie, en excluant l'aliment actuel
    const sameCategoryFoods = state.foods.filter(f => 
        f.category === currentFood.category && 
        f.id !== currentFood.id
    );
    
    if (sameCategoryFoods.length === 0) return null;
    
    // Trouver l'aliment le plus proche en termes de profil nutritionnel
    let bestMatch = null;
    let bestScore = Infinity;
    
    sameCategoryFoods.forEach(food => {
        // Calculer la quantité nécessaire pour atteindre les mêmes calories
        const quantity = Math.round((targetCalories / food.calories) * 100);
        
        // Ne pas proposer des quantités trop extrêmes
        if (quantity < 20 || quantity > 500) return;
        
        // Score basé sur la similarité des macros (protéines prioritaires)
        const proteinRatio = food.protein / (currentFood.protein || 1);
        const score = Math.abs(1 - proteinRatio);
        
        if (score < bestScore) {
            bestScore = score;
            bestMatch = { food, quantity };
        }
    });
    
    return bestMatch;
}

// Option 1: Remplacer par un aliment similaire
function removeFoodAndReplace() {
    closeModal('remove-food-modal');
    openSwapModal(removeTarget.mealId, removeTarget.foodIndex);
}

// Option 2: Accepter la suggestion de remplacement
function acceptReplacementSuggestion() {
    if (!removeTarget.suggestion) return;
    
    const { mealId, foodIndex } = removeTarget;
    const { food, quantity } = removeTarget.suggestion;
    
    // Remplacer l'aliment
    state.dailyMenu[mealId][foodIndex] = { food, quantity };
    
    saveState();
    closeModal('remove-food-modal');
    renderDailyMenu();
    updateMacroBars();
    showToast(`Remplacé par ${food.name} (${quantity}g)`, 'success');
}

// Option 3: Redistribuer les calories sur les aliments restants
function removeFoodAndRedistribute() {
    const { mealId, foodIndex, calories } = removeTarget;
    const meal = state.dailyMenu[mealId];
    
    // Supprimer l'aliment
    meal.splice(foodIndex, 1);
    
    // S'il reste des aliments dans le repas, redistribuer
    if (meal.length > 0) {
        // Calculer les calories actuelles du repas (après suppression)
        const currentMealCalories = meal.reduce((sum, item) => 
            sum + (item.food.calories * item.quantity / 100), 0
        );
        
        // Calculer le facteur d'augmentation pour compenser
        const targetMealCalories = currentMealCalories + calories;
        const multiplier = targetMealCalories / currentMealCalories;
        
        // Augmenter proportionnellement chaque aliment
        meal.forEach(item => {
            // Arrondir à 5g près pour des quantités propres
            item.quantity = Math.round((item.quantity * multiplier) / 5) * 5;
            // Minimum 10g
            item.quantity = Math.max(10, item.quantity);
        });
        
        showToast('Calories redistribuées sur le repas', 'success');
    } else {
        showToast('Aliment supprimé', 'success');
    }
    
    saveState();
    closeModal('remove-food-modal');
    renderDailyMenu();
    updateMacroBars();
}

// Option 4: Supprimer sans compensation
function removeFoodOnly() {
    const { mealId, foodIndex } = removeTarget;
    
    state.dailyMenu[mealId].splice(foodIndex, 1);
    
    saveState();
    closeModal('remove-food-modal');
    renderDailyMenu();
    updateMacroBars();
    showToast('Aliment supprimé', 'success');
}

// Ajout d'aliments
function openAddFoodModal() {
    document.getElementById('add-food-search').value = '';
    document.getElementById('add-food-results').innerHTML = '';
    openModal('add-food-modal');
}

function searchFoodsForAdd() {
    const searchTerm = document.getElementById('add-food-search').value.toLowerCase();
    const container = document.getElementById('add-food-results');

    if (searchTerm.length < 2) {
        container.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">Tapez au moins 2 caractères...</p>';
        return;
    }

    const results = state.foods.filter(f => f.name.toLowerCase().includes(searchTerm)).slice(0, 10);

    if (results.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">Aucun résultat</p>';
        return;
    }

    container.innerHTML = results.map(food => `
        <div class="food-search-item" onclick="selectFoodForAdd('${food.id}')">
            <div>
                <strong>${food.name}</strong>
                <div class="food-search-macros">
                    <span>🔥 ${food.calories} kcal</span>
                    <span>P: ${food.protein}g</span>
                </div>
            </div>
        </div>
    `).join('');
}

function selectFoodForAdd(foodId) {
    selectedFoodForAdd = state.foods.find(f => f.id === foodId);
    selectedMealForAdd = document.getElementById('add-food-meal').value;
    
    document.getElementById('quantity-food-info').innerHTML = `
        <strong>${selectedFoodForAdd.name}</strong>
        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 5px;">
            Pour 100g: ${selectedFoodForAdd.calories} kcal | P: ${selectedFoodForAdd.protein}g | G: ${selectedFoodForAdd.carbs}g | L: ${selectedFoodForAdd.fat}g
        </div>
    `;
    document.getElementById('food-quantity').value = 100;
    
    closeModal('add-food-modal');
    openModal('quantity-modal');
}

function confirmAddFood() {
    const quantity = parseInt(document.getElementById('food-quantity').value);
    
    if (!quantity || quantity < 1) {
        showToast('Quantité invalide', 'error');
        return;
    }

    state.dailyMenu[selectedMealForAdd].push({
        food: selectedFoodForAdd,
        quantity
    });

    saveState();
    closeModal('quantity-modal');
    renderDailyMenu();
    updateMacroBars();
    showToast('Aliment ajouté !', 'success');
}

// Échange d'aliments
function openSwapModal(mealId, foodIndex) {
    swapTarget = { mealId, foodIndex };
    const currentFood = state.dailyMenu[mealId][foodIndex].food;
    
    document.getElementById('swap-current-food').textContent = currentFood.name;
    document.getElementById('swap-food-search').value = '';
    
    // Afficher des suggestions similaires
    const similar = state.foods.filter(f => 
        f.category === currentFood.category && f.id !== currentFood.id
    ).slice(0, 6);

    document.getElementById('swap-food-results').innerHTML = `
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 10px;">Suggestions similaires:</p>
        ${similar.map(food => `
            <div class="food-search-item" onclick="swapFood('${food.id}')">
                <div>
                    <strong>${food.name}</strong>
                    <div class="food-search-macros">
                        <span>🔥 ${food.calories} kcal</span>
                        <span>P: ${food.protein}g</span>
                    </div>
                </div>
            </div>
        `).join('')}
    `;
    
    openModal('swap-food-modal');
}

function searchFoodsForSwap() {
    const searchTerm = document.getElementById('swap-food-search').value.toLowerCase();
    const container = document.getElementById('swap-food-results');

    if (searchTerm.length < 2) return;

    const results = state.foods.filter(f => f.name.toLowerCase().includes(searchTerm)).slice(0, 10);

    container.innerHTML = results.map(food => `
        <div class="food-search-item" onclick="swapFood('${food.id}')">
            <div>
                <strong>${food.name}</strong>
                <div class="food-search-macros">
                    <span>🔥 ${food.calories} kcal</span>
                    <span>P: ${food.protein}g</span>
                </div>
            </div>
        </div>
    `).join('');
}

function swapFood(newFoodId) {
    const newFood = state.foods.find(f => f.id === newFoodId);
    const item = state.dailyMenu[swapTarget.mealId][swapTarget.foodIndex];
    
    item.food = newFood;
    
    saveState();
    closeModal('swap-food-modal');
    renderDailyMenu();
    updateMacroBars();
    showToast('Aliment échangé !', 'success');
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
    const date = document.getElementById('journal-date').value;
    if (!state.foodJournal) state.foodJournal = {};

    renderJournalEntries();
    updateJournalSummary();
}

// Recherche d'aliments pour le journal
function searchFoodsForJournal() {
    const searchTerm = document.getElementById('journal-food-search').value.toLowerCase();
    const container = document.getElementById('journal-food-results');

    if (searchTerm.length < 2) {
        container.innerHTML = '';
        return;
    }

    const results = state.foods.filter(f => f.name.toLowerCase().includes(searchTerm)).slice(0, 8);

    if (results.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 15px;">Aucun résultat</p>';
        return;
    }

    container.innerHTML = results.map(food => `
        <div class="food-search-item" onclick="addToJournal('${food.id}')">
            <div>
                <strong>${food.name}</strong>
                <div class="food-search-macros">
                    <span>🔥 ${food.calories} kcal</span>
                    <span>P: ${food.protein}g</span>
                    <span>G: ${food.carbs}g</span>
                    <span>L: ${food.fat}g</span>
                </div>
            </div>
            <span style="color: var(--accent-primary);">+ Ajouter</span>
        </div>
    `).join('');
}

// Ajouter un aliment au journal
async function addToJournal(foodId) {
    const date = document.getElementById('journal-date').value;
    const food = state.foods.find(f => f.id === foodId);

    if (!food) return;

    if (!state.foodJournal) state.foodJournal = {};
    if (!state.foodJournal[date]) state.foodJournal[date] = [];

    // Ajouter avec une quantité par défaut de 100g
    const entry = {
        foodId: food.id,
        quantity: 100,
        addedAt: Date.now()
    };
    
    // Sync avec Supabase si connecté
    if (typeof isLoggedIn === 'function' && isLoggedIn()) {
        const supabaseId = await addJournalEntryToSupabase(date, food.id, 100);
        if (supabaseId) entry.supabaseId = supabaseId;
    }
    
    state.foodJournal[date].push(entry);
    saveState();

    // Vider la recherche
    document.getElementById('journal-food-search').value = '';
    document.getElementById('journal-food-results').innerHTML = '';

    renderJournalEntries();
    updateJournalSummary();

    showToast(`${food.name} ajouté au journal`, 'success');
}

// Afficher les entrées du journal
function renderJournalEntries() {
    const container = document.getElementById('journal-entries');
    const date = document.getElementById('journal-date').value;

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

        return `
            <div class="journal-entry">
                <div class="journal-entry-info">
                    <div class="journal-entry-name">${food.name}</div>
                    <div class="journal-entry-macros">
                        <span style="color: #ff6b6b;">P: ${protein}g</span>
                        <span style="color: #4ecdc4;">G: ${carbs}g</span>
                        <span style="color: #ffd93d;">L: ${fat}g</span>
                    </div>
                </div>
                <div class="journal-entry-qty">
                    <input type="number" value="${entry.quantity}" min="1" step="10" 
                           onchange="updateJournalQuantity(${idx}, this.value)">
                    <span>g</span>
                </div>
                <div class="journal-entry-cals">${cals} kcal</div>
                <button class="journal-entry-delete" onclick="removeFromJournal(${idx})" title="Supprimer">
                    🗑️
                </button>
            </div>
        `;
    }).join('');
}

// Mettre à jour la quantité d'une entrée
function updateJournalQuantity(index, quantity) {
    const date = document.getElementById('journal-date').value;
    quantity = Math.max(1, parseInt(quantity) || 100);

    if (state.foodJournal[date] && state.foodJournal[date][index]) {
        state.foodJournal[date][index].quantity = quantity;
        saveState();
        renderJournalEntries();
        updateJournalSummary();
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
        showToast('Aliment supprimé', 'success');
    }
}

// Vider le journal du jour
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
        showToast('Journal vidé', 'success');
    }
}

// Calculer et afficher le résumé des macros du journal
function updateJournalSummary() {
    const date = document.getElementById('journal-date').value;
    const entries = state.foodJournal?.[date] || [];

    let totalCals = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    entries.forEach(entry => {
        const food = state.foods.find(f => f.id === entry.foodId);
        if (food) {
            const multiplier = entry.quantity / 100;
            totalCals += food.calories * multiplier;
            totalProtein += food.protein * multiplier;
            totalCarbs += food.carbs * multiplier;
            totalFat += food.fat * multiplier;
        }
    });

    // Mettre à jour les valeurs
    document.getElementById('journal-calories').textContent = Math.round(totalCals);
    document.getElementById('journal-protein').textContent = Math.round(totalProtein);
    document.getElementById('journal-carbs').textContent = Math.round(totalCarbs);
    document.getElementById('journal-fat').textContent = Math.round(totalFat);

    // Mettre à jour la barre de progression des calories
    const targetCals = state.profile?.targetCalories || 2000;
    const calsPercent = Math.min((totalCals / targetCals) * 100, 100);

    document.getElementById('journal-cals-progress').textContent = `${Math.round(totalCals)} / ${targetCals} kcal`;
    document.getElementById('journal-cals-bar').style.width = `${calsPercent}%`;

    // Changer la couleur si on dépasse
    const calsBar = document.getElementById('journal-cals-bar');
    if (totalCals > targetCals) {
        calsBar.style.background = 'linear-gradient(90deg, #ff4466, #ff6688)';
    } else if (totalCals > targetCals * 0.9) {
        calsBar.style.background = 'linear-gradient(90deg, #ffaa00, #ffcc00)';
    } else {
        calsBar.style.background = 'linear-gradient(90deg, #00ff88, #00cc6a)';
    }
}
