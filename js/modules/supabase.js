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

// ==================== AUTO-SYNC POLLING ====================
let autoSyncInterval = null;
const AUTO_SYNC_INTERVAL_MS = 30000; // 30 secondes
let lastSyncTimestamp = 0;

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
    // Sauvegarder un backup des données locales avant écrasement
    saveConflictBackup(conflictData.entity, state);
    
    if (strategy === 'local') {
        // Forcer l'envoi des données locales vers le serveur
        console.log('📤 Résolution auto (local): envoi vers serveur');
        await saveTrainingSettingsToSupabase();
        showToast('Vos données locales ont été sauvegardées (backup créé)', 'success');
    } else {
        // 'server' : Les données serveur sont déjà chargées
        console.log('📥 Résolution auto (server): données serveur chargées');
        showToast('Données synchronisées (backup local sauvegardé)', 'info');
    }
    
    // Marquer la sync comme complète
    if (typeof markSyncComplete === 'function') {
        markSyncComplete();
    }
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

// Mettre à jour le badge avec le nombre d'éléments en attente
function updatePendingSyncBadge() {
    const badge = document.querySelector('.sync-badge');
    if (!badge) return;
    
    let pendingCount = 0;
    
    // Compter les entrées journal sans supabaseId
    Object.values(state.foodJournal || {}).forEach(entries => {
        pendingCount += entries.filter(e => !e.supabaseId).length;
    });
    
    // Compter les sessions cardio sans supabaseId
    Object.values(state.cardioLog || {}).forEach(sessions => {
        pendingCount += sessions.filter(s => !s.supabaseId).length;
    });
    
    if (pendingCount > 0) {
        badge.textContent = pendingCount > 9 ? '9+' : pendingCount;
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
            indicator.title = 'Données synchronisées';
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
            indicator.title = 'Synchronisé';
    }
    
    // Mettre à jour le badge
    updatePendingSyncBadge();
    
    // Afficher le compteur si des syncs sont en attente
    const badge = indicator.querySelector('.sync-badge');
    if (badge) {
        if (pendingSyncCount > 0) {
            badge.textContent = pendingSyncCount;
            badge.style.display = 'flex';
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
                // Calcul du délai avec backoff exponentiel
                const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
                console.warn(`Retry ${attempt + 1}/${maxRetries} après ${delay}ms:`, error.message);
                
                if (onRetry) onRetry(attempt + 1, delay);
                
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    // Échec après tous les retries
    updateSyncIndicator(SyncStatus.ERROR, lastError?.message);
    
    // Notification pour les erreurs critiques uniquement
    if (critical) {
        showToast('Erreur de synchronisation. Vos données sont sauvegardées localement.', 'error');
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
            syncPendingData();
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
        updateSyncIndicator(SyncStatus.ERROR);
        showToast('Erreur lors de la synchronisation - certaines données restent locales', 'error');
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
        
        // Écouter les changements d'auth
        supabaseClient.auth.onAuthStateChange((event, session) => {
            console.log('Auth event:', event);
            if (session) {
                currentUser = session.user;
                onUserLoggedIn();
            } else {
                currentUser = null;
                onUserLoggedOut();
            }
        });
        
        // Vérifier si déjà connecté
        checkAuth();
    } catch (error) {
        console.error('Erreur init Supabase:', error);
    }
}

// Vérifier l'authentification
async function checkAuth() {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            currentUser = session.user;
            onUserLoggedIn();
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
    
    // Charger les données depuis Supabase
    await loadAllDataFromSupabase();
    
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

// Charger toutes les données depuis Supabase
async function loadAllDataFromSupabase(silent = false) {
    if (!currentUser) return;
    
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
                        serverIsNewer: conflict.serverIsNewer
                    };
                    
                    // Récupérer la préférence utilisateur
                    const strategy = state.preferences?.conflictResolution || 'server';
                    
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
                state.trainingProgress = trainingSettings.training_progress;
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
                        Math.abs(sEntry.addedAt - localEntry.addedAt) < 5000 // 5 secondes de tolérance
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
                            Math.abs(sSession.addedAt - localSession.addedAt) < 10000 // 10 secondes de tolérance
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
                supabaseProgressLog[log.exercise_name].push({
                    date: log.date,
                    sets: log.sets,
                    reps: log.reps,
                    weight: parseFloat(log.weight),
                    achievedReps: log.achieved_reps,
                    achievedSets: log.achieved_sets,
                    synced: true // Marquer comme synchronisé
                });
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
            // Garder les sessions locales
            const localSessions = [...(state.sessionHistory || [])];
            
            // Reconstruire depuis Supabase
            const supabaseSessions = sessions.map(s => ({
                sessionId: s.session_id || ('legacy-' + s.id), // UUID ou legacy
                date: s.date,
                timestamp: new Date(s.created_at).getTime(),
                program: s.program,
                day: s.day_name,
                exercises: s.exercises || [],
                duration: s.duration || 0,
                totalVolume: s.total_volume || 0,
                caloriesBurned: s.calories_burned || 0,
                synced: true // Marquer comme synchronisé
            }));
            
            // Identifier les sessions locales non présentes dans Supabase
            const localOnlySessions = localSessions.filter(localSession => {
                // Une session est considérée identique si même date + même timestamp (à 1 minute près)
                return !supabaseSessions.some(sSession => 
                    sSession.date === localSession.date &&
                    Math.abs(sSession.timestamp - localSession.timestamp) < 60000
                );
            });
            
            // Merger : Supabase + sessions locales non sync
            state.sessionHistory = [...supabaseSessions];
            
            // Ajouter et sync les sessions locales manquantes
            localOnlySessions.forEach(localSession => {
                if (!localSession.synced) {
                    state.sessionHistory.push(localSession);
                    
                    // Tenter de sync cette session manquante
                    saveWorkoutSessionToSupabase({
                        sessionId: localSession.sessionId || ('local-' + Date.now()),
                        date: localSession.date,
                        program: localSession.program,
                        day: localSession.day,
                        exercises: localSession.exercises,
                        duration: localSession.duration || 0,
                        totalVolume: localSession.totalVolume || 0,
                        caloriesBurned: localSession.caloriesBurned || 0
                    }).catch(err => {
                        console.warn('Sync rattrapage session:', err);
                    });
                }
            });
            
            // Trier par timestamp décroissant et limiter à 100
            state.sessionHistory.sort((a, b) => b.timestamp - a.timestamp);
            state.sessionHistory = state.sessionHistory.slice(0, 100);
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
        
        // Rafraîchir l'UI
        refreshAllUI();
        
    } catch (error) {
        console.error('Erreur chargement données:', error);
        if (!silent) {
            showToast('Erreur lors du chargement des données', 'error');
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
    if (typeof populateProgressExerciseSelect === 'function') populateProgressExerciseSelect();
    if (typeof updateSessionHistory === 'function') updateSessionHistory();
    if (typeof updateMacroRings === 'function') updateMacroRings();
    if (document.getElementById('journal-date') && typeof loadJournalDay === 'function') {
        loadJournalDay();
    }
}

// ==================== SAUVEGARDE VERS SUPABASE ====================

// Sauvegarder le profil
async function saveProfileToSupabase(profileData) {
    if (!currentUser) return false;
    if (!isOnline) {
        console.log('📴 Hors-ligne: profil sauvegardé localement');
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
    if (!isOnline) {
        console.log('📴 Hors-ligne: aliment sauvegardé localement');
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
        return false;
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
    if (!isOnline) {
        console.log('📴 Hors-ligne: exercice sauvegardé localement');
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
        console.log('📴 Hors-ligne: swap sauvegardé localement');
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
        return false;
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
    if (!isOnline) {
        console.log('📴 Hors-ligne: sauvegarde locale uniquement');
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
                    training_progress: state.trainingProgress || null,
                    session_templates: state.sessionTemplates || null,
                    goals: state.goals || null,
                    body_weight_log: state.bodyWeightLog || null,
                    unlocked_achievements: state.unlockedAchievements || null,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });
            
            if (error) throw error;
            console.log('✅ Paramètres entraînement sauvegardés');
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
    if (!isOnline) {
        console.log('📴 Hors-ligne: entrée journal sauvegardée localement');
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
    if (!isOnline) {
        console.log('📴 Hors-ligne: modification en attente');
        return false;
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
        return false;
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
        return false;
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

/**
 * Sauvegarde l'hydratation du jour dans Supabase (upsert)
 */
async function saveHydrationToSupabase(date, amountMl) {
    if (!currentUser) return false;
    if (!isOnline) {
        console.log('📴 Hors-ligne: hydratation sauvegardée localement');
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

// ==================== CARDIO SESSIONS ====================

// Sauvegarder une session cardio
async function saveCardioSessionToSupabase(date, session) {
    if (!currentUser) return null;
    if (!isOnline) {
        console.log('📴 Hors-ligne: session cardio sauvegardée localement');
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
    if (!isOnline) return false;
    
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
    if (!isOnline) {
        console.log('📴 Hors-ligne: progression sauvegardée localement');
        return false;
    }
    
    try {
        await withRetry(async () => {
            const { error } = await supabaseClient
                .from('progress_log')
                .insert({
                    user_id: currentUser.id,
                    exercise_name: exerciseName,
                    date: logData.date,
                    sets: logData.sets,
                    reps: logData.reps,
                    weight: logData.weight,
                    achieved_reps: logData.achievedReps,
                    achieved_sets: logData.achievedSets
                });
            
            if (error) throw error;
            console.log('✅ Progression sauvegardée');
        }, { maxRetries: 3, critical: true });
        return true;
    } catch (error) {
        console.error('Erreur sauvegarde progression:', error);
        showToast('Erreur sync progression - sauvegardé localement', 'warning');
        return false;
    }
}

// Sauvegarder une séance (avec retry et feedback - CRITIQUE)
async function saveWorkoutSessionToSupabase(sessionData) {
    if (!currentUser) return false;
    if (!isOnline) {
        console.log('📴 Hors-ligne: séance sauvegardée localement');
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
                    program: sessionData.program,
                    day_name: sessionData.day,
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
        }, { maxRetries: 2, critical: true });
        return true;
    } catch (error) {
        console.error('Erreur sauvegarde séance:', error);
        showToast('Erreur sync séance - sauvegardé localement', 'warning');
        return false;
    }
}

// ==================== HYDRATATION SYNC ====================

/**
 * Sauvegarde l'hydratation du jour dans Supabase
 */
async function saveHydrationToSupabase(date, amountMl) {
    if (!currentUser) return false;
    if (!isOnline) {
        console.log('📴 Hors-ligne: hydratation sauvegardée localement');
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
