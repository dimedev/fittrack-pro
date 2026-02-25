// ==================== AI INSIGHTS MODULE ====================
// Weekly training digest via Claude API (claude-haiku-4-5)
// Cache: localStorage, keyed by ISO week number
// API key: set in Settings → AI Insights → API Key

(function() {
    'use strict';

    const CACHE_KEY_PREFIX = 'repzy-ai-insight-week-';
    const MODEL = 'claude-haiku-4-5-20251001';
    const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

    // ==================== CACHE HELPERS ====================

    function getWeekKey() {
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const week = Math.ceil(((now - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
        return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
    }

    function getCached() {
        const key = CACHE_KEY_PREFIX + getWeekKey();
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    function setCache(insight) {
        const key = CACHE_KEY_PREFIX + getWeekKey();
        try {
            localStorage.setItem(key, JSON.stringify(insight));
        } catch {}
    }

    // ==================== DATA SUMMARY ====================

    function buildWeeklySummary() {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const cutoff = sevenDaysAgo.toISOString().split('T')[0];

        const sessions = (state.sessionHistory || [])
            .filter(s => !s.deletedAt && s.date >= cutoff)
            .slice(0, 10);

        const cardioSessions = Object.entries(state.cardioLog || {})
            .filter(([date]) => date >= cutoff)
            .flatMap(([, arr]) => arr)
            .slice(0, 5);

        // PRs this week
        const newPRs = [];
        Object.entries(state.progressLog || {}).forEach(([ex, logs]) => {
            (logs || []).filter(l => l.date >= cutoff).forEach(log => {
                newPRs.push({ exercise: ex, weight: log.weight, reps: log.achievedReps });
            });
        });

        return {
            sessions: sessions.map(s => ({
                date: s.date,
                type: s.day || s.sessionName || 'Séance',
                duration: s.duration,
                exercises: s.exercises?.length || 0,
                volume: s.totalVolume
            })),
            cardio: cardioSessions.map(c => ({
                type: c.type || c.activity,
                duration: c.duration,
                calories: c.calories
            })),
            prs: newPRs.slice(0, 5),
            profile: {
                goal: state.wizardResults?.goal || 'muscle',
                experience: state.wizardResults?.experience || 'intermediate',
                frequency: state.wizardResults?.frequency || 3
            },
            stats: {
                totalSessions: sessions.length,
                totalVolume: sessions.reduce((s, x) => s + (x.totalVolume || 0), 0),
                totalCardioMin: cardioSessions.reduce((s, c) => s + (c.duration || 0), 0)
            }
        };
    }

    function buildPrompt(summary) {
        return `Tu es un coach fitness expert. Analyse la semaine d'entraînement suivante et donne un digest COURT (4-6 phrases max, en français).

Données de la semaine:
- Séances muscu: ${summary.stats.totalSessions} (volume total: ${Math.round(summary.stats.totalVolume)}kg)
- Cardio: ${summary.stats.totalCardioMin} minutes
- PRs: ${summary.prs.length > 0 ? summary.prs.map(p => `${p.exercise} ${p.weight}kg`).join(', ') : 'aucun'}
- Objectif: ${summary.profile.goal}, Niveau: ${summary.profile.experience}
${summary.sessions.length > 0 ? `- Séances: ${summary.sessions.map(s => s.type).join(', ')}` : ''}

Ton analyse doit:
1. Donner un feedback positif et motivant sur la semaine
2. Identifier 1 point fort
3. Suggérer 1 amélioration concrète pour la semaine suivante
4. Terminer par un message d'encouragement

Réponds directement sans titre ni liste — juste un texte fluide.`;
    }

    // ==================== API CALL ====================

    async function fetchInsight(apiKey) {
        const summary = buildWeeklySummary();
        const prompt = buildPrompt(summary);

        const response = await fetch(ANTHROPIC_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-ipc': 'true'
            },
            body: JSON.stringify({
                model: MODEL,
                max_tokens: 300,
                messages: [{ role: 'user', content: prompt }]
            })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || `API error ${response.status}`);
        }

        const data = await response.json();
        return data.content?.[0]?.text || '';
    }

    // ==================== UI ====================

    function renderInsightCard(text, isLoading = false, error = null) {
        const container = document.getElementById('ai-insights-container');
        if (!container) return;

        if (isLoading) {
            container.innerHTML = `
                <div class="ai-insight-card ai-insight-loading">
                    <div class="ai-insight-header">
                        <span class="ai-insight-icon">🤖</span>
                        <span class="ai-insight-title">Analyse IA en cours...</span>
                    </div>
                    <div class="ai-insight-skeleton"></div>
                    <div class="ai-insight-skeleton" style="width:80%"></div>
                    <div class="ai-insight-skeleton" style="width:60%"></div>
                </div>
            `;
            return;
        }

        if (error) {
            container.innerHTML = `
                <div class="ai-insight-card ai-insight-error">
                    <div class="ai-insight-header">
                        <span class="ai-insight-icon">🤖</span>
                        <span class="ai-insight-title">Insights IA</span>
                    </div>
                    <p class="ai-insight-text">${error}</p>
                    ${!getApiKey() ? `
                        <button class="btn btn-ghost btn-sm ai-insight-setup-btn" onclick="openAISettings()">
                            Configurer la clé API →
                        </button>
                    ` : `
                        <button class="btn btn-ghost btn-sm" onclick="AIInsights.refresh()">Réessayer</button>
                    `}
                </div>
            `;
            return;
        }

        if (!text) {
            container.innerHTML = '';
            return;
        }

        const week = getWeekKey();
        container.innerHTML = `
            <div class="ai-insight-card">
                <div class="ai-insight-header">
                    <span class="ai-insight-icon">🤖</span>
                    <div>
                        <span class="ai-insight-title">Analyse de la semaine</span>
                        <span class="ai-insight-week">${week}</span>
                    </div>
                    <button class="ai-insight-refresh" onclick="AIInsights.refresh(true)" title="Régénérer">↻</button>
                </div>
                <p class="ai-insight-text">${text.replace(/\n/g, '<br>')}</p>
                <div class="ai-insight-footer">Généré par Claude AI</div>
            </div>
        `;
    }

    // ==================== SETTINGS ====================

    const API_KEY_STORAGE = 'repzy-claude-api-key';

    function getApiKey() {
        return localStorage.getItem(API_KEY_STORAGE) || '';
    }

    function saveApiKey(key) {
        if (key) {
            localStorage.setItem(API_KEY_STORAGE, key.trim());
        } else {
            localStorage.removeItem(API_KEY_STORAGE);
        }
    }

    function openAISettings() {
        const existing = getApiKey();
        const key = prompt(
            'Clé API Anthropic (Claude)\nhttps://console.anthropic.com/\n\nCommence par "sk-ant-..."',
            existing
        );
        if (key === null) return; // cancelled
        saveApiKey(key);
        if (key) {
            AIInsights.load(true);
        }
    }

    // ==================== MAIN ENTRY ====================

    async function load(forceRefresh = false) {
        const container = document.getElementById('ai-insights-container');
        if (!container) return;

        const apiKey = getApiKey();

        if (!apiKey) {
            renderInsightCard(null, false, 'Configurez votre clé API Claude pour recevoir des insights personnalisés chaque semaine.');
            return;
        }

        // Check cache first
        if (!forceRefresh) {
            const cached = getCached();
            if (cached) {
                renderInsightCard(cached.text);
                return;
            }
        }

        // Only generate if there are sessions this week
        const summary = buildWeeklySummary();
        if (summary.stats.totalSessions === 0 && summary.stats.totalCardioMin === 0) {
            renderInsightCard(null, false, 'Complète ta première séance de la semaine pour recevoir ton analyse personnalisée.');
            return;
        }

        renderInsightCard(null, true); // show loading

        try {
            const text = await fetchInsight(apiKey);
            setCache({ text, week: getWeekKey(), generatedAt: new Date().toISOString() });
            renderInsightCard(text);
            window.track?.('ai_insight_generated', { week: getWeekKey() });
        } catch (err) {
            console.error('[AI Insights] Error:', err);
            renderInsightCard(null, false, `Erreur: ${err.message}`);
        }
    }

    // ==================== PUBLIC API ====================

    window.AIInsights = {
        load,
        refresh: (force = true) => load(force),
        openSettings: openAISettings,
        getApiKey,
        saveApiKey
    };

    window.openAISettings = openAISettings;

    console.log('🤖 AI Insights module loaded');
})();
