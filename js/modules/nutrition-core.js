// ==================== NUTRITION CORE ====================
// Constants, calculs, CRUD, unit conversion
// Extrait de nutrition.js pour réduire sa taille

// ==================== CONSTANTES DE VALIDATION ====================
var MAX_CALORIES = 10000;     // kcal pour 100g
var MAX_MACRO = 1000;         // g pour 100g (protéines, glucides, lipides)
var MAX_NAME_LENGTH = 100;    // caractères pour nom d'aliment
var MAX_QUANTITY = 10000;     // g (10kg max par entrée)
var MIN_QUANTITY = 1;         // g minimum

// Variables pour sélection multiple
var selectedFoodsToAdd = [];
var multiSelectModeActive = false;
var selectedFoodsFromBase = [];

// Variables pour suggestions refresh
var suggestionRefreshCount = 0;
var MAX_SUGGESTION_REFRESHES = 2;
var shownSuggestionIds = [];

// Variables pour filtrage et tri avancés
var currentNutritionFilter = 'all';
var currentNutritionSort = 'relevance';

// ==================== ALIMENTS RÉCENTS (FAVORIS RAPIDES) ====================

var MAX_RECENT_FOODS = 10;

/**
 * Ajoute un aliment aux récents (favoris rapides)
 * @param {string} foodId - ID de l'aliment
 * @param {number} quantity - Quantité utilisée
 */
function addToRecentFoods(foodId, quantity) {
    if (!state.recentFoods) state.recentFoods = [];

    // Supprimer si déjà présent
    state.recentFoods = state.recentFoods.filter(r => r.foodId !== foodId);

    // Ajouter en premier
    state.recentFoods.unshift({
        foodId,
        lastQuantity: quantity,
        usedAt: Date.now(),
        usageCount: (state.recentFoods.find(r => r.foodId === foodId)?.usageCount || 0) + 1
    });

    // Garder seulement les 10 derniers
    state.recentFoods = state.recentFoods.slice(0, MAX_RECENT_FOODS);
}

/**
 * Récupère les aliments récents avec leurs détails
 * @returns {Array} Liste des aliments récents enrichis
 */
function getRecentFoodsWithDetails() {
    if (!state.recentFoods || state.recentFoods.length === 0) return [];

    return state.recentFoods
        .map(recent => {
            const food = state.foods.find(f => f.id === recent.foodId);
            if (!food) return null;
            return {
                ...food,
                lastQuantity: recent.lastQuantity,
                usedAt: recent.usedAt,
                usageCount: recent.usageCount
            };
        })
        .filter(Boolean);
}

// ==================== COPIE JOUR / REPAS ====================

async function copyDayTo(sourceDate, targetDate) {
    const sourceEntries = state.foodJournal[sourceDate] || [];
    if (sourceEntries.length === 0) {
        showToast('Jour source vide', 'error');
        return;
    }

    if (!state.foodJournal[targetDate]) {
        state.foodJournal[targetDate] = [];
    }

    // Copier toutes les entrées
    for (const entry of sourceEntries) {
        const newEntry = {
            foodId: entry.foodId,
            quantity: entry.quantity,
            mealType: entry.mealType,
            addedAt: Date.now(),
            copiedFrom: sourceDate
        };

        // Sync avec Supabase si connecté
        if (typeof isLoggedIn === 'function' && isLoggedIn()) {
            const supabaseId = await addJournalEntryToSupabase(targetDate, entry.foodId, entry.quantity, entry.mealType);
            if (supabaseId) newEntry.supabaseId = supabaseId;
        }

        state.foodJournal[targetDate].push(newEntry);
    }

    saveState();
    closeCopyDayModal();

    // Recharger le journal
    document.getElementById('journal-date').value = targetDate;
    loadJournalDay();

    showToast(`${sourceEntries.length} aliments copiés`, 'success');

    // Haptic feedback
    if (window.HapticFeedback) {
        window.HapticFeedback.success();
    }
}

/**
 * Ferme la modal de copie
 */
function closeCopyDayModal() {
    const modal = document.getElementById('copy-day-modal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
        if (window.ModalManager) ModalManager.unlock('copy-day-modal');
    }
}

/**
 * Copie un repas spécifique vers aujourd'hui
 */
async function copyMealToToday(sourceDate, mealType) {
    const today = new Date().toISOString().split('T')[0];
    const sourceEntries = (state.foodJournal[sourceDate] || [])
        .filter(e => e.mealType === mealType);

    if (sourceEntries.length === 0) {
        showToast('Repas vide', 'error');
        return;
    }

    if (!state.foodJournal[today]) {
        state.foodJournal[today] = [];
    }

    for (const entry of sourceEntries) {
        const newEntry = {
            foodId: entry.foodId,
            quantity: entry.quantity,
            mealType: mealType,
            addedAt: Date.now(),
            copiedFrom: sourceDate
        };

        if (typeof isLoggedIn === 'function' && isLoggedIn()) {
            const supabaseId = await addJournalEntryToSupabase(today, entry.foodId, entry.quantity, mealType);
            if (supabaseId) newEntry.supabaseId = supabaseId;
        }

        state.foodJournal[today].push(newEntry);
    }

    saveState();

    // Recharger si on est sur aujourd'hui
    const currentDate = document.getElementById('journal-date')?.value;
    if (currentDate === today) {
        loadJournalDay();
    }

    const mealName = MEAL_TYPES[mealType]?.label || mealType;
    showToast(`${mealName} copié`, 'success');
}

// ==================== CATÉGORIES & UNITÉS ====================

// Catégories d'aliments
var foodCategories = {
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
var UNIT_LABELS = {
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
        // Presets en grammes - plus d'options avec 100g comme défaut suggéré
        return [
            { value: 50, label: '50g', isDefault: false },
            { value: 100, label: '100g', isDefault: true }, // Défaut recommandé
            { value: 150, label: '150g', isDefault: false },
            { value: 200, label: '200g', isDefault: false },
            { value: 250, label: '250g', isDefault: false },
            { value: 300, label: '300g', isDefault: false }
        ];
    }

    // Presets en unités
    const unitWeight = food.unitWeight || 100;
    const unitLabel = food.unitLabel || '';

    // Générer des presets intelligents selon le type d'aliment
    const presets = [
        { value: unitWeight, label: `1 ${unitLabel}`, isDefault: true },
        { value: unitWeight * 2, label: `2 ${pluralizeFr(unitLabel, 2)}`, isDefault: false }
    ];

    // Pour les petites unités (œufs, tranches), ajouter plus d'options
    if (unitWeight < 80) {
        presets.push(
            { value: unitWeight * 3, label: `3 ${pluralizeFr(unitLabel, 3)}`, isDefault: false },
            { value: unitWeight * 4, label: `4 ${pluralizeFr(unitLabel, 4)}`, isDefault: false }
        );
    } else {
        presets.push(
            { value: unitWeight * 3, label: `3 ${pluralizeFr(unitLabel, 3)}`, isDefault: false }
        );
    }

    return presets;
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

// ==================== AJOUT AU JOURNAL ====================

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

// Ajouter directement au journal (sans UI) - OPTIMISTIC UPDATE
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

    // Générer un ID temporaire pour l'optimistic update
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const entry = {
        foodId: food.id,
        quantity: quantity,
        addedAt: Date.now(),
        mealType: mealType,
        isNew: true, // Marquer comme nouvelle pour l'animation
        _tempId: tempId, // ID temporaire pour rollback si erreur
        _pending: true // Marquer comme en attente de sync
    };

    // ========== OPTIMISTIC UPDATE ==========
    // 1. Ajouter immédiatement au state local
    state.foodJournal[date].push(entry);

    // Analytics
    window.track?.('food_logged', {
        meal_type: mealType,
        calories: Math.round((food.calories || 0) * quantity / 100),
        source: 'quick_add'
    });

    // 2. Ajouter aux aliments récents
    addToRecentFoods(food.id, quantity);

    // 3. Sauvegarder localement
    saveState();

    // 4. Mettre à jour l'UI immédiatement
    renderJournalEntries();
    updateJournalSummary();
    updateMacroRings();

    // 5. Retirer le flag isNew après l'animation
    setTimeout(() => {
        if (state.foodJournal[date]) {
            state.foodJournal[date].forEach(e => delete e.isNew);
        }
    }, 2000);

    // ========== BACKGROUND SYNC ==========
    // Sync avec Supabase en arrière-plan (non-bloquant)
    if (typeof isLoggedIn === 'function' && isLoggedIn()) {
        syncEntryToSupabase(date, entry, tempId).catch(error => {
            console.warn('Sync failed, entry queued:', error);
            // L'entrée reste en local avec _pending = true
            // Elle sera synchronisée plus tard via syncQueue
        });
    }
}

// ==================== SYNC SUPABASE ====================

/**
 * Synchronise une entrée avec Supabase en arrière-plan
 * Gère les erreurs et le rollback si nécessaire
 */
async function syncEntryToSupabase(date, entry, tempId) {
    try {
        const supabaseId = await addJournalEntryToSupabase(
            date,
            entry.foodId,
            entry.quantity,
            entry.mealType
        );

        if (supabaseId) {
            // Trouver l'entrée par son tempId et mettre à jour
            const entries = state.foodJournal[date];
            if (entries) {
                const idx = entries.findIndex(e => e._tempId === tempId);
                if (idx !== -1) {
                    entries[idx].supabaseId = supabaseId;
                    delete entries[idx]._tempId;
                    delete entries[idx]._pending;
                    saveState();
                    console.log('✅ Entry synced:', supabaseId);
                }
            }
        }
    } catch (error) {
        console.error('❌ Sync entry failed:', error);
        // Ajouter à la queue de sync pour retry ultérieur
        if (typeof addToSyncQueue === 'function') {
            addToSyncQueue('food_journal', 'insert', {
                date,
                foodId: entry.foodId,
                quantity: entry.quantity,
                mealType: entry.mealType,
                _tempId: tempId
            });
        }
        throw error; // Re-throw pour que l'appelant sache qu'il y a eu une erreur
    }
}

// ==================== CLEAR / CALCULS ====================

async function clearJournalDay() {
    const date = document.getElementById('journal-date').value;

    if (!state.foodJournal[date] || state.foodJournal[date].length === 0) {
        showToast('Le journal est déjà vide', 'error');
        return;
    }

    const entriesCount = state.foodJournal[date].length;
    let confirmed = false;

    if (typeof showConfirmModal === 'function') {
        confirmed = await showConfirmModal({
            title: 'Vider le journal ?',
            message: `Tous les aliments de cette journée seront supprimés.`,
            icon: '🗑️',
            confirmLabel: 'Vider',
            confirmType: 'danger',
            preview: `${entriesCount} entrée${entriesCount > 1 ? 's' : ''}`
        });
    } else {
        confirmed = confirm('Vider le journal de cette journée ?');
    }

    if (confirmed) {
        // Sauvegarder pour UNDO
        const journalBackup = [...state.foodJournal[date]];

        // Sync avec Supabase si connecté
        if (typeof isLoggedIn === 'function' && isLoggedIn()) {
            clearJournalDayInSupabase(date);
        }

        state.foodJournal[date] = [];
        saveState();
        renderJournalEntries();
        updateJournalSummary();
        updateMacroRings();

        // Enregistrer dans UndoManager
        if (typeof UndoManager !== 'undefined') {
            UndoManager.push(
                'clear-journal-day',
                { date, entries: journalBackup },
                (data) => {
                    // Restaurer toutes les entrées
                    state.foodJournal[data.date] = data.entries;
                    saveState();
                    // Re-sync avec Supabase
                    if (typeof isLoggedIn === 'function' && isLoggedIn() && typeof syncJournalDayToSupabase === 'function') {
                        syncJournalDayToSupabase(data.date, data.entries);
                    }
                    renderJournalEntries();
                    updateJournalSummary();
                    updateMacroRings();
                },
                `Journal vidé (${entriesCount} entrées)`
            );
        } else {
            showToast('Journal vidé', 'success');
        }
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

function calculateConsumedMacros() {
    // Maintenant, on utilise UNIQUEMENT le menu du jour
    const today = new Date().toISOString().split('T')[0];
    return calculateJournalMacros(today);
}

// ==================== CARDIO CALORIES ====================

function getTodayCardioCalories() {
    const date = new Date().toISOString().split('T')[0];
    const sessions = state.cardioLog?.[date] || [];
    return sessions.reduce((sum, s) => sum + (s.calories || 0), 0);
}

// ==================== AJOUT AVEC MEAL TYPE ====================

async function addToJournalWithMealType(foodId, quantity, mealType) {
    const date = document.getElementById('journal-date')?.value || new Date().toISOString().split('T')[0];
    const food = state.foods.find(f => f.id === foodId);

    if (!food) return;

    if (!state.foodJournal) state.foodJournal = {};
    if (!state.foodJournal[date]) state.foodJournal[date] = [];

    // Calculer les informations d'unités
    const unitType = food.unit || 'g';
    const unitCount = hasNaturalUnit(food) ? gramsToUnits(food, quantity) : null;

    // Générer un ID temporaire pour l'optimistic update
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const entry = {
        foodId: food.id,
        quantity: quantity, // Toujours en grammes
        addedAt: Date.now(),
        mealType: mealType,
        unitType: unitType,
        unitCount: unitCount,
        isNew: true, // Pour l'animation
        _tempId: tempId, // ID temporaire pour rollback
        _pending: true // Marquer comme en attente de sync
    };

    // ========== OPTIMISTIC UPDATE ==========
    // 1. Ajouter immédiatement au state local
    state.foodJournal[date].push(entry);

    // Analytics
    window.track?.('food_logged', {
        meal_type: mealType,
        calories: Math.round((food.calories || 0) * quantity / 100),
        source: 'journal'
    });

    // 2. Ajouter aux aliments récents
    addToRecentFoods(food.id, quantity);

    // 3. Sauvegarder localement
    saveState();

    // 4. Mettre à jour l'UI immédiatement
    renderMealsByType();
    updateJournalSummary();
    updateMacroRings();

    // 5. Animation sur le dernier item ajouté
    setTimeout(() => {
        const items = document.querySelectorAll(`#meal-items-${mealType} .meal-item`);
        const lastItem = items[items.length - 1];
        if (lastItem) {
            lastItem.classList.add('just-added');
            setTimeout(() => lastItem.classList.remove('just-added'), 600);
        }
    }, 50);

    // 6. Retirer le flag isNew après l'animation
    setTimeout(() => {
        if (state.foodJournal[date]) {
            const entryIdx = state.foodJournal[date].findIndex(e => e._tempId === tempId);
            if (entryIdx !== -1) {
                delete state.foodJournal[date][entryIdx].isNew;
            }
        }
    }, 2000);

    // 7. Vérifier si objectif atteint
    checkGoalReached();

    // 8. Toast immédiat
    showToast(`${food.name} ajouté !`, 'success');

    // ========== BACKGROUND SYNC ==========
    // Sync avec Supabase en arrière-plan (non-bloquant)
    if (typeof isLoggedIn === 'function' && isLoggedIn()) {
        syncEntryWithUnitsToSupabase(date, entry, tempId, unitType, unitCount).catch(error => {
            console.warn('Sync failed, entry queued:', error);
        });
    }

    // Mettre à jour le badge de sync
    if (typeof window.updatePendingSyncBadge === 'function') {
        window.updatePendingSyncBadge();
    }
}

/**
 * Synchronise une entrée avec unités vers Supabase en arrière-plan
 */
async function syncEntryWithUnitsToSupabase(date, entry, tempId, unitType, unitCount) {
    try {
        const supabaseId = await addJournalEntryToSupabase(
            date,
            entry.foodId,
            entry.quantity,
            entry.mealType,
            unitType,
            unitCount
        );

        if (supabaseId) {
            // Trouver l'entrée par son tempId et mettre à jour
            const entries = state.foodJournal[date];
            if (entries) {
                const idx = entries.findIndex(e => e._tempId === tempId);
                if (idx !== -1) {
                    entries[idx].supabaseId = supabaseId;
                    delete entries[idx]._tempId;
                    delete entries[idx]._pending;
                    saveState();
                    console.log('✅ Entry with units synced:', supabaseId);
                }
            }
        }
    } catch (error) {
        console.error('❌ Sync entry with units failed:', error);
        // Ajouter à la queue de sync pour retry ultérieur
        if (typeof addToSyncQueue === 'function') {
            addToSyncQueue('food_journal', 'insert', {
                date,
                foodId: entry.foodId,
                quantity: entry.quantity,
                mealType: entry.mealType,
                unitType,
                unitCount,
                _tempId: tempId
            });
        }
        throw error;
    }
}

// ==================== SHARED STATE (defineProperty) ====================

Object.defineProperty(window, 'selectedFoodsToAdd', { get: function() { return selectedFoodsToAdd; }, set: function(v) { selectedFoodsToAdd = v; }, configurable: true });
Object.defineProperty(window, 'multiSelectModeActive', { get: function() { return multiSelectModeActive; }, set: function(v) { multiSelectModeActive = v; }, configurable: true });

// ==================== WINDOW EXPORTS ====================
window.addToRecentFoods = addToRecentFoods;
window.getRecentFoodsWithDetails = getRecentFoodsWithDetails;
window.copyDayTo = copyDayTo;
window.closeCopyDayModal = closeCopyDayModal;
window.copyMealToToday = copyMealToToday;
window.foodCategories = foodCategories;
window.UNIT_LABELS = UNIT_LABELS;
window.pluralizeFr = pluralizeFr;
window.formatQuantityDisplay = formatQuantityDisplay;
window.getQuantityPresets = getQuantityPresets;
window.hasNaturalUnit = hasNaturalUnit;
window.unitsToGrams = unitsToGrams;
window.gramsToUnits = gramsToUnits;
window.addSelectedFoodsToJournal = addSelectedFoodsToJournal;
window.addToJournalDirect = addToJournalDirect;
window.syncEntryToSupabase = syncEntryToSupabase;
window.clearJournalDay = clearJournalDay;
window.calculateJournalMacros = calculateJournalMacros;
window.calculateConsumedMacros = calculateConsumedMacros;
window.getTodayCardioCalories = getTodayCardioCalories;
window.addToJournalWithMealType = addToJournalWithMealType;
window.syncEntryWithUnitsToSupabase = syncEntryWithUnitsToSupabase;

console.log('✅ nutrition-core.js: Constants, calculs, CRUD exportés');
