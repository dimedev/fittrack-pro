// ==================== TRAINING SHARED (État partagé, helpers, constantes) ====================
// Ce module contient l'état partagé entre tous les sous-modules training-*.
// Chargé en PREMIER dans l'ordre des scripts.

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
var OverflowManager = {
    lock: function() { if (window.ModalManager) ModalManager.lock('training-overflow'); },
    unlock: function() { if (window.ModalManager) ModalManager.unlock('training-overflow'); },
    forceUnlock: function() { if (window.ModalManager) ModalManager.forceUnlockAll(); },
    isLocked: function() { return window.ModalManager ? ModalManager.isLocked() : false; }
};

window.OverflowManager = OverflowManager;

// Failsafe: reset quand on change de section (navigation)
document.addEventListener('click', function(e) {
    var navItem = e.target.closest('.bottom-nav-item, .nav-tab');
    if (navItem && window.ModalManager && ModalManager.isLocked()) {
        console.log('🔄 Navigation détectée - reset ModalManager');
        ModalManager.forceUnlockAll();
    }
});

// ==================== SESSION PREVIEW STATE ====================
let previewSession = {
    splitIndex: null,
    splitName: '',
    exercises: [], // { originalName, muscle, sets, reps, swappedId, swappedName, isModified }
    hasChanges: false
};

// ==================== FLAGS & STATE PARTAGÉS ====================

/** Flag pour savoir si le swap est en mode full-screen */
let _fsSwapMode = false;

/** Flag pour savoir si le swap est en mode sélection (séance libre) */
let _freePickerMode = false;

/** Index du split courant dans le programme */
let _currentProgramSplitIndex = 0;

/** État du builder de séance libre */
let freeSessionBuilder = { name: '', exercises: [] };

/** Variable pour stocker le swap en attente (pour confirmation des paramètres) */
let pendingSwap = null;

/** Flag pour que le picker sache qu'on est en mode Quick Log */
let _quickLogPickerMode = false;

/** State du Quick Log */
let quickLogState = { exercise: null, sets: [] };

// ==================== TIMER STATE ====================
let fsTimerInterval = null;
let fsTimerSeconds = 0;
let fsTimerTarget = 90;
let fsTimerEndTime = 0; // Timestamp de fin pour calcul précis
let fsRestTimerFullscreen = true;
let restPauseTimerInterval = null;

// ==================== SESSION PERSISTENCE ====================
let fsSessionSaveInterval = null;

// ==================== GIF STATE ====================
let gifPaused = false;
let cachedGifSrc = null;

// ==================== SWIPE STATE ====================
let exerciseSheetSwipeInitialized = false;
var swipeStartY = 0;
var swipeCurrentY = 0;
var isSwipeDragging = false;

let swapSheetSwipeInitialized = false;
var swapSwipeStartY = 0;
var swapSwipeCurrentY = 0;
var isSwapSwipeDragging = false;

let _navigatorSwipeInit = false;

// ==================== BODYWEIGHT UTILITIES ====================

/**
 * Trouve un exercice dans state.exercises par son nom
 */
function findExerciseByName(name) {
    if (!state.exercises || !name) return null;
    // Exact match
    var found = state.exercises.find(function(ex) { return ex.name === name || ex.id === name; });
    if (found) return found;
    // Fallback: si c'est une variante "Exercice - Variante", chercher le nom de base
    var dashIdx = name.lastIndexOf(' - ');
    if (dashIdx > 0) {
        var baseName = name.substring(0, dashIdx);
        found = state.exercises.find(function(ex) { return ex.name === baseName || ex.id === baseName; });
        if (found) return found;
    }
    return null;
}

/**
 * Retourne le poids effectif pour le calcul de volume.
 * Pour les exercices bodyweight : poids du corps + lest (si > 0) ou poids du corps - assistance (si < 0)
 */
function getEffectiveWeight(exerciseName, inputWeight) {
    var exercise = findExerciseByName(exerciseName);
    if (!exercise || exercise.equipment !== 'bodyweight') {
        return inputWeight;
    }
    var bodyWeight = (state.profile && state.profile.weight) ? state.profile.weight : 70;
    if (inputWeight === 0) {
        return bodyWeight;
    }
    if (inputWeight > 0) {
        return bodyWeight + inputWeight; // Lesté
    }
    // inputWeight < 0 = assistance (ex: tractions assistées)
    return Math.max(0, bodyWeight + inputWeight);
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
    var compoundKeywords = [
        'développé', 'squat', 'soulevé', 'rowing', 'tirage', 'presse',
        'dips', 'tractions', 'fentes', 'hip thrust', 'bench', 'deadlift'
    ];
    var nameLower = exerciseName.toLowerCase();
    return compoundKeywords.some(function(kw) { return nameLower.includes(kw); });
}

// ==================== UTILITY FUNCTIONS ====================

function getExerciseIdByName(name, muscle) {
    muscle = muscle || null;
    // 1. Recherche exacte
    var exercise = defaultExercises.find(function(e) { return e.name === name; });
    if (exercise) return exercise.id;

    // 2. Recherche partielle avec muscle (si fourni)
    if (muscle) {
        exercise = defaultExercises.find(function(e) {
            return e.muscle === muscle && e.name.toLowerCase().includes(name.toLowerCase());
        });
        if (exercise) return exercise.id;
    }

    // 3. Recherche partielle sans muscle
    exercise = defaultExercises.find(function(e) {
        return e.name.toLowerCase().includes(name.toLowerCase());
    });
    if (exercise) return exercise.id;

    // 4. Recherche inverse (le nom du programme est dans le nom de l'exercice)
    exercise = defaultExercises.find(function(e) {
        return name.toLowerCase().includes(e.name.toLowerCase().split(' ')[0]) &&
            (!muscle || e.muscle === muscle);
    });

    return exercise ? exercise.id : null;
}

function getEffectiveExerciseName(originalName, muscle) {
    var swapKey = '' + originalName;
    if (state.exerciseSwaps && state.exerciseSwaps[swapKey]) {
        var swappedExercise = state.exercises.find(function(e) { return e.id === state.exerciseSwaps[swapKey]; });
        if (swappedExercise) {
            return swappedExercise.name;
        }
    }
    return originalName;
}

function getLastLog(exerciseName) {
    if (!state.progressLog) return null;

    // Multi-gym : on filtre par la salle active pour "dernière fois ici"
    var activeGymId = state.activeGymId || null;
    var logs = typeof findProgressLogs === 'function'
        ? findProgressLogs(exerciseName, activeGymId)
        : (state.progressLog[exerciseName] || []).filter(function (l) { return (l.gymId == null ? null : l.gymId) === activeGymId; });

    if (!logs || logs.length === 0) return null;

    return logs[logs.length - 1];
}

/**
 * Obtenir le muscle d'un exercice par son nom
 * @param {string} exerciseName - Nom de l'exercice
 * @returns {string} Groupe musculaire
 */
function getMuscleForExercise(exerciseName) {
    var exercise = state.exercises ? state.exercises.find(function(ex) {
        return ex.name.toLowerCase() === exerciseName.toLowerCase();
    }) : null;
    return exercise ? (exercise.muscle || 'unknown') : 'unknown';
}

// ==================== SESSION PERSISTENCE ====================

/**
 * Sauvegarde fsSession dans localStorage
 */
function saveFsSessionToStorage() {
    if (!fsSession.active) return;

    try {
        var sessionData = Object.assign({}, fsSession, { savedAt: Date.now() });
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
    var indicator = document.getElementById('fs-save-indicator');

    if (!indicator) {
        // Créer l'indicateur s'il n'existe pas
        indicator = document.createElement('div');
        indicator.id = 'fs-save-indicator';
        indicator.style.cssText = 'position: fixed; top: 60px; right: 12px; background: rgba(34, 197, 94, 0.9); color: white; padding: 6px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 500; display: flex; align-items: center; gap: 6px; z-index: 10000; opacity: 0; transform: translateY(-10px); transition: all 0.3s ease; pointer-events: none;';
        indicator.innerHTML = '<span>💾</span><span>Sauvegardé</span>';
        document.body.appendChild(indicator);
    }

    // Animer l'apparition
    requestAnimationFrame(function() {
        indicator.style.opacity = '1';
        indicator.style.transform = 'translateY(0)';
    });

    // Masquer après 1.5s
    setTimeout(function() {
        indicator.style.opacity = '0';
        indicator.style.transform = 'translateY(-10px)';
    }, 1500);
}

/**
 * Charge fsSession depuis localStorage
 */
function loadFsSessionFromStorage() {
    try {
        var saved = localStorage.getItem('pendingFsSession');
        if (!saved) return null;

        var sessionData = JSON.parse(saved);
        // V6-PATCH : timeout étendu à 7 jours (vs 24h silencieux qui détruisait
        // les séances oubliées d'un jour sur l'autre). On notifie l'user
        // visuellement à la restauration via showToast (training.js).
        var TIMEOUT_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours
        if (Date.now() - sessionData.savedAt > TIMEOUT_MS) {
            console.log('🕒 Session locale > 7 jours, archivée et nettoyée');
            localStorage.removeItem('pendingFsSession');
            return null;
        }

        // Marqueur pour que training.js sache afficher un toast de reprise
        sessionData._isRestored = true;
        sessionData._restoredFromAgeMs = Date.now() - sessionData.savedAt;

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
    fsSessionSaveInterval = setInterval(function() {
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
    var savedSession = loadFsSessionFromStorage();
    if (!savedSession) return Promise.resolve();

    // Proposer à l'utilisateur de restaurer
    var elapsedMinutes = Math.floor((Date.now() - savedSession.startTime) / 60000);

    return (typeof showConfirmModal === 'function' ? showConfirmModal({
        title: 'Séance en cours',
        message: 'Tu as une séance "' + savedSession.splitName + '" en cours (' + elapsedMinutes + ' min). Reprendre ?',
        icon: '🔄',
        confirmLabel: 'Reprendre',
        cancelLabel: 'Supprimer'
    }) : Promise.resolve(false)).then(function(confirmed) {
        if (confirmed) {
            // Restaurer la session
            fsSession = savedSession;

            // Migration : initialiser les champs manquants (sessions pré-v30)
            if (!fsSession.supersets) fsSession.supersets = [];
            if (!fsSession.currentSuperset) fsSession.currentSuperset = null;
            if (!fsSession.supersetPhase) fsSession.supersetPhase = null;
            if (!fsSession.isDropMode) fsSession.isDropMode = false;

            // Afficher l'UI
            var fsElement = document.getElementById('fullscreen-session');
            if (fsElement) {
                fsElement.style.display = 'flex';
                OverflowManager.lock();

                // Masquer la nav
                var nav = document.querySelector('.nav');
                var mobileNav = document.querySelector('.mobile-nav');
                if (nav) nav.style.display = 'none';
                if (mobileNav) mobileNav.style.display = 'none';

                // Rendre l'exercice courant
                if (typeof renderCurrentExercise === 'function') renderCurrentExercise();

                // Reprendre la sauvegarde auto
                startAutoSaveFsSession();

                console.log('✅ Séance restaurée');
            }
        } else {
            // Utilisateur refuse, supprimer la sauvegarde
            clearFsSessionFromStorage();
        }
    });
}

// ==================== EXPORTS GLOBAUX ====================

// Constantes
window.CYCLE_PRESETS = CYCLE_PRESETS;

// Helpers
window.findExerciseByName = findExerciseByName;
window.getEffectiveWeight = getEffectiveWeight;
window.formatVolume = formatVolume;
window.isCompoundExercise = isCompoundExercise;
window.getExerciseIdByName = getExerciseIdByName;
window.getEffectiveExerciseName = getEffectiveExerciseName;
window.getLastLog = getLastLog;
window.getMuscleForExercise = getMuscleForExercise;

// Persistence
window.saveFsSessionToStorage = saveFsSessionToStorage;
window.loadFsSessionFromStorage = loadFsSessionFromStorage;
window.clearFsSessionFromStorage = clearFsSessionFromStorage;
window.startAutoSaveFsSession = startAutoSaveFsSession;
window.stopAutoSaveFsSession = stopAutoSaveFsSession;
window.tryRestorePendingSession = tryRestorePendingSession;

// État partagé via getters dynamiques (rétro-compat)
Object.defineProperty(window, 'fsSession', { get: function() { return fsSession; }, set: function(v) { Object.assign(fsSession, v); }, configurable: true });
Object.defineProperty(window, 'previewSession', { get: function() { return previewSession; }, set: function(v) { Object.assign(previewSession, v); }, configurable: true });
Object.defineProperty(window, 'wizardState', { get: function() { return wizardState; }, configurable: true });
Object.defineProperty(window, '_currentProgramSplitIndex', { get: function() { return _currentProgramSplitIndex; }, set: function(v) { _currentProgramSplitIndex = v; }, configurable: true });
Object.defineProperty(window, '_fsSwapMode', { get: function() { return _fsSwapMode; }, set: function(v) { _fsSwapMode = v; }, configurable: true });
Object.defineProperty(window, '_freePickerMode', { get: function() { return _freePickerMode; }, set: function(v) { _freePickerMode = v; }, configurable: true });
Object.defineProperty(window, '_quickLogPickerMode', { get: function() { return _quickLogPickerMode; }, set: function(v) { _quickLogPickerMode = v; }, configurable: true });
Object.defineProperty(window, 'pendingSwap', { get: function() { return pendingSwap; }, set: function(v) { pendingSwap = v; }, configurable: true });
Object.defineProperty(window, 'freeSessionBuilder', { get: function() { return freeSessionBuilder; }, set: function(v) { freeSessionBuilder = v; }, configurable: true });
Object.defineProperty(window, 'quickLogState', { get: function() { return quickLogState; }, set: function(v) { quickLogState = v; }, configurable: true });
Object.defineProperty(window, 'fsTimerInterval', { get: function() { return fsTimerInterval; }, set: function(v) { fsTimerInterval = v; }, configurable: true });
Object.defineProperty(window, 'fsTimerSeconds', { get: function() { return fsTimerSeconds; }, set: function(v) { fsTimerSeconds = v; }, configurable: true });
Object.defineProperty(window, 'fsTimerTarget', { get: function() { return fsTimerTarget; }, set: function(v) { fsTimerTarget = v; }, configurable: true });
Object.defineProperty(window, 'fsTimerEndTime', { get: function() { return fsTimerEndTime; }, set: function(v) { fsTimerEndTime = v; }, configurable: true });
Object.defineProperty(window, 'fsRestTimerFullscreen', { get: function() { return fsRestTimerFullscreen; }, set: function(v) { fsRestTimerFullscreen = v; }, configurable: true });
Object.defineProperty(window, 'restPauseTimerInterval', { get: function() { return restPauseTimerInterval; }, set: function(v) { restPauseTimerInterval = v; }, configurable: true });
Object.defineProperty(window, 'fsSessionSaveInterval', { get: function() { return fsSessionSaveInterval; }, set: function(v) { fsSessionSaveInterval = v; }, configurable: true });
Object.defineProperty(window, 'gifPaused', { get: function() { return gifPaused; }, set: function(v) { gifPaused = v; }, configurable: true });
Object.defineProperty(window, 'cachedGifSrc', { get: function() { return cachedGifSrc; }, set: function(v) { cachedGifSrc = v; }, configurable: true });
Object.defineProperty(window, 'exerciseSheetSwipeInitialized', { get: function() { return exerciseSheetSwipeInitialized; }, set: function(v) { exerciseSheetSwipeInitialized = v; }, configurable: true });
Object.defineProperty(window, 'swapSheetSwipeInitialized', { get: function() { return swapSheetSwipeInitialized; }, set: function(v) { swapSheetSwipeInitialized = v; }, configurable: true });
Object.defineProperty(window, '_navigatorSwipeInit', { get: function() { return _navigatorSwipeInit; }, set: function(v) { _navigatorSwipeInit = v; }, configurable: true });

// Service Registry
if (typeof Services !== 'undefined') {
    Services.registerAll({
        findExerciseByName: findExerciseByName,
        getEffectiveWeight: getEffectiveWeight,
        formatVolume: formatVolume,
        isCompoundExercise: isCompoundExercise,
        getExerciseIdByName: getExerciseIdByName,
        getEffectiveExerciseName: getEffectiveExerciseName,
        tryRestorePendingSession: tryRestorePendingSession
    });
}

console.log('✅ training-shared.js: État partagé et helpers exportés');
