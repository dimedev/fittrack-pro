// ==================== FAVORITES MODULE ====================

// Variables temporaires pour les modales
let selectedFavoriteIcon = '🍳';
let selectedCreateFavoriteIcon = '🍳';
let createFavoriteItems = []; // [{ foodId, quantity }]
let currentFavoriteToApply = null;

// ==================== RENDU DE LA LISTE ====================

function renderFavoritesList() {
    const container = document.getElementById('favorites-list');
    
    if (!state.favoriteMeals || state.favoriteMeals.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⭐</div>
                <div class="empty-state-title">Aucun favori</div>
                <p>Sauvegardez vos combinaisons d'aliments préférées pour les réutiliser rapidement</p>
            </div>
        `;
        return;
    }

    const mealTypeLabels = {
        'breakfast': '🌅 Petit-déj',
        'lunch': '☀️ Déjeuner',
        'snack': '🍌 Collation',
        'dinner': '🌙 Dîner',
        'any': '🍽️ Tous repas',
        'all': '📋 Menu complet'
    };

    container.innerHTML = state.favoriteMeals.map(fav => {
        // Calculer les macros totales
        const macros = calculateFavoriteMacros(fav.items);
        
        // Construire les tags d'aliments
        const itemTags = fav.items.slice(0, 5).map(item => {
            const food = state.foods.find(f => f.id === item.foodId);
            if (!food) return '';
            return `<span class="favorite-item-tag">${food.name}<span class="qty">${item.quantity}g</span></span>`;
        }).join('');
        
        const moreItems = fav.items.length > 5 ? `<span class="favorite-item-tag">+${fav.items.length - 5} autres</span>` : '';

        return `
            <div class="favorite-card">
                <div class="favorite-card-header">
                    <div class="favorite-card-title">
                        <span class="favorite-card-icon">${fav.icon || '⭐'}</span>
                        <span class="favorite-card-name">${fav.name}</span>
                        <span class="favorite-card-type">${mealTypeLabels[fav.mealType] || fav.mealType}</span>
                    </div>
                    <div class="favorite-card-actions">
                        <button class="btn btn-sm btn-primary" onclick="openApplyFavoriteModal('${fav.id}')" title="Utiliser">
                            ➕ Utiliser
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="editFavorite('${fav.id}')" title="Modifier">✏️</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteFavorite('${fav.id}')" title="Supprimer">🗑️</button>
                    </div>
                </div>
                <div class="favorite-card-items">
                    ${itemTags}${moreItems}
                </div>
                <div class="favorite-card-macros">
                    <span>🔥 <strong>${macros.calories}</strong> kcal</span>
                    <span>P: <strong>${macros.protein}</strong>g</span>
                    <span>G: <strong>${macros.carbs}</strong>g</span>
                    <span>L: <strong>${macros.fat}</strong>g</span>
                </div>
            </div>
        `;
    }).join('');
}

// ==================== CALCUL DES MACROS ====================

function calculateFavoriteMacros(items) {
    let calories = 0, protein = 0, carbs = 0, fat = 0;
    
    items.forEach(item => {
        const food = state.foods.find(f => f.id === item.foodId);
        if (food) {
            const multiplier = item.quantity / 100;
            calories += food.calories * multiplier;
            protein += food.protein * multiplier;
            carbs += food.carbs * multiplier;
            fat += food.fat * multiplier;
        }
    });
    
    return {
        calories: Math.round(calories),
        protein: Math.round(protein),
        carbs: Math.round(carbs),
        fat: Math.round(fat)
    };
}

// ==================== SAUVEGARDER UN REPAS DU MENU ====================

function openSaveMealAsFavoriteModal() {
    // Vérifier qu'il y a des aliments dans le menu
    const hasFood = Object.values(state.dailyMenu).some(m => m.length > 0);
    if (!hasFood) {
        showToast('Ajoutez d\'abord des aliments au menu', 'error');
        return;
    }
    
    selectedFavoriteIcon = '🍳';
    document.getElementById('save-favorite-name').value = '';
    
    // Reset icon selection
    document.querySelectorAll('#favorite-icon-picker .icon-picker-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.icon === selectedFavoriteIcon);
    });
    
    previewFavoriteToSave();
    openModal('save-favorite-modal');
}

function selectFavoriteIcon(icon) {
    selectedFavoriteIcon = icon;
    document.querySelectorAll('#favorite-icon-picker .icon-picker-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.icon === icon);
    });
}

function previewFavoriteToSave() {
    const mealType = document.getElementById('save-favorite-meal-type').value;
    const previewContainer = document.getElementById('save-favorite-preview');
    
    let items = [];
    
    if (mealType === 'all') {
        // Menu complet
        Object.values(state.dailyMenu).forEach(meal => {
            meal.forEach(item => {
                items.push({ food: item.food, quantity: item.quantity });
            });
        });
    } else {
        // Repas spécifique
        const meal = state.dailyMenu[mealType];
        items = meal.map(item => ({ food: item.food, quantity: item.quantity }));
    }
    
    if (items.length === 0) {
        previewContainer.innerHTML = `<p style="color: var(--warning); font-size: 0.9rem;">⚠️ Ce repas est vide</p>`;
        return;
    }
    
    const macros = {
        calories: 0, protein: 0, carbs: 0, fat: 0
    };
    
    items.forEach(item => {
        const multiplier = item.quantity / 100;
        macros.calories += item.food.calories * multiplier;
        macros.protein += item.food.protein * multiplier;
        macros.carbs += item.food.carbs * multiplier;
        macros.fat += item.food.fat * multiplier;
    });
    
    previewContainer.innerHTML = `
        <div style="margin-bottom: 10px;">
            ${items.map(item => `
                <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 0.85rem;">
                    <span>${item.food.name}</span>
                    <span style="color: var(--text-muted);">${item.quantity}g</span>
                </div>
            `).join('')}
        </div>
        <div style="padding-top: 10px; border-top: 1px solid var(--border-color); display: flex; gap: 15px; font-size: 0.8rem; color: var(--text-secondary);">
            <span>🔥 ${Math.round(macros.calories)} kcal</span>
            <span>P: ${Math.round(macros.protein)}g</span>
            <span>G: ${Math.round(macros.carbs)}g</span>
            <span>L: ${Math.round(macros.fat)}g</span>
        </div>
    `;
}

function saveMealAsFavorite() {
    const mealType = document.getElementById('save-favorite-meal-type').value;
    const name = document.getElementById('save-favorite-name').value.trim();
    
    if (!name) {
        showToast('Donnez un nom à votre favori', 'error');
        return;
    }
    
    let items = [];
    
    if (mealType === 'all') {
        Object.values(state.dailyMenu).forEach(meal => {
            meal.forEach(item => {
                items.push({ foodId: item.food.id, quantity: item.quantity });
            });
        });
    } else {
        const meal = state.dailyMenu[mealType];
        items = meal.map(item => ({ foodId: item.food.id, quantity: item.quantity }));
    }
    
    if (items.length === 0) {
        showToast('Ce repas est vide', 'error');
        return;
    }
    
    const favorite = {
        id: 'fav-' + Date.now(),
        name: name,
        icon: selectedFavoriteIcon,
        mealType: mealType,
        items: items,
        createdAt: new Date().toISOString()
    };
    
    state.favoriteMeals.push(favorite);
    saveState();
    
    closeModal('save-favorite-modal');
    renderFavoritesList();
    showToast(`"${name}" ajouté aux favoris ! ⭐`, 'success');
}

// ==================== CRÉER UN FAVORI MANUELLEMENT ====================

function openCreateFavoriteModal() {
    selectedCreateFavoriteIcon = '🍳';
    createFavoriteItems = [];
    
    document.getElementById('create-favorite-name').value = '';
    document.getElementById('create-favorite-type').value = 'breakfast';
    document.getElementById('create-favorite-food-search').value = '';
    document.getElementById('create-favorite-food-results').innerHTML = '';
    
    // Reset icon selection
    document.querySelectorAll('#create-favorite-icon-picker .icon-picker-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.icon === selectedCreateFavoriteIcon);
    });
    
    renderCreateFavoriteItems();
    openModal('create-favorite-modal');
}

function selectCreateFavoriteIcon(icon) {
    selectedCreateFavoriteIcon = icon;
    document.querySelectorAll('#create-favorite-icon-picker .icon-picker-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.icon === icon);
    });
}

function searchFoodsForFavorite() {
    const searchTerm = document.getElementById('create-favorite-food-search').value.toLowerCase();
    const container = document.getElementById('create-favorite-food-results');
    
    if (searchTerm.length < 2) {
        container.innerHTML = '';
        return;
    }
    
    const results = state.foods
        .filter(food => food.name.toLowerCase().includes(searchTerm))
        .slice(0, 10);
    
    if (results.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); padding: 10px; font-size: 0.85rem;">Aucun aliment trouvé</p>';
        return;
    }
    
    container.innerHTML = results.map(food => `
        <div class="food-search-item" onclick="addFoodToFavorite('${food.id}')">
            <div>
                <strong>${food.name}</strong>
                <div class="food-search-macros">
                    <span>🔥 ${food.calories} kcal</span>
                    <span>P: ${food.protein}g</span>
                </div>
            </div>
            <span style="color: var(--accent-primary);">+ Ajouter</span>
        </div>
    `).join('');
}

function addFoodToFavorite(foodId) {
    // Vérifier si déjà ajouté
    if (createFavoriteItems.find(item => item.foodId === foodId)) {
        showToast('Aliment déjà ajouté', 'info');
        return;
    }
    
    createFavoriteItems.push({ foodId: foodId, quantity: 100 });
    renderCreateFavoriteItems();
    
    // Vider la recherche
    document.getElementById('create-favorite-food-search').value = '';
    document.getElementById('create-favorite-food-results').innerHTML = '';
}

function removeFoodFromFavorite(foodId) {
    createFavoriteItems = createFavoriteItems.filter(item => item.foodId !== foodId);
    renderCreateFavoriteItems();
}

function updateFavoriteItemQuantity(foodId, quantity) {
    const item = createFavoriteItems.find(i => i.foodId === foodId);
    if (item) {
        item.quantity = Math.max(10, parseInt(quantity) || 100);
    }
    updateCreateFavoriteMacros();
}

function renderCreateFavoriteItems() {
    const container = document.getElementById('create-favorite-items');
    const macrosContainer = document.getElementById('create-favorite-macros');
    
    if (createFavoriteItems.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem; text-align: center;">Aucun aliment ajouté</p>';
        macrosContainer.style.display = 'none';
        return;
    }
    
    container.innerHTML = createFavoriteItems.map(item => {
        const food = state.foods.find(f => f.id === item.foodId);
        if (!food) return '';
        
        return `
            <div class="create-favorite-item">
                <div class="create-favorite-item-info">
                    <span class="create-favorite-item-name">${food.name}</span>
                </div>
                <div class="create-favorite-item-qty">
                    <input type="number" value="${item.quantity}" min="10" step="10" 
                           onchange="updateFavoriteItemQuantity('${item.foodId}', this.value)"
                           class="form-input">
                    <span style="color: var(--text-muted); font-size: 0.8rem;">g</span>
                    <button class="create-favorite-item-remove" onclick="removeFoodFromFavorite('${item.foodId}')">×</button>
                </div>
            </div>
        `;
    }).join('');
    
    macrosContainer.style.display = 'block';
    updateCreateFavoriteMacros();
}

function updateCreateFavoriteMacros() {
    const macros = calculateFavoriteMacros(createFavoriteItems);
    document.getElementById('create-fav-cals').textContent = macros.calories;
    document.getElementById('create-fav-prot').textContent = macros.protein;
    document.getElementById('create-fav-carbs').textContent = macros.carbs;
    document.getElementById('create-fav-fat').textContent = macros.fat;
}

function createFavoriteMeal() {
    const name = document.getElementById('create-favorite-name').value.trim();
    const mealType = document.getElementById('create-favorite-type').value;
    
    if (!name) {
        showToast('Donnez un nom à votre favori', 'error');
        return;
    }
    
    if (createFavoriteItems.length === 0) {
        showToast('Ajoutez au moins un aliment', 'error');
        return;
    }
    
    const favorite = {
        id: 'fav-' + Date.now(),
        name: name,
        icon: selectedCreateFavoriteIcon,
        mealType: mealType,
        items: [...createFavoriteItems],
        createdAt: new Date().toISOString()
    };
    
    state.favoriteMeals.push(favorite);
    saveState();
    
    closeModal('create-favorite-modal');
    renderFavoritesList();
    showToast(`"${name}" créé ! ⭐`, 'success');
}

// ==================== APPLIQUER UN FAVORI ====================

function openApplyFavoriteModal(favoriteId) {
    const favorite = state.favoriteMeals.find(f => f.id === favoriteId);
    if (!favorite) return;
    
    currentFavoriteToApply = favorite;
    
    // Afficher les infos du favori
    const macros = calculateFavoriteMacros(favorite.items);
    const infoContainer = document.getElementById('apply-favorite-info');
    
    infoContainer.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 15px;">
            <span style="font-size: 2rem;">${favorite.icon}</span>
            <div>
                <div style="font-weight: 600; font-size: 1.1rem;">${favorite.name}</div>
                <div style="font-size: 0.85rem; color: var(--text-muted);">
                    ${favorite.items.length} aliment${favorite.items.length > 1 ? 's' : ''} • ${macros.calories} kcal
                </div>
            </div>
        </div>
        <div style="padding: 10px; background: var(--bg-tertiary); border-radius: 8px; font-size: 0.85rem;">
            ${favorite.items.map(item => {
                const food = state.foods.find(f => f.id === item.foodId);
                return food ? `<div style="padding: 3px 0;">${food.name} - ${item.quantity}g</div>` : '';
            }).join('')}
        </div>
    `;
    
    // Pré-sélectionner le type de repas si défini
    if (favorite.mealType && favorite.mealType !== 'any' && favorite.mealType !== 'all') {
        document.getElementById('apply-favorite-target').value = favorite.mealType;
    }
    
    openModal('apply-favorite-modal');
}

function confirmApplyFavorite() {
    if (!currentFavoriteToApply) return;
    
    const targetMeal = document.getElementById('apply-favorite-target').value;
    const mode = document.getElementById('apply-favorite-mode').value;
    
    // Préparer les aliments à ajouter
    const itemsToAdd = currentFavoriteToApply.items.map(item => {
        const food = state.foods.find(f => f.id === item.foodId);
        return food ? { food: food, quantity: item.quantity } : null;
    }).filter(Boolean);
    
    if (itemsToAdd.length === 0) {
        showToast('Aucun aliment valide dans ce favori', 'error');
        return;
    }
    
    // Appliquer selon le mode
    if (mode === 'replace') {
        state.dailyMenu[targetMeal] = itemsToAdd;
    } else {
        state.dailyMenu[targetMeal] = [...state.dailyMenu[targetMeal], ...itemsToAdd];
    }
    
    saveState();
    closeModal('apply-favorite-modal');
    
    // Rafraîchir l'affichage
    renderDailyMenu();
    updateMacroBars();
    
    // Aller à l'onglet Menu
    document.querySelector('[data-tab="menu"]').click();
    
    showToast(`"${currentFavoriteToApply.name}" ajouté au ${getTargetMealName(targetMeal)} !`, 'success');
}

function getTargetMealName(mealType) {
    const names = {
        'breakfast': 'petit-déjeuner',
        'lunch': 'déjeuner',
        'snack': 'collation',
        'dinner': 'dîner'
    };
    return names[mealType] || mealType;
}

// ==================== MODIFIER / SUPPRIMER ====================

function editFavorite(favoriteId) {
    const favorite = state.favoriteMeals.find(f => f.id === favoriteId);
    if (!favorite) return;
    
    // Pré-remplir la modal de création
    selectedCreateFavoriteIcon = favorite.icon || '🍳';
    createFavoriteItems = [...favorite.items];
    
    document.getElementById('create-favorite-name').value = favorite.name;
    document.getElementById('create-favorite-type').value = favorite.mealType;
    
    // Mettre à jour l'icône sélectionnée
    document.querySelectorAll('#create-favorite-icon-picker .icon-picker-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.icon === selectedCreateFavoriteIcon);
    });
    
    renderCreateFavoriteItems();
    
    // Supprimer l'ancien favori (sera recréé à la sauvegarde)
    state.favoriteMeals = state.favoriteMeals.filter(f => f.id !== favoriteId);
    
    openModal('create-favorite-modal');
}

function deleteFavorite(favoriteId) {
    const favorite = state.favoriteMeals.find(f => f.id === favoriteId);
    if (!favorite) return;
    
    if (!confirm(`Supprimer "${favorite.name}" des favoris ?`)) return;
    
    state.favoriteMeals = state.favoriteMeals.filter(f => f.id !== favoriteId);
    saveState();
    
    renderFavoritesList();
    showToast('Favori supprimé', 'success');
}

// ==================== INITIALISATION ====================

function initFavorites() {
    renderFavoritesList();
}
