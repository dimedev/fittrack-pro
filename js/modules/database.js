// ==================== DATABASE MODULE (IndexedDB via Dexie.js) ====================
// Stockage robuste offline-first remplaçant localStorage
// Version 1.0

(function() {
    'use strict';

    // ==================== DEXIE CONFIGURATION ====================

    const DB_NAME = 'RepzyDB';
    const DB_VERSION = 1;

    let db = null;
    let isInitialized = false;
    let initPromise = null;

    // ==================== DATABASE SCHEMA ====================

    /**
     * Initialise la base de données IndexedDB avec Dexie
     */
    async function initDatabase() {
        if (initPromise) return initPromise;

        initPromise = new Promise(async (resolve, reject) => {
            try {
                // Vérifier si Dexie est chargé
                if (typeof Dexie === 'undefined') {
                    console.warn('⚠️ Dexie non chargé, fallback localStorage');
                    isInitialized = false;
                    resolve(false);
                    return;
                }

                db = new Dexie(DB_NAME);

                // Définir le schéma de la base
                db.version(DB_VERSION).stores({
                    // State principal (clé unique)
                    appState: 'id',

                    // Journal alimentaire (indexé par date)
                    foodJournal: '++id, date, mealType, addedAt, supabaseId',

                    // Sessions d'entraînement
                    sessionHistory: '++id, date, sessionId, dayType, timestamp, supabaseId',

                    // Log de progression par exercice
                    progressLog: '++id, exerciseName, date, timestamp',

                    // Cardio log
                    cardioLog: '++id, date, type, supabaseId',

                    // Hydratation
                    hydration: 'date',

                    // Photos de progression
                    progressPhotos: '++id, taken_at, supabaseId',

                    // Poids corporel
                    bodyWeightLog: '++id, date',

                    // Aliments personnalisés
                    customFoods: 'id, name, category',

                    // Exercices personnalisés
                    customExercises: 'id, name, muscle',

                    // Recettes
                    recipes: 'id, name',

                    // Meal combos (favoris)
                    mealCombos: '++id, name',

                    // Queue de sync offline
                    syncQueue: '++id, type, action, timestamp',

                    // Metadata et config
                    metadata: 'key'
                });

                await db.open();
                isInitialized = true;
                console.log('✅ IndexedDB initialisé avec Dexie');
                resolve(true);

            } catch (error) {
                console.error('❌ Erreur init IndexedDB:', error);
                isInitialized = false;
                resolve(false);
            }
        });

        return initPromise;
    }

    // ==================== STATE MANAGEMENT ====================

    /**
     * Sauvegarde l'état complet dans IndexedDB
     */
    async function saveStateToIDB(stateData) {
        if (!isInitialized || !db) {
            console.warn('IndexedDB non dispo, fallback localStorage');
            return false;
        }

        try {
            const timestamp = new Date().toISOString();

            // Sauvegarder le state principal
            await db.appState.put({
                id: 'main',
                data: stateData,
                updatedAt: timestamp
            });

            // Sauvegarder aussi les données critiques séparément pour récupération partielle

            // FoodJournal - indexé par date pour requêtes rapides
            if (stateData.foodJournal) {
                const entries = [];
                for (const [date, dayEntries] of Object.entries(stateData.foodJournal)) {
                    for (const entry of dayEntries) {
                        entries.push({
                            ...entry,
                            date,
                            _stateSync: timestamp
                        });
                    }
                }
                // Clear and bulk add for consistency
                await db.foodJournal.clear();
                if (entries.length > 0) {
                    await db.foodJournal.bulkAdd(entries);
                }
            }

            // SessionHistory
            if (stateData.sessionHistory && stateData.sessionHistory.length > 0) {
                await db.sessionHistory.clear();
                await db.sessionHistory.bulkAdd(stateData.sessionHistory.map(s => ({
                    ...s,
                    _stateSync: timestamp
                })));
            }

            // ProgressLog — aplatir { exerciseName: [entries] } en lignes indexées
            if (stateData.progressLog && Object.keys(stateData.progressLog).length > 0) {
                const plEntries = [];
                for (const [exerciseName, logs] of Object.entries(stateData.progressLog)) {
                    for (const log of (logs || [])) {
                        plEntries.push({ ...log, exerciseName, _stateSync: timestamp });
                    }
                }
                await db.progressLog.clear();
                if (plEntries.length > 0) {
                    await db.progressLog.bulkAdd(plEntries);
                }
            }

            // Metadata
            await db.metadata.put({
                key: 'lastSave',
                value: timestamp,
                stateSize: JSON.stringify(stateData).length
            });

            return true;

        } catch (error) {
            console.error('❌ Erreur sauvegarde IndexedDB:', error);
            return false;
        }
    }

    /**
     * Charge l'état depuis IndexedDB
     */
    async function loadStateFromIDB() {
        if (!isInitialized || !db) {
            return null;
        }

        try {
            const record = await db.appState.get('main');
            if (record && record.data) {
                console.log('📦 State chargé depuis IndexedDB');
                return record.data;
            }
            return null;

        } catch (error) {
            console.error('❌ Erreur chargement IndexedDB:', error);
            return null;
        }
    }

    // ==================== MIGRATION FROM LOCALSTORAGE ====================

    /**
     * Migre les données de localStorage vers IndexedDB
     */
    async function migrateFromLocalStorage() {
        if (!isInitialized || !db) {
            return false;
        }

        try {
            const localData = localStorage.getItem('fittrack-state');
            if (!localData) {
                console.log('Pas de données localStorage à migrer');
                return true;
            }

            // Vérifier si déjà migré
            const migrationFlag = await db.metadata.get('migratedFromLS');
            if (migrationFlag && migrationFlag.value) {
                console.log('Migration déjà effectuée');
                return true;
            }

            const parsed = JSON.parse(localData);

            // Sauvegarder dans IndexedDB
            await saveStateToIDB(parsed);

            // Marquer comme migré
            await db.metadata.put({
                key: 'migratedFromLS',
                value: true,
                migratedAt: new Date().toISOString()
            });

            console.log('✅ Migration localStorage → IndexedDB terminée');
            showToast('Données migrées vers stockage robuste', 'success');

            return true;

        } catch (error) {
            console.error('❌ Erreur migration:', error);
            return false;
        }
    }

    // ==================== SYNC QUEUE ====================

    /**
     * Ajoute une opération à la queue de sync offline
     */
    async function addToSyncQueue(type, action, data) {
        if (!isInitialized || !db) return null;

        try {
            const id = await db.syncQueue.add({
                type,
                action,
                data,
                timestamp: Date.now(),
                retries: 0,
                status: 'pending'
            });
            return id;
        } catch (error) {
            console.error('Erreur ajout sync queue:', error);
            return null;
        }
    }

    /**
     * Récupère les opérations en attente de sync
     */
    async function getPendingSyncOps() {
        if (!isInitialized || !db) return [];

        try {
            return await db.syncQueue
                .where('status')
                .equals('pending')
                .toArray();
        } catch (error) {
            console.error('Erreur lecture sync queue:', error);
            return [];
        }
    }

    /**
     * Marque une opération comme synchronisée
     */
    async function markSynced(id) {
        if (!isInitialized || !db) return;

        try {
            await db.syncQueue.delete(id);
        } catch (error) {
            console.error('Erreur suppression sync queue:', error);
        }
    }

    // ==================== FOOD JOURNAL OPERATIONS ====================

    /**
     * Ajoute une entrée au journal alimentaire
     */
    async function addFoodEntry(date, entry) {
        if (!isInitialized || !db) return null;

        try {
            const id = await db.foodJournal.add({
                ...entry,
                date,
                addedAt: entry.addedAt || Date.now()
            });

            // Ajouter à la queue de sync si offline
            if (!navigator.onLine) {
                await addToSyncQueue('foodJournal', 'add', { date, entry, localId: id });
            }

            return id;
        } catch (error) {
            console.error('Erreur ajout food entry:', error);
            return null;
        }
    }

    /**
     * Récupère le journal d'un jour
     */
    async function getFoodJournalByDate(date) {
        if (!isInitialized || !db) return [];

        try {
            return await db.foodJournal
                .where('date')
                .equals(date)
                .toArray();
        } catch (error) {
            console.error('Erreur lecture food journal:', error);
            return [];
        }
    }

    // ==================== SESSION HISTORY OPERATIONS ====================

    /**
     * Ajoute une session d'entraînement
     */
    async function addSession(session) {
        if (!isInitialized || !db) return null;

        try {
            const id = await db.sessionHistory.add({
                ...session,
                timestamp: session.timestamp || Date.now()
            });

            if (!navigator.onLine) {
                await addToSyncQueue('session', 'add', { session, localId: id });
            }

            return id;
        } catch (error) {
            console.error('Erreur ajout session:', error);
            return null;
        }
    }

    /**
     * Récupère les sessions récentes
     */
    async function getRecentSessions(limit = 50) {
        if (!isInitialized || !db) return [];

        try {
            return await db.sessionHistory
                .orderBy('timestamp')
                .reverse()
                .limit(limit)
                .toArray();
        } catch (error) {
            console.error('Erreur lecture sessions:', error);
            return [];
        }
    }

    // ==================== STORAGE STATS ====================

    /**
     * Retourne les statistiques de stockage
     */
    async function getStorageStats() {
        const stats = {
            indexedDB: {
                available: isInitialized,
                usage: 0,
                quota: 0
            },
            localStorage: {
                used: 0,
                max: 5 * 1024 * 1024 // ~5MB
            }
        };

        // localStorage stats
        try {
            const lsData = localStorage.getItem('fittrack-state') || '';
            stats.localStorage.used = new Blob([lsData]).size;
            stats.localStorage.percentage = ((stats.localStorage.used / stats.localStorage.max) * 100).toFixed(1);
        } catch (e) {}

        // IndexedDB stats (via Storage API si disponible)
        if (navigator.storage && navigator.storage.estimate) {
            try {
                const estimate = await navigator.storage.estimate();
                stats.indexedDB.usage = estimate.usage || 0;
                stats.indexedDB.quota = estimate.quota || 0;
                stats.indexedDB.percentage = estimate.quota
                    ? ((estimate.usage / estimate.quota) * 100).toFixed(2)
                    : 0;
            } catch (e) {}
        }

        return stats;
    }

    // ==================== EXPORT/IMPORT ====================

    /**
     * Exporte toutes les données en JSON
     */
    async function exportAllData() {
        if (!isInitialized || !db) {
            // Fallback sur state global
            return {
                source: 'localStorage',
                data: typeof state !== 'undefined' ? state : null,
                exportedAt: new Date().toISOString()
            };
        }

        try {
            const appState = await db.appState.get('main');
            const foodJournal = await db.foodJournal.toArray();
            const sessionHistory = await db.sessionHistory.toArray();
            const progressLog = await db.progressLog.toArray();
            const customFoods = await db.customFoods.toArray();
            const recipes = await db.recipes.toArray();

            return {
                source: 'IndexedDB',
                version: '2.0.0',
                exportedAt: new Date().toISOString(),
                data: {
                    appState: appState?.data,
                    foodJournal,
                    sessionHistory,
                    progressLog,
                    customFoods,
                    recipes
                }
            };
        } catch (error) {
            console.error('Erreur export:', error);
            return null;
        }
    }

    /**
     * Exporte en CSV (pour Excel/Sheets)
     */
    async function exportToCSV(dataType) {
        if (!isInitialized || !db) return null;

        try {
            let data = [];
            let headers = [];
            let filename = '';

            switch (dataType) {
                case 'foodJournal':
                    data = await db.foodJournal.toArray();
                    headers = ['date', 'mealType', 'foodId', 'foodName', 'quantity', 'calories', 'protein', 'carbs', 'fat'];
                    filename = 'repzy-nutrition';
                    data = data.map(e => ({
                        date: e.date,
                        mealType: e.mealType,
                        foodId: e.foodId,
                        foodName: e.foodName || e.foodId,
                        quantity: e.quantity,
                        calories: e.calories || 0,
                        protein: e.protein || 0,
                        carbs: e.carbs || 0,
                        fat: e.fat || 0
                    }));
                    break;

                case 'sessions':
                    data = await db.sessionHistory.toArray();
                    headers = ['date', 'dayType', 'duration', 'totalVolume', 'exerciseCount'];
                    filename = 'repzy-training';
                    data = data.map(s => ({
                        date: s.date,
                        dayType: s.dayType || s.day,
                        duration: s.duration || 0,
                        totalVolume: s.totalVolume || 0,
                        exerciseCount: (s.exercises || []).length
                    }));
                    break;

                case 'bodyweight':
                    const stateData = await loadStateFromIDB();
                    data = stateData?.bodyWeightLog || [];
                    headers = ['date', 'weight'];
                    filename = 'repzy-bodyweight';
                    break;

                default:
                    return null;
            }

            // Générer CSV
            const csvContent = [
                headers.join(','),
                ...data.map(row => headers.map(h => {
                    const val = row[h];
                    // Escape quotes et virgules
                    if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
                        return `"${val.replace(/"/g, '""')}"`;
                    }
                    return val ?? '';
                }).join(','))
            ].join('\n');

            return {
                content: csvContent,
                filename: `${filename}-${new Date().toISOString().split('T')[0]}.csv`,
                mimeType: 'text/csv'
            };

        } catch (error) {
            console.error('Erreur export CSV:', error);
            return null;
        }
    }

    // ==================== CLEANUP ====================

    /**
     * Nettoie les anciennes données
     */
    async function cleanupOldData(monthsToKeep = 6) {
        if (!isInitialized || !db) return 0;

        try {
            const cutoffDate = new Date();
            cutoffDate.setMonth(cutoffDate.getMonth() - monthsToKeep);
            const cutoffStr = cutoffDate.toISOString().split('T')[0];

            let deletedCount = 0;

            // Nettoyer food journal
            const oldFoodEntries = await db.foodJournal
                .where('date')
                .below(cutoffStr)
                .count();

            if (oldFoodEntries > 0) {
                await db.foodJournal
                    .where('date')
                    .below(cutoffStr)
                    .delete();
                deletedCount += oldFoodEntries;
            }

            // Nettoyer sync queue résolue
            await db.syncQueue
                .where('status')
                .notEqual('pending')
                .delete();

            if (deletedCount > 0) {
                console.log(`🧹 ${deletedCount} anciennes entrées supprimées`);
            }

            return deletedCount;

        } catch (error) {
            console.error('Erreur cleanup:', error);
            return 0;
        }
    }

    // ==================== PUBLIC API ====================

    window.RepzyDB = {
        // Init
        init: initDatabase,
        isReady: () => isInitialized,

        // State management
        saveState: saveStateToIDB,
        loadState: loadStateFromIDB,
        migrate: migrateFromLocalStorage,

        // Sync queue
        addToSyncQueue,
        getPendingSyncOps,
        markSynced,

        // Food journal
        addFoodEntry,
        getFoodJournalByDate,

        // Sessions
        addSession,
        getRecentSessions,

        // Utils
        getStorageStats,
        exportAllData,
        exportToCSV,
        cleanupOldData,

        // Direct DB access (pour debug)
        getDB: () => db
    };

    window.addToSyncQueue = function(type, action, data) {
        return window.RepzyDB && window.RepzyDB.addToSyncQueue(type, action, data);
    };

    console.log('📦 Database module loaded');

})();
