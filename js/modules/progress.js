// ==================== PROGRESS MODULE ====================

let progressChart = null;

// Variables pour les graphiques stats avancés
let muscleVolumeChart = null;
let frequencyChart = null;
let monthlyComparisonChart = null;

// ==================== HELPER FUNCTIONS ====================

/**
 * Cherche les logs dans progressLog avec fallback : nom exact → nom de base (sans variante)
 * Ex: "Tirage Verticale Poulie Basse - Prise Large" → fallback vers "Tirage Verticale Poulie Basse"
 * @param {string} exerciseName - Nom de l'exercice (peut être une variante)
 * @param {string|undefined} gymId - (optionnel) ID de salle à filtrer. Si fourni, retourne
 *                                   uniquement les entrées taguées à cette salle.
 *                                   Si `undefined` (défaut), retourne tout l'historique (compat).
 * @returns {Array} - Logs trouvés (peut être vide)
 */
function findProgressLogs(exerciseName, gymId) {
    if (!state.progressLog) return [];

    let logs = null;

    // 1. Nom exact
    logs = state.progressLog[exerciseName];

    // 2. Nom de base (enlever le suffixe " - variante")
    const dashIdx = exerciseName.lastIndexOf(' - ');
    if ((!logs || logs.length === 0) && dashIdx > 0) {
        const baseName = exerciseName.substring(0, dashIdx);
        logs = state.progressLog[baseName];
    }

    // 3. Case-insensitive (nom exact)
    if (!logs || logs.length === 0) {
        const normalizedName = exerciseName.toLowerCase().trim();
        for (const [logName, logData] of Object.entries(state.progressLog)) {
            if (logName.toLowerCase().trim() === normalizedName) {
                logs = logData;
                break;
            }
        }
    }

    // 4. Nom de base case-insensitive
    if ((!logs || logs.length === 0) && dashIdx > 0) {
        const baseName = exerciseName.substring(0, dashIdx).toLowerCase().trim();
        for (const [logName, logData] of Object.entries(state.progressLog)) {
            if (logName.toLowerCase().trim() === baseName) {
                logs = logData;
                break;
            }
        }
    }

    if (!logs || logs.length === 0) return [];

    // Filtrage optionnel par salle (si gymId fourni — même null est une valeur explicite)
    if (arguments.length >= 2) {
        return logs.filter(l => (l.gymId ?? null) === (gymId ?? null));
    }
    return logs;
}

window.findProgressLogs = findProgressLogs;

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
        // Utilise getEffectiveWeight pour les exercices au poids de corps
        (session.exercises || []).forEach(ex => {
            const setsData = ex.setsDetail || ex.sets || [];
            if (Array.isArray(setsData)) {
                setsData.forEach(set => {
                    if (set.completed !== false) {
                        const rawWeight = set.weight || 0;
                        const effectiveWeight = (typeof getEffectiveWeight === 'function')
                            ? getEffectiveWeight(ex.exercise || ex.name, rawWeight)
                            : rawWeight;
                        sessionVolume += effectiveWeight * (set.reps || 0);
                    }
                });
            } else {
                // Format ancien: sets est un nombre
                const rawWeight = ex.weight || 0;
                const effectiveWeight = (typeof getEffectiveWeight === 'function')
                    ? getEffectiveWeight(ex.exercise || ex.name, rawWeight)
                    : rawWeight;
                sessionVolume += effectiveWeight * (ex.achievedReps || 0);
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

    // Si on est dans les 7 premiers jours du mois et aucune session ce mois,
    // ne pas afficher -100% (pas encore assez de données)
    const dayOfMonth = new Date().getDate();
    if (dayOfMonth <= 7 && currentMonthVolume === 0) return null;

    // Calculer la progression
    const progression = ((currentMonthVolume - previousMonthVolume) / previousMonthVolume) * 100;
    return Math.round(progression);
}

// ==================== TAB SWITCHING ====================

function switchProgressTab(tabName) {
    // Mettre à jour le hash pour deep linking (sous-route progress)
    if (typeof updateHash === 'function') {
        updateHash('progression', tabName);
    }

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
    } else if (tabName === 'cardio') {
        renderCardioAnalytics();
    }
}

// ==================== PROGRESS HERO & FEED ====================

let currentChartPeriod = 'month';

function updateProgressHero() {
    // PRs : fenêtre glissante 30 jours (évite le "0 PRs" le 1er du mois)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    let prsRecent = 0;

    if (state.progressLog) {
        Object.keys(state.progressLog).forEach(exercise => {
            const logs = state.progressLog[exercise];
            const recentLogs = logs.filter(log => new Date(log.date) >= thirtyDaysAgo);
            prsRecent += recentLogs.length;
        });
    }

    const prsEl = document.getElementById('progress-prs-month');
    if (prsEl) prsEl.textContent = prsRecent;
    
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

    // PRs récents (7 derniers jours) — seulement les VRAIS PRs détectés
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    if (state.progressLog && typeof getAllPRs === 'function') {
        try {
            const allPRs = getAllPRs();
            Object.entries(allPRs).forEach(([exercise, prData]) => {
                // Vérifier le PR de poids max
                if (prData.maxWeight && prData.maxWeight.value > 0 && prData.maxWeight.date) {
                    if (new Date(prData.maxWeight.date) >= weekAgo) {
                        feed.push({
                            type: 'pr',
                            icon: '🏆',
                            title: 'Nouveau PR!',
                            text: `${exercise}: ${prData.maxWeight.value}kg`,
                            date: prData.maxWeight.date
                        });
                    }
                }
                // Vérifier le PR de 1RM estimé
                if (prData.estimated1RM && prData.estimated1RM.value > 0 && prData.estimated1RM.date) {
                    if (new Date(prData.estimated1RM.date) >= weekAgo && prData.estimated1RM.date !== prData.maxWeight?.date) {
                        feed.push({
                            type: 'pr',
                            icon: '💪',
                            title: 'PR 1RM estimé!',
                            text: `${exercise}: ${prData.estimated1RM.value}kg (1RM)`,
                            date: prData.estimated1RM.date
                        });
                    }
                }
            });
        } catch (e) {
            console.warn('Erreur génération PRs feed:', e);
        }
    }

    // Séances récentes (exclure les soft-deleted)
    if (state.sessionHistory) {
        state.sessionHistory.filter(s => !s.deletedAt).slice(0, 5).forEach(s => {
            const sessionLabel = s.day || s.sessionName || 'Séance libre';
            const exerciseCount = s.exercises?.length || 0;
            feed.push({
                type: 'session',
                icon: '✅',
                title: 'Séance terminée',
                text: `${sessionLabel} — ${exerciseCount} exo · ${s.duration || 0} min`,
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
                date: new Date().toLocaleDateString('en-CA')
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
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="empty-state-icon" aria-hidden="true" style="opacity:.3"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                <div class="empty-state-title">Aucune activité récente</div>
                <p style="color:var(--text-secondary);margin-top:6px">Lance ta première séance pour voir ton historique ici</p>
                <button class="btn btn-primary btn-sm" style="margin-top:12px" onclick="navigateToSection('training')">Commencer</button>
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
    const logs = findProgressLogs(exerciseName);
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
                <div class="empty-state-icon" style="font-size:2.5rem">🏆</div>
                <div class="empty-state-title">Aucun record personnel</div>
                <p style="color:var(--text-secondary)">Chaque série validée te rapproche de ton premier PR</p>
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

// updateSessionHistory — ancienne version supprimée, voir la version avec pagination + virtual list ci-dessous

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

    // Priorité : utiliser le prsCount stocké dans la session (fiable, capturé au moment de la sauvegarde)
    if (typeof session.prsCount === 'number' && session.prsCount >= 0) {
        return session.prsCount;
    }

    // Fallback pour les anciennes sessions sans prsCount : recalculer depuis le progressLog
    let prCount = 0;
    const sessionDate = session.date;

    session.exercises.forEach(ex => {
        const exerciseName = ex.exercise || ex.name;
        const logs = findProgressLogs(exerciseName);
        if (!logs || logs.length === 0) return;

        const prs = getExercisePRs(exerciseName);
        if (!prs) return;

        // Vérifier TOUS les types de PRs (poids, 1RM, volume, reps à un poids)
        let hasPR = (prs.maxWeight.date === sessionDate && prs.maxWeight.value > 0)
            || (prs.estimated1RM && prs.estimated1RM.date === sessionDate && prs.estimated1RM.value > 0)
            || (prs.maxVolume && prs.maxVolume.date === sessionDate && prs.maxVolume.value > 0);

        // Vérifier aussi les PRs de reps à un poids donné
        if (!hasPR && prs.maxRepsAtWeight) {
            for (const weightKey in prs.maxRepsAtWeight) {
                if (prs.maxRepsAtWeight[weightKey].date === sessionDate) {
                    hasPR = true;
                    break;
                }
            }
        }

        if (hasPR) prCount++;
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

const SESSION_ROW_HEIGHT = 64;
const VIRTUAL_LIST_SESSIONS_THRESHOLD = 50;

function renderSessionItemHtml(session, index) {
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
}

function updateSessionHistory() {
    const container = document.getElementById('session-history');
    if (!container) return;

    const activeSessions = state.sessionHistory.filter(s => !s.deletedAt);

    if (activeSessions.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon" style="font-size:2.5rem">💪</div>
                <div class="empty-state-title">Prêt à soulever ?</div>
                <p style="color:var(--text-secondary);margin-top:6px">Tes séances apparaîtront ici. Chaque entraînement compte.</p>
                <button class="btn btn-primary btn-sm" style="margin-top:12px" onclick="navigateToSection('training')">Démarrer une séance</button>
            </div>
        `;
        return;
    }

    if (activeSessions.length > VIRTUAL_LIST_SESSIONS_THRESHOLD) {
        renderVirtualSessionList(container, activeSessions);
        return;
    }

    const PAGE_SIZE = 20;
    let shownCount = parseInt(container.dataset.shownCount || '0') || PAGE_SIZE;
    shownCount = Math.min(shownCount, activeSessions.length);

    const visible = activeSessions.slice(0, shownCount);
    const hasMore = activeSessions.length > shownCount;

    container.dataset.shownCount = shownCount;
    container.innerHTML = `
        <div class="sessions-list-container">
            ${visible.map((s, i) => renderSessionItemHtml(s, state.sessionHistory.indexOf(s))).join('')}
        </div>
        ${hasMore ? `
            <button class="load-more-btn" onclick="loadMoreSessions()">
                Charger plus (${activeSessions.length - shownCount} restantes)
            </button>
        ` : ''}
    `;

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

function renderVirtualSessionList(container, activeSessions) {
    const totalHeight = activeSessions.length * SESSION_ROW_HEIGHT;
    const viewportHeight = Math.min(400, totalHeight);
    let lastStart = -1;
    let lastEnd = -1;

    container.innerHTML = `
        <div class="sessions-list-container virtual-list-scroll" data-virtual-total="${activeSessions.length}" style="max-height:${viewportHeight}px; overflow-y: auto;">
            <div class="virtual-list-spacer" style="height:${totalHeight}px; position:relative;">
                <div class="virtual-list-viewport" style="position:absolute; top:0; left:0; right:0; height:${totalHeight}px; pointer-events:none;"></div>
            </div>
        </div>
    `;

    const scrollEl = container.querySelector('.virtual-list-scroll');
    const viewportEl = container.querySelector('.virtual-list-viewport');

    function updateVisible() {
        const scrollTop = scrollEl.scrollTop;
        const start = Math.max(0, Math.floor(scrollTop / SESSION_ROW_HEIGHT) - 2);
        const visibleCount = Math.ceil(viewportHeight / SESSION_ROW_HEIGHT) + 4;
        const end = Math.min(activeSessions.length, start + visibleCount);
        if (start === lastStart && end === lastEnd) return;
        lastStart = start;
        lastEnd = end;
        const slice = activeSessions.slice(start, end);
        viewportEl.innerHTML = slice.map((s, i) => {
            const globalIndex = state.sessionHistory.indexOf(s);
            const rowTop = (start + i) * SESSION_ROW_HEIGHT;
            return `<div class="virtual-list-row" style="position:absolute;top:${rowTop}px;left:0;right:0;height:${SESSION_ROW_HEIGHT - 1}px;pointer-events:auto;box-sizing:border-box;" data-session-index="${globalIndex}">${renderSessionItemHtml(s, globalIndex)}</div>`;
        }).join('');
        viewportEl.querySelectorAll('.virtual-list-row').forEach(el => {
            const idx = parseInt(el.dataset.sessionIndex);
            if (!isNaN(idx) && window.SwipeToDelete) {
                new SwipeToDelete(el, { onDelete: () => deleteSession(idx), thresholdRatio: 0.35 });
            }
        });
    }

    scrollEl.addEventListener('scroll', updateVisible, { passive: true });
    updateVisible();
}

function loadMoreSessions() {
    const container = document.getElementById('session-history');
    if (!container) return;
    const PAGE_SIZE = 20;
    const current = parseInt(container.dataset.shownCount || '20');
    container.dataset.shownCount = current + PAGE_SIZE;
    updateSessionHistory();
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

// V8-D-C — SVG icon dictionary (consumes new schema icon field)
const COACH_RECO_ICONS = {
    bot:      `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="opacity:.4"><rect x="3" y="11" width="18" height="10" rx="2" ry="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg>`,
    up:       `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>`,
    down:     `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/></svg>`,
    reps:     `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m14 5 7 7-7 7"/><path d="M21 12H3"/></svg>`,
    plateau:  `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12h4l3-9 4 18 3-9h4"/></svg>`,
    maintain: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`
};

// V8-D-C — Priority tier styling (1=critique brand-red → 5=info muted)
const PRIORITY_TIERS = {
    1: { label: 'P1', cls: 'p1', accent: '#ff2d2d' },
    2: { label: 'P2', cls: 'p2', accent: '#ff6a3d' },
    3: { label: 'P3', cls: 'p3', accent: '#ffae3d' },
    4: { label: 'P4', cls: 'p4', accent: '#7dd3fc' },
    5: { label: 'P5', cls: 'p5', accent: '#a3a3a3' }
};

// V8-D-C — Tone mapping by reco type (drives chip color, dot, etc.)
const RECO_TONE = {
    plateau_real:   'alert',
    plateau_simple: 'alert',
    volume_high:    'alert',
    rpe_reduce:     'alert',
    weight_down:    'warn',
    effort_low:     'warn',
    weight_up:      'positive',
    rep_up:         'positive',
    volume_low:     'info',
    maintain:       'neutral'
};

/**
 * V8-D-C — Génère et affiche les recommandations du coach (Pit Lane refined).
 *
 * Card layout :
 *   ┌─────────────────────────────────────────────────┐
 *   │ ▌ P1 · ALERT      DEVELOPPÉ COUCHÉ              │  ← top row : priority + exercise
 *   │ ▌                                                │
 *   │ ▌  [icon]   ↓ -2.5kg                             │  ← action chip BIG
 *   │ ▌           Passe à 80kg × 8                     │     (subtle subtitle)
 *   │ ▌                                                │
 *   │ ▌  EVIDENCE · RPE 9 SUR 3 SESSIONS               │  ← DM Mono kicker
 *   └─────────────────────────────────────────────────┘
 *      ↑ priority bar (color-tier, 3px)
 */
function renderCoachRecommendations() {
    const containers = [
        document.getElementById('coach-recommendations'),
        document.getElementById('coach-recommendations-dashboard')
    ];

    const recommendations = generateCoachRecommendations();

    const emptyStateHTML = `
        <div class="coach-empty-v2">
            <div class="coach-empty-icon">${COACH_RECO_ICONS.bot}</div>
            <div class="coach-empty-title">Le coach analyse</div>
            <p class="coach-empty-msg">Après 3 séances par exercice, des recommandations actionnables apparaîtront ici.</p>
        </div>
    `;

    if (!recommendations || recommendations.length === 0) {
        containers.forEach(container => {
            if (container) container.innerHTML = emptyStateHTML;
        });
        return;
    }

    let html = '<div class="coach-recos-v2">';

    recommendations.forEach((rec, index) => {
        const tier = PRIORITY_TIERS[rec.priority] || PRIORITY_TIERS[5];
        const tone = RECO_TONE[rec.type] || 'neutral';
        const icon = COACH_RECO_ICONS[rec.icon] || COACH_RECO_ICONS.maintain;

        // Confidence dots : 3 segments, lit = confidence level
        const confLevel = rec.confidence === 'high' ? 3 : rec.confidence === 'medium' ? 2 : 1;
        const confDots = [1, 2, 3].map(i =>
            `<span class="coach-conf-dot${i <= confLevel ? ' lit' : ''}"></span>`
        ).join('');

        const exerciseEsc  = _escapeText(rec.exercise || '');
        const actionEsc    = _escapeText(rec.action || '');
        const detailEsc    = _escapeText(rec.actionDetail || '');
        const evidenceEsc  = _escapeText(rec.evidence || '');

        html += `
            <article class="coach-reco-card tone-${tone} prio-${tier.cls}" style="animation-delay: ${Math.min(index, 5) * 60}ms">
                <span class="coach-reco-bar" aria-hidden="true"></span>
                <header class="coach-reco-head">
                    <div class="coach-reco-prio">
                        <span class="coach-reco-prio-badge">${tier.label}</span>
                        <span class="coach-reco-prio-dot" aria-hidden="true"></span>
                        <span class="coach-reco-prio-label">${_priorityLabel(rec.priority)}</span>
                    </div>
                    <span class="coach-reco-exercise" title="${exerciseEsc}">${exerciseEsc}</span>
                </header>
                <div class="coach-reco-body">
                    <div class="coach-reco-action-wrap">
                        <span class="coach-reco-icon" aria-hidden="true">${icon}</span>
                        <div class="coach-reco-action-text">
                            <span class="coach-reco-action">${actionEsc}</span>
                            ${detailEsc ? `<span class="coach-reco-detail">${detailEsc}</span>` : ''}
                        </div>
                    </div>
                </div>
                ${evidenceEsc ? `
                    <footer class="coach-reco-foot">
                        <span class="coach-reco-evidence-kicker">EVIDENCE</span>
                        <span class="coach-reco-evidence-sep" aria-hidden="true">·</span>
                        <span class="coach-reco-evidence">${evidenceEsc}</span>
                        <span class="coach-reco-conf" aria-label="Confiance: ${rec.confidence || 'medium'}">${confDots}</span>
                    </footer>
                ` : ''}
            </article>
        `;
    });

    html += '</div>';

    containers.forEach(container => {
        if (container) container.innerHTML = html;
    });
}

/** V8-D-C — Helper : Label texte pour priorité (kicker style). */
function _priorityLabel(priority) {
    switch (priority) {
        case 1: return 'CRITIQUE';
        case 2: return 'ALERT';
        case 3: return 'PUSH';
        case 4: return 'INFO';
        case 5: return 'OBSERVE';
        default: return 'INFO';
    }
}

/** V8-D-C — Escape minimal pour innerHTML safety (XSS surface). */
function _escapeText(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * V8-D-D — Toast condensé des recos top-priority pour le post-séance.
 * Nouveau schéma : on affiche `action` (court & actionnable) + evidence courte.
 */
function showCoachRecommendationsToast() {
    const recommendations = generateCoachRecommendations();
    if (!recommendations || recommendations.length === 0) return;

    const topRecs = recommendations.slice(0, 3);

    let message = '<strong>Coach · Recommandations</strong><br>';
    topRecs.forEach(rec => {
        const tier = PRIORITY_TIERS[rec.priority] || PRIORITY_TIERS[5];
        message += `<br><span style="color:${tier.accent};font-weight:700">${tier.label}</span> <strong>${_escapeText(rec.exercise)}</strong> · ${_escapeText(rec.action)}`;
    });

    if (recommendations.length > 3) {
        message += `<br><br><em>+${recommendations.length - 3} autre(s) — voir Progression</em>`;
    }

    if (typeof showToast === 'function') {
        showToast(message, 'info', 8000);
    }
}

// ════════════════════════════════════════════════════════════════════
// V8-D — RECOS ACTIONNABLES (RPE + volume + contexte semaine)
// ════════════════════════════════════════════════════════════════════
// Schema de sortie :
//   {
//     exercise: 'Développé Couché',
//     type:     'plateau_real' | 'rpe_reduce' | 'weight_up' | 'rep_up'
//             | 'effort_low'   | 'volume_low' | 'volume_high'
//             | 'assimilation' | 'maintain',
//     action:        '↓ -2.5kg'              // courte, actionnable
//     actionDetail:  'Passe à 80kg × 8',     // détail facultatif
//     evidence:      'RPE 9 sur 3 dernières  // preuve data
//                     sessions',
//     priority:      1-5,                     // 1 = urgent, 5 = info
//     confidence:    'high'|'medium'|'low',
//     icon:          'plateau' | 'up' | 'down' | 'reps' | ...
//   }

/**
 * V8-D-B — Détection de plateau CONTEXTUELLE.
 *
 * Discrimine 3 cas qui sembleraient identiques sur la métrique "volume
 * stagnant" seule :
 *   - 'real'         : volume stable + RPE en hausse → vrai plateau, deload
 *   - 'fakeRpeDown'  : volume stable + RPE en baisse → effort qui chute
 *   - 'assimilation' : volume stable + RPE stable    → semaine de récup
 *                                                       légitime, no-op
 *   - 'volumeUnknown': pas assez de RPE → fallback simple "volume stagnant"
 *
 * @returns {Object|null}  { kind, evidence, volChange, rpeDelta }
 */
function detectContextualPlateau(exerciseName) {
    const logs = state.progressLog && state.progressLog[exerciseName];
    if (!logs || logs.length < 6) return null;

    const recent = logs.slice(-3);
    const previous = logs.slice(-6, -3);

    function logVolume(log) {
        if (log.setsDetail && log.setsDetail.length > 0) {
            return log.setsDetail.reduce((s, set) => {
                const w = (typeof getEffectiveWeight === 'function')
                    ? getEffectiveWeight(exerciseName, set.weight || 0)
                    : (set.weight || 0);
                return s + w * (set.reps || 0);
            }, 0);
        }
        const w = (typeof getEffectiveWeight === 'function')
            ? getEffectiveWeight(exerciseName, log.weight || 0)
            : (log.weight || 0);
        return w * (log.achievedReps || 0);
    }

    function logAvgRpe(log) {
        if (!log.setsDetail || log.setsDetail.length === 0) return null;
        const rpes = log.setsDetail
            .filter(s => s.rpe != null && s.rpe > 0)
            .map(s => s.rpe);
        if (rpes.length === 0) return null;
        return rpes.reduce((s, r) => s + r, 0) / rpes.length;
    }

    const recentVol  = recent.reduce((s, l) => s + logVolume(l), 0) / 3;
    const prevVol    = previous.reduce((s, l) => s + logVolume(l), 0) / 3;
    if (prevVol === 0) return null;

    const volChange = ((recentVol - prevVol) / prevVol) * 100;
    const STAGNANT_THRESHOLD_PCT = 3;
    const isStagnant = Math.abs(volChange) < STAGNANT_THRESHOLD_PCT;
    if (!isStagnant) return null;

    // Volume stable. RPE evolution ?
    const recentRpes = recent.map(logAvgRpe).filter(r => r != null);
    const prevRpes   = previous.map(logAvgRpe).filter(r => r != null);

    if (recentRpes.length < 2 || prevRpes.length < 2) {
        return {
            kind: 'volumeUnknown',
            evidence: `Volume stable (${volChange >= 0 ? '+' : ''}${Math.round(volChange)}%), pas de RPE`,
            volChange: Math.round(volChange * 10) / 10,
            rpeDelta: null
        };
    }

    const avgRecentRpe = recentRpes.reduce((s, r) => s + r, 0) / recentRpes.length;
    const avgPrevRpe   = prevRpes.reduce((s, r) => s + r, 0) / prevRpes.length;
    const rpeDelta = avgRecentRpe - avgPrevRpe;

    // Vrai plateau : volume stable + RPE en hausse ≥ 0.8
    if (rpeDelta >= 0.8) {
        return {
            kind: 'real',
            evidence: `Volume stable, RPE ${avgPrevRpe.toFixed(1)} → ${avgRecentRpe.toFixed(1)}`,
            volChange: Math.round(volChange * 10) / 10,
            rpeDelta: Math.round(rpeDelta * 10) / 10
        };
    }

    // Effort en baisse : volume stable + RPE en baisse ≤ -0.8
    if (rpeDelta <= -0.8) {
        return {
            kind: 'fakeRpeDown',
            evidence: `Volume stable, RPE ${avgPrevRpe.toFixed(1)} → ${avgRecentRpe.toFixed(1)} (effort en baisse)`,
            volChange: Math.round(volChange * 10) / 10,
            rpeDelta: Math.round(rpeDelta * 10) / 10
        };
    }

    // Assimilation : volume stable + RPE stable
    return {
        kind: 'assimilation',
        evidence: `Volume & RPE stables — phase d'assimilation`,
        volChange: Math.round(volChange * 10) / 10,
        rpeDelta: Math.round(rpeDelta * 10) / 10
    };
}

/**
 * V8-D-A — Génération des recommandations enrichies.
 * Sortie : array<{exercise, type, action, actionDetail, evidence,
 *                 priority (1-5), confidence, icon}>.
 */
function generateCoachRecommendations() {
    if (!state.progressLog) return [];

    const recos = [];

    // Contexte global : phase + semaine périodisation
    const phase = (state.periodization && state.periodization.currentPhase) || 'hypertrophy';
    const week  = (state.periodization && state.periodization.currentWeek)  || 1;
    const isDeloadWeek = phase === 'deload';

    // Volume hebdo par groupe musculaire (V8-A)
    let volByMuscle = null;
    if (window.CoachVolume && typeof window.CoachVolume.weeklyVolumeByMuscle === 'function') {
        try { volByMuscle = window.CoachVolume.weeklyVolumeByMuscle(7); } catch (_) {}
    }

    // Itère tous les exercices avec ≥ 3 logs
    Object.keys(state.progressLog).forEach(exerciseName => {
        const logs = state.progressLog[exerciseName];
        if (!logs || logs.length < 3) return;

        const reco = _analyzeExerciseForReco(exerciseName, logs, {
            phase, week, isDeloadWeek, volByMuscle
        });
        if (reco) recos.push(reco);
    });

    // Sort priorité ASC (1 = urgent → 5 = info)
    recos.sort((a, b) => a.priority - b.priority);

    // Limit à 6 recos max — sinon le dashboard devient bruyant
    return recos.slice(0, 6);
}

/**
 * V8-D-A — Analyse 1 exercice → 1 reco au plus.
 * Hiérarchie des règles (premier match retourne) :
 *   1. Plateau réel (vrai vs assimilation) [priority 1-3]
 *   2. RPE last set ≥ 9 → réduire [priority 2]
 *   3. SmartTraining suggestion (rpe_reduce/rpe_boost/weight_up/down)
 *   4. Double progression → ↑ poids ou ↑ reps
 */
function _analyzeExerciseForReco(exerciseName, logs, ctx) {
    const lastLog = logs[logs.length - 1];
    if (!lastLog) return null;

    // ── 1. Plateau contextuel ───────────────────────────────────────
    const plateau = detectContextualPlateau(exerciseName);
    if (plateau) {
        if (plateau.kind === 'real') {
            // Vrai plateau : deload 10%
            const lastWeight = lastLog.weight || 0;
            const target = lastWeight > 0 ? Math.round(lastWeight * 0.9 * 2) / 2 : 0;
            return {
                exercise: exerciseName,
                type: 'plateau_real',
                action: target > 0 ? `↓ ${target}kg` : 'Deload',
                actionDetail: target > 0 ? `Deload -10% pour casser le mur` : 'Réduire de 10%',
                evidence: plateau.evidence,
                priority: 1,
                confidence: 'high',
                icon: 'plateau'
            };
        }
        if (plateau.kind === 'fakeRpeDown') {
            return {
                exercise: exerciseName,
                type: 'effort_low',
                action: `↑ Pousse plus`,
                actionDetail: `RPE en baisse, augmente l'intensité`,
                evidence: plateau.evidence,
                priority: 3,
                confidence: 'medium',
                icon: 'up'
            };
        }
        // 'assimilation' ou 'volumeUnknown' : on ne génère pas de reco (silence = OK)
    }

    // ── 2. RPE-driven via SmartTraining (déjà phase-aware) ─────────
    let suggestion = null;
    if (window.SmartTraining && typeof window.SmartTraining.calculateSuggestedWeight === 'function') {
        try { suggestion = window.SmartTraining.calculateSuggestedWeight(exerciseName); } catch (_) {}
    }

    if (suggestion && suggestion.action) {
        const reco = _mapSuggestionToReco(exerciseName, suggestion, lastLog, ctx);
        if (reco) return reco;
    }

    // ── 3. Volume sub-MEV / over-MRV pour les muscles primaires ────
    if (ctx.volByMuscle && window.CoachVolume) {
        const vReco = _checkVolumeContext(exerciseName, ctx.volByMuscle);
        if (vReco) return vReco;
    }

    // Pas de signal fort → silencieux (mieux que reco bruitée)
    return null;
}

/**
 * Maps une suggestion SmartTraining (action: rpe_reduce/rpe_boost/...) vers
 * le schéma reco V8-D enrichi.
 */
function _mapSuggestionToReco(exerciseName, sug, lastLog, ctx) {
    const lastWeight = lastLog.weight || 0;
    const sugWeight = sug.suggested || 0;
    const delta = sugWeight - lastWeight;
    const deltaSign = delta > 0 ? '+' : (delta < 0 ? '' : '±');
    const deltaTxt = delta !== 0 ? `${deltaSign}${delta}kg` : '';

    switch (sug.action) {
        case 'rpe_reduce':
            return {
                exercise: exerciseName,
                type: 'rpe_reduce',
                action: deltaTxt ? `↓ ${deltaTxt}` : '↓ Réduire',
                actionDetail: sug.message || `Passe à ${sugWeight}kg`,
                evidence: `RPE 10 dernier set — assure récup`,
                priority: 2,
                confidence: 'high',
                icon: 'down'
            };

        case 'rpe_maintain':
            return {
                exercise: exerciseName,
                type: 'maintain',
                action: '= Maintien',
                actionDetail: sug.message || `Reste à ${sugWeight}kg`,
                evidence: `RPE 9 — maintenir l'intensité`,
                priority: 4,
                confidence: 'high',
                icon: 'maintain'
            };

        case 'rpe_boost':
            return {
                exercise: exerciseName,
                type: 'weight_up',
                action: deltaTxt ? `↑ ${deltaTxt}` : '↑ Augmenter',
                actionDetail: sug.message || `Passe à ${sugWeight}kg`,
                evidence: `RPE faible + reps max → marge dispo`,
                priority: 3,
                confidence: 'high',
                icon: 'up'
            };

        case 'weight_up': {
            // Récolte d'evidence factuelle : avg reps des derniers sets
            const lastReps = (lastLog.setsDetail && lastLog.setsDetail.length > 0)
                ? Math.round(lastLog.setsDetail.reduce((s, x) => s + (x.reps || 0), 0) / lastLog.setsDetail.length)
                : (lastLog.achievedReps && lastLog.achievedSets
                    ? Math.round(lastLog.achievedReps / lastLog.achievedSets)
                    : null);
            const ev = lastReps ? `${lastReps} reps × ${lastWeight}kg dernière séance` : `Reps cible atteinte`;
            return {
                exercise: exerciseName,
                type: 'weight_up',
                action: deltaTxt ? `↑ ${deltaTxt}` : '↑ +2.5kg',
                actionDetail: sug.message || `Passe à ${sugWeight}kg`,
                evidence: ev,
                priority: 3,
                confidence: sug.confidence || 'medium',
                icon: 'up'
            };
        }

        case 'weight_down':
            return {
                exercise: exerciseName,
                type: 'weight_down',
                action: deltaTxt ? `↓ ${deltaTxt}` : '↓ Réduire',
                actionDetail: sug.message || `Passe à ${sugWeight}kg`,
                evidence: `Reps min non atteintes — décharge`,
                priority: 2,
                confidence: sug.confidence || 'medium',
                icon: 'down'
            };

        case 'plateau': {
            const target = sugWeight || (lastWeight > 0 ? Math.round(lastWeight * 0.9 * 2) / 2 : 0);
            return {
                exercise: exerciseName,
                type: 'plateau_simple',
                action: target ? `↓ ${target}kg` : 'Deload',
                actionDetail: sug.message || 'Plateau détecté — décharge',
                evidence: `Stagnation 3 séances, pas de RPE`,
                priority: 2,
                confidence: 'medium',
                icon: 'plateau'
            };
        }

        case 'range_change':
            return {
                exercise: exerciseName,
                type: 'rep_up',
                action: '🔄 Recalibrer',
                actionDetail: sug.message,
                evidence: `Nouveau range — ajuste poids vs reps`,
                priority: 4,
                confidence: 'medium',
                icon: 'reps'
            };

        default:
            return null;
    }
}

/**
 * Reco basée sur le volume hebdo (CoachVolume) — sub-MEV ou over-MRV
 * sur le muscle primaire de l'exercice.
 */
function _checkVolumeContext(exerciseName, volByMuscle) {
    if (!window.CoachVolume) return null;
    const muscles = window.CoachVolume.getMusclesForExercise(exerciseName);
    if (!muscles || !muscles.primary || muscles.primary.length === 0) return null;

    // Premier muscle primaire mappé
    let groupId = null;
    for (const m of muscles.primary) {
        const g = window.CoachVolume.mapMuscleToGroup(m);
        if (g) { groupId = g; break; }
    }
    if (!groupId || !volByMuscle[groupId]) return null;

    const v = volByMuscle[groupId];
    if (v.status === 'underdosed') {
        return {
            exercise: exerciseName,
            type: 'volume_low',
            action: `+ ${Math.max(2, Math.round(v.mev - v.sets))} séries / sem`,
            actionDetail: `${v.label}: sous-stim cette semaine`,
            evidence: `${v.sets} sets / ${v.mev} MEV — manque ${Math.round((v.mev - v.sets) * 10) / 10} sets`,
            priority: 4,
            confidence: 'medium',
            icon: 'reps'
        };
    }
    if (v.status === 'overload') {
        return {
            exercise: exerciseName,
            type: 'volume_high',
            action: `Stop — repos`,
            actionDetail: `${v.label}: surcharge cette semaine`,
            evidence: `${v.sets} sets / ${v.mrv} MRV dépassé — récup compromise`,
            priority: 2,
            confidence: 'high',
            icon: 'down'
        };
    }
    return null;
}

// ==================== HEATMAP ANNUELLE ====================

function renderActivityHeatmap() {
    const container = document.getElementById('activity-heatmap');
    const statsEl   = document.getElementById('heatmap-stats');
    const monthsEl  = document.getElementById('heatmap-months-labels');
    if (!container) return;

    // ── Construire un dictionnaire date → nombre de séances ──
    const sessions = (state.sessionHistory || []).filter(s => !s.deletedAt);
    const byDate = {};
    sessions.forEach(s => {
        if (s.date) byDate[s.date] = (byDate[s.date] || 0) + 1;
    });

    // ── Calculer la fenêtre 52 semaines ──
    const today     = new Date();
    const todayStr  = today.toLocaleDateString('en-CA');

    // Trouver le dernier lundi (début de la dernière semaine complète)
    const startDate = new Date(today);
    const dayOfWeek = today.getDay(); // 0=dim, 1=lun...
    startDate.setDate(today.getDate() - 363 - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

    // ── Rendre les colonnes (semaines) ──
    let html = '';
    let totalSessions = 0;
    let activeDays    = 0;
    const monthBreaks = {}; // week index → month name

    const cursor = new Date(startDate);
    for (let week = 0; week < 53; week++) {
        // Marquer le mois si c'est le premier lundi du mois
        const monthName = cursor.toLocaleDateString('fr-FR', { month: 'short' });
        if (week === 0 || cursor.getDate() <= 7) {
            monthBreaks[week] = monthName.charAt(0).toUpperCase();
        }

        html += `<div class="heatmap-col" data-week="${week}">`;
        for (let day = 0; day < 7; day++) {
            const dateStr  = cursor.toLocaleDateString('en-CA');
            const count    = byDate[dateStr] || 0;
            const isFuture = dateStr > todayStr;

            if (!isFuture && count > 0) { totalSessions += count; activeDays++; }

            const intensity = isFuture ? 0
                : count === 0 ? 0
                : count === 1 ? 1
                : count === 2 ? 2
                : 3;

            const title = isFuture ? '' : `${dateStr} · ${count} séance${count > 1 ? 's' : ''}`;
            html += `<div class="heatmap-cell i${intensity}" title="${title}" data-date="${dateStr}"></div>`;
            cursor.setDate(cursor.getDate() + 1);
        }
        html += `</div>`;
    }

    container.innerHTML = html;

    // ── Labels mois ──
    if (monthsEl) {
        let labelsHtml = '';
        Object.entries(monthBreaks).forEach(([weekIdx, name]) => {
            labelsHtml += `<span class="heatmap-month-label" style="grid-column:${parseInt(weekIdx)+1}">${name}</span>`;
        });
        monthsEl.innerHTML = labelsHtml;
    }

    // ── Stats header ──
    if (statsEl) {
        statsEl.textContent = activeDays > 0
            ? `${activeDays} jours · ${totalSessions} séances`
            : 'Aucune séance cette année';
    }
}

// ==================== INIT PROGRESSION SECTION ====================

// ==================== INSIGHTS PROACTIFS ====================
/**
 * Scanne tous les exercices du progressLog, détecte les plateaux/stagnations
 * via calculateSuggestedWeight() et affiche des cartes d'action proactives.
 */
function renderProactiveInsights() {
    const section = document.getElementById('proactive-insights-section');
    if (!section) return;

    const progressLog = state.progressLog || {};
    const exercises = Object.keys(progressLog);

    // Filtrer : exercices avec ≥ 3 sessions et une activité récente (60 jours)
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const cutoff = sixtyDaysAgo.toISOString().split('T')[0];

    const insights = [];

    exercises.forEach(name => {
        const logs = progressLog[name] || [];
        if (logs.length < 3) return;

        const recent = logs.filter(l => l.date >= cutoff);
        if (recent.length < 1) return; // exercice abandonné

        // Utiliser la suggestion engine existante
        if (typeof calculateSuggestedWeight !== 'function') return;
        const suggestion = calculateSuggestedWeight(name, 10);
        if (!suggestion) return;

        const { isStagnating, action, message, trend, lastWeight, suggested, confidence } = suggestion;

        if (action === 'plateau' || isStagnating) {
            insights.push({
                type: 'plateau',
                exercise: name,
                message: message || `Plateau détecté sur ${name}`,
                detail: lastWeight ? `${lastWeight} kg · ${logs.length} sessions` : '',
                suggestion: suggested && suggested !== lastWeight
                    ? `Essaie ${suggested} kg la prochaine fois`
                    : 'Change le schéma de répétitions ou ajoute un deload',
                icon: '📊',
                color: 'var(--warning, #f59e0b)'
            });
        } else if (trend === 'up' && confidence === 'high' && action === 'weight_up') {
            insights.push({
                type: 'progression',
                exercise: name,
                message: `Belle progression sur ${name}`,
                detail: suggested ? `Prêt à passer à ${suggested} kg` : '',
                suggestion: message || '',
                icon: '📈',
                color: 'var(--success, #10b981)'
            });
        }
    });

    if (insights.length === 0) {
        section.style.display = 'none';
        return;
    }

    // Trier : plateaux en premier, puis progressions
    insights.sort((a, b) => (a.type === 'plateau' ? -1 : 1) - (b.type === 'plateau' ? -1 : 1));
    const shown = insights.slice(0, 5); // max 5 insights

    section.style.display = 'block';
    section.innerHTML = `
        <div class="card insights-card">
            <div class="card-header">
                <div class="card-title">
                    <span class="icon">🧠</span>
                    Insights Coach
                </div>
                <span class="insights-badge">${shown.length}</span>
            </div>
            <div class="insights-list">
                ${shown.map(ins => `
                    <div class="insight-item insight-${ins.type}">
                        <span class="insight-icon">${ins.icon}</span>
                        <div class="insight-body">
                            <div class="insight-title">${ins.exercise}</div>
                            <div class="insight-desc">${ins.suggestion}</div>
                            ${ins.detail ? `<div class="insight-meta">${ins.detail}</div>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// ==================== ADVANCED INSIGHTS (Phase 2C) ====================

/**
 * Détecte un plateau de volume sur un exercice donné.
 * Compare le volume moyen des 3 dernières sessions vs les 3 précédentes.
 * @param {string} exerciseName
 * @returns {object|null} { isPlateaued, volumeChange, avgRecent, avgPrevious }
 */
function detectVolumePlateau(exerciseName) {
    const logs = state.progressLog?.[exerciseName];
    if (!logs || logs.length < 6) return null;

    const recent = logs.slice(-3);
    const previous = logs.slice(-6, -3);

    function calcVolume(entries) {
        return entries.reduce((sum, log) => {
            if (log.setsDetail && log.setsDetail.length > 0) {
                return sum + log.setsDetail.reduce((s, set) => {
                    const rawW = set.weight || 0;
                    const ew = (typeof getEffectiveWeight === 'function')
                        ? getEffectiveWeight(exerciseName, rawW)
                        : rawW;
                    return s + ew * (set.reps || 0);
                }, 0);
            }
            const rawW = log.weight || 0;
            const ew = (typeof getEffectiveWeight === 'function')
                ? getEffectiveWeight(exerciseName, rawW)
                : rawW;
            return sum + ew * (log.achievedReps || 0);
        }, 0);
    }

    const recentVol = calcVolume(recent);
    const prevVol = calcVolume(previous);
    const avgRecent = recentVol / 3;
    const avgPrevious = prevVol / 3;

    if (avgPrevious === 0) return null;

    const change = ((avgRecent - avgPrevious) / avgPrevious) * 100;
    return {
        isPlateaued: Math.abs(change) < 3,
        volumeChange: Math.round(change * 10) / 10,
        avgRecent: Math.round(avgRecent),
        avgPrevious: Math.round(avgPrevious)
    };
}

/**
 * Calcule un score de progression par exercice sur une période (basé sur le 1RM estimé).
 * @param {string} exerciseName
 * @param {number} periodDays — fenêtre d'analyse (défaut 30)
 * @returns {object|null} { score, category, trend, e1rmStart, e1rmEnd }
 */
function calculateProgressionScore(exerciseName, periodDays) {
    periodDays = periodDays || 30;
    const logs = state.progressLog?.[exerciseName];
    if (!logs || logs.length < 3) return null;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - periodDays);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    // Séparer ancien / récent
    const oldLogs = logs.filter(l => l.date < cutoffStr);
    const recentLogs = logs.filter(l => l.date >= cutoffStr);
    if (recentLogs.length < 1) return null;

    function best1RM(entries) {
        let best = 0;
        entries.forEach(log => {
            if (log.setsDetail && log.setsDetail.length > 0) {
                log.setsDetail.forEach(set => {
                    if (set.weight > 0 && set.reps > 0) {
                        const r = Math.min(set.reps, 20);
                        const e = set.weight * (1 + r / 30);
                        if (e > best) best = e;
                    }
                });
            } else if (log.weight > 0 && log.achievedReps > 0 && log.achievedSets > 0) {
                const avgReps = log.achievedReps / log.achievedSets;
                const r = Math.min(avgReps, 20);
                const e = log.weight * (1 + r / 30);
                if (e > best) best = e;
            }
        });
        return Math.round(best * 10) / 10;
    }

    // Si pas assez d'ancien, comparer premier tiers vs dernier tiers de la période
    let e1rmStart, e1rmEnd;
    if (oldLogs.length >= 2) {
        e1rmStart = best1RM(oldLogs.slice(-3));
        e1rmEnd = best1RM(recentLogs);
    } else {
        const half = Math.floor(recentLogs.length / 2);
        if (half < 1) return null;
        e1rmStart = best1RM(recentLogs.slice(0, half));
        e1rmEnd = best1RM(recentLogs.slice(half));
    }

    if (e1rmStart === 0) return null;

    const score = Math.round(((e1rmEnd - e1rmStart) / e1rmStart) * 1000) / 10; // ex: 5.2%
    let category, trend;
    if (score > 5) { category = 'En forte progression'; trend = 'up'; }
    else if (score > 0) { category = 'En progression'; trend = 'up'; }
    else if (score > -3) { category = 'Stable'; trend = 'stable'; }
    else { category = 'En régression'; trend = 'down'; }

    return { score, category, trend, e1rmStart, e1rmEnd };
}

/**
 * Retourne l'exercice avec la meilleure progression ce mois-ci.
 * @returns {object|null} { name, score, category, trend }
 */
function getBestExerciseOfMonth() {
    const progressLog = state.progressLog || {};
    const exercises = Object.keys(progressLog);
    let best = null;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    exercises.forEach(name => {
        const logs = progressLog[name] || [];
        // Au moins 3 sessions et activité ce mois
        if (logs.length < 3) return;
        const hasThisMonth = logs.some(l => l.date >= startOfMonth);
        if (!hasThisMonth) return;

        const result = calculateProgressionScore(name, 30);
        if (!result) return;

        if (!best || result.score > best.score) {
            best = { name, ...result };
        }
    });

    return best;
}

/**
 * Compte le nombre d'exercices en plateau (poids ou volume).
 * @returns {number}
 */
function countPlateauExercises() {
    const progressLog = state.progressLog || {};
    let count = 0;
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const cutoff = sixtyDaysAgo.toISOString().split('T')[0];

    Object.keys(progressLog).forEach(name => {
        const logs = progressLog[name] || [];
        if (logs.length < 3) return;
        const recent = logs.filter(l => l.date >= cutoff);
        if (recent.length < 1) return;

        // Check volume plateau
        const volPlat = detectVolumePlateau(name);
        if (volPlat && volPlat.isPlateaued) { count++; return; }

        // Check weight plateau (3 sessions same weight)
        const last3 = logs.slice(-3);
        if (last3.length >= 3 && last3.every(l => l.weight === last3[0].weight)) {
            count++;
        }
    });

    return count;
}

/**
 * Rend la card Insights sur le Dashboard — V7-PATCH-4 layout magazine refined.
 * Hero row (insight n°1 mis en valeur avec gros chiffre + chip trend) +
 * sub-rows compactes pour les insights secondaires.
 *
 * Hiérarchie : volume mensuel = hero (le plus macro), puis plateaux + best exo
 * en sub-rows compactes.
 */
function renderDashboardInsights() {
    const container = document.getElementById('dashboard-insights-content');
    if (!container) return;

    const bestExo = getBestExerciseOfMonth();
    const plateauCount = countPlateauExercises();
    const monthlyProg = calculateMonthlyProgression();

    // Lucide-style line icons — stroke-width="2.2" pour cohérence Pit Lane
    const SVG_TREND_UP   = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>`;
    const SVG_TREND_DOWN = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/></svg>`;
    const SVG_TREND_FLAT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
    const SVG_BARS       = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`;
    const SVG_AWARD      = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="6"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>`;
    const SVG_ALERT      = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    const SVG_CHECK      = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`;
    const SVG_ARROW_UP_R = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>`;
    const SVG_ARROW_DN_R = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="7" y1="7" x2="17" y2="17"/><polyline points="17 7 17 17 7 17"/></svg>`;

    // ───── HERO : Volume mensuel (l'indicateur macro le plus important) ─────
    let heroStatus, heroValue, heroMeta, heroTrend, heroTrendIcon, heroIcon;

    if (monthlyProg === null) {
        heroStatus = 'neutral';
        heroValue = '—';
        heroMeta = 'Entraîne-toi pour activer ton suivi mensuel';
        heroTrend = null;
        heroIcon = SVG_BARS;
    } else if (monthlyProg > 5) {
        heroStatus = 'positive';
        heroValue = `+${monthlyProg}%`;
        heroMeta = 'Volume en progression vs mois -1';
        heroTrend = { dir: 'up', label: `+${monthlyProg}%`, icon: SVG_ARROW_UP_R };
        heroIcon = SVG_TREND_UP;
    } else if (monthlyProg < -5) {
        heroStatus = 'alert';
        heroValue = `${monthlyProg}%`;
        heroMeta = 'Volume en recul vs mois -1';
        heroTrend = { dir: 'down', label: `${monthlyProg}%`, icon: SVG_ARROW_DN_R };
        heroIcon = SVG_TREND_DOWN;
    } else {
        heroStatus = 'neutral';
        heroValue = `${monthlyProg >= 0 ? '+' : ''}${monthlyProg}%`;
        heroMeta = 'Volume stable vs mois -1';
        heroTrend = { dir: 'flat', label: 'STABLE', icon: SVG_TREND_FLAT };
        heroIcon = SVG_TREND_FLAT;
    }

    const trendChipHtml = heroTrend
        ? `<span class="dash-trend-chip" data-trend="${heroTrend.dir}">${heroTrend.icon}<span>${heroTrend.label}</span></span>`
        : '';

    let html = '<div class="dash-insights-v4">';

    html += `
        <div class="dash-insight-hero" data-status="${heroStatus}">
            <span class="dash-icon" aria-hidden="true">${heroIcon}</span>
            <div class="dash-body">
                <div class="dash-kicker">Volume · 30 jours</div>
                <div class="dash-value">${heroValue}</div>
                <div class="dash-meta">${heroMeta}</div>
            </div>
            ${trendChipHtml}
        </div>`;

    // ───── SUB-ROWS : insights secondaires en compact ─────
    // Plateaux détectés
    const plateauStatus = plateauCount > 0 ? 'alert' : 'positive';
    const plateauValue = plateauCount > 0
        ? `${plateauCount} ${plateauCount > 1 ? 'exercices bloqués' : 'exercice bloqué'}`
        : 'Aucun plateau détecté';
    const plateauSide = plateauCount > 0 ? `${plateauCount}` : '✓';

    html += `
        <div class="dash-insight-row" data-status="${plateauStatus}">
            <span class="dash-icon" aria-hidden="true">${plateauCount > 0 ? SVG_ALERT : SVG_CHECK}</span>
            <div class="dash-body">
                <div class="dash-kicker">Plateaux</div>
                <div class="dash-value">${plateauValue}</div>
            </div>
            <span class="dash-side">${plateauSide}</span>
        </div>`;

    // Meilleur exercice du mois (si dispo)
    if (bestExo) {
        const exoStatus = bestExo.score > 0 ? 'positive' : (bestExo.score < 0 ? 'alert' : 'neutral');
        const exoSign = bestExo.score > 0 ? '+' : '';
        html += `
            <div class="dash-insight-row" data-status="${exoStatus}">
                <span class="dash-icon" aria-hidden="true">${SVG_AWARD}</span>
                <div class="dash-body">
                    <div class="dash-kicker">Top exercice du mois</div>
                    <div class="dash-value">${bestExo.name}</div>
                </div>
                <span class="dash-side">${exoSign}${bestExo.score}%</span>
            </div>`;
    }

    html += '</div>';

    // Footer link refined
    html += `<div class="dash-insight-link v4" role="button" tabindex="0" onclick="if(typeof navigateToSection==='function'){navigateToSection('progress');}">Voir tous les insights <span aria-hidden="true">→</span></div>`;

    container.innerHTML = html;
}

/**
 * V8-A — Render the "Volume Hebdo Telemetry" card on the dashboard.
 * Pit Lane Telemetry style : barres horizontales segmentées MEV/MAV/MRV,
 * curseur de position courante, kicker DM Mono, valeurs Outfit.
 *
 * Affiche uniquement les muscles avec ≥1 set la semaine en cours OU
 * dont le déficit dépasse MEV (sous-stim notable). Trie par sévérité.
 */
function renderVolumeTelemetry() {
    const card = document.getElementById('volume-telemetry-card');
    const grid = document.getElementById('volume-telemetry-grid');
    if (!card || !grid) return;
    if (typeof window.CoachVolume === 'undefined') return;

    const data = window.CoachVolume.weeklyVolumeByMuscle(7);

    // Filtre : on affiche uniquement les muscles avec activité ou en sous-stim notable
    const rows = Object.values(data).filter(r => r.sets > 0 || r.status === 'underdosed');
    if (rows.length === 0) {
        card.style.display = 'none';
        return;
    }

    // Tri : overload > underdosed > developing > optimal (priorité aux warnings)
    const SEV_RANK = { overload: 0, underdosed: 1, developing: 2, optimal: 3 };
    rows.sort((a, b) => {
        const sa = SEV_RANK[a.status] ?? 9;
        const sb = SEV_RANK[b.status] ?? 9;
        if (sa !== sb) return sa - sb;
        return b.sets - a.sets;
    });

    // Échelle commune pour comparer visuellement les barres entre muscles
    // On prend max(MRV * 1.15) sur tous les groupes affichés
    const scaleMax = Math.max(...rows.map(r => r.mrv * 1.15));

    grid.innerHTML = rows.map(r => _vtRowHtml(r, scaleMax)).join('');
    card.style.display = '';
}

/**
 * Génère le HTML d'une ligne télémétrie pour un muscle.
 * Layout (mobile-first) :
 *   [SHORT]  [muscle label]              [sets / MAV target]
 *   ┌─ underdose ─┬─ developing ─┬─ optimal ─┬─ overload ─┐
 *                                ↑ current
 *   [status hint]
 */
function _vtRowHtml(row, scaleMax) {
    const { groupId, label, short, sets, mev, mav, mrv, status } = row;

    // Conversion en pourcentages basés sur scaleMax (échelle commune)
    const pctMev = Math.min(100, (mev / scaleMax) * 100);
    const pctMav = Math.min(100, (mav / scaleMax) * 100);
    const pctMrv = Math.min(100, (mrv / scaleMax) * 100);
    const pctCur = Math.min(100, (sets / scaleMax) * 100);

    // Hint actionnable selon zone
    let hint = '';
    let hintClass = '';
    switch (status) {
        case 'underdosed':
            hint = `+${Math.ceil(mev - sets)} séries pour MEV ${mev}`;
            hintClass = 'is-warn';
            break;
        case 'developing':
            hint = `Vise ${mav} séries/sem pour optimum`;
            hintClass = 'is-info';
            break;
        case 'optimal':
            hint = `Zone optimale · maintien`;
            hintClass = 'is-ok';
            break;
        case 'overload':
            hint = `Au-dessus MRV ${mrv} · deload conseillé`;
            hintClass = 'is-danger';
            break;
    }

    // Formatage des sets (1 décimale si fraction)
    const setsStr = Number.isInteger(sets) ? sets.toString() : sets.toFixed(1);
    const targetStr = `${mav}`;

    return `
    <div class="vt-row" data-status="${status}" data-muscle="${groupId}">
      <div class="vt-row-head">
        <span class="vt-row-tag">${short}</span>
        <span class="vt-row-label">${label}</span>
        <span class="vt-row-numeric">
          <span class="vt-row-current">${setsStr}</span><span class="vt-row-divider">/</span><span class="vt-row-target">${targetStr}</span>
        </span>
      </div>
      <div class="vt-bar" role="progressbar" aria-valuenow="${setsStr}" aria-valuemin="0" aria-valuemax="${mrv}" aria-label="${label} : ${setsStr} séries cette semaine, optimum ${mav}, max ${mrv}">
        <div class="vt-bar-zone vt-bar-zone--low"      style="width: ${pctMev}%"></div>
        <div class="vt-bar-zone vt-bar-zone--dev"      style="left: ${pctMev}%; width: ${pctMav - pctMev}%"></div>
        <div class="vt-bar-zone vt-bar-zone--ok"       style="left: ${pctMav}%; width: ${pctMrv - pctMav}%"></div>
        <div class="vt-bar-zone vt-bar-zone--over"     style="left: ${pctMrv}%; width: ${100 - pctMrv}%"></div>
        <div class="vt-bar-tick vt-bar-tick--mev"      style="left: ${pctMev}%" aria-hidden="true"></div>
        <div class="vt-bar-tick vt-bar-tick--mav"      style="left: ${pctMav}%" aria-hidden="true"></div>
        <div class="vt-bar-tick vt-bar-tick--mrv"      style="left: ${pctMrv}%" aria-hidden="true"></div>
        <div class="vt-bar-cursor"                     style="left: ${pctCur}%" aria-hidden="true"></div>
      </div>
      <div class="vt-row-hint ${hintClass}">${hint}</div>
    </div>`;
}

/**
 * V8-C-B — Soft banner "RACE CONTROL · DELOAD" on Dashboard.
 *
 * Affiche un bandeau soft-warning quand un (ou plusieurs) muscle a dépassé
 * MRV deux semaines consécutives. CTA → ouvre le bottom-sheet périodisation
 * (où l'utilisateur peut activer le deload manuel ou ajuster son cycle).
 *
 * Le banner reste invisible si :
 *   - CoachVolume indisponible (pas encore loadé)
 *   - aucun muscle ne déclenche le critère
 *   - moins de 14 jours d'historique exploitable
 */
function renderDeloadBanner() {
    const banner = document.getElementById('deload-banner');
    if (!banner) return;

    if (!window.CoachVolume || typeof window.CoachVolume.detectConsecutiveOverload !== 'function') {
        banner.style.display = 'none';
        return;
    }

    // Garde-fou : il faut au moins 14 jours d'historique exploitable.
    // On regarde sessionHistory ; si la première session date de moins de 14j,
    // on n'a pas encore deux semaines à comparer → pas de banner.
    try {
        const sessions = (window.state && Array.isArray(window.state.sessionHistory))
            ? window.state.sessionHistory.filter(s => !s.deletedAt)
            : [];
        if (sessions.length === 0) {
            banner.style.display = 'none';
            return;
        }
        // Plus ancienne timestamp
        const oldest = sessions.reduce((min, s) => {
            const ts = s.timestamp || s.endTime || s.startTime || (s.date ? new Date(s.date).getTime() : 0);
            return (ts && ts < min) ? ts : min;
        }, Date.now());
        const ageDays = (Date.now() - oldest) / (24 * 60 * 60 * 1000);
        if (ageDays < 14) {
            banner.style.display = 'none';
            return;
        }
    } catch (_) {
        banner.style.display = 'none';
        return;
    }

    let matches;
    try {
        matches = window.CoachVolume.detectConsecutiveOverload();
    } catch (e) {
        console.warn('[V8-C-B] detectConsecutiveOverload error:', e);
        banner.style.display = 'none';
        return;
    }

    if (!Array.isArray(matches) || matches.length === 0) {
        banner.style.display = 'none';
        return;
    }

    // Construire le message — top 2 muscles les plus chargés
    const msgEl = document.getElementById('deload-banner-msg');
    if (msgEl) {
        const top = matches.slice(0, 2).map(m => m.label).join(' & ');
        const moreCount = Math.max(0, matches.length - 2);
        const moreSuffix = moreCount > 0 ? ` +${moreCount}` : '';
        // Le premier muscle a déjà l'excédent le plus important
        const headExcess = matches[0].excess;
        msgEl.textContent = `${top}${moreSuffix} en surcharge 2 semaines (+${headExcess} sets / MRV).`;
    }

    banner.style.display = 'flex';
}

/**
 * V8-B — Render the "Recovery Radar" card on the dashboard.
 * Hexagonal cockpit-style SVG showing per-muscle recovery percentage.
 * 10 muscle vertices arranged around a polygon, filled per current state.
 *
 * Aesthetic : Pit Lane Cockpit Telemetry — concentric rings + filled polygon
 * with brand-red glow, vertex dots color-coded by status (DOMS=red,
 * fatigued=amber, partial=blue-ish, ready=green, fresh=white).
 */
function renderRecoveryRadar() {
    const card = document.getElementById('recovery-radar-card');
    const svg = document.getElementById('recovery-radar-svg');
    const list = document.getElementById('recovery-radar-list');
    if (!card || !svg || !list) return;
    if (typeof window.CoachVolume === 'undefined') return;

    const data = window.CoachVolume.recoveryByAllMuscles();

    // Filter : on affiche uniquement les muscles déjà entraînés
    const trained = Object.values(data).filter(r => !r.neverTrained);
    if (trained.length === 0) {
        card.style.display = 'none';
        return;
    }

    // Ordre canonique autour du radar (anatomique, sens horaire depuis le haut)
    const RADAR_ORDER = [
        'chest', 'shoulders', 'biceps', 'triceps', 'abs',
        'calves', 'hamstrings', 'glutes', 'quads', 'back'
    ];
    const ordered = RADAR_ORDER
        .map(g => data[g])
        .filter(r => r && !r.neverTrained);

    if (ordered.length < 3) {
        // Pas assez de données pour un radar visuel ; afficher uniquement la liste
        card.style.display = '';
        svg.innerHTML = '';
        list.innerHTML = trained
            .sort((a, b) => a.pct - b.pct)
            .slice(0, 5)
            .map(r => _rrListItem(r))
            .join('');
        return;
    }

    // ── SVG geometry ──────────────────────────────────────────────────
    // viewBox 320x280 ; on centre dans un cercle radius 100
    const cx = 160;
    const cy = 140;
    const maxR = 100; // 100% radius
    const labelR = 122; // distance du label depuis le centre

    const angleStep = (2 * Math.PI) / ordered.length;
    const startAngle = -Math.PI / 2; // commence en haut (12h)

    // Points polygon courant (recovery %)
    const dataPoints = ordered.map((r, i) => {
        const angle = startAngle + i * angleStep;
        const radius = (r.pct / 100) * maxR;
        return {
            x: cx + Math.cos(angle) * radius,
            y: cy + Math.sin(angle) * radius,
            angle,
            data: r
        };
    });

    // Helpers SVG
    const polyPath = (points) => points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

    // Anneaux concentriques (25/50/75/100%)
    const rings = [25, 50, 75, 100].map(pct => {
        const r = (pct / 100) * maxR;
        const ringPoints = ordered.map((_, i) => {
            const angle = startAngle + i * angleStep;
            return {
                x: cx + Math.cos(angle) * r,
                y: cy + Math.sin(angle) * r
            };
        });
        return `<polygon class="rr-ring rr-ring--${pct}" points="${polyPath(ringPoints)}" fill="none" />`;
    }).join('');

    // Axes (du centre vers chaque vertex à 100%)
    const axes = ordered.map((_, i) => {
        const angle = startAngle + i * angleStep;
        const x = cx + Math.cos(angle) * maxR;
        const y = cy + Math.sin(angle) * maxR;
        return `<line class="rr-axis" x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" />`;
    }).join('');

    // Polygon courant rempli (recovery state)
    const dataPolygon = `<polygon class="rr-data" points="${polyPath(dataPoints)}" />`;

    // Vertex dots colorés selon status
    const dots = dataPoints.map(p => `
        <circle class="rr-dot rr-dot--${p.data.status}" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.2" />
    `).join('');

    // Labels muscle (autour) + pct
    const labels = ordered.map((r, i) => {
        const angle = startAngle + i * angleStep;
        const lx = cx + Math.cos(angle) * labelR;
        const ly = cy + Math.sin(angle) * labelR;
        // Anchor selon position angulaire (gauche/droite/centre)
        let textAnchor = 'middle';
        const cosA = Math.cos(angle);
        if (cosA > 0.2) textAnchor = 'start';
        else if (cosA < -0.2) textAnchor = 'end';
        // Petit décalage vertical pour les labels haut/bas
        const dyText = Math.sin(angle) > 0.2 ? 8 : (Math.sin(angle) < -0.2 ? -2 : 3);

        return `
        <text class="rr-label rr-label--${r.status}" x="${lx.toFixed(1)}" y="${(ly + dyText).toFixed(1)}" text-anchor="${textAnchor}">
            <tspan class="rr-label-tag">${r.short}</tspan>
            <tspan class="rr-label-pct" x="${lx.toFixed(1)}" dy="11">${r.pct}%</tspan>
        </text>`;
    }).join('');

    // Centre : pulse ring + label "%"
    const avgPct = Math.round(ordered.reduce((s, r) => s + r.pct, 0) / ordered.length);
    const centerLabel = `
        <circle class="rr-center" cx="${cx}" cy="${cy}" r="22" />
        <text class="rr-center-pct" x="${cx}" y="${cy + 3}" text-anchor="middle">${avgPct}<tspan class="rr-center-suffix">%</tspan></text>
        <text class="rr-center-kicker" x="${cx}" y="${cy + 16}" text-anchor="middle">GLOBAL</text>
    `;

    // SVG defs : gradient pour le polygon data
    const defs = `
        <defs>
            <radialGradient id="rrDataGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="rgba(255, 45, 45, 0.32)" />
                <stop offset="100%" stop-color="rgba(255, 45, 45, 0.08)" />
            </radialGradient>
            <filter id="rrGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
        </defs>
    `;

    svg.innerHTML = `${defs}
        <g class="rr-grid">${rings}${axes}</g>
        <g class="rr-data-group">${dataPolygon}</g>
        <g class="rr-dots">${dots}</g>
        ${centerLabel}
        <g class="rr-labels">${labels}</g>
    `;

    // Liste des muscles en-dessous : top 3 muscles les moins récupérés
    const priorities = [...ordered]
        .filter(r => r.pct < 100)
        .sort((a, b) => a.pct - b.pct)
        .slice(0, 3);

    list.innerHTML = priorities.length > 0
        ? priorities.map(r => _rrListItem(r)).join('')
        : `<li class="rr-list-item rr-list-item--all-fresh">
             <span class="rr-list-tag rr-list-tag--fresh">●</span>
             <span class="rr-list-text">Tous frais — go all in 💪</span>
           </li>`;

    card.style.display = '';
}

function _rrListItem(r) {
    const STATUS_LABEL = {
        fresh: 'Frais',
        ready: 'Prêt',
        partial: 'Partiel',
        fatigued: 'Fatigué',
        doms: 'DOMS'
    };
    const HOURS_LEFT = r.adjustedRecoveryHrs && r.hoursSinceLast !== null
        ? Math.max(0, Math.round(r.adjustedRecoveryHrs - r.hoursSinceLast))
        : 0;
    const hint = r.pct >= 100
        ? 'récupéré · go'
        : (HOURS_LEFT > 0 ? `~${HOURS_LEFT}h restantes` : 'récupération imminente');

    return `
    <li class="rr-list-item" data-status="${r.status}">
        <span class="rr-list-tag rr-list-tag--${r.status}">●</span>
        <span class="rr-list-name">${r.label}</span>
        <span class="rr-list-status">${STATUS_LABEL[r.status] || r.status}</span>
        <span class="rr-list-pct">${r.pct}%</span>
        <span class="rr-list-hint">${hint}</span>
    </li>`;
}

/**
 * Alerte proactive via toast si ≥2 exercices en plateau.
 * Maximum 1 toast par jour.
 */
function checkPlateauAlert() {
    const today = new Date().toISOString().split('T')[0];
    if (state._lastPlateauAlertDate === today) return;

    const count = countPlateauExercises();
    if (count >= 2 && typeof showToast === 'function') {
        state._lastPlateauAlertDate = today;
        showToast(
            `⚠️ ${count} exercices en plateau. Consultez vos insights.`,
            'warning',
            {
                duration: 5000,
                action: (typeof navigateToSection === 'function') ? {
                    label: 'Voir',
                    callback: function() { navigateToSection('progress'); }
                } : undefined
            }
        );
    }
}

// ==================== CARDIO ANALYTICS ====================

const CARDIO_TYPE_LABELS = {
    running: { label: 'Course', icon: '🏃' },
    cycling: { label: 'Vélo',   icon: '🚴' },
    walking: { label: 'Marche', icon: '🚶' },
    swimming: { label: 'Natation', icon: '🏊' },
    boxing:   { label: 'Boxe',  icon: '🥊' },
    other:    { label: 'Autre', icon: '💪' }
};

let _cardioPeriodDays = 30;
let _cardioCaloriesChart = null;

function switchCardioPeriod(days) {
    _cardioPeriodDays = days;
    document.querySelectorAll('.ca-period-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.period) === days);
    });
    renderCardioAnalytics();
}

function renderCardioAnalytics() {
    const cardioLog = state.cardioLog || {};

    // ── Aplatir toutes les sessions ────────────────────────────────────────────
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - _cardioPeriodDays);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const allSessions = [];
    Object.entries(cardioLog).forEach(([date, sessions]) => {
        (sessions || []).forEach(s => allSessions.push({ ...s, date }));
    });
    allSessions.sort((a, b) => b.date.localeCompare(a.date));
    const filtered = allSessions.filter(s => s.date >= cutoffStr);

    // ── KPIs ─────────────────────────────────────────────────────────────────
    const totalSessions  = filtered.length;
    const totalDuration  = filtered.reduce((sum, s) => sum + (s.duration || 0), 0);
    const totalCalories  = filtered.reduce((sum, s) => sum + (s.calories || 0), 0);
    const totalDistance  = filtered.reduce((sum, s) => sum + (parseFloat(s.distance) || 0), 0);
    const avgDuration    = totalSessions ? Math.round(totalDuration / totalSessions) : 0;

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('ca-total-sessions', totalSessions);
    set('ca-total-duration', totalDuration);
    set('ca-total-calories', Math.round(totalCalories));
    set('ca-total-distance', totalDistance > 0 ? totalDistance.toFixed(1) : '—');
    set('ca-avg-duration',   avgDuration);
    const distLabelEl = document.getElementById('ca-total-distance-label');
    if (distLabelEl) distLabelEl.textContent = totalDistance > 0 ? totalDistance.toFixed(1) + ' km' : '— km';

    // ── Par type ──────────────────────────────────────────────────────────────
    const byType = {};
    filtered.forEach(s => {
        const t = s.type || 'other';
        if (!byType[t]) byType[t] = { count: 0, duration: 0, calories: 0, distance: 0 };
        byType[t].count++;
        byType[t].duration  += s.duration  || 0;
        byType[t].calories  += s.calories  || 0;
        byType[t].distance  += parseFloat(s.distance) || 0;
    });
    const typeList = document.getElementById('ca-by-type');
    if (typeList) {
        if (Object.keys(byType).length === 0) {
            typeList.innerHTML = '<div class="empty-state" style="padding:20px"><div class="empty-state-icon">🏃</div><div>Aucune séance cardio</div></div>';
        } else {
            const sorted = Object.entries(byType).sort((a, b) => b[1].count - a[1].count);
            const maxCount = sorted[0][1].count;
            typeList.innerHTML = sorted.map(([type, data]) => {
                const meta = CARDIO_TYPE_LABELS[type] || CARDIO_TYPE_LABELS.other;
                const pct = Math.round((data.count / maxCount) * 100);
                const distStr = data.distance > 0 ? ` · ${data.distance.toFixed(1)} km` : '';
                return `
                    <div class="ca-type-row">
                        <span class="ca-type-icon">${meta.icon}</span>
                        <div class="ca-type-info">
                            <div class="ca-type-name">${meta.label}</div>
                            <div class="ca-type-bar-wrap">
                                <div class="ca-type-bar" style="width:${pct}%"></div>
                            </div>
                        </div>
                        <div class="ca-type-stats">
                            <span class="ca-type-count">${data.count} séance${data.count > 1 ? 's' : ''}</span>
                            <span class="ca-type-cal">${Math.round(data.calories)} kcal${distStr}</span>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    // ── Distance par type ────────────────────────────────────────────────────
    const distByTypeEl = document.getElementById('ca-distance-by-type');
    if (distByTypeEl) {
        const withDistance = Object.entries(byType).filter(([, d]) => d.distance > 0);
        if (withDistance.length === 0) {
            distByTypeEl.innerHTML = '<div class="empty-state" style="padding:12px; font-size: 13px;"><div>Aucune distance enregistrée. Saisissez la distance lors de l’enregistrement d’une séance (ex. course, vélo).</div></div>';
        } else {
            distByTypeEl.innerHTML = withDistance.map(([type, data]) => {
                const meta = CARDIO_TYPE_LABELS[type] || CARDIO_TYPE_LABELS.other;
                return `
                    <div class="ca-type-row">
                        <span class="ca-type-icon">${meta.icon}</span>
                        <div class="ca-type-info">
                            <div class="ca-type-name">${meta.label}</div>
                        </div>
                        <div class="ca-type-stats">
                            <span class="ca-type-cal">${data.distance.toFixed(1)} km</span>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    // ── Zones FC (si avgHeartRate présent sur des séances) ────────────────────
    const hrContainer = document.getElementById('ca-hr-zones-container');
    if (hrContainer) {
        const sessionsWithHR = filtered.filter(s => s.avgHeartRate > 0 || (s.heartRateZones && Object.keys(s.heartRateZones).length));
        if (sessionsWithHR.length === 0) {
            hrContainer.innerHTML = '<div class="empty-state" style="padding:16px;"><div class="empty-state-icon">❤️</div><div>Enregistrez la fréquence cardiaque (FC moyenne) dans vos séances pour voir la répartition par zones.</div></div>';
        } else {
            const maxHR = 220 - (state.profile?.age || 35);
            const zoneNames = { z1: 'Récup', z2: 'Endurance', z3: 'Tempo', z4: 'Seuil', z5: 'Max' };
            const zonePct = { z1: [50, 60], z2: [60, 70], z3: [70, 80], z4: [80, 90], z5: [90, 100] };
            const zoneCount = { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 };
            sessionsWithHR.forEach(s => {
                const hr = s.avgHeartRate || 0;
                if (hr <= 0) return;
                const pct = (hr / maxHR) * 100;
                if (pct < 60) zoneCount.z1++;
                else if (pct < 70) zoneCount.z2++;
                else if (pct < 80) zoneCount.z3++;
                else if (pct < 90) zoneCount.z4++;
                else zoneCount.z5++;
            });
            const total = sessionsWithHR.length;
            hrContainer.innerHTML = `
                <div class="ca-hr-zones-list">
                    ${['z1', 'z2', 'z3', 'z4', 'z5'].map(z => {
                        const n = zoneCount[z];
                        const pct = total ? Math.round((n / total) * 100) : 0;
                        const [lo, hi] = zonePct[z].map(v => Math.round((v / 100) * maxHR));
                        return `<div class="ca-hr-zone-row">
                            <span class="ca-hr-zone-name">${zoneNames[z]}</span>
                            <span class="ca-hr-zone-range">${lo}–${hi} bpm</span>
                            <div class="ca-hr-zone-bar-wrap"><div class="ca-hr-zone-bar" style="width:${pct}%"></div></div>
                            <span class="ca-hr-zone-pct">${n} séance${n !== 1 ? 's' : ''} (${pct}%)</span>
                        </div>`;
                    }).join('')}
                </div>
            `;
        }
    }

    // ── Chart calories ────────────────────────────────────────────────────────
    _renderCardioCaloriesChart(filtered);

    // ── Historique ────────────────────────────────────────────────────────────
    const histList = document.getElementById('ca-history-list');
    if (histList) {
        if (allSessions.length === 0) {
            histList.innerHTML = '<div class="empty-state" style="padding:20px"><div class="empty-state-icon">📋</div><div>Aucune séance enregistrée</div></div>';
        } else {
            histList.innerHTML = allSessions.slice(0, 30).map(s => {
                const meta = CARDIO_TYPE_LABELS[s.type] || CARDIO_TYPE_LABELS.other;
                const intLabel = { light: 'Légère', moderate: 'Modérée', intense: 'Intense' }[s.intensity] || s.intensity || '';
                const distStr = (parseFloat(s.distance) > 0) ? ` · ${parseFloat(s.distance).toFixed(1)} km` : '';
                return `
                    <div class="ca-history-item">
                        <span class="ca-history-icon">${meta.icon}</span>
                        <div class="ca-history-body">
                            <div class="ca-history-title">${meta.label} <span class="ca-history-date">${s.date}</span></div>
                            <div class="ca-history-meta">${s.duration} min · ${Math.round(s.calories || 0)} kcal${distStr}${intLabel ? ' · ' + intLabel : ''}</div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }
}

function _renderCardioCaloriesChart(sessions) {
    const canvas = document.getElementById('cardio-calories-chart');
    if (!canvas || typeof Chart === 'undefined') return;

    // Regrouper par jour
    const byDay = {};
    sessions.forEach(s => {
        byDay[s.date] = (byDay[s.date] || 0) + (s.calories || 0);
    });

    // Générer les N derniers jours
    const days = [];
    const values = [];
    for (let i = _cardioPeriodDays - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const str = d.toISOString().split('T')[0];
        days.push(str.slice(5));   // MM-DD
        values.push(Math.round(byDay[str] || 0));
    }

    if (_cardioCaloriesChart) {
        _cardioCaloriesChart.destroy();
        _cardioCaloriesChart = null;
    }

    _cardioCaloriesChart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: days,
            datasets: [{
                label: 'Calories',
                data: values,
                backgroundColor: 'rgba(239, 68, 68, 0.6)',
                borderColor:     'rgba(239, 68, 68, 1)',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { maxTicksLimit: 8, color: 'rgba(255,255,255,0.4)', font: { size: 10 } }, grid: { display: false } },
                y: { ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.06)' }, beginAtZero: true }
            }
        }
    });
}

// ==================== MUSCLE GROUP WEEKLY HEATMAP ====================

const MUSCLE_HEATMAP_GROUPS = [
    { id: 'chest', label: 'Pecs' },
    { id: 'back', label: 'Dos' },
    { id: 'shoulders', label: 'Épaules' },
    { id: 'biceps', label: 'Biceps' },
    { id: 'triceps', label: 'Triceps' },
    { id: 'quads', label: 'Quads' },
    { id: 'hamstrings', label: 'Ischios' },
    { id: 'glutes', label: 'Fessiers' },
    { id: 'abs', label: 'Abdos' },
    { id: 'calves', label: 'Mollets' }
];

function renderMuscleWeeklyHeatmap() {
    const container = document.getElementById('muscle-heatmap-grid');
    if (!container) return;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoff = sevenDaysAgo.toISOString().split('T')[0];

    const volumeByMuscle = {};
    (state.sessionHistory || []).filter(s => !s.deletedAt && s.date >= cutoff).forEach(session => {
        (session.exercises || []).forEach(ex => {
            const exerciseName = ex.exercise || ex.name || ex.effectiveName || '';
            const exercise = (typeof defaultExercises !== 'undefined' ? defaultExercises : (state.exercises || [])).find(e => e.name === exerciseName);
            const muscle = exercise?.muscle || 'other';
            const setsData = ex.setsDetail || ex.sets || [];
            const volume = Array.isArray(setsData)
                ? setsData.reduce((sum, set) => sum + ((set.weight || 0) * (set.reps || 0)), 0)
                : 0;
            volumeByMuscle[muscle] = (volumeByMuscle[muscle] || 0) + volume;
        });
    });

    const maxVol = Math.max(1, ...Object.values(volumeByMuscle));

    if (Object.keys(volumeByMuscle).length === 0) {
        container.innerHTML = '<div style="padding: 16px; text-align: center; color: var(--text-secondary); font-size: 0.85rem;">Entraîne-toi cette semaine pour voir la heatmap</div>';
        return;
    }

    container.innerHTML = MUSCLE_HEATMAP_GROUPS.map(g => {
        const vol = volumeByMuscle[g.id] || 0;
        const intensity = vol > 0 ? Math.min(1, vol / maxVol) : 0;
        const level = intensity === 0 ? 0 : intensity < 0.25 ? 1 : intensity < 0.55 ? 2 : 3;
        return `<div class="muscle-heatmap-cell mh-level-${level}" title="${g.label}: ${Math.round(vol)} kg vol">
            <span class="muscle-heatmap-label">${g.label}</span>
            <span class="muscle-heatmap-vol">${vol > 0 ? Math.round(vol / 1000 * 10) / 10 + 't' : '—'}</span>
        </div>`;
    }).join('');
}

function initProgressSection() {
    updateProgressHero();
    renderProgressFeed();
    renderPRsSection();
    renderCoachRecommendations();
    renderProactiveInsights();
    populateProgressExerciseSelect();
    renderWeeklyVolumeChart();
    renderActivityHeatmap();
    renderMuscleWeeklyHeatmap();
    renderDashboardInsights();
    renderVolumeTelemetry();
    renderRecoveryRadar();
    checkPlateauAlert();
    if (typeof AIInsights !== 'undefined') {
        AIInsights.load();
    }
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
window.loadMoreSessions = loadMoreSessions;
window.populateProgressExerciseSelect = populateProgressExerciseSelect;
window.updateProgressChart = updateProgressChart;
window.initProgressSection = initProgressSection;
window.renderWeeklyVolumeChart = renderWeeklyVolumeChart;
window.renderMuscleVolumeChart = renderMuscleVolumeChart;
window.renderFrequencyChart = renderFrequencyChart;
window.renderMonthlyComparisonChart = renderMonthlyComparisonChart;
window.renderActivityHeatmap = renderActivityHeatmap;
window.renderProactiveInsights = renderProactiveInsights;
window.renderCardioAnalytics = renderCardioAnalytics;
window.switchCardioPeriod = switchCardioPeriod;
window.renderMuscleWeeklyHeatmap = renderMuscleWeeklyHeatmap;
window.checkForNewPR = checkForNewPR;
window.getAllPRs = getAllPRs;
window.rebuildProgressLogForSession = rebuildProgressLogForSession;
window.deleteSession = deleteSession;
window.updateSession = updateSession;
window.toggleSessionEditMode = toggleSessionEditMode;
window.deleteSetFromSession = deleteSetFromSession;
window.detectVolumePlateau = detectVolumePlateau;
window.calculateProgressionScore = calculateProgressionScore;
window.getBestExerciseOfMonth = getBestExerciseOfMonth;
window.renderDashboardInsights = renderDashboardInsights;
window.renderVolumeTelemetry = renderVolumeTelemetry;
window.renderRecoveryRadar = renderRecoveryRadar;
window.renderDeloadBanner = renderDeloadBanner;
window.checkPlateauAlert = checkPlateauAlert;

// Service Registry
if (typeof Services !== 'undefined') {
    Services.registerAll({
        checkForNewPR: checkForNewPR,
        renderCoachRecommendations: renderCoachRecommendations,
        updateSessionHistory: updateSessionHistory,
        findProgressLogs: findProgressLogs,
        renderPRsSection: renderPRsSection,
        renderWeeklyVolumeChart: renderWeeklyVolumeChart,
        renderProgressFeed: renderProgressFeed,
        updateProgressHero: updateProgressHero,
        renderDashboardInsights: renderDashboardInsights,
        checkPlateauAlert: checkPlateauAlert,
        initProgressSection: initProgressSection,
        getAllPRs: getAllPRs
    });
}

console.log('✅ progress.js: Fonctions exportées au scope global');
