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

    // Format last session date (compact)
    let lastSessionText = '';
    if (state.trainingProgress.lastSessionDate) {
        const lastDate = new Date(state.trainingProgress.lastSessionDate);
        const now = new Date();
        const diffDays = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) lastSessionText = "aujourd'hui";
        else if (diffDays === 1) lastSessionText = "hier";
        else lastSessionText = `il y a ${diffDays}j`;
    }

    // ── Phase state ─────────────────────────────────────────
    const phase = state.periodization?.currentPhase || 'hypertrophy';
    const week = state.periodization?.currentWeek || 1;
    const cycleType = state.periodization?.cycleType || '4';
    const totalWeeks = CYCLE_PRESETS[cycleType]?.totalWeeks || 4;
    const phaseNames = { hypertrophy: 'Hypertrophie', strength: 'Force', deload: 'Deload', peak: 'Peak' };
    const phaseCode = { hypertrophy: 'HYPERT', strength: 'FORCE', deload: 'DELOAD', peak: 'PEAK' };

    // Phase strip — un segment par semaine du cycle
    let phaseSegments = '';
    for (let i = 1; i <= totalWeeks; i++) {
        const state_cls = i < week ? 'done' : (i === week ? 'current' : 'upcoming');
        phaseSegments += `<span class="phase-seg ${state_cls}" aria-label="Semaine ${i}"></span>`;
    }

    // ── Transition suggérée (inline banner via smart-training) ──
    let transitionBanner = '';
    const lastDismissed = localStorage.getItem('repzy-phase-dismissed');
    const dismissedRecently = lastDismissed && (new Date() - new Date(lastDismissed)) < 24 * 60 * 60 * 1000;
    if (!dismissedRecently && window.SmartTraining?.suggestPhaseTransition) {
        if (window.SmartTraining.incrementWeeksInPhase) window.SmartTraining.incrementWeeksInPhase();
        const phaseSuggestion = window.SmartTraining.suggestPhaseTransition();
        if (phaseSuggestion.shouldTransition && phaseSuggestion.confidence !== 'low') {
            transitionBanner = window.SmartTraining.renderPhaseTransitionWidget();
        }
    }

    // ── Hero : Prochaine séance ─────────────────────────────
    const currentSplit = splits[currentIndex];
    const currentExercises = program.exercises[currentSplit] || [];
    const currentTemplateKey = `${state.wizardResults.selectedProgram}-${currentIndex}`;
    const hasCurrentTemplate = !!state.sessionTemplates[currentTemplateKey];

    // Muscle map des muscles sollicités
    const muscleSet = new Set();
    currentExercises.forEach(ex => { if (ex.muscle) muscleSet.add(ex.muscle); });
    const muscleMap = renderMuscleMap([...muscleSet]);

    // Estimation volume (nb sets × reps moyenne)
    const totalSets = currentExercises.reduce((sum, ex) => sum + (ex.sets || 0), 0);
    const avgDuration = Math.max(25, totalSets * 3); // ~3 min par set avec repos

    // Preview des 3 premiers exercices
    const exerciseRows = currentExercises.slice(0, 3).map(ex => `
        <li class="hero-exo-row">
            <span class="hero-exo-name">${ex.name}</span>
            <span class="hero-exo-spec">${ex.sets}×${ex.reps}</span>
        </li>
    `).join('');
    const extraCount = Math.max(0, currentExercises.length - 3);

    // ── Carousel Ensuite ────────────────────────────────────
    let upcomingCards = '';
    for (let i = 1; i < splits.length; i++) {
        const idx = (currentIndex + i) % splits.length;
        const splitName = splits[idx];
        const exercises = program.exercises[splitName] || [];
        const upMuscles = new Set();
        exercises.forEach(ex => { if (ex.muscle) upMuscles.add(ex.muscle); });
        const templateKey = `${state.wizardResults.selectedProgram}-${idx}`;
        const hasTemplate = !!state.sessionTemplates[templateKey];
        const musclesText = [...upMuscles].slice(0, 3).map(m => muscleShortName(m)).join(' · ');

        upcomingCards += `
            <button class="upcoming-card" onclick="showSessionPreview(${idx})" type="button">
                <div class="upcoming-card-head">
                    <span class="upcoming-card-day">J${idx + 1}</span>
                    ${hasTemplate ? '<span class="upcoming-card-ready" title="Configurée"></span>' : ''}
                </div>
                <h4 class="upcoming-card-title">${splitName}</h4>
                <div class="upcoming-card-meta">
                    <span class="upcoming-card-count">${exercises.length} exos</span>
                    ${musclesText ? `<span class="upcoming-card-muscles">${musclesText}</span>` : ''}
                </div>
            </button>
        `;
    }

    container.innerHTML = `
        <!-- TOP BAR -->
        <header class="training-topbar">
            <div class="training-topbar-main">
                <span class="training-program-kicker">PROGRAMME</span>
                <h2 class="training-program-name">${program.name}</h2>
                ${lastSessionText ? `<span class="training-program-meta">Dernière · ${lastSessionText}</span>` : ''}
            </div>
            <button class="topbar-action" onclick="openProgramWizard()" aria-label="Modifier le programme" title="Changer de programme">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </button>
        </header>

        <!-- PHASE STRIP -->
        <div class="training-phase-strip" onclick="openPeriodizationSheet()" role="button" tabindex="0" aria-label="Configurer la périodisation">
            <div class="phase-strip-row">
                <span class="phase-strip-tag phase-${phase}">${phaseCode[phase] || phase.toUpperCase()}</span>
                <span class="phase-strip-week">S<span class="phase-strip-week-num">${week}</span>/${totalWeeks}</span>
                <span class="phase-strip-cycle">CYCLE ${state.periodization?.currentCycle || 1}</span>
                <svg class="phase-strip-chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
            <div class="phase-strip-bar" aria-hidden="true">${phaseSegments}</div>
        </div>

        ${transitionBanner}

        <!-- HERO : PROCHAINE SÉANCE -->
        <section class="training-hero" aria-labelledby="training-hero-title">
            <div class="training-hero-grid">
                <div class="training-hero-left">
                    <span class="training-hero-kicker">PROCHAINE · JOUR ${currentIndex + 1}/${splits.length}</span>
                    <h1 id="training-hero-title" class="training-hero-title">
                        ${currentSplit}
                        ${hasCurrentTemplate ? '<span class="training-hero-ready" title="Séance configurée"></span>' : ''}
                    </h1>
                    <div class="training-hero-stats">
                        <div class="hero-stat">
                            <span class="hero-stat-value">${currentExercises.length}</span>
                            <span class="hero-stat-label">EXOS</span>
                        </div>
                        <div class="hero-stat">
                            <span class="hero-stat-value">${totalSets}</span>
                            <span class="hero-stat-label">SETS</span>
                        </div>
                        <div class="hero-stat">
                            <span class="hero-stat-value">~${avgDuration}</span>
                            <span class="hero-stat-label">MIN</span>
                        </div>
                    </div>
                </div>
                <div class="training-hero-right">
                    ${muscleMap}
                </div>
            </div>

            ${exerciseRows ? `
                <ol class="training-hero-exos">${exerciseRows}</ol>
                ${extraCount > 0 ? `<div class="training-hero-more">+ ${extraCount} autre${extraCount > 1 ? 's' : ''}</div>` : ''}
            ` : ''}

            <button class="training-hero-cta" onclick="showSessionPreview(${currentIndex})" type="button">
                <span class="hero-cta-label">Commencer la séance</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </button>

            <button class="training-hero-secondary" onclick="openNewSessionSheet()" type="button">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
                <span>Séance libre ou personnalisée</span>
            </button>
        </section>

        <!-- CAROUSEL ENSUITE -->
        <section class="upcoming-section" aria-labelledby="upcoming-title">
            <div class="upcoming-header">
                <h3 id="upcoming-title" class="upcoming-title">ENSUITE</h3>
                <span class="upcoming-count">${splits.length - 1} séances</span>
            </div>
            <div class="upcoming-carousel" role="list">
                ${upcomingCards}
            </div>
        </section>

        <!-- STATS FOOTER -->
        <section class="training-footer-stats" aria-label="Statistiques du programme">
            <div class="footer-stat">
                <span class="footer-stat-value">${totalSessions}</span>
                <span class="footer-stat-label">Séances total</span>
            </div>
            <div class="footer-stat-divider"></div>
            <div class="footer-stat">
                <span class="footer-stat-value">${state.wizardResults.frequency}<span class="footer-stat-unit">j</span></span>
                <span class="footer-stat-label">Par semaine</span>
            </div>
            <div class="footer-stat-divider"></div>
            <div class="footer-stat">
                <span class="footer-stat-value footer-stat-value--text">${getGoalLabel(state.wizardResults.goal)}</span>
                <span class="footer-stat-label">Objectif</span>
            </div>
        </section>
    `;
}

// ==================== MUSCLE MAP (SVG) ====================
// Silhouette simplifiée face+dos avec muscles colorés selon l'implication

const MUSCLE_MAP_REGIONS = {
    // Face avant (silhouette left)
    chest:      { side: 'front', path: 'M36 30 Q45 30 45 42 Q45 48 38 48 L36 48 L34 48 Q27 48 27 42 Q27 30 36 30 Z' },
    shoulders:  { side: 'front', path: 'M22 32 Q18 32 18 40 Q18 44 22 44 Q26 44 26 38 Z M46 32 Q50 32 50 40 Q50 44 46 44 Q42 44 42 38 Z' },
    biceps:     { side: 'front', path: 'M18 46 Q15 46 15 56 Q15 62 20 62 L22 58 L22 48 Z M50 46 Q53 46 53 56 Q53 62 48 62 L46 58 L46 48 Z' },
    forearms:   { side: 'front', path: 'M17 64 Q14 64 14 76 L19 76 L22 66 Z M51 64 Q54 64 54 76 L49 76 L46 66 Z' },
    abs:        { side: 'front', path: 'M30 50 L38 50 L38 72 L34 74 L30 72 Z' },
    quads:      { side: 'front', path: 'M26 78 Q24 78 24 96 L31 102 L32 78 Z M36 78 L37 102 L44 96 Q44 78 42 78 Z' },
    calves:     { side: 'front', path: 'M27 104 Q25 104 25 120 L31 122 L32 104 Z M36 104 L37 122 L43 120 Q43 104 41 104 Z' },
    // Face dos (silhouette right)
    back:       { side: 'back', path: 'M88 36 Q78 36 78 50 Q78 62 86 64 L94 64 Q102 62 102 50 Q102 36 92 36 Z' },
    traps:      { side: 'back', path: 'M86 28 Q82 28 82 34 Q85 36 90 36 Q95 36 98 34 Q98 28 94 28 Z' },
    'rear-delts': { side: 'back', path: 'M74 34 Q70 34 70 42 Q70 46 74 46 Q78 46 78 40 Z M102 34 Q106 34 106 42 Q106 46 102 46 Q98 46 98 40 Z' },
    triceps:    { side: 'back', path: 'M70 48 Q67 48 67 58 Q67 64 72 64 L74 60 L74 50 Z M106 48 Q109 48 109 58 Q109 64 104 64 L102 60 L102 50 Z' },
    glutes:     { side: 'back', path: 'M80 66 Q76 66 76 78 L88 78 L88 66 Z M92 66 L92 78 L104 78 Q104 66 100 66 Z' },
    hamstrings: { side: 'back', path: 'M78 80 Q76 80 76 98 L83 102 L84 80 Z M88 80 L89 102 L96 98 Q96 80 94 80 Z' },
};

function renderMuscleMap(activeMuscles) {
    const active = new Set(activeMuscles || []);
    // Silhouette de base (face + dos)
    const bodyBase = `
        <!-- Face avant -->
        <g class="muscle-body muscle-body--front">
            <path d="M36 10 Q28 10 28 20 Q28 28 36 28 Q44 28 44 20 Q44 10 36 10 Z" fill="currentColor" opacity="0.08"/>
            <path d="M20 32 Q16 32 14 46 L14 76 Q14 78 16 78 Q18 78 19 76 L22 46 Z M52 32 Q56 32 58 46 L58 76 Q58 78 56 78 Q54 78 53 76 L50 46 Z" fill="currentColor" opacity="0.08"/>
            <path d="M22 30 L50 30 L50 78 L44 78 L44 124 L39 124 L37 80 L35 80 L33 124 L28 124 L28 78 L22 78 Z" fill="currentColor" opacity="0.08"/>
        </g>
        <!-- Face dos -->
        <g class="muscle-body muscle-body--back">
            <path d="M88 10 Q80 10 80 20 Q80 28 88 28 Q96 28 96 20 Q96 10 88 10 Z" fill="currentColor" opacity="0.08"/>
            <path d="M72 32 Q68 32 66 46 L66 76 Q66 78 68 78 Q70 78 71 76 L74 46 Z M104 32 Q108 32 110 46 L110 76 Q110 78 108 78 Q106 78 105 76 L102 46 Z" fill="currentColor" opacity="0.08"/>
            <path d="M74 30 L102 30 L102 78 L96 78 L96 124 L91 124 L89 80 L87 80 L85 124 L80 124 L80 78 L74 78 Z" fill="currentColor" opacity="0.08"/>
        </g>
    `;

    // Overlays des muscles actifs
    let activePaths = '';
    Object.entries(MUSCLE_MAP_REGIONS).forEach(([key, region]) => {
        const isActive = active.has(key);
        const opacity = isActive ? 0.92 : 0;
        const fill = isActive ? 'var(--accent-brand)' : 'transparent';
        activePaths += `<path d="${region.path}" fill="${fill}" opacity="${opacity}" class="muscle-region ${isActive ? 'muscle-region--active' : ''}" data-muscle="${key}"/>`;
    });

    return `
        <svg class="muscle-map" viewBox="0 0 130 130" aria-hidden="true">
            ${bodyBase}
            ${activePaths}
        </svg>
    `;
}

function muscleShortName(key) {
    const shorts = {
        chest: 'Pecs', back: 'Dos', shoulders: 'Épaules', 'rear-delts': 'Ép. arr.',
        triceps: 'Triceps', biceps: 'Biceps', quads: 'Quads', hamstrings: 'Ischios',
        glutes: 'Fessiers', calves: 'Mollets', traps: 'Traps', abs: 'Abdos', forearms: 'Avt-bras'
    };
    return shorts[key] || key;
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
