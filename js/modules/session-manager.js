// ==================== SESSION MANAGER ====================
// Gestion centralisée des sessions d'entraînement
// Fonctionnalités : CRUD exercices, copie de séance, sauvegarde temps réel

/**
 * @typedef {Object} SessionSet
 * @property {string} id - Identifiant unique du set
 * @property {number} weight - Poids en kg
 * @property {number} reps - Nombre de répétitions
 * @property {boolean} completed - Si la série est validée
 * @property {number} [timestamp] - Timestamp de completion
 */

/**
 * @typedef {Object} SessionExercise
 * @property {string} id - Identifiant unique
 * @property {string} originalName - Nom original du programme
 * @property {string} effectiveName - Nom après swap éventuel
 * @property {number} order - Position dans la séance
 * @property {number} targetSets - Nombre de séries cibles
 * @property {string} targetReps - Reps cibles (ex: "8-10")
 * @property {string} muscle - Groupe musculaire
 * @property {SessionSet[]} sets - Séries réalisées
 */

/**
 * @typedef {Object} ActiveSession
 * @property {string} id - UUID de la session
 * @property {string} date - Date ISO (YYYY-MM-DD)
 * @property {number} dayIndex - Index du jour dans le split
 * @property {string} dayType - Type de jour (Push, Pull, etc.)
 * @property {string} program - ID du programme
 * @property {number} startedAt - Timestamp de début
 * @property {SessionExercise[]} exercises - Liste des exercices
 * @property {boolean} isDirty - Modifications non sauvegardées
 * @property {number|null} lastSavedAt - Dernier timestamp de sauvegarde
 */

const SessionManager = (function() {
    
    // ==================== UTILITIES ====================
    
    /**
     * Génère un UUID simple
     */
    function generateId() {
        return 'id-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }
    
    /**
     * Debounce pour auto-save
     */
    function debounce(fn, delay) {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => fn.apply(this, args), delay);
        };
    }
    
    // ==================== SESSION LIFECYCLE ====================
    
    /**
     * Initialise une nouvelle session active à partir du programme sélectionné
     * @param {number} dayIndex - Index du jour dans le split
     * @returns {ActiveSession|null}
     */
    function initSession(dayIndex) {
        console.log('🔄 SessionManager.initSession:', { 
            dayIndex, 
            selectedProgram: state.selectedProgram,
            trainingDays: state.trainingDays 
        });
        
        if (!state.selectedProgram) {
            console.warn('SessionManager: Aucun programme sélectionné');
            return null;
        }
        
        const program = trainingPrograms[state.selectedProgram];
        if (!program) {
            console.warn('SessionManager: Programme non trouvé:', state.selectedProgram);
            console.log('Programmes disponibles:', Object.keys(trainingPrograms));
            return null;
        }
        
        const split = program.splits[state.trainingDays];
        if (!split || !split[dayIndex]) {
            console.warn('SessionManager: Configuration invalide', { split, dayIndex, trainingDays: state.trainingDays });
            return null;
        }
        
        const dayType = split[dayIndex];
        const programExercises = program.exercises[dayType] || [];
        
        console.log('📋 SessionManager: Chargement des exercices pour', dayType, ':', programExercises.length, 'exercices');
        
        // Construire la liste des exercices
        const exercises = programExercises.map((ex, idx) => {
            const effectiveName = getEffectiveExerciseName(ex.name, ex.muscle);
            const lastLog = getLastLog(effectiveName);
            const suggestedWeight = lastLog?.weight || '';
            
            // Créer les séries vides pré-remplies
            const sets = [];
            for (let i = 0; i < ex.sets; i++) {
                sets.push({
                    id: generateId(),
                    weight: suggestedWeight || 0,
                    reps: 0,
                    completed: false,
                    timestamp: null
                });
            }
            
            return {
                id: generateId(),
                originalName: ex.name,
                effectiveName: effectiveName,
                order: idx,
                targetSets: ex.sets,
                targetReps: ex.reps,
                muscle: ex.muscle,
                sets: sets
            };
        });
        
        const session = {
            id: generateId(),
            date: new Date().toISOString().split('T')[0],
            dayIndex: dayIndex,
            dayType: dayType,
            program: state.selectedProgram,
            startedAt: Date.now(),
            exercises: exercises,
            isDirty: false,
            lastSavedAt: null
        };
        
        // Stocker en state
        state.activeSession = session;
        saveState();
        
        console.log('✅ SessionManager: Session initialisée', session.id);
        return session;
    }
    
    /**
     * Récupère la session active ou la crée si inexistante
     * @param {number} dayIndex
     * @returns {ActiveSession|null}
     */
    function getOrCreateSession(dayIndex) {
        // Vérifier si une session existe déjà pour aujourd'hui, ce jour ET le même programme
        if (state.activeSession && 
            state.activeSession.date === new Date().toISOString().split('T')[0] &&
            state.activeSession.dayIndex === dayIndex &&
            state.activeSession.program === state.selectedProgram) {
            return state.activeSession;
        }
        
        // Si le programme ou le jour a changé, réinitialiser
        return initSession(dayIndex);
    }
    
    /**
     * Réinitialise la session active
     */
    function clearActiveSession() {
        state.activeSession = null;
        saveState();
    }
    
    // ==================== EXERCISE CRUD ====================
    
    /**
     * Supprime un exercice de la session active
     * @param {string} exerciseId - ID de l'exercice à supprimer
     * @returns {boolean} Succès de l'opération
     */
    function deleteExercise(exerciseId) {
        if (!state.activeSession) {
            console.warn('SessionManager: Pas de session active');
            return false;
        }
        
        const index = state.activeSession.exercises.findIndex(ex => ex.id === exerciseId);
        if (index === -1) {
            console.warn('SessionManager: Exercice non trouvé', exerciseId);
            return false;
        }
        
        // Supprimer l'exercice
        const removed = state.activeSession.exercises.splice(index, 1)[0];
        
        // Réordonner les exercices restants
        state.activeSession.exercises.forEach((ex, idx) => {
            ex.order = idx;
        });
        
        // Marquer comme dirty
        state.activeSession.isDirty = true;
        
        // Auto-save debounced
        debouncedSave();
        
        // Émettre un événement pour mettre à jour l'UI
        emitSessionUpdate('exercise-deleted', { exerciseId, removed });
        
        console.log('✅ SessionManager: Exercice supprimé', removed.effectiveName);
        return true;
    }
    
    /**
     * Ajoute un exercice à la session active
     * @param {Object} exerciseData - Données de l'exercice
     * @param {number} [position] - Position d'insertion (fin par défaut)
     * @returns {SessionExercise|null}
     */
    function addExercise(exerciseData, position = null) {
        if (!state.activeSession) {
            console.warn('SessionManager: Pas de session active');
            return null;
        }
        
        const exercise = {
            id: generateId(),
            originalName: exerciseData.name,
            effectiveName: exerciseData.effectiveName || exerciseData.name,
            order: position !== null ? position : state.activeSession.exercises.length,
            targetSets: exerciseData.sets || 3,
            targetReps: exerciseData.reps || '10-12',
            muscle: exerciseData.muscle || 'other',
            sets: []
        };
        
        // Créer les séries vides
        for (let i = 0; i < exercise.targetSets; i++) {
            exercise.sets.push({
                id: generateId(),
                weight: 0,
                reps: 0,
                completed: false,
                timestamp: null
            });
        }
        
        // Insérer à la position
        if (position !== null && position < state.activeSession.exercises.length) {
            state.activeSession.exercises.splice(position, 0, exercise);
            // Réordonner
            state.activeSession.exercises.forEach((ex, idx) => {
                ex.order = idx;
            });
        } else {
            state.activeSession.exercises.push(exercise);
        }
        
        state.activeSession.isDirty = true;
        debouncedSave();
        emitSessionUpdate('exercise-added', { exercise });
        
        return exercise;
    }
    
    /**
     * Réordonne un exercice dans la session
     * @param {string} exerciseId - ID de l'exercice
     * @param {number} newPosition - Nouvelle position
     */
    function reorderExercise(exerciseId, newPosition) {
        if (!state.activeSession) return false;
        
        const exercises = state.activeSession.exercises;
        const currentIndex = exercises.findIndex(ex => ex.id === exerciseId);
        
        if (currentIndex === -1 || newPosition < 0 || newPosition >= exercises.length) {
            return false;
        }
        
        // Retirer l'exercice de sa position actuelle
        const [exercise] = exercises.splice(currentIndex, 1);
        
        // L'insérer à la nouvelle position
        exercises.splice(newPosition, 0, exercise);
        
        // Mettre à jour les ordres
        exercises.forEach((ex, idx) => {
            ex.order = idx;
        });
        
        state.activeSession.isDirty = true;
        debouncedSave();
        emitSessionUpdate('exercise-reordered', { exerciseId, newPosition });
        
        return true;
    }
    
    // ==================== SET MANAGEMENT ====================
    
    /**
     * Met à jour une série
     * @param {string} exerciseId
     * @param {string} setId
     * @param {Partial<SessionSet>} updates
     */
    function updateSet(exerciseId, setId, updates) {
        if (!state.activeSession) return null;
        
        const exercise = state.activeSession.exercises.find(ex => ex.id === exerciseId);
        if (!exercise) return null;
        
        const set = exercise.sets.find(s => s.id === setId);
        if (!set) return null;
        
        // Appliquer les mises à jour
        Object.assign(set, updates);
        
        // Si on complète une série, ajouter le timestamp
        if (updates.completed === true && !set.timestamp) {
            set.timestamp = Date.now();
        }
        
        state.activeSession.isDirty = true;
        debouncedSave();
        emitSessionUpdate('set-updated', { exerciseId, setId, updates });
        
        return set;
    }
    
    /**
     * Ajoute une série à un exercice
     * @param {string} exerciseId
     * @param {Partial<SessionSet>} [initialData]
     */
    function addSet(exerciseId, initialData = {}) {
        if (!state.activeSession) return null;
        
        const exercise = state.activeSession.exercises.find(ex => ex.id === exerciseId);
        if (!exercise) return null;
        
        // Récupérer les valeurs de la dernière série comme défaut
        const lastSet = exercise.sets[exercise.sets.length - 1];
        
        const newSet = {
            id: generateId(),
            weight: initialData.weight ?? lastSet?.weight ?? 0,
            reps: initialData.reps ?? 0,
            completed: false,
            timestamp: null
        };
        
        exercise.sets.push(newSet);
        exercise.targetSets = exercise.sets.length;
        
        state.activeSession.isDirty = true;
        debouncedSave();
        emitSessionUpdate('set-added', { exerciseId, set: newSet });
        
        return newSet;
    }
    
    /**
     * Supprime une série d'un exercice
     * @param {string} exerciseId
     * @param {string} setId
     */
    function deleteSet(exerciseId, setId) {
        if (!state.activeSession) return false;
        
        const exercise = state.activeSession.exercises.find(ex => ex.id === exerciseId);
        if (!exercise) return false;
        
        const index = exercise.sets.findIndex(s => s.id === setId);
        if (index === -1) return false;
        
        exercise.sets.splice(index, 1);
        
        state.activeSession.isDirty = true;
        debouncedSave();
        emitSessionUpdate('set-deleted', { exerciseId, setId });
        
        return true;
    }
    
    // ==================== COPY SESSION ====================
    
    /**
     * Copie une session de l'historique vers la session active
     * @param {string} sessionId - ID de la session source dans l'historique
     * @param {string} [targetDate] - Date cible (aujourd'hui par défaut)
     * @returns {ActiveSession|null}
     */
    function copySession(sessionId, targetDate = null) {
        // Trouver la session source
        const sourceSession = state.sessionHistory.find(s => 
            s.id === sessionId || s.timestamp?.toString() === sessionId
        );
        
        if (!sourceSession) {
            console.warn('SessionManager: Session source non trouvée');
            return null;
        }
        
        const date = targetDate || new Date().toISOString().split('T')[0];
        
        // Créer la nouvelle session
        const newSession = {
            id: generateId(),
            date: date,
            dayIndex: sourceSession.dayIndex ?? 0,
            dayType: sourceSession.day || sourceSession.dayType || 'Copie',
            program: sourceSession.program || state.selectedProgram,
            startedAt: Date.now(),
            exercises: [],
            isDirty: true,
            lastSavedAt: null,
            copiedFrom: sessionId
        };
        
        // Copier les exercices avec leurs données
        (sourceSession.exercises || []).forEach((ex, idx) => {
            const exerciseName = ex.exercise || ex.name;
            
            const newExercise = {
                id: generateId(),
                originalName: exerciseName,
                effectiveName: exerciseName,
                order: idx,
                targetSets: Array.isArray(ex.sets) ? ex.sets.length : (ex.sets || 3),
                targetReps: ex.targetReps || '10-12',
                muscle: ex.muscle || 'other',
                sets: []
            };
            
            // Copier les données des séries
            if (Array.isArray(ex.sets)) {
                ex.sets.forEach((set, setIdx) => {
                    newExercise.sets.push({
                        id: generateId(),
                        weight: set.weight || 0,
                        reps: 0, // Reps à 0 car c'est une nouvelle séance
                        completed: false,
                        timestamp: null
                    });
                });
            } else {
                // Ancien format
                const numSets = ex.sets || 3;
                for (let i = 0; i < numSets; i++) {
                    newExercise.sets.push({
                        id: generateId(),
                        weight: ex.weight || 0,
                        reps: 0,
                        completed: false,
                        timestamp: null
                    });
                }
            }
            
            newSession.exercises.push(newExercise);
        });
        
        state.activeSession = newSession;
        saveState();
        emitSessionUpdate('session-copied', { source: sessionId, newSession });
        
        console.log('✅ SessionManager: Session copiée depuis', sessionId);
        return newSession;
    }
    
    /**
     * Copie la dernière séance du même type de jour
     * @param {string} dayType - Type de jour (Push, Pull, Legs, etc.)
     * @returns {ActiveSession|null}
     */
    function copyLastSessionOfType(dayType) {
        // Trouver la dernière séance de ce type
        const lastSession = state.sessionHistory.find(s => 
            (s.day || s.dayType || '').includes(dayType)
        );
        
        if (!lastSession) {
            console.warn('SessionManager: Aucune séance précédente de type', dayType);
            return null;
        }
        
        return copySession(lastSession.id || lastSession.timestamp?.toString());
    }
    
    /**
     * Copie une séance d'une semaine spécifique
     * @param {number} weeksAgo - Nombre de semaines en arrière
     * @param {number} dayIndex - Index du jour dans la semaine
     */
    function copySessionFromWeek(weeksAgo, dayIndex) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() - (weeksAgo * 7));
        const dateStr = targetDate.toISOString().split('T')[0];
        
        // Trouver une session proche de cette date
        const session = state.sessionHistory.find(s => {
            const sessionDate = new Date(s.date);
            const diffDays = Math.abs((new Date(dateStr) - sessionDate) / (1000 * 60 * 60 * 24));
            return diffDays <= 3 && (s.dayIndex === dayIndex || !s.dayIndex);
        });
        
        if (session) {
            return copySession(session.id || session.timestamp?.toString());
        }
        
        return null;
    }
    
    // ==================== STATISTICS ====================
    
    /**
     * Calcule le volume total de la session active
     * @returns {Object} { totalVolume, totalSets, totalReps, exerciseStats }
     */
    function calculateSessionStats() {
        if (!state.activeSession) {
            return { totalVolume: 0, totalSets: 0, totalReps: 0, exerciseStats: [] };
        }
        
        let totalVolume = 0;
        let totalSets = 0;
        let totalReps = 0;
        const exerciseStats = [];
        
        state.activeSession.exercises.forEach(exercise => {
            let exVolume = 0;
            let exSets = 0;
            let exReps = 0;
            
            exercise.sets.forEach(set => {
                if (set.completed && set.weight > 0 && set.reps > 0) {
                    const volume = set.weight * set.reps;
                    exVolume += volume;
                    exSets++;
                    exReps += set.reps;
                }
            });
            
            totalVolume += exVolume;
            totalSets += exSets;
            totalReps += exReps;
            
            exerciseStats.push({
                id: exercise.id,
                name: exercise.effectiveName,
                volume: exVolume,
                sets: exSets,
                reps: exReps,
                avgWeight: exSets > 0 ? Math.round(exVolume / exReps * 10) / 10 : 0
            });
        });
        
        return {
            totalVolume: Math.round(totalVolume),
            totalSets,
            totalReps,
            exerciseStats
        };
    }
    
    /**
     * Compare la session actuelle avec la dernière session similaire
     */
    function compareWithLastSession() {
        if (!state.activeSession) return null;
        
        const currentStats = calculateSessionStats();
        const dayType = state.activeSession.dayType;
        
        // Trouver la dernière session du même type
        const lastSession = state.sessionHistory.find(s => 
            s.day === dayType || s.dayType === dayType
        );
        
        if (!lastSession) return { current: currentStats, previous: null, diff: null };
        
        // Calculer les stats de la session précédente
        let prevVolume = 0;
        let prevSets = 0;
        let prevReps = 0;
        
        (lastSession.exercises || []).forEach(ex => {
            if (Array.isArray(ex.sets)) {
                ex.sets.forEach(set => {
                    if (set.completed !== false && set.weight > 0 && set.reps > 0) {
                        prevVolume += set.weight * set.reps;
                        prevSets++;
                        prevReps += set.reps;
                    }
                });
            } else {
                prevVolume += (ex.weight || 0) * (ex.achievedReps || 0);
                prevSets += ex.sets || 0;
                prevReps += ex.achievedReps || 0;
            }
        });
        
        return {
            current: currentStats,
            previous: { totalVolume: prevVolume, totalSets: prevSets, totalReps: prevReps },
            diff: {
                volume: currentStats.totalVolume - prevVolume,
                volumePercent: prevVolume > 0 ? Math.round((currentStats.totalVolume - prevVolume) / prevVolume * 100) : 0,
                sets: currentStats.totalSets - prevSets,
                reps: currentStats.totalReps - prevReps
            }
        };
    }
    
    // ==================== SAVE & SYNC ====================
    
    /**
     * Sauvegarde la session active (appelé en debounce)
     */
    function saveActiveSession() {
        if (!state.activeSession || !state.activeSession.isDirty) return;
        
        state.activeSession.isDirty = false;
        state.activeSession.lastSavedAt = Date.now();
        saveState();
        
        console.log('💾 SessionManager: Session auto-sauvegardée');
    }
    
    // Debounced save (500ms)
    const debouncedSave = debounce(saveActiveSession, 500);
    
    /**
     * Finalise et sauvegarde la session dans l'historique
     * @returns {Object|null} Session sauvegardée
     */
    function finalizeSession() {
        if (!state.activeSession) {
            console.warn('SessionManager: Pas de session à finaliser');
            return null;
        }
        
        const session = state.activeSession;
        const sessionData = [];
        const newPRs = [];
        const today = session.date;
        
        // Vérifier qu'il y a des données
        let hasData = false;
        
        session.exercises.forEach(exercise => {
            const setsData = [];
            
            exercise.sets.forEach((set, idx) => {
                if (set.weight > 0 || set.reps > 0 || set.completed) {
                    hasData = true;
                    setsData.push({
                        setNumber: idx + 1,
                        weight: set.weight,
                        reps: set.reps,
                        completed: set.completed
                    });
                    
                    // Vérifier PRs
                    if (set.weight > 0 && set.reps > 0 && typeof checkForNewPR === 'function') {
                        const prCheck = checkForNewPR(exercise.effectiveName, set.weight, set.reps);
                        if (prCheck.isNewPR) {
                            const existing = newPRs.find(p => p.exercise === exercise.effectiveName);
                            if (!existing) {
                                newPRs.push({ exercise: exercise.effectiveName, ...prCheck });
                            }
                        }
                    }
                }
            });
            
            if (setsData.length > 0) {
                // Mettre à jour progressLog
                if (!state.progressLog[exercise.effectiveName]) {
                    state.progressLog[exercise.effectiveName] = [];
                }
                
                const avgWeight = setsData.reduce((sum, s) => sum + s.weight, 0) / setsData.length;
                const totalReps = setsData.reduce((sum, s) => sum + s.reps, 0);
                const completedSets = setsData.filter(s => s.completed).length;
                
                state.progressLog[exercise.effectiveName].push({
                    date: today,
                    sets: setsData.length,
                    weight: Math.round(avgWeight * 10) / 10,
                    achievedReps: totalReps,
                    achievedSets: completedSets,
                    setsDetail: setsData
                });
                
                sessionData.push({
                    exercise: exercise.effectiveName,
                    sets: setsData
                });
            }
        });
        
        if (!hasData) {
            console.warn('SessionManager: Aucune donnée à sauvegarder');
            return null;
        }
        
        // Sauvegarder dans l'historique
        const historyEntry = {
            id: session.id,
            date: today,
            timestamp: Date.now(),
            program: session.program,
            day: session.dayType,
            dayIndex: session.dayIndex,
            exercises: sessionData
        };
        
        state.sessionHistory.unshift(historyEntry);
        state.sessionHistory = state.sessionHistory.slice(0, 100);
        
        // Nettoyer la session active
        state.activeSession = null;
        
        saveState();
        
        // Sync Supabase si connecté
        if (typeof isLoggedIn === 'function' && isLoggedIn()) {
            saveWorkoutSessionToSupabase(historyEntry).catch(err => {
                console.error('Erreur sync Supabase:', err);
            });
        }
        
        emitSessionUpdate('session-finalized', { session: historyEntry, newPRs });
        
        return { session: historyEntry, newPRs };
    }
    
    // ==================== EVENTS ====================
    
    const eventListeners = new Map();
    
    /**
     * Émet un événement de mise à jour de session
     */
    function emitSessionUpdate(eventType, data) {
        const listeners = eventListeners.get(eventType) || [];
        listeners.forEach(callback => {
            try {
                callback(data);
            } catch (e) {
                console.error('SessionManager event error:', e);
            }
        });
        
        // Émettre aussi un événement global pour l'UI
        const event = new CustomEvent('session-update', {
            detail: { type: eventType, data }
        });
        document.dispatchEvent(event);
    }
    
    /**
     * S'abonner aux événements de session
     */
    function on(eventType, callback) {
        if (!eventListeners.has(eventType)) {
            eventListeners.set(eventType, []);
        }
        eventListeners.get(eventType).push(callback);
        
        return () => {
            const listeners = eventListeners.get(eventType);
            const index = listeners.indexOf(callback);
            if (index > -1) listeners.splice(index, 1);
        };
    }
    
    // ==================== PUBLIC API ====================
    
    return {
        // Lifecycle
        initSession,
        getOrCreateSession,
        clearActiveSession,
        finalizeSession,
        
        // Exercise CRUD
        deleteExercise,
        addExercise,
        reorderExercise,
        
        // Set Management
        updateSet,
        addSet,
        deleteSet,
        
        // Copy
        copySession,
        copyLastSessionOfType,
        copySessionFromWeek,
        
        // Stats
        calculateSessionStats,
        compareWithLastSession,
        
        // Events
        on,
        
        // Utils
        generateId
    };
})();

// Exposer globalement
window.SessionManager = SessionManager;
