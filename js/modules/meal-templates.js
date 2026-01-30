// ==================== MEAL TEMPLATES MODULE ====================
// Templates de repas prédéfinis + combos favoris utilisateur
// Version Premium - UX Guidée

// ==================== CONSTANTES ====================

// Templates prédéfinis éditables
const MEAL_TEMPLATES = [
    {
        id: 'chicken-rice-broccoli',
        name: 'Poulet + Riz + Légumes',
        icon: '🍗',
        foods: [
            { foodId: 'chicken-breast', quantity: 150 },
            { foodId: 'rice-white', quantity: 150 },
            { foodId: 'broccoli', quantity: 100 }
        ],
        mealTypes: ['lunch', 'dinner'],
        editable: true,
        tags: ['protéiné', 'complet', 'sportif']
    },
    {
        id: 'oatmeal-banana-pb',
        name: 'Flocons + Banane + Beurre de Cacahuète',
        icon: '🥣',
        foods: [
            { foodId: 'oats', quantity: 60 },
            { foodId: 'banana', quantity: 120 },
            { foodId: 'peanut-butter', quantity: 20 }
        ],
        mealTypes: ['breakfast'],
        editable: true,
        tags: ['petit-déjeuner', 'énergie', 'rapide']
    },
    {
        id: 'eggs-toast-avocado',
        name: 'Oeufs + Pain + Avocat',
        icon: '🍳',
        foods: [
            { foodId: 'eggs', quantity: 100 },
            { foodId: 'bread-whole', quantity: 60 },
            { foodId: 'avocado', quantity: 100 }
        ],
        mealTypes: ['breakfast'],
        editable: true,
        tags: ['petit-déjeuner', 'protéiné', 'healthy']
    },
    {
        id: 'tuna-pasta-veggies',
        name: 'Pâtes + Thon + Légumes',
        icon: '🍝',
        foods: [
            { foodId: 'pasta', quantity: 120 },
            { foodId: 'tuna-canned', quantity: 100 },
            { foodId: 'tomato', quantity: 150 }
        ],
        mealTypes: ['lunch', 'dinner'],
        editable: true,
        tags: ['rapide', 'protéiné']
    },
    {
        id: 'greek-yogurt-fruits',
        name: 'Yaourt Grec + Fruits + Amandes',
        icon: '🥛',
        foods: [
            { foodId: 'greek-yogurt-0', quantity: 170 },
            { foodId: 'berries-mixed', quantity: 100 },
            { foodId: 'almonds', quantity: 20 }
        ],
        mealTypes: ['breakfast', 'snack'],
        editable: true,
        tags: ['protéiné', 'rapide', 'healthy']
    },
    {
        id: 'salmon-quinoa',
        name: 'Saumon + Quinoa + Asperges',
        icon: '🐟',
        foods: [
            { foodId: 'salmon', quantity: 150 },
            { foodId: 'quinoa', quantity: 120 },
            { foodId: 'asparagus', quantity: 150 }
        ],
        mealTypes: ['lunch', 'dinner'],
        editable: true,
        tags: ['complet', 'premium', 'oméga-3']
    },
    {
        id: 'protein-shake',
        name: 'Shake Protéiné + Banane',
        icon: '🥤',
        foods: [
            { foodId: 'whey-protein', quantity: 30 },
            { foodId: 'banana', quantity: 120 },
            { foodId: 'milk-semi', quantity: 250 }
        ],
        mealTypes: ['snack'],
        editable: true,
        tags: ['post-workout', 'rapide', 'protéiné']
    },
    {
        id: 'steak-sweet-potato',
        name: 'Steak + Patate Douce + Salade',
        icon: '🥩',
        foods: [
            { foodId: 'beef-steak', quantity: 150 },
            { foodId: 'sweet-potato', quantity: 200 },
            { foodId: 'mixed-salad', quantity: 100 }
        ],
        mealTypes: ['lunch', 'dinner'],
        editable: true,
        tags: ['complet', 'sportif', 'premium']
    }
];

// ==================== GESTION DES COMBOS FAVORIS ====================

/**
 * Sauvegarder le repas actuel comme combo favori
 * @param {string} mealType - Type de repas
 * @param {string} customName - Nom personnalisé (optionnel)
 */
function saveMealAsCombo(mealType, customName = null) {
    const date = document.getElementById('journal-date')?.value || new Date().toISOString().split('T')[0];
    const entries = state.foodJournal?.[date] || [];
    
    // Filtrer les entrées du repas actuel
    const mealEntries = entries.filter(e => (e.mealType || inferMealType(e.addedAt)) === mealType);
    
    if (mealEntries.length === 0) {
        showToast('Aucun aliment à sauvegarder', 'warning');
        return;
    }
    
    // Générer un nom si non fourni
    const foodNames = mealEntries.map(e => {
        const food = state.foods.find(f => f.id === e.foodId);
        return food ? food.name : '';
    }).filter(Boolean);
    
    const generatedName = customName || foodNames.slice(0, 3).join(' + ');
    
    // Créer le combo
    const combo = {
        id: `combo-${Date.now()}`,
        name: generatedName,
        icon: '⭐',
        foods: mealEntries.map(e => ({
            foodId: e.foodId,
            quantity: e.quantity
        })),
        mealTypes: [mealType],
        usageCount: 1,
        createdAt: Date.now(),
        lastUsed: Date.now()
    };
    
    // Ajouter au state
    if (!state.mealCombos) state.mealCombos = [];
    state.mealCombos.push(combo);
    saveState();
    
    // Sync Supabase si connecté
    if (typeof isLoggedIn === 'function' && isLoggedIn()) {
        saveMealComboToSupabase(combo);
    }
    
    showToast(`Combo "${generatedName}" sauvegardé !`, 'success');
}

/**
 * Appliquer un template de repas
 * @param {string} templateId - ID du template ou combo
 * @param {string} mealType - Type de repas
 */
async function applyTemplate(templateId, mealType) {
    // Chercher dans les templates prédéfinis
    let template = MEAL_TEMPLATES.find(t => t.id === templateId);
    
    // Ou dans les combos utilisateur
    if (!template) {
        template = state.mealCombos?.find(c => c.id === templateId);
    }
    
    if (!template) {
        showToast('Template introuvable', 'error');
        return;
    }
    
    // Ajouter chaque aliment du template
    for (const item of template.foods) {
        await addToJournalWithMealType(item.foodId, item.quantity, mealType);
    }
    
    // Mettre à jour usage count pour les combos
    if (template.usageCount !== undefined) {
        template.usageCount++;
        template.lastUsed = Date.now();
        saveState();
        
        // Sync Supabase
        updateMealComboUsageInSupabase(template.id, template.usageCount, template.lastUsed);
    }
    
    showToast(`"${template.name}" ajouté !`, 'success');
    
    // Fermer le sheet et refresh
    if (typeof closeMealSheet === 'function') closeMealSheet();
    if (typeof renderMealsByType === 'function') renderMealsByType();
    if (typeof updateJournalSummary === 'function') updateJournalSummary();
    if (typeof updateMacroRings === 'function') updateMacroRings();
    
    // Check goal
    if (typeof checkGoalReached === 'function') checkGoalReached();
}

// Variables globales pour l'édition
let editingTemplate = null;
let editedQuantities = {};
let editingMealType = null;

/**
 * Modifier un template (quantités)
 * @param {string} templateId - ID du template
 * @param {string} mealType - Type de repas
 */
function editTemplate(templateId, mealType) {
    // Chercher le template
    let template = MEAL_TEMPLATES.find(t => t.id === templateId);
    let isUserCombo = false;
    
    if (!template) {
        template = state.mealCombos?.find(c => c.id === templateId);
        isUserCombo = true;
    }
    
    if (!template) {
        showToast('Template introuvable', 'error');
        return;
    }
    
    // Sauvegarder pour l'édition
    editingTemplate = { ...template };
    editingMealType = mealType;
    editedQuantities = {};
    
    // Initialiser les quantités
    template.foods.forEach(item => {
        editedQuantities[item.foodId] = item.quantity;
    });
    
    // Afficher la modal
    openTemplateEditSheet(template);
}

/**
 * Ouvrir la modal d'édition
 */
function openTemplateEditSheet(template) {
    const sheet = document.getElementById('template-edit-sheet');
    const title = document.getElementById('template-edit-title');
    if (!sheet || !title) return;
    
    title.textContent = `Éditer: ${template.name}`;
    
    // Rendre les aliments éditables
    renderTemplateEditFoods(template);
    
    sheet.style.display = 'flex';
    setTimeout(() => sheet.classList.add('active'), 10);
}

/**
 * Rendre la liste des aliments avec inputs
 */
function renderTemplateEditFoods(template) {
    const container = document.getElementById('template-edit-foods');
    if (!container) return;
    
    container.innerHTML = template.foods.map(item => {
        const food = state.foods.find(f => f.id === item.foodId);
        if (!food) return '';
        
        const quantity = editedQuantities[item.foodId] || item.quantity;
        const calories = Math.round((food.calories * quantity) / 100);
        
        return `
            <div class="template-food-item" style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--bg-secondary); border-radius: var(--radius-md); margin-bottom: 8px;">
                <div style="flex: 1;">
                    <div style="font-weight: 600; margin-bottom: 4px;">${food.name}</div>
                    <div style="font-size: 0.85rem; color: var(--text-secondary);">${calories} kcal</div>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <button class="btn-icon" onclick="adjustTemplateQuantity('${item.foodId}', -10)" style="width: 32px; height: 32px;">-</button>
                    <input 
                        type="number" 
                        value="${quantity}" 
                        onchange="updateTemplateQuantity('${item.foodId}', this.value)"
                        style="width: 60px; text-align: center; padding: 4px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); background: var(--bg-primary); color: var(--text-primary); font-size: 0.95rem; font-weight: 600;"
                    >
                    <span style="color: var(--text-muted); font-size: 0.9rem;">g</span>
                    <button class="btn-icon" onclick="adjustTemplateQuantity('${item.foodId}', 10)" style="width: 32px; height: 32px;">+</button>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Ajuster la quantité d'un aliment
 */
function adjustTemplateQuantity(foodId, delta) {
    const current = editedQuantities[foodId] || 0;
    const newValue = Math.max(0, current + delta);
    editedQuantities[foodId] = newValue;
    
    // Re-rendre
    renderTemplateEditFoods(editingTemplate);
}

/**
 * Mettre à jour la quantité d'un aliment
 */
function updateTemplateQuantity(foodId, value) {
    const newValue = Math.max(0, parseFloat(value) || 0);
    editedQuantities[foodId] = newValue;
    
    // Re-rendre
    renderTemplateEditFoods(editingTemplate);
}

/**
 * Fermer la modal d'édition
 */
function closeTemplateEditSheet() {
    const sheet = document.getElementById('template-edit-sheet');
    if (!sheet) return;
    
    sheet.classList.remove('active');
    setTimeout(() => {
        sheet.style.display = 'none';
        editingTemplate = null;
        editedQuantities = {};
        editingMealType = null;
    }, 300);
}

/**
 * Appliquer le template avec les quantités modifiées
 */
async function applyEditedTemplate() {
    if (!editingTemplate || !editingMealType) return;
    
    // Ajouter chaque aliment avec les nouvelles quantités
    for (const item of editingTemplate.foods) {
        const quantity = editedQuantities[item.foodId] || item.quantity;
        if (quantity > 0) {
            await addToJournalWithMealType(item.foodId, quantity, editingMealType);
        }
    }
    
    showToast(`"${editingTemplate.name}" ajouté avec succès`, 'success');
    closeTemplateEditSheet();
    closeMealSheet();
}

/**
 * Sauvegarder comme nouveau combo avec les quantités modifiées
 */
async function saveEditedAsNewCombo() {
    if (!editingTemplate) return;
    
    // Créer un nouveau nom
    const baseName = editingTemplate.name;
    const newName = prompt(`Nom du nouveau combo:`, `${baseName} (modifié)`);
    
    if (!newName || newName.trim() === '') {
        return;
    }
    
    // Créer le nouveau combo
    const newCombo = {
        id: `user-combo-${Date.now()}`,
        name: newName.trim(),
        icon: editingTemplate.icon || '⭐',
        foods: editingTemplate.foods.map(item => ({
            foodId: item.foodId,
            quantity: editedQuantities[item.foodId] || item.quantity
        })),
        mealTypes: editingTemplate.mealTypes || ['breakfast', 'lunch', 'dinner', 'snack'],
        usageCount: 0,
        createdAt: new Date().toISOString(),
        lastUsed: null,
        editable: true
    };
    
    // Ajouter au state
    if (!state.mealCombos) state.mealCombos = [];
    state.mealCombos.push(newCombo);
    saveState();
    
    // Sync avec Supabase
    if (typeof saveMealComboToSupabase === 'function') {
        await saveMealComboToSupabase(newCombo);
    }
    
    showToast(`Combo "${newName}" créé !`, 'success');
    closeTemplateEditSheet();
    
    // Rafraîchir l'affichage
    if (currentMealType) {
        renderMealTemplates(currentMealType);
    }
}

/**
 * Supprimer un combo favori
 * @param {string} comboId - ID du combo
 */
function deleteCombo(comboId) {
    if (!state.mealCombos) return;
    
    const index = state.mealCombos.findIndex(c => c.id === comboId);
    if (index === -1) return;
    
    const combo = state.mealCombos[index];
    
    // Supprimer
    state.mealCombos.splice(index, 1);
    saveState();
    
    // Supprimer de Supabase
    if (typeof deleteMealComboFromSupabase === 'function') {
        deleteMealComboFromSupabase(comboId);
    }
    
    showToast(`"${combo.name}" supprimé`, 'success');
    
    // Refresh l'affichage
    if (currentMealType) {
        renderMealTemplates(currentMealType);
    }
}

/**
 * Afficher les templates et combos pour un repas
 * @param {string} mealType - Type de repas
 */
function renderMealTemplates(mealType) {
    const container = document.getElementById('meal-quick-list');
    if (!container) return;
    
    // Filtrer les templates adaptés au repas
    const templates = MEAL_TEMPLATES.filter(t => t.mealTypes.includes(mealType));
    
    // Ajouter les combos utilisateur
    const userCombos = (state.mealCombos || [])
        .filter(c => c.mealTypes.includes(mealType))
        .sort((a, b) => b.usageCount - a.usageCount) // Plus utilisés en premier
        .slice(0, 5); // Max 5 combos
    
    const allTemplates = [...templates, ...userCombos];
    
    if (allTemplates.length === 0) {
        container.innerHTML = '<div class="meal-empty">Aucun template disponible</div>';
        return;
    }
    
    container.innerHTML = allTemplates.map(template => {
        const isUserCombo = template.usageCount !== undefined;
        const totalCals = template.foods.reduce((sum, item) => {
            const food = state.foods.find(f => f.id === item.foodId);
            if (!food) return sum;
            return sum + Math.round((food.calories * item.quantity) / 100);
        }, 0);
        
        const editBtn = template.editable 
            ? `<button class="template-edit-btn" onclick="event.stopPropagation(); editTemplate('${template.id}', '${mealType}')" style="background: var(--bg-tertiary); border: none; padding: 6px 10px; border-radius: var(--radius-sm); cursor: pointer; font-size: 1.1rem; margin-right: 4px;">✏️</button>`
            : '';
        
        const deleteBtn = isUserCombo 
            ? `<button class="template-delete-btn" onclick="event.stopPropagation(); deleteCombo('${template.id}')" style="background: var(--bg-tertiary); border: none; padding: 6px 10px; border-radius: var(--radius-sm); cursor: pointer; font-size: 1.1rem;">🗑️</button>`
            : '';
        
        return `
            <div class="meal-quick-item template-item" onclick="applyTemplate('${template.id}', '${mealType}')">
                <div class="template-icon">${template.icon}</div>
                <div class="template-content">
                    <div class="template-name">${template.name}</div>
                    <div class="template-details">${totalCals} kcal · ${template.foods.length} aliments</div>
                    ${isUserCombo ? `<div class="template-usage">Utilisé ${template.usageCount} fois</div>` : ''}
                </div>
                <div style="display: flex; gap: 4px;">
                    ${editBtn}
                    ${deleteBtn}
                </div>
            </div>
        `;
    }).join('');
}

// ==================== SYNC SUPABASE ====================

async function saveMealComboToSupabase(combo) {
    if (!currentUser || !isOnline) return null;
    
    try {
        const { data, error } = await supabaseClient
            .from('meal_combos')
            .insert({
                user_id: currentUser.id,
                combo_id: combo.id,
                name: combo.name,
                icon: combo.icon,
                foods: JSON.stringify(combo.foods),
                meal_types: combo.mealTypes,
                usage_count: combo.usageCount,
                created_at: new Date(combo.createdAt).toISOString(),
                last_used: new Date(combo.lastUsed).toISOString()
            })
            .select()
            .single();
        
        if (error) throw error;
        return data.id;
    } catch (error) {
        console.error('Erreur sauvegarde combo:', error);
        return null;
    }
}

async function deleteMealComboFromSupabase(comboId) {
    if (!currentUser) return;
    if (!isOnline) {
        console.log('📴 Hors-ligne: suppression combo en attente');
        if (typeof addToSyncQueue === 'function') {
            addToSyncQueue('meal_combo', 'delete', { id: comboId });
        }
        return;
    }
    
    try {
        const { error } = await supabaseClient
            .from('meal_combos')
            .delete()
            .eq('user_id', currentUser.id)
            .eq('combo_id', comboId);
        
        if (error) throw error;
    } catch (error) {
        console.error('Erreur suppression combo:', error);
    }
}

async function updateMealComboUsageInSupabase(comboId, usageCount, lastUsed) {
    if (!currentUser) return;
    if (!isOnline) {
        console.log('📴 Hors-ligne: mise à jour combo en attente');
        if (typeof addToSyncQueue === 'function') {
            addToSyncQueue('meal_combo', 'update', { id: comboId, usageCount, lastUsed });
        }
        return;
    }
    
    try {
        await supabaseClient
            .from('meal_combos')
            .update({
                usage_count: usageCount,
                last_used: new Date(lastUsed).toISOString()
            })
            .eq('user_id', currentUser.id)
            .eq('combo_id', comboId);
    } catch (error) {
        console.warn('Erreur mise à jour usage combo:', error);
    }
}

async function loadMealCombosFromSupabase() {
    if (!currentUser || !isOnline) return [];
    
    try {
        const { data, error } = await supabaseClient
            .from('meal_combos')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('last_used', { ascending: false });
        
        if (error) throw error;
        
        return (data || []).map(row => ({
            id: row.combo_id,
            name: row.name,
            icon: row.icon,
            foods: JSON.parse(row.foods),
            mealTypes: row.meal_types,
            usageCount: row.usage_count,
            createdAt: new Date(row.created_at).getTime(),
            lastUsed: new Date(row.last_used).getTime()
        }));
    } catch (error) {
        console.error('Erreur chargement combos:', error);
        return [];
    }
}

// ==================== EXPORTS ====================

window.MealTemplates = {
    // Templates
    getAllTemplates: () => MEAL_TEMPLATES,
    getTemplatesForMeal: (mealType) => MEAL_TEMPLATES.filter(t => t.mealTypes.includes(mealType)),
    
    // Combos
    saveAsCombo: saveMealAsCombo,
    deleteCombo: deleteCombo,
    applyTemplate: applyTemplate,
    editTemplate: editTemplate,
    
    // Rendering
    render: renderMealTemplates,
    
    // Sync
    syncToSupabase: saveMealComboToSupabase,
    loadFromSupabase: loadMealCombosFromSupabase
};
