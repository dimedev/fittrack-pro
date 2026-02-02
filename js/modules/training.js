// ==================== TRAINING MODULE (REFONTE) ====================
// Nouveau flow: Wizard → Liste Séances → Full-Screen Session

// ==================== PERIODIZATION CYCLE PRESETS ====================
const CYCLE_PRESETS = {
    '4': {
        name: 'Rapide',
        totalWeeks: 4,
        phases: {
            hypertrophy: {
                weeks: [1, 2],
                repsMin: 8, repsMax: 12,
                setsMultiplier: 1.0, weightMultiplier: 1.0, restMultiplier: 1.0,
                targetRPE: 7
            },
            strength: {
                weeks: [3],
                repsMin: 4, repsMax: 6,
                setsMultiplier: 1.0, weightMultiplier: 1.05, restMultiplier: 1.25,
                targetRPE: 8
            },
            deload: {
                weeks: [4],
                repsMin: 6, repsMax: 10,
                setsMultiplier: 0.7, weightMultiplier: 0.85, restMultiplier: 0.8,
                targetRPE: 5
            }
        },
        plannedVolume: { 1: 1.0, 2: 1.10, 3: 1.05, 4: 0.65 }
    },
    '8': {
        name: 'Classique',
        totalWeeks: 8,
        phases: {
            hypertrophy: {
                weeks: [1, 2, 3, 4],
                repsMin: 8, repsMax: 12,
                setsMultiplier: 1.0, weightMultiplier: 1.0, restMultiplier: 1.0,
                targetRPE: 7
            },
            strength: {
                weeks: [5, 6],
                repsMin: 4, repsMax: 6,
                setsMultiplier: 1.0, weightMultiplier: 1.05, restMultiplier: 1.25,
                targetRPE: 8
            },
            peak: {
                weeks: [7],
                repsMin: 1, repsMax: 3,
                setsMultiplier: 0.8, weightMultiplier: 1.10, restMultiplier: 1.5,
                targetRPE: 9
            },
            deload: {
                weeks: [8],
                repsMin: 6, repsMax: 10,
                setsMultiplier: 0.6, weightMultiplier: 0.80, restMultiplier: 0.8,
                targetRPE: 5
            }
        },
        plannedVolume: { 1: 1.0, 2: 1.05, 3: 1.10, 4: 1.15, 5: 1.10, 6: 1.05, 7: 0.90, 8: 0.60 }
    },
    '12': {
        name: 'Transformation',
        totalWeeks: 12,
        phases: {
            hypertrophy: {
                weeks: [1, 2, 3, 4, 5, 6],
                repsMin: 8, repsMax: 12,
                setsMultiplier: 1.0, weightMultiplier: 1.0, restMultiplier: 1.0,
                targetRPE: 7
            },
            strength: {
                weeks: [7, 8, 9, 10],
                repsMin: 4, repsMax: 6,
                setsMultiplier: 1.0, weightMultiplier: 1.05, restMultiplier: 1.25,
                targetRPE: 8
            },
            deload: {
                weeks: [11, 12],
                repsMin: 6, repsMax: 10,
                setsMultiplier: 0.6, weightMultiplier: 0.80, restMultiplier: 0.8,
                targetRPE: 5
            }
        },
        plannedVolume: { 1: 1.0, 2: 1.03, 3: 1.06, 4: 1.09, 5: 1.12, 6: 1.15, 7: 1.10, 8: 1.05, 9: 1.00, 10: 0.95, 11: 0.60, 12: 0.55 }
    }
};

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
    sessionId: null, // UUID unique pour idempotence
    sessionSaved: false, // Protection contre double sauvegarde
    active: false,
    splitIndex: 0,
    splitName: '',
    exercises: [],
    currentExerciseIndex: 0,
    currentSetIndex: 0,
    completedSets: [], // { exerciseIndex, setIndex, weight, reps, isDrop, isRestPause }
    startTime: null,
    supersets: [], // { exercise1Index, exercise2Index } pour les paires de supersets
    currentSuperset: null, // Index du superset en cours (null si pas en superset)
    supersetPhase: null, // 'A' ou 'B' (A = premier exercice, B = deuxième)
    isDropMode: false, // Mode drop set actif
    isRestPauseMode: false // Mode rest-pause actif
};

// ==================== SESSION PERSISTENCE ====================
let fsSessionSaveInterval = null;

/**
 * Sauvegarde fsSession dans localStorage
 */
function saveFsSessionToStorage() {
    if (!fsSession.active) return;
    
    try {
        const sessionData = {
            ...fsSession,
            savedAt: Date.now()
        };
        localStorage.setItem('pendingFsSession', JSON.stringify(sessionData));
        console.log('💾 Séance sauvegardée automatiquement');
    } catch (err) {
        console.error('Erreur sauvegarde session:', err);
    }
}

/**
 * Charge fsSession depuis localStorage
 */
function loadFsSessionFromStorage() {
    try {
        const saved = localStorage.getItem('pendingFsSession');
        if (!saved) return null;
        
        const sessionData = JSON.parse(saved);
        // Vérifier que la session n'est pas trop ancienne (max 24h)
        if (Date.now() - sessionData.savedAt > 24 * 60 * 60 * 1000) {
            localStorage.removeItem('pendingFsSession');
            return null;
        }
        
        return sessionData;
    } catch (err) {
        console.error('Erreur chargement session:', err);
        return null;
    }
}

/**
 * Supprime la session sauvegardée
 */
function clearFsSessionFromStorage() {
    localStorage.removeItem('pendingFsSession');
    console.log('🗑️  Session sauvegardée supprimée');
}

/**
 * Démarre la sauvegarde automatique
 */
function startAutoSaveFsSession() {
    if (fsSessionSaveInterval) return;
    
    // Sauvegarder immédiatement
    saveFsSessionToStorage();
    
    // Puis toutes les 20 secondes
    fsSessionSaveInterval = setInterval(() => {
        saveFsSessionToStorage();
    }, 20000);
}

/**
 * Arrête la sauvegarde automatique
 */
function stopAutoSaveFsSession() {
    if (fsSessionSaveInterval) {
        clearInterval(fsSessionSaveInterval);
        fsSessionSaveInterval = null;
    }
}

/**
 * Restaure une session en cours après crash/refresh
 */
function tryRestorePendingSession() {
    const savedSession = loadFsSessionFromStorage();
    if (!savedSession) return;
    
    // Proposer à l'utilisateur de restaurer
    const elapsedMinutes = Math.floor((Date.now() - savedSession.startTime) / 60000);
    const message = `Tu as une séance "${savedSession.splitName}" en cours (${elapsedMinutes} min). Reprendre ?`;
    
    if (confirm(message)) {
        // Restaurer la session
        fsSession = savedSession;
        
        // Migration : initialiser les champs manquants (sessions pré-v30)
        if (!fsSession.supersets) fsSession.supersets = [];
        if (!fsSession.currentSuperset) fsSession.currentSuperset = null;
        if (!fsSession.supersetPhase) fsSession.supersetPhase = null;
        if (!fsSession.isDropMode) fsSession.isDropMode = false;
        
        // Afficher l'UI
        const fsElement = document.getElementById('fullscreen-session');
        if (fsElement) {
            fsElement.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            
            // Masquer la nav
            const nav = document.querySelector('.nav');
            const mobileNav = document.querySelector('.mobile-nav');
            if (nav) nav.style.display = 'none';
            if (mobileNav) mobileNav.style.display = 'none';
            
            // Rendre l'exercice courant
            renderCurrentExercise();
            
            // Reprendre la sauvegarde auto
            startAutoSaveFsSession();
            
            console.log('✅ Séance restaurée');
        }
    } else {
        // Utilisateur refuse, supprimer la sauvegarde
        clearFsSessionFromStorage();
    }
}

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

    // Infos périodisation
    const phase = state.periodization?.currentPhase || 'hypertrophy';
    const week = state.periodization?.currentWeek || 1;
    const cycleType = state.periodization?.cycleType || '4';
    const totalWeeks = CYCLE_PRESETS[cycleType]?.totalWeeks || 4;
    const phaseIcons = { hypertrophy: '💪', strength: '🏋️', deload: '🧘', peak: '⚡' };
    const phaseNames = { hypertrophy: 'Hypertrophie', strength: 'Force', deload: 'Deload', peak: 'Peak' };

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

        <!-- Periodization Badge -->
        <div class="training-period-card" onclick="openPeriodizationSheet()">
            <div class="training-period-info">
                <span class="training-period-badge ${phase}">${phaseIcons[phase]} ${phaseNames[phase]}</span>
                <span class="training-period-week">Semaine ${week}/${totalWeeks} • Cycle ${state.periodization?.currentCycle || 1}</span>
            </div>
            <div class="training-period-action">
                <span>Configurer</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </div>
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
    // Validation avant de passer au step suivant
    if (wizardState.currentStep === 5 && !wizardState.equipment) {
        showToast('Veuillez sélectionner votre équipement', 'error');
        return;
    }
    
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

function getProgramRecommendations(frequency, userEquipment = null) {
    // Détecter l'équipement utilisateur
    const equipment = userEquipment || state.profile?.equipment || 'full-gym';
    
    // Recommendations basées sur fréquence
    const baseRecommendations = {
        3: ['full-body', 'ppl', 'upper-lower'],
        4: ['upper-lower', 'ppl', 'full-body'],
        5: ['ppl', 'bro-split', 'upper-lower'],
        6: ['ppl', 'arnold', 'bro-split']
    };

    const recommended = baseRecommendations[frequency] || ['ppl', 'upper-lower', 'full-body'];
    
    // Filtrer les programmes selon l'équipement disponible
    // Pour l'instant tous les programmes sont potentiellement compatibles car on adapte les exercices
    // Mais on pourrait vouloir ne pas recommander certains programmes si trop d'adaptations nécessaires
    return recommended;
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
    // VALIDATION stricte: vérifier que l'équipement est défini
    if (!wizardState.equipment) {
        showToast('Veuillez sélectionner votre équipement', 'error');
        wizardState.currentStep = 5; // Retourner au step 5
        updateWizardUI();
        return;
    }
    
    // Save wizard results (including new coach fields)
    state.wizardResults = {
        frequency: wizardState.frequency,
        goal: wizardState.goal,
        experience: wizardState.experience,
        sensitivities: wizardState.sensitivities || [],
        equipment: wizardState.equipment, // Ne plus utiliser fallback ici
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
 * Quick Start: démarre immédiatement la séance sans preview ni durée picker
 * Utilise les paramètres par défaut (60 min, tous les exercices)
 */
function quickStartSession(splitIndex) {
    const program = trainingPrograms[state.wizardResults.selectedProgram];
    if (!program) return;

    const splits = program.splits[state.wizardResults.frequency];
    if (!splits || !splits[splitIndex]) return;

    const splitName = splits[splitIndex];
    let exercises = program.exercises[splitName] || [];
    
    // Appliquer le template si existant (avec swaps)
    const templateKey = `${state.wizardResults.selectedProgram}-${splitIndex}`;
    const template = state.sessionTemplates[templateKey];
    
    if (template && template.exercises) {
        exercises = exercises.map(ex => {
            const templateEx = template.exercises.find(te => te.originalName === ex.name);
            return {
                ...ex,
                name: templateEx?.swappedName || ex.name,
                originalName: ex.name,
                effectiveName: templateEx?.swappedName || ex.name
            };
        });
    } else {
        exercises = exercises.map(ex => ({
            ...ex,
            originalName: ex.name,
            effectiveName: ex.name
        }));
    }
    
    // Haptic feedback
    if (navigator.vibrate) {
        try { navigator.vibrate([30, 10, 30]); } catch(e) {}
    }
    
    // Convertir au format attendu par startFullScreenSessionWithCustomExercises
    const formattedExercises = exercises.map(ex => ({
        originalName: ex.originalName || ex.name,
        swappedName: ex.effectiveName !== ex.name ? ex.effectiveName : null,
        muscle: ex.muscle,
        sets: ex.sets,
        reps: ex.reps
    }));
    
    // Démarrer immédiatement
    startFullScreenSessionWithCustomExercises(splitIndex, formattedExercises);
    
    showToast('⚡ Séance démarrée !', 'success', 2000);
}

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

    // Générer le Session Brief avec objectifs intelligents
    generateSessionBrief();
}

/**
 * Génère le Session Brief avec les objectifs intelligents pour chaque exercice
 * Utilise smart-training pour calculer les poids suggérés et la progression
 */
function generateSessionBrief() {
    const briefContainer = document.getElementById('session-brief');
    if (!briefContainer) return;

    // Phase actuelle
    const phaseEl = document.getElementById('session-brief-phase');
    const exercisesEl = document.getElementById('session-brief-exercises');
    const summaryEl = document.getElementById('session-brief-summary');

    // Initialiser périodisation si nécessaire
    initPeriodization();
    updateCurrentPhase();

    const phase = state.periodization?.currentPhase || 'hypertrophy';
    const week = state.periodization?.currentWeek || 1;
    const cycle = state.periodization?.currentCycle || 1;
    const phaseAdjustments = getPhaseAdjustments();

    // Phase badge
    const phaseConfig = {
        hypertrophy: { icon: '💪', name: 'Hypertrophie', color: '#3b82f6', desc: 'Focus volume (8-12 reps)' },
        strength: { icon: '🏋️', name: 'Force', color: '#ef4444', desc: 'Focus intensité (4-6 reps)' },
        deload: { icon: '🧘', name: 'Deload', color: '#22c55e', desc: 'Récupération active (-30%)' }
    };
    const phaseCfg = phaseConfig[phase] || phaseConfig.hypertrophy;

    phaseEl.innerHTML = `
        <div class="brief-phase-badge" style="border-color: ${phaseCfg.color}; background: ${phaseCfg.color}15;">
            <span class="brief-phase-icon">${phaseCfg.icon}</span>
            <div class="brief-phase-info">
                <span class="brief-phase-name">${phaseCfg.name}</span>
                <span class="brief-phase-desc">${phaseCfg.desc}</span>
            </div>
            <span class="brief-phase-week">W${week}/4 • C${cycle}</span>
        </div>
    `;

    // Générer les objectifs pour chaque exercice
    let totalEstimatedVolume = 0;
    let totalSets = 0;

    const exercisesHTML = previewSession.exercises.map((ex, idx) => {
        const exerciseName = ex.swappedName || ex.originalName;

        // Calculer les sets ajustés selon la phase
        const adjustedSets = Math.max(1, Math.round(ex.sets * phaseAdjustments.setsMultiplier));

        // Utiliser smart-training pour obtenir le poids suggéré
        let suggestedWeight = null;
        let progressionInfo = null;
        let lastWeight = null;

        if (window.SmartTraining && typeof window.SmartTraining.calculateSuggestedWeight === 'function') {
            const suggestion = window.SmartTraining.calculateSuggestedWeight(exerciseName, 10);
            suggestedWeight = suggestion.suggested;
            lastWeight = suggestion.lastWeight;
            progressionInfo = suggestion.message;
        } else if (state.progressLog && state.progressLog[exerciseName]) {
            // Fallback: utiliser le dernier log
            const logs = state.progressLog[exerciseName];
            if (logs.length > 0) {
                const lastLog = logs[logs.length - 1];
                lastWeight = lastLog.weight;
                // Appliquer multiplicateur de phase
                suggestedWeight = Math.round(lastWeight * phaseAdjustments.weightMultiplier * 4) / 4;

                if (phaseAdjustments.weightMultiplier > 1) {
                    progressionInfo = `+${Math.round((phaseAdjustments.weightMultiplier - 1) * 100)}% phase`;
                } else if (phaseAdjustments.weightMultiplier < 1) {
                    progressionInfo = `${Math.round((phaseAdjustments.weightMultiplier - 1) * 100)}% deload`;
                } else {
                    // Suggérer progression standard
                    const isCompound = isCompoundExercise(exerciseName);
                    const increment = isCompound ? 2.5 : 1.25;
                    suggestedWeight = lastWeight + increment;
                    progressionInfo = `+${increment}kg progression`;
                }
            }
        }

        // Calculer volume estimé pour cet exercice
        if (suggestedWeight) {
            const avgReps = (phaseAdjustments.repsMin + phaseAdjustments.repsMax) / 2;
            totalEstimatedVolume += suggestedWeight * avgReps * adjustedSets;
        }
        totalSets += adjustedSets;

        // Déterminer l'indicateur de progression
        let progressionIcon = '➡️';
        let progressionClass = 'maintain';

        if (progressionInfo) {
            if (progressionInfo.includes('+') && !progressionInfo.includes('deload')) {
                progressionIcon = '📈';
                progressionClass = 'up';
            } else if (progressionInfo.includes('-') || progressionInfo.includes('deload')) {
                progressionIcon = '📉';
                progressionClass = 'down';
            } else if (progressionInfo.includes('Maintenir') || progressionInfo.includes('stable')) {
                progressionIcon = '➡️';
                progressionClass = 'maintain';
            }
        }

        // Générer HTML pour cet exercice
        if (suggestedWeight) {
            return `
                <div class="brief-exercise-item">
                    <div class="brief-exercise-main">
                        <span class="brief-exercise-num">${idx + 1}.</span>
                        <span class="brief-exercise-name">${exerciseName}</span>
                    </div>
                    <div class="brief-exercise-target">
                        <span class="brief-target-weight">${suggestedWeight}kg</span>
                        <span class="brief-target-sets">× ${adjustedSets} séries × ${phaseAdjustments.repsRange}</span>
                    </div>
                    <div class="brief-exercise-progression ${progressionClass}">
                        <span class="brief-progression-icon">${progressionIcon}</span>
                        <span class="brief-progression-text">${progressionInfo || 'Nouveau'}</span>
                    </div>
                </div>
            `;
        } else {
            // Pas d'historique - première fois
            return `
                <div class="brief-exercise-item brief-exercise-new">
                    <div class="brief-exercise-main">
                        <span class="brief-exercise-num">${idx + 1}.</span>
                        <span class="brief-exercise-name">${exerciseName}</span>
                    </div>
                    <div class="brief-exercise-target">
                        <span class="brief-target-sets">${adjustedSets} séries × ${phaseAdjustments.repsRange}</span>
                    </div>
                    <div class="brief-exercise-progression new">
                        <span class="brief-progression-icon">🆕</span>
                        <span class="brief-progression-text">Première fois</span>
                    </div>
                </div>
            `;
        }
    }).join('');

    exercisesEl.innerHTML = exercisesHTML;

    // Résumé de la séance
    const estimatedDuration = Math.round(totalSets * 2.5 + previewSession.exercises.length * 3); // ~2.5 min/set + transitions

    summaryEl.innerHTML = `
        <div class="brief-summary-item">
            <span class="brief-summary-icon">⚖️</span>
            <span class="brief-summary-label">Volume estimé</span>
            <span class="brief-summary-value">${totalEstimatedVolume > 0 ? formatVolume(totalEstimatedVolume) : '—'}</span>
        </div>
        <div class="brief-summary-item">
            <span class="brief-summary-icon">⏱️</span>
            <span class="brief-summary-label">Durée estimée</span>
            <span class="brief-summary-value">~${estimatedDuration} min</span>
        </div>
        <div class="brief-summary-item">
            <span class="brief-summary-icon">🎯</span>
            <span class="brief-summary-label">RPE cible</span>
            <span class="brief-summary-value">${phaseAdjustments.targetRPE}/10</span>
        </div>
    `;

    // Afficher le brief
    briefContainer.style.display = 'block';
}

/**
 * Formate le volume (ex: 15000 → "15.0k kg")
 */
function formatVolume(volume) {
    if (volume >= 1000) {
        return (volume / 1000).toFixed(1) + 'k kg';
    }
    return Math.round(volume) + ' kg';
}

/**
 * Vérifie si un exercice est un compound (multi-articulaire)
 */
function isCompoundExercise(exerciseName) {
    const compoundKeywords = [
        'développé', 'squat', 'soulevé', 'rowing', 'tirage', 'presse',
        'dips', 'tractions', 'fentes', 'hip thrust', 'bench', 'deadlift'
    ];
    const nameLower = exerciseName.toLowerCase();
    return compoundKeywords.some(kw => nameLower.includes(kw));
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

    // Re-render UI + Brief (pour mettre à jour les suggestions)
    renderSessionPreviewUI();
    generateSessionBrief();
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

    // Re-render UI + Brief (pour mettre à jour les suggestions)
    renderSessionPreviewUI();
    generateSessionBrief();
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

    // Vérifier si une session active existe déjà pour ce split
    const existingSession = loadFsSessionFromStorage();
    const today = new Date().toISOString().split('T')[0];
    
    if (existingSession && 
        existingSession.splitName === splitName && 
        existingSession.sessionId &&
        new Date(existingSession.startTime).toISOString().split('T')[0] === today) {
        // Reprendre la session existante (même jour, même split)
        console.log('📌 Reprise de la session existante:', existingSession.sessionId);
        fsSession = existingSession;
        fsSession.active = true;
    } else {
        // Initialize session avec UUID unique
        fsSession = {
            sessionId: 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            sessionSaved: false,
            active: true,
            splitIndex: splitIndex,
            splitName: splitName,
            exercises: exercises,
            currentExerciseIndex: 0,
            currentSetIndex: 0,
            completedSets: [],
            startTime: Date.now()
        };
        console.log('🆕 Nouvelle session créée:', fsSession.sessionId);
    }

    // Démarrer la sauvegarde automatique
    startAutoSaveFsSession();

    // Show full-screen UI with iOS-like animation
    const fsElement = document.getElementById('fullscreen-session');
    if (!fsElement) {
        console.error('❌ Element fullscreen-session introuvable');
        return;
    }
    
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

    // Initialiser la périodisation et afficher l'indicateur de phase
    initPeriodization();
    updateCurrentPhase();
    updatePhaseIndicator();

    // Appliquer les ajustements de phase aux exercices
    applyPhaseToAllExercises();

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

/**
 * Machine occupée : reporter l'exercice
 */
function machineOccupied() {
    if (!fsSession.active) return;
    
    const currentExercise = fsSession.exercises[fsSession.currentExerciseIndex];
    if (!currentExercise) return;
    
    if (confirm('Machine occupée ? Passer à l\'exercice suivant ?')) {
        currentExercise.postponeReason = 'Machine occupée';
        postponeCurrentExercise();
        
        if (window.HapticFeedback) {
            window.HapticFeedback.warning();
        }
        
        showToast('⏳ Machine occupée - Exercice reporté', 'info', 3000);
    }
}

/**
 * Reporte l'exercice courant à la fin
 */
function postponeCurrentExercise() {
    if (!fsSession.active) return;
    if (fsSession.exercises.length <= 1) {
        showToast('Impossible de reporter le dernier exercice', 'warning');
        return;
    }
    
    const currentExercise = fsSession.exercises[fsSession.currentExerciseIndex];
    
    // Confirmation
    if (!confirm(`Reporter "${currentExercise.effectiveName}" à la fin ?`)) {
        return;
    }
    
    // Retirer l'exercice de sa position actuelle
    const [postponedExercise] = fsSession.exercises.splice(fsSession.currentExerciseIndex, 1);
    
    // Marquer comme reporté
    postponedExercise.postponed = true;
    
    // Ajouter à la fin
    fsSession.exercises.push(postponedExercise);
    
    // Réinitialiser l'index de série
    fsSession.currentSetIndex = 0;
    
    // Sauvegarder immédiatement
    saveFsSessionToStorage();
    
    // Afficher l'exercice suivant (qui prend la place actuelle)
    renderCurrentExercise();
    
    // Démarrer le timer de repos
    startRestTimer();
    
    showToast(`${currentExercise.effectiveName} reporté`, 'info');
}

/**
 * Minimise la séance en cours (garde en arrière-plan)
 */
function minimizeSession() {
    if (!fsSession.active) return;
    
    // Masquer l'UI fullscreen
    document.getElementById('fullscreen-session').style.display = 'none';
    document.body.style.overflow = '';

    // Afficher la nav
    const nav = document.querySelector('.nav');
    const mobileNav = document.querySelector('.mobile-nav');
    if (nav) nav.style.display = '';
    if (mobileNav) mobileNav.style.display = '';
    
    // Afficher l'indicateur "Séance en cours"
    updateSessionIndicator();
    const indicator = document.getElementById('session-indicator');
    if (indicator) indicator.style.display = 'flex';
    
    console.log('📱 Séance minimisée');
}

/**
 * Restaure la séance en cours
 */
function restoreSession() {
    if (!fsSession.active) return;
    
    // Masquer l'indicateur
    const indicator = document.getElementById('session-indicator');
    if (indicator) indicator.style.display = 'none';
    
    // Afficher l'UI fullscreen
    const fsElement = document.getElementById('fullscreen-session');
    fsElement.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Masquer la nav
    const nav = document.querySelector('.nav');
    const mobileNav = document.querySelector('.mobile-nav');
    if (nav) nav.style.display = 'none';
    if (mobileNav) mobileNav.style.display = 'none';
    
    // Rafraîchir l'affichage
    renderCurrentExercise();
    
    console.log('📱 Séance restaurée');
}

/**
 * Met à jour le texte de l'indicateur de séance
 */
function updateSessionIndicator() {
    const subtitle = document.getElementById('session-indicator-subtitle');
    if (!subtitle || !fsSession.active) return;
    
    const exercise = fsSession.exercises[fsSession.currentExerciseIndex];
    const currentSet = fsSession.currentSetIndex + 1;
    const totalSets = exercise?.sets || 0;
    
    subtitle.textContent = `${fsSession.splitName} - Série ${currentSet}/${totalSets}`;
}

function closeFullScreenSession() {
    // Confirm if sets were logged
    if (fsSession.completedSets.length > 0) {
        if (!confirm('Tu as des séries non sauvegardées. Quitter quand même ?')) {
            return;
        }
    }

    // Masquer l'indicateur
    const indicator = document.getElementById('session-indicator');
    if (indicator) indicator.style.display = 'none';

    // Arrêter la sauvegarde automatique
    stopAutoSaveFsSession();
    
    // Supprimer la session sauvegardée
    clearFsSessionFromStorage();

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
    
    // Vérifier si on est en superset
    const superset = getCurrentSuperset();
    const supersetLabel = superset ? 
        (superset.phase === 'A' ? ' A' : ' B') + ' (Superset)' : '';
    const totalExercises = fsSession.exercises.length;
    const splits = trainingPrograms?.[state.wizardResults?.selectedProgram]?.splits?.[state.wizardResults?.frequency];

    // Update header
    document.getElementById('fs-session-title').textContent = fsSession.splitName;
    document.getElementById('fs-session-progress').textContent = splits ? `Jour ${fsSession.splitIndex + 1}/${splits.length}` : 'Jour 1';

    // Update exercise info
    const exerciseNameEl = document.getElementById('fs-exercise-name');
    exerciseNameEl.innerHTML = `
        ${exercise.effectiveName}${exercise.postponed ? ' <span style="color: var(--warning); font-size: 0.8rem;">⏭️</span>' : ''}
        ${supersetLabel ? `<span class="superset-badge">⚡ ${supersetLabel}</span>` : ''}
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

    // Plage de reps selon la phase (targetReps) ou reps original
    const repsPlaceholder = exercise.targetReps || exercise.reps || '8-12';

    if (lastLog && lastLog.setsDetail && lastLog.setsDetail.length > 0) {
        const lastSet = lastLog.setsDetail[Math.min(fsSession.currentSetIndex, lastLog.setsDetail.length - 1)];
        previousValueEl.textContent = `${lastSet.weight}kg × ${lastSet.reps}`;
        previousEl.style.display = 'flex';

        // Pre-fill inputs with last values (ajusté selon phase si deload)
        const phaseAdjustments = getPhaseAdjustments();
        let suggestedWeight = lastSet.weight || 0;

        // Appliquer multiplicateur de phase au poids si défini
        if (phaseAdjustments.weightMultiplier !== 1.0 && suggestedWeight > 0) {
            suggestedWeight = Math.round(suggestedWeight * phaseAdjustments.weightMultiplier * 4) / 4;
        }

        document.getElementById('fs-weight-input').value = suggestedWeight || '';
        document.getElementById('fs-reps-input').value = '';
        document.getElementById('fs-reps-input').placeholder = repsPlaceholder;
    } else {
        previousEl.style.display = 'none';
        document.getElementById('fs-weight-input').value = '';
        document.getElementById('fs-reps-input').value = '';
        document.getElementById('fs-reps-input').placeholder = repsPlaceholder;
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

    container.innerHTML = exerciseSets.map(set => {
        // Déterminer les classes et labels pour techniques avancées
        let extraClass = '';
        let labelPrefix = '';

        if (set.isDrop) {
            extraClass = ' is-drop';
            labelPrefix = `D${set.dropNumber || 1}`;
        } else if (set.isRestPause) {
            extraClass = ' is-restpause';
            labelPrefix = `RP${set.restPauseNumber || 1}`;
        } else {
            labelPrefix = `S${set.setIndex + 1}`;
        }

        return `
            <div class="fs-completed-set${extraClass}">
                <span class="fs-completed-set-num">${labelPrefix}</span>
                <span class="fs-completed-set-value">${set.weight}kg × ${set.reps}</span>
                <button class="fs-completed-set-edit" onclick="editCompletedSet(${set.setIndex})">✎</button>
            </div>
        `;
    }).join('');
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

    // Demander RPE/RIR optionnel
    const rpeInput = document.getElementById('fs-rpe-input');
    const rirInput = document.getElementById('fs-rir-input');
    const rpe = rpeInput ? parseInt(rpeInput.value) || null : null;
    const rir = rirInput ? parseInt(rirInput.value) || null : null;
    
    // Save the set
    const completedSet = {
        exerciseIndex: fsSession.currentExerciseIndex,
        setIndex: fsSession.currentSetIndex,
        weight: weight,
        reps: reps,
        rpe: rpe,  // Rating of Perceived Exertion (1-10)
        rir: rir,   // Reps In Reserve (0-5)
        isDrop: fsSession.isDropMode || false,
        dropNumber: 0,
        isRestPause: fsSession.isRestPauseMode || false,
        restPauseNumber: 0
    };

    // Si c'est un drop set, compter le numéro
    if (fsSession.isDropMode) {
        const dropsForThisExercise = fsSession.completedSets.filter(
            s => s.exerciseIndex === fsSession.currentExerciseIndex && s.isDrop
        ).length;
        completedSet.dropNumber = dropsForThisExercise + 1;
        fsSession.isDropMode = false;
        resetValidateButton();
    }

    // Si c'est un rest-pause, compter le numéro
    if (fsSession.isRestPauseMode) {
        const restPausesForThisExercise = fsSession.completedSets.filter(
            s => s.exerciseIndex === fsSession.currentExerciseIndex && s.isRestPause
        ).length;
        completedSet.restPauseNumber = restPausesForThisExercise + 1;
        fsSession.isRestPauseMode = false;
        resetValidateButton();
    }
    
    fsSession.completedSets.push(completedSet);

    // Sauvegarder immédiatement après chaque série
    saveFsSessionToStorage();
    
    // Haptic feedback sur completion de set
    if (window.HapticFeedback) {
        window.HapticFeedback.success();
    }

    // Move to next set or exercise
    const exercise = fsSession.exercises[fsSession.currentExerciseIndex];
    const totalSets = exercise.sets;

    // Vérifier si c'est la dernière série
    const isLastSet = fsSession.currentSetIndex + 1 >= totalSets;
    const isLastExercise = fsSession.currentExerciseIndex + 1 >= fsSession.exercises.length;

    // Vérifier si on est en superset
    const inSuperset = handleSupersetProgression();
    if (inSuperset) {
        return; // Gestion spéciale superset
    }
    
    // Afficher les boutons techniques avancées si c'est la dernière série
    const dropsForThisExercise = fsSession.completedSets.filter(
        s => s.exerciseIndex === fsSession.currentExerciseIndex && s.isDrop
    ).length;
    const restPausesForThisExercise = fsSession.completedSets.filter(
        s => s.exerciseIndex === fsSession.currentExerciseIndex && s.isRestPause
    ).length;

    // Conditions: dernière série, poids > 5kg, pas trop de techniques déjà utilisées
    const canDrop = dropsForThisExercise < 2 && weight > 5;
    const canRestPause = restPausesForThisExercise < 3 && weight > 0;

    if (isLastSet && (canDrop || canRestPause)) {
        // Afficher le container des techniques avancées
        const advancedBtns = document.getElementById('fs-advanced-btns');
        const dropBtn = document.getElementById('fs-drop-btn');
        const restPauseBtn = document.getElementById('fs-restpause-btn');

        if (advancedBtns) {
            advancedBtns.style.display = 'flex';

            // Afficher/masquer les boutons selon les conditions
            if (dropBtn) dropBtn.style.display = canDrop ? 'flex' : 'none';
            if (restPauseBtn) restPauseBtn.style.display = canRestPause ? 'flex' : 'none';

            // Masquer après 8 secondes
            setTimeout(() => {
                if (advancedBtns) advancedBtns.style.display = 'none';
            }, 8000);
        }
    }
    
    if (!isLastSet) {
        // Next set
        fsSession.currentSetIndex++;
        renderCurrentExercise();
        
        // Start rest timer (après la première série de CET exercice)
        // On compte combien de séries ont été complétées pour cet exercice
        const completedSetsForThisExercise = fsSession.completedSets.filter(
            s => s.exerciseIndex === fsSession.currentExerciseIndex
        ).length;
        
        if (completedSetsForThisExercise >= 1) {
            startRestTimer();
        }
    } else if (isLastSet && !isLastExercise) {
        // Exercice terminé, mais pas le dernier - afficher bouton transition
        fsSession.exerciseCompleted = true;
        renderExerciseCompleteState();
    } else {
        // Dernière série du dernier exercice - séance terminée
        showToast('Séance terminée ! 🎉', 'success');
        
        // Haptic feedback achievement sur fin de séance
        if (window.HapticFeedback) {
            window.HapticFeedback.achievement();
        }
        
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
    if (nameEl && nextExercise) nameEl.textContent = nextExercise.effectiveName;
    
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
    
    // Calculer le volume total (kg soulevés)
    const totalVolume = fsSession.completedSets.reduce((sum, set) => {
        return sum + (set.weight * set.reps);
    }, 0);
    const volumeTonnes = (totalVolume / 1000).toFixed(1);
    
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
            <div class="fs-complete-stat" title="Volume total = poids × répétitions">
                <span class="fs-complete-stat-value">${volumeTonnes}</span>
                <span class="fs-complete-stat-label">tonnes</span>
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
let fsTimerEndTime = 0; // Timestamp de fin pour calcul précis

/**
 * Détermine le temps de repos intelligent selon l'exercice et l'objectif
 * Logique de coach pro : gros muscles + compound = repos long, isolation = repos court
 */
function getSmartRestTime(exerciseName, goal) {
    const name = exerciseName.toLowerCase();
    
    // Exercices composés gros muscles (3-5 min pour force, 2-3 min pour hypertrophie)
    const heavyCompounds = ['squat', 'deadlift', 'soulevé de terre', 'hip thrust', 'presse', 'leg press'];
    if (heavyCompounds.some(ex => name.includes(ex))) {
        return goal === 'strength' ? 240 : goal === 'hypertrophy' ? 150 : 90;
    }
    
    // Composés haut du corps (2-4 min pour force, 90-120s pour hypertrophie)
    const upperCompounds = ['bench', 'développé', 'overhead press', 'military press', 'rowing', 'barbell row', 'pull-up', 'chin-up', 'traction'];
    if (upperCompounds.some(ex => name.includes(ex))) {
        return goal === 'strength' ? 180 : goal === 'hypertrophy' ? 120 : 75;
    }
    
    // Isolation jambes (90-120s)
    const legIsolation = ['leg curl', 'leg extension', 'curl', 'extension', 'abduction', 'adduction'];
    if (legIsolation.some(ex => name.includes(ex))) {
        return goal === 'strength' ? 120 : goal === 'hypertrophy' ? 90 : 60;
    }
    
    // Isolation bras (60-90s)
    const armIsolation = ['biceps', 'triceps', 'curl', 'extension', 'pushdown'];
    if (armIsolation.some(ex => name.includes(ex))) {
        return goal === 'strength' ? 90 : goal === 'hypertrophy' ? 75 : 45;
    }
    
    // Petits muscles (45-60s)
    const smallMuscles = ['lateral', 'élévation', 'raises', 'calf', 'mollet', 'shrug', 'face pull'];
    if (smallMuscles.some(ex => name.includes(ex))) {
        return goal === 'strength' ? 75 : goal === 'hypertrophy' ? 60 : 45;
    }
    
    // Fallback : temps par défaut selon objectif
    return REST_TIMES[goal]?.default || 90;
}

function startRestTimer() {
    // Get exercise name and goal
    const exercise = fsSession.exercises[fsSession.currentExerciseIndex];
    const goal = state.wizardResults?.goal || 'hypertrophy';

    // Temps de repos intelligent selon exercice + objectif
    let baseRestTime = getSmartRestTime(exercise.effectiveName, goal);

    // Appliquer le multiplicateur de phase (périodisation)
    const phaseAdjustments = getPhaseAdjustments();
    fsTimerTarget = Math.round(baseRestTime * phaseAdjustments.restMultiplier);
    fsTimerSeconds = fsTimerTarget;

    updateFsTimerDisplay();

    // Clear existing interval
    if (fsTimerInterval) {
        clearInterval(fsTimerInterval);
    }

    // Afficher le timer prominent
    const prominentTimer = document.getElementById('fs-rest-timer-prominent');
    if (prominentTimer) {
        prominentTimer.style.display = 'flex';
    }

    // Calculer l'heure de fin basée sur Date.now() pour précision
    fsTimerEndTime = Date.now() + (fsTimerSeconds * 1000);
    
    // Variables pour vibrations (éviter doublons)
    let vibrated10s = false;
    let vibrated5s = false;

    // Start countdown basé sur Date.now()
    fsTimerInterval = setInterval(() => {
        // Calculer le temps restant réel
        const remaining = fsTimerEndTime - Date.now();
        fsTimerSeconds = Math.max(0, Math.ceil(remaining / 1000));
        
        updateFsTimerDisplay();
        
        // Vibrations aux points clés
        if (fsTimerSeconds === 10 && !vibrated10s) {
            vibrated10s = true;
            if (navigator.vibrate) {
                try { navigator.vibrate(30); } catch(e) {}
            }
        } else if (fsTimerSeconds === 5 && !vibrated5s) {
            vibrated5s = true;
            if (navigator.vibrate) {
                try { navigator.vibrate([30, 20, 30]); } catch(e) {}
            }
        }

        if (remaining <= 0) {
            clearInterval(fsTimerInterval);
            fsTimerInterval = null;
            fsTimerSeconds = 0;
            
            // Vibrate if available (fin)
            if (navigator.vibrate) {
                try {
                    navigator.vibrate([200, 100, 200]);
                } catch(e) {}
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
    const timeString = `${prefix}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    
    // Mettre à jour timer en bas
    document.getElementById('fs-timer-display').textContent = timeString;

    // Change color when overtime
    const timerEl = document.getElementById('fs-timer');
    timerEl.classList.toggle('overtime', fsTimerSeconds < 0);
    
    // Mettre à jour timer prominent
    const restTimerTime = document.getElementById('rest-timer-time');
    if (restTimerTime) {
        restTimerTime.textContent = timeString;
    }
    
    // Mettre à jour cercle de progression
    const progressCircle = document.getElementById('rest-timer-progress');
    const circleContainer = document.getElementById('rest-timer-circle-container');
    
    if (progressCircle && circleContainer) {
        const circumference = 2 * Math.PI * 54; // rayon = 54
        const progress = fsTimerTarget > 0 ? (fsTimerSeconds / fsTimerTarget) : 0;
        const offset = circumference * (1 - progress);
        
        progressCircle.style.strokeDashoffset = offset;
        
        // Changer couleur selon temps restant
        circleContainer.classList.remove('timer-green', 'timer-yellow', 'timer-red', 'timer-overtime');
        
        if (fsTimerSeconds < 0) {
            circleContainer.classList.add('timer-overtime');
        } else if (fsTimerSeconds <= 5) {
            circleContainer.classList.add('timer-red');
        } else if (fsTimerSeconds <= 15) {
            circleContainer.classList.add('timer-yellow');
        } else {
            circleContainer.classList.add('timer-green');
        }
    }
}

function resetFsTimer() {
    if (fsTimerInterval) {
        clearInterval(fsTimerInterval);
        fsTimerInterval = null;
    }
    fsTimerSeconds = 0;
    updateFsTimerDisplay();
    document.getElementById('fs-timer').classList.remove('active', 'overtime');
    
    // Masquer le timer prominent
    const prominentTimer = document.getElementById('fs-rest-timer-prominent');
    if (prominentTimer) {
        prominentTimer.style.display = 'none';
    }
}

function adjustFsTimer(delta) {
    fsTimerSeconds += delta;
    updateFsTimerDisplay();
}

// ==================== PERIODISATION AVANCÉE ====================

/**
 * Détermine la phase courante basée sur la semaine
 * @returns {'hypertrophy' | 'strength' | 'deload'}
 */
function getCurrentPhase() {
    const week = state.periodization?.currentWeek || 1;
    const config = state.periodization?.phaseConfig;

    if (!config) return 'hypertrophy';

    for (const [phase, cfg] of Object.entries(config)) {
        if (cfg.weeks && cfg.weeks.includes(week)) {
            return phase;
        }
    }
    return 'hypertrophy';
}

/**
 * Met à jour la phase courante et affiche un toast si changement
 */
function updateCurrentPhase() {
    const phase = getCurrentPhase();
    const previousPhase = state.periodization?.currentPhase;

    if (previousPhase !== phase) {
        if (!state.periodization) initPeriodization();
        state.periodization.currentPhase = phase;

        // Toast informatif sur le changement de phase
        const messages = {
            hypertrophy: '💪 Phase Hypertrophie - Focus volume (8-12 reps)',
            strength: '🏋️ Phase Force - Focus intensité (4-6 reps)',
            deload: '🧘 Semaine Deload - Récupération active (-30%)'
        };

        if (previousPhase) { // Ne pas afficher au premier chargement
            showToast(messages[phase], 'info', 4000);

            // Haptic feedback
            if (window.HapticFeedback) {
                window.HapticFeedback.notification('warning');
            }
        }

        saveState();
    }

    // Mettre à jour l'UI
    updatePhaseIndicator();
}

/**
 * Retourne les ajustements à appliquer selon la phase courante
 */
function getPhaseAdjustments() {
    const phase = state.periodization?.currentPhase || 'hypertrophy';
    const config = state.periodization?.phaseConfig?.[phase];

    if (!config) {
        return {
            repsRange: '8-12',
            repsMin: 8,
            repsMax: 12,
            setsMultiplier: 1.0,
            weightMultiplier: 1.0,
            restMultiplier: 1.0,
            targetRPE: 7,
            phase: 'hypertrophy'
        };
    }

    return {
        repsRange: `${config.repsMin}-${config.repsMax}`,
        repsMin: config.repsMin,
        repsMax: config.repsMax,
        setsMultiplier: config.setsMultiplier,
        weightMultiplier: config.weightMultiplier,
        restMultiplier: config.restMultiplier,
        targetRPE: config.targetRPE,
        phase: phase
    };
}

/**
 * Vérifie l'adhérence au volume planifié
 */
function checkVolumeAdherence() {
    const week = state.periodization?.currentWeek || 1;
    const baseline = state.periodization?.baselineVolume;
    const actual = state.periodization?.weeklyVolume?.[week - 1] || 0;
    const plannedMultiplier = state.periodization?.plannedWeeklyVolume?.[week];

    // Pas de comparaison si pas de baseline ou si W1
    if (!baseline || !plannedMultiplier || actual === 0 || week === 1) return;

    const expectedVolume = baseline * plannedMultiplier;
    const adherence = actual / expectedVolume;

    // Alerter seulement à des seuils significatifs
    if (adherence < 0.7) {
        showToast(`⚠️ Volume sous-optimal (${Math.round(adherence * 100)}%). Ajoute des séries!`, 'warning', 4000);
    } else if (adherence > 1.3 && week !== 4) {
        showToast(`⚠️ Volume élevé (${Math.round(adherence * 100)}%). Attention récupération!`, 'warning', 4000);
    }
}

/**
 * Initialise la périodisation avec les valeurs par défaut
 */
function initPeriodization() {
    if (!state.periodization || !state.periodization.phaseConfig) {
        const defaultCycle = CYCLE_PRESETS['4'];
        state.periodization = {
            currentWeek: 1,
            currentCycle: 1,
            cycleStartDate: new Date().toISOString(),
            weeklyVolume: [],
            autoDeload: true,
            currentPhase: 'hypertrophy',
            cycleType: '4',
            totalWeeks: defaultCycle.totalWeeks,
            phaseConfig: defaultCycle.phases,
            plannedWeeklyVolume: defaultCycle.plannedVolume,
            baselineVolume: null
        };
    }
    // Assurer que cycleType existe pour les anciens états
    if (!state.periodization.cycleType) {
        state.periodization.cycleType = '4';
        state.periodization.totalWeeks = 4;
    }
}

/**
 * Met à jour l'indicateur de phase dans l'UI
 */
function updatePhaseIndicator() {
    const badge = document.getElementById('fs-phase-badge');
    const weekEl = document.getElementById('fs-phase-week');

    if (!badge || !weekEl) return;

    const phase = state.periodization?.currentPhase || 'hypertrophy';
    const week = state.periodization?.currentWeek || 1;
    const cycle = state.periodization?.currentCycle || 1;

    const phaseConfig = {
        hypertrophy: { icon: '💪', name: 'Hypertrophie', color: '#3b82f6' },
        strength: { icon: '🏋️', name: 'Force', color: '#ef4444' },
        deload: { icon: '🧘', name: 'Deload', color: '#22c55e' }
    };

    const cfg = phaseConfig[phase] || phaseConfig.hypertrophy;
    badge.innerHTML = `<span class="fs-phase-icon">${cfg.icon}</span><span class="fs-phase-name">${cfg.name}</span>`;
    badge.style.borderColor = cfg.color;
    badge.setAttribute('data-phase', phase);
    weekEl.textContent = `Semaine ${week}/4 • Cycle ${cycle}`;
}

/**
 * Applique les ajustements de phase à tous les exercices de la session
 */
function applyPhaseToAllExercises() {
    if (!fsSession || !fsSession.exercises) return;

    const adjustments = getPhaseAdjustments();
    const phase = adjustments.phase;

    console.log(`📊 Application phase ${phase}:`, adjustments);

    fsSession.exercises = fsSession.exercises.map(exercise => {
        // Stocker les valeurs originales si pas déjà fait
        if (!exercise.originalSets) {
            exercise.originalSets = exercise.sets;
            exercise.originalReps = exercise.reps;
            exercise.originalRest = exercise.rest;
        }

        // Ajuster le nombre de séries selon la phase
        const adjustedSets = Math.max(1, Math.round(exercise.originalSets * adjustments.setsMultiplier));

        // Ajuster le temps de repos
        const adjustedRest = Math.round((exercise.originalRest || 90) * adjustments.restMultiplier);

        return {
            ...exercise,
            sets: adjustedSets,
            targetReps: adjustments.repsRange,
            rest: adjustedRest,
            targetRPE: adjustments.targetRPE,
            phaseApplied: phase
        };
    });

    // Log si deload actif
    if (phase === 'deload') {
        console.log('🧘 Deload appliqué: -30% sets, -15% poids suggéré');
    }
}

function updatePeriodization() {
    // Initialiser si nécessaire
    initPeriodization();

    // Calculer le volume de cette session
    let sessionVolume = 0;
    fsSession.completedSets.forEach(set => {
        sessionVolume += set.weight * set.reps;
    });

    // Ajouter au volume de la semaine
    const weekIndex = state.periodization.currentWeek - 1;
    if (!state.periodization.weeklyVolume[weekIndex]) {
        state.periodization.weeklyVolume[weekIndex] = 0;
    }
    state.periodization.weeklyVolume[weekIndex] += sessionVolume;

    // Mettre à jour baseline volume après W1 complète
    if (state.periodization.currentWeek === 1 && !state.periodization.baselineVolume) {
        const frequency = state.wizardResults?.frequency || 3;
        const sessionsThisWeek = countSessionsThisWeek();

        // Si on a terminé W1, enregistrer le baseline
        if (sessionsThisWeek >= frequency) {
            state.periodization.baselineVolume = state.periodization.weeklyVolume[0];
            console.log('📊 Baseline volume établi:', state.periodization.baselineVolume);
        }
    }

    // Vérifier si on doit passer à la semaine suivante
    const frequency = state.wizardResults?.frequency || 3;
    const sessionsThisWeek = countSessionsThisWeek();

    // Avancer la semaine si on a complété le nombre de sessions prévu
    if (sessionsThisWeek >= frequency) {
        state.periodization.currentWeek++;

        // Reset cycle après semaine 4
        if (state.periodization.currentWeek > 4) {
            state.periodization.currentWeek = 1;
            state.periodization.currentCycle++;
            state.periodization.weeklyVolume = [];
            state.periodization.cycleStartDate = new Date().toISOString();
            // Reset baseline pour nouveau cycle
            state.periodization.baselineVolume = null;

            showToast(`🎯 Nouveau cycle ${state.periodization.currentCycle} démarré !`, 'success', 3000);
        }
    }

    // Mettre à jour la phase courante (avec toast si changement)
    updateCurrentPhase();

    // Vérifier adhérence au volume planifié
    checkVolumeAdherence();

    saveState();
}

/**
 * Compte les sessions cette semaine
 */
function countSessionsThisWeek() {
    if (!state.sessionHistory) return 0;
    return state.sessionHistory.filter(s => {
        const daysDiff = Math.floor((Date.now() - new Date(s.date).getTime()) / (1000 * 60 * 60 * 24));
        return daysDiff < 7;
    }).length;
}

function shouldApplyDeload() {
    if (!state.periodization || !state.periodization.autoDeload) return false;
    return state.periodization.currentWeek === 4;
}

function getDeloadAdjustedSets(originalSets) {
    const adjustments = getPhaseAdjustments();
    return Math.max(1, Math.round(originalSets * adjustments.setsMultiplier));
}

// Détection de plateau automatique
function detectPlateauForExercise(exerciseName) {
    if (!state.progressLog || !state.progressLog[exerciseName]) return null;
    
    const logs = state.progressLog[exerciseName].slice(-3); // 3 dernières sessions
    if (logs.length < 3) return null;
    
    // Vérifier si le poids max n'a pas augmenté
    const weights = logs.map(l => {
        // Utiliser setsDetail si disponible, sinon fallback sur weight moyen
        if (l.setsDetail && l.setsDetail.length > 0) {
            return Math.max(...l.setsDetail.map(s => s.weight));
        }
        return l.weight || 0;
    });
    const hasProgressed = weights[2] > weights[0];
    
    if (!hasProgressed) {
        return {
            detected: true,
            lastWeight: weights[2],
            suggestions: [
                { action: 'deload', label: `Deload à ${Math.round(weights[2] * 0.9 * 2) / 2}kg` },
                { action: 'swap', label: 'Changer d\'exercice' },
                { action: 'reps', label: 'Augmenter les reps (8-12)' }
            ]
        };
    }
    
    return null;
}

// Double progression
function getDoubleProgressionRecommendation(exerciseName) {
    if (!state.progressLog || !state.progressLog[exerciseName]) return null;
    
    const lastLog = state.progressLog[exerciseName].slice(-1)[0];
    if (!lastLog) return null;
    
    // Utiliser setsDetail si disponible, sinon fallback sur données agrégées
    let avgReps, weight;
    
    if (lastLog.setsDetail && lastLog.setsDetail.length > 0) {
        // Calculer depuis setsDetail
        avgReps = lastLog.setsDetail.reduce((sum, s) => sum + s.reps, 0) / lastLog.setsDetail.length;
        weight = lastLog.setsDetail[0].weight;
    } else {
        // Fallback : utiliser les données agrégées
        avgReps = lastLog.sets > 0 ? (lastLog.achievedReps || 0) / lastLog.sets : 0;
        weight = lastLog.weight || 0;
    }
    
    // Phase 1 : Augmenter reps jusqu'à 12
    if (avgReps < 12) {
        return {
            phase: 'reps',
            message: `Garder ${weight}kg, viser ${Math.ceil(avgReps) + 1}-${Math.ceil(avgReps) + 2} reps`,
            targetWeight: weight,
            targetReps: Math.ceil(avgReps) + 2
        };
    }
    
    // Phase 2 : Augmenter poids, reset reps
    const increment = weight >= 40 ? 2.5 : 1.25;
    return {
        phase: 'weight',
        message: `Augmenter à ${weight + increment}kg, viser 8-10 reps`,
        targetWeight: weight + increment,
        targetReps: 8
    };
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Remet le bouton validate à son état normal
 */
function resetValidateButton() {
    const validateBtn = document.getElementById('fs-validate-btn');
    if (validateBtn) {
        validateBtn.innerHTML = `
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span>Valider la série</span>
        `;
        validateBtn.style.background = 'var(--accent-primary)'; // Reset to green
    }
}

// ==================== DROP SETS ====================

function startDropSet() {
    if (!fsSession.active) return;

    // Masquer le container des techniques avancées
    const advancedBtns = document.getElementById('fs-advanced-btns');
    if (advancedBtns) advancedBtns.style.display = 'none';

    // Récupérer le dernier set complété
    const lastSet = fsSession.completedSets[fsSession.completedSets.length - 1];
    if (!lastSet) return;

    // Calculer le poids réduit (-20%)
    const newWeight = Math.max(2.5, Math.round((lastSet.weight * 0.8) * 2) / 2); // Arrondi à 0.5kg

    // Pré-remplir les inputs
    document.getElementById('fs-weight-input').value = newWeight;
    document.getElementById('fs-reps-input').value = ''; // L'utilisateur entre les reps
    document.getElementById('fs-reps-input').focus();

    // Indiquer visuellement qu'on est en drop set
    const validateBtn = document.getElementById('fs-validate-btn');
    if (validateBtn) {
        validateBtn.innerHTML = `
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span>💧 Valider Drop Set</span>
        `;
        validateBtn.style.background = '#3b82f6'; // Blue for drop
    }

    // Marquer qu'on est en mode drop
    fsSession.isDropMode = true;

    // Haptic feedback
    if (window.HapticFeedback) {
        window.HapticFeedback.light();
    }

    showToast('💧 Drop Set : -20% poids, pas de repos !', 'info', 2500);
}

// ==================== REST-PAUSE ====================

function startRestPause() {
    if (!fsSession.active) return;

    // Masquer le container des techniques avancées
    const advancedBtns = document.getElementById('fs-advanced-btns');
    if (advancedBtns) advancedBtns.style.display = 'none';

    // Récupérer le dernier set complété
    const lastSet = fsSession.completedSets[fsSession.completedSets.length - 1];
    if (!lastSet) return;

    // Garder le même poids
    document.getElementById('fs-weight-input').value = lastSet.weight;
    document.getElementById('fs-reps-input').value = ''; // L'utilisateur entre les reps

    // Indiquer visuellement qu'on est en rest-pause
    const validateBtn = document.getElementById('fs-validate-btn');
    if (validateBtn) {
        validateBtn.innerHTML = `
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span>⏸️ Valider Rest-Pause</span>
        `;
        validateBtn.style.background = '#a855f7'; // Purple for rest-pause
    }

    // Marquer qu'on est en mode rest-pause
    fsSession.isRestPauseMode = true;

    // Démarrer un mini-timer de 10-15 secondes
    startRestPauseTimer(15);

    // Haptic feedback
    if (window.HapticFeedback) {
        window.HapticFeedback.light();
    }

    showToast('⏸️ Rest-Pause : 15s repos puis continue !', 'info', 2500);
}

// Mini-timer pour rest-pause (15 secondes par défaut)
let restPauseTimerInterval = null;

function startRestPauseTimer(seconds = 15) {
    // Afficher le timer prominent
    const timerContainer = document.getElementById('fs-rest-timer-prominent');
    if (!timerContainer) return;

    timerContainer.style.display = 'flex';
    timerContainer.classList.add('timer-restpause');

    let remaining = seconds;

    // Initialiser l'affichage
    updateRestPauseTimerDisplay(remaining, seconds);

    restPauseTimerInterval = setInterval(() => {
        remaining--;

        if (remaining <= 0) {
            clearInterval(restPauseTimerInterval);
            restPauseTimerInterval = null;

            // Timer terminé - focus sur input reps
            const repsInput = document.getElementById('fs-reps-input');
            if (repsInput) repsInput.focus();

            // Haptic et audio
            if (window.HapticFeedback) {
                window.HapticFeedback.success();
            }
            if (window.AudioFeedback && window.AudioFeedback.playTimerEnd) {
                window.AudioFeedback.playTimerEnd();
            }

            // Masquer le timer après 1 seconde
            setTimeout(() => {
                timerContainer.style.display = 'none';
                timerContainer.classList.remove('timer-restpause');
            }, 1000);

            showToast('⏸️ Go ! Fais tes reps !', 'success', 2000);
        } else {
            updateRestPauseTimerDisplay(remaining, seconds);

            // Vibration aux dernières secondes
            if (remaining <= 3 && window.HapticFeedback) {
                window.HapticFeedback.light();
            }
        }
    }, 1000);
}

function updateRestPauseTimerDisplay(remaining, total) {
    const timeDisplay = document.querySelector('#fs-rest-timer-prominent .timer-time');
    const progressCircle = document.querySelector('#fs-rest-timer-prominent .progress-ring__circle');
    const timerContainer = document.getElementById('fs-rest-timer-prominent');

    if (timeDisplay) {
        timeDisplay.textContent = remaining;
    }

    if (progressCircle) {
        const circumference = 2 * Math.PI * 45;
        const offset = circumference * (1 - remaining / total);
        progressCircle.style.strokeDashoffset = offset;
    }

    // Couleur selon le temps restant
    if (timerContainer) {
        timerContainer.classList.remove('timer-green', 'timer-yellow', 'timer-red');
        if (remaining > 5) {
            timerContainer.classList.add('timer-yellow'); // Jaune pour rest-pause
        } else {
            timerContainer.classList.add('timer-red');
        }
    }
}

// ==================== SUPERSETS ====================

/**
 * Créer un superset entre 2 exercices
 */
function createSuperset(exercise1Index, exercise2Index) {
    if (!fsSession.active) return;
    
    // Protection contre supersets undefined
    if (!fsSession.supersets) fsSession.supersets = [];
    
    // Vérifier que les exercices existent
    if (!fsSession.exercises[exercise1Index] || !fsSession.exercises[exercise2Index]) {
        showToast('Exercices introuvables', 'error');
        return;
    }
    
    // Vérifier qu'ils ne sont pas déjà dans un superset
    const alreadyInSuperset = fsSession.supersets.some(ss => 
        ss.exercise1Index === exercise1Index || 
        ss.exercise2Index === exercise1Index ||
        ss.exercise1Index === exercise2Index || 
        ss.exercise2Index === exercise2Index
    );
    
    if (alreadyInSuperset) {
        showToast('Un des exercices est déjà dans un superset', 'warning');
        return;
    }
    
    // Créer le superset
    fsSession.supersets.push({
        exercise1Index,
        exercise2Index
    });
    
    saveFsSessionToStorage();
    
    // Haptic
    if (window.HapticFeedback) {
        window.HapticFeedback.success();
    }
    
    showToast('✅ Superset créé !', 'success');
    renderCurrentExercise();
}

/**
 * Retirer un superset
 */
function removeSuperset(supersetIndex) {
    if (!fsSession.active) return;
    if (!fsSession.supersets) fsSession.supersets = [];
    
    fsSession.supersets.splice(supersetIndex, 1);
    saveFsSessionToStorage();
    
    showToast('Superset retiré', 'info');
    renderCurrentExercise();
}

/**
 * Vérifier si l'exercice actuel fait partie d'un superset
 */
function getCurrentSuperset() {
    if (!fsSession.active) return null;
    
    // Protection contre supersets undefined (sessions restaurées avant v30)
    if (!fsSession.supersets || !Array.isArray(fsSession.supersets)) {
        fsSession.supersets = [];
        return null;
    }
    
    const currentIdx = fsSession.currentExerciseIndex;
    
    for (let i = 0; i < fsSession.supersets.length; i++) {
        const ss = fsSession.supersets[i];
        if (ss.exercise1Index === currentIdx) {
            return { index: i, phase: 'A', partner: ss.exercise2Index };
        }
        if (ss.exercise2Index === currentIdx) {
            return { index: i, phase: 'B', partner: ss.exercise1Index };
        }
    }
    
    return null;
}

/**
 * Gérer la progression dans un superset
 */
function handleSupersetProgression() {
    const superset = getCurrentSuperset();
    if (!superset) return false; // Pas en superset
    
    const currentEx = fsSession.exercises[fsSession.currentExerciseIndex];
    const currentSetCompleted = fsSession.completedSets.filter(
        s => s.exerciseIndex === fsSession.currentExerciseIndex
    ).length;
    
    const isLastSet = currentSetCompleted >= currentEx.sets;
    
    if (superset.phase === 'A' && !isLastSet) {
        // Passer à l'exercice B du superset
        fsSession.currentExerciseIndex = superset.partner;
        fsSession.currentSetIndex = currentSetCompleted; // Même numéro de série
        renderCurrentExercise();
        
        showToast('⚡ Superset - Exercice 2', 'info', 1500);
        return true;
    } else if (superset.phase === 'B' && !isLastSet) {
        // Retourner à l'exercice A pour la série suivante
        fsSession.currentExerciseIndex = fsSession.supersets[superset.index].exercise1Index;
        fsSession.currentSetIndex++;
        renderCurrentExercise();
        
        // Démarrer le timer de repos après la paire
        startRestTimer();
        return true;
    }
    
    // Tous les sets du superset sont terminés
    return false;
}

// ==================== AUTOREGULATION (RPE/RIR) ====================

/**
 * Toggle affichage section autoregulation
 */
function toggleAutoregulation() {
    const inputs = document.getElementById('fs-autoregulation-inputs');
    const toggle = document.querySelector('.fs-autoregulation-toggle .toggle-icon');
    
    if (!inputs) return;
    
    const isHidden = inputs.style.display === 'none';
    inputs.style.display = isHidden ? 'flex' : 'none';
    
    if (toggle) {
        toggle.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
    }
    
    // Haptic
    if (window.HapticFeedback) {
        window.HapticFeedback.light();
    }
}

// ==================== FINISH SESSION ====================

function finishSession() {
    // Protection contre double exécution
    if (fsSession.sessionSaved) {
        console.warn('⚠️ Session déjà sauvegardée, ignore finishSession()');
        return;
    }
    
    // Progression de la périodisation
    updatePeriodization();
    
    if (fsSession.completedSets.length === 0) {
        if (confirm('Aucune série enregistrée. Quitter quand même ?')) {
            closeFullScreenSession();
        }
        return;
    }
    
    // Marquer immédiatement pour éviter double clic
    fsSession.sessionSaved = true;
    
    // Désactiver le bouton Terminer et afficher loading
    const finishBtn = document.querySelector('.fs-finish-btn');
    if (finishBtn) {
        finishBtn.disabled = true;
        finishBtn.dataset.originalText = finishBtn.textContent;
        finishBtn.innerHTML = '<span class="btn-spinner"></span> Sauvegarde...';
        finishBtn.classList.add('btn-loading');
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
            completed: true,
            // Données techniques avancées
            isDropSet: s.isDropSet || false,
            dropNumber: s.dropNumber || null,
            isRestPause: s.isRestPause || false,
            restPauseNumber: s.restPauseNumber || null,
            rpe: s.rpe || null,
            rir: s.rir || null
        }));

        // Check for PRs
        setsData.forEach(setData => {
            if (setData.weight > 0 && setData.reps > 0 && typeof checkForNewPR === 'function') {
                const prCheck = checkForNewPR(exerciseName, setData.weight, setData.reps);
                if (prCheck.isNewPR) {
                    newPRs.push({ exercise: exerciseName, ...prCheck });
                    // Haptic feedback sur PR
                    if (window.HapticFeedback) {
                        window.HapticFeedback.achievement();
                    }
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

    // Calculer le volume total et les calories brûlées
    const totalVolume = fsSession.completedSets.reduce((sum, set) => {
        return sum + (set.weight * set.reps);
    }, 0);
    
    const durationMinutes = Math.round((Date.now() - fsSession.startTime) / 1000 / 60);
    
    // Calculer les calories brûlées (MET musculation)
    // Intensité basée sur le volume/temps
    const volumePerMinute = totalVolume / durationMinutes;
    let met = 5; // Modéré par défaut
    
    if (volumePerMinute > 150) met = 6; // Intense
    else if (volumePerMinute < 80) met = 4; // Léger
    
    const userWeight = state.profile?.weight || 70;
    const caloriesBurned = Math.round(met * userWeight * (durationMinutes / 60));
    
    // Save session history
    const newSession = {
        sessionId: fsSession.sessionId, // UUID pour idempotence
        date: today,
        timestamp: Date.now(),
        program: state.wizardResults.selectedProgram,
        day: fsSession.splitName,
        exercises: sessionData,
        duration: durationMinutes,
        totalVolume: Math.round(totalVolume),
        caloriesBurned: caloriesBurned
    };
    
    state.sessionHistory.unshift(newSession);

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
            sessionId: fsSession.sessionId,
            date: today,
            program: state.wizardResults.selectedProgram,
            day: fsSession.splitName,
            exercises: sessionData,
            duration: durationMinutes,
            totalVolume: Math.round(totalVolume),
            caloriesBurned: caloriesBurned
        };
        if (typeof saveWorkoutSessionToSupabase === 'function') {
            saveWorkoutSessionToSupabase(sessionToSave).catch(err => {
                console.error('Erreur sync séance:', err);
                showToast('⚠️ Séance sauvegardée sur cet appareil uniquement. Reconnectez-vous pour synchroniser.', 'warning');
            });
        }

        sessionData.forEach(exData => {
            const logs = state.progressLog[exData.exercise];
            if (logs && logs.length > 0) {
                const lastLog = logs[logs.length - 1];
                if (typeof saveProgressLogToSupabase === 'function') {
                    saveProgressLogToSupabase(exData.exercise, lastLog).catch(err => {
                        console.error('Erreur sync progression:', err);
                        showToast('⚠️ Progression sauvegardée localement. Synchronisation en attente.', 'warning');
                    });
                }
            }
        });
        
        // Sync training progress
        if (typeof saveTrainingSettingsToSupabase === 'function') {
            saveTrainingSettingsToSupabase().catch(err => {
                console.error('Erreur sync paramètres:', err);
                showToast('Erreur synchronisation paramètres - sauvegardés localement', 'warning');
            });
        }
    }

    // Update streak
    if (typeof updateStreak === 'function') updateStreak();
    
    // Update PRs section
    if (typeof renderPRsSection === 'function') renderPRsSection();
    
    // Update weekly volume chart
    if (typeof renderWeeklyVolumeChart === 'function') renderWeeklyVolumeChart();
    
    // Update coach recommendations
    if (typeof renderCoachRecommendations === 'function') renderCoachRecommendations();
    
    // Update progress feed
    if (typeof renderProgressFeed === 'function') renderProgressFeed();
    
    // Update session history
    if (typeof updateSessionHistory === 'function') updateSessionHistory();

    // Réactiver le bouton (en cas de navigation)
    const finishBtnRestore = document.querySelector('.fs-finish-btn');
    if (finishBtnRestore) {
        finishBtnRestore.disabled = false;
        finishBtnRestore.innerHTML = finishBtnRestore.dataset.originalText || 'Terminer la séance';
        finishBtnRestore.classList.remove('btn-loading');
    }
    
    // Close full-screen
    fsSession.completedSets = []; // Clear so close doesn't prompt
    closeFullScreenSession();

    // Show results
    if (newPRs.length > 0) {
        showPRNotification(newPRs);
        // Haptic achievement pour PR
        if (window.HapticFeedback) {
            window.HapticFeedback.achievement();
        }
    } else {
        showToast('Séance enregistrée ! 🎉', 'success');
        // Haptic success pour séance complétée
        if (window.HapticFeedback) {
            window.HapticFeedback.success();
        }
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

// ==================== PR NOTIFICATION SPECTACULAIRE ====================

function showPRNotification(prs) {
    // Haptic achievement
    if (window.HapticFeedback) {
        window.HapticFeedback.achievement();
    }
    
    // Créer overlay celebration spectaculaire
    const overlay = document.createElement('div');
    overlay.className = 'pr-celebration-overlay';
    
    const card = document.createElement('div');
    card.className = 'pr-celebration-card';
    
    // Contenu de la card
    if (prs.length === 1) {
        card.innerHTML = `
            <span class="pr-celebration-icon">🏆</span>
            <div class="pr-celebration-title">NOUVEAU RECORD !</div>
            <div class="pr-celebration-message">${prs[0].message}</div>
        `;
    } else {
        card.innerHTML = `
            <span class="pr-celebration-icon">🎉</span>
            <div class="pr-celebration-title">RECORDS EXPLOSÉS !</div>
            <div class="pr-celebration-message">${prs.length} nouveaux PR</div>
            <div class="pr-celebration-count">
                ${prs.map(pr => pr.exercise).join(' • ')}
            </div>
        `;
    }
    
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    
    // Retirer après l'animation
    setTimeout(() => {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.3s ease-out';
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        }, 300);
    }, 2500);
    
    // Toast de confirmation après
    setTimeout(() => {
        showToast('Séance enregistrée ! 💪', 'success');
    }, 2800);
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
    
    // Remplir les muscles ciblés avec icônes SVG
    const muscleTagsContainer = document.getElementById('info-muscle-tags');
    if (exercise.muscleTargets && exercise.muscleTargets.length > 0) {
        muscleTagsContainer.innerHTML = exercise.muscleTargets.map(muscle => {
            if (window.MuscleIcons) {
                return window.MuscleIcons.renderMuscleTag(muscle);
            }
            return `<span class="info-muscle-tag">${muscle}</span>`;
        }).join('');
    } else {
        const muscleName = muscleGroups[exercise.muscle]?.name || exercise.muscle;
        if (window.MuscleIcons) {
            muscleTagsContainer.innerHTML = window.MuscleIcons.renderMuscleTag(exercise.muscle);
        } else {
            muscleTagsContainer.innerHTML = `<span class="info-muscle-tag">${muscleName}</span>`;
        }
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

// ==================== SESSION DEDUPLICATION ====================

/**
 * Déduplique les sessions en local
 * Garde la session avec le plus de séries ou la plus ancienne
 */
async function deduplicateSessions() {
    if (!state.sessionHistory || state.sessionHistory.length === 0) {
        console.log('Aucune session à dédupliquer');
        return { removed: 0, kept: state.sessionHistory.length };
    }
    
    console.log('🔍 Démarrage déduplication...', state.sessionHistory.length, 'sessions');
    
    // Grouper par date + program + day
    const groups = {};
    state.sessionHistory.forEach((session, index) => {
        const key = `${session.date}|${session.program}|${session.day}`;
        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push({ session, originalIndex: index });
    });
    
    // Identifier les doublons
    const duplicateGroups = Object.entries(groups).filter(([key, sessions]) => sessions.length > 1);
    
    if (duplicateGroups.length === 0) {
        console.log('✅ Aucun doublon détecté');
        return { removed: 0, kept: state.sessionHistory.length };
    }
    
    console.log(`⚠️ ${duplicateGroups.length} groupes de doublons détectés`);
    
    const sessionsToKeep = [];
    const sessionsToRemove = [];
    
    duplicateGroups.forEach(([key, duplicates]) => {
        console.log(`  Groupe "${key}": ${duplicates.length} doublons`);
        
        // Trier par nombre d'exercices/séries (décroissant) puis par timestamp (croissant)
        const sorted = duplicates.sort((a, b) => {
            const aExerciseCount = a.session.exercises?.length || 0;
            const bExerciseCount = b.session.exercises?.length || 0;
            
            if (aExerciseCount !== bExerciseCount) {
                return bExerciseCount - aExerciseCount; // Plus d'exercices = priorité
            }
            
            return a.session.timestamp - b.session.timestamp; // Plus ancien = priorité
        });
        
        // Garder la première (meilleure)
        sessionsToKeep.push(sorted[0].session);
        
        // Marquer les autres pour suppression
        sorted.slice(1).forEach(dup => {
            sessionsToRemove.push(dup.session);
            console.log(`    ❌ Supprimer: ${dup.session.timestamp}, exercices: ${dup.session.exercises?.length || 0}`);
        });
        
        console.log(`    ✅ Garder: ${sorted[0].session.timestamp}, exercices: ${sorted[0].session.exercises?.length || 0}`);
    });
    
    // Ajouter les sessions uniques (non dupliquées)
    Object.entries(groups)
        .filter(([key, sessions]) => sessions.length === 1)
        .forEach(([key, sessions]) => {
            sessionsToKeep.push(sessions[0].session);
        });
    
    // Remplacer state.sessionHistory
    const originalLength = state.sessionHistory.length;
    state.sessionHistory = sessionsToKeep.sort((a, b) => b.timestamp - a.timestamp);
    
    // Sauvegarder
    saveState();
    
    const result = {
        removed: sessionsToRemove.length,
        kept: sessionsToKeep.length,
        total: originalLength
    };
    
    console.log(`✅ Déduplication terminée: ${result.removed} supprimées, ${result.kept} conservées`);
    
    // Afficher un toast
    if (result.removed > 0) {
        showToast(`${result.removed} séances dupliquées supprimées`, 'success');
    }
    
    return result;
}

/**
 * Lance la déduplication périodiquement
 * S'exécute au chargement puis toutes les 5 minutes
 */
function autoDeduplicatePeriodic() {
    // Première exécution 2 secondes après le chargement
    setTimeout(async () => {
        const result = await deduplicateSessions();
        if (result.removed > 0) {
            // Recalculer les stats
            if (typeof updateStreak === 'function') updateStreak();
            if (typeof updateSessionHistory === 'function') updateSessionHistory();
            if (typeof updateProgressHero === 'function') updateProgressHero();
            if (typeof updateDashboard === 'function') updateDashboard();
            
            console.log('🎉 Déduplication automatique:', result.removed, 'supprimées');
        }
        
        // Ensuite toutes les 5 minutes (en arrière-plan)
        setInterval(async () => {
            const periodicResult = await deduplicateSessions();
            if (periodicResult.removed > 0) {
                console.log('🔄 Déduplication périodique:', periodicResult.removed, 'supprimées');
                if (typeof updateSessionHistory === 'function') updateSessionHistory();
            }
        }, 5 * 60 * 1000); // 5 minutes
    }, 2000);
}

// ==================== TEMPLATES PERSONNALISABLES ====================

/**
 * Dupliquer une séance existante pour créer un template
 * @param {string} sessionId - ID de la séance à dupliquer
 * @returns {Object|null} Le template créé ou null
 */
function duplicateSession(sessionId) {
    const session = state.sessionHistory?.find(s => s.id === sessionId || s.sessionId === sessionId);
    if (!session) {
        showToast('Séance introuvable', 'error');
        return null;
    }
    
    // Créer template depuis la séance
    const template = {
        id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: `${session.day} (copie)`,
        basedOn: sessionId,
        exercises: (session.exercises || []).map(ex => ({
            name: ex.exercise || ex.name,
            muscle: ex.muscle || getMuscleForExercise(ex.exercise || ex.name),
            sets: ex.sets?.length || 3,
            reps: ex.sets?.[0]?.reps || 10,
            rest: ex.rest || 90
        })),
        createdAt: Date.now(),
        version: 1,
        lastModified: Date.now()
    };
    
    // Sauvegarder dans state.customTemplates
    if (!state.customTemplates) state.customTemplates = [];
    state.customTemplates.push(template);
    saveState();
    
    if (window.HapticFeedback) {
        window.HapticFeedback.success();
    }
    
    showToast(`✅ Template "${template.name}" créé !`, 'success');
    console.log('📋 Template créé:', template);
    
    return template;
}

/**
 * Démarrer une séance depuis un template personnalisé
 * @param {string} templateId - ID du template
 */
function startSessionFromTemplate(templateId) {
    const template = state.customTemplates?.find(t => t.id === templateId);
    if (!template) {
        showToast('Template introuvable', 'error');
        return;
    }
    
    // Convertir template en format fsSession
    const exercises = template.exercises.map(ex => ({
        name: ex.name,
        muscle: ex.muscle || getMuscleForExercise(ex.name),
        sets: ex.sets || 3,
        reps: String(ex.reps || 10),
        effectiveName: ex.name,
        rest: ex.rest || 90
    }));
    
    if (window.HapticFeedback) {
        window.HapticFeedback.tap();
    }
    
    // Démarrer la séance en mode custom
    startFullScreenSessionWithCustomExercises(-1, exercises, template.name);
    console.log(`🎯 Séance démarrée depuis template: ${template.name}`);
}

/**
 * Modifier un template existant
 * @param {string} templateId - ID du template
 * @param {Object} updates - Modifications à appliquer
 */
function updateTemplate(templateId, updates) {
    if (!state.customTemplates) state.customTemplates = [];
    
    const template = state.customTemplates.find(t => t.id === templateId);
    if (!template) {
        showToast('Template introuvable', 'error');
        return false;
    }
    
    // Appliquer les modifications
    Object.assign(template, updates);
    template.version = (template.version || 1) + 1;
    template.lastModified = Date.now();
    
    saveState();
    showToast('Template modifié', 'success');
    
    return true;
}

/**
 * Supprimer un template
 * @param {string} templateId - ID du template
 */
function deleteTemplate(templateId) {
    if (!state.customTemplates) return false;
    
    const index = state.customTemplates.findIndex(t => t.id === templateId);
    if (index === -1) {
        showToast('Template introuvable', 'error');
        return false;
    }
    
    const template = state.customTemplates[index];
    
    if (!confirm(`Supprimer le template "${template.name}" ?`)) {
        return false;
    }
    
    state.customTemplates.splice(index, 1);
    saveState();
    
    showToast(`✅ "${template.name}" supprimé`, 'success');
    return true;
}

/**
 * Obtenir le muscle d'un exercice par son nom
 * @param {string} exerciseName - Nom de l'exercice
 * @returns {string} Groupe musculaire
 */
function getMuscleForExercise(exerciseName) {
    const exercise = state.exercises?.find(ex => 
        ex.name.toLowerCase() === exerciseName.toLowerCase()
    );
    return exercise?.muscle || 'unknown';
}

// ==================== EXPORTS GLOBAUX ====================
// Fonctions de session
window.quickStartSession = quickStartSession;
window.showSessionPreview = showSessionPreview;
window.closeSessionPreview = closeSessionPreview;
window.startSessionFromPreview = startSessionFromPreview;
window.startFullScreenSession = startFullScreenSession;
window.restoreSession = restoreSession;
window.minimizeSession = minimizeSession;
window.finishSession = finishSession;
window.quitSession = quitSession;
window.returnToPreview = returnToPreview;
window.closeFullScreenSession = closeFullScreenSession;

// Fonctions wizard
window.openProgramWizard = openProgramWizard;
window.selectWizardOption = selectWizardOption;
window.wizardNext = wizardNext;
window.wizardBack = wizardBack;
window.selectProgram = selectProgram;
window.toggleWizardSensitivity = toggleWizardSensitivity;

// Fonctions d'exercices
window.openExerciseSwapSheet = openExerciseSwapSheet;
window.openExerciseTips = openExerciseTips;
window.closeExerciseInfo = closeExerciseInfo;
window.closeBottomSheet = closeBottomSheet;
window.swapExerciseInPreview = swapExerciseInPreview;
window.executeSwap = executeSwap;
window.handleSwapSearch = handleSwapSearch;
window.clearSwapSearch = clearSwapSearch;

// Fonctions de contrôle de session
window.adjustWeight = adjustWeight;
window.adjustReps = adjustReps;
window.validateCurrentSet = validateCurrentSet;
window.toggleAutoregulation = toggleAutoregulation;
window.resetFsTimer = resetFsTimer;
window.adjustFsTimer = adjustFsTimer;
window.goToNextExercise = goToNextExercise;
window.editCompletedSet = editCompletedSet;
window.skipSet = typeof skipSet === 'function' ? skipSet : function() {};

// Fonctions de paramètres
window.openSessionSettings = openSessionSettings;
window.closeSettingsSheet = closeSettingsSheet;
window.adjustRestTime = adjustRestTime;
window.selectDuration = selectDuration;
window.showDurationPicker = showDurationPicker;
window.closeDurationPicker = closeDurationPicker;
window.filterExercisesByDuration = filterExercisesByDuration;

// Fonctions de confirmation
window.showParamsConfirmationSheet = showParamsConfirmationSheet;
window.closeParamsConfirmationSheet = closeParamsConfirmationSheet;
window.applySwapWithSuggestedParams = applySwapWithSuggestedParams;
window.applySwapKeepParams = applySwapKeepParams;

// Fonctions avancées
window.startDropSet = startDropSet;
window.startRestPause = startRestPause;
window.createSuperset = createSuperset;
window.removeSuperset = removeSuperset;
window.machineOccupied = machineOccupied;
window.postponeCurrentExercise = postponeCurrentExercise;

// Fonctions périodisation
window.getCurrentPhase = getCurrentPhase;
window.getPhaseAdjustments = getPhaseAdjustments;
window.updatePhaseIndicator = updatePhaseIndicator;
window.initPeriodization = initPeriodization;
window.updateCurrentPhase = updateCurrentPhase;

// Fonctions de template
window.duplicateSession = duplicateSession;
window.startSessionFromTemplate = startSessionFromTemplate;
window.updateTemplate = updateTemplate;
window.deleteTemplate = deleteTemplate;

// Fonctions de rendu
window.renderProgramTypes = renderProgramTypes;
window.updateWeeklySchedule = updateWeeklySchedule;
window.populateSessionDaySelect = populateSessionDaySelect;
window.loadSessionDay = loadSessionDay;
window.updateTrainingDays = updateTrainingDays;
window.renderTrainingSection = renderTrainingSection;

// ==================== PERIODIZATION CONFIG UI ====================

/**
 * Ouvre le bottom sheet de configuration périodisation
 */
function openPeriodizationSheet() {
    const sheet = document.getElementById('periodization-sheet');
    if (!sheet) return;

    // Mettre à jour l'affichage
    updatePeriodizationSheetUI();

    sheet.style.display = 'flex';
    requestAnimationFrame(() => {
        sheet.classList.add('active');
    });
}

/**
 * Ferme le bottom sheet de périodisation
 */
function closePeriodizationSheet() {
    const sheet = document.getElementById('periodization-sheet');
    if (!sheet) return;

    sheet.classList.remove('active');
    setTimeout(() => {
        sheet.style.display = 'none';
    }, 300);
}

/**
 * Met à jour l'UI du sheet de périodisation
 */
function updatePeriodizationSheetUI() {
    const cycleType = state.periodization?.cycleType || '4';
    const currentWeek = state.periodization?.currentWeek || 1;
    const currentCycle = state.periodization?.currentCycle || 1;
    const phase = state.periodization?.currentPhase || 'hypertrophy';
    const preset = CYCLE_PRESETS[cycleType];
    const totalWeeks = preset?.totalWeeks || 4;

    // Status badge
    const statusBadge = document.getElementById('period-current-phase');
    if (statusBadge) {
        const phaseIcons = { hypertrophy: '💪', strength: '🏋️', deload: '🧘', peak: '⚡' };
        const phaseNames = { hypertrophy: 'Hypertrophie', strength: 'Force', deload: 'Deload', peak: 'Peak' };
        statusBadge.textContent = `${phaseIcons[phase] || '💪'} ${phaseNames[phase] || 'Hypertrophie'}`;
        statusBadge.className = `period-status-badge ${phase}`;
    }

    // Week dots
    const weekDots = document.getElementById('period-week-dots');
    if (weekDots) {
        let dotsHTML = '';
        for (let i = 1; i <= totalWeeks; i++) {
            const isActive = i === currentWeek;
            const isCompleted = i < currentWeek;
            dotsHTML += `<div class="period-week-dot ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}" data-week="${i}">S${i}</div>`;
        }
        weekDots.innerHTML = dotsHTML;
    }

    // Cycle info
    const cycleNumber = document.getElementById('period-cycle-number');
    const nextPhase = document.getElementById('period-next-phase');
    if (cycleNumber) cycleNumber.textContent = `Cycle ${currentCycle}`;

    if (nextPhase) {
        // Calculer la prochaine phase
        let nextPhaseName = '';
        let weeksUntil = 0;

        for (const [phaseName, config] of Object.entries(preset.phases)) {
            const firstWeek = Math.min(...config.weeks);
            if (firstWeek > currentWeek) {
                nextPhaseName = phaseName;
                weeksUntil = firstWeek - currentWeek;
                break;
            }
        }

        if (nextPhaseName) {
            const phaseNames = { hypertrophy: 'Hypertrophie', strength: 'Force', deload: 'Deload', peak: 'Peak' };
            nextPhase.textContent = `→ ${phaseNames[nextPhaseName]} dans ${weeksUntil} semaine${weeksUntil > 1 ? 's' : ''}`;
        } else {
            nextPhase.textContent = `→ Fin du cycle dans ${totalWeeks - currentWeek + 1} semaine${totalWeeks - currentWeek > 0 ? 's' : ''}`;
        }
    }

    // Sélection du cycle
    document.querySelectorAll('.period-cycle-option').forEach(opt => {
        opt.classList.toggle('selected', opt.dataset.cycle === cycleType);
    });
}

/**
 * Sélectionne un nouveau type de cycle
 */
function selectPeriodizationCycle(cycleType) {
    if (!CYCLE_PRESETS[cycleType]) return;

    const preset = CYCLE_PRESETS[cycleType];
    const previousType = state.periodization?.cycleType || '4';

    // Si on change de type, demander confirmation
    if (previousType !== cycleType && state.periodization?.currentWeek > 1) {
        if (!confirm(`Changer de cycle va recommencer à la semaine 1. Continuer ?`)) {
            return;
        }
    }

    // Appliquer le nouveau preset
    state.periodization = {
        ...state.periodization,
        cycleType: cycleType,
        currentWeek: previousType !== cycleType ? 1 : (state.periodization?.currentWeek || 1),
        currentCycle: previousType !== cycleType ? 1 : (state.periodization?.currentCycle || 1),
        totalWeeks: preset.totalWeeks,
        phaseConfig: preset.phases,
        plannedWeeklyVolume: preset.plannedVolume,
        baselineVolume: previousType !== cycleType ? null : state.periodization?.baselineVolume
    };

    // Recalculer la phase courante
    updateCurrentPhase();
    saveState();

    // Mettre à jour l'UI
    updatePeriodizationSheetUI();

    // Toast
    showToast(`Cycle ${preset.name} (${preset.totalWeeks} semaines) activé`, 'success');
}

/**
 * Recommence le cycle à zéro
 */
function resetPeriodizationCycle() {
    if (!confirm('Recommencer le cycle ? Ta progression de semaines sera réinitialisée.')) {
        return;
    }

    state.periodization = {
        ...state.periodization,
        currentWeek: 1,
        currentCycle: (state.periodization?.currentCycle || 0) + 1,
        weeklyVolume: [],
        baselineVolume: null
    };

    updateCurrentPhase();
    saveState();
    updatePeriodizationSheetUI();

    showToast('Cycle recommencé ! Semaine 1 💪', 'success');
}

/**
 * Toggle la section éducative
 */
function togglePeriodEducation() {
    const content = document.getElementById('period-education-content');
    const toggle = document.querySelector('.period-education-toggle');

    if (!content || !toggle) return;

    const isHidden = content.style.display === 'none';
    content.style.display = isHidden ? 'flex' : 'none';
    toggle.classList.toggle('expanded', isHidden);
}

// Exports périodisation UI
window.openPeriodizationSheet = openPeriodizationSheet;
window.closePeriodizationSheet = closePeriodizationSheet;
window.selectPeriodizationCycle = selectPeriodizationCycle;
window.resetPeriodizationCycle = resetPeriodizationCycle;
window.togglePeriodEducation = togglePeriodEducation;
window.CYCLE_PRESETS = CYCLE_PRESETS;

console.log('✅ training.js: Fonctions exportées au scope global');
