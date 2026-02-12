// ==================== GOALS & TRACKING MODULE ====================

// Structure des objectifs
// state.goals = {
//     type: 'weight_loss' | 'weight_gain' | 'muscle_gain' | 'strength' | 'maintenance',
//     target: { value: number, unit: 'kg' },
//     deadline: 'YYYY-MM-DD',
//     startDate: 'YYYY-MM-DD',
//     startWeight: number,
//     currentStreak: number,
//     longestStreak: number,
//     weeklyProgress: []
// }

// state.bodyWeightLog = [
//     { date: 'YYYY-MM-DD', weight: number }
// ]

// ==================== INITIALISATION ====================

function initGoalsTracking() {
    if (!state.goals) {
        state.goals = {
            type: null,
            target: null,
            deadline: null,
            startDate: null,
            startWeight: null,
            currentStreak: 0,
            longestStreak: 0,
            weeklyProgress: []
        };
    }
    
    if (!state.bodyWeightLog) {
        state.bodyWeightLog = [];
    }
    
    // Calculer le streak au chargement
    updateStreak();
}

// ==================== GESTION DU POIDS CORPOREL ====================

function logBodyWeight(weight, date = null) {
    if (!date) {
        date = new Date().toISOString().split('T')[0];
    }
    
    weight = parseFloat(weight);
    
    if (isNaN(weight) || weight <= 0) {
        showToast('Poids invalide', 'error');
        return;
    }
    
    // Vérifier si on a déjà un log pour aujourd'hui
    const existingIndex = state.bodyWeightLog.findIndex(log => log.date === date);
    
    if (existingIndex >= 0) {
        // Mettre à jour
        state.bodyWeightLog[existingIndex].weight = weight;
    } else {
        // Ajouter
        state.bodyWeightLog.push({ date, weight });
        
        // Trier par date
        state.bodyWeightLog.sort((a, b) => new Date(a.date) - new Date(b.date));
    }
    
    // Mettre à jour le profil avec le poids actuel
    if (state.profile) {
        state.profile.weight = weight;
        // Recalculer TDEE et macros
        const { bmr, tdee, macros, targetCalories } = calculateProfile(state.profile);
        state.profile.bmr = bmr;
        state.profile.tdee = tdee;
        state.profile.macros = macros;
        state.profile.targetCalories = targetCalories;
    }
    
    saveState();
    
    // Sync Supabase (bodyWeightLog est inclus dans training_settings)
    if (typeof saveTrainingSettingsToSupabase === 'function') {
        saveTrainingSettingsToSupabase();
    }
    // Sync profil aussi
    if (typeof saveProfileToSupabase === 'function' && state.profile) {
        saveProfileToSupabase(state.profile);
    }
    
    // Mettre à jour les graphiques
    updateBodyWeightChart();
    updateProgressionAnalysis();
    updateDashboard();
    
    showToast(`Poids enregistré : ${weight}kg`, 'success');
}

function getLatestBodyWeight() {
    if (!state.bodyWeightLog || state.bodyWeightLog.length === 0) {
        return state.profile?.weight || null;
    }
    return state.bodyWeightLog[state.bodyWeightLog.length - 1].weight;
}

function getBodyWeightTrend(days = 7) {
    if (!state.bodyWeightLog || state.bodyWeightLog.length < 2) return null;
    
    const recent = state.bodyWeightLog.slice(-days);
    if (recent.length < 2) return null;
    
    const firstWeight = recent[0].weight;
    const lastWeight = recent[recent.length - 1].weight;
    const change = lastWeight - firstWeight;
    const changePercent = (change / firstWeight * 100).toFixed(1);
    
    return {
        change,
        changePercent,
        direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
        period: days
    };
}

// ==================== OBJECTIFS ====================

function setGoal(type, targetValue, weeks) {
    const today = new Date();
    const deadline = new Date(today);
    deadline.setDate(deadline.getDate() + (weeks * 7));
    
    const currentWeight = getLatestBodyWeight();
    
    state.goals = {
        type,
        target: { value: targetValue, unit: 'kg' },
        deadline: deadline.toISOString().split('T')[0],
        startDate: today.toISOString().split('T')[0],
        startWeight: currentWeight,
        currentStreak: state.goals?.currentStreak || 0,
        longestStreak: state.goals?.longestStreak || 0,
        weeklyProgress: []
    };
    
    // Adapter le profil automatiquement
    if (state.profile) {
        if (type === 'weight_loss') {
            state.profile.goal = 'cut';
        } else if (type === 'weight_gain' || type === 'muscle_gain') {
            state.profile.goal = 'bulk';
        } else {
            state.profile.goal = 'maintain';
        }
        
        // Recalculer les macros
        const { bmr, tdee, macros, targetCalories } = calculateProfile(state.profile);
        state.profile.bmr = bmr;
        state.profile.tdee = tdee;
        state.profile.macros = macros;
        state.profile.targetCalories = targetCalories;
    }
    
    saveState();
    
    // Sync avec Supabase
    if (typeof saveTrainingSettingsToSupabase === 'function') {
        saveTrainingSettingsToSupabase();
    }
    
    renderGoalCard();
    updateDashboard();
    showToast('Objectif défini ! 🎯', 'success');
}

function getGoalProgress() {
    if (!state.goals || !state.goals.type || !state.goals.startWeight) return null;
    
    const currentWeight = getLatestBodyWeight();
    if (!currentWeight) return null;
    
    const startWeight = state.goals.startWeight;
    const targetWeight = state.goals.target.value;
    
    const totalChange = targetWeight - startWeight;
    const currentChange = currentWeight - startWeight;
    const progressPercent = Math.abs(currentChange / totalChange * 100);
    
    // Calculer le temps écoulé et restant
    const startDate = new Date(state.goals.startDate);
    const deadline = new Date(state.goals.deadline);
    const today = new Date();
    
    const totalDays = Math.ceil((deadline - startDate) / (1000 * 60 * 60 * 24));
    const elapsedDays = Math.ceil((today - startDate) / (1000 * 60 * 60 * 24));
    const remainingDays = totalDays - elapsedDays;
    
    // Prédiction
    const weeklyRate = currentChange / (elapsedDays / 7);
    const weeksRemaining = remainingDays / 7;
    const predictedFinalWeight = currentWeight + (weeklyRate * weeksRemaining);
    const onTrack = Math.abs(predictedFinalWeight - targetWeight) < Math.abs(totalChange * 0.1);
    
    return {
        startWeight,
        currentWeight,
        targetWeight,
        currentChange,
        totalChange,
        progressPercent: Math.min(100, Math.max(0, progressPercent)),
        elapsedDays,
        remainingDays,
        onTrack,
        weeklyRate,
        predictedFinalWeight,
        status: remainingDays < 0 ? 'expired' : onTrack ? 'on_track' : 'off_track'
    };
}

// ==================== STREAKS ====================

function updateStreak() {
    const activeSessions = (state.sessionHistory || []).filter(s => !s.deletedAt);
    if (activeSessions.length === 0) {
        state.goals.currentStreak = 0;
        return;
    }

    // Grouper les séances par date
    const sessionDates = [...new Set(activeSessions.map(s => s.date))].sort().reverse();
    
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    // Si pas de séance aujourd'hui ou hier, streak à 0
    if (sessionDates[0] !== today && sessionDates[0] !== yesterdayStr) {
        state.goals.currentStreak = 0;
        return;
    }
    
    // Compter les jours consécutifs
    let streak = 0;
    let currentDate = new Date();
    
    for (let i = 0; i < 365; i++) {  // Max 1 an de streak
        const dateStr = currentDate.toISOString().split('T')[0];
        
        if (sessionDates.includes(dateStr)) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
        } else {
            break;
        }
    }
    
    state.goals.currentStreak = streak;
    
    // Mettre à jour le longest streak
    if (streak > (state.goals.longestStreak || 0)) {
        state.goals.longestStreak = streak;
    }
    
    saveState();
    
    // Sync avec Supabase
    if (typeof saveTrainingSettingsToSupabase === 'function') {
        saveTrainingSettingsToSupabase();
    }
}

// ==================== RECOMMANDATIONS INTELLIGENTES ====================

function updateProgressionRecommendations() {
    // Parcourir chaque exercice et générer des recommandations
    const recommendations = {};
    
    Object.entries(state.progressLog).forEach(([exerciseName, logs]) => {
        if (logs.length < 2) return;
        
        const recent = logs.slice(-3);  // 3 dernières séances
        const lastLog = logs[logs.length - 1];
        const previousLog = logs[logs.length - 2];
        
        // Récupérer la target de reps depuis le programme
        const targetReps = getTargetRepsForExercise(exerciseName);
        
        let recommendation = null;
        
        // Cas 1: Progression constante, reps atteintes
        if (recent.every(l => l.achievedReps >= targetReps.max * l.sets)) {
            recommendation = {
                type: 'increase_weight',
                message: `Augmenter à ${lastLog.weight + 2.5}kg`,
                nextWeight: lastLog.weight + 2.5,
                reason: 'Tu atteins régulièrement le haut de la fourchette',
                icon: '📈'
            };
        }
        // Cas 2: Stagnation (même poids depuis 3+ séances, pas de progrès reps)
        else if (recent.length >= 3 && 
                 recent.every(l => l.weight === lastLog.weight) &&
                 recent.every(l => l.achievedReps < targetReps.max * l.sets)) {
            recommendation = {
                type: 'deload',
                message: `Deload à ${Math.round(lastLog.weight * 0.9 * 2) / 2}kg`,
                nextWeight: Math.round(lastLog.weight * 0.9 * 2) / 2,
                reason: 'Stagnation détectée, un deload permettra de mieux progresser',
                icon: '⚠️'
            };
        }
        // Cas 3: Reps insuffisantes
        else if (lastLog.achievedReps < targetReps.min * lastLog.sets) {
            recommendation = {
                type: 'decrease_weight',
                message: `Réduire à ${Math.round((lastLog.weight - 5) * 2) / 2}kg`,
                nextWeight: Math.round((lastLog.weight - 5) * 2) / 2,
                reason: 'Reps en dessous du minimum, réduire pour mieux cibler',
                icon: '🔻'
            };
        }
        // Cas 4: Bonne progression, continuer
        else {
            recommendation = {
                type: 'maintain',
                message: `Continuer avec ${lastLog.weight}kg`,
                nextWeight: lastLog.weight,
                reason: 'Bonne progression, reste dans cette fourchette',
                icon: '✅'
            };
        }
        
        recommendations[exerciseName] = recommendation;
    });
    
    // Sauvegarder
    state.progressionRecommendations = recommendations;
    saveState();
    
    return recommendations;
}

function getTargetRepsForExercise(exerciseName) {
    // Chercher dans le programme actuel
    if (!state.selectedProgram) return { min: 6, max: 12 };
    
    const program = trainingPrograms[state.selectedProgram];
    const split = program.splits[state.trainingDays];
    
    for (const dayType of split) {
        const exercises = program.exercises[dayType];
        const exercise = exercises.find(ex => {
            const effectiveName = getEffectiveExerciseName(ex.name, ex.muscle);
            return effectiveName === exerciseName || ex.name === exerciseName;
        });
        
        if (exercise) {
            const repsRange = exercise.reps.split('-');
            if (repsRange.length === 2) {
                return {
                    min: parseInt(repsRange[0]),
                    max: parseInt(repsRange[1])
                };
            } else if (exercise.reps.toLowerCase() === 'max') {
                return { min: 6, max: 15 };
            }
        }
    }
    
    return { min: 6, max: 12 };  // Défaut
}

// ==================== ANALYSE DE PROGRESSION ====================

function updateProgressionAnalysis() {
    const trend = getBodyWeightTrend(7);
    const goalProgress = getGoalProgress();
    
    let analysis = {
        weightTrend: trend,
        goalStatus: goalProgress,
        recommendations: [],
        calorieAdjustment: null
    };
    
    // Si on a un objectif et une tendance
    if (goalProgress && trend) {
        const weeklyTarget = goalProgress.totalChange / (goalProgress.elapsedDays / 7 + goalProgress.remainingDays / 7);
        const weeklyActual = trend.change;
        
        // Si on est en perte de poids
        if (state.goals.type === 'weight_loss') {
            if (weeklyActual > 0) {
                // On prend du poids au lieu d'en perdre
                analysis.recommendations.push({
                    type: 'reduce_calories',
                    message: 'Réduire les calories de 200 kcal/jour',
                    icon: '🔻'
                });
                analysis.calorieAdjustment = -200;
            } else if (Math.abs(weeklyActual) < Math.abs(weeklyTarget) * 0.5) {
                // On perd pas assez vite
                analysis.recommendations.push({
                    type: 'reduce_calories',
                    message: 'Réduire les calories de 100 kcal/jour',
                    icon: '⚡'
                });
                analysis.calorieAdjustment = -100;
            } else if (Math.abs(weeklyActual) > Math.abs(weeklyTarget) * 1.5) {
                // On perd trop vite
                analysis.recommendations.push({
                    type: 'increase_calories',
                    message: 'Augmenter les calories de 100 kcal/jour',
                    icon: '⬆️'
                });
                analysis.calorieAdjustment = 100;
            }
        }
        // Si on est en prise de masse
        else if (state.goals.type === 'weight_gain' || state.goals.type === 'muscle_gain') {
            if (weeklyActual < 0) {
                // On perd du poids au lieu d'en prendre
                analysis.recommendations.push({
                    type: 'increase_calories',
                    message: 'Augmenter les calories de 200 kcal/jour',
                    icon: '⬆️'
                });
                analysis.calorieAdjustment = 200;
            } else if (weeklyActual < weeklyTarget * 0.5) {
                // On prend pas assez vite
                analysis.recommendations.push({
                    type: 'increase_calories',
                    message: 'Augmenter les calories de 150 kcal/jour',
                    icon: '⚡'
                });
                analysis.calorieAdjustment = 150;
            } else if (weeklyActual > weeklyTarget * 1.5) {
                // On prend trop vite (risque de gras)
                analysis.recommendations.push({
                    type: 'reduce_calories',
                    message: 'Réduire les calories de 100 kcal/jour',
                    icon: '🔻'
                });
                analysis.calorieAdjustment = -100;
            }
        }
    }
    
    // Vérifier les performances en training
    const trainingRecommendations = state.progressionRecommendations || {};
    const needDeload = Object.values(trainingRecommendations).filter(r => r.type === 'deload').length;
    
    if (needDeload >= 3) {
        analysis.recommendations.push({
            type: 'recovery',
            message: `${needDeload} exercices en stagnation. Semaine de deload recommandée.`,
            icon: '🛌'
        });
    }
    
    state.progressionAnalysis = analysis;
    saveState();
    
    return analysis;
}

// Appliquer automatiquement l'ajustement calorique recommandé
function applyCalorieAdjustment() {
    if (!state.progressionAnalysis || !state.progressionAnalysis.calorieAdjustment) {
        showToast('Aucun ajustement recommandé', 'info');
        return;
    }
    
    const adjustment = state.progressionAnalysis.calorieAdjustment;
    
    if (!state.profile) {
        showToast('Profil non configuré', 'error');
        return;
    }
    
    state.profile.targetCalories += adjustment;
    
    // Recalculer les macros
    const weight = getLatestBodyWeight() || state.profile.weight;
    const newMacros = calculateMacros(state.profile.targetCalories, weight, state.profile.goal);
    state.profile.macros = newMacros;
    
    saveState();
    updateDashboard();
    
    const sign = adjustment > 0 ? '+' : '';
    showToast(`Calories ajustées : ${sign}${adjustment} kcal/jour`, 'success');
}

// ==================== UI RENDERING ====================

function renderBodyWeightCard() {
    const latestWeight = getLatestBodyWeight();
    const trend = getBodyWeightTrend(7);
    
    let html = `
        <div class="card">
            <div class="card-header">
                <div class="card-title">
                    <span class="icon">⚖️</span>
                    Poids Corporel
                </div>
                <button class="btn btn-sm btn-primary" onclick="openLogWeightModal()">📝 Logger</button>
            </div>
            <div style="padding: 20px;">
                <div style="text-align: center;">
                    <div style="font-size: 3rem; font-weight: 700; font-family: 'Space Mono', monospace;">
                        ${latestWeight ? latestWeight.toFixed(1) : '--'}
                        <span style="font-size: 1.5rem; color: var(--text-secondary);">kg</span>
                    </div>
                </div>
    `;
    
    if (trend) {
        const arrow = trend.direction === 'up' ? '↗️' : trend.direction === 'down' ? '↘️' : '➡️';
        const color = trend.direction === 'up' ? 'var(--warning)' : trend.direction === 'down' ? 'var(--info)' : 'var(--text-secondary)';
        
        html += `
            <div style="text-align: center; margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--border-color);">
                <span style="font-size: 0.9rem; color: var(--text-secondary);">Sur 7 jours : </span>
                <span style="font-size: 1.1rem; color: ${color}; font-weight: 600;">
                    ${arrow} ${trend.change > 0 ? '+' : ''}${trend.change.toFixed(1)}kg 
                    (${trend.changePercent > 0 ? '+' : ''}${trend.changePercent}%)
                </span>
            </div>
        `;
    }
    
    html += `
            </div>
        </div>
    `;
    
    return html;
}

function renderGoalCard() {
    const progress = getGoalProgress();
    
    if (!state.goals || !state.goals.type) {
        return `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">
                        <span class="icon">🎯</span>
                        Objectif
                    </div>
                    <button class="btn btn-sm btn-primary" onclick="openSetGoalModal()">Définir</button>
                </div>
                <div style="padding: 20px; text-align: center; color: var(--text-secondary);">
                    Définissez un objectif pour suivre votre progression
                </div>
            </div>
        `;
    }
    
    const goalTypes = {
        'weight_loss': 'Perte de poids',
        'weight_gain': 'Prise de poids',
        'muscle_gain': 'Prise de muscle',
        'strength': 'Force',
        'maintenance': 'Maintien'
    };
    
    let html = `
        <div class="card">
            <div class="card-header">
                <div class="card-title">
                    <span class="icon">🎯</span>
                    ${goalTypes[state.goals.type]}
                </div>
                <button class="btn btn-sm btn-secondary" onclick="openSetGoalModal()">Modifier</button>
            </div>
            <div style="padding: 20px;">
    `;
    
    if (progress) {
        const statusColors = {
            'on_track': 'var(--accent-primary)',
            'off_track': 'var(--warning)',
            'expired': 'var(--danger)'
        };
        
        const statusLabels = {
            'on_track': '✅ Sur la bonne voie',
            'off_track': '⚠️ Hors trajectoire',
            'expired': '⏰ Échéance dépassée'
        };
        
        html += `
            <div style="margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="font-weight: 600;">${progress.currentWeight.toFixed(1)}kg</span>
                    <span style="font-weight: 600;">🎯 ${progress.targetWeight}kg</span>
                </div>
                <div style="width: 100%; height: 8px; background: var(--bg-tertiary); border-radius: 4px; overflow: hidden;">
                    <div style="width: ${progress.progressPercent}%; height: 100%; background: ${statusColors[progress.status]}; transition: width 0.3s;"></div>
                </div>
                <div style="text-align: center; margin-top: 8px; font-size: 0.85rem; color: ${statusColors[progress.status]};">
                    ${statusLabels[progress.status]}
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--border-color);">
                <div style="text-align: center;">
                    <div style="font-size: 1.5rem; font-weight: 700; color: var(--accent-primary);">${Math.abs(progress.currentChange).toFixed(1)}kg</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">Progression</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary);">${progress.remainingDays}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">Jours restants</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 1.5rem; font-weight: 700; color: var(--text-secondary);">${progress.weeklyRate.toFixed(2)}kg</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">Par semaine</div>
                </div>
            </div>
        `;
        
        // Prédiction
        if (progress.status !== 'expired') {
            html += `
                <div style="margin-top: 15px; padding: 12px; background: var(--bg-tertiary); border-radius: 8px; font-size: 0.85rem;">
                    📊 Projection: <strong>${progress.predictedFinalWeight.toFixed(1)}kg</strong> 
                    ${progress.onTrack ? '✅' : '⚠️'}
                </div>
            `;
        }
    }
    
    html += `
            </div>
        </div>
    `;
    
    return html;
}

function renderStreakCard() {
    const streak = state.goals?.currentStreak || 0;
    const longest = state.goals?.longestStreak || 0;
    
    return `
        <div class="card">
            <div class="card-header">
                <div class="card-title">
                    <span class="icon">🔥</span>
                    Série d'entraînements
                </div>
            </div>
            <div style="padding: 20px; text-align: center;">
                <div style="font-size: 4rem; margin-bottom: 10px;">🔥</div>
                <div style="font-size: 2.5rem; font-weight: 700; color: var(--accent-brand);">
                    ${streak}
                    <span style="font-size: 1rem; color: var(--text-secondary);">jours</span>
                </div>
                <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 10px;">
                    Record : ${longest} jours 🏆
                </div>
            </div>
        </div>
    `;
}

function renderRecommendationsCard() {
    const container = document.getElementById('recommendations-card');
    const analysis = state.progressionAnalysis;
    const trainingRecs = state.progressionRecommendations || {};
    
    // Fallback si pas de données
    if (!analysis && Object.keys(trainingRecs).length === 0) {
        if (container) {
            container.innerHTML = `
                <div class="readiness-card">
                    <h3>Recommandations</h3>
                    <p class="rec-empty" style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 8px;">
                        Complète quelques séances pour recevoir des conseils personnalisés.
                    </p>
                </div>
            `;
        }
        return '';
    }
    
    let html = `
        <div class="recommendations-card">
            <div class="recommendations-header">
                <div class="recommendations-title">
                    <span class="icon">💡</span>
                    Recommandations
                </div>
            </div>
            <div class="recommendations-content">
    `;
    
    // Recommandations nutrition
    if (analysis && analysis.recommendations.length > 0) {
        analysis.recommendations.forEach(rec => {
            html += `
                <div class="rec-item">
                    <span class="rec-icon">${rec.icon}</span>
                    <span class="rec-text">${rec.message}</span>
                </div>
            `;
        });
        
        if (analysis.calorieAdjustment) {
            html += `
                <button class="btn btn-primary btn-sm" onclick="applyCalorieAdjustment()" style="width: 100%; margin-top: 8px;">
                    Appliquer l'ajustement
                </button>
            `;
        }
    }
    
    // Top 3 recommandations training
    const topTraining = Object.entries(trainingRecs)
        .filter(([_, rec]) => rec.type !== 'maintain')
        .slice(0, 3);
    
    if (topTraining.length > 0) {
        html += `<div class="rec-section-label">Progression exercices :</div>`;
        
        topTraining.forEach(([exercise, rec]) => {
            html += `
                <div class="rec-exercise-item">
                    <div class="rec-exercise-name">${rec.icon} ${exercise}</div>
                    <div class="rec-exercise-detail">${rec.message}</div>
                </div>
            `;
        });
    }
    
    html += `
            </div>
        </div>
    `;
    
    return html;
}

// Graphique du poids corporel
let bodyWeightChart = null;
let currentWeightChartPeriod = 30; // jours par défaut

function updateBodyWeightChart() {
    const ctx = document.getElementById('bodyweight-chart');
    if (!ctx) return;
    
    const logs = state.bodyWeightLog || [];
    
    // Détruire le graphique existant
    if (bodyWeightChart) {
        bodyWeightChart.destroy();
        bodyWeightChart = null;
    }
    
    if (logs.length < 2) {
        // Afficher message si pas assez de données
        const canvas = ctx;
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = '#606070';
        context.font = '14px Outfit';
        context.textAlign = 'center';
        context.fillText('Enregistrez plusieurs poids pour voir l\'évolution', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    // Trier par date et filtrer selon la période
    const sortedLogs = [...logs].sort((a, b) => new Date(a.date) - new Date(b.date));
    const now = new Date();
    const filterDate = new Date(now.getTime() - currentWeightChartPeriod * 24 * 60 * 60 * 1000);
    const filteredLogs = sortedLogs.filter(log => new Date(log.date) >= filterDate);
    
    if (filteredLogs.length === 0) {
        const canvas = ctx;
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = '#606070';
        context.font = '14px Outfit';
        context.textAlign = 'center';
        context.fillText('Aucune donnée pour cette période', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    const labels = filteredLogs.map(l => {
        const date = new Date(l.date);
        return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    });
    const weights = filteredLogs.map(l => l.weight);
    
    bodyWeightChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Poids (kg)',
                data: weights,
                borderColor: '#00ff88',
                backgroundColor: 'rgba(0, 255, 136, 0.1)',
                tension: 0.3,
                fill: true,
                pointRadius: 4,
                pointBackgroundColor: '#00ff88',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2
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
                            return context.parsed.y.toFixed(1) + ' kg';
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        color: '#606070',
                        font: { family: 'Outfit' }
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        color: '#00ff88',
                        font: { family: 'Space Mono' },
                        callback: function(value) {
                            return value.toFixed(1) + ' kg';
                        }
                    }
                }
            }
        }
    });
}

function filterWeightChart(days) {
    currentWeightChartPeriod = days;
    
    // Mettre à jour les boutons actifs
    document.querySelectorAll('#bodyweight-chart-card .filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (parseInt(btn.dataset.period) === days) {
            btn.classList.add('active');
        }
    });
    
    updateBodyWeightChart();
}

// ==================== MODALS ====================

function openLogWeightModal() {
    const modal = document.getElementById('log-weight-modal');
    if (!modal) {
        // Créer la modal si elle n'existe pas
        createLogWeightModal();
    }
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('log-weight-date').value = today;
    document.getElementById('log-weight-value').value = getLatestBodyWeight() || '';
    
    openModal('log-weight-modal');
}

function createLogWeightModal() {
    const modalHTML = `
        <div class="modal-overlay" id="log-weight-modal">
            <div class="modal">
                <div class="modal-header">
                    <div class="modal-title">Logger le Poids</div>
                    <button class="modal-close" onclick="closeModal('log-weight-modal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">Date</label>
                        <input type="date" class="form-input" id="log-weight-date">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Poids (kg)</label>
                        <input type="number" class="form-input" id="log-weight-value" step="0.1" placeholder="75.5">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal('log-weight-modal')">Annuler</button>
                    <button class="btn btn-primary" onclick="saveLogWeight()">Enregistrer</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function saveLogWeight() {
    const date = document.getElementById('log-weight-date').value;
    const weight = parseFloat(document.getElementById('log-weight-value').value);
    
    logBodyWeight(weight, date);
    closeModal('log-weight-modal');
}

function openSetGoalModal() {
    const modal = document.getElementById('set-goal-modal');
    if (!modal) {
        createSetGoalModal();
    }
    
    // Pré-remplir si un objectif existe
    if (state.goals && state.goals.type) {
        document.getElementById('goal-type').value = state.goals.type;
        document.getElementById('goal-target').value = state.goals.target.value;
        
        const startDate = new Date(state.goals.startDate);
        const deadline = new Date(state.goals.deadline);
        const weeks = Math.round((deadline - startDate) / (7 * 24 * 60 * 60 * 1000));
        document.getElementById('goal-weeks').value = weeks;
    }
    
    openModal('set-goal-modal');
}

function createSetGoalModal() {
    const modalHTML = `
        <div class="modal-overlay" id="set-goal-modal">
            <div class="modal">
                <div class="modal-header">
                    <div class="modal-title">Définir un Objectif</div>
                    <button class="modal-close" onclick="closeModal('set-goal-modal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">Type d'objectif</label>
                        <select class="form-select" id="goal-type" onchange="updateGoalTargetLabel()">
                            <option value="weight_loss">Perte de poids</option>
                            <option value="weight_gain">Prise de poids</option>
                            <option value="muscle_gain">Prise de muscle</option>
                            <option value="maintenance">Maintien</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label" id="goal-target-label">Poids cible (kg)</label>
                        <input type="number" class="form-input" id="goal-target" step="0.5" placeholder="70">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Durée (semaines)</label>
                        <input type="number" class="form-input" id="goal-weeks" min="1" max="52" value="12">
                    </div>
                    <div style="padding: 12px; background: var(--bg-tertiary); border-radius: 8px; font-size: 0.85rem; color: var(--text-secondary);">
                        💡 Une progression saine est de 0.5-1kg par semaine
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal('set-goal-modal')">Annuler</button>
                    <button class="btn btn-primary" onclick="saveGoal()">Définir l'objectif</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function updateGoalTargetLabel() {
    const type = document.getElementById('goal-type').value;
    const label = document.getElementById('goal-target-label');
    
    if (type === 'maintenance') {
        label.textContent = 'Poids de maintien (kg)';
    } else {
        label.textContent = 'Poids cible (kg)';
    }
}

function saveGoal() {
    const type = document.getElementById('goal-type').value;
    const target = parseFloat(document.getElementById('goal-target').value);
    const weeks = parseInt(document.getElementById('goal-weeks').value);
    
    if (isNaN(target) || target <= 0) {
        showToast('Poids cible invalide', 'error');
        return;
    }
    
    if (isNaN(weeks) || weeks < 1) {
        showToast('Durée invalide', 'error');
        return;
    }
    
    const currentWeight = getLatestBodyWeight();
    if (!currentWeight) {
        showToast('Loggez d\'abord votre poids actuel', 'error');
        return;
    }
    
    setGoal(type, target, weeks);
    closeModal('set-goal-modal');
}

// ==================== INSIGHTS AUTOMATIQUES ====================

/**
 * Génère les insights hebdomadaires de l'utilisateur
 * Analyse les performances, la nutrition, et la récupération
 * @returns {Array} - Liste d'insights { type, title, message, priority, icon }
 */
function generateWeeklyInsights() {
    const insights = [];
    
    // 1. Insight Volume d'entraînement
    const volumeInsight = getVolumeInsight();
    if (volumeInsight) insights.push(volumeInsight);
    
    // 2. Insight Progression (nouveaux PRs)
    const progressionInsight = getProgressionInsight();
    if (progressionInsight) insights.push(progressionInsight);
    
    // 3. Insight Récupération
    const recoveryInsight = getRecoveryInsight();
    if (recoveryInsight) insights.push(recoveryInsight);
    
    // 4. Insight Nutrition
    const nutritionInsight = getNutritionInsight();
    if (nutritionInsight) insights.push(nutritionInsight);
    
    // 5. Insight Streak/Constance
    const streakInsight = getStreakInsight();
    if (streakInsight) insights.push(streakInsight);
    
    // Trier par priorité
    insights.sort((a, b) => b.priority - a.priority);
    
    return insights;
}

/**
 * Analyse le volume d'entraînement de la semaine
 * OPTIMISÉ: Limite aux 50 dernières sessions
 * FIX: Utilise semaine calendaire (lundi-dimanche) au lieu de fenêtre glissante
 */
function getVolumeInsight() {
    if (!state.sessionHistory || state.sessionHistory.filter(s => !s.deletedAt).length === 0) return null;

    // FIX: Calculer le lundi de la semaine actuelle (semaine calendaire)
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = dimanche, 1 = lundi, etc.
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const mondayThisWeek = new Date(today);
    mondayThisWeek.setDate(today.getDate() - daysToMonday);
    mondayThisWeek.setHours(0, 0, 0, 0);

    const mondayLastWeek = new Date(mondayThisWeek);
    mondayLastWeek.setDate(mondayThisWeek.getDate() - 7);

    const mondayTwoWeeksAgo = new Date(mondayLastWeek);
    mondayTwoWeeksAgo.setDate(mondayLastWeek.getDate() - 7);
    
    let currentWeekSessions = 0;
    let currentWeekVolume = 0;
    let lastWeekSessions = 0;
    let lastWeekVolume = 0;
    
    // OPTIMISATION: Ne traiter que les 50 dernières sessions actives
    const recentSessions = (state.sessionHistory || []).filter(s => !s.deletedAt).slice(-50);

    for (const session of recentSessions) {
        const sessionDate = new Date(session.date);
        sessionDate.setHours(0, 0, 0, 0);

        // Ignorer les sessions trop anciennes (plus de 2 semaines)
        if (sessionDate < mondayTwoWeeksAgo) continue;

        let sessionVolume = 0;
        for (const ex of (session.exercises || [])) {
            sessionVolume += (ex.achievedSets || ex.sets || 0) *
                            (ex.achievedReps || ex.reps || 0) *
                            (ex.weight || 10);
        }

        // FIX: Semaine calendaire au lieu de fenêtre glissante
        if (sessionDate >= mondayThisWeek) {
            // Cette semaine (depuis lundi)
            currentWeekSessions++;
            currentWeekVolume += sessionVolume;
        } else if (sessionDate >= mondayLastWeek) {
            // Semaine dernière (lundi-dimanche)
            lastWeekSessions++;
            lastWeekVolume += sessionVolume;
        }
    }
    
    // Pas de données la semaine dernière
    if (lastWeekSessions === 0 && currentWeekSessions === 0) return null;
    
    const volumeChange = lastWeekVolume > 0 
        ? Math.round(((currentWeekVolume - lastWeekVolume) / lastWeekVolume) * 100)
        : 0;
    
    let message, icon, priority;
    
    if (volumeChange > 20) {
        message = `Volume +${volumeChange}% cette semaine ! Attention à ne pas sur-entraîner.`;
        icon = '🔥';
        priority = 3;
    } else if (volumeChange > 0) {
        message = `Volume en hausse de ${volumeChange}%. Bonne progression !`;
        icon = '📈';
        priority = 2;
    } else if (volumeChange < -20) {
        message = `Volume en baisse de ${Math.abs(volumeChange)}%. Période de récupération ?`;
        icon = '💤';
        priority = 2;
    } else if (currentWeekSessions < lastWeekSessions) {
        message = `${currentWeekSessions} séance${currentWeekSessions > 1 ? 's' : ''} vs ${lastWeekSessions} la semaine dernière.`;
        icon = '📊';
        priority = 1;
    } else {
        message = `${currentWeekSessions} séance${currentWeekSessions > 1 ? 's' : ''} cette semaine. Continue !`;
        icon = '💪';
        priority = 1;
    }
    
    return {
        type: 'volume',
        title: 'Volume d\'entraînement',
        message,
        icon,
        priority
    };
}

/**
 * Analyse les nouveaux records personnels
 */
function getProgressionInsight() {
    if (!state.progressLog) return null;
    
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    let newPRs = 0;
    const prExercises = [];
    
    Object.entries(state.progressLog).forEach(([exercise, logs]) => {
        if (logs.length < 2) return;
        
        const recentLogs = logs.filter(l => new Date(l.date) >= oneWeekAgo);
        if (recentLogs.length === 0) return;
        
        // Trouver le max historique avant cette semaine
        const oldLogs = logs.filter(l => new Date(l.date) < oneWeekAgo);
        if (oldLogs.length === 0) return;
        
        const maxOldWeight = Math.max(...oldLogs.map(l => l.weight || 0));
        const maxRecentWeight = Math.max(...recentLogs.map(l => l.weight || 0));
        
        if (maxRecentWeight > maxOldWeight) {
            newPRs++;
            prExercises.push(exercise);
        }
    });
    
    if (newPRs === 0) return null;
    
    return {
        type: 'progression',
        title: 'Records personnels',
        message: `🎉 ${newPRs} nouveau${newPRs > 1 ? 'x' : ''} PR cette semaine ! (${prExercises.slice(0, 2).join(', ')}${prExercises.length > 2 ? '...' : ''})`,
        icon: '🏆',
        priority: 4
    };
}

/**
 * Analyse la récupération musculaire
 */
function getRecoveryInsight() {
    if (typeof SmartTraining === 'undefined') return null;
    
    const recovery = SmartTraining.calculateMuscleRecovery();
    
    // Compter les muscles fatigués
    const fatiguedMuscles = Object.entries(recovery)
        .filter(([_, data]) => data.recovery < 50 && data.lastWorked !== null)
        .map(([muscle, data]) => ({
            name: SmartTraining.MUSCLE_GROUPS[muscle]?.name || muscle,
            recovery: data.recovery
        }));
    
    // Compter les muscles sous-entraînés (>7 jours sans travail)
    const undertrainedMuscles = Object.entries(recovery)
        .filter(([_, data]) => data.daysAgo > 7 || (data.lastWorked === null && Object.keys(state.sessionHistory || {}).length > 3))
        .map(([muscle, _]) => SmartTraining.MUSCLE_GROUPS[muscle]?.name || muscle);
    
    if (fatiguedMuscles.length > 0) {
        return {
            type: 'recovery',
            title: 'Récupération',
            message: `${fatiguedMuscles[0].name} fatigué (${fatiguedMuscles[0].recovery}%). Privilégiez d'autres muscles.`,
            icon: '⚠️',
            priority: 3
        };
    }
    
    if (undertrainedMuscles.length > 0) {
        return {
            type: 'recovery',
            title: 'Muscles oubliés',
            message: `${undertrainedMuscles.slice(0, 2).join(' et ')} pas entraîné${undertrainedMuscles.length > 1 ? 's' : ''} depuis longtemps.`,
            icon: '🎯',
            priority: 2
        };
    }
    
    return null;
}

/**
 * Analyse la nutrition de la semaine
 */
function getNutritionInsight() {
    if (!state.foodJournal || !state.profile?.macros) return null;
    
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    let daysWithDeficit = 0;
    let daysWithSurplus = 0;
    let totalProteinPercent = 0;
    let daysLogged = 0;
    
    // Analyser les 7 derniers jours
    for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const entries = state.foodJournal[dateStr] || [];
        if (entries.length === 0) continue;
        
        daysLogged++;
        
        // Calculer les macros de la journée
        let dayCalories = 0;
        let dayProtein = 0;
        
        entries.forEach(entry => {
            const food = state.foods?.find(f => f.id === entry.foodId);
            if (!food) return;
            
            const ratio = (entry.quantity || 100) / 100;
            dayCalories += (food.calories || 0) * ratio;
            dayProtein += (food.protein || 0) * ratio;
        });
        
        const targetCalories = state.profile.targetCalories || 2000;
        const targetProtein = state.profile.macros.protein || 150;
        
        if (dayCalories < targetCalories * 0.8) daysWithDeficit++;
        if (dayCalories > targetCalories * 1.2) daysWithSurplus++;
        totalProteinPercent += (dayProtein / targetProtein) * 100;
    }
    
    if (daysLogged === 0) {
        return {
            type: 'nutrition',
            title: 'Nutrition',
            message: 'Aucun repas logué cette semaine. Suivez votre alimentation !',
            icon: '🍽️',
            priority: 2
        };
    }
    
    const avgProteinPercent = Math.round(totalProteinPercent / daysLogged);
    
    if (daysWithDeficit >= 3) {
        return {
            type: 'nutrition',
            title: 'Déficit calorique',
            message: `${daysWithDeficit} jours en déficit cette semaine. Attention à la récupération.`,
            icon: '📉',
            priority: 3
        };
    }
    
    if (avgProteinPercent < 80) {
        return {
            type: 'nutrition',
            title: 'Protéines insuffisantes',
            message: `Moyenne ${avgProteinPercent}% de l'objectif protéines. Augmentez l'apport !`,
            icon: '🥩',
            priority: 3
        };
    }
    
    if (avgProteinPercent >= 100 && daysLogged >= 5) {
        return {
            type: 'nutrition',
            title: 'Nutrition au top',
            message: `Objectifs protéines atteints ${daysLogged}/7 jours. Excellent !`,
            icon: '✅',
            priority: 1
        };
    }
    
    return null;
}

/**
 * Analyse le streak d'entraînement
 */
function getStreakInsight() {
    const currentStreak = state.goals?.currentStreak || 0;
    const longestStreak = state.goals?.longestStreak || 0;
    
    if (currentStreak === 0) return null;
    
    if (currentStreak >= longestStreak && currentStreak >= 5) {
        return {
            type: 'streak',
            title: 'Record de constance !',
            message: `${currentStreak} jours d'affilée ! Nouveau record personnel.`,
            icon: '🔥',
            priority: 4
        };
    }
    
    if (currentStreak >= 7) {
        return {
            type: 'streak',
            title: 'Semaine complète',
            message: `${currentStreak} jours consécutifs. La régularité paie !`,
            icon: '📅',
            priority: 2
        };
    }
    
    if (currentStreak >= 3) {
        return {
            type: 'streak',
            title: 'Bien parti !',
            message: `${currentStreak} jours d'entraînement. Continue !`,
            icon: '💪',
            priority: 1
        };
    }
    
    return null;
}

/**
 * Affiche les insights sur le dashboard
 */
function renderInsightsWidget() {
    const container = document.getElementById('insights-container');
    if (!container) return;
    
    const insights = generateWeeklyInsights();
    
    if (insights.length === 0) {
        container.innerHTML = `
            <div class="insights-empty">
                <span class="insights-empty-icon">📊</span>
                <p>Entraînez-vous et loguez vos repas pour voir vos insights personnalisés.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = insights.slice(0, 4).map(insight => `
        <div class="insight-item insight-${insight.type}">
            <span class="insight-icon">${insight.icon}</span>
            <div class="insight-content">
                <div class="insight-title">${insight.title}</div>
                <div class="insight-message">${insight.message}</div>
            </div>
        </div>
    `).join('');
}

// ==================== SMART INSIGHTS ====================

/**
 * Detecte les muscles sous-travailles (non travailles depuis >5 jours)
 */
function getNeglectedMuscles() {
    const now = Date.now();
    const fourteenDaysAgo = now - (14 * 24 * 60 * 60 * 1000);
    
    // Compter les jours depuis la derniere seance par muscle
    const lastWorkoutByMuscle = {};
    
    // Parcourir l'historique des 14 derniers jours
    (state.sessionHistory || []).forEach(session => {
        const sessionDate = new Date(session.date).getTime();
        if (sessionDate < fourteenDaysAgo) return;
        
        session.exercises?.forEach(exData => {
            // Trouver le muscle de l'exercice
            const exercise = defaultExercises.find(e => e.name === exData.exercise);
            if (!exercise) return;
            
            const muscle = exercise.muscle;
            if (!muscle) return;
            
            // Garder seulement la seance la plus recente pour ce muscle
            if (!lastWorkoutByMuscle[muscle] || sessionDate > lastWorkoutByMuscle[muscle]) {
                lastWorkoutByMuscle[muscle] = sessionDate;
            }
        });
    });
    
    // Identifier les muscles negliges (>5 jours)
    const neglected = [];
    const fiveDaysAgo = now - (5 * 24 * 60 * 60 * 1000);
    
    Object.keys(muscleGroups).forEach(muscleKey => {
        const lastWorkout = lastWorkoutByMuscle[muscleKey];
        
        if (!lastWorkout || lastWorkout < fiveDaysAgo) {
            const daysSince = lastWorkout 
                ? Math.floor((now - lastWorkout) / (24 * 60 * 60 * 1000))
                : 14; // Si jamais travaille, on met 14 jours
            
            neglected.push({
                muscle: muscleKey,
                muscleName: muscleGroups[muscleKey].name,
                daysSince
            });
        }
    });
    
    // Trier par nombre de jours (plus negliges en premier)
    return neglected.sort((a, b) => b.daysSince - a.daysSince);
}

/**
 * Compare le volume total cette semaine vs semaine precedente
 */
function getWeeklyVolumeComparison() {
    const now = new Date();
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() - now.getDay() + 1); // Lundi
    currentWeekStart.setHours(0, 0, 0, 0);
    
    const lastWeekStart = new Date(currentWeekStart);
    lastWeekStart.setDate(currentWeekStart.getDate() - 7);
    
    const lastWeekEnd = new Date(currentWeekStart);
    lastWeekEnd.setTime(lastWeekEnd.getTime() - 1);
    
    let currentWeekVolume = 0;
    let lastWeekVolume = 0;
    
    (state.sessionHistory || []).forEach(session => {
        const sessionDate = new Date(session.date);
        
        // Calculer le volume de la seance
        let sessionVolume = 0;
        session.exercises?.forEach(ex => {
            ex.sets?.forEach(set => {
                if (set.completed) {
                    sessionVolume += (set.weight || 0) * (set.reps || 0);
                }
            });
        });
        
        // Ajouter au bon compteur
        if (sessionDate >= currentWeekStart) {
            currentWeekVolume += sessionVolume;
        } else if (sessionDate >= lastWeekStart && sessionDate <= lastWeekEnd) {
            lastWeekVolume += sessionVolume;
        }
    });
    
    // Calculer le pourcentage de variation
    if (lastWeekVolume === 0 && currentWeekVolume === 0) {
        return { change: 0, currentVolume: 0, lastVolume: 0 };
    }
    
    if (lastWeekVolume === 0) {
        return { change: 100, currentVolume: currentWeekVolume, lastVolume: 0 };
    }
    
    const changePercent = Math.round(((currentWeekVolume - lastWeekVolume) / lastWeekVolume) * 100);
    
    return {
        change: changePercent,
        currentVolume: Math.round(currentWeekVolume / 1000), // En tonnes
        lastVolume: Math.round(lastWeekVolume / 1000)
    };
}

/**
 * Detecte les desequilibres musculaires
 */
function getMuscleBalance() {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    // Calculer le volume par muscle sur 30 jours
    const volumeByMuscle = {};
    
    (state.sessionHistory || []).forEach(session => {
        const sessionDate = new Date(session.date).getTime();
        if (sessionDate < thirtyDaysAgo) return;
        
        session.exercises?.forEach(exData => {
            const exercise = defaultExercises.find(e => e.name === exData.exercise);
            if (!exercise) return;
            
            const muscle = exercise.muscle;
            if (!muscle) return;
            
            exData.sets?.forEach(set => {
                if (set.completed) {
                    const volume = (set.weight || 0) * (set.reps || 0);
                    volumeByMuscle[muscle] = (volumeByMuscle[muscle] || 0) + volume;
                }
            });
        });
    });
    
    // Comparer les ratios entre groupes antagonistes
    const imbalances = [];
    
    // Pectoraux vs Dos (ideal ~1:1)
    const chestVolume = volumeByMuscle['chest'] || 0;
    const backVolume = volumeByMuscle['back'] || 0;
    if (chestVolume > 0 && backVolume > 0) {
        const ratio = chestVolume / backVolume;
        if (ratio > 1.5) {
            imbalances.push({
                group1: 'Pectoraux',
                group2: 'Dos',
                ratio: ratio.toFixed(1),
                suggestion: 'Ajouter du volume dos'
            });
        } else if (ratio < 0.67) {
            imbalances.push({
                group1: 'Dos',
                group2: 'Pectoraux',
                ratio: (1 / ratio).toFixed(1),
                suggestion: 'Ajouter du volume pectoraux'
            });
        }
    }
    
    // Quadriceps vs Ischio-jambiers (ideal ~1:1)
    const quadsVolume = volumeByMuscle['quads'] || 0;
    const hamsVolume = volumeByMuscle['hamstrings'] || 0;
    if (quadsVolume > 0 && hamsVolume > 0) {
        const ratio = quadsVolume / hamsVolume;
        if (ratio > 1.5) {
            imbalances.push({
                group1: 'Quadriceps',
                group2: 'Ischio-jambiers',
                ratio: ratio.toFixed(1),
                suggestion: 'Ajouter du volume ischio-jambiers'
            });
        } else if (ratio < 0.67) {
            imbalances.push({
                group1: 'Ischio-jambiers',
                group2: 'Quadriceps',
                ratio: (1 / ratio).toFixed(1),
                suggestion: 'Ajouter du volume quadriceps'
            });
        }
    }
    
    // Biceps vs Triceps (ideal ~0.7:1, triceps plus fort)
    const bicepsVolume = volumeByMuscle['biceps'] || 0;
    const tricepsVolume = volumeByMuscle['triceps'] || 0;
    if (bicepsVolume > 0 && tricepsVolume > 0) {
        const ratio = bicepsVolume / tricepsVolume;
        if (ratio > 1.2) {
            imbalances.push({
                group1: 'Biceps',
                group2: 'Triceps',
                ratio: ratio.toFixed(1),
                suggestion: 'Ajouter du volume triceps'
            });
        } else if (ratio < 0.5) {
            imbalances.push({
                group1: 'Triceps',
                group2: 'Biceps',
                ratio: (1 / ratio).toFixed(1),
                suggestion: 'Ajouter du volume biceps'
            });
        }
    }
    
    return imbalances;
}

/**
 * Genere tous les insights intelligents
 */
function generateSmartInsights() {
    const insights = [];
    
    // 1. Volume hebdomadaire
    const volumeComparison = getWeeklyVolumeComparison();
    if (volumeComparison.currentVolume > 0 || volumeComparison.lastVolume > 0) {
        if (volumeComparison.change > 15) {
            insights.push({
                type: 'success',
                icon: '📈',
                message: `+${volumeComparison.change}% de volume cette semaine - Excellente progression !`,
                explanation: `Tu as soulevé ${volumeComparison.currentVolume}t cette semaine contre ${volumeComparison.lastVolume}t la semaine dernière. Cette surcharge progressive est idéale pour stimuler l'hypertrophie.`,
                priority: 2
            });
        } else if (volumeComparison.change < -20) {
            insights.push({
                type: 'info',
                icon: '📉',
                message: `Volume en baisse de ${Math.abs(volumeComparison.change)}% - Semaine de récupération ?`,
                explanation: `Une baisse de volume peut être bénéfique pour la récupération (deload). Si ce n'était pas prévu, essaie d'augmenter progressivement la semaine prochaine.`,
                priority: 2
            });
        } else if (Math.abs(volumeComparison.change) <= 10 && volumeComparison.currentVolume > 0) {
            insights.push({
                type: 'info',
                icon: '✅',
                message: `Volume stable cette semaine (${volumeComparison.currentVolume}t)`,
                explanation: `Maintenir un volume constant est bien pour consolider tes acquis. Pour progresser, essaie d'ajouter 5-10% de volume la semaine prochaine.`,
                priority: 3
            });
        }
    }
    
    // 2. Muscles negliges (avec icônes SVG)
    const neglectedMuscles = getNeglectedMuscles();
    if (neglectedMuscles.length > 0) {
        // Prendre seulement les 2 plus negliges
        neglectedMuscles.slice(0, 2).forEach(muscle => {
            if (muscle.daysSince >= 7) {
                // Utiliser l'icône SVG du muscle si disponible
                let muscleIcon = '⚠️';
                if (window.MuscleIcons && muscle.muscle) {
                    const svgIcon = window.MuscleIcons.getMuscleIcon(muscle.muscle);
                    if (svgIcon) {
                        muscleIcon = `<img src="${svgIcon}" class="insight-muscle-icon" alt="${muscle.muscleName}">`;
                    }
                }
                
                insights.push({
                    type: 'warning',
                    icon: muscleIcon,
                    message: `${muscle.muscleName} non travaillé${muscle.muscleName.endsWith('s') ? 's' : ''} depuis ${muscle.daysSince} jours`,
                    explanation: `Pour une croissance musculaire optimale, chaque groupe devrait être travaillé au moins 2x par semaine. Planifie une séance ${muscle.muscleName.toLowerCase()} bientôt.`,
                    priority: 1
                });
            }
        });
    } else if ((state.sessionHistory || []).length > 0) {
        insights.push({
            type: 'success',
            icon: '✅',
            message: 'Tous les groupes musculaires travaillés cette semaine',
            explanation: `Excellent équilibre ! Tu as bien réparti ton entraînement sur tous les groupes musculaires. Continue comme ça pour un développement harmonieux.`,
            priority: 3
        });
    }
    
    // 3. Desequilibres musculaires
    const imbalances = getMuscleBalance();
    if (imbalances.length > 0) {
        // Prendre seulement le premier desequilibre
        const imbalance = imbalances[0];
        insights.push({
            type: 'warning',
            icon: '⚖️',
            message: `Déséquilibre ${imbalance.group1}/${imbalance.group2} (ratio ${imbalance.ratio}) - ${imbalance.suggestion}`,
            explanation: `Un ratio idéal est proche de 1:1 pour ces groupes antagonistes. Un déséquilibre peut mener à des problèmes posturaux ou des blessures. Ajoute 2-3 séries supplémentaires pour ${imbalance.group2.toLowerCase()} par séance.`,
            priority: 1
        });
    }
    
    // Trier par priorite (1 = plus important)
    insights.sort((a, b) => a.priority - b.priority);
    
    // Limiter a 4 insights max
    return insights.slice(0, 4);
}

/**
 * Rend un item d'insight avec explication
 */
function renderInsightItem(insight) {
    const hasExplanation = insight.explanation && insight.explanation.length > 0;
    
    return `
        <div class="insight-item ${insight.type}${hasExplanation ? ' has-explanation' : ''}">
            <span class="insight-icon">${insight.icon}</span>
            <div class="insight-content">
                <div class="insight-text">${insight.message}</div>
                ${hasExplanation ? `
                    <div class="insight-explanation">
                        <span class="explanation-icon">💡</span>
                        <span class="explanation-text">${insight.explanation}</span>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

/**
 * Rend la card des smart insights
 */
function renderSmartInsightsCard() {
    const insights = generateSmartInsights();
    
    if (insights.length === 0) {
        return '';
    }
    
    return `
        <div class="readiness-card smart-insights-card">
            <div class="insights-title">
                <span class="icon">🧠</span>
                ANALYSE INTELLIGENTE
            </div>
            <div class="smart-insights-list">
                ${insights.map(i => renderInsightItem(i)).join('')}
            </div>
        </div>
    `;
}

// Export pour utilisation globale
window.generateWeeklyInsights = generateWeeklyInsights;
window.renderInsightsWidget = renderInsightsWidget;
window.renderSmartInsightsCard = renderSmartInsightsCard;
window.filterWeightChart = filterWeightChart;
window.openLogWeightModal = openLogWeightModal;
window.saveLogWeight = saveLogWeight;
window.openSetGoalModal = openSetGoalModal;
window.saveGoal = saveGoal;
window.updateGoalTargetLabel = updateGoalTargetLabel;
window.logBodyWeight = logBodyWeight;
window.setGoal = setGoal;
window.updateStreak = updateStreak;
window.renderBodyWeightCard = renderBodyWeightCard;
window.renderGoalCard = renderGoalCard;
window.renderStreakCard = renderStreakCard;
window.updateBodyWeightChart = updateBodyWeightChart;

console.log('✅ goals.js: Fonctions exportées au scope global');
