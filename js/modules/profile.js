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

async function saveProfile() {
    const btn = document.querySelector('#profile-modal .btn-primary');
    
    // Activer l'état loading
    if (btn) {
        btn.classList.add('loading');
        btn.disabled = true;
    }
    
    try {
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
            await saveProfileToSupabase(profile);
        }
        
        closeModal('profile-modal');
        updateDashboard();
        showToast('Profil enregistré !', 'success');
        
    } finally {
        // Désactiver l'état loading
        if (btn) {
            btn.classList.remove('loading');
            btn.disabled = false;
        }
    }
}

function updateDashboard() {
    // Mise à jour des stats avec animations
    if (state.profile && state.profile.targetCalories && state.profile.macros) {
        // Utiliser les animations si disponibles
        if (typeof updateStatWithAnimation === 'function') {
            updateStatWithAnimation('stat-calories', state.profile.targetCalories);
            updateStatWithAnimation('stat-protein', state.profile.macros.protein);
        } else {
            document.getElementById('stat-calories').textContent = state.profile.targetCalories;
            document.getElementById('stat-protein').textContent = state.profile.macros.protein;
        }

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

        const totalSessions = state.sessionHistory ? state.sessionHistory.length : 0;
        const currentStreak = state.goals?.currentStreak || 0;
        const longestStreak = state.goals?.longestStreak || 0;
        
        document.getElementById('profile-summary').innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                <div><span style="color: var(--text-secondary);">Âge:</span> ${state.profile.age} ans</div>
                <div><span style="color: var(--text-secondary);">Poids:</span> ${state.profile.weight} kg</div>
                <div><span style="color: var(--text-secondary);">Taille:</span> ${state.profile.height} cm</div>
                <div><span style="color: var(--text-secondary);">Objectif:</span> ${goalLabels[state.profile.goal] || state.profile.goal}</div>
                <div><span style="color: var(--text-secondary);">BMR:</span> ${Math.round(state.profile.bmr || 0)} kcal</div>
                <div><span style="color: var(--text-secondary);">TDEE:</span> ${state.profile.tdee || 0} kcal</div>
                <div><span style="color: var(--text-secondary);">Séances totales:</span> ${totalSessions}</div>
                <div><span style="color: var(--text-secondary);">Série actuelle:</span> 🔥 ${currentStreak} jours</div>
            </div>
            ${longestStreak > 0 ? `<div style="margin-top: 12px; padding: 12px; background: var(--bg-tertiary); border-radius: 12px; text-align: center; font-size: 0.85rem; color: var(--text-muted);">
                Record : ${longestStreak} jours 🏆
            </div>` : ''}
        `;

        // Mise à jour des barres de macros
        updateMacroBars();
    } else if (state.profile && state.profile.weight && state.profile.height) {
        // Profil existe mais macros non calculés - les recalculer
        const calculated = calculateProfile(state.profile);
        state.profile.bmr = calculated.bmr;
        state.profile.tdee = calculated.tdee;
        state.profile.targetCalories = calculated.targetCalories;
        state.profile.macros = calculated.macros;
        saveState();

        // Re-appeler updateDashboard avec les données complètes
        updateDashboard();
        return;
    }

    // Stats du programme
    if (state.selectedProgram && trainingPrograms[state.selectedProgram]) {
        const program = trainingPrograms[state.selectedProgram];
        document.getElementById('stat-program').textContent = program.name;
        document.getElementById('stat-days').textContent = state.trainingDays;
    }

    // Widget de recommandations
    const recommendationsCard = document.getElementById('recommendations-card-container');
    if (recommendationsCard && typeof renderRecommendationsCard === 'function') {
        recommendationsCard.innerHTML = renderRecommendationsCard();
    }
    
    // Graphique du poids corporel
    if (typeof updateBodyWeightChart === 'function') {
        updateBodyWeightChart();
    }

    // Séance du jour
    if (typeof renderTodaySession === 'function') {
        renderTodaySession();
    }

    // Résumé de la semaine d'entraînement
    if (typeof renderTrainingWeekSummary === 'function') {
        renderTrainingWeekSummary();
    }
}

function updateMacroBars() {
    if (!state.profile || !state.profile.macros) return;

    const consumed = calculateConsumedMacros();
    const targets = state.profile.macros;
    const targetCalories = state.profile.targetCalories || 2000;

    // === PROGRESS RINGS (Premium UI) ===
    if (window.PremiumUI && typeof window.PremiumUI.createProgressRing === 'function') {
        // Calories Ring
        const caloriesContainer = document.getElementById('ring-calories');
        if (caloriesContainer) {
            window.PremiumUI.createProgressRing(caloriesContainer, {
                value: consumed.calories,
                max: targetCalories,
                label: 'CALORIES',
                type: 'calories',
                size: 90
            });
            const caloriesDetail = document.getElementById('ring-calories-detail');
            if (caloriesDetail) caloriesDetail.textContent = `${consumed.calories} / ${targetCalories}`;
        }

        // Protein Ring
        const proteinContainer = document.getElementById('ring-protein');
        if (proteinContainer) {
            window.PremiumUI.createProgressRing(proteinContainer, {
                value: consumed.protein,
                max: targets.protein,
                label: 'PROTÉINES',
                type: 'protein',
                size: 90
            });
            const proteinDetail = document.getElementById('ring-protein-detail');
            if (proteinDetail) proteinDetail.textContent = `${consumed.protein} / ${targets.protein}g`;
        }

        // Carbs Ring
        const carbsContainer = document.getElementById('ring-carbs');
        if (carbsContainer) {
            window.PremiumUI.createProgressRing(carbsContainer, {
                value: consumed.carbs,
                max: targets.carbs,
                label: 'GLUCIDES',
                type: 'carbs',
                size: 90
            });
            const carbsDetail = document.getElementById('ring-carbs-detail');
            if (carbsDetail) carbsDetail.textContent = `${consumed.carbs} / ${targets.carbs}g`;
        }

        // Fat Ring
        const fatContainer = document.getElementById('ring-fat');
        if (fatContainer) {
            window.PremiumUI.createProgressRing(fatContainer, {
                value: consumed.fat,
                max: targets.fat,
                label: 'LIPIDES',
                type: 'fat',
                size: 90
            });
            const fatDetail = document.getElementById('ring-fat-detail');
            if (fatDetail) fatDetail.textContent = `${consumed.fat} / ${targets.fat}g`;
        }

        // Update status badge
        const statusBadge = document.getElementById('macros-status');
        if (statusBadge) {
            const caloriesPercent = (consumed.calories / targetCalories) * 100;
            if (caloriesPercent >= 90 && caloriesPercent <= 110) {
                statusBadge.textContent = '✓ Objectif atteint';
                statusBadge.className = 'badge badge-success';
                statusBadge.style.display = 'inline-flex';
            } else if (caloriesPercent > 110) {
                statusBadge.textContent = 'Dépassé';
                statusBadge.className = 'badge badge-warning';
                statusBadge.style.display = 'inline-flex';
            } else if (caloriesPercent > 0) {
                statusBadge.textContent = 'En cours';
                statusBadge.className = 'badge badge-info';
                statusBadge.style.display = 'inline-flex';
            } else {
                statusBadge.style.display = 'none';
            }
        }
    }

    // === FALLBACK BARS (for very small screens or if PremiumUI not loaded) ===
    const proteinBar = document.getElementById('macro-protein-bar');
    const carbsBar = document.getElementById('macro-carbs-bar');
    const fatBar = document.getElementById('macro-fat-bar');

    if (proteinBar) {
        const proteinPercent = Math.min((consumed.protein / targets.protein) * 100, 100);
        document.getElementById('macro-protein-value').textContent = `${consumed.protein} / ${targets.protein}g`;
        proteinBar.style.width = `${proteinPercent}%`;
    }

    if (carbsBar) {
        const carbsPercent = Math.min((consumed.carbs / targets.carbs) * 100, 100);
        document.getElementById('macro-carbs-value').textContent = `${consumed.carbs} / ${targets.carbs}g`;
        carbsBar.style.width = `${carbsPercent}%`;
    }

    if (fatBar) {
        const fatPercent = Math.min((consumed.fat / targets.fat) * 100, 100);
        document.getElementById('macro-fat-value').textContent = `${consumed.fat} / ${targets.fat}g`;
        fatBar.style.width = `${fatPercent}%`;
    }
}

function calculateConsumedMacros() {
    let protein = 0, carbs = 0, fat = 0, calories = 0;

    // Vérification de nullité pour éviter l'erreur Object.values()
    if (state.dailyMenu && typeof state.dailyMenu === 'object') {
        Object.values(state.dailyMenu).forEach(meal => {
            if (Array.isArray(meal)) {
                meal.forEach(item => {
                    if (item && item.food) {
                        const multiplier = item.quantity / 100;
                        protein += item.food.protein * multiplier;
                        carbs += item.food.carbs * multiplier;
                        fat += item.food.fat * multiplier;
                        calories += item.food.calories * multiplier;
                    }
                });
            }
        });
    }

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
