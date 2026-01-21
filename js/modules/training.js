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
    const split = program.splits[state.trainingDays];
    const dayType = split[dayIndex];
    const exercises = program.exercises[dayType] || [];

    container.innerHTML = exercises.map((ex, exIdx) => {
        const effectiveName = getEffectiveExerciseName(ex.name, ex.muscle);
        const lastLog = getLastLog(effectiveName);
        const suggestedWeight = lastLog ? lastLog.weight : '';
        const targetReps = ex.reps;
        const numSets = ex.sets;
        
        // Générer les lignes pour chaque série
        let setsHtml = '';
        for (let i = 1; i <= numSets; i++) {
            setsHtml += `
                <div class="set-row">
                    <div class="set-num">${i}</div>
                    <div class="set-input-group">
                        <input type="number" class="set-weight" value="${suggestedWeight}" placeholder="—" step="2.5" min="0">
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
            <div class="exercise-card" data-exercise="${effectiveName}" data-original="${ex.name}" data-muscle="${ex.muscle}">
                <div class="exercise-card-header" onclick="openExerciseSwapModal('${ex.name}', '${ex.muscle}', ${ex.sets}, '${ex.reps}')">
                    <div class="exercise-card-title">
                        <span class="exercise-card-name">${effectiveName}</span>
                        <span class="exercise-card-edit">✎</span>
                    </div>
                    <div class="exercise-card-target">Objectif: ${numSets}×${targetReps}</div>
                </div>
                <div class="exercise-card-body">
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

function toggleSetCheck(btn) {
    btn.classList.toggle('checked');
    
    // Si on coche, on peut auto-remplir les reps si vide
    const row = btn.closest('.set-row');
    const repsInput = row.querySelector('.set-reps');
    if (btn.classList.contains('checked') && !repsInput.value) {
        repsInput.value = repsInput.placeholder;
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
    
    updateSessionHistory();
    populateProgressExerciseSelect();
    
    // Réinitialiser les champs
    exerciseCards.forEach(card => {
        card.querySelectorAll('.set-weight').forEach(input => input.value = '');
        card.querySelectorAll('.set-reps').forEach(input => input.value = '');
        card.querySelectorAll('.set-check').forEach(btn => btn.classList.remove('checked'));
    });
    
    showToast('Séance enregistrée ! 💪', 'success');
}
