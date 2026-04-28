// ==================== TRAINING BUILDER (Preview, free session, templates, quick log, dedup) ====================
// Dépend de : training-shared.js (previewSession, freeSessionBuilder, quickLogState, _quickLogPickerMode, _freePickerMode, _currentProgramSplitIndex, formatVolume, getEffectiveWeight, etc.)

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
        // V6.1 STORE-BLOCKER : displayName est user-typed (custom exos)
        // → escape pour HTML ET pour le onclick inline (jsString).
        const safeDisplayName = window.DomSafe ? DomSafe.escape(displayName) : displayName;
        const safeJsName = window.DomSafe ? DomSafe.jsString(displayName) : displayName.replace(/'/g, "\\'");

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
                        ${safeDisplayName}
                        ${badge}
                    </span>
                    <span class="preview-exercise-meta">${ex.sets} séries × ${ex.reps} reps</span>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="exercise-info-btn" onclick="openExerciseTips('${safeJsName}')" title="Informations">
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

// ==================== DURATION PICKER & START FROM PREVIEW ====================

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

    // ÉTAPE 2 : Pour les sessions SANS sessionId (legacy), dédupliquer par date+program+day
    // SEULEMENT si les timestamps sont proches (<5 min) pour ne pas supprimer des sessions matin/soir
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

    final.push(...withId);

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
            // Trier par timestamp pour grouper les proches
            sessions.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
            const kept = [sessions[0]];
            for (let i = 1; i < sessions.length; i++) {
                const prev = kept[kept.length - 1];
                const timeDiff = Math.abs((sessions[i].timestamp || 0) - (prev.timestamp || 0));
                if (timeDiff < 300000) {
                    // <5 min : vrai doublon, garder celui avec le plus d'exercices
                    if ((sessions[i].exercises?.length || 0) > (prev.exercises?.length || 0)) {
                        kept[kept.length - 1] = sessions[i];
                    }
                    removedByLegacy++;
                } else {
                    // >5 min : sessions distinctes (matin/soir), garder les deux
                    kept.push(sessions[i]);
                }
            }
            final.push(...kept);
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

    container.innerHTML = freeSessionBuilder.exercises.map((ex, idx) => {
        // V6.1 STORE-BLOCKER : ex.name peut être custom (user-typed via "Créer exo")
        // ex.muscle est interne mais on échappe par défense en profondeur (si fallback custom)
        const safeName = window.DomSafe ? DomSafe.escape(ex.name) : ex.name;
        const muscleLabel = muscleLabels[ex.muscle] || ex.muscle;
        const safeMuscle = window.DomSafe ? DomSafe.escape(muscleLabel) : muscleLabel;
        const safeReps = window.DomSafe ? DomSafe.attr(ex.reps) : ex.reps;
        return `
        <div class="free-exercise-item">
            <div class="free-exercise-info">
                <span class="free-exercise-name">${safeName}</span>
                <span class="free-exercise-muscle">${safeMuscle}</span>
            </div>
            <div class="free-exercise-params">
                <label class="free-param-label">
                    Séries
                    <input type="number" class="free-param-input" value="${ex.sets}"
                           min="1" max="10" onchange="updateFreeExerciseSets(${idx}, this.value)">
                </label>
                <label class="free-param-label">
                    Reps
                    <input type="text" class="free-param-input free-param-reps" value="${safeReps}"
                           maxlength="6" onchange="updateFreeExerciseReps(${idx}, this.value)">
                </label>
            </div>
            <button class="free-exercise-delete" onclick="removeExerciseFromFreeSession(${idx})" aria-label="Supprimer">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
            </button>
        </div>
        `;
    }).join('');

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

    // Muscles les plus utilisés en séance libre — Pit Lane: SVG + labels clean (pas d'emojis)
    const popularMuscles = ['chest', 'back', 'shoulders', 'quads', 'hamstrings', 'biceps', 'triceps', 'glutes', 'abs'];
    const muscleLabels = {
        chest: 'Pectoraux', back: 'Dos', shoulders: 'Épaules',
        quads: 'Quadriceps', hamstrings: 'Ischio-jambiers', biceps: 'Biceps',
        triceps: 'Triceps', glutes: 'Fessiers', abs: 'Abdominaux'
    };
    // Icône SVG muscle Pit Lane — même que renderSwapSections()
    const SVG_MUSCLE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 6.5C6.5 4 8 2.5 10 2.5s3.5 1.5 3.5 4c0 1-.5 2-1 3"/><path d="M12 8.5c2-.5 4 1 4.5 3 .5 2-.5 4-2 5"/><path d="M14 16c1 2 0 4-2 4.5-2 .5-4-.5-4.5-2"/><path d="M8 14c-2 0-4-1-4.5-3"/></svg>';

    if (sections) {
        sections.innerHTML = popularMuscles.map(muscle => {
            const exercises = state.exercises
                .filter(e => e.muscle === muscle)
                .slice(0, 5);
            if (exercises.length === 0) return '';
            const label = muscleLabels[muscle] || muscle;
            const itemsHtml = (typeof renderSwapItems === 'function')
                ? renderSwapItems(exercises)
                : exercises.map((ex, i) => {
                    // V6.1 STORE-BLOCKER : ex.name peut être custom (user-typed)
                    const safeName = window.DomSafe ? DomSafe.escape(ex.name) : ex.name;
                    const safeEquip = window.DomSafe ? DomSafe.escape(ex.equipment || '') : (ex.equipment || '');
                    const safeJsId = window.DomSafe ? DomSafe.jsString(ex.id) : ex.id;
                    return `
                    <button type="button" class="swap-option-item" style="--i:${i}" onclick="swapExerciseInPreview('${safeJsId}')">
                        <span class="swap-option-equip-icon" aria-hidden="true"></span>
                        <div class="swap-option-info">
                            <span class="swap-option-name">${safeName}</span>
                            <span class="swap-option-meta"><span class="swap-option-equip">${safeEquip}</span></span>
                        </div>
                        <span class="swap-option-cta" aria-hidden="true">+</span>
                    </button>`;
                }).join('');
            return `
                <div class="swap-section">
                    <div class="swap-section-header">
                        <span class="swap-section-icon">${SVG_MUSCLE}</span>
                        <span class="swap-section-title">${label}</span>
                        <span class="swap-section-count">${exercises.length}</span>
                    </div>
                    <div class="swap-section-list">
                        ${itemsHtml}
                    </div>
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
    const today = new Date().toLocaleDateString('en-CA');

    if (existingSession &&
        existingSession.sessionType === 'free' &&
        existingSession.sessionId &&
        new Date(existingSession.startTime).toLocaleDateString('en-CA') === today &&
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
            startTime: Date.now(),
            gymId: state.activeGymId || null // Snapshot salle active
        };
        console.log('🆕 Session libre créée:', fsSession.sessionId);
    }
    if (fsSession && !fsSession.gymId) fsSession.gymId = state.activeGymId || null;

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

// ==================== QUICK LOG ====================
// _quickLogPickerMode et quickLogState sont dans training-shared.js (window._quickLogPickerMode, window.quickLogState)

function openQuickLogSheet() {
    window.quickLogState = { exercise: null, sets: [] };
    _renderQuickLogExercise();
    _renderQuickLogSets();
    const sheet = document.getElementById('quick-log-sheet');
    if (!sheet) return;
    if (window.ModalManager) ModalManager.lock('quick-log-sheet');
    sheet.style.display = 'flex';
}

function closeQuickLogSheet() {
    if (window.ModalManager) ModalManager.unlock('quick-log-sheet');
    const sheet = document.getElementById('quick-log-sheet');
    if (sheet) sheet.style.display = 'none';
    _quickLogPickerMode = false;
}

function openExercisePickerForQuickLog() {
    // Ouvrir le swap sheet en mode "quick log picker"
    _quickLogPickerMode = true;
    const titleEl = document.querySelector('#swap-bottom-sheet .bottom-sheet-title');
    if (titleEl) titleEl.textContent = 'Choisir un exercice';
    const currentSection = document.querySelector('.swap-current-exercise');
    if (currentSection) currentSection.style.display = 'none';
    closeQuickLogSheet();
    // Initialiser la recherche vide
    const searchInput = document.getElementById('swap-search-input');
    if (searchInput) { searchInput.value = ''; }
    // Ouvrir le swap sheet
    if (typeof openSwapSheet === 'function') {
        openSwapSheet(null); // null = pas d'exercice courant
    } else {
        const sheet = document.getElementById('swap-bottom-sheet');
        if (sheet) {
            sheet.style.display = 'flex';
            if (window.ModalManager) ModalManager.lock('swap-bottom-sheet');
            if (typeof renderSwapSections === 'function') renderSwapSections([], [], []);
            if (typeof filterSwapExercises === 'function') filterSwapExercises('');
        }
    }
}

function _renderQuickLogExercise() {
    const picker  = document.getElementById('quick-log-exercise-btn');
    const iconEl  = document.getElementById('quick-log-exercise-icon');
    const nameEl  = document.getElementById('quick-log-exercise-name');
    const hintEl  = document.getElementById('quick-log-exercise-hint');
    const section = document.getElementById('quick-log-sets-section');
    if (!picker) return;

    if (quickLogState.exercise) {
        picker.classList.add('has-exercise');
        if (iconEl)  iconEl.textContent = '🏋️';
        if (nameEl)  nameEl.textContent = quickLogState.exercise.name;
        if (hintEl)  hintEl.textContent = quickLogState.exercise.muscleGroup || 'Appuyer pour changer';
        if (section) section.style.display = 'block';
    } else {
        picker.classList.remove('has-exercise');
        if (iconEl)  iconEl.textContent = '🏋️';
        if (nameEl)  nameEl.textContent = 'Choisir un exercice';
        if (hintEl)  hintEl.textContent = 'Appuyer pour sélectionner';
        if (section) section.style.display = 'none';
    }
}

function setQuickLogExercise(exerciseId) {
    const exercise = (state.exercises || []).find(e => e.id === exerciseId);
    if (!exercise) return;
    quickLogState.exercise = exercise;
    quickLogState.sets = [];
    _quickLogPickerMode = false;

    // Restaurer le swap sheet title
    const titleEl = document.querySelector('#swap-bottom-sheet .bottom-sheet-title');
    if (titleEl) titleEl.textContent = 'Remplacer l\'exercice';
    const currentSection = document.querySelector('.swap-current-exercise');
    if (currentSection) currentSection.style.display = '';

    // Fermer le swap sheet, rouvrir quick log
    if (typeof closeBottomSheet === 'function') closeBottomSheet();
    openQuickLogSheet();

    // Auto-ajouter la première série
    addSetToQuickLog();
}

function addSetToQuickLog() {
    if (!quickLogState.exercise) return;
    // Reprendre le poids de la série précédente comme défaut
    const lastSet = quickLogState.sets[quickLogState.sets.length - 1];
    const defaultWeight = lastSet ? lastSet.weight : '';
    const defaultReps   = lastSet ? lastSet.reps   : 10;
    quickLogState.sets.push({ weight: defaultWeight, reps: defaultReps });
    _renderQuickLogSets();
}

function removeSetFromQuickLog(index) {
    quickLogState.sets.splice(index, 1);
    _renderQuickLogSets();
}

function _renderQuickLogSets() {
    const list    = document.getElementById('quick-log-sets-list');
    const saveBtn = document.getElementById('quick-log-save-btn');
    if (!list) return;

    if (quickLogState.sets.length === 0) {
        list.innerHTML = '';
    } else {
        list.innerHTML = quickLogState.sets.map((set, i) => `
            <div class="quick-log-set-row" id="ql-set-${i}">
                <span class="quick-log-set-num">S${i + 1}</span>
                <div class="quick-log-set-inputs">
                    <input type="number" class="quick-log-input"
                           value="${set.weight}"
                           placeholder="kg"
                           min="0" max="500" step="0.5"
                           oninput="quickLogSetChanged(${i}, 'weight', this.value)"
                           inputmode="decimal">
                    <span class="quick-log-input-sep">×</span>
                    <input type="number" class="quick-log-input"
                           value="${set.reps}"
                           placeholder="reps"
                           min="1" max="200" step="1"
                           oninput="quickLogSetChanged(${i}, 'reps', this.value)"
                           inputmode="numeric">
                </div>
                <button class="quick-log-set-del" onclick="removeSetFromQuickLog(${i})" aria-label="Supprimer">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
            </div>
        `).join('');
    }

    // Activer/désactiver le bouton sauvegarder
    const hasValidSets = quickLogState.sets.length > 0 &&
        quickLogState.sets.some(s => s.reps > 0);
    if (saveBtn) saveBtn.disabled = !quickLogState.exercise || !hasValidSets;
}

function quickLogSetChanged(index, field, value) {
    if (!quickLogState.sets[index]) return;
    quickLogState.sets[index][field] = field === 'weight'
        ? parseFloat(value) || 0
        : parseInt(value)  || 0;
    // Re-valider le bouton sauvegarder
    const saveBtn = document.getElementById('quick-log-save-btn');
    if (saveBtn) {
        const hasValidSets = quickLogState.sets.some(s => s.reps > 0);
        saveBtn.disabled = !hasValidSets;
    }
}

async function saveQuickLogSession() {
    if (!quickLogState.exercise || quickLogState.sets.length === 0) return;

    const ex      = quickLogState.exercise;
    const sets    = quickLogState.sets.filter(s => s.reps > 0);
    if (sets.length === 0) { showToast('Ajoute au moins une série', 'warning'); return; }

    const today      = new Date().toLocaleDateString('en-CA');
    const sessionId  = 'quick-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const totalSets  = sets.length;
    const totalReps  = sets.reduce((sum, s) => sum + (s.reps || 0), 0);
    const totalVol   = sets.reduce((sum, s) => sum + (s.weight || 0) * (s.reps || 0), 0);
    const duration   = Math.max(1, Math.round(totalSets * 2.5)); // estimation ~2.5 min/série

    // ── Construire la session ──
    const newSession = {
        sessionId,
        date: today,
        sessionType: 'quick',
        sessionName: ex.name,
        exercises: [{
            name: ex.name,
            effectiveName: ex.name,
            sets: totalSets,
            achievedSets: totalSets,
            achievedReps: totalReps,
            weight: sets[0]?.weight || 0,
            setsDetail: sets.map((s, i) => ({
                setIndex: i,
                weight: s.weight || 0,
                reps: s.reps || 0,
                completed: true,
                rpe: null, rir: null, isDrop: false, isRestPause: false
            }))
        }],
        duration,
        totalVolume: totalVol,
        addedAt: Date.now()
    };

    // ── Sauvegarder dans sessionHistory ──
    if (!state.sessionHistory) state.sessionHistory = [];
    state.sessionHistory.unshift(newSession);
    if (typeof criticalLog === 'function') criticalLog('quicklog_saved_local', { sessionId: newSession.sessionId, date: newSession.date });

    // ── Sauvegarder dans progressLog ──
    if (!state.progressLog) state.progressLog = {};
    if (!state.progressLog[ex.name]) state.progressLog[ex.name] = [];
    state.progressLog[ex.name].push({
        date: today,
        sessionId,
        sets: totalSets,
        achievedSets: totalSets,
        achievedReps: totalReps,
        weight: sets[0]?.weight || 0,
        setsDetail: newSession.exercises[0].setsDetail,
        addedAt: Date.now()
    });

    // ── Vérifier PR ──
    if (typeof checkAndUpdatePR === 'function') {
        const pr = checkAndUpdatePR(ex.name, sets[0]?.weight || 0, Math.max(...sets.map(s => s.reps || 0)));
        if (pr?.isNewPR) showToast(`🏆 Nouveau PR — ${ex.name} !`, 'success', 3500);
    }

    saveState();

    // ── Sync Supabase ──
    if (typeof saveWorkoutSessionToSupabase === 'function') {
        try {
            const ok = await saveWorkoutSessionToSupabase(newSession);
            if (ok) {
                newSession.synced = true;
                saveState();
                if (typeof updateSyncIndicator === 'function') updateSyncIndicator();
            }
        } catch (e) {
            if (typeof addToSyncQueue === 'function') addToSyncQueue('workout_session', 'insert', newSession);
        }
    }
    if (typeof syncPendingData === 'function') setTimeout(() => syncPendingData(), 2000);

    closeQuickLogSheet();
    showToast(`✅ ${ex.name} · ${totalSets} série${totalSets > 1 ? 's' : ''} enregistrée${totalSets > 1 ? 's' : ''}`, 'success', 3000);
    if (window.HapticFeedback) HapticFeedback.success();
}

// ==================== EXPORTS GLOBAUX ====================
window.quickStartSession = quickStartSession;
window.showSessionPreview = showSessionPreview;
window.closeSessionPreview = closeSessionPreview;
window.startSessionFromPreview = startSessionFromPreview;
window.showDurationPicker = showDurationPicker;
window.closeDurationPicker = closeDurationPicker;
window.selectDuration = selectDuration;
window.filterExercisesByDuration = filterExercisesByDuration;
window.saveSessionTemplate = saveSessionTemplate;
window.getSessionTemplate = getSessionTemplate;
window.duplicateSession = duplicateSession;
window.startSessionFromTemplate = startSessionFromTemplate;
window.updateTemplate = updateTemplate;
window.deleteTemplate = deleteTemplate;
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
window.openQuickLogSheet = openQuickLogSheet;
window.closeQuickLogSheet = closeQuickLogSheet;
window.openExercisePickerForQuickLog = openExercisePickerForQuickLog;
window.setQuickLogExercise = setQuickLogExercise;
window.addSetToQuickLog = addSetToQuickLog;
window.removeSetFromQuickLog = removeSetFromQuickLog;
window.quickLogSetChanged = quickLogSetChanged;
window.saveQuickLogSession = saveQuickLogSession;
window.deduplicateSessions = deduplicateSessions;
window.autoDeduplicatePeriodic = autoDeduplicatePeriodic;
window.renderSessionPreviewUI = renderSessionPreviewUI;
window.generateSessionBrief = generateSessionBrief;
window.renderFreeSessionExercises = renderFreeSessionExercises;

console.log('✅ training-builder.js: Builder, templates, quick log exportés');
