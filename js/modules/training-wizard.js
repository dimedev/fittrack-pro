// ==================== TRAINING WIZARD (Programme wizard + sessions list) ====================
// Dépend de : training-shared.js (wizardState, CYCLE_PRESETS, _currentProgramSplitIndex, previewSession)

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

function getProgramRecommendations(frequency, userEquipment) {
    userEquipment = userEquipment || null;
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
        equipment: wizardState.equipment,
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

// ==================== EXPORTS GLOBAUX ====================
window.renderTrainingSection = renderTrainingSection;
window.openProgramWizard = openProgramWizard;
window.selectWizardOption = selectWizardOption;
window.wizardNext = wizardNext;
window.wizardBack = wizardBack;
window.selectProgram = selectProgram;
window.toggleWizardSensitivity = toggleWizardSensitivity;

console.log('✅ training-wizard.js: Wizard et sessions list exportés');
