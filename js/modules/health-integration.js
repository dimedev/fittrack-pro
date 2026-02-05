// ==================== HEALTH INTEGRATION MODULE ====================
// Intégration avec Apple Health / Google Fit via Web APIs et export
// Version: 1.0.0

(function() {
    'use strict';

    // ==================== CONFIGURATION ====================

    const HEALTH_CONFIG = {
        // Types de données supportés
        dataTypes: {
            WORKOUT: 'workout',
            WEIGHT: 'bodyMass',
            NUTRITION: 'dietaryEnergy',
            STEPS: 'stepCount',
            ACTIVE_ENERGY: 'activeEnergyBurned'
        },
        // Mapping des types d'entraînement vers Apple Health
        workoutTypes: {
            'Push': 'traditionalStrengthTraining',
            'Pull': 'traditionalStrengthTraining',
            'Legs': 'traditionalStrengthTraining',
            'Upper': 'traditionalStrengthTraining',
            'Lower': 'traditionalStrengthTraining',
            'Full Body': 'traditionalStrengthTraining',
            'Chest': 'traditionalStrengthTraining',
            'Back': 'traditionalStrengthTraining',
            'Shoulders': 'traditionalStrengthTraining',
            'Arms': 'traditionalStrengthTraining',
            'running': 'running',
            'cycling': 'cycling',
            'walking': 'walking',
            'swimming': 'swimming',
            'boxing': 'boxing'
        }
    };

    // État de l'intégration
    let healthState = {
        isAvailable: false,
        isAuthorized: false,
        lastSync: null,
        pendingExports: []
    };

    // ==================== DÉTECTION DES CAPACITÉS ====================

    /**
     * Vérifie si l'intégration santé est disponible
     * Note: L'API Web Health n'est pas encore standardisée
     * On prépare l'infrastructure pour une future intégration
     */
    function checkHealthAvailability() {
        // Vérifier si on est sur iOS (Safari) avec potentiel support
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

        // Vérifier Android pour Google Fit
        const isAndroid = /Android/.test(navigator.userAgent);

        // L'API Web Health n'est pas encore disponible, mais on prépare
        const hasWebHealth = 'health' in navigator;

        healthState.isAvailable = hasWebHealth || isIOS || isAndroid;
        healthState.platform = isIOS ? 'ios' : (isAndroid ? 'android' : 'web');

        console.log('🏥 Health Integration:', {
            available: healthState.isAvailable,
            platform: healthState.platform,
            hasWebHealth
        });

        return healthState.isAvailable;
    }

    /**
     * Demande l'autorisation d'accès aux données de santé
     * Pour l'instant, simule l'autorisation car l'API n'est pas disponible
     */
    async function requestHealthAuthorization() {
        if (!healthState.isAvailable) {
            return { success: false, reason: 'Health integration not available' };
        }

        // Simuler la demande d'autorisation
        // Dans une vraie implémentation, on utiliserait l'API native
        try {
            // Stocker le consentement utilisateur
            const consent = await showHealthConsentModal();

            if (consent) {
                healthState.isAuthorized = true;
                localStorage.setItem('repzy-health-authorized', 'true');
                localStorage.setItem('repzy-health-consent-date', new Date().toISOString());

                showToast('✅ Intégration Santé activée', 'success');
                return { success: true };
            }

            return { success: false, reason: 'User declined' };
        } catch (error) {
            console.error('Health authorization error:', error);
            return { success: false, reason: error.message };
        }
    }

    /**
     * Affiche la modal de consentement pour l'intégration santé
     */
    function showHealthConsentModal() {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal-overlay active';
            modal.id = 'health-consent-modal';

            modal.innerHTML = `
                <div class="modal" style="max-width: 400px;">
                    <div class="modal-header">
                        <h3>🏥 Intégration Santé</h3>
                    </div>
                    <div class="modal-body">
                        <div style="text-align: center; margin-bottom: 20px;">
                            <div style="font-size: 48px; margin-bottom: 12px;">
                                ${healthState.platform === 'ios' ? '❤️' : '💚'}
                            </div>
                            <p style="color: var(--text-secondary); font-size: 14px;">
                                ${healthState.platform === 'ios'
                                    ? 'Connectez Repzy à Apple Health pour synchroniser vos entraînements et votre nutrition.'
                                    : healthState.platform === 'android'
                                        ? 'Connectez Repzy à Google Fit pour synchroniser vos données.'
                                        : 'Exportez vos données au format compatible avec les apps de santé.'}
                            </p>
                        </div>

                        <div style="background: var(--bg-tertiary); border-radius: 12px; padding: 16px; margin-bottom: 16px;">
                            <h4 style="font-size: 14px; margin-bottom: 12px; color: var(--text-primary);">
                                Données partagées :
                            </h4>
                            <ul style="margin: 0; padding-left: 20px; color: var(--text-secondary); font-size: 13px;">
                                <li>Séances d'entraînement (durée, calories)</li>
                                <li>Poids corporel</li>
                                <li>Apports nutritionnels</li>
                                <li>Séances de cardio</li>
                            </ul>
                        </div>

                        <p style="font-size: 12px; color: var(--text-muted); text-align: center;">
                            Vous pouvez désactiver cette intégration à tout moment dans les paramètres.
                        </p>
                    </div>
                    <div class="modal-footer" style="display: flex; gap: 12px;">
                        <button class="btn btn-secondary" id="health-consent-decline" style="flex: 1;">
                            Plus tard
                        </button>
                        <button class="btn btn-primary" id="health-consent-accept" style="flex: 1;">
                            Activer
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            document.getElementById('health-consent-accept').onclick = () => {
                modal.remove();
                resolve(true);
            };

            document.getElementById('health-consent-decline').onclick = () => {
                modal.remove();
                resolve(false);
            };

            modal.onclick = (e) => {
                if (e.target === modal) {
                    modal.remove();
                    resolve(false);
                }
            };
        });
    }

    // ==================== EXPORT DES DONNÉES ====================

    /**
     * Exporte une séance d'entraînement au format Apple Health
     */
    function exportWorkoutToHealth(session) {
        if (!session) return null;

        const workoutType = HEALTH_CONFIG.workoutTypes[session.dayType] || 'traditionalStrengthTraining';
        const startDate = new Date(session.timestamp || session.date);
        const endDate = new Date(startDate.getTime() + (session.duration || 60) * 60 * 1000);

        // Calculer les calories brûlées (estimation)
        const caloriesBurned = estimateCaloriesBurned(session);

        return {
            type: 'HKWorkout',
            workoutActivityType: workoutType,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            duration: (session.duration || 60) * 60, // en secondes
            totalEnergyBurned: {
                unit: 'kcal',
                value: caloriesBurned
            },
            metadata: {
                source: 'Repzy',
                sessionId: session.sessionId || session.id,
                dayType: session.dayType,
                program: session.program,
                totalVolume: session.totalVolume || 0,
                exerciseCount: session.exercises?.length || 0
            }
        };
    }

    /**
     * Exporte le poids corporel au format Apple Health
     */
    function exportWeightToHealth(weightEntry) {
        if (!weightEntry) return null;

        return {
            type: 'HKQuantitySample',
            quantityType: 'bodyMass',
            startDate: new Date(weightEntry.date).toISOString(),
            endDate: new Date(weightEntry.date).toISOString(),
            quantity: {
                unit: 'kg',
                value: weightEntry.weight
            },
            metadata: {
                source: 'Repzy'
            }
        };
    }

    /**
     * Exporte les données nutritionnelles au format Apple Health
     */
    function exportNutritionToHealth(date, totals) {
        if (!totals) return null;

        const samples = [];
        const dateStr = new Date(date).toISOString();

        // Calories
        if (totals.calories > 0) {
            samples.push({
                type: 'HKQuantitySample',
                quantityType: 'dietaryEnergyConsumed',
                startDate: dateStr,
                endDate: dateStr,
                quantity: { unit: 'kcal', value: totals.calories },
                metadata: { source: 'Repzy' }
            });
        }

        // Protéines
        if (totals.protein > 0) {
            samples.push({
                type: 'HKQuantitySample',
                quantityType: 'dietaryProtein',
                startDate: dateStr,
                endDate: dateStr,
                quantity: { unit: 'g', value: totals.protein },
                metadata: { source: 'Repzy' }
            });
        }

        // Glucides
        if (totals.carbs > 0) {
            samples.push({
                type: 'HKQuantitySample',
                quantityType: 'dietaryCarbohydrates',
                startDate: dateStr,
                endDate: dateStr,
                quantity: { unit: 'g', value: totals.carbs },
                metadata: { source: 'Repzy' }
            });
        }

        // Lipides
        if (totals.fat > 0) {
            samples.push({
                type: 'HKQuantitySample',
                quantityType: 'dietaryFatTotal',
                startDate: dateStr,
                endDate: dateStr,
                quantity: { unit: 'g', value: totals.fat },
                metadata: { source: 'Repzy' }
            });
        }

        return samples;
    }

    /**
     * Exporte une séance de cardio au format Apple Health
     */
    function exportCardioToHealth(cardioSession) {
        if (!cardioSession) return null;

        const workoutType = HEALTH_CONFIG.workoutTypes[cardioSession.type] || 'other';
        const startDate = new Date(cardioSession.date);
        const endDate = new Date(startDate.getTime() + cardioSession.duration * 60 * 1000);

        return {
            type: 'HKWorkout',
            workoutActivityType: workoutType,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            duration: cardioSession.duration * 60,
            totalEnergyBurned: {
                unit: 'kcal',
                value: cardioSession.calories || 0
            },
            totalDistance: cardioSession.distance ? {
                unit: 'km',
                value: cardioSession.distance
            } : null,
            metadata: {
                source: 'Repzy',
                intensity: cardioSession.intensity,
                cardioType: cardioSession.type
            }
        };
    }

    // ==================== ESTIMATION DES CALORIES ====================

    /**
     * Estime les calories brûlées pendant une séance de musculation
     */
    function estimateCaloriesBurned(session) {
        // Estimation basée sur le volume et la durée
        const duration = session.duration || 60; // minutes
        const volume = session.totalVolume || 0; // kg
        const exerciseCount = session.exercises?.length || 0;

        // Formule simplifiée:
        // Base: 5-8 kcal/min pour musculation
        // Bonus pour volume élevé
        const baseCalsPerMin = 6;
        const baseCalories = duration * baseCalsPerMin;

        // Bonus pour volume (1 kcal par 100kg de volume)
        const volumeBonus = volume / 100;

        // Bonus pour nombre d'exercices (plus de variété = plus de calories)
        const exerciseBonus = exerciseCount * 5;

        return Math.round(baseCalories + volumeBonus + exerciseBonus);
    }

    // ==================== EXPORT COMPLET ====================

    /**
     * Génère un fichier d'export compatible Apple Health / Google Fit
     */
    async function generateHealthExport(options = {}) {
        const {
            includeWorkouts = true,
            includeNutrition = true,
            includeWeight = true,
            includeCardio = true,
            startDate = null,
            endDate = null
        } = options;

        const exportData = {
            exportDate: new Date().toISOString(),
            source: 'Repzy',
            version: '1.0.0',
            data: {
                workouts: [],
                nutrition: [],
                bodyMass: [],
                cardio: []
            }
        };

        // Filtrer par dates si spécifié
        const filterByDate = (date) => {
            if (!startDate && !endDate) return true;
            const d = new Date(date);
            if (startDate && d < new Date(startDate)) return false;
            if (endDate && d > new Date(endDate)) return false;
            return true;
        };

        // Récupérer les données via les getters globaux
        const sessionHistory = window.RepzyState?.getSessionHistory() || [];
        const foodJournal = window.RepzyState?.getFoodJournal() || {};
        const foods = window.RepzyState?.getFoods() || [];
        const bodyWeightLog = window.RepzyState?.getBodyWeightLog() || [];
        const cardioLog = window.RepzyState?.getCardioLog() || [];

        // Exporter les séances d'entraînement
        if (includeWorkouts && sessionHistory.length > 0) {
            exportData.data.workouts = sessionHistory
                .filter(s => filterByDate(s.date))
                .map(s => exportWorkoutToHealth(s))
                .filter(Boolean);
        }

        // Exporter la nutrition
        if (includeNutrition && Object.keys(foodJournal).length > 0) {
            Object.entries(foodJournal).forEach(([date, entries]) => {
                if (!filterByDate(date)) return;

                // Calculer les totaux du jour
                const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
                entries.forEach(entry => {
                    const food = foods.find(f => f.id === entry.foodId);
                    if (food) {
                        const multiplier = (entry.quantity || 100) / 100;
                        totals.calories += Math.round(food.calories * multiplier);
                        totals.protein += Math.round(food.protein * multiplier);
                        totals.carbs += Math.round(food.carbs * multiplier);
                        totals.fat += Math.round(food.fat * multiplier);
                    }
                });

                const samples = exportNutritionToHealth(date, totals);
                if (samples) {
                    exportData.data.nutrition.push(...samples);
                }
            });
        }

        // Exporter le poids
        if (includeWeight && bodyWeightLog.length > 0) {
            exportData.data.bodyMass = bodyWeightLog
                .filter(w => filterByDate(w.date))
                .map(w => exportWeightToHealth(w))
                .filter(Boolean);
        }

        // Exporter le cardio
        if (includeCardio && cardioLog.length > 0) {
            exportData.data.cardio = cardioLog
                .filter(c => filterByDate(c.date))
                .map(c => exportCardioToHealth(c))
                .filter(Boolean);
        }

        return exportData;
    }

    /**
     * Télécharge l'export au format JSON (compatible avec Shortcuts/Raccourcis iOS)
     */
    async function downloadHealthExport(options = {}) {
        const exportData = await generateHealthExport(options);

        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `repzy-health-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        // Statistiques
        const stats = {
            workouts: exportData.data.workouts.length,
            nutritionDays: new Set(exportData.data.nutrition.map(n => n.startDate.split('T')[0])).size,
            weightEntries: exportData.data.bodyMass.length,
            cardioSessions: exportData.data.cardio.length
        };

        showToast(`Export santé créé: ${stats.workouts} séances, ${stats.nutritionDays} jours nutrition`, 'success');

        return stats;
    }

    // ==================== UI INTÉGRATION ====================

    /**
     * Affiche la modal des paramètres d'intégration santé
     */
    function showHealthSettingsModal() {
        const isAuthorized = localStorage.getItem('repzy-health-authorized') === 'true';
        const lastSync = localStorage.getItem('repzy-health-last-sync');

        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.id = 'health-settings-modal';

        modal.innerHTML = `
            <div class="modal" style="max-width: 450px;">
                <div class="modal-header">
                    <h3>🏥 Intégration Santé</h3>
                    <button class="modal-close" onclick="document.getElementById('health-settings-modal').remove()">✕</button>
                </div>
                <div class="modal-body">
                    <!-- Status -->
                    <div class="health-status-card" style="
                        background: var(--bg-tertiary);
                        border-radius: 12px;
                        padding: 16px;
                        margin-bottom: 16px;
                        display: flex;
                        align-items: center;
                        gap: 12px;
                    ">
                        <div style="
                            width: 48px;
                            height: 48px;
                            border-radius: 12px;
                            background: ${isAuthorized ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)'};
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 24px;
                        ">
                            ${isAuthorized ? '✅' : '⚠️'}
                        </div>
                        <div>
                            <div style="font-weight: 600; color: var(--text-primary);">
                                ${isAuthorized ? 'Intégration active' : 'Non connecté'}
                            </div>
                            <div style="font-size: 12px; color: var(--text-secondary);">
                                ${isAuthorized
                                    ? (lastSync ? `Dernier export: ${new Date(lastSync).toLocaleDateString('fr-FR')}` : 'Aucun export récent')
                                    : 'Activez pour exporter vers Apple Health / Google Fit'
                                }
                            </div>
                        </div>
                    </div>

                    ${!isAuthorized ? `
                        <button class="btn btn-primary btn-block" onclick="HealthIntegration.requestAuthorization()" style="margin-bottom: 16px;">
                            Activer l'intégration
                        </button>
                    ` : ''}

                    <!-- Options d'export -->
                    <h4 style="font-size: 14px; margin-bottom: 12px; color: var(--text-primary);">
                        Exporter les données
                    </h4>

                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <button class="btn btn-secondary" onclick="HealthIntegration.exportAll()" style="justify-content: flex-start; gap: 12px;">
                            <span style="font-size: 18px;">📤</span>
                            <span>Export complet (JSON)</span>
                        </button>

                        <button class="btn btn-secondary" onclick="HealthIntegration.exportWorkouts()" style="justify-content: flex-start; gap: 12px;">
                            <span style="font-size: 18px;">🏋️</span>
                            <span>Séances uniquement</span>
                        </button>

                        <button class="btn btn-secondary" onclick="HealthIntegration.exportNutrition()" style="justify-content: flex-start; gap: 12px;">
                            <span style="font-size: 18px;">🥗</span>
                            <span>Nutrition uniquement</span>
                        </button>
                    </div>

                    ${isAuthorized ? `
                        <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border-color);">
                            <button class="btn btn-outline" onclick="HealthIntegration.disconnect()" style="
                                color: var(--danger);
                                border-color: var(--danger);
                                width: 100%;
                            ">
                                Désactiver l'intégration
                            </button>
                        </div>
                    ` : ''}

                    <!-- Info iOS -->
                    ${healthState.platform === 'ios' ? `
                        <div style="
                            margin-top: 16px;
                            padding: 12px;
                            background: rgba(59, 130, 246, 0.1);
                            border-radius: 8px;
                            font-size: 12px;
                            color: var(--text-secondary);
                        ">
                            <strong>💡 Astuce iOS:</strong> Utilisez l'app Raccourcis (Shortcuts) pour
                            importer automatiquement les données JSON dans Apple Health.
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };
    }

    /**
     * Désactive l'intégration santé
     */
    function disconnect() {
        localStorage.removeItem('repzy-health-authorized');
        localStorage.removeItem('repzy-health-consent-date');
        localStorage.removeItem('repzy-health-last-sync');
        healthState.isAuthorized = false;

        showToast('Intégration santé désactivée', 'info');

        // Fermer et rouvrir la modal pour rafraîchir
        const modal = document.getElementById('health-settings-modal');
        if (modal) {
            modal.remove();
            showHealthSettingsModal();
        }
    }

    // ==================== INITIALISATION ====================

    function init() {
        checkHealthAvailability();

        // Vérifier si déjà autorisé
        healthState.isAuthorized = localStorage.getItem('repzy-health-authorized') === 'true';

        console.log('🏥 Health Integration initialisé:', healthState);
    }

    // Initialiser au chargement
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ==================== API PUBLIQUE ====================

    window.HealthIntegration = {
        // État
        getState: () => ({ ...healthState }),
        isAvailable: () => healthState.isAvailable,
        isAuthorized: () => healthState.isAuthorized,

        // Autorisation
        requestAuthorization: requestHealthAuthorization,
        disconnect: disconnect,

        // Export
        generateExport: generateHealthExport,
        downloadExport: downloadHealthExport,

        // Raccourcis d'export
        exportAll: () => downloadHealthExport(),
        exportWorkouts: () => downloadHealthExport({
            includeNutrition: false,
            includeWeight: false,
            includeCardio: false
        }),
        exportNutrition: () => downloadHealthExport({
            includeWorkouts: false,
            includeWeight: false,
            includeCardio: false
        }),

        // Export individuel
        exportWorkout: exportWorkoutToHealth,
        exportWeight: exportWeightToHealth,
        exportNutrition: exportNutritionToHealth,
        exportCardio: exportCardioToHealth,

        // UI
        showSettings: showHealthSettingsModal,

        // Utilitaires
        estimateCalories: estimateCaloriesBurned
    };

})();
