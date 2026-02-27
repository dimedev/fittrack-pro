// ==================== PROFILE MODULE ====================

// Fonction helper pour calculer BMR, TDEE et macros
function calculateProfile(profile) {
    // Validation des données requises
    if (!profile.weight || !profile.height || !profile.age || !profile.activity) {
        return null; // Données insuffisantes pour calculer
    }
    
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
        document.getElementById('profile-pseudo').value = state.profile.pseudo || '';
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
            pseudo: document.getElementById('profile-pseudo').value.trim() || null,
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

// Protection contre les appels récursifs avec try/finally
let _updateDashboardRunning = false;

function updateDashboard() {
    if (_updateDashboardRunning) return;
    _updateDashboardRunning = true;
    
    try {
        // Mise à jour du Quick Summary
        updateQuickSummary();
        
        // Mise à jour des stats avec animations
        if (state.profile && state.profile.targetCalories && state.profile.macros) {
            // Utiliser les animations si disponibles
            if (typeof updateStatWithAnimation === 'function') {
                updateStatWithAnimation('stat-calories', state.profile.targetCalories);
                updateStatWithAnimation('stat-protein', state.profile.macros.protein);
            } else {
                const calEl = document.getElementById('stat-calories');
                const protEl = document.getElementById('stat-protein');
                if (calEl) calEl.textContent = state.profile.targetCalories;
                if (protEl) protEl.textContent = state.profile.macros.protein;
            }

            // Résumé du profil SIMPLIFIÉ
            const goalLabels = {
                'cut': 'Sèche',
                'maintain': 'Maintien',
                'lean-bulk': 'Prise légère',
                'bulk': 'Prise de masse'
            };

            const totalSessions = state.sessionHistory ? state.sessionHistory.length : 0;
            const currentStreak = state.goals?.currentStreak || 0;
            const longestStreak = state.goals?.longestStreak || 0;
            
            // Profile summary compact
            const profileSummary = document.getElementById('profile-summary');
            if (profileSummary) {
                profileSummary.innerHTML = `
                    <div class="profile-summary-compact">
                        <div class="profile-stat-item">
                            <span class="profile-stat-label">Objectif</span>
                            <span class="profile-stat-value">${goalLabels[state.profile.goal] || state.profile.goal}</span>
                        </div>
                        <div class="profile-stat-item">
                            <span class="profile-stat-label">Poids</span>
                            <span class="profile-stat-value">${state.profile.weight} kg</span>
                        </div>
                        <div class="profile-stat-item">
                            <span class="profile-stat-label">Séances</span>
                            <span class="profile-stat-value">${totalSessions}</span>
                        </div>
                        <div class="profile-stat-item">
                            <span class="profile-stat-label">Calories</span>
                            <span class="profile-stat-value">${state.profile.targetCalories} kcal</span>
                        </div>
                    </div>
                    ${currentStreak > 0 || longestStreak > 0 ? `
                    <div class="profile-streak-badge">
                        🔥 ${currentStreak} jours ${longestStreak > currentStreak ? `<span style="color: var(--text-muted); font-weight: 400;">• Record: ${longestStreak}</span>` : ''}
                    </div>` : ''}
                `;
            }

            // Mise à jour des barres de macros
            updateMacroBars();
        } else if (state.profile && state.profile.weight && state.profile.height && state.profile.age && state.profile.activity) {
            // Profil existe mais macros non calculés - les recalculer
            const calculated = calculateProfile(state.profile);
            
            // Ne recalculer que si calculateProfile a réussi
            if (calculated) {
                state.profile.bmr = calculated.bmr;
                state.profile.tdee = calculated.tdee;
                state.profile.targetCalories = calculated.targetCalories;
                state.profile.macros = calculated.macros;
                saveState();

                // Re-appeler updateDashboard avec les données complètes
                _updateDashboardRunning = false;
                updateDashboard();
                return;
            }
        } else if (state.profile && (state.profile.weight || state.profile.goal)) {
            // Profil minimal - afficher ce qui est disponible
            const goalLabels = {
                'cut': 'Sèche',
                'maintain': 'Maintien',
                'lean-bulk': 'Prise légère',
                'bulk': 'Prise de masse'
            };
            
            const totalSessions = state.sessionHistory ? state.sessionHistory.length : 0;
            const profileSummary = document.getElementById('profile-summary');
            
            if (profileSummary) {
                profileSummary.innerHTML = `
                    <div class="profile-summary-compact">
                        ${state.profile.goal ? `
                        <div class="profile-stat-item">
                            <span class="profile-stat-label">Objectif</span>
                            <span class="profile-stat-value">${goalLabels[state.profile.goal] || state.profile.goal}</span>
                        </div>` : ''}
                        ${state.profile.weight ? `
                        <div class="profile-stat-item">
                            <span class="profile-stat-label">Poids</span>
                            <span class="profile-stat-value">${state.profile.weight} kg</span>
                        </div>` : ''}
                        <div class="profile-stat-item">
                            <span class="profile-stat-label">Séances</span>
                            <span class="profile-stat-value">${totalSessions}</span>
                        </div>
                        <div class="profile-stat-item">
                            <span class="profile-stat-label">⚠️</span>
                            <span class="profile-stat-value" style="font-size: 0.8rem; color: var(--text-secondary);">Profil incomplet</span>
                        </div>
                    </div>
                `;
            }
        }

        // Stats du programme (hidden elements for compatibility)
        if (state.selectedProgram && trainingPrograms[state.selectedProgram]) {
            const program = trainingPrograms[state.selectedProgram];
            const progEl = document.getElementById('stat-program');
            const daysEl = document.getElementById('stat-days');
            if (progEl) progEl.textContent = program.name;
            if (daysEl) daysEl.textContent = state.trainingDays;
        }

        // Widget de recommandations
        const recommendationsCard = document.getElementById('recommendations-card-container');
        if (recommendationsCard && typeof renderRecommendationsCard === 'function') {
            recommendationsCard.innerHTML = renderRecommendationsCard();
        }
        
        // Smart Insights
        const smartInsightsContainer = document.getElementById('smart-insights-card-container');
        if (smartInsightsContainer && typeof renderSmartInsightsCard === 'function') {
            smartInsightsContainer.innerHTML = renderSmartInsightsCard();
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
        
        // Insights automatiques de la semaine
        if (typeof renderInsightsWidget === 'function') {
            renderInsightsWidget();
        }
        
        // Recommandations du coach
        if (typeof renderCoachRecommendations === 'function') {
            renderCoachRecommendations();
        }

        // Dashboard insights (Phase 2C)
        if (typeof renderDashboardInsights === 'function') {
            renderDashboardInsights();
        }
    } catch (error) {
        console.error('Erreur dans updateDashboard:', error);
    } finally {
        _updateDashboardRunning = false;
    }
}

// ==================== QUICK SUMMARY ====================
function updateQuickSummary() {
    const greetingEl = document.getElementById('quick-summary-greeting');
    const calsRemainingEl = document.getElementById('quick-cals-remaining');
    const sessionNameEl = document.getElementById('quick-session-name');
    const streakEl = document.getElementById('quick-streak');
    
    if (!greetingEl) return;
    
    // Greeting based on time of day + pseudo
    const hour = new Date().getHours();
    let greeting = 'Bienvenue';
    if (hour >= 5 && hour < 12) greeting = 'Bonjour';
    else if (hour >= 12 && hour < 18) greeting = 'Bon après-midi';
    else if (hour >= 18 && hour < 22) greeting = 'Bonsoir';
    else greeting = 'Bonne nuit';
    
    const pseudo = state.profile?.pseudo;
    greetingEl.textContent = pseudo ? `${greeting}, ${pseudo} 👋` : `${greeting} 👋`;
    
    // Calories remaining (avec bonus cardio)
    if (state.profile && state.profile.targetCalories) {
        const consumed = calculateConsumedMacros();
        // Ajouter les calories brûlées par le cardio au budget
        const cardioCalories = typeof Cardio !== 'undefined' ? Cardio.getCaloriesForDate() : 0;
        const adjustedTarget = state.profile.targetCalories + cardioCalories;
        const remaining = Math.max(0, adjustedTarget - (consumed?.calories || 0));
        if (calsRemainingEl) calsRemainingEl.textContent = remaining.toLocaleString();
    } else {
        if (calsRemainingEl) calsRemainingEl.textContent = '--';
    }
    
    // Today's session name
    if (sessionNameEl) {
        if (state.selectedProgram && trainingPrograms[state.selectedProgram]) {
            const program = trainingPrograms[state.selectedProgram];
            const currentDay = state.currentTrainingDay || 1;
            const split = program.splits?.[currentDay - 1];
            sessionNameEl.textContent = split?.name || program.name;
        } else {
            sessionNameEl.textContent = 'Aucune';
        }
    }
    
    // Streak (avec bounce animation si incrémenté)
    if (streakEl) {
        const currentStreak = state.goals?.currentStreak || 0;
        const prevStreak = parseInt(streakEl.textContent) || 0;
        streakEl.textContent = currentStreak;
        if (currentStreak > prevStreak && prevStreak > 0) {
            streakEl.classList.remove('streak-updated');
            void streakEl.offsetWidth; // force reflow
            streakEl.classList.add('streak-updated');
        }
    }
    
    // Update Readiness Score
    updateReadinessScore();
}

// ==================== DAILY READINESS SCORE ====================
function calculateReadinessScore() {
    let details = {
        nutrition: 0,
        recovery: 100,
        hydration: 0,
        streak: 0
    };
    
    // Vérifier si nouvel utilisateur (pas de sessions)
    const isNewUser = !state.sessionHistory || state.sessionHistory.length === 0;
    const hasEatenToday = state.foodJournal && state.foodJournal[new Date().toISOString().split('T')[0]]?.length > 0;
    
    // Nutrition (40%) - macros atteints
    if (state.profile && state.profile.targetCalories) {
        const consumed = calculateConsumedMacros();
        if (consumed && consumed.calories > 0) {
            const caloriePercent = Math.min(100, (consumed.calories / state.profile.targetCalories) * 100);
            const proteinPercent = state.profile.macros?.protein 
                ? Math.min(100, (consumed.protein / state.profile.macros.protein) * 100)
                : 0;
            
            // Pénaliser si trop au-dessus des objectifs
            const nutritionScore = caloriePercent > 120 ? Math.max(0, 100 - (caloriePercent - 120)) : caloriePercent;
            details.nutrition = Math.round((nutritionScore + proteinPercent) / 2);
        } else if (isNewUser) {
            // Nouvel utilisateur sans repas = neutre, pas pénalisé
            details.nutrition = 50;
        }
    } else if (isNewUser) {
        details.nutrition = 50;
    }
    
    // Recovery (40%) - récupération musculaire moyenne + impact cardio
    if (typeof SmartTraining !== 'undefined') {
        const recovery = SmartTraining.calculateMuscleRecovery();
        const recoveryValues = Object.values(recovery)
            .filter(r => r.lastWorked !== null)
            .map(r => r.recovery);
        
        if (recoveryValues.length > 0) {
            details.recovery = Math.round(recoveryValues.reduce((a, b) => a + b, 0) / recoveryValues.length);
        } else {
            details.recovery = 100; // Pas d'entraînement récent = bien récupéré
        }
        
        // Impact du cardio sur la récupération
        if (typeof Cardio !== 'undefined') {
            const cardioImpact = Cardio.getRecoveryImpact();
            details.recovery = Math.max(0, details.recovery - cardioImpact);
        }
    }
    
    // Hydratation (10%) - bonus si objectif atteint
    const today = new Date().toISOString().split('T')[0];
    const waterConsumed = state.hydration?.[today] || 0;
    const waterGoal = state.profile?.waterGoal || 2500;
    const waterPercent = Math.min(100, (waterConsumed / waterGoal) * 100);
    
    if (waterPercent >= 80) {
        details.hydration = 100; // Bonus si >= 80%
    } else if (waterPercent >= 50) {
        details.hydration = 70; // Acceptable
    } else if (waterPercent > 0) {
        details.hydration = 40; // Insuffisant
    } else {
        details.hydration = isNewUser ? 50 : 0; // Neutre pour nouveaux users
    }
    
    // Streak (20%) - bonus pour la constance
    const currentStreak = state.goals?.currentStreak || 0;
    if (currentStreak > 0) {
        details.streak = Math.min(100, currentStreak * 15); // Plus rapide à monter
    } else if (isNewUser) {
        details.streak = 50; // Neutre pour nouveaux utilisateurs
    }
    
    // Calcul du score final pondéré
    let score = Math.round(
        (details.nutrition * 0.35) +
        (details.recovery * 0.35) +
        (details.hydration * 0.10) +
        (details.streak * 0.20)
    );
    
    // Boost pour nouveaux utilisateurs prêts à commencer
    if (isNewUser && details.recovery === 100) {
        score = Math.max(score, 70); // Minimum 70 pour nouveaux users bien reposés
    }
    
    return {
        score: Math.min(100, Math.max(0, score)),
        details: details,
        status: score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'moderate' : 'low',
        isNewUser: isNewUser
    };
}

function updateReadinessScore() {
    const container = document.getElementById('readiness-score-container');
    if (!container) return;
    
    const { score, details, status, isNewUser } = calculateReadinessScore();
    
    const statusColors = {
        excellent: 'var(--success)',
        good: 'var(--success)',
        moderate: 'var(--warning)',
        low: 'var(--danger)'
    };
    
    const statusLabels = {
        excellent: 'Excellent',
        good: 'Bon',
        moderate: 'Moyen',
        low: 'Faible'
    };
    
    // Message contextuel
    let message = '';
    if (isNewUser) {
        message = 'Prêt à commencer ! Loguez repas et séances pour un score précis.';
    } else if (score >= 80) {
        message = 'Tu es en forme, fonce !';
    } else if (score >= 60) {
        message = 'Bonne forme générale';
    } else if (details.recovery < 70) {
        message = 'Repos conseillé pour certains muscles';
    } else if (details.nutrition < 50) {
        message = 'Pense à manger pour performer';
    }
    
    container.innerHTML = `
        <div class="readiness-card ${isNewUser ? 'new-user' : ''}">
            <div class="readiness-header">
                <span class="readiness-title">Préparation</span>
                <span class="readiness-status" style="color: ${statusColors[status]}">${statusLabels[status]}</span>
            </div>
            <div class="readiness-score-display">
                <div class="readiness-ring">
                    <svg viewBox="0 0 100 100">
                        <circle class="readiness-ring-bg" cx="50" cy="50" r="42" />
                        <circle class="readiness-ring-fill" cx="50" cy="50" r="42" 
                                style="stroke: ${statusColors[status]}; 
                                       stroke-dasharray: ${score * 2.64} 264" />
                    </svg>
                    <div class="readiness-score-value">${score}</div>
                </div>
            </div>
            ${message ? `<div class="readiness-message">${message}</div>` : ''}
            <div class="readiness-details">
                <div class="readiness-detail">
                    <span class="detail-label">Nutrition</span>
                    <div class="detail-bar">
                        <div class="detail-bar-fill" style="width: ${details.nutrition}%"></div>
                    </div>
                    <span class="detail-value">${details.nutrition}%</span>
                </div>
                <div class="readiness-detail">
                    <span class="detail-label">Récupération</span>
                    <div class="detail-bar">
                        <div class="detail-bar-fill" style="width: ${details.recovery}%"></div>
                    </div>
                    <span class="detail-value">${details.recovery}%</span>
                </div>
                <div class="readiness-detail">
                    <span class="detail-label">Constance</span>
                    <div class="detail-bar">
                        <div class="detail-bar-fill" style="width: ${details.streak}%"></div>
                    </div>
                    <span class="detail-value">${details.streak}%</span>
                </div>
            </div>
        </div>
    `;
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

// ==================== EXPORTS GLOBAUX ====================
window.openProfileModal = openProfileModal;
window.saveProfile = saveProfile;
window.updateDashboard = updateDashboard;
window.updateQuickSummary = updateQuickSummary;
window.calculateProfile = calculateProfile;
window.calculateMacros = calculateMacros;
window.updateMacroBars = updateMacroBars;
window.calculateConsumedMacros = calculateConsumedMacros;
window.updateReadinessScore = updateReadinessScore;
window.updateProgressionRecommendations = updateProgressionRecommendations;

console.log('✅ profile.js: Fonctions exportées au scope global');

// ==================== EXPORTS GLOBAUX ====================
window.openProfileModal = openProfileModal;
window.saveProfile = saveProfile;
window.calculateProfile = calculateProfile;
window.calculateMacros = calculateMacros;
window.updateDashboard = updateDashboard;
window.updateQuickSummary = updateQuickSummary;
window.calculateReadinessScore = calculateReadinessScore;
window.updateReadinessScore = updateReadinessScore;
window.updateMacroBars = updateMacroBars;
window.calculateConsumedMacros = calculateConsumedMacros;
window.updateProgressionRecommendations = updateProgressionRecommendations;

console.log('✅ profile.js: Fonctions exportées au scope global');
