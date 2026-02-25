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

// ==================== OVERFLOW MANAGER (FIX SCROLL BUG) ====================
/**
 * Gestionnaire centralisé pour le blocage du scroll
 * Évite les conflits quand plusieurs modales/fullscreen s'ouvrent/ferment
 */
// OverflowManager: thin wrapper delegating to unified ModalManager (defined in ui.js)
const OverflowManager = {
    lock() { if (window.ModalManager) ModalManager.lock('training-overflow'); },
    unlock() { if (window.ModalManager) ModalManager.unlock('training-overflow'); },
    forceUnlock() { if (window.ModalManager) ModalManager.forceUnlockAll(); },
    isLocked() { return window.ModalManager ? ModalManager.isLocked() : false; }
};

window.OverflowManager = OverflowManager;

// Failsafe: reset quand on change de section (navigation)
document.addEventListener('click', (e) => {
    const navItem = e.target.closest('.bottom-nav-item, .nav-tab');
    if (navItem && window.ModalManager && ModalManager.isLocked()) {
        console.log('🔄 Navigation détectée - reset ModalManager');
        ModalManager.forceUnlockAll();
    }
});

// ==================== BODYWEIGHT UTILITIES ====================

/**
 * Trouve un exercice dans state.exercises par son nom
 */
function findExerciseByName(name) {
    if (!state.exercises || !name) return null;
    // Exact match
    let found = state.exercises.find(ex => ex.name === name || ex.id === name);
    if (found) return found;
    // Fallback: si c'est une variante "Exercice - Variante", chercher le nom de base
    const dashIdx = name.lastIndexOf(' - ');
    if (dashIdx > 0) {
        const baseName = name.substring(0, dashIdx);
        found = state.exercises.find(ex => ex.name === baseName || ex.id === baseName);
        if (found) return found;
    }
    return null;
}

/**
 * Retourne le poids effectif pour le calcul de volume.
 * Pour les exercices bodyweight : poids du corps + lest (si > 0) ou poids du corps - assistance (si < 0)
 */
function getEffectiveWeight(exerciseName, inputWeight) {
    const exercise = findExerciseByName(exerciseName);
    if (!exercise || exercise.equipment !== 'bodyweight') {
        return inputWeight;
    }
    const bodyWeight = state.profile?.weight || 70;
    if (inputWeight === 0) {
        return bodyWeight;
    }
    if (inputWeight > 0) {
        return bodyWeight + inputWeight; // Lesté
    }
    // inputWeight < 0 = assistance (ex: tractions assistées)
    return Math.max(0, bodyWeight + inputWeight);
}

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

        // Afficher brièvement l'indicateur de sauvegarde
        showSaveIndicator();
    } catch (err) {
        console.error('Erreur sauvegarde session:', err);
    }
}

/**
 * Affiche un indicateur visuel de sauvegarde dans le fullscreen
 */
function showSaveIndicator() {
    let indicator = document.getElementById('fs-save-indicator');

    if (!indicator) {
        // Créer l'indicateur s'il n'existe pas
        indicator = document.createElement('div');
        indicator.id = 'fs-save-indicator';
        indicator.style.cssText = `
            position: fixed;
            top: 60px;
            right: 12px;
            background: rgba(34, 197, 94, 0.9);
            color: white;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 6px;
            z-index: 10000;
            opacity: 0;
            transform: translateY(-10px);
            transition: all 0.3s ease;
            pointer-events: none;
        `;
        indicator.innerHTML = '<span>💾</span><span>Sauvegardé</span>';
        document.body.appendChild(indicator);
    }

    // Animer l'apparition
    requestAnimationFrame(() => {
        indicator.style.opacity = '1';
        indicator.style.transform = 'translateY(0)';
    });

    // Masquer après 1.5s
    setTimeout(() => {
        indicator.style.opacity = '0';
        indicator.style.transform = 'translateY(-10px)';
    }, 1500);
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
async function tryRestorePendingSession() {
    const savedSession = loadFsSessionFromStorage();
    if (!savedSession) return;

    // Proposer à l'utilisateur de restaurer
    const elapsedMinutes = Math.floor((Date.now() - savedSession.startTime) / 60000);

    const confirmed = await showConfirmModal({
        title: 'Séance en cours',
        message: `Tu as une séance "${savedSession.splitName}" en cours (${elapsedMinutes} min). Reprendre ?`,
        icon: '🔄',
        confirmLabel: 'Reprendre',
        cancelLabel: 'Supprimer'
    });

    if (confirmed) {
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
            OverflowManager.lock();

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
    _currentProgramSplitIndex = currentIndex;
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

    // NOUVEAU: Périodisation Adaptative - vérifier si une transition est suggérée
    let phaseTransitionWidget = '';
    const lastDismissed = localStorage.getItem('repzy-phase-dismissed');
    const dismissedRecently = lastDismissed && (new Date() - new Date(lastDismissed)) < 24 * 60 * 60 * 1000; // 24h

    if (!dismissedRecently && window.SmartTraining?.suggestPhaseTransition) {
        // Incrémenter le compteur de semaines dans la phase actuelle
        if (window.SmartTraining.incrementWeeksInPhase) {
            window.SmartTraining.incrementWeeksInPhase();
        }

        const phaseSuggestion = window.SmartTraining.suggestPhaseTransition();
        if (phaseSuggestion.shouldTransition && phaseSuggestion.confidence !== 'low') {
            phaseTransitionWidget = window.SmartTraining.renderPhaseTransitionWidget();
        }
    }

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

        <!-- Adaptive Phase Transition Widget -->
        ${phaseTransitionWidget}

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

        <button class="btn-nouvelle-seance" onclick="openNewSessionSheet()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
            Nouvelle séance
        </button>

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
async function closeSessionPreview() {
    if (previewSession.hasChanges) {
        const confirmed = await showConfirmModal({
            title: 'Quitter l\'aperçu ?',
            message: 'Tu as modifié des exercices. Quitter sans sauvegarder ?',
            icon: '⚠️',
            confirmLabel: 'Quitter',
            cancelLabel: 'Rester',
            confirmType: 'danger'
        });
        if (!confirmed) return;
    }

    document.getElementById('session-preview').style.display = 'none';
    OverflowManager.unlock();

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

        // Utiliser smart-training pour obtenir le poids suggéré (DOUBLE PROGRESSION)
        let suggestedWeight = null;
        let progressionInfo = null;
        let lastWeight = null;
        let progressionAction = 'maintain';

        if (window.SmartTraining && typeof window.SmartTraining.calculateSuggestedWeight === 'function') {
            const suggestion = window.SmartTraining.calculateSuggestedWeight(exerciseName, 10);
            suggestedWeight = suggestion.suggested;
            lastWeight = suggestion.lastWeight;
            progressionInfo = suggestion.message;
            progressionAction = suggestion.action || 'maintain';

            // Log pour debug
            console.log(`📊 Preview ${exerciseName}:`, {
                suggested: suggestedWeight,
                lastWeight,
                action: progressionAction,
                lastReps: suggestion.lastReps,
                message: progressionInfo
            });
        } else if (state.progressLog && state.progressLog[exerciseName]) {
            // Fallback: utiliser le dernier log directement (pas de réduction)
            const logs = state.progressLog[exerciseName];
            if (logs.length > 0) {
                const lastLog = logs[logs.length - 1];
                lastWeight = lastLog.weight;
                // Par défaut: maintenir le poids de la dernière séance
                suggestedWeight = lastWeight;
                progressionInfo = 'Maintenir';
                progressionAction = 'maintain';
            }
        }

        // Calculer volume estimé pour cet exercice
        if (suggestedWeight) {
            const avgReps = (phaseAdjustments.repsMin + phaseAdjustments.repsMax) / 2;
            totalEstimatedVolume += suggestedWeight * avgReps * adjustedSets;
        }
        totalSets += adjustedSets;

        // Déterminer l'indicateur de progression basé sur l'ACTION
        let progressionIcon = '➡️';
        let progressionClass = 'maintain';

        switch (progressionAction) {
            case 'weight_up':
                progressionIcon = '🏋️';
                progressionClass = 'up';
                break;
            case 'reps_up':
                progressionIcon = '📈';
                progressionClass = 'up';
                break;
            case 'weight_down':
                progressionIcon = '📉';
                progressionClass = 'down';
                break;
            case 'deload':
                progressionIcon = '🔄';
                progressionClass = 'down';
                break;
            case 'plateau':
                progressionIcon = '⚠️';
                progressionClass = 'warning';
                break;
            case 'new':
                progressionIcon = '🆕';
                progressionClass = 'new';
                break;
            case 'range_change':
                progressionIcon = '🔄';
                progressionClass = 'adapt';
                break;
            default:
                progressionIcon = '➡️';
                progressionClass = 'maintain';
        }

        // Générer HTML pour cet exercice (layout 3 lignes - premium)
        if (suggestedWeight) {
            return `
                <div class="brief-exercise-item">
                    <!-- Ligne 1: Nom + icône -->
                    <div class="brief-exercise-row-1">
                        <div class="brief-exercise-name-wrap">
                            <span class="brief-exercise-num">${idx + 1}.</span>
                            <span class="brief-exercise-name" title="${exerciseName}">${exerciseName}</span>
                        </div>
                        <div class="brief-exercise-progression ${progressionClass}">
                            <span class="brief-progression-icon">${progressionIcon}</span>
                        </div>
                    </div>
                    <!-- Ligne 2: Poids seul, centré -->
                    <div class="brief-exercise-weight-line">
                        <span class="brief-target-weight">${suggestedWeight}kg</span>
                    </div>
                    <!-- Ligne 3: Séries + badge -->
                    <div class="brief-exercise-details-line">
                        <span class="brief-target-sets">${adjustedSets} séries × ${phaseAdjustments.repsRange}</span>
                        <span class="brief-progression-text">${progressionInfo || ''}</span>
                    </div>
                </div>
            `;
        } else {
            // Pas d'historique - première fois
            return `
                <div class="brief-exercise-item brief-exercise-new">
                    <!-- Ligne 1: Nom + icône -->
                    <div class="brief-exercise-row-1">
                        <div class="brief-exercise-name-wrap">
                            <span class="brief-exercise-num">${idx + 1}.</span>
                            <span class="brief-exercise-name" title="${exerciseName}">${exerciseName}</span>
                        </div>
                        <div class="brief-exercise-progression new">
                            <span class="brief-progression-icon">🆕</span>
                        </div>
                    </div>
                    <!-- Ligne 2: Poids placeholder -->
                    <div class="brief-exercise-weight-line">
                        <span class="brief-target-weight">—</span>
                    </div>
                    <!-- Ligne 3: Séries + badge -->
                    <div class="brief-exercise-details-line">
                        <span class="brief-target-sets">${adjustedSets} séries × ${phaseAdjustments.repsRange}</span>
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

    _fsSwapMode = false;

    // Cacher la section variante (pas en FS mode)
    const variantSection = document.getElementById('swap-variant-section');
    if (variantSection) variantSection.style.display = 'none';

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
    if (window.ModalManager) ModalManager.unlock('swap-bottom-sheet');
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
    if (!exercise) return;

    // Si on est en mode sélection séance libre, ajouter l'exercice
    if (_freePickerMode) {
        _freePickerMode = false;
        // Restaurer le titre du swap sheet
        const titleEl = document.querySelector('#swap-bottom-sheet .bottom-sheet-title');
        if (titleEl) titleEl.textContent = 'Remplacer l\'exercice';
        const currentExerciseSection = document.querySelector('.swap-current-exercise');
        if (currentExerciseSection) currentExerciseSection.style.display = '';
        addExerciseToFreeSession(exerciseId);
        return;
    }

    // Si on est en mode full-screen swap, déléguer
    if (_fsSwapMode) {
        _fsSwapMode = false;
        applyFsExerciseSwap(exerciseId, exercise.name);
        return;
    }

    if (previewSession.currentSwapIndex === null) return;

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

// ==================== FS EXERCISE SWAP (DURING SESSION) ====================

/** Flag pour savoir si le swap est en mode full-screen */
let _fsSwapMode = false;

/** Flag pour savoir si le swap est en mode sélection (séance libre) */
let _freePickerMode = false;

/** Index du split courant dans le programme (pour le bouton "Programme" du new-session-sheet) */
let _currentProgramSplitIndex = 0;

/** État du builder de séance libre */
let freeSessionBuilder = { name: '', exercises: [] };

/**
 * Ouvre le swap bottom sheet pour l'exercice en cours dans le full-screen session.
 * Réutilise le même bottom sheet que le preview, avec un flag pour le callback.
 */
function openFsExerciseSwap() {
    if (!fsSession.active) return;

    const exercise = fsSession.exercises[fsSession.currentExerciseIndex];
    if (!exercise) return;

    _fsSwapMode = true;

    // Construire un faux previewSession context pour réutiliser le swap sheet
    const originalExerciseId = getExerciseIdByName(exercise.effectiveName, exercise.muscle);
    previewSession.currentSwapIndex = fsSession.currentExerciseIndex;
    previewSession.currentSwapExerciseId = originalExerciseId;

    // Nom actuel
    const nameEl = document.getElementById('swap-current-name');
    if (nameEl) nameEl.textContent = exercise.effectiveName;

    // Réinitialiser la recherche
    const searchInput = document.getElementById('swap-search-input');
    if (searchInput) searchInput.value = '';

    // Afficher la section variante (FS mode only)
    const variantSection = document.getElementById('swap-variant-section');
    if (variantSection) variantSection.style.display = 'block';
    const variantInput = document.getElementById('swap-variant-input');
    if (variantInput) variantInput.value = '';

    // Obtenir les exercices équivalents
    const favoriteExercises = state.wizardResults?.favoriteExercises || [];
    const exerciseData = getEquivalentExercises(originalExerciseId, favoriteExercises);
    previewSession.swapExerciseData = exerciseData;

    renderSwapSections(exerciseData.equivalents, exerciseData.sameMuscle, []);

    // Ouvrir le sheet
    const sheet = document.getElementById('swap-bottom-sheet');
    if (sheet) {
        if (window.ModalManager) ModalManager.lock('swap-bottom-sheet');
        sheet.style.display = 'flex';
        sheet.offsetHeight;
        sheet.classList.remove('animate-in');
        void sheet.offsetWidth;
        sheet.classList.add('animate-in');
        initSwapSheetSwipe();
    }
}

/**
 * Crée une variante d'exercice (ex: "Chest Press Machine - Convergente Bas")
 */
function createExerciseVariant() {
    const input = document.getElementById('swap-variant-input');
    if (!input || !input.value.trim()) {
        showToast('Entre un nom de variante', 'error');
        return;
    }

    const suffix = input.value.trim();
    const exercise = fsSession.exercises[fsSession.currentExerciseIndex];
    if (!exercise) return;

    // Nom de base (sans variante existante)
    const baseName = exercise.originalName || exercise.effectiveName;
    const variantName = `${baseName} - ${suffix}`;

    // Sauvegarder la variante dans state
    if (!state.customExerciseVariants[baseName]) {
        state.customExerciseVariants[baseName] = [];
    }
    if (!state.customExerciseVariants[baseName].includes(suffix)) {
        state.customExerciseVariants[baseName].push(suffix);
        saveState();
    }

    // Appliquer comme un swap avec le nom de variante
    _fsSwapMode = false;
    fsSession.exercises[fsSession.currentExerciseIndex] = {
        ...exercise,
        effectiveName: variantName,
        originalName: baseName,
        swapped: true
    };

    closeBottomSheet();
    renderCurrentExercise();
    showToast(`Variante créée : ${variantName}`, 'success');
}

/**
 * Applique un swap d'exercice en cours de session full-screen.
 * Remplace le nom de l'exercice, conserve les séries déjà faites.
 */
function applyFsExerciseSwap(exerciseId, exerciseName) {
    const idx = fsSession.currentExerciseIndex;
    const old = fsSession.exercises[idx];

    fsSession.exercises[idx] = {
        ...old,
        effectiveName: exerciseName,
        effectiveId: exerciseId,
        originalName: old.originalName || old.effectiveName,
        swapped: true
    };

    closeBottomSheet();
    renderCurrentExercise();
    showToast(`Exercice changé : ${exerciseName}`, 'success');
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
    OverflowManager.lock();

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
    OverflowManager.lock();

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

    // Initialiser le swipe gauche/droite entre exercices
    if (window.MobileGestures?.ExerciseSwipeNavigator && window.innerWidth <= 768) {
        const fsContent = document.querySelector('.fs-content');
        if (fsContent) {
            window._exerciseSwipeNav = new MobileGestures.ExerciseSwipeNavigator(fsContent);
            window._exerciseSwipeNav.init();
        }
    }
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
async function machineOccupied() {
    if (!fsSession.active) return;

    const currentExercise = fsSession.exercises[fsSession.currentExerciseIndex];
    if (!currentExercise) return;

    const confirmed = await showConfirmModal({
        title: 'Machine occupée',
        message: `Reporter "${currentExercise.effectiveName}" et passer au suivant ?`,
        icon: '⏳',
        confirmLabel: 'Reporter',
        cancelLabel: 'Annuler'
    });

    if (confirmed) {
        currentExercise.postponeReason = 'Machine occupée';
        await postponeCurrentExercise(true); // skipConfirm — déjà confirmé

        if (window.HapticFeedback) {
            window.HapticFeedback.warning();
        }

        showToast('⏳ Machine occupée - Exercice reporté', 'info', 3000);
    }
}

/**
 * Reporte l'exercice courant à la fin
 */
async function postponeCurrentExercise(skipConfirm = false) {
    if (!fsSession.active) return;
    if (fsSession.exercises.length <= 1) {
        showToast('Impossible de reporter le dernier exercice', 'warning');
        return;
    }

    const currentExercise = fsSession.exercises[fsSession.currentExerciseIndex];

    if (!skipConfirm) {
        const confirmed = await showConfirmModal({
            title: 'Reporter cet exercice ?',
            message: `"${currentExercise.effectiveName}" sera déplacé à la fin de la séance.`,
            icon: '🔄',
            confirmLabel: 'Reporter',
            cancelLabel: 'Annuler'
        });
        if (!confirmed) return;
    }

    // Retirer l'exercice de sa position actuelle
    const removedIndex = fsSession.currentExerciseIndex;
    const [postponedExercise] = fsSession.exercises.splice(removedIndex, 1);

    // Marquer comme reporté
    postponedExercise.postponed = true;

    // Ajouter à la fin
    fsSession.exercises.push(postponedExercise);
    const newIndex = fsSession.exercises.length - 1;

    // CRITICAL: Reindexer completedSets et supersets après le splice
    reindexAfterSplice(removedIndex, newIndex);

    // Reprendre au bon set pour le nouvel exercice courant
    fsSession.currentSetIndex = getCompletedSetsForExercise(fsSession.currentExerciseIndex);

    // Sauvegarder immédiatement
    saveFsSessionToStorage();

    // Afficher l'exercice suivant (qui prend la place actuelle)
    renderCurrentExercise();

    showToast(`${currentExercise.effectiveName} reporté`, 'info');
}

/**
 * Minimise la séance en cours (garde en arrière-plan)
 */
function minimizeSession() {
    if (!fsSession.active) return;
    
    // Masquer l'UI fullscreen
    document.getElementById('fullscreen-session').style.display = 'none';
    OverflowManager.unlock();

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
    OverflowManager.lock();

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

async function closeFullScreenSession() {
    // Confirm if sets were logged
    if (fsSession.completedSets.length > 0) {
        const confirmed = await showConfirmModal({
            title: 'Quitter la séance ?',
            message: `Tu as ${fsSession.completedSets.length} série${fsSession.completedSets.length > 1 ? 's' : ''} enregistrée${fsSession.completedSets.length > 1 ? 's' : ''}. Elles seront perdues si tu quittes.`,
            icon: '⚠️',
            confirmLabel: 'Quitter',
            cancelLabel: 'Continuer',
            confirmType: 'danger'
        });
        if (!confirmed) return;
    }

    // Masquer l'indicateur
    const indicator = document.getElementById('session-indicator');
    if (indicator) indicator.style.display = 'none';

    // Arrêter la sauvegarde automatique
    stopAutoSaveFsSession();

    // Supprimer la session sauvegardée
    clearFsSessionFromStorage();

    document.getElementById('fullscreen-session').style.display = 'none';
    OverflowManager.unlock();

    // Show nav
    const nav = document.querySelector('.nav');
    const mobileNav = document.querySelector('.mobile-nav');
    if (nav) nav.style.display = '';
    if (mobileNav) mobileNav.style.display = '';

    // Détruire le swipe navigator
    if (window._exerciseSwipeNav) {
        window._exerciseSwipeNav.destroy();
        window._exerciseSwipeNav = null;
    }

    fsSession.active = false;
}

function renderCurrentExercise() {
    const exercise = fsSession.exercises[fsSession.currentExerciseIndex];
    if (!exercise) return;

    const totalSets = exercise.sets;
    const currentSet = fsSession.currentSetIndex + 1;

    // Reset boutons techniques avancées (drop set / rest-pause)
    const advancedBtns = document.getElementById('fs-advanced-btns');
    if (advancedBtns) advancedBtns.style.display = 'none';
    if (window._advancedBtnsTimeout) {
        clearTimeout(window._advancedBtnsTimeout);
        window._advancedBtnsTimeout = null;
    }

    // Vérifier si on est en superset
    const superset = getCurrentSuperset();
    const supersetLabel = superset ? 
        (superset.phase === 'A' ? ' A' : ' B') + ' (Superset)' : '';
    const totalExercises = fsSession.exercises.length;
    const splits = trainingPrograms?.[state.wizardResults?.selectedProgram]?.splits?.[state.wizardResults?.frequency];

    // Update header
    document.getElementById('fs-session-title').textContent = fsSession.splitName;
    document.getElementById('fs-session-progress').textContent = splits ? `Jour ${fsSession.splitIndex + 1}/${splits.length}` : 'Jour 1';

    // Update exercise info — nom centré seul, boutons séparés en dessous
    const exerciseNameEl = document.getElementById('fs-exercise-name');
    let nameHTML = exercise.effectiveName;
    if (exercise.postponed) {
        nameHTML += ' <span style="color: var(--warning); font-size: 0.8rem;">⏭️</span>';
    }
    if (supersetLabel) {
        nameHTML += `<span class="superset-badge">⚡ ${supersetLabel}</span>`;
    }
    exerciseNameEl.innerHTML = nameHTML;

    // Mettre à jour le bouton info séparément
    const infoBtn = document.getElementById('fs-info-btn');
    if (infoBtn) {
        infoBtn.onclick = () => openExerciseTips(exercise.effectiveName);
    }

    document.getElementById('fs-set-indicator').textContent = `Série ${currentSet} / ${totalSets}`;

    // Load GIF for fullscreen session
    loadFsExerciseGif(exercise);

    // Update progress bar — basé sur les sets réels complétés (indépendant de l'ordre)
    const totalRequiredSets = fsSession.exercises.reduce((sum, ex) => sum + (ex.sets || 0), 0);
    const totalCompletedSets = fsSession.completedSets.length;
    const progress = totalRequiredSets > 0 ? (totalCompletedSets / totalRequiredSets) * 100 : 0;
    const progressFill = document.getElementById('fs-progress-fill');
    if (progressFill) {
        progressFill.style.width = `${Math.min(progress, 100)}%`;
        progressFill.classList.remove('progress-updated');
        void progressFill.offsetWidth;
        progressFill.classList.add('progress-updated');
        setTimeout(() => progressFill.classList.remove('progress-updated'), 700);
    }

    // Get last log for this exercise
    const lastLog = getLastLog(exercise.effectiveName);
    const previousEl = document.getElementById('fs-previous');
    const previousValueEl = document.getElementById('fs-previous-value');

    // Plage de reps selon la phase (targetReps) ou reps original
    const repsPlaceholder = exercise.targetReps || exercise.reps || '8-12';

    // Variables pour le pré-remplissage
    let suggestedWeight = 0;
    let suggestedReps = '';
    let hasPreviousData = false;
    let dataSource = 'none';

    // Référence au label (pour le mettre à jour dynamiquement)
    const previousLabelEl = previousEl?.querySelector('.fs-previous-label');

    // 0. D'abord vérifier si on a déjà des sets complétés pour cet exercice DANS cette session
    const currentSessionSets = fsSession.completedSets?.filter(
        s => s.exerciseIndex === fsSession.currentExerciseIndex
    ) || [];

    if (currentSessionSets.length > 0) {
        // Utiliser le dernier set de cette session comme référence
        const lastSessionSet = currentSessionSets[currentSessionSets.length - 1];
        if (lastSessionSet.weight > 0) {
            if (previousLabelEl) previousLabelEl.textContent = 'Cette session :';
            previousValueEl.textContent = `${lastSessionSet.weight}kg × ${lastSessionSet.reps}`;
            previousEl.style.display = 'flex';
            suggestedWeight = lastSessionSet.weight;
            hasPreviousData = true;
            dataSource = 'current-session';
        }
    }

    // 1. Sinon essayer avec setsDetail (données précises par série de la dernière session)
    if (!hasPreviousData && lastLog && lastLog.setsDetail && lastLog.setsDetail.length > 0) {
        const lastSet = lastLog.setsDetail[Math.min(fsSession.currentSetIndex, lastLog.setsDetail.length - 1)];
        if (previousLabelEl) previousLabelEl.textContent = 'Dernière fois :';
        previousValueEl.textContent = `${lastSet.weight}kg × ${lastSet.reps}`;
        previousEl.style.display = 'flex';
        suggestedWeight = lastSet.weight || 0;
        hasPreviousData = true;
        dataSource = 'setsDetail';
    }
    // 2. Sinon essayer avec les données agrégées du log
    else if (!hasPreviousData && lastLog && lastLog.weight > 0) {
        // achievedReps est le TOTAL des reps, pas par série !
        // Il faut calculer les reps moyennes par série
        let displayReps = '?';
        if (lastLog.achievedReps && lastLog.achievedSets && lastLog.achievedSets > 0) {
            // Reps moyennes par série = total / nombre de séries
            displayReps = Math.round(lastLog.achievedReps / lastLog.achievedSets);
        } else if (lastLog.reps) {
            displayReps = lastLog.reps;
        }
        if (previousLabelEl) previousLabelEl.textContent = 'Dernière fois :';
        previousValueEl.textContent = `${lastLog.weight}kg × ${displayReps}`;
        previousEl.style.display = 'flex';
        suggestedWeight = lastLog.weight;
        hasPreviousData = true;
        dataSource = 'aggregated-log';
    }
    // 3. Sinon utiliser SmartTraining pour une suggestion intelligente
    else if (!hasPreviousData && window.SmartTraining && typeof window.SmartTraining.calculateSuggestedWeight === 'function') {
        const smartSuggestion = window.SmartTraining.calculateSuggestedWeight(exercise.effectiveName);
        if (smartSuggestion && smartSuggestion.suggested > 0) {
            suggestedWeight = smartSuggestion.suggested;
            if (previousLabelEl) previousLabelEl.textContent = 'Suggéré :';
            previousValueEl.textContent = `${suggestedWeight}kg`;
            previousEl.style.display = 'flex';
            hasPreviousData = true;
            dataSource = 'smart-training';
        }
    }

    // Appliquer multiplicateur de phase au poids si défini
    if (suggestedWeight > 0) {
        const phaseAdjustments = getPhaseAdjustments();
        if (phaseAdjustments.weightMultiplier !== 1.0) {
            suggestedWeight = Math.round(suggestedWeight * phaseAdjustments.weightMultiplier * 4) / 4;
        }
    }

    // Remplir les inputs
    document.getElementById('fs-weight-input').value = suggestedWeight > 0 ? suggestedWeight : '';
    document.getElementById('fs-reps-input').value = suggestedReps;
    document.getElementById('fs-reps-input').placeholder = repsPlaceholder;

    // Afficher hint bodyweight si applicable
    const bwHint = document.getElementById('fs-bodyweight-hint');
    if (bwHint) {
        const exData = findExerciseByName(exercise.effectiveName);
        if (exData && exData.equipment === 'bodyweight') {
            const bw = state.profile?.weight || 70;
            bwHint.textContent = `Poids du corps : ${bw}kg`;
            bwHint.style.display = '';
        } else {
            bwHint.style.display = 'none';
        }
    }

    // Masquer le "précédent" si pas de données
    if (!hasPreviousData) {
        previousEl.style.display = 'none';
    }

    // DEBUG: Afficher dans la console pour diagnostic
    console.log(`🏋️ renderCurrentExercise("${exercise.effectiveName}"):`, {
        dataSource,
        suggestedWeight,
        hasPreviousData,
        currentSessionSets: currentSessionSets.length,
        lastLog,
        progressLogKeys: Object.keys(state.progressLog || {})
    });

    // Afficher l'objectif de l'exercice
    const objectiveEl = document.getElementById('fs-exercise-objective');
    const objectiveTextEl = document.getElementById('fs-objective-text');
    if (objectiveEl && objectiveTextEl) {
        const phaseAdj = getPhaseAdjustments();
        const adjSets = Math.max(1, Math.round((exercise.sets || 4) * phaseAdj.setsMultiplier));
        const repRange = exercise.targetReps || phaseAdj.repsRange || exercise.reps || '8-12';
        const weightStr = suggestedWeight > 0 ? ` @ ${suggestedWeight}kg` : '';
        objectiveTextEl.textContent = `Objectif : ${adjSets}×${repRange}${weightStr}`;
        objectiveEl.style.display = '';
    }

    // Render completed sets for this exercise
    renderCompletedSets();

    // Update contextual action button label
    updateActionButton();
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
            <div class="fs-completed-set${extraClass}" data-exercise-index="${set.exerciseIndex}" data-set-index="${set.setIndex}">
                <span class="fs-completed-set-num">${labelPrefix}</span>
                <span class="fs-completed-set-value">${set.weight}kg × ${set.reps}</span>
                <button class="fs-completed-set-edit" onclick="editCompletedSet(${set.setIndex})">✎</button>
                <button class="fs-completed-set-delete" onclick="deleteCompletedSet(${set.exerciseIndex}, ${set.setIndex})">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
        `;
    }).join('');

    // Attacher SwipeToDelete sur chaque série complétée
    if (window.SwipeToDelete) {
        container.querySelectorAll('.fs-completed-set').forEach(el => {
            const exIdx = parseInt(el.dataset.exerciseIndex);
            const setIdx = parseInt(el.dataset.setIndex);
            new SwipeToDelete(el, {
                onDelete: () => deleteCompletedSet(exIdx, setIdx),
                threshold: 0.4
            });
        });
    }
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
    const repsRaw = repsInput.value.trim();
    if (!repsRaw) {
        showToast('Entre le nombre de répétitions', 'error');
        repsInput.focus();
        return;
    }
    const reps = parseInt(repsRaw) || 0;

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

    // Vérifier si c'est un PR en temps réel
    const exercise = fsSession.exercises[fsSession.currentExerciseIndex];
    checkForRealtimePR(exercise.effectiveName, weight, reps);

    // Haptic feedback sur completion de set
    if (window.HapticFeedback) {
        window.HapticFeedback.success();
    }

    // Move to next set or exercise
    const totalSets = exercise.sets;

    // Vérifier si cet exercice est maintenant complet (le set vient d'être pushé)
    const exerciseNowComplete = isExerciseComplete(fsSession.currentExerciseIndex);

    // Vérifier si on est en superset
    const inSuperset = handleSupersetProgression();
    if (inSuperset) {
        return; // Gestion spéciale superset
    }

    if (!exerciseNowComplete) {
        // Set suivant du même exercice
        fsSession.currentSetIndex++;
        renderCurrentExercise();

        // Start rest timer (après la première série de CET exercice)
        if (getCompletedSetsForExercise(fsSession.currentExerciseIndex) >= 1) {
            startRestTimer();
        }
    } else if (areAllExercisesComplete()) {
        // TOUS les exercices terminés → fin de séance
        showToast('Séance terminée ! 🎉', 'success');

        if (window.HapticFeedback) {
            window.HapticFeedback.achievement();
        }

        renderSessionCompleteState();
    } else {
        // Exercice terminé, mais d'autres restent → écran intermédiaire
        // avec boutons techniques avancées (drop set / rest-pause)
        renderExerciseCompleteState();
    }
}

/**
 * Restaure un set en cours d'édition si l'utilisateur quitte sans valider.
 * Empêche la perte de données quand on change d'exercice ou qu'on quitte.
 */
function restoreEditingSetIfNeeded() {
    if (fsSession._editingSet) {
        // Vérifier que le set n'a pas été re-validé entre-temps
        const alreadyBack = fsSession.completedSets.some(
            s => s.exerciseIndex === fsSession._editingSet.exerciseIndex &&
                 s.setIndex === fsSession._editingSet.setIndex
        );
        if (!alreadyBack) {
            fsSession.completedSets.push(fsSession._editingSet);
            fsSession.completedSets.sort((a, b) => {
                if (a.exerciseIndex !== b.exerciseIndex) return a.exerciseIndex - b.exerciseIndex;
                return a.setIndex - b.setIndex;
            });
        }
        fsSession._editingSet = null;
        saveFsSessionToStorage();
    }
}

function editCompletedSet(setIndex) {
    // Restaurer un éventuel set déjà en édition avant d'en éditer un nouveau
    restoreEditingSetIfNeeded();

    const setData = fsSession.completedSets.find(
        s => s.exerciseIndex === fsSession.currentExerciseIndex && s.setIndex === setIndex
    );

    if (setData) {
        // Sauvegarder pour rollback si l'utilisateur quitte sans valider
        fsSession._editingSet = { ...setData };

        // Pré-remplir avec les valeurs existantes
        document.getElementById('fs-weight-input').value = setData.weight;
        document.getElementById('fs-reps-input').value = setData.reps;

        // Retirer temporairement (sera re-ajouté à la validation)
        fsSession.completedSets = fsSession.completedSets.filter(
            s => !(s.exerciseIndex === fsSession.currentExerciseIndex && s.setIndex === setIndex)
        );

        // Revenir à cette série
        fsSession.currentSetIndex = setIndex;
        saveFsSessionToStorage();
        renderCurrentExercise();
    }
}

/**
 * Supprime un set complété en full-screen avec undo.
 */
function deleteCompletedSet(exerciseIdx, setIdx) {
    const set = fsSession.completedSets.find(
        s => s.exerciseIndex === exerciseIdx && s.setIndex === setIdx
    );
    if (!set) return;

    // Retirer le set
    fsSession.completedSets = fsSession.completedSets.filter(s => s !== set);
    saveFsSessionToStorage();
    renderCompletedSets();
    if (typeof updateActionButton === 'function') updateActionButton();

    // Haptic feedback
    if (window.HapticFeedback) HapticFeedback.light();

    // Undo via UndoManager
    if (window.UndoManager) {
        UndoManager.push('delete-set', set, (s) => {
            fsSession.completedSets.push(s);
            fsSession.completedSets.sort((a, b) => {
                if (a.exerciseIndex !== b.exerciseIndex) return a.exerciseIndex - b.exerciseIndex;
                return a.setIndex - b.setIndex;
            });
            saveFsSessionToStorage();
            renderCompletedSets();
            if (typeof updateActionButton === 'function') updateActionButton();
        }, 'Série supprimée');
    } else {
        showToast('Série supprimée', 'info');
    }
}

// ==================== SESSION STATE HELPERS (centralisés) ====================

/**
 * Nombre de séries complétées pour un exercice donné.
 * Source unique — remplace tous les .filter().length inline.
 */
function getCompletedSetsForExercise(exerciseIndex) {
    return (fsSession.completedSets || []).filter(s => s.exerciseIndex === exerciseIndex).length;
}

/**
 * Vérifie si un exercice spécifique est entièrement complété.
 */
function isExerciseComplete(exerciseIndex) {
    const exercise = fsSession.exercises[exerciseIndex];
    if (!exercise) return false;
    const totalSets = exercise.sets || 0;
    if (totalSets === 0) return true;
    return getCompletedSetsForExercise(exerciseIndex) >= totalSets;
}

/**
 * Vérifie si TOUS les exercices de la séance sont terminés.
 * Seul critère pour la complétion automatique de la séance.
 */
function areAllExercisesComplete() {
    return fsSession.exercises.every((_, idx) => isExerciseComplete(idx));
}

/**
 * Prédit si la validation du set en cours terminera la séance entière.
 * Utilisé par updateActionButton() pour déterminer le texte du CTA.
 */
function willCompleteSession() {
    return fsSession.exercises.every((ex, idx) => {
        if (idx === fsSession.currentExerciseIndex) {
            return (getCompletedSetsForExercise(idx) + 1) >= (ex.sets || 0);
        }
        return isExerciseComplete(idx);
    });
}

/**
 * Trouve le prochain exercice incomplet après l'index donné (scan circulaire).
 * @returns {number|null} Index du prochain exercice incomplet, ou null si tous complets
 */
function findNextIncompleteExercise(afterIndex) {
    const len = fsSession.exercises.length;
    for (let i = 1; i < len; i++) {
        const idx = (afterIndex + i) % len;
        if (!isExerciseComplete(idx)) return idx;
    }
    return null;
}

/**
 * Trouve l'exercice incomplet précédent avant l'index donné (scan circulaire inverse).
 * @returns {number|null} Index de l'exercice incomplet précédent, ou null si tous complets
 */
function findPreviousIncompleteExercise(beforeIndex) {
    const len = fsSession.exercises.length;
    for (let i = 1; i < len; i++) {
        const idx = (beforeIndex - i + len) % len;
        if (!isExerciseComplete(idx)) return idx;
    }
    return null;
}

/**
 * Corrige les indices dans completedSets et supersets après un splice+push.
 * Appelé par postponeCurrentExercise() pour éviter la corruption des données.
 */
function reindexAfterSplice(removedIndex, newIndex) {
    fsSession.completedSets.forEach(set => {
        if (set.exerciseIndex === removedIndex) {
            set.exerciseIndex = newIndex;
        } else if (set.exerciseIndex > removedIndex) {
            set.exerciseIndex--;
        }
    });
    (fsSession.supersets || []).forEach(ss => {
        ['exercise1Index', 'exercise2Index'].forEach(key => {
            if (ss[key] === removedIndex) {
                ss[key] = newIndex;
            } else if (ss[key] > removedIndex) {
                ss[key]--;
            }
        });
    });
}

/**
 * Corrige les indices dans completedSets et supersets après un drag-reorder.
 * Différent de reindexAfterSplice : ici on déplace un élément d'une position à une autre.
 */
function reindexAfterReorder(oldIndex, newIndex) {
    const len = fsSession.exercises.length;
    // Construire le mapping : pour chaque ancien index, quel est le nouvel index ?
    const mapping = new Array(len);
    for (let i = 0; i < len; i++) {
        if (i === oldIndex) {
            mapping[i] = newIndex;
        } else if (oldIndex < newIndex && i > oldIndex && i <= newIndex) {
            mapping[i] = i - 1;
        } else if (oldIndex > newIndex && i >= newIndex && i < oldIndex) {
            mapping[i] = i + 1;
        } else {
            mapping[i] = i;
        }
    }
    fsSession.completedSets.forEach(s => {
        s.exerciseIndex = mapping[s.exerciseIndex];
    });
    (fsSession.supersets || []).forEach(ss => {
        ss.exercise1Index = mapping[ss.exercise1Index];
        ss.exercise2Index = mapping[ss.exercise2Index];
    });
    fsSession.currentExerciseIndex = mapping[fsSession.currentExerciseIndex];
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

    // Nom du prochain exercice (utiliser findNextIncompleteExercise, pas +1)
    const nextIdx = findNextIncompleteExercise(fsSession.currentExerciseIndex);
    const nextExercise = nextIdx !== null ? fsSession.exercises[nextIdx] : null;
    const nameEl = document.getElementById('fs-next-exercise-name');
    if (nameEl && nextExercise) nameEl.textContent = nextExercise.effectiveName;

    // Sous-titre dynamique
    const subtitle = document.getElementById('fs-exercise-complete-subtitle');
    const currentEx = fsSession.exercises[fsSession.currentExerciseIndex];
    const completedSetsCount = getCompletedSetsForExercise(fsSession.currentExerciseIndex);
    if (subtitle) {
        subtitle.textContent = `${completedSetsCount} séries validées`;
    }

    // Techniques avancées : drop set / rest-pause
    const advancedSection = document.getElementById('fs-complete-advanced');
    const dropBtn = document.getElementById('fs-complete-drop-btn');
    const rpBtn = document.getElementById('fs-complete-rp-btn');

    if (advancedSection) {
        const lastSet = fsSession.completedSets[fsSession.completedSets.length - 1];
        const lastWeight = lastSet?.weight || 0;

        const dropsCount = fsSession.completedSets.filter(
            s => s.exerciseIndex === fsSession.currentExerciseIndex && s.isDrop
        ).length;
        const rpCount = fsSession.completedSets.filter(
            s => s.exerciseIndex === fsSession.currentExerciseIndex && s.isRestPause
        ).length;

        const canDrop = dropsCount < 2 && lastWeight > 5;
        const canRestPause = rpCount < 3 && lastWeight > 0;

        if (canDrop || canRestPause) {
            advancedSection.style.display = 'block';
            if (dropBtn) dropBtn.style.display = canDrop ? 'inline-flex' : 'none';
            if (rpBtn) rpBtn.style.display = canRestPause ? 'inline-flex' : 'none';
        } else {
            advancedSection.style.display = 'none';
        }
    }

    // Arrêter le timer
    resetFsTimer();
}

/**
 * Revient sur l'exercice courant pour faire un drop set depuis l'écran "Exercice terminé".
 */
function goBackForDropSet() {
    // Fermer l'écran intermédiaire
    const content = document.getElementById('fs-content');
    const completeSection = document.getElementById('fs-exercise-complete');
    if (content) content.style.display = 'block';
    if (completeSection) completeSection.style.display = 'none';

    // L'exercice est "complet" côté sets normaux mais on reste dessus pour le drop
    renderCurrentExercise();
    // Lancer le drop set
    startDropSet();
}

/**
 * Revient sur l'exercice courant pour faire un rest-pause depuis l'écran "Exercice terminé".
 */
function goBackForRestPause() {
    // Fermer l'écran intermédiaire
    const content = document.getElementById('fs-content');
    const completeSection = document.getElementById('fs-exercise-complete');
    if (content) content.style.display = 'block';
    if (completeSection) completeSection.style.display = 'none';

    // L'exercice est "complet" côté sets normaux mais on reste dessus pour le rest-pause
    renderCurrentExercise();
    // Lancer le rest-pause
    startRestPause();
}

function goToNextExercise() {
    // Restaurer un set en cours d'édition non validé
    restoreEditingSetIfNeeded();

    fsSession.exerciseCompleted = false;

    // Routage intelligent : trouver le prochain exercice incomplet
    const nextIdx = findNextIncompleteExercise(fsSession.currentExerciseIndex);
    if (nextIdx === null) {
        // Tous les exercices sont complets → fin de séance
        renderSessionCompleteState();
        return;
    }
    fsSession.currentExerciseIndex = nextIdx;
    fsSession.currentSetIndex = getCompletedSetsForExercise(nextIdx);

    // Rétablir l'affichage normal
    const content = document.getElementById('fs-content');
    const completeSection = document.getElementById('fs-exercise-complete');

    if (content) content.style.display = 'block';
    if (completeSection) completeSection.style.display = 'none';

    renderCurrentExercise();
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
    
    // Calculer le volume total (kg soulevés) — poids effectif pour bodyweight
    const totalVolume = fsSession.completedSets.reduce((sum, set) => {
        const exName = fsSession.exercises[set.exerciseIndex]?.effectiveName || '';
        return sum + (getEffectiveWeight(exName, set.weight) * set.reps);
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

// ==================== FULLSCREEN REST TIMER ====================

let fsRestTimerFullscreen = true;

function toggleRestTimerFullscreen() {
    const timer = document.getElementById('fs-rest-timer-prominent');
    if (!timer) return;
    // La croix ferme complètement le timer (pas de mode intermédiaire sticky)
    if (fsRestTimerFullscreen) {
        collapseRestTimer();
    } else {
        fsRestTimerFullscreen = true;
        timer.classList.add('fs-rest-fullscreen');
    }
}

/**
 * Collapse le timer fullscreen → caché complètement.
 * Appelé par : auto-collapse (3s après 0), tap-to-dismiss, croix minimize.
 */
function collapseRestTimer() {
    const pt = document.getElementById('fs-rest-timer-prominent');
    if (!pt) return;

    if (pt.classList.contains('fs-rest-fullscreen')) {
        // Animation collapse depuis fullscreen
        pt.classList.add('fs-rest-collapsing');
        setTimeout(() => {
            fsRestTimerFullscreen = false;
            pt.classList.remove('fs-rest-fullscreen', 'fs-rest-collapsing');
            pt.style.display = 'none';
        }, 400);
    } else {
        // Déjà en mode inline/sticky — cacher directement
        pt.style.display = 'none';
    }

    // Haptic léger
    if (window.MobileGestures?.Haptics) MobileGestures.Haptics.light();
}

/**
 * Ré-ouvre le timer en fullscreen (tap sur le timer footer).
 * Ne fait rien si le timer ne tourne pas.
 */
function expandRestTimer() {
    if (!fsTimerInterval) return; // timer pas actif

    const pt = document.getElementById('fs-rest-timer-prominent');
    if (!pt) return;

    // Annuler un éventuel auto-collapse en cours
    if (window._timerAutoCollapseTimeout) {
        clearTimeout(window._timerAutoCollapseTimeout);
        window._timerAutoCollapseTimeout = null;
        window._timerAutoCollapseScheduled = false;
    }

    pt.style.display = 'flex';
    pt.classList.remove('fs-rest-collapsing');
    fsRestTimerFullscreen = true;
    pt.classList.add('fs-rest-fullscreen');

    if (window.MobileGestures?.Haptics) MobileGestures.Haptics.light();
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

    // Reset auto-collapse flag et annuler timeout en cours
    window._timerAutoCollapseScheduled = false;
    if (window._timerAutoCollapseTimeout) {
        clearTimeout(window._timerAutoCollapseTimeout);
        window._timerAutoCollapseTimeout = null;
    }

    // Reset overtime class du cycle précédent
    const circleContainer = document.getElementById('rest-timer-circle-container');
    if (circleContainer) circleContainer.classList.remove('timer-overtime');
    window._timerEndedNotified = false;

    // Afficher le timer prominent en mode plein écran
    const prominentTimer = document.getElementById('fs-rest-timer-prominent');
    if (prominentTimer) {
        prominentTimer.style.display = 'flex';
        prominentTimer.classList.remove('fs-rest-collapsing');
        fsRestTimerFullscreen = true;
        prominentTimer.classList.add('fs-rest-fullscreen');

        // Tap-to-dismiss : un tap en dehors des contrôles ferme le fullscreen
        if (!prominentTimer._tapToDismissInit) {
            prominentTimer._tapToDismissInit = true;
            prominentTimer.addEventListener('click', (e) => {
                // Ignorer si tap sur les boutons de contrôle
                if (e.target.closest('.fs-rest-control-btn, .fs-rest-minimize-btn')) return;
                // Ne collapse que si en mode fullscreen
                if (prominentTimer.classList.contains('fs-rest-fullscreen')) {
                    collapseRestTimer();
                }
            });
        }
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
            // Timer terminé mais on continue pour afficher le dépassement
            fsTimerSeconds = Math.floor(remaining / 1000); // Négatif = dépassement

            // Première fois qu'on atteint 0
            if (fsTimerSeconds === 0 || (fsTimerSeconds === -1 && !window._timerEndedNotified)) {
                window._timerEndedNotified = true;

                // Vibration agressive pattern
                if (navigator.vibrate) {
                    try {
                        navigator.vibrate([200, 100, 200, 100, 200]);
                    } catch(e) {}
                }

                // Toast plus visible avec animation
                showToast('⏰ REPOS TERMINÉ ! C\'est parti ! 💪', 'success', 3000);

                // Ajouter classe overtime pour animation pulsante
                const circleContainer = document.getElementById('rest-timer-circle-container');
                if (circleContainer) {
                    circleContainer.classList.add('timer-overtime');
                }

                // Auto-collapse après 3 secondes d'overtime
                if (!window._timerAutoCollapseScheduled) {
                    window._timerAutoCollapseScheduled = true;
                    window._timerAutoCollapseTimeout = setTimeout(() => {
                        collapseRestTimer();
                        window._timerAutoCollapseTimeout = null;
                    }, 3000);
                }
            }

            // Vibrations périodiques en overtime (toutes les 10s)
            if (fsTimerSeconds < 0 && fsTimerSeconds % 10 === 0) {
                if (navigator.vibrate) {
                    try { navigator.vibrate([50, 50, 50]); } catch(e) {}
                }
            }

            // Arrêter après 2 minutes de dépassement
            if (fsTimerSeconds <= -120) {
                clearInterval(fsTimerInterval);
                fsTimerInterval = null;
                window._timerEndedNotified = false;
                window._timerAutoCollapseScheduled = false;
            }
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
    
    // Reset flags et annuler le timeout d'auto-collapse
    window._timerEndedNotified = false;
    window._timerAutoCollapseScheduled = false;
    if (window._timerAutoCollapseTimeout) {
        clearTimeout(window._timerAutoCollapseTimeout);
        window._timerAutoCollapseTimeout = null;
    }

    // Masquer le timer prominent et retirer le mode plein écran
    const prominentTimer = document.getElementById('fs-rest-timer-prominent');
    if (prominentTimer) {
        prominentTimer.style.display = 'none';
        prominentTimer.classList.remove('fs-rest-fullscreen', 'fs-rest-collapsing');
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
                window.HapticFeedback.warning();
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

    // Calculer le volume de cette session — poids effectif pour bodyweight
    let sessionVolume = 0;
    fsSession.completedSets.forEach(set => {
        const exName = fsSession.exercises[set.exerciseIndex]?.effectiveName || '';
        sessionVolume += getEffectiveWeight(exName, set.weight) * set.reps;
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
        if (s.deletedAt) return false;
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

    // Le set vient d'être pushé → utiliser le helper centralisé
    const exerciseDone = isExerciseComplete(fsSession.currentExerciseIndex);

    if (superset.phase === 'A' && !exerciseDone) {
        // Passer à l'exercice B du superset
        const partnerIdx = superset.partner;
        fsSession.currentExerciseIndex = partnerIdx;
        fsSession.currentSetIndex = getCompletedSetsForExercise(partnerIdx);
        renderCurrentExercise();

        showToast('⚡ Superset - Exercice 2', 'info', 1500);
        return true;
    } else if (superset.phase === 'B' && !exerciseDone) {
        // Retourner à l'exercice A pour la série suivante
        const exercise1Idx = fsSession.supersets[superset.index].exercise1Index;
        fsSession.currentExerciseIndex = exercise1Idx;
        fsSession.currentSetIndex = getCompletedSetsForExercise(exercise1Idx);
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

// ==================== MERGE SESSIONS ====================

/**
 * Fusionne les exercices d'une ancienne session dans fsSession.completedSets.
 * Les exercices déjà présents dans la nouvelle session sont ignorés.
 * Les exercices uniquement dans l'ancienne session sont ajoutés.
 */
function mergeSessions(oldSession) {
    if (!oldSession.exercises || oldSession.exercises.length === 0) return;

    // Exercices déjà dans la session courante
    const currentExerciseNames = new Set();
    fsSession.completedSets.forEach(set => {
        const ex = fsSession.exercises[set.exerciseIndex];
        if (ex) currentExerciseNames.add(ex.effectiveName);
    });

    // Ajouter les exercices de l'ancienne session qui ne sont pas dans la nouvelle
    oldSession.exercises.forEach(oldEx => {
        if (currentExerciseNames.has(oldEx.exercise)) return; // Déjà présent

        // Ajouter cet exercice à fsSession.exercises
        const newIdx = fsSession.exercises.length;
        fsSession.exercises.push({
            effectiveName: oldEx.exercise,
            originalName: oldEx.exercise,
            sets: oldEx.sets?.length || 0,
            muscle: '',
            merged: true
        });

        // Ajouter ses séries à completedSets
        (oldEx.sets || []).forEach((s, si) => {
            fsSession.completedSets.push({
                exerciseIndex: newIdx,
                setIndex: si,
                weight: s.weight,
                reps: s.reps,
                timestamp: Date.now(),
                merged: true
            });
        });
    });

    console.log(`✅ Fusion: ${oldSession.exercises.length} exercices de l'ancienne session traités`);
}

// ==================== FINISH SESSION ====================

async function finishSession() {
    // Protection contre double exécution
    if (fsSession.sessionSaved) {
        console.warn('⚠️ Session déjà sauvegardée, ignore finishSession()');
        return;
    }

    // Restaurer un set en cours d'édition non validé
    restoreEditingSetIfNeeded();

    if (fsSession.completedSets.length === 0) {
        const confirmed = await showConfirmModal({
            title: 'Aucune série',
            message: 'Aucune série enregistrée. Quitter quand même ?',
            icon: '🏋️',
            confirmLabel: 'Quitter',
            cancelLabel: 'Annuler',
            confirmType: 'danger'
        });
        if (confirmed) closeFullScreenSession();
        return;
    }

    // Vérifier si des exercices sont incomplets
    const incompleteCount = fsSession.exercises.filter((_, idx) => !isExerciseComplete(idx)).length;
    if (incompleteCount > 0) {
        const confirmed = await showConfirmModal({
            title: 'Terminer la séance ?',
            message: `${incompleteCount} exercice${incompleteCount > 1 ? 's' : ''} non terminé${incompleteCount > 1 ? 's' : ''}. Sauvegarder quand même ?`,
            icon: '🏁',
            confirmLabel: 'Sauvegarder',
            cancelLabel: 'Continuer'
        });
        if (!confirmed) return;
    }

    // Progression de la périodisation (après confirmations, avant sauvegarde)
    updatePeriodization();

    // Détecter les doublons avant de sauvegarder
    const today = new Date().toISOString().split('T')[0];
    const existingSession = state.sessionHistory.find(s =>
        !s.deletedAt &&
        s.date === today &&
        s.program === state.wizardResults.selectedProgram &&
        s.day === fsSession.splitName &&
        s.sessionId !== fsSession.sessionId
    );

    if (existingSession) {
        const choice = await showDuplicateSessionModal(existingSession);
        if (choice === 'cancel') return;
        if (choice === 'replace') {
            // Supprimer l'ancienne
            state.sessionHistory = state.sessionHistory.filter(s => s !== existingSession);
        }
        if (choice === 'merge') {
            // Fusionner : ajouter les exercices de l'ancienne session qu'on n'a pas dans la nouvelle
            mergeSessions(existingSession);
            state.sessionHistory = state.sessionHistory.filter(s => s !== existingSession);
        }
        // 'keep-both' : continue normalement
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
    // today déjà déclaré plus haut (détection doublons)
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
            sessionId: fsSession.sessionId,
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

    // Calculer le volume total et les calories brûlées — poids effectif pour bodyweight
    const totalVolume = fsSession.completedSets.reduce((sum, set) => {
        const exName = fsSession.exercises[set.exerciseIndex]?.effectiveName || '';
        return sum + (getEffectiveWeight(exName, set.weight) * set.reps);
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
    
    const isFreeSession = fsSession.sessionType === 'free';

    // Save session history
    const newSession = {
        sessionId: fsSession.sessionId, // UUID pour idempotence
        date: today,
        timestamp: Date.now(),
        sessionType: fsSession.sessionType || 'program',
        sessionName: fsSession.sessionName || null,
        program: isFreeSession ? null : state.wizardResults.selectedProgram,
        day: isFreeSession ? null : fsSession.splitName,
        exercises: sessionData,
        duration: durationMinutes,
        totalVolume: Math.round(totalVolume),
        caloriesBurned: caloriesBurned
    };
    
    state.sessionHistory.unshift(newSession);

    // Keep only last 100 sessions
    state.sessionHistory = state.sessionHistory.slice(0, 100);

    // Sauvegarder le template si des swaps/variantes ont été faits pendant la séance (programme uniquement)
    if (!isFreeSession) {
        const hasSwaps = fsSession.exercises.some(ex => ex.swapped);
        if (hasSwaps) {
            const templateKey = `${state.wizardResults.selectedProgram}-${fsSession.splitIndex}`;
            state.sessionTemplates[templateKey] = {
                splitIndex: fsSession.splitIndex,
                splitName: fsSession.splitName,
                exercises: fsSession.exercises.map(ex => ({
                    originalName: ex.originalName || ex.name,
                    swappedId: ex.effectiveId || null,
                    swappedName: ex.effectiveName !== (ex.originalName || ex.name) ? ex.effectiveName : null
                })),
                savedAt: new Date().toISOString()
            };
        }
    }

    // Update training progress
    state.trainingProgress.lastSessionDate = new Date().toISOString();
    state.trainingProgress.totalSessionsCompleted++;

    // Avancer le programme seulement pour les séances du programme
    if (!isFreeSession) {
        const program = trainingPrograms[state.wizardResults.selectedProgram];
        const splits = program.splits[state.wizardResults.frequency];
        state.trainingProgress.currentSplitIndex = (fsSession.splitIndex + 1) % splits.length;
    }

    // Save state
    saveState();

    // Sync with Supabase
    if (typeof isLoggedIn === 'function' && isLoggedIn()) {
        const sessionToSave = {
            sessionId: fsSession.sessionId,
            date: today,
            sessionType: fsSession.sessionType || 'program',
            sessionName: fsSession.sessionName || null,
            program: isFreeSession ? null : state.wizardResults.selectedProgram,
            day: isFreeSession ? null : fsSession.splitName,
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
    if (!state.progressLog) return null;

    // Utiliser le helper centralisé (avec fallback nom de base / variante)
    const logs = typeof findProgressLogs === 'function'
        ? findProgressLogs(exerciseName)
        : (state.progressLog[exerciseName] || []);

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
    if (window.ModalManager) ModalManager.lock('settings-sheet');
}

function closeSettingsSheet() {
    if (window.ModalManager) ModalManager.unlock('settings-sheet');
    document.getElementById('settings-sheet').style.display = 'none';
}

function adjustRestTime(seconds) {
    fsTimerTarget = seconds;
    closeSettingsSheet();
    showToast(`Repos ajusté à ${seconds}s`, 'success');
}

async function returnToPreview() {
    closeSettingsSheet();
    const confirmed = await showConfirmModal({
        title: 'Retour à l\'aperçu',
        message: 'Retourner à l\'aperçu de séance ? Les séries validées seront conservées.',
        icon: '↩️',
        confirmLabel: 'Retourner',
        cancelLabel: 'Continuer'
    });
    if (confirmed) {
        closeFullScreenSession();
        showSessionPreview(fsSession.splitIndex);
    }
}

async function quitSession() {
    closeSettingsSheet();
    const confirmed = await showConfirmModal({
        title: 'Quitter la séance ?',
        message: 'Les séries non sauvegardées seront perdues.',
        icon: '🚪',
        confirmLabel: 'Quitter',
        cancelLabel: 'Continuer',
        confirmType: 'danger'
    });
    if (confirmed) {
        await closeFullScreenSession();
    }
}

// ==================== PR DETECTION EN TEMPS RÉEL ====================

/**
 * Vérifie si le set actuel est un PR (Personal Record) en temps réel
 * Compare avec l'historique de l'exercice
 */
function checkForRealtimePR(exerciseName, weight, reps) {
    if (!state.progressLog || weight <= 0 || reps <= 0) return;

    const logs = typeof findProgressLogs === 'function'
        ? findProgressLogs(exerciseName)
        : (state.progressLog[exerciseName] || []);
    if (!logs || logs.length === 0) {
        // Premier log = toujours un PR implicite mais pas de notif
        return;
    }

    // Calculer le 1RM actuel avec la formule Epley
    const current1RM = reps === 1 ? weight : Math.round(weight * (1 + reps / 30));

    // Trouver le meilleur 1RM historique
    let best1RM = 0;
    let bestWeight = 0;

    logs.forEach(log => {
        // Vérifier le 1RM estimé
        if (log.setsDetail && log.setsDetail.length > 0) {
            log.setsDetail.forEach(set => {
                const estimated = set.reps === 1 ? set.weight : Math.round(set.weight * (1 + set.reps / 30));
                if (estimated > best1RM) {
                    best1RM = estimated;
                }
                if (set.weight > bestWeight) {
                    bestWeight = set.weight;
                }
            });
        } else if (log.weight) {
            const estimated = (log.achievedReps || 1) === 1 ? log.weight : Math.round(log.weight * (1 + (log.achievedReps || 10) / 30));
            if (estimated > best1RM) {
                best1RM = estimated;
            }
            if (log.weight > bestWeight) {
                bestWeight = log.weight;
            }
        }
    });

    // Détecter les types de PR
    let prType = null;
    let prMessage = '';

    if (current1RM > best1RM && best1RM > 0) {
        prType = '1rm';
        prMessage = `Nouveau 1RM: ${current1RM}kg`;
    } else if (weight > bestWeight && bestWeight > 0) {
        prType = 'weight';
        prMessage = `Nouveau record de poids: ${weight}kg`;
    }

    if (prType) {
        showRealtimePRBadge(exerciseName, prMessage, prType);
    }
}

/**
 * Affiche un badge PR discret mais visible pendant la séance
 */
function showRealtimePRBadge(exerciseName, message, type) {
    // Haptic feedback spécial
    if (window.HapticFeedback) {
        window.HapticFeedback.achievement();
    }

    // Créer le badge
    let badge = document.getElementById('fs-realtime-pr');
    if (!badge) {
        badge = document.createElement('div');
        badge.id = 'fs-realtime-pr';
        badge.style.cssText = `
            position: fixed;
            top: 100px;
            left: 50%;
            transform: translateX(-50%) scale(0.8);
            background: linear-gradient(135deg, #fbbf24, #f59e0b);
            color: #1a1a1a;
            padding: 12px 24px;
            border-radius: 30px;
            font-size: 1rem;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 10px;
            z-index: 10001;
            opacity: 0;
            transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            box-shadow: 0 8px 30px rgba(251, 191, 36, 0.5);
        `;
        document.body.appendChild(badge);
    }

    badge.innerHTML = `
        <span style="font-size: 1.5rem;">🏆</span>
        <span>PR! ${message}</span>
    `;

    // Animation d'apparition
    requestAnimationFrame(() => {
        badge.style.opacity = '1';
        badge.style.transform = 'translateX(-50%) scale(1)';
    });

    // Masquer après 3 secondes
    setTimeout(() => {
        badge.style.opacity = '0';
        badge.style.transform = 'translateX(-50%) scale(0.8)';
    }, 3000);
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
    
    // Gestion de l'image/GIF Hero
    const heroGif = document.getElementById('info-exercise-gif');
    const heroImage = document.getElementById('info-exercise-image');
    const heroFallback = document.getElementById('info-exercise-fallback');
    const heroSkeleton = document.getElementById('exercise-hero-skeleton');
    const gifControlBtn = document.getElementById('gif-control-btn');

    // Icônes fallback selon le groupe musculaire
    const muscleIcons = {
        'chest': '🫁', 'back': '🔙', 'shoulders': '🎯', 'rear-delts': '🎯',
        'triceps': '💪', 'biceps': '💪', 'quads': '🦵', 'hamstrings': '🦵',
        'glutes': '🍑', 'calves': '🦶', 'traps': '🔺', 'abs': '🎽', 'forearms': '✊'
    };
    const fallbackIcon = muscleIcons[exercise.muscle] || '💪';

    // Helper pour charger l'image statique en fallback
    function loadStaticImage() {
        if (typeof getExerciseImageUrl === 'function' && exercise.id) {
            const imageUrl = getExerciseImageUrl(exercise.id);
            heroImage.src = imageUrl;
            heroImage.alt = exercise.name;

            heroImage.onload = function() {
                if (heroSkeleton) heroSkeleton.style.display = 'none';
                this.style.display = 'block';
                heroFallback.style.display = 'none';
            };
            heroImage.onerror = showFallback;
        } else {
            showFallback();
        }
    }

    // Helper pour montrer le fallback emoji
    function showFallback() {
        if (heroSkeleton) heroSkeleton.style.display = 'none';
        if (heroGif) heroGif.classList.remove('loaded');
        heroImage.style.display = 'none';
        heroFallback.style.display = 'flex';
        heroFallback.textContent = fallbackIcon;
    }

    if (heroGif && heroImage && heroFallback) {
        // Réinitialiser l'état
        heroGif.classList.remove('loaded');
        heroGif.src = '';
        heroImage.style.display = 'none';
        heroFallback.style.display = 'none';
        if (heroSkeleton) heroSkeleton.style.display = 'block';
        if (gifControlBtn) gifControlBtn.style.display = 'none';
        heroFallback.textContent = fallbackIcon;

        // Vérifier si on doit charger le GIF animé
        const showAnimated = typeof shouldShowAnimatedGif === 'function' ? shouldShowAnimatedGif() : true;

        if (showAnimated && typeof getExerciseGifUrl === 'function' && exercise.id) {
            const gifUrl = getExerciseGifUrl(exercise.id);
            heroGif.src = gifUrl;
            heroGif.alt = exercise.name;

            heroGif.onload = function() {
                if (heroSkeleton) heroSkeleton.style.display = 'none';
                this.classList.add('loaded');
                heroFallback.style.display = 'none';
                if (gifControlBtn) gifControlBtn.style.display = 'flex';
            };

            heroGif.onerror = function() {
                // Fallback vers image statique
                this.classList.remove('loaded');
                loadStaticImage();
            };
        } else {
            // Charger directement l'image statique
            loadStaticImage();
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
    
    // === HISTORIQUE PERFORMANCES ===
    const historySection = document.getElementById('info-history-section');
    const historyContent = document.getElementById('info-history-content');
    const historyPrs = document.getElementById('info-exercise-prs');
    const historyChart = document.getElementById('info-history-chart');
    const historyList = document.getElementById('info-history-list');

    if (historySection && historyContent) {
        // Reset état plié
        historyContent.style.display = 'none';
        const chevron = document.getElementById('info-history-chevron');
        if (chevron) chevron.style.transform = '';

        const logs = state.progressLog?.[exerciseName] || [];

        if (logs.length > 0) {
            historySection.style.display = 'block';

            // PRs
            if (historyPrs && typeof getExercisePRs === 'function') {
                const prs = getExercisePRs(exerciseName);
                if (prs) {
                    let prHTML = '';
                    if (prs.maxWeight > 0) prHTML += `<div class="info-pr-item"><span class="info-pr-label">Poids max</span><span class="info-pr-value">${prs.maxWeight}kg</span></div>`;
                    if (prs.max1RM > 0) prHTML += `<div class="info-pr-item"><span class="info-pr-label">1RM est.</span><span class="info-pr-value">${Math.round(prs.max1RM)}kg</span></div>`;
                    if (prs.maxVolume > 0) prHTML += `<div class="info-pr-item"><span class="info-pr-label">Vol. max</span><span class="info-pr-value">${Math.round(prs.maxVolume)}kg</span></div>`;
                    historyPrs.innerHTML = prHTML ? `<div class="info-pr-grid">${prHTML}</div>` : '';
                }
            }

            // Mini chart CSS (5 dernières sessions)
            const last5 = logs.slice(-5);
            const maxW = Math.max(...last5.map(l => l.weight || 0));
            if (historyChart && maxW > 0) {
                historyChart.innerHTML = `<div class="info-mini-chart">${last5.map(log => {
                    const h = Math.max(8, Math.round(((log.weight || 0) / maxW) * 100));
                    const d = new Date(log.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
                    return `<div class="info-chart-col"><div class="info-chart-bar" style="height: ${h}%"><span class="info-chart-val">${log.weight || 0}</span></div><span class="info-chart-date">${d}</span></div>`;
                }).join('')}</div>`;
            } else if (historyChart) {
                historyChart.innerHTML = '';
            }

            // Liste des 5 dernières séances (ordre inverse)
            if (historyList) {
                historyList.innerHTML = [...last5].reverse().map(log => {
                    const d = new Date(log.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
                    let detail;
                    if (log.setsDetail && log.setsDetail.length > 0) {
                        detail = log.setsDetail.map(s => `${s.weight}×${s.reps}`).join(' · ');
                    } else {
                        detail = `${log.weight}kg × ${log.achievedReps || '?'} reps`;
                    }
                    return `<div class="info-history-row"><span class="info-history-date">${d}</span><span class="info-history-detail">${detail}</span></div>`;
                }).join('');
            }
        } else {
            historySection.style.display = 'none';
        }
    }

    // Afficher le bottom sheet avec animation iOS-like
    const sheet = document.getElementById('exercise-info-sheet');
    if (sheet) {
        sheet.style.display = 'flex';
        sheet.offsetHeight;
        sheet.classList.remove('animate-in');
        void sheet.offsetWidth;
        sheet.classList.add('animate-in');
        OverflowManager.lock();

        // Initialiser le swipe to dismiss (une seule fois)
        initExerciseSheetSwipe();
    }
}

/**
 * Toggle la section historique dans la fiche exercice
 */
function toggleExerciseHistory() {
    const content = document.getElementById('info-history-content');
    const chevron = document.getElementById('info-history-chevron');
    if (content) {
        const isHidden = content.style.display === 'none';
        content.style.display = isHidden ? 'block' : 'none';
        if (chevron) chevron.style.transform = isHidden ? 'rotate(180deg)' : '';
    }
}

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
        OverflowManager.unlock();
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

    const originalLength = state.sessionHistory.length;
    console.log('🔍 Démarrage déduplication...', originalLength, 'sessions');

    // ÉTAPE 1 : Dédupliquer par sessionId exact (vrais doublons)
    const seenIds = new Map();
    const afterIdDedup = [];
    let removedById = 0;

    state.sessionHistory.forEach(session => {
        const id = session.sessionId || session.id;
        if (id && seenIds.has(id)) {
            // Doublon exact par sessionId — garder celui avec le plus d'exercices
            const existing = seenIds.get(id);
            const existingCount = existing.exercises?.length || 0;
            const currentCount = session.exercises?.length || 0;
            if (currentCount > existingCount) {
                // Remplacer dans afterIdDedup
                const idx = afterIdDedup.indexOf(existing);
                if (idx !== -1) afterIdDedup[idx] = session;
                seenIds.set(id, session);
                console.log(`    🔄 Remplacement doublon sessionId ${id}: ${existingCount} → ${currentCount} exercices`);
            } else {
                console.log(`    ❌ Doublon sessionId ${id} ignoré (${currentCount} exercices vs ${existingCount})`);
            }
            removedById++;
        } else {
            if (id) seenIds.set(id, session);
            afterIdDedup.push(session);
        }
    });

    if (removedById > 0) {
        console.log(`  Étape 1: ${removedById} doublons supprimés par sessionId`);
    }

    // ÉTAPE 2 : Pour les sessions SANS sessionId (legacy), dédupliquer par date+program+day+timestamp proche
    const final = [];
    const legacy = [];
    const withId = [];

    afterIdDedup.forEach(s => {
        if (s.sessionId || s.id) {
            withId.push(s);
        } else {
            legacy.push(s);
        }
    });

    // Les sessions avec ID sont toutes gardées (déjà dédupliquées à l'étape 1)
    final.push(...withId);

    // Pour les legacy, grouper par date+program+day
    let removedByLegacy = 0;
    if (legacy.length > 0) {
        const legacyGroups = {};
        legacy.forEach(session => {
            const key = `${session.date}|${session.program}|${session.day}`;
            if (!legacyGroups[key]) legacyGroups[key] = [];
            legacyGroups[key].push(session);
        });

        Object.entries(legacyGroups).forEach(([key, sessions]) => {
            if (sessions.length === 1) {
                final.push(sessions[0]);
                return;
            }
            // Garder la session avec le plus d'exercices
            sessions.sort((a, b) => (b.exercises?.length || 0) - (a.exercises?.length || 0));
            final.push(sessions[0]);
            removedByLegacy += sessions.length - 1;
            console.log(`  Legacy doublon "${key}": gardé ${sessions[0].exercises?.length || 0} exos, supprimé ${sessions.length - 1}`);
        });
    }

    const totalRemoved = removedById + removedByLegacy;

    // Remplacer state.sessionHistory
    state.sessionHistory = final.sort((a, b) => b.timestamp - a.timestamp);

    // Sauvegarder
    if (totalRemoved > 0) {
        saveState();
    }

    const result = {
        removed: totalRemoved,
        kept: final.length,
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
async function deleteTemplate(templateId) {
    if (!state.customTemplates) return false;

    const index = state.customTemplates.findIndex(t => t.id === templateId);
    if (index === -1) {
        showToast('Template introuvable', 'error');
        return false;
    }

    const template = state.customTemplates[index];

    const confirmed = await showConfirmModal({
        title: 'Supprimer ce modèle ?',
        message: `"${template.name}" sera supprimé définitivement.`,
        icon: '🗑️',
        confirmLabel: 'Supprimer',
        cancelLabel: 'Annuler',
        confirmType: 'danger'
    });
    if (!confirmed) return false;

    state.customTemplates.splice(index, 1);
    saveState();

    showToast(`"${template.name}" supprimé`, 'success');
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

// ==================== SÉANCE LIBRE ====================

/**
 * Ouvre la sheet de choix de type de séance
 */
function openNewSessionSheet() {
    const sheet = document.getElementById('new-session-sheet');
    if (!sheet) return;
    if (window.ModalManager) ModalManager.lock('new-session-sheet');
    sheet.style.display = 'flex';
    sheet.offsetHeight;
    sheet.classList.remove('animate-in');
    void sheet.offsetWidth;
    sheet.classList.add('animate-in');
}

function closeNewSessionSheet() {
    if (window.ModalManager) ModalManager.unlock('new-session-sheet');
    const sheet = document.getElementById('new-session-sheet');
    if (sheet) sheet.style.display = 'none';
}

/**
 * Ouvre le builder de séance libre
 */
function openFreeSessionBuilder() {
    freeSessionBuilder = { name: '', exercises: [] };
    const nameInput = document.getElementById('free-session-name');
    if (nameInput) nameInput.value = '';
    renderFreeSessionExercises();
    const sheet = document.getElementById('free-session-sheet');
    if (!sheet) return;
    if (window.ModalManager) ModalManager.lock('free-session-sheet');
    sheet.style.display = 'flex';
    sheet.offsetHeight;
    sheet.classList.remove('animate-in');
    void sheet.offsetWidth;
    sheet.classList.add('animate-in');
}

function closeFreeSessionBuilder() {
    if (window.ModalManager) ModalManager.unlock('free-session-sheet');
    const sheet = document.getElementById('free-session-sheet');
    if (sheet) sheet.style.display = 'none';
}

/**
 * Renders exercise list in the free session builder
 */
function renderFreeSessionExercises() {
    const container = document.getElementById('free-session-exercises');
    if (!container) return;

    if (freeSessionBuilder.exercises.length === 0) {
        container.innerHTML = `
            <div class="free-session-empty">
                <p>Ajoute des exercices pour construire ta séance</p>
            </div>`;
        const startBtn = document.getElementById('free-start-btn');
        if (startBtn) startBtn.disabled = true;
        return;
    }

    const muscleLabels = {
        chest: 'Pectoraux', back: 'Dos', shoulders: 'Épaules', triceps: 'Triceps',
        biceps: 'Biceps', quads: 'Quadriceps', hamstrings: 'Ischio', glutes: 'Fessiers',
        calves: 'Mollets', abs: 'Abdos', traps: 'Trapèzes', forearms: 'Avant-bras',
        'rear-delts': 'Deltoïdes post.'
    };

    container.innerHTML = freeSessionBuilder.exercises.map((ex, idx) => `
        <div class="free-exercise-item">
            <div class="free-exercise-info">
                <span class="free-exercise-name">${ex.name}</span>
                <span class="free-exercise-muscle">${muscleLabels[ex.muscle] || ex.muscle}</span>
            </div>
            <div class="free-exercise-params">
                <label class="free-param-label">
                    Séries
                    <input type="number" class="free-param-input" value="${ex.sets}"
                           min="1" max="10" onchange="updateFreeExerciseSets(${idx}, this.value)">
                </label>
                <label class="free-param-label">
                    Reps
                    <input type="text" class="free-param-input free-param-reps" value="${ex.reps}"
                           maxlength="6" onchange="updateFreeExerciseReps(${idx}, this.value)">
                </label>
            </div>
            <button class="free-exercise-delete" onclick="removeExerciseFromFreeSession(${idx})" aria-label="Supprimer">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
            </button>
        </div>
    `).join('');

    const startBtn = document.getElementById('free-start-btn');
    if (startBtn) startBtn.disabled = false;
}

function addExerciseToFreeSession(exerciseId) {
    const exercise = state.exercises.find(e => e.id === exerciseId);
    if (!exercise) return;
    // Éviter les doublons
    if (freeSessionBuilder.exercises.some(e => e.id === exerciseId)) {
        showToast(`${exercise.name} déjà ajouté`, 'warning');
        return;
    }
    freeSessionBuilder.exercises.push({
        id: exercise.id,
        name: exercise.name,
        muscle: exercise.muscle,
        equipment: exercise.equipment,
        sets: 3,
        reps: '8-12'
    });
    closeBottomSheet(); // ferme le swap sheet (picker)
    // rouvre le builder
    const sheet = document.getElementById('free-session-sheet');
    if (sheet) sheet.style.display = 'flex';
    renderFreeSessionExercises();
    if (window.HapticFeedback) HapticFeedback.light();
}

function removeExerciseFromFreeSession(index) {
    freeSessionBuilder.exercises.splice(index, 1);
    renderFreeSessionExercises();
}

function updateFreeExerciseSets(index, value) {
    const n = Math.max(1, Math.min(10, parseInt(value) || 3));
    if (freeSessionBuilder.exercises[index]) {
        freeSessionBuilder.exercises[index].sets = n;
    }
}

function updateFreeExerciseReps(index, value) {
    if (freeSessionBuilder.exercises[index]) {
        freeSessionBuilder.exercises[index].reps = value.trim() || '8-12';
    }
}

/**
 * Ouvre l'exercise picker (réutilise le swap sheet) en mode séance libre
 */
function openExercisePickerForFreeSession() {
    _freePickerMode = true;

    // Préparer le swap sheet en mode picker
    const titleEl = document.querySelector('#swap-bottom-sheet .bottom-sheet-title');
    if (titleEl) titleEl.textContent = 'Ajouter un exercice';

    const currentExerciseEl = document.getElementById('swap-current-name');
    const currentExerciseSection = document.querySelector('.swap-current-exercise');
    if (currentExerciseSection) currentExerciseSection.style.display = 'none';

    const variantSection = document.getElementById('swap-variant-section');
    if (variantSection) variantSection.style.display = 'none';

    // Réinitialiser la recherche
    const searchInput = document.getElementById('swap-search-input');
    if (searchInput) { searchInput.value = ''; }
    const clearBtn = document.querySelector('.swap-search-clear');
    if (clearBtn) clearBtn.style.display = 'none';

    // Afficher les exercices populaires groupés par muscle
    const sections = document.getElementById('swap-sections');
    const searchResults = document.getElementById('swap-search-results');
    if (searchResults) searchResults.style.display = 'none';

    // Musclees les plus utilisés en séance libre
    const popularMuscles = ['chest', 'back', 'shoulders', 'quads', 'hamstrings', 'biceps', 'triceps'];
    const muscleLabels = {
        chest: '💪 Pectoraux', back: '🏋️ Dos', shoulders: '🦾 Épaules',
        quads: '🦵 Quadriceps', hamstrings: '🦵 Ischio', biceps: '💪 Biceps',
        triceps: '💪 Triceps', glutes: '🍑 Fessiers', abs: '🎯 Abdos'
    };
    if (sections) {
        sections.innerHTML = popularMuscles.map(muscle => {
            const exercises = state.exercises
                .filter(e => e.muscle === muscle)
                .slice(0, 5);
            if (exercises.length === 0) return '';
            return `
                <div class="swap-section">
                    <div class="swap-section-title">${muscleLabels[muscle] || muscle}</div>
                    ${exercises.map(ex => `
                        <div class="swap-option-item" onclick="swapExerciseInPreview('${ex.id}')">
                            <div class="swap-option-info">
                                <span class="swap-option-name">${ex.name}</span>
                                <span class="swap-option-muscle">${ex.equipment}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>`;
        }).join('');
    }

    // Cacher le free session sheet pendant le picker
    const freeSheet = document.getElementById('free-session-sheet');
    if (freeSheet) freeSheet.style.display = 'none';
    if (window.ModalManager) ModalManager.unlock('free-session-sheet');

    // Ouvrir le swap sheet
    const sheet = document.getElementById('swap-bottom-sheet');
    if (!sheet) return;
    if (window.ModalManager) ModalManager.lock('swap-bottom-sheet');
    sheet.style.display = 'flex';
    sheet.offsetHeight;
    sheet.classList.remove('animate-in');
    void sheet.offsetWidth;
    sheet.classList.add('animate-in');

    // Focus sur la recherche
    setTimeout(() => {
        const input = document.getElementById('swap-search-input');
        if (input) input.focus();
    }, 300);
}

/**
 * Lance la séance libre depuis le builder
 */
function startFreeSessionFromBuilder() {
    if (freeSessionBuilder.exercises.length === 0) {
        showToast('Ajoute au moins un exercice', 'warning');
        return;
    }
    const nameInput = document.getElementById('free-session-name');
    const sessionName = (nameInput?.value || '').trim() || 'Séance libre';

    closeFreeSessionBuilder();
    startFreeSessionDirect(freeSessionBuilder.exercises, sessionName);
}

/**
 * Démarre une séance libre en plein écran
 * Contourne la logique programme — n'utilise pas splitIndex ni program
 */
function startFreeSessionDirect(exercises, sessionName) {
    const fsExercises = exercises.map(ex => ({
        name: ex.name,
        originalName: ex.name,
        effectiveName: ex.name,
        muscle: ex.muscle,
        sets: ex.sets || 3,
        reps: ex.reps || '8-12',
        equipment: ex.equipment || ''
    }));

    // Vérifier si une session libre existe déjà aujourd'hui
    const existingSession = loadFsSessionFromStorage();
    const today = new Date().toISOString().split('T')[0];

    if (existingSession &&
        existingSession.sessionType === 'free' &&
        existingSession.sessionId &&
        new Date(existingSession.startTime).toISOString().split('T')[0] === today &&
        !existingSession.sessionSaved) {
        console.log('📌 Reprise session libre:', existingSession.sessionId);
        fsSession = existingSession;
        fsSession.active = true;
    } else {
        fsSession = {
            sessionId: 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            sessionSaved: false,
            active: true,
            sessionType: 'free',
            sessionName: sessionName,
            splitIndex: -1,
            splitName: sessionName,
            exercises: fsExercises,
            currentExerciseIndex: 0,
            currentSetIndex: 0,
            completedSets: [],
            startTime: Date.now()
        };
        console.log('🆕 Session libre créée:', fsSession.sessionId);
    }

    startAutoSaveFsSession();

    const fsElement = document.getElementById('fullscreen-session');
    if (!fsElement) { console.error('❌ fullscreen-session introuvable'); return; }

    fsElement.style.display = 'flex';
    fsElement.offsetHeight;
    fsElement.classList.remove('animate-in');
    void fsElement.offsetWidth;
    fsElement.classList.add('animate-in');
    OverflowManager.lock();

    const nav = document.querySelector('.nav');
    const mobileNav = document.querySelector('.mobile-nav');
    if (nav) nav.style.display = 'none';
    if (mobileNav) mobileNav.style.display = 'none';

    // Pas de périodisation programme, mais init quand même l'indicateur
    if (typeof initPeriodization === 'function') initPeriodization();
    if (typeof updateCurrentPhase === 'function') updateCurrentPhase();

    renderCurrentExercise();

    if (window.MobileGestures?.ExerciseSwipeNavigator && window.innerWidth <= 768) {
        const fsContent = document.querySelector('.fs-content');
        if (fsContent) {
            window._exerciseSwipeNav = new MobileGestures.ExerciseSwipeNavigator(fsContent);
            window._exerciseSwipeNav.init();
        }
    }
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
window.toggleExerciseHistory = toggleExerciseHistory;
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
window.collapseRestTimer = collapseRestTimer;
window.expandRestTimer = expandRestTimer;
window.goToNextExercise = goToNextExercise;
window.editCompletedSet = editCompletedSet;
window.deleteCompletedSet = deleteCompletedSet;
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
window.goBackForDropSet = goBackForDropSet;
window.goBackForRestPause = goBackForRestPause;
window.createSuperset = createSuperset;
window.removeSuperset = removeSuperset;
window.postponeCurrentExercise = postponeCurrentExercise;

// Navigation libre exercices
window.openExerciseNavigator = openExerciseNavigator;
window.closeExerciseNavigator = closeExerciseNavigator;
window.navigateToExercise = navigateToExercise;

// Helpers pour swipe entre exercices (utilisés par ExerciseSwipeNavigator)
window.findNextIncompleteExercise = findNextIncompleteExercise;
window.findPreviousIncompleteExercise = findPreviousIncompleteExercise;
window.getCompletedSetsForExercise = getCompletedSetsForExercise;
window.renderCurrentExercise = renderCurrentExercise;
// fsSession est réassigné à chaque démarrage → getter dynamique
Object.defineProperty(window, 'fsSession', { get: () => fsSession, configurable: true });
// _currentProgramSplitIndex mis à jour par renderSessionsList
Object.defineProperty(window, '_currentProgramSplitIndex', { get: () => _currentProgramSplitIndex, configurable: true });

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

// Séance libre
window.openNewSessionSheet = openNewSessionSheet;
window.closeNewSessionSheet = closeNewSessionSheet;
window.openFreeSessionBuilder = openFreeSessionBuilder;
window.closeFreeSessionBuilder = closeFreeSessionBuilder;
window.openExercisePickerForFreeSession = openExercisePickerForFreeSession;
window.addExerciseToFreeSession = addExerciseToFreeSession;
window.removeExerciseFromFreeSession = removeExerciseFromFreeSession;
window.updateFreeExerciseSets = updateFreeExerciseSets;
window.updateFreeExerciseReps = updateFreeExerciseReps;
window.startFreeSessionFromBuilder = startFreeSessionFromBuilder;
window.startFreeSessionDirect = startFreeSessionDirect;

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
    if (window.ModalManager) ModalManager.lock('periodization-sheet');
}

/**
 * Ferme le bottom sheet de périodisation
 */
function closePeriodizationSheet() {
    const sheet = document.getElementById('periodization-sheet');
    if (!sheet) return;

    sheet.classList.remove('active');
    if (window.ModalManager) ModalManager.unlock('periodization-sheet');
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
async function selectPeriodizationCycle(cycleType) {
    if (!CYCLE_PRESETS[cycleType]) return;

    const preset = CYCLE_PRESETS[cycleType];
    const previousType = state.periodization?.cycleType || '4';

    // Si on change de type, demander confirmation
    if (previousType !== cycleType && state.periodization?.currentWeek > 1) {
        const confirmed = await showConfirmModal({
            title: 'Changer de cycle ?',
            message: 'Changer de cycle va recommencer à la semaine 1. Continuer ?',
            icon: '🔄',
            confirmLabel: 'Changer',
            cancelLabel: 'Annuler'
        });
        if (!confirmed) return;
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
async function resetPeriodizationCycle() {
    const confirmed = await showConfirmModal({
        title: 'Recommencer le cycle ?',
        message: 'Ta progression de semaines sera réinitialisée.',
        icon: '🔄',
        confirmLabel: 'Recommencer',
        cancelLabel: 'Annuler',
        confirmType: 'danger'
    });
    if (!confirmed) return;

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

// ==================== GIF EXERCISE HELPERS ====================

/**
 * Charge le GIF dans le conteneur fullscreen
 * @param {Object} exercise - L'exercice courant
 */
function loadFsExerciseGif(exercise) {
    const fsGifContainer = document.getElementById('fs-gif-container');
    const fsGif = document.getElementById('fs-exercise-gif');
    const fsSkeleton = fsGifContainer?.querySelector('.fs-gif-skeleton');

    if (!fsGifContainer || !fsGif) return;

    // Vérifier la préférence utilisateur
    const showGif = localStorage.getItem('fittrack-fs-gif-visible') !== 'false';
    const showAnimated = typeof shouldShowAnimatedGif === 'function' ? shouldShowAnimatedGif() : true;

    if (!showAnimated) {
        fsGifContainer.style.display = 'none';
        return;
    }

    if (showGif && typeof getExerciseGifUrl === 'function') {
        const exerciseId = exercise.effectiveId || exercise.id || exercise.originalId;

        if (!exerciseId) {
            fsGifContainer.style.display = 'none';
            return;
        }

        const gifUrl = getExerciseGifUrl(exerciseId);

        // Reset state
        fsGif.classList.remove('loaded');
        if (fsSkeleton) fsSkeleton.style.display = 'block';
        fsGifContainer.style.display = 'block';
        fsGifContainer.classList.toggle('collapsed', !showGif);

        fsGif.src = gifUrl;
        fsGif.alt = exercise.effectiveName || exercise.name;

        fsGif.onload = function() {
            this.classList.add('loaded');
            if (fsSkeleton) fsSkeleton.style.display = 'none';
        };

        fsGif.onerror = function() {
            // Cacher le conteneur si pas de GIF disponible
            fsGifContainer.style.display = 'none';
        };

        // Preload next exercise GIF
        preloadNextExerciseGif();
    } else {
        fsGifContainer.style.display = 'none';
    }
}

/**
 * Toggle visibilité du GIF fullscreen
 */
function toggleFsGifVisibility() {
    const container = document.getElementById('fs-gif-container');
    const text = document.getElementById('fs-gif-toggle-text');

    if (!container) return;

    const isCollapsed = container.classList.toggle('collapsed');
    if (text) text.textContent = isCollapsed ? 'Afficher démo' : 'Masquer';

    localStorage.setItem('fittrack-fs-gif-visible', !isCollapsed);

    if (window.HapticFeedback) {
        window.HapticFeedback.light();
    }
}

// ==================== FS SETTINGS PANEL ====================

function toggleFsSettings() {
    const sheet = document.getElementById('fs-settings-sheet');
    if (!sheet) return;

    const isOpen = sheet.style.display !== 'none';
    sheet.style.display = isOpen ? 'none' : 'flex';

    // Sync toggle states with current visibility
    if (!isOpen) {
        const gifEl = document.getElementById('fs-gif-container');
        const phaseEl = document.getElementById('fs-phase-indicator');
        const advancedEl = document.getElementById('fs-advanced-btns');
        const autoEl = document.getElementById('fs-autoregulation-section');

        const gifToggle = document.getElementById('fs-setting-gif');
        const phaseToggle = document.getElementById('fs-setting-phase');
        const advancedToggle = document.getElementById('fs-setting-advanced');
        const autoToggle = document.getElementById('fs-setting-autoregulation');

        if (gifToggle) gifToggle.checked = gifEl && gifEl.style.display !== 'none';
        if (phaseToggle) phaseToggle.checked = phaseEl && phaseEl.style.display !== 'none';
        if (advancedToggle) advancedToggle.checked = advancedEl && advancedEl.style.display !== 'none';
        if (autoToggle) autoToggle.checked = autoEl && autoEl.style.display !== 'none';
    }
}

function toggleFsSetting(setting) {
    const map = {
        'gif': 'fs-gif-container',
        'phase': 'fs-phase-indicator',
        'advanced': 'fs-advanced-btns',
        'autoregulation': 'fs-autoregulation-section'
    };
    const elId = map[setting];
    if (!elId) return;

    const el = document.getElementById(elId);
    const toggle = document.getElementById(`fs-setting-${setting}`);
    if (!el || !toggle) return;

    el.style.display = toggle.checked ? '' : 'none';

    // Persist preference
    localStorage.setItem(`fittrack-fs-${setting}`, toggle.checked ? '1' : '0');
}

// ==================== CONTEXTUAL ACTION BUTTON ====================

/**
 * Met à jour le bouton d'action principal en fonction du contexte :
 * - "Valider série" par défaut
 * - "Exercice suivant →" à la dernière série de l'exercice
 * - "Terminer la séance 🎉" à la dernière série du dernier exercice
 */
function updateActionButton() {
    const btn = document.getElementById('fs-validate-btn');
    if (!btn) return;

    const exercise = fsSession.exercises[fsSession.currentExerciseIndex];
    if (!exercise) return;

    const totalSets = exercise.sets || 0;
    const completedForExercise = getCompletedSetsForExercise(fsSession.currentExerciseIndex);

    // Ce set va-t-il compléter cet exercice ?
    const willFinishExercise = (completedForExercise + 1) >= totalSets;
    // Ce set va-t-il compléter TOUTE la séance ? (tous les autres exercices déjà faits)
    const willFinishSession = willCompleteSession();

    const label = btn.querySelector('span');
    if (!label) return;

    // Reset des classes d'état
    btn.classList.remove('btn-next-exercise', 'btn-finish-session');

    if (willFinishSession) {
        // Dernière série de TOUTE la séance → CTA spécial
        label.textContent = 'Terminer la séance 🎉';
        btn.classList.add('btn-finish-session');
        void btn.offsetWidth;
        if (window.HapticFeedback) HapticFeedback.warning();
    } else {
        // Toujours "Valider la série" — même sur la dernière série d'un exercice.
        // L'écran intermédiaire "Exercice terminé" s'affichera après la validation.
        label.textContent = 'Valider la série';
    }
}

/**
 * Preload le GIF du prochain exercice
 */
function preloadNextExerciseGif() {
    if (!fsSession.active) return;

    const nextIdx = fsSession.currentExerciseIndex + 1;
    if (nextIdx < fsSession.exercises.length) {
        const next = fsSession.exercises[nextIdx];
        const exerciseId = next.effectiveId || next.id || next.originalId;

        if (exerciseId && typeof getExerciseGifUrl === 'function') {
            const url = getExerciseGifUrl(exerciseId);
            const preloadImg = new Image();
            preloadImg.src = url;
        }
    }
}

// ==================== EXERCISE NAVIGATOR ====================

/**
 * Ouvre le panneau de navigation entre exercices
 */
// ==================== NAVIGATOR SWIPE-TO-DISMISS ====================

let _navigatorSwipeInit = false;

function initNavigatorSheetSwipe() {
    if (_navigatorSwipeInit) return;
    const sheet = document.querySelector('#exercise-navigator-sheet .bottom-sheet');
    const list = document.getElementById('exercise-navigator-list');
    if (!sheet || !list) return;

    let startY = 0, currentY = 0, isDragging = false;

    sheet.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
        currentY = startY;
        const inHeader = e.target.closest('.bottom-sheet-handle, .nav-sheet-header');
        isDragging = inHeader || list.scrollTop <= 5;
    }, { passive: true });

    sheet.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        currentY = e.touches[0].clientY;
        const deltaY = currentY - startY;
        if (deltaY > 10) {
            e.preventDefault();
            sheet.style.transition = 'none';
            sheet.style.transform = `translateY(${deltaY * 0.6}px)`;
        }
    }, { passive: false });

    sheet.addEventListener('touchend', () => {
        if (!isDragging) return;
        const deltaY = currentY - startY;
        sheet.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)';
        if (deltaY > 100) {
            sheet.style.transform = 'translateY(100%)';
            if (window.MobileGestures?.Haptics) MobileGestures.Haptics.light();
            setTimeout(() => {
                closeExerciseNavigator();
                sheet.style.transform = '';
                sheet.style.transition = '';
            }, 300);
        } else {
            sheet.style.transform = 'translateY(0)';
        }
        isDragging = false;
    });

    _navigatorSwipeInit = true;
}

// ==================== NAVIGATOR DRAG-TO-REORDER ====================

function initNavigatorDragReorder() {
    const list = document.getElementById('exercise-navigator-list');
    if (!list) return;

    let dragState = null; // { sourceIndex, sourceItem, clone, startY, currentY, items[], itemRects[], lastTargetIndex }

    // Long-press sur un item non-complété pour démarrer le drag
    list.addEventListener('pointerdown', (e) => {
        const handle = e.target.closest('.nav-drag-handle');
        if (!handle) return;
        const item = handle.closest('.nav-exercise-item');
        if (!item || item.classList.contains('nav-completed')) return;

        const idx = parseInt(item.dataset.exerciseIndex, 10);
        if (isNaN(idx)) return;

        // Empêcher le scroll pendant le drag
        e.preventDefault();

        const rect = item.getBoundingClientRect();
        const items = Array.from(list.querySelectorAll('.nav-exercise-item'));
        const itemRects = items.map(el => el.getBoundingClientRect());

        // Créer le clone flottant
        const clone = item.cloneNode(true);
        clone.classList.add('drag-floating-clone');
        clone.style.width = `${rect.width}px`;
        clone.style.top = `${rect.top}px`;
        clone.style.left = `${rect.left}px`;
        document.body.appendChild(clone);

        // Marquer l'item source comme placeholder
        item.classList.add('drag-placeholder');

        // Haptic feedback
        if (window.MobileGestures?.Haptics) MobileGestures.Haptics.medium();

        dragState = {
            sourceIndex: idx,
            sourceItem: item,
            clone,
            startY: e.clientY,
            currentY: e.clientY,
            offsetY: e.clientY - rect.top,
            items,
            itemRects,
            lastTargetIndex: idx
        };

        // Capturer les événements pointer sur le document
        document.addEventListener('pointermove', onDragMove);
        document.addEventListener('pointerup', onDragEnd);
        document.addEventListener('pointercancel', onDragEnd);
    });

    function onDragMove(e) {
        if (!dragState) return;
        e.preventDefault();

        dragState.currentY = e.clientY;
        // Déplacer le clone
        dragState.clone.style.top = `${e.clientY - dragState.offsetY}px`;

        // Déterminer la cible en fonction de la position Y du centre du clone
        const cloneCenterY = e.clientY;
        let targetIndex = dragState.sourceIndex;

        for (let i = 0; i < dragState.itemRects.length; i++) {
            const r = dragState.itemRects[i];
            const midY = r.top + r.height / 2;
            if (cloneCenterY > midY) {
                targetIndex = i;
            }
        }

        // Ne pas permettre de dropper sur un exercice complété
        if (isExerciseComplete(targetIndex)) {
            return;
        }

        if (targetIndex !== dragState.lastTargetIndex) {
            // Haptic tick
            if (window.MobileGestures?.Haptics) MobileGestures.Haptics.light();
            dragState.lastTargetIndex = targetIndex;

            // Shift les items visuellement
            const src = dragState.sourceIndex;
            dragState.items.forEach((el, i) => {
                if (i === src) return; // placeholder, ne bouge pas
                el.classList.add('drag-shifting');
                const itemHeight = dragState.itemRects[i].height;
                if (src < targetIndex && i > src && i <= targetIndex) {
                    el.style.transform = `translateY(${-itemHeight}px)`;
                } else if (src > targetIndex && i >= targetIndex && i < src) {
                    el.style.transform = `translateY(${itemHeight}px)`;
                } else {
                    el.style.transform = 'translateY(0)';
                }
            });
        }
    }

    function onDragEnd() {
        if (!dragState) return;

        document.removeEventListener('pointermove', onDragMove);
        document.removeEventListener('pointerup', onDragEnd);
        document.removeEventListener('pointercancel', onDragEnd);

        const oldIndex = dragState.sourceIndex;
        const newIndex = dragState.lastTargetIndex;

        // Cleanup clone
        dragState.clone.remove();

        // Cleanup classes et transforms
        dragState.sourceItem.classList.remove('drag-placeholder');
        dragState.items.forEach(el => {
            el.classList.remove('drag-shifting');
            el.style.transform = '';
        });

        if (oldIndex !== newIndex) {
            // Appliquer le reorder dans le modèle
            const [movedExercise] = fsSession.exercises.splice(oldIndex, 1);
            fsSession.exercises.splice(newIndex, 0, movedExercise);
            reindexAfterReorder(oldIndex, newIndex);

            // Haptic success
            if (window.MobileGestures?.Haptics) MobileGestures.Haptics.success();

            // Re-render le navigator
            renderExerciseNavigator();
            // Re-init le drag reorder sur les nouveaux éléments
            initNavigatorDragReorder();
        }

        dragState = null;
    }
}

function openExerciseNavigator() {
    if (!fsSession.active) return;
    renderExerciseNavigator();
    const sheet = document.getElementById('exercise-navigator-sheet');
    if (sheet) {
        if (window.ModalManager) ModalManager.lock('exercise-navigator');
        sheet.style.display = 'flex';
        // Remove-reflow-add pour re-trigger l'animation à chaque ouverture
        sheet.classList.remove('animate-in');
        void sheet.offsetWidth;
        sheet.classList.add('animate-in');
    }
    initNavigatorSheetSwipe();
    initNavigatorDragReorder();
}

/**
 * Ferme le panneau de navigation
 */
function closeExerciseNavigator() {
    if (window.ModalManager) ModalManager.unlock('exercise-navigator');
    const sheet = document.getElementById('exercise-navigator-sheet');
    if (sheet) {
        sheet.style.display = 'none';
        sheet.classList.remove('animate-in');
    }
}

/**
 * Rend la liste des exercices avec leurs statuts
 */
function renderExerciseNavigator() {
    const listEl = document.getElementById('exercise-navigator-list');
    const countEl = document.getElementById('nav-exercise-count');
    if (!listEl) return;

    const exercises = fsSession.exercises;
    const currentIdx = fsSession.currentExerciseIndex;

    // Compter les exercices terminés
    let completedCount = 0;
    const exerciseStatuses = exercises.map((ex, idx) => {
        const setsCompleted = getCompletedSetsForExercise(idx);
        const totalSets = ex.sets || 0;
        const isCompleted = isExerciseComplete(idx);
        if (isCompleted) completedCount++;
        return { setsCompleted, totalSets, isCompleted };
    });

    if (countEl) {
        countEl.textContent = `${completedCount}/${exercises.length}`;
    }

    listEl.innerHTML = exercises.map((ex, idx) => {
        const { setsCompleted, totalSets, isCompleted } = exerciseStatuses[idx];
        const isCurrent = idx === currentIdx;
        const isPostponed = ex.postponed;

        let statusIcon, statusClass;
        if (isCompleted) {
            statusIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>';
            statusClass = 'nav-completed';
        } else if (isCurrent) {
            statusIcon = '<span class="nav-dot nav-dot-current"></span>';
            statusClass = 'nav-current';
        } else if (isPostponed) {
            statusIcon = '⏭️';
            statusClass = 'nav-postponed';
        } else if (setsCompleted > 0) {
            statusIcon = '<span class="nav-dot nav-dot-partial"></span>';
            statusClass = 'nav-partial';
        } else {
            statusIcon = '<span class="nav-dot nav-dot-pending"></span>';
            statusClass = 'nav-pending';
        }

        const setsText = setsCompleted > 0 ? `${setsCompleted}/${totalSets} séries` : `0/${totalSets} séries`;
        const canNavigate = !isCompleted;

        return `
            <div class="nav-exercise-item ${statusClass} ${isCurrent ? 'nav-active' : ''}"
                 data-exercise-index="${idx}"
                 ${canNavigate ? `onclick="navigateToExercise(${idx})"` : ''}
                 ${!canNavigate ? 'style="pointer-events: none;"' : ''}>
                <span class="nav-exercise-status">${statusIcon}</span>
                <div class="nav-exercise-info">
                    <span class="nav-exercise-name">${ex.effectiveName}</span>
                    <span class="nav-exercise-sets">${setsText}</span>
                </div>
                ${canNavigate && !isCurrent ? '<span class="nav-exercise-go">›</span>' : ''}
                ${canNavigate ? '<span class="nav-drag-handle">⠿</span>' : ''}
            </div>
        `;
    }).join('');
}

/**
 * Navigue vers un exercice spécifique
 */
async function navigateToExercise(targetIndex) {
    if (targetIndex === fsSession.currentExerciseIndex) {
        closeExerciseNavigator();
        return;
    }

    const targetExercise = fsSession.exercises[targetIndex];
    if (!targetExercise) return;

    // Vérifier si l'exercice cible est déjà terminé
    const targetSetsCompleted = getCompletedSetsForExercise(targetIndex);
    const targetTotalSets = targetExercise.sets || 0;
    if (isExerciseComplete(targetIndex)) {
        showToast('Cet exercice est déjà terminé', 'warning');
        return;
    }

    // Confirmation si l'exercice en cours a des séries partielles
    const currentExercise = fsSession.exercises[fsSession.currentExerciseIndex];
    const currentSetsCompleted = getCompletedSetsForExercise(fsSession.currentExerciseIndex);
    const currentTotalSets = currentExercise?.sets || 0;

    if (currentSetsCompleted > 0 && currentSetsCompleted < currentTotalSets) {
        const confirmed = await showConfirmModal({
            title: 'Changer d\'exercice ?',
            message: `${currentSetsCompleted}/${currentTotalSets} séries faites sur "${currentExercise.effectiveName}". Tu pourras y revenir.`,
            icon: '🔄',
            confirmLabel: 'Changer',
            cancelLabel: 'Annuler'
        });
        if (!confirmed) return;
    }

    // Restaurer tout set en édition
    if (typeof restoreEditingSetIfNeeded === 'function') {
        restoreEditingSetIfNeeded();
    }

    // Naviguer
    fsSession.currentExerciseIndex = targetIndex;
    fsSession.currentSetIndex = targetSetsCompleted; // Reprendre là où on s'est arrêté
    fsSession.exerciseCompleted = false;

    // Reset le timer
    resetFsTimer();

    // Rétablir l'affichage normal
    const content = document.getElementById('fs-content');
    const completeSection = document.getElementById('fs-exercise-complete');
    if (content) content.style.display = 'block';
    if (completeSection) completeSection.style.display = 'none';

    // Fermer le navigator et afficher
    closeExerciseNavigator();
    renderCurrentExercise();

    // Sauvegarder
    saveFsSessionToStorage();

    showToast(`→ ${targetExercise.effectiveName}`, 'info');
}

// État pour le toggle pause/play du GIF
let gifPaused = false;
let cachedGifSrc = null;

/**
 * Toggle pause/play du GIF dans la fiche exercice
 * @param {Event} event - L'événement click
 */
function toggleGifPlayback(event) {
    if (event) event.stopPropagation();

    const gif = document.getElementById('info-exercise-gif');
    const pauseIcon = document.querySelector('.gif-pause-icon');
    const playIcon = document.querySelector('.gif-play-icon');

    if (!gif || !pauseIcon || !playIcon) return;

    if (gifPaused) {
        // Reprendre l'animation
        if (cachedGifSrc) {
            gif.src = cachedGifSrc;
        }
        pauseIcon.style.display = 'block';
        playIcon.style.display = 'none';
        gifPaused = false;
    } else {
        // Mettre en pause - capturer la frame actuelle
        cachedGifSrc = gif.src;

        try {
            const canvas = document.createElement('canvas');
            canvas.width = gif.naturalWidth || 400;
            canvas.height = gif.naturalHeight || 300;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(gif, 0, 0);
            gif.src = canvas.toDataURL('image/png');
        } catch (e) {
            // Si CORS bloque, on garde juste l'état
            console.warn('Impossible de capturer la frame (CORS)');
        }

        pauseIcon.style.display = 'none';
        playIcon.style.display = 'block';
        gifPaused = true;
    }

    if (window.HapticFeedback) {
        window.HapticFeedback.light();
    }
}

// Exports GIF helpers
window.loadFsExerciseGif = loadFsExerciseGif;
window.toggleFsGifVisibility = toggleFsGifVisibility;
window.toggleGifPlayback = toggleGifPlayback;

// Exports FS settings, swap & timer fullscreen
window.toggleFsSettings = toggleFsSettings;
window.toggleRestTimerFullscreen = toggleRestTimerFullscreen;
window.toggleFsSetting = toggleFsSetting;
window.openFsExerciseSwap = openFsExerciseSwap;
window.createExerciseVariant = createExerciseVariant;

console.log('✅ training.js: Fonctions exportées au scope global');
