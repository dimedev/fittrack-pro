// ==================== SESSION HYDRATION (V11-A) ====================
// Backfill du champ `muscle` sur les sessions historiques.
//
// Avant V11, finishSession poussait { exercise, sets } SANS le muscle.
// Conséquence :
//   - calculateMuscleRecovery (coach-engine) tombait sur 'other' → 100% partout
//   - "Muscles oubliés" insights → tous les muscles considérés non-entraînés
//   - Stim musculaire / Volume hebdo MEV/MAV/MRV → 0% partout
//
// Ce module re-hydrate les sessions existantes une seule fois au boot, en
// faisant un lookup `findExerciseByName(ex.exercise)` → ex.muscle.
// Marker `_hydrated_v11: true` pour idempotence.

(function() {
    'use strict';

    /**
     * Hydrate le champ `muscle` sur les exercices d'une session.
     * @param {object} session - une entrée de state.sessionHistory
     * @returns {boolean} - true si la session a été modifiée
     */
    function hydrateSession(session) {
        if (!session || session._hydrated_v11) return false;
        if (!Array.isArray(session.exercises)) {
            session._hydrated_v11 = true;
            return false;
        }

        let modified = false;
        session.exercises.forEach(ex => {
            // Si déjà présent et non-null, skip
            if (ex.muscle && typeof ex.muscle === 'string') return;

            const exName = ex.exercise || ex.name || ex.effectiveName;
            if (!exName) return;

            // Lookup via training-shared.js
            const found = (typeof window.findExerciseByName === 'function')
                ? window.findExerciseByName(exName)
                : null;

            if (found && found.muscle) {
                ex.muscle = found.muscle;
                modified = true;
            }
        });

        session._hydrated_v11 = true;
        return modified;
    }

    /**
     * Hydrate toutes les sessions historiques au boot.
     * Idempotent : passe une seule fois par session grâce au marker `_hydrated_v11`.
     * @returns {object} - { total, modified, skipped }
     */
    function hydrateAllSessions() {
        if (typeof state === 'undefined' || !state || !Array.isArray(state.sessionHistory)) {
            return { total: 0, modified: 0, skipped: 0 };
        }

        // Attendre que state.exercises soit bien chargé (sinon findExerciseByName retourne null)
        if (!Array.isArray(state.exercises) || state.exercises.length === 0) {
            return { total: 0, modified: 0, skipped: 0, deferred: true };
        }

        let modified = 0;
        let skipped = 0;
        const total = state.sessionHistory.length;

        state.sessionHistory.forEach(session => {
            if (session._hydrated_v11) {
                skipped++;
                return;
            }
            if (hydrateSession(session)) {
                modified++;
            }
        });

        // Persist si on a modifié au moins une session
        if (modified > 0 && typeof saveState === 'function') {
            try { saveState(); } catch (e) { console.warn('[V11-A] saveState failed', e); }
        }

        if (modified > 0 || total > 0) {
            console.log(`[V11-A] Session hydration: ${modified}/${total} sessions backfilled (${skipped} already done)`);
        }

        return { total, modified, skipped };
    }

    /**
     * Hook au boot. Idempotent + gracieux si state pas encore prêt.
     */
    function init() {
        // Premier essai au DOMContentLoaded
        const tryHydrate = () => {
            const result = hydrateAllSessions();
            if (result.deferred) {
                // state.exercises pas encore prêt — réessayer dans 500ms (max 5 fois)
                let retries = 0;
                const interval = setInterval(() => {
                    retries++;
                    const r = hydrateAllSessions();
                    if (!r.deferred || retries >= 5) {
                        clearInterval(interval);
                    }
                }, 500);
            }
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', tryHydrate, { once: true });
        } else {
            // DOM déjà prêt — différer pour laisser state.js finir loadState()
            setTimeout(tryHydrate, 100);
        }
    }

    // Expose globalement pour debug
    window.SessionHydration = {
        hydrateSession,
        hydrateAllSessions,
        init
    };

    // Auto-init
    init();
})();
