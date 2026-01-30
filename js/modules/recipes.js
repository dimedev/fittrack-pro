// ==================== RECIPES MODULE ====================
// Permet de créer et gérer des recettes composées

// Structure: state.recipes = { 'recipe-id': { name, ingredients: [{foodId, quantity}], ... } }

/**
 * Ouvrir la modal de création de recette avec animation iOS
 */
function openRecipeModal(recipeId = null) {
    const modal = document.getElementById('recipe-modal');
    if (!modal) {
        console.error('Modal recipe introuvable');
        return;
    }
    
    // Haptic feedback
    if (window.HapticFeedback) {
        window.HapticFeedback.tap();
    }
    
    // Mode édition ou création
    if (recipeId && state.recipes && state.recipes[recipeId]) {
        // Édition
        populateRecipeForm(state.recipes[recipeId]);
    } else {
        // Création
        resetRecipeForm();
    }
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // Animation slide-up iOS
    const container = modal.querySelector('.recipe-container');
    if (container) {
        container.classList.remove('slide-down');
        container.classList.add('slide-up');
        
        // Activer swipe-to-close
        enableRecipeSwipeToClose(modal, container);
    }
}

/**
 * Active le swipe-to-close sur la modal recette
 */
function enableRecipeSwipeToClose(modal, container) {
    if (container.dataset.swipeEnabled === 'true') return;
    container.dataset.swipeEnabled = 'true';
    
    let startY = 0;
    let currentY = 0;
    let isDragging = false;
    
    const header = container.querySelector('.recipe-header') || container;
    
    header.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
        isDragging = true;
        container.style.transition = 'none';
    }, { passive: true });
    
    header.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        currentY = e.touches[0].clientY;
        const deltaY = currentY - startY;
        
        if (deltaY > 0) {
            container.style.transform = `translateY(${deltaY}px)`;
        }
    }, { passive: true });
    
    header.addEventListener('touchend', () => {
        if (!isDragging) return;
        isDragging = false;
        
        container.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)';
        const deltaY = currentY - startY;
        
        if (deltaY > 100) {
            closeRecipeModal();
        } else {
            container.style.transform = '';
        }
        startY = 0;
        currentY = 0;
    }, { passive: true });
}

/**
 * Fermer la modal de recette avec animation
 */
function closeRecipeModal() {
    const modal = document.getElementById('recipe-modal');
    const container = modal?.querySelector('.recipe-container');
    
    if (!modal || !container) return;
    
    // Animation slide-down
    container.classList.remove('slide-up');
    container.classList.add('slide-down');
    
    // Attendre la fin de l'animation
    setTimeout(() => {
        modal.style.display = 'none';
        document.body.style.overflow = '';
        container.classList.remove('slide-down');
    }, 300);
}

/**
 * Réinitialiser le formulaire de recette
 */
function resetRecipeForm() {
    document.getElementById('recipe-name-input').value = '';
    document.getElementById('recipe-ingredients-list').innerHTML = '';
    document.getElementById('recipe-preview-macros').innerHTML = '';
}

/**
 * Remplir le formulaire pour édition
 */
function populateRecipeForm(recipe) {
    document.getElementById('recipe-name-input').value = recipe.name;
    
    // Afficher les ingrédients
    const list = document.getElementById('recipe-ingredients-list');
    list.innerHTML = recipe.ingredients.map((ing, idx) => {
        const food = state.foods.find(f => f.id === ing.foodId);
        if (!food) return '';
        
        return `
            <div class="recipe-ingredient-item" data-index="${idx}">
                <div class="recipe-ingredient-info">
                    <span class="recipe-ingredient-name">${food.name}</span>
                    <span class="recipe-ingredient-qty">${ing.quantity}g</span>
                </div>
                <button class="btn-icon btn-danger-icon" onclick="removeRecipeIngredient(${idx})">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        `;
    }).join('');
    
    updateRecipeMacros();
}

/**
 * Ouvrir le sélecteur d'aliments pour ajouter un ingrédient
 */
function openRecipeIngredientSelector() {
    // Afficher une bottom sheet avec la liste des aliments
    const sheet = document.getElementById('recipe-ingredient-sheet');
    if (!sheet) return;
    
    // Rendre la liste des aliments
    renderRecipeFoodsList();
    
    sheet.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

/**
 * Fermer le sélecteur d'ingrédients
 */
function closeRecipeIngredientSelector() {
    const sheet = document.getElementById('recipe-ingredient-sheet');
    if (sheet) {
        sheet.style.display = 'none';
        document.body.style.overflow = '';
    }
}

/**
 * Rendre la liste des aliments pour sélection
 */
function renderRecipeFoodsList() {
    const container = document.getElementById('recipe-foods-list');
    if (!container) return;
    
    // Grouper par catégorie
    const categories = {};
    state.foods.forEach(food => {
        const cat = food.category || 'other';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(food);
    });
    
    let html = '';
    Object.entries(categories).forEach(([catId, foods]) => {
        const catInfo = foodCategories[catId] || { name: 'Autre', icon: '📦' };
        
        html += `
            <div class="recipe-food-category">
                <div class="recipe-food-category-header">${catInfo.icon} ${catInfo.name}</div>
                ${foods.map(food => `
                    <div class="recipe-food-item" onclick="selectRecipeIngredient('${food.id}')">
                        <span>${food.name}</span>
                        <span class="recipe-food-cals">${food.calories} kcal</span>
                    </div>
                `).join('')}
            </div>
        `;
    });
    
    container.innerHTML = html;
}

/**
 * Sélectionner un ingrédient et demander la quantité
 */
function selectRecipeIngredient(foodId) {
    const food = state.foods.find(f => f.id === foodId);
    if (!food) return;
    
    const quantity = prompt(`Quantité de ${food.name} (en grammes) :`, '100');
    if (!quantity || isNaN(quantity) || quantity <= 0) return;
    
    addIngredientToRecipe(foodId, parseInt(quantity));
    closeRecipeIngredientSelector();
}

/**
 * Ajouter un ingrédient à la recette en cours de création
 */
function addIngredientToRecipe(foodId, quantity) {
    const food = state.foods.find(f => f.id === foodId);
    if (!food) return;
    
    const list = document.getElementById('recipe-ingredients-list');
    const currentCount = list.children.length;
    
    const html = `
        <div class="recipe-ingredient-item" data-index="${currentCount}">
            <div class="recipe-ingredient-info">
                <span class="recipe-ingredient-name">${food.name}</span>
                <span class="recipe-ingredient-qty">${quantity}g</span>
            </div>
            <button class="btn-icon btn-danger-icon" onclick="removeRecipeIngredient(${currentCount})">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
    `;
    
    list.innerHTML += html;
    
    // Stocker temporairement
    if (!window.tempRecipeIngredients) {
        window.tempRecipeIngredients = [];
    }
    window.tempRecipeIngredients.push({ foodId, quantity });
    
    updateRecipeMacros();
    
    // Haptic
    if (window.HapticFeedback) {
        window.HapticFeedback.success();
    }
}

/**
 * Retirer un ingrédient
 */
function removeRecipeIngredient(index) {
    if (window.tempRecipeIngredients) {
        window.tempRecipeIngredients.splice(index, 1);
    }
    
    const list = document.getElementById('recipe-ingredients-list');
    const items = Array.from(list.children);
    if (items[index]) {
        items[index].remove();
    }
    
    // Réindexer
    Array.from(list.children).forEach((item, idx) => {
        item.dataset.index = idx;
    });
    
    updateRecipeMacros();
}

/**
 * Mettre à jour les macros totales de la recette
 */
function updateRecipeMacros() {
    if (!window.tempRecipeIngredients || window.tempRecipeIngredients.length === 0) {
        document.getElementById('recipe-preview-macros').innerHTML = '<p style="color: var(--text-muted);">Ajoutez des ingrédients pour voir les macros</p>';
        return;
    }
    
    let totalCals = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    
    window.tempRecipeIngredients.forEach(ing => {
        const food = state.foods.find(f => f.id === ing.foodId);
        if (food) {
            const factor = ing.quantity / 100;
            totalCals += food.calories * factor;
            totalProtein += food.protein * factor;
            totalCarbs += food.carbs * factor;
            totalFat += food.fat * factor;
        }
    });
    
    document.getElementById('recipe-preview-macros').innerHTML = `
        <div class="recipe-macros-display">
            <div class="recipe-macro-item">
                <span class="recipe-macro-label">Calories</span>
                <span class="recipe-macro-value">${Math.round(totalCals)} kcal</span>
            </div>
            <div class="recipe-macro-item">
                <span class="recipe-macro-label">Protéines</span>
                <span class="recipe-macro-value">${Math.round(totalProtein * 10) / 10}g</span>
            </div>
            <div class="recipe-macro-item">
                <span class="recipe-macro-label">Glucides</span>
                <span class="recipe-macro-value">${Math.round(totalCarbs * 10) / 10}g</span>
            </div>
            <div class="recipe-macro-item">
                <span class="recipe-macro-label">Lipides</span>
                <span class="recipe-macro-value">${Math.round(totalFat * 10) / 10}g</span>
            </div>
        </div>
    `;
}

/**
 * Sauvegarder la recette
 */
async function saveRecipe() {
    const name = document.getElementById('recipe-name-input').value.trim();
    
    if (!name) {
        showToast('Entrez un nom de recette', 'warning');
        return;
    }
    
    if (!window.tempRecipeIngredients || window.tempRecipeIngredients.length === 0) {
        showToast('Ajoutez au moins un ingrédient', 'warning');
        return;
    }
    
    // Créer la recette
    const recipeId = 'recipe-' + Date.now();
    const recipe = {
        id: recipeId,
        name: name,
        ingredients: window.tempRecipeIngredients,
        createdAt: Date.now()
    };
    
    // Sauvegarder dans state
    if (!state.recipes) {
        state.recipes = {};
    }
    state.recipes[recipeId] = recipe;
    saveState();
    
    // Haptic
    if (window.HapticFeedback) {
        window.HapticFeedback.success();
    }
    
    showToast(`✅ Recette "${name}" créée !`, 'success');
    
    closeRecipeModal();
    window.tempRecipeIngredients = [];
}

// Exporter les fonctions au scope global
window.openRecipeModal = openRecipeModal;
window.closeRecipeModal = closeRecipeModal;
window.saveRecipe = saveRecipe;

// Namespace pour accès alternatif
window.Recipes = {
    open: openRecipeModal,
    close: closeRecipeModal,
    save: saveRecipe
};
