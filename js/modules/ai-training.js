// ==================== AI TRAINING MODULE ====================
// Programme IA personnalisé, Progression automatique, Échauffement intelligent, Supersets & Circuits

// ==================== 1. PROGRAMME IA PERSONNALISÉ ====================

// Configuration du questionnaire IA
let aiProgramConfig = {
    goal: 'hypertrophy',      // strength, hypertrophy, endurance, weight-loss
    level: 'intermediate',     // beginner, intermediate, advanced
    equipment: 'full-gym',     // full-gym, home-gym, bodyweight, minimal
    daysPerWeek: 4,           // 3-6
    sessionDuration: 60,      // 30, 45, 60, 75, 90 minutes
    injuries: [],             // ['shoulder', 'back', 'knee', 'wrist']
    priorityMuscles: [],      // ['chest', 'back', 'legs', 'shoulders', 'arms']
    avoidExercises: []        // Exercices à éviter
};

/**
 * Ouvre le modal du questionnaire IA
 */
function openAIProgramModal() {
    let modal = document.getElementById('ai-program-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'ai-program-modal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal" style="max-width: 600px; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header">
                    <div class="modal-title">🤖 Programme IA Personnalisé</div>
                    <button class="modal-close" onclick="closeModal('ai-program-modal')">&times;</button>
                </div>
                <div class="modal-body" id="ai-program-modal-content">
                    <!-- Contenu dynamique -->
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal('ai-program-modal')">Annuler</button>
                    <button class="btn btn-primary" onclick="generateAndApplyAIProgram()">
                        🚀 Générer mon programme
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // Pré-remplir avec le profil si disponible
    if (state.profile) {
        const sessionCount = state.sessionHistory?.length || 0;
        aiProgramConfig.level = sessionCount < 20 ? 'beginner' : sessionCount < 100 ? 'intermediate' : 'advanced';

        // Mapper l'objectif du profil
        if (state.profile.goal === 'cut') aiProgramConfig.goal = 'weight-loss';
        else if (state.profile.goal === 'bulk' || state.profile.goal === 'lean-bulk') aiProgramConfig.goal = 'hypertrophy';
    }

    renderAIProgramQuestionnaire();
    openModal('ai-program-modal');
}

/**
 * Affiche le questionnaire complet
 */
function renderAIProgramQuestionnaire() {
    const content = document.getElementById('ai-program-modal-content');

    content.innerHTML = `
        <!-- Objectif Principal -->
        <div class="ai-question-section">
            <div class="ai-question-title">🎯 Quel est ton objectif principal ?</div>
            <div class="ai-options-grid cols-2">
                <div class="ai-option ${aiProgramConfig.goal === 'strength' ? 'selected' : ''}" onclick="setAIConfig('goal', 'strength')">
                    <div class="ai-option-icon">🏋️</div>
                    <div class="ai-option-name">Force</div>
                    <div class="ai-option-desc">Charges lourdes, 3-6 reps</div>
                </div>
                <div class="ai-option ${aiProgramConfig.goal === 'hypertrophy' ? 'selected' : ''}" onclick="setAIConfig('goal', 'hypertrophy')">
                    <div class="ai-option-icon">💪</div>
                    <div class="ai-option-name">Hypertrophie</div>
                    <div class="ai-option-desc">Prise de muscle, 8-12 reps</div>
                </div>
                <div class="ai-option ${aiProgramConfig.goal === 'endurance' ? 'selected' : ''}" onclick="setAIConfig('goal', 'endurance')">
                    <div class="ai-option-icon">🔥</div>
                    <div class="ai-option-name">Endurance</div>
                    <div class="ai-option-desc">Tonus musculaire, 15-20 reps</div>
                </div>
                <div class="ai-option ${aiProgramConfig.goal === 'weight-loss' ? 'selected' : ''}" onclick="setAIConfig('goal', 'weight-loss')">
                    <div class="ai-option-icon">⚡</div>
                    <div class="ai-option-name">Perte de poids</div>
                    <div class="ai-option-desc">Circuits, haute intensité</div>
                </div>
            </div>
        </div>
        
        <!-- Niveau -->
        <div class="ai-question-section">
            <div class="ai-question-title">📊 Quel est ton niveau ?</div>
            <div class="ai-options-grid cols-3">
                <div class="ai-option ${aiProgramConfig.level === 'beginner' ? 'selected' : ''}" onclick="setAIConfig('level', 'beginner')">
                    <div class="ai-option-icon">🌱</div>
                    <div class="ai-option-name">Débutant</div>
                    <div class="ai-option-desc">< 1 an</div>
                </div>
                <div class="ai-option ${aiProgramConfig.level === 'intermediate' ? 'selected' : ''}" onclick="setAIConfig('level', 'intermediate')">
                    <div class="ai-option-icon">🌿</div>
                    <div class="ai-option-name">Intermédiaire</div>
                    <div class="ai-option-desc">1-3 ans</div>
                </div>
                <div class="ai-option ${aiProgramConfig.level === 'advanced' ? 'selected' : ''}" onclick="setAIConfig('level', 'advanced')">
                    <div class="ai-option-icon">🌳</div>
                    <div class="ai-option-name">Avancé</div>
                    <div class="ai-option-desc">3+ ans</div>
                </div>
            </div>
        </div>
        
        <!-- Équipement -->
        <div class="ai-question-section">
            <div class="ai-question-title">🏠 Quel équipement as-tu ?</div>
            <div class="ai-options-grid cols-2">
                <div class="ai-option ${aiProgramConfig.equipment === 'full-gym' ? 'selected' : ''}" onclick="setAIConfig('equipment', 'full-gym')">
                    <div class="ai-option-icon">🏢</div>
                    <div class="ai-option-name">Salle complète</div>
                    <div class="ai-option-desc">Machines, barres, haltères</div>
                </div>
                <div class="ai-option ${aiProgramConfig.equipment === 'home-gym' ? 'selected' : ''}" onclick="setAIConfig('equipment', 'home-gym')">
                    <div class="ai-option-icon">🏠</div>
                    <div class="ai-option-name">Home Gym</div>
                    <div class="ai-option-desc">Haltères, banc, barre</div>
                </div>
                <div class="ai-option ${aiProgramConfig.equipment === 'minimal' ? 'selected' : ''}" onclick="setAIConfig('equipment', 'minimal')">
                    <div class="ai-option-icon">🎒</div>
                    <div class="ai-option-name">Minimal</div>
                    <div class="ai-option-desc">Haltères uniquement</div>
                </div>
                <div class="ai-option ${aiProgramConfig.equipment === 'bodyweight' ? 'selected' : ''}" onclick="setAIConfig('equipment', 'bodyweight')">
                    <div class="ai-option-icon">🤸</div>
                    <div class="ai-option-name">Poids du corps</div>
                    <div class="ai-option-desc">Sans matériel</div>
                </div>
            </div>
        </div>
        
        <!-- Jours par semaine -->
        <div class="ai-question-section">
            <div class="ai-question-title">📅 Combien de jours par semaine ?</div>
            <div class="ai-options-grid cols-4">
                ${[3, 4, 5, 6].map(d => `
                    <div class="ai-option ${aiProgramConfig.daysPerWeek === d ? 'selected' : ''}" onclick="setAIConfig('daysPerWeek', ${d})">
                        <div class="ai-option-name">${d} jours</div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <!-- Durée par séance -->
        <div class="ai-question-section">
            <div class="ai-question-title">⏱️ Durée par séance ?</div>
            <div class="ai-options-grid cols-5">
                ${[30, 45, 60, 75, 90].map(d => `
                    <div class="ai-option small ${aiProgramConfig.sessionDuration === d ? 'selected' : ''}" onclick="setAIConfig('sessionDuration', ${d})">
                        <div class="ai-option-name">${d} min</div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <!-- Blessures -->
        <div class="ai-question-section">
            <div class="ai-question-title">🩹 As-tu des blessures/limitations ? <span style="font-weight: normal; color: var(--text-muted);">(optionnel)</span></div>
            <div class="ai-options-grid cols-4">
                ${[
                    { id: 'shoulder', icon: '🦾', name: 'Épaule' },
                    { id: 'back', icon: '🔙', name: 'Dos' },
                    { id: 'knee', icon: '🦵', name: 'Genou' },
                    { id: 'wrist', icon: '✊', name: 'Poignet' }
                ].map(injury => `
                    <div class="ai-option small ${aiProgramConfig.injuries.includes(injury.id) ? 'selected' : ''}" 
                         onclick="toggleAIConfigArray('injuries', '${injury.id}')">
                        <div class="ai-option-icon">${injury.icon}</div>
                        <div class="ai-option-name">${injury.name}</div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <!-- Muscles prioritaires -->
        <div class="ai-question-section">
            <div class="ai-question-title">⭐ Muscles à prioriser ? <span style="font-weight: normal; color: var(--text-muted);">(optionnel, max 2)</span></div>
            <div class="ai-options-grid cols-5">
                ${[
                    { id: 'chest', icon: '🫁', name: 'Pectoraux' },
                    { id: 'back', icon: '🔙', name: 'Dos' },
                    { id: 'shoulders', icon: '🎯', name: 'Épaules' },
                    { id: 'arms', icon: '💪', name: 'Bras' },
                    { id: 'legs', icon: '🦵', name: 'Jambes' }
                ].map(muscle => `
                    <div class="ai-option small ${aiProgramConfig.priorityMuscles.includes(muscle.id) ? 'selected' : ''}" 
                         onclick="toggleAIConfigArray('priorityMuscles', '${muscle.id}', 2)">
                        <div class="ai-option-icon">${muscle.icon}</div>
                        <div class="ai-option-name">${muscle.name}</div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <!-- Résumé -->
        <div class="ai-summary">
            <div class="ai-summary-title">📋 Résumé de ton profil</div>
            <div class="ai-summary-content" id="ai-summary-content">
                ${getAISummary()}
            </div>
        </div>
    `;
}

function setAIConfig(key, value) {
    aiProgramConfig[key] = value;
    renderAIProgramQuestionnaire();
}

function toggleAIConfigArray(key, value, maxItems = null) {
    const arr = aiProgramConfig[key];
    const index = arr.indexOf(value);

    if (index > -1) {
        arr.splice(index, 1);
    } else {
        if (maxItems && arr.length >= maxItems) {
            arr.shift(); // Retirer le premier élément
        }
        arr.push(value);
    }

    renderAIProgramQuestionnaire();
}

function getAISummary() {
    const goalLabels = {
        'strength': 'Force (3-6 reps)',
        'hypertrophy': 'Hypertrophie (8-12 reps)',
        'endurance': 'Endurance (15-20 reps)',
        'weight-loss': 'Perte de poids (circuits)'
    };

    const levelLabels = {
        'beginner': 'Débutant',
        'intermediate': 'Intermédiaire',
        'advanced': 'Avancé'
    };

    const equipLabels = {
        'full-gym': 'Salle complète',
        'home-gym': 'Home Gym',
        'minimal': 'Équipement minimal',
        'bodyweight': 'Poids du corps'
    };

    // Déterminer le type de split recommandé
    let splitType = 'Full Body';
    if (aiProgramConfig.level === 'beginner' || aiProgramConfig.daysPerWeek <= 3) {
        splitType = 'Full Body';
    } else if (aiProgramConfig.level === 'intermediate' || aiProgramConfig.daysPerWeek === 4) {
        splitType = 'Upper/Lower';
    } else if (aiProgramConfig.level === 'advanced' && aiProgramConfig.daysPerWeek >= 5) {
        splitType = 'Push/Pull/Legs';
    }

    // Estimer le nombre d'exercices par séance
    let exercisesPerSession = Math.floor(aiProgramConfig.sessionDuration / 10);
    if (aiProgramConfig.goal === 'strength') exercisesPerSession = Math.max(4, exercisesPerSession - 2);
    if (aiProgramConfig.goal === 'weight-loss') exercisesPerSession = Math.min(10, exercisesPerSession + 2);

    return `
        <div class="ai-summary-row">
            <span>🎯 Objectif:</span>
            <strong>${goalLabels[aiProgramConfig.goal]}</strong>
        </div>
        <div class="ai-summary-row">
            <span>📊 Niveau:</span>
            <strong>${levelLabels[aiProgramConfig.level]}</strong>
        </div>
        <div class="ai-summary-row">
            <span>🏠 Équipement:</span>
            <strong>${equipLabels[aiProgramConfig.equipment]}</strong>
        </div>
        <div class="ai-summary-row">
            <span>📅 Fréquence:</span>
            <strong>${aiProgramConfig.daysPerWeek}x/semaine, ${aiProgramConfig.sessionDuration} min</strong>
        </div>
        <div class="ai-summary-row">
            <span>📋 Split recommandé:</span>
            <strong>${splitType}</strong>
        </div>
        <div class="ai-summary-row">
            <span>💪 Exercices/séance:</span>
            <strong>~${exercisesPerSession} exercices</strong>
        </div>
        ${aiProgramConfig.injuries.length > 0 ? `
            <div class="ai-summary-row warning">
                <span>⚠️ Limitations:</span>
                <strong>${aiProgramConfig.injuries.join(', ')}</strong>
            </div>
        ` : ''}
        ${aiProgramConfig.priorityMuscles.length > 0 ? `
            <div class="ai-summary-row highlight">
                <span>⭐ Priorités:</span>
                <strong>${aiProgramConfig.priorityMuscles.join(', ')}</strong>
            </div>
        ` : ''}
    `;
}

/**
 * Génère et applique le programme basé sur le questionnaire
 */
function generateAndApplyAIProgram() {
    const program = generateAIProgramFromConfig();

    if (!program) {
        showToast('Erreur lors de la génération', 'error');
        return;
    }

    // Ajouter au trainingPrograms
    trainingPrograms['ai-custom'] = program;

    // Sélectionner ce programme
    state.selectedProgram = 'ai-custom';
    state.trainingDays = aiProgramConfig.daysPerWeek;
    document.getElementById('training-days').value = state.trainingDays;

    saveState();
    closeModal('ai-program-modal');

    renderProgramTypes();
    updateWeeklySchedule();
    populateSessionDaySelect();
    updateDashboard();

    showToast(`Programme IA généré ! ${program.splits[aiProgramConfig.daysPerWeek].length} jours de training 🤖`, 'success');
}

/**
 * Génère le programme basé sur la configuration du questionnaire
 */
function generateAIProgramFromConfig() {
    const { goal, level, equipment, daysPerWeek, sessionDuration, injuries, priorityMuscles } = aiProgramConfig;

    // Déterminer le type de split
    let splitType = 'full-body';
    if (level === 'beginner' || daysPerWeek <= 3) {
        splitType = 'full-body';
    } else if (daysPerWeek === 4) {
        splitType = 'upper-lower';
    } else if (daysPerWeek >= 5) {
        splitType = level === 'advanced' ? 'ppl' : 'upper-lower';
    }

    // Paramètres selon l'objectif
    let repsRange, setsPerExercise, restTime;
    switch (goal) {
        case 'strength':
            repsRange = '4-6';
            setsPerExercise = 5;
            restTime = 180;
            break;
        case 'hypertrophy':
            repsRange = '8-12';
            setsPerExercise = 4;
            restTime = 90;
            break;
        case 'endurance':
            repsRange = '15-20';
            setsPerExercise = 3;
            restTime = 45;
            break;
        case 'weight-loss':
            repsRange = '12-15';
            setsPerExercise = 3;
            restTime = 30;
            break;
        default:
            repsRange = '8-12';
            setsPerExercise = 4;
            restTime = 90;
    }

    // Ajuster selon le niveau
    if (level === 'beginner') {
        setsPerExercise = Math.max(2, setsPerExercise - 1);
    } else if (level === 'advanced') {
        setsPerExercise = Math.min(6, setsPerExercise + 1);
    }

    // Calculer le nombre d'exercices par séance
    const timePerExercise = (setsPerExercise * 1.5) + (setsPerExercise * restTime / 60); // minutes
    let exercisesPerSession = Math.floor(sessionDuration / timePerExercise);
    exercisesPerSession = Math.max(4, Math.min(10, exercisesPerSession));

    // Créer le programme
    const program = {
        id: 'ai-custom',
        name: 'Programme IA',
        icon: '🤖',
        description: getAIProgramDescription(),
        level,
        goal,
        equipment,
        minDays: Math.max(daysPerWeek - 1, 3),
        maxDays: Math.min(daysPerWeek + 1, 6),
        splits: {},
        exercises: {},
        config: { ...aiProgramConfig },
        generatedAt: new Date().toISOString()
    };

    // Générer les splits et exercices
    if (splitType === 'full-body') {
        program.splits = generateAIFullBodySplits(daysPerWeek);
        program.exercises = generateAIFullBodyExercises(exercisesPerSession, setsPerExercise, repsRange, equipment, injuries, priorityMuscles);
    } else if (splitType === 'upper-lower') {
        program.splits = generateAIUpperLowerSplits(daysPerWeek);
        program.exercises = generateAIUpperLowerExercises(exercisesPerSession, setsPerExercise, repsRange, equipment, injuries, priorityMuscles);
    } else if (splitType === 'ppl') {
        program.splits = generateAIPPLSplits(daysPerWeek);
        program.exercises = generateAIPPLExercises(exercisesPerSession, setsPerExercise, repsRange, equipment, injuries, priorityMuscles);
    }

    return program;
}

function getAIProgramDescription() {
    const goalLabels = {
        'strength': 'Force',
        'hypertrophy': 'Hypertrophie',
        'endurance': 'Endurance',
        'weight-loss': 'Perte de poids'
    };
    const levelLabels = {
        'beginner': 'Débutant',
        'intermediate': 'Intermédiaire',
        'advanced': 'Avancé'
    };
    return `${goalLabels[aiProgramConfig.goal]} • ${levelLabels[aiProgramConfig.level]} • ${aiProgramConfig.sessionDuration}min`;
}

// ========== GÉNÉRATEURS DE SPLITS ==========

function generateAIFullBodySplits(days) {
    const splits = {};
    const variations = ['Full Body A', 'Full Body B', 'Full Body C', 'Full Body D', 'Full Body E', 'Full Body F'];

    for (let d = Math.max(3, days - 1); d <= Math.min(6, days + 1); d++) {
        splits[d] = variations.slice(0, d);
    }
    return splits;
}

function generateAIUpperLowerSplits(days) {
    const splits = {};
    if (days >= 3) splits[3] = ['Upper A', 'Lower A', 'Upper B'];
    if (days >= 4) splits[4] = ['Upper A', 'Lower A', 'Upper B', 'Lower B'];
    if (days >= 5) splits[5] = ['Upper A', 'Lower A', 'Upper B', 'Lower B', 'Full Body'];
    if (days >= 6) splits[6] = ['Upper A', 'Lower A', 'Upper B', 'Lower B', 'Upper C', 'Lower C'];
    return splits;
}

function generateAIPPLSplits(days) {
    const splits = {};
    if (days >= 3) splits[3] = ['Push', 'Pull', 'Legs'];
    if (days >= 4) splits[4] = ['Push', 'Pull', 'Legs', 'Upper'];
    if (days >= 5) splits[5] = ['Push A', 'Pull A', 'Legs A', 'Push B', 'Pull B'];
    if (days >= 6) splits[6] = ['Push A', 'Pull A', 'Legs A', 'Push B', 'Pull B', 'Legs B'];
    return splits;
}

// ========== GÉNÉRATEURS D'EXERCICES ==========

function getAvailableExercises(equipment, injuries) {
    let exercises = [...state.exercises];

    // Filtrer par équipement
    const equipmentMap = {
        'full-gym': ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'smith'],
        'home-gym': ['barbell', 'dumbbell', 'bodyweight'],
        'minimal': ['dumbbell', 'bodyweight'],
        'bodyweight': ['bodyweight']
    };

    const allowedEquipment = equipmentMap[equipment] || equipmentMap['full-gym'];
    exercises = exercises.filter(e => allowedEquipment.includes(e.equipment));

    // Filtrer par blessures
    const injuryExclusions = {
        'shoulder': ['Développé Militaire', 'Élévations Latérales', 'Développé Incliné', 'Dips'],
        'back': ['Soulevé de Terre', 'Rowing Barre', 'Hyperextension'],
        'knee': ['Squat', 'Fentes', 'Leg Extension', 'Presse à Cuisses'],
        'wrist': ['Curl Barre', 'Développé Couché Barre', 'Front Squat']
    };

    injuries.forEach(injury => {
        const exclusions = injuryExclusions[injury] || [];
        exercises = exercises.filter(e => !exclusions.some(ex => e.name.includes(ex)));
    });

    return exercises;
}

function selectExercisesForMuscle(muscle, count, availableExercises, priorityMuscles) {
    let muscleExercises = availableExercises.filter(e => e.muscle === muscle);

    // Mélanger pour varier
    muscleExercises = muscleExercises.sort(() => Math.random() - 0.5);

    // Si muscle prioritaire, on peut ajouter un exercice de plus
    const bonus = priorityMuscles.includes(muscle) ? 1 : 0;

    return muscleExercises.slice(0, count + bonus);
}

function generateAIFullBodyExercises(exercisesPerSession, sets, reps, equipment, injuries, priorityMuscles) {
    const available = getAvailableExercises(equipment, injuries);
    const exercises = {};

    // Structure de base pour Full Body
    const muscleTemplate = [
        { muscle: 'quads', count: 1 },
        { muscle: 'chest', count: 1 },
        { muscle: 'back', count: 1 },
        { muscle: 'hamstrings', count: 1 },
        { muscle: 'shoulders', count: 1 },
        { muscle: 'biceps', count: 1 },
        { muscle: 'triceps', count: 1 }
    ];

    ['Full Body A', 'Full Body B', 'Full Body C', 'Full Body D', 'Full Body E', 'Full Body F'].forEach((day, idx) => {
        const dayExercises = [];

        muscleTemplate.forEach(({ muscle, count }) => {
            const selected = selectExercisesForMuscle(muscle, count, available, priorityMuscles);
            selected.forEach(ex => {
                // Varier légèrement les sets/reps
                const variation = idx % 2 === 0 ? 0 : (muscle === 'biceps' || muscle === 'triceps' ? -1 : 1);
                dayExercises.push({
                    name: ex.name,
                    sets: Math.max(2, sets + variation),
                    reps: reps,
                    muscle: ex.muscle
                });
            });
        });

        // Limiter au nombre d'exercices par séance
        exercises[day] = dayExercises.slice(0, exercisesPerSession);
    });

    return exercises;
}

function generateAIUpperLowerExercises(exercisesPerSession, sets, reps, equipment, injuries, priorityMuscles) {
    const available = getAvailableExercises(equipment, injuries);
    const exercises = {};

    // Upper template
    const upperMuscles = [
        { muscle: 'chest', count: 2 },
        { muscle: 'back', count: 2 },
        { muscle: 'shoulders', count: 1 },
        { muscle: 'biceps', count: 1 },
        { muscle: 'triceps', count: 1 }
    ];

    // Lower template
    const lowerMuscles = [
        { muscle: 'quads', count: 2 },
        { muscle: 'hamstrings', count: 2 },
        { muscle: 'glutes', count: 1 },
        { muscle: 'calves', count: 1 }
    ];

    ['Upper A', 'Upper B', 'Upper C'].forEach((day, idx) => {
        const dayExercises = [];
        upperMuscles.forEach(({ muscle, count }) => {
            const selected = selectExercisesForMuscle(muscle, count, available, priorityMuscles);
            selected.forEach(ex => {
                dayExercises.push({ name: ex.name, sets, reps, muscle: ex.muscle });
            });
        });
        exercises[day] = dayExercises.slice(0, exercisesPerSession);
    });

    ['Lower A', 'Lower B', 'Lower C'].forEach((day, idx) => {
        const dayExercises = [];
        lowerMuscles.forEach(({ muscle, count }) => {
            const selected = selectExercisesForMuscle(muscle, count, available, priorityMuscles);
            selected.forEach(ex => {
                dayExercises.push({ name: ex.name, sets, reps, muscle: ex.muscle });
            });
        });
        exercises[day] = dayExercises.slice(0, exercisesPerSession);
    });

    // Full Body pour les splits à 5 jours
    exercises['Full Body'] = generateAIFullBodyExercises(exercisesPerSession, sets, reps, equipment, injuries, priorityMuscles)['Full Body A'];

    return exercises;
}

function generateAIPPLExercises(exercisesPerSession, sets, reps, equipment, injuries, priorityMuscles) {
    const available = getAvailableExercises(equipment, injuries);
    const exercises = {};

    // Push
    const pushMuscles = [
        { muscle: 'chest', count: 3 },
        { muscle: 'shoulders', count: 2 },
        { muscle: 'triceps', count: 2 }
    ];

    // Pull
    const pullMuscles = [
        { muscle: 'back', count: 3 },
        { muscle: 'rear-delts', count: 1 },
        { muscle: 'biceps', count: 2 }
    ];

    // Legs
    const legsMuscles = [
        { muscle: 'quads', count: 2 },
        { muscle: 'hamstrings', count: 2 },
        { muscle: 'glutes', count: 1 },
        { muscle: 'calves', count: 1 }
    ];

    ['Push', 'Push A', 'Push B'].forEach((day, idx) => {
        const dayExercises = [];
        pushMuscles.forEach(({ muscle, count }) => {
            const selected = selectExercisesForMuscle(muscle, count, available, priorityMuscles);
            selected.forEach(ex => {
                dayExercises.push({ name: ex.name, sets, reps, muscle: ex.muscle });
            });
        });
        exercises[day] = dayExercises.slice(0, exercisesPerSession);
    });

    ['Pull', 'Pull A', 'Pull B'].forEach((day, idx) => {
        const dayExercises = [];
        pullMuscles.forEach(({ muscle, count }) => {
            const selected = selectExercisesForMuscle(muscle, count, available, priorityMuscles);
            selected.forEach(ex => {
                dayExercises.push({ name: ex.name, sets, reps, muscle: ex.muscle });
            });
        });
        exercises[day] = dayExercises.slice(0, exercisesPerSession);
    });

    ['Legs', 'Legs A', 'Legs B'].forEach((day, idx) => {
        const dayExercises = [];
        legsMuscles.forEach(({ muscle, count }) => {
            const selected = selectExercisesForMuscle(muscle, count, available, priorityMuscles);
            selected.forEach(ex => {
                dayExercises.push({ name: ex.name, sets, reps, muscle: ex.muscle });
            });
        });
        exercises[day] = dayExercises.slice(0, exercisesPerSession);
    });

    // Upper pour les splits à 4 jours
    exercises['Upper'] = generateAIUpperLowerExercises(exercisesPerSession, sets, reps, equipment, injuries, priorityMuscles)['Upper A'];

    return exercises;
}

/**
 * Fonction legacy pour compatibilité - ouvre maintenant le questionnaire
 */
function applyAIProgram() {
    openAIProgramModal();
}


// ==================== 2. PROGRESSION AUTOMATIQUE ====================

/**
 * Analyse l'historique et suggère des progressions
 * @param {string} exerciseName - Nom de l'exercice
 * @returns {object} Recommandations de progression
 */
function getProgressionRecommendation(exerciseName) {
    const logs = state.progressLog[exerciseName];
    if (!logs || logs.length < 2) {
        return {
            type: 'new',
            message: 'Pas assez de données. Continuez à logger vos séances !',
            suggestion: null
        };
    }
    
    // Analyser les 5 dernières séances
    const recentLogs = logs.slice(-5);
    const lastLog = recentLogs[recentLogs.length - 1];
    
    // Calculer la progression moyenne
    const weights = recentLogs.map(l => l.weight);
    const avgWeight = weights.reduce((a, b) => a + b, 0) / weights.length;
    const lastWeight = lastLog.weight;
    
    // Vérifier si les reps cibles sont atteintes
    const lastSets = lastLog.setsDetail || [];
    const targetRepsMin = parseInt((lastLog.targetReps || '8-10').split('-')[0]);
    const allRepsAchieved = lastSets.every(s => s.reps >= targetRepsMin);
    const avgRepsAchieved = lastSets.reduce((sum, s) => sum + s.reps, 0) / lastSets.length;
    
    // Analyser la tendance
    let trend = 'stable';
    if (weights.length >= 3) {
        const firstHalf = weights.slice(0, Math.floor(weights.length / 2));
        const secondHalf = weights.slice(Math.floor(weights.length / 2));
        const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
        
        if (secondAvg > firstAvg * 1.02) trend = 'improving';
        else if (secondAvg < firstAvg * 0.98) trend = 'declining';
    }
    
    // Générer la recommandation
    let recommendation = {
        type: 'maintain',
        message: '',
        suggestion: null,
        details: {
            currentWeight: lastWeight,
            avgReps: Math.round(avgRepsAchieved * 10) / 10,
            trend,
            sessionsAnalyzed: recentLogs.length
        }
    };
    
    // Règles de progression (Double Progression)
    if (allRepsAchieved && avgRepsAchieved >= targetRepsMin + 2) {
        // Toutes les reps atteintes avec marge → augmenter le poids
        const increment = lastWeight < 40 ? 2.5 : 5;
        recommendation = {
            type: 'increase_weight',
            message: `🚀 Prêt à progresser ! Vous atteignez ${Math.round(avgRepsAchieved)} reps en moyenne.`,
            suggestion: {
                newWeight: lastWeight + increment,
                increment,
                reason: 'Double progression: reps cibles atteintes avec facilité'
            },
            details: recommendation.details
        };
    } else if (!allRepsAchieved && avgRepsAchieved < targetRepsMin - 2) {
        // Reps non atteintes → réduire ou maintenir
        const decrement = lastWeight < 40 ? 2.5 : 5;
        recommendation = {
            type: 'decrease_weight',
            message: `⚠️ Difficulté détectée. Moyenne de ${Math.round(avgRepsAchieved)} reps.`,
            suggestion: {
                newWeight: lastWeight - decrement,
                decrement,
                reason: 'Reps insuffisantes - consolider avant de progresser'
            },
            details: recommendation.details
        };
    } else if (trend === 'declining') {
        recommendation = {
            type: 'deload',
            message: `📉 Possible fatigue accumulée. Considérez un deload.`,
            suggestion: {
                newWeight: Math.round(lastWeight * 0.9),
                reason: 'Tendance à la baisse - semaine de récupération recommandée'
            },
            details: recommendation.details
        };
    } else if (trend === 'improving') {
        recommendation = {
            type: 'continue',
            message: `📈 Excellente progression ! Continuez ainsi.`,
            suggestion: null,
            details: recommendation.details
        };
    } else {
        recommendation.message = `💪 Performance stable à ${lastWeight}kg. Focus sur les reps.`;
    }
    
    return recommendation;
}

/**
 * Affiche les recommandations de progression dans le dashboard
 */
function updateProgressionRecommendations() {
    const container = document.getElementById('recommendations-card-container');
    if (!container) return;
    
    // Récupérer les exercices les plus loggés
    const exerciseStats = Object.entries(state.progressLog)
        .map(([name, logs]) => ({ name, count: logs.length, lastDate: logs[logs.length - 1]?.date }))
        .filter(e => e.count >= 2)
        .sort((a, b) => new Date(b.lastDate) - new Date(a.lastDate))
        .slice(0, 5);
    
    if (exerciseStats.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    const recommendations = exerciseStats.map(ex => ({
        exercise: ex.name,
        ...getProgressionRecommendation(ex.name)
    }));
    
    // Filtrer ceux qui ont des suggestions actionables
    const actionable = recommendations.filter(r => 
        r.type === 'increase_weight' || r.type === 'decrease_weight' || r.type === 'deload'
    );
    
    if (actionable.length === 0) {
        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">
                        <span class="icon">💡</span>
                        Recommandations IA
                    </div>
                </div>
                <div style="padding: 20px; text-align: center; color: var(--text-secondary);">
                    <p>📈 Vos performances sont stables. Continuez ainsi !</p>
                </div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <div class="card-title">
                    <span class="icon">💡</span>
                    Recommandations de Progression
                </div>
            </div>
            <div class="recommendations-list">
                ${actionable.map(rec => `
                    <div class="recommendation-item ${rec.type}">
                        <div class="recommendation-header">
                            <span class="recommendation-exercise">${rec.exercise}</span>
                            <span class="recommendation-badge ${rec.type}">
                                ${rec.type === 'increase_weight' ? '🚀 Augmenter' : 
                                  rec.type === 'decrease_weight' ? '⚠️ Réduire' : '📉 Deload'}
                            </span>
                        </div>
                        <div class="recommendation-message">${rec.message}</div>
                        ${rec.suggestion ? `
                            <div class="recommendation-suggestion">
                                <span class="suggestion-weight">
                                    ${rec.details.currentWeight}kg → <strong>${rec.suggestion.newWeight}kg</strong>
                                </span>
                                <button class="btn btn-sm btn-primary" onclick="applyProgressionSuggestion('${rec.exercise}', ${rec.suggestion.newWeight})">
                                    Appliquer
                                </button>
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

/**
 * Applique une suggestion de progression
 */
function applyProgressionSuggestion(exerciseName, newWeight) {
    // Stocker la suggestion pour la prochaine séance
    if (!state.progressionSuggestions) state.progressionSuggestions = {};
    state.progressionSuggestions[exerciseName] = newWeight;
    saveState();
    
    showToast(`Poids suggéré de ${newWeight}kg mémorisé pour ${exerciseName}`, 'success');
    
    // Rafraîchir si on est sur la séance du jour
    if (document.getElementById('session-exercises').innerHTML.includes(exerciseName)) {
        loadSessionDay();
    }
}


// ==================== 3. ÉCHAUFFEMENT INTELLIGENT ====================

/**
 * Génère des séries d'échauffement adaptées
 * @param {string} exerciseName - Nom de l'exercice
 * @param {number} workingWeight - Poids de travail prévu
 * @param {number} targetSets - Nombre de séries de travail
 * @returns {array} Séries d'échauffement
 */
function generateWarmupSets(exerciseName, workingWeight, targetSets = 4) {
    if (!workingWeight || workingWeight <= 0) {
        return [];
    }
    
    const isCompound = isCompoundExercise(exerciseName);
    const warmupSets = [];
    
    // Toujours commencer par une série à vide ou très légère
    if (workingWeight >= 40) {
        warmupSets.push({
            weight: 20, // Barre à vide ou poids minimal
            reps: 15,
            type: 'warmup',
            rest: 60,
            notes: 'Activation musculaire'
        });
    }
    
    if (isCompound) {
        // Échauffement progressif pour exercices composés
        if (workingWeight >= 60) {
            warmupSets.push({
                weight: Math.round(workingWeight * 0.4 / 2.5) * 2.5,
                reps: 10,
                type: 'warmup',
                rest: 60,
                notes: '40% - Technique'
            });
        }
        
        if (workingWeight >= 40) {
            warmupSets.push({
                weight: Math.round(workingWeight * 0.6 / 2.5) * 2.5,
                reps: 6,
                type: 'warmup',
                rest: 90,
                notes: '60% - Montée progressive'
            });
        }
        
        if (workingWeight >= 60) {
            warmupSets.push({
                weight: Math.round(workingWeight * 0.8 / 2.5) * 2.5,
                reps: 3,
                type: 'warmup',
                rest: 120,
                notes: '80% - Préparation système nerveux'
            });
        }
        
        // Série d'approche si poids lourd
        if (workingWeight >= 80) {
            warmupSets.push({
                weight: Math.round(workingWeight * 0.9 / 2.5) * 2.5,
                reps: 1,
                type: 'feeler',
                rest: 120,
                notes: '90% - Série d\'approche'
            });
        }
    } else {
        // Échauffement simplifié pour isolation
        if (workingWeight >= 20) {
            warmupSets.push({
                weight: Math.round(workingWeight * 0.5 / 2.5) * 2.5 || 5,
                reps: 12,
                type: 'warmup',
                rest: 45,
                notes: '50% - Activation'
            });
        }
        
        if (workingWeight >= 30) {
            warmupSets.push({
                weight: Math.round(workingWeight * 0.75 / 2.5) * 2.5,
                reps: 8,
                type: 'warmup',
                rest: 60,
                notes: '75% - Préparation'
            });
        }
    }
    
    return warmupSets;
}

/**
 * Affiche les séries d'échauffement dans la card d'exercice
 */
function showWarmupSets(exerciseName, workingWeight) {
    // Si pas de poids passé, essayer de le récupérer depuis l'input de l'exercice
    if (!workingWeight || workingWeight <= 0) {
        const exerciseCard = document.querySelector(`.exercise-card[data-exercise="${exerciseName}"]`);
        if (exerciseCard) {
            const weightInput = exerciseCard.querySelector('.set-weight');
            if (weightInput && weightInput.value) {
                workingWeight = parseFloat(weightInput.value);
            }
        }
    }

    // Si toujours pas de poids, demander à l'utilisateur d'en saisir un
    if (!workingWeight || workingWeight <= 0) {
        // Ouvrir un prompt pour demander le poids
        const inputWeight = prompt(`Poids de travail prévu pour ${exerciseName} (kg):`, '60');
        if (inputWeight && !isNaN(parseFloat(inputWeight))) {
            workingWeight = parseFloat(inputWeight);
        } else {
            showToast('Entrez un poids valide pour générer l\'échauffement', 'info');
            return;
        }
    }

    const warmupSets = generateWarmupSets(exerciseName, workingWeight);

    if (warmupSets.length === 0) {
        // Si le poids est très faible, générer quand même un échauffement minimal
        showToast('Poids trop faible pour nécessiter un échauffement complet', 'info');
        return;
    }
    
    // Créer le modal d'échauffement
    let modal = document.getElementById('warmup-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'warmup-modal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal" style="max-width: 450px;">
                <div class="modal-header">
                    <div class="modal-title" id="warmup-modal-title">Échauffement</div>
                    <button class="modal-close" onclick="closeModal('warmup-modal')">&times;</button>
                </div>
                <div class="modal-body" id="warmup-modal-content"></div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal('warmup-modal')">Fermer</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    document.getElementById('warmup-modal-title').textContent = `🔥 Échauffement: ${exerciseName}`;
    
    const content = document.getElementById('warmup-modal-content');
    content.innerHTML = `
        <div class="warmup-info">
            <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 15px;">
                Poids de travail: <strong>${workingWeight}kg</strong>
            </p>
        </div>
        <div class="warmup-sets">
            ${warmupSets.map((set, idx) => `
                <div class="warmup-set-row ${set.type}">
                    <div class="warmup-set-num">${idx + 1}</div>
                    <div class="warmup-set-details">
                        <span class="warmup-weight">${set.weight}kg</span>
                        <span class="warmup-reps">× ${set.reps}</span>
                    </div>
                    <div class="warmup-set-notes">${set.notes}</div>
                    <div class="warmup-set-rest">⏱ ${set.rest}s</div>
                </div>
            `).join('')}
        </div>
        <div class="warmup-total" style="margin-top: 15px; padding: 10px; background: var(--bg-tertiary); border-radius: 8px;">
            <p style="font-size: 0.85rem; color: var(--text-secondary);">
                📊 Total: ${warmupSets.length} séries • 
                ${warmupSets.reduce((sum, s) => sum + s.reps, 0)} reps • 
                ~${Math.ceil(warmupSets.reduce((sum, s) => sum + s.rest, 0) / 60)} min
            </p>
        </div>
    `;
    
    openModal('warmup-modal');
}


// ==================== 4. SUPERSETS & CIRCUITS ====================

// Types de combinaisons
const trainingModes = {
    normal: {
        name: 'Normal',
        icon: '💪',
        description: 'Séries classiques avec repos entre chaque'
    },
    superset: {
        name: 'Superset',
        icon: '⚡',
        description: '2 exercices enchaînés sans repos',
        restBetweenRounds: 90
    },
    triset: {
        name: 'Triset',
        icon: '🔥',
        description: '3 exercices enchaînés sans repos',
        restBetweenRounds: 120
    },
    circuit: {
        name: 'Circuit',
        icon: '🔄',
        description: '4+ exercices en boucle',
        restBetweenRounds: 60,
        restBetweenExercises: 15
    },
    dropset: {
        name: 'Dropset',
        icon: '📉',
        description: 'Réduction de poids sans repos jusqu\'à l\'échec'
    },
    restpause: {
        name: 'Rest-Pause',
        icon: '⏸️',
        description: 'Séries avec mini-pauses de 10-15s'
    }
};

// Pairings optimaux pour supersets
const supersetPairings = {
    // Agoniste-Antagoniste (le plus efficace)
    'chest-back': ['Développé Couché', 'Rowing Barre'],
    'biceps-triceps': ['Curl Barre', 'Extensions Triceps Poulie'],
    'quads-hamstrings': ['Leg Extension', 'Leg Curl'],
    
    // Même muscle (pré-fatigue)
    'chest-chest': ['Écartés Poulies', 'Développé Incliné'],
    'back-back': ['Tirage Vertical', 'Rowing Haltères'],
    
    // Upper-Lower (cardio intense)
    'push-legs': ['Développé Épaules', 'Squat Goblet']
};

/**
 * Génère un superset intelligent
 */
function generateSuperset(exercise1Name) {
    const ex1 = state.exercises.find(e => e.name === exercise1Name);
    if (!ex1) return null;
    
    const muscle1 = ex1.muscle;
    
    // Trouver le meilleur pairing
    let pairedMuscle = null;
    const antagonists = {
        'chest': 'back',
        'back': 'chest',
        'biceps': 'triceps',
        'triceps': 'biceps',
        'quads': 'hamstrings',
        'hamstrings': 'quads',
        'shoulders': 'back'
    };
    
    pairedMuscle = antagonists[muscle1] || muscle1; // Même muscle si pas d'antagoniste
    
    // Trouver un exercice compatible
    const compatibleExercises = state.exercises.filter(e => 
        e.muscle === pairedMuscle && 
        e.name !== exercise1Name &&
        e.equipment !== 'barbell' // Éviter les exercices lourds en superset
    );
    
    if (compatibleExercises.length === 0) return null;
    
    // Choisir aléatoirement ou par équipement similaire
    const exercise2 = compatibleExercises[Math.floor(Math.random() * compatibleExercises.length)];
    
    return {
        type: 'superset',
        exercises: [
            { name: exercise1Name, muscle: muscle1 },
            { name: exercise2.name, muscle: exercise2.muscle }
        ],
        rounds: 3,
        restBetweenRounds: 90,
        pairingType: muscle1 === pairedMuscle ? 'same-muscle' : 'antagonist'
    };
}

/**
 * Génère un circuit training
 */
function generateCircuit(muscleGroups = ['full-body'], duration = 20) {
    const exercisesPerCircuit = duration <= 15 ? 4 : duration <= 25 ? 5 : 6;
    const rounds = duration <= 15 ? 3 : duration <= 25 ? 4 : 5;
    
    const circuitExercises = [];
    const usedMuscles = new Set();
    
    // Sélectionner des exercices variés
    const availableExercises = state.exercises.filter(e => 
        // Éviter les exercices trop lourds/techniques pour un circuit
        !['Soulevé de Terre', 'Squat', 'Développé Couché'].includes(e.name) &&
        (muscleGroups.includes('full-body') || muscleGroups.includes(e.muscle))
    );
    
    // Alterner haut/bas du corps
    const upperMuscles = ['chest', 'back', 'shoulders', 'biceps', 'triceps'];
    const lowerMuscles = ['quads', 'hamstrings', 'glutes', 'calves'];
    
    let useUpper = true;
    
    for (let i = 0; i < exercisesPerCircuit; i++) {
        const targetMuscles = useUpper ? upperMuscles : lowerMuscles;
        const candidates = availableExercises.filter(e => 
            targetMuscles.includes(e.muscle) && !usedMuscles.has(e.muscle)
        );
        
        if (candidates.length > 0) {
            const selected = candidates[Math.floor(Math.random() * candidates.length)];
            circuitExercises.push({
                name: selected.name,
                muscle: selected.muscle,
                reps: useUpper ? '12-15' : '15-20',
                rest: 15
            });
            usedMuscles.add(selected.muscle);
        }
        
        useUpper = !useUpper;
    }
    
    return {
        type: 'circuit',
        name: `Circuit ${muscleGroups.join('/')}`,
        exercises: circuitExercises,
        rounds,
        restBetweenRounds: 60,
        estimatedDuration: duration,
        caloriesBurn: Math.round(duration * 12) // ~12 kcal/min pour circuit
    };
}

/**
 * Interface pour créer un superset/circuit
 */
function openTrainingModeModal() {
    let modal = document.getElementById('training-mode-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'training-mode-modal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal" style="max-width: 550px;">
                <div class="modal-header">
                    <div class="modal-title">⚡ Mode d'Entraînement</div>
                    <button class="modal-close" onclick="closeModal('training-mode-modal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="training-modes-grid">
                        ${Object.entries(trainingModes).map(([key, mode]) => `
                            <div class="training-mode-card ${key === 'normal' ? 'selected' : ''}" 
                                 onclick="selectTrainingMode('${key}')" data-mode="${key}">
                                <div class="training-mode-icon">${mode.icon}</div>
                                <div class="training-mode-name">${mode.name}</div>
                                <div class="training-mode-desc">${mode.description}</div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div id="training-mode-options" style="margin-top: 20px; display: none;">
                        <!-- Options dynamiques selon le mode -->
                    </div>
                    
                    <div id="training-mode-preview" style="margin-top: 20px; display: none;">
                        <!-- Aperçu du superset/circuit généré -->
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal('training-mode-modal')">Annuler</button>
                    <button class="btn btn-primary" id="apply-training-mode-btn" onclick="applyTrainingMode()" style="display: none;">
                        Appliquer
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    openModal('training-mode-modal');
}

let selectedTrainingMode = 'normal';
let currentTrainingSetup = null;

function selectTrainingMode(mode) {
    selectedTrainingMode = mode;
    
    // UI update
    document.querySelectorAll('.training-mode-card').forEach(card => {
        card.classList.toggle('selected', card.dataset.mode === mode);
    });
    
    const optionsContainer = document.getElementById('training-mode-options');
    const previewContainer = document.getElementById('training-mode-preview');
    const applyBtn = document.getElementById('apply-training-mode-btn');
    
    if (mode === 'normal') {
        optionsContainer.style.display = 'none';
        previewContainer.style.display = 'none';
        applyBtn.style.display = 'none';
        return;
    }
    
    applyBtn.style.display = 'block';
    
    if (mode === 'superset' || mode === 'triset') {
        optionsContainer.style.display = 'block';
        optionsContainer.innerHTML = `
            <div class="form-group">
                <label class="form-label">Exercice principal</label>
                <select class="form-select" id="superset-exercise-1" onchange="updateSupersetPreview()">
                    <option value="">Choisir un exercice...</option>
                    ${state.exercises.map(e => `<option value="${e.name}">${e.name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Nombre de rounds</label>
                <select class="form-select" id="superset-rounds">
                    <option value="3">3 rounds</option>
                    <option value="4">4 rounds</option>
                    <option value="5">5 rounds</option>
                </select>
            </div>
        `;
    } else if (mode === 'circuit') {
        optionsContainer.style.display = 'block';
        optionsContainer.innerHTML = `
            <div class="form-group">
                <label class="form-label">Durée cible</label>
                <select class="form-select" id="circuit-duration" onchange="updateCircuitPreview()">
                    <option value="15">15 min (Express)</option>
                    <option value="20" selected>20 min (Standard)</option>
                    <option value="30">30 min (Intense)</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Focus</label>
                <select class="form-select" id="circuit-focus" onchange="updateCircuitPreview()">
                    <option value="full-body">Full Body</option>
                    <option value="upper">Haut du corps</option>
                    <option value="lower">Bas du corps</option>
                </select>
            </div>
        `;
        setTimeout(updateCircuitPreview, 100);
    } else if (mode === 'dropset' || mode === 'restpause') {
        optionsContainer.style.display = 'block';
        optionsContainer.innerHTML = `
            <div class="form-group">
                <label class="form-label">Exercice</label>
                <select class="form-select" id="intensity-exercise">
                    <option value="">Choisir un exercice...</option>
                    ${state.exercises.filter(e => e.equipment === 'machine' || e.equipment === 'cable')
                        .map(e => `<option value="${e.name}">${e.name}</option>`).join('')}
                </select>
            </div>
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 10px;">
                ${mode === 'dropset' 
                    ? '💡 Idéal sur machines pour réduire rapidement le poids' 
                    : '💡 Faites une série à l\'échec, 10-15s de repos, puis continuez'}
            </p>
        `;
    }
}

function updateSupersetPreview() {
    const exercise1 = document.getElementById('superset-exercise-1')?.value;
    const previewContainer = document.getElementById('training-mode-preview');
    
    if (!exercise1) {
        previewContainer.style.display = 'none';
        return;
    }
    
    const superset = generateSuperset(exercise1);
    if (!superset) {
        previewContainer.innerHTML = '<p style="color: var(--warning);">Aucun exercice compatible trouvé</p>';
        previewContainer.style.display = 'block';
        return;
    }
    
    currentTrainingSetup = superset;
    
    previewContainer.style.display = 'block';
    previewContainer.innerHTML = `
        <div class="superset-preview">
            <div class="superset-preview-header">
                <span class="superset-type-badge">${superset.pairingType === 'antagonist' ? '↔️ Agoniste-Antagoniste' : '🔄 Même Muscle'}</span>
            </div>
            <div class="superset-exercises">
                ${superset.exercises.map((ex, idx) => `
                    <div class="superset-exercise">
                        <span class="superset-exercise-num">${idx + 1}</span>
                        <span class="superset-exercise-name">${ex.name}</span>
                        <span class="superset-exercise-muscle">${muscleGroups[ex.muscle]?.name || ex.muscle}</span>
                    </div>
                `).join('<div class="superset-arrow">→</div>')}
            </div>
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 10px;">
                ${superset.rounds} rounds • ${superset.restBetweenRounds}s repos entre rounds
            </p>
        </div>
    `;
}

function updateCircuitPreview() {
    const duration = parseInt(document.getElementById('circuit-duration')?.value) || 20;
    const focus = document.getElementById('circuit-focus')?.value || 'full-body';
    const previewContainer = document.getElementById('training-mode-preview');
    
    const focusMuscles = focus === 'upper' 
        ? ['chest', 'back', 'shoulders', 'biceps', 'triceps']
        : focus === 'lower' 
            ? ['quads', 'hamstrings', 'glutes', 'calves']
            : ['full-body'];
    
    const circuit = generateCircuit(focusMuscles, duration);
    currentTrainingSetup = circuit;
    
    previewContainer.style.display = 'block';
    previewContainer.innerHTML = `
        <div class="circuit-preview">
            <div class="circuit-preview-header">
                <span class="circuit-badge">🔄 ${circuit.rounds} rounds</span>
                <span class="circuit-duration">~${circuit.estimatedDuration} min</span>
                <span class="circuit-calories">🔥 ~${circuit.caloriesBurn} kcal</span>
            </div>
            <div class="circuit-exercises">
                ${circuit.exercises.map((ex, idx) => `
                    <div class="circuit-exercise">
                        <span class="circuit-exercise-num">${idx + 1}</span>
                        <span class="circuit-exercise-name">${ex.name}</span>
                        <span class="circuit-exercise-reps">${ex.reps}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function applyTrainingMode() {
    if (!currentTrainingSetup) {
        showToast('Configuration incomplète', 'error');
        return;
    }
    
    // Stocker la configuration pour la séance
    if (!state.trainingModes) state.trainingModes = {};
    state.trainingModes.current = currentTrainingSetup;
    saveState();
    
    closeModal('training-mode-modal');
    
    // Rafraîchir la vue de séance si on est dessus
    if (currentTrainingSetup.type === 'circuit') {
        showCircuitSession(currentTrainingSetup);
    } else {
        showToast(`${trainingModes[currentTrainingSetup.type].icon} ${trainingModes[currentTrainingSetup.type].name} configuré !`, 'success');
    }
}

/**
 * Affiche une séance en mode circuit
 */
function showCircuitSession(circuit) {
    const container = document.getElementById('session-exercises');
    
    container.innerHTML = `
        <div class="circuit-session">
            <div class="circuit-session-header">
                <h3>🔄 ${circuit.name}</h3>
                <div class="circuit-session-info">
                    <span>${circuit.rounds} rounds</span>
                    <span>~${circuit.estimatedDuration} min</span>
                    <span>🔥 ~${circuit.caloriesBurn} kcal</span>
                </div>
            </div>
            
            <div class="circuit-round-tracker">
                ${Array(circuit.rounds).fill(0).map((_, i) => `
                    <div class="circuit-round ${i === 0 ? 'active' : ''}" data-round="${i + 1}">
                        Round ${i + 1}
                    </div>
                `).join('')}
            </div>
            
            <div class="circuit-exercises-list">
                ${circuit.exercises.map((ex, idx) => `
                    <div class="circuit-exercise-card" data-exercise="${idx}">
                        <div class="circuit-exercise-header">
                            <span class="circuit-exercise-number">${idx + 1}</span>
                            <span class="circuit-exercise-name">${ex.name}</span>
                            <span class="circuit-exercise-reps">${ex.reps}</span>
                        </div>
                        <div class="circuit-exercise-actions">
                            <button class="btn btn-sm btn-secondary" onclick="markCircuitExerciseDone(${idx})">
                                ✓ Fait
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="circuit-controls">
                <button class="btn btn-secondary" onclick="resetCircuitSession()">Reset</button>
                <button class="btn btn-primary" id="circuit-next-round-btn" onclick="nextCircuitRound()">
                    Round suivant →
                </button>
            </div>
        </div>
    `;
    
    // Initialiser le suivi
    state.circuitProgress = {
        currentRound: 1,
        completedExercises: [],
        startTime: Date.now()
    };
}

let circuitExercisesDone = 0;

function markCircuitExerciseDone(exerciseIdx) {
    const card = document.querySelector(`.circuit-exercise-card[data-exercise="${exerciseIdx}"]`);
    if (card) {
        card.classList.add('done');
        circuitExercisesDone++;
        
        // Démarrer mini-timer entre exercices (15s)
        if (typeof startAutoTimer === 'function') {
            startAutoTimer('Circuit', '15');
        }
    }
}

function nextCircuitRound() {
    if (!state.circuitProgress) return;
    
    state.circuitProgress.currentRound++;
    
    // Mettre à jour l'UI
    document.querySelectorAll('.circuit-round').forEach((el, idx) => {
        el.classList.toggle('active', idx + 1 === state.circuitProgress.currentRound);
        el.classList.toggle('done', idx + 1 < state.circuitProgress.currentRound);
    });
    
    // Reset les exercices pour le nouveau round
    document.querySelectorAll('.circuit-exercise-card').forEach(card => {
        card.classList.remove('done');
    });
    
    circuitExercisesDone = 0;
    
    // Démarrer le timer entre rounds
    if (typeof startAutoTimer === 'function') {
        startAutoTimer('Circuit', '60');
    }
    
    showToast(`Round ${state.circuitProgress.currentRound} 🔥`, 'success');
}

function resetCircuitSession() {
    state.circuitProgress = null;
    circuitExercisesDone = 0;
    loadSessionDay();
}


// ==================== ANALYSE DE PROGRESSION GLOBALE ====================

/**
 * Analyse la progression globale de l'utilisateur
 */
function updateProgressionAnalysis() {
    const container = document.getElementById('stats-summary');
    if (!container) return;
    
    // Calculer les stats globales
    const totalSessions = state.sessionHistory?.length || 0;
    const totalExercises = Object.keys(state.progressLog).length;
    
    // Calculer la progression moyenne
    let totalProgressPercent = 0;
    let exercisesWithProgress = 0;
    
    Object.entries(state.progressLog).forEach(([name, logs]) => {
        if (logs.length >= 2) {
            const firstWeight = logs[0].weight;
            const lastWeight = logs[logs.length - 1].weight;
            if (firstWeight > 0) {
                totalProgressPercent += ((lastWeight - firstWeight) / firstWeight) * 100;
                exercisesWithProgress++;
            }
        }
    });
    
    const avgProgress = exercisesWithProgress > 0 
        ? Math.round(totalProgressPercent / exercisesWithProgress) 
        : 0;
    
    // Volume total (derniers 30 jours)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    let totalVolume = 0;
    Object.values(state.progressLog).forEach(logs => {
        logs.forEach(log => {
            if (new Date(log.date) >= thirtyDaysAgo) {
                totalVolume += (log.weight || 0) * (log.achievedReps || 0);
            }
        });
    });
    
    container.innerHTML = `
        <div class="grid grid-4">
            <div class="stat-card mini">
                <div class="stat-label">Séances totales</div>
                <div class="stat-value">${totalSessions}</div>
            </div>
            <div class="stat-card mini">
                <div class="stat-label">Exercices trackés</div>
                <div class="stat-value">${totalExercises}</div>
            </div>
            <div class="stat-card mini">
                <div class="stat-label">Progression moyenne</div>
                <div class="stat-value ${avgProgress >= 0 ? 'positive' : 'negative'}">
                    ${avgProgress >= 0 ? '+' : ''}${avgProgress}%
                </div>
            </div>
            <div class="stat-card mini">
                <div class="stat-label">Volume (30j)</div>
                <div class="stat-value">${Math.round(totalVolume / 1000)}k kg</div>
            </div>
        </div>
    `;
}


// ==================== INITIALISATION ====================

function initAITraining() {
    // Charger les préférences de mode d'entraînement
    if (state.trainingModes?.current) {
        // Restaurer le dernier mode utilisé
    }
    
    // Mettre à jour les recommandations au chargement
    setTimeout(() => {
        updateProgressionRecommendations();
        updateProgressionAnalysis();
    }, 500);
}

// Auto-init si le DOM est prêt
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAITraining);
} else {
    initAITraining();
}
