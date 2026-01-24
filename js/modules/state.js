// ==================== STATE MANAGEMENT ====================
// Version MVP - dailyMenu supprimé, foodJournal est la source unique

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

// Charger l'état depuis localStorage
function loadState() {
    const saved = localStorage.getItem('fittrack-state');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
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
            
        } catch (e) {
            console.error('Erreur lors du chargement des données:', e);
            localStorage.removeItem('fittrack-state');
        }
    }
}

// Sauvegarder l'état dans localStorage
function saveState() {
    try {
        localStorage.setItem('fittrack-state', JSON.stringify(state));
    } catch (e) {
        console.error('Erreur lors de la sauvegarde:', e);
        showToast('Erreur de sauvegarde', 'error');
    }
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
            const imported = JSON.parse(e.target.result);
            state = { ...state, ...imported };
            
            // Re-merger les aliments par défaut
            const customFoods = state.foods.filter(f => !defaultFoods.find(df => df.id === f.id));
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
            
            showToast('Données importées avec succès !', 'success');
        } catch (err) {
            console.error('Erreur import:', err);
            showToast('Erreur lors de l\'import du fichier', 'error');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}
