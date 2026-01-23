// ==================== TRAINING MODULE (REFONTE) ====================
// Nouveau flow: Wizard → Liste Séances → Full-Screen Session

// ==================== WIZARD STATE ====================
let wizardState = {
    currentStep: 1,
    frequency: null,
    goal: null,
    experience: null
};

// ==================== FULL-SCREEN SESSION STATE ====================
let fsSession = {
    active: false,
    splitIndex: 0,
    splitName: '',
    exercises: [],
    currentExerciseIndex: 0,
    currentSetIndex: 0,
    completedSets: [], // { exerciseIndex, setIndex, weight, reps }
    startTime: null
};

// ==================== SESSION PREVIEW STATE ====================
let previewSession = {
    splitIndex: null,
    splitName: '',
    exercises: [], // { originalName, muscle, sets, reps, swappedId, swappedName, isModified }
    hasChanges: false
};

// ==================== RENDER MAIN TRAINING SECTION ====================

function renderTrainingSection() {
    const container = document.getElementById('training-content');
    if (!container) return;

    // Check if wizard is completed
    if (!state.wizardResults || !state.wizardResults.selectedProgram) {
        renderWizardPrompt(container);
    } else {
        renderSessionsList(container);
    }
}

function renderWizardPrompt(container) {
    container.innerHTML = `
        <div class="card">
            <div class="empty-state" style="padding: 60px 20px;">
                <div class="empty-state-icon">🎯</div>
                <div class="empty-state-title">Configure ton programme</div>
                <p style="margin-bottom: 30px;">Réponds à quelques questions pour obtenir un programme adapté à tes objectifs</p>
                <button class="btn btn-primary btn-lg" onclick="openProgramWizard()">
                    Créer mon programme
                </button>
            </div>
        </div>
    `;
}

// ==================== SESSIONS LIST ====================

function renderSessionsList(container) {
    const program = trainingPrograms[state.wizardResults.selectedProgram];
    if (!program) {
        renderWizardPrompt(container);
        return;
    }

    const splits = program.splits[state.wizardResults.frequency] || program.splits[Object.keys(program.splits)[0]];
    const currentIndex = state.trainingProgress.currentSplitIndex || 0;
    const totalSessions = state.trainingProgress.totalSessionsCompleted || 0;
    
    // Format last session date
    let lastSessionText = '';
    if (state.trainingProgress.lastSessionDate) {
        const lastDate = new Date(state.trainingProgress.lastSessionDate);
        const now = new Date();
        const diffDays = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) {
            lastSessionText = "Dernière séance : aujourd'hui";
        } else if (diffDays === 1) {
            lastSessionText = "Dernière séance : hier";
        } else {
            lastSessionText = `Dernière séance : il y a ${diffDays} jours`;
        }
    }

    // Build sessions list
    let sessionsHTML = '';
    
    // Current session (next to do)
    const currentSplit = splits[currentIndex];
    const currentExercises = program.exercises[currentSplit] || [];
    const currentTemplateKey = `${state.wizardResults.selectedProgram}-${currentIndex}`;
    const hasCurrentTemplate = !!state.sessionTemplates[currentTemplateKey];
    
    sessionsHTML += `
        <div class="session-card session-card-current">
            <div class="session-card-badge">PROCHAINE SÉANCE</div>
            <div class="session-card-header">
                <h3 class="session-card-title">
                    ${currentSplit}
                    ${hasCurrentTemplate ? '<span style="font-size: 0.75rem; color: var(--accent-primary); margin-left: 8px;">✓</span>' : ''}
                </h3>
                <span class="session-card-day">Jour ${currentIndex + 1}/${splits.length}</span>
            </div>
            <div class="session-card-meta">
                <span>${currentExercises.length} exercices</span>
                <span>~${currentExercises.length * 7} min</span>
            </div>
            <button class="btn btn-primary session-start-btn" onclick="showSessionPreview(${currentIndex})">
                Commencer la séance
            </button>
        </div>
    `;

    // Upcoming sessions
    sessionsHTML += '<div class="sessions-upcoming"><h4 class="sessions-upcoming-title">Ensuite</h4>';
    for (let i = 1; i < splits.length; i++) {
        const idx = (currentIndex + i) % splits.length;
        const splitName = splits[idx];
        const exercises = program.exercises[splitName] || [];
        const templateKey = `${state.wizardResults.selectedProgram}-${idx}`;
        const hasTemplate = !!state.sessionTemplates[templateKey];
        
        sessionsHTML += `
            <div class="session-card session-card-upcoming" onclick="showSessionPreview(${idx})">
                <div class="session-card-header">
                    <h3 class="session-card-title">
                        ${splitName}
                        ${hasTemplate ? '<span style="font-size: 0.75rem; color: var(--accent-primary); margin-left: 8px;">✓</span>' : ''}
                    </h3>
                    <span class="session-card-day">Jour ${idx + 1}/${splits.length}</span>
                </div>
                <div class="session-card-meta">
                    <span>${exercises.length} exercices</span>
                </div>
            </div>
        `;
    }
    sessionsHTML += '</div>';

    container.innerHTML = `
        <div class="training-header">
            <div class="training-header-info">
                <h2 class="training-program-name">${program.icon} ${program.name}</h2>
                ${lastSessionText ? `<p class="training-last-session">${lastSessionText}</p>` : ''}
            </div>
            <button class="btn btn-sm btn-secondary" onclick="openProgramWizard()" title="Changer de programme">
                ⚙️ Modifier
            </button>
        </div>

        <div class="sessions-list">
            ${sessionsHTML}
        </div>

        <div class="training-stats">
            <div class="training-stat">
                <span class="training-stat-value">${totalSessions}</span>
                <span class="training-stat-label">séances complétées</span>
            </div>
            <div class="training-stat">
                <span class="training-stat-value">${state.wizardResults.frequency}</span>
                <span class="training-stat-label">jours / semaine</span>
            </div>
            <div class="training-stat">
                <span class="training-stat-value">${getGoalLabel(state.wizardResults.goal)}</span>
                <span class="training-stat-label">objectif</span>
            </div>
        </div>
    `;
}

function getGoalLabel(goal) {
    const labels = {
        'strength': 'Force',
        'hypertrophy': 'Hypertrophie',
        'endurance': 'Endurance'
    };
    return labels[goal] || goal;
}

function previewSessionCard(splitIndex) {
    showSessionPreview(splitIndex);
}

// ==================== PROGRAM WIZARD ====================

function openProgramWizard() {
    // Reset wizard state
    wizardState = {
        currentStep: 1,
        frequency: state.wizardResults?.frequency || null,
        goal: state.wizardResults?.goal || null,
        experience: state.wizardResults?.experience || null
    };

    // Reset UI
    updateWizardUI();
    openModal('program-wizard-modal');
}

function updateWizardUI() {
    const step = wizardState.currentStep;

    // Update progress indicators
    document.querySelectorAll('.wizard-step').forEach((el, idx) => {
        el.classList.toggle('active', idx < step);
        el.classList.toggle('current', idx + 1 === step);
    });

    // Show/hide steps
    for (let i = 1; i <= 4; i++) {
        const stepEl = document.getElementById(`wizard-step-${i}`);
        if (stepEl) {
            stepEl.style.display = i === step ? 'block' : 'none';
        }
    }

    // Update buttons
    const backBtn = document.getElementById('wizard-back-btn');
    const nextBtn = document.getElementById('wizard-next-btn');

    backBtn.style.display = step > 1 ? 'inline-flex' : 'none';

    if (step === 4) {
        nextBtn.style.display = 'none';
    } else {
        nextBtn.style.display = 'inline-flex';
        nextBtn.textContent = 'Suivant';
        
        // Enable/disable based on selection
        let hasSelection = false;
        if (step === 1) hasSelection = wizardState.frequency !== null;
        if (step === 2) hasSelection = wizardState.goal !== null;
        if (step === 3) hasSelection = wizardState.experience !== null;
        nextBtn.disabled = !hasSelection;
    }

    // Update option selections
    document.querySelectorAll('.wizard-option').forEach(btn => {
        btn.classList.remove('selected');
    });

    if (step === 1 && wizardState.frequency) {
        document.querySelector(`.wizard-option[data-value="${wizardState.frequency}"]`)?.classList.add('selected');
    }
    if (step === 2 && wizardState.goal) {
        document.querySelector(`.wizard-option[data-value="${wizardState.goal}"]`)?.classList.add('selected');
    }
    if (step === 3 && wizardState.experience) {
        document.querySelector(`.wizard-option[data-value="${wizardState.experience}"]`)?.classList.add('selected');
    }

    // If step 4, show programs
    if (step === 4) {
        renderProgramRecommendations();
    }
}

function selectWizardOption(field, value) {
    wizardState[field] = value;

    // Update UI
    const step = wizardState.currentStep;
    document.querySelectorAll(`#wizard-step-${step} .wizard-option`).forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.value == value);
    });

    // Enable next button
    document.getElementById('wizard-next-btn').disabled = false;
}

function wizardNext() {
    if (wizardState.currentStep < 4) {
        wizardState.currentStep++;
        updateWizardUI();
    }
}

function wizardBack() {
    if (wizardState.currentStep > 1) {
        wizardState.currentStep--;
        updateWizardUI();
    }
}

function getProgramRecommendations(frequency) {
    // Simple recommendations based on frequency
    const recommendations = {
        3: ['full-body', 'ppl', 'upper-lower'],
        4: ['upper-lower', 'ppl', 'full-body'],
        5: ['ppl', 'bro-split', 'upper-lower'],
        6: ['ppl', 'arnold', 'bro-split']
    };

    return recommendations[frequency] || ['ppl', 'upper-lower', 'full-body'];
}

function renderProgramRecommendations() {
    const container = document.getElementById('wizard-programs-list');
    if (!container) return;

    const recommendations = getProgramRecommendations(wizardState.frequency);
    
    container.innerHTML = recommendations.map((programId, idx) => {
        const program = trainingPrograms[programId];
        if (!program) return '';

        const isRecommended = idx === 0;
        const splits = program.splits[wizardState.frequency];
        const splitNames = splits ? splits.join(' → ') : '';

        return `
            <div class="wizard-program-card ${isRecommended ? 'recommended' : ''}" onclick="selectProgram('${programId}')">
                ${isRecommended ? '<div class="wizard-program-badge">Recommandé</div>' : ''}
                <div class="wizard-program-header">
                    <span class="wizard-program-icon">${program.icon}</span>
                    <span class="wizard-program-name">${program.name}</span>
                </div>
                <p class="wizard-program-desc">${program.description}</p>
                <div class="wizard-program-splits">${splitNames}</div>
            </div>
        `;
    }).join('');
}

function selectProgram(programId) {
    // Save wizard results
    state.wizardResults = {
        frequency: wizardState.frequency,
        goal: wizardState.goal,
        experience: wizardState.experience,
        favoriteExercises: state.wizardResults?.favoriteExercises || [],
        selectedProgram: programId,
        completedAt: new Date().toISOString()
    };

    // Reset training progress if program changed
    if (state.selectedProgram !== programId) {
        state.trainingProgress = {
            currentSplitIndex: 0,
            lastSessionDate: null,
            totalSessionsCompleted: 0
        };
    }

    // Update legacy field for compatibility
    state.selectedProgram = programId;
    state.trainingDays = wizardState.frequency;

    saveState();

    // Sync with Supabase
    if (typeof isLoggedIn === 'function' && isLoggedIn()) {
        if (typeof saveTrainingSettingsToSupabase === 'function') {
            saveTrainingSettingsToSupabase();
        }
    }

    closeModal('program-wizard-modal');
    
    const program = trainingPrograms[programId];
    showToast(`Programme ${program.name} activé ! 💪`, 'success');

    // Refresh UI
    renderTrainingSection();
    if (typeof updateDashboard === 'function') updateDashboard();
}

// ==================== SESSION PREVIEW ====================

/**
 * Affiche l'écran d'aperçu de séance avant de commencer
 * Modifié: demande d'abord la durée, puis affiche la preview avec exercices filtrés
 */
function showSessionPreview(splitIndex) {
    const program = trainingPrograms[state.wizardResults.selectedProgram];
    if (!program) return;

    const splits = program.splits[state.wizardResults.frequency];
    if (!splits || !splits[splitIndex]) return;

    const splitName = splits[splitIndex];
    const defaultExercises = program.exercises[splitName] || [];
    
    // Récupérer le template existant ou créer un nouveau
    const templateKey = `${state.wizardResults.selectedProgram}-${splitIndex}`;
    const template = state.sessionTemplates[templateKey];

    // Initialiser previewSession
    previewSession = {
        splitIndex: splitIndex,
        splitName: splitName,
        exercises: [],
        hasChanges: false
    };

    // Remplir avec le template ou les exercices par défaut
    if (template && template.exercises) {
        previewSession.exercises = defaultExercises.map(ex => {
            const templateEx = template.exercises.find(te => te.originalName === ex.name);
            return {
                originalName: ex.name,
                muscle: ex.muscle,
                sets: ex.sets,
                reps: ex.reps,
                swappedId: templateEx?.swappedId || null,
                swappedName: templateEx?.swappedName || null,
                isModified: !!templateEx?.swappedId
            };
        });
    } else {
        previewSession.exercises = defaultExercises.map(ex => ({
            originalName: ex.name,
            muscle: ex.muscle,
            sets: ex.sets,
            reps: ex.reps,
            swappedId: null,
            swappedName: null,
            isModified: false
        }));
    }

    // Nouveau flow: demander d'abord la durée
    // Stocker splitIndex temporairement
    previewSession.pendingSplitIndex = splitIndex;
    showDurationPicker();
}

/**
 * Ferme l'écran d'aperçu
 */
function closeSessionPreview() {
    if (previewSession.hasChanges) {
        if (!confirm('Tu as modifié des exercices. Quitter sans sauvegarder ?')) {
            return;
        }
    }

    document.getElementById('session-preview').style.display = 'none';
    document.body.style.overflow = '';

    const nav = document.querySelector('.nav');
    const mobileNav = document.querySelector('.mobile-nav');
    if (nav) nav.style.display = '';
    if (mobileNav) mobileNav.style.display = '';
}

/**
 * Render l'UI de l'aperçu
 */
function renderSessionPreviewUI() {
    const program = trainingPrograms[state.wizardResults.selectedProgram];
    const splits = program.splits[state.wizardResults.frequency];

    document.getElementById('preview-split-name').textContent = previewSession.splitName;
    document.getElementById('preview-split-day').textContent = `Jour ${previewSession.splitIndex + 1}/${splits.length}`;

    // Template status
    const templateKey = `${state.wizardResults.selectedProgram}-${previewSession.splitIndex}`;
    const hasTemplate = !!state.sessionTemplates[templateKey];
    const statusEl = document.getElementById('preview-template-status');
    
    if (hasTemplate) {
        statusEl.textContent = 'Séance personnalisée enregistrée';
    } else {
        statusEl.textContent = 'Personnalise tes exercices pour cette séance';
    }

    // Exercises list
    const container = document.getElementById('preview-exercises-list');
    container.innerHTML = previewSession.exercises.map((ex, idx) => {
        const displayName = ex.swappedName || ex.originalName;
        const isModified = ex.isModified;

        return `
            <div class="preview-exercise-item ${isModified ? 'modified' : ''}" data-index="${idx}">
                <div class="preview-exercise-info">
                    <span class="preview-exercise-name">
                        ${displayName}
                        ${isModified ? '<span class="preview-exercise-modified-badge">✓ Modifié</span>' : ''}
                    </span>
                    <span class="preview-exercise-meta">${ex.sets} séries × ${ex.reps} reps</span>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="exercise-info-btn" onclick="openExerciseTips('${displayName.replace(/'/g, "\\'")}')" title="Informations">
                        ⓘ
                    </button>
                    <button class="preview-exercise-edit" onclick="openExerciseSwapSheet(${idx})" title="Changer l'exercice">
                        ⇄
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // Save hint
    const hintEl = document.getElementById('preview-save-hint');
    if (previewSession.hasChanges && !hasTemplate) {
        hintEl.textContent = 'Tes modifications seront sauvegardées pour les prochaines semaines';
        hintEl.style.display = 'block';
    } else {
        hintEl.style.display = 'none';
    }
}

/**
 * Ouvre le bottom sheet pour changer un exercice
 */
function openExerciseSwapSheet(exerciseIndex) {
    const exercise = previewSession.exercises[exerciseIndex];
    if (!exercise) return;

    // Stocker l'index pour le swap
    previewSession.currentSwapIndex = exerciseIndex;

    // Nom actuel
    const displayName = exercise.swappedName || exercise.originalName;
    document.getElementById('swap-current-name').textContent = displayName;

    // Obtenir les exercices équivalents
    const favoriteExercises = state.wizardResults?.favoriteExercises || [];
    const originalExerciseId = getExerciseIdByName(exercise.originalName, exercise.muscle);
    const equivalents = getEquivalentExercises(originalExerciseId, favoriteExercises);

    const container = document.getElementById('swap-options-list');
    
    if (equivalents.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="padding: 20px;">
                <p style="color: var(--text-muted);">Pas d'exercices équivalents trouvés</p>
            </div>
        `;
    } else {
        container.innerHTML = equivalents.map(eq => `
            <div class="swap-option-item ${eq.isFavorite ? 'is-favorite' : ''}" 
                 onclick="swapExerciseInPreview('${eq.id}')">
                <span class="swap-option-name">
                    ${eq.name}
                    ${eq.isFavorite ? '<span class="swap-option-favorite-badge">★ Favori</span>' : ''}
                </span>
                <span class="swap-option-equip">${equipmentTypes[eq.equipment] || eq.equipment}</span>
            </div>
        `).join('');
    }

    // Afficher le bottom sheet
    document.getElementById('swap-bottom-sheet').style.display = 'flex';
}

/**
 * Ferme le bottom sheet
 */
function closeBottomSheet() {
    document.getElementById('swap-bottom-sheet').style.display = 'none';
}

/**
 * Swap un exercice dans l'aperçu
 */
function swapExerciseInPreview(exerciseId) {
    const exercise = state.exercises.find(e => e.id === exerciseId);
    if (!exercise || previewSession.currentSwapIndex === null) return;

    const idx = previewSession.currentSwapIndex;
    
    // Mettre à jour l'exercice dans previewSession
    previewSession.exercises[idx].swappedId = exerciseId;
    previewSession.exercises[idx].swappedName = exercise.name;
    previewSession.exercises[idx].isModified = true;
    previewSession.hasChanges = true;

    closeBottomSheet();
    showToast(`Exercice changé pour ${exercise.name}`, 'success');

    // Re-render
    renderSessionPreviewUI();
}

/**
 * Démarre la séance depuis l'aperçu
 */
function startSessionFromPreview() {
    // Sauvegarder le template si modifications
    if (previewSession.hasChanges) {
        saveSessionTemplate(previewSession.splitIndex);
    }

    // Fermer l'écran d'aperçu
    document.getElementById('session-preview').style.display = 'none';

    // Démarrer la séance full-screen avec les exercices (déjà filtrés par durée)
    startFullScreenSessionWithCustomExercises(previewSession.splitIndex, previewSession.exercises);
}

function showDurationPicker() {
    document.getElementById('duration-picker-sheet').style.display = 'flex';
}

function closeDurationPicker() {
    document.getElementById('duration-picker-sheet').style.display = 'none';
}

function selectDuration(duration) {
    closeDurationPicker();
    
    // Filtrer les exercices selon la durée
    let filteredExercises = previewSession.exercises;
    if (duration) {
        filteredExercises = filterExercisesByDuration(previewSession.exercises, duration);
        if (filteredExercises.length < previewSession.exercises.length) {
            showToast(`Séance adaptée à ${duration} min (${filteredExercises.length} exercices)`, 'info');
        }
    }

    // Mettre à jour previewSession avec les exercices filtrés
    previewSession.exercises = filteredExercises;
    previewSession.selectedDuration = duration;
    
    // Afficher l'écran d'aperçu avec les exercices filtrés
    document.getElementById('session-preview').style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Hide nav
    const nav = document.querySelector('.nav');
    const mobileNav = document.querySelector('.mobile-nav');
    if (nav) nav.style.display = 'none';
    if (mobileNav) mobileNav.style.display = 'none';

    // Render UI avec les exercices filtrés
    renderSessionPreviewUI();
}

function filterExercisesByDuration(exercises, duration) {
    // Estimer 7 minutes par exercice
    const estimatedMinutesPerExercise = 7;
    let maxExercises;
    
    if (duration === '30-45') {
        maxExercises = 4; // ~4 exercices principaux
    } else if (duration === '45-60') {
        maxExercises = 6; // ~5-6 exercices
    } else {
        return exercises; // 60-90 min ou skip = tous les exercices
    }
    
    // Prioriser les premiers exercices (généralement les plus importants)
    return exercises.slice(0, maxExercises);
}

/**
 * Sauvegarde le template de séance
 */
function saveSessionTemplate(splitIndex) {
    const templateKey = `${state.wizardResults.selectedProgram}-${splitIndex}`;
    
    state.sessionTemplates[templateKey] = {
        splitIndex: splitIndex,
        splitName: previewSession.splitName,
        exercises: previewSession.exercises.map(ex => ({
            originalName: ex.originalName,
            swappedId: ex.swappedId,
            swappedName: ex.swappedName
        })),
        savedAt: new Date().toISOString()
    };

    saveState();
    
    // Sync avec Supabase si connecté
    if (typeof isLoggedIn === 'function' && isLoggedIn()) {
        if (typeof saveTrainingSettingsToSupabase === 'function') {
            saveTrainingSettingsToSupabase();
        }
    }
}

/**
 * Récupère le template de séance s'il existe
 */
function getSessionTemplate(splitIndex) {
    const templateKey = `${state.wizardResults.selectedProgram}-${splitIndex}`;
    return state.sessionTemplates[templateKey] || null;
}

// ==================== FULL-SCREEN SESSION ====================

/**
 * Démarre une séance full-screen avec exercices personnalisés
 */
function startFullScreenSessionWithCustomExercises(splitIndex, customExercises) {
    const program = trainingPrograms[state.wizardResults.selectedProgram];
    if (!program) return;

    const splits = program.splits[state.wizardResults.frequency];
    if (!splits || !splits[splitIndex]) return;

    const splitName = splits[splitIndex];

    // Convertir customExercises (du preview) vers le format fsSession
    const exercises = customExercises.map(ex => {
        const effectiveName = ex.swappedName || ex.originalName;
        return {
            name: ex.originalName,
            muscle: ex.muscle,
            sets: ex.sets,
            reps: ex.reps,
            effectiveName: effectiveName
        };
    });

    // Initialize session
    fsSession = {
        active: true,
        splitIndex: splitIndex,
        splitName: splitName,
        exercises: exercises,
        currentExerciseIndex: 0,
        currentSetIndex: 0,
        completedSets: [],
        startTime: Date.now()
    };

    // Show full-screen UI
    document.getElementById('fullscreen-session').style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Hide nav
    const nav = document.querySelector('.nav');
    const mobileNav = document.querySelector('.mobile-nav');
    if (nav) nav.style.display = 'none';
    if (mobileNav) mobileNav.style.display = 'none';

    // Render first exercise
    renderCurrentExercise();
}

/**
 * Démarre une séance full-screen (legacy - redirige vers preview)
 */
function startFullScreenSession(splitIndex) {
    // Nouveau flow: passer par l'aperçu
    showSessionPreview(splitIndex);
}

function closeFullScreenSession() {
    // Confirm if sets were logged
    if (fsSession.completedSets.length > 0) {
        if (!confirm('Tu as des séries non sauvegardées. Quitter quand même ?')) {
            return;
        }
    }

    document.getElementById('fullscreen-session').style.display = 'none';
    document.body.style.overflow = '';

    // Show nav
    const nav = document.querySelector('.nav');
    const mobileNav = document.querySelector('.mobile-nav');
    if (nav) nav.style.display = '';
    if (mobileNav) mobileNav.style.display = '';

    fsSession.active = false;
}

function renderCurrentExercise() {
    const exercise = fsSession.exercises[fsSession.currentExerciseIndex];
    if (!exercise) return;

    const totalSets = exercise.sets;
    const currentSet = fsSession.currentSetIndex + 1;
    const totalExercises = fsSession.exercises.length;
    const splits = trainingPrograms[state.wizardResults.selectedProgram].splits[state.wizardResults.frequency];

    // Update header
    document.getElementById('fs-session-title').textContent = fsSession.splitName;
    document.getElementById('fs-session-progress').textContent = `Jour ${fsSession.splitIndex + 1}/${splits.length}`;

    // Update exercise info
    const exerciseNameEl = document.getElementById('fs-exercise-name');
    exerciseNameEl.innerHTML = `
        ${exercise.effectiveName}
        <button class="exercise-info-btn" onclick="openExerciseTips('${exercise.effectiveName.replace(/'/g, "\\'")}')" title="Informations" style="margin-left: 8px;">
            ⓘ
        </button>
    `;
    document.getElementById('fs-set-indicator').textContent = `Série ${currentSet} / ${totalSets}`;

    // Update progress bar
    const progress = ((fsSession.currentExerciseIndex * totalSets) + fsSession.currentSetIndex) / (totalExercises * totalSets) * 100;
    document.getElementById('fs-progress-fill').style.width = `${progress}%`;

    // Get last log for this exercise
    const lastLog = getLastLog(exercise.effectiveName);
    const previousEl = document.getElementById('fs-previous');
    const previousValueEl = document.getElementById('fs-previous-value');

    if (lastLog && lastLog.setsDetail && lastLog.setsDetail.length > 0) {
        const lastSet = lastLog.setsDetail[Math.min(fsSession.currentSetIndex, lastLog.setsDetail.length - 1)];
        previousValueEl.textContent = `${lastSet.weight}kg × ${lastSet.reps}`;
        previousEl.style.display = 'flex';

        // Pre-fill inputs with last values
        document.getElementById('fs-weight-input').value = lastSet.weight || '';
        document.getElementById('fs-reps-input').value = '';
        document.getElementById('fs-reps-input').placeholder = lastSet.reps || exercise.reps;
    } else {
        previousEl.style.display = 'none';
        document.getElementById('fs-weight-input').value = '';
        document.getElementById('fs-reps-input').value = '';
        document.getElementById('fs-reps-input').placeholder = exercise.reps;
    }

    // Render completed sets for this exercise
    renderCompletedSets();
}

function renderCompletedSets() {
    const container = document.getElementById('fs-completed-sets');
    const exercise = fsSession.exercises[fsSession.currentExerciseIndex];
    
    // Get completed sets for current exercise
    const exerciseSets = fsSession.completedSets.filter(s => s.exerciseIndex === fsSession.currentExerciseIndex);

    if (exerciseSets.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = exerciseSets.map(set => `
        <div class="fs-completed-set">
            <span class="fs-completed-set-num">S${set.setIndex + 1}</span>
            <span class="fs-completed-set-value">${set.weight}kg × ${set.reps}</span>
            <button class="fs-completed-set-edit" onclick="editCompletedSet(${set.setIndex})">✎</button>
        </div>
    `).join('');
}

function adjustWeight(delta) {
    const input = document.getElementById('fs-weight-input');
    const current = parseFloat(input.value) || 0;
    input.value = Math.max(0, current + delta);
}

function adjustReps(delta) {
    const input = document.getElementById('fs-reps-input');
    const current = parseInt(input.value) || 0;
    input.value = Math.max(0, current + delta);
}

function validateCurrentSet() {
    const weight = parseFloat(document.getElementById('fs-weight-input').value) || 0;
    const repsInput = document.getElementById('fs-reps-input');
    const reps = parseInt(repsInput.value) || parseInt(repsInput.placeholder) || 0;

    if (weight <= 0 && reps <= 0) {
        showToast('Entre un poids ou des reps', 'error');
        return;
    }

    // Save the set
    fsSession.completedSets.push({
        exerciseIndex: fsSession.currentExerciseIndex,
        setIndex: fsSession.currentSetIndex,
        weight: weight,
        reps: reps
    });

    // Move to next set or exercise
    const exercise = fsSession.exercises[fsSession.currentExerciseIndex];
    const totalSets = exercise.sets;

    // Vérifier si c'est la dernière série
    const isLastSet = fsSession.currentSetIndex + 1 >= totalSets;
    const isLastExercise = fsSession.currentExerciseIndex + 1 >= fsSession.exercises.length;

    if (!isLastSet) {
        // Next set
        fsSession.currentSetIndex++;
        renderCurrentExercise();
        
        // Start rest timer (sauf si c'était la première série)
        if (fsSession.currentSetIndex > 1) {
            startRestTimer();
        }
    } else if (isLastSet && !isLastExercise) {
        // Exercice terminé, mais pas le dernier - afficher bouton transition
        fsSession.exerciseCompleted = true;
        renderExerciseCompleteState();
    } else {
        // Dernière série du dernier exercice - séance terminée
        showToast('Séance terminée ! 🎉', 'success');
        renderSessionCompleteState();
    }
}

function editCompletedSet(setIndex) {
    // Find and update the set
    const setData = fsSession.completedSets.find(
        s => s.exerciseIndex === fsSession.currentExerciseIndex && s.setIndex === setIndex
    );
    
    if (setData) {
        // Pre-fill with existing values
        document.getElementById('fs-weight-input').value = setData.weight;
        document.getElementById('fs-reps-input').value = setData.reps;
        
        // Remove from completed (will be re-added on validate)
        fsSession.completedSets = fsSession.completedSets.filter(
            s => !(s.exerciseIndex === fsSession.currentExerciseIndex && s.setIndex === setIndex)
        );
        
        // Go back to that set
        fsSession.currentSetIndex = setIndex;
        renderCurrentExercise();
    }
}

// ==================== EXERCICE & SESSION COMPLETE STATES ====================

function renderExerciseCompleteState() {
    // Masquer le contenu normal
    const content = document.getElementById('fs-content');
    if (content) content.style.display = 'none';
    
    // Afficher l'état "exercice terminé"
    const completeSection = document.getElementById('fs-exercise-complete');
    if (!completeSection) return;
    
    completeSection.style.display = 'flex';
    
    // Nom du prochain exercice
    const nextExercise = fsSession.exercises[fsSession.currentExerciseIndex + 1];
    const nameEl = document.getElementById('fs-next-exercise-name');
    if (nameEl) nameEl.textContent = nextExercise.effectiveName;
    
    // Arrêter le timer
    resetFsTimer();
}

function goToNextExercise() {
    fsSession.exerciseCompleted = false;
    fsSession.currentExerciseIndex++;
    fsSession.currentSetIndex = 0;
    
    // Rétablir l'affichage normal
    const content = document.getElementById('fs-content');
    const completeSection = document.getElementById('fs-exercise-complete');
    
    if (content) content.style.display = 'block';
    if (completeSection) completeSection.style.display = 'none';
    
    renderCurrentExercise();
    startRestTimer();
}

function renderSessionCompleteState() {
    // Masquer le contenu normal
    const content = document.getElementById('fs-content');
    if (content) content.style.display = 'none';
    
    // Afficher l'état "séance terminée"
    const completeSection = document.getElementById('fs-session-complete');
    if (!completeSection) return;
    
    completeSection.style.display = 'flex';
    
    // Arrêter le timer
    resetFsTimer();
    
    // Calculer les stats
    const duration = Math.floor((Date.now() - fsSession.startTime) / 1000 / 60);
    const totalSets = fsSession.completedSets.length;
    const totalExercises = new Set(fsSession.completedSets.map(s => s.exerciseIndex)).size;
    
    const statsEl = document.getElementById('fs-complete-stats');
    if (statsEl) {
        statsEl.innerHTML = `
            <div class="fs-complete-stat">
                <span class="fs-complete-stat-value">${totalExercises}</span>
                <span class="fs-complete-stat-label">exercices</span>
            </div>
            <div class="fs-complete-stat">
                <span class="fs-complete-stat-value">${totalSets}</span>
                <span class="fs-complete-stat-label">séries</span>
            </div>
            <div class="fs-complete-stat">
                <span class="fs-complete-stat-value">${duration}</span>
                <span class="fs-complete-stat-label">minutes</span>
            </div>
        `;
    }
}

// ==================== REST TIMER (FULL-SCREEN) ====================

let fsTimerInterval = null;
let fsTimerSeconds = 0;
let fsTimerTarget = 90;

function startRestTimer() {
    // Get target time based on goal
    const goal = state.wizardResults?.goal || 'hypertrophy';
    fsTimerTarget = REST_TIMES[goal]?.default || 90;
    fsTimerSeconds = fsTimerTarget;

    updateFsTimerDisplay();

    // Clear existing interval
    if (fsTimerInterval) {
        clearInterval(fsTimerInterval);
    }

    // Start countdown
    fsTimerInterval = setInterval(() => {
        fsTimerSeconds--;
        updateFsTimerDisplay();

        if (fsTimerSeconds <= 0) {
            clearInterval(fsTimerInterval);
            fsTimerInterval = null;
            
            // Vibrate if available
            if (navigator.vibrate) {
                navigator.vibrate([200, 100, 200]);
            }
            
            // Play sound or show notification
            showToast('Repos terminé ! 💪', 'info');
        }
    }, 1000);

    // Add active class to timer
    document.getElementById('fs-timer').classList.add('active');
}

function updateFsTimerDisplay() {
    const mins = Math.floor(Math.abs(fsTimerSeconds) / 60);
    const secs = Math.abs(fsTimerSeconds) % 60;
    const prefix = fsTimerSeconds < 0 ? '+' : '';
    document.getElementById('fs-timer-display').textContent = `${prefix}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    // Change color when overtime
    const timerEl = document.getElementById('fs-timer');
    timerEl.classList.toggle('overtime', fsTimerSeconds < 0);
}

function resetFsTimer() {
    if (fsTimerInterval) {
        clearInterval(fsTimerInterval);
        fsTimerInterval = null;
    }
    fsTimerSeconds = 0;
    updateFsTimerDisplay();
    document.getElementById('fs-timer').classList.remove('active', 'overtime');
}

function adjustFsTimer(delta) {
    fsTimerSeconds += delta;
    updateFsTimerDisplay();
}

// ==================== FINISH SESSION ====================

function finishSession() {
    if (fsSession.completedSets.length === 0) {
        if (confirm('Aucune série enregistrée. Quitter quand même ?')) {
            closeFullScreenSession();
        }
        return;
    }

    // Build session data grouped by exercise
    const today = new Date().toISOString().split('T')[0];
    const sessionData = [];
    const newPRs = [];

    // Group sets by exercise
    const setsByExercise = {};
    fsSession.completedSets.forEach(set => {
        if (!setsByExercise[set.exerciseIndex]) {
            setsByExercise[set.exerciseIndex] = [];
        }
        setsByExercise[set.exerciseIndex].push(set);
    });

    // Process each exercise
    Object.entries(setsByExercise).forEach(([exIdx, sets]) => {
        const exercise = fsSession.exercises[parseInt(exIdx)];
        const exerciseName = exercise.effectiveName;
        const setsData = sets.map(s => ({
            setNumber: s.setIndex + 1,
            weight: s.weight,
            reps: s.reps,
            completed: true
        }));

        // Check for PRs
        setsData.forEach(setData => {
            if (setData.weight > 0 && setData.reps > 0 && typeof checkForNewPR === 'function') {
                const prCheck = checkForNewPR(exerciseName, setData.weight, setData.reps);
                if (prCheck.isNewPR) {
                    newPRs.push({ exercise: exerciseName, ...prCheck });
                }
            }
        });

        // Save to progress log
        if (!state.progressLog[exerciseName]) {
            state.progressLog[exerciseName] = [];
        }

        const avgWeight = setsData.reduce((sum, s) => sum + s.weight, 0) / setsData.length;
        const totalReps = setsData.reduce((sum, s) => sum + s.reps, 0);

        state.progressLog[exerciseName].push({
            date: today,
            sets: setsData.length,
            weight: Math.round(avgWeight * 10) / 10,
            achievedReps: totalReps,
            achievedSets: setsData.length,
            setsDetail: setsData
        });

        sessionData.push({
            exercise: exerciseName,
            sets: setsData
        });
    });

    // Save session history
    state.sessionHistory.unshift({
        date: today,
        timestamp: Date.now(),
        program: state.wizardResults.selectedProgram,
        day: fsSession.splitName,
        exercises: sessionData,
        duration: Math.round((Date.now() - fsSession.startTime) / 1000 / 60) // minutes
    });

    // Keep only last 100 sessions
    state.sessionHistory = state.sessionHistory.slice(0, 100);

    // Update training progress
    const program = trainingPrograms[state.wizardResults.selectedProgram];
    const splits = program.splits[state.wizardResults.frequency];
    state.trainingProgress.currentSplitIndex = (fsSession.splitIndex + 1) % splits.length;
    state.trainingProgress.lastSessionDate = new Date().toISOString();
    state.trainingProgress.totalSessionsCompleted++;

    // Save state
    saveState();

    // Sync with Supabase
    if (typeof isLoggedIn === 'function' && isLoggedIn()) {
        const sessionToSave = {
            date: today,
            program: state.wizardResults.selectedProgram,
            day: fsSession.splitName,
            exercises: sessionData
        };
        if (typeof saveWorkoutSessionToSupabase === 'function') {
            saveWorkoutSessionToSupabase(sessionToSave).catch(console.error);
        }

        sessionData.forEach(exData => {
            const logs = state.progressLog[exData.exercise];
            if (logs && logs.length > 0) {
                const lastLog = logs[logs.length - 1];
                if (typeof saveProgressLogToSupabase === 'function') {
                    saveProgressLogToSupabase(exData.exercise, lastLog).catch(console.error);
                }
            }
        });
        
        // Sync training progress
        if (typeof saveTrainingSettingsToSupabase === 'function') {
            saveTrainingSettingsToSupabase().catch(console.error);
        }
    }

    // Update streak
    if (typeof updateStreak === 'function') updateStreak();
    
    // Update PRs section
    if (typeof renderPRsSection === 'function') renderPRsSection();
    
    // Update session history
    if (typeof updateSessionHistory === 'function') updateSessionHistory();

    // Close full-screen
    fsSession.completedSets = []; // Clear so close doesn't prompt
    closeFullScreenSession();

    // Show results
    if (newPRs.length > 0) {
        showPRNotification(newPRs);
    } else {
        showToast('Séance enregistrée ! 🎉', 'success');
    }

    // Refresh training section
    renderTrainingSection();
    if (typeof updateDashboard === 'function') updateDashboard();
}

// ==================== UTILITY FUNCTIONS ====================

function getExerciseIdByName(name, muscle = null) {
    // 1. Recherche exacte
    let exercise = defaultExercises.find(e => e.name === name);
    if (exercise) return exercise.id;
    
    // 2. Recherche partielle avec muscle (si fourni)
    if (muscle) {
        exercise = defaultExercises.find(e => 
            e.muscle === muscle && e.name.toLowerCase().includes(name.toLowerCase())
        );
        if (exercise) return exercise.id;
    }
    
    // 3. Recherche partielle sans muscle
    exercise = defaultExercises.find(e => 
        e.name.toLowerCase().includes(name.toLowerCase())
    );
    if (exercise) return exercise.id;
    
    // 4. Recherche inverse (le nom du programme est dans le nom de l'exercice)
    exercise = defaultExercises.find(e => 
        name.toLowerCase().includes(e.name.toLowerCase().split(' ')[0]) &&
        (!muscle || e.muscle === muscle)
    );
    
    return exercise?.id || null;
}

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

function getLastLog(exerciseName) {
    const logs = state.progressLog[exerciseName];
    if (!logs || logs.length === 0) return null;
    return logs[logs.length - 1];
}

function openSessionSettings() {
    document.getElementById('settings-sheet').style.display = 'flex';
}

function closeSettingsSheet() {
    document.getElementById('settings-sheet').style.display = 'none';
}

function adjustRestTime(seconds) {
    fsTimerTarget = seconds;
    closeSettingsSheet();
    showToast(`Repos ajusté à ${seconds}s`, 'success');
}

function returnToPreview() {
    if (confirm('Retourner à l\'aperçu de séance ? Les séries validées seront conservées.')) {
        closeFullScreenSession();
        showSessionPreview(fsSession.splitIndex);
    }
    closeSettingsSheet();
}

function quitSession() {
    if (confirm('Quitter la séance ? Les séries non sauvegardées seront perdues.')) {
        closeFullScreenSession();
    }
    closeSettingsSheet();
}

// ==================== PR NOTIFICATION (from original) ====================

function showPRNotification(prs) {
    // Remplacer les notifications intrusives par des toasts simples
    if (prs.length === 1) {
        showToast(`🏆 ${prs[0].message}`, 'success', 5000);
    } else {
        showToast(`🏆 ${prs.length} nouveaux records !`, 'success', 5000);
    }
    
    // Confirmer la sauvegarde après un court délai
    setTimeout(() => {
        showToast('Séance enregistrée ! 💪', 'success');
    }, 500);
}

// ==================== LEGACY COMPATIBILITY ====================
// Keep these for backward compatibility with other modules

function renderProgramTypes() {
    // Legacy - now handled by wizard
    renderTrainingSection();
}

function updateWeeklySchedule() {
    // Legacy - now handled by sessions list
    renderTrainingSection();
}

function populateSessionDaySelect() {
    // Legacy - no longer needed
}

function loadSessionDay() {
    // Legacy - now handled by full-screen session
}

function loadSessionDayV2() {
    // Legacy - now handled by full-screen session
}

function updateTrainingDays() {
    // Legacy - now handled by wizard
}

/**
 * Ouvrir le bottom sheet avec les infos de l'exercice
 */
function openExerciseTips(exerciseName) {
    // Trouver l'exercice dans la base de données
    const exercise = defaultExercises.find(ex => 
        ex.name === exerciseName || ex.name.includes(exerciseName) || exerciseName.includes(ex.name)
    );
    
    if (!exercise) {
        showToast('Informations non disponibles pour cet exercice', 'info');
        return;
    }
    
    // Remplir le nom
    document.getElementById('info-exercise-name').textContent = exercise.name;
    
    // Remplir les muscles ciblés
    const muscleTagsContainer = document.getElementById('info-muscle-tags');
    if (exercise.muscleTargets && exercise.muscleTargets.length > 0) {
        muscleTagsContainer.innerHTML = exercise.muscleTargets.map(muscle =>
            `<span class="info-muscle-tag">${muscle}</span>`
        ).join('');
    } else {
        muscleTagsContainer.innerHTML = `<span class="info-muscle-tag">${muscleGroups[exercise.muscle]?.name || exercise.muscle}</span>`;
    }
    
    // Remplir les conseils
    const tipsText = document.getElementById('info-tips-text');
    tipsText.textContent = exercise.tips || 'Aucun conseil disponible pour cet exercice.';
    
    // Afficher le bottom sheet
    const sheet = document.getElementById('exercise-info-sheet');
    if (sheet) {
        sheet.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

/**
 * Fermer le bottom sheet d'info exercice
 */
function closeExerciseInfo() {
    const sheet = document.getElementById('exercise-info-sheet');
    if (sheet) {
        sheet.style.display = 'none';
        document.body.style.overflow = '';
    }
}
