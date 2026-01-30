// ==================== STATE MANAGEMENT ====================
// Version MVP - dailyMenu supprimé, foodJournal est la source unique
// Version 2 - Ajout validation de schéma
// Version 3 - Ajout repas (mealType) et cardio

// ==================== CONSTANTES REPAS & CARDIO ====================

const MEAL_TYPES = {
    breakfast: { id: 'breakfast', label: 'Petit-déjeuner', icon: '🌅', hours: [5, 10] },
    lunch: { id: 'lunch', label: 'Déjeuner', icon: '☀️', hours: [11, 14] },
    snack: { id: 'snack', label: 'Collation', icon: '🍎', hours: [15, 17] },
    dinner: { id: 'dinner', label: 'Dîner', icon: '🌙', hours: [18, 22] }
};

const CARDIO_TYPES = {
    running: { id: 'running', label: 'Course', icon: '🏃', met: { light: 6, moderate: 9.8, intense: 12.8 } },
    cycling: { id: 'cycling', label: 'Vélo', icon: '🚴', met: { light: 4, moderate: 6.8, intense: 10 } },
    walking: { id: 'walking', label: 'Marche', icon: '🚶', met: { light: 2.5, moderate: 3.5, intense: 5 } },
    swimming: { id: 'swimming', label: 'Natation', icon: '🏊', met: { light: 5, moderate: 7, intense: 10 } },
    boxing: { id: 'boxing', label: 'Boxe', icon: '🥊', met: { light: 7, moderate: 10, intense: 13 } },
    other: { id: 'other', label: 'Autre', icon: '💪', met: { light: 4, moderate: 6, intense: 8 } }
};

const CARDIO_INTENSITIES = {
    light: { id: 'light', label: 'Légère', description: 'Conversation facile' },
    moderate: { id: 'moderate', label: 'Modérée', description: 'Respiration accélérée' },
    intense: { id: 'intense', label: 'Intense', description: 'Essoufflement' }
};

// Inférer le type de repas basé sur l'heure
function inferMealType(timestamp) {
    const date = new Date(timestamp);
    const hour = date.getHours();
    
    if (hour >= 5 && hour < 10) return 'breakfast';
    if (hour >= 11 && hour < 14) return 'lunch';
    if (hour >= 15 && hour < 17) return 'snack';
    if (hour >= 18 && hour < 23) return 'dinner';
    
    // Par défaut selon l'heure la plus proche
    if (hour < 5) return 'dinner'; // Nuit -> probablement dîner tardif
    return 'snack'; // Entre 10-11 ou 14-15 ou 17-18 -> collation
}

// Calculer les calories brûlées par le cardio
function calculateCardioCalories(type, duration, intensity, weightKg = 70) {
    const cardioType = CARDIO_TYPES[type] || CARDIO_TYPES.other;
    const met = cardioType.met[intensity] || cardioType.met.moderate;
    // Formule: calories = MET × poids (kg) × durée (heures)
    return Math.round(met * weightKg * (duration / 60));
}

// Migration: ajouter mealType aux entrées foodJournal existantes
function migrateFoodJournalToMeals() {
    if (!state.foodJournal) return;
    
    let migrated = false;
    for (const [date, entries] of Object.entries(state.foodJournal)) {
        if (!Array.isArray(entries)) continue;
        
        for (const entry of entries) {
            if (!entry.mealType && entry.addedAt) {
                entry.mealType = inferMealType(entry.addedAt);
                migrated = true;
            } else if (!entry.mealType) {
                // Si pas d'addedAt, on met lunch par défaut
                entry.mealType = 'lunch';
                migrated = true;
            }
        }
    }
    
    if (migrated) {
        console.log('📦 Migration: mealType ajouté aux entrées du journal');
    }
}

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
            tdee: { type: 'number', min: 500, max: 10000 },
            waterGoal: { type: 'number', min: 1000, max: 5000 } // ml par jour
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
    exercises: enrichExercisesWithTags([...defaultExercises]), // Exercices avec tags auto-générés
    exerciseSwaps: {}, // Exercices remplacés par l'utilisateur { "Développé Couché": "chest-press-machine" }
    foodJournal: {}, // Journal alimentaire par date { "2025-01-21": [{ foodId, quantity, mealType }] }
    
    // Cardio tracking
    cardioLog: {}, // { "2025-01-25": [{ type, duration, intensity, calories, addedAt }] }
    
    // Hydratation tracking
    hydration: {}, // { "2025-01-25": 2500 } - ml par jour
    
    // Sync Queue Offline (Priorité 2 - Stabilité)
    syncQueue: [], // [{ id, type, action, data, timestamp, retries }]
    
    // Périodisation (Priorité 4)
    periodization: {
        currentWeek: 1,        // 1-4
        currentCycle: 1,       // Numéro du mesocycle
        cycleStartDate: null,
        weeklyVolume: [],      // Historique du volume par semaine
        autoDeload: true       // Semaine 4 = deload automatique
    },
    
    // Habitudes alimentaires (pour suggestions intelligentes)
    mealHistory: {}, // { mealSignature: { count, lastUsed, avgRating } } - pour suggestions
    mealCombos: [], // Combos favoris utilisateur [{ id, name, icon, foods, mealTypes, usageCount, createdAt, lastUsed }]
    
    selectedProgram: null,
    trainingDays: 4,
    progressLog: {},
    sessionHistory: [],
    
    // Photos de progression
    progressPhotos: [], // [{ id, photo_url, taken_at, weight, body_fat, pose, notes }]
    
    // Sync metadata
    _lastSyncAt: null, // Timestamp de la dernière sync Supabase
    _localModifiedAt: null, // Timestamp de la dernière modification locale
    
    // Préférences utilisateur
    preferences: {
        conflictResolution: 'server' // 'server', 'local', 'ask'
    },
    
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
            
            // S'assurer que les exercices par défaut sont inclus avec tags
            const customExercises = (state.exercises || []).filter(e => !defaultExercises.find(de => de.id === e.id));
            state.exercises = enrichExercisesWithTags([...defaultExercises, ...customExercises]);
            
            // Initialiser les champs manquants
            if (!state.exerciseSwaps) state.exerciseSwaps = {};
            if (!state.foodAccordionState) state.foodAccordionState = {};
            if (!state.progressLog) state.progressLog = {};
            if (!state.sessionHistory) state.sessionHistory = [];
            if (!state.activeSession) state.activeSession = null;
            if (!state.foodJournal) state.foodJournal = {};
            if (!state.cardioLog) state.cardioLog = {};
            if (!state.mealHistory) state.mealHistory = {};
            if (!state.mealCombos) state.mealCombos = [];
            if (!state.progressPhotos) state.progressPhotos = [];
            
            // Initialiser les préférences utilisateur
            if (!state.preferences) {
                state.preferences = {
                    conflictResolution: 'server' // 'server', 'local', 'ask'
                };
            }
            if (!state.preferences.conflictResolution) {
                state.preferences.conflictResolution = 'server';
            }
            
            // Migration: ajouter mealType aux entrées existantes
            migrateFoodJournalToMeals();
            
            // Nouveaux champs pour la refonte Training
            if (!state.wizardResults) state.wizardResults = null;
            
            // VALIDATION: vérifier que l'équipement est défini dans wizardResults
            if (state.wizardResults && !state.wizardResults.equipment) {
                console.warn('⚠️ Equipment manquant dans wizardResults, réinitialisation du wizard');
                state.wizardResults = null; // Forcer la reconfiguration
            }
            
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
            
            // Sauvegarder backup avant reset
            try {
                const corruptedData = localStorage.getItem('fittrack-state');
                if (corruptedData) {
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                    localStorage.setItem(`fittrack-state-backup-${timestamp}`, corruptedData);
                    console.log('💾 Backup sauvegardé avant reset');
                }
            } catch (backupError) {
                console.error('Impossible de créer backup:', backupError);
            }
            
            showToast('⚠️ Erreur de lecture. Un backup a été créé. Contactez le support si le problème persiste.', 'error');
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
        const dataString = JSON.stringify(cleanState);
        
        // Vérifier la taille des données (limite localStorage ~5MB)
        const dataSize = new Blob([dataString]).size;
        const maxSize = 4.5 * 1024 * 1024; // 4.5MB pour marge de sécurité
        const warningSize = 3.5 * 1024 * 1024; // 3.5MB pour avertissement
        
        if (dataSize > warningSize && dataSize <= maxSize) {
            console.warn(`⚠️ localStorage utilisé à ${((dataSize / maxSize) * 100).toFixed(1)}%`);
            // Avertissement une seule fois par session
            if (!window._storageWarningShown) {
                window._storageWarningShown = true;
                showToast('Espace de stockage local presque plein. Connectez-vous pour sauvegarder sur le cloud.', 'warning');
            }
        }
        
        localStorage.setItem('fittrack-state', dataString);
    } catch (e) {
        // Gérer spécifiquement l'erreur de quota dépassé
        if (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014) {
            console.error('❌ Quota localStorage dépassé!', e);
            showToast('Stockage local plein! Tentative de nettoyage...', 'warning');
            
            // Tenter de nettoyer et réessayer
            if (cleanupOldLocalData()) {
                try {
                    const cleanState = sanitizeCorruptedValues(state, 'state');
                    localStorage.setItem('fittrack-state', JSON.stringify(cleanState));
                    showToast('Nettoyage réussi, données sauvegardées', 'success');
                    return;
                } catch (retryError) {
                    console.error('Échec après nettoyage:', retryError);
                }
            }
            
            showToast('Impossible de sauvegarder. Connectez-vous à Supabase pour ne pas perdre vos données!', 'error');
        } else {
            console.error('Erreur lors de la sauvegarde:', e);
            showToast('⚠️ Impossible de sauvegarder localement. Libérez de l\'espace ou connectez-vous à Supabase.', 'error');
        }
    }
}

// Nettoyer les anciennes données pour libérer de l'espace
function cleanupOldLocalData() {
    try {
        let cleaned = false;
        
        // 1. Supprimer les backups de conflits anciens (garder seulement 3)
        const backups = JSON.parse(localStorage.getItem('conflict-backups') || '[]');
        if (backups.length > 3) {
            localStorage.setItem('conflict-backups', JSON.stringify(backups.slice(-3)));
            cleaned = true;
            console.log('🧹 Backups de conflits nettoyés');
        }
        
        // 2. Nettoyer les données obsolètes du state
        if (state.foodJournal) {
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            const sixMonthsAgoStr = sixMonthsAgo.toISOString().split('T')[0];
            
            let oldEntriesCount = 0;
            Object.keys(state.foodJournal).forEach(date => {
                if (date < sixMonthsAgoStr) {
                    delete state.foodJournal[date];
                    oldEntriesCount++;
                }
            });
            
            if (oldEntriesCount > 0) {
                cleaned = true;
                console.log(`🧹 ${oldEntriesCount} jours de journal supprimés (>6 mois)`);
            }
        }
        
        // 3. Nettoyer les anciennes sessions cardio (garder 6 mois)
        if (state.cardioLog) {
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            const sixMonthsAgoStr = sixMonthsAgo.toISOString().split('T')[0];
            
            let oldCardioCount = 0;
            Object.keys(state.cardioLog).forEach(date => {
                if (date < sixMonthsAgoStr) {
                    delete state.cardioLog[date];
                    oldCardioCount++;
                }
            });
            
            if (oldCardioCount > 0) {
                cleaned = true;
                console.log(`🧹 ${oldCardioCount} jours de cardio supprimés (>6 mois)`);
            }
        }
        
        if (cleaned) {
            showToast('Anciennes données nettoyées pour libérer de l\'espace', 'info');
        }
        
        return cleaned;
    } catch (e) {
        console.error('Erreur nettoyage localStorage:', e);
        return false;
    }
}

// Vérifier l'utilisation du quota localStorage
function checkStorageQuota() {
    try {
        const stateData = localStorage.getItem('fittrack-state') || '';
        const used = new Blob([stateData]).size;
        const maxSize = 5 * 1024 * 1024; // ~5MB
        const percentage = (used / maxSize) * 100;
        
        return {
            used: used,
            max: maxSize,
            percentage: percentage.toFixed(1),
            warning: percentage > 70,
            critical: percentage > 90,
            usedMB: (used / (1024 * 1024)).toFixed(2)
        };
    } catch (e) {
        return { used: 0, max: 0, percentage: 0, warning: false, critical: false, usedMB: '0' };
    }
}

// Marquer la sync comme effectuée
function markSyncComplete() {
    try {
        state._lastSyncAt = new Date().toISOString();
        localStorage.setItem('fittrack-state', JSON.stringify(state));
    } catch (e) {
        console.error('Erreur markSyncComplete:', e);
    }
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
    const exportPayload = {
        version: '2.0.0',
        exportedAt: new Date().toISOString(),
        app: 'FitTrack Pro',
        data: {
            // Données critiques utilisateur
            profile: state.profile,
            foodJournal: state.foodJournal,
            sessionHistory: state.sessionHistory,
            cardioLog: state.cardioLog,
            hydration: state.hydration,
            bodyWeightLog: state.bodyWeightLog,
            progressLog: state.progressLog,
            progressPhotos: state.progressPhotos,
            // Configuration
            wizardResults: state.wizardResults,
            trainingProgress: state.trainingProgress,
            sessionTemplates: state.sessionTemplates,
            exerciseSwaps: state.exerciseSwaps,
            goals: state.goals,
            recipes: state.recipes,
            mealCombos: state.mealCombos,
            unlockedAchievements: state.unlockedAchievements,
            // Préférences
            preferences: state.preferences,
            selectedProgram: state.selectedProgram,
            trainingDays: state.trainingDays,
            periodization: state.periodization,
            // Custom templates (si présent)
            customTemplates: state.customTemplates
        },
        metadata: {
            totalJournalDays: Object.keys(state.foodJournal || {}).length,
            totalSessions: (state.sessionHistory || []).length,
            totalPhotos: (state.progressPhotos || []).length,
            totalRecipes: Object.keys(state.recipes || {}).length,
            hasProfile: !!state.profile,
            programConfigured: !!state.selectedProgram,
            exportSize: 0 // Sera calculé après stringify
        }
    };
    
    const jsonString = JSON.stringify(exportPayload, null, 2);
    exportPayload.metadata.exportSize = Math.round(jsonString.length / 1024); // Ko
    
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fittrack-pro-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showToast(`✅ Données exportées (${exportPayload.metadata.exportSize}Ko)`, 'success');
    console.log('📦 Export complet:', exportPayload.metadata);
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
            const rawImported = JSON.parse(e.target.result);
            
            // Détecter le format (v1 = direct state, v2 = avec version)
            const isV2Format = rawImported.version && rawImported.data;
            let imported = isV2Format ? rawImported.data : rawImported;
            const importVersion = isV2Format ? rawImported.version : '1.0.0';
            
            // Vérifier compatibilité version
            if (!isCompatibleVersion(importVersion)) {
                showToast(`⚠️ Version incompatible: ${importVersion}`, 'error');
                return;
            }
            
            // BACKUP AUTOMATIQUE avant import
            const backupKey = `fittrack-backup-${Date.now()}`;
            try {
                localStorage.setItem(backupKey, JSON.stringify(state));
                console.log(`💾 Backup créé: ${backupKey}`);
            } catch (err) {
                console.warn('Impossible de créer backup:', err);
                if (!confirm('⚠️ Backup impossible. Continuer l\'import quand même ?')) {
                    return;
                }
            }
            
            // 1. Nettoyer les valeurs corrompues
            imported = sanitizeCorruptedValues(imported, 'import');
            
            // 2. Valider et corriger
            const { sanitized, errors } = validateAndSanitizeState(imported);
            imported = sanitized;
            
            // 3. Détecter conflits
            const conflicts = detectImportConflicts(state, imported);
            
            // 4. Merge intelligent par catégorie
            const mergedState = mergeImportedData(state, imported, conflicts);
            
            // 5. Re-merger les aliments par défaut
            const customFoods = (mergedState.foods || []).filter(f => !defaultFoods.find(df => df.id === f.id));
            mergedState.foods = [...defaultFoods, ...customFoods];
            
            // 6. Appliquer le nouvel état
            state = mergedState;
            saveState();
            
            // 7. Rafraîchir l'interface
            if (typeof renderProgramTypes === 'function') renderProgramTypes();
            if (typeof renderFoodsList === 'function') renderFoodsList();
            if (typeof updateDashboard === 'function') updateDashboard();
            if (typeof updateWeeklySchedule === 'function') updateWeeklySchedule();
            if (typeof populateSessionDaySelect === 'function') populateSessionDaySelect();
            if (typeof populateProgressExerciseSelect === 'function') populateProgressExerciseSelect();
            if (typeof updateSessionHistory === 'function') updateSessionHistory();
            if (typeof loadJournalDay === 'function') loadJournalDay();
            
            // 8. Toast de succès
            const stats = [];
            if (conflicts.sessions > 0) stats.push(`${conflicts.sessions} séances fusionnées`);
            if (errors.length > 0) stats.push(`${errors.length} corrections`);
            
            const message = stats.length > 0 
                ? `✅ Import réussi (${stats.join(', ')})`
                : '✅ Données importées avec succès !';
            
            showToast(message, 'success', 4000);
            console.log(`📥 Import v${importVersion} complété. Backup: ${backupKey}`);
            
        } catch (err) {
            console.error('Erreur import:', err);
            showToast('Fichier invalide ou corrompu', 'error');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// Vérifier si la version est compatible
function isCompatibleVersion(version) {
    const [major] = version.split('.').map(Number);
    return major <= 2; // Support v1.x et v2.x
}

// Détecter les conflits d'import
function detectImportConflicts(currentState, importedState) {
    const conflicts = {
        sessions: 0,
        journalDays: 0,
        photos: 0,
        hasConflicts: false
    };
    
    // Détecter doublons de séances (même date + même jour)
    if (importedState.sessionHistory && currentState.sessionHistory) {
        importedState.sessionHistory.forEach(importedSession => {
            const exists = currentState.sessionHistory.some(s => 
                s.date === importedSession.date && 
                s.day === importedSession.day &&
                Math.abs((s.timestamp || 0) - (importedSession.timestamp || 0)) < 60000
            );
            if (exists) conflicts.sessions++;
        });
    }
    
    // Détecter conflits journal (même date avec données différentes)
    if (importedState.foodJournal && currentState.foodJournal) {
        Object.keys(importedState.foodJournal).forEach(date => {
            if (currentState.foodJournal[date]) {
                conflicts.journalDays++;
            }
        });
    }
    
    conflicts.hasConflicts = conflicts.sessions > 0 || conflicts.journalDays > 0;
    return conflicts;
}

// Merger intelligemment les données importées
function mergeImportedData(currentState, importedState, conflicts) {
    const merged = { ...currentState };
    
    // 1. Profile : prendre l'importé si plus récent ou si local vide
    if (importedState.profile) {
        if (!merged.profile || 
            (importedState.profile.weight && merged.profile.weight !== importedState.profile.weight)) {
            merged.profile = importedState.profile;
        }
    }
    
    // 2. SessionHistory : merger sans doublons
    if (importedState.sessionHistory) {
        const allSessions = [...(merged.sessionHistory || [])];
        
        importedState.sessionHistory.forEach(importedSession => {
            const exists = allSessions.find(s => 
                s.sessionId === importedSession.sessionId ||
                (s.date === importedSession.date && 
                 s.day === importedSession.day &&
                 Math.abs((s.timestamp || 0) - (importedSession.timestamp || 0)) < 60000)
            );
            
            if (!exists) {
                allSessions.push({ ...importedSession, synced: false });
            } else {
                // Garder celle avec le plus de données
                const currentIdx = allSessions.indexOf(exists);
                if ((importedSession.exercises?.length || 0) > (exists.exercises?.length || 0)) {
                    allSessions[currentIdx] = { ...importedSession, synced: false };
                }
            }
        });
        
        merged.sessionHistory = allSessions.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 100);
    }
    
    // 3. FoodJournal : merger par jour
    if (importedState.foodJournal) {
        merged.foodJournal = { ...(merged.foodJournal || {}) };
        
        Object.keys(importedState.foodJournal).forEach(date => {
            if (!merged.foodJournal[date]) {
                // Jour absent : ajouter directement
                merged.foodJournal[date] = importedState.foodJournal[date];
            } else {
                // Jour existant : merger sans doublons
                const currentEntries = merged.foodJournal[date];
                const importedEntries = importedState.foodJournal[date];
                
                importedEntries.forEach(entry => {
                    const exists = currentEntries.find(e => 
                        e.foodId === entry.foodId && 
                        e.quantity === entry.quantity && 
                        e.mealType === entry.mealType &&
                        Math.abs((e.addedAt || 0) - (entry.addedAt || 0)) < 60000
                    );
                    
                    if (!exists) {
                        currentEntries.push({ ...entry, supabaseId: null });
                    }
                });
            }
        });
    }
    
    // 4. Autres données : merger simplement
    const simpleFields = [
        'cardioLog', 'hydration', 'bodyWeightLog', 'progressLog', 
        'wizardResults', 'trainingProgress', 'sessionTemplates', 
        'exerciseSwaps', 'goals', 'recipes', 'mealCombos', 
        'unlockedAchievements', 'preferences', 'selectedProgram', 
        'trainingDays', 'periodization', 'progressPhotos', 'customTemplates'
    ];
    
    simpleFields.forEach(field => {
        if (importedState[field] !== undefined) {
            merged[field] = importedState[field];
        }
    });
    
    return merged;
}
