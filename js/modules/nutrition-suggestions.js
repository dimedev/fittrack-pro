// ==================== NUTRITION SUGGESTIONS MODULE ====================
// Suggestions intelligentes limitées à 3, basées sur habitudes, objectifs et contexte
// Version 2.0 - UX Premium

// ==================== CONSTANTES ====================

const MAX_SUGGESTIONS = 3;  // JAMAIS plus de 3 suggestions
const MIN_SUGGESTIONS = 1;  // Au moins 1 suggestion

const SUGGESTION_TYPES = {
    HABIT: 'habit',              // Basé sur les habitudes
    OBJECTIVE: 'objective',      // Basé sur les objectifs (protéines, calories)
    POST_WORKOUT: 'post_workout', // Après entraînement
    POST_CARDIO: 'post_cardio',  // Après cardio
    REST_DAY: 'rest_day',        // Jour de repos
    QUICK: 'quick',              // Rapide/facile
    BALANCED: 'balanced',        // Équilibré
    TIME_BASED: 'time_based'     // Basé sur l'heure
};

// Poids pour le scoring (total = 100)
const SCORE_WEIGHTS = {
    habit: 40,       // Habitudes utilisateur
    objective: 30,   // Objectifs nutritionnels
    convenience: 15, // Rapidité/facilité
    balance: 15      // Équilibre nutritionnel
};

// ==================== CONTEXTE ====================

// Obtenir le contexte d'entraînement du jour
function getTrainingContext() {
    const today = new Date().toISOString().split('T')[0];
    
    // Séance de musculation aujourd'hui ?
    const todaySessions = state.sessionHistory?.filter(s => s.date === today) || [];
    const hasWorkoutToday = todaySessions.some(s => s.completed);
    const workoutMuscles = hasWorkoutToday 
        ? todaySessions.flatMap(s => s.exercises?.map(e => e.muscle) || [])
        : [];
    
    // Cardio aujourd'hui ?
    const cardioToday = state.cardioLog?.[today] || [];
    const totalCardioCalories = cardioToday.reduce((sum, s) => sum + (s.calories || 0), 0);
    const hasIntenseCardio = cardioToday.some(s => s.intensity === 'intense');
    const hasModerateCardio = cardioToday.some(s => s.intensity === 'moderate');
    
    // Jour de repos ?
    const isRestDay = !hasWorkoutToday && cardioToday.length === 0;
    
    return {
        hasWorkoutToday,
        workoutMuscles,
        cardioToday,
        totalCardioCalories,
        hasIntenseCardio,
        hasModerateCardio,
        isRestDay,
        // Ajustements
        extraProteinNeeded: hasWorkoutToday ? 25 : (hasIntenseCardio ? 10 : 0),
        extraCaloriesAllowed: Math.round(totalCardioCalories * 0.5)
    };
}

// Obtenir le contexte horaire
function getTimeContext() {
    const hour = new Date().getHours();
    const dayOfWeek = new Date().getDay();
    
    return {
        hour,
        dayOfWeek,
        mealWindow: getMealWindow(hour),
        isPreWorkout: hour >= 6 && hour <= 9,
        isPostWorkout: hour >= 10 && hour <= 14,
        isEvening: hour >= 20,
        isLateNight: hour >= 22 || hour < 5
    };
}

function getMealWindow(hour) {
    if (hour >= 5 && hour < 10) return { type: 'breakfast', label: 'petit-déjeuner' };
    if (hour >= 11 && hour < 14) return { type: 'lunch', label: 'déjeuner' };
    if (hour >= 15 && hour < 17) return { type: 'snack', label: 'collation' };
    if (hour >= 18 && hour < 22) return { type: 'dinner', label: 'dîner' };
    return { type: 'snack', label: 'en-cas' };
}

// Obtenir le contexte nutritionnel
function getNutritionContext() {
    const consumed = typeof calculateConsumedMacros === 'function' 
        ? calculateConsumedMacros() 
        : { calories: 0, protein: 0, carbs: 0, fat: 0 };
    
    const targets = {
        calories: state.profile?.targetCalories || 2000,
        protein: state.profile?.macros?.protein || 150,
        carbs: state.profile?.macros?.carbs || 250,
        fat: state.profile?.macros?.fat || 70
    };
    
    const training = getTrainingContext();
    
    // Ajuster les cibles avec le cardio
    const adjustedTargets = {
        ...targets,
        calories: targets.calories + training.extraCaloriesAllowed,
        protein: targets.protein + training.extraProteinNeeded
    };
    
    return {
        consumed,
        targets: adjustedTargets,
        remaining: {
            calories: Math.max(0, adjustedTargets.calories - consumed.calories),
            protein: Math.max(0, adjustedTargets.protein - consumed.protein)
        },
        percentages: {
            calories: Math.round((consumed.calories / adjustedTargets.calories) * 100),
            protein: Math.round((consumed.protein / adjustedTargets.protein) * 100)
        },
        needsProtein: consumed.protein < adjustedTargets.protein * 0.7,
        needsCalories: consumed.calories < adjustedTargets.calories * 0.5,
        isOverCalories: consumed.calories > adjustedTargets.calories * 1.1
    };
}

// ==================== ANALYSE DES HABITUDES ====================

function analyzeEatingHabits() {
    const habits = {
        frequentFoods: {},
        mealPatterns: {},
        weekdayPreferences: {}
    };
    
    if (!state.foodJournal) return habits;
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    Object.entries(state.foodJournal).forEach(([dateStr, entries]) => {
        const date = new Date(dateStr);
        if (date < thirtyDaysAgo) return;
        
        const dayOfWeek = date.getDay();
        
        entries.forEach(entry => {
            const mealType = entry.mealType || 'lunch';
            const foodId = entry.foodId;
            
            // Aliments fréquents
            if (!habits.frequentFoods[foodId]) {
                habits.frequentFoods[foodId] = { count: 0, avgQuantity: 0, totalQty: 0, lastUsed: null };
            }
            habits.frequentFoods[foodId].count++;
            habits.frequentFoods[foodId].totalQty += entry.quantity;
            habits.frequentFoods[foodId].avgQuantity = Math.round(
                habits.frequentFoods[foodId].totalQty / habits.frequentFoods[foodId].count
            );
            habits.frequentFoods[foodId].lastUsed = dateStr;
            
            // Patterns par repas
            if (!habits.mealPatterns[mealType]) {
                habits.mealPatterns[mealType] = {};
            }
            habits.mealPatterns[mealType][foodId] = (habits.mealPatterns[mealType][foodId] || 0) + 1;
            
            // Par jour de semaine
            if (!habits.weekdayPreferences[dayOfWeek]) {
                habits.weekdayPreferences[dayOfWeek] = {};
            }
            habits.weekdayPreferences[dayOfWeek][foodId] = (habits.weekdayPreferences[dayOfWeek][foodId] || 0) + 1;
        });
    });
    
    return habits;
}

// ==================== SCORING DES SUGGESTIONS ====================

function scoreSuggestion(food, context) {
    let score = 0;
    let reason = '';
    let type = SUGGESTION_TYPES.BALANCED;
    
    const { training, time, nutrition, habits, mealType } = context;
    const dayOfWeek = time.dayOfWeek;
    
    // 1. HABITUDE (40 points max)
    const habitCount = habits.frequentFoods[food.id]?.count || 0;
    const mealHabitCount = habits.mealPatterns[mealType]?.[food.id] || 0;
    const dayHabitCount = habits.weekdayPreferences[dayOfWeek]?.[food.id] || 0;
    
    if (dayHabitCount >= 2) {
        score += 40;
        reason = `Tu en manges souvent le ${getDayName(dayOfWeek)}`;
        type = SUGGESTION_TYPES.HABIT;
    } else if (mealHabitCount >= 3) {
        score += 35;
        reason = `Un de tes favoris pour ce repas`;
        type = SUGGESTION_TYPES.HABIT;
    } else if (habitCount >= 5) {
        score += 25;
        reason = `Un de tes classiques`;
        type = SUGGESTION_TYPES.HABIT;
    }
    
    // 2. OBJECTIF NUTRITIONNEL (30 points max)
    if (nutrition.needsProtein && food.protein >= 20) {
        score += 30;
        if (!reason) {
            reason = `Pour atteindre tes protéines`;
            type = SUGGESTION_TYPES.OBJECTIVE;
        }
    } else if (nutrition.needsCalories && food.calories >= 200) {
        score += 20;
        if (!reason) {
            reason = `Pour compléter ta journée`;
            type = SUGGESTION_TYPES.OBJECTIVE;
        }
    } else if (nutrition.isOverCalories && food.calories <= 100) {
        score += 15;
        if (!reason) {
            reason = `Léger et équilibré`;
            type = SUGGESTION_TYPES.REST_DAY;
        }
    }
    
    // 3. CONTEXTE ENTRAÎNEMENT (bonus 15 points)
    if (training.hasWorkoutToday && food.protein >= 25) {
        score += 15;
        if (!reason || type !== SUGGESTION_TYPES.HABIT) {
            reason = `Idéal après ta séance`;
            type = SUGGESTION_TYPES.POST_WORKOUT;
        }
    } else if (training.hasIntenseCardio && food.carbs >= 20) {
        score += 12;
        if (!reason || type !== SUGGESTION_TYPES.HABIT) {
            reason = `Pour récupérer après ton cardio`;
            type = SUGGESTION_TYPES.POST_CARDIO;
        }
    } else if (training.isRestDay && food.calories <= 300) {
        score += 8;
        if (!reason) {
            reason = `Parfait pour un jour de repos`;
            type = SUGGESTION_TYPES.REST_DAY;
        }
    }
    
    // 4. RAPIDITÉ/FACILITÉ (15 points max)
    if (food.unit === 'piece') {
        score += 10; // Pas besoin de peser
        if (!reason) {
            reason = `Prêt en 2 minutes`;
            type = SUGGESTION_TYPES.QUICK;
        }
    }
    if (food.priority >= 9) {
        score += 5; // Aliment populaire = souvent facile
    }
    
    // 5. ÉQUILIBRE NUTRITIONNEL (15 points max)
    const hasGoodMacroRatio = food.protein >= 10 && food.carbs >= 5 && food.fat >= 2;
    if (hasGoodMacroRatio) {
        score += 10;
        if (!reason) {
            reason = `Équilibré et complet`;
            type = SUGGESTION_TYPES.BALANCED;
        }
    }
    
    // Bonus pour aliment adapté au repas
    if (food.mealTags?.includes(mealType)) {
        score += 5;
    }
    
    // Pénalité si déjà mangé aujourd'hui
    const today = new Date().toISOString().split('T')[0];
    const todayEntries = state.foodJournal?.[today] || [];
    if (todayEntries.some(e => e.foodId === food.id)) {
        score -= 20; // Éviter la répétition
    }
    
    // Fallback reason
    if (!reason) {
        reason = food.mealTags?.includes(mealType) ? 'Parfait pour ce repas' : 'Bonne option';
    }
    
    return { score: Math.max(0, score), reason, type };
}

// ==================== GÉNÉRATION DES SUGGESTIONS ====================

function generateSmartSuggestions(mealType) {
    const training = getTrainingContext();
    const time = getTimeContext();
    const nutrition = getNutritionContext();
    const habits = analyzeEatingHabits();
    
    const context = { training, time, nutrition, habits, mealType };
    
    // Filtrer les aliments candidats
    let candidates = state.foods.filter(food => {
        // Exclure si déjà mangé 2+ fois aujourd'hui
        const today = new Date().toISOString().split('T')[0];
        const todayCount = (state.foodJournal?.[today] || [])
            .filter(e => e.foodId === food.id).length;
        if (todayCount >= 2) return false;
        
        // Privilégier aliments adaptés au repas
        if (food.mealTags && !food.mealTags.includes(mealType)) {
            // Quand même garder si très populaire
            if (food.priority < 8) return false;
        }
        
        return true;
    });
    
    // Scorer tous les candidats
    const scored = candidates.map(food => {
        const { score, reason, type } = scoreSuggestion(food, context);
        const avgQty = habits.frequentFoods[food.id]?.avgQuantity || 
                       (food.unitWeight || 100);
        
        return {
            food,
            score,
            reason,
            type,
            quantity: avgQty
        };
    });
    
    // Trier par score et prendre les 3 meilleurs
    const topSuggestions = scored
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_SUGGESTIONS);
    
    // Si pas assez de suggestions, ajouter des fallbacks
    if (topSuggestions.length < MIN_SUGGESTIONS) {
        const fallbacks = state.foods
            .filter(f => f.priority >= 8)
            .filter(f => !topSuggestions.find(s => s.food.id === f.id))
            .slice(0, MIN_SUGGESTIONS - topSuggestions.length)
            .map(food => ({
                food,
                score: 10,
                reason: 'Populaire',
                type: SUGGESTION_TYPES.BALANCED,
                quantity: food.unitWeight || 100
            }));
        
        topSuggestions.push(...fallbacks);
    }
    
    return topSuggestions;
}

// ==================== MESSAGE QUOTIDIEN ====================

function generateDailySuggestionMessage() {
    const nutrition = getNutritionContext();
    const training = getTrainingContext();
    const time = getTimeContext();
    
    // Priorité 1: Succès !
    if (nutrition.percentages.calories >= 90 && nutrition.percentages.protein >= 90) {
        return {
            text: 'Super journée ! Tes objectifs sont atteints',
            type: 'success',
            icon: '🎉'
        };
    }
    
    // Priorité 2: Post-workout
    if (training.hasWorkoutToday && nutrition.needsProtein) {
        return {
            text: `Après ta séance, ajoute des protéines`,
            type: 'tip',
            icon: '💪'
        };
    }
    
    // Priorité 3: Cardio effectué
    if (training.totalCardioCalories > 0) {
        return {
            text: `+${training.totalCardioCalories} kcal disponibles grâce à ton cardio`,
            type: 'info',
            icon: '🏃'
        };
    }
    
    // Priorité 4: Manque de protéines l'après-midi
    if (nutrition.needsProtein && time.hour >= 14) {
        const missing = nutrition.remaining.protein;
        return {
            text: `Il te manque ~${missing}g de protéines`,
            type: 'tip',
            icon: '🥩'
        };
    }
    
    // Priorité 5: Peu mangé le matin
    if (nutrition.percentages.calories < 30 && time.hour >= 11 && time.hour <= 14) {
        return {
            text: `N'oublie pas de bien déjeuner`,
            type: 'reminder',
            icon: '☀️'
        };
    }
    
    // Priorité 6: Jour de repos
    if (training.isRestDay && time.hour >= 12) {
        return {
            text: `Jour de repos : privilégie les repas légers`,
            type: 'tip',
            icon: '🧘'
        };
    }
    
    // Default: Calories restantes
    if (nutrition.remaining.calories > 0) {
        return {
            text: `Il te reste ~${nutrition.remaining.calories} kcal`,
            type: 'info',
            icon: '📊'
        };
    }
    
    return null;
}

// ==================== UTILITAIRES ====================

function getDayName(dayIndex) {
    const days = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    return days[dayIndex];
}

// ==================== EXPORTS ====================

window.NutritionSuggestions = {
    // Génération
    generate: generateSmartSuggestions,
    getDailyMessage: generateDailySuggestionMessage,
    
    // Contexte
    getTrainingContext,
    getTimeContext,
    getNutritionContext,
    
    // Analyse
    analyzeHabits: analyzeEatingHabits,
    
    // Constantes
    MAX: MAX_SUGGESTIONS,
    TYPES: SUGGESTION_TYPES
};
