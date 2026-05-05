// ==================== FITTRACK PRO - ACHIEVEMENTS MODULE ====================
// Système de badges et accomplissements
//
// V10 (2026-05) — refonte selon audit senior :
// Les badges "10 séances / 50 séances / 100 séances" pokemon-style sont
// conservés pour les casual users mais relégués au second plan.
// Première vue = "Milestones" gym-réels (1RM relatif au poids corps, total
// Wilks-like, séances consec, première barre 100kg, etc.) au format
// Pit Lane Cockpit (kicker DM Mono, evidence numerics tabulaires).

(function() {
    'use strict';

    // V10 : helper pour 1RM estimé (Epley : 1RM ≈ poids × (1 + reps/30))
    function _epley1RM(weight, reps) {
        if (!weight || !reps) return 0;
        if (reps === 1) return weight;
        return weight * (1 + reps / 30);
    }

    // V10 : helper pour le poids corps actuel (snapshot live + fallback profil)
    function _bodyWeight() {
        if (state.bodyWeightLog && state.bodyWeightLog.length > 0) {
            const sorted = [...state.bodyWeightLog].sort((a, b) => new Date(b.date) - new Date(a.date));
            if (sorted[0]?.weight) return sorted[0].weight;
        }
        return state.profile?.weight || 75;
    }

    // V10 : Best 1RM estimé pour un exo (sur tout l'historique progressLog)
    function _bestEstimated1RM(exerciseNameOrPattern) {
        const pattern = exerciseNameOrPattern.toLowerCase();
        let best = 0;
        if (!state.progressLog) return 0;
        Object.keys(state.progressLog).forEach(name => {
            if (!name.toLowerCase().includes(pattern)) return;
            (state.progressLog[name] || []).forEach(log => {
                (log.setsDetail || []).forEach(set => {
                    const e1rm = _epley1RM(set.weight || 0, set.reps || 0);
                    if (e1rm > best) best = e1rm;
                });
            });
        });
        return best;
    }

    // V10 : Best charge brute (1 set 1 rep ou +) pour un exo
    function _bestRawWeight(pattern) {
        const p = pattern.toLowerCase();
        let best = 0;
        if (!state.progressLog) return 0;
        Object.keys(state.progressLog).forEach(name => {
            if (!name.toLowerCase().includes(p)) return;
            (state.progressLog[name] || []).forEach(log => {
                (log.setsDetail || []).forEach(set => {
                    if ((set.weight || 0) > best) best = set.weight || 0;
                });
            });
        });
        return best;
    }

    // V10 : Compte de semaines consécutives (Lundi-Dim) avec ≥ N séances
    function _consecutiveWeeksWithMinSessions(minSessions = 3) {
        const sessions = (state.sessionHistory || []).filter(s => !s.deletedAt);
        if (sessions.length === 0) return 0;
        const byWeek = {}; // 'YYYY-WW' → count
        sessions.forEach(s => {
            const d = new Date(s.date);
            // ISO week number (lundi-dim)
            const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
            const dayNum = (tmp.getUTCDay() + 6) % 7;
            tmp.setUTCDate(tmp.getUTCDate() - dayNum + 3);
            const firstThu = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 4));
            const weekNum = 1 + Math.round(((tmp - firstThu) / 86400000 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7);
            const key = `${tmp.getUTCFullYear()}-${String(weekNum).padStart(2, '0')}`;
            byWeek[key] = (byWeek[key] || 0) + 1;
        });
        // Construit la suite des semaines triées
        const keys = Object.keys(byWeek).sort();
        let streak = 0, best = 0;
        let prev = null;
        for (const k of keys) {
            const matches = byWeek[k] >= minSessions;
            if (!matches) { streak = 0; prev = k; continue; }
            // Vérifier contiguïté avec la semaine précédente
            if (prev) {
                const [py, pw] = prev.split('-').map(Number);
                const [cy, cw] = k.split('-').map(Number);
                const diff = (cy - py) * 52 + (cw - pw); // approx, suffisant pour streak
                if (diff !== 1) streak = 0;
            }
            streak += 1;
            if (streak > best) best = streak;
            prev = k;
        }
        return best;
    }

    // ==================== DÉFINITION DES BADGES ====================
    const ACHIEVEMENTS = {
        // Séances
        'first-session': {
            id: 'first-session',
            icon: '🏁',
            name: 'Première séance',
            description: 'Compléter votre première séance',
            category: 'sessions',
            check: (data) => data.totalSessions >= 1
        },
        'week-warrior': {
            id: 'week-warrior',
            icon: '⚔️',
            name: 'Guerrier',
            description: '3 séances en une semaine',
            category: 'sessions',
            check: (data) => data.sessionsThisWeek >= 3
        },
        'month-master': {
            id: 'month-master',
            icon: '👑',
            name: 'Maître',
            description: '12 séances en un mois',
            category: 'sessions',
            check: (data) => data.sessionsThisMonth >= 12
        },
        'session-10': {
            id: 'session-10',
            icon: '💪',
            name: '10 séances',
            description: 'Compléter 10 séances',
            category: 'sessions',
            check: (data) => data.totalSessions >= 10
        },
        'session-50': {
            id: 'session-50',
            icon: '💯',
            name: '50 séances',
            description: 'Compléter 50 séances',
            category: 'sessions',
            check: (data) => data.totalSessions >= 50
        },
        'session-100': {
            id: 'session-100',
            icon: '🔥',
            name: '100 séances',
            description: 'Compléter 100 séances',
            category: 'sessions',
            check: (data) => data.totalSessions >= 100
        },

        // PRs
        'first-pr': {
            id: 'first-pr',
            icon: '🏆',
            name: 'Premier PR',
            description: 'Établir votre premier record',
            category: 'prs',
            check: (data) => data.totalPRs >= 1
        },
        'pr-streak': {
            id: 'pr-streak',
            icon: '🔥',
            name: 'Série de PRs',
            description: '3 PRs en une semaine',
            category: 'prs',
            check: (data) => data.prsThisWeek >= 3
        },
        'pr-machine': {
            id: 'pr-machine',
            icon: '🤖',
            name: 'Machine à PRs',
            description: '10 PRs au total',
            category: 'prs',
            check: (data) => data.totalPRs >= 10
        },
        'pr-25': {
            id: 'pr-25',
            icon: '🎯',
            name: '25 PRs',
            description: 'Établir 25 records',
            category: 'prs',
            check: (data) => data.totalPRs >= 25
        },

        // Constance
        'streak-7': {
            id: 'streak-7',
            icon: '📅',
            name: 'Une semaine',
            description: '7 jours de série',
            category: 'streak',
            check: (data) => data.currentStreak >= 7
        },
        'streak-30': {
            id: 'streak-30',
            icon: '🗓️',
            name: 'Un mois',
            description: '30 jours de série',
            category: 'streak',
            check: (data) => data.currentStreak >= 30
        },
        'streak-60': {
            id: 'streak-60',
            icon: '⚡',
            name: 'Inarrêtable',
            description: '60 jours de série',
            category: 'streak',
            check: (data) => data.currentStreak >= 60
        },
        'streak-100': {
            id: 'streak-100',
            icon: '🌟',
            name: 'Légende',
            description: '100 jours de série',
            category: 'streak',
            check: (data) => data.currentStreak >= 100
        },

        // Photos
        'first-photo': {
            id: 'first-photo',
            icon: '📸',
            name: 'Première photo',
            description: 'Ajouter votre première photo',
            category: 'photos',
            check: (data) => data.totalPhotos >= 1
        },
        'transformation': {
            id: 'transformation',
            icon: '🦋',
            name: 'Transformation',
            description: 'Photos sur 3 mois',
            category: 'photos',
            check: (data) => data.photoSpanMonths >= 3
        },
        'photo-10': {
            id: 'photo-10',
            icon: '📷',
            name: '10 photos',
            description: 'Documenter avec 10 photos',
            category: 'photos',
            check: (data) => data.totalPhotos >= 10
        }
    };

    // ==================== CALCUL DES DONNÉES ====================
    function calculateAchievementData() {
        const data = {
            totalSessions: 0,
            sessionsThisWeek: 0,
            sessionsThisMonth: 0,
            totalPRs: 0,
            prsThisWeek: 0,
            currentStreak: 0,
            totalPhotos: 0,
            photoSpanMonths: 0
        };

        // Sessions (exclure soft-deleted)
        if (state.sessionHistory) {
            const activeSessions = state.sessionHistory.filter(s => !s.deletedAt);
            data.totalSessions = activeSessions.length;

            // Sessions cette semaine
            const now = new Date();
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Lundi
            startOfWeek.setHours(0, 0, 0, 0);

            data.sessionsThisWeek = activeSessions.filter(s => {
                const sessionDate = new Date(s.date);
                return sessionDate >= startOfWeek;
            }).length;

            // Sessions ce mois
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            data.sessionsThisMonth = activeSessions.filter(s => {
                const sessionDate = new Date(s.date);
                return sessionDate >= startOfMonth;
            }).length;
        }

        // PRs
        if (state.progressLog) {
            const allPRs = [];
            Object.keys(state.progressLog).forEach(exercise => {
                const logs = state.progressLog[exercise];
                logs.forEach(log => {
                    if (log.setsDetail) {
                        log.setsDetail.forEach(set => {
                            allPRs.push({
                                date: log.date,
                                weight: set.weight,
                                reps: set.reps
                            });
                        });
                    }
                });
            });
            data.totalPRs = allPRs.length;

            // PRs cette semaine
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            data.prsThisWeek = allPRs.filter(pr => new Date(pr.date) >= weekAgo).length;
        }

        // Streak
        if (state.goals) {
            data.currentStreak = state.goals.currentStreak || 0;
        }

        // Photos
        if (state.progressPhotos) {
            data.totalPhotos = state.progressPhotos.length;

            // Span en mois
            if (data.totalPhotos > 1) {
                const dates = state.progressPhotos.map(p => new Date(p.taken_at)).sort((a, b) => a - b);
                const firstDate = dates[0];
                const lastDate = dates[dates.length - 1];
                const diffTime = Math.abs(lastDate - firstDate);
                const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
                data.photoSpanMonths = diffMonths;
            }
        }

        return data;
    }

    // ==================== VÉRIFICATION DES BADGES ====================
    function checkAchievements() {
        const data = calculateAchievementData();
        const unlocked = [];
        const locked = [];
        const newlyUnlocked = [];

        // Récupérer les badges déjà débloqués
        const unlockedIds = state.unlockedAchievements || [];

        Object.values(ACHIEVEMENTS).forEach(achievement => {
            const isUnlocked = achievement.check(data);
            const wasUnlocked = unlockedIds.includes(achievement.id);

            if (isUnlocked) {
                unlocked.push(achievement);
                if (!wasUnlocked) {
                    newlyUnlocked.push(achievement);
                }
            } else {
                // Calculer la progression
                const progress = calculateProgress(achievement, data);
                locked.push({ ...achievement, progress });
            }
        });

        // Sauvegarder les nouveaux badges
        if (newlyUnlocked.length > 0) {
            state.unlockedAchievements = unlocked.map(a => a.id);
            saveState();
            
            // Sync avec Supabase
            if (typeof saveTrainingSettingsToSupabase === 'function') {
                saveTrainingSettingsToSupabase();
            }
        }

        return { unlocked, locked, newlyUnlocked, data };
    }

    // ==================== CALCUL DE LA PROGRESSION ====================
    function calculateProgress(achievement, data) {
        const id = achievement.id;
        
        // Sessions
        if (id === 'first-session') return { current: data.totalSessions, target: 1 };
        if (id === 'session-10') return { current: data.totalSessions, target: 10 };
        if (id === 'session-50') return { current: data.totalSessions, target: 50 };
        if (id === 'session-100') return { current: data.totalSessions, target: 100 };
        if (id === 'week-warrior') return { current: data.sessionsThisWeek, target: 3 };
        if (id === 'month-master') return { current: data.sessionsThisMonth, target: 12 };

        // PRs
        if (id === 'first-pr') return { current: data.totalPRs, target: 1 };
        if (id === 'pr-machine') return { current: data.totalPRs, target: 10 };
        if (id === 'pr-25') return { current: data.totalPRs, target: 25 };
        if (id === 'pr-streak') return { current: data.prsThisWeek, target: 3 };

        // Streak
        if (id === 'streak-7') return { current: data.currentStreak, target: 7 };
        if (id === 'streak-30') return { current: data.currentStreak, target: 30 };
        if (id === 'streak-60') return { current: data.currentStreak, target: 60 };
        if (id === 'streak-100') return { current: data.currentStreak, target: 100 };

        // Photos
        if (id === 'first-photo') return { current: data.totalPhotos, target: 1 };
        if (id === 'photo-10') return { current: data.totalPhotos, target: 10 };
        if (id === 'transformation') return { current: data.photoSpanMonths, target: 3 };

        return { current: 0, target: 1 };
    }

    // ==================== RENDU HTML ====================
    function renderAchievementsShowcase() {
        const { unlocked, locked } = checkAchievements();

        // Trier par catégorie
        const categories = {
            sessions: { name: 'Séances', achievements: [] },
            prs: { name: 'Records', achievements: [] },
            streak: { name: 'Constance', achievements: [] },
            photos: { name: 'Photos', achievements: [] }
        };

        unlocked.forEach(a => categories[a.category].achievements.push({ ...a, unlocked: true }));
        locked.forEach(a => categories[a.category].achievements.push({ ...a, unlocked: false }));

        let html = '<div class="achievements-showcase">';

        Object.values(categories).forEach(cat => {
            if (cat.achievements.length === 0) return;

            html += `<div class="achievement-category">`;
            html += `<h3 class="category-title">${cat.name}</h3>`;
            html += `<div class="badges-grid">`;

            cat.achievements.forEach(achievement => {
                const progressPercent = achievement.progress 
                    ? Math.min(100, (achievement.progress.current / achievement.progress.target) * 100)
                    : 100;

                html += `
                    <div class="badge-item ${achievement.unlocked ? 'unlocked' : 'locked'}" 
                         data-tooltip="${achievement.description}">
                        <div class="badge-icon">${achievement.unlocked ? achievement.icon : '🔒'}</div>
                        <div class="badge-name">${achievement.name}</div>
                        ${!achievement.unlocked && achievement.progress ? `
                            <div class="badge-progress-bar">
                                <div class="badge-progress-fill" style="width: ${progressPercent}%"></div>
                            </div>
                            <div class="badge-progress-text">${achievement.progress.current}/${achievement.progress.target}</div>
                        ` : ''}
                    </div>
                `;
            });

            html += `</div></div>`;
        });

        html += '</div>';
        return html;
    }

    // ==================== NOTIFICATION DE NOUVEAU BADGE ====================
    function notifyNewAchievement(achievement) {
        if (typeof showProgressToast === 'function') {
            showProgressToast(achievement.icon, `Badge débloqué : ${achievement.name}`, 4000);
        }
        // Animer le badge dans le DOM s'il est visible (Phase 2D)
        if (achievement.id) {
            var el = document.querySelector('.badge-item[data-tooltip="' + (achievement.description || '').replace(/"/g, '\\"') + '"]');
            if (el) {
                el.classList.add('badge-just-unlocked');
                setTimeout(function() { el.classList.remove('badge-just-unlocked'); }, 1000);
            }
        }
    }

    // ==================== V10 — MILESTONES INTELLIGENTS ====================
    // Format Pit Lane Cockpit : kicker DM Mono ALL CAPS, evidence numerics
    // tabulaires, accent bar tier-colored. Niveau gym sérieux.
    //
    // Les "tiers" suivent la palette V9 : novice (#4ade80) / intermediate (#7dd3fc) / advanced (#ff8a3d).
    const MILESTONES = [
        // ═════════ Strength relative au poids corps (1RM estimé) ═════════
        {
            id: 'bench-bw',
            kicker: 'BENCH PRESS · 1RM RELATIF',
            title: 'Développé couché = poids corps',
            tier: 'intermediate',
            metric: () => {
                const bw = _bodyWeight();
                const bench = _bestEstimated1RM('couché') || _bestEstimated1RM('bench');
                return { value: bench, target: bw, unit: 'kg', label: 'Bench 1RM', context: `${Math.round(bw)} kg poids corps` };
            }
        },
        {
            id: 'squat-1.5bw',
            kicker: 'SQUAT · 1RM ≥ 1.5×BW',
            title: 'Squat = 1.5× poids corps',
            tier: 'advanced',
            metric: () => {
                const bw = _bodyWeight();
                const sq = _bestEstimated1RM('squat');
                return { value: sq, target: bw * 1.5, unit: 'kg', label: 'Squat 1RM', context: `cible : ${Math.round(bw * 1.5)} kg` };
            }
        },
        {
            id: 'deadlift-2bw',
            kicker: 'DEADLIFT · 1RM ≥ 2×BW',
            title: 'Soulevé de terre = 2× poids corps',
            tier: 'advanced',
            metric: () => {
                const bw = _bodyWeight();
                const dl = _bestEstimated1RM('soulevé') || _bestEstimated1RM('deadlift');
                return { value: dl, target: bw * 2, unit: 'kg', label: 'DL 1RM', context: `cible : ${Math.round(bw * 2)} kg` };
            }
        },
        {
            id: 'ohp-0.75bw',
            kicker: 'OHP · 1RM ≥ 0.75×BW',
            title: 'Développé militaire = 0.75× BW',
            tier: 'intermediate',
            metric: () => {
                const bw = _bodyWeight();
                const ohp = _bestEstimated1RM('militaire') || _bestEstimated1RM('overhead') || _bestEstimated1RM('ohp');
                return { value: ohp, target: bw * 0.75, unit: 'kg', label: 'OHP 1RM', context: `cible : ${Math.round(bw * 0.75)} kg` };
            }
        },
        // ═════════ Charges symboliques (premiers paliers) ═════════
        {
            id: 'first-100-bench',
            kicker: 'BARRE 100 · BENCH',
            title: 'Première série à 100 kg au DC',
            tier: 'intermediate',
            metric: () => {
                const w = _bestRawWeight('couché') || _bestRawWeight('bench');
                return { value: w, target: 100, unit: 'kg', label: 'Charge max', context: 'sur n\'importe quelle série' };
            }
        },
        {
            id: 'first-140-squat',
            kicker: 'BARRE 140 · SQUAT',
            title: 'Première série à 140 kg au squat',
            tier: 'advanced',
            metric: () => {
                const w = _bestRawWeight('squat');
                return { value: w, target: 140, unit: 'kg', label: 'Charge max', context: '' };
            }
        },
        {
            id: 'first-180-dl',
            kicker: 'BARRE 180 · DEADLIFT',
            title: 'Première série à 180 kg au SDT',
            tier: 'advanced',
            metric: () => {
                const w = _bestRawWeight('soulevé') || _bestRawWeight('deadlift');
                return { value: w, target: 180, unit: 'kg', label: 'Charge max', context: '' };
            }
        },
        // ═════════ Constance long terme (au-delà de la simple streak journalière) ═════════
        {
            id: 'consec-weeks-3',
            kicker: 'CONSEC · 4 SEMAINES',
            title: '4 semaines consécutives ≥ 3 séances',
            tier: 'novice',
            metric: () => {
                const streak = _consecutiveWeeksWithMinSessions(3);
                return { value: streak, target: 4, unit: 'sem', label: 'Best streak', context: '≥ 3 séances par semaine' };
            }
        },
        {
            id: 'consec-weeks-10',
            kicker: 'CONSEC · 10 SEMAINES',
            title: '10 semaines consécutives ≥ 3 séances',
            tier: 'intermediate',
            metric: () => {
                const streak = _consecutiveWeeksWithMinSessions(3);
                return { value: streak, target: 10, unit: 'sem', label: 'Best streak', context: '≥ 3 séances par semaine' };
            }
        },
        {
            id: 'consec-weeks-26',
            kicker: 'CONSEC · 26 SEMAINES',
            title: 'Demi-année consécutive ≥ 3/sem',
            tier: 'advanced',
            metric: () => {
                const streak = _consecutiveWeeksWithMinSessions(3);
                return { value: streak, target: 26, unit: 'sem', label: 'Best streak', context: '6 mois sans skip' };
            }
        },
        // ═════════ Volume cumulé total ═════════
        {
            id: 'total-volume-100t',
            kicker: 'VOLUME CUMULÉ · 100 T',
            title: '100 tonnes soulevées (cumul total)',
            tier: 'intermediate',
            metric: () => {
                const totalKg = (state.sessionHistory || []).filter(s => !s.deletedAt).reduce((sum, s) => sum + (s.totalVolume || 0), 0);
                return { value: totalKg / 1000, target: 100, unit: 't', label: 'Tonnage', context: `${Math.round(totalKg).toLocaleString()} kg cumulés` };
            }
        }
    ];

    /**
     * V10 : retourne les milestones avec leur état (atteint / en cours / pourcentage).
     */
    function computeMilestones() {
        return MILESTONES.map(m => {
            const data = m.metric();
            const value = data.value || 0;
            const target = data.target || 1;
            const pct = Math.max(0, Math.min(100, (value / target) * 100));
            const reached = value >= target;
            return {
                id: m.id,
                kicker: m.kicker,
                title: m.title,
                tier: m.tier,
                value,
                target,
                unit: data.unit,
                label: data.label,
                context: data.context,
                pct,
                reached
            };
        });
    }

    /**
     * V10 : helper pour afficher les valeurs avec 0/1 décimale et l'unité.
     */
    function _fmtMetric(value, unit) {
        if (value < 10 && value !== 0 && unit !== 'sem') return value.toFixed(1) + ' ' + unit;
        return Math.round(value) + ' ' + unit;
    }

    /**
     * V10 : Render carte milestone Pit Lane (kicker DM Mono ALL CAPS, accent bar tier).
     * À placer en haut de la section achievements, avant les badges legacy.
     */
    function renderMilestonesShowcase() {
        const items = computeMilestones();
        const reachedCount = items.filter(i => i.reached).length;

        let html = `
            <section class="milestones-section">
                <header class="milestones-header">
                    <span class="milestones-kicker">MILESTONES · GYM-LEVEL</span>
                    <h2 class="milestones-title">Tes paliers de force</h2>
                    <p class="milestones-sub">Objectifs sérieux basés sur le 1RM estimé, le poids corps et la constance long terme. <strong>${reachedCount}/${items.length}</strong> atteints.</p>
                </header>
                <div class="milestones-grid">
        `;

        items.forEach(m => {
            const tierColor = m.tier === 'advanced' ? '#ff8a3d' : (m.tier === 'intermediate' ? '#7dd3fc' : '#4ade80');
            const valueStr = _fmtMetric(m.value, m.unit);
            const targetStr = _fmtMetric(m.target, m.unit);
            const stateClass = m.reached ? 'reached' : (m.pct >= 50 ? 'progress' : 'far');

            html += `
                <article class="milestone-card ${stateClass}" data-tier="${m.tier}" style="--tier-color: ${tierColor};">
                    <span class="milestone-accent" aria-hidden="true"></span>
                    <div class="milestone-kicker">${m.kicker}${m.reached ? ' · ATTEINT' : ''}</div>
                    <div class="milestone-title">${m.title}</div>
                    <div class="milestone-numbers">
                        <span class="milestone-current">${valueStr}</span>
                        <span class="milestone-divider">/</span>
                        <span class="milestone-target">${targetStr}</span>
                    </div>
                    ${m.context ? `<div class="milestone-context">${m.context}</div>` : ''}
                    <div class="milestone-bar" role="progressbar" aria-valuenow="${Math.round(m.pct)}" aria-valuemin="0" aria-valuemax="100" aria-label="${m.title}: ${Math.round(m.pct)}%">
                        <span class="milestone-bar-fill" style="width: ${m.pct}%"></span>
                    </div>
                </article>
            `;
        });

        html += `
                </div>
            </section>
        `;
        return html;
    }

    // ==================== EXPORT ====================
    window.Achievements = {
        check: checkAchievements,
        render: renderAchievementsShowcase,
        // V10 — milestones intelligents (1RM relatif, charges symboliques, semaines consec, tonnage)
        renderMilestones: renderMilestonesShowcase,
        computeMilestones,
        notify: notifyNewAchievement,
        getAll: () => ACHIEVEMENTS,
        getMilestones: () => MILESTONES
    };

    console.log('🏆 Achievements module loaded (V10 milestones)');

})();
