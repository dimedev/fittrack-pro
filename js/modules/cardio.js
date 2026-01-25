// ==================== CARDIO MODULE ====================
// Tracking cardio simple et intégration dans les calculs

// ==================== CONSTANTES (répétées depuis state.js pour portabilité) ====================

const CARDIO_TYPES_DATA = {
    running: { id: 'running', label: 'Course', icon: '🏃', met: { light: 6, moderate: 9.8, intense: 12.8 } },
    cycling: { id: 'cycling', label: 'Vélo', icon: '🚴', met: { light: 4, moderate: 6.8, intense: 10 } },
    walking: { id: 'walking', label: 'Marche', icon: '🚶', met: { light: 2.5, moderate: 3.5, intense: 5 } },
    swimming: { id: 'swimming', label: 'Natation', icon: '🏊', met: { light: 5, moderate: 7, intense: 10 } },
    boxing: { id: 'boxing', label: 'Boxe', icon: '🥊', met: { light: 7, moderate: 10, intense: 13 } },
    other: { id: 'other', label: 'Autre', icon: '💪', met: { light: 4, moderate: 6, intense: 8 } }
};

const CARDIO_INTENSITY_DATA = {
    light: { id: 'light', label: 'Légère', recoveryImpact: 5 },
    moderate: { id: 'moderate', label: 'Modérée', recoveryImpact: 10 },
    intense: { id: 'intense', label: 'Intense', recoveryImpact: 20 }
};

// ==================== CALCULS ====================

// Calculer les calories brûlées
function calculateCardioBurn(type, durationMinutes, intensity, weightKg) {
    const cardioType = CARDIO_TYPES_DATA[type] || CARDIO_TYPES_DATA.other;
    const met = cardioType.met[intensity] || cardioType.met.moderate;
    // Formule: calories = MET × poids (kg) × durée (heures)
    return Math.round(met * weightKg * (durationMinutes / 60));
}

// Obtenir le total des calories brûlées pour une date
function getCardioCaloriesForDate(date) {
    if (!date) date = new Date().toISOString().split('T')[0];
    const sessions = state.cardioLog?.[date] || [];
    return sessions.reduce((sum, s) => sum + (s.calories || 0), 0);
}

// Obtenir les sessions cardio pour une date
function getCardioSessionsForDate(date) {
    if (!date) date = new Date().toISOString().split('T')[0];
    return state.cardioLog?.[date] || [];
}

// ==================== IMPACT SUR LA RÉCUPÉRATION ====================

// Calculer l'impact du cardio sur la récupération
function getCardioRecoveryImpact(date) {
    const sessions = getCardioSessionsForDate(date);
    
    if (sessions.length === 0) return 0;
    
    let totalImpact = 0;
    sessions.forEach(session => {
        const intensityData = CARDIO_INTENSITY_DATA[session.intensity] || CARDIO_INTENSITY_DATA.moderate;
        // Impact proportionnel à la durée (base 30 min)
        const durationFactor = session.duration / 30;
        totalImpact += intensityData.recoveryImpact * durationFactor;
    });
    
    // Plafonner l'impact à 40%
    return Math.min(40, Math.round(totalImpact));
}

// Vérifier si le cardio du jour est intense
function hasIntenseCardioToday() {
    const today = new Date().toISOString().split('T')[0];
    const sessions = getCardioSessionsForDate(today);
    return sessions.some(s => s.intensity === 'intense');
}

// Vérifier si le cardio du jour est modéré ou plus
function hasModerateCardioToday() {
    const today = new Date().toISOString().split('T')[0];
    const sessions = getCardioSessionsForDate(today);
    return sessions.some(s => s.intensity === 'moderate' || s.intensity === 'intense');
}

// ==================== IMPACT SUR LE DÉFICIT CALORIQUE ====================

// Calculer le déficit net (avec cardio)
function calculateNetCalorieBalance() {
    const today = new Date().toISOString().split('T')[0];
    
    // Calories consommées
    const consumed = typeof calculateConsumedMacros === 'function' 
        ? calculateConsumedMacros().calories 
        : 0;
    
    // Calories brûlées par cardio
    const cardioCalories = getCardioCaloriesForDate(today);
    
    // Objectif calorique
    const target = state.profile?.targetCalories || 2000;
    
    // Balance nette = Consommé - Cardio - Objectif
    const netBalance = consumed - cardioCalories - target;
    
    return {
        consumed: consumed,
        cardio: cardioCalories,
        target: target,
        netBalance: netBalance,
        remaining: Math.max(0, target - consumed + cardioCalories)
    };
}

// ==================== STATISTIQUES ====================

// Obtenir les statistiques cardio de la semaine
function getWeeklyCardioStats() {
    const stats = {
        totalSessions: 0,
        totalDuration: 0,
        totalCalories: 0,
        avgIntensity: 'moderate',
        byType: {}
    };
    
    // 7 derniers jours
    const today = new Date();
    let intensitySum = 0;
    
    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const sessions = getCardioSessionsForDate(dateStr);
        sessions.forEach(session => {
            stats.totalSessions++;
            stats.totalDuration += session.duration || 0;
            stats.totalCalories += session.calories || 0;
            
            // Par type
            if (!stats.byType[session.type]) {
                stats.byType[session.type] = { sessions: 0, duration: 0, calories: 0 };
            }
            stats.byType[session.type].sessions++;
            stats.byType[session.type].duration += session.duration || 0;
            stats.byType[session.type].calories += session.calories || 0;
            
            // Intensité moyenne
            const intensityValue = { light: 1, moderate: 2, intense: 3 };
            intensitySum += intensityValue[session.intensity] || 2;
        });
    }
    
    if (stats.totalSessions > 0) {
        const avgIntensityValue = intensitySum / stats.totalSessions;
        if (avgIntensityValue < 1.5) stats.avgIntensity = 'light';
        else if (avgIntensityValue > 2.5) stats.avgIntensity = 'intense';
        else stats.avgIntensity = 'moderate';
    }
    
    return stats;
}

// ==================== SUGGESTIONS CARDIO ====================

// Suggérer une activité cardio basée sur les habitudes
function suggestCardioActivity() {
    const stats = getWeeklyCardioStats();
    const today = new Date();
    const dayOfWeek = today.getDay();
    
    // Si pas de cardio cette semaine, suggérer quelque chose de léger
    if (stats.totalSessions === 0) {
        return {
            type: 'walking',
            duration: 20,
            intensity: 'light',
            reason: 'Commence doucement avec une marche de 20 minutes'
        };
    }
    
    // Si beaucoup de cardio intense, suggérer récupération
    if (stats.avgIntensity === 'intense' && stats.totalSessions >= 3) {
        return {
            type: 'walking',
            duration: 30,
            intensity: 'light',
            reason: 'Tu as fait beaucoup de cardio intense, une marche légère serait parfaite'
        };
    }
    
    // Suggérer l'activité la plus fréquente
    const mostFrequent = Object.entries(stats.byType)
        .sort((a, b) => b[1].sessions - a[1].sessions)[0];
    
    if (mostFrequent) {
        const avgDuration = Math.round(mostFrequent[1].duration / mostFrequent[1].sessions);
        return {
            type: mostFrequent[0],
            duration: avgDuration,
            intensity: 'moderate',
            reason: `Tu fais souvent ${CARDIO_TYPES_DATA[mostFrequent[0]]?.label || 'cette activité'}`
        };
    }
    
    return {
        type: 'running',
        duration: 30,
        intensity: 'moderate',
        reason: 'Une course modérée est toujours une bonne option'
    };
}

// ==================== EXPORTS ====================

window.Cardio = {
    // Constantes
    TYPES: CARDIO_TYPES_DATA,
    INTENSITIES: CARDIO_INTENSITY_DATA,
    
    // Calculs
    calculateBurn: calculateCardioBurn,
    getCaloriesForDate: getCardioCaloriesForDate,
    getSessionsForDate: getCardioSessionsForDate,
    getNetBalance: calculateNetCalorieBalance,
    
    // Récupération
    getRecoveryImpact: getCardioRecoveryImpact,
    hasIntenseToday: hasIntenseCardioToday,
    hasModerateToday: hasModerateCardioToday,
    
    // Stats
    getWeeklyStats: getWeeklyCardioStats,
    
    // Suggestions
    suggestActivity: suggestCardioActivity
};
