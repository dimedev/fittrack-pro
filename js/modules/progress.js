// ==================== PROGRESS MODULE ====================

let progressChart = null;

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
    }
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
            if (log.weight > 0 && avgRepsPerSet > 0 && avgRepsPerSet <= 12) {
                const estimated1RM = log.weight * (1 + avgRepsPerSet / 30);
                if (estimated1RM > max1RM) {
                    max1RM = estimated1RM;
                    max1RMDate = log.date;
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
 * Affiche la section des PRs dans l'interface
 */
function renderPRsSection() {
    const container = document.getElementById('prs-container');
    if (!container) return;

    const allPRs = getAllPRs();
    const exerciseNames = Object.keys(allPRs);

    if (exerciseNames.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="padding: 30px;">
                <div class="empty-state-icon">🏆</div>
                <div class="empty-state-title">Pas encore de records</div>
                <p>Loguez vos séances pour voir vos PRs apparaître ici</p>
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

    sortedExercises.forEach(exerciseName => {
        const prs = allPRs[exerciseName];
        const maxWeightDate = prs.maxWeight.date ? new Date(prs.maxWeight.date) : null;
        const maxWeightDateStr = maxWeightDate ? maxWeightDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) : '-';
        
        // Check if this is a recent PR
        const isRecentPR = maxWeightDate && maxWeightDate >= sevenDaysAgo;
        const badgeHTML = isRecentPR && window.PremiumUI 
            ? window.PremiumUI.createBadge('NEW', 'brand', { animated: true }) 
            : '';

        html += `
            <div class="pr-card ${isRecentPR ? 'pr-card--recent' : ''}">
                <div class="pr-card-header">
                    <span class="pr-exercise-name">${exerciseName}</span>
                    ${badgeHTML}
                </div>
                <div class="pr-card-body">
                    <div class="pr-stat">
                        <div class="pr-stat-value">${prs.maxWeight.value}<span class="pr-stat-unit">kg</span></div>
                        <div class="pr-stat-label">Max Poids</div>
                        <div class="pr-stat-date">${maxWeightDateStr}</div>
                    </div>
                    <div class="pr-stat">
                        <div class="pr-stat-value">${prs.estimated1RM.value}<span class="pr-stat-unit">kg</span></div>
                        <div class="pr-stat-label">1RM Estimé</div>
                    </div>
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
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

    const logs = state.progressLog[exercise];
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

    // Update last session
    const lastSession = state.sessionHistory?.[0];
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
    const lastSession = state.sessionHistory?.[0];
    if (lastSession) {
        openSessionDetail(0);
    }
}

// ==================== SESSIONS LIST (NEW) ====================

function updateSessionHistory() {
    const container = document.getElementById('session-history');
    if (!container) return;

    if (!state.sessionHistory || state.sessionHistory.length === 0) {
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
            ${state.sessionHistory.map((session, index) => {
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
                    <div class="session-history-item" onclick="openSessionDetail(${index})">
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
            <div class="session-detail-exercises">
                ${renderSessionExercises(session)}
            </div>
        </div>
    `;

    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
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
    document.body.style.overflow = '';
    currentDetailSessionIndex = null;
}
