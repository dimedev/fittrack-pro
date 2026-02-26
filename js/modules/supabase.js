// ==================== SUPABASE MODULE ====================

// Configuration Supabase
const SUPABASE_URL = 'https://erszjvaajztewcukvwbj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyc3pqdmFhanp0ZXdjdWt2d2JqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5ODAzNjAsImV4cCI6MjA4NDU1NjM2MH0.jK2keM5VtaLkGR8kD2xhjEgqzmfymdNVmbw509ZO2t4';

// Client Supabase
let supabaseClient = null;
let currentUser = null;

// ==================== SYNC STATUS ====================
const SyncStatus = {
    IDLE: 'idle',
    SYNCING: 'syncing',
    SUCCESS: 'success',
    ERROR: 'error',
    OFFLINE: 'offline'
};

let currentSyncStatus = SyncStatus.IDLE;
let pendingSyncCount = 0;
let lastSyncError = null;
let isOnline = navigator.onLine;
let pendingConflict = null;
let lastCriticalToastTime = 0; // Anti-doublon pour les toasts critiques

// ==================== CRITICAL LOGGER ====================
// Journal local des operations critiques pour debug post-mortem
function criticalLog(action, data) {
    try {
        const entry = { ts: Date.now(), action, ...(data || {}) };
        const raw = localStorage.getItem('repzy-critical-log');
        const logs = raw ? JSON.parse(raw) : [];
        logs.push(entry);
        if (logs.length > 200) logs.splice(0, logs.length - 200);
        localStorage.setItem('repzy-critical-log', JSON.stringify(logs));
    } catch (_) {}
}
window.criticalLog = criticalLog;
window.showCriticalLog = function() {
    try {
        const raw = localStorage.getItem('repzy-critical-log');
        console.table(raw ? JSON.parse(raw) : []);
    } catch (_) { console.log('Pas de log critique'); }
};

// ==================== AUTO-SYNC POLLING ====================
let autoSyncInterval = null;
const AUTO_SYNC_INTERVAL_MS = 30000; // 30 secondes
let lastSyncTimestamp = 0;

/**
 * Formate le temps écoulé depuis la dernière sync
 * @returns {string} "à l'instant", "il y a X min", etc.
 */
function formatLastSyncTime() {
    if (lastSyncTimestamp === 0) return '';

    const now = Date.now();
    const diffMs = now - lastSyncTimestamp;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);

    if (diffSec < 30) {
        return 'à l\'instant';
    } else if (diffMin < 1) {
        return 'il y a moins d\'1 min';
    } else if (diffMin === 1) {
        return 'il y a 1 min';
    } else if (diffMin < 60) {
        return `il y a ${diffMin} min`;
    } else if (diffHour === 1) {
        return 'il y a 1 heure';
    } else if (diffHour < 24) {
        return `il y a ${diffHour} heures`;
    } else {
        // Afficher la date
        const date = new Date(lastSyncTimestamp);
        return `le ${date.toLocaleDateString('fr-FR')} à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    }
}

// Fonction de backup automatique des données en conflit
function saveConflictBackup(entity, localData) {
    try {
        const backup = {
            timestamp: new Date().toISOString(),
            entity,
            data: localData
        };
        
        // Récupérer les backups existants
        const backups = JSON.parse(localStorage.getItem('conflict-backups') || '[]');
        
        // Ajouter le nouveau backup
        backups.push(backup);
        
        // Garder seulement les 10 derniers
        const recentBackups = backups.slice(-10);
        
        localStorage.setItem('conflict-backups', JSON.stringify(recentBackups));
        console.log('💾 Backup sauvegardé:', entity);
    } catch (err) {
        console.warn('Erreur sauvegarde backup:', err);
    }
}

// Résolution automatique selon préférence
async function resolveConflictAutomatically(conflictData, strategy) {
    saveConflictBackup(conflictData.entity, state);

    if (strategy === 'merge' || strategy === 'server') {
        if (conflictData.serverData && strategy !== 'local') {
            mergeFieldLevel(conflictData.serverData);
            console.log('📤📥 Résolution auto (merge field-level): champs les plus récents conservés');
            await saveTrainingSettingsToSupabase();
            showToast('Données fusionnées intelligemment', 'success');
        } else {
            console.log('📥 Résolution auto (server): données serveur chargées');
            showToast('Données synchronisées (backup local sauvegardé)', 'info');
        }
    } else if (strategy === 'local') {
        console.log('📤 Résolution auto (local): envoi vers serveur');
        await saveTrainingSettingsToSupabase();
        showToast('Vos données locales ont été sauvegardées (backup créé)', 'success');
    }

    if (typeof markSyncComplete === 'function') {
        markSyncComplete();
    }
}

function mergeFieldLevel(serverData) {
    const serverTime = serverData.updated_at ? new Date(serverData.updated_at).getTime() : 0;
    const localTime = state._lastSaveTimestamp || 0;

    const fieldsMap = {
        wizard_results: 'wizardResults',
        training_progress: 'trainingProgress',
        session_templates: 'sessionTemplates',
        goals: 'goals',
        body_weight_log: 'bodyWeightLog',
        unlocked_achievements: 'unlockedAchievements'
    };

    for (const [serverKey, localKey] of Object.entries(fieldsMap)) {
        const serverVal = serverData[serverKey];
        const localVal = state[localKey];
        if (!serverVal) continue;

        if (!localVal || (typeof localVal === 'object' && Object.keys(localVal).length === 0)) {
            state[localKey] = serverVal;
        } else if (serverTime > localTime) {
            if (localKey === 'bodyWeightLog' && Array.isArray(serverVal) && Array.isArray(localVal)) {
                const merged = [...serverVal];
                localVal.forEach(entry => {
                    if (!merged.some(s => s.date === entry.date)) merged.push(entry);
                });
                state[localKey] = merged.sort((a, b) => new Date(a.date) - new Date(b.date));
            } else if (localKey === 'unlockedAchievements' && Array.isArray(serverVal)) {
                state[localKey] = [...new Set([...(localVal || []), ...serverVal])];
            } else {
                state[localKey] = serverVal;
            }
        }
    }
    console.log('🔀 Merge field-level terminé');
}

// Fonctions de résolution de conflits
function showConflictModal(conflictData) {
    pendingConflict = conflictData;
    
    const formatDate = (timestamp) => {
        if (!timestamp) return 'Inconnue';
        return new Date(timestamp).toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };
    
    // Afficher les différences
    document.getElementById('conflict-details').innerHTML = `
        <p>Des modifications ont été faites sur un autre appareil.</p>
        <div style="margin: 16px 0; padding: 12px; background: var(--bg-tertiary); border-radius: 8px;">
            <p><strong>Dernière sync locale:</strong> ${formatDate(conflictData.localTime)}</p>
            <p style="margin-top: 8px;"><strong>Modification serveur:</strong> ${formatDate(conflictData.serverTime)}</p>
        </div>
        <p style="color: var(--text-secondary); font-size: 0.9rem;">
            Choisissez quelle version conserver. Vos données locales seront écrasées si vous utilisez le serveur.
        </p>
    `;
    openModal('conflict-modal');
}

async function resolveConflict(choice) {
    if (!pendingConflict) {
        closeModal('conflict-modal');
        return;
    }
    
    // Vérifier si l'utilisateur veut sauvegarder sa préférence
    const rememberChoice = document.getElementById('conflict-remember-choice')?.checked;
    if (rememberChoice) {
        state.preferences.conflictResolution = choice;
        saveState();
        console.log(`💾 Préférence sauvegardée: ${choice}`);
    }
    
    // Sauvegarder un backup avant résolution
    saveConflictBackup(pendingConflict.entity, state);
    
    if (choice === 'local') {
        // Forcer l'envoi des données locales vers le serveur
        console.log('📤 Résolution conflit: utilisation des données locales');
        await saveTrainingSettingsToSupabase();
        const message = rememberChoice 
            ? 'Vos données locales ont été sauvegardées (préférence enregistrée)'
            : 'Vos données locales ont été sauvegardées';
        showToast(message, 'success');
    } else {
        // Les données serveur sont déjà chargées, on ne fait rien
        console.log('📥 Résolution conflit: utilisation des données serveur');
        const message = rememberChoice
            ? 'Données serveur chargées (préférence enregistrée)'
            : 'Données serveur chargées';
        showToast(message, 'info');
    }
    
    closeModal('conflict-modal');
    pendingConflict = null;
    
    // Marquer la sync comme complète pour éviter de détecter à nouveau le conflit
    if (typeof markSyncComplete === 'function') {
        markSyncComplete();
    }
}

// Mettre à jour le badge avec le nombre d'éléments en attente (synchronisation)
function updatePendingSyncBadge() {
    const badge = document.querySelector('.sync-badge');
    if (!badge) return;
    
    let pendingCount = 0;
    
    // Entrées journal sans supabaseId
    Object.values(state.foodJournal || {}).forEach(entries => {
        pendingCount += entries.filter(e => !e.supabaseId).length;
    });
    
    // Sessions cardio sans supabaseId
    Object.values(state.cardioLog || {}).forEach(sessions => {
        pendingCount += sessions.filter(s => !s.supabaseId).length;
    });
    
    // Séances : compter par .synced pour que le badge baisse après sync (on ne renseigne pas toujours supabaseId)
    if (state.sessionHistory) {
        pendingCount += state.sessionHistory.filter(s => !s.synced).length;
    }
    
    // Logs de progression non synchronisés
    Object.values(state.progressLog || {}).forEach(logs => {
        pendingCount += (logs || []).filter(l => !l.synced).length;
    });
    
    if (pendingCount > 0) {
        badge.textContent = pendingCount > 99 ? '99+' : pendingCount;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

// Exposer globalement pour l'utiliser depuis d'autres modules
window.updatePendingSyncBadge = updatePendingSyncBadge;

// Afficher le détail des items en attente de sync
function showPendingSyncDetails() {
    let details = {
        journal: 0,
        cardio: 0,
        sessions: 0,
        progressLog: 0
    };
    
    // Compter les entrées journal sans supabaseId
    Object.values(state.foodJournal || {}).forEach(entries => {
        details.journal += entries.filter(e => !e.supabaseId).length;
    });
    
    // Compter les sessions cardio sans supabaseId
    Object.values(state.cardioLog || {}).forEach(sessions => {
        details.cardio += sessions.filter(s => !s.supabaseId).length;
    });
    
    // Compter les sessions non syncées
    details.sessions = (state.sessionHistory || []).filter(s => !s.synced).length;
    
    // Compter les logs de progression non syncés
    Object.values(state.progressLog || {}).forEach(logs => {
        details.progressLog += logs.filter(l => !l.synced).length;
    });
    
    const total = details.journal + details.cardio + details.sessions + details.progressLog;
    
    if (total === 0) {
        showToast('✅ Toutes les données sont synchronisées', 'success');
        return;
    }
    
    let message = `En attente de sync:\n`;
    if (details.journal > 0) message += `\n🍽️ ${details.journal} aliment${details.journal > 1 ? 's' : ''}`;
    if (details.cardio > 0) message += `\n🏃 ${details.cardio} cardio`;
    if (details.sessions > 0) message += `\n💪 ${details.sessions} séance${details.sessions > 1 ? 's' : ''}`;
    if (details.progressLog > 0) message += `\n📊 ${details.progressLog} log${details.progressLog > 1 ? 's' : ''}`;
    
    showToast(message, 'info', 4000);
}

// Exposer globalement
window.showPendingSyncDetails = showPendingSyncDetails;

// Mettre à jour l'indicateur de sync dans l'UI
function updateSyncIndicator(status, message = null) {
    currentSyncStatus = status;
    const indicator = document.getElementById('sync-indicator');
    if (!indicator) return;
    
    // Reset classes
    indicator.className = 'sync-indicator';
    
    switch (status) {
        case SyncStatus.SYNCING:
            indicator.classList.add('syncing');
            indicator.title = 'Synchronisation en cours...';
            break;
        case SyncStatus.SUCCESS:
            indicator.classList.add('success');
            lastSyncTimestamp = Date.now(); // Mettre à jour le timestamp
            indicator.title = 'Données synchronisées - ' + formatLastSyncTime();
            // Reset après 3 secondes
            setTimeout(() => {
                if (currentSyncStatus === SyncStatus.SUCCESS) {
                    updateSyncIndicator(SyncStatus.IDLE);
                }
            }, 3000);
            break;
        case SyncStatus.ERROR:
            indicator.classList.add('error');
            indicator.title = message || 'Erreur de synchronisation';
            lastSyncError = message;
            break;
        case SyncStatus.OFFLINE:
            indicator.classList.add('offline');
            indicator.title = 'Mode hors-ligne';
            break;
        default:
            indicator.title = lastSyncTimestamp > 0
                ? 'Synchronisé - ' + formatLastSyncTime()
                : 'Synchronisé';
    }
    
    // Mettre à jour le badge
    updatePendingSyncBadge();
    
    // Compter réellement les items en attente (même logique que updatePendingSyncBadge)
    let queueCount = 0;
    if (state.foodJournal) {
        Object.values(state.foodJournal).forEach(dayEntries => {
            queueCount += dayEntries.filter(e => !e.supabaseId).length;
        });
    }
    if (state.sessionHistory) {
        queueCount += state.sessionHistory.filter(s => !s.synced).length;
    }
    if (state.cardioLog) {
        Object.values(state.cardioLog).forEach(daySessions => {
            if (Array.isArray(daySessions)) {
                queueCount += daySessions.filter(c => !c.supabaseId).length;
            }
        });
    }
    Object.values(state.progressLog || {}).forEach(logs => {
        queueCount += (logs || []).filter(l => !l.synced).length;
    });
    pendingSyncCount = queueCount;
    
    // Afficher le compteur si des items sont en attente
    const badge = indicator.querySelector('.sync-badge');
    if (badge) {
        if (pendingSyncCount > 0) {
            badge.textContent = pendingSyncCount > 99 ? '99+' : pendingSyncCount;
            badge.style.display = 'flex';
            
            // Mettre à jour le titre avec le nombre d'items
            if (status === SyncStatus.IDLE) {
                const lastSyncInfo = lastSyncTimestamp > 0 ? ` (sync ${formatLastSyncTime()})` : '';
                indicator.title = `${pendingSyncCount} élément(s) en attente - Cliquer pour sync${lastSyncInfo}`;
            }
        } else {
            badge.style.display = 'none';
        }
    }
}

// Retry avec backoff exponentiel
async function withRetry(fn, options = {}) {
    const {
        maxRetries = 3,
        baseDelay = 1000,
        maxDelay = 10000,
        onRetry = null,
        critical = false
    } = options;
    
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            updateSyncIndicator(SyncStatus.SYNCING);
            const result = await fn();
            updateSyncIndicator(SyncStatus.SUCCESS);
            return result;
        } catch (error) {
            lastError = error;
            
            if (attempt < maxRetries - 1) {
                const expDelay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
                const jitter = Math.random() * expDelay * 0.3;
                const delay = Math.round(expDelay + jitter);
                console.warn(`Retry ${attempt + 1}/${maxRetries} après ${delay}ms:`, error.message);
                
                if (onRetry) onRetry(attempt + 1, delay);
                
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    // Échec après tous les retries
    updateSyncIndicator(SyncStatus.ERROR, lastError?.message);
    
    // Notification pour les erreurs critiques — une seule toast toutes les 10s max
    if (critical) {
        const now = Date.now();
        if (now - lastCriticalToastTime > 10000) {
            lastCriticalToastTime = now;
            showToast('⚠️ Sync échouée — données sauvegardées localement, retry automatique.', 'warning');
        }
        updateSyncIndicator('error', 'Sync échoué');
    }
    
    throw lastError;
}

// Détection online/offline
function initNetworkDetection() {
    // Click handler pour afficher les détails de sync
    const syncIndicator = document.getElementById('sync-indicator');
    if (syncIndicator) {
        syncIndicator.style.cursor = 'pointer';
        syncIndicator.addEventListener('click', () => {
            showPendingSyncDetails();
        });
    }
    
    window.addEventListener('online', () => {
        isOnline = true;
        console.log('🌐 Retour en ligne');
        updateSyncIndicator(SyncStatus.IDLE);
        
        // Toast de retour en ligne
        showToast('Connexion rétablie - synchronisation...', 'success', 3000);
        
        // Tenter de synchroniser les données en attente
        if (currentUser) {
            setTimeout(async () => {
                await replaySyncQueue();
                await syncPendingData();
            }, 1000);
        }
    });
    
    window.addEventListener('offline', () => {
        isOnline = false;
        console.log('📴 Mode hors-ligne');
        updateSyncIndicator(SyncStatus.OFFLINE);
        
        // Toast hors-ligne
        showToast('Mode hors-ligne - vos données seront synchronisées', 'warning', 4000);
    });
    
    // Vérifier l'état initial
    if (!navigator.onLine) {
        updateSyncIndicator(SyncStatus.OFFLINE);
    }
}

// ==================== LOGS STRUCTURES DEBUG ====================

const syncLog = {
    history: [],
    add(event) {
        this.history.push({ ...event, timestamp: Date.now() });
        if (this.history.length > 100) this.history.shift();
        try {
            localStorage.setItem('fittrack-sync-log', JSON.stringify(this.history));
        } catch(e) {
            console.warn('Impossible de sauvegarder sync-log:', e);
        }
    },
    load() {
        try {
            const stored = localStorage.getItem('fittrack-sync-log');
            if (stored) {
                this.history = JSON.parse(stored);
            }
        } catch(e) {
            console.warn('Impossible de charger sync-log:', e);
        }
    },
    clear() {
        this.history = [];
        localStorage.removeItem('fittrack-sync-log');
    }
};

// Charger les logs au démarrage
syncLog.load();

// Exposer globalement pour debug
window.getSyncLog = () => {
    console.table(syncLog.history);
    return syncLog.history;
};

// ==================== VALIDATION SCHEMA ====================

const validators = {
    foodJournalEntry: (entry) => {
        return entry && 
               entry.foodId && 
               entry.date &&
               typeof entry.quantity === 'number' && 
               entry.quantity > 0 && entry.quantity <= 10000 &&
               entry.mealType && 
               ['breakfast', 'lunch', 'snack', 'dinner'].includes(entry.mealType) &&
               entry.addedAt;
    },
    workoutSession: (session) => {
        const isFree = session.sessionType === 'free';
        const isQuick = session.sessionType === 'quick';
        return session &&
               session.sessionId &&
               session.date &&
               (isFree || isQuick || (session.program && session.day)) &&
               Array.isArray(session.exercises) &&
               typeof session.duration === 'number' && session.duration >= 0 &&
               typeof session.totalVolume === 'number' && session.totalVolume >= 0;
    },
    cardioSession: (cardio) => {
        return cardio &&
               cardio.type && 
               ['running', 'cycling', 'walking', 'swimming', 'boxing', 'other'].includes(cardio.type) &&
               typeof cardio.duration === 'number' && cardio.duration > 0 && cardio.duration <= 600 &&
               cardio.intensity && 
               ['light', 'moderate', 'intense'].includes(cardio.intensity) &&
               cardio.date;
    },
    profile: (p) => {
        return p && 
               typeof p.age === 'number' && p.age >= 10 && p.age <= 120 &&
               typeof p.weight === 'number' && p.weight >= 20 && p.weight <= 500 &&
               typeof p.height === 'number' && p.height >= 50 && p.height <= 300 &&
               p.macros &&
               typeof p.macros.protein === 'number' && p.macros.protein >= 0 &&
               typeof p.macros.carbs === 'number' && p.macros.carbs >= 0 &&
               typeof p.macros.fat === 'number' && p.macros.fat >= 0;
    },
    customFood: (f) => {
        return f && 
               f.name && f.name.trim().length > 0 &&
               typeof f.calories === 'number' && f.calories >= 0 &&
               typeof f.protein === 'number' && f.protein >= 0 &&
               typeof f.carbs === 'number' && f.carbs >= 0 &&
               typeof f.fat === 'number' && f.fat >= 0;
    },
    customExercise: (ex) => {
        return ex &&
               ex.name && ex.name.trim().length > 0 &&
               ex.muscle &&
               ex.equipment;
    },
    progressLog: (log) => {
        // Accepter les deux formats: sets/reps OU achievedSets/achievedReps
        const sets = log.sets || log.achievedSets;
        const reps = log.reps || log.achievedReps;
        return log &&
               log.date &&
               typeof sets === 'number' && sets > 0 &&
               typeof reps === 'number' && reps > 0 &&
               typeof log.weight === 'number' && log.weight >= 0;
    },
    hydration: (h) => {
        return h &&
               h.date &&
               typeof h.amountMl === 'number' && h.amountMl >= 0 && h.amountMl <= 10000;
    },
    journalQuantity: (q) => {
        return typeof q === 'number' && q > 0 && q <= 10000;
    }
};

function validateBeforeSave(type, data) {
    const validator = validators[type];
    if (!validator) {
        console.warn(`⚠️ Pas de validator pour: ${type}`);
        return true; // Par défaut accepter
    }
    
    const isValid = validator(data);
    if (!isValid) {
        console.error(`❌ Validation échouée pour ${type}:`, data);
        syncLog.add({ event: 'validation_failed', type, data });
    }
    return isValid;
}

// ==================== COUCHE SAFESAVE CENTRALISÉE ====================

/**
 * Couche centralisée pour sauvegarder avec validation et retry
 * @param {string} type - Type de données (profile, foodJournalEntry, etc.)
 * @param {string} action - Action (insert, upsert, update, delete)
 * @param {Object} data - Données à sauvegarder
 * @param {Function} saveFn - Fonction de sauvegarde async
 * @returns {Promise<{success: boolean, data?: any, reason?: string, error?: Error}>}
 */
async function safeSave(type, action, data, saveFn) {
    // 1. Sanitize les valeurs corrompues
    const sanitized = typeof sanitizeCorruptedValues === 'function' 
        ? sanitizeCorruptedValues(data) 
        : data;
    
    // 2. Validate
    if (!validateBeforeSave(type, sanitized)) {
        showToast('Données invalides', 'error');
        syncLog.add({ event: 'save_rejected', type, action, data: sanitized });
        return { success: false, reason: 'validation_failed' };
    }
    
    // 3. Save avec retry + backoff
    try {
        const result = await withRetry(() => saveFn(sanitized), {
            maxRetries: 3, baseDelay: 1000, maxDelay: 15000, critical: false
        });
        syncLog.add({ event: 'save_success', type, action });
        return { success: true, data: result };
    } catch (error) {
        console.error(`❌ Erreur safeSave ${type}:`, error);
        syncLog.add({ event: 'save_error', type, action, error: error.message });
        return { success: false, reason: 'save_failed', error };
    }
}

// ==================== QUEUE OFFLINE PERSISTANTE ====================

function generateQueueId() {
    return `q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function addToSyncQueue(type, action, data) {
    if (!state.syncQueue) state.syncQueue = [];

    // Déduplication : éviter les doublons pour workout_session et progress_log
    if (type === 'workout_session' && data.sessionId) {
        const exists = state.syncQueue.some(item =>
            item.type === 'workout_session' && item.data?.sessionId === data.sessionId
        );
        if (exists) {
            console.log('📭 Déjà en queue (workout_session):', data.sessionId);
            return;
        }
    }
    if (type === 'progress_log' && data.sessionId && data.exerciseName) {
        const exists = state.syncQueue.some(item =>
            item.type === 'progress_log' &&
            item.data?.sessionId === data.sessionId &&
            item.data?.exerciseName === data.exerciseName
        );
        if (exists) {
            console.log('📭 Déjà en queue (progress_log):', data.exerciseName, data.sessionId);
            return;
        }
    }

    const queueItem = {
        id: generateQueueId(),
        type,        // 'food_journal', 'workout_session', 'cardio', etc.
        action,      // 'insert', 'upsert', 'delete', 'update'
        data,
        timestamp: Date.now(),
        retries: 0
    };

    state.syncQueue.push(queueItem);
    saveState();
    updateSyncIndicator(SyncStatus.IDLE); // Mettre à jour le badge
    
    console.log(`📥 Ajouté à la queue: ${type} (${action})`);
}

async function replaySyncQueue() {
    if (!state.syncQueue || state.syncQueue.length === 0) {
        console.log('📭 Queue vide, rien à synchroniser');
        return;
    }
    
    console.log(`🔄 Replay queue: ${state.syncQueue.length} items`);
    updateSyncIndicator(SyncStatus.SYNCING, `Sync ${state.syncQueue.length} items...`);
    
    const itemsToRemove = [];
    
    for (const item of state.syncQueue) {
        try {
            // Backoff exponentiel avant chaque tentative
            if (item.retries > 0) {
                const delay = Math.min(1000 * Math.pow(2, item.retries), 30000);
                console.log(`⏳ Retry ${item.retries} avec backoff ${delay}ms`);
                await new Promise(r => setTimeout(r, delay));
            }
            
            console.log(`🔄 Replay: ${item.type} ${item.action}`);
            
            // INSERT operations
            if (item.action === 'insert') {
                if (item.type === 'food_journal') {
                    await addJournalEntryToSupabase(item.data.date, item.data.foodId, item.data.quantity, item.data.mealType);
                } else if (item.type === 'workout_session') {
                    await saveWorkoutSessionToSupabase(item.data);
                } else if (item.type === 'cardio_session') {
                    await saveCardioSessionToSupabase(item.data);
                } else if (item.type === 'custom_food') {
                    await saveCustomFoodToSupabase(item.data);
                } else if (item.type === 'custom_exercise') {
                    await saveCustomExerciseToSupabase(item.data);
                } else if (item.type === 'progress_log') {
                    await saveProgressLogToSupabase(item.data.exerciseName, item.data);
                }
            }
            // UPSERT operations
            else if (item.action === 'upsert') {
                if (item.type === 'profile') {
                    await saveProfileToSupabase();
                } else if (item.type === 'workout_session') {
                    await saveWorkoutSessionToSupabase(item.data);
                } else if (item.type === 'hydration') {
                    await saveHydrationToSupabase(item.data.date, item.data.amountMl || item.data.amount);
                } else if (item.type === 'exercise_swap') {
                    await saveExerciseSwapToSupabase(item.data.originalExercise, item.data.replacementId);
                } else if (item.type === 'training_settings') {
                    await saveTrainingSettingsToSupabase();
                }
            }
            // UPDATE operations
            else if (item.action === 'update') {
                if (item.type === 'food_journal') {
                    await updateJournalEntryInSupabase(item.data.id, item.data.quantity);
                } else if (item.type === 'meal_combo') {
                    if (typeof updateMealComboUsageInSupabase === 'function') {
                        await updateMealComboUsageInSupabase(item.data.id, item.data.usageCount, item.data.lastUsed);
                    }
                }
            }
            // DELETE operations
            else if (item.action === 'delete') {
                if (item.type === 'food_journal') {
                    if (item.data.clearAll) {
                        await clearJournalDayInSupabase(item.data.date);
                    } else {
                        await deleteJournalEntryFromSupabase(item.data.id);
                    }
                } else if (item.type === 'custom_food') {
                    await deleteCustomFoodFromSupabase(item.data.id);
                } else if (item.type === 'cardio_session') {
                    await deleteCardioSessionFromSupabase(item.data.id);
                } else if (item.type === 'exercise_swap') {
                    await deleteExerciseSwapFromSupabase(item.data.originalExercise);
                } else if (item.type === 'workout_session') {
                    await deleteWorkoutSessionFromSupabase(item.data.sessionId);
                } else if (item.type === 'progress_log') {
                    await deleteProgressLogForSession(item.data.sessionId, item.data.sessionDate, item.data.exerciseNames);
                } else if (item.type === 'meal_combo') {
                    if (typeof deleteMealComboFromSupabase === 'function') {
                        await deleteMealComboFromSupabase(item.data.id);
                    }
                }
            }
            
            itemsToRemove.push(item.id);
        } catch (error) {
            console.error(`❌ Échec replay ${item.type} ${item.action}:`, error);
            item.retries = (item.retries || 0) + 1;
            
            // Abandonner après 5 tentatives
            if (item.retries >= 5) {
                console.warn(`⚠️ Item abandonné après 5 tentatives: ${item.id}`);
                syncLog.add({ event: 'replay_abandoned', item, error: error.message });
                itemsToRemove.push(item.id);
            }
        }
    }
    
    // Retirer les items synchronisés
    state.syncQueue = state.syncQueue.filter(item => !itemsToRemove.includes(item.id));
    saveState();
    
    if (state.syncQueue.length === 0) {
        updateSyncIndicator(SyncStatus.SUCCESS, 'Queue synchronisée !');
        console.log('✅ Queue complètement synchronisée');
    } else {
        updateSyncIndicator(SyncStatus.ERROR, `${state.syncQueue.length} items restants`);
        console.warn(`⚠️ ${state.syncQueue.length} items n'ont pas pu être synchronisés`);
    }
}

// Synchroniser les données en attente (appelé au retour en ligne)
// Vérifier si une entrée identique existe déjà dans Supabase
async function checkExistingEntry(date, foodId, quantity) {
    if (!currentUser || !isOnline) return null;
    
    try {
        // Utiliser withRetry pour plus de robustesse
        return await withRetry(async () => {
            const { data, error } = await supabaseClient
                .from('food_journal')
                .select('id')
                .eq('user_id', currentUser.id)
                .eq('date', date)
                .eq('food_id', foodId)
                .eq('quantity', quantity)
                .maybeSingle();
            
            if (error) throw error;
            return data;
        }, { maxRetries: 2, baseDelay: 500 });
    } catch (error) {
        console.warn('Erreur vérification entrée existante:', error);
        return null;
    }
}

async function syncPendingData() {
    if (!currentUser || !isOnline) return;

    console.log('🔄 Synchronisation des données en attente...');
    updateSyncIndicator(SyncStatus.SYNCING);

    try {
        // 0. Traiter la queue persistante (IndexedDB) — séances/cardio enregistrés hors ligne
        if (window.RepzyDB && typeof window.RepzyDB.getPendingSyncOps === 'function') {
            const pending = await window.RepzyDB.getPendingSyncOps();
            for (const op of pending) {
                try {
                    const { type, action, data, id } = op;
                    const sessionPayload = data?.session || (type === 'workout_session' ? data : null);
                    if ((type === 'session' || type === 'workout_session') && (action === 'add' || action === 'insert') && sessionPayload) {
                        await saveWorkoutSessionToSupabase(sessionPayload);
                        if (sessionPayload) sessionPayload.synced = true;
                        if (state.sessionHistory) {
                            const idx = state.sessionHistory.findIndex(s => (s.sessionId && s.sessionId === sessionPayload.sessionId) || (s.date === sessionPayload.date && s.addedAt === sessionPayload.addedAt));
                            if (idx >= 0) state.sessionHistory[idx].synced = true;
                        }
                    } else if (type === 'foodJournal' && action === 'add' && data?.date && data?.entry) {
                        const entryId = await addJournalEntryToSupabase(data.date, data.entry.foodId, data.entry.quantity, data.entry.mealType || 'lunch', data.entry.unitType, data.entry.unitCount);
                        if (entryId && state.foodJournal?.[data.date]) {
                            const entry = state.foodJournal[data.date].find(e => e.addedAt === data.entry.addedAt);
                            if (entry) entry.supabaseId = entryId;
                        }
                    }
                    await window.RepzyDB.markSynced(op.id);
                } catch (err) {
                    console.warn('Erreur sync queue item:', op?.type, err);
                }
            }
            if (pending.length > 0) saveState();
        }

        // 1. Re-sauvegarder les paramètres d'entraînement
        await saveTrainingSettingsToSupabase();
        
        // 2. Re-sauvegarder le profil si présent
        if (state.profile && state.profile.age) {
            await saveProfileToSupabase(state.profile);
        }
        
        // 3. Synchroniser le journal alimentaire non synchronisé (anti-duplication)
        if (state.foodJournal) {
            for (const [date, entries] of Object.entries(state.foodJournal)) {
                for (const entry of entries) {
                    // Vérifier que l'entrée a un foodId valide et n'est pas déjà synchronisée
                    if (!entry.supabaseId && entry.foodId && entry.quantity) {
                        try {
                            // Vérifier si une entrée identique existe déjà
                            const existing = await checkExistingEntry(date, entry.foodId, entry.quantity);
                            
                            if (existing) {
                                // Utiliser l'ID existant au lieu de créer un doublon
                                entry.supabaseId = existing.id;
                                console.log('✓ Entrée existante trouvée, doublon évité');
                            } else {
                                // Créer une nouvelle entrée (avec mealType)
                                const id = await addJournalEntryToSupabase(
                                    date,
                                    entry.foodId,
                                    entry.quantity,
                                    entry.mealType || inferMealType(entry.addedAt || Date.now()),
                                    entry.unitType,
                                    entry.unitCount
                                );
                                if (id) entry.supabaseId = id;
                            }
                        } catch (err) {
                            console.warn('Erreur sync journal entry:', err);
                        }
                    }
                }
            }
            saveState();
        }
        
        // 4. Synchroniser les logs de progression non synchronisés
        if (state.progressLog) {
            for (const [exercise, logs] of Object.entries(state.progressLog)) {
                for (const log of logs) {
                    if (!log.synced) {
                        try {
                            await saveProgressLogToSupabase(exercise, log);
                            log.synced = true;
                        } catch (err) {
                            console.warn('Erreur sync progress log:', err);
                        }
                    }
                }
            }
            saveState();
        }
        
        // 5. Synchroniser les séances d'entraînement non synchronisées
        if (state.sessionHistory) {
            for (const session of state.sessionHistory) {
                if (!session.synced) {
                    try {
                        await saveWorkoutSessionToSupabase(session);
                        session.synced = true;
                    } catch (err) {
                        console.warn('Erreur sync workout session:', err);
                    }
                }
            }
            saveState();
        }
        
        // 6. Synchroniser les sessions cardio non synchronisées
        if (state.cardioLog) {
            for (const [date, sessions] of Object.entries(state.cardioLog)) {
                for (const session of sessions) {
                    if (!session.supabaseId && session.type && session.duration) {
                        try {
                            const id = await saveCardioSessionToSupabase({
                                date: date,
                                type: session.type,
                                duration: session.duration,
                                intensity: session.intensity,
                                calories: session.calories
                            });
                            if (id) {
                                session.supabaseId = id;
                                session.synced = true;
                            }
                        } catch (err) {
                            console.warn('Erreur sync cardio session:', err);
                        }
                    }
                }
            }
            saveState();
        }
        
        // 7. Synchroniser les exercices personnalisés non synchronisés
        if (state.exercises) {
            const customExercises = state.exercises.filter(ex => 
                ex.id.startsWith('custom-') && !ex.synced
            );
            
            for (const exercise of customExercises) {
                try {
                    await saveCustomExerciseToSupabase(exercise);
                    exercise.synced = true;
                } catch (err) {
                    console.warn('Erreur sync custom exercise:', err);
                }
            }
            if (customExercises.length > 0) {
                saveState();
            }
        }
        
        // 8. Synchroniser les swaps d'exercices non synchronisés
        if (state.exerciseSwaps) {
            for (const [originalExercise, replacementId] of Object.entries(state.exerciseSwaps)) {
                // Vérifier si ce swap est déjà synchronisé
                try {
                    await saveExerciseSwapToSupabase(originalExercise, replacementId);
                } catch (err) {
                    console.warn('Erreur sync exercise swap:', err);
                }
            }
        }
        
        // 9. Synchroniser l'hydratation
        if (state.hydration) {
            for (const [date, amountMl] of Object.entries(state.hydration)) {
                try {
                    await saveHydrationToSupabase(date, amountMl);
                } catch (err) {
                    console.warn('Erreur sync hydratation:', err);
                }
            }
        }
        
        updateSyncIndicator(SyncStatus.SUCCESS);
        console.log('✅ Toutes les données synchronisées');
    } catch (error) {
        console.error('Erreur sync pending:', error);
        updateSyncIndicator('error', 'Sync échoué');
        showToast('⚠️ Synchronisation incomplète. Vos données sont sauvegardées sur cet appareil.', 'warning');
    }
}

// Initialiser Supabase
function initSupabase() {
    try {
        // Le SDK v2 expose supabase.createClient directement
        if (window.supabase && window.supabase.createClient) {
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('✅ Supabase initialisé');
        } else {
            console.error('❌ Supabase SDK non trouvé');
            return;
        }
        
        // Initialiser la détection réseau
        initNetworkDetection();
        
        // Écouter les changements d'auth — debounce pour eviter triple appel
        // SIGNED_IN + INITIAL_SESSION + getSession() arrivent quasi-simultanement
        // On debounce pour n'appeler onUserLoggedIn() qu'une seule fois
        let _authDebounceTimer = null;
        let _authDone = false;
        supabaseClient.auth.onAuthStateChange((event, session) => {
            console.log('Auth event:', event);
            if (session && session.user) {
                currentUser = session.user;
                clearTimeout(_authDebounceTimer);
                if (!_authDone) {
                    _authDebounceTimer = setTimeout(() => {
                        _authDone = true;
                        onUserLoggedIn();
                    }, 400);
                }
            } else if (!session) {
                currentUser = null;
                _authDone = false;
                clearTimeout(_authDebounceTimer);
                onUserLoggedOut();
            }
        });
        
        // checkAuth n'appelle plus onUserLoggedIn directement — laisse onAuthStateChange s'en charger
        checkAuth();
    } catch (error) {
        console.error('Erreur init Supabase:', error);
    }
}

// Vérifier l'authentification (ne declenche PAS onUserLoggedIn — onAuthStateChange s'en charge)
async function checkAuth() {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            currentUser = session.user;
        } else {
            showAuthModal();
        }
    } catch (error) {
        console.error('Erreur auth:', error);
        showAuthModal();
    }
}

// ==================== AUTHENTIFICATION ====================

// Inscription
async function signUp(email, password) {
    try {
        const { data, error } = await supabaseClient.auth.signUp({
            email,
            password
        });
        
        if (error) throw error;
        
        showToast('Compte créé ! Vérifiez vos emails pour confirmer.', 'success');
        return data;
    } catch (error) {
        showToast(error.message, 'error');
        throw error;
    }
}

// Connexion
async function signIn(email, password) {
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) throw error;
        
        showToast('Connexion réussie !', 'success');
        closeModal('auth-modal');
        return data;
    } catch (error) {
        showToast(error.message, 'error');
        throw error;
    }
}

// Connexion avec Google
async function signInWithGoogle() {
    try {
        // Get base URL (supports GitHub Pages subdirectory)
        const basePath = window.location.pathname.includes('/fittrack-pro') 
            ? '/fittrack-pro' 
            : '';
        const redirectUrl = window.location.origin + basePath + '/auth/callback/';
        
        const { data, error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectUrl
            }
        });
        
        if (error) throw error;
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Déconnexion
async function signOut() {
    try {
        await supabaseClient.auth.signOut();
        showToast('Déconnecté', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Réinitialisation du mot de passe (envoi email)
async function resetPassword(email) {
    try {
        // Get base URL (supports GitHub Pages subdirectory)
        const basePath = window.location.pathname.includes('/fittrack-pro') 
            ? '/fittrack-pro' 
            : '';
        const redirectUrl = window.location.origin + basePath + '/auth/update-password/';
        
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: redirectUrl
        });
        
        if (error) throw error;
        
        showToast('Email de réinitialisation envoyé !', 'success');
        return { success: true };
    } catch (error) {
        console.error('Reset password error:', error);
        showToast(error.message, 'error');
        return { success: false, error: error.message };
    }
}

// Mise à jour du mot de passe
async function updatePassword(newPassword) {
    try {
        const { error } = await supabaseClient.auth.updateUser({
            password: newPassword
        });
        
        if (error) throw error;
        
        showToast('Mot de passe mis à jour !', 'success');
        return { success: true };
    } catch (error) {
        console.error('Update password error:', error);
        showToast(error.message, 'error');
        return { success: false, error: error.message };
    }
}

// Callback quand l'utilisateur se connecte
async function onUserLoggedIn() {
    console.log('👤 Utilisateur connecté:', currentUser.email);
    closeModal('auth-modal');
    updateAuthUI();

    // Analytics — identifier l'utilisateur
    if (window.posthog && window.posthog.__loaded) {
        posthog.identify(currentUser.id, { email: currentUser.email });
    }
    window.track?.('user_login', { method: 'email' });

    // Charger les données depuis Supabase
    await loadAllDataFromSupabase();

    // Montrer l'onboarding si premier lancement (après chargement des données)
    setTimeout(() => {
        if (typeof Onboarding !== 'undefined') Onboarding.show();
    }, 600);

    // Démarrer le polling automatique
    startAutoSync();
}

// Callback quand l'utilisateur se déconnecte
function onUserLoggedOut() {
    console.log('👤 Utilisateur déconnecté');
    
    // Arrêter le polling automatique
    stopAutoSync();
    
    updateAuthUI();
    showAuthModal();
}

// Mettre à jour l'UI d'auth
function updateAuthUI() {
    const authBtn = document.getElementById('auth-btn');
    const userEmail = document.getElementById('user-email');
    const mobileUserEmail = document.getElementById('mobile-user-email');
    
    if (currentUser) {
        if (authBtn) authBtn.textContent = 'Déconnexion';
        if (userEmail) userEmail.textContent = currentUser.email;
        if (mobileUserEmail) mobileUserEmail.textContent = currentUser.email;
    } else {
        if (authBtn) authBtn.textContent = 'Connexion';
        if (userEmail) userEmail.textContent = '';
        if (mobileUserEmail) mobileUserEmail.textContent = '--';
    }
}

// Afficher la modal d'auth
function showAuthModal() {
    openModal('auth-modal');
}

// ==================== SYNC DONNÉES ====================

// Guard anti-parallel : empeche les appels concurrents qui ecrasent les donnees
let _isLoadingFromSupabase = false;
let _loadQueuedSilent = null;

// Charger toutes les données depuis Supabase
async function loadAllDataFromSupabase(silent = false) {
    if (!currentUser) return;
    
    if (_isLoadingFromSupabase) {
        console.log('⏳ loadAllDataFromSupabase déjà en cours — appel ignoré');
        _loadQueuedSilent = silent;
        return;
    }
    _isLoadingFromSupabase = true;
    
    // Afficher indicateur de sync en cours
    if (!silent) {
        updateSyncIndicator('syncing', 'Chargement...');
    }
    
    try {
        if (!silent) {
            console.log('📥 Chargement des données...');
            
            // Afficher les skeletons pendant le chargement
            if (window.PremiumUI && typeof showInitialSkeletons === 'function') {
                showInitialSkeletons();
            }
        }
        
        // Charger le profil (maybeSingle pour éviter erreur si pas de données)
        const { data: profile, error: profileError } = await supabaseClient
            .from('user_profiles')
            .select('*')
            .eq('user_id', currentUser.id)
            .maybeSingle();
        
        if (profile) {
            state.profile = {
                pseudo: profile.pseudo || null,
                age: profile.age,
                gender: profile.gender,
                weight: parseFloat(profile.weight),
                height: parseFloat(profile.height),
                activity: parseFloat(profile.activity),
                goal: profile.goal,
                bmr: parseFloat(profile.bmr),
                tdee: parseFloat(profile.tdee),
                targetCalories: parseFloat(profile.target_calories),
                macros: {
                    protein: parseFloat(profile.target_protein),
                    carbs: parseFloat(profile.target_carbs),
                    fat: parseFloat(profile.target_fat)
                }
            };
        }
        
        // Charger les aliments personnalisés
        const { data: customFoods } = await supabaseClient
            .from('custom_foods')
            .select('*')
            .eq('user_id', currentUser.id);
        
        if (customFoods && customFoods.length > 0) {
            const customFoodsList = customFoods.map(f => {
                const food = {
                    id: 'custom-' + f.id,
                    name: f.name,
                    calories: parseFloat(f.calories),
                    protein: parseFloat(f.protein),
                    carbs: parseFloat(f.carbs),
                    fat: parseFloat(f.fat),
                    category: f.category
                };
                
                // Ajouter les propriétés d'unité si présentes
                if (f.unit) food.unit = f.unit;
                if (f.unit_label) food.unitLabel = f.unit_label;
                if (f.unit_weight) food.unitWeight = parseFloat(f.unit_weight);
                
                return food;
            });
            
            // CRITIQUE : Merge intelligent pour ne pas perdre les aliments locaux non synchronisés
            // Garder les aliments avec ID temporaire (timestamp) = créés localement mais pas encore syncés
            const localPendingFoods = state.foods.filter(f => 
                f.id.startsWith('custom-') && f.id.match(/^custom-\d{13}$/) // ID timestamp = non synce
            );
            
            state.foods = [...defaultFoods, ...customFoodsList, ...localPendingFoods];
        }
        
        // Charger les exercices personnalisés
        const { data: customExercises } = await supabaseClient
            .from('custom_exercises')
            .select('*')
            .eq('user_id', currentUser.id);
        
        if (customExercises && customExercises.length > 0) {
            const customExList = customExercises.map(e => ({
                id: 'custom-' + e.id,
                name: e.name,
                muscle: e.muscle,
                equipment: e.equipment
            }));
            state.exercises = [...defaultExercises, ...customExList];
        }
        
        // Charger les swaps d'exercices avec MERGE intelligent
        const { data: swaps } = await supabaseClient
            .from('exercise_swaps')
            .select('*')
            .eq('user_id', currentUser.id);
        
        if (swaps) {
            // Garder les swaps locaux
            const localSwaps = { ...state.exerciseSwaps };
            
            // Reconstruire depuis Supabase
            const supabaseSwaps = {};
            swaps.forEach(s => {
                supabaseSwaps[s.original_exercise] = s.replacement_exercise_id;
            });
            
            // Merger : Supabase prioritaire, mais conserver les swaps locaux non présents
            state.exerciseSwaps = { ...supabaseSwaps };
            
            // Ajouter les swaps locaux manquants - NE PAS sync automatiquement pour éviter cascade d'erreurs
            // Les swaps seront syncés individuellement quand l'utilisateur fait un changement
            Object.keys(localSwaps).forEach(originalExercise => {
                if (!supabaseSwaps[originalExercise]) {
                    // Swap local non présent dans Supabase, le garder localement
                    // Sera syncé lors de la prochaine sauvegarde utilisateur
                    state.exerciseSwaps[originalExercise] = localSwaps[originalExercise];
                }
            });
        }
        
        // Charger les paramètres d'entraînement (maybeSingle pour éviter erreur si pas de données)
        const { data: trainingSettings, error: trainingError } = await supabaseClient
            .from('training_settings')
            .select('*')
            .eq('user_id', currentUser.id)
            .maybeSingle();
        
        if (trainingSettings) {
            // Détection de conflit multi-devices
            if (typeof detectConflict === 'function' && trainingSettings.updated_at) {
                const conflict = detectConflict(trainingSettings.updated_at);
                if (conflict.hasConflict) {
                    console.warn('⚠️ Conflit détecté entre données locales et serveur');
                    
                    const conflictData = {
                        entity: 'training_settings',
                        localTime: conflict.localTime,
                        serverTime: conflict.serverTime,
                        serverIsNewer: conflict.serverIsNewer,
                        serverData: trainingSettings
                    };
                    
                    // Récupérer la préférence utilisateur
                    const strategy = state.preferences?.conflictResolution || 'merge';
                    
                    if (strategy === 'ask') {
                        // Afficher la modal pour demander à l'utilisateur
                        showConflictModal(conflictData);
                        // Stopper le chargement pour attendre la résolution
                        return;
                    } else {
                        // Résolution automatique selon la préférence
                        await resolveConflictAutomatically(conflictData, strategy);
                        // Si strategy === 'local', on arrête ici car on va forcer l'envoi
                        if (strategy === 'local') {
                            return;
                        }
                        // Si strategy === 'server', continuer le chargement normal
                    }
                }
            }
            
            state.selectedProgram = trainingSettings.selected_program;
            state.trainingDays = trainingSettings.training_days;
            
            // Charger les données complètes de training
            if (trainingSettings.wizard_results) {
                state.wizardResults = trainingSettings.wizard_results;
            }
            if (trainingSettings.training_progress) {
                // Extraire periodization si présent dans training_progress
                const { periodization, ...trainingProgressOnly } = trainingSettings.training_progress;
                state.trainingProgress = trainingProgressOnly;

                // Restaurer periodization si présent
                if (periodization) {
                    state.periodization = { ...state.periodization, ...periodization };
                    console.log('✅ Périodisation restaurée depuis Supabase');
                }
            }
            if (trainingSettings.session_templates) {
                state.sessionTemplates = trainingSettings.session_templates;
            }
            // Charger goals et streak
            if (trainingSettings.goals) {
                state.goals = trainingSettings.goals;
            }
            // Charger le log de poids corporel
            if (trainingSettings.body_weight_log) {
                state.bodyWeightLog = trainingSettings.body_weight_log;
            }
            // Charger les achievements débloqués
            if (trainingSettings.unlocked_achievements) {
                state.unlockedAchievements = trainingSettings.unlocked_achievements;
            }
        }
        
        // Charger TOUT le journal alimentaire avec MERGE intelligent
        const { data: journal } = await supabaseClient
            .from('food_journal')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('date', { ascending: false });
        
        if (journal) {
            // Garder les entrées locales par date
            const localJournal = { ...(state.foodJournal || {}) };
            
            // Reconstruire depuis Supabase
            const supabaseJournal = {};
            journal.forEach(entry => {
                if (!supabaseJournal[entry.date]) {
                    supabaseJournal[entry.date] = [];
                }
                supabaseJournal[entry.date].push({
                    foodId: entry.food_id,
                    quantity: entry.quantity,
                    addedAt: new Date(entry.added_at).getTime(),
                    supabaseId: entry.id,
                    mealType: entry.meal_type || 'snack',
                    unitType: entry.unit_type,
                    unitCount: entry.unit_count,
                    synced: true // Marquer comme synchronisé
                });
            });
            
            // Merger : Supabase + entrées locales non sync
            state.foodJournal = { ...supabaseJournal };
            
            // Identifier et ajouter les entrées locales non présentes dans Supabase
            Object.entries(localJournal).forEach(([date, localEntries]) => {
                if (!localEntries) return;
                
                localEntries.forEach(localEntry => {
                    // Vérifier si l'entrée est déjà dans Supabase
                    const existsInSupabase = supabaseJournal[date]?.some(sEntry =>
                        sEntry.foodId === localEntry.foodId &&
                        sEntry.quantity === localEntry.quantity &&
                        Math.abs(sEntry.addedAt - localEntry.addedAt) < 2000 // 2 secondes de tolérance
                    );
                    
                    if (!existsInSupabase && !localEntry.supabaseId) {
                        // Entrée locale non synchronisée
                        if (!state.foodJournal[date]) {
                            state.foodJournal[date] = [];
                        }
                        
                        state.foodJournal[date].push({
                            ...localEntry,
                            synced: false
                        });
                        
                        // Tenter de sync cette entrée manquante
                        addJournalEntryToSupabase(
                            date,
                            localEntry.foodId,
                            localEntry.quantity,
                            localEntry.mealType || 'snack',
                            localEntry.unitType,
                            localEntry.unitCount
                        ).then(id => {
                            if (id) {
                                // Mettre à jour l'ID et marquer comme syncé
                                const entry = state.foodJournal[date]?.find(e =>
                                    e.foodId === localEntry.foodId &&
                                    e.addedAt === localEntry.addedAt
                                );
                                if (entry) {
                                    entry.supabaseId = id;
                                    entry.synced = true;
                                    saveState();
                                }
                            }
                        }).catch(err => {
                            console.warn('Sync rattrapage journal:', err);
                        });
                    }
                });
            });
        }
        
        // Charger TOUTES les sessions cardio avec MERGE intelligent
        try {
            const cardioSessions = await loadCardioSessionsFromSupabase();
            if (cardioSessions && cardioSessions.length > 0) {
                // Garder les sessions locales par date
                const localCardio = { ...(state.cardioLog || {}) };
                
                // Reconstruire depuis Supabase
                const supabaseCardio = {};
                cardioSessions.forEach(session => {
                    if (!supabaseCardio[session.date]) {
                        supabaseCardio[session.date] = [];
                    }
                    supabaseCardio[session.date].push({
                        type: session.type,
                        duration: session.duration_minutes,
                        intensity: session.intensity,
                        calories: session.calories_burned,
                        addedAt: new Date(session.created_at).getTime(),
                        supabaseId: session.id,
                        synced: true // Marquer comme synchronisé
                    });
                });
                
                // Merger : Supabase + sessions locales non sync
                state.cardioLog = { ...supabaseCardio };
                
                // Identifier et ajouter les sessions locales non présentes dans Supabase
                Object.entries(localCardio).forEach(([date, localSessions]) => {
                    if (!localSessions) return;
                    
                    localSessions.forEach(localSession => {
                        // Vérifier si la session est déjà dans Supabase
                        const existsInSupabase = supabaseCardio[date]?.some(sSession =>
                            sSession.type === localSession.type &&
                            sSession.duration === localSession.duration &&
                            Math.abs(sSession.addedAt - localSession.addedAt) < 2000 // 2 secondes de tolérance
                        );
                        
                        if (!existsInSupabase && !localSession.supabaseId) {
                            // Session locale non synchronisée
                            if (!state.cardioLog[date]) {
                                state.cardioLog[date] = [];
                            }
                            
                            state.cardioLog[date].push({
                                ...localSession,
                                synced: false
                            });
                            
                            // Tenter de sync cette session manquante
                            saveCardioSessionToSupabase({
                                date: date,
                                type: localSession.type,
                                duration: localSession.duration,
                                intensity: localSession.intensity,
                                calories: localSession.calories
                            }).then(id => {
                                if (id) {
                                    // Mettre à jour l'ID et marquer comme syncé
                                    const session = state.cardioLog[date]?.find(s =>
                                        s.type === localSession.type &&
                                        s.addedAt === localSession.addedAt
                                    );
                                    if (session) {
                                        session.supabaseId = id;
                                        session.synced = true;
                                        saveState();
                                    }
                                }
                            }).catch(err => {
                                console.warn('Sync rattrapage cardio:', err);
                            });
                        }
                    });
                });
            }
        } catch (e) {
            console.log('Table cardio_sessions non disponible:', e.message);
        }
        
        // Charger l'hydratation
        try {
            const { data: hydrationData } = await supabaseClient
                .from('hydration_log')
                .select('*')
                .eq('user_id', currentUser.id)
                .order('date', { ascending: false })
                .limit(30); // 30 derniers jours
            
            if (hydrationData && hydrationData.length > 0) {
                state.hydration = {};
                hydrationData.forEach(entry => {
                    state.hydration[entry.date] = entry.amount_ml;
                });
            }
        } catch (e) {
            console.log('Table hydration_log non disponible:', e.message);
        }
        
        // Charger les combos de repas favoris
        try {
            if (window.MealTemplates && typeof window.MealTemplates.loadFromSupabase === 'function') {
                const combos = await window.MealTemplates.loadFromSupabase();
                if (combos && combos.length > 0) {
                    state.mealCombos = combos;
                    console.log(`📦 ${combos.length} combo(s) chargé(s)`);
                }
            }
        } catch (e) {
            console.log('Table meal_combos non disponible:', e.message);
        }
        
        // Charger les photos de progression
        try {
            if (typeof fetchUserPhotos === 'function') {
                const photos = await fetchUserPhotos();
                if (photos && photos.length > 0) {
                    state.progressPhotos = photos;
                    console.log(`📸 ${photos.length} photo(s) chargée(s)`);
                }
            }
        } catch (e) {
            console.log('Table progress_photos non disponible:', e.message);
        }
        
        // Charger l'historique de progression avec MERGE intelligent
        const { data: progressLog } = await supabaseClient
            .from('progress_log')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('date', { ascending: true });
        
        if (progressLog) {
            // Garder les logs locaux qui ne sont pas encore sync
            const localProgressLog = { ...state.progressLog };
            
            // Reconstruire depuis Supabase
            const supabaseProgressLog = {};
            progressLog.forEach(log => {
                if (!supabaseProgressLog[log.exercise_name]) {
                    supabaseProgressLog[log.exercise_name] = [];
                }
                
                const logEntry = {
                    date: log.date,
                    sets: log.sets,
                    reps: log.reps,
                    weight: parseFloat(log.weight),
                    achievedReps: log.achieved_reps,
                    achievedSets: log.achieved_sets,
                    synced: true // Marquer comme synchronisé
                };
                
                // Récupérer setsDetail si disponible
                if (log.sets_detail) {
                    logEntry.setsDetail = log.sets_detail;
                }
                
                supabaseProgressLog[log.exercise_name].push(logEntry);
            });
            
            // Merger : Supabase + logs locaux non présents dans Supabase
            state.progressLog = supabaseProgressLog;
            
            // Ajouter les logs locaux manquants (par date+exercice unique)
            Object.keys(localProgressLog).forEach(exerciseName => {
                const localLogs = localProgressLog[exerciseName] || [];
                const supabaseLogs = state.progressLog[exerciseName] || [];
                
                localLogs.forEach(localLog => {
                    // Vérifier si ce log existe déjà dans Supabase (même date, même poids)
                    const exists = supabaseLogs.some(sLog => 
                        sLog.date === localLog.date && 
                        sLog.weight === localLog.weight &&
                        sLog.achievedReps === localLog.achievedReps
                    );
                    
                    if (!exists && !localLog.synced) {
                        // Log local non synchronisé, le garder et tenter de le sync
                        if (!state.progressLog[exerciseName]) {
                            state.progressLog[exerciseName] = [];
                        }
                        state.progressLog[exerciseName].push(localLog);
                        
                        // Tenter de sync ce log manquant
                        saveProgressLogToSupabase(exerciseName, localLog).catch(err => {
                            console.warn('Sync rattrapage progress log:', err);
                        });
                    }
                });
                
                // Trier par date
                if (state.progressLog[exerciseName]) {
                    state.progressLog[exerciseName].sort((a, b) => 
                        new Date(a.date) - new Date(b.date)
                    );
                }
            });
        }
        
        // Charger l'historique des séances avec MERGE intelligent
        // Charger TOUTES les sessions (pas de limite pour un suivi sur plusieurs années)
        const { data: sessions } = await supabaseClient
            .from('workout_sessions')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });
        
        if (sessions) {
            // ETAPE 1 : Capturer TOUTES les sessions locales non-syncees AVANT ecrasement
            const unsyncedLocal = (state.sessionHistory || []).filter(s =>
                !s.deletedAt && (!s.synced || !s.supabaseId)
            );
            if (unsyncedLocal.length > 0) {
                console.log(`🛡️ ${unsyncedLocal.length} session(s) locale(s) non-syncée(s) protégée(s)`);
                criticalLog('merge_protect', { count: unsyncedLocal.length, ids: unsyncedLocal.map(s => s.sessionId || s.id) });
            }
            
            // ETAPE 2 : Construire les sessions Supabase
            const supabaseSessions = sessions.map(s => ({
                id: s.session_id || ('legacy-' + s.id),
                sessionId: s.session_id || ('legacy-' + s.id),
                date: s.date,
                timestamp: new Date(s.created_at).getTime(),
                sessionType: s.session_type || 'program',
                sessionName: s.session_name || null,
                program: s.program || null,
                day: s.day_name || null,
                exercises: s.exercises || [],
                duration: s.duration || 0,
                totalVolume: s.total_volume || 0,
                caloriesBurned: s.calories_burned || 0,
                synced: true
            }));
            
            // ETAPE 3 : Construire le Set des sessionIds Supabase pour lookup rapide
            const supabaseIds = new Set(supabaseSessions.map(s => s.sessionId));
            
            // ETAPE 4 : Re-injecter les sessions locales non presentes dans Supabase
            const merged = [...supabaseSessions];
            unsyncedLocal.forEach(localSession => {
                const localId = localSession.sessionId || localSession.id;
                if (localId && supabaseIds.has(localId)) return;
                // Fallback timestamp pour legacy
                if (!localId) {
                    const existsByTimestamp = supabaseSessions.some(ss =>
                        ss.date === localSession.date && Math.abs(ss.timestamp - localSession.timestamp) < 5000
                    );
                    if (existsByTimestamp) return;
                }
                merged.push(localSession);
                // Tenter sync en arriere-plan
                saveWorkoutSessionToSupabase({
                    sessionId: localId || ('local-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5)),
                    date: localSession.date,
                    sessionType: localSession.sessionType || 'program',
                    sessionName: localSession.sessionName || null,
                    program: localSession.program,
                    day: localSession.day,
                    exercises: localSession.exercises,
                    duration: localSession.duration || 0,
                    totalVolume: localSession.totalVolume || 0,
                    caloriesBurned: localSession.caloriesBurned || 0
                }).then(ok => {
                    if (ok) { localSession.synced = true; saveState(); }
                }).catch(() => {});
            });
            
            // ETAPE 5 : Supprimer les sessions soft-deleted localement
            const deletedLocal = (state.sessionHistory || []).filter(s => s.deletedAt);
            deletedLocal.forEach(s => {
                const sid = s.sessionId || s.id;
                if (sid) deleteWorkoutSessionFromSupabase(sid).catch(() => {});
            });
            
            // ETAPE 6 : Assigner, trier, limiter
            state.sessionHistory = merged.sort((a, b) => b.timestamp - a.timestamp).slice(0, 100);
        }
        
        if (!silent) {
            console.log('✅ Données chargées depuis Supabase');
        }
        
        // Retirer les skeletons
        if (!silent && typeof removeSkeletons === 'function') {
            removeSkeletons();
        }
        
        // Sauvegarder le state mergé dans localStorage pour persistance
        saveState();
        
        // Marquer la sync comme terminée (pour détection conflits)
        if (typeof markSyncComplete === 'function') {
            markSyncComplete();
        }
        
        if (!silent) {
            console.log('✅ Données synchronisées');
        }
        
        // Mettre à jour l'indicateur de sync
        updateSyncIndicator('synced');
        
        // Rafraîchir l'UI
        refreshAllUI();
        
    } catch (error) {
        console.error('Erreur chargement données:', error);
        updateSyncIndicator('error', 'Chargement échoué');
        if (!silent) {
            showToast('⚠️ Impossible de charger vos données cloud. Mode hors-ligne activé.', 'warning');
        }
    } finally {
        _isLoadingFromSupabase = false;
        if (_loadQueuedSilent !== null) {
            const queuedSilent = _loadQueuedSilent;
            _loadQueuedSilent = null;
            loadAllDataFromSupabase(queuedSilent);
        }
    }
}

// Rafraîchir toute l'UI
function refreshAllUI() {
    if (typeof renderProgramTypes === 'function') renderProgramTypes();
    if (typeof renderFoodsList === 'function') renderFoodsList();
    if (typeof updateDashboard === 'function') updateDashboard();
    if (typeof updateWeeklySchedule === 'function') updateWeeklySchedule();
    if (typeof populateSessionDaySelect === 'function') populateSessionDaySelect();
    if (typeof updateSessionHistory === 'function') updateSessionHistory();
    if (typeof updateMacroRings === 'function') updateMacroRings();
    if (document.getElementById('journal-date') && typeof loadJournalDay === 'function') {
        loadJournalDay();
    }

    // ── Rafraîchir la TOTALITÉ de la section Progrès ──
    // Critique: initProgressSection() re-rend les stats hero (PRs, progression, badges),
    // les records, la heatmap, les charts de volume, le feed, etc.
    // Sans cet appel, ces éléments restaient à zéro après le chargement Supabase.
    if (typeof initProgressSection === 'function') {
        initProgressSection();
    }

    healthCheck();
}

// Verification de coherence apres chargement
function healthCheck() {
    const total = (state.sessionHistory || []).length;
    const unsynced = (state.sessionHistory || []).filter(s => !s.synced && !s.deletedAt).length;
    const deleted = (state.sessionHistory || []).filter(s => s.deletedAt).length;
    const progressExercises = Object.keys(state.progressLog || {}).length;

    criticalLog('health_check', { total, unsynced, deleted, progressExercises });

    if (unsynced > 5) {
        console.warn(`⚠️ HEALTH: ${unsynced}/${total} séances non synchronisées`);
    }
    if (total === 0 && progressExercises > 0) {
        console.warn('⚠️ HEALTH: progressLog non vide mais sessionHistory vide — incohérence possible');
        criticalLog('health_inconsistency', { sessionHistory: total, progressLog: progressExercises });
    }
}

// ==================== SAUVEGARDE VERS SUPABASE ====================

// Sauvegarder le profil
async function saveProfileToSupabase(profileData) {
    if (!currentUser) return false;
    
    // Validation avant sauvegarde
    if (!validateBeforeSave('profile', profileData)) {
        showToast('Données profil invalides', 'error');
        return false;
    }
    
    if (!isOnline) {
        console.log('📴 Hors-ligne: profil ajouté à la queue de sync');
        addToSyncQueue('profile', 'upsert', profileData);
        return false;
    }
    
    try {
        await withRetry(async () => {
            const { error } = await supabaseClient
                .from('user_profiles')
                .upsert({
                    user_id: currentUser.id,
                    pseudo: profileData.pseudo || null,
                    age: profileData.age,
                    gender: profileData.gender,
                    weight: profileData.weight,
                    height: profileData.height,
                    activity: profileData.activity,
                    goal: profileData.goal,
                    bmr: profileData.bmr,
                    tdee: profileData.tdee,
                    target_calories: profileData.targetCalories,
                    target_protein: profileData.macros.protein,
                    target_carbs: profileData.macros.carbs,
                    target_fat: profileData.macros.fat,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });
            
            if (error) throw error;
            console.log('✅ Profil sauvegardé');
        }, { maxRetries: 3, critical: true });
        return true;
    } catch (error) {
        console.error('Erreur sauvegarde profil:', error);
        showToast('Erreur sync profil - sauvegardé localement', 'warning');
        return false;
    }
}

// Sauvegarder un aliment personnalisé (avec retry et feedback)
async function saveCustomFoodToSupabase(food) {
    if (!currentUser) return null;
    
    // Validation avant sauvegarde
    if (!validateBeforeSave('customFood', food)) {
        showToast('Données aliment invalides', 'error');
        return null;
    }
    
    if (!isOnline) {
        console.log('📴 Hors-ligne: aliment ajouté à la queue de sync');
        addToSyncQueue('custom_food', 'insert', food);
        return null;
    }
    
    try {
        const result = await withRetry(async () => {
            const foodData = {
                user_id: currentUser.id,
                name: food.name,
                calories: food.calories,
                protein: food.protein,
                carbs: food.carbs,
                fat: food.fat,
                category: food.category
            };
            
            // Ajouter les propriétés d'unité si présentes
            if (food.unit) foodData.unit = food.unit;
            if (food.unitLabel) foodData.unit_label = food.unitLabel;
            if (food.unitWeight) foodData.unit_weight = food.unitWeight;
            
            const { data, error } = await supabaseClient
                .from('custom_foods')
                .insert(foodData)
                .select()
                .single();
            
            if (error) throw error;
            console.log('✅ Aliment personnalisé sauvegardé');
            return data;
        }, { maxRetries: 2, critical: false });
        return result ? 'custom-' + result.id : null;
    } catch (error) {
        console.error('Erreur sauvegarde aliment:', error);
        // Toast handled by caller (saveCustomFood)
        return null;
    }
}

// Supprimer un aliment personnalisé (avec retry et feedback)
async function deleteCustomFoodFromSupabase(foodId) {
    if (!currentUser) return false;
    if (!isOnline) {
        console.log('📴 Hors-ligne: suppression en attente');
        addToSyncQueue('custom_food', 'delete', { id: foodId });
        return true; // Confirmer suppression locale
    }
    
    const supabaseId = foodId.replace('custom-', '');
    
    try {
        await withRetry(async () => {
            const { error } = await supabaseClient
                .from('custom_foods')
                .delete()
                .eq('id', supabaseId)
                .eq('user_id', currentUser.id);
            
            if (error) throw error;
            console.log('✅ Aliment supprimé');
        }, { maxRetries: 2, critical: false });
        return true;
    } catch (error) {
        console.error('Erreur suppression aliment:', error);
        showToast('Erreur suppression - réessayez', 'error');
        return false;
    }
}

// Sauvegarder un exercice personnalisé (avec retry et feedback)
async function saveCustomExerciseToSupabase(exercise) {
    if (!currentUser) return null;
    
    // Validation avant sauvegarde
    if (!validateBeforeSave('customExercise', exercise)) {
        showToast('Données exercice invalides', 'error');
        return null;
    }
    
    if (!isOnline) {
        console.log('📴 Hors-ligne: exercice ajouté à la queue de sync');
        addToSyncQueue('custom_exercise', 'insert', exercise);
        return null;
    }
    
    try {
        const result = await withRetry(async () => {
            const { data, error } = await supabaseClient
                .from('custom_exercises')
                .insert({
                    user_id: currentUser.id,
                    name: exercise.name,
                    muscle: exercise.muscle,
                    equipment: exercise.equipment
                })
                .select()
                .single();
            
            if (error) throw error;
            console.log('✅ Exercice personnalisé sauvegardé');
            return data;
        }, { maxRetries: 2, critical: false });
        return result ? 'custom-' + result.id : null;
    } catch (error) {
        console.error('Erreur sauvegarde exercice:', error);
        showToast('Erreur sync exercice - sauvegardé localement', 'warning');
        return null;
    }
}

// Sauvegarder un swap d'exercice (avec retry et feedback)
async function saveExerciseSwapToSupabase(originalExercise, replacementId) {
    if (!currentUser) return false;
    if (!isOnline) {
        console.log('📴 Hors-ligne: swap ajouté à la queue de sync');
        addToSyncQueue('exercise_swap', 'upsert', { originalExercise, replacementId });
        return false;
    }
    
    try {
        // Essai direct sans retry excessif - les erreurs FK sont permanentes
        const { error } = await supabaseClient
            .from('exercise_swaps')
            .upsert({
                user_id: currentUser.id,
                original_exercise: originalExercise,
                replacement_exercise_id: replacementId
            }, { onConflict: 'user_id,original_exercise' });
        
        if (error) {
            // Erreur 23503 = Foreign Key violation - l'utilisateur n'existe pas dans la table users
            // Ne pas retry, c'est une erreur permanente tant que le profil n'est pas créé
            if (error.code === '23503') {
                console.warn('⚠️ Swap sauvegardé localement (profil serveur non créé)');
                return false;
            }
            throw error;
        }
        console.log('✅ Swap exercice sauvegardé');
        return true;
    } catch (error) {
        console.error('Erreur sauvegarde swap:', error);
        // Ne pas afficher de toast pour chaque erreur - trop intrusif
        return false;
    }
}

// Supprimer un swap d'exercice (avec retry)
async function deleteExerciseSwapFromSupabase(originalExercise) {
    if (!currentUser) return false;
    if (!isOnline) {
        console.log('📴 Hors-ligne: suppression en attente');
        addToSyncQueue('exercise_swap', 'delete', { originalExercise });
        return true; // Confirmer suppression locale
    }
    
    try {
        await withRetry(async () => {
            const { error } = await supabaseClient
                .from('exercise_swaps')
                .delete()
                .eq('user_id', currentUser.id)
                .eq('original_exercise', originalExercise);
            
            if (error) throw error;
        }, { maxRetries: 2, critical: false });
        return true;
    } catch (error) {
        console.error('Erreur suppression swap:', error);
        showToast('Erreur suppression - réessayez', 'warning');
        return false;
    }
}

// Sauvegarder les paramètres d'entraînement (avec retry et feedback)
async function saveTrainingSettingsToSupabase() {
    if (!currentUser) return false;

    // Combiner training_progress avec periodization pour une seule colonne JSONB
    const trainingProgressWithPeriodization = {
        ...state.trainingProgress,
        periodization: state.periodization
    };

    if (!isOnline) {
        console.log('📴 Hors-ligne: paramètres ajoutés à la queue de sync');
        addToSyncQueue('training_settings', 'upsert', {
            selected_program: state.selectedProgram,
            training_days: state.trainingDays,
            wizard_results: state.wizardResults,
            training_progress: trainingProgressWithPeriodization,
            session_templates: state.sessionTemplates,
            goals: state.goals,
            body_weight_log: state.bodyWeightLog,
            unlocked_achievements: state.unlockedAchievements
        });
        return false;
    }

    try {
        await withRetry(async () => {
            const { error } = await supabaseClient
                .from('training_settings')
                .upsert({
                    user_id: currentUser.id,
                    selected_program: state.selectedProgram,
                    training_days: state.trainingDays,
                    wizard_results: state.wizardResults || null,
                    training_progress: trainingProgressWithPeriodization || null,
                    session_templates: state.sessionTemplates || null,
                    goals: state.goals || null,
                    body_weight_log: state.bodyWeightLog || null,
                    unlocked_achievements: state.unlockedAchievements || null,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });

            if (error) throw error;
            console.log('✅ Paramètres entraînement sauvegardés (incl. périodisation)');
        }, { maxRetries: 3, critical: false });
        return true;
    } catch (error) {
        console.error('Erreur sauvegarde paramètres:', error);
        showToast('Erreur sync paramètres - sauvegardé localement', 'warning');
        return false;
    }
}

// Ajouter une entrée au journal (avec retry et feedback)
// Supporte les unités naturelles avec unit_type et unit_count optionnels
async function addJournalEntryToSupabase(date, foodId, quantity, mealType = null, unitType = null, unitCount = null) {
    if (!currentUser) return null;
    
    // Validation des données
    const entryData = { date, foodId, quantity, mealType, addedAt: new Date().toISOString() };
    if (!validateBeforeSave('foodJournalEntry', entryData)) {
        console.error('❌ Validation échouée pour journal entry');
        showToast('Données invalides', 'error');
        return null;
    }
    
    if (!isOnline) {
        console.log('📴 Hors-ligne: entrée ajoutée à la queue de sync');
        addToSyncQueue('food_journal', 'insert', { date, foodId, quantity, mealType, unitType, unitCount });
        return null;
    }
    
    try {
        return await withRetry(async () => {
            // Données de base
            const insertData = {
                user_id: currentUser.id,
                date: date,
                food_id: foodId,
                quantity: quantity // Toujours en grammes pour les calculs
            };
            
            // CRITIQUE : Ajouter le meal_type pour conserver le repas sélectionné
            if (mealType) {
                insertData.meal_type = mealType;
            }
            
            // Ajouter les colonnes d'unités si elles sont fournies
            // Note: ces colonnes doivent exister dans la table Supabase
            // SQL: ALTER TABLE food_journal ADD COLUMN meal_type text;
            // SQL: ALTER TABLE food_journal ADD COLUMN unit_type text DEFAULT 'g';
            // SQL: ALTER TABLE food_journal ADD COLUMN unit_count numeric;
            if (unitType && unitType !== 'g') {
                insertData.unit_type = unitType;
            }
            if (unitCount && unitCount !== quantity) {
                insertData.unit_count = unitCount;
            }
            
            const { data, error } = await supabaseClient
                .from('food_journal')
                .insert(insertData)
                .select()
                .single();
            
            if (error) throw error;
            console.log('✅ Entrée journal ajoutée');
            return data.id;
        }, { maxRetries: 2, critical: false });
    } catch (error) {
        console.error('Erreur ajout journal:', error);
        showToast('Aliment ajouté localement (sync en attente)', 'warning');
        return null;
    }
}

// Mettre à jour une entrée du journal (avec retry et feedback)
async function updateJournalEntryInSupabase(entryId, quantity) {
    if (!currentUser) return false;
    
    // Validation de la quantité
    if (!validateBeforeSave('journalQuantity', quantity)) {
        showToast('Quantité invalide', 'error');
        return false;
    }
    
    if (!isOnline) {
        console.log('📴 Hors-ligne: modification en attente');
        addToSyncQueue('food_journal', 'update', { id: entryId, quantity });
        return true; // Confirmer modification locale
    }
    
    try {
        await withRetry(async () => {
            const { error } = await supabaseClient
                .from('food_journal')
                .update({ quantity: quantity })
                .eq('id', entryId);
            
            if (error) throw error;
        }, { maxRetries: 2, critical: false });
        return true;
    } catch (error) {
        console.error('Erreur update journal:', error);
        showToast('Erreur sync modification', 'warning');
        return false;
    }
}

// Supprimer une entrée du journal (avec retry et feedback)
async function deleteJournalEntryFromSupabase(entryId) {
    if (!currentUser) return false;
    if (!isOnline) {
        console.log('📴 Hors-ligne: suppression en attente');
        addToSyncQueue('food_journal', 'delete', { id: entryId });
        return true; // Confirmer suppression locale
    }
    
    try {
        await withRetry(async () => {
            const { error } = await supabaseClient
                .from('food_journal')
                .delete()
                .eq('id', entryId)
                .eq('user_id', currentUser.id); // Double verrou sécurité
            
            if (error) throw error;
        }, { maxRetries: 2, critical: false });
        return true;
    } catch (error) {
        console.error('Erreur suppression journal:', error);
        showToast('Erreur sync suppression', 'warning');
        return false;
    }
}

// Vider le journal d'un jour (avec retry et feedback)
async function clearJournalDayInSupabase(date) {
    if (!currentUser) return false;
    if (!isOnline) {
        console.log('📴 Hors-ligne: vidage en attente de connexion');
        addToSyncQueue('food_journal', 'delete', { date, clearAll: true });
        return true; // Confirmer suppression locale
    }
    
    try {
        await withRetry(async () => {
            const { error } = await supabaseClient
                .from('food_journal')
                .delete()
                .eq('user_id', currentUser.id)
                .eq('date', date);
            
            if (error) throw error;
        }, { maxRetries: 2, critical: false });
        return true;
    } catch (error) {
        console.error('Erreur vidage journal:', error);
        showToast('Erreur sync - journal vidé localement', 'warning');
        return false;
    }
}

// ==================== HYDRATATION ====================
// ==================== CARDIO SESSIONS ====================

// Sauvegarder une session cardio
async function saveCardioSessionToSupabase(date, session) {
    if (!currentUser) return null;
    
    // Validation des données
    if (!validateBeforeSave('cardioSession', session)) {
        console.error('❌ Validation échouée pour cardio session');
        showToast('Données de cardio invalides', 'error');
        return null;
    }
    
    if (!isOnline) {
        console.log('📴 Hors-ligne: session cardio ajoutée à la queue de sync');
        addToSyncQueue('cardio_session', 'insert', { date, ...session });
        return null;
    }
    
    try {
        return await withRetry(async () => {
            const { data, error } = await supabaseClient
                .from('cardio_sessions')
                .insert({
                    user_id: currentUser.id,
                    date: date,
                    type: session.type,
                    duration_minutes: session.duration,
                    intensity: session.intensity,
                    calories_burned: session.calories
                })
                .select('id')
                .maybeSingle();
            
            if (error) throw error;
            return data?.id || null;
        }, { maxRetries: 2, critical: false });
    } catch (error) {
        console.error('Erreur sauvegarde cardio:', error);
        showToast('Cardio sauvegardé localement', 'warning');
        return null;
    }
}

// Supprimer une session cardio
async function deleteCardioSessionFromSupabase(sessionId) {
    if (!currentUser) return false;
    if (!isOnline) {
        console.log('📴 Hors-ligne: suppression cardio en attente');
        addToSyncQueue('cardio_session', 'delete', { id: sessionId });
        return true; // Confirmer suppression locale
    }
    
    try {
        await withRetry(async () => {
            const { error } = await supabaseClient
                .from('cardio_sessions')
                .delete()
                .eq('id', sessionId)
                .eq('user_id', currentUser.id);
            
            if (error) throw error;
        }, { maxRetries: 2, critical: false });
        return true;
    } catch (error) {
        console.error('Erreur suppression cardio:', error);
        return false;
    }
}

// Charger les sessions cardio depuis Supabase (avec retry)
async function loadCardioSessionsFromSupabase() {
    if (!currentUser) return [];
    if (!isOnline) return [];
    
    try {
        // Utiliser withRetry pour plus de robustesse
        return await withRetry(async () => {
            // Charger TOUTES les sessions cardio (pas de limite pour un suivi sur plusieurs années)
            const { data, error } = await supabaseClient
                .from('cardio_sessions')
                .select('*')
                .eq('user_id', currentUser.id)
                .order('date', { ascending: false });
            
            if (error) {
                // Table n'existe peut-être pas encore - ne pas retry pour cette erreur
                if (error.code === '42P01') {
                    console.log('Table cardio_sessions non créée');
                    return [];
                }
                throw error;
            }
            
            return data || [];
        }, { maxRetries: 2, baseDelay: 500 });
    } catch (error) {
        console.error('Erreur chargement cardio:', error);
        return [];
    }
}

// Sauvegarder un log de progression (avec retry et feedback - CRITIQUE)
async function saveProgressLogToSupabase(exerciseName, logData) {
    if (!currentUser) return false;
    
    // Validation avant sauvegarde
    const dataToValidate = { ...logData, exerciseName };
    if (!validateBeforeSave('progressLog', dataToValidate)) {
        showToast('Données progression invalides', 'error');
        return false;
    }
    
    if (!isOnline) {
        console.log('📴 Hors-ligne: progression ajoutée à la queue de sync');
        addToSyncQueue('progress_log', 'insert', { exerciseName, ...logData });
        return false;
    }
    
    try {
        await withRetry(async () => {
            const dataToInsert = {
                user_id: currentUser.id,
                exercise_name: exerciseName,
                date: logData.date,
                sets: logData.sets,
                reps: logData.reps,
                weight: logData.weight,
                achieved_reps: logData.achievedReps,
                achieved_sets: logData.achievedSets
            };

            // Ajouter setsDetail si disponible
            if (logData.setsDetail && Array.isArray(logData.setsDetail) && logData.setsDetail.length > 0) {
                dataToInsert.sets_detail = logData.setsDetail;
            }

            const { error } = await supabaseClient
                .from('progress_log')
                .insert(dataToInsert);
            if (error) throw error;

            console.log('✅ Progression sauvegardée');
        }, { maxRetries: 3, critical: true });
        return true;
    } catch (error) {
        console.error('Erreur sauvegarde progression:', error);
        // Online mais Supabase a planté → mise en queue pour retry automatique
        addToSyncQueue('progress_log', 'insert', { exerciseName, ...logData });
        return false;
    }
}

// Sauvegarder une séance (avec retry et feedback - CRITIQUE)
async function saveWorkoutSessionToSupabase(sessionData) {
    if (!currentUser) return false;
    
    // Validation des données
    if (!validateBeforeSave('workoutSession', sessionData)) {
        console.error('❌ Validation échouée pour workout session');
        showToast('Données de séance invalides', 'error');
        return false;
    }
    
    if (!isOnline) {
        console.log('📴 Hors-ligne: séance ajoutée à la queue de sync');
        addToSyncQueue('workout_session', 'upsert', sessionData);
        return false;
    }
    
    // Validation sessionId
    if (!sessionData.sessionId) {
        console.error('❌ sessionId manquant, impossible de sauvegarder');
        showToast('Erreur: session sans ID', 'error');
        return false;
    }
    
    try {
        await withRetry(async () => {
            const { error } = await supabaseClient
                .from('workout_sessions')
                .upsert({
                    user_id: currentUser.id,
                    session_id: sessionData.sessionId,
                    date: sessionData.date,
                    program: sessionData.program || null,
                    day_name: sessionData.day || null,
                    session_type: sessionData.sessionType || 'program',
                    session_name: sessionData.sessionName || null,
                    exercises: sessionData.exercises,
                    duration: sessionData.duration || 0,
                    total_volume: sessionData.totalVolume || 0,
                    calories_burned: sessionData.caloriesBurned || 0
                }, {
                    onConflict: 'user_id,session_id',
                    ignoreDuplicates: false
                });
            
            if (error) throw error;
            console.log('✅ Séance sauvegardée (UPSERT):', sessionData.sessionId);
            criticalLog('session_synced', { sessionId: sessionData.sessionId, date: sessionData.date });
        }, { maxRetries: 2, critical: true });
        return true;
    } catch (error) {
        console.error('Erreur sauvegarde séance:', error);
        criticalLog('session_sync_failed', { sessionId: sessionData.sessionId, error: error.message });
        addToSyncQueue('workout_session', 'upsert', sessionData);
        return false;
    }
}

// ==================== DELETE OPERATIONS ====================

/**
 * Supprime une séance de Supabase par sessionId.
 */
async function deleteWorkoutSessionFromSupabase(sessionId) {
    if (!currentUser || !isOnline) {
        addToSyncQueue('workout_session', 'delete', { sessionId });
        return false;
    }

    try {
        await withRetry(async () => {
            const { error } = await supabaseClient
                .from('workout_sessions')
                .delete()
                .eq('session_id', sessionId)
                .eq('user_id', currentUser.id);

            if (error) throw error;
            console.log('✅ Séance supprimée Supabase:', sessionId);
        }, { maxRetries: 3, critical: true });
        return true;
    } catch (error) {
        console.error('❌ Erreur suppression séance Supabase:', error);
        addToSyncQueue('workout_session', 'delete', { sessionId });
        return false;
    }
}

/**
 * Supprime les entrées progress_log liées à une session.
 * Utilise la correspondance session_id si la colonne existe,
 * sinon fallback par exercise_name + date.
 */
async function deleteProgressLogForSession(sessionId, sessionDate, exerciseNames) {
    if (!currentUser || !isOnline) {
        addToSyncQueue('progress_log', 'delete', { sessionId, sessionDate, exerciseNames });
        return false;
    }

    try {
        await withRetry(async () => {
            // Tenter par session_id d'abord
            const { data: bySessionId, error: checkError } = await supabaseClient
                .from('progress_log')
                .select('id')
                .eq('user_id', currentUser.id)
                .eq('session_id', sessionId)
                .limit(1);

            if (!checkError && bySessionId && bySessionId.length > 0) {
                // La colonne session_id existe et a des données
                const { error } = await supabaseClient
                    .from('progress_log')
                    .delete()
                    .eq('session_id', sessionId)
                    .eq('user_id', currentUser.id);
                if (error) throw error;
            } else if (sessionDate && exerciseNames && exerciseNames.length > 0) {
                // Fallback: supprimer par date + exercise_name
                for (const name of exerciseNames) {
                    const { error } = await supabaseClient
                        .from('progress_log')
                        .delete()
                        .eq('user_id', currentUser.id)
                        .eq('exercise_name', name)
                        .eq('date', sessionDate);
                    if (error) throw error;
                }
            }

            console.log('✅ Progress log supprimé Supabase pour session:', sessionId);
        }, { maxRetries: 3, critical: true });
        return true;
    } catch (error) {
        console.error('❌ Erreur suppression progress_log Supabase:', error);
        addToSyncQueue('progress_log', 'delete', { sessionId, sessionDate, exerciseNames });
        return false;
    }
}

// ==================== HYDRATATION SYNC ====================

/**
 * Sauvegarde l'hydratation du jour dans Supabase
 */
async function saveHydrationToSupabase(date, amountMl) {
    if (!currentUser) return false;
    
    // Validation avant sauvegarde
    if (!validateBeforeSave('hydration', { date, amountMl })) {
        showToast('Données hydratation invalides', 'error');
        return false;
    }
    
    if (!isOnline) {
        console.log('📴 Hors-ligne: hydratation ajoutée à la queue de sync');
        addToSyncQueue('hydration', 'upsert', { date, amountMl });
        return false;
    }
    
    try {
        await withRetry(async () => {
            const { error } = await supabaseClient
                .from('hydration_log')
                .upsert({
                    user_id: currentUser.id,
                    date: date,
                    amount_ml: amountMl,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id,date'
                });
            
            if (error) throw error;
        }, { maxRetries: 2, critical: false });
        return true;
    } catch (error) {
        console.error('Erreur sync hydratation:', error);
        showToast('Erreur sync hydratation - sauvegardée localement', 'warning');
        return false;
    }
}

// ==================== AUTO-SYNC POLLING ====================

/**
 * Démarre le polling automatique pour synchroniser les données
 */
function startAutoSync() {
    // Arrêter tout polling existant
    stopAutoSync();
    
    console.log('🔄 Auto-sync démarré (polling toutes les 30s)');
    
    // Lancer le polling
    autoSyncInterval = setInterval(async () => {
        // Ne pas synchroniser si pas connecté
        if (!isLoggedIn()) {
            return;
        }
        
        // Ne pas synchroniser si l'onglet n'est pas visible (économie de ressources)
        if (document.hidden) {
            return;
        }
        
        // Ne pas synchroniser si déjà en cours
        if (currentSyncStatus === SyncStatus.SYNCING) {
            return;
        }
        
        // Synchronisation silencieuse
        try {
            const now = Date.now();
            // Éviter les syncs trop rapprochées (au moins 25s entre chaque)
            if (now - lastSyncTimestamp < 25000) {
                return;
            }
            
            lastSyncTimestamp = now;
            
            // Charger les données depuis Supabase (silencieux)
            await loadAllDataFromSupabase(true); // true = mode silencieux
            
        } catch (error) {
            console.warn('Erreur auto-sync:', error);
            // Ne pas afficher de toast, continuer silencieusement
        }
    }, AUTO_SYNC_INTERVAL_MS);
}

/**
 * Arrête le polling automatique
 */
function stopAutoSync() {
    if (autoSyncInterval) {
        clearInterval(autoSyncInterval);
        autoSyncInterval = null;
        console.log('⏸️  Auto-sync arrêté');
    }
}

/**
 * Reprend le sync quand la page redevient visible
 */
function handleVisibilityChange() {
    if (!document.hidden && isLoggedIn()) {
        // Page visible, sync immédiat puis reprise du polling
        console.log('👀 Page visible, sync immédiat...');
        loadAllDataFromSupabase(true).catch(err => {
            console.warn('Erreur sync visibilité:', err);
        });
    }
}

// Écouter les changements de visibilité
document.addEventListener('visibilitychange', handleVisibilityChange);

// ==================== UTILS ====================

function isLoggedIn() {
    return currentUser !== null;
}

function getCurrentUser() {
    return currentUser;
}

// ==================== EXPORTS GLOBAUX ====================
window.signOut = signOut;
window.signInWithGoogle = signInWithGoogle;
window.showAuthModal = showAuthModal;
window.isLoggedIn = isLoggedIn;
window.getCurrentUser = getCurrentUser;
window.loadAllDataFromSupabase = loadAllDataFromSupabase;
window.saveHydrationToSupabase = saveHydrationToSupabase;
window.deleteWorkoutSessionFromSupabase = deleteWorkoutSessionFromSupabase;
window.deleteProgressLogForSession = deleteProgressLogForSession;

console.log('✅ supabase.js: Fonctions exportées au scope global');
