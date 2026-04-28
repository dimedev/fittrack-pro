// ==================== FITTRACK PRO — COACH VOLUME (V8-A) ====================
// MEV / MAV / MRV per muscle group — Renaissance Periodization (Mike Israetel)
// Calcule le volume hebdomadaire par groupe musculaire (sets de travail × fraction
// d'engagement) et le compare aux landmarks scientifiques.
//
// Concepts :
//   - MEV (Minimum Effective Volume) : seuil minimum pour un gain. En dessous = sous-stim.
//   - MAV (Maximum Adaptive Volume) : zone optimale de progression.
//   - MRV (Maximum Recoverable Volume) : seuil au-dessus duquel la récup est compromise.
//
// Comptabilisation des sets :
//   - Working set sur muscle primaire = 1.0 set
//   - Working set sur muscle secondaire = 0.5 set (fractional sets, RP doctrine)
//   - Warmup sets = 0 (exclus)
//
// Exports : window.CoachVolume
// =========================================================================

(function() {
    'use strict';

    // ==================== CANONICAL MUSCLE GROUPS ====================

    // 10 groupes musculaires affichés dans le coach.
    // Source : compromis entre RP (Israetel) et UI (regroupement des sous-faisceaux).
    const MUSCLE_GROUPS = {
        chest:      { id: 'chest',      label: 'Pectoraux',   short: 'PECS' },
        back:       { id: 'back',       label: 'Dos',         short: 'DOS'  },
        shoulders:  { id: 'shoulders',  label: 'Épaules',     short: 'ÉPA'  },
        biceps:     { id: 'biceps',     label: 'Biceps',      short: 'BIC'  },
        triceps:    { id: 'triceps',    label: 'Triceps',     short: 'TRI'  },
        quads:      { id: 'quads',      label: 'Quadriceps',  short: 'QUAD' },
        hamstrings: { id: 'hamstrings', label: 'Ischios',     short: 'ISCH' },
        glutes:     { id: 'glutes',     label: 'Fessiers',    short: 'FESS' },
        calves:     { id: 'calves',     label: 'Mollets',     short: 'MOL'  },
        abs:        { id: 'abs',        label: 'Abdos',       short: 'ABS'  }
    };

    // ==================== ISRAETEL VOLUME LANDMARKS ====================
    // Sets par semaine. Sources : RP "Scientific Principles of Hypertrophy Training".
    // Valeurs ajustées pour un intermédiaire ; un débutant peut faire moins, un
    // avancé un peu plus. On reste sur les médianes documentées.
    const VOLUME_LANDMARKS = {
        chest:      { mev: 8,  mav: 16, mrv: 22 },
        back:       { mev: 10, mav: 18, mrv: 25 },
        shoulders:  { mev: 8,  mav: 16, mrv: 26 },  // Side delts surtout
        biceps:     { mev: 8,  mav: 14, mrv: 22 },
        triceps:    { mev: 6,  mav: 12, mrv: 18 },
        quads:      { mev: 8,  mav: 14, mrv: 20 },
        hamstrings: { mev: 6,  mav: 12, mrv: 18 },
        glutes:     { mev: 4,  mav: 10, mrv: 16 },
        calves:     { mev: 8,  mav: 14, mrv: 20 },
        abs:        { mev: 0,  mav: 16, mrv: 25 }
    };

    // ==================== FRENCH MUSCLE NAME → GROUP MAPPING ====================
    // Le defaultExercises stocke les muscles en français. On normalise via inclusion
    // de tokens (lowercase) pour éviter les faux négatifs sur les variations.
    const _MUSCLE_PATTERNS = [
        // CHEST
        { group: 'chest', tokens: ['pectoral', 'pectoraux', 'pec'] },
        // BACK (regroupe lats, traps, rhomboïdes, érecteurs — vue user "dos")
        { group: 'back', tokens: ['dorsal', 'trapèze', 'trapeze', 'rhomboïde', 'rhomboide', 'érecteur', 'erecteur'] },
        // SHOULDERS (deltoïdes, sauf postérieur qui peut être traité dos selon doctrine)
        { group: 'shoulders', tokens: ['deltoïde', 'deltoide', 'rotateur'] },
        // BICEPS (et brachial annexe)
        { group: 'biceps', tokens: ['biceps', 'brachial', 'brachioradial'] },
        // TRICEPS
        { group: 'triceps', tokens: ['triceps'] },
        // QUADS
        { group: 'quads', tokens: ['quadriceps', 'quadri'] },
        // HAMSTRINGS
        { group: 'hamstrings', tokens: ['ischio', 'ischio-jambier', 'ischiojambier'] },
        // GLUTES
        { group: 'glutes', tokens: ['fessier', 'grand fessier'] },
        // CALVES
        { group: 'calves', tokens: ['mollet', 'gastrocnémien', 'gastrocnemien', 'soléaire', 'soleaire'] },
        // ABS / CORE
        { group: 'abs', tokens: ['abdomen', 'abdominaux', 'abdo', 'oblique', 'transverse', 'core', 'grand droit'] }
    ];

    /**
     * Mappe un nom de muscle français vers un groupe canonique.
     * @param {string} muscleName
     * @returns {string|null} groupId ou null si non mappé
     */
    function mapMuscleToGroup(muscleName) {
        if (!muscleName) return null;
        const lower = muscleName.toLowerCase();
        for (const pattern of _MUSCLE_PATTERNS) {
            for (const token of pattern.tokens) {
                if (lower.includes(token)) return pattern.group;
            }
        }
        return null;
    }

    // ==================== EXERCISE → MUSCLES LOOKUP ====================

    /**
     * Récupère les muscles primaires + secondaires pour un exercice par son
     * effectiveName. Utilise findExerciseByName(window) si dispo, sinon scan defaultExercises.
     */
    function getMusclesForExercise(exerciseName) {
        if (!exerciseName) return { primary: [], secondary: [] };

        let exData = null;
        // Path 1 (canonical) : helper centralisé fourni par training-shared.js.
        // Gère le cas "Exercice - Variante" → fallback sur le nom de base.
        if (typeof window.findExerciseByName === 'function') {
            try { exData = window.findExerciseByName(exerciseName); } catch (e) { /* noop */ }
        }
        // Path 2 (fallback) : scan direct de state.exercises si helper indisponible
        // (chargement asynchrone, état partiel, etc.).
        if (!exData && window.state && Array.isArray(window.state.exercises)) {
            const lower = exerciseName.toLowerCase();
            exData = window.state.exercises.find(e =>
                (e.name && e.name.toLowerCase() === lower) ||
                (e.id && e.id.toLowerCase() === lower)
            );
        }
        if (!exData) return { primary: [], secondary: [] };

        return {
            primary: exData.primaryMuscles || [],
            secondary: exData.secondaryMuscles || []
        };
    }

    // ==================== WEEKLY VOLUME COMPUTATION ====================

    /**
     * Calcule le volume (sets fractionnels) par groupe musculaire sur les
     * derniers `daysWindow` jours. Lit state.sessionHistory + state.progressLog.
     *
     * @param {number} daysWindow  default 7 (semaine glissante)
     * @returns {Object}  { chest: { sets: 14.5, primary: 12, secondary: 2.5, status: 'optimal', mev, mav, mrv }, ... }
     */
    function weeklyVolumeByMuscle(daysWindow = 7) {
        const state = window.state || {};
        const cutoff = Date.now() - daysWindow * 24 * 60 * 60 * 1000;

        // Init counts
        const counts = {};
        Object.keys(MUSCLE_GROUPS).forEach(g => {
            counts[g] = { sets: 0, primary: 0, secondary: 0 };
        });

        // 1. Source primaire : sessionHistory (objet riche, contient setsDetail par exercice)
        const sessions = state.sessionHistory || [];
        sessions.forEach(session => {
            const ts = _sessionTimestamp(session);
            if (ts < cutoff) return;

            (session.exercises || []).forEach(ex => {
                const exName = ex.exerciseName || ex.exercise || ex.name;
                const sets = ex.sets || ex.setsDetail || [];
                // Compter uniquement les working sets (pas warmup)
                const workingSetsCount = Array.isArray(sets)
                    ? sets.filter(s => !s.isWarmup && (s.completed !== false)).length
                    : 0;
                if (workingSetsCount === 0) return;
                _addToVolume(counts, exName, workingSetsCount);
            });
        });

        // 2. Build response
        const result = {};
        Object.keys(MUSCLE_GROUPS).forEach(g => {
            const c = counts[g];
            const lm = VOLUME_LANDMARKS[g];
            const total = Math.round((c.primary + c.secondary) * 10) / 10;
            result[g] = {
                groupId: g,
                label: MUSCLE_GROUPS[g].label,
                short: MUSCLE_GROUPS[g].short,
                sets: total,
                primarySets: c.primary,
                secondarySets: Math.round(c.secondary * 10) / 10,
                mev: lm.mev,
                mav: lm.mav,
                mrv: lm.mrv,
                status: classifyVolume(total, lm),
                // Distance to optimal zone (used for sorting + reco)
                deficit: total < lm.mev ? lm.mev - total : (total > lm.mrv ? lm.mrv - total : 0)
            };
        });

        return result;
    }

    function _sessionTimestamp(session) {
        if (session.timestamp) return session.timestamp;
        if (session.endTime) return session.endTime;
        if (session.startTime) return session.startTime;
        if (session.date) return new Date(session.date).getTime();
        return 0;
    }

    function _addToVolume(counts, exerciseName, setCount) {
        const muscles = getMusclesForExercise(exerciseName);
        const primaryGroups = new Set();
        const secondaryGroups = new Set();

        muscles.primary.forEach(m => {
            const g = mapMuscleToGroup(m);
            if (g) primaryGroups.add(g);
        });
        muscles.secondary.forEach(m => {
            const g = mapMuscleToGroup(m);
            if (g && !primaryGroups.has(g)) secondaryGroups.add(g);
        });

        primaryGroups.forEach(g => { counts[g].primary += setCount; });
        secondaryGroups.forEach(g => { counts[g].secondary += setCount * 0.5; });
    }

    /**
     * Classifie un volume hebdomadaire en zone selon les landmarks.
     * @returns {'underdosed'|'developing'|'optimal'|'overload'|'excessive'}
     *   - underdosed: < MEV (sous-stim, gains compromis)
     *   - developing: MEV ≤ v < MAV (croissance possible mais sub-optimale)
     *   - optimal:    MAV ≤ v ≤ MRV (zone Israetel "stimulus / fatigue ratio")
     *   - overload:   v > MRV (récup compromise, deload recommandé)
     */
    function classifyVolume(sets, landmarks) {
        if (sets < landmarks.mev) return 'underdosed';
        // Zone "developing" entre MEV et MAV : on progresse mais pas optimal
        const mavLow = Math.round(landmarks.mav * 0.75); // ~75% du MAV = entrée zone optimale
        if (sets < mavLow) return 'developing';
        if (sets <= landmarks.mrv) return 'optimal';
        return 'overload';
    }

    /**
     * Génère un résumé textuel actionnable pour un groupe musculaire.
     * Utilisé dans les recommandations coach.
     */
    function summarizeGroup(volumeData) {
        const { sets, mev, mav, mrv, status, label } = volumeData;
        switch (status) {
            case 'underdosed':
                return {
                    headline: `${label} sous-stimulés`,
                    action: `+${Math.ceil(mev - sets)} séries cette semaine`,
                    severity: 'warning'
                };
            case 'developing':
                return {
                    headline: `${label} en progression`,
                    action: `Vise ${mav} séries/sem pour optimiser`,
                    severity: 'info'
                };
            case 'optimal':
                return {
                    headline: `${label} en zone optimale`,
                    action: `${sets} séries — maintien recommandé`,
                    severity: 'success'
                };
            case 'overload':
                return {
                    headline: `${label} en surcharge`,
                    action: `Deload : ${Math.ceil((sets - mav) / sets * 100)}% en moins`,
                    severity: 'danger'
                };
        }
        return { headline: label, action: '—', severity: 'info' };
    }

    // ==================== V8-B · RECOVERY MODEL ====================
    // Modèle empirique inspiré de Helms / Israetel pour estimer le %
    // récupération d'un groupe musculaire à un instant T.
    //
    // Variables :
    //   - hoursSinceLast : heures depuis la fin de la dernière session ciblant
    //     ce muscle en primaire.
    //   - sessionVolume : nombre de sets de la session, modulant la durée de
    //     récup nécessaire (gros volume = récup plus longue).
    //   - avgRpe : RPE moyen de la session (si renseigné), modulant idem.
    //
    // Modèle :
    //   baseRecoveryHrs = 72 (3 jours = full recovery muscle moyen)
    //   volumeMod   = +12h si session > MAV, +24h si session > MRV
    //   rpeMod      = +8h si RPE moyen >= 9, +16h si == 10
    //   adjustedHrs = baseRecoveryHrs + volumeMod + rpeMod
    //   recoveryPct = min(100, hoursSinceLast / adjustedHrs * 100)
    //
    // Si jamais entraîné dans 30 jours → 100% (frais total).
    // ==================================================================

    /**
     * Récupère les sessions des derniers 30 jours, triées par date desc.
     */
    function _recentSessions(daysWindow = 30) {
        const state = window.state || {};
        const cutoff = Date.now() - daysWindow * 24 * 60 * 60 * 1000;
        return (state.sessionHistory || [])
            .filter(s => _sessionTimestamp(s) >= cutoff)
            .sort((a, b) => _sessionTimestamp(b) - _sessionTimestamp(a));
    }

    /**
     * Trouve la dernière session qui a ciblé `groupId` en muscle PRIMAIRE.
     * @returns {Object|null} { session, sets, endTime, avgRpe, primaryRatio }
     */
    function _lastSessionForMuscle(groupId) {
        const sessions = _recentSessions(30);

        for (const session of sessions) {
            let primarySetsForGroup = 0;
            let totalRpe = 0;
            let rpeCount = 0;

            for (const ex of session.exercises || []) {
                const exName = ex.exerciseName || ex.exercise || ex.name;
                const muscles = getMusclesForExercise(exName);
                const primaryGroups = new Set();
                muscles.primary.forEach(m => {
                    const g = mapMuscleToGroup(m);
                    if (g) primaryGroups.add(g);
                });

                if (primaryGroups.has(groupId)) {
                    const sets = (ex.sets || ex.setsDetail || []).filter(
                        s => !s.isWarmup && s.completed !== false
                    );
                    primarySetsForGroup += sets.length;
                    sets.forEach(s => {
                        if (typeof s.rpe === 'number' && s.rpe > 0) {
                            totalRpe += s.rpe;
                            rpeCount += 1;
                        }
                    });
                }
            }

            if (primarySetsForGroup > 0) {
                return {
                    session,
                    sets: primarySetsForGroup,
                    endTime: _sessionTimestamp(session) + (session.duration || 60) * 60 * 1000,
                    avgRpe: rpeCount > 0 ? totalRpe / rpeCount : null
                };
            }
        }
        return null;
    }

    /**
     * Calcule le % de récupération pour un groupe musculaire.
     * @param {string} groupId
     * @returns {Object} { pct, status, lastSessionAgo, lastSessionSets, avgRpe }
     */
    function recoveryPctByMuscle(groupId) {
        const last = _lastSessionForMuscle(groupId);
        const lm = VOLUME_LANDMARKS[groupId];
        if (!last || !lm) {
            return {
                groupId,
                pct: 100,
                status: 'fresh',
                hoursSinceLast: null,
                lastSessionSets: 0,
                avgRpe: null,
                neverTrained: !last
            };
        }

        const hoursSinceLast = Math.max(0, (Date.now() - last.endTime) / (1000 * 60 * 60));

        // Modulateurs
        let baseRecoveryHrs = 72;
        let volumeMod = 0;
        if (last.sets > lm.mrv) volumeMod = 24;
        else if (last.sets > lm.mav) volumeMod = 12;

        let rpeMod = 0;
        if (last.avgRpe !== null) {
            if (last.avgRpe >= 9.5) rpeMod = 16;
            else if (last.avgRpe >= 9) rpeMod = 12;
            else if (last.avgRpe >= 8) rpeMod = 4;
        }

        const adjustedRecoveryHrs = baseRecoveryHrs + volumeMod + rpeMod;
        const pct = Math.min(100, Math.round((hoursSinceLast / adjustedRecoveryHrs) * 100));

        // Classification visuelle :
        //   - fresh:    100% (full)
        //   - ready:    >= 75%
        //   - partial:  40-74%
        //   - fatigued: 15-39%
        //   - doms:     < 15% (rouge, repos imperatif)
        let status;
        if (pct >= 100) status = 'fresh';
        else if (pct >= 75) status = 'ready';
        else if (pct >= 40) status = 'partial';
        else if (pct >= 15) status = 'fatigued';
        else status = 'doms';

        return {
            groupId,
            pct,
            status,
            hoursSinceLast: Math.round(hoursSinceLast * 10) / 10,
            lastSessionSets: last.sets,
            avgRpe: last.avgRpe !== null ? Math.round(last.avgRpe * 10) / 10 : null,
            adjustedRecoveryHrs,
            neverTrained: false
        };
    }

    /**
     * Calcule la récupération pour TOUS les groupes musculaires.
     * @returns {Object} { chest: {...}, back: {...}, ... }
     */
    function recoveryByAllMuscles() {
        const result = {};
        Object.keys(MUSCLE_GROUPS).forEach(g => {
            result[g] = {
                ...recoveryPctByMuscle(g),
                label: MUSCLE_GROUPS[g].label,
                short: MUSCLE_GROUPS[g].short
            };
        });
        return result;
    }

    // ==================== V8-C-B : DELOAD AUTO-DETECT ====================
    //
    // Détecte si un (ou plusieurs) groupe musculaire a dépassé MRV deux
    // semaines consécutives. Si oui → on recommande un deload proactif.
    //
    // Méthode : on appelle weeklyVolumeByMuscle(7) pour la semaine en cours
    // et weeklyVolumeByMuscle(14) pour la fenêtre cumulée 14j. Le volume
    // de la semaine précédente = vol14 - vol7. Un muscle est "en surcharge
    // 2 semaines consec" si sets7 > MRV ET (sets14 - sets7) > MRV.

    /**
     * Retourne la liste des groupes musculaires en surcharge 2 semaines
     * consécutives.
     * @returns {Array<{groupId, label, short, currentSets, previousSets, mrv}>}
     *          Trié par excédent décroissant. Vide si aucun match.
     */
    function detectConsecutiveOverload() {
        const v7 = weeklyVolumeByMuscle(7);
        const v14 = weeklyVolumeByMuscle(14);

        const matches = [];
        Object.keys(v7).forEach(g => {
            const sets7 = v7[g].sets;
            const sets14 = v14[g].sets;
            const setsPrev = Math.max(0, Math.round((sets14 - sets7) * 10) / 10);
            const mrv = v7[g].mrv;

            // Critère strict : les DEUX semaines doivent dépasser MRV.
            // On exige aussi un volume "réel" la semaine précédente (au
            // moins MEV) — sinon une seule grosse semaine semblerait
            // "consécutive" alors que la précédente était quasi-vide.
            if (sets7 > mrv && setsPrev > mrv && setsPrev >= v7[g].mev) {
                matches.push({
                    groupId: g,
                    label: v7[g].label,
                    short: v7[g].short,
                    currentSets: sets7,
                    previousSets: setsPrev,
                    mrv,
                    excess: Math.round((sets7 - mrv) * 10) / 10
                });
            }
        });

        // Tri par excédent décroissant (le plus problématique en premier)
        matches.sort((a, b) => b.excess - a.excess);
        return matches;
    }

    // ==================== EXPORTS ====================
    window.CoachVolume = {
        MUSCLE_GROUPS,
        VOLUME_LANDMARKS,
        mapMuscleToGroup,
        getMusclesForExercise,
        weeklyVolumeByMuscle,
        classifyVolume,
        summarizeGroup,
        // V8-B
        recoveryPctByMuscle,
        recoveryByAllMuscles,
        // V8-C-B
        detectConsecutiveOverload
    };

})();
