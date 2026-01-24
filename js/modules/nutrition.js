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

// ==================== BASE D'ALIMENTS ====================

// Afficher la liste des aliments (accordéon par catégorie)
function renderFoodsList() {
    const container = document.getElementById('foods-list');
    if (!container) return;
    
    const searchTerm = '';
    
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
        
        // État de l'accordéon (ouvert si recherche active)
        const isOpen = searchTerm.length > 0 || state.foodAccordionState[catId] === true;

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
                        return `
                            <div class="food-select-item" onclick="quickAddFromSearch('${food.id}')">
                                <div class="food-select-info">
                                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                        <strong>${food.name}</strong>
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

/**
 * Ouvrir le bottom sheet pour choisir la quantité
 */
function quickAddFromSearch(foodId) {
    const food = state.foods.find(f => f.id === foodId);
    if (!food) return;
    
    // Stocker l'aliment sélectionné
    selectedFoodForQuantity = food;
    currentQuantity = 100;
    
    // Remplir le bottom sheet
    document.getElementById('quantity-food-name').textContent = food.name;
    document.getElementById('quantity-macros-base').innerHTML = `
        <span>🔥 ${food.calories} kcal</span>
        <span>P: ${food.protein}g</span>
        <span>G: ${food.carbs}g</span>
        <span>L: ${food.fat}g</span>
    `;
    document.getElementById('custom-quantity-input').value = currentQuantity;
    
    // Mettre à jour le total
    updateQuantityTotal();
    
    // Afficher le bottom sheet avec animation iOS-like
    const sheet = document.getElementById('food-quantity-sheet');
    if (sheet) {
        sheet.style.display = 'flex';
        // Force reflow to trigger animation
        sheet.offsetHeight;
        sheet.classList.remove('animate-in');
        void sheet.offsetWidth;
        sheet.classList.add('animate-in');
        document.body.style.overflow = 'hidden';
    }
}

/**
 * Sélectionner un preset de quantité
 */
function selectQuantityPreset(quantity) {
    currentQuantity = quantity;
    document.getElementById('custom-quantity-input').value = quantity;
    updateQuantityTotal();
}

/**
 * Ajuster la quantité (+/-) avec validation
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
    
    const input = document.getElementById('custom-quantity-input');
    const quantity = parseInt(input.value) || 100;
    currentQuantity = quantity;
    
    const multiplier = quantity / 100;
    const calories = Math.round(selectedFoodForQuantity.calories * multiplier);
    const protein = Math.round(selectedFoodForQuantity.protein * multiplier * 10) / 10;
    const carbs = Math.round(selectedFoodForQuantity.carbs * multiplier * 10) / 10;
    const fat = Math.round(selectedFoodForQuantity.fat * multiplier * 10) / 10;
    
    document.getElementById('quantity-total-display').innerHTML = `
        <div style="font-size: 1.5rem; font-weight: 700; color: var(--accent-primary);">${calories} kcal</div>
        <div style="font-size: 0.9rem; color: var(--text-secondary); margin-top: 4px;">
            P: ${protein}g · G: ${carbs}g · L: ${fat}g
        </div>
    `;
}

/**
 * Confirmer et ajouter l'aliment au journal
 */
async function confirmAddFood() {
    if (!selectedFoodForQuantity) return;
    
    const quantity = parseInt(document.getElementById('custom-quantity-input').value) || 100;
    
    // Ajouter au journal
    await addToJournalDirect(selectedFoodForQuantity.id, quantity);
    
    // Toast
    showToast(`+${quantity}g de ${selectedFoodForQuantity.name} ajouté`, 'success', 3000);
    
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
            await saveCustomFoodToSupabase(food);
        }
        
        closeModal('custom-food-modal');
        renderFoodsList();
        showToast('Aliment ajouté !', 'success');
        
    } finally {
        if (btn) {
            btn.classList.remove('loading');
            btn.disabled = false;
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
    const date = document.getElementById('journal-date')?.value || new Date().toISOString().split('T')[0];
    const food = state.foods.find(f => f.id === foodId);

    if (!food) return;
    
    // Validation stricte de la quantité
    quantity = Math.max(MIN_QUANTITY, parseInt(quantity) || 100);
    if (quantity > MAX_QUANTITY) {
        showToast(`Quantité trop élevée (max ${MAX_QUANTITY/1000}kg)`, 'error');
        return;
    }

    if (!state.foodJournal) state.foodJournal = {};
    if (!state.foodJournal[date]) state.foodJournal[date] = [];

    const entry = {
        foodId: food.id,
        quantity: quantity,
        addedAt: Date.now(),
        isNew: true // Marquer comme nouvelle pour l'animation
    };
    
    // Sync avec Supabase si connecté
    if (typeof isLoggedIn === 'function' && isLoggedIn()) {
        const supabaseId = await addJournalEntryToSupabase(date, food.id, quantity);
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
        protein: Math.round(protein),
        carbs: Math.round(carbs),
        fat: Math.round(fat)
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
            valuesEl.textContent = `${bar.current} / ${bar.target}${bar.unit}`;
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
}

// Fonction de compatibilité pour l'ancien système (utilisée par updateMacroBars dans profile.js)
function calculateConsumedMacros() {
    // Maintenant, on utilise UNIQUEMENT le menu du jour
    const today = new Date().toISOString().split('T')[0];
    return calculateJournalMacros(today);
}

// Mettre à jour le sticky header avec calories restantes
function updateNutritionStickyHeader(macros, targets) {
    const caloriesRemaining = targets.calories - macros.calories;
    const caloriesRemainingEl = document.getElementById('sticky-cals-remaining');
    
    if (caloriesRemainingEl) {
        caloriesRemainingEl.textContent = `${caloriesRemaining} kcal`;
        
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
