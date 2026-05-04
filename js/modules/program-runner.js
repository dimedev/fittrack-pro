// ════════════════════════════════════════════════════════════════════════════
// V9 — PROGRAM RUNNER
// Interprète les programmes BUILTIN_PROGRAMS et gère leur progression.
// ════════════════════════════════════════════════════════════════════════════
//
// État persisté (state.activeBuiltinProgram) :
//   {
//     programId: '531-bbb',
//     startedAt: '2026-04-29',
//     cycleNumber: 1,                    // 1er cycle, 2e cycle...
//     currentWeek: 1,                    // 1..cycleWeeks
//     currentDayIndex: 0,                // index du prochain jour à faire
//     trainingMaxes: { squat, bench, deadlift, press }, // % de 1RM (90% TM)
//     workingWeights: { squat, bench, ... },            // pour programmes non-TM
//     gzclpStages: { T1: { squat: 1, bench: 1, ... }, T2: { ... } }, // pour GZCLP
//     amrapHistory: [{ date, lift, week, target, actual }],
//     strongliftsFails: { squat: 0, bench: 0, ... },    // compteur 3-strikes
//     completed: false,                  // true si le user a stop le programme
//     history: [{ date, week, day, dayName, exercises[], success }]
//   }
//
// API publique :
//   ProgramRunner.startProgram(programId, options) → init state
//   ProgramRunner.getNextSession()            → { day, exercises[] } à faire
//   ProgramRunner.completeSession(sessionData) → avance le pointeur, applique progression
//   ProgramRunner.getCurrentProgress()        → { cycleNumber, week, dayIndex, totalSessions }
//   ProgramRunner.getProgramById(id)          → reco lookup
//   ProgramRunner.stopProgram()               → archive le programme
//
// ════════════════════════════════════════════════════════════════════════════

const ProgramRunner = (function () {

    // Round à 2.5kg (plate plus petit dispo) — convention salle EU
    function roundToPlate(weight) {
        if (weight == null || isNaN(weight)) return 0;
        return Math.round(weight / 2.5) * 2.5;
    }

    function getProgramById(programId) {
        const programs = (typeof window !== 'undefined' && window.BUILTIN_PROGRAMS) || [];
        return programs.find(p => p.id === programId) || null;
    }

    function listPrograms() {
        return (typeof window !== 'undefined' && window.BUILTIN_PROGRAMS) || [];
    }

    /**
     * Démarre un programme. Initialise state.activeBuiltinProgram.
     * options = { trainingMaxes?, workingWeights?, startDate? }
     */
    function startProgram(programId, options = {}) {
        const program = getProgramById(programId);
        if (!program) {
            console.error('[ProgramRunner] Programme inconnu:', programId);
            return null;
        }

        const startedAt = options.startDate || new Date().toISOString().slice(0, 10);
        const active = {
            programId: program.id,
            startedAt,
            cycleNumber: 1,
            currentWeek: 1,
            currentDayIndex: 0,
            trainingMaxes: options.trainingMaxes || {},
            workingWeights: options.workingWeights || {},
            amrapHistory: [],
            history: [],
            completed: false
        };

        // GZCLP : init stages à 1 pour chaque coreLift
        if (program.id === 'gzclp') {
            active.gzclpStages = { T1: {}, T2: {} };
            (program.coreLifts || []).forEach(lift => {
                active.gzclpStages.T1[lift] = 1;
                active.gzclpStages.T2[lift] = 1;
            });
        }

        // Stronglifts : init compteurs d'échec
        if (program.id === 'stronglifts-5x5') {
            active.strongliftsFails = {};
            (program.coreLifts || []).forEach(lift => {
                active.strongliftsFails[lift] = 0;
            });
        }

        if (typeof state !== 'undefined') {
            state.activeBuiltinProgram = active;
            if (typeof saveState === 'function') saveState();
        }

        return active;
    }

    /**
     * Stop un programme actif (archive, ne supprime pas l'historique).
     */
    function stopProgram() {
        if (typeof state === 'undefined' || !state.activeBuiltinProgram) return;
        state.activeBuiltinProgram.completed = true;
        state.activeBuiltinProgram.completedAt = new Date().toISOString();
        if (typeof saveState === 'function') saveState();
    }

    /**
     * Retourne la prochaine session à faire (day + exercises calculés).
     * @returns {Object|null} { day, weekNumber, weekLabel, dayName, exercises[] }
     */
    function getNextSession() {
        if (typeof state === 'undefined' || !state.activeBuiltinProgram || state.activeBuiltinProgram.completed) {
            return null;
        }
        const active = state.activeBuiltinProgram;
        const program = getProgramById(active.programId);
        if (!program) return null;

        const days = program.schedule.days || [];
        if (days.length === 0) return null;

        const currentDay = days[active.currentDayIndex % days.length];
        if (!currentDay) return null;

        const weekTpl = program.schedule.weekTemplates && program.schedule.weekTemplates[active.currentWeek];
        const weekLabel = weekTpl ? weekTpl.name : `Semaine ${active.currentWeek}`;

        // Compose la liste d'exercices selon le type de programme
        const exercises = _buildExercisesForDay(program, currentDay, active);

        return {
            programId: program.id,
            programName: program.name,
            cycleNumber: active.cycleNumber,
            weekNumber: active.currentWeek,
            weekLabel,
            dayIndex: active.currentDayIndex,
            dayName: currentDay.name,
            mainLift: currentDay.mainLift || null,
            isDeload: !!(weekTpl && weekTpl.deload),
            exercises
        };
    }

    /**
     * Construit la liste d'exercices pour un jour donné selon le type de prog.
     */
    function _buildExercisesForDay(program, day, active) {
        const sched = program.schedule;
        const out = [];

        // Cas 1 : programme avec jours pré-énumérés (Stronglifts, PPL JN, U/L 4j)
        if (Array.isArray(day.exercises)) {
            day.exercises.forEach(ex => {
                const baseWeight = active.workingWeights[_normalizeLiftKey(ex.name)] || 0;
                out.push({
                    name: ex.name,
                    sets: ex.sets,
                    reps: ex.reps,
                    muscle: ex.muscle || '',
                    rest: ex.rest || 90,
                    type: ex.type || 'compound',
                    kind: ex.kind || 'standard',
                    suggestedWeight: baseWeight > 0 ? baseWeight : null,
                    deltaOnSuccess: ex.deltaOnSuccess || null,
                    note: null
                });
            });
            return out;
        }

        // Cas 2 : programme percentage-based (5/3/1, nSuns)
        const weekTpl = sched.weekTemplates && sched.weekTemplates[active.currentWeek];

        // 2a — Main lift (pyramide selon weekTpl.mainSets)
        if (day.mainLift && weekTpl && Array.isArray(weekTpl.mainSets)) {
            const tm = active.trainingMaxes[day.mainLift];
            if (tm) {
                weekTpl.mainSets.forEach((s, idx) => {
                    out.push({
                        name: day.mainExerciseName || day.mainLift,
                        sets: 1,
                        setIndex: idx + 1,
                        totalSets: weekTpl.mainSets.length,
                        reps: s.reps,
                        suggestedWeight: roundToPlate(tm * (s.percent / 100)),
                        percent: s.percent,
                        intensityLabel: `${s.percent}% TM`,
                        muscle: '',
                        rest: 180,
                        type: 'compound',
                        kind: 'main',
                        amrap: !!s.amrap
                    });
                });
            }
        }

        // 2b — BBB assistance (5×10 @ 50% TM sur le main lift)
        if (sched.bbbAssistance && day.mainLift && (!weekTpl || !weekTpl.deload || !sched.bbbAssistance.onlyOnNonDeload)) {
            const tm = active.trainingMaxes[day.mainLift];
            if (tm) {
                out.push({
                    name: day.mainExerciseName || day.mainLift,
                    sets: sched.bbbAssistance.sets,
                    reps: sched.bbbAssistance.reps,
                    suggestedWeight: roundToPlate(tm * (sched.bbbAssistance.percent / 100)),
                    percent: sched.bbbAssistance.percent,
                    intensityLabel: `${sched.bbbAssistance.percent}% TM · BBB`,
                    muscle: '',
                    rest: 90,
                    type: 'compound',
                    kind: 'bbb'
                });
            }
        }

        // 2c — Secondary lift (nSuns)
        if (day.secondaryLift && weekTpl && Array.isArray(weekTpl.secondarySets)) {
            const tmSec = active.trainingMaxes[day.secondaryLift];
            if (tmSec) {
                weekTpl.secondarySets.forEach((s, idx) => {
                    out.push({
                        name: day.secondaryExerciseName || day.secondaryLift,
                        sets: 1,
                        setIndex: idx + 1,
                        totalSets: weekTpl.secondarySets.length,
                        reps: s.reps,
                        suggestedWeight: roundToPlate(tmSec * (s.percent / 100)),
                        percent: s.percent,
                        intensityLabel: `${s.percent}% TM`,
                        muscle: '',
                        rest: 120,
                        type: 'compound',
                        kind: 'secondary',
                        amrap: !!s.amrap
                    });
                });
            }
        }

        // 2d — GZCLP T1 + T2 (stage-based, pas de TM)
        if (program.id === 'gzclp' && day.mainLift) {
            const stageT1 = (active.gzclpStages && active.gzclpStages.T1[day.mainLift]) || 1;
            const t1Cfg = sched.stages.T1[stageT1 - 1];
            const baseT1 = active.workingWeights[day.mainLift] || 0;
            if (t1Cfg) {
                out.push({
                    name: day.mainExerciseName || day.mainLift,
                    sets: t1Cfg.sets,
                    reps: t1Cfg.reps,
                    suggestedWeight: baseT1 > 0 ? baseT1 : null,
                    intensityLabel: `T1 · stage ${stageT1}`,
                    muscle: '',
                    rest: 180,
                    type: 'compound',
                    kind: 'main',
                    amrap: !!t1Cfg.lastSetAmrap
                });
            }

            if (day.secondaryLift) {
                const stageT2 = (active.gzclpStages && active.gzclpStages.T2[day.secondaryLift]) || 1;
                const t2Cfg = sched.stages.T2[stageT2 - 1];
                const baseT2 = active.workingWeights[day.secondaryLift] || 0;
                if (t2Cfg) {
                    out.push({
                        name: day.secondaryExerciseName || day.secondaryLift,
                        sets: t2Cfg.sets,
                        reps: t2Cfg.reps,
                        suggestedWeight: baseT2 > 0 ? roundToPlate(baseT2 * 0.65) : null,
                        intensityLabel: `T2 · stage ${stageT2}`,
                        muscle: '',
                        rest: 120,
                        type: 'compound',
                        kind: 'secondary'
                    });
                }
            }
        }

        // 2e — Accessoires (T3 pour GZCLP, ou plain accessories pour 5/3/1, nSuns)
        const accessories = (sched.accessoryPlan && sched.accessoryPlan[day.name]) || [];
        accessories.forEach(ex => {
            out.push({
                name: ex.name,
                sets: ex.sets,
                reps: ex.reps,
                muscle: ex.muscle || '',
                rest: ex.rest || 60,
                type: ex.type || 'isolation',
                kind: ex.t3 ? 't3' : 'accessory',
                suggestedWeight: null
            });
        });

        return out;
    }

    /**
     * Marque une session comme complétée et avance le pointeur.
     * sessionData = { exercises: [{ name, sets: [{weight, reps, rpe}], success }] }
     */
    function completeSession(sessionData) {
        if (typeof state === 'undefined' || !state.activeBuiltinProgram) return;
        const active = state.activeBuiltinProgram;
        const program = getProgramById(active.programId);
        if (!program) return;

        // 1. Logger l'entrée d'historique
        active.history.push({
            date: new Date().toISOString().slice(0, 10),
            cycleNumber: active.cycleNumber,
            weekNumber: active.currentWeek,
            dayIndex: active.currentDayIndex,
            sessionData
        });

        // 2. Appliquer la logique de progression spécifique au programme
        try {
            if (program.id === 'stronglifts-5x5') {
                _applyStrongliftsProgression(active, program, sessionData);
            } else if (program.id === 'gzclp') {
                _applyGzclpProgression(active, program, sessionData);
            }
            // 5/3/1 / nSuns : progression au cycle complete (cf. _maybeAdvanceCycle)
        } catch (err) {
            console.warn('[ProgramRunner] Erreur progression:', err);
        }

        // 3. Avancer le jour
        const days = program.schedule.days || [];
        active.currentDayIndex = active.currentDayIndex + 1;

        // 4. Si on a fait tous les jours du cycle, passer à la semaine suivante
        if (active.currentDayIndex >= days.length) {
            active.currentDayIndex = 0;
            active.currentWeek = active.currentWeek + 1;

            // Cycle complet ?
            if (active.currentWeek > program.cycleWeeks) {
                _maybeAdvanceCycle(active, program);
                active.currentWeek = 1;
                active.cycleNumber = active.cycleNumber + 1;
            }
        }

        if (typeof saveState === 'function') saveState();
    }

    /**
     * Stronglifts 5×5 : +2.5kg si succès, 3 fails consécutifs = deload -10%
     */
    function _applyStrongliftsProgression(active, program, sessionData) {
        if (!sessionData || !Array.isArray(sessionData.exercises)) return;

        sessionData.exercises.forEach(ex => {
            const liftKey = _normalizeLiftKey(ex.name);
            if (!liftKey) return;

            const sets = ex.sets || [];
            const allHit = sets.length > 0 && sets.every(s => (s.reps || 0) >= 5);
            const currentWeight = active.workingWeights[liftKey] || (sets[0] && sets[0].weight) || 0;

            if (allHit) {
                const delta = (program.schedule.days[0].exercises.find(e => _normalizeLiftKey(e.name) === liftKey) || {}).deltaOnSuccess || 2.5;
                active.workingWeights[liftKey] = currentWeight + delta;
                active.strongliftsFails[liftKey] = 0;
            } else {
                active.strongliftsFails[liftKey] = (active.strongliftsFails[liftKey] || 0) + 1;
                if (active.strongliftsFails[liftKey] >= 3) {
                    active.workingWeights[liftKey] = roundToPlate(currentWeight * 0.9);
                    active.strongliftsFails[liftKey] = 0;
                }
            }
        });
    }

    /**
     * GZCLP : T1 success → +2.5kg ; fail → next stage ; stage 3 fail → reset stage 1 @ 90%.
     */
    function _applyGzclpProgression(active, program, sessionData) {
        if (!sessionData || !Array.isArray(sessionData.exercises)) return;

        sessionData.exercises.forEach(ex => {
            const liftKey = _normalizeLiftKey(ex.name);
            if (!liftKey) return;
            if (ex.kind !== 'main' && ex.kind !== 'secondary') return;

            const tier = ex.kind === 'main' ? 'T1' : 'T2';
            const stage = (active.gzclpStages && active.gzclpStages[tier][liftKey]) || 1;
            const stageCfg = program.schedule.stages[tier][stage - 1];
            if (!stageCfg) return;

            const sets = ex.sets || [];
            const targetReps = parseInt(stageCfg.reps, 10) || 0;
            const allHit = sets.length > 0 && sets.every(s => (s.reps || 0) >= targetReps);
            const currentWeight = active.workingWeights[liftKey] || (sets[0] && sets[0].weight) || 0;

            if (allHit) {
                active.workingWeights[liftKey] = currentWeight + (stageCfg.deltaOnSuccess || 2.5);
            } else {
                if (stage < program.schedule.stages[tier].length) {
                    active.gzclpStages[tier][liftKey] = stage + 1;
                } else {
                    active.gzclpStages[tier][liftKey] = 1;
                    active.workingWeights[liftKey] = roundToPlate(currentWeight * 0.9);
                }
            }
        });
    }

    /**
     * Fin de cycle (5/3/1, nSuns) : applique +2.5kg upper / +5kg lower aux TM.
     */
    function _maybeAdvanceCycle(active, program) {
        if (!program.progressionRules || !program.progressionRules.onCycleComplete) return;
        const rules = program.progressionRules.onCycleComplete;

        if (rules.upperLifts && Array.isArray(rules.upperLifts.applies)) {
            rules.upperLifts.applies.forEach(lift => {
                if (active.trainingMaxes[lift] != null) {
                    active.trainingMaxes[lift] = roundToPlate(active.trainingMaxes[lift] + rules.upperLifts.delta);
                }
            });
        }
        if (rules.lowerLifts && Array.isArray(rules.lowerLifts.applies)) {
            rules.lowerLifts.applies.forEach(lift => {
                if (active.trainingMaxes[lift] != null) {
                    active.trainingMaxes[lift] = roundToPlate(active.trainingMaxes[lift] + rules.lowerLifts.delta);
                }
            });
        }
    }

    /**
     * Retourne un statut de progression pour l'UI.
     */
    function getCurrentProgress() {
        if (typeof state === 'undefined' || !state.activeBuiltinProgram) return null;
        const a = state.activeBuiltinProgram;
        const program = getProgramById(a.programId);
        if (!program) return null;

        const totalSessions = (a.history || []).length;
        return {
            programId: a.programId,
            programName: program.name,
            cycleNumber: a.cycleNumber,
            currentWeek: a.currentWeek,
            cycleWeeks: program.cycleWeeks,
            currentDayIndex: a.currentDayIndex,
            daysPerWeek: program.daysPerWeek,
            totalSessions,
            startedAt: a.startedAt,
            isCompleted: !!a.completed,
            isDeloadWeek: !!(program.schedule.weekTemplates &&
                              program.schedule.weekTemplates[a.currentWeek] &&
                              program.schedule.weekTemplates[a.currentWeek].deload)
        };
    }

    /**
     * Mappe un nom d'exercice vers une clé canonique pour les progressions.
     * (squat, bench, deadlift, press, row)
     */
    function _normalizeLiftKey(name) {
        if (!name) return null;
        const n = name.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (n.includes('squat') && !n.includes('front')) return 'squat';
        if (n.includes('front squat')) return 'squat'; // traité séparément si needed
        if (n.includes('developpe couche') || n.includes('bench')) return 'bench';
        if (n.includes('developpe militaire') || n.includes('ohp') || n.includes('press')) return 'press';
        if (n.includes('souleve de terre') || n.includes('deadlift')) return 'deadlift';
        if (n.includes('rowing barre')) return 'row';
        return null;
    }

    /**
     * Estime des Training Maxes par défaut à partir du progressLog (90% du best).
     * Utile au démarrage d'un programme 5/3/1.
     */
    function estimateTMsFromHistory() {
        const out = { squat: null, bench: null, deadlift: null, press: null };
        if (typeof state === 'undefined' || !state.progressLog) return out;

        const liftMatchers = {
            squat:    name => /squat/i.test(name) && !/front/i.test(name),
            bench:    name => /developpe couche|bench press/i.test(name),
            deadlift: name => /souleve de terre|deadlift/i.test(name),
            press:    name => /developpe militaire|^ohp|overhead press/i.test(name)
        };

        Object.keys(state.progressLog).forEach(exName => {
            const logs = state.progressLog[exName];
            if (!logs || logs.length === 0) return;

            const bestWeight = logs.reduce((max, log) => {
                const w = log.weight || 0;
                return w > max ? w : max;
            }, 0);

            Object.keys(liftMatchers).forEach(liftKey => {
                if (liftMatchers[liftKey](exName) && bestWeight > 0) {
                    if (out[liftKey] == null || bestWeight > out[liftKey]) {
                        out[liftKey] = bestWeight;
                    }
                }
            });
        });

        // Convert best lift estimés en TM (≈ 90% de l'estimé 1RM)
        Object.keys(out).forEach(k => {
            if (out[k] != null) {
                out[k] = roundToPlate(out[k] * 0.9);
            }
        });

        return out;
    }

    return {
        startProgram,
        stopProgram,
        getNextSession,
        completeSession,
        getCurrentProgress,
        getProgramById,
        listPrograms,
        estimateTMsFromHistory,
        // exposed for tests
        _normalizeLiftKey,
        _buildExercisesForDay
    };
})();

if (typeof window !== 'undefined') {
    window.ProgramRunner = ProgramRunner;
}
