// ==================== PROFILE MODULE ====================

// Fonction helper pour calculer BMR, TDEE et macros
function calculateProfile(profile) {
    // Calcul du BMR avec la formule Mifflin-St Jeor
    let bmr;
    if (profile.gender === 'male') {
        bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age + 5;
    } else {
        bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age - 161;
    }

    // Calcul du TDEE
    const tdee = Math.round(bmr * profile.activity);

    // Ajustement selon l'objectif
    let targetCalories;
    switch (profile.goal) {
        case 'cut': 
            targetCalories = tdee - 500; 
            break;
        case 'maintain': 
            targetCalories = tdee; 
            break;
        case 'lean-bulk': 
            targetCalories = tdee + 250; 
            break;
        case 'bulk': 
            targetCalories = tdee + 500; 
            break;
        default:
            targetCalories = tdee;
    }

    // Calcul des macros
    const macros = calculateMacros(targetCalories, profile.weight, profile.goal);

    return { bmr, tdee, targetCalories, macros };
}

function calculateMacros(targetCalories, weight, goal) {
    const proteinGrams = Math.round(weight * 2);
    const fatGrams = Math.round(weight * 0.9);
    const proteinCals = proteinGrams * 4;
    const fatCals = fatGrams * 9;
    const carbsCals = targetCalories - proteinCals - fatCals;
    const carbsGrams = Math.round(Math.max(0, carbsCals / 4));
    
    return {
        protein: proteinGrams,
        carbs: carbsGrams,
        fat: fatGrams
    };
}

function openProfileModal() {
    if (state.profile) {
        document.getElementById('profile-age').value = state.profile.age || '';
        document.getElementById('profile-gender').value = state.profile.gender || 'male';
        document.getElementById('profile-weight').value = state.profile.weight || '';
        document.getElementById('profile-height').value = state.profile.height || '';
        document.getElementById('profile-activity').value = state.profile.activity || '1.55';
        document.getElementById('profile-goal').value = state.profile.goal || 'maintain';
    }
    openModal('profile-modal');
}

function saveProfile() {
    const profile = {
        age: parseInt(document.getElementById('profile-age').value),
        gender: document.getElementById('profile-gender').value,
        weight: parseFloat(document.getElementById('profile-weight').value),
        height: parseInt(document.getElementById('profile-height').value),
        activity: parseFloat(document.getElementById('profile-activity').value),
        goal: document.getElementById('profile-goal').value
    };

    // Validation
    if (!profile.age || !profile.weight || !profile.height) {
        showToast('Veuillez remplir tous les champs', 'error');
        return;
    }

    if (profile.age < 10 || profile.age > 100) {
        showToast('Âge invalide', 'error');
        return;
    }

    if (profile.weight < 30 || profile.weight > 300) {
        showToast('Poids invalide', 'error');
        return;
    }

    if (profile.height < 100 || profile.height > 250) {
        showToast('Taille invalide', 'error');
        return;
    }

    // Calcul du BMR avec la formule Mifflin-St Jeor
    let bmr;
    if (profile.gender === 'male') {
        bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age + 5;
    } else {
        bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age - 161;
    }

    // Calcul du TDEE (Total Daily Energy Expenditure)
    const tdee = Math.round(bmr * profile.activity);

    // Ajustement selon l'objectif
    let targetCalories;
    switch (profile.goal) {
        case 'cut': 
            targetCalories = tdee - 500; 
            break;
        case 'maintain': 
            targetCalories = tdee; 
            break;
        case 'lean-bulk': 
            targetCalories = tdee + 250; 
            break;
        case 'bulk': 
            targetCalories = tdee + 500; 
            break;
        default:
            targetCalories = tdee;
    }

    // Calcul des macros
    // Protéines: 2g/kg pour la musculation
    // Lipides: 0.8-1g/kg pour la santé hormonale
    // Glucides: reste des calories
    const proteinGrams = Math.round(profile.weight * 2);
    const fatGrams = Math.round(profile.weight * 0.9);
    const proteinCals = proteinGrams * 4;
    const fatCals = fatGrams * 9;
    const carbsCals = targetCalories - proteinCals - fatCals;
    const carbsGrams = Math.round(Math.max(0, carbsCals / 4));

    profile.bmr = bmr;
    profile.tdee = tdee;
    profile.targetCalories = targetCalories;
    profile.macros = {
        protein: proteinGrams,
        carbs: carbsGrams,
        fat: fatGrams
    };

    state.profile = profile;
    saveState();
    
    // Sync avec Supabase si connecté
    if (isLoggedIn()) {
        saveProfileToSupabase(profile);
    }
    
    closeModal('profile-modal');
    updateDashboard();
    showToast('Profil enregistré !', 'success');
}

function updateDashboard() {
    // Mise à jour des stats
    if (state.profile) {
        document.getElementById('stat-calories').textContent = state.profile.targetCalories;
        document.getElementById('stat-protein').textContent = state.profile.macros.protein;
        
        // Résumé du profil
        const goalLabels = {
            'cut': 'Sèche',
            'maintain': 'Maintien',
            'lean-bulk': 'Prise légère',
            'bulk': 'Prise de masse'
        };
        
        const activityLabels = {
            '1.2': 'Sédentaire',
            '1.375': 'Peu actif',
            '1.55': 'Actif',
            '1.725': 'Très actif',
            '1.9': 'Extrême'
        };
        
        document.getElementById('profile-summary').innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                <div><span style="color: var(--text-secondary);">Âge:</span> ${state.profile.age} ans</div>
                <div><span style="color: var(--text-secondary);">Poids:</span> ${state.profile.weight} kg</div>
                <div><span style="color: var(--text-secondary);">Taille:</span> ${state.profile.height} cm</div>
                <div><span style="color: var(--text-secondary);">Objectif:</span> ${goalLabels[state.profile.goal]}</div>
                <div><span style="color: var(--text-secondary);">BMR:</span> ${Math.round(state.profile.bmr)} kcal</div>
                <div><span style="color: var(--text-secondary);">TDEE:</span> ${state.profile.tdee} kcal</div>
            </div>
        `;

        // Mise à jour des barres de macros
        updateMacroBars();
    }

    // Stats du programme
    if (state.selectedProgram) {
        const program = trainingPrograms[state.selectedProgram];
        document.getElementById('stat-program').textContent = program.name;
        document.getElementById('stat-days').textContent = state.trainingDays;
    }

    // Nouveaux widgets d'objectifs et progression
    const bodyweightCard = document.getElementById('bodyweight-card-container');
    const goalCard = document.getElementById('goal-card-container');
    const streakCard = document.getElementById('streak-card-container');
    const recommendationsCard = document.getElementById('recommendations-card-container');
    
    if (bodyweightCard) bodyweightCard.innerHTML = renderBodyWeightCard();
    if (goalCard) goalCard.innerHTML = renderGoalCard();
    if (streakCard) streakCard.innerHTML = renderStreakCard();
    if (recommendationsCard) recommendationsCard.innerHTML = renderRecommendationsCard();
    
    // Graphique du poids corporel
    if (typeof updateBodyWeightChart === 'function') {
        updateBodyWeightChart();
    }
}

function updateMacroBars() {
    if (!state.profile) return;

    const consumed = calculateConsumedMacros();
    const targets = state.profile.macros;

    // Protéines
    const proteinPercent = Math.min((consumed.protein / targets.protein) * 100, 100);
    document.getElementById('macro-protein-value').textContent = `${consumed.protein} / ${targets.protein}g`;
    document.getElementById('macro-protein-bar').style.width = `${proteinPercent}%`;

    // Glucides
    const carbsPercent = Math.min((consumed.carbs / targets.carbs) * 100, 100);
    document.getElementById('macro-carbs-value').textContent = `${consumed.carbs} / ${targets.carbs}g`;
    document.getElementById('macro-carbs-bar').style.width = `${carbsPercent}%`;

    // Lipides
    const fatPercent = Math.min((consumed.fat / targets.fat) * 100, 100);
    document.getElementById('macro-fat-value').textContent = `${consumed.fat} / ${targets.fat}g`;
    document.getElementById('macro-fat-bar').style.width = `${fatPercent}%`;
}

function calculateConsumedMacros() {
    let protein = 0, carbs = 0, fat = 0, calories = 0;

    Object.values(state.dailyMenu).forEach(meal => {
        meal.forEach(item => {
            const multiplier = item.quantity / 100;
            protein += item.food.protein * multiplier;
            carbs += item.food.carbs * multiplier;
            fat += item.food.fat * multiplier;
            calories += item.food.calories * multiplier;
        });
    });

    return {
        protein: Math.round(protein),
        carbs: Math.round(carbs),
        fat: Math.round(fat),
        calories: Math.round(calories)
    };
}

function updateProgressionRecommendations() {
    const container = document.getElementById('next-progression');
    
    if (Object.keys(state.progressLog).length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary);">Commencez à loguer vos séances pour voir vos recommandations de progression</p>';
        return;
    }

    let recommendations = [];
    
    Object.entries(state.progressLog).forEach(([exercise, logs]) => {
        if (logs.length >= 2) {
            const lastTwo = logs.slice(-2);
            const current = lastTwo[1];
            const previous = lastTwo[0];
            
            // Vérifier si la personne a atteint toutes les reps
            const targetReps = parseInt(current.reps.toString().split('-')[1]) || parseInt(current.reps);
            
            if (current.achievedReps >= targetReps && current.achievedSets >= current.sets) {
                // Prêt à progresser
                recommendations.push({
                    exercise,
                    type: 'increase',
                    message: `+2.5kg la prochaine fois (${current.weight}kg → ${current.weight + 2.5}kg)`
                });
            } else if (current.achievedReps < targetReps - 2 && previous.achievedReps < targetReps - 2) {
                // En difficulté, considérer un deload
                recommendations.push({
                    exercise,
                    type: 'deload',
                    message: `Deload conseillé (-10%)`
                });
            } else {
                recommendations.push({
                    exercise,
                    type: 'maintain',
                    message: `Continue à ${current.weight}kg`
                });
            }
        }
    });

    if (recommendations.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary);">Continuez à loguer vos séances pour des recommandations personnalisées</p>';
        return;
    }

    container.innerHTML = recommendations.slice(0, 5).map(rec => `
        <div class="progression-indicator ${rec.type}">
            <span>${rec.type === 'increase' ? '📈' : rec.type === 'deload' ? '📉' : '➡️'}</span>
            <span><strong>${rec.exercise}:</strong> ${rec.message}</span>
        </div>
    `).join('');
}
