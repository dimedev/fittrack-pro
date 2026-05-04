// ════════════════════════════════════════════════════════════════════════════
// V9 — BUILTIN PROGRAMS (proven, time-tested templates)
// ════════════════════════════════════════════════════════════════════════════
// Format déclaratif compact. Chaque programme expose :
//   - Métadonnées (id, name, author, difficulty, daysPerWeek, cycleWeeks, tags)
//   - requiresTM : si true, le user doit configurer ses Training Maxes (TM)
//                  avant de démarrer (typique pour 5/3/1, GZCLP, nSuns)
//   - days[]    : structure par jour de la semaine (mainLift, accessories[])
//   - weekTemplates : schémas de séries par semaine, indexés sur le numéro
//                     de semaine du cycle (1..cycleWeeks). Pour les programmes
//                     pyramidaux (5/3/1, nSuns), chaque entrée définit les
//                     `mainSets` à exécuter sur le mainLift du jour.
//   - bbbAssistance : si présent, 2e bloc de l'exercice principal en hyper
//                     (typiquement 5×10 @ 50% TM pour BBB).
//   - accessoryPlan : carte day.name → array d'exercices d'assistance.
//   - progressionRules : règles d'avance cycle-to-cycle (delta TM lifts hauts
//                        vs bas) + fallback en cas d'échec AMRAP.
//
// Les sets simples (programmes non-percentage comme Stronglifts) utilisent un
// schéma { sets, reps, intensity:{type:'fixed',weight}|{type:'self'} } et
// progressent par +deltaPerSession en cas de réussite.
//
// Le moteur d'interprétation est dans js/modules/program-runner.js.
// ════════════════════════════════════════════════════════════════════════════

const BUILTIN_PROGRAMS = [

    // ═══════════════════════════════════════════════════════════════════════
    // 1. 5/3/1 BORING BUT BIG (Jim Wendler) — intermediate, 4 jours/sem
    // ═══════════════════════════════════════════════════════════════════════
    {
        id: '531-bbb',
        name: '5/3/1 Boring But Big',
        shortName: '5/3/1 BBB',
        author: 'Jim Wendler',
        icon: 'plate',
        difficulty: 'intermediate',
        daysPerWeek: 4,
        cycleWeeks: 4,
        durationLabel: '4 sem · 1 cycle',
        summary: 'Top sets pyramidaux sur 4 lifts principaux + 5×10 hyper. Cycle de 4 semaines avec deload final. Construit pour la longue distance.',
        description: 'Le programme classique de Jim Wendler. Cycle de 4 semaines (5s, 3s, 5/3/1, deload). Top set AMRAP qui pilote la progression. Bloc Boring But Big de 5×10 en hyper sur le même lift à 50% TM. Considéré comme le programme intermédiaire le plus fiable depuis 2009.',
        tags: ['force', 'powerlifting', 'éprouvé', 'longue distance'],
        requiresTM: true,
        coreLifts: ['squat', 'bench', 'deadlift', 'press'],

        schedule: {
            days: [
                {
                    dayIndex: 0,
                    name: 'Press Day',
                    mainLift: 'press',
                    mainExerciseName: 'Développé Militaire'
                },
                {
                    dayIndex: 1,
                    name: 'Deadlift Day',
                    mainLift: 'deadlift',
                    mainExerciseName: 'Soulevé de Terre'
                },
                {
                    dayIndex: 2,
                    name: 'Bench Day',
                    mainLift: 'bench',
                    mainExerciseName: 'Développé Couché'
                },
                {
                    dayIndex: 3,
                    name: 'Squat Day',
                    mainLift: 'squat',
                    mainExerciseName: 'Squat'
                }
            ],

            weekTemplates: {
                1: {
                    name: '5s',
                    mainSets: [
                        { reps: 5, percent: 65 },
                        { reps: 5, percent: 75 },
                        { reps: '5+', percent: 85, amrap: true }
                    ]
                },
                2: {
                    name: '3s',
                    mainSets: [
                        { reps: 3, percent: 70 },
                        { reps: 3, percent: 80 },
                        { reps: '3+', percent: 90, amrap: true }
                    ]
                },
                3: {
                    name: '5/3/1',
                    mainSets: [
                        { reps: 5, percent: 75 },
                        { reps: 3, percent: 85 },
                        { reps: '1+', percent: 95, amrap: true }
                    ]
                },
                4: {
                    name: 'Deload',
                    deload: true,
                    mainSets: [
                        { reps: 5, percent: 40 },
                        { reps: 5, percent: 50 },
                        { reps: 5, percent: 60 }
                    ]
                }
            },

            bbbAssistance: {
                sets: 5,
                reps: 10,
                percent: 50,
                onlyOnNonDeload: true
            },

            accessoryPlan: {
                'Press Day': [
                    { name: 'Tractions', sets: 5, reps: '10', muscle: 'back', rest: 90, type: 'compound' },
                    { name: 'Curl Haltères', sets: 3, reps: '12', muscle: 'biceps', rest: 60, type: 'isolation' }
                ],
                'Deadlift Day': [
                    { name: 'Hyperextensions', sets: 5, reps: '15', muscle: 'glutes', rest: 60, type: 'compound' },
                    { name: 'Crunch Suspendu', sets: 3, reps: '20', muscle: 'abs', rest: 60, type: 'isolation' }
                ],
                'Bench Day': [
                    { name: 'Rowing Haltère', sets: 5, reps: '10', muscle: 'back', rest: 90, type: 'compound' },
                    { name: 'Extensions Triceps Poulie', sets: 3, reps: '12', muscle: 'triceps', rest: 60, type: 'isolation' }
                ],
                'Squat Day': [
                    { name: 'Leg Curl', sets: 5, reps: '10', muscle: 'hamstrings', rest: 75, type: 'isolation' },
                    { name: 'Crunch', sets: 3, reps: '20', muscle: 'abs', rest: 45, type: 'isolation' }
                ]
            }
        },

        progressionRules: {
            onCycleComplete: {
                upperLifts: { delta: 2.5, unit: 'kg', applies: ['bench', 'press'] },
                lowerLifts: { delta: 5, unit: 'kg', applies: ['squat', 'deadlift'] }
            },
            onAmrapFail: { action: 'reduce_TM', percent: 10, message: 'AMRAP raté → réduire TM de 10% au prochain cycle' }
        }
    },

    // ═══════════════════════════════════════════════════════════════════════
    // 2. nSuns 5/3/1 — intermediate→advanced, 5 jours/sem, volume élevé
    // ═══════════════════════════════════════════════════════════════════════
    {
        id: 'nsuns-531',
        name: 'nSuns 5/3/1',
        shortName: 'nSuns',
        author: 'nSuns (Reddit)',
        icon: 'lightning',
        difficulty: 'advanced',
        daysPerWeek: 5,
        cycleWeeks: 1,
        durationLabel: '1 sem · répétée',
        summary: 'Variante haute fréquence du 5/3/1. 9 sets pyramidaux sur le main lift + secondary lift. Progression hebdomadaire +2.5kg upper / +5kg lower si AMRAP réussi.',
        description: 'Le 5/3/1 sous stéroïdes (figuré). Chaque jour : 9 sets sur le main lift en pyramide montante puis descendante (avec un AMRAP), puis 8 sets pyramidaux sur un secondary. Volume très élevé. Recommandé après 6+ mois de programmation structurée.',
        tags: ['force', 'volume', 'haute fréquence'],
        requiresTM: true,
        coreLifts: ['squat', 'bench', 'deadlift', 'press'],

        schedule: {
            days: [
                {
                    dayIndex: 0, name: 'Bench / OHP', mainLift: 'bench',
                    mainExerciseName: 'Développé Couché',
                    secondaryLift: 'press', secondaryExerciseName: 'Développé Militaire'
                },
                {
                    dayIndex: 1, name: 'Squat / Sumo Deadlift', mainLift: 'squat',
                    mainExerciseName: 'Squat',
                    secondaryLift: 'deadlift', secondaryExerciseName: 'Soulevé Sumo'
                },
                {
                    dayIndex: 2, name: 'OHP / Incline Bench', mainLift: 'press',
                    mainExerciseName: 'Développé Militaire',
                    secondaryLift: 'bench', secondaryExerciseName: 'Développé Incliné'
                },
                {
                    dayIndex: 3, name: 'Deadlift / Front Squat', mainLift: 'deadlift',
                    mainExerciseName: 'Soulevé de Terre',
                    secondaryLift: 'squat', secondaryExerciseName: 'Front Squat'
                },
                {
                    dayIndex: 4, name: 'Bench / Close-Grip Bench', mainLift: 'bench',
                    mainExerciseName: 'Développé Couché',
                    secondaryLift: 'bench', secondaryExerciseName: 'Développé Prise Serrée'
                }
            ],

            // Schémas nSuns T1 (main) et T2 (secondary)
            // T1 : 9 sets pyramidaux montants/descendants avec AMRAP au set 4
            // T2 : 8 sets pyramidaux montants
            weekTemplates: {
                1: {
                    name: 'nSuns weekly',
                    mainSets: [
                        { reps: 8, percent: 65 },
                        { reps: 6, percent: 75 },
                        { reps: 4, percent: 85 },
                        { reps: '4+', percent: 85, amrap: true },
                        { reps: 4, percent: 85 },
                        { reps: 5, percent: 80 },
                        { reps: 6, percent: 75 },
                        { reps: 7, percent: 70 },
                        { reps: '8+', percent: 65, amrap: true }
                    ],
                    secondarySets: [
                        { reps: 6, percent: 50 },
                        { reps: 5, percent: 60 },
                        { reps: 3, percent: 70 },
                        { reps: 5, percent: 70 },
                        { reps: 7, percent: 70 },
                        { reps: 4, percent: 70 },
                        { reps: 6, percent: 70 },
                        { reps: 8, percent: 70 }
                    ]
                }
            },

            accessoryPlan: {
                'Bench / OHP': [
                    { name: 'Curl Barre', sets: 3, reps: '10-12', muscle: 'biceps', rest: 60, type: 'isolation' },
                    { name: 'Élévations Latérales', sets: 3, reps: '12-15', muscle: 'shoulders', rest: 60, type: 'isolation' }
                ],
                'Squat / Sumo Deadlift': [
                    { name: 'Leg Curl', sets: 4, reps: '10', muscle: 'hamstrings', rest: 75, type: 'isolation' },
                    { name: 'Mollets Debout', sets: 4, reps: '12-15', muscle: 'calves', rest: 45, type: 'isolation' }
                ],
                'OHP / Incline Bench': [
                    { name: 'Tractions', sets: 4, reps: '8-10', muscle: 'back', rest: 90, type: 'compound' },
                    { name: 'Face Pull', sets: 3, reps: '15-20', muscle: 'rear-delts', rest: 45, type: 'isolation' }
                ],
                'Deadlift / Front Squat': [
                    { name: 'Hyperextensions', sets: 4, reps: '12', muscle: 'glutes', rest: 60, type: 'compound' },
                    { name: 'Crunch', sets: 3, reps: '20', muscle: 'abs', rest: 45, type: 'isolation' }
                ],
                'Bench / Close-Grip Bench': [
                    { name: 'Rowing Barre', sets: 4, reps: '8-10', muscle: 'back', rest: 90, type: 'compound' },
                    { name: 'Extensions Triceps Poulie', sets: 3, reps: '12-15', muscle: 'triceps', rest: 60, type: 'isolation' }
                ]
            }
        },

        progressionRules: {
            onCycleComplete: {
                upperLifts: { delta: 2.5, unit: 'kg', applies: ['bench', 'press'] },
                lowerLifts: { delta: 5, unit: 'kg', applies: ['squat', 'deadlift'] }
            },
            onAmrapFail: { action: 'reduce_TM', percent: 10, message: 'AMRAP raté 2 semaines de suite → réduire TM de 10%' }
        }
    },

    // ═══════════════════════════════════════════════════════════════════════
    // 3. GZCLP — beginner→intermediate, 4 jours/sem, linear progression
    // ═══════════════════════════════════════════════════════════════════════
    {
        id: 'gzclp',
        name: 'GZCLP',
        shortName: 'GZCLP',
        author: 'Cody Lefever',
        icon: 'levels',
        difficulty: 'beginner',
        daysPerWeek: 4,
        cycleWeeks: 1,
        durationLabel: 'progression linéaire hebdomadaire',
        summary: 'GZCL Linear Progression. T1 (main) en 5×3, T2 (secondary) en 3×10, T3 (assistance) en 3×AMRAP. Stage drops automatiques en cas d\'échec.',
        description: 'La version linear progression du système GZCL. Idéal pour transitionner après Stronglifts/Starting Strength. T1 : top set 5×3 progressif, fall-off à 3×5 puis 1×10. T2 : 3×10. T3 : 3×AMRAP+15. Auto-deload programmé.',
        tags: ['force', 'progression linéaire', 'novice'],
        requiresTM: false,
        usesWorkingWeights: true,
        coreLifts: ['squat', 'bench', 'deadlift', 'press'],

        schedule: {
            days: [
                {
                    dayIndex: 0, name: 'Squat / Bench', mainLift: 'squat',
                    mainExerciseName: 'Squat',
                    secondaryLift: 'bench', secondaryExerciseName: 'Développé Couché'
                },
                {
                    dayIndex: 1, name: 'OHP / Deadlift', mainLift: 'press',
                    mainExerciseName: 'Développé Militaire',
                    secondaryLift: 'deadlift', secondaryExerciseName: 'Soulevé de Terre'
                },
                {
                    dayIndex: 2, name: 'Bench / Squat', mainLift: 'bench',
                    mainExerciseName: 'Développé Couché',
                    secondaryLift: 'squat', secondaryExerciseName: 'Squat'
                },
                {
                    dayIndex: 3, name: 'Deadlift / OHP', mainLift: 'deadlift',
                    mainExerciseName: 'Soulevé de Terre',
                    secondaryLift: 'press', secondaryExerciseName: 'Développé Militaire'
                }
            ],

            // GZCLP utilise un système de "stages" plutôt que des % de TM
            // Stage 1 (T1): 5×3 + 1+ AMRAP
            // Stage 2 (T1): 6×2
            // Stage 3 (T1): 10×1, puis reset
            // T2 stages : 3×10 → 3×8 → 3×6
            stages: {
                T1: [
                    { stage: 1, sets: 5, reps: 3, lastSetAmrap: true, deltaOnSuccess: 2.5 },
                    { stage: 2, sets: 6, reps: 2, lastSetAmrap: true, deltaOnSuccess: 2.5 },
                    { stage: 3, sets: 10, reps: 1, lastSetAmrap: true, deltaOnSuccess: 2.5, resetOnFail: true }
                ],
                T2: [
                    { stage: 1, sets: 3, reps: 10, deltaOnSuccess: 2.5 },
                    { stage: 2, sets: 3, reps: 8, deltaOnSuccess: 2.5 },
                    { stage: 3, sets: 3, reps: 6, deltaOnSuccess: 2.5, resetOnFail: true }
                ]
            },

            t3Block: {
                sets: 3,
                reps: '15+',
                lastSetAmrap: true,
                progressionTrigger: 'amrap_25',
                progressionDelta: 2.5
            },

            accessoryPlan: {
                'Squat / Bench': [
                    { name: 'Tirage Vertical', sets: 3, reps: '15+', muscle: 'back', rest: 60, type: 'compound', t3: true }
                ],
                'OHP / Deadlift': [
                    { name: 'Curl Haltères', sets: 3, reps: '15+', muscle: 'biceps', rest: 60, type: 'isolation', t3: true }
                ],
                'Bench / Squat': [
                    { name: 'Rowing Haltère', sets: 3, reps: '15+', muscle: 'back', rest: 60, type: 'compound', t3: true }
                ],
                'Deadlift / OHP': [
                    { name: 'Curl Marteau', sets: 3, reps: '15+', muscle: 'biceps', rest: 60, type: 'isolation', t3: true }
                ]
            }
        },

        progressionRules: {
            t1Success: 'increment_weight',
            t1Fail: 'next_stage',
            t1Stage3Fail: 'reset_to_stage_1_with_90pct',
            onAmrapFail: { action: 'next_stage', message: 'Échec AMRAP → progression stage suivant' }
        }
    },

    // ═══════════════════════════════════════════════════════════════════════
    // 4. STRONGLIFTS 5×5 — débutant pur, 3 jours/sem, linear simplest
    // ═══════════════════════════════════════════════════════════════════════
    {
        id: 'stronglifts-5x5',
        name: 'Stronglifts 5×5',
        shortName: 'Stronglifts',
        author: 'Mehdi (StrongLifts)',
        icon: 'star',
        difficulty: 'beginner',
        daysPerWeek: 3,
        cycleWeeks: 1,
        durationLabel: 'progression linéaire',
        summary: 'Le programme novice canonique. 5 exercices, 5×5 partout, alternance Workout A / Workout B. +2.5 kg par séance réussie.',
        description: 'Le programme le plus simple et le plus efficace pour débuter. 3 séances par semaine en alternance A/B. Chaque exercice progresse de +2.5 kg par séance réussie. Échec 3× au même poids = deload de 10%. Pendant les 3 premiers mois, c\'est imbattable.',
        tags: ['novice', 'simple', 'force'],
        requiresTM: false,
        usesWorkingWeights: true,
        coreLifts: ['squat', 'bench', 'deadlift', 'press', 'row'],

        schedule: {
            days: [
                {
                    dayIndex: 0,
                    name: 'Workout A',
                    exercises: [
                        { name: 'Squat',              sets: 5, reps: 5, kind: 'main', deltaOnSuccess: 2.5, rest: 180 },
                        { name: 'Développé Couché',   sets: 5, reps: 5, kind: 'main', deltaOnSuccess: 2.5, rest: 180 },
                        { name: 'Rowing Barre',       sets: 5, reps: 5, kind: 'main', deltaOnSuccess: 2.5, rest: 150 }
                    ]
                },
                {
                    dayIndex: 1,
                    name: 'Workout B',
                    exercises: [
                        { name: 'Squat',                sets: 5, reps: 5, kind: 'main', deltaOnSuccess: 2.5, rest: 180 },
                        { name: 'Développé Militaire',  sets: 5, reps: 5, kind: 'main', deltaOnSuccess: 2.5, rest: 180 },
                        { name: 'Soulevé de Terre',     sets: 1, reps: 5, kind: 'main', deltaOnSuccess: 5,   rest: 240 }
                    ]
                }
            ],
            // Workout A et B alternent : ABA semaine 1, BAB semaine 2, etc.
            alternates: true
        },

        progressionRules: {
            onSessionSuccess: 'increment_per_exercise',
            onTripleFail: { action: 'deload', percent: 10, message: 'Échec 3× même poids → deload -10%' }
        }
    },

    // ═══════════════════════════════════════════════════════════════════════
    // 5. PUSH PULL LEGS (Jeff Nippard 6 jours) — intermediate hypertrophy
    // ═══════════════════════════════════════════════════════════════════════
    {
        id: 'ppl-jn-6day',
        name: 'PPL Jeff Nippard',
        shortName: 'PPL 6j',
        author: 'Jeff Nippard',
        icon: 'spark',
        difficulty: 'intermediate',
        daysPerWeek: 6,
        cycleWeeks: 1,
        durationLabel: 'hypertrophie haute fréquence',
        summary: '2× Push, 2× Pull, 2× Legs sur 6 jours. Volume optimisé MEV-MAV par groupe musculaire (~16-18 sets/sem). Double progression poids/reps.',
        description: 'Variante Jeff Nippard du PPL classique. Chaque muscle frappé 2× par semaine pour optimiser la frequence (Schoenfeld). Volume autour de 16-18 sets/muscle/semaine — sweet spot MAV. Double progression : monte les reps dans la fourchette avant de monter le poids.',
        tags: ['hypertrophie', 'haute fréquence', 'volume optimal'],
        requiresTM: false,
        usesWorkingWeights: true,

        schedule: {
            days: [
                {
                    dayIndex: 0, name: 'Push A (force)',
                    exercises: [
                        { name: 'Développé Couché',           sets: 4, reps: '4-6',   muscle: 'chest',     rest: 180, type: 'compound', kind: 'main' },
                        { name: 'Développé Incliné Haltères', sets: 4, reps: '6-8',   muscle: 'chest',     rest: 120, type: 'compound' },
                        { name: 'Développé Militaire',        sets: 3, reps: '6-8',   muscle: 'shoulders', rest: 120, type: 'compound' },
                        { name: 'Élévations Latérales',       sets: 4, reps: '12-15', muscle: 'shoulders', rest: 60,  type: 'isolation' },
                        { name: 'Dips Lestés',                sets: 3, reps: '8-10',  muscle: 'triceps',   rest: 90,  type: 'compound' },
                        { name: 'Extensions Triceps Poulie',  sets: 3, reps: '12-15', muscle: 'triceps',   rest: 60,  type: 'isolation' }
                    ]
                },
                {
                    dayIndex: 1, name: 'Pull A (force)',
                    exercises: [
                        { name: 'Soulevé de Terre',     sets: 3, reps: '4-6',   muscle: 'back',    rest: 180, type: 'compound', kind: 'main' },
                        { name: 'Tractions Lestées',    sets: 4, reps: '6-8',   muscle: 'back',    rest: 150, type: 'compound' },
                        { name: 'Rowing Barre',         sets: 4, reps: '6-8',   muscle: 'back',    rest: 120, type: 'compound' },
                        { name: 'Face Pull',            sets: 3, reps: '15-20', muscle: 'rear-delts', rest: 45, type: 'isolation' },
                        { name: 'Curl Barre',           sets: 3, reps: '8-10',  muscle: 'biceps',  rest: 75, type: 'isolation' },
                        { name: 'Curl Marteau',         sets: 3, reps: '10-12', muscle: 'biceps',  rest: 60, type: 'isolation' }
                    ]
                },
                {
                    dayIndex: 2, name: 'Legs A (force)',
                    exercises: [
                        { name: 'Squat',                 sets: 4, reps: '4-6',   muscle: 'quads',      rest: 180, type: 'compound', kind: 'main' },
                        { name: 'Soulevé Roumain',       sets: 3, reps: '6-8',   muscle: 'hamstrings', rest: 150, type: 'compound' },
                        { name: 'Presse à Cuisses',      sets: 3, reps: '8-10',  muscle: 'quads',      rest: 120, type: 'compound' },
                        { name: 'Leg Curl Couché',       sets: 3, reps: '10-12', muscle: 'hamstrings', rest: 75,  type: 'isolation' },
                        { name: 'Mollets Debout',        sets: 4, reps: '8-12',  muscle: 'calves',     rest: 60,  type: 'isolation' },
                        { name: 'Crunch Suspendu',       sets: 3, reps: '10-15', muscle: 'abs',        rest: 60,  type: 'isolation' }
                    ]
                },
                {
                    dayIndex: 3, name: 'Push B (hyper)',
                    exercises: [
                        { name: 'Développé Incliné',          sets: 4, reps: '8-10',  muscle: 'chest',     rest: 120, type: 'compound' },
                        { name: 'Développé Couché Haltères',  sets: 3, reps: '10-12', muscle: 'chest',     rest: 90,  type: 'compound' },
                        { name: 'Écartés Poulies',            sets: 3, reps: '12-15', muscle: 'chest',     rest: 60,  type: 'isolation' },
                        { name: 'Arnold Press',               sets: 4, reps: '10-12', muscle: 'shoulders', rest: 90,  type: 'compound' },
                        { name: 'Élévations Latérales',       sets: 4, reps: '12-15', muscle: 'shoulders', rest: 45,  type: 'isolation' },
                        { name: 'Barre au Front',             sets: 3, reps: '10-12', muscle: 'triceps',   rest: 75,  type: 'isolation' }
                    ]
                },
                {
                    dayIndex: 4, name: 'Pull B (hyper)',
                    exercises: [
                        { name: 'Tirage Vertical',         sets: 4, reps: '8-10',  muscle: 'back',    rest: 90, type: 'compound' },
                        { name: 'Tirage Horizontal',       sets: 4, reps: '10-12', muscle: 'back',    rest: 75, type: 'compound' },
                        { name: 'Rowing Haltère',          sets: 3, reps: '10-12', muscle: 'back',    rest: 75, type: 'compound' },
                        { name: 'Oiseau Haltères',         sets: 4, reps: '12-15', muscle: 'rear-delts', rest: 45, type: 'isolation' },
                        { name: 'Curl Haltères Alterné',   sets: 3, reps: '10-12', muscle: 'biceps',  rest: 60, type: 'isolation' },
                        { name: 'Curl Concentré',          sets: 3, reps: '12-15', muscle: 'biceps',  rest: 45, type: 'isolation' }
                    ]
                },
                {
                    dayIndex: 5, name: 'Legs B (hyper)',
                    exercises: [
                        { name: 'Front Squat',           sets: 4, reps: '8-10',  muscle: 'quads',      rest: 150, type: 'compound' },
                        { name: 'Hip Thrust',            sets: 3, reps: '10-12', muscle: 'glutes',     rest: 90,  type: 'compound' },
                        { name: 'Leg Extension',         sets: 3, reps: '12-15', muscle: 'quads',      rest: 60,  type: 'isolation' },
                        { name: 'Leg Curl Assis',        sets: 3, reps: '12-15', muscle: 'hamstrings', rest: 60,  type: 'isolation' },
                        { name: 'Mollets Assis',         sets: 4, reps: '15-20', muscle: 'calves',     rest: 45,  type: 'isolation' },
                        { name: 'Planche',               sets: 3, reps: '60s',   muscle: 'abs',        rest: 60,  type: 'isolation' }
                    ]
                }
            ]
        },

        progressionRules: {
            type: 'double_progression',
            description: 'Atteindre le haut de la fourchette de reps sur tous les sets, puis +2.5kg → repartir au bas'
        }
    },

    // ═══════════════════════════════════════════════════════════════════════
    // 6. UPPER/LOWER 4 jours — intermediate, balanced
    // ═══════════════════════════════════════════════════════════════════════
    {
        id: 'upper-lower-4day',
        name: 'Upper / Lower 4j',
        shortName: 'U/L 4j',
        author: 'Repzy',
        icon: 'split',
        difficulty: 'intermediate',
        daysPerWeek: 4,
        cycleWeeks: 1,
        durationLabel: 'fréquence 2/semaine par muscle',
        summary: 'Lundi Upper Force, Mardi Lower Force, Jeudi Upper Hyper, Vendredi Lower Hyper. Chaque muscle 2× par semaine. Sweet spot débutant→intermédiaire.',
        description: 'Le split le plus polyvalent. Sépare le corps en haut/bas, alterne séances "force" (rep ranges 4-6, intensités 80%+) et "hyper" (rep ranges 8-12, volume). Excellente fréquence stimulante (2× par muscle), récup confortable. Convient à 90% des intermédiaires.',
        tags: ['polyvalent', 'fréquence', 'intermédiaire'],
        requiresTM: false,
        usesWorkingWeights: true,

        schedule: {
            days: [
                {
                    dayIndex: 0, name: 'Upper Force',
                    exercises: [
                        { name: 'Développé Couché',     sets: 4, reps: '4-6',   muscle: 'chest',     rest: 180, type: 'compound', kind: 'main' },
                        { name: 'Rowing Barre',         sets: 4, reps: '4-6',   muscle: 'back',      rest: 150, type: 'compound', kind: 'main' },
                        { name: 'Développé Militaire',  sets: 3, reps: '6-8',   muscle: 'shoulders', rest: 120, type: 'compound' },
                        { name: 'Tractions',            sets: 3, reps: '6-10',  muscle: 'back',      rest: 120, type: 'compound' },
                        { name: 'Curl Barre',           sets: 3, reps: '8-10',  muscle: 'biceps',    rest: 75,  type: 'isolation' },
                        { name: 'Barre au Front',       sets: 3, reps: '8-10',  muscle: 'triceps',   rest: 75,  type: 'isolation' }
                    ]
                },
                {
                    dayIndex: 1, name: 'Lower Force',
                    exercises: [
                        { name: 'Squat',                 sets: 4, reps: '4-6',   muscle: 'quads',      rest: 180, type: 'compound', kind: 'main' },
                        { name: 'Soulevé Roumain',       sets: 3, reps: '6-8',   muscle: 'hamstrings', rest: 150, type: 'compound' },
                        { name: 'Presse à Cuisses',      sets: 3, reps: '8-10',  muscle: 'quads',      rest: 120, type: 'compound' },
                        { name: 'Leg Curl',              sets: 3, reps: '10-12', muscle: 'hamstrings', rest: 75,  type: 'isolation' },
                        { name: 'Mollets Debout',        sets: 4, reps: '8-12',  muscle: 'calves',     rest: 60,  type: 'isolation' },
                        { name: 'Crunch Suspendu',      sets: 3, reps: '10-15', muscle: 'abs',        rest: 60,  type: 'isolation' }
                    ]
                },
                {
                    dayIndex: 2, name: 'Upper Hyper',
                    exercises: [
                        { name: 'Développé Incliné Haltères', sets: 4, reps: '8-10',  muscle: 'chest',     rest: 120, type: 'compound' },
                        { name: 'Tirage Horizontal',          sets: 4, reps: '8-10',  muscle: 'back',      rest: 90,  type: 'compound' },
                        { name: 'Élévations Latérales',       sets: 4, reps: '12-15', muscle: 'shoulders', rest: 45,  type: 'isolation' },
                        { name: 'Face Pull',                  sets: 3, reps: '15-20', muscle: 'rear-delts',rest: 45,  type: 'isolation' },
                        { name: 'Curl Haltères',              sets: 3, reps: '10-12', muscle: 'biceps',    rest: 60,  type: 'isolation' },
                        { name: 'Extensions Triceps Poulie',  sets: 3, reps: '10-12', muscle: 'triceps',   rest: 60,  type: 'isolation' }
                    ]
                },
                {
                    dayIndex: 3, name: 'Lower Hyper',
                    exercises: [
                        { name: 'Front Squat',           sets: 4, reps: '8-10',  muscle: 'quads',      rest: 150, type: 'compound' },
                        { name: 'Hip Thrust',            sets: 3, reps: '8-10',  muscle: 'glutes',     rest: 90,  type: 'compound' },
                        { name: 'Leg Extension',         sets: 3, reps: '12-15', muscle: 'quads',      rest: 60,  type: 'isolation' },
                        { name: 'Leg Curl Assis',        sets: 3, reps: '10-12', muscle: 'hamstrings', rest: 60,  type: 'isolation' },
                        { name: 'Mollets Assis',         sets: 4, reps: '12-15', muscle: 'calves',     rest: 45,  type: 'isolation' },
                        { name: 'Planche',               sets: 3, reps: '60s',   muscle: 'abs',        rest: 60,  type: 'isolation' }
                    ]
                }
            ]
        },

        progressionRules: {
            type: 'double_progression',
            description: 'Reach top of rep range on all sets → +2.5kg → restart bottom of range'
        }
    }
];

// Export
if (typeof window !== 'undefined') {
    window.BUILTIN_PROGRAMS = BUILTIN_PROGRAMS;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BUILTIN_PROGRAMS };
}
