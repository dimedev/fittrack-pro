// Programmes d'entraînement
const trainingPrograms = {
    'ppl': {
        name: 'Push Pull Legs',
        icon: '💪',
        description: 'Programme classique divisant les muscles en 3 groupes : poussée, tirage et jambes. Idéal pour 3-6 jours.',
        minDays: 3,
        maxDays: 6,
        splits: {
            3: ['Push', 'Pull', 'Legs'],
            4: ['Push', 'Pull', 'Legs', 'Upper'],
            5: ['Push', 'Pull', 'Legs', 'Push', 'Pull'],
            6: ['Push', 'Pull', 'Legs', 'Push', 'Pull', 'Legs']
        },
        exercises: {
            'Push': [
                { name: 'Développé Couché', sets: 4, reps: '8-10', muscle: 'chest' },
                { name: 'Développé Incliné Haltères', sets: 3, reps: '10-12', muscle: 'chest' },
                { name: 'Développé Militaire', sets: 4, reps: '8-10', muscle: 'shoulders' },
                { name: 'Élévations Latérales', sets: 3, reps: '12-15', muscle: 'shoulders' },
                { name: 'Dips', sets: 3, reps: '10-12', muscle: 'triceps' },
                { name: 'Extensions Triceps Poulie', sets: 3, reps: '12-15', muscle: 'triceps' }
            ],
            'Pull': [
                { name: 'Tractions', sets: 4, reps: '6-10', muscle: 'back' },
                { name: 'Rowing Barre', sets: 4, reps: '8-10', muscle: 'back' },
                { name: 'Tirage Vertical', sets: 3, reps: '10-12', muscle: 'back' },
                { name: 'Face Pull', sets: 3, reps: '15-20', muscle: 'rear-delts' },
                { name: 'Curl Barre', sets: 3, reps: '10-12', muscle: 'biceps' },
                { name: 'Curl Haltères', sets: 3, reps: '12-15', muscle: 'biceps' }
            ],
            'Legs': [
                { name: 'Squat', sets: 4, reps: '6-8', muscle: 'quads' },
                { name: 'Presse à Cuisses', sets: 3, reps: '10-12', muscle: 'quads' },
                { name: 'Soulevé de Terre Roumain', sets: 4, reps: '8-10', muscle: 'hamstrings' },
                { name: 'Leg Curl', sets: 3, reps: '12-15', muscle: 'hamstrings' },
                { name: 'Mollets Debout', sets: 4, reps: '12-15', muscle: 'calves' },
                { name: 'Fentes', sets: 3, reps: '10-12', muscle: 'glutes' }
            ],
            'Upper': [
                { name: 'Développé Couché', sets: 3, reps: '8-10', muscle: 'chest' },
                { name: 'Rowing Haltères', sets: 3, reps: '10-12', muscle: 'back' },
                { name: 'Développé Épaules', sets: 3, reps: '10-12', muscle: 'shoulders' },
                { name: 'Tirage Vertical', sets: 3, reps: '10-12', muscle: 'back' },
                { name: 'Curl Barre', sets: 2, reps: '12-15', muscle: 'biceps' },
                { name: 'Extensions Triceps', sets: 2, reps: '12-15', muscle: 'triceps' }
            ]
        }
    },
    
    'upper-lower': {
        name: 'Upper Lower',
        icon: '🔄',
        description: 'Divise le corps en haut et bas. Bonne fréquence par muscle. Idéal pour 4 jours.',
        minDays: 3,
        maxDays: 6,
        splits: {
            3: ['Upper', 'Lower', 'Full Body'],
            4: ['Upper A', 'Lower A', 'Upper B', 'Lower B'],
            5: ['Upper A', 'Lower A', 'Upper B', 'Lower B', 'Upper C'],
            6: ['Upper A', 'Lower A', 'Upper B', 'Lower B', 'Upper C', 'Lower C']
        },
        exercises: {
            'Upper': [
                { name: 'Développé Couché', sets: 4, reps: '6-8', muscle: 'chest' },
                { name: 'Rowing Barre', sets: 4, reps: '6-8', muscle: 'back' },
                { name: 'Développé Militaire', sets: 3, reps: '8-10', muscle: 'shoulders' },
                { name: 'Tirage Vertical', sets: 3, reps: '10-12', muscle: 'back' },
                { name: 'Curl Barre', sets: 3, reps: '10-12', muscle: 'biceps' },
                { name: 'Barre au Front', sets: 3, reps: '10-12', muscle: 'triceps' }
            ],
            'Upper A': [
                { name: 'Développé Couché', sets: 4, reps: '6-8', muscle: 'chest' },
                { name: 'Rowing Barre', sets: 4, reps: '6-8', muscle: 'back' },
                { name: 'Développé Militaire', sets: 3, reps: '8-10', muscle: 'shoulders' },
                { name: 'Tirage Vertical', sets: 3, reps: '10-12', muscle: 'back' },
                { name: 'Curl Barre', sets: 3, reps: '10-12', muscle: 'biceps' },
                { name: 'Barre au Front', sets: 3, reps: '10-12', muscle: 'triceps' }
            ],
            'Upper B': [
                { name: 'Développé Incliné', sets: 4, reps: '8-10', muscle: 'chest' },
                { name: 'Tractions', sets: 4, reps: 'Max', muscle: 'back' },
                { name: 'Élévations Latérales', sets: 4, reps: '12-15', muscle: 'shoulders' },
                { name: 'Rowing Haltères', sets: 3, reps: '10-12', muscle: 'back' },
                { name: 'Curl Haltères', sets: 3, reps: '12-15', muscle: 'biceps' },
                { name: 'Extensions Poulie', sets: 3, reps: '12-15', muscle: 'triceps' }
            ],
            'Upper C': [
                { name: 'Dips', sets: 4, reps: '8-12', muscle: 'chest' },
                { name: 'Tirage Horizontal', sets: 4, reps: '10-12', muscle: 'back' },
                { name: 'Arnold Press', sets: 3, reps: '10-12', muscle: 'shoulders' },
                { name: 'Écartés Poulies', sets: 3, reps: '12-15', muscle: 'chest' },
                { name: 'Curl Concentré', sets: 2, reps: '12-15', muscle: 'biceps' },
                { name: 'Kickback', sets: 2, reps: '12-15', muscle: 'triceps' }
            ],
            'Lower': [
                { name: 'Squat', sets: 4, reps: '6-8', muscle: 'quads' },
                { name: 'Soulevé de Terre Roumain', sets: 4, reps: '8-10', muscle: 'hamstrings' },
                { name: 'Presse à Cuisses', sets: 3, reps: '10-12', muscle: 'quads' },
                { name: 'Leg Curl', sets: 3, reps: '12-15', muscle: 'hamstrings' },
                { name: 'Mollets Assis', sets: 4, reps: '12-15', muscle: 'calves' }
            ],
            'Lower A': [
                { name: 'Squat', sets: 4, reps: '6-8', muscle: 'quads' },
                { name: 'Soulevé de Terre Roumain', sets: 4, reps: '8-10', muscle: 'hamstrings' },
                { name: 'Presse à Cuisses', sets: 3, reps: '10-12', muscle: 'quads' },
                { name: 'Leg Curl', sets: 3, reps: '12-15', muscle: 'hamstrings' },
                { name: 'Mollets Assis', sets: 4, reps: '12-15', muscle: 'calves' }
            ],
            'Lower B': [
                { name: 'Soulevé de Terre', sets: 4, reps: '5-6', muscle: 'back' },
                { name: 'Fentes', sets: 3, reps: '10-12', muscle: 'glutes' },
                { name: 'Leg Extension', sets: 3, reps: '12-15', muscle: 'quads' },
                { name: 'Leg Curl', sets: 3, reps: '12-15', muscle: 'hamstrings' },
                { name: 'Mollets Debout', sets: 4, reps: '10-12', muscle: 'calves' },
                { name: 'Hip Thrust', sets: 3, reps: '10-12', muscle: 'glutes' }
            ],
            'Lower C': [
                { name: 'Front Squat', sets: 4, reps: '8-10', muscle: 'quads' },
                { name: 'Good Morning', sets: 3, reps: '10-12', muscle: 'hamstrings' },
                { name: 'Bulgarian Split Squat', sets: 3, reps: '10-12', muscle: 'quads' },
                { name: 'Leg Curl', sets: 3, reps: '12-15', muscle: 'hamstrings' },
                { name: 'Mollets Presse', sets: 4, reps: '15-20', muscle: 'calves' }
            ],
            'Full Body': [
                { name: 'Squat', sets: 3, reps: '8-10', muscle: 'quads' },
                { name: 'Développé Couché', sets: 3, reps: '8-10', muscle: 'chest' },
                { name: 'Rowing Barre', sets: 3, reps: '8-10', muscle: 'back' },
                { name: 'Développé Épaules', sets: 3, reps: '10-12', muscle: 'shoulders' },
                { name: 'Curl Barre', sets: 2, reps: '12-15', muscle: 'biceps' },
                { name: 'Extensions Triceps', sets: 2, reps: '12-15', muscle: 'triceps' }
            ]
        }
    },
    
    'full-body': {
        name: 'Full Body',
        icon: '🏋️',
        description: 'Travaille tout le corps à chaque séance. Haute fréquence, idéal pour débutants ou 3 jours.',
        minDays: 3,
        maxDays: 4,
        splits: {
            3: ['Full Body A', 'Full Body B', 'Full Body C'],
            4: ['Full Body A', 'Full Body B', 'Full Body C', 'Full Body D']
        },
        exercises: {
            'Full Body A': [
                { name: 'Squat', sets: 4, reps: '6-8', muscle: 'quads' },
                { name: 'Développé Couché', sets: 4, reps: '6-8', muscle: 'chest' },
                { name: 'Rowing Barre', sets: 4, reps: '8-10', muscle: 'back' },
                { name: 'Développé Épaules', sets: 3, reps: '10-12', muscle: 'shoulders' },
                { name: 'Curl Barre', sets: 2, reps: '12-15', muscle: 'biceps' },
                { name: 'Mollets', sets: 3, reps: '15-20', muscle: 'calves' }
            ],
            'Full Body B': [
                { name: 'Soulevé de Terre', sets: 4, reps: '5-6', muscle: 'back' },
                { name: 'Développé Incliné', sets: 4, reps: '8-10', muscle: 'chest' },
                { name: 'Tractions', sets: 4, reps: 'Max', muscle: 'back' },
                { name: 'Fentes', sets: 3, reps: '10-12', muscle: 'quads' },
                { name: 'Élévations Latérales', sets: 3, reps: '12-15', muscle: 'shoulders' },
                { name: 'Dips', sets: 3, reps: '10-12', muscle: 'triceps' }
            ],
            'Full Body C': [
                { name: 'Front Squat', sets: 4, reps: '8-10', muscle: 'quads' },
                { name: 'Rowing Haltères', sets: 4, reps: '10-12', muscle: 'back' },
                { name: 'Dips', sets: 3, reps: '8-12', muscle: 'chest' },
                { name: 'Soulevé Roumain', sets: 3, reps: '10-12', muscle: 'hamstrings' },
                { name: 'Arnold Press', sets: 3, reps: '10-12', muscle: 'shoulders' },
                { name: 'Curl Haltères', sets: 2, reps: '12-15', muscle: 'biceps' }
            ],
            'Full Body D': [
                { name: 'Presse à Cuisses', sets: 4, reps: '10-12', muscle: 'quads' },
                { name: 'Développé Couché Haltères', sets: 4, reps: '10-12', muscle: 'chest' },
                { name: 'Tirage Vertical', sets: 4, reps: '10-12', muscle: 'back' },
                { name: 'Leg Curl', sets: 3, reps: '12-15', muscle: 'hamstrings' },
                { name: 'Face Pull', sets: 3, reps: '15-20', muscle: 'rear-delts' },
                { name: 'Extensions Triceps', sets: 2, reps: '12-15', muscle: 'triceps' }
            ]
        }
    },
    
    'bro-split': {
        name: 'Bro Split',
        icon: '💎',
        description: 'Un muscle par jour. Volume élevé par muscle. Idéal pour 5 jours.',
        minDays: 4,
        maxDays: 6,
        splits: {
            4: ['Chest', 'Back', 'Shoulders/Arms', 'Legs'],
            5: ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs'],
            6: ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Weak Points']
        },
        exercises: {
            'Chest': [
                { name: 'Développé Couché', sets: 4, reps: '6-8', muscle: 'chest' },
                { name: 'Développé Incliné', sets: 4, reps: '8-10', muscle: 'chest' },
                { name: 'Développé Décliné', sets: 3, reps: '10-12', muscle: 'chest' },
                { name: 'Écartés Haltères', sets: 3, reps: '12-15', muscle: 'chest' },
                { name: 'Poulies Vis-à-Vis', sets: 3, reps: '12-15', muscle: 'chest' },
                { name: 'Pull Over', sets: 3, reps: '12-15', muscle: 'chest' }
            ],
            'Back': [
                { name: 'Soulevé de Terre', sets: 4, reps: '5-6', muscle: 'back' },
                { name: 'Tractions', sets: 4, reps: 'Max', muscle: 'back' },
                { name: 'Rowing Barre', sets: 4, reps: '8-10', muscle: 'back' },
                { name: 'Tirage Vertical', sets: 3, reps: '10-12', muscle: 'back' },
                { name: 'Rowing Haltère', sets: 3, reps: '10-12', muscle: 'back' },
                { name: 'Shrugs', sets: 3, reps: '12-15', muscle: 'traps' }
            ],
            'Shoulders': [
                { name: 'Développé Militaire', sets: 4, reps: '6-8', muscle: 'shoulders' },
                { name: 'Arnold Press', sets: 3, reps: '10-12', muscle: 'shoulders' },
                { name: 'Élévations Latérales', sets: 4, reps: '12-15', muscle: 'shoulders' },
                { name: 'Élévations Frontales', sets: 3, reps: '12-15', muscle: 'shoulders' },
                { name: 'Oiseau', sets: 4, reps: '15-20', muscle: 'rear-delts' },
                { name: 'Face Pull', sets: 3, reps: '15-20', muscle: 'rear-delts' }
            ],
            'Arms': [
                { name: 'Curl Barre', sets: 4, reps: '8-10', muscle: 'biceps' },
                { name: 'Curl Haltères Alterné', sets: 3, reps: '10-12', muscle: 'biceps' },
                { name: 'Curl Concentré', sets: 3, reps: '12-15', muscle: 'biceps' },
                { name: 'Barre au Front', sets: 4, reps: '8-10', muscle: 'triceps' },
                { name: 'Extensions Poulie', sets: 3, reps: '12-15', muscle: 'triceps' },
                { name: 'Dips', sets: 3, reps: '10-12', muscle: 'triceps' }
            ],
            'Shoulders/Arms': [
                { name: 'Développé Épaules', sets: 4, reps: '8-10', muscle: 'shoulders' },
                { name: 'Élévations Latérales', sets: 3, reps: '12-15', muscle: 'shoulders' },
                { name: 'Face Pull', sets: 3, reps: '15-20', muscle: 'rear-delts' },
                { name: 'Curl Barre', sets: 3, reps: '10-12', muscle: 'biceps' },
                { name: 'Extensions Triceps', sets: 3, reps: '12-15', muscle: 'triceps' },
                { name: 'Curl Marteau', sets: 2, reps: '12-15', muscle: 'biceps' }
            ],
            'Legs': [
                { name: 'Squat', sets: 5, reps: '5-6', muscle: 'quads' },
                { name: 'Presse à Cuisses', sets: 4, reps: '10-12', muscle: 'quads' },
                { name: 'Soulevé Roumain', sets: 4, reps: '8-10', muscle: 'hamstrings' },
                { name: 'Leg Extension', sets: 3, reps: '12-15', muscle: 'quads' },
                { name: 'Leg Curl', sets: 3, reps: '12-15', muscle: 'hamstrings' },
                { name: 'Mollets Debout', sets: 4, reps: '12-15', muscle: 'calves' },
                { name: 'Mollets Assis', sets: 3, reps: '15-20', muscle: 'calves' }
            ],
            'Weak Points': [
                { name: 'Exercice Point Faible 1', sets: 4, reps: '10-12', muscle: 'various' },
                { name: 'Exercice Point Faible 2', sets: 4, reps: '10-12', muscle: 'various' },
                { name: 'Exercice Point Faible 3', sets: 3, reps: '12-15', muscle: 'various' },
                { name: 'Abdos Crunch', sets: 4, reps: '15-20', muscle: 'abs' },
                { name: 'Planche', sets: 3, reps: '60s', muscle: 'abs' }
            ]
        }
    },
    
    'arnold': {
        name: 'Arnold Split',
        icon: '🦁',
        description: 'Le split légendaire d\'Arnold. Chest/Back, Shoulders/Arms, Legs. Haute fréquence.',
        minDays: 6,
        maxDays: 6,
        splits: {
            6: ['Chest/Back', 'Shoulders/Arms', 'Legs', 'Chest/Back', 'Shoulders/Arms', 'Legs']
        },
        exercises: {
            'Chest/Back': [
                { name: 'Développé Couché', sets: 4, reps: '8-10', muscle: 'chest' },
                { name: 'Rowing Barre', sets: 4, reps: '8-10', muscle: 'back' },
                { name: 'Développé Incliné', sets: 3, reps: '10-12', muscle: 'chest' },
                { name: 'Tractions', sets: 3, reps: 'Max', muscle: 'back' },
                { name: 'Écartés Haltères', sets: 3, reps: '12-15', muscle: 'chest' },
                { name: 'Tirage Vertical', sets: 3, reps: '10-12', muscle: 'back' }
            ],
            'Shoulders/Arms': [
                { name: 'Développé Militaire', sets: 4, reps: '8-10', muscle: 'shoulders' },
                { name: 'Élévations Latérales', sets: 4, reps: '12-15', muscle: 'shoulders' },
                { name: 'Curl Barre', sets: 4, reps: '10-12', muscle: 'biceps' },
                { name: 'Barre au Front', sets: 4, reps: '10-12', muscle: 'triceps' },
                { name: 'Curl Haltères', sets: 3, reps: '12-15', muscle: 'biceps' },
                { name: 'Extensions Poulie', sets: 3, reps: '12-15', muscle: 'triceps' }
            ],
            'Legs': [
                { name: 'Squat', sets: 5, reps: '6-8', muscle: 'quads' },
                { name: 'Soulevé de Terre Roumain', sets: 4, reps: '8-10', muscle: 'hamstrings' },
                { name: 'Presse à Cuisses', sets: 4, reps: '10-12', muscle: 'quads' },
                { name: 'Leg Curl', sets: 4, reps: '12-15', muscle: 'hamstrings' },
                { name: 'Fentes', sets: 3, reps: '10-12', muscle: 'glutes' },
                { name: 'Mollets Debout', sets: 5, reps: '12-15', muscle: 'calves' }
            ]
        }
    }
};