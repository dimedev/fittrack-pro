// ==================== SUPABASE MODULE ====================

// Configuration Supabase
const SUPABASE_URL = 'https://erszjvaajztewcukvwbj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyc3pqdmFhanp0ZXdjdWt2d2JqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5ODAzNjAsImV4cCI6MjA4NDU1NjM2MH0.jK2keM5VtaLkGR8kD2xhjEgqzmfymdNVmbw509ZO2t4';

// Client Supabase
let supabaseClient = null;
let currentUser = null;

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
        const { data, error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
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
        
        // Charger le profil
        const { data: profile } = await supabaseClient
            .from('user_profiles')
            .select('*')
            .eq('user_id', currentUser.id)
            .single();
        
        if (profile) {
            state.profile = {
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
            
            // Ajouter les swaps locaux manquants et les sync
            Object.keys(localSwaps).forEach(originalExercise => {
                if (!supabaseSwaps[originalExercise]) {
                    // Swap local non présent dans Supabase, le garder et le sync
                    state.exerciseSwaps[originalExercise] = localSwaps[originalExercise];
                    
                    // Tenter de sync ce swap manquant
                    saveExerciseSwapToSupabase(originalExercise, localSwaps[originalExercise]).catch(err => {
                        console.warn('Sync rattrapage swap:', err);
                    });
                }
            });
        }
        
        // Charger les paramètres d'entraînement
        const { data: trainingSettings } = await supabaseClient
            .from('training_settings')
            .select('*')
            .eq('user_id', currentUser.id)
            .single();
        
        if (trainingSettings) {
            state.selectedProgram = trainingSettings.selected_program;
            state.trainingDays = trainingSettings.training_days;
        }
        
        // Charger le journal alimentaire (7 derniers jours)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const { data: journal } = await supabaseClient
            .from('food_journal')
            .select('*')
            .eq('user_id', currentUser.id)
            .gte('date', sevenDaysAgo.toISOString().split('T')[0]);
        
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
                    supabaseId: entry.id
                });
            });
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
        
        // Rafraîchir l'UI
        refreshAllUI();
        
    } catch (error) {
        console.error('Erreur chargement données:', error);
        showToast('Erreur lors du chargement des données', 'error');
    }
}

// Rafraîchir toute l'UI
function refreshAllUI() {
    // Restaurer le programme IA si présent dans le state
    if (state.aiCustomProgram && typeof trainingPrograms !== 'undefined') {
        trainingPrograms['ai-custom'] = state.aiCustomProgram;
    }
    
    renderProgramTypes();
    renderFoodsList();
    renderDailyMenu();
    renderFavoritesList();
    updateDashboard();
    updateWeeklySchedule();
    populateSessionDaySelect();
    populateProgressExerciseSelect();
    updateSessionHistory();
    if (document.getElementById('journal-date')) {
        loadJournalDay();
    }
}

// ==================== SAUVEGARDE VERS SUPABASE ====================

// Sauvegarder le profil
async function saveProfileToSupabase(profileData) {
    if (!currentUser) return;
    
    try {
        const { error } = await supabaseClient
            .from('user_profiles')
            .upsert({
                user_id: currentUser.id,
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
    } catch (error) {
        console.error('Erreur sauvegarde profil:', error);
    }
}

// Sauvegarder un aliment personnalisé
async function saveCustomFoodToSupabase(food) {
    if (!currentUser) return;
    
    try {
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
        return 'custom-' + data.id;
    } catch (error) {
        console.error('Erreur sauvegarde aliment:', error);
    }
}

// Supprimer un aliment personnalisé
async function deleteCustomFoodFromSupabase(foodId) {
    if (!currentUser) return;
    
    const supabaseId = foodId.replace('custom-', '');
    
    try {
        const { error } = await supabaseClient
            .from('custom_foods')
            .delete()
            .eq('id', supabaseId)
            .eq('user_id', currentUser.id);
        
        if (error) throw error;
        console.log('✅ Aliment supprimé');
    } catch (error) {
        console.error('Erreur suppression aliment:', error);
    }
}

// Sauvegarder un exercice personnalisé
async function saveCustomExerciseToSupabase(exercise) {
    if (!currentUser) return;
    
    try {
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
        return 'custom-' + data.id;
    } catch (error) {
        console.error('Erreur sauvegarde exercice:', error);
    }
}

// Sauvegarder un swap d'exercice
async function saveExerciseSwapToSupabase(originalExercise, replacementId) {
    if (!currentUser) return;
    
    try {
        const { error } = await supabaseClient
            .from('exercise_swaps')
            .upsert({
                user_id: currentUser.id,
                original_exercise: originalExercise,
                replacement_exercise_id: replacementId
            }, { onConflict: 'user_id,original_exercise' });
        
        if (error) throw error;
        console.log('✅ Swap exercice sauvegardé');
    } catch (error) {
        console.error('Erreur sauvegarde swap:', error);
    }
}

// Supprimer un swap d'exercice
async function deleteExerciseSwapFromSupabase(originalExercise) {
    if (!currentUser) return;
    
    try {
        const { error } = await supabaseClient
            .from('exercise_swaps')
            .delete()
            .eq('user_id', currentUser.id)
            .eq('original_exercise', originalExercise);
        
        if (error) throw error;
    } catch (error) {
        console.error('Erreur suppression swap:', error);
    }
}

// Sauvegarder les paramètres d'entraînement
async function saveTrainingSettingsToSupabase() {
    if (!currentUser) return;
    
    try {
        const { error } = await supabaseClient
            .from('training_settings')
            .upsert({
                user_id: currentUser.id,
                selected_program: state.selectedProgram,
                training_days: state.trainingDays,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });
        
        if (error) throw error;
        console.log('✅ Paramètres entraînement sauvegardés');
    } catch (error) {
        console.error('Erreur sauvegarde training settings:', error);
    }
}

// Ajouter une entrée au journal
async function addJournalEntryToSupabase(date, foodId, quantity) {
    if (!currentUser) return;
    
    try {
        const { data, error } = await supabaseClient
            .from('food_journal')
            .insert({
                user_id: currentUser.id,
                date: date,
                food_id: foodId,
                quantity: quantity
            })
            .select()
            .single();
        
        if (error) throw error;
        console.log('✅ Entrée journal ajoutée');
        return data.id;
    } catch (error) {
        console.error('Erreur ajout journal:', error);
    }
}

// Mettre à jour une entrée du journal
async function updateJournalEntryInSupabase(entryId, quantity) {
    if (!currentUser) return;
    
    try {
        const { error } = await supabaseClient
            .from('food_journal')
            .update({ quantity: quantity })
            .eq('id', entryId);
        
        if (error) throw error;
    } catch (error) {
        console.error('Erreur update journal:', error);
    }
}

// Supprimer une entrée du journal
async function deleteJournalEntryFromSupabase(entryId) {
    if (!currentUser) return;
    
    try {
        const { error } = await supabaseClient
            .from('food_journal')
            .delete()
            .eq('id', entryId);
        
        if (error) throw error;
    } catch (error) {
        console.error('Erreur suppression journal:', error);
    }
}

// Vider le journal d'un jour
async function clearJournalDayInSupabase(date) {
    if (!currentUser) return;
    
    try {
        const { error } = await supabaseClient
            .from('food_journal')
            .delete()
            .eq('user_id', currentUser.id)
            .eq('date', date);
        
        if (error) throw error;
    } catch (error) {
        console.error('Erreur vidage journal:', error);
    }
}

// Sauvegarder un log de progression
async function saveProgressLogToSupabase(exerciseName, logData) {
    if (!currentUser) return;
    
    try {
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
    } catch (error) {
        console.error('Erreur sauvegarde progress log:', error);
    }
}

// Sauvegarder une séance
async function saveWorkoutSessionToSupabase(sessionData) {
    if (!currentUser) return;
    
    try {
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
    } catch (error) {
        console.error('Erreur sauvegarde séance:', error);
    }
}

// ==================== UTILS ====================

function isLoggedIn() {
    return currentUser !== null;
}

function getCurrentUser() {
    return currentUser;
}
