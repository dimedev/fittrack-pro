// ==================== ONBOARDING MODULE ====================
// Shown on first launch when no wizardResults exist
// 5 steps: Welcome → Goal → Level → Frequency → Equipment + Program suggestion

(function() {
    'use strict';

    const TOTAL_STEPS = 5;

    let onboardingState = {
        currentStep: 1,
        goal: null,
        experience: null,
        frequency: null,
        equipment: null
    };

    // ==================== VISIBILITY ====================

    function shouldShow() {
        return !state.wizardResults?.completedAt;
    }

    function show() {
        if (!shouldShow()) return;

        const overlay = document.getElementById('onboarding-overlay');
        if (!overlay) return;

        // Reset state
        onboardingState = { currentStep: 1, goal: null, experience: null, frequency: null, equipment: null };

        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        updateOnboardingUI();

        window.track?.('onboarding_started');
    }

    function hide() {
        const overlay = document.getElementById('onboarding-overlay');
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    // ==================== NAVIGATION ====================

    function next() {
        if (!validateStep(onboardingState.currentStep)) return;

        if (onboardingState.currentStep < TOTAL_STEPS) {
            onboardingState.currentStep++;
            updateOnboardingUI();
            window.track?.('onboarding_step', { step: onboardingState.currentStep });
        }
    }

    function back() {
        if (onboardingState.currentStep > 1) {
            onboardingState.currentStep--;
            updateOnboardingUI();
        }
    }

    function validateStep(step) {
        if (step === 2 && !onboardingState.goal) {
            if (typeof showToast === 'function') showToast('Sélectionne ton objectif', 'warning');
            return false;
        }
        if (step === 3 && !onboardingState.experience) {
            if (typeof showToast === 'function') showToast('Sélectionne ton niveau', 'warning');
            return false;
        }
        if (step === 4 && !onboardingState.frequency) {
            if (typeof showToast === 'function') showToast('Sélectionne ta fréquence', 'warning');
            return false;
        }
        return true;
    }

    // ==================== SELECTION ====================

    function selectOption(field, value) {
        onboardingState[field] = value;

        const step = onboardingState.currentStep;
        document.querySelectorAll(`#ob-step-${step} .ob-option`).forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.value === String(value));
        });

        // Enable next/complete button
        const nextBtn = document.getElementById('ob-next-btn');
        if (nextBtn) nextBtn.disabled = false;

        // Auto-render program suggestion when equipment is selected (step 5)
        if (field === 'equipment') {
            renderProgramSuggestion();
            // Also enable complete button
            const completeBtn = document.getElementById('ob-complete-btn');
            if (completeBtn) completeBtn.disabled = false;
        }
    }

    // ==================== PROGRAM SUGGESTION ====================

    function renderProgramSuggestion() {
        const container = document.getElementById('ob-program-suggestion');
        if (!container) return;

        const freq = onboardingState.frequency;
        if (!freq || typeof getProgramRecommendations !== 'function') return;

        const recs = getProgramRecommendations(freq, onboardingState.equipment);
        const programId = recs[0];
        const program = (typeof trainingPrograms !== 'undefined') ? trainingPrograms[programId] : null;
        if (!program) return;

        const splits = program.splits[freq] || [];
        const splitPreview = splits.slice(0, 4).join(' · ') + (splits.length > 4 ? '...' : '');

        container.innerHTML = `
            <div class="ob-suggestion-label">Programme suggéré</div>
            <div class="ob-program-card">
                <span class="ob-program-icon">${program.icon}</span>
                <div class="ob-program-info">
                    <div class="ob-program-name">${program.name}</div>
                    <div class="ob-program-splits">${splitPreview}</div>
                </div>
                <div class="ob-recommended-badge">✓ Recommandé</div>
            </div>
        `;
        container.dataset.programId = programId;
    }

    // ==================== COMPLETION ====================

    function complete() {
        if (!onboardingState.equipment) {
            if (typeof showToast === 'function') showToast('Sélectionne ton équipement', 'warning');
            return;
        }

        // Pick the recommended program
        const recs = (typeof getProgramRecommendations === 'function')
            ? getProgramRecommendations(onboardingState.frequency, onboardingState.equipment)
            : ['ppl'];
        const programId = recs[0];

        // Set wizardState for selectProgram()
        if (typeof wizardState !== 'undefined') {
            wizardState.frequency = onboardingState.frequency;
            wizardState.goal = onboardingState.goal;
            wizardState.experience = onboardingState.experience;
            wizardState.equipment = onboardingState.equipment;
            wizardState.sensitivities = [];
        }

        // Save via the existing selectProgram function
        if (typeof selectProgram === 'function') {
            selectProgram(programId);
        }

        window.track?.('onboarding_completed', {
            goal: onboardingState.goal,
            experience: onboardingState.experience,
            frequency: onboardingState.frequency,
            equipment: onboardingState.equipment,
            program: programId
        });

        hide();
        if (typeof showToast === 'function') {
            showToast('Bienvenue ! Ton programme est prêt 🎉', 'success');
        }
    }

    // ==================== UI UPDATE ====================

    function updateOnboardingUI() {
        const step = onboardingState.currentStep;

        // Show/hide steps
        for (let i = 1; i <= TOTAL_STEPS; i++) {
            const el = document.getElementById(`ob-step-${i}`);
            if (el) el.style.display = i === step ? 'flex' : 'none';
        }

        // Progress bar
        const progressBar = document.getElementById('ob-progress');
        if (progressBar) {
            progressBar.style.width = `${((step - 1) / (TOTAL_STEPS - 1)) * 100}%`;
        }

        // Progress dots
        document.querySelectorAll('.ob-dot').forEach((dot, idx) => {
            dot.classList.toggle('active', idx < step);
            dot.classList.toggle('current', idx + 1 === step);
        });

        // Back button
        const backBtn = document.getElementById('ob-back-btn');
        if (backBtn) backBtn.style.display = step > 1 ? 'flex' : 'none';

        // Next / Complete buttons
        const nextBtn = document.getElementById('ob-next-btn');
        const completeBtn = document.getElementById('ob-complete-btn');

        if (step === 1) {
            if (nextBtn) nextBtn.style.display = 'none';
            if (completeBtn) completeBtn.style.display = 'none';
        } else if (step === TOTAL_STEPS) {
            if (nextBtn) nextBtn.style.display = 'none';
            if (completeBtn) {
                completeBtn.style.display = 'flex';
                completeBtn.disabled = !onboardingState.equipment;
            }
        } else {
            if (completeBtn) completeBtn.style.display = 'none';
            if (nextBtn) {
                nextBtn.style.display = 'flex';
                nextBtn.disabled = !hasStepSelection(step);
            }
        }

        // Restore current selections
        restoreSelections(step);

        // If returning to step 5 with equipment already set, re-render suggestion
        if (step === 5 && onboardingState.equipment) {
            renderProgramSuggestion();
        }
    }

    function hasStepSelection(step) {
        if (step === 2) return !!onboardingState.goal;
        if (step === 3) return !!onboardingState.experience;
        if (step === 4) return !!onboardingState.frequency;
        return true;
    }

    function restoreSelections(step) {
        document.querySelectorAll(`#ob-step-${step} .ob-option`).forEach(btn => {
            const val = btn.dataset.value;
            let selected = false;
            if (step === 2) selected = val === onboardingState.goal;
            if (step === 3) selected = val === onboardingState.experience;
            if (step === 4) selected = val === String(onboardingState.frequency);
            if (step === 5) selected = val === onboardingState.equipment;
            btn.classList.toggle('selected', selected);
        });
    }

    // ==================== PUBLIC API ====================

    window.Onboarding = {
        show,
        hide,
        next,
        back,
        selectOption,
        complete
    };

    console.log('🎯 Onboarding module loaded');
})();
