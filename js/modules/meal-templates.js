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

/**
 * Modifier un template (quantités)
 * @param {string} templateId - ID du template
 */
function editTemplate(templateId) {
    // Chercher le template
    let template = MEAL_TEMPLATES.find(t => t.id === templateId);
    let isUserCombo = false;
    
    if (!template) {
        template = state.mealCombos?.find(c => c.id === templateId);
        isUserCombo = true;
    }
    
    if (!template || !template.editable) {
        showToast('Ce template n\'est pas éditable', 'info');
        return;
    }
    
    // Ouvrir une modal d'édition (à implémenter dans l'UI si nécessaire)
    // Pour l'instant, toast simple
    showToast('Édition de templates à venir', 'info');
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
        
        const deleteBtn = isUserCombo 
            ? `<button class="template-delete-btn" onclick="event.stopPropagation(); deleteCombo('${template.id}')">🗑️</button>`
            : '';
        
        return `
            <div class="meal-quick-item template-item" onclick="applyTemplate('${template.id}', '${mealType}')">
                <div class="template-icon">${template.icon}</div>
                <div class="template-content">
                    <div class="template-name">${template.name}</div>
                    <div class="template-details">${totalCals} kcal · ${template.foods.length} aliments</div>
                    ${isUserCombo ? `<div class="template-usage">Utilisé ${template.usageCount} fois</div>` : ''}
                </div>
                ${deleteBtn}
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
    if (!currentUser || !isOnline) return;
    
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
