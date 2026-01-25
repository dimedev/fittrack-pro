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
    window.addEventListener('online', () => {
        isOnline = true;
        console.log('🌐 Retour en ligne');
        updateSyncIndicator(SyncStatus.IDLE);
        
        // Tenter de synchroniser les données en attente
        if (currentUser) {
            syncPendingData();
        }
    });
    
    window.addEventListener('offline', () => {
        isOnline = false;
        console.log('📴 Mode hors-ligne');
        updateSyncIndicator(SyncStatus.OFFLINE);
    });
    
    // Vérifier l'état initial
    if (!navigator.onLine) {
        updateSyncIndicator(SyncStatus.OFFLINE);
    }
}

// Synchroniser les données en attente (appelé au retour en ligne)
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
        
        // 3. Synchroniser le journal alimentaire non synchronisé
        if (state.foodJournal) {
            for (const [date, entries] of Object.entries(state.foodJournal)) {
                for (const entry of entries) {
                    // Vérifier que l'entrée a un foodId valide et n'est pas déjà synchronisée
                    if (!entry.supabaseId && entry.foodId && entry.quantity) {
                        try {
                            const id = await addJournalEntryToSupabase(
                                date,
                                entry.foodId,
                                entry.quantity
                            );
                            if (id) entry.supabaseId = id;
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
        
        updateSyncIndicator(SyncStatus.SUCCESS);
        console.log('✅ Toutes les données synchronisées');
    } catch (error) {
        console.error('Erreur sync pending:', error);
        updateSyncIndicator(SyncStatus.ERROR);
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
}

// Callback quand l'utilisateur se déconnecte
function onUserLoggedOut() {
    console.log('👤 Utilisateur déconnecté');
    updateAuthUI();
    showAuthModal();
}

// Mettre à jour l'UI d'auth
function updateAuthUI() {
    const authBtn = document.getElementById('auth-btn');
    const userEmail = document.getElementById('user-email');
    
    if (currentUser) {
        if (authBtn) authBtn.textContent = 'Déconnexion';
        if (userEmail) userEmail.textContent = currentUser.email;
    } else {
        if (authBtn) authBtn.textContent = 'Connexion';
        if (userEmail) userEmail.textContent = '';
    }
}

// Afficher la modal d'auth
function showAuthModal() {
    openModal('auth-modal');
}

// ==================== SYNC DONNÉES ====================

// Charger toutes les données depuis Supabase
async function loadAllDataFromSupabase() {
    if (!currentUser) return;
    
    try {
        console.log('📥 Chargement des données...');
        
        // Afficher les skeletons pendant le chargement
        if (window.PremiumUI && typeof showInitialSkeletons === 'function') {
            showInitialSkeletons();
        }
        
        // Charger le profil (maybeSingle pour éviter erreur si pas de données)
        const { data: profile, error: profileError } = await supabaseClient
            .from('user_profiles')
            .select('*')
            .eq('user_id', currentUser.id)
            .maybeSingle();
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/69c64c66-4926-4787-8b23-1d114ad6d8e8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.js:loadAllData:profile',message:'Profile loaded',data:{hasData:!!profile,hasError:!!profileError,errorCode:profileError?.code,errorMsg:profileError?.message},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4'})}).catch(()=>{});
        // #endregion
        
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
            const customFoodsList = customFoods.map(f => ({
                id: 'custom-' + f.id,
                name: f.name,
                calories: parseFloat(f.calories),
                protein: parseFloat(f.protein),
                carbs: parseFloat(f.carbs),
                fat: parseFloat(f.fat),
                category: f.category
            }));
            state.foods = [...defaultFoods, ...customFoodsList];
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
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/69c64c66-4926-4787-8b23-1d114ad6d8e8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.js:loadAllData:swapLoop',message:'Local swaps merged (no auto-sync)',data:{localSwapsCount:Object.keys(localSwaps).length,supabaseSwapsCount:Object.keys(supabaseSwaps).length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
            // #endregion
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
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/69c64c66-4926-4787-8b23-1d114ad6d8e8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.js:loadAllData:trainingSettings',message:'Training settings loaded',data:{hasData:!!trainingSettings,hasError:!!trainingError,errorCode:trainingError?.code,errorMsg:trainingError?.message},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4'})}).catch(()=>{});
        // #endregion
        
        if (trainingSettings) {
            // Détection de conflit multi-devices
            if (typeof detectConflict === 'function' && trainingSettings.updated_at) {
                const conflict = detectConflict(trainingSettings.updated_at);
                if (conflict.hasConflict) {
                    console.warn('⚠️ Conflit détecté entre données locales et serveur');
                    if (conflict.serverIsNewer) {
                        showToast('Données synchronisées depuis un autre appareil', 'info');
                    } else {
                        showToast('Modifications locales en cours de sync...', 'info');
                        // Les données locales seront écrasées mais la sync les renverra
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
        
        // Charger le journal alimentaire (30 derniers jours pour historique complet)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { data: journal } = await supabaseClient
            .from('food_journal')
            .select('*')
            .eq('user_id', currentUser.id)
            .gte('date', thirtyDaysAgo.toISOString().split('T')[0]);
        
        if (journal) {
            state.foodJournal = {};
            journal.forEach(entry => {
                if (!state.foodJournal[entry.date]) {
                    state.foodJournal[entry.date] = [];
                }
                state.foodJournal[entry.date].push({
                    foodId: entry.food_id,
                    quantity: entry.quantity,
                    addedAt: new Date(entry.added_at).getTime(),
                    supabaseId: entry.id,
                    mealType: entry.meal_type || inferMealType(new Date(entry.added_at).getTime())
                });
            });
        }
        
        // Charger les sessions cardio (si la table existe)
        try {
            const cardioSessions = await loadCardioSessionsFromSupabase(30);
            if (cardioSessions && cardioSessions.length > 0) {
                state.cardioLog = {};
                cardioSessions.forEach(session => {
                    if (!state.cardioLog[session.date]) {
                        state.cardioLog[session.date] = [];
                    }
                    state.cardioLog[session.date].push({
                        type: session.type,
                        duration: session.duration_minutes,
                        intensity: session.intensity,
                        calories: session.calories_burned,
                        addedAt: new Date(session.created_at).getTime(),
                        supabaseId: session.id
                    });
                });
            }
        } catch (e) {
            console.log('Table cardio_sessions non disponible:', e.message);
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
        const { data: sessions } = await supabaseClient
            .from('workout_sessions')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })
            .limit(100);
        
        if (sessions) {
            // Garder les sessions locales
            const localSessions = [...(state.sessionHistory || [])];
            
            // Reconstruire depuis Supabase
            const supabaseSessions = sessions.map(s => ({
                date: s.date,
                timestamp: new Date(s.created_at).getTime(),
                program: s.program,
                day: s.day_name,
                exercises: s.exercises || [],
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
                        date: localSession.date,
                        program: localSession.program,
                        day: localSession.day,
                        exercises: localSession.exercises
                    }).catch(err => {
                        console.warn('Sync rattrapage session:', err);
                    });
                }
            });
            
            // Trier par timestamp décroissant et limiter à 100
            state.sessionHistory.sort((a, b) => b.timestamp - a.timestamp);
            state.sessionHistory = state.sessionHistory.slice(0, 100);
        }
        
        console.log('✅ Données chargées depuis Supabase');
        
        // Retirer les skeletons
        if (typeof removeSkeletons === 'function') {
            removeSkeletons();
        }
        
        // Sauvegarder le state mergé dans localStorage pour persistance
        saveState();
        
        // Marquer la sync comme terminée (pour détection conflits)
        if (typeof markSyncComplete === 'function') {
            markSyncComplete();
        }
        
        console.log('✅ Données synchronisées');
        
        // Rafraîchir l'UI
        refreshAllUI();
        
    } catch (error) {
        console.error('Erreur chargement données:', error);
        showToast('Erreur lors du chargement des données', 'error');
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
            const { data, error } = await supabaseClient
                .from('custom_foods')
                .insert({
                    user_id: currentUser.id,
                    name: food.name,
                    calories: food.calories,
                    protein: food.protein,
                    carbs: food.carbs,
                    fat: food.fat,
                    category: food.category
                })
                .select()
                .single();
            
            if (error) throw error;
            console.log('✅ Aliment personnalisé sauvegardé');
            return data;
        }, { maxRetries: 2, critical: false });
        return result ? 'custom-' + result.id : null;
    } catch (error) {
        console.error('Erreur sauvegarde aliment:', error);
        showToast('Erreur sync aliment - sauvegardé localement', 'warning');
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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/69c64c66-4926-4787-8b23-1d114ad6d8e8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.js:saveExerciseSwapToSupabase:entry',message:'Swap save called',data:{originalExercise,replacementId,hasUser:!!currentUser,isOnline},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    if (!currentUser) return false;
    if (!isOnline) {
        console.log('📴 Hors-ligne: swap sauvegardé localement');
        return false;
    }
    
    try {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/69c64c66-4926-4787-8b23-1d114ad6d8e8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.js:saveExerciseSwapToSupabase:upsert',message:'Attempting upsert',data:{originalExercise,replacementId,userId:currentUser.id},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
        
        // Essai direct sans retry excessif - les erreurs FK sont permanentes
        const { error } = await supabaseClient
            .from('exercise_swaps')
            .upsert({
                user_id: currentUser.id,
                original_exercise: originalExercise,
                replacement_exercise_id: replacementId
            }, { onConflict: 'user_id,original_exercise' });
        
        if (error) {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/69c64c66-4926-4787-8b23-1d114ad6d8e8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supabase.js:saveExerciseSwapToSupabase:error',message:'Upsert failed',data:{errorCode:error.code,errorMsg:error.message,errorDetails:error.details,originalExercise},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
            // #endregion
            
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
async function addJournalEntryToSupabase(date, foodId, quantity, unitType = null, unitCount = null) {
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
            
            // Ajouter les colonnes d'unités si elles sont fournies
            // Note: ces colonnes doivent exister dans la table Supabase
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
                .eq('id', entryId);
            
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

// Charger les sessions cardio depuis Supabase
async function loadCardioSessionsFromSupabase(days = 30) {
    if (!currentUser) return [];
    if (!isOnline) return [];
    
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        
        const { data, error } = await supabaseClient
            .from('cardio_sessions')
            .select('*')
            .eq('user_id', currentUser.id)
            .gte('date', startDate.toISOString().split('T')[0])
            .order('date', { ascending: false });
        
        if (error) {
            // Table n'existe peut-être pas encore
            if (error.code === '42P01') {
                console.log('Table cardio_sessions non créée');
                return [];
            }
            throw error;
        }
        
        return data || [];
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
    
    try {
        await withRetry(async () => {
            const { error } = await supabaseClient
                .from('workout_sessions')
                .insert({
                    user_id: currentUser.id,
                    date: sessionData.date,
                    program: sessionData.program,
                    day_name: sessionData.day,
                    exercises: sessionData.exercises
                });
            
            if (error) throw error;
            console.log('✅ Séance sauvegardée');
        }, { maxRetries: 3, critical: true });
        return true;
    } catch (error) {
        console.error('Erreur sauvegarde séance:', error);
        showToast('Erreur sync séance - sauvegardé localement', 'warning');
        return false;
    }
}

// ==================== UTILS ====================

function isLoggedIn() {
    return currentUser !== null;
}

function getCurrentUser() {
    return currentUser;
}
