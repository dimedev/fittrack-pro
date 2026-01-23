// ==================== NUTRITION MODULE ====================
// Version MVP - Journal uniquement (Menu du Jour supprimé)

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
    const searchTerm = document.getElementById('food-search')?.value?.toLowerCase() || '';
    
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
                        const isSelected = multiSelectModeActive && selectedFoodsFromBase.some(f => f.id === food.id);
                        const clickHandler = multiSelectModeActive 
                            ? `toggleFoodSelectionFromBase('${food.id}')` 
                            : `quickAddToJournal('${food.id}')`;
                        
                        return `
                            <div class="food-select-item ${multiSelectModeActive ? 'selectable' : ''} ${isSelected ? 'selected' : ''}" onclick="${clickHandler}">
                                ${multiSelectModeActive ? '<div class="food-check"></div>' : ''}
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
                                ${!defaultFoods.find(df => df.id === food.id) && !multiSelectModeActive ? `
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

// ==================== MULTI-SELECT MODE (BASE ALIMENTS) ====================

function toggleMultiSelectMode() {
    multiSelectModeActive = !multiSelectModeActive;
    selectedFoodsFromBase = [];
    
    // Update button UI
    const btn = document.getElementById('toggle-multiselect-btn');
    const icon = document.getElementById('multiselect-icon');
    const hint = document.getElementById('food-list-hint');
    const footer = document.getElementById('multiselect-footer');
    
    if (multiSelectModeActive) {
        btn.classList.add('active');
        btn.style.background = 'var(--accent-primary)';
        btn.style.color = 'var(--bg-primary)';
        icon.textContent = '☑';
        hint.innerHTML = '✓ Mode sélection activé - Choisissez plusieurs aliments';
        footer.style.display = 'flex';
    } else {
        btn.classList.remove('active');
        btn.style.background = '';
        btn.style.color = '';
        icon.textContent = '☐';
        hint.innerHTML = '💡 Cliquez sur un aliment pour l\'ajouter rapidement au journal du jour';
        footer.style.display = 'none';
    }
    
    // Re-render la liste
    renderFoodsList();
}

function toggleFoodSelectionFromBase(foodId) {
    const food = state.foods.find(f => f.id === foodId);
    if (!food) return;
    
    const existingIndex = selectedFoodsFromBase.findIndex(f => f.id === foodId);
    
    if (existingIndex >= 0) {
        selectedFoodsFromBase.splice(existingIndex, 1);
    } else {
        selectedFoodsFromBase.push(food);
    }
    
    // Update count
    const countEl = document.getElementById('multiselect-count');
    if (countEl) {
        countEl.textContent = selectedFoodsFromBase.length;
    }
    
    // Re-render liste
    renderFoodsList();
}

function addMultipleFromBase() {
    if (selectedFoodsFromBase.length === 0) {
        showToast('Aucun aliment sélectionné', 'warning');
        return;
    }
    
    // S'assurer qu'on est sur la date du jour
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('journal-date');
    if (dateInput) {
        dateInput.value = today;
    }
    
    // Ajouter tous les aliments
    selectedFoodsFromBase.forEach(food => {
        addToJournalDirect(food.id, 100);
    });
    
    showToast(`${selectedFoodsFromBase.length} aliment(s) ajouté(s) au journal`, 'success');
    
    // Reset
    selectedFoodsFromBase = [];
    multiSelectModeActive = false;
    const btn = document.getElementById('toggle-multiselect-btn');
    const icon = document.getElementById('multiselect-icon');
    const hint = document.getElementById('food-list-hint');
    const footer = document.getElementById('multiselect-footer');
    
    if (btn) {
        btn.classList.remove('active');
        btn.style.background = '';
        btn.style.color = '';
    }
    if (icon) icon.textContent = '☐';
    if (hint) hint.innerHTML = '💡 Cliquez sur un aliment pour l\'ajouter rapidement au journal du jour';
    if (footer) footer.style.display = 'none';
    
    // Re-render et passer au journal
    renderFoodsList();
    document.querySelector('[data-tab="journal"]')?.click();
}

// Ajout rapide au journal depuis la base d'aliments
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
    
    // Basculer vers l'onglet Journal
    document.querySelector('[data-tab="journal"]')?.click();
    
    showToast(`${food.name} ajouté au journal`, 'success');
}

function filterFoods() {
    renderFoodsList();
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
    const searchTerm = document.getElementById('journal-food-search').value.toLowerCase();
    const container = document.getElementById('journal-food-results');

    if (searchTerm.length < 2) {
        container.innerHTML = '';
        updateSelectedFoodsUI();
        return;
    }

    const results = state.foods.filter(f => f.name.toLowerCase().includes(searchTerm)).slice(0, 12);

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

    if (!state.foodJournal) state.foodJournal = {};
    if (!state.foodJournal[date]) state.foodJournal[date] = [];

    const entry = {
        foodId: food.id,
        quantity: quantity,
        addedAt: Date.now()
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
    // Maintenant, on utilise UNIQUEMENT le journal du jour
    const today = new Date().toISOString().split('T')[0];
    return calculateJournalMacros(today);
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
