// ==================== COACH ENGINE ====================
// Façade unifiée : SmartTraining + AIInsights + détection stagnation
// Les modules originaux sont conservés pour compatibilité — coach-engine
// centralise l'accès et ajoute des fonctions manquantes.
// ======================================================

(function () {
    'use strict';

    // ── Helpers ────────────────────────────────────────────────────
    function _progressLog(exerciseName) {
        const key = (window.SmartTraining?.normalizeExerciseName || ((n) => n.toLowerCase().trim()))(exerciseName);
        return window.state?.progressLog?.[key] || window.state?.progressLog?.[exerciseName] || [];
    }

    // ── Détection de stagnation ─────────────────────────────────
    /**
     * Détecte si un exercice stagne (poids inchangé sur N séances).
     * @param {string} exerciseName
     * @param {number} sessionsThreshold — nombre de séances pour déclarer stagnation (défaut 3)
     * @returns {{ stagnating: boolean, sessions: number, weight: number|null, message: string }}
     */
    function detectStagnation(exerciseName, sessionsThreshold) {
        sessionsThreshold = sessionsThreshold || 3;
        const logs = _progressLog(exerciseName);
        if (logs.length < sessionsThreshold) {
            return { stagnating: false, sessions: logs.length, weight: null, message: '' };
        }

        const recent = logs.slice(-sessionsThreshold);
        const weights = recent.map(l => {
            if (l.setsDetail && l.setsDetail.length > 0) {
                const maxW = Math.max(...l.setsDetail.filter(s => !s.isWarmup).map(s => s.weight || 0));
                return maxW;
            }
            return l.weight || 0;
        }).filter(w => w > 0);

        if (weights.length < sessionsThreshold) return { stagnating: false, sessions: logs.length, weight: null, message: '' };

        const allSame = weights.every(w => Math.abs(w - weights[0]) < 1.25); // <1.25kg de variation
        const maxWeight = Math.max(...weights);

        return {
            stagnating: allSame,
            sessions: sessionsThreshold,
            weight: maxWeight,
            message: allSame
                ? `${exerciseName} : poids inchangé (${maxWeight}kg) sur ${sessionsThreshold} séances — essaie de varier les reps ou la technique.`
                : ''
        };
    }

    // ── Suggestions d'exercices alternatifs ────────────────────
    const EXERCISE_ALTERNATIVES = {
        'développé couché barre': ['Développé Couché Haltères', 'Pompes lestées', 'Développé Incliné Barre'],
        'squat': ['Hack Squat', 'Presse à Cuisses', 'Bulgarian Split Squat'],
        'soulevé de terre': ['Soulevé de Terre Roumain', 'Trap Bar Deadlift', 'Good Morning'],
        'tractions': ['Tirage Vertical', 'Tirage Nuque', 'Rowing Barre'],
        'rowing barre': ['Rowing Haltères', 'T-Bar Row', 'Tirage Poulie Basse'],
        'développé militaire': ['Développé Épaules Haltères', 'Arnold Press', 'Élévation Latérale lestée'],
        'curl barre': ['Curl Haltères', 'Curl Marteau', 'Curl Incliné'],
        'triceps barre': ['Dips lestés', 'Pushdown Poulie', 'Développé Couché Prise Serrée']
    };

    function suggestAlternativeExercises(exerciseName) {
        const key = (exerciseName || '').toLowerCase().trim();
        // Cherche une correspondance exacte ou partielle
        for (const [base, alts] of Object.entries(EXERCISE_ALTERNATIVES)) {
            if (key.includes(base) || base.includes(key)) {
                return alts;
            }
        }
        return [];
    }

    // ── Rapport de progression semaine ────────────────────────
    /**
     * Génère un rapport court pour la semaine écoulée
     * @returns {object} { totalSessions, totalVolume, topExercise, newPRs, message }
     */
    function weeklyProgressReport() {
        const today = new Date();
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay() + 1); // Lundi
        const weekStartStr = weekStart.toISOString().split('T')[0];

        const sessions = (window.state?.sessionHistory || [])
            .filter(s => s.date >= weekStartStr);

        let totalVolume = 0;
        let newPRs = 0;

        sessions.forEach(s => {
            (s.exercises || []).forEach(ex => {
                (ex.setsDetail || []).forEach(set => {
                    if (!set.isWarmup) {
                        totalVolume += (set.weight || 0) * (set.reps || 0);
                    }
                });
            });
            newPRs += (s.newPRs || []).length;
        });

        return {
            totalSessions: sessions.length,
            totalVolume: Math.round(totalVolume),
            newPRs,
            message: sessions.length === 0
                ? 'Pas encore de séance cette semaine. C\'est le moment !'
                : `${sessions.length} séance${sessions.length > 1 ? 's' : ''} · ${Math.round(totalVolume / 1000)}t de volume${newPRs > 0 ? ` · ${newPRs} PR` : ''}`
        };
    }

    // ── Public API ──────────────────────────────────────────────
    window.CoachEngine = {
        // Proxy SmartTraining
        get smart() { return window.SmartTraining; },
        suggestWeight: (name) => window.SmartTraining?.calculateSuggestedWeight(name),
        muscleRecovery: () => window.SmartTraining?.calculateMuscleRecovery(),
        estimate1RM: (weight, reps) => window.SmartTraining?.calculate1RM(weight, reps),
        isCompound: (name) => window.SmartTraining?.isCompoundExercise(name),

        // Proxy AIInsights
        get insights() { return window.AIInsights; },
        refreshInsights: () => window.AIInsights?.refresh(),

        // Propre à CoachEngine
        detectStagnation,
        suggestAlternatives: suggestAlternativeExercises,
        weeklyReport: weeklyProgressReport,

        // Warmup (défini dans training.js, exposé ici pour cohérence)
        computeWarmupSets: (w, n, e) => typeof computeWarmupSets === 'function'
            ? computeWarmupSets(w, n, e)
            : []
    };

    console.log('🏆 CoachEngine loaded (SmartTraining + AIInsights façade + stagnation detection)');
})();
