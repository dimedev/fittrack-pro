// ==================== FITTRACK PRO - ACHIEVEMENTS MODULE ====================
// Système de badges et accomplissements

(function() {
    'use strict';

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

        // Sessions
        if (state.sessionHistory) {
            data.totalSessions = state.sessionHistory.length;

            // Sessions cette semaine
            const now = new Date();
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Lundi
            startOfWeek.setHours(0, 0, 0, 0);

            data.sessionsThisWeek = state.sessionHistory.filter(s => {
                const sessionDate = new Date(s.date);
                return sessionDate >= startOfWeek;
            }).length;

            // Sessions ce mois
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            data.sessionsThisMonth = state.sessionHistory.filter(s => {
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
    }

    // ==================== EXPORT ====================
    window.Achievements = {
        check: checkAchievements,
        render: renderAchievementsShowcase,
        notify: notifyNewAchievement,
        getAll: () => ACHIEVEMENTS
    };

    console.log('🏆 Achievements module loaded');

})();
