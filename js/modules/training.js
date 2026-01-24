// ==================== TRAINING MODULE (REFONTE) ====================
// Nouveau flow: Wizard → Liste Séances → Full-Screen Session

// ==================== WIZARD STATE ====================
let wizardState = {
    currentStep: 1,
    frequency: null,
    goal: null,
    experience: null,
    sensitivities: [], // ['shoulder', 'knee', 'back', 'wrist'] or []
    equipment: null    // 'full-gym', 'home-gym', 'dumbbells-only', 'bodyweight'
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
        experience: state.wizardResults?.experience || null,
        sensitivities: state.wizardResults?.sensitivities || [],
        equipment: state.wizardResults?.equipment || null
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

    // Show/hide steps (now 6 steps)
    for (let i = 1; i <= 6; i++) {
        const stepEl = document.getElementById(`wizard-step-${i}`);
        if (stepEl) {
            stepEl.style.display = i === step ? 'block' : 'none';
        }
    }

    // Update buttons
    const backBtn = document.getElementById('wizard-back-btn');
    const nextBtn = document.getElementById('wizard-next-btn');

    backBtn.style.display = step > 1 ? 'inline-flex' : 'none';

    if (step === 6) {
        // Program selection step - no next button
        nextBtn.style.display = 'none';
    } else {
        nextBtn.style.display = 'inline-flex';
        nextBtn.textContent = 'Suivant';
        
        // Enable/disable based on selection
        let hasSelection = false;
        if (step === 1) hasSelection = wizardState.frequency !== null;
        if (step === 2) hasSelection = wizardState.goal !== null;
        if (step === 3) hasSelection = wizardState.experience !== null;
        if (step === 4) hasSelection = true; // Sensitivities always valid (can be empty)
        if (step === 5) hasSelection = wizardState.equipment !== null;
        nextBtn.disabled = !hasSelection;
    }

    // Update option selections (steps 1-3, 5)
    document.querySelectorAll('.wizard-option:not(.wizard-option-toggle)').forEach(btn => {
        btn.classList.remove('selected');
    });

    if (step === 1 && wizardState.frequency) {
        document.querySelector(`#wizard-step-1 .wizard-option[data-value="${wizardState.frequency}"]`)?.classList.add('selected');
    }
    if (step === 2 && wizardState.goal) {
        document.querySelector(`#wizard-step-2 .wizard-option[data-value="${wizardState.goal}"]`)?.classList.add('selected');
    }
    if (step === 3 && wizardState.experience) {
        document.querySelector(`#wizard-step-3 .wizard-option[data-value="${wizardState.experience}"]`)?.classList.add('selected');
    }
    if (step === 5 && wizardState.equipment) {
        document.querySelector(`#wizard-step-5 .wizard-option[data-value="${wizardState.equipment}"]`)?.classList.add('selected');
    }

    // Update sensitivity toggles (step 4)
    if (step === 4) {
        updateSensitivityToggles();
    }

    // If step 6, show programs
    if (step === 6) {
        renderProgramRecommendations();
    }
}

/**
 * Update sensitivity toggle buttons UI
 */
function updateSensitivityToggles() {
    const noneSelected = wizardState.sensitivities.length === 0;
    
    document.querySelectorAll('#wizard-step-4 .wizard-option-toggle').forEach(btn => {
        const value = btn.dataset.value;
        if (value === 'none') {
            btn.classList.toggle('selected', noneSelected);
        } else {
            btn.classList.toggle('selected', wizardState.sensitivities.includes(value));
        }
    });
}

/**
 * Toggle sensitivity selection (multi-select)
 */
function toggleWizardSensitivity(value) {
    if (value === 'none') {
        // Clear all sensitivities
        wizardState.sensitivities = [];
    } else {
        // Toggle this sensitivity
        const idx = wizardState.sensitivities.indexOf(value);
        if (idx > -1) {
            wizardState.sensitivities.splice(idx, 1);
        } else {
            wizardState.sensitivities.push(value);
        }
    }
    
    updateSensitivityToggles();
    
    // Enable next button (always valid)
    document.getElementById('wizard-next-btn').disabled = false;
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
    if (wizardState.currentStep < 6) {
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
    // Save wizard results (including new coach fields)
    state.wizardResults = {
        frequency: wizardState.frequency,
        goal: wizardState.goal,
        experience: wizardState.experience,
        sensitivities: wizardState.sensitivities || [],
        equipment: wizardState.equipment || 'full-gym',
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

    // Récupérer les préférences utilisateur pour l'adaptation
    const userProfile = {
        sensitivities: state.wizardResults?.sensitivities || [],
        equipment: state.wizardResults?.equipment || 'full-gym'
    };
    
    // Remplir avec le template ou les exercices par défaut (avec adaptation auto)
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
        // Adapter automatiquement les exercices selon les sensibilités/équipement
        previewSession.exercises = defaultExercises.map(ex => {
            // Utiliser la fonction d'adaptation si disponible
            if (typeof findSafeExercise === 'function') {
                const adaptedEx = findSafeExercise(ex.name, userProfile.sensitivities, userProfile.equipment);
                
                if (adaptedEx && adaptedEx.wasSwapped) {
                    return {
                        originalName: ex.name,
                        muscle: ex.muscle,
                        sets: ex.sets,
                        reps: ex.reps,
                        swappedId: adaptedEx.id,
                        swappedName: adaptedEx.name,
                        isModified: true,
                        autoAdapted: true,
                        adaptReason: adaptedEx.swapReason
                    };
                }
            }
            
            return {
                originalName: ex.name,
                muscle: ex.muscle,
                sets: ex.sets,
                reps: ex.reps,
                swappedId: null,
                swappedName: null,
                isModified: false
            };
        });
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
        const isAutoAdapted = ex.autoAdapted;
        
        // Badge selon le type de modification
        let badge = '';
        if (isAutoAdapted) {
            const reasonLabel = ex.adaptReason === 'sensibilité' ? '🛡️ Adapté' : '🔧 Adapté';
            badge = `<span class="preview-exercise-adapted-badge">${reasonLabel}</span>`;
        } else if (isModified) {
            badge = '<span class="preview-exercise-modified-badge">✓ Modifié</span>';
        }

        return `
            <div class="preview-exercise-item ${isModified ? 'modified' : ''} ${isAutoAdapted ? 'auto-adapted' : ''}" data-index="${idx}">
                <div class="preview-exercise-info">
                    <span class="preview-exercise-name">
                        ${displayName}
                        ${badge}
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
 * Version améliorée avec sections hiérarchiques et recherche
 */
function openExerciseSwapSheet(exerciseIndex) {
    const exercise = previewSession.exercises[exerciseIndex];
    if (!exercise) return;

    // Stocker l'index et l'exercice ID pour le swap
    previewSession.currentSwapIndex = exerciseIndex;
    const originalExerciseId = getExerciseIdByName(exercise.originalName, exercise.muscle);
    previewSession.currentSwapExerciseId = originalExerciseId;

    // Nom actuel
    const displayName = exercise.swappedName || exercise.originalName;
    document.getElementById('swap-current-name').textContent = displayName;

    // Réinitialiser la recherche
    const searchInput = document.getElementById('swap-search-input');
    if (searchInput) {
        searchInput.value = '';
    }

    // Obtenir les exercices équivalents et du même muscle
    const favoriteExercises = state.wizardResults?.favoriteExercises || [];
    const exerciseData = getEquivalentExercises(originalExerciseId, favoriteExercises);

    // Stocker pour la recherche
    previewSession.swapExerciseData = exerciseData;

    // Render les sections
    renderSwapSections(exerciseData.equivalents, exerciseData.sameMuscle, []);

    // Afficher le bottom sheet avec animation iOS-like
    const sheet = document.getElementById('swap-bottom-sheet');
    sheet.style.display = 'flex';
    sheet.offsetHeight;
    sheet.classList.remove('animate-in');
    void sheet.offsetWidth;
    sheet.classList.add('animate-in');
    
    // Initialiser le swipe to dismiss
    initSwapSheetSwipe();
}

/**
 * Render les sections du swap bottom sheet
 */
function renderSwapSections(equivalents, sameMuscle, searchResults) {
    const container = document.getElementById('swap-options-list');
    const searchResultsSection = document.getElementById('swap-search-results');
    const sectionsContainer = document.getElementById('swap-sections');
    
    // Si on a des résultats de recherche, les afficher
    if (searchResults && searchResults.length > 0) {
        if (searchResultsSection) searchResultsSection.style.display = 'block';
        if (sectionsContainer) sectionsContainer.style.display = 'none';
        
        if (searchResultsSection) {
            searchResultsSection.innerHTML = `
                <div class="swap-section">
                    <div class="swap-section-header">
                        <span class="swap-section-icon">🔍</span>
                        <span class="swap-section-title">Résultats de recherche</span>
                        <span class="swap-section-count">${searchResults.length}</span>
                    </div>
                    <div class="swap-section-list">
                        ${renderSwapItems(searchResults)}
                    </div>
                </div>
            `;
        }
        return;
    }
    
    // Sinon, afficher les sections normales
    if (searchResultsSection) searchResultsSection.style.display = 'none';
    if (sectionsContainer) sectionsContainer.style.display = 'block';
    
    let html = '';
    
    // Section 1: Exercices équivalents (même pattern)
    if (equivalents && equivalents.length > 0) {
        html += `
            <div class="swap-section">
                <div class="swap-section-header">
                    <span class="swap-section-icon">⚡</span>
                    <span class="swap-section-title">Exercices équivalents</span>
                    <span class="swap-section-count">${equivalents.length}</span>
                </div>
                <p class="swap-section-subtitle">Même mouvement, résultats similaires</p>
                <div class="swap-section-list">
                    ${renderSwapItems(equivalents)}
                </div>
            </div>
        `;
    }
    
    // Section 2: Autres exercices du même muscle
    if (sameMuscle && sameMuscle.length > 0) {
        const currentExercise = previewSession.exercises[previewSession.currentSwapIndex];
        const muscleName = muscleGroups[currentExercise?.muscle]?.name || 'ce muscle';
        
        html += `
            <div class="swap-section">
                <div class="swap-section-header">
                    <span class="swap-section-icon">💪</span>
                    <span class="swap-section-title">Autres exercices ${muscleName}</span>
                    <span class="swap-section-count">${sameMuscle.length}</span>
                </div>
                <p class="swap-section-subtitle">Même groupe musculaire</p>
                <div class="swap-section-list">
                    ${renderSwapItems(sameMuscle)}
                </div>
            </div>
        `;
    }
    
    // Message si aucun exercice
    if ((!equivalents || equivalents.length === 0) && (!sameMuscle || sameMuscle.length === 0)) {
        html = `
            <div class="empty-state" style="padding: 30px;">
                <p style="color: var(--text-muted);">Utilise la recherche pour trouver un exercice</p>
            </div>
        `;
    }
    
    if (sectionsContainer) {
        sectionsContainer.innerHTML = html;
    }
}

/**
 * Render les items d'une section de swap
 */
function renderSwapItems(exercises) {
    if (!exercises || exercises.length === 0) return '';
    
    return exercises.map(eq => `
        <div class="swap-option-item ${eq.isFavorite ? 'is-favorite' : ''}" 
             onclick="swapExerciseInPreview('${eq.id}')">
            <div class="swap-option-info">
                <span class="swap-option-name">
                    ${eq.name}
                    ${eq.isFavorite ? '<span class="swap-option-favorite-badge">★</span>' : ''}
                </span>
                <span class="swap-option-muscle">${muscleGroups[eq.muscle]?.name || eq.muscle}</span>
            </div>
            <span class="swap-option-equip">${equipmentTypes[eq.equipment] || eq.equipment}</span>
        </div>
    `).join('');
}

/**
 * Gère la recherche dans le swap bottom sheet
 */
function handleSwapSearch(query) {
    const favoriteExercises = state.wizardResults?.favoriteExercises || [];
    const excludeId = previewSession.currentSwapExerciseId;
    
    // Afficher/masquer le bouton clear
    const clearBtn = document.querySelector('.swap-search-clear');
    if (clearBtn) {
        clearBtn.style.display = query && query.length > 0 ? 'flex' : 'none';
    }
    
    if (!query || query.length < 2) {
        // Réafficher les sections normales
        const exerciseData = previewSession.swapExerciseData;
        if (exerciseData) {
            renderSwapSections(exerciseData.equivalents, exerciseData.sameMuscle, []);
        }
        return;
    }
    
    // Rechercher les exercices
    const results = searchExercises(query, excludeId, favoriteExercises);
    renderSwapSections([], [], results);
}

/**
 * Efface la recherche et revient aux sections
 */
function clearSwapSearch() {
    const searchInput = document.getElementById('swap-search-input');
    if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
    }
    
    // Masquer le bouton clear
    const clearBtn = document.querySelector('.swap-search-clear');
    if (clearBtn) {
        clearBtn.style.display = 'none';
    }
    
    const exerciseData = previewSession.swapExerciseData;
    if (exerciseData) {
        renderSwapSections(exerciseData.equivalents, exerciseData.sameMuscle, []);
    }
}

/**
 * Ferme le bottom sheet
 */
function closeBottomSheet() {
    document.getElementById('swap-bottom-sheet').style.display = 'none';
}

// Variable pour stocker le swap en attente (pour confirmation des paramètres)
let pendingSwap = null;

/**
 * Swap un exercice dans l'aperçu
 * Détecte si le type d'exercice change et propose une adaptation des paramètres
 */
function swapExerciseInPreview(exerciseId) {
    const exercise = state.exercises.find(e => e.id === exerciseId);
    if (!exercise || previewSession.currentSwapIndex === null) return;

    const idx = previewSession.currentSwapIndex;
    const currentExercise = previewSession.exercises[idx];
    
    // Récupérer l'ID original (soit swappedId si déjà modifié, soit l'original)
    const originalId = currentExercise.swappedId || previewSession.currentSwapExerciseId;
    
    // Détecter si le type d'exercice change
    const typeChange = detectTypeChange(originalId, exerciseId);
    
    if (typeChange.changed) {
        // Stocker le swap en attente
        pendingSwap = {
            exerciseId: exerciseId,
            exerciseName: exercise.name,
            idx: idx,
            fromType: typeChange.from,
            toType: typeChange.to,
            originalSets: currentExercise.sets,
            originalReps: currentExercise.reps
        };
        
        // Récupérer les paramètres suggérés (hypertrophie par défaut)
        const suggested = getSuggestedParams(exerciseId, 'hypertrophy');
        
        // Fermer le sheet de swap et afficher le sheet de confirmation
        closeBottomSheet();
        showParamsConfirmationSheet(exercise.name, typeChange.to, suggested, currentExercise);
    } else {
        // Pas de changement de type, faire le swap direct
        executeSwap(exerciseId, exercise.name, idx);
    }
}

/**
 * Exécute le swap d'exercice (sans modification des paramètres)
 */
function executeSwap(exerciseId, exerciseName, idx) {
    previewSession.exercises[idx].swappedId = exerciseId;
    previewSession.exercises[idx].swappedName = exerciseName;
    previewSession.exercises[idx].isModified = true;
    previewSession.hasChanges = true;

    closeBottomSheet();
    closeParamsConfirmationSheet();
    showToast(`Exercice changé pour ${exerciseName}`, 'success');

    // Re-render
    renderSessionPreviewUI();
}

/**
 * Exécute le swap avec les nouveaux paramètres suggérés
 */
function executeSwapWithParams(exerciseId, exerciseName, idx, newSets, newRepsMin, newRepsMax) {
    previewSession.exercises[idx].swappedId = exerciseId;
    previewSession.exercises[idx].swappedName = exerciseName;
    previewSession.exercises[idx].sets = newSets;
    previewSession.exercises[idx].reps = `${newRepsMin}-${newRepsMax}`;
    previewSession.exercises[idx].isModified = true;
    previewSession.hasChanges = true;

    closeParamsConfirmationSheet();
    showToast(`${exerciseName} : ${newSets}x${newRepsMin}-${newRepsMax}`, 'success');

    // Re-render
    renderSessionPreviewUI();
}

/**
 * Affiche le bottom sheet de confirmation des paramètres
 */
function showParamsConfirmationSheet(exerciseName, exerciseType, suggested, currentExercise) {
    const sheet = document.getElementById('params-confirmation-sheet');
    if (!sheet) return;
    
    const typeLabel = exerciseType === 'isolation' ? 'Isolation' : 'Composé';
    const typeIcon = exerciseType === 'isolation' ? '🎯' : '💪';
    
    document.getElementById('params-exercise-name').textContent = exerciseName;
    document.getElementById('params-exercise-type').textContent = `${typeIcon} Exercice ${typeLabel}`;
    document.getElementById('params-suggested-sets').textContent = suggested.sets;
    document.getElementById('params-suggested-reps').textContent = suggested.reps;
    document.getElementById('params-suggested-rest').textContent = `${suggested.rest}s`;
    document.getElementById('params-current-sets').textContent = currentExercise.sets;
    document.getElementById('params-current-reps').textContent = currentExercise.reps || '-';
    
    sheet.style.display = 'flex';
    sheet.offsetHeight;
    sheet.classList.remove('animate-in');
    void sheet.offsetWidth;
    sheet.classList.add('animate-in');
}

/**
 * Ferme le bottom sheet de confirmation des paramètres
 */
function closeParamsConfirmationSheet() {
    const sheet = document.getElementById('params-confirmation-sheet');
    if (sheet) {
        sheet.style.display = 'none';
    }
    pendingSwap = null;
}

/**
 * Applique les paramètres suggérés
 */
function applySwapWithSuggestedParams() {
    if (!pendingSwap) return;
    
    const suggested = getSuggestedParams(pendingSwap.exerciseId, 'hypertrophy');
    executeSwapWithParams(
        pendingSwap.exerciseId,
        pendingSwap.exerciseName,
        pendingSwap.idx,
        suggested.sets,
        suggested.repsMin,
        suggested.repsMax
    );
}

/**
 * Garde les anciens paramètres lors du swap
 */
function applySwapKeepParams() {
    if (!pendingSwap) return;
    
    executeSwap(pendingSwap.exerciseId, pendingSwap.exerciseName, pendingSwap.idx);
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
    const sheet = document.getElementById('duration-picker-sheet');
    sheet.style.display = 'flex';
    sheet.offsetHeight;
    sheet.classList.remove('animate-in');
    void sheet.offsetWidth;
    sheet.classList.add('animate-in');
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
    
    // Afficher l'écran d'aperçu avec animation iOS-like
    const previewElement = document.getElementById('session-preview');
    previewElement.style.display = 'flex';
    // Force reflow to trigger animation
    previewElement.offsetHeight;
    previewElement.classList.remove('animate-in');
    void previewElement.offsetWidth;
    previewElement.classList.add('animate-in');
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

    // Show full-screen UI with iOS-like animation
    const fsElement = document.getElementById('fullscreen-session');
    fsElement.style.display = 'flex';
    // Force reflow to trigger animation
    fsElement.offsetHeight;
    fsElement.classList.remove('animate-in');
    void fsElement.offsetWidth; // Force reflow
    fsElement.classList.add('animate-in');
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

// Constantes de validation
const MAX_REPS = 500;
const MAX_WEIGHT = 500; // kg
const MIN_REPS = 0;
const MIN_WEIGHT = 0;

function adjustWeight(delta) {
    const input = document.getElementById('fs-weight-input');
    const current = parseFloat(input.value) || 0;
    const newValue = current + delta;
    
    if (newValue > MAX_WEIGHT) {
        showToast(`Maximum ${MAX_WEIGHT}kg`, 'warning');
        input.value = MAX_WEIGHT;
    } else if (newValue < MIN_WEIGHT) {
        input.value = MIN_WEIGHT;
    } else {
        input.value = newValue;
    }
}

function adjustReps(delta) {
    const input = document.getElementById('fs-reps-input');
    const current = parseInt(input.value) || 0;
    const newValue = current + delta;
    
    if (newValue > MAX_REPS) {
        showToast(`Maximum ${MAX_REPS} répétitions`, 'warning');
        input.value = MAX_REPS;
    } else if (newValue < MIN_REPS) {
        input.value = MIN_REPS;
    } else {
        input.value = newValue;
    }
}

function validateCurrentSet() {
    const weight = parseFloat(document.getElementById('fs-weight-input').value) || 0;
    const repsInput = document.getElementById('fs-reps-input');
    const reps = parseInt(repsInput.value) || parseInt(repsInput.placeholder) || 0;

    // Validation stricte : reps obligatoires, poids optionnel (poids de corps)
    if (reps <= 0) {
        showToast('Entre au moins 1 répétition', 'error');
        return;
    }
    
    if (reps > MAX_REPS) {
        showToast(`Maximum ${MAX_REPS} répétitions`, 'error');
        return;
    }
    
    if (weight < 0) {
        showToast('Le poids ne peut pas être négatif', 'error');
        return;
    }
    
    if (weight > MAX_WEIGHT) {
        showToast(`Maximum ${MAX_WEIGHT}kg`, 'error');
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
        
        // Start rest timer (après la première série)
        if (fsSession.currentSetIndex >= 1) {
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
    const sheet = document.getElementById('settings-sheet');
    sheet.style.display = 'flex';
    sheet.offsetHeight;
    sheet.classList.remove('animate-in');
    void sheet.offsetWidth;
    sheet.classList.add('animate-in');
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
 * Ouvrir le bottom sheet avec les infos de l'exercice - Version Coach Premium
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
    
    // Gestion de l'image Hero
    const heroImage = document.getElementById('info-exercise-image');
    const heroFallback = document.getElementById('info-exercise-fallback');
    
    // Icônes fallback selon le groupe musculaire
    const muscleIcons = {
        'chest': '🫁', 'back': '🔙', 'shoulders': '🎯', 'rear-delts': '🎯',
        'triceps': '💪', 'biceps': '💪', 'quads': '🦵', 'hamstrings': '🦵',
        'glutes': '🍑', 'calves': '🦶', 'traps': '🔺', 'abs': '🎽', 'forearms': '✊'
    };
    const fallbackIcon = muscleIcons[exercise.muscle] || '💪';
    
    if (heroImage && heroFallback) {
        // Réinitialiser l'état
        heroImage.style.display = 'none';
        heroFallback.style.display = 'flex';
        heroFallback.textContent = fallbackIcon;
        
        // Essayer de charger l'image depuis Supabase Storage
        if (typeof getExerciseImageUrl === 'function' && exercise.id) {
            const imageUrl = getExerciseImageUrl(exercise.id);
            heroImage.src = imageUrl;
            heroImage.alt = exercise.name;
            
            // Gérer le chargement
            heroImage.onload = function() {
                this.style.display = 'block';
                heroFallback.style.display = 'none';
            };
            heroImage.onerror = function() {
                this.style.display = 'none';
                heroFallback.style.display = 'flex';
            };
        }
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
    
    // === NOUVELLES SECTIONS COACH ===
    
    // Execution
    const executionSection = document.getElementById('info-execution-section');
    const executionText = document.getElementById('info-execution-text');
    if (exercise.execution && executionSection && executionText) {
        executionText.textContent = exercise.execution;
        executionSection.style.display = 'block';
    } else if (executionSection) {
        executionSection.style.display = 'none';
    }
    
    // Cues (Points clés)
    const cuesSection = document.getElementById('info-cues-section');
    const cuesList = document.getElementById('info-cues-list');
    if (exercise.cues && exercise.cues.length > 0 && cuesSection && cuesList) {
        cuesList.innerHTML = exercise.cues.map(cue => 
            `<li class="info-cue-item"><span class="cue-bullet">✓</span> ${cue}</li>`
        ).join('');
        cuesSection.style.display = 'block';
    } else if (cuesSection) {
        cuesSection.style.display = 'none';
    }
    
    // Common Mistakes (Erreurs)
    const mistakesSection = document.getElementById('info-mistakes-section');
    const mistakesList = document.getElementById('info-mistakes-list');
    if (exercise.commonMistakes && exercise.commonMistakes.length > 0 && mistakesSection && mistakesList) {
        mistakesList.innerHTML = exercise.commonMistakes.map(mistake => 
            `<li class="info-mistake-item"><span class="mistake-bullet">✗</span> ${mistake}</li>`
        ).join('');
        mistakesSection.style.display = 'block';
    } else if (mistakesSection) {
        mistakesSection.style.display = 'none';
    }
    
    // Tips (fallback si pas de cues/execution)
    const tipsSection = document.getElementById('info-tips-section');
    const tipsText = document.getElementById('info-tips-text');
    if (tipsText) {
        tipsText.textContent = exercise.tips || 'Aucun conseil disponible pour cet exercice.';
    }
    // Masquer tips si on a execution ou cues
    if (tipsSection) {
        tipsSection.style.display = (exercise.execution || exercise.cues) ? 'none' : 'block';
    }
    
    // Afficher le bottom sheet avec animation iOS-like
    const sheet = document.getElementById('exercise-info-sheet');
    if (sheet) {
        sheet.style.display = 'flex';
        sheet.offsetHeight;
        sheet.classList.remove('animate-in');
        void sheet.offsetWidth;
        sheet.classList.add('animate-in');
        document.body.style.overflow = 'hidden';
        
        // Initialiser le swipe to dismiss (une seule fois)
        initExerciseSheetSwipe();
    }
}

/**
 * Initialiser le swipe to dismiss pour la bottom sheet exercice
 */
let exerciseSheetSwipeInitialized = false;
let swipeStartY = 0;
let swipeCurrentY = 0;
let isSwipeDragging = false;

function initExerciseSheetSwipe() {
    if (exerciseSheetSwipeInitialized) return;
    
    const sheetContainer = document.querySelector('#exercise-info-sheet .bottom-sheet');
    const content = sheetContainer.querySelector('.bottom-sheet-content');
    
    if (!sheetContainer || !content) return;
    
    sheetContainer.addEventListener('touchstart', (e) => {
        swipeStartY = e.touches[0].clientY;
        swipeCurrentY = swipeStartY;
        // Ne permettre le drag que si on est en haut du scroll
        isSwipeDragging = content.scrollTop === 0;
    }, { passive: true });
    
    sheetContainer.addEventListener('touchmove', (e) => {
        if (!isSwipeDragging) return;
        
        swipeCurrentY = e.touches[0].clientY;
        const deltaY = swipeCurrentY - swipeStartY;
        
        // Uniquement si on swipe vers le bas
        if (deltaY > 0) {
            sheetContainer.classList.add('dragging');
            sheetContainer.style.transform = `translateY(${deltaY}px)`;
            // Empêcher le scroll du contenu pendant le drag
            if (deltaY > 10) {
                e.preventDefault();
            }
        }
    }, { passive: false });
    
    sheetContainer.addEventListener('touchend', () => {
        if (!isSwipeDragging) return;
        
        const deltaY = swipeCurrentY - swipeStartY;
        sheetContainer.classList.remove('dragging');
        
        // Si on a swipé plus de 100px vers le bas, on ferme
        if (deltaY > 100) {
            // Animation de fermeture vers le bas
            sheetContainer.style.transition = 'transform 0.3s ease-out';
            sheetContainer.style.transform = 'translateY(100%)';
            setTimeout(() => {
                closeExerciseInfo();
                sheetContainer.style.transform = '';
                sheetContainer.style.transition = '';
            }, 300);
        } else {
            // Sinon on revient en position
            sheetContainer.style.transform = '';
        }
        
        isSwipeDragging = false;
        swipeStartY = 0;
        swipeCurrentY = 0;
    }, { passive: true });
    
    exerciseSheetSwipeInitialized = true;
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

/**
 * Initialiser le swipe to dismiss pour le bottom sheet swap exercice
 */
let swapSheetSwipeInitialized = false;
let swapSwipeStartY = 0;
let swapSwipeCurrentY = 0;
let isSwapSwipeDragging = false;

function initSwapSheetSwipe() {
    if (swapSheetSwipeInitialized) return;
    
    const sheetContainer = document.querySelector('#swap-bottom-sheet .bottom-sheet');
    const scrollableContent = sheetContainer?.querySelector('.swap-scrollable-content');
    const stickyHeader = sheetContainer?.querySelector('.swap-sticky-header');
    
    if (!sheetContainer) return;
    
    // Permettre le swipe depuis le header sticky ou depuis le handle
    const dragTargets = [stickyHeader, sheetContainer.querySelector('.bottom-sheet-header')].filter(Boolean);
    
    dragTargets.forEach(target => {
        target.addEventListener('touchstart', (e) => {
            swapSwipeStartY = e.touches[0].clientY;
            swapSwipeCurrentY = swapSwipeStartY;
            isSwapSwipeDragging = true;
        }, { passive: true });
    });
    
    // Permettre aussi le swipe depuis le contenu si on est en haut du scroll
    if (scrollableContent) {
        scrollableContent.addEventListener('touchstart', (e) => {
            swapSwipeStartY = e.touches[0].clientY;
            swapSwipeCurrentY = swapSwipeStartY;
            // Ne permettre le drag que si on est en haut du scroll
            isSwapSwipeDragging = scrollableContent.scrollTop <= 5;
        }, { passive: true });
    }
    
    sheetContainer.addEventListener('touchmove', (e) => {
        if (!isSwapSwipeDragging) return;
        
        swapSwipeCurrentY = e.touches[0].clientY;
        const deltaY = swapSwipeCurrentY - swapSwipeStartY;
        
        // Uniquement si on swipe vers le bas
        if (deltaY > 0) {
            sheetContainer.classList.add('dragging');
            sheetContainer.style.transform = `translateY(${deltaY}px)`;
            // Empêcher le scroll du contenu pendant le drag
            if (deltaY > 10) {
                e.preventDefault();
            }
        }
    }, { passive: false });
    
    sheetContainer.addEventListener('touchend', () => {
        if (!isSwapSwipeDragging) return;
        
        const deltaY = swapSwipeCurrentY - swapSwipeStartY;
        sheetContainer.classList.remove('dragging');
        
        // Si on a swipé plus de 100px vers le bas, on ferme
        if (deltaY > 100) {
            // Animation de fermeture vers le bas
            sheetContainer.style.transition = 'transform 0.3s ease-out';
            sheetContainer.style.transform = 'translateY(100%)';
            setTimeout(() => {
                closeBottomSheet();
                sheetContainer.style.transform = '';
                sheetContainer.style.transition = '';
            }, 300);
        } else {
            // Sinon on revient en position
            sheetContainer.style.transform = '';
        }
        
        isSwapSwipeDragging = false;
        swapSwipeStartY = 0;
        swapSwipeCurrentY = 0;
    }, { passive: true });
    
    swapSheetSwipeInitialized = true;
}
