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
    if (!state.sessionHistory || state.sessionHistory.length === 0) {
        state.goals.currentStreak = 0;
        return;
    }
    
    // Grouper les séances par date
    const sessionDates = [...new Set(state.sessionHistory.map(s => s.date))].sort().reverse();
    
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
    const analysis = state.progressionAnalysis;
    const trainingRecs = state.progressionRecommendations || {};
    
    if (!analysis && Object.keys(trainingRecs).length === 0) {
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

// Widget "Évolution du Poids" supprimé - utiliser renderBodyWeightCard() à la place
function updateBodyWeightChart() {
    // Fonction obsolète - widget supprimé du dashboard
    return;
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
