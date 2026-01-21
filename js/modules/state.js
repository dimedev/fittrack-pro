// ==================== STATE MANAGEMENT ====================

let state = {
    profile: null,
    foods: [...defaultFoods],
    exercises: [...defaultExercises], // Exercices disponibles
    exerciseSwaps: {}, // Exercices remplacés par l'utilisateur { "Développé Couché": "chest-press-machine" }
    dailyMenu: {
        breakfast: [],
        lunch: [],
        snack: [],
        dinner: []
    },
    foodJournal: {}, // Journal alimentaire par date { "2025-01-21": [{ foodId, quantity }] }
    selectedProgram: null,
    trainingDays: 4,
    progressLog: {},
    sessionHistory: []
};

// Charger l'état depuis localStorage
function loadState() {
    const saved = localStorage.getItem('fittrack-state');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            state = { ...state, ...parsed };
            // S'assurer que les aliments par défaut sont inclus
            const customFoods = state.foods.filter(f => !defaultFoods.find(df => df.id === f.id));
            state.foods = [...defaultFoods, ...customFoods];
            // S'assurer que les exercices par défaut sont inclus
            const customExercises = (state.exercises || []).filter(e => !defaultExercises.find(de => de.id === e.id));
            state.exercises = [...defaultExercises, ...customExercises];
            // Initialiser exerciseSwaps si non présent
            if (!state.exerciseSwaps) state.exerciseSwaps = {};
        } catch (e) {
            console.error('Erreur lors du chargement des données:', e);
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
    a.download = `fittrack-backup-${new Date().toISOString().split('T')[0]}.json`;
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
            renderProgramTypes();
            renderFoodsList();
            renderDailyMenu();
            updateDashboard();
            updateWeeklySchedule();
            populateSessionDaySelect();
            populateProgressExerciseSelect();
            updateSessionHistory();
            
            showToast('Données importées avec succès !', 'success');
        } catch (err) {
            console.error('Erreur import:', err);
            showToast('Erreur lors de l\'import du fichier', 'error');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}
