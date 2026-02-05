// ==================== BASE D'EXERCICES PREMIUM ====================

// URL de base pour les images des exercices dans Supabase Storage
const EXERCISE_IMAGE_BASE_URL = 'https://erszjvaajztewcukvwbj.supabase.co/storage/v1/object/public/exercise-images/';

// Mapping exerciseId → nom du fichier image (images disponibles dans le bucket)
const exerciseImageMap = {
    // Pectoraux
    'bench-press': 'barbell-bench-press.webp',
    'bench-press-db': 'bench-press-db.webp',
    'incline-bench': 'incline-bench.webp',
    'incline-bench-db': 'incline-bench-db.webp',
    'decline-bench': 'decline-bench.webp',
    'chest-press-machine': 'converging-chest-press.webp',
    'smith-bench': 'smith-bench.webp',
    'smith-incline': 'smith-incline.webp',
    'push-ups': 'push-ups.webp',
    'push-ups-incline': 'push-ups-incline.webp',
    'push-ups-decline': 'push-ups-decline.webp',
    'diamond-push-ups': 'diamond-pushups.webp',
    'dips-chest': null, // Pas d'image disponible
    'chest-fly-machine': 'pec-deck.webp',
    'chest-fly-cable': 'cable-chest-fly.webp',
    'chest-fly-db': 'chest-fly-db.webp',
    'cable-crossover': 'cable-crossover.webp',
    'pullover': 'pullover.webp',
    'pullover-cable': 'pullover-cable.webp',

    // Dos
    'pull-ups': 'pull-ups.webp',
    'chin-ups': 'chin-ups.webp',
    'lat-pulldown': 'lat-pulldown.webp',
    'lat-pulldown-close': 'lat-pulldown-close.webp',
    'lat-pulldown-vbar': 'lat-pulldown-vbar.webp',
    'straight-arm-pulldown': 'straight-arm-pulldown.webp',
    'bent-over-row': 'bent-over-row.webp',
    'bent-over-row-db': 'bent-over-row-db.webp',
    'tbar-row': 'tbar-row.webp',
    'cable-row': 'seated-row-machine.webp',
    'seated-row-machine': 'seated-row-machine.webp',
    'chest-supported-row': 'chest-supported-row.webp',
    'meadows-row': 'meadows-row.webp',

    // Épaules
    'seated-shoulder-press': 'seated-shoulder-press.webp',
    'shoulder-press-db': 'seated-shoulder-press.webp',
    'lateral-raise': 'dumbbell-lateral-raises.webp',
    'lateral-raise-db': 'dumbbell-lateral-raises.webp',
    'rear-delt-fly': 'rear-delt-row.webp',
    'rear-delt-row': 'rear-delt-row.webp',

    // Biceps
    'bicep-curl-db': 'dumbbell-bicep-curl.webp',
    'bicep-curl-barbell': 'dumbbell-bicep-curl.webp',
    'hammer-curl': 'dumbbell-bicep-curl.webp',

    // Triceps
    'triceps-pushdown': 'cable-triceps-pushdown.webp',
    'cable-triceps-pushdown': 'cable-triceps-pushdown.webp',
    'close-grip-bench': 'close-grip-bench.webp',

    // Jambes
    'squat': 'barbell-squat.webp',
    'barbell-squat': 'barbell-squat.webp',
    'leg-press': 'leg-press-machine.webp',
    'leg-press-machine': 'leg-press-machine.webp',
    'hip-thrust': 'hip-thrust.webp',
    'leg-raise': 'leg-raise.webp',
    'hanging-leg-raise': 'hanging-leg-raise.webp',

    // Abdominaux
    'crunch': 'crunch.webp',
    'decline-crunch': 'decline-crunch.webp',
    'cable-crunch': 'cable-crunch.webp',
    'ab-crunch-machine': 'ab-crunch-machine.webp',
    'ab-wheel': 'ab-wheel.webp',
    'plank': 'plank-exercise.webp',
    'side-plank': 'side-plank.webp',
    'mountain-climber': 'mountain-climber.webp',
    'russian-twist': 'russian-twist.webp',
    'dead-bug': 'dead-bug.webp'
};

/**
 * Récupère l'URL de l'image pour un exercice
 * @param {string} exerciseId - ID de l'exercice
 * @returns {string|null} URL de l'image ou null si non disponible
 */
function getExerciseImageUrl(exerciseId) {
    const imageName = exerciseImageMap[exerciseId];
    if (!imageName) return null;
    return EXERCISE_IMAGE_BASE_URL + imageName;
}

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

// ==================== GÉNÉRATION AUTOMATIQUE DES TAGS ====================

/**
 * Génère automatiquement les tags pour un exercice basé sur son équipement et niveau
 * @param {string} equipment - Type d'équipement
 * @param {string} level - Niveau de difficulté
 * @returns {Array<string>} Tags générés
 */
function generateExerciseTags(equipment, level) {
    const tags = [];
    
    // Tags d'environnement basés sur l'équipement
    const equipmentTags = {
        'bodyweight': ['home', 'bodyweight-only', 'outdoor', 'minimal-equipment'],
        'dumbbell': ['home', 'home-gym', 'dumbbells-only'],
        'barbell': ['home-gym', 'gym'],
        'cable': ['gym'],
        'machine': ['gym'],
        'smith': ['gym'],
        'plate': ['home-gym', 'gym', 'minimal-equipment'],
        'other': ['home', 'gym']
    };
    
    // Ajouter les tags d'environnement
    if (equipmentTags[equipment]) {
        tags.push(...equipmentTags[equipment]);
    }
    
    // Ajouter le tag de niveau
    if (level) {
        tags.push(level);
    }
    
    // Retourner les tags uniques
    return [...new Set(tags)];
}

/**
 * Enrichit les exercices avec les tags automatiques
 * @param {Array} exercises - Liste des exercices
 * @returns {Array} Exercices avec tags
 */
function enrichExercisesWithTags(exercises) {
    return exercises.map(ex => ({
        ...ex,
        tags: ex.tags || generateExerciseTags(ex.equipment, ex.level)
    }));
}

// Base d'exercices par défaut - STRUCTURE ENRICHIE COACH
const defaultExercises = [
    // ==================== PECTORAUX ====================
    { 
        id: 'bench-press', 
        name: 'Développé Couché Barre', 
        muscle: 'chest', 
        equipment: 'barbell',
        level: 'beginner',
        type: 'compound',
        primaryMuscles: ['Grand pectoral'],
        secondaryMuscles: ['Triceps', 'Deltoïde antérieur'],
        muscleTargets: ['Pectoraux', 'Triceps', 'Épaules ant.'],
        execution: 'Allongé sur banc, pieds au sol. Décroche la barre, descends contrôlé jusqu\'à la poitrine, puis pousse explosif.',
        cues: ['Omoplates serrées dans le banc', 'Pieds ancrés au sol', 'Barre au niveau des mamelons', 'Poignets droits'],
        commonMistakes: ['Rebond sur la poitrine', 'Coudes trop écartés', 'Fesses qui décollent', 'Poignets cassés'],
        alternatives: ['bench-press-db', 'chest-press-machine', 'push-ups'],
        contraindications: ['shoulder'],
        tips: 'Gardez les omoplates serrées. Descendez la barre au niveau des mamelons. Poussez en contractant les pectoraux.',
        image: null
    },
    { 
        id: 'bench-press-db', 
        name: 'Développé Couché Haltères', 
        muscle: 'chest', 
        equipment: 'dumbbell',
        level: 'beginner',
        type: 'compound',
        primaryMuscles: ['Grand pectoral'],
        secondaryMuscles: ['Triceps', 'Deltoïde antérieur'],
        muscleTargets: ['Pectoraux', 'Triceps', 'Épaules ant.'],
        execution: 'Allongé sur banc, haltères au-dessus. Descends en ouvrant les coudes, remonte en rapprochant.',
        cues: ['Amplitude plus grande qu\'à la barre', 'Rotation naturelle des poignets', 'Haltères se touchent en haut', 'Contrôle 2-3 sec'],
        commonMistakes: ['Descente trop basse', 'Haltères vers l\'extérieur', 'Rebond en bas'],
        alternatives: ['bench-press', 'chest-press-machine', 'push-ups'],
        contraindications: [],
        tips: 'Amplitude plus grande qu\'à la barre. Contrôlez la descente. Les haltères doivent se toucher en haut.',
        image: null
    },
    { 
        id: 'incline-bench', 
        name: 'Développé Incliné Barre', 
        muscle: 'chest', 
        equipment: 'barbell',
        level: 'beginner',
        type: 'compound',
        primaryMuscles: ['Pectoral faisceau claviculaire'],
        secondaryMuscles: ['Deltoïde antérieur', 'Triceps'],
        muscleTargets: ['Pectoraux sup.', 'Épaules ant.', 'Triceps'],
        execution: 'Banc incliné à 30-45°. Décroche la barre, descends vers le haut de la poitrine, pousse.',
        cues: ['Inclinaison 30-45° max', 'Barre vers le haut de la poitrine', 'Omoplates plaquées', 'Dos pas trop cambré'],
        commonMistakes: ['Inclinaison trop haute', 'Barre trop basse', 'Dos trop cambré'],
        alternatives: ['incline-bench-db', 'chest-press-incline-machine', 'smith-incline'],
        contraindications: ['shoulder'],
        tips: 'Inclinaison 30-45°. Ciblez le haut des pectoraux. Ne cambrez pas excessivement le dos.',
        image: null
    },
    { 
        id: 'incline-bench-db', 
        name: 'Développé Incliné Haltères', 
        muscle: 'chest', 
        equipment: 'dumbbell',
        level: 'beginner',
        type: 'compound',
        primaryMuscles: ['Pectoral faisceau claviculaire'],
        secondaryMuscles: ['Deltoïde antérieur', 'Triceps'],
        muscleTargets: ['Pectoraux sup.', 'Épaules ant.', 'Triceps'],
        execution: 'Banc incliné à 30-45°, haltères au-dessus. Descends en ouvrant les coudes avec amplitude complète, remonte en rapprochant les haltères.',
        cues: ['Inclinaison 30-45° idéale', 'Haltères se touchent en haut', 'Amplitude plus grande qu\'à la barre', 'Rotation naturelle des poignets'],
        commonMistakes: ['Inclinaison trop haute (sollicite trop les épaules)', 'Amplitude trop courte', 'Dos trop cambré', 'Descente trop rapide'],
        alternatives: ['incline-bench', 'chest-press-incline-machine', 'smith-incline'],
        contraindications: ['shoulder'],
        tips: 'Inclinaison 30-45°. Amplitude complète avec rotation naturelle des poignets.',
        image: null
    },
    { id: 'decline-bench', name: 'Développé Décliné', muscle: 'chest', equipment: 'barbell', muscleTargets: ['Pectoraux inf.', 'Triceps'], tips: 'Cible le bas des pectoraux. Gardez les pieds bien ancrés. Contrôlez la charge.' },
    { id: 'chest-press-machine', name: 'Développé Machine Convergente', muscle: 'chest', equipment: 'machine', muscleTargets: ['Pectoraux', 'Triceps'], tips: 'Trajectoire convergente naturelle. Ajustez la hauteur du siège pour un bon alignement.' },
    { id: 'chest-press-incline-machine', name: 'Développé Incliné Machine', muscle: 'chest', equipment: 'machine', muscleTargets: ['Pectoraux sup.', 'Épaules'], tips: 'Idéal pour isoler le haut des pectoraux en sécurité. Poussez de manière explosive.' },
    { id: 'smith-bench', name: 'Développé Couché Smith', muscle: 'chest', equipment: 'smith', muscleTargets: ['Pectoraux', 'Triceps'], tips: 'Trajectoire guidée. Permet de charger plus lourd en sécurité. Descendez contrôlé.' },
    { id: 'smith-incline', name: 'Développé Incliné Smith', muscle: 'chest', equipment: 'smith', muscleTargets: ['Pectoraux sup.', 'Épaules'], tips: 'Cible le haut des pectoraux. Stabilité accrue grâce au rail guidé.' },
    { 
        id: 'dips-chest', 
        name: 'Dips (Pectoraux)', 
        muscle: 'chest', 
        equipment: 'bodyweight',
        level: 'intermediate',
        type: 'compound',
        primaryMuscles: ['Pectoral faisceau inférieur'],
        secondaryMuscles: ['Triceps', 'Deltoïde antérieur'],
        muscleTargets: ['Pectoraux inf.', 'Triceps', 'Épaules'],
        execution: 'Suspendu aux barres parallèles. Penche le buste en avant (~30°), descends en ouvrant les coudes jusqu\'à 90°, remonte explosif.',
        cues: ['Penche le buste en avant', 'Coudes légèrement écartés (45°)', 'Descends jusqu\'à 90° minimum', 'Pousse explosif en remontant'],
        commonMistakes: ['Rester trop vertical (sollicite les triceps)', 'Descente incomplète', 'Balancement du corps', 'Épaules qui montent (risque blessure)'],
        alternatives: ['decline-bench', 'chest-fly-cable', 'push-ups'],
        contraindications: ['shoulder'],
        tips: 'Penchez-vous en avant. Coudes légèrement écartés. Descendez jusqu\'à 90°.',
        image: null
    },
    { id: 'chest-fly-db', name: 'Écartés Haltères', muscle: 'chest', equipment: 'dumbbell', muscleTargets: ['Pectoraux'], tips: 'Mouvement d\'étirement. Gardez les coudes légèrement fléchis. Contractez en haut.' },
    { id: 'chest-fly-cable', name: 'Écartés Poulie Vis-à-Vis', muscle: 'chest', equipment: 'cable', muscleTargets: ['Pectoraux'], tips: 'Tension constante grâce aux poulies. Croisez les mains en haut pour une contraction maximale.' },
    { id: 'cable-crossover', name: 'Cable Crossover', muscle: 'chest', equipment: 'cable', muscleTargets: ['Pectoraux'], tips: 'Variez la hauteur des poulies pour cibler différentes portions des pectoraux.' },
    { id: 'pec-deck', name: 'Pec Deck / Butterfly', muscle: 'chest', equipment: 'machine', muscleTargets: ['Pectoraux'], tips: 'Isolation pure des pectoraux. Contractez 1-2 secondes en position fermée.' },
    { id: 'pullover', name: 'Pull Over', muscle: 'chest', equipment: 'dumbbell', muscleTargets: ['Pectoraux', 'Dorsaux', 'Serratus'], tips: 'Amplitude maximale. Gardez les bras légèrement fléchis. Respirez profondément.' },
    { 
        id: 'push-ups', 
        name: 'Pompes', 
        muscle: 'chest', 
        equipment: 'bodyweight',
        level: 'beginner',
        type: 'compound',
        primaryMuscles: ['Grand pectoral'],
        secondaryMuscles: ['Triceps', 'Deltoïde antérieur', 'Core'],
        muscleTargets: ['Pectoraux', 'Triceps', 'Épaules'],
        execution: 'Position planche, mains largeur épaules. Descends poitrine au sol en gardant le corps aligné, remonte en poussant.',
        cues: ['Corps aligné tête-pieds (planche)', 'Mains largeur épaules', 'Coudes à 45° du corps', 'Gainage abdominal constant', 'Poitrine touche le sol'],
        commonMistakes: ['Fesses en l\'air ou bassin qui tombe', 'Amplitude incomplète', 'Tête qui descend en premier', 'Coudes trop écartés (stress épaules)', 'Respiration bloquée'],
        alternatives: ['push-ups-decline', 'bench-press-db', 'chest-press-machine'],
        contraindications: ['shoulder'],
        tips: 'Corps aligné en planche. Descendez poitrine au sol. Gainage abdominal constant.',
        image: null
    },
    { id: 'push-ups-incline', name: 'Pompes Inclinées', muscle: 'chest', equipment: 'bodyweight', muscleTargets: ['Pectoraux inf.', 'Triceps'], tips: 'Pieds surélevés. Plus difficile que les pompes classiques. Contrôlez la descente.' },
    { id: 'push-ups-decline', name: 'Pompes Déclinées', muscle: 'chest', equipment: 'bodyweight', muscleTargets: ['Pectoraux sup.', 'Épaules'], tips: 'Mains surélevées. Version plus facile, idéale pour débuter ou finir une série.' },
    
    // ==================== DOS ====================
    { 
        id: 'deadlift', 
        name: 'Soulevé de Terre', 
        muscle: 'back', 
        equipment: 'barbell',
        level: 'intermediate',
        type: 'compound',
        primaryMuscles: ['Érecteurs du rachis', 'Grand dorsal'],
        secondaryMuscles: ['Trapèzes', 'Fessiers', 'Ischio-jambiers', 'Quadriceps'],
        muscleTargets: ['Dorsaux', 'Trapèzes', 'Lombaires', 'Fessiers'],
        execution: 'Barre au sol, pieds largeur hanches. Attrape la barre, dos droit, pousse le sol avec les jambes puis verrouille les hanches.',
        cues: ['Dos DROIT, jamais arrondi', 'Barre contre les tibias', 'Pousse le sol avec les pieds', 'Verrouille hanches et épaules ensemble'],
        commonMistakes: ['Dos arrondi (risque blessure)', 'Barre éloignée du corps', 'Lever hanches avant épaules', 'Hyperextension en haut'],
        alternatives: ['rdl', 'sumo-deadlift', 'hex-bar-deadlift'],
        contraindications: ['back'],
        tips: 'Dos droit, regard devant. Poussez avec les jambes. La barre doit rester près du corps.',
        image: null
    },
    { 
        id: 'pull-ups', 
        name: 'Tractions', 
        muscle: 'back', 
        equipment: 'bodyweight',
        level: 'intermediate',
        type: 'compound',
        primaryMuscles: ['Grand dorsal'],
        secondaryMuscles: ['Biceps', 'Trapèzes', 'Rhomboïdes'],
        muscleTargets: ['Dorsaux', 'Biceps', 'Avant-bras'],
        execution: 'Suspendu à la barre, prise pronation. Tire les coudes vers le bas pour monter le menton au-dessus de la barre.',
        cues: ['Initie avec les dorsaux', 'Tire les coudes vers les hanches', 'Menton au-dessus de la barre', 'Contrôle la descente 2-3 sec'],
        commonMistakes: ['Utiliser l\'élan (kipping)', 'Amplitude incomplète', 'Tirer uniquement avec les bras', 'Descente non contrôlée'],
        alternatives: ['lat-pulldown', 'chin-ups', 'assisted-pull-ups'],
        contraindications: ['shoulder'],
        tips: 'Amplitude complète. Tirez les coudes vers le bas et l\'arrière. Contrôlez la descente.',
        image: null
    },
    { id: 'pull-ups-weighted', name: 'Tractions Lestées', muscle: 'back', equipment: 'bodyweight', level: 'advanced', type: 'compound', muscleTargets: ['Dorsaux', 'Biceps'], tips: 'Ajoutez du poids progressivement. Amplitude complète obligatoire. Force maximale.', alternatives: ['pull-ups', 'lat-pulldown'], contraindications: ['shoulder'] },
    { id: 'chin-ups', name: 'Tractions Supination', muscle: 'back', equipment: 'bodyweight', level: 'intermediate', type: 'compound', muscleTargets: ['Dorsaux', 'Biceps'], tips: 'Prise en supination (paumes vers soi). Met l\'accent sur les biceps.', alternatives: ['pull-ups', 'lat-pulldown'], contraindications: ['shoulder'] },
    { 
        id: 'lat-pulldown', 
        name: 'Tirage Vertical Poulie Haute', 
        muscle: 'back', 
        equipment: 'cable',
        level: 'beginner',
        type: 'compound',
        primaryMuscles: ['Grand dorsal'],
        secondaryMuscles: ['Biceps', 'Trapèzes', 'Rhomboïdes'],
        muscleTargets: ['Dorsaux', 'Biceps', 'Trapèzes'],
        execution: 'Assis, cuisses calées. Attrape la barre large, tire vers le haut de la poitrine en ressortant celle-ci.',
        cues: ['Tire vers la poitrine, PAS derrière la nuque', 'Ressors la poitrine', 'Coudes vers le bas et l\'arrière', 'Contrôle la remontée'],
        commonMistakes: ['Tirer derrière la nuque', 'Se pencher trop en arrière', 'Utiliser l\'élan', 'Prise trop serrée'],
        alternatives: ['pull-ups', 'lat-pulldown-close', 'lat-pulldown-vbar'],
        contraindications: [],
        tips: 'Tirez vers la poitrine, pas derrière la nuque. Ressortez la poitrine. Contrôlez la remontée.',
        image: null
    },
    { id: 'lat-pulldown-close', name: 'Tirage Vertical Prise Serrée', muscle: 'back', equipment: 'cable', muscleTargets: ['Dorsaux', 'Biceps'], tips: 'Prise serrée accentue l\'épaisseur du dos. Tirez vers le sternum.' },
    { id: 'lat-pulldown-vbar', name: 'Tirage Vertical Prise Neutre', muscle: 'back', equipment: 'cable', muscleTargets: ['Dorsaux', 'Biceps'], tips: 'Prise neutre confortable pour les poignets. Amplitude complète.' },
    { 
        id: 'bent-over-row', 
        name: 'Rowing Barre', 
        muscle: 'back', 
        equipment: 'barbell',
        level: 'intermediate',
        type: 'compound',
        primaryMuscles: ['Grand dorsal', 'Trapèzes'],
        secondaryMuscles: ['Biceps', 'Rhomboïdes', 'Érecteurs'],
        muscleTargets: ['Dorsaux', 'Trapèzes', 'Biceps'],
        execution: 'Debout, buste penché à 45°, genoux fléchis. Tire la barre vers le bas du ventre en serrant les omoplates.',
        cues: ['Buste à 45° (pas plus bas)', 'Dos droit, gainage constant', 'Tire vers le nombril', 'Serre les omoplates en haut'],
        commonMistakes: ['Dos arrondi', 'Trop de mouvement du buste', 'Tirer trop haut (vers poitrine)', 'Utiliser l\'élan'],
        alternatives: ['bent-over-row-db', 'tbar-row', 'seated-cable-row', 'chest-supported-row'],
        contraindications: ['back'],
        tips: 'Buste à 45°. Tirez la barre vers le bas du ventre. Serrez les omoplates.',
        image: null
    },
    { 
        id: 'bent-over-row-db', 
        name: 'Rowing Haltère (1 bras)', 
        muscle: 'back', 
        equipment: 'dumbbell',
        level: 'beginner',
        type: 'compound',
        primaryMuscles: ['Grand dorsal'],
        secondaryMuscles: ['Trapèzes', 'Biceps', 'Rhomboïdes'],
        muscleTargets: ['Dorsaux', 'Trapèzes'],
        execution: 'Appui sur banc (genou + main). L\'autre main tire l\'haltère vers la hanche en gardant le dos droit.',
        cues: ['Dos parallèle au sol', 'Tire le coude vers l\'arrière', 'Évite la rotation du tronc', 'Contracte en haut 1 sec'],
        commonMistakes: ['Rotation excessive du tronc', 'Tirer vers la poitrine', 'Dos arrondi ou trop cambré'],
        alternatives: ['bent-over-row', 'seated-cable-row', 'machine-row'],
        contraindications: [],
        tips: 'Prenez appui sur un banc. Tirez le coude vers l\'arrière, pas vers le haut.',
        image: null
    },
    { id: 'tbar-row', name: 'Rowing T-Bar', muscle: 'back', equipment: 'barbell', muscleTargets: ['Dorsaux', 'Trapèzes'], tips: 'Position stable. Tirez explosif, descente contrôlée. Cible l\'épaisseur du dos.' },
    { 
        id: 'seated-cable-row', 
        name: 'Tirage Horizontal Poulie Basse', 
        muscle: 'back', 
        equipment: 'cable',
        level: 'beginner',
        type: 'compound',
        primaryMuscles: ['Grand dorsal', 'Trapèzes moyens'],
        secondaryMuscles: ['Biceps', 'Rhomboïdes', 'Deltoïde postérieur'],
        muscleTargets: ['Dorsaux', 'Trapèzes', 'Biceps'],
        execution: 'Assis, pieds sur les cale-pieds. Tire la poignée vers le bas du ventre en gardant le dos droit et en serrant les omoplates.',
        cues: ['Dos droit, ne te penche pas en arrière', 'Tire vers le bas du ventre', 'Serre les omoplates en fin de mouvement', 'Contrôle la phase excentrique 2-3 sec'],
        commonMistakes: ['Se pencher trop en arrière (utilise l\'élan)', 'Arrondir le dos', 'Tirer avec les bras uniquement', 'Ne pas contracter les omoplates'],
        alternatives: ['bent-over-row', 'bent-over-row-db', 'machine-row'],
        contraindications: [],
        tips: 'Gardez le dos droit. Tirez vers le bas du ventre. Contractez les omoplates.',
        image: null
    },
    { id: 'chest-supported-row', name: 'Rowing Buste Penché Machine', muscle: 'back', equipment: 'machine', muscleTargets: ['Dorsaux', 'Trapèzes'], tips: 'Supprime le stress lombaire. Focus total sur les dorsaux. Amplitude complète.' },
    { id: 'machine-row', name: 'Rowing Machine', muscle: 'back', equipment: 'machine', muscleTargets: ['Dorsaux', 'Trapèzes'], tips: 'Trajectoire guidée. Tirez en serrant les omoplates. Contrôlez la phase excentrique.' },
    { id: 'meadows-row', name: 'Meadows Row', muscle: 'back', equipment: 'barbell', muscleTargets: ['Dorsaux', 'Trapèzes'], tips: 'Positionnement latéral. Rotation du torse. Excellent pour l\'épaisseur du dos.' },
    { id: 'pullover-cable', name: 'Pull Over Poulie', muscle: 'back', equipment: 'cable', muscleTargets: ['Dorsaux', 'Serratus'], tips: 'Bras tendus. Tirez vers le bas en gardant les bras fixes. Ressent dans les dorsaux.' },
    { id: 'straight-arm-pulldown', name: 'Tirage Bras Tendus', muscle: 'back', equipment: 'cable', muscleTargets: ['Dorsaux', 'Serratus'], tips: 'Bras tendus, légère flexion des coudes. Mouvement d\'arc de cercle. Isolation dorsaux.' },
    { id: 'hyperextension', name: 'Hyperextension / Lombaires', muscle: 'back', equipment: 'bodyweight', muscleTargets: ['Lombaires', 'Fessiers', 'Ischios'], tips: 'Descendez contrôlé. Remontez jusqu\'à l\'alignement. Ne vous hyperextendez pas.' },
    
    // ==================== ÉPAULES ====================
    { 
        id: 'overhead-press', 
        name: 'Développé Militaire Barre', 
        muscle: 'shoulders', 
        equipment: 'barbell',
        level: 'intermediate',
        type: 'compound',
        primaryMuscles: ['Deltoïde antérieur', 'Deltoïde latéral'],
        secondaryMuscles: ['Triceps', 'Trapèzes supérieurs'],
        muscleTargets: ['Épaules ant.', 'Triceps'],
        execution: 'Debout ou assis, barre au niveau des clavicules. Pousse verticalement au-dessus de la tête, bras tendus.',
        cues: ['Serre les abdos et les fessiers', 'Pousse la tête "à travers" les bras', 'Barre au-dessus du milieu du pied', 'Ne cambre pas le dos'],
        commonMistakes: ['Dos trop cambré (risque lombaire)', 'Barre devant le visage', 'Coudes qui partent vers l\'avant'],
        alternatives: ['overhead-press-db', 'shoulder-press-machine', 'arnold-press'],
        contraindications: ['shoulder', 'back'],
        tips: 'Debout ou assis. Poussez vertical. Serrez les abdos. Ne cambrez pas le dos.',
        image: null
    },
    { 
        id: 'overhead-press-db', 
        name: 'Développé Épaules Haltères', 
        muscle: 'shoulders', 
        equipment: 'dumbbell',
        level: 'beginner',
        type: 'compound',
        primaryMuscles: ['Deltoïde antérieur', 'Deltoïde latéral'],
        secondaryMuscles: ['Triceps', 'Trapèzes supérieurs'],
        muscleTargets: ['Épaules ant.', 'Triceps'],
        execution: 'Assis ou debout, haltères à hauteur d\'épaules. Pousse vers le haut, les haltères se rapprochent en haut.',
        cues: ['Coudes à 45° du corps', 'Haltères se touchent presque en haut', 'Stabilisation du core constante', 'Descends jusqu\'aux épaules'],
        commonMistakes: ['Coudes trop en arrière', 'Dos qui se cambre', 'Amplitude incomplète'],
        alternatives: ['overhead-press', 'arnold-press', 'shoulder-press-machine'],
        contraindications: [],
        tips: 'Amplitude naturelle. Les haltères se touchent en haut. Stabilisation accrue.',
        image: null
    },
    { id: 'arnold-press', name: 'Arnold Press', muscle: 'shoulders', equipment: 'dumbbell', muscleTargets: ['Épaules ant.', 'Épaules lat.', 'Triceps'], tips: 'Rotation des poignets pendant le mouvement. Sollicite toutes les portions de l\'épaule.' },
    { id: 'shoulder-press-machine', name: 'Développé Épaules Machine', muscle: 'shoulders', equipment: 'machine', muscleTargets: ['Épaules ant.', 'Triceps'], tips: 'Trajectoire guidée sécurisée. Idéal pour charger lourd en fin de séance.' },
    { id: 'smith-shoulder-press', name: 'Développé Épaules Smith', muscle: 'shoulders', equipment: 'smith', muscleTargets: ['Épaules ant.', 'Triceps'], tips: 'Rail guidé. Poussez explosif. Descendez contrôlé jusqu\'aux épaules.' },
    { id: 'push-press', name: 'Push Press', muscle: 'shoulders', equipment: 'barbell', muscleTargets: ['Épaules', 'Jambes'], tips: 'Légère flexion des genoux pour l\'impulsion. Mouvement explosif. Permet de charger plus lourd.' },
    { 
        id: 'lateral-raise', 
        name: 'Élévations Latérales Haltères', 
        muscle: 'shoulders', 
        equipment: 'dumbbell',
        level: 'beginner',
        type: 'isolation',
        primaryMuscles: ['Deltoïde latéral'],
        secondaryMuscles: ['Trapèzes supérieurs'],
        muscleTargets: ['Épaules lat.'],
        execution: 'Debout, haltères le long du corps. Monte les bras sur les côtés jusqu\'à l\'horizontale, coudes légèrement fléchis.',
        cues: ['Montez jusqu\'à l\'horizontale (pas plus haut)', 'Coudes légèrement fléchis (10-15°)', 'Imaginez verser de l\'eau (rotation légère)', 'Contrôle strict 2-3 sec à la descente'],
        commonMistakes: ['Monter trop haut (sollicite les trapèzes)', 'Balancer le corps (triche)', 'Bras tendus (stress coudes)', 'Charge trop lourde'],
        alternatives: ['lateral-raise-cable', 'lateral-raise-machine'],
        contraindications: ['shoulder'],
        tips: 'Montez jusqu\'à l\'horizontale. Coudes légèrement fléchis. Contrôlez la descente.',
        image: null
    },
    { id: 'lateral-raise-cable', name: 'Élévations Latérales Poulie', muscle: 'shoulders', equipment: 'cable', muscleTargets: ['Épaules lat.'], tips: 'Tension constante grâce à la poulie. Position du bras opposé stable.' },
    { id: 'lateral-raise-machine', name: 'Élévations Latérales Machine', muscle: 'shoulders', equipment: 'machine', muscleTargets: ['Épaules lat.'], tips: 'Trajectoire guidée. Isolation parfaite des deltoïdes latéraux.' },
    { 
        id: 'front-raise', 
        name: 'Élévations Frontales', 
        muscle: 'shoulders', 
        equipment: 'dumbbell',
        level: 'beginner',
        type: 'isolation',
        primaryMuscles: ['Deltoïde antérieur'],
        secondaryMuscles: ['Pectoral faisceau claviculaire'],
        muscleTargets: ['Épaules ant.'],
        execution: 'Debout, haltères devant les cuisses. Monte les bras devant toi jusqu\'à hauteur des yeux, bras légèrement fléchis.',
        cues: ['Montez jusqu\'à hauteur des yeux', 'Bras légèrement fléchis', 'Mouvement contrôlé sans élan', 'Descente lente 2-3 sec'],
        commonMistakes: ['Monter trop haut (au-dessus de la tête)', 'Utiliser l\'élan du dos', 'Bras tendus complètement', 'Trop de poids'],
        alternatives: ['front-raise-cable', 'front-raise-plate', 'overhead-press'],
        contraindications: ['shoulder'],
        tips: 'Montez jusqu\'à hauteur des yeux. Gardez les bras légèrement fléchis.',
        image: null
    },
    { id: 'front-raise-cable', name: 'Élévations Frontales Poulie', muscle: 'shoulders', equipment: 'cable', muscleTargets: ['Épaules ant.'], tips: 'Tension constante. Parfait en fin de séance épaules.' },
    { id: 'front-raise-plate', name: 'Élévations Frontales Disque', muscle: 'shoulders', equipment: 'plate', muscleTargets: ['Épaules ant.'], tips: 'Tenez le disque à 2 mains. Montez contrôlé. Excellent pour la force.' },
    { id: 'upright-row', name: 'Rowing Menton', muscle: 'shoulders', equipment: 'barbell', muscleTargets: ['Épaules', 'Trapèzes'], tips: 'Montez les coudes en premier. Ne montez pas trop haut. Attention aux épaules sensibles.' },
    
    // ==================== ÉPAULES ARRIÈRE ====================
    { 
        id: 'face-pull', 
        name: 'Face Pull', 
        muscle: 'rear-delts', 
        equipment: 'cable',
        level: 'beginner',
        type: 'isolation',
        primaryMuscles: ['Deltoïde postérieur', 'Rotateurs externes'],
        secondaryMuscles: ['Trapèzes moyens', 'Rhomboïdes'],
        muscleTargets: ['Épaules arr.', 'Trapèzes', 'Rotateurs'],
        execution: 'Poulie haute avec corde. Tire vers le visage en écartant les mains de chaque côté de la tête, coudes hauts.',
        cues: ['Tire vers le visage', 'Écarte les mains en fin de mouvement', 'Coudes restent hauts', 'Rotation externe des épaules'],
        commonMistakes: ['Tirer trop bas (vers la poitrine)', 'Coudes qui descendent', 'Mouvement trop rapide', 'Ne pas écarter les mains'],
        alternatives: ['reverse-fly', 'reverse-fly-cable', 'rear-delt-row'],
        contraindications: [],
        tips: 'Tirez vers le visage. Écartez les mains en fin de mouvement. Excellent pour la posture.',
        image: null
    },
    { id: 'reverse-fly', name: 'Oiseau / Reverse Fly', muscle: 'rear-delts', equipment: 'dumbbell', muscleTargets: ['Épaules arr.'], tips: 'Buste penché à 90°. Montez les coudes. Contractez les omoplates en haut.' },
    { id: 'reverse-fly-machine', name: 'Reverse Fly Machine', muscle: 'rear-delts', equipment: 'machine', muscleTargets: ['Épaules arr.'], tips: 'Réglez la hauteur du siège. Poitrine contre le pad. Isolation parfaite.' },
    { id: 'reverse-fly-cable', name: 'Oiseau Poulie', muscle: 'rear-delts', equipment: 'cable', muscleTargets: ['Épaules arr.'], tips: 'Croisez les poulies. Mouvement horizontal. Tension constante.' },
    { id: 'rear-delt-row', name: 'Rowing Épaules Arrière', muscle: 'rear-delts', equipment: 'dumbbell', muscleTargets: ['Épaules arr.', 'Trapèzes'], tips: 'Coudes très écartés. Tirez haut vers la poitrine. Focus sur l\'arrière d\'épaule.' },
    
    // ==================== TRICEPS ====================
    { id: 'dips-triceps', name: 'Dips (Triceps)', muscle: 'triceps', equipment: 'bodyweight', muscleTargets: ['Triceps', 'Pectoraux', 'Épaules'], tips: 'Restez vertical. Coudes le long du corps. Descendez jusqu\'à 90°.' },
    { 
        id: 'close-grip-bench', 
        name: 'Développé Couché Prise Serrée', 
        muscle: 'triceps', 
        equipment: 'barbell',
        level: 'intermediate',
        type: 'compound',
        primaryMuscles: ['Triceps'],
        secondaryMuscles: ['Pectoraux faisceau interne', 'Deltoïde antérieur'],
        muscleTargets: ['Triceps', 'Pectoraux int.'],
        execution: 'Allongé sur banc, mains écartées largeur épaules. Descends la barre vers le bas des pectoraux, coudes près du corps, remonte en contractant les triceps.',
        cues: ['Mains écartées largeur épaules (pas plus serré)', 'Coudes PRÈS DU CORPS (pas écartés)', 'Descends vers le bas des pecs', 'Focus sur les triceps'],
        commonMistakes: ['Prise trop serrée (stress poignets)', 'Coudes trop écartés', 'Descendre vers le cou', 'Fesses qui décollent'],
        alternatives: ['dips-triceps', 'skull-crusher', 'tricep-pushdown'],
        contraindications: ['shoulder', 'wrist'],
        tips: 'Mains écartées de la largeur des épaules. Coudes près du corps. Excellent pour la force.',
        image: null
    },
    { id: 'skull-crusher', name: 'Barre au Front / Skull Crusher', muscle: 'triceps', equipment: 'barbell', muscleTargets: ['Triceps'], tips: 'Allongé sur banc. Coudes fixes. Descendez vers le front. Remontez en contractant.' },
    { id: 'skull-crusher-db', name: 'Extension Nuque Haltère', muscle: 'triceps', equipment: 'dumbbell', muscleTargets: ['Triceps'], tips: 'Amplitude naturelle. Permet un bon étirement du triceps. Contrôlez la charge.' },
    { id: 'tricep-pushdown', name: 'Extension Triceps Poulie Haute', muscle: 'triceps', equipment: 'cable', muscleTargets: ['Triceps'], tips: 'Coudes fixes. Poussez jusqu\'à l\'extension complète. Contractez en bas.' },
    { id: 'tricep-pushdown-rope', name: 'Extension Triceps Corde', muscle: 'triceps', equipment: 'cable', muscleTargets: ['Triceps'], tips: 'Écartez la corde en bas. Permet une meilleure contraction. Sensation de brûlure.' },
    { id: 'tricep-pushdown-vbar', name: 'Extension Triceps Barre V', muscle: 'triceps', equipment: 'cable', muscleTargets: ['Triceps'], tips: 'Prise neutre confortable. Extension complète obligatoire. Contrôlez la remontée.' },
    { id: 'overhead-tricep', name: 'Extension Triceps Au-dessus Tête', muscle: 'triceps', equipment: 'cable', muscleTargets: ['Triceps longue portion'], tips: 'Dos à la poulie. Bras au-dessus de la tête. Étirement maximal du triceps.' },
    { id: 'overhead-tricep-db', name: 'Extension Nuque Haltère 2 mains', muscle: 'triceps', equipment: 'dumbbell', muscleTargets: ['Triceps longue portion'], tips: 'Tenez l\'haltère à 2 mains. Descendez derrière la nuque. Coudes fixes.' },
    { id: 'kickback', name: 'Kickback Triceps', muscle: 'triceps', equipment: 'dumbbell', muscleTargets: ['Triceps'], tips: 'Buste penché. Coude fixe. Remontez jusqu\'à l\'extension complète.' },
    { id: 'kickback-cable', name: 'Kickback Triceps Poulie', muscle: 'triceps', equipment: 'cable', muscleTargets: ['Triceps'], tips: 'Tension constante. Mouvement contrôlé. Focus sur la contraction.' },
    { id: 'tricep-machine', name: 'Extension Triceps Machine', muscle: 'triceps', equipment: 'machine', muscleTargets: ['Triceps'], tips: 'Trajectoire guidée. Parfait pour finir les triceps. Extension maximale.' },
    { id: 'diamond-pushups', name: 'Pompes Diamant', muscle: 'triceps', equipment: 'bodyweight', muscleTargets: ['Triceps', 'Pectoraux int.'], tips: 'Mains en diamant sous la poitrine. Coudes le long du corps. Excellent pour les triceps.' },
    
    // ==================== BICEPS ====================
    { 
        id: 'barbell-curl', 
        name: 'Curl Barre Droite', 
        muscle: 'biceps', 
        equipment: 'barbell',
        level: 'beginner',
        type: 'isolation',
        primaryMuscles: ['Biceps brachial'],
        secondaryMuscles: ['Brachial', 'Avant-bras'],
        muscleTargets: ['Biceps', 'Avant-bras'],
        execution: 'Debout, barre en supination, coudes fixes le long du corps. Monte la barre en contractant les biceps, redescends contrôlé.',
        cues: ['Debout, dos droit', 'Coudes FIXES le long du corps', 'Monte en contractant, supination maximale', 'Descends lentement 2-3 sec', 'NE balance PAS le corps'],
        commonMistakes: ['Balancer le corps (triche)', 'Coudes qui avancent', 'Descente trop rapide', 'Amplitude incomplète en haut ou en bas'],
        alternatives: ['ez-curl', 'dumbbell-curl', 'cable-curl', 'preacher-curl'],
        contraindications: ['wrist'],
        tips: 'Debout, dos droit. Montez en contractant. Contrôlez la descente. Ne balancez pas.',
        image: null
    },
    { id: 'ez-curl', name: 'Curl Barre EZ', muscle: 'biceps', equipment: 'barbell', muscleTargets: ['Biceps', 'Avant-bras'], tips: 'Prise inclinée plus confortable pour les poignets. Mouvement strict.' },
    { id: 'dumbbell-curl', name: 'Curl Haltères', muscle: 'biceps', equipment: 'dumbbell', muscleTargets: ['Biceps'], tips: 'Simultané ou alterné. Supination complète en haut. Amplitude maximale.' },
    { id: 'alternating-curl', name: 'Curl Alterné Haltères', muscle: 'biceps', equipment: 'dumbbell', muscleTargets: ['Biceps'], tips: 'Un bras à la fois. Focus sur la supination. Concentration maximale.' },
    { 
        id: 'hammer-curl', 
        name: 'Curl Marteau', 
        muscle: 'biceps', 
        equipment: 'dumbbell',
        level: 'beginner',
        type: 'isolation',
        primaryMuscles: ['Brachial', 'Brachioradial'],
        secondaryMuscles: ['Biceps', 'Avant-bras'],
        muscleTargets: ['Biceps', 'Brachial', 'Avant-bras'],
        execution: 'Debout, haltères en prise neutre (marteau). Monte en gardant la prise neutre, coudes fixes, redescends contrôlé.',
        cues: ['Prise neutre (marteau) maintenue', 'Coudes fixes le long du corps', 'Monte sans rotation', 'Sollicite le brachial (épaisseur du bras)'],
        commonMistakes: ['Rotation vers supination (devient un curl classique)', 'Balancer le corps', 'Coudes qui avancent'],
        alternatives: ['barbell-curl', 'dumbbell-curl', 'cable-curl'],
        contraindications: [],
        tips: 'Prise neutre (marteau). Sollicite le brachial. Excellent pour l\'épaisseur du bras.',
        image: null
    },
    { id: 'incline-curl', name: 'Curl Incliné', muscle: 'biceps', equipment: 'dumbbell', muscleTargets: ['Biceps'], tips: 'Allongé sur banc incliné. Étirement maximal du biceps. Mouvement pur.' },
    { id: 'concentration-curl', name: 'Curl Concentré', muscle: 'biceps', equipment: 'dumbbell', muscleTargets: ['Biceps'], tips: 'Assis, coude calé sur la cuisse. Isolation totale. Supination maximale en haut.' },
    { id: 'preacher-curl', name: 'Curl Pupitre / Larry Scott', muscle: 'biceps', equipment: 'barbell', muscleTargets: ['Biceps'], tips: 'Pupitre Larry Scott. Coudes fixes. Empêche la triche. Excellent pour le pic.' },
    { id: 'preacher-curl-db', name: 'Curl Pupitre Haltère', muscle: 'biceps', equipment: 'dumbbell', muscleTargets: ['Biceps'], tips: 'Un bras à la fois. Amplitude complète. Concentration maximale.' },
    { id: 'cable-curl', name: 'Curl Poulie Basse', muscle: 'biceps', equipment: 'cable', muscleTargets: ['Biceps'], tips: 'Tension constante. Coudes fixes. Idéal en fin de séance.' },
    { id: 'cable-curl-high', name: 'Curl Poulie Haute', muscle: 'biceps', equipment: 'cable', muscleTargets: ['Biceps'], tips: 'Bras horizontaux. Flex de culturiste. Excellent pour la congestion.' },
    { id: 'machine-curl', name: 'Curl Machine', muscle: 'biceps', equipment: 'machine', muscleTargets: ['Biceps'], tips: 'Trajectoire guidée. Parfait pour finir les biceps en sécurité.' },
    { id: 'spider-curl', name: 'Spider Curl', muscle: 'biceps', equipment: 'dumbbell', muscleTargets: ['Biceps'], tips: 'Buste penché sur banc incliné. Coudes vers l\'avant. Contraction maximale.' },
    { id: 'drag-curl', name: 'Drag Curl', muscle: 'biceps', equipment: 'barbell', muscleTargets: ['Biceps'], tips: 'Barre glisse le long du corps. Coudes vers l\'arrière. Tension continue.' },
    
    // ==================== QUADRICEPS ====================
    { 
        id: 'squat', 
        name: 'Squat Barre', 
        muscle: 'quads', 
        equipment: 'barbell',
        level: 'intermediate',
        type: 'compound',
        primaryMuscles: ['Quadriceps', 'Fessiers'],
        secondaryMuscles: ['Ischio-jambiers', 'Érecteurs', 'Core'],
        muscleTargets: ['Quadriceps', 'Fessiers', 'Ischios'],
        execution: 'Barre sur les trapèzes, pieds largeur épaules. Descends en poussant les hanches en arrière, remonte en poussant le sol.',
        cues: ['Pieds largeur épaules, pointes légèrement ouvertes', 'Genoux dans l\'axe des pieds', 'Descends au moins aux parallèles', 'Poitrine haute, regard devant'],
        commonMistakes: ['Genoux qui rentrent (valgus)', 'Dos qui s\'arrondit', 'Talons qui décollent', 'Descente insuffisante'],
        alternatives: ['front-squat', 'goblet-squat', 'hack-squat', 'leg-press'],
        contraindications: ['knee', 'back'],
        tips: 'Descendez jusqu\'aux parallèles. Genoux dans l\'axe des pieds. Dos droit, poitrine haute.',
        image: null
    },
    { 
        id: 'front-squat', 
        name: 'Front Squat', 
        muscle: 'quads', 
        equipment: 'barbell',
        level: 'advanced',
        type: 'compound',
        primaryMuscles: ['Quadriceps'],
        secondaryMuscles: ['Core', 'Fessiers'],
        muscleTargets: ['Quadriceps', 'Abdos'],
        execution: 'Barre sur les clavicules, coudes hauts. Descends verticalement, remonte en gardant les coudes hauts.',
        cues: ['Coudes hauts (parallèles au sol)', 'Descends profond', 'Garde le buste très droit', 'Moins de stress lombaire'],
        commonMistakes: ['Coudes qui tombent', 'Se pencher en avant', 'Poignets qui se cassent'],
        alternatives: ['goblet-squat', 'hack-squat', 'leg-press'],
        contraindications: ['wrist', 'knee'],
        tips: 'Barre devant. Coudes hauts. Moins de stress lombaire. Plus de focus sur les quads.',
        image: null
    },
    { 
        id: 'goblet-squat', 
        name: 'Goblet Squat', 
        muscle: 'quads', 
        equipment: 'dumbbell',
        level: 'beginner',
        type: 'compound',
        primaryMuscles: ['Quadriceps', 'Fessiers'],
        secondaryMuscles: ['Core'],
        muscleTargets: ['Quadriceps', 'Fessiers'],
        execution: 'Tiens l\'haltère contre la poitrine. Descends profond entre tes jambes, remonte en poussant.',
        cues: ['Haltère contre la poitrine', 'Coudes entre les genoux en bas', 'Descends profond', 'Excellent pour apprendre le squat'],
        commonMistakes: ['Ne pas descendre assez', 'Se pencher en avant', 'Lâcher l\'haltère'],
        alternatives: ['squat', 'leg-press', 'hack-squat'],
        contraindications: [],
        tips: 'Tenez l\'haltère contre la poitrine. Excellent pour apprendre le mouvement. Descendez profond.',
        image: null
    },
    { id: 'smith-squat', name: 'Squat Smith', muscle: 'quads', equipment: 'smith', muscleTargets: ['Quadriceps', 'Fessiers'], tips: 'Rail guidé. Position des pieds vers l\'avant. Permet de cibler précisément.' },
    { id: 'hack-squat', name: 'Hack Squat', muscle: 'quads', equipment: 'machine', muscleTargets: ['Quadriceps'], tips: 'Dos contre le pad. Pieds vers l\'avant. Isolation des quadriceps. Descendez contrôlé.' },
    { 
        id: 'leg-press', 
        name: 'Presse à Cuisses', 
        muscle: 'quads', 
        equipment: 'machine',
        level: 'beginner',
        type: 'compound',
        primaryMuscles: ['Quadriceps', 'Fessiers'],
        secondaryMuscles: ['Ischio-jambiers'],
        muscleTargets: ['Quadriceps', 'Fessiers'],
        execution: 'Assis, pieds largeur épaules sur la plateforme. Descends en contrôlant jusqu\'à 90°, remonte en poussant avec les talons.',
        cues: ['Pieds largeur épaules', 'Descendez jusqu\'à 90° (pas plus bas)', 'NE décoll ez PAS les fesses', 'Poussez avec les talons, pas les orteils'],
        commonMistakes: ['Fesses qui décollent (risque lombaire majeur)', 'Descente trop basse', 'Genoux qui rentrent (valgus)', 'Amplitude incomplète'],
        alternatives: ['squat', 'hack-squat', 'goblet-squat'],
        contraindications: ['knee'],
        tips: 'Ne déccollez pas les fesses. Descendez jusqu\'à 90°. Poussez avec les talons.',
        image: null
    },
    { id: 'leg-press-feet-low', name: 'Presse Pieds Bas (Quads)', muscle: 'quads', equipment: 'machine', muscleTargets: ['Quadriceps'], tips: 'Pieds bas sur la plateforme. Cible davantage les quadriceps. Amplitude contrôlée.' },
    { 
        id: 'leg-extension', 
        name: 'Leg Extension', 
        muscle: 'quads', 
        equipment: 'machine',
        level: 'beginner',
        type: 'isolation',
        primaryMuscles: ['Quadriceps'],
        secondaryMuscles: [],
        muscleTargets: ['Quadriceps'],
        execution: 'Assis, genoux fléchis. Remonte les jambes jusqu\'à l\'extension complète, contracte 1 sec en haut, redescends contrôlé.',
        cues: ['Extension complète des jambes', 'Contracte et tiens 1 sec en haut', 'Descente lente 2-3 sec', 'Ne jette pas les jambes'],
        commonMistakes: ['Extension incomplète', 'Descente trop rapide', 'Fesses qui décollent', 'Poids trop lourd (risque genoux)'],
        alternatives: ['squat', 'leg-press', 'lunge'],
        contraindications: ['knee'],
        tips: 'Isolation pure des quadriceps. Extension complète. Contractez 1 sec en haut.',
        image: null
    },
    { id: 'lunge', name: 'Fentes', muscle: 'quads', equipment: 'dumbbell', muscleTargets: ['Quadriceps', 'Fessiers'], tips: 'Pas large. Descendez le genou arrière vers le sol. Remontez en poussant avec le talon avant.' },
    { id: 'walking-lunge', name: 'Fentes Marchées', muscle: 'quads', equipment: 'dumbbell', muscleTargets: ['Quadriceps', 'Fessiers', 'Équilibre'], tips: 'Marchez en alternant. Gardez le torse droit. Excellent pour les fessiers et l\'équilibre.' },
    { id: 'bulgarian-split-squat', name: 'Bulgarian Split Squat', muscle: 'quads', equipment: 'dumbbell', muscleTargets: ['Quadriceps', 'Fessiers'], tips: 'Pied arrière sur banc. Descendez vertical. Déséquilibre musculaire corrigé.' },
    { id: 'step-up', name: 'Step Up', muscle: 'quads', equipment: 'dumbbell', muscleTargets: ['Quadriceps', 'Fessiers'], tips: 'Montez sur box. Poussez avec le talon. Ne prenez pas d\'élan avec le pied arrière.' },
    { id: 'sissy-squat', name: 'Sissy Squat', muscle: 'quads', equipment: 'bodyweight', muscleTargets: ['Quadriceps'], tips: 'Genoux vers l\'avant, buste vers l\'arrière. Étirement intense des quadriceps. Exercice avancé.' },
    { id: 'pendulum-squat', name: 'Pendulum Squat', muscle: 'quads', equipment: 'machine', muscleTargets: ['Quadriceps'], tips: 'Trajectoire pendulaire. Profondeur maximale. Excellente isolation des quadriceps.' },
    { id: 'v-squat', name: 'V-Squat Machine', muscle: 'quads', equipment: 'machine', muscleTargets: ['Quadriceps'], tips: 'Position en V. Amplitude sécurisée. Parfait pour charger lourd en isolation.' },
    
    // ==================== ISCHIO-JAMBIERS ====================
    { 
        id: 'rdl', 
        name: 'Soulevé de Terre Roumain', 
        muscle: 'hamstrings', 
        equipment: 'barbell',
        level: 'intermediate',
        type: 'compound',
        primaryMuscles: ['Ischio-jambiers', 'Fessiers'],
        secondaryMuscles: ['Érecteurs du rachis'],
        muscleTargets: ['Ischio-jambiers', 'Fessiers', 'Lombaires'],
        execution: 'Debout, barre contre les cuisses. Pousse les hanches en arrière en gardant les jambes presque tendues, descends jusqu\'à l\'étirement.',
        cues: ['Jambes quasi tendues (légère flexion)', 'Pousse les hanches vers l\'arrière', 'Barre reste contre les jambes', 'Sens l\'étirement des ischios'],
        commonMistakes: ['Dos qui s\'arrondit', 'Trop de flexion des genoux', 'Barre éloignée du corps', 'Descendre trop bas sans souplesse'],
        alternatives: ['rdl-db', 'stiff-leg-deadlift', 'good-morning'],
        contraindications: ['back'],
        tips: 'Jambes légèrement fléchies. Poussez les hanches vers l\'arrière. Sentez l\'étirement.',
        image: null
    },
    { id: 'rdl-db', name: 'Soulevé de Terre Roumain Haltères', muscle: 'hamstrings', equipment: 'dumbbell', muscleTargets: ['Ischio-jambiers', 'Fessiers'], tips: 'Amplitude naturelle. Haltères le long des jambes. Focus sur l\'étirement et la contraction.' },
    { id: 'stiff-leg-deadlift', name: 'Soulevé Jambes Tendues', muscle: 'hamstrings', equipment: 'barbell', muscleTargets: ['Ischio-jambiers', 'Lombaires'], tips: 'Jambes presque tendues. Étirement maximal. Attention à ne pas arrondir le dos.' },
    { id: 'good-morning', name: 'Good Morning', muscle: 'hamstrings', equipment: 'barbell', muscleTargets: ['Ischio-jambiers', 'Lombaires'], tips: 'Barre sur les épaules. Penchez le buste en avant. Gardez le dos droit. Exercice avancé.' },
    { 
        id: 'leg-curl-lying', 
        name: 'Leg Curl Allongé', 
        muscle: 'hamstrings', 
        equipment: 'machine',
        level: 'beginner',
        type: 'isolation',
        primaryMuscles: ['Ischio-jambiers'],
        secondaryMuscles: ['Mollets'],
        muscleTargets: ['Ischio-jambiers'],
        execution: 'Allongé sur le ventre, talons sous le pad. Ramène les talons vers les fesses en contractant les ischios, redescends contrôlé.',
        cues: ['Hanches plaquées au banc', 'Ramène les talons vers les fesses', 'Contracte et tiens 1 sec en haut', 'Contrôle la descente 2-3 sec'],
        commonMistakes: ['Hanches qui décollent', 'Utiliser l\'élan', 'Amplitude incomplète', 'Descente trop rapide'],
        alternatives: ['rdl', 'nordic-curl', 'leg-curl-seated'],
        contraindications: ['knee'],
        tips: 'Allongé ventre. Ramenez les talons vers les fesses. Contractez en haut 1-2 sec.',
        image: null
    },
    { id: 'leg-curl-seated', name: 'Leg Curl Assis', muscle: 'hamstrings', equipment: 'machine', muscleTargets: ['Ischio-jambiers'], tips: 'Assis. Poussez les cuisses contre le pad. Excellent étirement et contraction.' },
    { id: 'leg-curl-standing', name: 'Leg Curl Debout', muscle: 'hamstrings', equipment: 'machine', muscleTargets: ['Ischio-jambiers'], tips: 'Debout, une jambe à la fois. Stabilisation du core. Focus unilatéral.' },
    { id: 'nordic-curl', name: 'Nordic Curl', muscle: 'hamstrings', equipment: 'bodyweight', muscleTargets: ['Ischio-jambiers'], tips: 'Genoux fixés. Descendez contrôlé. Très exigeant. Utilisez un support si nécessaire.' },
    { id: 'cable-pull-through', name: 'Pull Through Poulie', muscle: 'hamstrings', equipment: 'cable', muscleTargets: ['Fessiers', 'Ischio-jambiers'], tips: 'Dos à la poulie. Hip hinge. Excellent pour apprendre le mouvement deadlift.' },
    { id: 'leg-press-feet-high', name: 'Presse Pieds Hauts (Ischios)', muscle: 'hamstrings', equipment: 'machine', muscleTargets: ['Ischio-jambiers', 'Fessiers'], tips: 'Pieds hauts sur la plateforme. Cible davantage l\'arrière des cuisses et les fessiers.' },
    
    // ==================== FESSIERS ====================
    { 
        id: 'hip-thrust', 
        name: 'Hip Thrust', 
        muscle: 'glutes', 
        equipment: 'barbell',
        level: 'beginner',
        type: 'compound',
        primaryMuscles: ['Grand fessier'],
        secondaryMuscles: ['Ischio-jambiers'],
        muscleTargets: ['Fessiers', 'Ischio-jambiers'],
        execution: 'Dos contre un banc, barre sur les hanches. Pousse les hanches vers le haut en contractant les fessiers.',
        cues: ['Pieds largeur hanches, tibias verticaux', 'Pousse avec les talons', 'Contracte fort les fessiers en haut', 'Menton rentré, regard vers l\'avant'],
        commonMistakes: ['Hyperextension du dos', 'Pieds trop loin ou trop près', 'Contraction insuffisante en haut', 'Regarder le plafond'],
        alternatives: ['hip-thrust-machine', 'glute-bridge', 'cable-kickback'],
        contraindications: [],
        tips: 'Dos contre banc. Poussez avec les talons. Contractez fort les fessiers en haut.',
        image: null
    },
    { id: 'hip-thrust-machine', name: 'Hip Thrust Machine', muscle: 'glutes', equipment: 'machine', level: 'beginner', type: 'compound', muscleTargets: ['Fessiers'], tips: 'Position optimale guidée. Focus total sur les fessiers. Contraction maximale.', alternatives: ['hip-thrust', 'glute-bridge'], contraindications: [] },
    { id: 'glute-bridge', name: 'Glute Bridge', muscle: 'glutes', equipment: 'bodyweight', muscleTargets: ['Fessiers', 'Ischios'], tips: 'Au sol. Poussez les hanches vers le haut. Serrez les fessiers en haut 2-3 sec.' },
    { id: 'cable-kickback', name: 'Kickback Fessier Poulie', muscle: 'glutes', equipment: 'cable', muscleTargets: ['Fessiers'], tips: 'Poussez la jambe vers l\'arrière. Contractez fort. Mouvement contrôlé.' },
    { id: 'glute-kickback-machine', name: 'Kickback Fessier Machine', muscle: 'glutes', equipment: 'machine', muscleTargets: ['Fessiers'], tips: 'Isolation pure. Amplitude complète. Excellent en fin de séance jambes.' },
    { id: 'sumo-deadlift', name: 'Soulevé de Terre Sumo', muscle: 'glutes', equipment: 'barbell', muscleTargets: ['Fessiers', 'Adducteurs', 'Ischios'], tips: 'Position large. Pointes de pieds vers l\'extérieur. Pousse avec les hanches.' },
    { id: 'sumo-squat', name: 'Squat Sumo', muscle: 'glutes', equipment: 'dumbbell', muscleTargets: ['Fessiers', 'Adducteurs', 'Quads'], tips: 'Position très large. Descendez entre les jambes. Excellent pour l\'intérieur des cuisses.' },
    { id: 'abductor-machine', name: 'Abducteurs Machine', muscle: 'glutes', equipment: 'machine', muscleTargets: ['Fessiers lat.', 'Abducteurs'], tips: 'Écartez les jambes contre résistance. Contractez les fessiers. Contrôlez le retour.' },
    { id: 'frog-pump', name: 'Frog Pump', muscle: 'glutes', equipment: 'bodyweight', muscleTargets: ['Fessiers'], tips: 'Plante des pieds jointes. Genoux écartés. Petite amplitude, haute fréquence. Congestion intense.' },
    
    // ==================== MOLLETS ====================
    { 
        id: 'standing-calf', 
        name: 'Mollets Debout Machine', 
        muscle: 'calves', 
        equipment: 'machine',
        level: 'beginner',
        type: 'isolation',
        primaryMuscles: ['Gastrocnémiens (mollets)'],
        secondaryMuscles: [],
        muscleTargets: ['Mollets (gastrocnemiens)'],
        execution: 'Debout, épaules sous les pads, jambes tendues. Monte sur la pointe des pieds au maximum, pause 1 sec, redescends en étirement.',
        cues: ['Jambes tendues (cible le gastrocnémien)', 'Monte le plus haut possible', 'Pause 1 sec en haut', 'Descends jusqu\'à l\'étirement complet'],
        commonMistakes: ['Amplitude incomplète', 'Pas de pause en haut', 'Genoux qui se fléchissent', 'Aller trop vite'],
        alternatives: ['standing-calf-smith', 'leg-press-calf', 'seated-calf'],
        contraindications: [],
        tips: 'Jambes tendues. Montez sur la pointe des pieds. Amplitude complète, pause en haut.',
        image: null
    },
    { id: 'standing-calf-smith', name: 'Mollets Debout Smith', muscle: 'calves', equipment: 'smith', muscleTargets: ['Mollets (gastrocnemiens)'], tips: 'Barre sur les épaules. Montez haut sur les pointes. Descendez jusqu\'à l\'étirement.' },
    { id: 'seated-calf', name: 'Mollets Assis', muscle: 'calves', equipment: 'machine', muscleTargets: ['Mollets (soléaires)'], tips: 'Assis, genoux fléchis. Cible le soléaire. Amplitude maximale. Hautes répétitions.' },
    { id: 'leg-press-calf', name: 'Mollets à la Presse', muscle: 'calves', equipment: 'machine', muscleTargets: ['Mollets'], tips: 'Sur la presse. Poussez avec les orteils. Descendez l\'étirement. Permet de charger lourd.' },
    { id: 'donkey-calf', name: 'Mollets Donkey', muscle: 'calves', equipment: 'machine', muscleTargets: ['Mollets'], tips: 'Buste penché. Étirement maximal. Old school mais très efficace.' },
    { id: 'single-leg-calf', name: 'Mollets Unilatéral Haltère', muscle: 'calves', equipment: 'dumbbell', muscleTargets: ['Mollets'], tips: 'Une jambe à la fois. Corrige les déséquilibres. Équilibre et stabilisation.' },
    
    // ==================== TRAPÈZES ====================
    { id: 'barbell-shrug', name: 'Shrugs Barre', muscle: 'traps', equipment: 'barbell', muscleTargets: ['Trapèzes'], tips: 'Montez les épaules vers les oreilles. Pas de rotation. Contractez 1 sec en haut.' },
    { id: 'dumbbell-shrug', name: 'Shrugs Haltères', muscle: 'traps', equipment: 'dumbbell', muscleTargets: ['Trapèzes'], tips: 'Amplitude naturelle. Permet de charger lourd. Mouvement vertical pur.' },
    { id: 'smith-shrug', name: 'Shrugs Smith', muscle: 'traps', equipment: 'smith', muscleTargets: ['Trapèzes'], tips: 'Rail guidé. Position optimale. Excellent pour la surcharge progressive.' },
    { id: 'trap-bar-shrug', name: 'Shrugs Trap Bar', muscle: 'traps', equipment: 'barbell', muscleTargets: ['Trapèzes'], tips: 'Position neutre confortable. Permet de charger très lourd. Amplitude maximale.' },
    { id: 'cable-shrug', name: 'Shrugs Poulie', muscle: 'traps', equipment: 'cable', muscleTargets: ['Trapèzes'], tips: 'Tension constante. Parfait en finition. Contraction continue.' },
    { id: 'farmers-walk', name: 'Farmer\'s Walk', muscle: 'traps', equipment: 'dumbbell', muscleTargets: ['Trapèzes', 'Avant-bras', 'Core'], tips: 'Marchez avec charges lourdes. Épaules en arrière. Excellent pour la force fonctionnelle.' },
    
    // ==================== ABDOMINAUX ====================
    { 
        id: 'crunch', 
        name: 'Crunch', 
        muscle: 'abs', 
        equipment: 'bodyweight',
        level: 'beginner',
        type: 'isolation',
        primaryMuscles: ['Grand droit de l\'abdomen'],
        secondaryMuscles: [],
        muscleTargets: ['Abdominaux'],
        execution: 'Allongé sur le dos, genoux fléchis, mains derrière la tête. Enroule la colonne en contractant les abdos, pause 1 sec en haut, redescends contrôlé.',
        cues: ['ENROULE la colonne (ne te redresse pas)', 'Ne tire PAS sur la nuque', 'Contracte et tiens 1 sec en haut', 'Regarde vers le plafond'],
        commonMistakes: ['Tirer sur la nuque (stress cervicales)', 'Se redresser complètement (hip flexors)', 'Aller trop vite', 'Ne pas enrouler la colonne'],
        alternatives: ['cable-crunch', 'crunch-machine', 'plank'],
        contraindications: ['back'],
        tips: 'Enroulez la colonne. Ne tirez pas sur la nuque. Contractez en haut 1 sec.',
        image: null
    },
    { id: 'crunch-machine', name: 'Crunch Machine', muscle: 'abs', equipment: 'machine', muscleTargets: ['Abdominaux'], tips: 'Trajectoire guidée. Permet d\'ajouter de la charge. Enroulement complet.' },
    { id: 'cable-crunch', name: 'Crunch Poulie Haute', muscle: 'abs', equipment: 'cable', muscleTargets: ['Abdominaux'], tips: 'À genoux. Enroulez le buste. Corde derrière la tête. Tension continue.' },
    { 
        id: 'leg-raise', 
        name: 'Relevé de Jambes', 
        muscle: 'abs', 
        equipment: 'bodyweight',
        level: 'intermediate',
        type: 'isolation',
        primaryMuscles: ['Abdominaux inférieurs'],
        secondaryMuscles: ['Hip flexors'],
        muscleTargets: ['Abdominaux inf.'],
        execution: 'Allongé sur le dos, mains sous les fesses. Monte les jambes tendues jusqu\'à la verticale, redescends contrôlé sans toucher le sol.',
        cues: ['Jambes tendues', 'Monte jusqu\'à la verticale', 'NE cambre PAS le dos (plaque le bas du dos au sol)', 'Descends contrôlé sans toucher le sol', 'Respire à chaque rep'],
        commonMistakes: ['Dos qui se cambre (risque lombaire majeur)', 'Jambes qui touchent le sol (perte de tension)', 'Utiliser l\'élan', 'Genoux qui se plient'],
        alternatives: ['hanging-leg-raise', 'crunch', 'reverse-crunch'],
        contraindications: ['back'],
        tips: 'Au sol. Montez les jambes tendues. Ne cambrez pas le dos. Contrôlez la descente.',
        image: null
    },
    { id: 'hanging-leg-raise', name: 'Relevé de Jambes Suspendu', muscle: 'abs', equipment: 'bodyweight', muscleTargets: ['Abdominaux inf.', 'Hip flexors'], tips: 'Suspendu à la barre. Montez les genoux ou jambes tendues. Ne balancez pas.' },
    { 
        id: 'plank', 
        name: 'Planche / Gainage', 
        muscle: 'abs', 
        equipment: 'bodyweight',
        level: 'beginner',
        type: 'isometric',
        primaryMuscles: ['Transverse', 'Grand droit'],
        secondaryMuscles: ['Obliques', 'Érecteurs', 'Épaules'],
        muscleTargets: ['Abdominaux', 'Core'],
        execution: 'Sur les avant-bras et orteils, corps aligné de la tête aux pieds. Serre les abdos et les fessiers, tiens la position sans bouger.',
        cues: ['Corps PARFAITEMENT aligné (planche)', 'NE cambre PAS le dos', 'Serre les abdos ET les fessiers', 'Respire normalement', 'Regard vers le sol'],
        commonMistakes: ['Dos qui se cambre (risque lombaire)', 'Fesses en l\'air', 'Bassin qui tombe', 'Retenir sa respiration', 'Épaules qui montent'],
        alternatives: ['ab-wheel', 'dead-bug', 'side-plank'],
        contraindications: ['shoulder', 'back'],
        tips: 'Corps aligné. Ne cambrez pas. Serrez les abdos et les fessiers. Tenez la position.',
        image: null
    },
    { id: 'side-plank', name: 'Planche Latérale', muscle: 'abs', equipment: 'bodyweight', muscleTargets: ['Obliques', 'Core'], tips: 'Sur le côté. Corps aligné. Excellent pour les obliques et la stabilité latérale.' },
    { id: 'russian-twist', name: 'Russian Twist', muscle: 'abs', equipment: 'bodyweight', muscleTargets: ['Obliques'], tips: 'Assis, pieds levés. Rotation du buste. Touchez le sol de chaque côté.' },
    { id: 'ab-wheel', name: 'Ab Wheel / Roue Abdos', muscle: 'abs', equipment: 'other', muscleTargets: ['Abdominaux', 'Core complet'], tips: 'À genoux ou debout. Roulez vers l\'avant. Gardez les abdos serrés. Très exigeant.' },
    { id: 'dead-bug', name: 'Dead Bug', muscle: 'abs', equipment: 'bodyweight', muscleTargets: ['Abdominaux', 'Core'], tips: 'Sur le dos. Mouvements opposés bras/jambes. Gardez le dos plaqué au sol.' },
    { id: 'mountain-climber', name: 'Mountain Climber', muscle: 'abs', equipment: 'bodyweight', muscleTargets: ['Abdominaux', 'Cardio'], tips: 'Position pompe. Ramenez les genoux alternés. Mouvement dynamique. Cardio et abdos.' },
    { id: 'decline-crunch', name: 'Crunch Décliné', muscle: 'abs', equipment: 'bodyweight', muscleTargets: ['Abdominaux'], tips: 'Sur banc décliné. Résistance accrue. Amplitude complète. Ne tirez pas sur la nuque.' },
    
    // ==================== AVANT-BRAS ====================
    { id: 'wrist-curl', name: 'Curl Poignet', muscle: 'forearms', equipment: 'barbell', muscleTargets: ['Avant-bras (fléchisseurs)'], tips: 'Avant-bras sur les cuisses. Enroulez les poignets. Amplitude maximale.' },
    { id: 'reverse-wrist-curl', name: 'Curl Poignet Inversé', muscle: 'forearms', equipment: 'barbell', muscleTargets: ['Avant-bras (extenseurs)'], tips: 'Paumes vers le bas. Montez les poignets. Équilibre les fléchisseurs.' },
    { id: 'reverse-curl', name: 'Curl Inversé', muscle: 'forearms', equipment: 'barbell', muscleTargets: ['Avant-bras', 'Brachial'], tips: 'Prise pronation. Curl classique mais inversé. Développe les avant-bras et le brachial.' },
    { id: 'farmers-walk-forearms', name: 'Farmer\'s Walk (Grip)', muscle: 'forearms', equipment: 'dumbbell', muscleTargets: ['Avant-bras', 'Grip'], tips: 'Marchez avec charges lourdes. Serrez fort. Force de préhension et endurance.' },

    // ==================== EXERCICES ADDITIONNELS - PHASE 1 (100+ exercices) ====================

    // --- PECTORAUX (Compléments) ---
    { id: 'floor-press', name: 'Floor Press Barre', muscle: 'chest', equipment: 'barbell', level: 'intermediate', type: 'compound', muscleTargets: ['Pectoraux', 'Triceps'], tips: 'Au sol, amplitude réduite. Excellent pour le lockout et si problème d\'épaule.' },
    { id: 'floor-press-db', name: 'Floor Press Haltères', muscle: 'chest', equipment: 'dumbbell', level: 'intermediate', type: 'compound', muscleTargets: ['Pectoraux', 'Triceps'], tips: 'Variante au sol. Protège les épaules. Pause en bas.' },
    { id: 'landmine-press', name: 'Landmine Press', muscle: 'chest', equipment: 'barbell', level: 'intermediate', type: 'compound', muscleTargets: ['Pectoraux', 'Épaules'], tips: 'Barre dans un coin. Trajectoire diagonale unique. Excellent pour les épaules sensibles.' },
    { id: 'svend-press', name: 'Svend Press', muscle: 'chest', equipment: 'plate', level: 'beginner', type: 'isolation', muscleTargets: ['Pectoraux'], tips: 'Serrez un disque entre les paumes. Poussez devant. Excellent finisher.' },
    { id: 'hex-press', name: 'Hex Press (Squeeze Press)', muscle: 'chest', equipment: 'dumbbell', level: 'intermediate', type: 'compound', muscleTargets: ['Pectoraux internes'], tips: 'Haltères hexagonaux collés. Développé avec pression constante. Cible l\'intérieur des pectoraux.' },
    { id: 'incline-fly-db', name: 'Écarté Incliné Haltères', muscle: 'chest', equipment: 'dumbbell', level: 'beginner', type: 'isolation', muscleTargets: ['Pectoraux sup.'], tips: 'Banc incliné 30°. Légère flexion des coudes. Étirement contrôlé.' },
    { id: 'decline-fly-db', name: 'Écarté Décliné Haltères', muscle: 'chest', equipment: 'dumbbell', level: 'beginner', type: 'isolation', muscleTargets: ['Pectoraux inf.'], tips: 'Banc décliné. Cible le bas des pectoraux. Contrôlez la phase excentrique.' },
    { id: 'low-cable-fly', name: 'Écarté Poulie Basse', muscle: 'chest', equipment: 'cable', level: 'beginner', type: 'isolation', muscleTargets: ['Pectoraux sup.'], tips: 'Poulies basses, mouvement vers le haut. Cible le haut des pectoraux.' },
    { id: 'high-cable-fly', name: 'Écarté Poulie Haute', muscle: 'chest', equipment: 'cable', level: 'beginner', type: 'isolation', muscleTargets: ['Pectoraux inf.'], tips: 'Poulies hautes, mouvement vers le bas. Cible le bas des pectoraux.' },
    { id: 'machine-fly', name: 'Pec Deck Machine', muscle: 'chest', equipment: 'machine', level: 'beginner', type: 'isolation', muscleTargets: ['Pectoraux'], tips: 'Machine à écarté. Trajectoire guidée. Excellent pour l\'isolation.' },

    // --- DOS (Compléments) ---
    { id: 'pendlay-row', name: 'Pendlay Row', muscle: 'back', equipment: 'barbell', level: 'intermediate', type: 'compound', muscleTargets: ['Dos complet', 'Trapèzes'], tips: 'Barre au sol à chaque rep. Explosif. Dos parallèle au sol.' },
    { id: 'seal-row', name: 'Seal Row', muscle: 'back', equipment: 'barbell', level: 'intermediate', type: 'compound', muscleTargets: ['Dos', 'Lats'], tips: 'Allongé sur banc surélevé. Élimine la triche du bas du dos.' },
    { id: 'helms-row', name: 'Helms Row', muscle: 'back', equipment: 'dumbbell', level: 'intermediate', type: 'compound', muscleTargets: ['Dos', 'Lats'], tips: 'Penché sur banc incliné. Isolement maximal du dos.' },
    { id: 'kroc-row', name: 'Kroc Row', muscle: 'back', equipment: 'dumbbell', level: 'advanced', type: 'compound', muscleTargets: ['Dos', 'Lats', 'Grip'], tips: 'Rowing haltère lourd avec straps. High reps explosifs. Développe masse et grip.' },
    { id: 'single-arm-cable-row', name: 'Rowing Poulie Unilatéral', muscle: 'back', equipment: 'cable', level: 'beginner', type: 'compound', muscleTargets: ['Dos', 'Lats'], tips: 'Un bras à la fois. Rotation contrôlée du torse. Amplitude maximale.' },
    { id: 'lat-pulldown-reverse', name: 'Tirage Vertical Prise Inversée', muscle: 'back', equipment: 'cable', level: 'beginner', type: 'compound', muscleTargets: ['Lats', 'Biceps'], tips: 'Prise supination. Recrute plus les biceps. Amplitude complète.' },
    { id: 'wide-grip-pulldown', name: 'Tirage Large', muscle: 'back', equipment: 'cable', level: 'beginner', type: 'compound', muscleTargets: ['Lats largeur'], tips: 'Prise large. Cible la largeur du dos. Tirez vers la poitrine.' },
    { id: 'neutral-grip-pullup', name: 'Traction Prise Neutre', muscle: 'back', equipment: 'bodyweight', level: 'intermediate', type: 'compound', muscleTargets: ['Dos', 'Biceps'], tips: 'Paumes face à face. Position naturelle des poignets. Recrute bien le brachial.' },
    { id: 'assisted-pullup', name: 'Traction Assistée Machine', muscle: 'back', equipment: 'machine', level: 'beginner', type: 'compound', muscleTargets: ['Dos', 'Biceps'], tips: 'Machine à contrepoids. Progressez en réduisant l\'assistance.' },
    { id: 'inverted-row', name: 'Rowing Inversé (Australian Pull-up)', muscle: 'back', equipment: 'bodyweight', level: 'beginner', type: 'compound', muscleTargets: ['Dos', 'Biceps'], tips: 'Sous une barre basse. Corps droit. Excellent pour débutants.' },
    { id: 'rack-pull', name: 'Rack Pull', muscle: 'back', equipment: 'barbell', level: 'intermediate', type: 'compound', muscleTargets: ['Dos', 'Trapèzes', 'Érecteurs'], tips: 'Soulevé de terre partiel. Charge plus lourde. Développe le haut du dos.' },
    { id: 'block-pull', name: 'Block Pull', muscle: 'back', equipment: 'barbell', level: 'intermediate', type: 'compound', muscleTargets: ['Dos complet'], tips: 'Soulevé de terre surélevé. Travaille le lockout. Alternative au rack pull.' },

    // --- ÉPAULES (Compléments) ---
    { id: 'arnold-press', name: 'Arnold Press', muscle: 'shoulders', equipment: 'dumbbell', level: 'intermediate', type: 'compound', muscleTargets: ['Épaules complètes'], tips: 'Rotation pendant le mouvement. Sollicite les 3 faisceaux. Mouvement iconique d\'Arnold.' },
    { id: 'z-press', name: 'Z Press', muscle: 'shoulders', equipment: 'barbell', level: 'advanced', type: 'compound', muscleTargets: ['Épaules', 'Core'], tips: 'Assis au sol jambes tendues. Élimine la compensation du bas du corps. Excellent pour le core.' },
    { id: 'push-press', name: 'Push Press', muscle: 'shoulders', equipment: 'barbell', level: 'intermediate', type: 'compound', muscleTargets: ['Épaules', 'Triceps', 'Jambes'], tips: 'Légère impulsion des jambes. Permet plus de charge. Mouvement fonctionnel.' },
    { id: 'strict-press', name: 'Développé Militaire Strict', muscle: 'shoulders', equipment: 'barbell', level: 'intermediate', type: 'compound', muscleTargets: ['Épaules', 'Triceps'], tips: 'Debout, sans élan. Force pure des épaules. Gainage abdominal important.' },
    { id: 'behind-neck-press', name: 'Développé Nuque', muscle: 'shoulders', equipment: 'barbell', level: 'advanced', type: 'compound', muscleTargets: ['Épaules'], tips: 'Attention mobilité requise. Cible bien le deltoïde moyen. Évitez si problèmes d\'épaule.' },
    { id: 'single-arm-db-press', name: 'Développé Unilatéral Haltère', muscle: 'shoulders', equipment: 'dumbbell', level: 'beginner', type: 'compound', muscleTargets: ['Épaules', 'Core'], tips: 'Un bras à la fois. Travail du core anti-rotation. Corrige les déséquilibres.' },
    { id: 'machine-shoulder-press', name: 'Développé Épaules Machine', muscle: 'shoulders', equipment: 'machine', level: 'beginner', type: 'compound', muscleTargets: ['Épaules'], tips: 'Trajectoire guidée et sécurisée. Idéal pour débutants ou finisher.' },
    { id: 'cable-lateral-raise', name: 'Élévation Latérale Poulie', muscle: 'shoulders', equipment: 'cable', level: 'beginner', type: 'isolation', muscleTargets: ['Deltoïde latéral'], tips: 'Tension constante. Un bras à la fois. Contrôle maximum.' },
    { id: 'leaning-lateral-raise', name: 'Élévation Latérale Inclinée', muscle: 'shoulders', equipment: 'dumbbell', level: 'intermediate', type: 'isolation', muscleTargets: ['Deltoïde latéral'], tips: 'Penché en tenant un poteau. Amplitude accrue. Étirement maximal.' },
    { id: 'front-raise', name: 'Élévation Frontale', muscle: 'shoulders', equipment: 'dumbbell', level: 'beginner', type: 'isolation', muscleTargets: ['Deltoïde antérieur'], tips: 'Bras devant, jusqu\'à parallèle. Alterner ou simultané. Évitez de balancer.' },
    { id: 'front-raise-plate', name: 'Élévation Frontale Disque', muscle: 'shoulders', equipment: 'plate', level: 'beginner', type: 'isolation', muscleTargets: ['Deltoïde antérieur'], tips: 'Tenez un disque. Montée jusqu\'aux yeux. Gardez les bras quasi tendus.' },
    { id: 'face-pull', name: 'Face Pull', muscle: 'rear-delts', equipment: 'cable', level: 'beginner', type: 'isolation', muscleTargets: ['Deltoïde postérieur', 'Trapèzes'], tips: 'Tirez vers le visage. Coudes hauts. Rotation externe en fin de mouvement. Essentiel pour la santé des épaules.' },
    { id: 'reverse-pec-deck', name: 'Reverse Pec Deck', muscle: 'rear-delts', equipment: 'machine', level: 'beginner', type: 'isolation', muscleTargets: ['Deltoïde postérieur'], tips: 'Face à la machine. Ouvrez les bras. Trajectoire guidée.' },
    { id: 'bent-over-rear-delt-fly', name: 'Oiseau Penché', muscle: 'rear-delts', equipment: 'dumbbell', level: 'beginner', type: 'isolation', muscleTargets: ['Deltoïde postérieur'], tips: 'Penché à 90°. Ouvrez les bras. Gardez les coudes légèrement fléchis.' },
    { id: 'cable-rear-delt-fly', name: 'Oiseau Poulie', muscle: 'rear-delts', equipment: 'cable', level: 'beginner', type: 'isolation', muscleTargets: ['Deltoïde postérieur'], tips: 'Poulies croisées. Tirez vers l\'arrière. Tension constante.' },
    { id: 'lu-raise', name: 'Lu Raise', muscle: 'shoulders', equipment: 'dumbbell', level: 'intermediate', type: 'isolation', muscleTargets: ['Deltoïde complet'], tips: 'Élévation latérale jusqu\'en haut de la tête. Popularisé par Lu Xiaojun. Full ROM.' },
    { id: 'upright-row-wide', name: 'Rowing Vertical Large', muscle: 'shoulders', equipment: 'barbell', level: 'intermediate', type: 'compound', muscleTargets: ['Deltoïdes', 'Trapèzes'], tips: 'Prise large. Coudes vers l\'extérieur. Plus sûr pour les épaules que la version étroite.' },

    // --- BICEPS (Compléments) ---
    { id: 'ez-bar-curl', name: 'Curl Barre EZ', muscle: 'biceps', equipment: 'barbell', level: 'beginner', type: 'isolation', muscleTargets: ['Biceps'], tips: 'Barre EZ pour les poignets. Position naturelle. Moins de stress articulaire.' },
    { id: 'preacher-curl', name: 'Curl Pupitre (Larry Scott)', muscle: 'biceps', equipment: 'barbell', level: 'beginner', type: 'isolation', muscleTargets: ['Biceps'], tips: 'Bras sur pupitre incliné. Élimine la triche. Isolation maximale.' },
    { id: 'preacher-curl-db', name: 'Curl Pupitre Haltère', muscle: 'biceps', equipment: 'dumbbell', level: 'beginner', type: 'isolation', muscleTargets: ['Biceps'], tips: 'Version unilatérale. Concentration accrue. Corrige les déséquilibres.' },
    { id: 'concentration-curl', name: 'Curl Concentration', muscle: 'biceps', equipment: 'dumbbell', level: 'beginner', type: 'isolation', muscleTargets: ['Biceps pic'], tips: 'Coude contre la cuisse. Mouvement isolé. Excellent pour le pic du biceps.' },
    { id: 'incline-curl', name: 'Curl Incliné', muscle: 'biceps', equipment: 'dumbbell', level: 'beginner', type: 'isolation', muscleTargets: ['Biceps longue portion'], tips: 'Sur banc incliné. Étirement maximal du biceps. Développe la longue portion.' },
    { id: 'spider-curl', name: 'Spider Curl', muscle: 'biceps', equipment: 'dumbbell', level: 'intermediate', type: 'isolation', muscleTargets: ['Biceps'], tips: 'Penché sur banc incliné, bras pendants. Tension constante. Pas de triche possible.' },
    { id: 'cable-curl', name: 'Curl Poulie Basse', muscle: 'biceps', equipment: 'cable', level: 'beginner', type: 'isolation', muscleTargets: ['Biceps'], tips: 'Tension constante. Gardez les coudes fixes. Variez les poignées.' },
    { id: 'drag-curl', name: 'Drag Curl', muscle: 'biceps', equipment: 'barbell', level: 'intermediate', type: 'isolation', muscleTargets: ['Biceps'], tips: 'Tirez la barre le long du corps. Coudes vers l\'arrière. Cible différemment le biceps.' },
    { id: 'zottman-curl', name: 'Zottman Curl', muscle: 'biceps', equipment: 'dumbbell', level: 'intermediate', type: 'isolation', muscleTargets: ['Biceps', 'Avant-bras'], tips: 'Montée en supination, descente en pronation. Travaille biceps et avant-bras.' },
    { id: 'bayesian-curl', name: 'Bayesian Curl', muscle: 'biceps', equipment: 'cable', level: 'intermediate', type: 'isolation', muscleTargets: ['Biceps longue portion'], tips: 'Poulie derrière vous. Étirement maximal. Excellent pour la longue portion.' },
    { id: 'cross-body-curl', name: 'Curl Cross-Body', muscle: 'biceps', equipment: 'dumbbell', level: 'beginner', type: 'isolation', muscleTargets: ['Biceps', 'Brachial'], tips: 'Curl vers l\'épaule opposée. Cible le brachial et biceps externe.' },

    // --- TRICEPS (Compléments) ---
    { id: 'dips-triceps', name: 'Dips (Triceps)', muscle: 'triceps', equipment: 'bodyweight', level: 'intermediate', type: 'compound', muscleTargets: ['Triceps', 'Pectoraux'], tips: 'Buste droit, coudes serrés. Cible les triceps. Descendez jusqu\'à 90°.' },
    { id: 'skull-crusher', name: 'Skull Crusher / Barre au Front', muscle: 'triceps', equipment: 'barbell', level: 'intermediate', type: 'isolation', muscleTargets: ['Triceps'], tips: 'Allongé, barre vers le front. Coudes fixes. Contrôlez la descente!' },
    { id: 'skull-crusher-db', name: 'Skull Crusher Haltères', muscle: 'triceps', equipment: 'dumbbell', level: 'intermediate', type: 'isolation', muscleTargets: ['Triceps'], tips: 'Version haltères. Amplitude plus naturelle. Moins de stress sur les coudes.' },
    { id: 'overhead-triceps', name: 'Extension Triceps au-dessus Tête', muscle: 'triceps', equipment: 'dumbbell', level: 'beginner', type: 'isolation', muscleTargets: ['Triceps longue portion'], tips: 'Haltère derrière la tête. Étire la longue portion. Gardez les coudes fixes.' },
    { id: 'overhead-triceps-cable', name: 'Extension Triceps Poulie Haute', muscle: 'triceps', equipment: 'cable', level: 'beginner', type: 'isolation', muscleTargets: ['Triceps longue portion'], tips: 'Dos à la poulie. Extension au-dessus de la tête. Tension constante.' },
    { id: 'triceps-kickback', name: 'Kickback Triceps', muscle: 'triceps', equipment: 'dumbbell', level: 'beginner', type: 'isolation', muscleTargets: ['Triceps'], tips: 'Penché, étendez le bras vers l\'arrière. Gardez le coude fixe. Contrôlez.' },
    { id: 'triceps-rope-pushdown', name: 'Extension Corde Poulie', muscle: 'triceps', equipment: 'cable', level: 'beginner', type: 'isolation', muscleTargets: ['Triceps'], tips: 'Tirez la corde vers le bas et écartez en bas. Contraction maximale.' },
    { id: 'reverse-grip-pushdown', name: 'Extension Poulie Prise Inversée', muscle: 'triceps', equipment: 'cable', level: 'beginner', type: 'isolation', muscleTargets: ['Triceps'], tips: 'Paume vers le haut. Cible différemment les triceps. Gardez les coudes au corps.' },
    { id: 'bench-dips', name: 'Dips sur Banc', muscle: 'triceps', equipment: 'bodyweight', level: 'beginner', type: 'compound', muscleTargets: ['Triceps'], tips: 'Mains sur banc, pieds au sol. Version débutant des dips. Gardez le dos près du banc.' },
    { id: 'diamond-push-ups', name: 'Pompes Diamant', muscle: 'triceps', equipment: 'bodyweight', level: 'intermediate', type: 'compound', muscleTargets: ['Triceps', 'Pectoraux'], tips: 'Mains en forme de diamant. Cible les triceps. Coudes le long du corps.' },
    { id: 'jm-press', name: 'JM Press', muscle: 'triceps', equipment: 'barbell', level: 'advanced', type: 'compound', muscleTargets: ['Triceps'], tips: 'Hybride skull crusher et close grip. Barre vers la gorge. Avancé.' },

    // --- QUADRICEPS (Compléments) ---
    { id: 'front-squat', name: 'Squat Avant', muscle: 'quads', equipment: 'barbell', level: 'intermediate', type: 'compound', muscleTargets: ['Quadriceps', 'Core'], tips: 'Barre devant, sur les deltoïdes. Buste très droit. Cible plus les quadriceps.' },
    { id: 'goblet-squat', name: 'Goblet Squat', muscle: 'quads', equipment: 'dumbbell', level: 'beginner', type: 'compound', muscleTargets: ['Quadriceps', 'Fessiers'], tips: 'Haltère contre la poitrine. Excellent pour apprendre le squat. Garde le buste droit.' },
    { id: 'hack-squat', name: 'Hack Squat Machine', muscle: 'quads', equipment: 'machine', level: 'beginner', type: 'compound', muscleTargets: ['Quadriceps'], tips: 'Machine guidée. Charge les quadriceps. Pieds bas pour plus de quads.' },
    { id: 'sissy-squat', name: 'Sissy Squat', muscle: 'quads', equipment: 'bodyweight', level: 'advanced', type: 'isolation', muscleTargets: ['Quadriceps'], tips: 'Sur la pointe des pieds, penchez-vous en arrière. Isolation extrême des quads.' },
    { id: 'leg-extension', name: 'Leg Extension', muscle: 'quads', equipment: 'machine', level: 'beginner', type: 'isolation', muscleTargets: ['Quadriceps'], tips: 'Isolation pure des quadriceps. Contrôlez la phase négative. Ne verrouillez pas les genoux.' },
    { id: 'pendulum-squat', name: 'Pendulum Squat', muscle: 'quads', equipment: 'machine', level: 'intermediate', type: 'compound', muscleTargets: ['Quadriceps'], tips: 'Machine à arc de cercle. Trajectoire naturelle. Excellent pour les quads.' },
    { id: 'belt-squat', name: 'Belt Squat', muscle: 'quads', equipment: 'machine', level: 'intermediate', type: 'compound', muscleTargets: ['Quadriceps', 'Fessiers'], tips: 'Charge sur la ceinture. Épargne le dos. Excellent pour volume de jambes.' },
    { id: 'smith-squat', name: 'Squat Smith Machine', muscle: 'quads', equipment: 'smith', level: 'beginner', type: 'compound', muscleTargets: ['Quadriceps'], tips: 'Guidé par le rail. Pieds avancés pour les quads. Sécuritaire seul.' },
    { id: 'split-squat', name: 'Split Squat', muscle: 'quads', equipment: 'bodyweight', level: 'beginner', type: 'compound', muscleTargets: ['Quadriceps', 'Fessiers'], tips: 'Un pied devant, un derrière. Descendez le genou arrière. Base pour les fentes.' },

    // --- ISCHIO-JAMBIERS (Compléments) ---
    { id: 'romanian-deadlift', name: 'Soulevé de Terre Roumain', muscle: 'hamstrings', equipment: 'barbell', level: 'intermediate', type: 'compound', muscleTargets: ['Ischio-jambiers', 'Fessiers'], tips: 'Jambes quasi tendues. Étirement des ischio. Barre proche des jambes.' },
    { id: 'romanian-deadlift-db', name: 'Soulevé Roumain Haltères', muscle: 'hamstrings', equipment: 'dumbbell', level: 'beginner', type: 'compound', muscleTargets: ['Ischio-jambiers', 'Fessiers'], tips: 'Version haltères. Même principe. Plus de liberté de mouvement.' },
    { id: 'stiff-leg-deadlift', name: 'Soulevé Jambes Tendues', muscle: 'hamstrings', equipment: 'barbell', level: 'intermediate', type: 'compound', muscleTargets: ['Ischio-jambiers'], tips: 'Jambes vraiment tendues. Attention au dos. Étirement maximal.' },
    { id: 'good-morning', name: 'Good Morning', muscle: 'hamstrings', equipment: 'barbell', level: 'intermediate', type: 'compound', muscleTargets: ['Ischio-jambiers', 'Érecteurs'], tips: 'Barre sur les trapèzes, penchez-vous. Excellent pour la chaîne postérieure.' },
    { id: 'leg-curl-lying', name: 'Leg Curl Couché', muscle: 'hamstrings', equipment: 'machine', level: 'beginner', type: 'isolation', muscleTargets: ['Ischio-jambiers'], tips: 'Allongé face contre le banc. Enroulez les talons vers les fesses.' },
    { id: 'leg-curl-seated', name: 'Leg Curl Assis', muscle: 'hamstrings', equipment: 'machine', level: 'beginner', type: 'isolation', muscleTargets: ['Ischio-jambiers'], tips: 'Position assise. Ischio en position étirée. Bon stretch.' },
    { id: 'nordic-curl', name: 'Nordic Curl', muscle: 'hamstrings', equipment: 'bodyweight', level: 'advanced', type: 'isolation', muscleTargets: ['Ischio-jambiers'], tips: 'À genoux, descendez lentement avec contrôle. Très exigeant. Excellent pour la prévention des blessures.' },
    { id: 'glute-ham-raise', name: 'Glute Ham Raise (GHR)', muscle: 'hamstrings', equipment: 'machine', level: 'advanced', type: 'compound', muscleTargets: ['Ischio-jambiers', 'Fessiers'], tips: 'Machine GHD. Montez avec les ischio. Mouvement complet de la chaîne postérieure.' },
    { id: 'single-leg-rdl', name: 'RDL Unilatéral', muscle: 'hamstrings', equipment: 'dumbbell', level: 'intermediate', type: 'compound', muscleTargets: ['Ischio-jambiers', 'Équilibre'], tips: 'Sur une jambe. Travaille l\'équilibre et les ischio. Corrige les déséquilibres.' },

    // --- FESSIERS (Compléments) ---
    { id: 'hip-thrust-smith', name: 'Hip Thrust Smith Machine', muscle: 'glutes', equipment: 'smith', level: 'beginner', type: 'compound', muscleTargets: ['Fessiers'], tips: 'Version guidée. Permet plus de charge. Focus sur la contraction en haut.' },
    { id: 'glute-bridge', name: 'Glute Bridge', muscle: 'glutes', equipment: 'bodyweight', level: 'beginner', type: 'isolation', muscleTargets: ['Fessiers'], tips: 'Dos au sol, montez les hanches. Version de base du hip thrust.' },
    { id: 'single-leg-glute-bridge', name: 'Glute Bridge Unilatéral', muscle: 'glutes', equipment: 'bodyweight', level: 'intermediate', type: 'isolation', muscleTargets: ['Fessiers'], tips: 'Une jambe tendue. Excellent pour corriger les déséquilibres.' },
    { id: 'cable-kickback', name: 'Kickback Poulie', muscle: 'glutes', equipment: 'cable', level: 'beginner', type: 'isolation', muscleTargets: ['Fessiers'], tips: 'Tirez la jambe vers l\'arrière. Tension constante. Excellent pour l\'isolation.' },
    { id: 'cable-pull-through', name: 'Pull Through Poulie', muscle: 'glutes', equipment: 'cable', level: 'beginner', type: 'compound', muscleTargets: ['Fessiers', 'Ischio-jambiers'], tips: 'Tirez entre les jambes. Même pattern que le hip hinge. Excellent finisher.' },
    { id: 'hip-abduction-machine', name: 'Abduction Machine', muscle: 'glutes', equipment: 'machine', level: 'beginner', type: 'isolation', muscleTargets: ['Fessiers (moyen)'], tips: 'Écartez les jambes contre la résistance. Cible le moyen fessier.' },
    { id: 'sumo-deadlift', name: 'Soulevé de Terre Sumo', muscle: 'glutes', equipment: 'barbell', level: 'intermediate', type: 'compound', muscleTargets: ['Fessiers', 'Adducteurs', 'Quadriceps'], tips: 'Position large, pieds écartés. Plus de fessiers et adducteurs que le conventionnel.' },
    { id: 'step-up', name: 'Step-Up', muscle: 'glutes', equipment: 'dumbbell', level: 'beginner', type: 'compound', muscleTargets: ['Fessiers', 'Quadriceps'], tips: 'Montez sur un banc. Poussez avec le talon. Ne pas pousser avec la jambe arrière.' },
    { id: 'reverse-lunge', name: 'Fente Arrière', muscle: 'glutes', equipment: 'dumbbell', level: 'beginner', type: 'compound', muscleTargets: ['Fessiers', 'Quadriceps'], tips: 'Reculez en fente. Moins de stress sur les genoux que la fente avant.' },

    // --- MOLLETS (Compléments) ---
    { id: 'seated-calf-raise', name: 'Mollets Assis', muscle: 'calves', equipment: 'machine', level: 'beginner', type: 'isolation', muscleTargets: ['Soléaire'], tips: 'Genoux à 90°. Cible le soléaire. Amplitude complète.' },
    { id: 'standing-calf-raise', name: 'Mollets Debout Machine', muscle: 'calves', equipment: 'machine', level: 'beginner', type: 'isolation', muscleTargets: ['Gastrocnémiens'], tips: 'Jambes tendues. Cible les jumeaux. Montez sur la pointe.' },
    { id: 'donkey-calf-raise', name: 'Mollets Donkey', muscle: 'calves', equipment: 'machine', level: 'intermediate', type: 'isolation', muscleTargets: ['Mollets'], tips: 'Penché à 90°. Classique d\'Arnold. Étirement profond.' },
    { id: 'single-leg-calf-raise', name: 'Mollet Unilatéral', muscle: 'calves', equipment: 'bodyweight', level: 'beginner', type: 'isolation', muscleTargets: ['Mollets'], tips: 'Un pied à la fois. Corrige les déséquilibres. Amplitude maximale.' },
    { id: 'leg-press-calf-raise', name: 'Mollets Presse', muscle: 'calves', equipment: 'machine', level: 'beginner', type: 'isolation', muscleTargets: ['Mollets'], tips: 'Sur la presse à cuisses. Pieds en bas de la plateforme. Pointe des pieds seulement.' },

    // --- TRAPÈZES (Compléments) ---
    { id: 'barbell-shrug', name: 'Shrug Barre', muscle: 'traps', equipment: 'barbell', level: 'beginner', type: 'isolation', muscleTargets: ['Trapèzes sup.'], tips: 'Haussez les épaules vers les oreilles. Ne roulez pas. Contraction 1-2 sec.' },
    { id: 'dumbbell-shrug', name: 'Shrug Haltères', muscle: 'traps', equipment: 'dumbbell', level: 'beginner', type: 'isolation', muscleTargets: ['Trapèzes sup.'], tips: 'Haltères sur les côtés. Plus d\'amplitude. Montée verticale.' },
    { id: 'trap-bar-shrug', name: 'Shrug Trap Bar', muscle: 'traps', equipment: 'barbell', level: 'beginner', type: 'isolation', muscleTargets: ['Trapèzes sup.'], tips: 'Barre hexagonale. Position naturelle des mains. Permet plus de charge.' },
    { id: 'upright-row', name: 'Rowing Vertical', muscle: 'traps', equipment: 'barbell', level: 'intermediate', type: 'compound', muscleTargets: ['Trapèzes', 'Deltoïdes'], tips: 'Tirez vers le menton. Coudes hauts. Attention aux épaules sensibles.' },
    { id: 'cable-shrug', name: 'Shrug Poulie', muscle: 'traps', equipment: 'cable', level: 'beginner', type: 'isolation', muscleTargets: ['Trapèzes'], tips: 'Tension constante. Excellent pour le contrôle.' },
    { id: 'farmers-walk', name: 'Farmer\'s Walk', muscle: 'traps', equipment: 'dumbbell', level: 'intermediate', type: 'compound', muscleTargets: ['Trapèzes', 'Grip', 'Core'], tips: 'Marchez avec charges lourdes. Travail fonctionnel complet. Renforce le grip.' },

    // --- ABDOMINAUX (Compléments) ---
    { id: 'pallof-press', name: 'Pallof Press', muscle: 'abs', equipment: 'cable', level: 'beginner', type: 'isolation', muscleTargets: ['Core anti-rotation'], tips: 'Résistez à la rotation. Excellent pour le core fonctionnel.' },
    { id: 'woodchop', name: 'Wood Chop', muscle: 'abs', equipment: 'cable', level: 'intermediate', type: 'compound', muscleTargets: ['Obliques', 'Core'], tips: 'Mouvement diagonal. Rotation contrôlée. Excellent pour les sports de rotation.' },
    { id: 'reverse-crunch', name: 'Crunch Inversé', muscle: 'abs', equipment: 'bodyweight', level: 'beginner', type: 'isolation', muscleTargets: ['Abdominaux inf.'], tips: 'Ramenez les genoux vers la poitrine. Décollez le bassin du sol.' },
    { id: 'dragon-flag', name: 'Dragon Flag', muscle: 'abs', equipment: 'bodyweight', level: 'advanced', type: 'isolation', muscleTargets: ['Abdominaux', 'Core'], tips: 'Exercice de Bruce Lee. Corps rigide. Très avancé. Progressez lentement.' },
    { id: 'toe-touch', name: 'Toe Touch', muscle: 'abs', equipment: 'bodyweight', level: 'beginner', type: 'isolation', muscleTargets: ['Abdominaux'], tips: 'Allongé, jambes verticales. Touchez les orteils. Crunch vertical.' },
    { id: 'bicycle-crunch', name: 'Crunch Vélo', muscle: 'abs', equipment: 'bodyweight', level: 'beginner', type: 'isolation', muscleTargets: ['Obliques', 'Abdominaux'], tips: 'Mouvement pédalant. Coude vers genou opposé. Ne tirez pas sur la nuque.' },
    { id: 'hollow-body-hold', name: 'Hollow Body Hold', muscle: 'abs', equipment: 'bodyweight', level: 'intermediate', type: 'isolation', muscleTargets: ['Core complet'], tips: 'Position de gymnaste. Dos plaqué au sol. Bras et jambes tendus.' },
    { id: 'bird-dog', name: 'Bird Dog', muscle: 'abs', equipment: 'bodyweight', level: 'beginner', type: 'isolation', muscleTargets: ['Core', 'Stabilité'], tips: 'À quatre pattes. Bras et jambe opposés. Excellent pour la stabilité.' },
    { id: 'farmers-carry', name: 'Farmer\'s Carry', muscle: 'abs', equipment: 'dumbbell', level: 'beginner', type: 'compound', muscleTargets: ['Core', 'Full body'], tips: 'Marchez avec charges. Gardez le buste droit. Travail fonctionnel.' },
    { id: 'suitcase-carry', name: 'Suitcase Carry', muscle: 'abs', equipment: 'dumbbell', level: 'intermediate', type: 'compound', muscleTargets: ['Obliques', 'Core'], tips: 'Charge d\'un seul côté. Anti-flexion latérale. Excellent pour les obliques.' }
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

// ==================== PARAMÈTRES OPTIMAUX PAR TYPE D'EXERCICE ====================
// Utilisé pour adapter automatiquement sets/reps lors du swap d'exercice

const EXERCISE_TYPE_PARAMS = {
    compound: {
        strength:    { sets: 4, reps: '4-6',   rest: 180, repsMin: 4,  repsMax: 6  },
        hypertrophy: { sets: 4, reps: '8-10',  rest: 120, repsMin: 8,  repsMax: 10 },
        endurance:   { sets: 3, reps: '12-15', rest: 60,  repsMin: 12, repsMax: 15 }
    },
    isolation: {
        strength:    { sets: 3, reps: '6-8',   rest: 120, repsMin: 6,  repsMax: 8  },
        hypertrophy: { sets: 3, reps: '10-12', rest: 90,  repsMin: 10, repsMax: 12 },
        endurance:   { sets: 3, reps: '15-20', rest: 45,  repsMin: 15, repsMax: 20 }
    }
};

// Exercices explicitement d'isolation (IDs)
const ISOLATION_EXERCISES = [
    // Biceps - tous sont isolation
    'barbell-curl', 'ez-curl', 'dumbbell-curl', 'alternating-curl', 'hammer-curl',
    'incline-curl', 'concentration-curl', 'preacher-curl', 'preacher-curl-db',
    'cable-curl', 'cable-curl-high', 'machine-curl', 'spider-curl', 'drag-curl',
    // Triceps - extensions
    'tricep-pushdown', 'tricep-pushdown-rope', 'tricep-pushdown-vbar',
    'overhead-tricep', 'overhead-tricep-db', 'skull-crusher', 'skull-crusher-db',
    'kickback', 'kickback-cable', 'tricep-machine',
    // Épaules - élévations et isolation
    'lateral-raise', 'lateral-raise-cable', 'lateral-raise-machine',
    'front-raise', 'front-raise-cable', 'front-raise-plate',
    'face-pull', 'reverse-fly', 'reverse-fly-machine', 'reverse-fly-cable', 'rear-delt-row',
    // Pectoraux - isolation
    'chest-fly-db', 'chest-fly-cable', 'cable-crossover', 'pec-deck', 'pullover',
    // Quadriceps - isolation
    'leg-extension',
    // Ischio-jambiers - isolation
    'leg-curl-lying', 'leg-curl-seated', 'leg-curl-standing', 'nordic-curl',
    // Fessiers - isolation
    'cable-kickback', 'glute-kickback-machine', 'glute-bridge', 'frog-pump', 'abductor-machine',
    // Mollets - tous sont isolation
    'standing-calf', 'standing-calf-smith', 'seated-calf', 'leg-press-calf', 'donkey-calf', 'single-leg-calf',
    // Trapèzes - shrugs
    'barbell-shrug', 'dumbbell-shrug', 'smith-shrug', 'trap-bar-shrug', 'cable-shrug',
    // Abdominaux - isolation
    'crunch', 'crunch-machine', 'cable-crunch', 'leg-raise', 'hanging-leg-raise',
    'russian-twist', 'ab-wheel', 'decline-crunch',
    // Avant-bras
    'wrist-curl', 'reverse-wrist-curl', 'reverse-curl',
    // Dos - isolation
    'pullover-cable', 'straight-arm-pulldown', 'hyperextension'
];

/**
 * Récupère le type d'un exercice (compound ou isolation)
 * Utilise d'abord le type explicite, puis la liste d'isolation, puis défaut à compound
 * @param {string} exerciseId - ID de l'exercice
 * @returns {string} - 'compound' ou 'isolation'
 */
function getExerciseType(exerciseId) {
    const exercise = defaultExercises.find(e => e.id === exerciseId);
    
    // Si le type est explicitement défini, l'utiliser
    if (exercise?.type) {
        return exercise.type;
    }
    
    // Sinon, vérifier dans la liste d'isolation
    if (ISOLATION_EXERCISES.includes(exerciseId)) {
        return 'isolation';
    }
    
    // Par défaut, c'est un exercice composé
    return 'compound';
}

/**
 * Récupère les paramètres suggérés pour un exercice selon son type et l'objectif
 * @param {string} exerciseId - ID de l'exercice
 * @param {string} goal - Objectif ('strength', 'hypertrophy', 'endurance')
 * @returns {Object} - { sets, reps, rest, repsMin, repsMax }
 */
function getSuggestedParams(exerciseId, goal = 'hypertrophy') {
    const type = getExerciseType(exerciseId);
    const validGoal = ['strength', 'hypertrophy', 'endurance'].includes(goal) ? goal : 'hypertrophy';
    return EXERCISE_TYPE_PARAMS[type][validGoal];
}

/**
 * Détermine si le type d'exercice change lors d'un swap
 * @param {string} originalId - ID de l'exercice original
 * @param {string} newId - ID du nouvel exercice
 * @returns {Object} - { changed: boolean, from: string, to: string }
 */
function detectTypeChange(originalId, newId) {
    const originalType = getExerciseType(originalId);
    const newType = getExerciseType(newId);
    return {
        changed: originalType !== newType,
        from: originalType,
        to: newType
    };
}

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
 * Structure: { equivalents: [], sameMuscle: [], allExercises: [] }
 * - equivalents: exercices du même pattern de mouvement (prioritaires)
 * - sameMuscle: autres exercices du même muscle (non inclus dans equivalents)
 * - allExercises: tous les exercices (pour la recherche)
 * @param {string} exerciseId - ID de l'exercice à remplacer
 * @param {string[]} favoriteExercises - Liste des IDs des exercices favoris
 * @returns {Object} - { equivalents: [], sameMuscle: [], allExercises: [] }
 */
function getEquivalentExercises(exerciseId, favoriteExercises = []) {
    const currentExercise = defaultExercises.find(e => e.id === exerciseId);
    if (!currentExercise) {
        return { equivalents: [], sameMuscle: [], allExercises: [] };
    }
    
    const group = findExerciseGroup(exerciseId);
    let equivalents = [];
    let equivalentIds = [];
    
    // 1. Exercices équivalents (même pattern de mouvement)
    if (group) {
        equivalentIds = exerciseEquivalents[group].filter(id => id !== exerciseId);
        
        equivalents = equivalentIds
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
    }
    
    // 2. Autres exercices du même muscle (exclure l'exercice actuel et les équivalents)
    const sameMuscle = defaultExercises
        .filter(e => 
            e.muscle === currentExercise.muscle && 
            e.id !== exerciseId && 
            !equivalentIds.includes(e.id)
        )
        .map(e => ({
            ...e,
            isFavorite: favoriteExercises.includes(e.id)
        }))
        .sort((a, b) => {
            if (a.isFavorite && !b.isFavorite) return -1;
            if (!a.isFavorite && b.isFavorite) return 1;
            return 0;
        });
    
    // 3. Tous les autres exercices (pour la recherche libre)
    const allExercises = defaultExercises
        .filter(e => e.id !== exerciseId)
        .map(e => ({
            ...e,
            isFavorite: favoriteExercises.includes(e.id)
        }))
        .sort((a, b) => {
            // Même muscle d'abord, puis par nom
            if (a.muscle === currentExercise.muscle && b.muscle !== currentExercise.muscle) return -1;
            if (a.muscle !== currentExercise.muscle && b.muscle === currentExercise.muscle) return 1;
            return a.name.localeCompare(b.name);
        });
    
    return {
        equivalents,
        sameMuscle,
        allExercises
    };
}

/**
 * Normalise une chaîne pour la recherche (accents + ligatures)
 * @param {string} str - Chaîne à normaliser
 * @returns {string} - Chaîne normalisée
 */
function normalizeSearchString(str) {
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
        .replace(/œ/g, 'oe')             // Ligature œ → oe
        .replace(/æ/g, 'ae');            // Ligature æ → ae
}

/**
 * Recherche des exercices par nom (pour le swap)
 * @param {string} query - Terme de recherche
 * @param {string} excludeId - ID de l'exercice à exclure
 * @param {string[]} favoriteExercises - Liste des IDs des exercices favoris
 * @returns {Object[]} - Liste des exercices correspondants
 */
function searchExercises(query, excludeId = null, favoriteExercises = []) {
    if (!query || query.length < 2) return [];
    
    const normalizedQuery = normalizeSearchString(query);
    
    return defaultExercises
        .filter(e => {
            if (excludeId && e.id === excludeId) return false;
            
            const normalizedName = normalizeSearchString(e.name);
            const normalizedMuscle = normalizeSearchString(muscleGroups[e.muscle]?.name || e.muscle);
            
            return normalizedName.includes(normalizedQuery) || normalizedMuscle.includes(normalizedQuery);
        })
        .map(e => ({
            ...e,
            isFavorite: favoriteExercises.includes(e.id)
        }))
        .sort((a, b) => {
            // Favoris d'abord
            if (a.isFavorite && !b.isFavorite) return -1;
            if (!a.isFavorite && b.isFavorite) return 1;
            return a.name.localeCompare(b.name);
        })
        .slice(0, 15); // Limiter à 15 résultats
}

// ==================== EXERCISE IMAGES (SUPABASE STORAGE) ====================

// Configuration Storage pour les images d'exercices
const EXERCISE_STORAGE_URL = 'https://erszjvaajztewcukvwbj.supabase.co';
const EXERCISE_IMAGES_BUCKET = 'exercise-images';
const EXERCISE_GIFS_BUCKET = 'exercise-gifs';

// Mapping ID exercice → nom fichier image (si différent)
const exerciseImageMapping = {
    // Pectoraux
    'bench-press': 'barbell-bench-press',
    'chest-press-machine': 'converging-chest-press-machine',
    'chest-fly-cable': 'cable-chest-fly',
    
    // Dos
    'pull-ups': 'pull-ups',
    'lat-pulldown': 'lat-pulldown',
    'machine-row': 'seated-row-machine',
    'seated-cable-row': 'seated-row-machine',
    
    // Épaules
    'shoulder-press-machine': 'seated-shoulder-press-machine',
    'lateral-raise': 'dumbbell-lateral-raises',
    
    // Bras
    'dumbbell-curl': 'dumbbell-bicep-curl',
    'tricep-pushdown': 'cable-triceps-pushdown',
    
    // Jambes
    'squat': 'barbell-squat',
    'leg-press': 'leg-press-machine',
    'hip-thrust': 'hip-thrust',
    
    // Core
    'plank': 'plank-exercise',
    'crunch-machine': 'ab-crunch-machine'
};

/**
 * Génère l'URL d'une image d'exercice depuis Supabase Storage (WebP)
 * @param {string} exerciseId - ID de l'exercice
 * @returns {string} - URL de l'image ou null
 */
function getExerciseImageUrl(exerciseId) {
    if (!exerciseId) return null;
    // Utiliser le mapping si existe, sinon l'ID directement
    const imageName = exerciseImageMapping[exerciseId] || exerciseId;
    return `${EXERCISE_STORAGE_URL}/storage/v1/object/public/${EXERCISE_IMAGES_BUCKET}/${imageName}.webp`;
}

/**
 * Génère l'URL d'un GIF animé d'exercice depuis Supabase Storage
 * @param {string} exerciseId - ID de l'exercice
 * @returns {string} - URL du GIF ou null
 */
function getExerciseGifUrl(exerciseId) {
    if (!exerciseId) return null;
    // Les GIFs utilisent directement l'ID de l'exercice comme nom de fichier
    return `${EXERCISE_STORAGE_URL}/storage/v1/object/public/${EXERCISE_GIFS_BUCKET}/${exerciseId}.gif`;
}

/**
 * Vérifie si l'utilisateur préfère les animations réduites
 * @returns {boolean} - true si reduced motion est activé
 */
function shouldShowAnimatedGif() {
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Vérifie si une image existe (utile pour le fallback)
 * @param {string} url - URL de l'image
 * @returns {Promise<boolean>}
 */
async function checkImageExists(url) {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Retourne l'URL de l'image avec fallback SVG selon le muscle
 * @param {Object} exercise - Exercice
 * @returns {string} - URL finale
 */
function getExerciseImageWithFallback(exercise) {
    if (!exercise) return null;
    
    // Si l'exercice a une image définie
    if (exercise.image) {
        return exercise.image;
    }
    
    // Générer l'URL depuis le bucket
    const imageUrl = getExerciseImageUrl(exercise.id);
    
    // Retourner l'URL - le fallback sera géré côté HTML avec onerror
    return imageUrl;
}

// ==================== ADAPTATION COACH ====================

/**
 * Mapping équipement → types d'équipement autorisés
 */
const equipmentMapping = {
    'full-gym': ['barbell', 'dumbbell', 'cable', 'machine', 'smith', 'bodyweight', 'plate', 'other'],
    'home-gym': ['barbell', 'dumbbell', 'bodyweight', 'plate'],
    'dumbbells-only': ['dumbbell', 'bodyweight'],
    'bodyweight': ['bodyweight']
};

/**
 * Vérifie si un exercice est compatible avec l'équipement disponible
 * @param {Object} exercise - Exercice à vérifier
 * @param {string} userEquipment - Type d'équipement utilisateur (full-gym, home-gym, etc.)
 * @returns {boolean} - true si compatible
 */
function isCompatibleWithEquipment(exercise, userEquipment = 'full-gym') {
    if (!exercise) return false;
    const allowedEquipment = equipmentMapping[userEquipment] || equipmentMapping['full-gym'];
    return allowedEquipment.includes(exercise.equipment);
}

/**
 * Filtre une liste d'exercices pour un environnement spécifique
 * @param {Array} exercises - Liste d'exercices
 * @param {string} userEquipment - Type d'équipement (full-gym, home-gym, etc.)
 * @param {Array} sensitivities - Sensibilités utilisateur
 * @returns {Array} - Exercices filtrés et adaptés
 */
function filterExercisesForEnvironment(exercises, userEquipment = 'full-gym', sensitivities = []) {
    return exercises.map(ex => {
        // Si c'est déjà un objet exercice complet, l'utiliser directement
        const exerciseName = typeof ex === 'string' ? ex : ex.name;
        
        // Trouver l'exercice dans la base
        const exerciseData = defaultExercises.find(e => e.name === exerciseName || e.id === exerciseName);
        
        if (!exerciseData) {
            console.warn(`Exercice non trouvé: ${exerciseName}`);
            return ex;
        }
        
        // Vérifier compatibilité
        if (!isCompatibleWithEquipment(exerciseData, userEquipment) || 
            exerciseData.contraindications?.some(c => sensitivities.includes(c))) {
            // Chercher une alternative
            const alternative = findSafeExercise(exerciseName, sensitivities, userEquipment);
            if (alternative && !alternative.hasWarning) {
                return typeof ex === 'string' ? alternative.name : { ...ex, ...alternative };
            }
        }
        
        return ex;
    });
}

/**
 * Trouve une alternative sûre pour un exercice selon sensibilités et équipement
 * @param {string} exerciseName - Nom de l'exercice
 * @param {string[]} sensitivities - Sensibilités (shoulder, knee, back, wrist)
 * @param {string} equipment - Type d'équipement (full-gym, home-gym, etc.)
 * @returns {Object} - Exercice (original ou alternatif)
 */
function findSafeExercise(exerciseName, sensitivities = [], equipment = 'full-gym') {
    // Trouver l'exercice par nom
    const exercise = defaultExercises.find(e => 
        e.name === exerciseName || e.name.includes(exerciseName) || exerciseName.includes(e.name)
    );
    
    if (!exercise) return null;
    
    const allowedEquipment = equipmentMapping[equipment] || equipmentMapping['full-gym'];
    
    // Vérifier si l'exercice actuel est compatible
    const hasContraindication = exercise.contraindications?.some(c => sensitivities.includes(c));
    const hasEquipment = allowedEquipment.includes(exercise.equipment);
    
    if (!hasContraindication && hasEquipment) {
        return exercise; // Exercice OK tel quel
    }
    
    // Chercher une alternative
    const alternatives = exercise.alternatives || [];
    for (const altId of alternatives) {
        const alt = defaultExercises.find(e => e.id === altId);
        if (!alt) continue;
        
        const altHasContraindication = alt.contraindications?.some(c => sensitivities.includes(c));
        const altHasEquipment = allowedEquipment.includes(alt.equipment);
        
        if (!altHasContraindication && altHasEquipment) {
            return {
                ...alt,
                wasSwapped: true,
                originalExercise: exercise.name,
                swapReason: hasContraindication ? 'sensibilité' : 'équipement'
            };
        }
    }
    
    // Chercher dans les équivalents
    const eqResult = getEquivalentExercises(exercise.id);
    const equivalents = eqResult?.equivalents || [];
    for (const eq of equivalents) {
        const eqHasContraindication = eq.contraindications?.some(c => sensitivities.includes(c));
        const eqHasEquipment = allowedEquipment.includes(eq.equipment);
        
        if (!eqHasContraindication && eqHasEquipment) {
            return {
                ...eq,
                wasSwapped: true,
                originalExercise: exercise.name,
                swapReason: hasContraindication ? 'sensibilité' : 'équipement'
            };
        }
    }
    
    // Dernière chance: chercher n'importe quel exercice du même muscle compatible
    const sameMuscle = defaultExercises.filter(e => 
        e.muscle === exercise.muscle &&
        e.id !== exercise.id &&
        allowedEquipment.includes(e.equipment) &&
        !e.contraindications?.some(c => sensitivities.includes(c))
    );
    
    if (sameMuscle.length > 0) {
        return {
            ...sameMuscle[0],
            wasSwapped: true,
            originalExercise: exercise.name,
            swapReason: 'fallback muscle'
        };
    }
    
    // Aucune alternative trouvée, retourner l'original avec un warning
    return {
        ...exercise,
        hasWarning: true,
        warningMessage: 'Aucune alternative disponible'
    };
}

/**
 * Adapte une liste d'exercices selon le profil utilisateur
 * @param {Object[]} exercises - Liste d'exercices du programme
 * @param {Object} userProfile - Profil utilisateur (sensitivities, equipment)
 * @returns {Object[]} - Liste adaptée
 */
function adaptExercisesForUser(exercises, userProfile = {}) {
    const { sensitivities = [], equipment = 'full-gym' } = userProfile;
    
    return exercises.map(ex => {
        const adaptedExercise = findSafeExercise(ex.name, sensitivities, equipment);
        
        if (!adaptedExercise) return ex;
        
        return {
            ...ex,
            name: adaptedExercise.wasSwapped ? adaptedExercise.name : ex.name,
            originalName: adaptedExercise.wasSwapped ? adaptedExercise.originalExercise : null,
            wasSwapped: adaptedExercise.wasSwapped || false,
            swapReason: adaptedExercise.swapReason || null,
            hasWarning: adaptedExercise.hasWarning || false,
            warningMessage: adaptedExercise.warningMessage || null,
            exerciseData: adaptedExercise
        };
    });
}
