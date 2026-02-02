// ==================== FITTRACK PRO - HYDRATION MODULE ====================
// Suivi de l'hydratation quotidienne

(function() {
    'use strict';

    // ==================== CONSTANTES ====================

    const QUICK_ADD_AMOUNTS = [250, 330, 500]; // ml - verre, canette, bouteille
    const DEFAULT_GOAL = 2500; // ml par jour
    const STORAGE_KEY = 'fittrack-hydration';

    // ==================== HELPER FUNCTIONS ====================

    function getTodayKey() {
        return new Date().toISOString().split('T')[0];
    }

    function getWaterGoal() {
        return state.profile?.waterGoal || DEFAULT_GOAL;
    }

    function getTodayHydration() {
        const today = getTodayKey();
        return state.hydration?.[today] || 0;
    }

    function setTodayHydration(amount) {
        const today = getTodayKey();
        if (!state.hydration) state.hydration = {};
        state.hydration[today] = Math.max(0, amount);
        saveState();

        // Sync avec Supabase si connecté
        if (window.saveHydrationToSupabase) {
            window.saveHydrationToSupabase(today, state.hydration[today]);
        }
    }

    // ==================== CORE FUNCTIONS ====================

    /**
     * Ajouter de l'eau (en ml)
     */
    function addWater(amount) {
        const current = getTodayHydration();
        const newAmount = current + amount;
        setTodayHydration(newAmount);

        // Haptic feedback
        if (window.HapticFeedback) {
            window.HapticFeedback.light();
        }

        // Toast feedback
        const goal = getWaterGoal();
        const percentage = Math.round((newAmount / goal) * 100);

        if (newAmount >= goal && current < goal) {
            // Objectif atteint !
            showToast('💧 Objectif hydratation atteint ! 🎉', 'success', 3000);
            if (window.HapticFeedback) {
                window.HapticFeedback.achievement();
            }
        } else {
            showToast(`💧 +${amount}ml (${percentage}% de l'objectif)`, 'info', 2000);
        }

        // Re-render le widget
        renderHydrationWidget();
    }

    /**
     * Retirer de l'eau (correction)
     */
    function removeWater(amount) {
        const current = getTodayHydration();
        setTodayHydration(current - amount);

        showToast(`💧 -${amount}ml retiré`, 'info', 2000);
        renderHydrationWidget();
    }

    /**
     * Définir une quantité personnalisée
     */
    function setCustomWater() {
        const input = document.getElementById('hydration-custom-input');
        if (!input) return;

        const amount = parseInt(input.value);
        if (isNaN(amount) || amount <= 0 || amount > 2000) {
            showToast('Entrez une quantité entre 1 et 2000ml', 'warning');
            return;
        }

        addWater(amount);
        input.value = '';

        // Fermer le modal custom
        const customSection = document.getElementById('hydration-custom-section');
        if (customSection) customSection.style.display = 'none';
    }

    /**
     * Toggle la section custom input
     */
    function toggleCustomInput() {
        const customSection = document.getElementById('hydration-custom-section');
        if (!customSection) return;

        const isVisible = customSection.style.display !== 'none';
        customSection.style.display = isVisible ? 'none' : 'flex';

        if (!isVisible) {
            const input = document.getElementById('hydration-custom-input');
            if (input) input.focus();
        }
    }

    // ==================== RENDER WIDGET ====================

    function renderHydrationWidget() {
        const container = document.getElementById('hydration-widget');
        if (!container) return;

        const current = getTodayHydration();
        const goal = getWaterGoal();
        const percentage = Math.min(100, Math.round((current / goal) * 100));
        const remaining = Math.max(0, goal - current);

        // Déterminer le status et la couleur
        let statusClass = '';
        let statusText = '';
        let waveColor = '#3b82f6'; // blue default

        if (percentage >= 100) {
            statusClass = 'hydration-complete';
            statusText = 'Objectif atteint !';
            waveColor = '#22c55e'; // green
        } else if (percentage >= 75) {
            statusClass = 'hydration-good';
            statusText = 'Presque là !';
            waveColor = '#3b82f6'; // blue
        } else if (percentage >= 50) {
            statusClass = 'hydration-mid';
            statusText = 'Continue !';
            waveColor = '#3b82f6'; // blue
        } else {
            statusClass = 'hydration-low';
            statusText = 'Bois plus !';
            waveColor = '#f59e0b'; // orange
        }

        container.innerHTML = `
            <div class="hydration-header">
                <div class="hydration-title">
                    <span class="icon">💧</span>
                    Hydratation
                </div>
                <span class="hydration-status ${statusClass}">${statusText}</span>
            </div>

            <div class="hydration-content">
                <!-- Progress Circle with Wave Animation -->
                <div class="hydration-progress ${statusClass}">
                    <svg class="hydration-ring" viewBox="0 0 100 100">
                        <!-- Background circle -->
                        <circle class="hydration-ring-bg" cx="50" cy="50" r="45" />
                        <!-- Progress circle -->
                        <circle class="hydration-ring-fill" cx="50" cy="50" r="45"
                            style="stroke-dasharray: ${percentage * 2.83}, 283; stroke: ${waveColor};" />
                    </svg>
                    <div class="hydration-value">
                        <span class="hydration-current">${formatMl(current)}</span>
                        <span class="hydration-unit">/ ${formatMl(goal)}</span>
                    </div>
                </div>

                <!-- Quick Add Buttons -->
                <div class="hydration-actions">
                    <div class="hydration-quick-btns">
                        ${QUICK_ADD_AMOUNTS.map(amount => `
                            <button class="hydration-quick-btn" onclick="window.Hydration.addWater(${amount})">
                                <span class="hydration-btn-icon">🥤</span>
                                <span class="hydration-btn-amount">+${amount}ml</span>
                            </button>
                        `).join('')}
                    </div>

                    <button class="hydration-custom-btn" onclick="window.Hydration.toggleCustomInput()">
                        <span>+</span> Autre quantité
                    </button>

                    <!-- Custom Input Section (hidden by default) -->
                    <div class="hydration-custom-section" id="hydration-custom-section" style="display: none;">
                        <input type="number"
                               id="hydration-custom-input"
                               class="form-input hydration-input"
                               placeholder="ml"
                               min="1"
                               max="2000"
                               inputmode="numeric">
                        <button class="btn btn-primary hydration-add-btn" onclick="window.Hydration.setCustomWater()">
                            Ajouter
                        </button>
                    </div>

                    <!-- Correction link -->
                    ${current > 0 ? `
                        <button class="hydration-correction-btn" onclick="window.Hydration.removeWater(250)">
                            Retirer 250ml (correction)
                        </button>
                    ` : ''}
                </div>
            </div>

            <!-- Mini stats -->
            <div class="hydration-footer">
                <div class="hydration-stat">
                    <span class="hydration-stat-value">${percentage}%</span>
                    <span class="hydration-stat-label">de l'objectif</span>
                </div>
                <div class="hydration-stat">
                    <span class="hydration-stat-value">${formatMl(remaining)}</span>
                    <span class="hydration-stat-label">restant</span>
                </div>
            </div>
        `;
    }

    /**
     * Format ml to L if > 1000
     */
    function formatMl(ml) {
        if (ml >= 1000) {
            return (ml / 1000).toFixed(1) + 'L';
        }
        return ml + 'ml';
    }

    // ==================== SETTINGS ====================

    /**
     * Mettre à jour l'objectif d'hydratation
     */
    function setWaterGoal(goalMl) {
        if (!state.profile) state.profile = {};
        state.profile.waterGoal = Math.max(500, Math.min(5000, goalMl));
        saveState();
        renderHydrationWidget();
        showToast(`Objectif hydratation: ${formatMl(goalMl)}`, 'success');
    }

    // ==================== EXPORT GLOBAL ====================

    window.Hydration = {
        addWater,
        removeWater,
        setCustomWater,
        toggleCustomInput,
        setWaterGoal,
        getTodayHydration,
        getWaterGoal,
        renderHydrationWidget
    };

    // Auto-render au chargement
    document.addEventListener('DOMContentLoaded', () => {
        // Délai pour s'assurer que le state est chargé
        setTimeout(renderHydrationWidget, 500);
    });

})();
