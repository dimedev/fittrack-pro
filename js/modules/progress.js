// ==================== PROGRESS MODULE ====================

let progressChart = null;

// Variables pour les graphiques stats avancés
let muscleVolumeChart = null;
let frequencyChart = null;
let monthlyComparisonChart = null;

// ==================== HELPER FUNCTIONS ====================

/**
 * Calcule la progression de volume entre ce mois et le mois précédent
 * @returns {number|null} - Pourcentage de progression ou null si pas assez de données
 */
function calculateMonthlyProgression() {
    const activeSessions = (state.sessionHistory || []).filter(s => !s.deletedAt);
    if (activeSessions.length === 0) return null;

    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    let currentMonthVolume = 0;
    let previousMonthVolume = 0;

    activeSessions.forEach(session => {
        const sessionDate = new Date(session.date);
        let sessionVolume = 0;

        // Calculer le volume de la séance
        (session.exercises || []).forEach(ex => {
            const setsData = ex.setsDetail || ex.sets || [];
            if (Array.isArray(setsData)) {
                setsData.forEach(set => {
                    if (set.completed !== false) {
                        sessionVolume += (set.weight || 0) * (set.reps || 0);
                    }
                });
            } else {
                // Format ancien: sets est un nombre
                sessionVolume += (ex.weight || 0) * (ex.achievedReps || 0);
            }
        });

        // Attribuer au bon mois
        if (sessionDate >= startOfCurrentMonth) {
            currentMonthVolume += sessionVolume;
        } else if (sessionDate >= startOfPreviousMonth && sessionDate <= endOfPreviousMonth) {
            previousMonthVolume += sessionVolume;
        }
    });

    // Si pas de données le mois précédent, pas de calcul possible
    if (previousMonthVolume === 0) return null;

    // Calculer la progression
    const progression = ((currentMonthVolume - previousMonthVolume) / previousMonthVolume) * 100;
    return Math.round(progression);
}

// ==================== TAB SWITCHING ====================

function switchProgressTab(tabName) {
    // Mettre à jour les boutons d'onglets
    document.querySelectorAll('#progress .tabs .tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        }
    });
    
    // Afficher/masquer les contenus
    document.querySelectorAll('#progress .tab-content').forEach(content => {
        content.style.display = 'none';
    });
    
    const targetContent = document.getElementById(`tab-${tabName}`);
    if (targetContent) {
        targetContent.style.display = 'block';
    }

    // Refresh data based on tab
    if (tabName === 'history') {
        updateSessionHistory();
    } else if (tabName === 'prs') {
        renderPRsSection();
        populateProgressExerciseSelect();
    } else if (tabName === 'badges') {
        renderAchievements();
    } else if (tabName === 'stats') {
        renderMuscleVolumeChart();
        renderFrequencyChart();
        renderMonthlyComparisonChart();
    }
}

// ==================== PROGRESS HERO & FEED ====================

let currentChartPeriod = 'month';

function updateProgressHero() {
    // PRs ce mois
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    let prsThisMonth = 0;
    
    if (state.progressLog) {
        Object.keys(state.progressLog).forEach(exercise => {
            const logs = state.progressLog[exercise];
            const monthLogs = logs.filter(log => new Date(log.date) >= startOfMonth);
            prsThisMonth += monthLogs.length;
        });
    }
    
    const prsEl = document.getElementById('progress-prs-month');
    if (prsEl) prsEl.textContent = prsThisMonth;
    
    // Progression (calculer la diff de volume avec le mois dernier)
    const percentEl = document.getElementById('progress-percentage');
    if (percentEl) {
        const progression = calculateMonthlyProgression();
        if (progression !== null) {
            const sign = progression >= 0 ? '+' : '';
            percentEl.textContent = `${sign}${progression}%`;
            // Changer la couleur selon la progression
            percentEl.style.color = progression >= 0 ? 'var(--accent-primary)' : 'var(--warning)';
        } else {
            percentEl.textContent = '--%';
            percentEl.style.color = 'var(--text-muted)';
        }
    }
    
    // Badges count
    if (typeof Achievements !== 'undefined') {
        const { unlocked } = Achievements.check();
        const badgesEl = document.getElementById('progress-badges-count');
        if (badgesEl) badgesEl.textContent = unlocked.length;
    }
}

function generateProgressFeed() {
    const feed = [];
    
    // PRs récents (7 derniers jours)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    if (state.progressLog) {
        Object.keys(state.progressLog).forEach(exercise => {
            const logs = state.progressLog[exercise] || [];
            logs.forEach(log => {
                if (new Date(log.date) >= weekAgo) {
                    // Fallback: essayer setsDetail puis utiliser les données agrégées
                    if (log.setsDetail) {
                        log.setsDetail.forEach(set => {
                            if (set.completed) {
                                feed.push({
                                    type: 'pr',
                                    icon: '🏆',
                                    title: 'Nouveau PR!',
                                    text: `${exercise}: ${set.weight}kg × ${set.reps}`,
                                    date: log.date
                                });
                            }
                        });
                    } else if (log.weight > 0 && log.achievedReps > 0) {
                        // Fallback avec données agrégées
                        feed.push({
                            type: 'pr',
                            icon: '🏆',
                            title: 'Nouveau PR!',
                            text: `${exercise}: ${log.weight}kg × ${log.achievedReps} reps`,
                            date: log.date
                        });
                    }
                }
            });
        });
    }
    
    // Séances récentes (exclure les soft-deleted)
    if (state.sessionHistory) {
        state.sessionHistory.filter(s => !s.deletedAt).slice(0, 5).forEach(s => {
            feed.push({
                type: 'session',
                icon: '✅',
                title: 'Séance terminée',
                text: `${s.day} - ${s.duration || 0} min`,
                date: s.date
            });
        });
    }
    
    // Badges débloqués (si disponibles)
    if (typeof Achievements !== 'undefined') {
        const { newlyUnlocked } = Achievements.check();
        newlyUnlocked.forEach(b => {
            feed.push({
                type: 'badge',
                icon: b.icon,
                title: 'Badge débloqué!',
                text: b.name,
                date: new Date().toISOString().split('T')[0]
            });
        });
    }
    
    // Trier par date (plus récent d'abord)
    return feed.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
}

function renderProgressFeed() {
    const container = document.getElementById('daily-progress-feed');
    if (!container) return;
    
    const feed = generateProgressFeed();
    
    if (feed.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚡</div>
                <div class="empty-state-title">Aucune activité récente</div>
            </div>
        `;
        return;
    }
    
    let html = '';
    feed.forEach(item => {
        const timeText = getRelativeDateShort(new Date(item.date));
        html += `
            <div class="feed-item feed-${item.type}">
                <div class="feed-icon">${item.icon}</div>
                <div class="feed-content">
                    <strong>${item.title}</strong>
                    <span>${item.text}</span>
                </div>
                <div class="feed-time">${timeText}</div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function filterProgressChart(period) {
    currentChartPeriod = period;
    
    // Update active button
    document.querySelectorAll('.chart-filters .filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.period === period) {
            btn.classList.add('active');
        }
    });
    
    updateProgressChart();
}

function renderAchievements() {
    const container = document.getElementById('achievements-container');
    if (!container || typeof Achievements === 'undefined') return;
    
    container.innerHTML = Achievements.render();
}

// ==================== PERSONAL RECORDS (PRs) ====================

/**
 * Calcule tous les PRs pour un exercice donné
 * @param {string} exerciseName - Nom de l'exercice
 * @returns {object|null} - Les différents PRs ou null si pas de données
 */
function getExercisePRs(exerciseName) {
    const logs = state.progressLog[exerciseName];
    if (!logs || logs.length === 0) return null;

    let maxWeight = 0;
    let maxWeightDate = null;
    let maxVolume = 0;
    let maxVolumeDate = null;
    let max1RM = 0;
    let max1RMDate = null;
    let maxRepsAtWeight = {}; // { weight: { reps, date } }

    logs.forEach(log => {
        // PR de poids max (peu importe les reps)
        if (log.weight > maxWeight) {
            maxWeight = log.weight;
            maxWeightDate = log.date;
        }

        // PR de volume (poids x reps total)
        const volume = log.weight * (log.achievedReps || 0);
        if (volume > maxVolume) {
            maxVolume = volume;
            maxVolumeDate = log.date;
        }

        // Calculer le 1RM estimé (formule Epley)
        // 1RM = weight × (1 + reps/30)
        if (log.setsDetail && log.setsDetail.length > 0) {
            log.setsDetail.forEach(set => {
                if (set.weight > 0 && set.reps > 0 && set.reps <= 12) {
                    const estimated1RM = set.weight * (1 + set.reps / 30);
                    if (estimated1RM > max1RM) {
                        max1RM = estimated1RM;
                        max1RMDate = log.date;
                    }
                }

                // Tracker les max reps pour chaque poids
                const weightKey = set.weight.toString();
                if (!maxRepsAtWeight[weightKey] || set.reps > maxRepsAtWeight[weightKey].reps) {
                    maxRepsAtWeight[weightKey] = { reps: set.reps, date: log.date };
                }
            });
        } else {
            // Fallback si pas de setsDetail
            const avgRepsPerSet = log.sets > 0 ? (log.achievedReps || 0) / log.sets : 0;
            
            // Calculer 1RM même si reps > 12 (formule adaptée)
            if (log.weight > 0 && avgRepsPerSet > 0) {
                let estimated1RM;
                if (avgRepsPerSet <= 12) {
                    // Formule Epley classique
                    estimated1RM = log.weight * (1 + avgRepsPerSet / 30);
                } else {
                    // Formule adaptée pour reps > 12 (estimation plus conservatrice)
                    estimated1RM = log.weight * (1 + Math.min(avgRepsPerSet, 20) / 30);
                }
                
                if (estimated1RM > max1RM) {
                    max1RM = estimated1RM;
                    max1RMDate = log.date;
                }
            }
            
            // Remplir maxRepsAtWeight avec la MOYENNE par série, pas le total
            if (log.weight > 0 && avgRepsPerSet > 0) {
                const weightKey = log.weight.toString();
                // Arrondir la moyenne pour l'affichage
                const avgRepsRounded = Math.round(avgRepsPerSet);
                if (!maxRepsAtWeight[weightKey] || avgRepsRounded > maxRepsAtWeight[weightKey].reps) {
                    maxRepsAtWeight[weightKey] = { reps: avgRepsRounded, date: log.date };
                }
            }
        }
    });

    return {
        maxWeight: { value: maxWeight, date: maxWeightDate },
        maxVolume: { value: Math.round(maxVolume), date: maxVolumeDate },
        estimated1RM: { value: Math.round(max1RM * 10) / 10, date: max1RMDate },
        maxRepsAtWeight
    };
}

/**
 * Récupère tous les PRs de tous les exercices
 * @returns {object} - { exerciseName: PRs }
 */
function getAllPRs() {
    const allPRs = {};

    Object.keys(state.progressLog).forEach(exerciseName => {
        const prs = getExercisePRs(exerciseName);
        if (prs && prs.maxWeight.value > 0) {
            allPRs[exerciseName] = prs;
        }
    });

    return allPRs;
}

/**
 * Vérifie si une performance est un nouveau PR
 * @param {string} exerciseName - Nom de l'exercice
 * @param {number} weight - Poids utilisé
 * @param {number} reps - Reps réalisées
 * @returns {object} - { isNewPR: boolean, type: string[], message: string }
 */
function checkForNewPR(exerciseName, weight, reps) {
    const currentPRs = getExercisePRs(exerciseName);
    const newPRs = [];

    if (!currentPRs) {
        // Premier log pour cet exercice = automatiquement un PR
        return {
            isNewPR: true,
            types: ['first'],
            message: `Premier record pour ${exerciseName} ! 🎉`
        };
    }

    // Check PR de poids
    if (weight > currentPRs.maxWeight.value) {
        newPRs.push('weight');
    }

    // Check PR de reps à ce poids
    const weightKey = weight.toString();
    if (currentPRs.maxRepsAtWeight[weightKey]) {
        if (reps > currentPRs.maxRepsAtWeight[weightKey].reps) {
            newPRs.push('reps');
        }
    } else if (reps > 0) {
        // Nouveau poids avec des reps = PR pour ce poids
        newPRs.push('reps');
    }

    // Check PR de 1RM estimé
    if (weight > 0 && reps > 0 && reps <= 12) {
        const new1RM = weight * (1 + reps / 30);
        if (new1RM > currentPRs.estimated1RM.value) {
            newPRs.push('1rm');
        }
    }

    if (newPRs.length > 0) {
        let message = '';
        if (newPRs.includes('weight')) {
            message = `🏆 NOUVEAU PR DE POIDS ! ${weight}kg`;
        } else if (newPRs.includes('1rm')) {
            const new1RM = Math.round(weight * (1 + reps / 30) * 10) / 10;
            message = `🏆 NOUVEAU 1RM ESTIMÉ ! ${new1RM}kg`;
        } else if (newPRs.includes('reps')) {
            message = `🏆 PR de reps à ${weight}kg : ${reps} reps !`;
        }

        return {
            isNewPR: true,
            types: newPRs,
            message
        };
    }

    return { isNewPR: false, types: [], message: '' };
}

/**
 * Affiche la section des PRs dans l'interface - Style Nike Premium
 */
function renderPRsSection() {
    const container = document.getElementById('prs-container');
    if (!container) return;

    const allPRs = getAllPRs();
    const exerciseNames = Object.keys(allPRs);

    if (exerciseNames.length === 0) {
        container.innerHTML = `
            <div class="empty-state pr-empty-state">
                <div class="empty-state-icon">🏆</div>
                <div class="empty-state-title">Aucun record</div>
                <p>Tes PRs apparaîtront ici après ta première séance</p>
            </div>
        `;
        return;
    }

    // Trier par 1RM estimé (les plus impressionnants d'abord)
    const sortedExercises = exerciseNames.sort((a, b) => {
        return (allPRs[b].estimated1RM.value || 0) - (allPRs[a].estimated1RM.value || 0);
    });

    // Check for recent PRs (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    let html = '<div class="prs-grid">';

    sortedExercises.forEach((exerciseName, index) => {
        const prs = allPRs[exerciseName];
        const maxWeightDate = prs.maxWeight.date ? new Date(prs.maxWeight.date) : null;
        
        // Date relative pour UX premium
        const dateStr = getRelativeDateShort(maxWeightDate);
        
        // Check if this is a recent PR
        const isRecentPR = maxWeightDate && maxWeightDate >= sevenDaysAgo;

        // Trouver le nombre de reps pour le max weight spécifique
        const maxWeightKey = prs.maxWeight.value.toString();
        // Fix: Si maxRepsAtWeight n'a pas ce poids exact, chercher dans les logs
        let maxReps = prs.maxRepsAtWeight[maxWeightKey]?.reps || 0;

        // Fallback: chercher les reps directement dans progressLog si maxReps = 0
        if (maxReps === 0 && state.progressLog[exerciseName]) {
            const logs = state.progressLog[exerciseName];

            // FIX: Ne PAS matcher sur log.weight (c'est une moyenne qui ne matche jamais)
            // Chercher directement dans setsDetail un set au poids max
            for (const log of logs) {
                if (log.setsDetail && log.setsDetail.length > 0) {
                    // Chercher un set qui a exactement le poids max
                    const matchingSets = log.setsDetail.filter(s => s.weight === prs.maxWeight.value);
                    if (matchingSets.length > 0) {
                        maxReps = Math.max(...matchingSets.map(s => s.reps || 0));
                        if (maxReps > 0) break;
                    }
                }
            }

            // Fallback ultime si toujours 0: utiliser les reps moyennes de l'ancien format
            if (maxReps === 0) {
                for (const log of logs) {
                    if (!log.setsDetail && log.achievedReps && log.sets) {
                        // Format ancien sans setsDetail
                        maxReps = Math.round(log.achievedReps / log.sets);
                        if (maxReps > 0) break;
                    }
                }
            }
        }

        html += `
            <div class="pr-card-premium ${isRecentPR ? 'pr-recent' : ''}" style="animation-delay: ${index * 0.05}s">
                <div class="pr-card-shine"></div>
                <div class="pr-header">
                    <span class="pr-exercise">${exerciseName}</span>
                    ${isRecentPR ? '<span class="pr-badge-new pulse">NEW</span>' : ''}
                </div>
                <div class="pr-main-stat">
                    <span class="pr-value">${prs.estimated1RM.value}</span>
                    <span class="pr-unit">kg 1RM</span>
                </div>
                <div class="pr-secondary">
                    <span>Max: ${prs.maxWeight.value}kg × ${maxReps}</span>
                </div>
                <div class="pr-date">${dateStr}</div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

/**
 * Retourne une date relative courte
 */
function getRelativeDateShort(date) {
    if (!date) return '-';
    
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} sem.`;
    if (diffDays < 365) return `Il y a ${Math.floor(diffDays / 30)} mois`;
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

/**
 * Affiche le PR actuel dans la card d'exercice pendant la séance
 * @param {string} exerciseName - Nom de l'exercice
 * @returns {string} - HTML du badge PR
 */
function getPRBadgeHTML(exerciseName) {
    const prs = getExercisePRs(exerciseName);
    if (!prs || prs.maxWeight.value === 0) {
        return '<span class="pr-badge pr-badge-empty">Pas de PR</span>';
    }

    return `
        <span class="pr-badge" title="1RM estimé: ${prs.estimated1RM.value}kg">
            🏆 PR: ${prs.maxWeight.value}kg
        </span>
    `;
}

function populateProgressExerciseSelect() {
    const select = document.getElementById('progress-exercise');
    const exercises = Object.keys(state.progressLog).sort();

    if (exercises.length === 0) {
        select.innerHTML = '<option value="">Aucun exercice enregistré</option>';
        return;
    }

    select.innerHTML = '<option value="">Sélectionner un exercice</option>' +
        exercises.map(ex => `<option value="${ex}">${ex}</option>`).join('');
}

function updateProgressChart() {
    const exercise = document.getElementById('progress-exercise').value;
    const ctx = document.getElementById('progress-chart').getContext('2d');

    // Détruire le graphique existant
    if (progressChart) {
        progressChart.destroy();
        progressChart = null;
    }

    if (!exercise || !state.progressLog[exercise] || state.progressLog[exercise].length === 0) {
        // Afficher un message si pas de données
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.fillStyle = '#606070';
        ctx.font = '14px Outfit';
        ctx.textAlign = 'center';
        ctx.fillText('Sélectionnez un exercice pour voir votre progression', ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }

    // Filtrer les logs selon la période
    const now = new Date();
    const filterDate = {
        'month': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        '3months': new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
        '6months': new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000),
        'all': new Date(0)
    }[currentChartPeriod] || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const allLogs = state.progressLog[exercise];
    const logs = allLogs.filter(log => new Date(log.date) >= filterDate);
    const labels = logs.map(l => {
        const date = new Date(l.date);
        return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    });
    const weights = logs.map(l => l.weight);
    const reps = logs.map(l => l.achievedReps || 0);

    // Calculer le volume (poids x reps x séries)
    const volumes = logs.map(l => (l.weight * (l.achievedReps || 0) * l.sets) / 100);

    progressChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Poids (kg)',
                    data: weights,
                    borderColor: '#00ff88',
                    backgroundColor: 'rgba(0, 255, 136, 0.1)',
                    tension: 0.3,
                    fill: true,
                    yAxisID: 'y'
                },
                {
                    label: 'Reps réalisées',
                    data: reps,
                    borderColor: '#00aaff',
                    backgroundColor: 'rgba(0, 170, 255, 0.1)',
                    tension: 0.3,
                    fill: false,
                    yAxisID: 'y1'
                }
            ]
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
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#a0a0b0',
                        font: { family: 'Outfit' }
                    }
                },
                tooltip: {
                    backgroundColor: '#16161f',
                    titleColor: '#ffffff',
                    bodyColor: '#a0a0b0',
                    borderColor: '#2a2a3a',
                    borderWidth: 1
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
                    type: 'linear',
                    display: true,
                    position: 'left',
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        color: '#00ff88',
                        font: { family: 'Space Mono' }
                    },
                    title: {
                        display: true,
                        text: 'Poids (kg)',
                        color: '#00ff88'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: {
                        drawOnChartArea: false
                    },
                    ticks: {
                        color: '#00aaff',
                        font: { family: 'Space Mono' }
                    },
                    title: {
                        display: true,
                        text: 'Reps',
                        color: '#00aaff'
                    }
                }
            }
        }
    });
}

function updateSessionHistory() {
    const container = document.getElementById('session-history');

    if (!state.sessionHistory || state.sessionHistory.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📅</div>
                <div class="empty-state-title">Aucune séance enregistrée</div>
                <p>Vos séances apparaîtront ici</p>
            </div>
        `;
        return;
    }

    // Grouper par date
    const sessionsByDate = {};
    state.sessionHistory.forEach(session => {
        if (!sessionsByDate[session.date]) {
            sessionsByDate[session.date] = [];
        }
        sessionsByDate[session.date].push(session);
    });

    container.innerHTML = Object.entries(sessionsByDate)
        .slice(0, 10)
        .map(([date, sessions]) => {
            const formattedDate = new Date(date).toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long'
            });
            
            return sessions.map(session => `
                <div class="workout-day">
                    <div class="workout-day-header" onclick="toggleWorkoutDay(this)">
                        <div class="workout-day-title">
                            <span>${formattedDate}</span>
                            <span class="workout-day-badge">${session.day || 'Séance'}</span>
                        </div>
                        <span style="color: var(--text-muted);">${session.exercises?.length || 0} exercices ▼</span>
                    </div>
                    <div class="workout-day-content" style="display: none;">
                        ${(session.exercises || []).map(ex => {
                            // Gérer les 2 formats possibles de données
                            const exerciseName = ex.exercise || ex.name || 'Exercice';
                            
                            // Format 1: sets est un tableau d'objets [{weight, reps, completed}, ...]
                            // Format 2: sets est un nombre, weight/achievedReps sont des propriétés directes
                            let setsCount, totalReps, avgWeight;
                            
                            if (Array.isArray(ex.sets)) {
                                // Nouveau format avec setsDetail
                                setsCount = ex.sets.length;
                                totalReps = ex.sets.reduce((sum, s) => sum + (s.reps || 0), 0);
                                avgWeight = ex.sets.length > 0 
                                    ? Math.round(ex.sets.reduce((sum, s) => sum + (s.weight || 0), 0) / ex.sets.length * 10) / 10
                                    : 0;
                            } else {
                                // Ancien format ou format Supabase
                                setsCount = ex.sets || 0;
                                totalReps = ex.achievedReps || ex.reps || 0;
                                avgWeight = ex.weight || 0;
                            }
                            
                            return `
                                <div class="exercise-item">
                                    <span class="exercise-name">${exerciseName}</span>
                                    <span class="exercise-sets">${setsCount} séries</span>
                                    <span class="exercise-reps">${totalReps} reps</span>
                                    <span class="exercise-weight">${avgWeight}kg</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `).join('');
        }).join('');
}

// Calculer les statistiques de progression
function getProgressionStats(exerciseName) {
    const logs = state.progressLog[exerciseName];
    if (!logs || logs.length < 2) return null;

    const firstLog = logs[0];
    const lastLog = logs[logs.length - 1];
    
    const weightProgress = lastLog.weight - firstLog.weight;
    const percentProgress = ((lastLog.weight - firstLog.weight) / firstLog.weight * 100).toFixed(1);
    
    return {
        totalSessions: logs.length,
        startWeight: firstLog.weight,
        currentWeight: lastLog.weight,
        weightProgress,
        percentProgress,
        averageReps: Math.round(logs.reduce((sum, l) => sum + (l.achievedReps || 0), 0) / logs.length)
    };
}

// ==================== TRAINING WEEK SUMMARY (DASHBOARD) ====================

function renderTodaySession() {
    const card = document.getElementById('today-session-card');
    const content = document.getElementById('today-session-content');
    if (!card || !content) return;

    // Hide if no program configured
    if (!state.wizardResults || !state.wizardResults.selectedProgram || !trainingPrograms) {
        card.style.display = 'none';
        return;
    }

    const program = trainingPrograms[state.wizardResults.selectedProgram];
    if (!program) {
        card.style.display = 'none';
        return;
    }

    // Déterminer la prochaine séance
    const splits = program.splits[state.wizardResults.frequency];
    if (!splits || splits.length === 0) {
        card.style.display = 'none';
        return;
    }

    // Utiliser currentSplitIndex de trainingProgress
    const currentIndex = state.trainingProgress?.currentSplitIndex || 0;
    const splitName = splits[currentIndex];
    let exercises = program.exercises[splitName] || [];

    // Vérifier si un template existe pour cette séance (avec exercices remplacés)
    const templateKey = `${state.wizardResults.selectedProgram}-${currentIndex}`;
    const template = state.sessionTemplates?.[templateKey];
    
    if (template && template.exercises) {
        // Utiliser les exercices du template (avec swaps appliqués)
        exercises = template.exercises.map(templateEx => {
            // Trouver l'exercice original dans le programme
            const originalEx = exercises.find(ex => ex.name === templateEx.originalName);
            if (!originalEx) return null;
            
            // Utiliser le nom remplacé si disponible, sinon le nom original
            return {
                ...originalEx,
                name: templateEx.swappedName || templateEx.originalName,
                muscle: originalEx.muscle,
                sets: templateEx.sets || originalEx.sets,
                reps: templateEx.reps || originalEx.reps,
                type: originalEx.type
            };
        }).filter(Boolean); // Retirer les null
    }

    // Afficher la card
    card.style.display = 'block';

    // Fonction pour obtenir l'icône SVG selon le muscle
    const getMuscleIconSvg = (muscle) => {
        if (window.MuscleIcons) {
            const svgPath = window.MuscleIcons.getMuscleIcon(muscle);
            if (svgPath) {
                return `<img src="${svgPath}" alt="${muscle}" class="today-exercise-svg-icon">`;
            }
        }
        // Fallback emojis
        const icons = {
            'chest': '💪', 'back': '🦾', 'shoulders': '🏋️',
            'arms': '💪', 'biceps': '💪', 'triceps': '💪',
            'legs': '🦵', 'quads': '🦵', 'hamstrings': '🦵',
            'glutes': '🍑', 'calves': '🦵', 'abs': '🔥', 'core': '🔥'
        };
        return icons[muscle] || '💪';
    };

    // Rendre le contenu avec cards premium et icônes SVG
    const exercisesList = exercises.slice(0, 4).map(ex => {
        const icon = getMuscleIconSvg(ex.muscle);
        const type = ex.type || 'compound';
        const typeBadge = type === 'compound' ? 'Polyarticulaire' : 'Isolation';
        const badgeClass = type === 'compound' ? 'compound' : 'isolation';
        
        return `<div class="today-exercise-card">
            <div class="today-exercise-icon">${icon}</div>
            <div class="today-exercise-info">
                <span class="today-exercise-name">${ex.name}</span>
                <span class="today-exercise-sets">${ex.sets} × ${ex.reps}</span>
            </div>
            <span class="today-exercise-badge ${badgeClass}">${typeBadge}</span>
        </div>`;
    }).join('');

    const moreText = exercises.length > 4 ? `<div class="today-exercise-more">+${exercises.length - 4} autres exercices</div>` : '';

    content.innerHTML = `
        <div class="today-session-split-name">${splitName}</div>
        <div class="today-exercises-list">
            ${exercisesList}
            ${moreText}
        </div>
        <div class="session-buttons-group">
            <button class="btn-quick-start" onclick="quickStartSession(${currentIndex})" title="Démarrer immédiatement">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
            </button>
            <button class="btn-start-session" onclick="showSessionPreview(${currentIndex})">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                Commencer la séance
            </button>
        </div>
    `;
}

function renderTrainingWeekSummary() {
    const container = document.getElementById('training-week-summary');
    if (!container) return;

    // Hide if no program configured
    if (!state.wizardResults || !state.wizardResults.selectedProgram) {
        container.style.display = 'none';
        return;
    }
    container.style.display = 'block';

    // Get sessions from this week
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
    startOfWeek.setHours(0, 0, 0, 0);

    const weekSessions = (state.sessionHistory || []).filter(s => {
        if (s.deletedAt) return false;
        const sessionDate = new Date(s.date);
        return sessionDate >= startOfWeek;
    });

    // Get target sessions per week
    const targetSessions = state.wizardResults?.frequency || 4;
    const completedSessions = weekSessions.length;

    // Update progress bar
    document.getElementById('week-sessions-count').textContent = `${completedSessions}/${targetSessions} séances`;
    const progressPercent = Math.min((completedSessions / targetSessions) * 100, 100);
    document.getElementById('week-progress-fill').style.width = `${progressPercent}%`;

    // Update last session (exclure soft-deleted)
    const lastSession = (state.sessionHistory || []).find(s => !s.deletedAt);
    const emptyEl = document.getElementById('last-session-empty');
    const contentEl = document.getElementById('last-session-content');

    if (!lastSession) {
        emptyEl.style.display = 'block';
        contentEl.style.display = 'none';
        return;
    }

    emptyEl.style.display = 'none';
    contentEl.style.display = 'block';

    // Format date
    const sessionDate = new Date(lastSession.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    sessionDate.setHours(0, 0, 0, 0);

    let dateText;
    if (sessionDate.getTime() === today.getTime()) {
        dateText = "Aujourd'hui";
    } else if (sessionDate.getTime() === yesterday.getTime()) {
        dateText = "Hier";
    } else {
        dateText = sessionDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' });
    }

    document.getElementById('last-session-date').textContent = dateText;
    document.getElementById('last-session-title').textContent = lastSession.day || 'Séance';

    // Calculate stats
    const exercises = lastSession.exercises || [];
    const totalSets = exercises.reduce((sum, ex) => sum + (Array.isArray(ex.sets) ? ex.sets.length : (ex.sets || 0)), 0);
    const duration = lastSession.duration || 0;

    document.getElementById('last-session-exercises').textContent = `${exercises.length} exos`;
    document.getElementById('last-session-sets').textContent = `${totalSets} séries`;
    document.getElementById('last-session-duration').textContent = `${duration} min`;

    // Count PRs from that session (check if any exercise had a PR that day)
    const prsCount = countSessionPRs(lastSession);
    const prsEl = document.getElementById('last-session-prs');
    if (prsCount > 0) {
        prsEl.style.display = 'inline-flex';
        document.getElementById('last-session-prs-count').textContent = prsCount;
    } else {
        prsEl.style.display = 'none';
    }
}

function countSessionPRs(session) {
    if (!session || !session.exercises) return 0;
    let prCount = 0;
    const sessionDate = session.date;

    session.exercises.forEach(ex => {
        const exerciseName = ex.exercise || ex.name;
        const logs = state.progressLog[exerciseName];
        if (!logs) return;

        // Check if any PR was set on this date
        const prs = getExercisePRs(exerciseName);
        if (prs && prs.maxWeight.date === sessionDate) {
            prCount++;
        }
    });

    return prCount;
}

function openLastSessionDetail() {
    // Trouver la première session non-supprimée
    const lastSession = (state.sessionHistory || []).find(s => !s.deletedAt);
    if (lastSession) {
        const realIndex = state.sessionHistory.indexOf(lastSession);
        openSessionDetail(realIndex);
    }
}

// ==================== SESSIONS LIST (NEW) ====================

function updateSessionHistory() {
    const container = document.getElementById('session-history');
    if (!container) return;

    // Filtrer les sessions soft-deleted
    const activeSessions = state.sessionHistory.filter(s => !s.deletedAt);

    if (activeSessions.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📅</div>
                <div class="empty-state-title">Aucune séance enregistrée</div>
                <p>Vos séances apparaîtront ici après votre première session</p>
            </div>
        `;
        return;
    }

    // Render all sessions as clean cards
    container.innerHTML = `
        <div class="sessions-list-container">
            ${activeSessions.map((session, _filteredIdx) => {
                // Trouver l'index réel dans sessionHistory (pour deleteSession/openSessionDetail)
                const index = state.sessionHistory.indexOf(session);
                const sessionDate = new Date(session.date);
                const day = sessionDate.getDate();
                const month = sessionDate.toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase();
                
                const exercises = session.exercises || [];
                const totalSets = exercises.reduce((sum, ex) => 
                    sum + (Array.isArray(ex.sets) ? ex.sets.length : (ex.sets || 0)), 0
                );
                const duration = session.duration || 0;
                const prsCount = countSessionPRs(session);

                return `
                    <div class="session-history-item" data-session-index="${index}" onclick="openSessionDetail(${index})">
                        <div class="session-history-date">
                            <div class="session-history-day">${day}</div>
                            <div class="session-history-month">${month}</div>
                        </div>
                        <div class="session-history-info">
                            <div class="session-history-title">
                                ${session.day || 'Séance'}
                                ${prsCount > 0 ? `<span class="session-history-pr-badge">🏆 ${prsCount} PR${prsCount > 1 ? 's' : ''}</span>` : ''}
                            </div>
                            <div class="session-history-meta">
                                ${exercises.length} exos • ${totalSets} séries • ${duration} min
                            </div>
                        </div>
                        <span class="session-history-arrow">›</span>
                    </div>
                `;
            }).join('')}
        </div>
    `;

    // Attacher swipe-to-delete sur chaque session
    if (window.SwipeToDelete) {
        container.querySelectorAll('.session-history-item').forEach(item => {
            const idx = parseInt(item.dataset.sessionIndex);
            if (!isNaN(idx)) {
                new SwipeToDelete(item, {
                    onDelete: () => deleteSession(idx),
                    thresholdRatio: 0.35
                });
            }
        });
    }
}

// ==================== SESSION DETAIL VIEW ====================

let currentDetailSessionIndex = null;

function openSessionDetail(sessionIndex) {
    const session = state.sessionHistory[sessionIndex];
    if (!session) return;

    currentDetailSessionIndex = sessionIndex;

    // Create overlay if it doesn't exist
    let overlay = document.getElementById('session-detail-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'session-detail-overlay';
        overlay.className = 'session-detail-overlay';
        document.body.appendChild(overlay);
    }

    const sessionDate = new Date(session.date);
    const formattedDate = sessionDate.toLocaleDateString('fr-FR', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long' 
    });

    const exercises = session.exercises || [];
    const totalSets = exercises.reduce((sum, ex) => 
        sum + (Array.isArray(ex.sets) ? ex.sets.length : (ex.sets || 0)), 0
    );
    const duration = session.duration || 0;

    overlay.innerHTML = `
        <div class="session-detail-header">
            <button class="session-detail-back" onclick="closeSessionDetail()">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
            </button>
            <div class="session-detail-title">
                <h2>${session.day || 'Séance'}</h2>
                <span>${formattedDate}</span>
            </div>
            <button class="session-detail-edit-btn" id="session-detail-edit-btn" onclick="toggleSessionEditMode(${sessionIndex})">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
        </div>
        <div class="session-detail-content">
            <div class="session-detail-summary">
                <div class="session-summary-stat">
                    <div class="session-summary-value">${exercises.length}</div>
                    <div class="session-summary-label">Exercices</div>
                </div>
                <div class="session-summary-stat">
                    <div class="session-summary-value">${totalSets}</div>
                    <div class="session-summary-label">Séries</div>
                </div>
                <div class="session-summary-stat">
                    <div class="session-summary-value">${duration}</div>
                    <div class="session-summary-label">Minutes</div>
                </div>
            </div>
            <div class="session-detail-exercises" id="session-detail-exercises">
                ${renderSessionExercises(session)}
            </div>
            <div class="session-detail-actions">
                <button class="session-delete-btn" onclick="deleteSession(${sessionIndex})">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    Supprimer cette séance
                </button>
            </div>
        </div>
    `;

    overlay.style.display = 'flex';
    if (window.ModalManager) ModalManager.lock('session-detail-overlay');
}

function renderSessionExercises(session) {
    const exercises = session.exercises || [];
    const sessionDate = session.date;

    return exercises.map(ex => {
        const exerciseName = ex.exercise || ex.name || 'Exercice';
        const sets = Array.isArray(ex.sets) ? ex.sets : [];
        
        // Check if this exercise had a PR on this date
        const prs = getExercisePRs(exerciseName);
        const hadPR = prs && prs.maxWeight.date === sessionDate;

        // Find best set (highest tonnage)
        let bestSetIndex = -1;
        let bestTonnage = 0;
        sets.forEach((set, idx) => {
            const tonnage = (set.weight || 0) * (set.reps || 0);
            if (tonnage > bestTonnage) {
                bestTonnage = tonnage;
                bestSetIndex = idx;
            }
        });

        return `
            <div class="session-exercise-card">
                <div class="session-exercise-header">
                    <span class="session-exercise-name">${exerciseName}</span>
                    ${hadPR ? '<span class="session-exercise-pr">🏆 PR</span>' : ''}
                </div>
                <div class="session-exercise-sets">
                    ${sets.length > 0 ? sets.map((set, idx) => `
                        <div class="session-set-row">
                            <span class="session-set-num">S${idx + 1}</span>
                            <span class="session-set-value">${set.weight || 0}kg × ${set.reps || 0}</span>
                            ${idx === bestSetIndex ? '<span class="session-set-best">Meilleure</span>' : ''}
                        </div>
                    `).join('') : `
                        <div class="session-set-row">
                            <span class="session-set-value" style="color: var(--text-muted);">Pas de détail disponible</span>
                        </div>
                    `}
                </div>
            </div>
        `;
    }).join('');
}

function closeSessionDetail() {
    const overlay = document.getElementById('session-detail-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
    if (window.ModalManager) ModalManager.unlock('session-detail-overlay');
    currentDetailSessionIndex = null;
}

/**
 * Bascule le mode édition dans le détail de session.
 * En mode édition, chaque série devient un formulaire inline (poids + reps).
 */
function toggleSessionEditMode(sessionIndex) {
    const session = state.sessionHistory[sessionIndex];
    if (!session) return;

    const container = document.getElementById('session-detail-exercises');
    const editBtn = document.getElementById('session-detail-edit-btn');
    if (!container || !editBtn) return;

    const isEditing = container.classList.toggle('editing');

    if (isEditing) {
        // Passer en mode édition
        editBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>';
        container.innerHTML = renderSessionExercisesEditable(session);
    } else {
        // Sauvegarder les modifications
        const newExercises = collectEditedExercises(session);
        if (newExercises) {
            updateSession(sessionIndex, newExercises);
            showToast('Séance modifiée', 'success');
        }
        // Repasser en lecture
        editBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
        container.innerHTML = renderSessionExercises(session);
    }
}

/**
 * Render des exercices en mode éditable (inputs inline).
 */
function renderSessionExercisesEditable(session) {
    const exercises = session.exercises || [];

    return exercises.map((ex, exIdx) => {
        const exerciseName = ex.exercise || ex.name || 'Exercice';
        const sets = Array.isArray(ex.sets) ? ex.sets : [];

        return `
            <div class="session-exercise-card">
                <div class="session-exercise-header">
                    <span class="session-exercise-name">${exerciseName}</span>
                </div>
                <div class="session-exercise-sets">
                    ${sets.map((set, setIdx) => `
                        <div class="session-set-row session-set-editable" data-ex="${exIdx}" data-set="${setIdx}">
                            <span class="session-set-num">S${setIdx + 1}</span>
                            <input type="number" class="session-edit-input" data-field="weight" value="${set.weight || 0}" step="0.5" min="0">
                            <span class="session-edit-sep">kg ×</span>
                            <input type="number" class="session-edit-input" data-field="reps" value="${set.reps || 0}" min="0">
                            <span class="session-edit-sep">reps</span>
                            <button class="session-set-delete-btn" onclick="deleteSetFromSession(${exIdx}, ${setIdx})">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Collecte les valeurs éditées depuis les inputs inline.
 */
function collectEditedExercises(session) {
    const exercises = JSON.parse(JSON.stringify(session.exercises || []));
    const rows = document.querySelectorAll('.session-set-editable');

    // Collecter les sets supprimés
    const deletedSets = new Set();
    rows.forEach(row => {
        if (row.dataset.deleted === 'true') {
            deletedSets.add(`${row.dataset.ex}-${row.dataset.set}`);
        }
    });

    rows.forEach(row => {
        if (row.dataset.deleted === 'true') return; // Skip deleted
        const exIdx = parseInt(row.dataset.ex);
        const setIdx = parseInt(row.dataset.set);
        const weightInput = row.querySelector('[data-field="weight"]');
        const repsInput = row.querySelector('[data-field="reps"]');

        if (exercises[exIdx] && exercises[exIdx].sets && exercises[exIdx].sets[setIdx]) {
            exercises[exIdx].sets[setIdx].weight = parseFloat(weightInput?.value) || 0;
            exercises[exIdx].sets[setIdx].reps = parseInt(repsInput?.value) || 0;
        }
    });

    // Retirer les sets marqués comme supprimés (du dernier au premier pour ne pas décaler les index)
    const deletedArr = Array.from(deletedSets).map(k => {
        const [ex, set] = k.split('-').map(Number);
        return { ex, set };
    }).sort((a, b) => b.set - a.set || b.ex - a.ex);

    deletedArr.forEach(({ ex, set }) => {
        if (exercises[ex] && exercises[ex].sets) {
            exercises[ex].sets.splice(set, 1);
        }
    });

    // Retirer les exercices sans sets restants
    return exercises.filter(ex => ex.sets && ex.sets.length > 0);
}

/**
 * Supprime un set d'une séance en mode édition.
 */
function deleteSetFromSession(exIdx, setIdx) {
    const row = document.querySelector(`.session-set-editable[data-ex="${exIdx}"][data-set="${setIdx}"]`);
    if (row) {
        row.dataset.deleted = 'true';
    }
}

// ==================== SESSION CRUD OPERATIONS ====================

/**
 * Reconstruit les entrées progressLog pour une session donnée.
 * Utilisé après modification ou suppression de session pour maintenir la cohérence.
 */
function rebuildProgressLogForSession(session) {
    const sessionId = session.sessionId || session.id;
    if (!sessionId) return;

    (session.exercises || []).forEach(ex => {
        const name = ex.exercise;
        if (!state.progressLog[name]) state.progressLog[name] = [];

        // Retirer l'ancienne entrée pour cette session
        state.progressLog[name] = state.progressLog[name].filter(l => l.sessionId !== sessionId);

        // Reconstruire depuis les sets
        const sets = Array.isArray(ex.sets) ? ex.sets : [];
        if (sets.length === 0) return;

        const avgWeight = sets.reduce((s, set) => s + (set.weight || 0), 0) / sets.length;
        const totalReps = sets.reduce((s, set) => s + (set.reps || 0), 0);

        state.progressLog[name].push({
            date: session.date,
            sessionId: sessionId,
            sets: sets.length,
            weight: Math.round(avgWeight * 10) / 10,
            achievedReps: totalReps,
            achievedSets: sets.filter(s => s.completed !== false).length,
            setsDetail: sets
        });

        state.progressLog[name].sort((a, b) => new Date(a.date) - new Date(b.date));
    });
}

/**
 * Supprime une séance avec soft-delete, nettoyage progressLog, undo 5s, et sync Supabase.
 */
async function deleteSession(sessionIndex) {
    const session = state.sessionHistory[sessionIndex];
    if (!session) return;

    const confirmed = await showConfirmModal({
        title: 'Supprimer cette séance ?',
        message: `${session.day || 'Séance'} du ${new Date(session.date).toLocaleDateString('fr-FR')}`,
        icon: '🗑️',
        confirmLabel: 'Supprimer',
        cancelLabel: 'Annuler',
        confirmType: 'danger'
    });
    if (!confirmed) return;

    const sid = session.sessionId || session.id;

    // Snapshot pour undo
    const snapshot = {
        session: JSON.parse(JSON.stringify(session)),
        index: sessionIndex,
        progressEntries: {}
    };
    (session.exercises || []).forEach(ex => {
        const name = ex.exercise;
        snapshot.progressEntries[name] = (state.progressLog[name] || [])
            .filter(l => l.sessionId === sid);
    });

    // Soft delete + nettoyage progressLog
    session.deletedAt = new Date().toISOString();
    (session.exercises || []).forEach(ex => {
        const name = ex.exercise;
        if (state.progressLog[name]) {
            state.progressLog[name] = state.progressLog[name].filter(l => l.sessionId !== sid);
        }
    });

    saveState();
    updateSessionHistory();
    closeSessionDetail();

    // Undo 5s
    if (window.UndoManager) {
        UndoManager.push('delete-session', snapshot, (data) => {
            // Restaurer la session
            data.session.deletedAt = null;
            const idx = state.sessionHistory.findIndex(s => (s.sessionId || s.id) === (data.session.sessionId || data.session.id));
            if (idx !== -1) {
                state.sessionHistory[idx] = data.session;
            }
            // Restaurer les entrées progressLog
            Object.entries(data.progressEntries).forEach(([name, entries]) => {
                if (!state.progressLog[name]) state.progressLog[name] = [];
                state.progressLog[name].push(...entries);
                state.progressLog[name].sort((a, b) => new Date(a.date) - new Date(b.date));
            });
            saveState();
            updateSessionHistory();
        }, 'Séance supprimée');
    }

    // Collecter les noms d'exercice pour le fallback Supabase
    const exerciseNames = (session.exercises || []).map(ex => ex.exercise).filter(Boolean);

    // Hard delete après expiration undo (6s pour laisser le temps de l'undo 5s)
    setTimeout(() => {
        const still = state.sessionHistory.find(s => (s.sessionId || s.id) === sid);
        if (still && still.deletedAt) {
            state.sessionHistory = state.sessionHistory.filter(s => (s.sessionId || s.id) !== sid);
            saveState();
            // Sync Supabase — avec fallback exerciseNames + date
            if (typeof deleteWorkoutSessionFromSupabase === 'function') {
                deleteWorkoutSessionFromSupabase(sid);
            } else if (typeof addToSyncQueue === 'function') {
                addToSyncQueue('workout_session', 'delete', { sessionId: sid });
            }
            if (typeof deleteProgressLogForSession === 'function') {
                deleteProgressLogForSession(sid, session.date, exerciseNames);
            } else if (typeof addToSyncQueue === 'function') {
                addToSyncQueue('progress_log', 'delete', { sessionId: sid, sessionDate: session.date, exerciseNames });
            }
        }
    }, 6000);
}

/**
 * Met à jour une séance passée avec de nouvelles données d'exercices.
 * Recalcule le volume, reconstruit le progressLog, et queue la sync.
 */
function updateSession(sessionIndex, newExercises) {
    const session = state.sessionHistory[sessionIndex];
    if (!session) return;

    const snapshot = JSON.parse(JSON.stringify(session));

    session.exercises = newExercises;
    session.updatedAt = new Date().toISOString();

    // Recalculer totalVolume
    session.totalVolume = newExercises.reduce((sum, ex) =>
        sum + (ex.sets || []).reduce((s, set) => s + (set.weight || 0) * (set.reps || 0), 0), 0
    );

    // Reconstruire progressLog pour cette session
    rebuildProgressLogForSession(session);
    saveState();

    // Sync
    if (typeof addToSyncQueue === 'function') {
        addToSyncQueue('workout_session', 'upsert', session);
    }

    // Undo
    if (window.UndoManager) {
        UndoManager.push('edit-session', snapshot, (old) => {
            state.sessionHistory[sessionIndex] = old;
            rebuildProgressLogForSession(old);
            saveState();
            openSessionDetail(sessionIndex);
        }, 'Séance modifiée');
    }
}

// ==================== PROGRESS TOAST NOTIFICATION ====================

function showProgressToast(icon, message, duration = 3000) {
    // Retirer les toasts existants
    document.querySelectorAll('.progress-toast').forEach(t => t.remove());
    
    const toast = document.createElement('div');
    toast.className = 'progress-toast';
    toast.innerHTML = `<span class="toast-icon">${icon}</span><span>${message}</span>`;
    document.body.appendChild(toast);
    
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, duration);
}

// ==================== GRAPHIQUE VOLUME HEBDOMADAIRE ====================

let volumeChart = null;

function renderWeeklyVolumeChart() {
    const ctx = document.getElementById('volume-chart');
    if (!ctx) return;
    
    // Détruire le graphique existant
    if (volumeChart) {
        volumeChart.destroy();
        volumeChart = null;
    }
    
    // Calculer le volume par semaine (8 dernières semaines)
    const weeks = [];
    const volumes = [];
    
    for (let w = 7; w >= 0; w--) {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - (w * 7) - weekStart.getDay() + 1);
        weekStart.setHours(0, 0, 0, 0);
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        
        // Calculer volume de la semaine (exclure soft-deleted)
        let weekVolume = 0;
        (state.sessionHistory || []).filter(s => !s.deletedAt).forEach(session => {
            const sessionDate = new Date(session.date);
            if (sessionDate >= weekStart && sessionDate <= weekEnd) {
                session.exercises?.forEach(ex => {
                    // Fallback: essayer setsDetail puis sets
                    const setsData = ex.setsDetail || ex.sets || [];
                    setsData.forEach(set => {
                        if (set.completed) {
                            weekVolume += (set.weight || 0) * (set.reps || 0);
                        }
                    });
                });
            }
        });
        
        weeks.push(`S${8 - w}`);
        volumes.push(Math.round(weekVolume / 1000)); // En tonnes
    }
    
    // Vérifier s'il y a des données
    const hasData = volumes.some(v => v > 0);
    if (!hasData) {
        const canvas = ctx;
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = '#606070';
        context.font = '14px Outfit';
        context.textAlign = 'center';
        context.fillText('Aucune donnée d\'entraînement', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    volumeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: weeks,
            datasets: [{
                label: 'Volume (tonnes)',
                data: volumes,
                backgroundColor: 'rgba(0, 170, 255, 0.7)',
                borderRadius: 8,
                borderWidth: 0
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
                            return context.parsed.y.toFixed(1) + ' tonnes';
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#606070',
                        font: { family: 'Outfit' }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        color: '#00aaff',
                        font: { family: 'Space Mono' },
                        callback: function(value) {
                            return value + 't';
                        }
                    }
                }
            }
        }
    });
}

// ==================== STATS AVANCÉES ====================

/**
 * Graphique volume par groupe musculaire (doughnut)
 */
function renderMuscleVolumeChart() {
    const ctx = document.getElementById('muscle-volume-chart');
    if (!ctx) return;
    
    // Détruire le graphique existant
    if (muscleVolumeChart) {
        muscleVolumeChart.destroy();
        muscleVolumeChart = null;
    }
    
    // Calculer le volume par muscle depuis sessionHistory (exclure soft-deleted)
    const volumeByMuscle = {};
    (state.sessionHistory || []).filter(s => !s.deletedAt).forEach(session => {
        session.exercises?.forEach(ex => {
            // Trouver le muscle de l'exercice (fallback pour plusieurs formats)
            const exerciseName = ex.exercise || ex.name || ex.effectiveName || '';
            const exercise = defaultExercises.find(e => e.name === exerciseName);
            const muscle = exercise?.muscle || 'other';
            
            // Calculer le volume (poids × reps) - fallback setsDetail puis sets
            const setsData = ex.setsDetail || ex.sets || [];
            const volume = setsData.reduce((sum, set) => {
                return sum + (set.completed ? (set.weight || 0) * (set.reps || 0) : 0);
            }, 0);
            
            volumeByMuscle[muscle] = (volumeByMuscle[muscle] || 0) + volume;
        });
    });
    
    // Vérifier s'il y a des données
    if (Object.keys(volumeByMuscle).length === 0) {
        const canvas = ctx;
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = '#606070';
        context.font = '14px Outfit';
        context.textAlign = 'center';
        context.fillText('Aucune donnée d\'entraînement', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    // Couleurs pour les groupes musculaires
    const muscleColors = {
        'chest': '#ff6384',
        'back': '#36a2eb',
        'shoulders': '#ffce56',
        'biceps': '#4bc0c0',
        'triceps': '#9966ff',
        'quads': '#ff9f40',
        'hamstrings': '#c9cbcf',
        'glutes': '#ff6b9d',
        'abs': '#45b7d1',
        'calves': '#b8e994',
        'traps': '#feca57',
        'rear-delts': '#ffb8b8',
        'forearms': '#a29bfe'
    };
    
    const labels = Object.keys(volumeByMuscle).map(m => muscleGroups[m]?.name || m);
    const data = Object.values(volumeByMuscle).map(v => Math.round(v / 1000)); // En tonnes
    const colors = Object.keys(volumeByMuscle).map(m => muscleColors[m] || '#95a5a6');
    
    muscleVolumeChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: '#16161f'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#a0a0b0',
                        font: { family: 'Outfit', size: 11 },
                        padding: 10
                    }
                },
                tooltip: {
                    backgroundColor: '#16161f',
                    titleColor: '#ffffff',
                    bodyColor: '#a0a0b0',
                    borderColor: '#2a2a3a',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percent = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value}t (${percent}%)`;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Graphique fréquence d'entraînement par jour (bar)
 */
function renderFrequencyChart() {
    const ctx = document.getElementById('frequency-chart');
    if (!ctx) return;
    
    // Détruire le graphique existant
    if (frequencyChart) {
        frequencyChart.destroy();
        frequencyChart = null;
    }
    
    // Compter les séances par jour de la semaine (exclure soft-deleted)
    const dayCount = [0, 0, 0, 0, 0, 0, 0]; // Lun-Dim
    (state.sessionHistory || []).filter(s => !s.deletedAt).forEach(session => {
        const day = new Date(session.date).getDay();
        const adjustedDay = day === 0 ? 6 : day - 1; // Lun=0, Dim=6
        dayCount[adjustedDay]++;
    });
    
    // Vérifier s'il y a des données
    const hasData = dayCount.some(count => count > 0);
    if (!hasData) {
        const canvas = ctx;
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = '#606070';
        context.font = '14px Outfit';
        context.textAlign = 'center';
        context.fillText('Aucune séance enregistrée', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    frequencyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
            datasets: [{
                label: 'Nombre de séances',
                data: dayCount,
                backgroundColor: 'rgba(0, 170, 255, 0.7)',
                borderRadius: 8,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#16161f',
                    titleColor: '#ffffff',
                    bodyColor: '#a0a0b0',
                    borderColor: '#2a2a3a',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#606070',
                        font: { family: 'Outfit' }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        color: '#a0a0b0',
                        font: { family: 'Space Mono' },
                        stepSize: 1
                    }
                }
            }
        }
    });
}

/**
 * Graphique comparaison mois/mois (line)
 */
function renderMonthlyComparisonChart() {
    const ctx = document.getElementById('monthly-comparison-chart');
    if (!ctx) return;
    
    // Détruire le graphique existant
    if (monthlyComparisonChart) {
        monthlyComparisonChart.destroy();
        monthlyComparisonChart = null;
    }
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Calculer le volume par semaine pour les 2 derniers mois
    const currentMonthData = [];
    const previousMonthData = [];
    
    // 4 semaines par mois
    for (let week = 0; week < 4; week++) {
        currentMonthData.push(0);
        previousMonthData.push(0);
    }
    
    (state.sessionHistory || []).filter(s => !s.deletedAt).forEach(session => {
        const sessionDate = new Date(session.date);
        const sessionMonth = sessionDate.getMonth();
        const sessionYear = sessionDate.getFullYear();

        // Calculer le volume de la séance
        let sessionVolume = 0;
        session.exercises?.forEach(ex => {
            // Fallback: essayer setsDetail puis sets
            const setsData = ex.setsDetail || ex.sets || [];
            const volume = setsData.reduce((sum, set) => {
                return sum + (set.completed ? (set.weight || 0) * (set.reps || 0) : 0);
            }, 0);
            sessionVolume += volume;
        });
        
        // Déterminer la semaine du mois (0-3)
        const weekOfMonth = Math.floor((sessionDate.getDate() - 1) / 7);
        
        // Mois actuel
        if (sessionYear === currentYear && sessionMonth === currentMonth && weekOfMonth < 4) {
            currentMonthData[weekOfMonth] += sessionVolume;
        }
        // Mois précédent
        else {
            const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
            const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
            if (sessionYear === prevYear && sessionMonth === prevMonth && weekOfMonth < 4) {
                previousMonthData[weekOfMonth] += sessionVolume;
            }
        }
    });
    
    // Convertir en tonnes
    const currentMonthTonnes = currentMonthData.map(v => Math.round(v / 1000));
    const previousMonthTonnes = previousMonthData.map(v => Math.round(v / 1000));
    
    // Vérifier s'il y a des données
    const hasData = currentMonthTonnes.some(v => v > 0) || previousMonthTonnes.some(v => v > 0);
    if (!hasData) {
        const canvas = ctx;
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = '#606070';
        context.font = '14px Outfit';
        context.textAlign = 'center';
        context.fillText('Aucune donnée pour comparer', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
    const currentMonthName = monthNames[currentMonth];
    const previousMonthName = monthNames[currentMonth === 0 ? 11 : currentMonth - 1];
    
    monthlyComparisonChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['S1', 'S2', 'S3', 'S4'],
            datasets: [
                {
                    label: previousMonthName,
                    data: previousMonthTonnes,
                    borderColor: '#606070',
                    backgroundColor: 'rgba(96, 96, 112, 0.1)',
                    tension: 0.3,
                    fill: false,
                    borderDash: [5, 5]
                },
                {
                    label: currentMonthName,
                    data: currentMonthTonnes,
                    borderColor: '#00ff88',
                    backgroundColor: 'rgba(0, 255, 136, 0.1)',
                    tension: 0.3,
                    fill: true
                }
            ]
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
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#a0a0b0',
                        font: { family: 'Outfit' },
                        usePointStyle: true
                    }
                },
                tooltip: {
                    backgroundColor: '#16161f',
                    titleColor: '#ffffff',
                    bodyColor: '#a0a0b0',
                    borderColor: '#2a2a3a',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.parsed.y}t`;
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
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        color: '#a0a0b0',
                        font: { family: 'Space Mono' },
                        callback: function(value) {
                            return value + 't';
                        }
                    }
                }
            }
        }
    });
}

// ==================== RECOMMANDATIONS COACH ====================

/**
 * Génère et affiche les recommandations du coach IA
 */
function renderCoachRecommendations() {
    const containers = [
        document.getElementById('coach-recommendations'),
        document.getElementById('coach-recommendations-dashboard')
    ];

    const recommendations = generateCoachRecommendations();
    
    const emptyStateHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">🤖</div>
            <div class="empty-state-title">Pas encore de recommandations</div>
            <p>Continue à t'entraîner, le coach analysera tes performances</p>
        </div>
    `;
    
    if (recommendations.length === 0) {
        containers.forEach(container => {
            if (container) container.innerHTML = emptyStateHTML;
        });
        return;
    }

    let html = '<div class="coach-recommendations-grid">';
    
    recommendations.forEach((rec, index) => {
        const iconMap = {
            'increase_weight': '📈',
            'increase_reps': '💪',
            'deload': '⚠️',
            'maintain': '✅',
            'plateau': '🔄'
        };
        
        const colorMap = {
            'increase_weight': 'success',
            'increase_reps': 'info',
            'deload': 'warning',
            'maintain': 'neutral',
            'plateau': 'warning'
        };
        
        const icon = iconMap[rec.type] || '💡';
        const color = colorMap[rec.type] || 'neutral';
        
        html += `
            <div class="coach-card coach-${color}" style="animation-delay: ${index * 0.1}s">
                <div class="coach-card-header">
                    <span class="coach-icon">${icon}</span>
                    <span class="coach-exercise">${rec.exercise}</span>
                </div>
                <div class="coach-message">${rec.message}</div>
                ${rec.reason ? `<div class="coach-reason">${rec.reason}</div>` : ''}
            </div>
        `;
    });
    
    html += '</div>';
    
    // Remplir tous les conteneurs
    containers.forEach(container => {
        if (container) container.innerHTML = html;
    });
}

/**
 * Affiche un toast avec les recommandations du coach
 */
function showCoachRecommendationsToast() {
    const recommendations = generateCoachRecommendations();
    
    if (recommendations.length === 0) return;
    
    // Prendre les 3 premières recommandations
    const topRecs = recommendations.slice(0, 3);
    
    let message = '🤖 <strong>Recommandations du Coach :</strong><br>';
    topRecs.forEach(rec => {
        const icon = rec.type === 'increase_weight' ? '📈' : 
                     rec.type === 'increase_reps' ? '💪' : 
                     rec.type === 'plateau' ? '⚠️' : '✅';
        message += `<br>${icon} <strong>${rec.exercise}</strong>: ${rec.message}`;
    });
    
    if (recommendations.length > 3) {
        message += `<br><br>Et ${recommendations.length - 3} autre(s) dans l'onglet Progression`;
    }
    
    // Créer un toast custom avec plus de durée
    if (typeof showToast === 'function') {
        showToast(message, 'info', 8000);
    }
}

/**
 * Génère les recommandations basées sur l'historique
 */
function generateCoachRecommendations() {
    const recommendations = [];
    
    if (!state.progressLog) return recommendations;
    
    // Parcourir tous les exercices
    Object.keys(state.progressLog).forEach(exerciseName => {
        const logs = state.progressLog[exerciseName];
        if (logs.length < 2) return;
        
        const lastLog = logs[logs.length - 1];
        const recent = logs.slice(-3); // 3 dernières séances
        
        // Utiliser getDoubleProgressionRecommendation si disponible
        if (typeof getDoubleProgressionRecommendation === 'function') {
            const dpRec = getDoubleProgressionRecommendation(exerciseName);
            if (dpRec) {
                recommendations.push({
                    exercise: exerciseName,
                    type: dpRec.phase === 'weight' ? 'increase_weight' : 'increase_reps',
                    message: dpRec.message,
                    reason: dpRec.phase === 'weight' ? 
                        'Tu as atteint la cible haute de reps' : 
                        'Continue à augmenter les reps'
                });
                return;
            }
        }
        
        // Fallback: analyse simple
        const avgReps = lastLog.achievedReps / lastLog.achievedSets;
        const targetReps = 10; // Valeur par défaut
        
        // Détection de plateau (même poids depuis 3 séances)
        if (recent.length >= 3) {
            const allSameWeight = recent.every(l => l.weight === lastLog.weight);
            const noRepsProgress = recent.every(l => (l.achievedReps / l.achievedSets) < targetReps);
            
            if (allSameWeight && noRepsProgress) {
                recommendations.push({
                    exercise: exerciseName,
                    type: 'plateau',
                    message: `Plateau détecté. Essaie un deload à ${Math.round(lastLog.weight * 0.85 * 2) / 2}kg`,
                    reason: 'Aucune progression depuis 3 séances'
                });
                return;
            }
        }
        
        // Progression normale
        if (avgReps >= targetReps + 2) {
            const increment = lastLog.weight >= 40 ? 2.5 : 1.25;
            recommendations.push({
                exercise: exerciseName,
                type: 'increase_weight',
                message: `Passe à ${lastLog.weight + increment}kg`,
                reason: 'Tu dépasses régulièrement la cible'
            });
        } else if (avgReps < targetReps - 2) {
            recommendations.push({
                exercise: exerciseName,
                type: 'increase_reps',
                message: `Vise ${Math.ceil(avgReps) + 1} reps par série`,
                reason: 'Concentre-toi sur les reps avant d\'augmenter'
            });
        }
    });
    
    // Limiter à 6 recommandations max
    return recommendations.slice(0, 6);
}

// ==================== INIT PROGRESSION SECTION ====================

function initProgressSection() {
    updateProgressHero();
    renderProgressFeed();
    renderPRsSection();
    renderCoachRecommendations();
    populateProgressExerciseSelect();
    renderWeeklyVolumeChart();
}

// ==================== EXPORTS GLOBAUX ====================
window.switchProgressTab = switchProgressTab;
window.filterProgressChart = filterProgressChart;
window.openSessionDetail = openSessionDetail;
window.closeSessionDetail = closeSessionDetail;
window.openLastSessionDetail = openLastSessionDetail;
window.updateProgressHero = updateProgressHero;
window.renderProgressFeed = renderProgressFeed;
window.renderPRsSection = renderPRsSection;
window.renderCoachRecommendations = renderCoachRecommendations;
window.showCoachRecommendationsToast = showCoachRecommendationsToast;
window.updateSessionHistory = updateSessionHistory;
window.populateProgressExerciseSelect = populateProgressExerciseSelect;
window.updateProgressChart = updateProgressChart;
window.initProgressSection = initProgressSection;
window.renderWeeklyVolumeChart = renderWeeklyVolumeChart;
window.renderMuscleVolumeChart = renderMuscleVolumeChart;
window.renderFrequencyChart = renderFrequencyChart;
window.renderMonthlyComparisonChart = renderMonthlyComparisonChart;
window.checkForNewPR = checkForNewPR;
window.getAllPRs = getAllPRs;
window.rebuildProgressLogForSession = rebuildProgressLogForSession;
window.deleteSession = deleteSession;
window.updateSession = updateSession;
window.toggleSessionEditMode = toggleSessionEditMode;
window.deleteSetFromSession = deleteSetFromSession;

console.log('✅ progress.js: Fonctions exportées au scope global');
