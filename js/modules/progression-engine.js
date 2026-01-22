// ==================== PROGRESSION ENGINE ====================
// Système de progression automatique intelligent basé sur les logs existants
// Version 1.0 - FitTrack Pro

/**
 * RÈGLES MÉTIER DE PROGRESSION
 * ============================
 * 
 * 1. DOUBLE PROGRESSION (méthode principale)
 *    - Si toutes les séries sont validées à X reps → augmenter les reps
 *    - Si reps max atteintes sur toutes les séries → augmenter le poids
 *    - Incrément: 2.5kg (<60kg) ou 5kg (≥60kg)
 * 
 * 2. DÉTECTION DE PLATEAU
 *    - Même charge ET même reps ≥ 3 séances consécutives → plateau détecté
 *    - Proposition: variation (technique, pause, intensification)
 * 
 * 3. PÉRIODISATION AUTO
 *    - Cycle de 4 semaines: 3 semaines progression + 1 semaine deload
 *    - Semaine légère: -10% poids, -2 reps
 *    - Semaine lourde: +5% poids (si progression stable)
 * 
 * 4. VOLUME TRACKING
 *    - Volume = séries × reps × poids
 *    - Suivi hebdomadaire par groupe musculaire
 *    - Alertes si volume insuffisant ou excessif
 */

// ==================== CONSTANTES DE CONFIGURATION ====================

const PROGRESSION_CONFIG = {
    // Incréments de poids
    WEIGHT_INCREMENT_LIGHT: 2.5,  // Pour charges < 60kg
    WEIGHT_INCREMENT_HEAVY: 5,    // Pour charges ≥ 60kg
    WEIGHT_THRESHOLD: 60,         // Seuil pour déterminer l'incrément
    
    // Détection de plateau
    PLATEAU_MIN_SESSIONS: 3,      // Nombre de séances identiques pour déclarer un plateau
    PLATEAU_WEIGHT_TOLERANCE: 0,  // Tolérance sur le poids (0 = exactement identique)
    PLATEAU_REPS_TOLERANCE: 1,    // Tolérance sur les reps moyennes
    
    // Périodisation
    CYCLE_LENGTH_WEEKS: 4,        // Durée d'un mésocycle
    DELOAD_WEEK: 4,               // Semaine de deload (4ème semaine)
    DELOAD_WEIGHT_REDUCTION: 0.10, // Réduction de 10% en deload
    DELOAD_REPS_REDUCTION: 2,     // Réduire de 2 reps en deload
    
    // Seuils de progression
    REPS_BUFFER_FOR_INCREASE: 2,  // Buffer de reps avant d'augmenter le poids
    MIN_COMPLETED_SETS_RATIO: 0.8, // 80% des séries doivent être complétées
    
    // Volume par groupe musculaire (séries/semaine recommandées)
    VOLUME_TARGETS: {
        beginner: { min: 10, max: 15 },
        intermediate: { min: 15, max: 20 },
        advanced: { min: 18, max: 25 }
    },
    
    // Temps de récupération recommandé par groupe
    RECOVERY_DAYS: {
        compound: 48,    // Exercices composés (48h min)
        isolation: 24    // Exercices d'isolation (24h min)
    }
};

// Exercices composés (pour déterminer la récupération)
const COMPOUND_EXERCISES = [
    'Squat', 'Soulevé de Terre', 'Développé Couché', 'Développé Militaire',
    'Rowing Barre', 'Tractions', 'Dips', 'Hip Thrust', 'Fentes',
    'Presse à Cuisses', 'Développé Incliné'
];

// ==================== CALCULS DE VOLUME ====================

/**
 * Calcule le volume total d'une séance (toutes séries confondues)
 * Volume = Σ(poids × reps) pour chaque série
 * 
 * @param {object} log - Log de séance avec setsDetail
 * @returns {number} - Volume total
 */
function calculateSessionVolume(log) {
    if (!log) return 0;
    
    // Si on a le détail des séries
    if (log.setsDetail && Array.isArray(log.setsDetail)) {
        return log.setsDetail.reduce((total, set) => {
            return total + ((set.weight || 0) * (set.reps || 0));
        }, 0);
    }
    
    // Fallback: estimation avec les moyennes
    const sets = log.sets || log.achievedSets || 1;
    const weight = log.weight || 0;
    const reps = log.achievedReps || 0;
    
    // Si achievedReps est le total, on l'utilise directement
    return weight * reps;
}

/**
 * Calcule le volume hebdomadaire par exercice
 * 
 * @param {string} exerciseName - Nom de l'exercice
 * @param {number} weeksBack - Nombre de semaines à analyser (défaut: 1)
 * @returns {object} - { totalVolume, avgVolumePerSession, sessions }
 */
function getWeeklyVolume(exerciseName, weeksBack = 1) {
    const logs = state.progressLog?.[exerciseName] || [];
    if (logs.length === 0) return { totalVolume: 0, avgVolumePerSession: 0, sessions: 0 };
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - (weeksBack * 7));
    const cutoffStr = cutoffDate.toISOString().split('T')[0];
    
    const recentLogs = logs.filter(log => log.date >= cutoffStr);
    
    const totalVolume = recentLogs.reduce((sum, log) => sum + calculateSessionVolume(log), 0);
    const sessions = recentLogs.length;
    
    return {
        totalVolume,
        avgVolumePerSession: sessions > 0 ? Math.round(totalVolume / sessions) : 0,
        sessions
    };
}

/**
 * Calcule le volume par groupe musculaire sur une période
 * 
 * @param {string} muscleGroup - Groupe musculaire
 * @param {number} days - Nombre de jours à analyser
 * @returns {object} - { totalSets, totalVolume, exercises }
 */
function getMuscleGroupVolume(muscleGroup, days = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];
    
    let totalSets = 0;
    let totalVolume = 0;
    const exercises = {};
    
    // Mapper les exercices au groupe musculaire
    const exercisesByMuscle = state.exercises?.filter(e => e.muscle === muscleGroup) || [];
    const exerciseNames = exercisesByMuscle.map(e => e.name);
    
    // Parcourir tous les logs
    Object.entries(state.progressLog || {}).forEach(([exName, logs]) => {
        // Vérifier si l'exercice appartient au groupe
        const exercise = state.exercises?.find(e => e.name === exName);
        if (!exercise || exercise.muscle !== muscleGroup) return;
        
        const recentLogs = logs.filter(log => log.date >= cutoffStr);
        
        recentLogs.forEach(log => {
            const sets = log.setsDetail?.length || log.sets || 0;
            const volume = calculateSessionVolume(log);
            
            totalSets += sets;
            totalVolume += volume;
            
            if (!exercises[exName]) {
                exercises[exName] = { sets: 0, volume: 0, sessions: 0 };
            }
            exercises[exName].sets += sets;
            exercises[exName].volume += volume;
            exercises[exName].sessions++;
        });
    });
    
    return { totalSets, totalVolume, exercises };
}

// ==================== DÉTECTION DE PLATEAU ====================

/**
 * Analyse les logs pour détecter un plateau
 * Plateau = même poids ET reps similaires sur N séances consécutives
 * 
 * @param {string} exerciseName - Nom de l'exercice
 * @returns {object} - { isPlateaued, consecutiveSessions, details }
 */
function detectPlateau(exerciseName) {
    const logs = state.progressLog?.[exerciseName] || [];
    
    if (logs.length < PROGRESSION_CONFIG.PLATEAU_MIN_SESSIONS) {
        return { 
            isPlateaued: false, 
            consecutiveSessions: 0,
            details: 'Pas assez de données pour détecter un plateau'
        };
    }
    
    // Analyser les N dernières séances
    const recentLogs = logs.slice(-PROGRESSION_CONFIG.PLATEAU_MIN_SESSIONS);
    
    // Extraire poids et reps moyennes
    const weights = recentLogs.map(log => log.weight);
    const avgReps = recentLogs.map(log => {
        if (log.setsDetail && log.setsDetail.length > 0) {
            return log.setsDetail.reduce((sum, s) => sum + s.reps, 0) / log.setsDetail.length;
        }
        return log.sets > 0 ? (log.achievedReps || 0) / log.sets : 0;
    });
    
    // Vérifier si toutes les valeurs sont similaires
    const firstWeight = weights[0];
    const firstReps = avgReps[0];
    
    const allWeightsSimilar = weights.every(w => 
        Math.abs(w - firstWeight) <= PROGRESSION_CONFIG.PLATEAU_WEIGHT_TOLERANCE
    );
    
    const allRepsSimilar = avgReps.every(r => 
        Math.abs(r - firstReps) <= PROGRESSION_CONFIG.PLATEAU_REPS_TOLERANCE
    );
    
    const isPlateaued = allWeightsSimilar && allRepsSimilar;
    
    // Compter les séances consécutives en plateau
    let consecutiveSessions = 0;
    if (isPlateaued) {
        for (let i = logs.length - 1; i >= 0; i--) {
            const log = logs[i];
            const logAvgReps = log.setsDetail 
                ? log.setsDetail.reduce((sum, s) => sum + s.reps, 0) / log.setsDetail.length
                : (log.sets > 0 ? (log.achievedReps || 0) / log.sets : 0);
            
            if (Math.abs(log.weight - firstWeight) <= PROGRESSION_CONFIG.PLATEAU_WEIGHT_TOLERANCE &&
                Math.abs(logAvgReps - firstReps) <= PROGRESSION_CONFIG.PLATEAU_REPS_TOLERANCE) {
                consecutiveSessions++;
            } else {
                break;
            }
        }
    }
    
    return {
        isPlateaued,
        consecutiveSessions,
        currentWeight: firstWeight,
        currentAvgReps: Math.round(firstReps * 10) / 10,
        details: isPlateaued 
            ? `Plateau détecté: ${firstWeight}kg × ~${Math.round(firstReps)} reps depuis ${consecutiveSessions} séances`
            : 'Progression normale'
    };
}

// ==================== SUGGESTIONS DE PROGRESSION ====================

/**
 * Génère une suggestion de progression intelligente
 * Basée sur la double progression et l'analyse des performances
 * 
 * @param {string} exerciseName - Nom de l'exercice
 * @param {string} targetReps - Fourchette de reps cible (ex: "8-12")
 * @returns {object} - Suggestion complète avec justification
 */
function getSmartProgressionSuggestion(exerciseName, targetReps = '8-12') {
    const logs = state.progressLog?.[exerciseName] || [];
    
    if (logs.length === 0) {
        return {
            type: 'new_exercise',
            suggestedWeight: null,
            message: "Nouvel exercice ! Commencez léger pour apprendre le mouvement.",
            confidence: 'low',
            reasoning: []
        };
    }
    
    // Parser la fourchette de reps
    const [minReps, maxReps] = targetReps.split('-').map(Number);
    const targetRepsMin = minReps || 8;
    const targetRepsMax = maxReps || 12;
    
    // Analyser les dernières séances (3-5)
    const analysisWindow = Math.min(5, logs.length);
    const recentLogs = logs.slice(-analysisWindow);
    const lastLog = recentLogs[recentLogs.length - 1];
    
    // Extraire les métriques
    const lastWeight = lastLog.weight;
    const lastSets = lastLog.setsDetail || [];
    
    // Calculer les reps moyennes et le taux de complétion
    let avgReps, completionRate;
    if (lastSets.length > 0) {
        avgReps = lastSets.reduce((sum, s) => sum + (s.reps || 0), 0) / lastSets.length;
        completionRate = lastSets.filter(s => s.completed).length / lastSets.length;
    } else {
        const totalSets = lastLog.sets || lastLog.achievedSets || 1;
        avgReps = totalSets > 0 ? (lastLog.achievedReps || 0) / totalSets : 0;
        completionRate = lastLog.achievedSets ? lastLog.achievedSets / (lastLog.sets || 1) : 1;
    }
    
    // Déterminer l'incrément de poids approprié
    const weightIncrement = lastWeight >= PROGRESSION_CONFIG.WEIGHT_THRESHOLD 
        ? PROGRESSION_CONFIG.WEIGHT_INCREMENT_HEAVY 
        : PROGRESSION_CONFIG.WEIGHT_INCREMENT_LIGHT;
    
    const reasoning = [];
    let suggestion = {
        type: 'maintain',
        suggestedWeight: lastWeight,
        message: '',
        confidence: 'medium',
        reasoning: []
    };
    
    // Vérifier le plateau
    const plateauCheck = detectPlateau(exerciseName);
    if (plateauCheck.isPlateaued) {
        reasoning.push(`⚠️ Plateau détecté depuis ${plateauCheck.consecutiveSessions} séances`);
    }
    
    // ===== LOGIQUE DE DÉCISION =====
    
    // CAS 1: Reps au-dessus du max → AUGMENTER LE POIDS
    if (avgReps >= targetRepsMax && completionRate >= PROGRESSION_CONFIG.MIN_COMPLETED_SETS_RATIO) {
        const newWeight = lastWeight + weightIncrement;
        reasoning.push(`✅ Reps moyennes (${Math.round(avgReps * 10) / 10}) ≥ cible max (${targetRepsMax})`);
        reasoning.push(`✅ Taux de complétion: ${Math.round(completionRate * 100)}%`);
        reasoning.push(`→ Augmentation de ${weightIncrement}kg recommandée`);
        
        suggestion = {
            type: 'increase_weight',
            suggestedWeight: newWeight,
            previousWeight: lastWeight,
            increment: weightIncrement,
            message: `🚀 Prêt à progresser ! Passez à ${newWeight}kg`,
            confidence: 'high',
            reasoning
        };
    }
    // CAS 2: Reps dans la fourchette haute → CONTINUER
    else if (avgReps >= targetRepsMin + PROGRESSION_CONFIG.REPS_BUFFER_FOR_INCREASE) {
        reasoning.push(`📈 Reps moyennes (${Math.round(avgReps * 10) / 10}) dans la fourchette haute`);
        reasoning.push(`→ Continuez à ${lastWeight}kg, visez ${targetRepsMax} reps`);
        
        suggestion = {
            type: 'maintain_push',
            suggestedWeight: lastWeight,
            message: `💪 Bien joué ! Visez ${targetRepsMax} reps à ${lastWeight}kg`,
            confidence: 'high',
            reasoning
        };
    }
    // CAS 3: Reps dans la fourchette basse → CONSOLIDER
    else if (avgReps >= targetRepsMin) {
        reasoning.push(`📊 Reps moyennes (${Math.round(avgReps * 10) / 10}) dans la fourchette cible`);
        reasoning.push(`→ Maintenez ${lastWeight}kg et augmentez progressivement les reps`);
        
        suggestion = {
            type: 'maintain',
            suggestedWeight: lastWeight,
            message: `👍 Continuez à ${lastWeight}kg, objectif: ${targetRepsMax} reps`,
            confidence: 'medium',
            reasoning
        };
    }
    // CAS 4: Reps sous le minimum → RÉDUIRE OU MAINTENIR
    else if (avgReps < targetRepsMin - 2) {
        const newWeight = Math.max(lastWeight - weightIncrement, weightIncrement);
        reasoning.push(`⚠️ Reps moyennes (${Math.round(avgReps * 10) / 10}) sous la cible (${targetRepsMin})`);
        reasoning.push(`→ Réduction recommandée pour consolider la technique`);
        
        suggestion = {
            type: 'decrease_weight',
            suggestedWeight: newWeight,
            previousWeight: lastWeight,
            decrement: weightIncrement,
            message: `📉 Consolidez à ${newWeight}kg pour atteindre ${targetRepsMin}+ reps`,
            confidence: 'medium',
            reasoning
        };
    }
    // CAS 5: Reps légèrement sous le minimum → MAINTENIR
    else {
        reasoning.push(`📊 Reps moyennes (${Math.round(avgReps * 10) / 10}) légèrement sous la cible`);
        reasoning.push(`→ Maintenez et concentrez-vous sur la technique`);
        
        suggestion = {
            type: 'maintain',
            suggestedWeight: lastWeight,
            message: `🎯 Restez à ${lastWeight}kg, travaillez la technique`,
            confidence: 'medium',
            reasoning
        };
    }
    
    // Ajouter les infos de plateau si pertinent
    if (plateauCheck.isPlateaued && suggestion.type !== 'increase_weight' && suggestion.type !== 'decrease_weight') {
        suggestion.plateauAlert = true;
        suggestion.plateauInfo = plateauCheck;
        suggestion.message += ` (Plateau: ${plateauCheck.consecutiveSessions} séances)`;
    }
    
    return suggestion;
}

// ==================== PÉRIODISATION AUTOMATIQUE ====================

/**
 * Détermine la semaine actuelle dans le cycle de périodisation
 * 
 * @returns {object} - { weekNumber, weekType, recommendations }
 */
function getCurrentPeriodizationWeek() {
    // Calculer le nombre de semaines depuis le début de l'entraînement
    const sessions = state.sessionHistory || [];
    if (sessions.length === 0) {
        return {
            weekNumber: 1,
            weekType: 'normal',
            cycleWeek: 1,
            recommendations: {
                volumeModifier: 1.0,
                intensityModifier: 1.0,
                message: "Première semaine - Focus sur l'apprentissage"
            }
        };
    }
    
    // Trouver la première séance
    const firstSession = sessions[sessions.length - 1]; // Les plus anciennes sont à la fin
    const firstDate = new Date(firstSession.date);
    const today = new Date();
    
    // Calculer le nombre de semaines écoulées
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const totalWeeks = Math.floor((today - firstDate) / msPerWeek) + 1;
    
    // Déterminer la position dans le cycle de 4 semaines
    const cycleWeek = ((totalWeeks - 1) % PROGRESSION_CONFIG.CYCLE_LENGTH_WEEKS) + 1;
    
    let weekType, recommendations;
    
    switch (cycleWeek) {
        case 1:
            weekType = 'accumulation';
            recommendations = {
                volumeModifier: 1.0,
                intensityModifier: 0.95,
                message: "Semaine 1 - Accumulation: Volume modéré, technique parfaite"
            };
            break;
        case 2:
            weekType = 'intensification';
            recommendations = {
                volumeModifier: 1.0,
                intensityModifier: 1.0,
                message: "Semaine 2 - Intensification: Augmentez les charges si prêt"
            };
            break;
        case 3:
            weekType = 'overreach';
            recommendations = {
                volumeModifier: 1.1,
                intensityModifier: 1.05,
                message: "Semaine 3 - Surcharge: Poussez vos limites (dans la raison)"
            };
            break;
        case PROGRESSION_CONFIG.DELOAD_WEEK:
            weekType = 'deload';
            recommendations = {
                volumeModifier: 0.6,
                intensityModifier: 1 - PROGRESSION_CONFIG.DELOAD_WEIGHT_REDUCTION,
                repsReduction: PROGRESSION_CONFIG.DELOAD_REPS_REDUCTION,
                message: "🌿 Semaine de DELOAD - Récupérez: -40% volume, -10% charge"
            };
            break;
        default:
            weekType = 'normal';
            recommendations = {
                volumeModifier: 1.0,
                intensityModifier: 1.0,
                message: "Semaine normale"
            };
    }
    
    return {
        weekNumber: totalWeeks,
        weekType,
        cycleWeek,
        recommendations
    };
}

/**
 * Vérifie si un deload est recommandé (indépendamment de la périodisation auto)
 * 
 * @returns {object} - { needsDeload, reason, urgency }
 */
function checkDeloadNeed() {
    const sessions = state.sessionHistory || [];
    if (sessions.length < 3) {
        return { needsDeload: false, reason: 'Pas assez de données', urgency: 'none' };
    }
    
    // Analyser les 2 dernières semaines
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const twoWeeksStr = twoWeeksAgo.toISOString().split('T')[0];
    
    const recentSessions = sessions.filter(s => s.date >= twoWeeksStr);
    
    // Indicateurs de fatigue
    let fatigueSignals = 0;
    let reasons = [];
    
    // 1. Nombre de séances (trop ou pas assez)
    const sessionsPerWeek = recentSessions.length / 2;
    if (sessionsPerWeek > 6) {
        fatigueSignals += 2;
        reasons.push(`Volume élevé: ${sessionsPerWeek.toFixed(1)} séances/semaine`);
    }
    
    // 2. Stagnation/régression sur plusieurs exercices
    let stagnatingExercises = 0;
    let totalExercises = 0;
    
    Object.entries(state.progressLog || {}).forEach(([name, logs]) => {
        if (logs.length < 3) return;
        totalExercises++;
        
        const plateau = detectPlateau(name);
        if (plateau.isPlateaued) {
            stagnatingExercises++;
        }
    });
    
    if (totalExercises > 0 && stagnatingExercises / totalExercises > 0.5) {
        fatigueSignals += 2;
        reasons.push(`Stagnation: ${stagnatingExercises}/${totalExercises} exercices en plateau`);
    }
    
    // 3. Temps depuis le dernier deload (si tracké)
    const lastDeload = state.lastDeloadDate;
    if (lastDeload) {
        const daysSinceDeload = Math.floor((new Date() - new Date(lastDeload)) / (1000 * 60 * 60 * 24));
        if (daysSinceDeload > 28) { // Plus de 4 semaines
            fatigueSignals += 1;
            reasons.push(`${daysSinceDeload} jours depuis le dernier deload`);
        }
    } else {
        // Jamais de deload tracké
        const totalWeeks = Math.floor(sessions.length / 4); // Estimation
        if (totalWeeks > 5) {
            fatigueSignals += 1;
            reasons.push("Aucun deload enregistré depuis le début");
        }
    }
    
    // Déterminer l'urgence
    let urgency = 'none';
    if (fatigueSignals >= 4) urgency = 'high';
    else if (fatigueSignals >= 2) urgency = 'medium';
    else if (fatigueSignals >= 1) urgency = 'low';
    
    return {
        needsDeload: fatigueSignals >= 2,
        reason: reasons.join('. '),
        urgency,
        fatigueScore: fatigueSignals,
        details: reasons
    };
}

/**
 * Calcule les paramètres de deload pour un exercice
 * 
 * @param {string} exerciseName - Nom de l'exercice
 * @returns {object} - { deloadWeight, deloadReps, originalWeight }
 */
function calculateDeloadParams(exerciseName) {
    const logs = state.progressLog?.[exerciseName] || [];
    if (logs.length === 0) return null;
    
    const lastLog = logs[logs.length - 1];
    const originalWeight = lastLog.weight;
    
    const deloadWeight = Math.round(originalWeight * (1 - PROGRESSION_CONFIG.DELOAD_WEIGHT_REDUCTION) / 2.5) * 2.5;
    const originalReps = lastLog.setsDetail 
        ? Math.round(lastLog.setsDetail.reduce((sum, s) => sum + s.reps, 0) / lastLog.setsDetail.length)
        : 10;
    
    return {
        deloadWeight,
        deloadReps: Math.max(6, originalReps - PROGRESSION_CONFIG.DELOAD_REPS_REDUCTION),
        originalWeight,
        originalReps,
        message: `Deload: ${deloadWeight}kg × ${Math.max(6, originalReps - 2)} reps (au lieu de ${originalWeight}kg)`
    };
}

// ==================== ANALYSE GLOBALE DE PROGRESSION ====================

/**
 * Génère une analyse complète de la progression
 * 
 * @returns {object} - Analyse globale avec recommandations
 */
function generateProgressionAnalysis() {
    const analysis = {
        timestamp: new Date().toISOString(),
        periodization: getCurrentPeriodizationWeek(),
        deloadCheck: checkDeloadNeed(),
        exerciseAnalysis: {},
        volumeByMuscle: {},
        globalRecommendations: []
    };
    
    // Analyser chaque exercice avec des logs
    Object.entries(state.progressLog || {}).forEach(([exerciseName, logs]) => {
        if (logs.length === 0) return;
        
        const exercise = state.exercises?.find(e => e.name === exerciseName);
        const muscle = exercise?.muscle || 'unknown';
        
        // Récupérer la fourchette de reps du programme actuel si disponible
        let targetReps = '8-12'; // Défaut
        if (state.selectedProgram && trainingPrograms?.[state.selectedProgram]) {
            const program = trainingPrograms[state.selectedProgram];
            Object.values(program.exercises || {}).forEach(dayExercises => {
                const match = dayExercises.find(e => e.name === exerciseName);
                if (match) targetReps = match.reps;
            });
        }
        
        analysis.exerciseAnalysis[exerciseName] = {
            ...getSmartProgressionSuggestion(exerciseName, targetReps),
            plateau: detectPlateau(exerciseName),
            weeklyVolume: getWeeklyVolume(exerciseName, 1),
            muscle
        };
    });
    
    // Analyser le volume par groupe musculaire
    const muscleGroups = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves'];
    muscleGroups.forEach(muscle => {
        const volumeData = getMuscleGroupVolume(muscle, 7);
        if (volumeData.totalSets > 0) {
            analysis.volumeByMuscle[muscle] = volumeData;
        }
    });
    
    // Générer les recommandations globales
    const recommendations = [];
    
    // Recommandation périodisation
    if (analysis.periodization.weekType === 'deload') {
        recommendations.push({
            type: 'deload',
            priority: 'high',
            message: analysis.periodization.recommendations.message
        });
    }
    
    // Recommandation deload si nécessaire
    if (analysis.deloadCheck.needsDeload && analysis.periodization.weekType !== 'deload') {
        recommendations.push({
            type: 'deload_warning',
            priority: analysis.deloadCheck.urgency,
            message: `⚠️ Deload recommandé: ${analysis.deloadCheck.reason}`
        });
    }
    
    // Compter les exercices prêts à progresser
    const readyToProgress = Object.values(analysis.exerciseAnalysis)
        .filter(a => a.type === 'increase_weight');
    
    if (readyToProgress.length > 0) {
        recommendations.push({
            type: 'progression',
            priority: 'medium',
            message: `🚀 ${readyToProgress.length} exercice(s) prêt(s) à progresser !`
        });
    }
    
    // Alertes plateau
    const plateauedExercises = Object.entries(analysis.exerciseAnalysis)
        .filter(([name, a]) => a.plateau.isPlateaued);
    
    if (plateauedExercises.length > 0) {
        recommendations.push({
            type: 'plateau',
            priority: 'medium',
            message: `⚠️ Plateau détecté sur ${plateauedExercises.length} exercice(s): ${plateauedExercises.map(([n]) => n).join(', ')}`
        });
    }
    
    analysis.globalRecommendations = recommendations.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
    });
    
    return analysis;
}

// ==================== AFFICHAGE UI ====================

/**
 * Affiche la section d'analyse de progression dans l'UI
 */
function renderProgressionAnalysisSection() {
    const container = document.getElementById('progression-analysis-container');
    if (!container) return;
    
    const analysis = generateProgressionAnalysis();
    
    // Construire l'HTML
    let html = `
        <div class="progression-analysis">
            <!-- Header avec périodisation -->
            <div class="progression-period-banner ${analysis.periodization.weekType}">
                <div class="period-info">
                    <span class="period-week">Semaine ${analysis.periodization.weekNumber}</span>
                    <span class="period-cycle">Cycle: ${analysis.periodization.cycleWeek}/${PROGRESSION_CONFIG.CYCLE_LENGTH_WEEKS}</span>
                </div>
                <div class="period-type">${analysis.periodization.weekType.toUpperCase()}</div>
                <div class="period-message">${analysis.periodization.recommendations.message}</div>
            </div>
            
            <!-- Recommandations globales -->
            ${analysis.globalRecommendations.length > 0 ? `
                <div class="global-recommendations">
                    ${analysis.globalRecommendations.map(rec => `
                        <div class="recommendation-alert ${rec.priority}">
                            ${rec.message}
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            
            <!-- Liste des exercices avec suggestions -->
            <div class="exercise-progression-list">
                ${Object.entries(analysis.exerciseAnalysis)
                    .filter(([name, data]) => data.type !== 'new_exercise')
                    .sort((a, b) => {
                        // Trier: increase_weight en premier, puis decrease, puis maintain
                        const order = { increase_weight: 0, decrease_weight: 1, maintain_push: 2, maintain: 3 };
                        return (order[a[1].type] || 4) - (order[b[1].type] || 4);
                    })
                    .slice(0, 10) // Limiter à 10 exercices
                    .map(([name, data]) => `
                        <div class="exercise-progression-item ${data.type}">
                            <div class="exercise-prog-header">
                                <span class="exercise-prog-name">${name}</span>
                                <span class="exercise-prog-badge ${data.type}">
                                    ${data.type === 'increase_weight' ? '🚀 +' + data.increment + 'kg' : 
                                      data.type === 'decrease_weight' ? '📉 -' + data.decrement + 'kg' :
                                      data.type === 'maintain_push' ? '💪 Push' : '✓'}
                                </span>
                            </div>
                            <div class="exercise-prog-details">
                                <span class="exercise-prog-weight">${data.suggestedWeight}kg suggéré</span>
                                <span class="exercise-prog-conf confidence-${data.confidence}">${data.confidence}</span>
                            </div>
                            <div class="exercise-prog-message">${data.message}</div>
                            ${data.plateauAlert ? `
                                <div class="exercise-prog-plateau">
                                    ⚠️ Plateau: ${data.plateauInfo.consecutiveSessions} séances
                                </div>
                            ` : ''}
                            ${data.type === 'increase_weight' ? `
                                <button class="btn btn-sm btn-primary" onclick="applyProgressionSuggestion('${name}', ${data.suggestedWeight})">
                                    Appliquer ${data.suggestedWeight}kg
                                </button>
                            ` : ''}
                        </div>
                    `).join('')}
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

/**
 * Met à jour l'analyse de progression (à appeler après sauvegarde de séance)
 */
function updateProgressionAnalysis() {
    renderProgressionAnalysisSection();
}

// ==================== EXPORT POUR INTÉGRATION ====================

// Exposer les fonctions pour utilisation dans d'autres modules
window.ProgressionEngine = {
    // Calculs de volume
    calculateSessionVolume,
    getWeeklyVolume,
    getMuscleGroupVolume,
    
    // Détection plateau
    detectPlateau,
    
    // Suggestions progression
    getSmartProgressionSuggestion,
    
    // Périodisation
    getCurrentPeriodizationWeek,
    checkDeloadNeed,
    calculateDeloadParams,
    
    // Analyse globale
    generateProgressionAnalysis,
    
    // UI
    renderProgressionAnalysisSection,
    updateProgressionAnalysis,
    
    // Config (pour ajustements futurs)
    CONFIG: PROGRESSION_CONFIG
};

console.log('✅ Progression Engine chargé');
