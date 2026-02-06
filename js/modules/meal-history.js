// ==================== MEAL HISTORY MODULE ====================
// Permet de réutiliser les repas des jours précédents

console.log('📦 meal-history.js: Script START');

// État de pagination
let mealHistoryState = {
    currentPage: 0,
    daysPerPage: 7,
    totalDays: 0,
    allDates: []
};

/**
 * Obtenir l'historique des repas avec pagination
 */
function getMealHistory(page = 0, daysPerPage = 7) {
    const history = {};
    const today = new Date().toISOString().split('T')[0];
    const allDates = [];
    
    // Scanner TOUS les jours disponibles (pour pagination)
    Object.keys(state.foodJournal || {}).forEach(dateStr => {
        if (dateStr < today && state.foodJournal[dateStr].length > 0) {
            allDates.push(dateStr);
        }
    });
    
    // Trier par date décroissante
    allDates.sort().reverse();
    mealHistoryState.allDates = allDates;
    mealHistoryState.totalDays = allDates.length;
    
    // Extraire la page demandée
    const startIdx = page * daysPerPage;
    const endIdx = startIdx + daysPerPage;
    const pageDates = allDates.slice(startIdx, endIdx);
    
    // Construire l'historique pour cette page
    pageDates.forEach(dateStr => {
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
    });
    
    return history;
}

/**
 * Afficher la modal d'historique des repas avec pagination
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
    
    // Reset pagination
    mealHistoryState.currentPage = 0;
    
    // Charger la première page
    loadMealHistoryPage(targetMealType);
    
    // Afficher la modal avec animation iOS
    modal.style.display = 'flex';
    if (window.ModalManager) ModalManager.lock('meal-history-modal');
    
    // Animation slide-up
    const container = modal.querySelector('.meal-history-container');
    if (container) {
        container.classList.remove('slide-down');
        container.classList.add('slide-up');
    }
    
    // Activer le swipe down pour fermer
    enableSwipeToClose(modal, container);
}

/**
 * Charger une page d'historique
 */
function loadMealHistoryPage(targetMealType = null, append = false) {
    const modal = document.getElementById('meal-history-modal');
    const content = modal.querySelector('.meal-history-content');
    
    const history = getMealHistory(mealHistoryState.currentPage, mealHistoryState.daysPerPage);
    const historyDates = Object.keys(history).sort().reverse();
    
    if (historyDates.length === 0 && mealHistoryState.currentPage === 0) {
        content.innerHTML = `
            <div class="empty-state" style="padding: 60px 20px; text-align: center;">
                <div class="empty-state-icon" style="font-size: 3rem; margin-bottom: 16px;">📅</div>
                <div class="empty-state-title">Aucun historique</div>
                <div class="empty-state-text">Vos repas passés apparaîtront ici</div>
            </div>
        `;
        return;
    }
    
    // Rendre le contenu
    const html = renderMealHistory(history, historyDates, targetMealType);
    
    if (append) {
        content.insertAdjacentHTML('beforeend', html);
    } else {
        content.innerHTML = html;
    }
    
    // Ajouter le bouton "Charger plus" si nécessaire
    const hasMore = (mealHistoryState.currentPage + 1) * mealHistoryState.daysPerPage < mealHistoryState.totalDays;
    
    if (hasMore) {
        const loadMoreBtn = `
            <div class="meal-history-load-more">
                <button class="btn btn-secondary" onclick="loadMoreMealHistory('${targetMealType}')">
                    Charger ${Math.min(7, mealHistoryState.totalDays - (mealHistoryState.currentPage + 1) * mealHistoryState.daysPerPage)} jours de plus
                </button>
                <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 8px; text-align: center;">
                    ${(mealHistoryState.currentPage + 1) * mealHistoryState.daysPerPage} / ${mealHistoryState.totalDays} jours affichés
                </p>
            </div>
        `;
        content.insertAdjacentHTML('beforeend', loadMoreBtn);
    }
}

/**
 * Charger plus de jours
 */
function loadMoreMealHistory(targetMealType = null) {
    mealHistoryState.currentPage++;
    loadMealHistoryPage(targetMealType, true);
    
    if (window.HapticFeedback) {
        window.HapticFeedback.light();
    }
}

/**
 * Activer le swipe down pour fermer
 */
function enableSwipeToClose(modal, container) {
    let startY = 0;
    let currentY = 0;
    let isDragging = false;
    
    const handleTouchStart = (e) => {
        const touch = e.touches[0];
        startY = touch.clientY;
        
        // Seulement si on commence le swipe dans le header
        const isInHeader = e.target.closest('.meal-history-header');
        if (isInHeader || container.scrollTop === 0) {
            isDragging = true;
        }
    };
    
    const handleTouchMove = (e) => {
        if (!isDragging) return;
        
        const touch = e.touches[0];
        currentY = touch.clientY;
        const deltaY = currentY - startY;
        
        // Seulement swipe vers le bas
        if (deltaY > 0) {
            e.preventDefault();
            container.style.transform = `translateY(${deltaY}px)`;
            container.style.transition = 'none';
        }
    };
    
    const handleTouchEnd = () => {
        if (!isDragging) return;
        
        const deltaY = currentY - startY;
        
        // Si swipe > 100px, fermer
        if (deltaY > 100) {
            closeMealHistoryModal();
        } else {
            // Revenir à la position
            container.style.transform = '';
            container.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)';
        }
        
        isDragging = false;
    };
    
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
}

/**
 * Fermer la modal d'historique avec animation
 */
function closeMealHistoryModal() {
    const modal = document.getElementById('meal-history-modal');
    const container = modal?.querySelector('.meal-history-container');
    
    if (!modal || !container) return;
    
    // Animation slide-down
    container.classList.remove('slide-up');
    container.classList.add('slide-down');
    
    // Attendre la fin de l'animation
    setTimeout(() => {
        modal.style.display = 'none';
        if (window.ModalManager) ModalManager.unlock('meal-history-modal');
        container.classList.remove('slide-down');
    }, 300);
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

// Exporter les fonctions au scope global
window.openMealHistoryModal = openMealHistoryModal;
window.closeMealHistoryModal = closeMealHistoryModal;
window.loadMoreMealHistory = loadMoreMealHistory;

// Namespace pour accès alternatif
window.MealHistory = {
    open: openMealHistoryModal,
    close: closeMealHistoryModal,
    quickAdd: quickAddMealFromHistory
};

console.log('✅ meal-history.js: Exports done, openMealHistoryModal =', typeof window.openMealHistoryModal);
