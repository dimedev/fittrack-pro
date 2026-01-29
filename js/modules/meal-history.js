// ==================== MEAL HISTORY MODULE ====================
// Permet de réutiliser les repas des jours précédents

/**
 * Obtenir l'historique des repas des 7 derniers jours
 */
function getMealHistory(days = 7) {
    const history = {};
    const today = new Date().toISOString().split('T')[0];
    
    // Parcourir les N derniers jours
    for (let i = 1; i <= days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        if (state.foodJournal[dateStr]) {
            const dayMeals = {};
            
            // Grouper par type de repas
            state.foodJournal[dateStr].forEach(entry => {
                const mealType = entry.mealType || 'snack';
                if (!dayMeals[mealType]) {
                    dayMeals[mealType] = [];
                }
                dayMeals[mealType].push(entry);
            });
            
            // Ne garder que les repas non vides
            if (Object.keys(dayMeals).length > 0) {
                history[dateStr] = dayMeals;
            }
        }
    }
    
    return history;
}

/**
 * Afficher la modal d'historique des repas
 */
function openMealHistoryModal(targetMealType = null) {
    const modal = document.getElementById('meal-history-modal');
    if (!modal) {
        console.error('Modal meal history introuvable');
        return;
    }
    
    // Haptic feedback
    if (window.HapticFeedback) {
        window.HapticFeedback.tap();
    }
    
    const history = getMealHistory(7);
    const historyDates = Object.keys(history).sort().reverse();
    
    if (historyDates.length === 0) {
        showToast('Aucun historique de repas trouvé', 'info');
        return;
    }
    
    // Rendre le contenu
    const content = modal.querySelector('.meal-history-content');
    content.innerHTML = renderMealHistory(history, historyDates, targetMealType);
    
    // Afficher la modal
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

/**
 * Fermer la modal d'historique
 */
function closeMealHistoryModal() {
    const modal = document.getElementById('meal-history-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

/**
 * Rendre l'historique des repas
 */
function renderMealHistory(history, dates, targetMealType) {
    const mealTypeLabels = {
        breakfast: { icon: '🌅', name: 'Petit-déjeuner' },
        lunch: { icon: '☀️', name: 'Déjeuner' },
        snack: { icon: '🍎', name: 'Collation' },
        dinner: { icon: '🌙', name: 'Dîner' }
    };
    
    let html = '<div class="meal-history-list">';
    
    dates.forEach(dateStr => {
        const date = new Date(dateStr + 'T12:00:00');
        const dayName = date.toLocaleDateString('fr-FR', { weekday: 'long' });
        const dayDate = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
        
        html += `
            <div class="meal-history-day">
                <div class="meal-history-day-header">
                    <span class="meal-history-day-name">${dayName}</span>
                    <span class="meal-history-day-date">${dayDate}</span>
                </div>
        `;
        
        const dayMeals = history[dateStr];
        
        // Parcourir les types de repas dans l'ordre
        ['breakfast', 'lunch', 'snack', 'dinner'].forEach(mealType => {
            if (!dayMeals[mealType] || dayMeals[mealType].length === 0) return;
            
            const mealInfo = mealTypeLabels[mealType];
            const entries = dayMeals[mealType];
            
            // Calculer les macros totales du repas
            let totalCals = 0;
            let totalProtein = 0;
            let totalCarbs = 0;
            let totalFat = 0;
            
            entries.forEach(entry => {
                const food = state.foods.find(f => f.id === entry.foodId);
                if (food) {
                    const quantity = entry.quantity || 100;
                    const factor = quantity / 100;
                    totalCals += food.calories * factor;
                    totalProtein += food.protein * factor;
                    totalCarbs += food.carbs * factor;
                    totalFat += food.fat * factor;
                }
            });
            
            // Lister les aliments
            const foodsText = entries.map(entry => {
                const food = state.foods.find(f => f.id === entry.foodId);
                if (!food) return '';
                
                const qtyDisplay = formatQuantityDisplay(food, entry.quantity || 100);
                return `${qtyDisplay} ${food.name}`;
            }).filter(Boolean).join(' • ');
            
            html += `
                <div class="meal-history-meal-card">
                    <div class="meal-history-meal-header">
                        <span class="meal-history-meal-icon">${mealInfo.icon}</span>
                        <span class="meal-history-meal-name">${mealInfo.name}</span>
                        <span class="meal-history-meal-count">${entries.length} aliment${entries.length > 1 ? 's' : ''}</span>
                    </div>
                    <div class="meal-history-meal-foods">${foodsText}</div>
                    <div class="meal-history-meal-macros">
                        <span>${Math.round(totalCals)} kcal</span>
                        <span>P: ${Math.round(totalProtein)}g</span>
                        <span>G: ${Math.round(totalCarbs)}g</span>
                        <span>L: ${Math.round(totalFat)}g</span>
                    </div>
                    <button 
                        class="btn-quick-add-meal" 
                        onclick="quickAddMealFromHistory('${dateStr}', '${mealType}', ${targetMealType ? `'${targetMealType}'` : 'null'})"
                    >
                        + Ajouter
                    </button>
                </div>
            `;
        });
        
        html += '</div>';
    });
    
    html += '</div>';
    
    return html;
}

/**
 * Ajouter rapidement un repas depuis l'historique
 */
async function quickAddMealFromHistory(sourceDate, sourceMealType, targetMealType = null) {
    if (!state.foodJournal[sourceDate]) {
        showToast('Repas introuvable', 'error');
        return;
    }
    
    // Filtrer les entrées du repas source
    const entries = state.foodJournal[sourceDate].filter(entry => 
        entry.mealType === sourceMealType
    );
    
    if (entries.length === 0) {
        showToast('Repas vide', 'error');
        return;
    }
    
    // Déterminer le type de repas cible (celui d'aujourd'hui ou celui spécifié)
    const today = new Date().toISOString().split('T')[0];
    const finalMealType = targetMealType || sourceMealType;
    
    // Ajouter chaque aliment au journal d'aujourd'hui
    for (const entry of entries) {
        await addToJournalWithMealType(entry.foodId, entry.quantity || 100, finalMealType);
    }
    
    // Haptic feedback
    if (window.HapticFeedback) {
        window.HapticFeedback.success();
    }
    
    // Toast de confirmation
    showToast(`✅ ${entries.length} aliment${entries.length > 1 ? 's' : ''} ajouté${entries.length > 1 ? 's' : ''}`, 'success', 2000);
    
    // Fermer la modal
    closeMealHistoryModal();
    
    // Rafraîchir l'UI
    if (typeof renderJournal === 'function') {
        renderJournal();
    }
}

/**
 * Formater l'affichage de quantité pour l'historique
 */
function formatQuantityDisplay(food, quantity) {
    if (!food) return `${quantity}g`;
    
    // Si unité naturelle
    if (food.unit && food.unitLabel && food.unitWeight) {
        const unitCount = Math.round(quantity / food.unitWeight);
        if (unitCount === 1) {
            return `1 ${food.unitLabel}`;
        }
        return `${unitCount} ${food.unitLabel}${unitCount > 1 ? 's' : ''}`;
    }
    
    return `${quantity}g`;
}

// Exporter les fonctions
window.MealHistory = {
    open: openMealHistoryModal,
    close: closeMealHistoryModal,
    quickAdd: quickAddMealFromHistory
};
