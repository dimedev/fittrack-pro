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
    { id: 'incline-bench-db', name: 'Développé Incliné Haltères', muscle: 'chest', equipment: 'dumbbell', muscleTargets: ['Pectoraux sup.', 'Épaules ant.', 'Triceps'], tips: 'Inclinaison 30-45°. Amplitude complète avec rotation naturelle des poignets.' },
    { id: 'decline-bench', name: 'Développé Décliné', muscle: 'chest', equipment: 'barbell', muscleTargets: ['Pectoraux inf.', 'Triceps'], tips: 'Cible le bas des pectoraux. Gardez les pieds bien ancrés. Contrôlez la charge.' },
    { id: 'chest-press-machine', name: 'Développé Machine Convergente', muscle: 'chest', equipment: 'machine', muscleTargets: ['Pectoraux', 'Triceps'], tips: 'Trajectoire convergente naturelle. Ajustez la hauteur du siège pour un bon alignement.' },
    { id: 'chest-press-incline-machine', name: 'Développé Incliné Machine', muscle: 'chest', equipment: 'machine', muscleTargets: ['Pectoraux sup.', 'Épaules'], tips: 'Idéal pour isoler le haut des pectoraux en sécurité. Poussez de manière explosive.' },
    { id: 'smith-bench', name: 'Développé Couché Smith', muscle: 'chest', equipment: 'smith', muscleTargets: ['Pectoraux', 'Triceps'], tips: 'Trajectoire guidée. Permet de charger plus lourd en sécurité. Descendez contrôlé.' },
    { id: 'smith-incline', name: 'Développé Incliné Smith', muscle: 'chest', equipment: 'smith', muscleTargets: ['Pectoraux sup.', 'Épaules'], tips: 'Cible le haut des pectoraux. Stabilité accrue grâce au rail guidé.' },
    { id: 'dips-chest', name: 'Dips (Pectoraux)', muscle: 'chest', equipment: 'bodyweight', muscleTargets: ['Pectoraux inf.', 'Triceps', 'Épaules'], tips: 'Penchez-vous en avant. Coudes légèrement écartés. Descendez jusqu\'à 90°.' },
    { id: 'chest-fly-db', name: 'Écartés Haltères', muscle: 'chest', equipment: 'dumbbell', muscleTargets: ['Pectoraux'], tips: 'Mouvement d\'étirement. Gardez les coudes légèrement fléchis. Contractez en haut.' },
    { id: 'chest-fly-cable', name: 'Écartés Poulie Vis-à-Vis', muscle: 'chest', equipment: 'cable', muscleTargets: ['Pectoraux'], tips: 'Tension constante grâce aux poulies. Croisez les mains en haut pour une contraction maximale.' },
    { id: 'cable-crossover', name: 'Cable Crossover', muscle: 'chest', equipment: 'cable', muscleTargets: ['Pectoraux'], tips: 'Variez la hauteur des poulies pour cibler différentes portions des pectoraux.' },
    { id: 'pec-deck', name: 'Pec Deck / Butterfly', muscle: 'chest', equipment: 'machine', muscleTargets: ['Pectoraux'], tips: 'Isolation pure des pectoraux. Contractez 1-2 secondes en position fermée.' },
    { id: 'pullover', name: 'Pull Over', muscle: 'chest', equipment: 'dumbbell', muscleTargets: ['Pectoraux', 'Dorsaux', 'Serratus'], tips: 'Amplitude maximale. Gardez les bras légèrement fléchis. Respirez profondément.' },
    { id: 'push-ups', name: 'Pompes', muscle: 'chest', equipment: 'bodyweight', muscleTargets: ['Pectoraux', 'Triceps', 'Épaules'], tips: 'Corps aligné en planche. Descendez poitrine au sol. Gainage abdominal constant.' },
    { id: 'push-ups-incline', name: 'Pompes Inclinées', muscle: 'chest', equipment: 'bodyweight', muscleTargets: ['Pectoraux inf.', 'Triceps'], tips: 'Pieds surélevés. Plus difficile que les pompes classiques. Contrôlez la descente.' },
    { id: 'push-ups-decline', name: 'Pompes Déclinées', muscle: 'chest', equipment: 'bodyweight', muscleTargets: ['Pectoraux sup.', 'Épaules'], tips: 'Mains surélevées. Version plus facile, idéale pour débuter ou finir une série.' },
    
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
    { id: 'pull-ups-weighted', name: 'Tractions Lestées', muscle: 'back', equipment: 'bodyweight', muscleTargets: ['Dorsaux', 'Biceps'], tips: 'Ajoutez du poids progressivement. Amplitude complète obligatoire. Force maximale.' },
    { id: 'chin-ups', name: 'Tractions Supination', muscle: 'back', equipment: 'bodyweight', muscleTargets: ['Dorsaux', 'Biceps'], tips: 'Prise en supination (paumes vers soi). Met l\'accent sur les biceps. Montez le menton au-dessus de la barre.' },
    { 
        id: 'lat-pulldown', 
        name: 'Tirage Vertical Poulie Haute', 
        muscle: 'back', 
        equipment: 'cable',
        muscleTargets: ['Dorsaux', 'Biceps', 'Trapèzes'],
        tips: 'Tirez vers la poitrine, pas derrière la nuque. Ressortez la poitrine. Contrôlez la remontée.'
    },
    { id: 'lat-pulldown-close', name: 'Tirage Vertical Prise Serrée', muscle: 'back', equipment: 'cable', muscleTargets: ['Dorsaux', 'Biceps'], tips: 'Prise serrée accentue l\'épaisseur du dos. Tirez vers le sternum.' },
    { id: 'lat-pulldown-vbar', name: 'Tirage Vertical Prise Neutre', muscle: 'back', equipment: 'cable', muscleTargets: ['Dorsaux', 'Biceps'], tips: 'Prise neutre confortable pour les poignets. Amplitude complète.' },
    { id: 'bent-over-row', name: 'Rowing Barre', muscle: 'back', equipment: 'barbell', muscleTargets: ['Dorsaux', 'Trapèzes', 'Biceps'], tips: 'Buste à 45°. Tirez la barre vers le bas du ventre. Serrez les omoplates.' },
    { id: 'bent-over-row-db', name: 'Rowing Haltère (1 bras)', muscle: 'back', equipment: 'dumbbell', muscleTargets: ['Dorsaux', 'Trapèzes'], tips: 'Prenez appui sur un banc. Tirez le coude vers l\'arrière, pas vers le haut.' },
    { id: 'tbar-row', name: 'Rowing T-Bar', muscle: 'back', equipment: 'barbell', muscleTargets: ['Dorsaux', 'Trapèzes'], tips: 'Position stable. Tirez explosif, descente contrôlée. Cible l\'épaisseur du dos.' },
    { id: 'seated-cable-row', name: 'Tirage Horizontal Poulie Basse', muscle: 'back', equipment: 'cable', muscleTargets: ['Dorsaux', 'Trapèzes', 'Biceps'], tips: 'Gardez le dos droit. Tirez vers le bas du ventre. Contractez les omoplates.' },
    { id: 'chest-supported-row', name: 'Rowing Buste Penché Machine', muscle: 'back', equipment: 'machine', muscleTargets: ['Dorsaux', 'Trapèzes'], tips: 'Supprime le stress lombaire. Focus total sur les dorsaux. Amplitude complète.' },
    { id: 'machine-row', name: 'Rowing Machine', muscle: 'back', equipment: 'machine', muscleTargets: ['Dorsaux', 'Trapèzes'], tips: 'Trajectoire guidée. Tirez en serrant les omoplates. Contrôlez la phase excentrique.' },
    { id: 'meadows-row', name: 'Meadows Row', muscle: 'back', equipment: 'barbell', muscleTargets: ['Dorsaux', 'Trapèzes'], tips: 'Positionnement latéral. Rotation du torse. Excellent pour l\'épaisseur du dos.' },
    { id: 'pullover-cable', name: 'Pull Over Poulie', muscle: 'back', equipment: 'cable', muscleTargets: ['Dorsaux', 'Serratus'], tips: 'Bras tendus. Tirez vers le bas en gardant les bras fixes. Ressent dans les dorsaux.' },
    { id: 'straight-arm-pulldown', name: 'Tirage Bras Tendus', muscle: 'back', equipment: 'cable', muscleTargets: ['Dorsaux', 'Serratus'], tips: 'Bras tendus, légère flexion des coudes. Mouvement d\'arc de cercle. Isolation dorsaux.' },
    { id: 'hyperextension', name: 'Hyperextension / Lombaires', muscle: 'back', equipment: 'bodyweight', muscleTargets: ['Lombaires', 'Fessiers', 'Ischios'], tips: 'Descendez contrôlé. Remontez jusqu\'à l\'alignement. Ne vous hyperextendez pas.' },
    
    // ==================== ÉPAULES ====================
    { id: 'overhead-press', name: 'Développé Militaire Barre', muscle: 'shoulders', equipment: 'barbell', muscleTargets: ['Épaules ant.', 'Triceps'], tips: 'Debout ou assis. Poussez vertical. Serrez les abdos. Ne cambrez pas le dos.' },
    { id: 'overhead-press-db', name: 'Développé Épaules Haltères', muscle: 'shoulders', equipment: 'dumbbell', muscleTargets: ['Épaules ant.', 'Triceps'], tips: 'Amplitude naturelle. Les haltères se touchent en haut. Stabilisation accrue.' },
    { id: 'arnold-press', name: 'Arnold Press', muscle: 'shoulders', equipment: 'dumbbell', muscleTargets: ['Épaules ant.', 'Épaules lat.', 'Triceps'], tips: 'Rotation des poignets pendant le mouvement. Sollicite toutes les portions de l\'épaule.' },
    { id: 'shoulder-press-machine', name: 'Développé Épaules Machine', muscle: 'shoulders', equipment: 'machine', muscleTargets: ['Épaules ant.', 'Triceps'], tips: 'Trajectoire guidée sécurisée. Idéal pour charger lourd en fin de séance.' },
    { id: 'smith-shoulder-press', name: 'Développé Épaules Smith', muscle: 'shoulders', equipment: 'smith', muscleTargets: ['Épaules ant.', 'Triceps'], tips: 'Rail guidé. Poussez explosif. Descendez contrôlé jusqu\'aux épaules.' },
    { id: 'push-press', name: 'Push Press', muscle: 'shoulders', equipment: 'barbell', muscleTargets: ['Épaules', 'Jambes'], tips: 'Légère flexion des genoux pour l\'impulsion. Mouvement explosif. Permet de charger plus lourd.' },
    { id: 'lateral-raise', name: 'Élévations Latérales Haltères', muscle: 'shoulders', equipment: 'dumbbell', muscleTargets: ['Épaules lat.'], tips: 'Montez jusqu\'à l\'horizontale. Coudes légèrement fléchis. Contrôlez la descente.' },
    { id: 'lateral-raise-cable', name: 'Élévations Latérales Poulie', muscle: 'shoulders', equipment: 'cable', muscleTargets: ['Épaules lat.'], tips: 'Tension constante grâce à la poulie. Position du bras opposé stable.' },
    { id: 'lateral-raise-machine', name: 'Élévations Latérales Machine', muscle: 'shoulders', equipment: 'machine', muscleTargets: ['Épaules lat.'], tips: 'Trajectoire guidée. Isolation parfaite des deltoïdes latéraux.' },
    { id: 'front-raise', name: 'Élévations Frontales', muscle: 'shoulders', equipment: 'dumbbell', muscleTargets: ['Épaules ant.'], tips: 'Montez jusqu\'à hauteur des yeux. Gardez les bras légèrement fléchis.' },
    { id: 'front-raise-cable', name: 'Élévations Frontales Poulie', muscle: 'shoulders', equipment: 'cable', muscleTargets: ['Épaules ant.'], tips: 'Tension constante. Parfait en fin de séance épaules.' },
    { id: 'front-raise-plate', name: 'Élévations Frontales Disque', muscle: 'shoulders', equipment: 'plate', muscleTargets: ['Épaules ant.'], tips: 'Tenez le disque à 2 mains. Montez contrôlé. Excellent pour la force.' },
    { id: 'upright-row', name: 'Rowing Menton', muscle: 'shoulders', equipment: 'barbell', muscleTargets: ['Épaules', 'Trapèzes'], tips: 'Montez les coudes en premier. Ne montez pas trop haut. Attention aux épaules sensibles.' },
    
    // ==================== ÉPAULES ARRIÈRE ====================
    { id: 'face-pull', name: 'Face Pull', muscle: 'rear-delts', equipment: 'cable', muscleTargets: ['Épaules arr.', 'Trapèzes', 'Rotateurs'], tips: 'Tirez vers le visage. Écartez les mains en fin de mouvement. Excellent pour la posture.' },
    { id: 'reverse-fly', name: 'Oiseau / Reverse Fly', muscle: 'rear-delts', equipment: 'dumbbell', muscleTargets: ['Épaules arr.'], tips: 'Buste penché à 90°. Montez les coudes. Contractez les omoplates en haut.' },
    { id: 'reverse-fly-machine', name: 'Reverse Fly Machine', muscle: 'rear-delts', equipment: 'machine', muscleTargets: ['Épaules arr.'], tips: 'Réglez la hauteur du siège. Poitrine contre le pad. Isolation parfaite.' },
    { id: 'reverse-fly-cable', name: 'Oiseau Poulie', muscle: 'rear-delts', equipment: 'cable', muscleTargets: ['Épaules arr.'], tips: 'Croisez les poulies. Mouvement horizontal. Tension constante.' },
    { id: 'rear-delt-row', name: 'Rowing Épaules Arrière', muscle: 'rear-delts', equipment: 'dumbbell', muscleTargets: ['Épaules arr.', 'Trapèzes'], tips: 'Coudes très écartés. Tirez haut vers la poitrine. Focus sur l\'arrière d\'épaule.' },
    
    // ==================== TRICEPS ====================
    { id: 'dips-triceps', name: 'Dips (Triceps)', muscle: 'triceps', equipment: 'bodyweight', muscleTargets: ['Triceps', 'Pectoraux', 'Épaules'], tips: 'Restez vertical. Coudes le long du corps. Descendez jusqu\'à 90°.' },
    { id: 'close-grip-bench', name: 'Développé Couché Prise Serrée', muscle: 'triceps', equipment: 'barbell', muscleTargets: ['Triceps', 'Pectoraux int.'], tips: 'Mains écartées de la largeur des épaules. Coudes près du corps. Excellent pour la force.' },
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
    { id: 'barbell-curl', name: 'Curl Barre Droite', muscle: 'biceps', equipment: 'barbell', muscleTargets: ['Biceps', 'Avant-bras'], tips: 'Debout, dos droit. Montez en contractant. Contrôlez la descente. Ne balancez pas.' },
    { id: 'ez-curl', name: 'Curl Barre EZ', muscle: 'biceps', equipment: 'barbell', muscleTargets: ['Biceps', 'Avant-bras'], tips: 'Prise inclinée plus confortable pour les poignets. Mouvement strict.' },
    { id: 'dumbbell-curl', name: 'Curl Haltères', muscle: 'biceps', equipment: 'dumbbell', muscleTargets: ['Biceps'], tips: 'Simultané ou alterné. Supination complète en haut. Amplitude maximale.' },
    { id: 'alternating-curl', name: 'Curl Alterné Haltères', muscle: 'biceps', equipment: 'dumbbell', muscleTargets: ['Biceps'], tips: 'Un bras à la fois. Focus sur la supination. Concentration maximale.' },
    { id: 'hammer-curl', name: 'Curl Marteau', muscle: 'biceps', equipment: 'dumbbell', muscleTargets: ['Biceps', 'Brachial', 'Avant-bras'], tips: 'Prise neutre (marteau). Sollicite le brachial. Excellent pour l\'épaisseur du bras.' },
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
    { id: 'squat', name: 'Squat Barre', muscle: 'quads', equipment: 'barbell', muscleTargets: ['Quadriceps', 'Fessiers', 'Ischios'], tips: 'Descendez jusqu\'aux parallèles. Genoux dans l\'axe des pieds. Dos droit, poitrine haute.' },
    { id: 'front-squat', name: 'Front Squat', muscle: 'quads', equipment: 'barbell', muscleTargets: ['Quadriceps', 'Abdos'], tips: 'Barre devant. Coudes hauts. Moins de stress lombaire. Plus de focus sur les quads.' },
    { id: 'goblet-squat', name: 'Goblet Squat', muscle: 'quads', equipment: 'dumbbell', muscleTargets: ['Quadriceps', 'Fessiers'], tips: 'Tenez l\'haltère contre la poitrine. Excellent pour apprendre le mouvement. Descendez profond.' },
    { id: 'smith-squat', name: 'Squat Smith', muscle: 'quads', equipment: 'smith', muscleTargets: ['Quadriceps', 'Fessiers'], tips: 'Rail guidé. Position des pieds vers l\'avant. Permet de cibler précisément.' },
    { id: 'hack-squat', name: 'Hack Squat', muscle: 'quads', equipment: 'machine', muscleTargets: ['Quadriceps'], tips: 'Dos contre le pad. Pieds vers l\'avant. Isolation des quadriceps. Descendez contrôlé.' },
    { id: 'leg-press', name: 'Presse à Cuisses', muscle: 'quads', equipment: 'machine', muscleTargets: ['Quadriceps', 'Fessiers'], tips: 'Ne déccollez pas les fesses. Descendez jusqu\'à 90°. Poussez avec les talons.' },
    { id: 'leg-press-feet-low', name: 'Presse Pieds Bas (Quads)', muscle: 'quads', equipment: 'machine', muscleTargets: ['Quadriceps'], tips: 'Pieds bas sur la plateforme. Cible davantage les quadriceps. Amplitude contrôlée.' },
    { id: 'leg-extension', name: 'Leg Extension', muscle: 'quads', equipment: 'machine', muscleTargets: ['Quadriceps'], tips: 'Isolation pure des quadriceps. Extension complète. Contractez 1 sec en haut.' },
    { id: 'lunge', name: 'Fentes', muscle: 'quads', equipment: 'dumbbell', muscleTargets: ['Quadriceps', 'Fessiers'], tips: 'Pas large. Descendez le genou arrière vers le sol. Remontez en poussant avec le talon avant.' },
    { id: 'walking-lunge', name: 'Fentes Marchées', muscle: 'quads', equipment: 'dumbbell', muscleTargets: ['Quadriceps', 'Fessiers', 'Équilibre'], tips: 'Marchez en alternant. Gardez le torse droit. Excellent pour les fessiers et l\'équilibre.' },
    { id: 'bulgarian-split-squat', name: 'Bulgarian Split Squat', muscle: 'quads', equipment: 'dumbbell', muscleTargets: ['Quadriceps', 'Fessiers'], tips: 'Pied arrière sur banc. Descendez vertical. Déséquilibre musculaire corrigé.' },
    { id: 'step-up', name: 'Step Up', muscle: 'quads', equipment: 'dumbbell', muscleTargets: ['Quadriceps', 'Fessiers'], tips: 'Montez sur box. Poussez avec le talon. Ne prenez pas d\'élan avec le pied arrière.' },
    { id: 'sissy-squat', name: 'Sissy Squat', muscle: 'quads', equipment: 'bodyweight', muscleTargets: ['Quadriceps'], tips: 'Genoux vers l\'avant, buste vers l\'arrière. Étirement intense des quadriceps. Exercice avancé.' },
    { id: 'pendulum-squat', name: 'Pendulum Squat', muscle: 'quads', equipment: 'machine', muscleTargets: ['Quadriceps'], tips: 'Trajectoire pendulaire. Profondeur maximale. Excellente isolation des quadriceps.' },
    { id: 'v-squat', name: 'V-Squat Machine', muscle: 'quads', equipment: 'machine', muscleTargets: ['Quadriceps'], tips: 'Position en V. Amplitude sécurisée. Parfait pour charger lourd en isolation.' },
    
    // ==================== ISCHIO-JAMBIERS ====================
    { id: 'rdl', name: 'Soulevé de Terre Roumain', muscle: 'hamstrings', equipment: 'barbell', muscleTargets: ['Ischio-jambiers', 'Fessiers', 'Lombaires'], tips: 'Jambes légèrement fléchies. Poussez les hanches vers l\'arrière. Sentez l\'étirement.' },
    { id: 'rdl-db', name: 'Soulevé de Terre Roumain Haltères', muscle: 'hamstrings', equipment: 'dumbbell', muscleTargets: ['Ischio-jambiers', 'Fessiers'], tips: 'Amplitude naturelle. Haltères le long des jambes. Focus sur l\'étirement et la contraction.' },
    { id: 'stiff-leg-deadlift', name: 'Soulevé Jambes Tendues', muscle: 'hamstrings', equipment: 'barbell', muscleTargets: ['Ischio-jambiers', 'Lombaires'], tips: 'Jambes presque tendues. Étirement maximal. Attention à ne pas arrondir le dos.' },
    { id: 'good-morning', name: 'Good Morning', muscle: 'hamstrings', equipment: 'barbell', muscleTargets: ['Ischio-jambiers', 'Lombaires'], tips: 'Barre sur les épaules. Penchez le buste en avant. Gardez le dos droit. Exercice avancé.' },
    { id: 'leg-curl-lying', name: 'Leg Curl Allongé', muscle: 'hamstrings', equipment: 'machine', muscleTargets: ['Ischio-jambiers'], tips: 'Allongé ventre. Ramenez les talons vers les fesses. Contractez en haut 1-2 sec.' },
    { id: 'leg-curl-seated', name: 'Leg Curl Assis', muscle: 'hamstrings', equipment: 'machine', muscleTargets: ['Ischio-jambiers'], tips: 'Assis. Poussez les cuisses contre le pad. Excellent étirement et contraction.' },
    { id: 'leg-curl-standing', name: 'Leg Curl Debout', muscle: 'hamstrings', equipment: 'machine', muscleTargets: ['Ischio-jambiers'], tips: 'Debout, une jambe à la fois. Stabilisation du core. Focus unilatéral.' },
    { id: 'nordic-curl', name: 'Nordic Curl', muscle: 'hamstrings', equipment: 'bodyweight', muscleTargets: ['Ischio-jambiers'], tips: 'Genoux fixés. Descendez contrôlé. Très exigeant. Utilisez un support si nécessaire.' },
    { id: 'cable-pull-through', name: 'Pull Through Poulie', muscle: 'hamstrings', equipment: 'cable', muscleTargets: ['Fessiers', 'Ischio-jambiers'], tips: 'Dos à la poulie. Hip hinge. Excellent pour apprendre le mouvement deadlift.' },
    { id: 'leg-press-feet-high', name: 'Presse Pieds Hauts (Ischios)', muscle: 'hamstrings', equipment: 'machine', muscleTargets: ['Ischio-jambiers', 'Fessiers'], tips: 'Pieds hauts sur la plateforme. Cible davantage l\'arrière des cuisses et les fessiers.' },
    
    // ==================== FESSIERS ====================
    { id: 'hip-thrust', name: 'Hip Thrust', muscle: 'glutes', equipment: 'barbell', muscleTargets: ['Fessiers', 'Ischio-jambiers'], tips: 'Dos contre banc. Poussez avec les talons. Contractez fort les fessiers en haut.' },
    { id: 'hip-thrust-machine', name: 'Hip Thrust Machine', muscle: 'glutes', equipment: 'machine', muscleTargets: ['Fessiers'], tips: 'Position optimale guidée. Focus total sur les fessiers. Contraction maximale.' },
    { id: 'glute-bridge', name: 'Glute Bridge', muscle: 'glutes', equipment: 'bodyweight', muscleTargets: ['Fessiers', 'Ischios'], tips: 'Au sol. Poussez les hanches vers le haut. Serrez les fessiers en haut 2-3 sec.' },
    { id: 'cable-kickback', name: 'Kickback Fessier Poulie', muscle: 'glutes', equipment: 'cable', muscleTargets: ['Fessiers'], tips: 'Poussez la jambe vers l\'arrière. Contractez fort. Mouvement contrôlé.' },
    { id: 'glute-kickback-machine', name: 'Kickback Fessier Machine', muscle: 'glutes', equipment: 'machine', muscleTargets: ['Fessiers'], tips: 'Isolation pure. Amplitude complète. Excellent en fin de séance jambes.' },
    { id: 'sumo-deadlift', name: 'Soulevé de Terre Sumo', muscle: 'glutes', equipment: 'barbell', muscleTargets: ['Fessiers', 'Adducteurs', 'Ischios'], tips: 'Position large. Pointes de pieds vers l\'extérieur. Pousse avec les hanches.' },
    { id: 'sumo-squat', name: 'Squat Sumo', muscle: 'glutes', equipment: 'dumbbell', muscleTargets: ['Fessiers', 'Adducteurs', 'Quads'], tips: 'Position très large. Descendez entre les jambes. Excellent pour l\'intérieur des cuisses.' },
    { id: 'abductor-machine', name: 'Abducteurs Machine', muscle: 'glutes', equipment: 'machine', muscleTargets: ['Fessiers lat.', 'Abducteurs'], tips: 'Écartez les jambes contre résistance. Contractez les fessiers. Contrôlez le retour.' },
    { id: 'frog-pump', name: 'Frog Pump', muscle: 'glutes', equipment: 'bodyweight', muscleTargets: ['Fessiers'], tips: 'Plante des pieds jointes. Genoux écartés. Petite amplitude, haute fréquence. Congestion intense.' },
    
    // ==================== MOLLETS ====================
    { id: 'standing-calf', name: 'Mollets Debout Machine', muscle: 'calves', equipment: 'machine', muscleTargets: ['Mollets (gastrocnemiens)'], tips: 'Jambes tendues. Montez sur la pointe des pieds. Amplitude complète, pause en haut.' },
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
    { id: 'crunch', name: 'Crunch', muscle: 'abs', equipment: 'bodyweight', muscleTargets: ['Abdominaux'], tips: 'Enroulez la colonne. Ne tirez pas sur la nuque. Contractez en haut 1 sec.' },
    { id: 'crunch-machine', name: 'Crunch Machine', muscle: 'abs', equipment: 'machine', muscleTargets: ['Abdominaux'], tips: 'Trajectoire guidée. Permet d\'ajouter de la charge. Enroulement complet.' },
    { id: 'cable-crunch', name: 'Crunch Poulie Haute', muscle: 'abs', equipment: 'cable', muscleTargets: ['Abdominaux'], tips: 'À genoux. Enroulez le buste. Corde derrière la tête. Tension continue.' },
    { id: 'leg-raise', name: 'Relevé de Jambes', muscle: 'abs', equipment: 'bodyweight', muscleTargets: ['Abdominaux inf.'], tips: 'Au sol. Montez les jambes tendues. Ne cambrez pas le dos. Contrôlez la descente.' },
    { id: 'hanging-leg-raise', name: 'Relevé de Jambes Suspendu', muscle: 'abs', equipment: 'bodyweight', muscleTargets: ['Abdominaux inf.', 'Hip flexors'], tips: 'Suspendu à la barre. Montez les genoux ou jambes tendues. Ne balancez pas.' },
    { id: 'plank', name: 'Planche / Gainage', muscle: 'abs', equipment: 'bodyweight', muscleTargets: ['Abdominaux', 'Core'], tips: 'Corps aligné. Ne cambrez pas. Serrez les abdos et les fessiers. Tenez la position.' },
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
    { id: 'farmers-walk-forearms', name: 'Farmer\'s Walk (Grip)', muscle: 'forearms', equipment: 'dumbbell', muscleTargets: ['Avant-bras', 'Grip'], tips: 'Marchez avec charges lourdes. Serrez fort. Force de préhension et endurance.' }
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
