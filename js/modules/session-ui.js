// ==================== SESSION UI ====================
// Interface utilisateur pour la gestion des sessions avec SessionManager
// Fonctionnalités : rendu, suppression d'exercice, copie de séance, stats temps réel

console.log('✅ session-ui.js: Module chargé');

/**
 * Charge et affiche les exercices du jour avec le nouveau système SessionManager
 * Cette fonction remplace progressivement loadSessionDay()
 */
function loadSessionDayV2() {
    const container = document.getElementById('session-exercises');
    const saveBtn = document.getElementById('save-session-btn');
    const select = document.getElementById('session-day-select');
    
    // Vérifier si les éléments existent (peuvent avoir été supprimés dans la refonte)
    if (!container || !select) {
        console.log('loadSessionDayV2: éléments non trouvés, utiliser le nouveau flow');
        return;
    }
    
    const dayIndex = parseInt(select.value);

    if (!state.selectedProgram || isNaN(dayIndex)) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🏋️</div>
                <div class="empty-state-title">Sélectionnez un programme</div>
                <p>Choisissez d'abord un type de programme dans l'onglet Programme</p>
            </div>
        `;
        saveBtn.style.display = 'none';
        return;
    }

    // Afficher un skeleton pendant le chargement
    if (window.PremiumUI && container.children.length === 0) {
        container.innerHTML = window.PremiumUI.SkeletonTemplates.exerciseList(4);
    }

    // Initialiser ou récupérer la session via SessionManager
    const session = SessionManager.getOrCreateSession(dayIndex);
    
    if (!session) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🏋️</div>
                <div class="empty-state-title">Erreur de chargement</div>
                <p>Impossible de charger la séance</p>
            </div>
        `;
        saveBtn.style.display = 'none';
        return;
    }

    // Afficher les stats en temps réel
    renderSessionStats();

    // Afficher la toolbar de session
    renderSessionToolbar(session);

    // Afficher les exercices
    container.innerHTML = session.exercises.map((exercise, exIdx) => {
        const prBadge = typeof getPRBadgeHTML === 'function' ? getPRBadgeHTML(exercise.effectiveName) : '';
        const lastLog = getLastLog(exercise.effectiveName);
        const thumbHTML = (typeof FitMedia !== 'undefined' && FitMedia.renderThumb)
            ? FitMedia.renderThumb({ id: exercise.id, name: exercise.effectiveName, muscle: exercise.muscle })
            : '';

        return `
            <div class="exercise-card"
                 data-exercise-id="${exercise.id}"
                 data-exercise="${exercise.effectiveName}"
                 data-original="${exercise.originalName}"
                 data-muscle="${exercise.muscle}"
                 data-index="${exIdx}">
                <div class="exercise-card-header" onclick="toggleExerciseAccordion(${exIdx})">
                    <div class="exercise-card-header-left">
                        <button class="exercise-drag-handle" title="Réordonner">⋮⋮</button>
                        ${thumbHTML}
                        <span class="exercise-card-toggle">▶</span>
                        <div class="exercise-card-title" onclick="event.stopPropagation(); openExerciseSwapModal('${exercise.originalName}', '${exercise.muscle}', ${exercise.targetSets}, '${exercise.targetReps}')">
                            <span class="exercise-card-name">${exercise.effectiveName}</span>
                            <span class="exercise-card-edit">✎</span>
                        </div>
                    </div>
                    <div class="exercise-card-header-right">
                        <button class="exercise-delete-btn" onclick="event.stopPropagation(); confirmDeleteExercise('${exercise.id}', '${exercise.effectiveName}')" title="Supprimer">🗑️</button>
                        <button class="exercise-warmup-btn" onclick="event.stopPropagation(); showWarmupSets('${exercise.effectiveName.replace(/'/g, "\\'")}', ${exercise.sets[0]?.weight || 0})" title="Échauffement">🔥</button>
                        <button class="exercise-history-btn" onclick="event.stopPropagation(); openExerciseTips('${exercise.effectiveName.replace(/'/g, "\\'")}')" title="Conseils">❓</button>
                        <button class="exercise-history-btn" onclick="event.stopPropagation(); openExerciseHistory('${exercise.effectiveName.replace(/'/g, "\\'")}')" title="Historique">📊</button>
                        <span class="exercise-card-target">${exercise.targetSets}×${exercise.targetReps}</span>
                        ${prBadge}
                    </div>
                </div>
                <div class="exercise-card-body">
                    ${typeof SmartTraining !== 'undefined' ? SmartTraining.renderWeightSuggestion(exercise.effectiveName, parseInt(exercise.targetReps)) : ''}
                    <div class="sets-header">
                        <span>#</span>
                        <span>Poids</span>
                        <span>Reps</span>
                        <span></span>
                    </div>
                    ${exercise.sets.map((set, setIdx) => `
                        <div class="set-row" data-set-id="${set.id}">
                            <div class="set-num">${setIdx + 1}</div>
                            <div class="set-input-group">
                                <input type="number" 
                                       class="set-weight" 
                                       value="${set.weight || ''}" 
                                       placeholder="—" 
                                       step="2.5" 
                                       min="0"
                                       onchange="handleSetUpdate('${exercise.id}', '${set.id}', 'weight', this.value)">
                                <span class="set-unit">kg</span>
                            </div>
                            <div class="set-input-group">
                                <input type="number" 
                                       class="set-reps" 
                                       value="${set.reps || ''}" 
                                       placeholder="${exercise.targetReps}" 
                                       min="0" 
                                       max="50"
                                       onchange="handleSetUpdate('${exercise.id}', '${set.id}', 'reps', this.value)">
                                <span class="set-unit">reps</span>
                            </div>
                            <button type="button" class="set-check ${set.completed ? 'checked' : ''}" onclick="handleSetComplete('${exercise.id}', '${set.id}', this)">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </button>
                            <button type="button" class="set-delete-btn" onclick="handleDeleteSet('${exercise.id}', '${set.id}')" title="Supprimer cette série">×</button>
                        </div>
                    `).join('')}
                    <button class="add-set-btn" onclick="handleAddSet('${exercise.id}')">
                        + Ajouter une série
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // Bouton d'ajout d'exercice
    container.innerHTML += `
        <button class="add-exercise-btn" onclick="openAddExerciseModal()">
            + Ajouter un exercice
        </button>
    `;

    saveBtn.style.display = 'block';
}

/**
 * Affiche la toolbar de session avec les actions de copie
 */
function renderSessionToolbar(session) {
    let toolbar = document.getElementById('session-toolbar');
    
    if (!toolbar) {
        toolbar = document.createElement('div');
        toolbar.id = 'session-toolbar';
        toolbar.className = 'session-toolbar';
        
        const container = document.getElementById('session-exercises');
        container.parentNode.insertBefore(toolbar, container);
    }
    
    // Trouver la dernière séance similaire
    const lastSimilar = state.sessionHistory.find(s => 
        (s.day || s.dayType || '') === session.dayType
    );
    const lastSimilarDate = lastSimilar ? new Date(lastSimilar.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : null;
    
    toolbar.innerHTML = `
        <div class="session-toolbar-info">
            <span class="session-toolbar-day">${session.dayType}</span>
            <span class="session-toolbar-date">${new Date(session.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        </div>
        <div class="session-toolbar-actions">
            ${lastSimilar ? `
                <button class="btn btn-secondary btn-sm" onclick="copyLastSession('${session.dayType}')">
                    📋 Copier du ${lastSimilarDate}
                </button>
            ` : ''}
            <button class="btn btn-secondary btn-sm" onclick="openCopySessionModal()">
                📁 Copier une séance...
            </button>
            <button class="btn btn-secondary btn-sm" onclick="resetCurrentSession()">
                🔄 Réinitialiser
            </button>
        </div>
    `;
}

/**
 * Affiche les stats de la session en temps réel
 */
function renderSessionStats() {
    let statsContainer = document.getElementById('session-stats-live');
    
    if (!statsContainer) {
        statsContainer = document.createElement('div');
        statsContainer.id = 'session-stats-live';
        statsContainer.className = 'session-stats-live';
        
        const container = document.getElementById('session-exercises');
        container.parentNode.insertBefore(statsContainer, container);
    }
    
    const stats = SessionManager.calculateSessionStats();
    const comparison = SessionManager.compareWithLastSession();
    
    const diffHtml = comparison?.diff ? `
        <span class="stat-diff ${comparison.diff.volumePercent >= 0 ? 'positive' : 'negative'}">
            ${comparison.diff.volumePercent >= 0 ? '+' : ''}${comparison.diff.volumePercent}%
        </span>
    ` : '';
    
    statsContainer.innerHTML = `
        <div class="live-stat">
            <span class="live-stat-value">${stats.totalVolume.toLocaleString()}</span>
            <span class="live-stat-label">Volume (kg)</span>
            ${diffHtml}
        </div>
        <div class="live-stat">
            <span class="live-stat-value">${stats.totalSets}</span>
            <span class="live-stat-label">Séries</span>
        </div>
        <div class="live-stat">
            <span class="live-stat-value">${stats.totalReps}</span>
            <span class="live-stat-label">Reps</span>
        </div>
    `;
}

// ==================== EVENT HANDLERS ====================

/**
 * Gère la mise à jour d'une série
 */
function handleSetUpdate(exerciseId, setId, field, value) {
    const numValue = field === 'weight' ? parseFloat(value) || 0 : parseInt(value) || 0;
    
    SessionManager.updateSet(exerciseId, setId, { [field]: numValue });
    
    // Mettre à jour les stats en temps réel
    renderSessionStats();
}

/**
 * Gère la validation d'une série
 */
function handleSetComplete(exerciseId, setId, btn) {
    const wasChecked = btn.classList.contains('checked');
    btn.classList.toggle('checked');
    
    // Auto-remplir les reps si vide
    const row = btn.closest('.set-row');
    const repsInput = row.querySelector('.set-reps');
    const weightInput = row.querySelector('.set-weight');
    
    if (!wasChecked && !repsInput.value) {
        repsInput.value = repsInput.placeholder;
        SessionManager.updateSet(exerciseId, setId, { reps: parseInt(repsInput.placeholder) || 0 });
    }
    
    SessionManager.updateSet(exerciseId, setId, { completed: !wasChecked });
    
    // Mettre à jour les stats
    renderSessionStats();
    
    // Audio Feedback pour set validé
    if (!wasChecked) {
        if (typeof AudioFeedback !== 'undefined') {
            // Vérifier si c'est un nouveau PR
            const exerciseCard = btn.closest('.exercise-card');
            const exerciseName = exerciseCard?.dataset?.exercise;
            const weight = parseFloat(weightInput?.value) || 0;
            const reps = parseInt(repsInput?.value) || 0;
            
            if (exerciseName && weight > 0 && reps > 0 && typeof checkForNewPR === 'function') {
                const prResult = checkForNewPR(exerciseName, weight, reps);
                if (prResult && prResult.isNewPR) {
                    AudioFeedback.playNewPR();
                    showToast('🏆 Nouveau PR !', 'success');
                } else {
                    AudioFeedback.playSetComplete();
                }
            } else {
                AudioFeedback.playSetComplete();
            }
        }
        
        // Déclencher le timer auto
        const exerciseCard = btn.closest('.exercise-card');
        if (exerciseCard && typeof startAutoTimer === 'function') {
            const exerciseName = exerciseCard.dataset.exercise;
            const targetEl = exerciseCard.querySelector('.exercise-card-target');
            const targetReps = targetEl ? targetEl.textContent.split('×')[1] : '8-10';
            startAutoTimer(exerciseName, targetReps);
        }
    }
}

/**
 * Ajoute une série à un exercice
 */
function handleAddSet(exerciseId) {
    SessionManager.addSet(exerciseId);
    loadSessionDayV2(); // Re-render
}

/**
 * Supprime une série d'un exercice
 */
function handleDeleteSet(exerciseId, setId) {
    SessionManager.deleteSet(exerciseId, setId);
    loadSessionDayV2(); // Re-render
    renderSessionStats();
}

/**
 * Confirme et supprime un exercice (avec modal custom et UNDO)
 */
async function confirmDeleteExercise(exerciseId, exerciseName) {
    // Utiliser la modal custom si disponible, sinon fallback sur confirm()
    let confirmed = false;

    if (typeof showConfirmModal === 'function') {
        confirmed = await showConfirmModal({
            title: 'Supprimer l\'exercice ?',
            message: 'Cette action supprimera l\'exercice et ses séries de la séance en cours.',
            icon: '🗑️',
            confirmLabel: 'Supprimer',
            confirmType: 'danger',
            preview: exerciseName
        });
    } else {
        confirmed = confirm(`Supprimer "${exerciseName}" de cette séance ?`);
    }

    if (confirmed) {
        // Sauvegarder les données de l'exercice pour UNDO
        const exerciseData = SessionManager.getExerciseById ?
            SessionManager.getExerciseById(exerciseId) :
            fsSession?.exercises?.find(e => e.id === exerciseId || e.uniqueId === exerciseId);

        // Supprimer l'exercice
        SessionManager.deleteExercise(exerciseId);
        loadSessionDayV2(); // Re-render

        // Enregistrer dans UndoManager si disponible et si on a les données
        if (typeof UndoManager !== 'undefined' && exerciseData) {
            UndoManager.push(
                'delete-exercise',
                exerciseData,
                (data) => {
                    // Fonction UNDO: restaurer l'exercice
                    if (SessionManager.addExerciseFromData) {
                        SessionManager.addExerciseFromData(data);
                    } else {
                        // Fallback: réajouter via la méthode standard
                        SessionManager.addExercise(data.id || data.exerciseId, data.sets);
                    }
                    loadSessionDayV2();
                },
                `${exerciseName} supprimé`
            );
        } else {
            showToast(`${exerciseName} supprimé`, 'success');
        }
    }
}

/**
 * Copie la dernière séance du même type (avec modal custom)
 */
async function copyLastSession(dayType) {
    let confirmed = false;

    if (typeof showConfirmModal === 'function') {
        confirmed = await showConfirmModal({
            title: 'Copier la séance précédente ?',
            message: 'Les données actuelles seront remplacées par celles de votre dernière séance du même type.',
            icon: '📋',
            confirmLabel: 'Copier',
            confirmType: 'primary',
            preview: dayType
        });
    } else {
        confirmed = confirm('Copier les poids de la dernière séance ? Les données actuelles seront remplacées.');
    }

    if (confirmed) {
        const session = SessionManager.copyLastSessionOfType(dayType);
        if (session) {
            loadSessionDayV2();
            showToast('Séance copiée !', 'success');
        } else {
            showToast('Aucune séance précédente trouvée', 'error');
        }
    }
}

/**
 * Réinitialise la session courante (avec modal custom)
 */
async function resetCurrentSession() {
    let confirmed = false;

    if (typeof showConfirmModal === 'function') {
        confirmed = await showConfirmModal({
            title: 'Réinitialiser la séance ?',
            message: 'Toutes les données non sauvegardées seront perdues. Cette action est irréversible.',
            icon: '⚠️',
            confirmLabel: 'Réinitialiser',
            confirmType: 'danger'
        });
    } else {
        confirmed = confirm('Réinitialiser cette séance ? Toutes les données non sauvegardées seront perdues.');
    }

    if (confirmed) {
        const selectEl = document.getElementById('session-day-select');
        const dayIndex = selectEl ? parseInt(selectEl.value) : 0;
        SessionManager.clearActiveSession();
        SessionManager.initSession(dayIndex);
        loadSessionDayV2();
        showToast('Séance réinitialisée', 'success');
    }
}

/**
 * Ouvre la modale de copie de séance
 */
function openCopySessionModal() {
    let modal = document.getElementById('copy-session-modal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'copy-session-modal';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }
    
    // Grouper les séances par semaine
    const sessionsByWeek = groupSessionsByWeek(state.sessionHistory.slice(0, 30));
    
    modal.innerHTML = `
        <div class="modal" style="max-width: 500px;">
            <div class="modal-header">
                <div class="modal-title">📋 Copier une séance</div>
                <button class="modal-close" onclick="closeModal('copy-session-modal')">&times;</button>
            </div>
            <div class="modal-body">
                <p style="color: var(--text-muted); margin-bottom: 15px;">
                    Sélectionnez une séance pour copier ses poids
                </p>
                <div class="copy-session-list">
                    ${Object.entries(sessionsByWeek).map(([week, sessions]) => `
                        <div class="copy-session-week">
                            <div class="copy-session-week-title">${week}</div>
                            ${sessions.map(session => `
                                <div class="copy-session-item" onclick="selectSessionToCopy('${session.id || session.timestamp}')">
                                    <div class="copy-session-item-info">
                                        <span class="copy-session-day">${session.day || session.dayType || 'Séance'}</span>
                                        <span class="copy-session-date">${new Date(session.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                                    </div>
                                    <span class="copy-session-count">${session.exercises?.length || 0} ex.</span>
                                </div>
                            `).join('')}
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    
    openModal('copy-session-modal');
}

/**
 * Groupe les séances par semaine
 */
function groupSessionsByWeek(sessions) {
    const weeks = {};
    const now = new Date();
    
    sessions.forEach(session => {
        const sessionDate = new Date(session.date);
        const diffDays = Math.floor((now - sessionDate) / (1000 * 60 * 60 * 24));
        
        let weekLabel;
        if (diffDays < 7) {
            weekLabel = 'Cette semaine';
        } else if (diffDays < 14) {
            weekLabel = 'Semaine dernière';
        } else if (diffDays < 21) {
            weekLabel = 'Il y a 2 semaines';
        } else if (diffDays < 28) {
            weekLabel = 'Il y a 3 semaines';
        } else {
            weekLabel = 'Plus ancien';
        }
        
        if (!weeks[weekLabel]) weeks[weekLabel] = [];
        weeks[weekLabel].push(session);
    });
    
    return weeks;
}

/**
 * Sélectionne une séance à copier
 */
function selectSessionToCopy(sessionId) {
    closeModal('copy-session-modal');
    
    const session = SessionManager.copySession(sessionId);
    if (session) {
        loadSessionDayV2();
        showToast('Séance copiée !', 'success');
    } else {
        showToast('Erreur lors de la copie', 'error');
    }
}

/**
 * Ouvre la modale pour ajouter un exercice
 */
function openAddExerciseModal() {
    let modal = document.getElementById('add-exercise-modal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'add-exercise-modal';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div class="modal" style="max-width: 500px; max-height: 80vh;">
            <div class="modal-header">
                <div class="modal-title">➕ Ajouter un exercice</div>
                <button class="modal-close" onclick="closeModal('add-exercise-modal')">&times;</button>
            </div>
            <div class="modal-body" style="max-height: 60vh; overflow-y: auto;">
                <div class="form-group">
                    <input type="text" id="add-exercise-search" placeholder="Rechercher un exercice..." class="form-input"
                        oninput="filterAddExerciseList()" autofocus>
                </div>
                <div id="add-exercise-list">
                    <p class="add-exercise-hint">Tapez pour rechercher parmi ${state.exercises.length} exercices</p>
                </div>
            </div>
        </div>
    `;

    openModal('add-exercise-modal');
    // Auto-focus search
    setTimeout(() => {
        const input = document.getElementById('add-exercise-search');
        if (input) input.focus();
    }, 150);
}

/**
 * Normalise une chaîne pour la recherche (accents + ligatures)
 */
function normalizeForExerciseSearch(str) {
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/œ/g, 'oe')
        .replace(/æ/g, 'ae');
}

/**
 * Filtre la liste d'exercices à ajouter — lazy render (virtualisé)
 */
function filterAddExerciseList() {
    const rawSearch = document.getElementById('add-exercise-search')?.value || '';
    const search = normalizeForExerciseSearch(rawSearch);
    const container = document.getElementById('add-exercise-list');
    if (!container) return;

    const MAX_RESULTS = 40;

    if (search.length < 1) {
        container.innerHTML = `<p class="add-exercise-hint">Tapez pour rechercher parmi ${state.exercises.length} exercices</p>`;
        return;
    }

    const results = state.exercises.filter(ex =>
        normalizeForExerciseSearch(ex.name).includes(search)
    ).slice(0, MAX_RESULTS);

    if (results.length === 0) {
        container.innerHTML = '<p class="add-exercise-hint" style="color:var(--text-muted)">Aucun exercice trouvé</p>';
        return;
    }

    // Group by muscle — only groups with results
    const byMuscle = {};
    results.forEach(ex => {
        const m = ex.muscle || 'other';
        if (!byMuscle[m]) byMuscle[m] = [];
        byMuscle[m].push(ex);
    });

    container.innerHTML = Object.entries(byMuscle).map(([muscle, exercises]) => `
        <div class="add-exercise-group" data-muscle="${muscle}">
            <div class="add-exercise-group-title">${muscleGroups[muscle]?.name || muscle}</div>
            ${exercises.map(ex => `
                <div class="add-exercise-item" onclick="addExerciseToSession('${ex.id}')">
                    <span>${ex.name}</span>
                    <span class="add-exercise-equip">${equipmentTypes[ex.equipment] || ''}</span>
                </div>
            `).join('')}
        </div>
    `).join('');
}

/**
 * Ajoute un exercice à la session active
 */
function addExerciseToSession(exerciseId) {
    const exercise = state.exercises.find(e => e.id === exerciseId);
    if (!exercise) return;
    
    SessionManager.addExercise({
        name: exercise.name,
        effectiveName: exercise.name,
        muscle: exercise.muscle,
        sets: 3,
        reps: '10-12'
    });
    
    closeModal('add-exercise-modal');
    loadSessionDayV2();
    showToast(`${exercise.name} ajouté !`, 'success');
}

/**
 * Sauvegarde la session avec le nouveau système
 */
async function saveSessionV2() {
    const btn = document.querySelector('#save-session-btn .btn-primary') ||
                document.querySelector('#save-session-btn button');

    // Activer l'état loading
    if (btn) {
        btn.classList.add('loading');
        btn.disabled = true;
    }

    // Afficher l'indicateur d'autosave
    if (typeof AutosaveIndicator !== 'undefined') {
        AutosaveIndicator.showSaving();
    }

    try {
        const result = SessionManager.finalizeSession();

        if (!result) {
            showToast('Remplissez au moins une série pour sauvegarder', 'error');
            if (typeof AutosaveIndicator !== 'undefined') {
                AutosaveIndicator.hide();
            }
            return;
        }

        // Petit délai pour feedback visuel
        await new Promise(resolve => setTimeout(resolve, 300));

        // Mettre à jour l'UI
        if (typeof updateStreak === 'function') updateStreak();
        if (typeof updateProgressionRecommendations === 'function') updateProgressionRecommendations();
        if (typeof updateProgressionAnalysis === 'function') updateProgressionAnalysis();
        if (typeof renderPRsSection === 'function') renderPRsSection();
        updateSessionHistory();
        populateProgressExerciseSelect();

        // Afficher l'état "Sauvegardé"
        if (typeof AutosaveIndicator !== 'undefined') {
            AutosaveIndicator.showSaved();
        }

        // Afficher notification PR si nécessaire
        if (result.newPRs && result.newPRs.length > 0) {
            showPRNotification(result.newPRs);
        } else {
            showToast('Séance enregistrée ! 💪', 'success');
        }

        // Afficher les recommandations du coach après quelques secondes
        setTimeout(() => {
            if (typeof showCoachRecommendationsToast === 'function') {
                showCoachRecommendationsToast();
            }
        }, 2000);

        // Réinitialiser la vue
        loadSessionDayV2();

    } catch (error) {
        console.error('Erreur sauvegarde session:', error);
        if (typeof AutosaveIndicator !== 'undefined') {
            AutosaveIndicator.showError();
        }
        showToast('Erreur lors de la sauvegarde', 'error');
    } finally {
        // Désactiver l'état loading
        if (btn) {
            btn.classList.remove('loading');
            btn.disabled = false;
        }
    }
}

// ==================== DRAG & DROP (Mobile-friendly) ====================

let draggedExercise = null;
let touchStartY = 0;

/**
 * Initialise le drag & drop pour les exercices
 */
function initExerciseDragDrop() {
    const container = document.getElementById('session-exercises');
    if (!container) return;

    // Touch events pour mobile
    // FIX: touchstart passif par défaut, touchmove ajouté seulement pendant le drag
    container.addEventListener('touchstart', handleDragStart, { passive: true });
    container.addEventListener('touchend', handleDragEnd);

    // Mouse events pour desktop
    container.addEventListener('mousedown', handleDragStart);
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
}

function handleDragStart(e) {
    const handle = e.target.closest('.exercise-drag-handle');
    if (!handle) return;

    // Pour mouse events, on peut preventDefault
    if (!e.touches) {
        e.preventDefault();
    }

    const card = handle.closest('.exercise-card');
    if (!card) return;

    draggedExercise = card;
    card.classList.add('dragging');

    touchStartY = e.touches ? e.touches[0].clientY : e.clientY;

    // FIX: Ajouter le listener touchmove non-passif seulement pendant le drag
    if (e.touches) {
        const container = document.getElementById('session-exercises');
        container.addEventListener('touchmove', handleDragMove, { passive: false });
    }
}

function handleDragMove(e) {
    // FIX: Seulement bloquer le scroll si on est vraiment en train de drag
    if (!draggedExercise) return;

    // Seulement maintenant qu'on sait qu'on drag, on peut bloquer le scroll
    e.preventDefault();
    
    const currentY = e.touches ? e.touches[0].clientY : e.clientY;
    const container = document.getElementById('session-exercises');
    const cards = Array.from(container.querySelectorAll('.exercise-card:not(.dragging)'));
    
    // Trouver la position d'insertion
    for (const card of cards) {
        const rect = card.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        
        if (currentY < midY) {
            container.insertBefore(draggedExercise, card);
            break;
        } else if (card === cards[cards.length - 1]) {
            container.insertBefore(draggedExercise, card.nextSibling);
        }
    }
}

function handleDragEnd(e) {
    if (!draggedExercise) return;

    // FIX: Retirer le listener touchmove à la fin du drag
    const container = document.getElementById('session-exercises');
    if (container) {
        container.removeEventListener('touchmove', handleDragMove);
    }

    draggedExercise.classList.remove('dragging');

    // Calculer la nouvelle position (réutiliser container déjà déclaré)
    const cards = Array.from(container.querySelectorAll('.exercise-card'));
    const newIndex = cards.indexOf(draggedExercise);
    const exerciseId = draggedExercise.dataset.exerciseId;
    
    if (exerciseId && newIndex >= 0) {
        SessionManager.reorderExercise(exerciseId, newIndex);
    }
    
    draggedExercise = null;
}

// ==================== LISTEN TO SESSION UPDATES ====================

document.addEventListener('session-update', (e) => {
    const { type, data } = e.detail;
    
    switch (type) {
        case 'exercise-deleted':
        case 'exercise-added':
        case 'exercise-reordered':
            // Re-render si nécessaire
            renderSessionStats();
            break;
            
        case 'set-updated':
            renderSessionStats();
            break;
            
        case 'session-finalized':
            console.log('Session finalisée:', data.session);
            break;
    }
});

// ==================== INIT ====================

// Initialiser le drag & drop quand le DOM est prêt
document.addEventListener('DOMContentLoaded', () => {
    // Attendre un peu que les autres modules soient chargés
    setTimeout(initExerciseDragDrop, 500);
});
