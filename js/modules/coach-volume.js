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

    // ==================== EXPORTS ====================
    window.CoachVolume = {
        MUSCLE_GROUPS,
        VOLUME_LANDMARKS,
        mapMuscleToGroup,
        getMusclesForExercise,
        weeklyVolumeByMuscle,
        classifyVolume,
        summarizeGroup
    };

})();
