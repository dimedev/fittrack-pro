// ==================== TRAINING MODULE ====================

// Variables pour le swap d'exercice
let exerciseSwapTarget = null;
let currentEquipmentFilter = 'all';

// Obtenir le nom d'exercice effectif (après swap éventuel)
function getEffectiveExerciseName(originalName, muscle) {
    const swapKey = `${originalName}`;
    if (state.exerciseSwaps && state.exerciseSwaps[swapKey]) {
        const swappedExercise = state.exercises.find(e => e.id === state.exerciseSwaps[swapKey]);
        if (swappedExercise) {
            return swappedExercise.name;
        }
    }
    return originalName;
}

// Afficher les types de programmes
function renderProgramTypes() {
    const container = document.getElementById('program-types');

    container.innerHTML = Object.entries(trainingPrograms).map(([id, program]) => `
        <div class="program-card ${state.selectedProgram === id ? 'selected' : ''}" onclick="selectProgram('${id}')">
            <div class="program-icon">${program.icon}</div>
            <div class="program-name">${program.name}</div>
            <div class="program-desc">${program.description}</div>
            <div class="program-days">${program.minDays}-${program.maxDays} jours/semaine</div>
        </div>
    `).join('');
}

function selectProgram(programId) {
    state.selectedProgram = programId;
    const program = trainingPrograms[programId];

    // Ajuster les jours d'entraînement si nécessaire
    if (state.trainingDays < program.minDays) {
        state.trainingDays = program.minDays;
        document.getElementById('training-days').value = state.trainingDays;
    }
    if (state.trainingDays > program.maxDays) {
        state.trainingDays = program.maxDays;
        document.getElementById('training-days').value = state.trainingDays;
    }

    saveState();
    
    // Sync avec Supabase si connecté
    if (typeof isLoggedIn === 'function' && isLoggedIn()) {
        saveTrainingSettingsToSupabase();
    }
    
    renderProgramTypes();
    updateWeeklySchedule();
    populateSessionDaySelect();
    updateDashboard();
    showToast(`Programme ${program.name} sélectionné !`, 'success');
}

function updateTrainingDays() {
    state.trainingDays = parseInt(document.getElementById('training-days').value);

    // Validation selon le programme sélectionné
    if (state.selectedProgram) {
        const program = trainingPrograms[state.selectedProgram];
        if (state.trainingDays < program.minDays || state.trainingDays > program.maxDays) {
            showToast(`Ce programme nécessite ${program.minDays}-${program.maxDays} jours`, 'error');
            state.trainingDays = Math.min(Math.max(state.trainingDays, program.minDays), program.maxDays);
            document.getElementById('training-days').value = state.trainingDays;
        }
    }

    saveState();
    
    // Sync avec Supabase si connecté
    if (typeof isLoggedIn === 'function' && isLoggedIn()) {
        saveTrainingSettingsToSupabase();
    }
    
    updateWeeklySchedule();
    populateSessionDaySelect();
    updateDashboard();
}

function updateWeeklySchedule() {
    const container = document.getElementById('weekly-schedule');

    if (!state.selectedProgram) {
        container.innerHTML = `
            <div class="empty-state" style="padding: 40px 20px;">
                <div class="empty-state-icon">📋</div>
                <div class="empty-state-title">Aucun programme sélectionné</div>
                <p>Choisissez un programme ci-dessus pour voir votre planning</p>
            </div>
        `;
        return;
    }

    const program = trainingPrograms[state.selectedProgram];

    // Vérifier si le programme existe (peut avoir été supprimé ou être un programme IA non persisté)
    if (!program) {
        // Réinitialiser le programme sélectionné
        state.selectedProgram = null;
        saveState();
        container.innerHTML = `
            <div class="empty-state" style="padding: 40px 20px;">
                <div class="empty-state-icon">📋</div>
                <div class="empty-state-title">Programme non trouvé</div>
                <p>Choisissez un programme ci-dessus pour voir votre planning</p>
            </div>
        `;
        return;
    }

    const split = program.splits[state.trainingDays];

    if (!split) {
        container.innerHTML = '<p style="color: var(--text-muted);">Configuration non disponible</p>';
        return;
    }

    container.innerHTML = `
        <div class="workout-grid">
            ${split.map((dayType, idx) => {
                const exercises = program.exercises[dayType] || [];
                return `
                    <div class="workout-day-card">
                        <div class="workout-day-header">
                            <div class="workout-day-number">J${idx + 1}</div>
                            <div class="workout-day-info">
                                <span class="workout-day-type">${dayType}</span>
                                <span class="workout-day-count">${exercises.length} exercices</span>
                            </div>
                        </div>
                        <div class="workout-day-exercises">
                            ${exercises.map(ex => {
                                const effectiveName = getEffectiveExerciseName(ex.name, ex.muscle);
                                const isSwapped = effectiveName !== ex.name;
                                return `
                                    <div class="workout-exercise" onclick="openExerciseSwapModal('${ex.name}', '${ex.muscle}', ${ex.sets}, '${ex.reps}')">
                                        <div class="workout-exercise-name">
                                            ${effectiveName}
                                            ${isSwapped ? '<span class="swap-indicator">✎</span>' : ''}
                                        </div>
                                        <div class="workout-exercise-detail">${ex.sets}×${ex.reps}</div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function toggleWorkoutDay(header) {
    const content = header.nextElementSibling;
    const isHidden = content.style.display === 'none';
    content.style.display = isHidden ? 'block' : 'none';

    // Mettre à jour l'icône
    const icon = header.querySelector('span:last-child');
    icon.textContent = `${content.querySelectorAll('.exercise-item').length} exercices ${isHidden ? '▲' : '▼'}`;
}

function populateSessionDaySelect() {
    const select = document.getElementById('session-day-select');

    if (!state.selectedProgram) {
        select.innerHTML = '<option value="">Choisir un programme d\'abord</option>';
        return;
    }

    const program = trainingPrograms[state.selectedProgram];
    
    // Vérifier si le programme existe
    if (!program) {
        select.innerHTML = '<option value="">Programme non trouvé</option>';
        return;
    }
    
    const split = program.splits[state.trainingDays];

    if (!split) {
        select.innerHTML = '<option value="">Configuration invalide</option>';
        return;
    }

    select.innerHTML = split.map((dayType, idx) =>
        `<option value="${idx}">Jour ${idx + 1} - ${dayType}</option>`
    ).join('');

    loadSessionDay();
}

function loadSessionDay() {
    const container = document.getElementById('session-exercises');
    const saveBtn = document.getElementById('save-session-btn');
    const select = document.getElementById('session-day-select');
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

    const program = trainingPrograms[state.selectedProgram];

    // Vérifier si le programme existe
    if (!program) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🏋️</div>
                <div class="empty-state-title">Programme non trouvé</div>
                <p>Sélectionnez un programme dans l'onglet Programme</p>
            </div>
        `;
        saveBtn.style.display = 'none';
        return;
    }

    const split = program.splits[state.trainingDays];

    if (!split || !split[dayIndex]) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🏋️</div>
                <div class="empty-state-title">Configuration invalide</div>
                <p>Vérifiez les paramètres du programme</p>
            </div>
        `;
        saveBtn.style.display = 'none';
        return;
    }

    const dayType = split[dayIndex];
    const exercises = program.exercises[dayType] || [];

    container.innerHTML = exercises.map((ex, exIdx) => {
        const effectiveName = getEffectiveExerciseName(ex.name, ex.muscle);
        const lastLog = getLastLog(effectiveName);
        
        // Vérifier s'il y a une suggestion de progression IA
        const suggestedByAI = state.progressionSuggestions?.[effectiveName];
        const suggestedWeight = suggestedByAI || (lastLog ? lastLog.weight : '');
        const hasSuggestion = suggestedByAI && suggestedByAI !== lastLog?.weight;
        
        const targetReps = ex.reps;
        const numSets = ex.sets;
        
        // Obtenir le badge PR pour cet exercice
        const prBadge = typeof getPRBadgeHTML === 'function' ? getPRBadgeHTML(effectiveName) : '';
        
        // Générer les lignes pour chaque série
        let setsHtml = '';
        for (let i = 1; i <= numSets; i++) {
            setsHtml += `
                <div class="set-row">
                    <div class="set-num">${i}</div>
                    <div class="set-input-group">
                        <input type="number" class="set-weight" value="${suggestedWeight}" placeholder="—" step="2.5" min="0" ${hasSuggestion ? 'style="border-color: var(--success);"' : ''}>
                        <span class="set-unit">kg</span>
                    </div>
                    <div class="set-input-group">
                        <input type="number" class="set-reps" placeholder="${targetReps}" min="0" max="50">
                        <span class="set-unit">reps</span>
                    </div>
                    <button type="button" class="set-check" onclick="toggleSetCheck(this)">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </button>
                </div>
            `;
        }
        
        return `
            <div class="exercise-card" data-exercise="${effectiveName}" data-original="${ex.name}" data-muscle="${ex.muscle}" data-index="${exIdx}">
                <div class="exercise-card-header" onclick="toggleExerciseAccordion(${exIdx})">
                    <div class="exercise-card-header-left">
                        <span class="exercise-card-toggle">▶</span>
                        <div class="exercise-card-title" onclick="event.stopPropagation(); openExerciseSwapModal('${ex.name}', '${ex.muscle}', ${ex.sets}, '${ex.reps}')">
                            <span class="exercise-card-name">${effectiveName}</span>
                            <span class="exercise-card-edit">✎</span>
                        </div>
                    </div>
                    <div class="exercise-card-header-right">
                        <button class="exercise-warmup-btn" onclick="event.stopPropagation(); showWarmupSets('${effectiveName.replace(/'/g, "\\'")}', ${suggestedWeight || 0})" title="Échauffement">🔥</button>
                        <button class="exercise-history-btn" onclick="event.stopPropagation(); openExerciseTips('${effectiveName.replace(/'/g, "\\'")}')" title="Conseils">❓</button>
                        <button class="exercise-history-btn" onclick="event.stopPropagation(); openExerciseHistory('${effectiveName.replace(/'/g, "\\'")}')" title="Historique">📊</button>
                        <span class="exercise-card-target">${numSets}×${targetReps}</span>
                        ${prBadge}
                    </div>
                </div>
                <div class="exercise-card-body">
                    ${hasSuggestion ? `
                        <div style="padding: 8px 12px; background: rgba(34, 197, 94, 0.1); border-radius: var(--radius-sm); margin-bottom: 10px; font-size: 0.85rem;">
                            💡 <strong>Suggestion IA:</strong> ${suggestedByAI}kg (${lastLog ? '+' + (suggestedByAI - lastLog.weight) + 'kg' : 'nouveau poids'})
                        </div>
                    ` : ''}
                    <div class="sets-header">
                        <span>#</span>
                        <span>Poids</span>
                        <span>Reps</span>
                        <span></span>
                    </div>
                    ${setsHtml}
                </div>
            </div>
        `;
    }).join('');

    saveBtn.style.display = 'block';
}

// Toggle accordéon exercice
function toggleExerciseAccordion(index) {
    const card = document.querySelector(`.exercise-card[data-index="${index}"]`);
    if (card) {
        card.classList.toggle('open');
    }
}

function toggleSetCheck(btn) {
    const wasChecked = btn.classList.contains('checked');
    btn.classList.toggle('checked');
    
    // Si on coche, on peut auto-remplir les reps si vide
    const row = btn.closest('.set-row');
    const repsInput = row.querySelector('.set-reps');
    if (btn.classList.contains('checked') && !repsInput.value) {
        repsInput.value = repsInput.placeholder;
    }
    
    // Déclencher le timer auto si on vient de cocher (pas décocher)
    if (!wasChecked && btn.classList.contains('checked')) {
        // Récupérer les infos de l'exercice
        const exerciseCard = btn.closest('.exercise-card');
        if (exerciseCard) {
            const exerciseName = exerciseCard.dataset.exercise;
            const targetEl = exerciseCard.querySelector('.exercise-card-target');
            let targetReps = '8-10'; // Défaut
            
            if (targetEl) {
                // Extraire les reps du texte "Objectif: 4×8-10"
                const match = targetEl.textContent.match(/×(.+)/);
                if (match) {
                    targetReps = match[1].trim();
                }
            }
            
            // Démarrer le timer auto
            if (typeof startAutoTimer === 'function') {
                startAutoTimer(exerciseName, targetReps);
            }
        }
    }
}

// ==================== SWAP EXERCICE ====================

function openExerciseSwapModal(originalName, muscle, sets, reps) {
    exerciseSwapTarget = { originalName, muscle, sets, reps };
    currentEquipmentFilter = 'all';

    // Obtenir le nom effectif actuel
    const effectiveName = getEffectiveExerciseName(originalName, muscle);

    // Remplir la modale
    document.getElementById('swap-exercise-current').textContent = effectiveName;
    document.getElementById('swap-exercise-muscle').textContent = `(${muscleGroups[muscle]?.name || muscle})`;
    document.getElementById('swap-exercise-search').value = '';

    // Pré-sélectionner le muscle dans le modal custom si ouvert après
    if (document.getElementById('custom-exercise-muscle')) {
        document.getElementById('custom-exercise-muscle').value = muscle;
    }

    // Reset les filtres
    document.querySelectorAll('.filter-equip').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.equip === 'all');
    });

    // Afficher les exercices disponibles pour ce muscle
    displayExercisesForSwap();

    openModal('swap-exercise-modal');
}

function displayExercisesForSwap() {
    const container = document.getElementById('swap-exercise-results');
    const searchTerm = document.getElementById('swap-exercise-search')?.value?.toLowerCase() || '';
    const muscle = exerciseSwapTarget.muscle;

    // Filtrer les exercices par muscle et équipement
    let filtered = state.exercises.filter(ex => ex.muscle === muscle);

    // Filtre par équipement
    if (currentEquipmentFilter !== 'all') {
        filtered = filtered.filter(ex => ex.equipment === currentEquipmentFilter);
    }

    // Filtre par recherche
    if (searchTerm.length > 0) {
        filtered = filtered.filter(ex => ex.name.toLowerCase().includes(searchTerm));
    }

    if (filtered.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">Aucun exercice trouvé</p>';
        return;
    }

    // Grouper par équipement
    const byEquipment = {};
    filtered.forEach(ex => {
        const equip = ex.equipment || 'other';
        if (!byEquipment[equip]) byEquipment[equip] = [];
        byEquipment[equip].push(ex);
    });

    container.innerHTML = Object.entries(byEquipment).map(([equip, exercises]) => `
        <div style="margin-bottom: 15px;">
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 8px; text-transform: uppercase;">
                ${equipmentTypes[equip] || equip}
            </p>
            ${exercises.map(ex => {
                const isCustom = !defaultExercises.find(de => de.id === ex.id);
                const isCurrentSwap = state.exerciseSwaps[exerciseSwapTarget.originalName] === ex.id;
                return `
                    <div class="food-search-item ${isCurrentSwap ? 'selected' : ''}" 
                         onclick="selectExerciseSwap('${ex.id}')"
                         style="${isCurrentSwap ? 'border: 1px solid var(--accent-primary); background: var(--accent-glow);' : ''}">
                        <div>
                            <strong>${ex.name}</strong>
                            ${isCustom ? '<span style="color: var(--warning); font-size: 0.75rem; margin-left: 5px;">★ Perso</span>' : ''}
                            ${isCurrentSwap ? '<span style="color: var(--accent-primary); font-size: 0.75rem; margin-left: 5px;">✓ Actuel</span>' : ''}
                        </div>
                        <span style="color: var(--text-muted); font-size: 0.8rem;">${equipmentTypes[ex.equipment] || ''}</span>
                    </div>
                `;
            }).join('')}
        </div>
    `).join('');
}

function searchExercisesForSwap() {
    displayExercisesForSwap();
}

function filterExercisesByEquipment(equipment) {
    currentEquipmentFilter = equipment;

    // Mettre à jour les boutons actifs
    document.querySelectorAll('.filter-equip').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.equip === equipment);
    });

    displayExercisesForSwap();
}

function selectExerciseSwap(exerciseId) {
    const exercise = state.exercises.find(e => e.id === exerciseId);
    if (!exercise) return;

    const originalName = exerciseSwapTarget.originalName;

    // Si c'est l'exercice original, supprimer le swap
    const originalExercise = defaultExercises.find(e => e.name === originalName);
    if (originalExercise && originalExercise.id === exerciseId) {
        delete state.exerciseSwaps[originalName];
        showToast(`Retour à l'exercice original`, 'success');
    } else {
        // Sauvegarder le swap
        state.exerciseSwaps[originalName] = exerciseId;
        showToast(`${originalName} remplacé par ${exercise.name}`, 'success');
    }

    saveState();
    closeModal('swap-exercise-modal');

    // Rafraîchir les vues
    updateWeeklySchedule();
    loadSessionDay();
}

// ==================== EXERCICE PERSONNALISÉ ====================

function openCustomExerciseModal() {
    document.getElementById('custom-exercise-name').value = '';

    // Pré-sélectionner le muscle du swap en cours
    if (exerciseSwapTarget && exerciseSwapTarget.muscle) {
        document.getElementById('custom-exercise-muscle').value = exerciseSwapTarget.muscle;
    }

    document.getElementById('custom-exercise-equipment').value = 'machine';

    openModal('custom-exercise-modal');
}

function saveCustomExercise() {
    const name = document.getElementById('custom-exercise-name').value.trim();
    const muscle = document.getElementById('custom-exercise-muscle').value;
    const equipment = document.getElementById('custom-exercise-equipment').value;

    if (!name) {
        showToast('Nom requis', 'error');
        return;
    }

    // Vérifier si un exercice avec ce nom existe déjà
    if (state.exercises.find(e => e.name.toLowerCase() === name.toLowerCase())) {
        showToast('Un exercice avec ce nom existe déjà', 'error');
        return;
    }

    const newExercise = {
        id: 'custom-' + Date.now(),
        name,
        muscle,
        equipment
    };

    state.exercises.push(newExercise);
    saveState();

    closeModal('custom-exercise-modal');

    // Rafraîchir la liste dans le modal de swap
    displayExercisesForSwap();

    showToast(`Exercice "${name}" ajouté !`, 'success');
}

// ==================== LOGS & SESSION ====================

function getLastLog(exerciseName) {
    const logs = state.progressLog[exerciseName];
    if (!logs || logs.length === 0) return null;
    return logs[logs.length - 1];
}

function saveSession() {
    const exerciseCards = document.querySelectorAll('.exercise-card');
    const today = new Date().toISOString().split('T')[0];
    const sessionData = [];
    let hasData = false;
    const newPRs = []; // Collecter les nouveaux PRs

    exerciseCards.forEach(card => {
        const exerciseName = card.dataset.exercise;
        const setRows = card.querySelectorAll('.set-row');
        const setsData = [];

        setRows.forEach((row, idx) => {
            const weight = parseFloat(row.querySelector('.set-weight').value) || 0;
            const reps = parseInt(row.querySelector('.set-reps').value) || 0;
            const completed = row.querySelector('.set-check').classList.contains('checked');

            if (weight > 0 || reps > 0 || completed) {
                hasData = true;
                setsData.push({
                    setNumber: idx + 1,
                    weight,
                    reps,
                    completed
                });

                // Vérifier si c'est un nouveau PR (avant d'ajouter au log)
                if (weight > 0 && reps > 0 && typeof checkForNewPR === 'function') {
                    const prCheck = checkForNewPR(exerciseName, weight, reps);
                    if (prCheck.isNewPR && !newPRs.find(p => p.exercise === exerciseName && p.types.includes('weight'))) {
                        newPRs.push({
                            exercise: exerciseName,
                            ...prCheck
                        });
                    }
                }
            }
        });

        if (setsData.length > 0) {
            // Sauvegarder dans le log de progression
            if (!state.progressLog[exerciseName]) {
                state.progressLog[exerciseName] = [];
            }

            // Calculer les moyennes pour le log
            const avgWeight = setsData.reduce((sum, s) => sum + s.weight, 0) / setsData.length;
            const totalReps = setsData.reduce((sum, s) => sum + s.reps, 0);
            const completedSets = setsData.filter(s => s.completed).length;

            state.progressLog[exerciseName].push({
                date: today,
                sets: setsData.length,
                weight: Math.round(avgWeight * 10) / 10,
                achievedReps: totalReps,
                achievedSets: completedSets,
                setsDetail: setsData
            });

            sessionData.push({
                exercise: exerciseName,
                sets: setsData
            });
        }
    });

    if (!hasData) {
        showToast('Remplissez au moins une série pour sauvegarder', 'error');
        return;
    }

    // Sauvegarder la séance dans l'historique
    state.sessionHistory.unshift({
        date: today,
        timestamp: Date.now(),
        program: state.selectedProgram,
        day: document.getElementById('session-day-select').selectedOptions[0].text,
        exercises: sessionData
    });

    // Garder seulement les 100 dernières séances
    state.sessionHistory = state.sessionHistory.slice(0, 100);

    saveState();

    // Mettre à jour le streak
    if (typeof updateStreak === 'function') {
        updateStreak();
    }

    // Mettre à jour les recommandations
    if (typeof updateProgressionRecommendations === 'function') {
        updateProgressionRecommendations();
    }

    // Mettre à jour l'analyse de progression
    if (typeof updateProgressionAnalysis === 'function') {
        updateProgressionAnalysis();
    }

    // Mettre à jour la section PRs
    if (typeof renderPRsSection === 'function') {
        renderPRsSection();
    }

    updateSessionHistory();
    populateProgressExerciseSelect();

    // Réinitialiser les champs
    exerciseCards.forEach(card => {
        card.querySelectorAll('.set-weight').forEach(input => input.value = '');
        card.querySelectorAll('.set-reps').forEach(input => input.value = '');
        card.querySelectorAll('.set-check').forEach(btn => btn.classList.remove('checked'));
    });

    // Afficher les notifications de nouveaux PRs
    if (newPRs.length > 0) {
        // Afficher la notification PR en premier
        showPRNotification(newPRs);
    } else {
        showToast('Séance enregistrée ! 💪', 'success');
    }
}

/**
 * Affiche une notification spectaculaire pour les nouveaux PRs
 */
function showPRNotification(prs) {
    // Créer la notification
    let notif = document.getElementById('pr-notification');
    if (!notif) {
        notif = document.createElement('div');
        notif.id = 'pr-notification';
        notif.className = 'pr-notification';
        document.body.appendChild(notif);
    }

    // Construire le message
    if (prs.length === 1) {
        notif.innerHTML = `<span class="pr-icon">🏆</span>${prs[0].message}`;
    } else {
        notif.innerHTML = `<span class="pr-icon">🏆</span>${prs.length} NOUVEAUX RECORDS !`;
    }

    // Animer
    setTimeout(() => notif.classList.add('show'), 50);

    // Masquer après 4 secondes
    setTimeout(() => {
        notif.classList.remove('show');
        // Ensuite afficher le toast normal
        setTimeout(() => {
            showToast('Séance enregistrée ! 💪', 'success');
        }, 500);
    }, 4000);
}

// ==================== HISTORIQUE EXERCICE ====================

let exerciseHistoryChart = null;

function openExerciseHistory(exerciseName) {
    const logs = state.progressLog[exerciseName] || [];
    
    // Créer/afficher le modal
    let modal = document.getElementById('exercise-history-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'exercise-history-modal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal" style="max-width: 600px;">
                <div class="modal-header">
                    <div class="modal-title" id="exercise-history-title">Historique</div>
                    <button class="modal-close" onclick="closeModal('exercise-history-modal')">&times;</button>
                </div>
                <div class="modal-body" id="exercise-history-content"></div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    document.getElementById('exercise-history-title').textContent = `📊 ${exerciseName}`;
    
    const content = document.getElementById('exercise-history-content');
    
    if (logs.length === 0) {
        content.innerHTML = `
            <div class="empty-state" style="padding: 40px 20px;">
                <div class="empty-state-icon">📊</div>
                <div class="empty-state-title">Pas encore d'historique</div>
                <p>Enregistrez votre première séance pour voir votre progression !</p>
            </div>
        `;
        openModal('exercise-history-modal');
        return;
    }
    
    // Calculer les stats
    const weights = logs.map(l => l.weight).filter(w => w > 0);
    const maxWeight = Math.max(...weights);
    const lastWeight = weights[weights.length - 1] || 0;
    const firstWeight = weights[0] || 0;
    const progression = firstWeight > 0 ? Math.round((lastWeight - firstWeight) / firstWeight * 100) : 0;
    
    // Trouver le PR
    const prLog = logs.find(l => l.weight === maxWeight);
    const prDate = prLog ? new Date(prLog.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '-';
    
    content.innerHTML = `
        <div class="history-stats">
            <div class="history-stat">
                <div class="history-stat-value">${maxWeight}<span class="history-stat-unit">kg</span></div>
                <div class="history-stat-label">🏆 Record</div>
                <div class="history-stat-date">${prDate}</div>
            </div>
            <div class="history-stat">
                <div class="history-stat-value">${lastWeight}<span class="history-stat-unit">kg</span></div>
                <div class="history-stat-label">Dernière séance</div>
            </div>
            <div class="history-stat">
                <div class="history-stat-value ${progression >= 0 ? 'positive' : 'negative'}">${progression >= 0 ? '+' : ''}${progression}%</div>
                <div class="history-stat-label">Progression</div>
            </div>
        </div>
        
        <div class="history-chart-container">
            <canvas id="exercise-history-chart"></canvas>
        </div>
        
        <div class="history-list">
            <div class="history-list-header">Dernières séances</div>
            ${logs.slice(-10).reverse().map(log => {
                const date = new Date(log.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
                const isMax = log.weight === maxWeight;
                return `
                    <div class="history-item ${isMax ? 'is-pr' : ''}">
                        <span class="history-item-date">${date}</span>
                        <span class="history-item-weight">${log.weight}kg</span>
                        <span class="history-item-sets">${log.sets} séries</span>
                        <span class="history-item-reps">${log.achievedReps} reps</span>
                        ${isMax ? '<span class="history-item-pr">🏆</span>' : ''}
                    </div>
                `;
            }).join('')}
        </div>
    `;
    
    openModal('exercise-history-modal');
    
    // Créer le graphique après l'ouverture du modal
    setTimeout(() => renderExerciseHistoryChart(logs), 100);
}

function renderExerciseHistoryChart(logs) {
    const ctx = document.getElementById('exercise-history-chart');
    if (!ctx) return;
    
    // Détruire le graphique existant
    if (exerciseHistoryChart) {
        exerciseHistoryChart.destroy();
    }
    
    // Préparer les données (dernières 15 séances max)
    const recentLogs = logs.slice(-15);
    const labels = recentLogs.map(l => {
        const d = new Date(l.date);
        return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    });
    const weights = recentLogs.map(l => l.weight);
    
    exerciseHistoryChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Poids (kg)',
                data: weights,
                borderColor: '#ffffff',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.3,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#ffffff',
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#666', font: { size: 10 } }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#666', font: { size: 10 } },
                    beginAtZero: false
                }
            }
        }
    });
}

// ==================== TIPS & TECHNIQUE ====================

const exerciseTips = {
    'Développé Couché': {
        muscles: ['Pectoraux', 'Triceps', 'Épaules ant.'],
        tips: ['Pieds au sol, fessiers serrés', 'Omoplates rétractées et abaissées', 'Barre au niveau des tétons', 'Descente contrôlée, explosive en montée'],
        errors: ['Rebond sur la poitrine', 'Fessiers décollés du banc', 'Coudes trop écartés (90°)']
    },
    'Développé Incliné Haltères': {
        muscles: ['Pectoraux sup.', 'Épaules ant.', 'Triceps'],
        tips: ['Inclinaison 30-45°', 'Haltères au-dessus des épaules en haut', 'Étirement complet en bas', 'Rotation neutre ou légère supination'],
        errors: ['Inclinaison trop forte (>45°)', 'Haltères qui se touchent en haut', 'Dos cambré excessif']
    },
    'Développé Militaire': {
        muscles: ['Épaules', 'Triceps', 'Core'],
        tips: ['Gainage abdominal serré', 'Barre part du haut de la poitrine', 'Pousser légèrement en arrière', 'Tête qui passe sous la barre'],
        errors: ['Dos cambré', 'Poids sur les orteils', 'Coudes trop en avant']
    },
    'Squat': {
        muscles: ['Quadriceps', 'Fessiers', 'Ischio-jambiers'],
        tips: ['Pieds largeur épaules, pointes légèrement ouvertes', 'Genoux dans l\'axe des pieds', 'Descendre au moins parallèle', 'Poitrine haute, regard devant'],
        errors: ['Genoux qui rentrent', 'Talons qui décollent', 'Dos qui s\'arrondit']
    },
    'Soulevé de Terre': {
        muscles: ['Dos complet', 'Fessiers', 'Ischio-jambiers'],
        tips: ['Barre contre les tibias au départ', 'Dos plat, épaules au-dessus de la barre', 'Pousser le sol avec les jambes', 'Verrouiller hanches et genoux ensemble'],
        errors: ['Dos arrondi', 'Barre loin du corps', 'Tirer avec les bras']
    },
    'Tractions': {
        muscles: ['Dorsaux', 'Biceps', 'Rhomboïdes'],
        tips: ['Départ bras tendus (dead hang)', 'Tirer les coudes vers les hanches', 'Poitrine vers la barre', 'Descente contrôlée'],
        errors: ['Demi-répétitions', 'Balancement du corps', 'Hausser les épaules']
    },
    'Rowing Barre': {
        muscles: ['Dorsaux', 'Rhomboïdes', 'Biceps'],
        tips: ['Dos à 45° ou parallèle au sol', 'Tirer vers le nombril', 'Serrer les omoplates en haut', 'Coudes proches du corps'],
        errors: ['Tricher avec l\'élan', 'Dos arrondi', 'Tirer trop haut (vers la poitrine)']
    },
    'Curl Biceps': {
        muscles: ['Biceps', 'Avant-bras'],
        tips: ['Coudes fixes le long du corps', 'Supination complète en haut', 'Contrôler la descente', 'Ne pas balancer'],
        errors: ['Coudes qui avancent', 'Élan avec le dos', 'Amplitude incomplète']
    },
    'Extensions Triceps Poulie': {
        muscles: ['Triceps'],
        tips: ['Coudes fixes et serrés', 'Extension complète en bas', 'Contracter 1 sec en bas', 'Résister à la remontée'],
        errors: ['Coudes qui bougent', 'Se pencher en avant', 'Poids trop lourd = élan']
    },
    'Leg Press': {
        muscles: ['Quadriceps', 'Fessiers'],
        tips: ['Pieds largeur épaules au milieu de la plateforme', 'Descendre jusqu\'à 90° aux genoux', 'Ne pas verrouiller en haut', 'Bas du dos collé au siège'],
        errors: ['Fesses qui décollent', 'Verrouillage brutal', 'Pieds trop bas = stress genoux']
    },
    'Leg Curl': {
        muscles: ['Ischio-jambiers'],
        tips: ['Hanches bien calées', 'Flexion complète', 'Contrôle excentrique (3-4 sec)', 'Pointes de pieds vers les tibias'],
        errors: ['Lever les hanches', 'Mouvement trop rapide', 'Amplitude partielle']
    },
    'Élévations Latérales': {
        muscles: ['Deltoïdes latéraux'],
        tips: ['Légère flexion des coudes', 'Monter jusqu\'à parallèle', 'Petit doigt légèrement plus haut', 'Contrôle total'],
        errors: ['Hausser les épaules', 'Balancer le corps', 'Monter trop haut']
    },
    'Crunch': {
        muscles: ['Abdominaux', 'Core'],
        tips: ['Bas du dos au sol', 'Regard vers le plafond', 'Enrouler les épaules vers les hanches', 'Expirer en montant'],
        errors: ['Tirer sur la nuque', 'Élan', 'Amplitude excessive']
    },
    'Dips': {
        muscles: ['Pectoraux', 'Triceps', 'Épaules ant.'],
        tips: ['Descendre à 90° minimum', 'Se pencher en avant pour les pecs', 'Corps droit pour les triceps', 'Épaules basses'],
        errors: ['Descente trop profonde', 'Épaules qui montent', 'Verrouillage violent']
    },
    'Hip Thrust': {
        muscles: ['Fessiers', 'Ischio-jambiers'],
        tips: ['Haut du dos sur le banc', 'Pieds à plat, genoux à 90° en haut', 'Serrer les fessiers en haut', 'Menton rentré'],
        errors: ['Hyper-extension lombaire', 'Pieds trop loin/près', 'Ne pas serrer en haut']
    }
};

function openExerciseTips(exerciseName) {
    const tips = exerciseTips[exerciseName];
    
    // Créer/afficher le modal
    let modal = document.getElementById('exercise-tips-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'exercise-tips-modal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal" style="max-width: 500px;">
                <div class="modal-header">
                    <div class="modal-title" id="exercise-tips-title">Conseils</div>
                    <button class="modal-close" onclick="closeModal('exercise-tips-modal')">&times;</button>
                </div>
                <div class="modal-body" id="exercise-tips-content"></div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    document.getElementById('exercise-tips-title').textContent = `💡 ${exerciseName}`;
    const content = document.getElementById('exercise-tips-content');
    
    if (!tips) {
        content.innerHTML = `
            <div class="empty-state" style="padding: 30px 20px;">
                <div class="empty-state-icon">💡</div>
                <div class="empty-state-title">Pas encore de conseils</div>
                <p>Les tips pour cet exercice seront ajoutés prochainement !</p>
            </div>
        `;
        openModal('exercise-tips-modal');
        return;
    }
    
    content.innerHTML = `
        <div class="tips-section">
            <div class="tips-muscles">
                ${tips.muscles.map(m => `<span class="tips-muscle-tag">${m}</span>`).join('')}
            </div>
        </div>
        
        <div class="tips-section">
            <div class="tips-section-title">✅ Points clés</div>
            <ul class="tips-list tips-good">
                ${tips.tips.map(t => `<li>${t}</li>`).join('')}
            </ul>
        </div>
        
        <div class="tips-section">
            <div class="tips-section-title">❌ Erreurs à éviter</div>
            <ul class="tips-list tips-bad">
                ${tips.errors.map(e => `<li>${e}</li>`).join('')}
            </ul>
        </div>
    `;
    
    openModal('exercise-tips-modal');
}
