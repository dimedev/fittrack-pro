// ==================== STATE MANAGEMENT ====================
// Version MVP - dailyMenu supprimé, foodJournal est la source unique
// Version 2 - Ajout validation de schéma

// ==================== SCHEMA DE VALIDATION ====================

const StateSchema = {
    profile: {
        type: 'object',
        nullable: true,
        properties: {
            age: { type: 'number', min: 10, max: 120 },
            weight: { type: 'number', min: 20, max: 500 },
            height: { type: 'number', min: 50, max: 300 },
            targetCalories: { type: 'number', min: 500, max: 10000 },
            bmr: { type: 'number', min: 500, max: 5000 },
            tdee: { type: 'number', min: 500, max: 10000 }
        }
    },
    trainingDays: { type: 'number', min: 1, max: 7 },
    trainingProgress: {
        type: 'object',
        properties: {
            currentSplitIndex: { type: 'number', min: 0, max: 10 },
            totalSessionsCompleted: { type: 'number', min: 0, max: 100000 }
        }
    },
    goals: {
        type: 'object',
        nullable: true,
        properties: {
            currentStreak: { type: 'number', min: 0, max: 10000 },
            longestStreak: { type: 'number', min: 0, max: 10000 }
        }
    },
    bodyWeightLog: {
        type: 'array',
        items: {
            weight: { type: 'number', min: 20, max: 500 }
        }
    }
};

// Valider une valeur contre son schéma
function validateValue(value, schema, path = '') {
    const errors = [];
    
    if (value === null || value === undefined) {
        if (schema.nullable) return errors;
        // Valeur manquante mais pas nullable - on laisse passer (valeur par défaut)
        return errors;
    }
    
    // Validation de type
    if (schema.type === 'number') {
        const num = typeof value === 'number' ? value : parseFloat(value);
        if (isNaN(num)) {
            errors.push(`${path}: valeur invalide (NaN)`);
            return errors;
        }
        if (schema.min !== undefined && num < schema.min) {
            errors.push(`${path}: valeur ${num} < min ${schema.min}`);
        }
        if (schema.max !== undefined && num > schema.max) {
            errors.push(`${path}: valeur ${num} > max ${schema.max}`);
        }
    }
    
    // Validation d'objet
    if (schema.type === 'object' && schema.properties && typeof value === 'object') {
        for (const [key, propSchema] of Object.entries(schema.properties)) {
            if (value[key] !== undefined) {
                errors.push(...validateValue(value[key], propSchema, `${path}.${key}`));
            }
        }
    }
    
    // Validation de tableau
    if (schema.type === 'array' && Array.isArray(value) && schema.items) {
        value.forEach((item, i) => {
            for (const [key, itemSchema] of Object.entries(schema.items)) {
                if (item[key] !== undefined) {
                    errors.push(...validateValue(item[key], itemSchema, `${path}[${i}].${key}`));
                }
            }
        });
    }
    
    return errors;
}

// Valider et nettoyer le state complet
function validateAndSanitizeState(data) {
    const errors = [];
    const sanitized = { ...data };
    
    for (const [key, schema] of Object.entries(StateSchema)) {
        if (data[key] !== undefined) {
            const fieldErrors = validateValue(data[key], schema, key);
            errors.push(...fieldErrors);
            
            // Corriger les valeurs hors limites
            if (schema.type === 'number' && typeof data[key] === 'number') {
                if (schema.min !== undefined && data[key] < schema.min) {
                    sanitized[key] = schema.min;
                }
                if (schema.max !== undefined && data[key] > schema.max) {
                    sanitized[key] = schema.max;
                }
            }
        }
    }
    
    // Log des erreurs mais ne pas bloquer (mode permissif)
    if (errors.length > 0) {
        console.warn('⚠️ Validation state - corrections appliquées:', errors);
    }
    
    return { sanitized, errors };
}

// Nettoyer les valeurs corrompues (NaN, Infinity, undefined dans les tableaux)
function sanitizeCorruptedValues(obj, path = '') {
    if (obj === null || obj === undefined) return obj;
    
    if (typeof obj === 'number') {
        if (isNaN(obj) || !isFinite(obj)) {
            console.warn(`⚠️ Valeur corrompue détectée à ${path}: ${obj}`);
            return 0;
        }
        return obj;
    }
    
    if (Array.isArray(obj)) {
        return obj
            .filter(item => item !== undefined)
            .map((item, i) => sanitizeCorruptedValues(item, `${path}[${i}]`));
    }
    
    if (typeof obj === 'object') {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            if (value !== undefined) {
                result[key] = sanitizeCorruptedValues(value, `${path}.${key}`);
            }
        }
        return result;
    }
    
    return obj;
}

// ==================== STATE ====================

let state = {
    profile: null,
    foods: [...defaultFoods],
    exercises: [...defaultExercises],
    exerciseSwaps: {}, // Exercices remplacés par l'utilisateur { "Développé Couché": "chest-press-machine" }
    foodJournal: {}, // Journal alimentaire par date { "2025-01-21": [{ foodId, quantity }] }
    selectedProgram: null,
    trainingDays: 4,
    progressLog: {},
    sessionHistory: [],
    
    // Sync metadata
    _lastSyncAt: null, // Timestamp de la dernière sync Supabase
    _localModifiedAt: null, // Timestamp de la dernière modification locale
    activeSession: null,
    foodAccordionState: {}, // État des accordéons dans la base d'aliments
    
    // Résultats du wizard de configuration programme
    wizardResults: null, // { frequency, goal, experience, favoriteExercises, selectedProgram, completedAt }
    
    // Progression séquentielle dans le programme
    trainingProgress: {
        currentSplitIndex: 0,       // Prochain jour du split à faire (0=Push, 1=Pull, 2=Legs pour PPL)
        lastSessionDate: null,      // Date de la dernière séance complétée
        totalSessionsCompleted: 0   // Compteur total de séances
    },
    
    // Templates de séances personnalisés par slot
    sessionTemplates: {}, // Clé: "programId-splitIndex" -> { splitIndex, splitName, exercises[], savedAt }
    
    // Objectifs et tracking (SYNCED avec Supabase)
    goals: null, // { type, target, deadline, startDate, startWeight, currentStreak, longestStreak, weeklyProgress }
    bodyWeightLog: [], // [{ date, weight }]
    
    // Achievements débloqués (SYNCED avec Supabase)
    unlockedAchievements: [] // [achievementId, ...]
};

// Charger l'état depuis localStorage (avec validation)
function loadState() {
    const saved = localStorage.getItem('fittrack-state');
    if (saved) {
        try {
            let parsed = JSON.parse(saved);
            
            // 1. Nettoyer les valeurs corrompues (NaN, Infinity)
            parsed = sanitizeCorruptedValues(parsed, 'state');
            
            // 2. Valider et corriger les valeurs hors limites
            const { sanitized, errors } = validateAndSanitizeState(parsed);
            parsed = sanitized;
            
            // 3. Merger avec l'état par défaut
            state = { ...state, ...parsed };
            
            // S'assurer que les aliments par défaut sont inclus
            const customFoods = (state.foods || []).filter(f => !defaultFoods.find(df => df.id === f.id));
            state.foods = [...defaultFoods, ...customFoods];
            
            // S'assurer que les exercices par défaut sont inclus
            const customExercises = (state.exercises || []).filter(e => !defaultExercises.find(de => de.id === e.id));
            state.exercises = [...defaultExercises, ...customExercises];
            
            // Initialiser les champs manquants
            if (!state.exerciseSwaps) state.exerciseSwaps = {};
            if (!state.foodAccordionState) state.foodAccordionState = {};
            if (!state.progressLog) state.progressLog = {};
            if (!state.sessionHistory) state.sessionHistory = [];
            if (!state.activeSession) state.activeSession = null;
            if (!state.foodJournal) state.foodJournal = {};
            
            // Nouveaux champs pour la refonte Training
            if (!state.wizardResults) state.wizardResults = null;
            if (!state.trainingProgress) {
                state.trainingProgress = {
                    currentSplitIndex: 0,
                    lastSessionDate: null,
                    totalSessionsCompleted: 0
                };
            }
            
            // Templates de séances personnalisés
            if (!state.sessionTemplates) state.sessionTemplates = {};
            
            // Migration: si dailyMenu existe encore, on le supprime
            if (state.dailyMenu) {
                delete state.dailyMenu;
            }
            
            // Migration: supprimer les champs obsolètes
            if (state.favoriteMeals) delete state.favoriteMeals;
            if (state.progressionSuggestions) delete state.progressionSuggestions;
            if (state.trainingModes) delete state.trainingModes;
            if (state.aiCustomProgram) delete state.aiCustomProgram;
            
            // Log si des erreurs ont été corrigées
            if (errors.length > 0) {
                console.log('✅ State chargé avec corrections automatiques');
            }
            
        } catch (e) {
            console.error('Erreur lors du chargement des données:', e);
            showToast('Erreur de chargement - données réinitialisées', 'error');
            localStorage.removeItem('fittrack-state');
        }
    }
}

// Sauvegarder l'état dans localStorage (avec validation)
function saveState() {
    try {
        // Mettre à jour le timestamp de modification locale
        state._localModifiedAt = new Date().toISOString();
        
        // Nettoyer les valeurs corrompues avant sauvegarde
        const cleanState = sanitizeCorruptedValues(state, 'state');
        
        localStorage.setItem('fittrack-state', JSON.stringify(cleanState));
    } catch (e) {
        console.error('Erreur lors de la sauvegarde:', e);
        showToast('Erreur de sauvegarde', 'error');
    }
}

// Marquer la sync comme effectuée
function markSyncComplete() {
    state._lastSyncAt = new Date().toISOString();
    localStorage.setItem('fittrack-state', JSON.stringify(state));
}

// Vérifier si des modifications locales non synchronisées existent
function hasUnsyncedChanges() {
    if (!state._lastSyncAt) return false;
    if (!state._localModifiedAt) return false;
    
    const lastSync = new Date(state._lastSyncAt).getTime();
    const lastMod = new Date(state._localModifiedAt).getTime();
    
    return lastMod > lastSync;
}

// Détecter les conflits entre local et serveur
function detectConflict(serverUpdatedAt) {
    if (!serverUpdatedAt) return { hasConflict: false };
    if (!state._localModifiedAt) return { hasConflict: false };
    
    const serverTime = new Date(serverUpdatedAt).getTime();
    const localTime = new Date(state._localModifiedAt).getTime();
    const lastSyncTime = state._lastSyncAt ? new Date(state._lastSyncAt).getTime() : 0;
    
    // Conflit si :
    // - Le serveur a été modifié après notre dernière sync
    // - ET nous avons aussi des modifications locales après notre dernière sync
    const serverModifiedAfterSync = serverTime > lastSyncTime;
    const localModifiedAfterSync = localTime > lastSyncTime;
    
    if (serverModifiedAfterSync && localModifiedAfterSync) {
        return {
            hasConflict: true,
            serverTime: serverUpdatedAt,
            localTime: state._localModifiedAt,
            serverIsNewer: serverTime > localTime
        };
    }
    
    return { hasConflict: false, serverIsNewer: serverTime > localTime };
}

// Export des données
function exportData() {
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `repzy-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Données exportées !', 'success');
}

// Import des données
function importData() {
    document.getElementById('import-file').click();
}

function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            let imported = JSON.parse(e.target.result);
            
            // 1. Nettoyer les valeurs corrompues
            imported = sanitizeCorruptedValues(imported, 'import');
            
            // 2. Valider et corriger
            const { sanitized, errors } = validateAndSanitizeState(imported);
            imported = sanitized;
            
            // 3. Merger avec l'état existant
            state = { ...state, ...imported };
            
            // Re-merger les aliments par défaut
            const customFoods = (state.foods || []).filter(f => !defaultFoods.find(df => df.id === f.id));
            state.foods = [...defaultFoods, ...customFoods];
            saveState();
            
            // Rafraîchir l'interface
            if (typeof renderProgramTypes === 'function') renderProgramTypes();
            if (typeof renderFoodsList === 'function') renderFoodsList();
            if (typeof updateDashboard === 'function') updateDashboard();
            if (typeof updateWeeklySchedule === 'function') updateWeeklySchedule();
            if (typeof populateSessionDaySelect === 'function') populateSessionDaySelect();
            if (typeof populateProgressExerciseSelect === 'function') populateProgressExerciseSelect();
            if (typeof updateSessionHistory === 'function') updateSessionHistory();
            if (typeof loadJournalDay === 'function') loadJournalDay();
            
            if (errors.length > 0) {
                showToast(`Données importées (${errors.length} corrections)`, 'warning');
            } else {
                showToast('Données importées avec succès !', 'success');
            }
        } catch (err) {
            console.error('Erreur import:', err);
            showToast('Fichier invalide ou corrompu', 'error');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}
