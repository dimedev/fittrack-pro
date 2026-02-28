// ==================== TRAINING PERIODIZATION (Cycles, phases, deload) ====================
// Dépend de : training-shared.js (CYCLE_PRESETS, fsSession, getEffectiveWeight)

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

// ==================== EXPORTS GLOBAUX ====================
window.getCurrentPhase = getCurrentPhase;
window.updateCurrentPhase = updateCurrentPhase;
window.getPhaseAdjustments = getPhaseAdjustments;
window.checkVolumeAdherence = checkVolumeAdherence;
window.initPeriodization = initPeriodization;
window.updatePhaseIndicator = updatePhaseIndicator;
window.applyPhaseToAllExercises = applyPhaseToAllExercises;
window.updatePeriodization = updatePeriodization;
window.countSessionsThisWeek = countSessionsThisWeek;
window.shouldApplyDeload = shouldApplyDeload;
window.getDeloadAdjustedSets = getDeloadAdjustedSets;
window.detectPlateauForExercise = detectPlateauForExercise;
window.getDoubleProgressionRecommendation = getDoubleProgressionRecommendation;
window.openPeriodizationSheet = openPeriodizationSheet;
window.closePeriodizationSheet = closePeriodizationSheet;
window.selectPeriodizationCycle = selectPeriodizationCycle;
window.resetPeriodizationCycle = resetPeriodizationCycle;
window.togglePeriodEducation = togglePeriodEducation;

console.log('✅ training-periodization.js: Périodisation exportée');
