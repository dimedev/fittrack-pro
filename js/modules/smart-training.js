// ==================== FITTRACK PRO - SMART TRAINING MODULE ====================
// Smart Weight Suggestions + Muscle Recovery Indicator

(function() {
    'use strict';

    // ==================== SMART WEIGHT SUGGESTIONS ====================
    
    /**
     * Calcule le poids suggéré pour un exercice basé sur l'historique
     * @param {string} exerciseName - Nom de l'exercice
     * @param {number} targetReps - Reps cibles
     * @returns {object} - { suggested, lastWeight, progression, confidence }
     */
    function calculateSuggestedWeight(exerciseName, targetReps = 10) {
        const logs = state.progressLog?.[exerciseName] || [];
        
        if (logs.length === 0) {
            return {
                suggested: null,
                lastWeight: null,
                progression: 0,
                confidence: 'none',
                message: 'Première fois - choisissez votre poids'
            };
        }
        
        // Récupérer les dernières performances
        const recentLogs = logs.slice(-5); // 5 dernières séances
        const lastLog = logs[logs.length - 1];
        const lastWeight = lastLog.weight || 0;
        
        // Calculer le poids moyen récent
        const avgWeight = recentLogs.reduce((sum, log) => sum + (log.weight || 0), 0) / recentLogs.length;
        
        // Analyser la tendance de progression
        let trend = 0;
        if (recentLogs.length >= 2) {
            const first = recentLogs[0].weight || 0;
            const last = recentLogs[recentLogs.length - 1].weight || 0;
            trend = last - first;
        }
        
        // Calculer la récupération musculaire pour cet exercice
        const daysSinceLastSession = getDaysSinceLastSession(exerciseName);
        
        // Déterminer la progression suggérée
        let suggestedWeight = lastWeight;
        let progressionAmount = 0;
        let confidence = 'medium';
        let message = '';
        
        // Si bien récupéré et tendance positive → progression
        if (daysSinceLastSession >= 2 && daysSinceLastSession <= 5) {
            // Récupération optimale
            if (trend >= 0) {
                // Progression linéaire : +2.5kg pour exercices composés, +1.25kg pour isolation
                const isCompound = isCompoundExercise(exerciseName);
                progressionAmount = isCompound ? 2.5 : 1.25;
                suggestedWeight = Math.round((lastWeight + progressionAmount) * 4) / 4; // Arrondir à 0.25
                confidence = 'high';
                message = `+${progressionAmount}kg (progression)`;
            } else {
                // Tendance négative - maintenir
                suggestedWeight = lastWeight;
                message = 'Maintenir le poids';
            }
        } else if (daysSinceLastSession > 5) {
            // Longue pause - réduire légèrement
            suggestedWeight = Math.round((lastWeight * 0.95) * 4) / 4;
            confidence = 'medium';
            message = 'Reprise après pause';
        } else if (daysSinceLastSession < 2) {
            // Peu de repos - réduire
            suggestedWeight = Math.round((lastWeight * 0.9) * 4) / 4;
            confidence = 'low';
            message = 'Repos insuffisant';
        }
        
        return {
            suggested: suggestedWeight,
            lastWeight: lastWeight,
            progression: progressionAmount,
            confidence: confidence,
            message: message,
            daysSinceLastSession: daysSinceLastSession,
            trend: trend > 0 ? 'up' : trend < 0 ? 'down' : 'stable'
        };
    }
    
    /**
     * Détermine si un exercice est composé ou isolation
     */
    function isCompoundExercise(exerciseName) {
        const compoundKeywords = [
            'squat', 'deadlift', 'soulevé', 'bench', 'développé', 'press',
            'row', 'tirage', 'pull-up', 'traction', 'dip', 'lunge', 'fente'
        ];
        const nameLower = exerciseName.toLowerCase();
        return compoundKeywords.some(kw => nameLower.includes(kw));
    }
    
    /**
     * Calcule les jours depuis la dernière séance pour un exercice
     */
    function getDaysSinceLastSession(exerciseName) {
        const logs = state.progressLog?.[exerciseName] || [];
        if (logs.length === 0) return Infinity;
        
        const lastDate = new Date(logs[logs.length - 1].date);
        const today = new Date();
        const diffTime = Math.abs(today - lastDate);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    
    /**
     * Génère le HTML pour la suggestion de poids
     */
    function renderWeightSuggestion(exerciseName, targetReps) {
        const suggestion = calculateSuggestedWeight(exerciseName, targetReps);
        
        if (!suggestion.suggested) {
            return '';
        }
        
        const confidenceColors = {
            high: 'var(--success)',
            medium: 'var(--warning)',
            low: 'var(--danger)',
            none: 'var(--text-muted)'
        };
        
        const trendIcons = {
            up: '📈',
            down: '📉',
            stable: '➡️'
        };
        
        return `
            <div class="weight-suggestion" data-exercise="${exerciseName}" onclick="applySuggestedWeight('${exerciseName}', ${suggestion.suggested})">
                <div class="suggestion-header">
                    <span class="suggestion-label">Suggéré</span>
                    <span class="suggestion-confidence" style="color: ${confidenceColors[suggestion.confidence]}">${suggestion.confidence === 'high' ? '●●●' : suggestion.confidence === 'medium' ? '●●○' : '●○○'}</span>
                </div>
                <div class="suggestion-value">
                    <span class="suggestion-weight">${suggestion.suggested}kg</span>
                    ${suggestion.progression > 0 ? `<span class="suggestion-diff">+${suggestion.progression}</span>` : ''}
                </div>
                <div class="suggestion-message">${suggestion.message}</div>
            </div>
        `;
    }
    
    /**
     * Applique le poids suggéré aux inputs
     */
    window.applySuggestedWeight = function(exerciseName, weight) {
        const card = document.querySelector(`.exercise-card[data-exercise="${exerciseName}"]`);
        if (!card) return;
        
        const inputs = card.querySelectorAll('.set-weight');
        inputs.forEach(input => {
            if (!input.value || parseFloat(input.value) === 0) {
                input.value = weight;
                input.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
        
        // Animation feedback
        const suggestion = card.querySelector('.weight-suggestion');
        if (suggestion) {
            suggestion.classList.add('applied');
            setTimeout(() => suggestion.classList.remove('applied'), 500);
        }
        
        // Haptic feedback
        if (window.MobileGestures?.Haptics) {
            window.MobileGestures.Haptics.light();
        }
        
        showToast('Poids appliqué', 'success');
    };
    
    // ==================== MUSCLE RECOVERY INDICATOR ====================
    
    const MUSCLE_GROUPS = {
        chest: { name: 'Pectoraux', recoveryDays: 2 },
        back: { name: 'Dos', recoveryDays: 2 },
        shoulders: { name: 'Épaules', recoveryDays: 2 },
        biceps: { name: 'Biceps', recoveryDays: 1.5 },
        triceps: { name: 'Triceps', recoveryDays: 1.5 },
        legs: { name: 'Jambes', recoveryDays: 3 },
        quads: { name: 'Quadriceps', recoveryDays: 3 },
        hamstrings: { name: 'Ischio-jambiers', recoveryDays: 3 },
        glutes: { name: 'Fessiers', recoveryDays: 3 },
        abs: { name: 'Abdominaux', recoveryDays: 1 },
        calves: { name: 'Mollets', recoveryDays: 1.5 }
    };
    
    /**
     * Calcule la récupération de chaque groupe musculaire
     * @returns {object} - { muscle: { recovery: 0-100, lastWorked: Date, status: string } }
     */
    function calculateMuscleRecovery() {
        const recovery = {};
        const now = new Date();
        
        // Initialiser tous les muscles à 100%
        Object.keys(MUSCLE_GROUPS).forEach(muscle => {
            recovery[muscle] = {
                recovery: 100,
                lastWorked: null,
                status: 'ready',
                daysAgo: null
            };
        });
        
        // Analyser l'historique des séances
        if (!state.sessionHistory || state.sessionHistory.length === 0) {
            return recovery;
        }
        
        // Parcourir les séances récentes (7 derniers jours)
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        
        state.sessionHistory.forEach(session => {
            const sessionDate = new Date(session.date);
            if (sessionDate < weekAgo) return;
            
            const daysAgo = Math.ceil((now - sessionDate) / (1000 * 60 * 60 * 24));
            
            // Analyser chaque exercice de la séance
            (session.exercises || []).forEach(ex => {
                const muscle = ex.muscle?.toLowerCase() || 'other';
                if (!MUSCLE_GROUPS[muscle]) return;
                
                const muscleData = MUSCLE_GROUPS[muscle];
                const recoveryDays = muscleData.recoveryDays;
                
                // Calculer la récupération basée sur le temps écoulé
                const recoveryPercent = Math.min(100, Math.round((daysAgo / recoveryDays) * 100));
                
                // Garder la valeur la plus basse (muscle le plus sollicité récemment)
                if (recovery[muscle].recovery > recoveryPercent || recovery[muscle].lastWorked === null) {
                    recovery[muscle] = {
                        recovery: recoveryPercent,
                        lastWorked: sessionDate,
                        daysAgo: daysAgo,
                        status: recoveryPercent >= 100 ? 'ready' : recoveryPercent >= 70 ? 'ok' : recoveryPercent >= 50 ? 'caution' : 'fatigue'
                    };
                }
            });
        });
        
        return recovery;
    }
    
    /**
     * Génère le HTML pour l'indicateur de récupération musculaire
     */
    function renderMuscleRecoveryWidget() {
        const recovery = calculateMuscleRecovery();
        
        // Trier par récupération (les plus fatigués en premier)
        const sortedMuscles = Object.entries(recovery)
            .filter(([_, data]) => data.lastWorked !== null)
            .sort((a, b) => a[1].recovery - b[1].recovery);
        
        if (sortedMuscles.length === 0) {
            return `
                <div class="recovery-widget">
                    <div class="recovery-header">
                        <span class="recovery-title">💪 Récupération</span>
                    </div>
                    <div class="recovery-empty">
                        <div class="recovery-empty-icon">✅</div>
                        <div>Tous vos muscles sont prêts !</div>
                        <div style="margin-top: 8px; font-size: 0.75rem;">Commencez à vous entraîner pour voir le suivi de récupération</div>
                    </div>
                </div>
            `;
        }
        
        const statusColors = {
            ready: 'var(--success)',
            ok: 'var(--success)',
            caution: 'var(--warning)',
            fatigue: 'var(--danger)'
        };
        
        const statusLabels = {
            ready: 'Prêt',
            ok: 'OK',
            caution: 'Prudence',
            fatigue: 'Fatigué'
        };
        
        let html = `
            <div class="recovery-widget">
                <div class="recovery-header">
                    <span class="recovery-title">💪 Récupération Musculaire</span>
                </div>
                <div class="recovery-muscles">
        `;
        
        sortedMuscles.slice(0, 6).forEach(([muscle, data]) => {
            const muscleInfo = MUSCLE_GROUPS[muscle];
            html += `
                <div class="recovery-muscle-item">
                    <div class="muscle-info">
                        <span class="muscle-name">${muscleInfo.name}</span>
                        <span class="muscle-status" style="color: ${statusColors[data.status]}">${statusLabels[data.status]}</span>
                    </div>
                    <div class="muscle-bar">
                        <div class="muscle-bar-fill" style="width: ${data.recovery}%; background: ${statusColors[data.status]}"></div>
                    </div>
                    <span class="muscle-percent">${data.recovery}%</span>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
        
        return html;
    }
    
    /**
     * Vérifie si la séance du jour a des muscles fatigués
     */
    function checkSessionRecovery(splitName) {
        if (!splitName) return { safe: true, warnings: [] };
        
        const recovery = calculateMuscleRecovery();
        const warnings = [];
        
        // Mapper les splits aux muscles
        const splitMuscles = {
            'Push': ['chest', 'shoulders', 'triceps'],
            'Pull': ['back', 'biceps'],
            'Legs': ['legs', 'quads', 'hamstrings', 'glutes', 'calves'],
            'Upper': ['chest', 'back', 'shoulders', 'biceps', 'triceps'],
            'Lower': ['legs', 'quads', 'hamstrings', 'glutes', 'calves'],
            'Full Body': ['chest', 'back', 'shoulders', 'legs', 'biceps', 'triceps'],
            'Chest': ['chest'],
            'Back': ['back'],
            'Shoulders': ['shoulders'],
            'Arms': ['biceps', 'triceps'],
            'Abs': ['abs']
        };
        
        const targetMuscles = splitMuscles[splitName] || [];
        
        targetMuscles.forEach(muscle => {
            if (recovery[muscle] && recovery[muscle].recovery < 70) {
                warnings.push({
                    muscle: MUSCLE_GROUPS[muscle].name,
                    recovery: recovery[muscle].recovery,
                    status: recovery[muscle].status
                });
            }
        });
        
        return {
            safe: warnings.length === 0,
            warnings: warnings
        };
    }
    
    // ==================== EXPORT ====================
    
    window.SmartTraining = {
        // Weight suggestions
        calculateSuggestedWeight,
        renderWeightSuggestion,
        
        // Recovery
        calculateMuscleRecovery,
        renderMuscleRecoveryWidget,
        checkSessionRecovery,
        
        // Constants
        MUSCLE_GROUPS
    };
    
    console.log('🧠 Smart Training module loaded');

})();
