// ==================== NUTRITION UI ====================
// Rendering, affichage, interactions UI
// Dépend de : nutrition-core.js (constants, calculs, CRUD)

// ==================== ICÔNES PIT LANE (SVG inline) ====================
// stroke-width 2.2, currentColor — alignées avec le canon Pit Lane (brand red, no emoji)
const NUI_ICONS = {
    edit:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>',
    trash:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>',
    flame:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 17c1.38 0 2.5-1 2.5-2.5 0-1.38-.5-2-1-3-.42-.84-1-1.5-1-2.5 0-1.5 1-2.5 1-2.5s-2.5 0-4 2.5c-1 1.67-.5 3.5-.5 4.5 0 0-.5 0-.5 1z"/><path d="M16 14a4 4 0 0 1-4 4 4 4 0 0 1-4-4c0-1.95.85-3 1.6-4 .76-1 1.15-1.97 1.4-3.4 1 1 2 2 2 4 0 1 .5 2 1.5 2.5 1 .5 1.5-.5 1.5-2"/></svg>',
    chart:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
    clipboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="36" height="36"><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="15" y2="16"/></svg>',
    target:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
    trophy:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v6a5 5 0 0 1-10 0V4z"/><path d="M17 4h3v3a3 3 0 0 1-3 3"/><path d="M7 4H4v3a3 3 0 0 0 3 3"/></svg>',
    droplet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M12 2.5s6.5 6.5 6.5 11.5a6.5 6.5 0 1 1-13 0c0-5 6.5-11.5 6.5-11.5z"/></svg>'
};
// Expose pour autres modules (ex: nutrition.js consume)
window.NUI_ICONS = NUI_ICONS;

// ==================== ALIMENTS RÉCENTS ====================

function renderRecentFoodsSection() {
    // L'ancienne section #recent-foods-section est dépréciée par la quicklog-bar.
    // On la garde cachée et on alimente la nouvelle barre à la place.
    const container = document.getElementById('recent-foods-section');
    if (container) container.style.display = 'none';

    // Délègue à la nouvelle quicklog-bar
    if (typeof renderQuickLogBar === 'function') {
        renderQuickLogBar();
    }
}

// ==================== QUICK-LOG BAR (Pit Lane V3) ====================

/**
 * Auto-détecte le type de repas à partir de l'heure courante.
 * 6h–11h = breakfast, 11h–15h = lunch, 15h–19h = snack, 19h–6h = dinner
 */
function getCurrentMealTypeByHour(hour) {
    const h = (typeof hour === 'number') ? hour : new Date().getHours();
    if (h >= 6 && h < 11) return 'breakfast';
    if (h >= 11 && h < 15) return 'lunch';
    if (h >= 15 && h < 19) return 'snack';
    return 'dinner';
}

const _MEAL_LABELS = {
    breakfast: 'PETIT-DÉJ',
    lunch: 'DÉJEUNER',
    snack: 'COLLATION',
    dinner: 'DÎNER'
};
// Expose pour quickAddSearchResult dans nutrition.js (toast inline)
window._MEAL_LABELS_FR = _MEAL_LABELS;

/**
 * Rend la quicklog-bar (pill repas + strip recents).
 * Appelée à : init nutrition section, après chaque ajout, au focus de l'onglet.
 */
function renderQuickLogBar() {
    const bar = document.getElementById('nutrition-quicklog-bar');
    if (!bar) return;

    // Détecter le repas du moment (sauf si user a sélectionné une autre date)
    const journalDate = document.getElementById('journal-date')?.value;
    const todayStr = new Date().toISOString().split('T')[0];
    const isToday = !journalDate || journalDate === todayStr;
    const mealType = getCurrentMealTypeByHour();

    bar.dataset.mealType = mealType;
    const nameEl = document.getElementById('quicklog-meal-name');
    if (nameEl) {
        nameEl.textContent = isToday
            ? _MEAL_LABELS[mealType]
            : 'JOURNÉE';
    }

    // Rendre la strip de recents
    const strip = document.getElementById('quicklog-recent-strip');
    if (!strip) return;

    let recentFoods = [];
    if (typeof getRecentFoodsWithDetails === 'function') {
        recentFoods = getRecentFoodsWithDetails().slice(0, 8);
    }

    if (recentFoods.length === 0) {
        strip.innerHTML = '<div class="quicklog-empty">Aucun aliment récent · cherche pour commencer</div>';
        return;
    }

    strip.innerHTML = recentFoods.map(food => {
        const hasUnit = (typeof hasNaturalUnit === 'function') ? hasNaturalUnit(food) : false;
        let qtyDisplay;
        if (hasUnit) {
            const units = Math.max(1, Math.round(food.lastQuantity / food.unitWeight));
            qtyDisplay = `${units} ${food.unitLabel || 'unité'}`;
        } else {
            qtyDisplay = `${food.lastQuantity}g`;
        }
        // Escape simple pour les noms (juste guillemets)
        const safeName = (food.name || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        return `
            <button class="quicklog-chip" data-food-id="${food.id}"
                onclick="quickLogChip('${food.id}', ${food.lastQuantity})"
                aria-label="Ajouter ${safeName} ${qtyDisplay} au repas en cours">
                <span class="quicklog-chip-name">${food.name}</span>
                <span class="quicklog-chip-qty">${qtyDisplay}</span>
            </button>
        `;
    }).join('');
}

/**
 * Ajoute 1-tap un aliment recent au repas du moment (auto-détecté).
 * Affiche un toast de confirmation et flash le chip.
 */
async function quickLogChip(foodId, quantity) {
    const bar = document.getElementById('nutrition-quicklog-bar');
    const mealType = bar?.dataset.mealType || getCurrentMealTypeByHour();

    // FIX (V5-A) : cast en String — l'id arrive depuis l'attribut HTML (toujours string)
    // alors que state.foods[].id est number pour les défauts. Sans cast, find() retourne undefined.
    const targetId = String(foodId);
    const food = state.foods.find(f => String(f.id) === targetId);
    if (!food) {
        console.warn('[quickLogChip] Aliment introuvable, id:', foodId);
        if (typeof showToast === 'function') {
            showToast('Aliment introuvable', 'warning');
        }
        return;
    }

    // Haptic feedback
    if (window.HapticFeedback) HapticFeedback.success();

    // Flash visuel sur le chip cliqué
    const chip = bar?.querySelector(`.quicklog-chip[data-food-id="${foodId}"]`);
    if (chip) {
        chip.classList.remove('flash-success');
        // Force reflow pour rejouer l'animation
        void chip.offsetWidth;
        chip.classList.add('flash-success');
        setTimeout(() => chip.classList.remove('flash-success'), 600);
    }

    // Ajout au journal
    if (typeof addToJournalWithMealType === 'function') {
        await addToJournalWithMealType(foodId, quantity, mealType);
    } else if (typeof addToJournalDirect === 'function') {
        await addToJournalDirect(foodId, quantity);
    }

    // Toast confirmation discret
    const mealLabel = _MEAL_LABELS[mealType] || 'repas';
    const qtyText = (typeof formatQuantityDisplay === 'function')
        ? formatQuantityDisplay(food, quantity)
        : `${quantity}g`;
    if (typeof showToast === 'function') {
        showToast(`${qtyText} ${food.name} → ${mealLabel.toLowerCase()}`, 'success');
    }
}

/**
 * Ouvre le meal-add-sheet pré-réglé sur le repas en cours.
 * Pré-focus sur l'input recherche pour réduire à 1 clic supplémentaire.
 */
function openQuickLogSearch() {
    const bar = document.getElementById('nutrition-quicklog-bar');
    const mealType = bar?.dataset.mealType || getCurrentMealTypeByHour();

    if (window.HapticFeedback) HapticFeedback.tap();

    if (typeof openMealSheet === 'function') {
        openMealSheet(mealType);
        // Pré-focus l'input recherche après animation d'ouverture
        setTimeout(() => {
            const searchInput = document.getElementById('meal-food-search');
            if (searchInput) searchInput.focus();
        }, 350);
    }
}

// Exports
window.renderQuickLogBar = renderQuickLogBar;
window.quickLogChip = quickLogChip;
window.openQuickLogSearch = openQuickLogSearch;
window.getCurrentMealTypeByHour = getCurrentMealTypeByHour;

// ==================== LISTE DES ALIMENTS (ACCORDÉON) ====================

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
                                        ${hasUnit ? `<span class="food-unit-icon" style="display:inline-flex; align-items:center; color: var(--text-secondary);" title="Unité personnalisée">${NUI_ICONS.chart}</span>` : ''}
                                    </div>
                                    <div class="food-search-macros">
                                        <span class="kcal-pill" style="display:inline-flex; align-items:center; gap:4px;">${NUI_ICONS.flame} ${food.calories} kcal</span>
                                        <span>P: ${food.protein}g</span>
                                        <span>G: ${food.carbs}g</span>
                                        <span>L: ${food.fat}g</span>
                                    </div>
                                    ${hasUnit ? `<div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">${unitInfo}</div>` : ''}
                                </div>
                                <button class="food-btn icon-btn" onclick="event.stopPropagation(); deleteCustomFood('${food.id}')" title="Supprimer" aria-label="Supprimer">${NUI_ICONS.trash}</button>
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

// ==================== JOURNAL : INIT & CHARGEMENT ====================

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

    // Afficher les aliments récents
    renderRecentFoodsSection();

    // Mettre à jour les anneaux du dashboard
    updateMacroRings();
}

// ==================== JOURNAL : RENDU & ACTIONS ====================

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
                <div class="empty-state-icon" style="display:inline-flex; align-items:center; justify-content:center; color: var(--text-muted);">${NUI_ICONS.clipboard}</div>
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
                    <button class="journal-entry-delete icon-btn" onclick="removeFromJournal(${idx})" title="Supprimer" aria-label="Supprimer">
                        ${NUI_ICONS.trash}
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
                .catch(err => {
                    console.error('Erreur sync quantité:', err);
                    showToast('Erreur synchronisation quantité - modification sauvegardée localement', 'warning');
                });
        }

        renderJournalEntries();
        updateJournalSummary();
        updateMacroRings();
    }
}

// Supprimer une entrée du journal (avec UNDO)
function removeFromJournal(index) {
    // Protection double-clic rapide
    if (window._removingJournalEntry) return;
    window._removingJournalEntry = true;
    setTimeout(() => { window._removingJournalEntry = false; }, 500);

    const date = document.getElementById('journal-date').value;

    if (state.foodJournal[date]) {
        const entry = state.foodJournal[date][index];
        const entryName = entry?.name || 'Aliment';

        // Sauvegarder pour UNDO
        const entryData = { ...entry, journalDate: date, journalIndex: index };

        // Sync avec Supabase si connecté
        if (typeof isLoggedIn === 'function' && isLoggedIn() && entry.supabaseId) {
            deleteJournalEntryFromSupabase(entry.supabaseId);
        }

        state.foodJournal[date].splice(index, 1);
        saveState();
        renderJournalEntries();
        updateJournalSummary();
        updateMacroRings();

        // Enregistrer dans UndoManager
        if (typeof UndoManager !== 'undefined') {
            UndoManager.push(
                'delete-journal-entry',
                entryData,
                (data) => {
                    // Restaurer l'entrée dans le journal
                    const targetDate = data.journalDate;
                    if (!state.foodJournal[targetDate]) {
                        state.foodJournal[targetDate] = [];
                    }
                    // Retirer les propriétés temporaires
                    const { journalDate, journalIndex, ...cleanEntry } = data;
                    state.foodJournal[targetDate].push(cleanEntry);
                    saveState();
                    // Re-sync si connecté
                    if (typeof isLoggedIn === 'function' && isLoggedIn() && typeof syncJournalEntryToSupabase === 'function') {
                        syncJournalEntryToSupabase(cleanEntry, targetDate);
                    }
                    renderJournalEntries();
                    updateJournalSummary();
                    updateMacroRings();
                },
                `${entryName} supprimé`
            );
        } else {
            showToast('Aliment supprimé', 'success');
        }
    }
}

// ==================== RÉSUMÉ MACROS & STICKY HEADER ====================

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
                    <span class="deficit-icon" style="display:inline-flex; align-items:center; color: var(--accent-brand);">${NUI_ICONS.flame}</span>
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

// ==================== ANNEAUX MACROS & BARRES ====================

// Mettre à jour les anneaux de macros du dashboard
function updateMacroRings() {
    // Utiliser la date sélectionnée dans le journal, sinon aujourd'hui
    const selectedDate = document.getElementById('journal-date')?.value || new Date().toISOString().split('T')[0];
    const consumed = calculateJournalMacros(selectedDate);

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

    // NOUVEAU: Mettre à jour les anneaux SVG statiques de l'onglet Nutrition
    updateNutritionSVGRings(consumed, targets);

    // Carte "Pour atteindre ton objectif" dans le dashboard
    if (typeof renderNutritionGoalCard === 'function') {
        renderNutritionGoalCard();
    }
}

// Animer les progress rings SVG de l'onglet Nutrition
function updateNutritionSVGRings(consumed, targets) {
    const circumference = 2 * Math.PI * 50; // 314.159... (rayon = 50)

    const ringConfigs = [
        { ringId: 'ring-cals', valueId: 'ring-cals-value', containerId: 'ring-container-cals', value: consumed.calories, max: targets.calories },
        { ringId: 'ring-prot', valueId: 'ring-prot-value', containerId: 'ring-container-prot', value: consumed.protein, max: targets.protein },
        { ringId: 'ring-carbs', valueId: 'ring-carbs-value', containerId: 'ring-container-carbs', value: consumed.carbs, max: targets.carbs },
        { ringId: 'ring-fat', valueId: 'ring-fat-value', containerId: 'ring-container-fat', value: consumed.fat, max: targets.fat }
    ];

    ringConfigs.forEach(config => {
        const ring = document.getElementById(config.ringId);
        const valueEl = document.getElementById(config.valueId);
        const container = document.getElementById(config.containerId);

        if (!ring) return;

        const percentage = Math.min((config.value / config.max) * 100, 100);
        const offset = circumference - (percentage / 100) * circumference;

        // Animer le stroke-dashoffset
        ring.style.strokeDashoffset = offset;

        // Mettre à jour la valeur affichée
        if (valueEl) {
            valueEl.textContent = Math.round(config.value);
        }

        // Ajouter/retirer la classe "complete" pour le glow effect
        if (container) {
            const wasComplete = container.dataset.wasComplete === '1';
            const nowComplete = percentage >= 100;

            if (nowComplete) {
                container.classList.add('complete');
                // Déclencher le burst uniquement lors de la transition incomplete → complete
                if (!wasComplete) {
                    container.dataset.wasComplete = '1';
                    _triggerRingBurst(container);
                    if (window.HapticFeedback) HapticFeedback.success();
                }
            } else {
                container.classList.remove('complete');
                container.dataset.wasComplete = '';
            }
        }
    });

    // Pit Lane V3 : alimenter le Fuel Cockpit (kicker + hero remaining + meta + goals)
    updateFuelCockpit(consumed, targets);

    // Pit Lane V3 : refresh la quicklog-bar (recents peuvent avoir changé)
    if (typeof renderQuickLogBar === 'function') {
        renderQuickLogBar();
    }
}

/**
 * Alimente le Fuel Cockpit (kicker chronograph + hero calories restantes + état "over")
 * Gère 3 états :
 *   - empty : aucune entrée du jour → label "FUEL · 0 / 2400" + chiffre = goal
 *   - ok : consommation < goal → big number = remaining (positif)
 *   - over : consommation > goal → big number = écart négatif rouge + state "EXCÈS"
 */
function updateFuelCockpit(consumed, targets) {
    const cockpit = document.getElementById('fuel-cockpit');
    if (!cockpit) return;

    // Kicker : jour + date courte FR (Cockpit + Page header chronograph)
    const selectedDate = document.getElementById('journal-date')?.value;
    const dayLabelEl = document.getElementById('cockpit-day-label');
    const dateLabelEl = document.getElementById('cockpit-date-label');
    const headerDayEl = document.getElementById('nutrition-header-day-label');
    const headerDateEl = document.getElementById('nutrition-header-date-label');

    const todayStr = new Date().toISOString().split('T')[0];
    const target = selectedDate ? new Date(selectedDate + 'T12:00:00') : new Date();
    const isToday = !selectedDate || selectedDate === todayStr;

    const dayNames = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'];
    const monthNames = ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUI', 'JUI', 'AOÛ', 'SEP', 'OCT', 'NOV', 'DÉC'];
    const dayLabel = isToday ? "AUJOURD'HUI" : dayNames[target.getDay()];
    const dateLabel = `${target.getDate().toString().padStart(2, '0')} ${monthNames[target.getMonth()]}`;

    if (dayLabelEl) dayLabelEl.textContent = dayLabel;
    if (dateLabelEl) dateLabelEl.textContent = dateLabel;
    if (headerDayEl) headerDayEl.textContent = dayLabel;
    if (headerDateEl) headerDateEl.textContent = dateLabel;

    // Calcul restantes
    const goal = Math.max(0, Math.round(targets.calories || 0));
    const eaten = Math.max(0, Math.round(consumed.calories || 0));
    const remaining = goal - eaten;
    const isEmpty = eaten === 0;
    const isOver = remaining < 0;

    // Big number : restantes ou excès (avec signe -)
    const remainingEl = document.getElementById('cockpit-cals-remaining');
    const statusLabelEl = document.getElementById('cockpit-cals-status');
    if (remainingEl) {
        if (isOver) {
            // Affiche -123 (l'excès)
            remainingEl.textContent = remaining.toLocaleString('fr-FR');
        } else {
            remainingEl.textContent = remaining.toLocaleString('fr-FR');
        }
    }
    if (statusLabelEl) {
        if (isOver) statusLabelEl.textContent = 'EXCÈS';
        else if (isEmpty) statusLabelEl.textContent = 'BUDGET';
        else statusLabelEl.textContent = 'RESTANTES';
    }

    // Meta consommé / goal
    const consumedEl = document.getElementById('cockpit-cals-consumed');
    const goalEl = document.getElementById('cockpit-cals-goal');
    if (consumedEl) consumedEl.textContent = eaten.toLocaleString('fr-FR');
    if (goalEl) goalEl.textContent = goal.toLocaleString('fr-FR');

    // Goals des macros (P/G/L)
    const protGoalEl = document.getElementById('cockpit-prot-goal');
    const carbsGoalEl = document.getElementById('cockpit-carbs-goal');
    const fatGoalEl = document.getElementById('cockpit-fat-goal');
    if (protGoalEl) protGoalEl.textContent = Math.round(targets.protein || 0);
    if (carbsGoalEl) carbsGoalEl.textContent = Math.round(targets.carbs || 0);
    if (fatGoalEl) fatGoalEl.textContent = Math.round(targets.fat || 0);

    // Status pill (kicker top-right)
    const statusPill = document.getElementById('cockpit-status-pill');
    if (statusPill) {
        if (isOver) {
            statusPill.dataset.state = 'over';
            statusPill.textContent = 'EXCÈS';
        } else if (isEmpty) {
            statusPill.dataset.state = 'empty';
            statusPill.textContent = 'FUEL';
        } else {
            statusPill.dataset.state = 'ok';
            statusPill.textContent = 'FUEL';
        }
    }

    // État global du cockpit pour styles conditionnels
    cockpit.dataset.state = isOver ? 'over' : (isEmpty ? 'empty' : 'ok');
}

/**
 * Burst de 5 particules autour du ring quand il atteint 100%
 */
function _triggerRingBurst(container) {
    // Skip si prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    container.style.position = 'relative';

    const count = 5;
    for (let i = 0; i < count; i++) {
        const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
        const dist = 30 + Math.random() * 16;
        const tx = Math.cos(angle) * dist + 'px';
        const ty = Math.sin(angle) * dist + 'px';

        const p = document.createElement('span');
        p.className = 'ring-burst-particle';
        p.style.setProperty('--tx', tx);
        p.style.setProperty('--ty', ty);
        p.style.left = '50%';
        p.style.top = '50%';
        p.style.marginLeft = '-3px';
        p.style.marginTop = '-3px';
        p.style.animationDelay = (i * 30) + 'ms';
        container.appendChild(p);

        // Retirer après l'animation
        setTimeout(() => p.remove(), 600 + i * 30);
    }
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

// Toggle une section de repas
function toggleMealSection(mealType) {
    const section = document.querySelector(`.meal-section[data-meal="${mealType}"]`);
    if (!section) return;

    mealSectionStates[mealType] = !mealSectionStates[mealType];
    section.classList.toggle('expanded', mealSectionStates[mealType]);
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
                    <button class="meal-item-edit icon-btn" onclick="editMealItemQuantity('${mealType}', ${idx})" title="Modifier" aria-label="Modifier">${NUI_ICONS.edit}</button>
                    <button class="meal-item-delete icon-btn" onclick="removeMealItem('${mealType}', ${idx})" title="Supprimer" aria-label="Supprimer">${NUI_ICONS.trash}</button>
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

// ==================== CARDIO : RENDU ====================

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
                <button class="cardio-item-delete icon-btn" onclick="removeCardioSession(${idx})" title="Supprimer" aria-label="Supprimer">${NUI_ICONS.trash}</button>
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

// ==================== OBJECTIFS & CÉLÉBRATION ====================

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
            showGoalCelebration('Objectif protéines atteint !', 'target');
        }
    }

    // Célébrer si calories atteintes (90-110%)
    if (caloriePercent >= 90 && caloriePercent <= 110) {
        const key = `calories_goal_${new Date().toISOString().split('T')[0]}`;
        if (!sessionStorage.getItem(key)) {
            sessionStorage.setItem(key, 'true');
            showGoalCelebration('Objectif calories atteint !', 'trophy');
        }
    }
}

// Afficher une célébration
function showGoalCelebration(message, iconKey = 'trophy') {
    // Ne pas montrer si on a déjà célébré récemment
    if (document.querySelector('.goal-celebration')) return;

    const celebration = document.createElement('div');
    celebration.className = 'goal-celebration';
    const iconSvg = NUI_ICONS[iconKey] || NUI_ICONS.trophy;
    // Sécurité : le texte vient d'un appelant interne uniquement, mais on échappe par prudence
    const safeMsg = String(message)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    celebration.innerHTML = `<span class="goal-celebration-icon" style="display:inline-flex; vertical-align:middle; margin-right:8px; color: var(--accent-brand);">${iconSvg}</span><span class="goal-celebration-text">${safeMsg}</span>`;
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

// ==================== HYDRATATION ====================

/**
 * Affiche le widget d'hydratation
 */
function renderHydrationWidget() {
    const container = document.getElementById('hydration-widget');
    if (!container) return;

    const today = new Date().toISOString().split('T')[0];
    const consumed = state.hydration?.[today] || 0;
    const goal = state.profile?.waterGoal || 2500;
    const percentage = Math.min(100, Math.round((consumed / goal) * 100));

    container.innerHTML = `
        <div class="hydration-header">
            <div class="hydration-title">
                <span class="icon" style="display:inline-flex; align-items:center; color: var(--accent-brand); margin-right:6px;">${NUI_ICONS.droplet}</span>
                Hydratation
            </div>
            <div class="hydration-value">${consumed} / ${goal}ml</div>
        </div>
        <div class="hydration-progress-bar">
            <div class="hydration-progress-fill" style="width: ${percentage}%"></div>
        </div>
        <div class="hydration-actions">
            <button class="btn btn-sm btn-outline" onclick="addWater(250)">+250ml</button>
            <button class="btn btn-sm btn-outline" onclick="addWater(500)">+500ml</button>
            <button class="btn btn-sm btn-outline" onclick="openCustomWaterModal()">Custom</button>
        </div>
    `;
}

// ==================== WINDOW EXPORTS ====================
window.renderRecentFoodsSection = renderRecentFoodsSection;
window.renderFoodsList = renderFoodsList;
window.toggleCustomFoods = toggleCustomFoods;
window.toggleFoodCategory = toggleFoodCategory;
window.showFoodCounterBadge = showFoodCounterBadge;
window.resetFoodCounter = resetFoodCounter;
window.initJournal = initJournal;
window.loadJournalDay = loadJournalDay;
window.renderJournalEntries = renderJournalEntries;
window.updateJournalQuantity = updateJournalQuantity;
window.removeFromJournal = removeFromJournal;
window.updateJournalSummary = updateJournalSummary;
window.updateNutritionStickyHeader = updateNutritionStickyHeader;
window.initNutritionStickyScroll = initNutritionStickyScroll;
window.updateMacroRings = updateMacroRings;
window.updateNutritionSVGRings = updateNutritionSVGRings;
window.updateMacroBars = updateMacroBars;
window.toggleMealSection = toggleMealSection;
window.renderMealsByType = renderMealsByType;
window.renderMealItems = renderMealItems;
window.updateMealCalories = updateMealCalories;
window.updateMealItemQuantity = updateMealItemQuantity;
window.editMealItemQuantity = editMealItemQuantity;
window.removeMealItem = removeMealItem;
window.renderCardioItems = renderCardioItems;
window.updateCardioTotal = updateCardioTotal;
window.removeCardioSession = removeCardioSession;
window.checkGoalReached = checkGoalReached;
window.showGoalCelebration = showGoalCelebration;
window.renderCaloriesChart = renderCaloriesChart;
window.initKeyboardPaddingFix = initKeyboardPaddingFix;
window.resetKeyboardPaddingFix = resetKeyboardPaddingFix;
window.renderHydrationWidget = renderHydrationWidget;

// Exposer les variables module-level nécessaires
window.foodsAddedCount = foodsAddedCount;
Object.defineProperty(window, 'foodsAddedCount', {
    get: () => foodsAddedCount,
    set: (v) => { foodsAddedCount = v; },
    configurable: true
});
Object.defineProperty(window, 'currentCaloriesPeriod', {
    get: () => currentCaloriesPeriod,
    set: (v) => { currentCaloriesPeriod = v; },
    configurable: true
});
Object.defineProperty(window, 'caloriesChart', {
    get: () => caloriesChart,
    set: (v) => { caloriesChart = v; },
    configurable: true
});

console.log('✅ nutrition-ui.js: UI et rendu exportés');
