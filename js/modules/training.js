// ==================== TRAINING CORE ====================
// Session lifecycle, sets, timer, rest, PR, GIF, navigator
//
// Extracted to separate files:
// - training-shared.js: state, constants, helpers
// - training-wizard.js: program wizard + sessions list
// - training-periodization.js: cycles, phases, deload
// - training-swap.js: exercise swap + variants
// - training-builder.js: preview, free session, templates, quick log, dedup

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
    const today = new Date().toLocaleDateString('en-CA');
    
    if (existingSession && 
        existingSession.splitName === splitName && 
        existingSession.sessionId &&
        new Date(existingSession.startTime).toLocaleDateString('en-CA') === today) {
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

    // Push state pour le bouton back (permet de revenir via le bouton retour)
    if (typeof updateHash === 'function') {
        history.pushState({ section: 'session' }, '', '#session');
    }

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
    // Protection double-clic (debounce 400ms)
    if (window._validatingSet) return;
    window._validatingSet = true;
    setTimeout(() => { window._validatingSet = false; }, 400);

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

    // Pulse animation sur le bouton validé (Phase 2D)
    const validateBtn = document.getElementById('fs-validate-btn');
    if (validateBtn) {
        validateBtn.classList.remove('set-validated-pulse');
        void validateBtn.offsetWidth;
        validateBtn.classList.add('set-validated-pulse');
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

        // ── Start rest timer ──────────────────────────────────────────
        // Drop sets : PAS de timer (on réduit le poids immédiatement)
        // Rest-pause : timer court 20s (micro-pause inter-rp)
        // Série normale : timer standard selon exercice + phase
        if (getCompletedSetsForExercise(fsSession.currentExerciseIndex) >= 1) {
            if (completedSet.isDrop) {
                // Drop set — pas de repos, juste un haptic leger
                if (window.HapticFeedback) HapticFeedback.light();
            } else if (completedSet.isRestPause) {
                // Rest-pause — timer court 20s fixe
                startRestTimer(20);
            } else {
                startRestTimer();
            }
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

function startRestTimer(overrideDuration = null) {
    // Get exercise name and goal
    const exercise = fsSession.exercises[fsSession.currentExerciseIndex];
    const goal = state.wizardResults?.goal || 'hypertrophy';

    if (overrideDuration !== null) {
        // Durée imposée (ex: rest-pause = 20s)
        fsTimerTarget = overrideDuration;
    } else {
        // Temps de repos intelligent selon exercice + objectif
        let baseRestTime = getSmartRestTime(exercise.effectiveName, goal);
        // Appliquer le multiplicateur de phase (périodisation)
        const phaseAdjustments = getPhaseAdjustments();
        fsTimerTarget = Math.round(baseRestTime * phaseAdjustments.restMultiplier);
    }
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
    // Protection contre double exécution (synchrone, avant tout await)
    if (fsSession.sessionSaved || fsSession._finishInProgress) {
        console.warn('⚠️ Session déjà sauvegardée ou en cours, ignore finishSession()');
        return;
    }
    fsSession._finishInProgress = true;

    try {
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
    // Utiliser la date de DÉBUT de la séance (pas la date de fin)
    // Évite que les séances commencées avant minuit soient datées au lendemain
    const today = new Date(fsSession.startTime).toLocaleDateString('en-CA');
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
                    // Analytics
                    window.track?.('exercise_pr', {
                        exercise: exerciseName,
                        weight: setData.weight,
                        reps: setData.reps,
                        pr_type: prCheck.type || '1rm'
                    });
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
        timestamp: fsSession.startTime || Date.now(), // Utiliser le début de la séance
        sessionType: fsSession.sessionType || 'program',
        sessionName: fsSession.sessionName || null,
        program: isFreeSession ? null : state.wizardResults.selectedProgram,
        day: isFreeSession ? null : fsSession.splitName,
        exercises: sessionData,
        duration: durationMinutes,
        totalVolume: Math.round(totalVolume),
        caloriesBurned: caloriesBurned,
        prsCount: newPRs.length // Nombre de PRs battus pendant la séance
    };
    
    state.sessionHistory.unshift(newSession);
    // PAS de slice(0, 100) — on garde TOUTES les sessions pour éviter la perte de données.
    // La limitation se fait uniquement côté affichage (UI).
    if (typeof criticalLog === 'function') criticalLog('session_saved_local', { sessionId: newSession.sessionId, date: newSession.date, exercises: newSession.exercises?.length || 0 });

    // ── Backup DIRECT dans localStorage (filet de sécurité) ──
    // IndexedDB est asynchrone et peut ne pas écrire si l'onglet est fermé rapidement.
    // Ce backup garantit que la session n'est JAMAIS perdue.
    try {
        const sessionsBackup = state.sessionHistory.slice(0, 30);
        localStorage.setItem('fittrack-sessions-backup', JSON.stringify(sessionsBackup));
        console.log('💾 Backup session localStorage OK:', newSession.sessionId);
    } catch (backupErr) {
        console.warn('⚠️ Backup session localStorage échoué:', backupErr);
    }

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

    // Save state (localStorage synchrone + IndexedDB async)
    saveState();

    // ── Attendre confirmation IndexedDB si disponible ──
    if (window.RepzyDB && window.RepzyDB.isReady()) {
        try {
            await window.RepzyDB.saveState(state);
            console.log('✅ Session confirmée dans IndexedDB');
        } catch (idbErr) {
            console.warn('⚠️ IndexedDB write failed, localStorage backup active:', idbErr);
        }
    }

    // Sync with Supabase (await pour garantir la persistance)
    if (typeof isLoggedIn === 'function' && isLoggedIn()) {
        const sessionToSave = {
            sessionId: fsSession.sessionId,
            date: today,
            sessionType: fsSession.sessionType || 'program',
            sessionName: fsSession.sessionName || null,
            program: isFreeSession ? null : state.wizardResults.selectedProgram,
            day: isFreeSession ? null : fsSession.splitName,
            dayIndex: !isFreeSession ? fsSession.splitIndex : null,
            exercises: sessionData,
            duration: durationMinutes,
            totalVolume: Math.round(totalVolume),
            caloriesBurned: caloriesBurned
        };

        // ── TENTATIVE ATOMIQUE via RPC (session + progress logs en une transaction) ──
        let atomicSuccess = false;
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            try {
                // Préparer les progress logs pour la RPC
                const progressLogsForRPC = sessionData.map(exData => {
                    const logs = state.progressLog[exData.exercise];
                    if (!logs || logs.length === 0) return null;
                    const lastLog = logs[logs.length - 1];
                    return {
                        exercise_name: exData.exercise,
                        date: lastLog.date,
                        sets: lastLog.sets,
                        reps: lastLog.reps || lastLog.achievedReps,
                        weight: lastLog.weight,
                        achieved_reps: lastLog.achievedReps,
                        achieved_sets: lastLog.achievedSets,
                        sets_detail: lastLog.setsDetail || []
                    };
                }).filter(Boolean);

                const { data: rpcResult, error: rpcError } = await supabaseClient.rpc('save_session_atomic', {
                    p_session: {
                        session_id: sessionToSave.sessionId,
                        date: sessionToSave.date,
                        session_type: sessionToSave.sessionType,
                        session_name: sessionToSave.sessionName,
                        program: sessionToSave.program,
                        day: sessionToSave.day,
                        exercises: sessionToSave.exercises,
                        duration: sessionToSave.duration,
                        total_volume: sessionToSave.totalVolume,
                        calories_burned: sessionToSave.caloriesBurned
                    },
                    p_progress_logs: progressLogsForRPC
                });

                if (!rpcError && rpcResult?.success) {
                    atomicSuccess = true;
                    newSession.synced = true;
                    // Marquer les progress logs comme synced
                    sessionData.forEach(exData => {
                        const logs = state.progressLog[exData.exercise];
                        if (logs && logs.length > 0) {
                            logs[logs.length - 1].synced = true;
                        }
                    });
                    saveState();
                    if (typeof updateSyncIndicator === 'function') updateSyncIndicator();
                    console.log('✅ Session sauvegardée atomiquement via RPC');
                } else {
                    console.warn('RPC save_session_atomic non disponible ou échouée, fallback classique:', rpcError?.message || rpcResult?.error);
                }
            } catch (rpcErr) {
                console.warn('RPC save_session_atomic non disponible, fallback classique:', rpcErr?.message);
            }
        }

        // ── FALLBACK CLASSIQUE (si la RPC n'est pas déployée ou a échoué) ──
        if (!atomicSuccess) {
            if (typeof saveWorkoutSessionToSupabase === 'function') {
                try {
                    const ok = await saveWorkoutSessionToSupabase(sessionToSave);
                    if (ok) {
                        newSession.synced = true;
                        saveState();
                        if (typeof updateSyncIndicator === 'function') updateSyncIndicator();
                    }
                } catch (err) {
                    console.error('Erreur sync séance:', err);
                    if (typeof addToSyncQueue === 'function') addToSyncQueue('workout_session', 'upsert', sessionToSave);
                }
            }

            for (const exData of sessionData) {
                const logs = state.progressLog[exData.exercise];
                if (logs && logs.length > 0) {
                    const lastLog = logs[logs.length - 1];
                    if (typeof saveProgressLogToSupabase === 'function') {
                        try { await saveProgressLogToSupabase(exData.exercise, lastLog); }
                        catch (err) { console.warn('Sync progression en attente:', exData.exercise); }
                    }
                }
            }
        }

        // Training settings (indépendant, toujours exécuté)
        if (typeof saveTrainingSettingsToSupabase === 'function') {
            saveTrainingSettingsToSupabase().catch(err => {
                console.warn('⚠️ Sync training settings échouée, sera retentée:', err?.message || err);
                if (typeof addToSyncQueue === 'function') {
                    addToSyncQueue({ type: 'training_settings', action: 'upsert', data: { source: 'finishSession' } });
                }
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

    // Analytics — funnel conversion
    window.track?.('session_completed', {
        duration_min: durationMinutes,
        exercise_count: Object.keys(setsByExercise).length,
        total_sets: fsSession.completedSets.length,
        total_volume: Math.round(totalVolume),
        session_type: isFreeSession ? 'free' : 'program',
        program: isFreeSession ? null : (state.wizardResults?.selectedProgram || null),
        has_pr: newPRs.length > 0,
        pr_count: newPRs.length
    });

    // Refresh training section
    renderTrainingSection();
    if (typeof updateDashboard === 'function') updateDashboard();

    } catch (err) {
        console.error('❌ Erreur finishSession:', err);
        fsSession.sessionSaved = false;
        if (typeof showToast === 'function') showToast('Erreur lors de la sauvegarde', 'error');
    } finally {
        fsSession._finishInProgress = false;
    }
}

// getExerciseIdByName, getEffectiveExerciseName, getLastLog → training-shared.js

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

/**
 * Lance un effet confettis canvas plein écran (Phase 2D).
 * @param {number} duration — durée en ms (défaut 2500)
 */
function launchConfetti(duration) {
    duration = duration || 2500;
    var canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:100001;pointer-events:none;';
    document.body.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    var colors = ['#FFD700', '#FF0000', '#FFFFFF', '#ff4444', '#44ff44', '#4488ff'];
    var particles = [];
    var count = Math.min(120, Math.max(60, Math.floor(canvas.width / 4)));

    for (var i = 0; i < count; i++) {
        particles.push({
            x: canvas.width * Math.random(),
            y: canvas.height * -0.1 - Math.random() * canvas.height * 0.3,
            vx: (Math.random() - 0.5) * 6,
            vy: Math.random() * 3 + 2,
            w: Math.random() * 8 + 4,
            h: Math.random() * 6 + 2,
            color: colors[Math.floor(Math.random() * colors.length)],
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 10,
            opacity: 1,
            isCircle: Math.random() > 0.5
        });
    }

    var start = performance.now();
    function animate(now) {
        var elapsed = now - start;
        if (elapsed > duration) {
            if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
            return;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        var fadeStart = duration * 0.7;
        particles.forEach(function(p) {
            p.x += p.vx;
            p.vy += 0.12; // gravity
            p.vx *= 0.99; // friction
            p.y += p.vy;
            p.rotation += p.rotationSpeed;
            if (elapsed > fadeStart) {
                p.opacity = Math.max(0, 1 - (elapsed - fadeStart) / (duration - fadeStart));
            }
            ctx.save();
            ctx.globalAlpha = p.opacity;
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation * Math.PI / 180);
            ctx.fillStyle = p.color;
            if (p.isCircle) {
                ctx.beginPath();
                ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
            }
            ctx.restore();
        });
        requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
}

function showPRNotification(prs) {
    // Haptic achievement
    if (window.HapticFeedback) {
        window.HapticFeedback.achievement();
    }

    // 🎊 Confettis canvas (Phase 2D)
    launchConfetti(2800);

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

    // ModalManager scroll lock
    if (typeof ModalManager !== 'undefined') {
        if (isOpen) ModalManager.unlock('fs-settings-sheet');
        else ModalManager.lock('fs-settings-sheet');
    }

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

// ==================== WINDOW EXPORTS (CORE SESSION) ====================
window.startSessionFromPreview = startSessionFromPreview;
window.startFullScreenSession = startFullScreenSession;
window.startFullScreenSessionWithCustomExercises = startFullScreenSessionWithCustomExercises;
window.restoreSession = restoreSession;
window.minimizeSession = minimizeSession;
window.finishSession = finishSession;
window.quitSession = quitSession;
window.returnToPreview = returnToPreview;
window.closeFullScreenSession = closeFullScreenSession;

// Session control
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
window.renderCurrentExercise = renderCurrentExercise;
window.renderCompletedSets = renderCompletedSets;

// Settings & session management
window.openSessionSettings = openSessionSettings;
window.closeSettingsSheet = closeSettingsSheet;
window.adjustRestTime = adjustRestTime;
window.machineOccupied = machineOccupied;
window.postponeCurrentExercise = postponeCurrentExercise;

// Advanced techniques
window.startDropSet = startDropSet;
window.startRestPause = startRestPause;
window.goBackForDropSet = goBackForDropSet;
window.goBackForRestPause = goBackForRestPause;
window.createSuperset = createSuperset;
window.removeSuperset = removeSuperset;
window.resetValidateButton = resetValidateButton;

// Navigator
window.openExerciseNavigator = openExerciseNavigator;
window.closeExerciseNavigator = closeExerciseNavigator;
window.navigateToExercise = navigateToExercise;
window.findNextIncompleteExercise = findNextIncompleteExercise;
window.findPreviousIncompleteExercise = findPreviousIncompleteExercise;
window.getCompletedSetsForExercise = getCompletedSetsForExercise;

// GIF & FS settings
window.loadFsExerciseGif = loadFsExerciseGif;
window.toggleFsGifVisibility = toggleFsGifVisibility;
window.toggleGifPlayback = toggleGifPlayback;
window.toggleFsSettings = toggleFsSettings;
window.toggleFsSetting = toggleFsSetting;
window.toggleRestTimerFullscreen = toggleRestTimerFullscreen;

// Exercise tips
window.openExerciseTips = openExerciseTips;
window.toggleExerciseHistory = toggleExerciseHistory;
window.closeExerciseInfo = closeExerciseInfo;

// PR
window.checkForRealtimePR = checkForRealtimePR;
window.showRealtimePRBadge = showRealtimePRBadge;
window.showPRNotification = showPRNotification;
window.launchConfetti = launchConfetti;

console.log('\u2705 training.js: Core session export\u00e9 (lifecycle, timer, PR, GIF, navigator)');
