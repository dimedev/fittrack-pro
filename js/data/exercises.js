// ==================== BASE D'EXERCICES ====================

// Catégories de muscles
const muscleGroups = {
    'chest': { name: 'Pectoraux', icon: '🫁' },
    'back': { name: 'Dos', icon: '🔙' },
    'shoulders': { name: 'Épaules', icon: '🎯' },
    'rear-delts': { name: 'Épaules Arrière', icon: '🎯' },
    'triceps': { name: 'Triceps', icon: '💪' },
    'biceps': { name: 'Biceps', icon: '💪' },
    'quads': { name: 'Quadriceps', icon: '🦵' },
    'hamstrings': { name: 'Ischio-jambiers', icon: '🦵' },
    'glutes': { name: 'Fessiers', icon: '🍑' },
    'calves': { name: 'Mollets', icon: '🦶' },
    'traps': { name: 'Trapèzes', icon: '🔺' },
    'abs': { name: 'Abdominaux', icon: '🎽' },
    'forearms': { name: 'Avant-bras', icon: '✊' }
};

// Base d'exercices par défaut
const defaultExercises = [
    // ==================== PECTORAUX ====================
    { 
        id: 'bench-press', 
        name: 'Développé Couché Barre', 
        muscle: 'chest', 
        equipment: 'barbell',
        muscleTargets: ['Pectoraux', 'Triceps', 'Épaules ant.'],
        tips: 'Gardez les omoplates serrées. Descendez la barre au niveau des mamelons. Poussez en contractant les pectoraux.'
    },
    { 
        id: 'bench-press-db', 
        name: 'Développé Couché Haltères', 
        muscle: 'chest', 
        equipment: 'dumbbell',
        muscleTargets: ['Pectoraux', 'Triceps', 'Épaules ant.'],
        tips: 'Amplitude plus grande qu\'à la barre. Contrôlez la descente. Les haltères doivent se toucher en haut.'
    },
    { 
        id: 'incline-bench', 
        name: 'Développé Incliné Barre', 
        muscle: 'chest', 
        equipment: 'barbell',
        muscleTargets: ['Pectoraux sup.', 'Épaules ant.', 'Triceps'],
        tips: 'Inclinaison 30-45°. Ciblez le haut des pectoraux. Ne cambrez pas excessivement le dos.'
    },
    { id: 'incline-bench-db', name: 'Développé Incliné Haltères', muscle: 'chest', equipment: 'dumbbell' },
    { id: 'decline-bench', name: 'Développé Décliné', muscle: 'chest', equipment: 'barbell' },
    { id: 'chest-press-machine', name: 'Développé Machine Convergente', muscle: 'chest', equipment: 'machine' },
    { id: 'chest-press-incline-machine', name: 'Développé Incliné Machine', muscle: 'chest', equipment: 'machine' },
    { id: 'smith-bench', name: 'Développé Couché Smith', muscle: 'chest', equipment: 'smith' },
    { id: 'smith-incline', name: 'Développé Incliné Smith', muscle: 'chest', equipment: 'smith' },
    { id: 'dips-chest', name: 'Dips (Pectoraux)', muscle: 'chest', equipment: 'bodyweight' },
    { id: 'chest-fly-db', name: 'Écartés Haltères', muscle: 'chest', equipment: 'dumbbell' },
    { id: 'chest-fly-cable', name: 'Écartés Poulie Vis-à-Vis', muscle: 'chest', equipment: 'cable' },
    { id: 'cable-crossover', name: 'Cable Crossover', muscle: 'chest', equipment: 'cable' },
    { id: 'pec-deck', name: 'Pec Deck / Butterfly', muscle: 'chest', equipment: 'machine' },
    { id: 'pullover', name: 'Pull Over', muscle: 'chest', equipment: 'dumbbell' },
    { id: 'push-ups', name: 'Pompes', muscle: 'chest', equipment: 'bodyweight' },
    { id: 'push-ups-incline', name: 'Pompes Inclinées', muscle: 'chest', equipment: 'bodyweight' },
    { id: 'push-ups-decline', name: 'Pompes Déclinées', muscle: 'chest', equipment: 'bodyweight' },
    
    // ==================== DOS ====================
    { 
        id: 'deadlift', 
        name: 'Soulevé de Terre', 
        muscle: 'back', 
        equipment: 'barbell',
        muscleTargets: ['Dorsaux', 'Trapèzes', 'Lombaires', 'Fessiers'],
        tips: 'Dos droit, regard devant. Poussez avec les jambes. La barre doit rester près du corps.'
    },
    { 
        id: 'pull-ups', 
        name: 'Tractions', 
        muscle: 'back', 
        equipment: 'bodyweight',
        muscleTargets: ['Dorsaux', 'Biceps', 'Avant-bras'],
        tips: 'Amplitude complète. Tirez les coudes vers le bas et l\'arrière. Contrôlez la descente.'
    },
    { id: 'pull-ups-weighted', name: 'Tractions Lestées', muscle: 'back', equipment: 'bodyweight' },
    { id: 'chin-ups', name: 'Tractions Supination', muscle: 'back', equipment: 'bodyweight' },
    { 
        id: 'lat-pulldown', 
        name: 'Tirage Vertical Poulie Haute', 
        muscle: 'back', 
        equipment: 'cable',
        muscleTargets: ['Dorsaux', 'Biceps', 'Trapèzes'],
        tips: 'Tirez vers la poitrine, pas derrière la nuque. Ressortez la poitrine. Contrôlez la remontée.'
    },
    { id: 'lat-pulldown-close', name: 'Tirage Vertical Prise Serrée', muscle: 'back', equipment: 'cable' },
    { id: 'lat-pulldown-vbar', name: 'Tirage Vertical Prise Neutre', muscle: 'back', equipment: 'cable' },
    { id: 'bent-over-row', name: 'Rowing Barre', muscle: 'back', equipment: 'barbell' },
    { id: 'bent-over-row-db', name: 'Rowing Haltère (1 bras)', muscle: 'back', equipment: 'dumbbell' },
    { id: 'tbar-row', name: 'Rowing T-Bar', muscle: 'back', equipment: 'barbell' },
    { id: 'seated-cable-row', name: 'Tirage Horizontal Poulie Basse', muscle: 'back', equipment: 'cable' },
    { id: 'chest-supported-row', name: 'Rowing Buste Penché Machine', muscle: 'back', equipment: 'machine' },
    { id: 'machine-row', name: 'Rowing Machine', muscle: 'back', equipment: 'machine' },
    { id: 'meadows-row', name: 'Meadows Row', muscle: 'back', equipment: 'barbell' },
    { id: 'pullover-cable', name: 'Pull Over Poulie', muscle: 'back', equipment: 'cable' },
    { id: 'straight-arm-pulldown', name: 'Tirage Bras Tendus', muscle: 'back', equipment: 'cable' },
    { id: 'hyperextension', name: 'Hyperextension / Lombaires', muscle: 'back', equipment: 'bodyweight' },
    
    // ==================== ÉPAULES ====================
    { id: 'overhead-press', name: 'Développé Militaire Barre', muscle: 'shoulders', equipment: 'barbell' },
    { id: 'overhead-press-db', name: 'Développé Épaules Haltères', muscle: 'shoulders', equipment: 'dumbbell' },
    { id: 'arnold-press', name: 'Arnold Press', muscle: 'shoulders', equipment: 'dumbbell' },
    { id: 'shoulder-press-machine', name: 'Développé Épaules Machine', muscle: 'shoulders', equipment: 'machine' },
    { id: 'smith-shoulder-press', name: 'Développé Épaules Smith', muscle: 'shoulders', equipment: 'smith' },
    { id: 'push-press', name: 'Push Press', muscle: 'shoulders', equipment: 'barbell' },
    { id: 'lateral-raise', name: 'Élévations Latérales Haltères', muscle: 'shoulders', equipment: 'dumbbell' },
    { id: 'lateral-raise-cable', name: 'Élévations Latérales Poulie', muscle: 'shoulders', equipment: 'cable' },
    { id: 'lateral-raise-machine', name: 'Élévations Latérales Machine', muscle: 'shoulders', equipment: 'machine' },
    { id: 'front-raise', name: 'Élévations Frontales', muscle: 'shoulders', equipment: 'dumbbell' },
    { id: 'front-raise-cable', name: 'Élévations Frontales Poulie', muscle: 'shoulders', equipment: 'cable' },
    { id: 'front-raise-plate', name: 'Élévations Frontales Disque', muscle: 'shoulders', equipment: 'plate' },
    { id: 'upright-row', name: 'Rowing Menton', muscle: 'shoulders', equipment: 'barbell' },
    
    // ==================== ÉPAULES ARRIÈRE ====================
    { id: 'face-pull', name: 'Face Pull', muscle: 'rear-delts', equipment: 'cable' },
    { id: 'reverse-fly', name: 'Oiseau / Reverse Fly', muscle: 'rear-delts', equipment: 'dumbbell' },
    { id: 'reverse-fly-machine', name: 'Reverse Fly Machine', muscle: 'rear-delts', equipment: 'machine' },
    { id: 'reverse-fly-cable', name: 'Oiseau Poulie', muscle: 'rear-delts', equipment: 'cable' },
    { id: 'rear-delt-row', name: 'Rowing Épaules Arrière', muscle: 'rear-delts', equipment: 'dumbbell' },
    
    // ==================== TRICEPS ====================
    { id: 'dips-triceps', name: 'Dips (Triceps)', muscle: 'triceps', equipment: 'bodyweight' },
    { id: 'close-grip-bench', name: 'Développé Couché Prise Serrée', muscle: 'triceps', equipment: 'barbell' },
    { id: 'skull-crusher', name: 'Barre au Front / Skull Crusher', muscle: 'triceps', equipment: 'barbell' },
    { id: 'skull-crusher-db', name: 'Extension Nuque Haltère', muscle: 'triceps', equipment: 'dumbbell' },
    { id: 'tricep-pushdown', name: 'Extension Triceps Poulie Haute', muscle: 'triceps', equipment: 'cable' },
    { id: 'tricep-pushdown-rope', name: 'Extension Triceps Corde', muscle: 'triceps', equipment: 'cable' },
    { id: 'tricep-pushdown-vbar', name: 'Extension Triceps Barre V', muscle: 'triceps', equipment: 'cable' },
    { id: 'overhead-tricep', name: 'Extension Triceps Au-dessus Tête', muscle: 'triceps', equipment: 'cable' },
    { id: 'overhead-tricep-db', name: 'Extension Nuque Haltère 2 mains', muscle: 'triceps', equipment: 'dumbbell' },
    { id: 'kickback', name: 'Kickback Triceps', muscle: 'triceps', equipment: 'dumbbell' },
    { id: 'kickback-cable', name: 'Kickback Triceps Poulie', muscle: 'triceps', equipment: 'cable' },
    { id: 'tricep-machine', name: 'Extension Triceps Machine', muscle: 'triceps', equipment: 'machine' },
    { id: 'diamond-pushups', name: 'Pompes Diamant', muscle: 'triceps', equipment: 'bodyweight' },
    
    // ==================== BICEPS ====================
    { id: 'barbell-curl', name: 'Curl Barre Droite', muscle: 'biceps', equipment: 'barbell' },
    { id: 'ez-curl', name: 'Curl Barre EZ', muscle: 'biceps', equipment: 'barbell' },
    { id: 'dumbbell-curl', name: 'Curl Haltères', muscle: 'biceps', equipment: 'dumbbell' },
    { id: 'alternating-curl', name: 'Curl Alterné Haltères', muscle: 'biceps', equipment: 'dumbbell' },
    { id: 'hammer-curl', name: 'Curl Marteau', muscle: 'biceps', equipment: 'dumbbell' },
    { id: 'incline-curl', name: 'Curl Incliné', muscle: 'biceps', equipment: 'dumbbell' },
    { id: 'concentration-curl', name: 'Curl Concentré', muscle: 'biceps', equipment: 'dumbbell' },
    { id: 'preacher-curl', name: 'Curl Pupitre / Larry Scott', muscle: 'biceps', equipment: 'barbell' },
    { id: 'preacher-curl-db', name: 'Curl Pupitre Haltère', muscle: 'biceps', equipment: 'dumbbell' },
    { id: 'cable-curl', name: 'Curl Poulie Basse', muscle: 'biceps', equipment: 'cable' },
    { id: 'cable-curl-high', name: 'Curl Poulie Haute', muscle: 'biceps', equipment: 'cable' },
    { id: 'machine-curl', name: 'Curl Machine', muscle: 'biceps', equipment: 'machine' },
    { id: 'spider-curl', name: 'Spider Curl', muscle: 'biceps', equipment: 'dumbbell' },
    { id: 'drag-curl', name: 'Drag Curl', muscle: 'biceps', equipment: 'barbell' },
    
    // ==================== QUADRICEPS ====================
    { id: 'squat', name: 'Squat Barre', muscle: 'quads', equipment: 'barbell' },
    { id: 'front-squat', name: 'Front Squat', muscle: 'quads', equipment: 'barbell' },
    { id: 'goblet-squat', name: 'Goblet Squat', muscle: 'quads', equipment: 'dumbbell' },
    { id: 'smith-squat', name: 'Squat Smith', muscle: 'quads', equipment: 'smith' },
    { id: 'hack-squat', name: 'Hack Squat', muscle: 'quads', equipment: 'machine' },
    { id: 'leg-press', name: 'Presse à Cuisses', muscle: 'quads', equipment: 'machine' },
    { id: 'leg-press-feet-low', name: 'Presse Pieds Bas (Quads)', muscle: 'quads', equipment: 'machine' },
    { id: 'leg-extension', name: 'Leg Extension', muscle: 'quads', equipment: 'machine' },
    { id: 'lunge', name: 'Fentes', muscle: 'quads', equipment: 'dumbbell' },
    { id: 'walking-lunge', name: 'Fentes Marchées', muscle: 'quads', equipment: 'dumbbell' },
    { id: 'bulgarian-split-squat', name: 'Bulgarian Split Squat', muscle: 'quads', equipment: 'dumbbell' },
    { id: 'step-up', name: 'Step Up', muscle: 'quads', equipment: 'dumbbell' },
    { id: 'sissy-squat', name: 'Sissy Squat', muscle: 'quads', equipment: 'bodyweight' },
    { id: 'pendulum-squat', name: 'Pendulum Squat', muscle: 'quads', equipment: 'machine' },
    { id: 'v-squat', name: 'V-Squat Machine', muscle: 'quads', equipment: 'machine' },
    
    // ==================== ISCHIO-JAMBIERS ====================
    { id: 'rdl', name: 'Soulevé de Terre Roumain', muscle: 'hamstrings', equipment: 'barbell' },
    { id: 'rdl-db', name: 'Soulevé de Terre Roumain Haltères', muscle: 'hamstrings', equipment: 'dumbbell' },
    { id: 'stiff-leg-deadlift', name: 'Soulevé Jambes Tendues', muscle: 'hamstrings', equipment: 'barbell' },
    { id: 'good-morning', name: 'Good Morning', muscle: 'hamstrings', equipment: 'barbell' },
    { id: 'leg-curl-lying', name: 'Leg Curl Allongé', muscle: 'hamstrings', equipment: 'machine' },
    { id: 'leg-curl-seated', name: 'Leg Curl Assis', muscle: 'hamstrings', equipment: 'machine' },
    { id: 'leg-curl-standing', name: 'Leg Curl Debout', muscle: 'hamstrings', equipment: 'machine' },
    { id: 'nordic-curl', name: 'Nordic Curl', muscle: 'hamstrings', equipment: 'bodyweight' },
    { id: 'cable-pull-through', name: 'Pull Through Poulie', muscle: 'hamstrings', equipment: 'cable' },
    { id: 'leg-press-feet-high', name: 'Presse Pieds Hauts (Ischios)', muscle: 'hamstrings', equipment: 'machine' },
    
    // ==================== FESSIERS ====================
    { id: 'hip-thrust', name: 'Hip Thrust', muscle: 'glutes', equipment: 'barbell' },
    { id: 'hip-thrust-machine', name: 'Hip Thrust Machine', muscle: 'glutes', equipment: 'machine' },
    { id: 'glute-bridge', name: 'Glute Bridge', muscle: 'glutes', equipment: 'bodyweight' },
    { id: 'cable-kickback', name: 'Kickback Fessier Poulie', muscle: 'glutes', equipment: 'cable' },
    { id: 'glute-kickback-machine', name: 'Kickback Fessier Machine', muscle: 'glutes', equipment: 'machine' },
    { id: 'sumo-deadlift', name: 'Soulevé de Terre Sumo', muscle: 'glutes', equipment: 'barbell' },
    { id: 'sumo-squat', name: 'Squat Sumo', muscle: 'glutes', equipment: 'dumbbell' },
    { id: 'abductor-machine', name: 'Abducteurs Machine', muscle: 'glutes', equipment: 'machine' },
    { id: 'frog-pump', name: 'Frog Pump', muscle: 'glutes', equipment: 'bodyweight' },
    
    // ==================== MOLLETS ====================
    { id: 'standing-calf', name: 'Mollets Debout Machine', muscle: 'calves', equipment: 'machine' },
    { id: 'standing-calf-smith', name: 'Mollets Debout Smith', muscle: 'calves', equipment: 'smith' },
    { id: 'seated-calf', name: 'Mollets Assis', muscle: 'calves', equipment: 'machine' },
    { id: 'leg-press-calf', name: 'Mollets à la Presse', muscle: 'calves', equipment: 'machine' },
    { id: 'donkey-calf', name: 'Mollets Donkey', muscle: 'calves', equipment: 'machine' },
    { id: 'single-leg-calf', name: 'Mollets Unilatéral Haltère', muscle: 'calves', equipment: 'dumbbell' },
    
    // ==================== TRAPÈZES ====================
    { id: 'barbell-shrug', name: 'Shrugs Barre', muscle: 'traps', equipment: 'barbell' },
    { id: 'dumbbell-shrug', name: 'Shrugs Haltères', muscle: 'traps', equipment: 'dumbbell' },
    { id: 'smith-shrug', name: 'Shrugs Smith', muscle: 'traps', equipment: 'smith' },
    { id: 'trap-bar-shrug', name: 'Shrugs Trap Bar', muscle: 'traps', equipment: 'barbell' },
    { id: 'cable-shrug', name: 'Shrugs Poulie', muscle: 'traps', equipment: 'cable' },
    { id: 'farmers-walk', name: 'Farmer\'s Walk', muscle: 'traps', equipment: 'dumbbell' },
    
    // ==================== ABDOMINAUX ====================
    { id: 'crunch', name: 'Crunch', muscle: 'abs', equipment: 'bodyweight' },
    { id: 'crunch-machine', name: 'Crunch Machine', muscle: 'abs', equipment: 'machine' },
    { id: 'cable-crunch', name: 'Crunch Poulie Haute', muscle: 'abs', equipment: 'cable' },
    { id: 'leg-raise', name: 'Relevé de Jambes', muscle: 'abs', equipment: 'bodyweight' },
    { id: 'hanging-leg-raise', name: 'Relevé de Jambes Suspendu', muscle: 'abs', equipment: 'bodyweight' },
    { id: 'plank', name: 'Planche / Gainage', muscle: 'abs', equipment: 'bodyweight' },
    { id: 'side-plank', name: 'Planche Latérale', muscle: 'abs', equipment: 'bodyweight' },
    { id: 'russian-twist', name: 'Russian Twist', muscle: 'abs', equipment: 'bodyweight' },
    { id: 'ab-wheel', name: 'Ab Wheel / Roue Abdos', muscle: 'abs', equipment: 'other' },
    { id: 'dead-bug', name: 'Dead Bug', muscle: 'abs', equipment: 'bodyweight' },
    { id: 'mountain-climber', name: 'Mountain Climber', muscle: 'abs', equipment: 'bodyweight' },
    { id: 'decline-crunch', name: 'Crunch Décliné', muscle: 'abs', equipment: 'bodyweight' },
    
    // ==================== AVANT-BRAS ====================
    { id: 'wrist-curl', name: 'Curl Poignet', muscle: 'forearms', equipment: 'barbell' },
    { id: 'reverse-wrist-curl', name: 'Curl Poignet Inversé', muscle: 'forearms', equipment: 'barbell' },
    { id: 'reverse-curl', name: 'Curl Inversé', muscle: 'forearms', equipment: 'barbell' },
    { id: 'farmers-walk-forearms', name: 'Farmer\'s Walk (Grip)', muscle: 'forearms', equipment: 'dumbbell' }
];

// Types d'équipement
const equipmentTypes = {
    'barbell': 'Barre',
    'dumbbell': 'Haltères',
    'cable': 'Poulie',
    'machine': 'Machine',
    'smith': 'Smith Machine',
    'bodyweight': 'Poids du Corps',
    'plate': 'Disque',
    'other': 'Autre'
};

// ==================== GROUPES D'EXERCICES ÉQUIVALENTS ====================
// Pour la substitution d'exercices - exercices interchangeables par pattern de mouvement

const exerciseEquivalents = {
    // Pectoraux - Développés horizontaux
    'horizontal-press': ['bench-press', 'bench-press-db', 'chest-press-machine', 'smith-bench', 'push-ups'],
    
    // Pectoraux - Développés inclinés
    'incline-press': ['incline-bench', 'incline-bench-db', 'chest-press-incline-machine', 'smith-incline', 'push-ups-decline'],
    
    // Pectoraux - Écartés / Isolation
    'chest-fly': ['chest-fly-db', 'chest-fly-cable', 'cable-crossover', 'pec-deck'],
    
    // Dos - Tirages verticaux
    'vertical-pull': ['pull-ups', 'pull-ups-weighted', 'chin-ups', 'lat-pulldown', 'lat-pulldown-close', 'lat-pulldown-vbar'],
    
    // Dos - Tirages horizontaux
    'horizontal-row': ['bent-over-row', 'bent-over-row-db', 'tbar-row', 'seated-cable-row', 'chest-supported-row', 'machine-row', 'meadows-row'],
    
    // Épaules - Développés
    'shoulder-press': ['overhead-press', 'overhead-press-db', 'arnold-press', 'shoulder-press-machine', 'smith-shoulder-press', 'push-press'],
    
    // Épaules - Élévations latérales
    'lateral-raise': ['lateral-raise', 'lateral-raise-cable', 'lateral-raise-machine'],
    
    // Épaules arrière
    'rear-delt': ['face-pull', 'reverse-fly', 'reverse-fly-machine', 'reverse-fly-cable', 'rear-delt-row'],
    
    // Quadriceps - Squats
    'squat-pattern': ['squat', 'front-squat', 'goblet-squat', 'smith-squat', 'hack-squat', 'pendulum-squat', 'v-squat'],
    
    // Quadriceps - Presse
    'leg-press-pattern': ['leg-press', 'leg-press-feet-low'],
    
    // Quadriceps - Extension
    'leg-extension-pattern': ['leg-extension'],
    
    // Quadriceps - Fentes
    'lunge-pattern': ['lunge', 'walking-lunge', 'bulgarian-split-squat', 'step-up'],
    
    // Ischio-jambiers - Hip hinge
    'hip-hinge': ['rdl', 'rdl-db', 'stiff-leg-deadlift', 'good-morning', 'cable-pull-through'],
    
    // Ischio-jambiers - Leg curl
    'leg-curl': ['leg-curl-lying', 'leg-curl-seated', 'leg-curl-standing'],
    
    // Fessiers
    'glute-isolation': ['hip-thrust', 'hip-thrust-machine', 'glute-bridge', 'cable-kickback', 'glute-kickback-machine'],
    
    // Triceps - Extensions
    'tricep-extension': ['tricep-pushdown', 'tricep-pushdown-rope', 'tricep-pushdown-vbar', 'overhead-tricep', 'overhead-tricep-db', 'tricep-machine'],
    
    // Triceps - Composés
    'tricep-compound': ['dips-triceps', 'close-grip-bench', 'skull-crusher', 'skull-crusher-db'],
    
    // Biceps - Curls
    'bicep-curl': ['barbell-curl', 'ez-curl', 'dumbbell-curl', 'alternating-curl', 'cable-curl', 'machine-curl'],
    
    // Biceps - Curls spécialisés
    'bicep-curl-isolation': ['hammer-curl', 'incline-curl', 'concentration-curl', 'preacher-curl', 'preacher-curl-db', 'spider-curl'],
    
    // Mollets
    'calf-raise': ['standing-calf', 'standing-calf-smith', 'seated-calf', 'leg-press-calf', 'donkey-calf', 'single-leg-calf'],
    
    // Trapèzes
    'shrug-pattern': ['barbell-shrug', 'dumbbell-shrug', 'smith-shrug', 'trap-bar-shrug', 'cable-shrug']
};

// Configuration des temps de repos par objectif
const REST_TIMES = {
    'endurance':   { default: 45,  range: [30, 60] },
    'hypertrophy': { default: 90,  range: [60, 120] },
    'strength':    { default: 150, range: [120, 180] }
};

// Configuration des plages de répétitions par objectif
const REP_RANGES = {
    'endurance':   { min: 15, max: 20, label: '15-20' },
    'hypertrophy': { min: 8,  max: 12, label: '8-12' },
    'strength':    { min: 3,  max: 6,  label: '3-6' }
};

/**
 * Trouve le groupe d'équivalence d'un exercice
 * @param {string} exerciseId - ID de l'exercice
 * @returns {string|null} - Nom du groupe ou null
 */
function findExerciseGroup(exerciseId) {
    for (const [group, exercises] of Object.entries(exerciseEquivalents)) {
        if (exercises.includes(exerciseId)) {
            return group;
        }
    }
    return null;
}

/**
 * Retourne les exercices équivalents pour un exercice donné
 * Trie les favoris en premier
 * @param {string} exerciseId - ID de l'exercice à remplacer
 * @param {string[]} favoriteExercises - Liste des IDs des exercices favoris
 * @returns {Object[]} - Liste des exercices équivalents avec leurs détails
 */
function getEquivalentExercises(exerciseId, favoriteExercises = []) {
    const group = findExerciseGroup(exerciseId);
    
    if (group) {
        // Exercices du même groupe
        const equivalentIds = exerciseEquivalents[group].filter(id => id !== exerciseId);
        
        // Récupérer les détails et trier (favoris en premier)
        const equivalents = equivalentIds
            .map(id => {
                const exercise = defaultExercises.find(e => e.id === id);
                if (!exercise) return null;
                return {
                    ...exercise,
                    isFavorite: favoriteExercises.includes(id)
                };
            })
            .filter(e => e !== null)
            .sort((a, b) => {
                // Favoris d'abord
                if (a.isFavorite && !b.isFavorite) return -1;
                if (!a.isFavorite && b.isFavorite) return 1;
                return 0;
            });
        
        return equivalents;
    }
    
    // Fallback: exercices du même muscle
    const exercise = defaultExercises.find(e => e.id === exerciseId);
    if (!exercise) return [];
    
    return defaultExercises
        .filter(e => e.muscle === exercise.muscle && e.id !== exerciseId)
        .map(e => ({
            ...e,
            isFavorite: favoriteExercises.includes(e.id)
        }))
        .sort((a, b) => {
            if (a.isFavorite && !b.isFavorite) return -1;
            if (!a.isFavorite && b.isFavorite) return 1;
            return 0;
        })
        .slice(0, 5); // Limiter à 5 suggestions
}
