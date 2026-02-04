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
        
        // NOUVEAU: Utiliser le taux de progression personnalisé
        const personalRate = getPersonalProgressionRate(exerciseName);
        
        // Si bien récupéré et tendance positive → progression
        if (daysSinceLastSession >= 2 && daysSinceLastSession <= 5) {
            // Récupération optimale
            if (trend >= 0) {
                // Utiliser le taux personnalisé si confiance suffisante
                if (personalRate.confidence === 'high' && personalRate.ratePerWeek > 0) {
                    progressionAmount = Math.min(5, Math.max(0.5, personalRate.ratePerWeek));
                } else {
                    // Sinon, progression linéaire standard
                    const isCompound = isCompoundExercise(exerciseName);
                    progressionAmount = isCompound ? 2.5 : 1.25;
                }
                
                suggestedWeight = Math.round((lastWeight + progressionAmount) * 4) / 4; // Arrondir à 0.25
                confidence = personalRate.confidence === 'high' ? 'high' : 'medium';
                message = `+${progressionAmount}kg (${personalRate.confidence === 'high' ? 'progression perso' : 'progression'})`;
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
        
        // NOUVEAU: Ajuster selon la phase de périodisation
        const phaseAdjustments = window.getPhaseAdjustments
            ? window.getPhaseAdjustments()
            : { weightMultiplier: 1.0, phase: 'hypertrophy' };

        const phaseMultiplier = phaseAdjustments.weightMultiplier || 1.0;
        const adjustedWeight = Math.round(suggestedWeight * phaseMultiplier * 4) / 4;

        // Ajuster le message si phase modifie le poids
        let phaseMessage = '';
        if (phaseMultiplier !== 1.0) {
            const pct = Math.round((phaseMultiplier - 1) * 100);
            const sign = pct > 0 ? '+' : '';
            phaseMessage = ` (${sign}${pct}% phase ${phaseAdjustments.phase})`;
        }

        return {
            suggested: adjustedWeight,
            lastWeight: lastWeight,
            progression: progressionAmount,
            confidence: confidence,
            message: message + phaseMessage,
            daysSinceLastSession: daysSinceLastSession,
            trend: trend > 0 ? 'up' : trend < 0 ? 'down' : 'stable',
            phase: phaseAdjustments.phase,
            phaseMultiplier: phaseMultiplier
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
        chest: { name: 'Pectoraux', recoveryDays: 2, baseVolume: 12 },
        back: { name: 'Dos', recoveryDays: 2, baseVolume: 15 },
        shoulders: { name: 'Épaules', recoveryDays: 2, baseVolume: 10 },
        biceps: { name: 'Biceps', recoveryDays: 1.5, baseVolume: 8 },
        triceps: { name: 'Triceps', recoveryDays: 1.5, baseVolume: 8 },
        legs: { name: 'Jambes', recoveryDays: 3, baseVolume: 16 },
        quads: { name: 'Quadriceps', recoveryDays: 3, baseVolume: 12 },
        hamstrings: { name: 'Ischio-jambiers', recoveryDays: 3, baseVolume: 10 },
        glutes: { name: 'Fessiers', recoveryDays: 3, baseVolume: 10 },
        abs: { name: 'Abdominaux', recoveryDays: 1, baseVolume: 12 },
        calves: { name: 'Mollets', recoveryDays: 1.5, baseVolume: 8 }
    };
    
    // ==================== FATIGUE CUMULATIVE ====================
    
    // Constante pour limiter le traitement
    const MAX_SESSIONS_TO_PROCESS = 100;
    
    /**
     * Calcule la fatigue cumulative pour un groupe musculaire sur 14 jours
     * Prend en compte le volume total (sets * reps * poids) normalisé
     * OPTIMISÉ: Limite le traitement aux 100 dernières sessions max
     * @param {string} muscle - Groupe musculaire
     * @param {number} days - Période d'analyse (défaut 14 jours)
     * @returns {object} - { fatigue: 0-100, volume, avgVolume, trend }
     */
    function calculateCumulativeFatigue(muscle, days = 14) {
        if (!state.sessionHistory || state.sessionHistory.length === 0) {
            return { fatigue: 0, volume: 0, avgVolume: 0, trend: 'stable' };
        }
        
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        
        let totalVolume = 0;
        let sessionCount = 0;
        
        // OPTIMISATION: Limiter aux N dernières sessions et utiliser slice
        const recentSessions = state.sessionHistory.slice(-MAX_SESSIONS_TO_PROCESS);
        
        // Analyser les séances des N derniers jours
        for (const session of recentSessions) {
            const sessionDate = new Date(session.date);
            if (sessionDate < cutoffDate) continue;
            
            for (const ex of (session.exercises || [])) {
                const exMuscle = ex.muscle?.toLowerCase();
                if (exMuscle !== muscle) continue;
                
                // Calculer le volume : sets * reps * poids
                const sets = ex.achievedSets || ex.sets || 0;
                const reps = ex.achievedReps || ex.reps || 0;
                const weight = ex.weight || 0;
                
                const volume = sets * reps * (weight > 0 ? weight : 10);
                totalVolume += volume;
            }
            
            sessionCount++;
        }
        
        // Calculer le volume moyen hebdomadaire de l'utilisateur
        const userAvgVolume = getUserAverageVolume(muscle);
        
        // Normaliser la fatigue (0-100)
        const fatigueRatio = userAvgVolume > 0 ? totalVolume / (userAvgVolume * (days / 7)) : 0;
        const fatigue = Math.min(100, Math.round(fatigueRatio * 50));
        
        // Tendance (comparer semaine actuelle vs semaine précédente)
        const trend = calculateVolumeTrend(muscle);
        
        return {
            fatigue: fatigue,
            volume: totalVolume,
            avgVolume: userAvgVolume,
            trend: trend,
            sessionCount: sessionCount
        };
    }
    
    /**
     * Calcule le volume moyen hebdomadaire pour un muscle sur les 4 dernières semaines
     * OPTIMISÉ: Limite le traitement aux dernières sessions
     */
    function getUserAverageVolume(muscle) {
        if (!state.sessionHistory || state.sessionHistory.length === 0) {
            return MUSCLE_GROUPS[muscle]?.baseVolume * 100 || 1000; // Volume par défaut
        }
        
        const fourWeeksAgo = new Date();
        fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
        
        // OPTIMISATION: Ne traiter que les sessions récentes
        const recentSessions = state.sessionHistory.slice(-MAX_SESSIONS_TO_PROCESS);
        
        // Grouper par semaine
        const weekVolumes = {};
        
        // OPTIMISATION: Utiliser les sessions récentes
        for (const session of recentSessions) {
            const sessionDate = new Date(session.date);
            if (sessionDate < fourWeeksAgo) continue;
            
            const weekKey = getWeekKey(sessionDate);
            if (!weekVolumes[weekKey]) weekVolumes[weekKey] = 0;
            
            for (const ex of (session.exercises || [])) {
                if (ex.muscle?.toLowerCase() !== muscle) continue;
                
                const sets = ex.achievedSets || ex.sets || 0;
                const reps = ex.achievedReps || ex.reps || 0;
                const weight = ex.weight || 10;
                
                weekVolumes[weekKey] += sets * reps * weight;
            }
        }
        
        const volumes = Object.values(weekVolumes).filter(v => v > 0);
        if (volumes.length === 0) return MUSCLE_GROUPS[muscle]?.baseVolume * 100 || 1000;
        
        return volumes.reduce((a, b) => a + b, 0) / volumes.length;
    }
    
    /**
     * Retourne la clé de semaine (année-semaine)
     */
    function getWeekKey(date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 4 - (d.getDay() || 7));
        const yearStart = new Date(d.getFullYear(), 0, 1);
        const weekNum = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        return `${d.getFullYear()}-W${weekNum}`;
    }
    
    /**
     * Calcule la tendance du volume (up, down, stable)
     * OPTIMISÉ: Limite aux 50 dernières sessions (2 semaines max)
     */
    function calculateVolumeTrend(muscle) {
        const now = new Date();
        const oneWeekAgo = new Date(now);
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const twoWeeksAgo = new Date(now);
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        
        let currentWeekVolume = 0;
        let lastWeekVolume = 0;
        
        // OPTIMISATION: Ne traiter que les 50 dernières sessions
        const recentSessions = (state.sessionHistory || []).slice(-50);
        
        for (const session of recentSessions) {
            const sessionDate = new Date(session.date);
            
            for (const ex of (session.exercises || [])) {
                if (ex.muscle?.toLowerCase() !== muscle) continue;
                
                const volume = (ex.achievedSets || ex.sets || 0) * 
                              (ex.achievedReps || ex.reps || 0) * 
                              (ex.weight || 10);
                
                if (sessionDate >= oneWeekAgo) {
                    currentWeekVolume += volume;
                } else if (sessionDate >= twoWeeksAgo && sessionDate < oneWeekAgo) {
                    lastWeekVolume += volume;
                }
            }
        }
        
        if (lastWeekVolume === 0) return 'stable';
        const change = (currentWeekVolume - lastWeekVolume) / lastWeekVolume;
        
        if (change > 0.1) return 'up';
        if (change < -0.1) return 'down';
        return 'stable';
    }
    
    // ==================== TAUX DE PROGRESSION PERSONNALISÉ ====================
    
    /**
     * Calcule le taux de progression personnalisé pour un exercice
     * Basé sur l'historique réel de l'utilisateur (90 derniers jours)
     * @param {string} exerciseName - Nom de l'exercice
     * @returns {object} - { ratePerWeek, confidence, recommendation }
     */
    function getPersonalProgressionRate(exerciseName) {
        const logs = state.progressLog?.[exerciseName] || [];
        
        if (logs.length < 3) {
            // Pas assez de données - utiliser les taux par défaut
            const isCompound = isCompoundExercise(exerciseName);
            return {
                ratePerWeek: isCompound ? 2.5 : 1.25,
                confidence: 'low',
                recommendation: 'Pas assez de données - progression standard',
                dataPoints: logs.length
            };
        }
        
        // Filtrer les 90 derniers jours
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        
        const recentLogs = logs.filter(log => new Date(log.date) >= ninetyDaysAgo);
        
        if (recentLogs.length < 3) {
            return {
                ratePerWeek: isCompoundExercise(exerciseName) ? 2.5 : 1.25,
                confidence: 'low',
                recommendation: 'Reprenez l\'entraînement pour des données récentes',
                dataPoints: recentLogs.length
            };
        }
        
        // Régression linéaire pour calculer la pente (progression)
        const regression = calculateLinearRegression(recentLogs.map((log, i) => ({
            x: i, // Index de la séance
            y: log.weight || 0
        })));
        
        // Estimer le nombre de semaines couvertes
        const firstDate = new Date(recentLogs[0].date);
        const lastDate = new Date(recentLogs[recentLogs.length - 1].date);
        const weeksCovered = Math.max(1, (lastDate - firstDate) / (7 * 24 * 60 * 60 * 1000));
        
        // Calculer le taux par semaine
        const totalProgress = recentLogs[recentLogs.length - 1].weight - recentLogs[0].weight;
        const ratePerWeek = totalProgress / weeksCovered;
        
        // Déterminer la confiance basée sur la consistance (R²)
        let confidence = 'low';
        if (regression.r2 > 0.7 && recentLogs.length >= 8) {
            confidence = 'high';
        } else if (regression.r2 > 0.4 && recentLogs.length >= 5) {
            confidence = 'medium';
        }
        
        // Générer une recommandation
        let recommendation = '';
        if (ratePerWeek > 3) {
            recommendation = '🚀 Progression rapide ! Continuez sur cette lancée.';
        } else if (ratePerWeek > 1) {
            recommendation = '📈 Bonne progression, rythme stable.';
        } else if (ratePerWeek > 0) {
            recommendation = '➡️ Progression lente - augmentez le volume ou l\'intensité.';
        } else {
            recommendation = '⚠️ Stagnation - changez de routine ou prenez du repos.';
        }
        
        return {
            ratePerWeek: Math.round(ratePerWeek * 100) / 100,
            confidence: confidence,
            recommendation: recommendation,
            dataPoints: recentLogs.length,
            r2: Math.round(regression.r2 * 100) / 100
        };
    }
    
    /**
     * Régression linéaire simple
     * @returns {object} - { slope, intercept, r2 }
     */
    function calculateLinearRegression(points) {
        if (points.length < 2) return { slope: 0, intercept: 0, r2: 0 };
        
        const n = points.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
        
        points.forEach(p => {
            sumX += p.x;
            sumY += p.y;
            sumXY += p.x * p.y;
            sumX2 += p.x * p.x;
            sumY2 += p.y * p.y;
        });
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        
        // Calculer R² (coefficient de détermination)
        const yMean = sumY / n;
        let ssRes = 0, ssTot = 0;
        
        points.forEach(p => {
            const yPred = slope * p.x + intercept;
            ssRes += (p.y - yPred) ** 2;
            ssTot += (p.y - yMean) ** 2;
        });
        
        const r2 = ssTot > 0 ? 1 - (ssRes / ssTot) : 0;
        
        return { slope, intercept, r2: Math.max(0, r2) };
    }
    
    /**
     * Calcule la récupération de chaque groupe musculaire
     * AMÉLIORÉ avec fatigue cumulative pour un calcul plus précis
     * @returns {object} - { muscle: { recovery: 0-100, lastWorked: Date, status: string, fatigue: object } }
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
                daysAgo: null,
                fatigue: null
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
                let recoveryPercent = Math.min(100, Math.round((daysAgo / recoveryDays) * 100));
                
                // Garder la valeur la plus basse (muscle le plus sollicité récemment)
                if (recovery[muscle].recovery > recoveryPercent || recovery[muscle].lastWorked === null) {
                    recovery[muscle] = {
                        recovery: recoveryPercent,
                        lastWorked: sessionDate,
                        daysAgo: daysAgo,
                        status: recoveryPercent >= 100 ? 'ready' : recoveryPercent >= 70 ? 'ok' : recoveryPercent >= 50 ? 'caution' : 'fatigue',
                        fatigue: null
                    };
                }
            });
        });
        
        // NOUVEAU: Ajuster avec la fatigue cumulative
        Object.keys(recovery).forEach(muscle => {
            const fatigue = calculateCumulativeFatigue(muscle);
            recovery[muscle].fatigue = fatigue;
            
            // Si fatigue cumulative élevée, réduire le score de récupération
            if (fatigue.fatigue > 70) {
                const fatigueDeduction = Math.round((fatigue.fatigue - 70) * 0.5);
                recovery[muscle].recovery = Math.max(0, recovery[muscle].recovery - fatigueDeduction);
                
                // Recalculer le statut
                const r = recovery[muscle].recovery;
                recovery[muscle].status = r >= 100 ? 'ready' : r >= 70 ? 'ok' : r >= 50 ? 'caution' : 'fatigue';
            }
        });
        
        return recovery;
    }
    
    /**
     * Génère le HTML pour l'indicateur de récupération musculaire
     * FIX: Affiche les muscles PRÊTS à entraîner au lieu des muscles fatigués
     */
    function renderMuscleRecoveryWidget() {
        const recovery = calculateMuscleRecovery();

        // Séparer muscles prêts (>= 80%) et muscles fatigués (< 80%)
        const allMuscles = Object.entries(recovery);
        const readyMuscles = allMuscles
            .filter(([_, data]) => data.recovery >= 80)
            .sort((a, b) => b[1].recovery - a[1].recovery); // Meilleurs en premier

        const fatiguedMuscles = allMuscles
            .filter(([_, data]) => data.lastWorked !== null && data.recovery < 80)
            .sort((a, b) => a[1].recovery - b[1].recovery); // Pires en premier

        const statusColors = {
            ready: 'var(--success)',
            ok: 'var(--success)',
            caution: 'var(--warning)',
            fatigue: 'var(--danger)'
        };

        // CAS 1: Tous les muscles sont fatigués
        if (readyMuscles.length === 0 && fatiguedMuscles.length > 0) {
            let html = `
                <div class="recovery-widget">
                    <div class="recovery-header">
                        <span class="recovery-title">🧘 Repos Recommandé</span>
                    </div>
                    <div class="recovery-recommendation">
                        <div class="recovery-rec-icon">😴</div>
                        <div class="recovery-rec-text">Vos muscles récupèrent</div>
                        <div class="recovery-rec-detail">Journée repos ou cardio léger</div>
                    </div>
                    <div class="recovery-fatigued-list">
            `;

            fatiguedMuscles.slice(0, 3).forEach(([muscle, data]) => {
                const muscleInfo = MUSCLE_GROUPS[muscle];
                html += `
                    <div class="recovery-fatigued-item">
                        <span class="fatigued-name">${muscleInfo.name}</span>
                        <span class="fatigued-percent" style="color: ${statusColors[data.status]}">${data.recovery}%</span>
                    </div>
                `;
            });

            html += `</div></div>`;
            return html;
        }

        // CAS 2: Aucun entraînement récent (tous à 100%, aucun lastWorked)
        if (fatiguedMuscles.length === 0 && readyMuscles.every(([_, data]) => data.lastWorked === null)) {
            // Suggérer des groupes musculaires à entraîner
            const suggestions = ['chest', 'back', 'legs'].map(m => MUSCLE_GROUPS[m]?.name).filter(Boolean);
            return `
                <div class="recovery-widget">
                    <div class="recovery-header">
                        <span class="recovery-title">💪 Prêt à Entraîner</span>
                    </div>
                    <div class="recovery-ready-message">
                        <div class="ready-icon">🎯</div>
                        <div class="ready-text">Tous vos muscles sont disponibles !</div>
                        <div class="ready-suggestion">Suggéré : ${suggestions.join(', ')}</div>
                    </div>
                </div>
            `;
        }

        // CAS 3: Mix de muscles prêts et fatigués - Afficher les prêts
        let html = `
            <div class="recovery-widget">
                <div class="recovery-header">
                    <span class="recovery-title">✅ Prêts à Entraîner</span>
                </div>
                <div class="recovery-ready-muscles">
        `;

        // Afficher jusqu'à 4 muscles prêts
        readyMuscles.slice(0, 4).forEach(([muscle, data]) => {
            const muscleInfo = MUSCLE_GROUPS[muscle];
            html += `
                <div class="recovery-ready-item">
                    <span class="ready-muscle-name">${muscleInfo.name}</span>
                    <span class="ready-muscle-badge">✓ ${data.recovery}%</span>
                </div>
            `;
        });

        html += `</div>`;

        // Si il y a des muscles fatigués, les mentionner brièvement
        if (fatiguedMuscles.length > 0) {
            const fatiguedNames = fatiguedMuscles.slice(0, 2).map(([m]) => MUSCLE_GROUPS[m]?.name).join(', ');
            html += `
                <div class="recovery-fatigued-note">
                    ⚠️ En récup : ${fatiguedNames}
                </div>
            `;
        }

        html += `</div>`;
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
    
    // ==================== DOUBLE PROGRESSION ====================

    /**
     * Calcule la suggestion de double progression
     * Logique: Si reps max atteintes → +poids et reset reps
     * @param {string} exerciseName - Nom de l'exercice
     * @param {Array} targetRepsRange - [min, max] reps (défaut [8, 12])
     * @returns {object|null} - { weight, reps, action, message }
     */
    function calculateDoubleProgression(exerciseName, targetRepsRange = [8, 12]) {
        const [minReps, maxReps] = targetRepsRange;
        const logs = state.progressLog?.[exerciseName] || [];

        if (logs.length === 0) {
            return null;
        }

        const lastLog = logs[logs.length - 1];
        const lastReps = lastLog.reps || 0;
        const lastWeight = lastLog.weight || 0;

        let suggestion = {
            weight: lastWeight,
            reps: lastReps,
            action: 'maintain',
            message: 'Maintenir',
            icon: '➡️'
        };

        if (lastReps >= maxReps) {
            // Reps max atteintes → augmenter poids
            const increment = isCompoundExercise(exerciseName) ? 2.5 : 1.25;
            suggestion = {
                weight: Math.round((lastWeight + increment) * 4) / 4,
                reps: minReps,
                action: 'weight_up',
                message: `+${increment}kg, reset à ${minReps} reps`,
                icon: '🏋️'
            };
        } else if (lastReps < minReps) {
            // Reps trop basses → réduire poids
            const decrement = isCompoundExercise(exerciseName) ? 2.5 : 1.25;
            suggestion = {
                weight: Math.max(0, Math.round((lastWeight - decrement) * 4) / 4),
                reps: maxReps,
                action: 'weight_down',
                message: `Réduire à ${lastWeight - decrement}kg`,
                icon: '⬇️'
            };
        } else {
            // Entre min et max → augmenter reps
            suggestion = {
                weight: lastWeight,
                reps: lastReps + 1,
                action: 'reps_up',
                message: `Viser ${lastReps + 1} reps`,
                icon: '📈'
            };
        }

        return suggestion;
    }

    /**
     * Génère le widget de double progression pour un exercice
     * @param {string} exerciseName - Nom de l'exercice
     * @param {Array} targetRepsRange - [min, max] reps
     * @returns {string} HTML du widget
     */
    function renderDoubleProgressionWidget(exerciseName, targetRepsRange = [8, 12]) {
        const dp = calculateDoubleProgression(exerciseName, targetRepsRange);
        if (!dp) return '';

        const colors = {
            weight_up: 'var(--success)',
            reps_up: 'var(--primary)',
            weight_down: 'var(--warning)',
            maintain: 'var(--text-muted)'
        };

        return `
            <div class="double-progression-badge" style="
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 4px 8px;
                border-radius: 12px;
                background: color-mix(in srgb, ${colors[dp.action]} 15%, transparent);
                border: 1px solid color-mix(in srgb, ${colors[dp.action]} 30%, transparent);
                font-size: 0.75rem;
            " title="${dp.message}">
                <span>${dp.icon}</span>
                <span style="color: ${colors[dp.action]}; font-weight: 500;">
                    ${dp.action === 'weight_up' ? '+Poids' : dp.action === 'reps_up' ? '+Reps' : dp.action === 'weight_down' ? '-Poids' : 'Maintenir'}
                </span>
            </div>
        `;
    }

    // ==================== 1RM ESTIMÉ (EPLEY) ====================

    /**
     * Calcule le 1RM estimé avec la formule Epley
     * @param {number} weight - Poids utilisé (kg)
     * @param {number} reps - Répétitions effectuées
     * @returns {number} 1RM estimé arrondi
     */
    function calculate1RM(weight, reps) {
        if (reps <= 0 || weight <= 0) return 0;
        if (reps === 1) return weight;
        // Formule Epley: 1RM = weight × (1 + reps/30)
        return Math.round(weight * (1 + reps / 30));
    }

    /**
     * Récupère le 1RM max historique pour un exercice
     * @param {string} exerciseName - Nom de l'exercice
     * @returns {object|null} - { estimated1RM, weight, reps, date }
     */
    function getEstimated1RM(exerciseName) {
        const logs = state.progressLog?.[exerciseName] || [];
        if (logs.length === 0) return null;

        let max1RM = 0;
        let maxData = null;

        logs.forEach(log => {
            const estimated = calculate1RM(log.weight || 0, log.reps || 0);
            if (estimated > max1RM) {
                max1RM = estimated;
                maxData = {
                    estimated1RM: max1RM,
                    weight: log.weight,
                    reps: log.reps,
                    date: log.date
                };
            }
        });

        return maxData;
    }

    /**
     * Calcule le 1RM actuel (dernière séance)
     * @param {string} exerciseName - Nom de l'exercice
     * @returns {object|null} - { current1RM, weight, reps }
     */
    function getCurrent1RM(exerciseName) {
        const logs = state.progressLog?.[exerciseName] || [];
        if (logs.length === 0) return null;

        const lastLog = logs[logs.length - 1];
        const current1RM = calculate1RM(lastLog.weight || 0, lastLog.reps || 0);

        return {
            current1RM,
            weight: lastLog.weight,
            reps: lastLog.reps,
            date: lastLog.date
        };
    }

    /**
     * Génère le widget 1RM pour un exercice
     * @param {string} exerciseName - Nom de l'exercice
     * @returns {string} HTML du widget
     */
    function render1RMWidget(exerciseName) {
        const maxData = getEstimated1RM(exerciseName);
        if (!maxData || !maxData.estimated1RM) return '';

        const currentData = getCurrent1RM(exerciseName);
        const isNewPR = currentData && currentData.current1RM >= maxData.estimated1RM;

        // Formater la date
        const dateStr = maxData.date ? new Date(maxData.date).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short'
        }) : '';

        return `
            <div class="estimated-1rm-badge" style="
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 6px 10px;
                border-radius: 8px;
                background: ${isNewPR ? 'var(--success-bg, rgba(34, 197, 94, 0.1))' : 'var(--bg-tertiary)'};
                border: 1px solid ${isNewPR ? 'var(--success)' : 'var(--border-color)'};
                font-size: 0.8rem;
            " title="1RM estimé basé sur ${maxData.weight}kg × ${maxData.reps} reps (${dateStr})">
                <span style="font-size: 1rem;">${isNewPR ? '🎉' : '🏆'}</span>
                <span style="font-weight: 600; color: ${isNewPR ? 'var(--success)' : 'var(--text-primary)'};">
                    ${maxData.estimated1RM}kg
                </span>
                <span style="color: var(--text-muted); font-size: 0.7rem;">1RM</span>
            </div>
        `;
    }

    /**
     * Calcule le pourcentage du 1RM pour un poids donné
     * @param {string} exerciseName - Nom de l'exercice
     * @param {number} weight - Poids à évaluer
     * @returns {number|null} Pourcentage du 1RM
     */
    function get1RMPercentage(exerciseName, weight) {
        const maxData = getEstimated1RM(exerciseName);
        if (!maxData || maxData.estimated1RM <= 0) return null;

        return Math.round((weight / maxData.estimated1RM) * 100);
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

        // NOUVEAU: Fatigue cumulative
        calculateCumulativeFatigue,
        getUserAverageVolume,
        calculateVolumeTrend,

        // NOUVEAU: Progression personnalisée
        getPersonalProgressionRate,

        // NOUVEAU: Double progression
        calculateDoubleProgression,
        renderDoubleProgressionWidget,

        // NOUVEAU: 1RM estimé
        calculate1RM,
        getEstimated1RM,
        getCurrent1RM,
        render1RMWidget,
        get1RMPercentage,

        // Constants
        MUSCLE_GROUPS
    };

    console.log('🧠 Smart Training module loaded (v3 - double progression + 1RM)');

})();
