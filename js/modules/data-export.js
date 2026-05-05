// ==================== REPZY DATA EXPORT (V10) ====================
// Export CSV complet : (1) Séances détaillées, (2) Stats hebdomadaires,
// (3) Journal nutrition. Chaque export utilise navigator.share quand
// disponible (mobile, partage natif), sinon fallback download blob.
//
// Format Pit Lane Cockpit pour la modale : kicker DM Mono, 3 cartes tier-colored,
// CTA primaire brand-red. RGPD-friendly : tout est généré côté client, aucun
// upload, aucune fuite via URL.

(function() {
    'use strict';

    // ──────────── HELPERS ────────────

    /**
     * V10 : escape CSV cell — échappe quotes, double les " et entoure si besoin.
     */
    function _csvCell(value) {
        if (value === null || value === undefined) return '';
        const s = String(value);
        if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes(';')) {
            return '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
    }

    function _csvRow(cells) {
        return cells.map(_csvCell).join(',');
    }

    function _isoDate(d) {
        if (!d) return '';
        const date = (d instanceof Date) ? d : new Date(d);
        if (isNaN(date.getTime())) return '';
        return date.toISOString().split('T')[0];
    }

    /**
     * V10 : ISO week (lundi-dim) → "YYYY-WW".
     */
    function _isoWeek(date) {
        const d = (date instanceof Date) ? date : new Date(date);
        if (isNaN(d.getTime())) return '';
        const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        const dayNum = (tmp.getUTCDay() + 6) % 7;
        tmp.setUTCDate(tmp.getUTCDate() - dayNum + 3);
        const firstThu = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 4));
        const weekNum = 1 + Math.round(((tmp - firstThu) / 86400000 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7);
        return `${tmp.getUTCFullYear()}-${String(weekNum).padStart(2, '0')}`;
    }

    // ──────────── BUILDERS CSV ────────────

    /**
     * V10 : CSV séances détaillées — 1 ligne par série (la plus haute granularité).
     * Header : date, jour, programme, exercice, set#, poids_kg, reps, volume, rpe, isWarmup, sessionId
     */
    function buildSessionsCSV() {
        const sessions = (state.sessionHistory || []).filter(s => !s.deletedAt);
        sessions.sort((a, b) => new Date(b.date) - new Date(a.date));

        const rows = [_csvRow([
            'date', 'jour', 'programme', 'exercice',
            'set_number', 'poids_kg', 'reps', 'volume_kg',
            'rpe', 'is_warmup', 'session_id', 'duree_min', 'calories'
        ])];

        sessions.forEach(s => {
            const date = _isoDate(s.date);
            const day = s.day || '';
            const program = s.program || (s.sessionType === 'free' ? 'Séance libre' : (s.sessionType === 'builtin' ? 'Programme proven' : ''));
            const sessionId = s.sessionId || '';
            const duration = s.duration || 0;
            const calories = s.caloriesBurned || 0;

            (s.exercises || []).forEach(ex => {
                const exName = ex.exercise || ex.name || '';
                (ex.sets || []).forEach(set => {
                    const weight = set.weight || 0;
                    const reps = set.reps || 0;
                    rows.push(_csvRow([
                        date, day, program, exName,
                        set.setNumber || '', weight, reps, Math.round(weight * reps),
                        set.rpe || '', set.isWarmup ? '1' : '0', sessionId, duration, calories
                    ]));
                });
            });
        });

        return rows.join('\n');
    }

    /**
     * V10 : CSV stats hebdomadaires — agrégation par semaine ISO.
     * Header : semaine, nb_sessions, volume_total_kg, calories_total, durée_total_min,
     *          nb_exercices_uniques, nb_prs (basé sur prsCount par séance)
     */
    function buildWeeklyStatsCSV() {
        const sessions = (state.sessionHistory || []).filter(s => !s.deletedAt);
        const byWeek = {};

        sessions.forEach(s => {
            const week = _isoWeek(s.date);
            if (!week) return;
            if (!byWeek[week]) {
                byWeek[week] = { sessions: 0, volume: 0, calories: 0, duration: 0, exercises: new Set(), prs: 0 };
            }
            byWeek[week].sessions += 1;
            byWeek[week].volume += s.totalVolume || 0;
            byWeek[week].calories += s.caloriesBurned || 0;
            byWeek[week].duration += s.duration || 0;
            byWeek[week].prs += s.prsCount || 0;
            (s.exercises || []).forEach(ex => byWeek[week].exercises.add(ex.exercise || ex.name || ''));
        });

        const weeks = Object.keys(byWeek).sort().reverse();
        const rows = [_csvRow([
            'semaine_iso', 'nb_sessions', 'volume_total_kg',
            'calories_total', 'duree_total_min', 'nb_exercices_uniques', 'nb_prs'
        ])];

        weeks.forEach(w => {
            const stats = byWeek[w];
            rows.push(_csvRow([
                w, stats.sessions, Math.round(stats.volume),
                Math.round(stats.calories), stats.duration, stats.exercises.size, stats.prs
            ]));
        });

        return rows.join('\n');
    }

    /**
     * V10 : CSV nutrition — journal alimentaire jour par jour.
     * Header : date, repas, aliment, quantite_g, calories, proteines_g, glucides_g, lipides_g
     */
    function buildNutritionCSV() {
        const journal = state.nutritionJournal || {};
        const dates = Object.keys(journal).sort().reverse();

        const rows = [_csvRow([
            'date', 'repas', 'aliment', 'quantite_g',
            'calories', 'proteines_g', 'glucides_g', 'lipides_g'
        ])];

        dates.forEach(date => {
            const day = journal[date];
            if (!day || typeof day !== 'object') return;
            // Structure : { breakfast: [...], lunch: [...], dinner: [...], snacks: [...] }
            const meals = ['breakfast', 'lunch', 'dinner', 'snacks'];
            const mealLabels = { breakfast: 'Petit-déj', lunch: 'Déjeuner', dinner: 'Dîner', snacks: 'Collation' };
            meals.forEach(meal => {
                const items = day[meal];
                if (!Array.isArray(items)) return;
                items.forEach(food => {
                    if (!food) return;
                    rows.push(_csvRow([
                        date,
                        mealLabels[meal],
                        food.name || food.foodName || '',
                        food.quantity || food.amount || '',
                        Math.round(food.calories || 0),
                        Math.round((food.protein || 0) * 10) / 10,
                        Math.round((food.carbs || 0) * 10) / 10,
                        Math.round((food.fat || 0) * 10) / 10
                    ]));
                });
            });
        });

        return rows.join('\n');
    }

    // ──────────── DELIVERY (share / download) ────────────

    /**
     * V10 : déclenche le partage natif si dispo, sinon fallback download.
     * BOM UTF-8 pour Excel + extension .csv.
     */
    async function deliverCSV(filename, csvContent) {
        const bom = '\uFEFF';
        const fullContent = bom + csvContent;
        const blob = new Blob([fullContent], { type: 'text/csv;charset=utf-8;' });

        // Tentative : Web Share API (mobile, partage natif vers email/Drive/etc.)
        if (navigator.canShare && navigator.share) {
            try {
                const file = new File([blob], filename, { type: 'text/csv' });
                if (navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        title: 'Repzy — export CSV',
                        text: `Export Repzy : ${filename}`,
                        files: [file]
                    });
                    if (typeof showToast === 'function') showToast('Export partagé', 'success');
                    return { success: true, method: 'share' };
                }
            } catch (err) {
                if (err.name === 'AbortError') return { success: false, method: 'share', aborted: true };
                console.warn('Web Share échoué, fallback download:', err);
            }
        }

        // Fallback : download via blob URL
        try {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
            if (typeof showToast === 'function') showToast(`Téléchargé : ${filename}`, 'success');
            return { success: true, method: 'download' };
        } catch (err) {
            console.error('Erreur download CSV:', err);
            if (typeof showToast === 'function') showToast('Erreur d\'export', 'error');
            return { success: false, error: err.message };
        }
    }

    function _todayISO() {
        return new Date().toISOString().split('T')[0];
    }

    async function exportSessions() {
        const csv = buildSessionsCSV();
        return deliverCSV(`repzy-seances-${_todayISO()}.csv`, csv);
    }

    async function exportWeeklyStats() {
        const csv = buildWeeklyStatsCSV();
        return deliverCSV(`repzy-stats-hebdo-${_todayISO()}.csv`, csv);
    }

    async function exportNutrition() {
        const csv = buildNutritionCSV();
        return deliverCSV(`repzy-nutrition-${_todayISO()}.csv`, csv);
    }

    /**
     * V10 : ouvre la bottom-sheet Pit Lane d'export. 3 cartes tier-colorées
     * (sessions = brand-red, stats = sky, nutrition = green) + CTA "Tout exporter".
     */
    function openExportSheet() {
        // Anti-double overlay
        const existing = document.getElementById('export-csv-overlay');
        if (existing) existing.remove();

        const sessionsCount = (state.sessionHistory || []).filter(s => !s.deletedAt).length;
        const journalDays = Object.keys(state.nutritionJournal || {}).length;

        const overlay = document.createElement('div');
        overlay.id = 'export-csv-overlay';
        overlay.className = 'pl-library-overlay export-csv-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', 'Export CSV de tes données Repzy');
        overlay.innerHTML = `
            <div class="pl-library-sheet export-csv-sheet" role="document">
                <header class="pl-library-header">
                    <span class="pl-library-kicker">EXPORT · CSV</span>
                    <h2 class="pl-library-title">Exporter tes données</h2>
                    <p class="pl-library-sub">Téléchargement local, aucun upload — RGPD-friendly. Compatible Excel / Google Sheets / coachs externes.</p>
                    <button class="pl-library-close" type="button" aria-label="Fermer" onclick="DataExport.closeSheet()">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                </header>

                <div class="export-csv-grid">
                    <article class="export-csv-card" data-tier="sessions" style="--tier-color: #ff4d4d;">
                        <span class="export-csv-accent" aria-hidden="true"></span>
                        <div class="export-csv-kicker">SÉANCES · DÉTAIL SET-PAR-SET</div>
                        <div class="export-csv-title">Toutes mes séances</div>
                        <div class="export-csv-meta">
                            <span><strong>${sessionsCount}</strong> séances</span>
                            <span class="export-csv-sep">·</span>
                            <span>1 ligne par série</span>
                        </div>
                        <div class="export-csv-cols">date, exercice, set#, poids, reps, volume, rpe, warmup</div>
                        <button class="btn btn-primary export-csv-btn" type="button" onclick="DataExport.exportSessions()">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                            </svg>
                            <span>Exporter</span>
                        </button>
                    </article>

                    <article class="export-csv-card" data-tier="stats" style="--tier-color: #7dd3fc;">
                        <span class="export-csv-accent" aria-hidden="true"></span>
                        <div class="export-csv-kicker">STATS · AGRÉGÉ HEBDO</div>
                        <div class="export-csv-title">Stats par semaine</div>
                        <div class="export-csv-meta">
                            <span><strong>${sessionsCount > 0 ? Math.ceil(sessionsCount / 3) : 0}</strong> semaines</span>
                            <span class="export-csv-sep">·</span>
                            <span>vue d'ensemble</span>
                        </div>
                        <div class="export-csv-cols">semaine, nb_sessions, volume_kg, calories, durée, exos uniques, prs</div>
                        <button class="btn btn-secondary export-csv-btn" type="button" onclick="DataExport.exportWeeklyStats()">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                            </svg>
                            <span>Exporter</span>
                        </button>
                    </article>

                    <article class="export-csv-card" data-tier="nutrition" style="--tier-color: #4ade80;">
                        <span class="export-csv-accent" aria-hidden="true"></span>
                        <div class="export-csv-kicker">NUTRITION · JOURNAL</div>
                        <div class="export-csv-title">Journal alimentaire</div>
                        <div class="export-csv-meta">
                            <span><strong>${journalDays}</strong> jours</span>
                            <span class="export-csv-sep">·</span>
                            <span>repas + macros</span>
                        </div>
                        <div class="export-csv-cols">date, repas, aliment, quantité, calories, prot, glucides, lipides</div>
                        <button class="btn btn-secondary export-csv-btn" type="button" onclick="DataExport.exportNutrition()">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                            </svg>
                            <span>Exporter</span>
                        </button>
                    </article>
                </div>

                <footer class="export-csv-footer">
                    <button class="btn btn-ghost" type="button" onclick="DataExport.exportAll()">
                        Tout exporter (3 CSV)
                    </button>
                </footer>
            </div>
        `;

        document.body.appendChild(overlay);
        // Lock scroll via le ModalManager si dispo
        if (typeof ModalManager !== 'undefined' && ModalManager.lock) {
            ModalManager.lock('export-csv-overlay');
        } else {
            document.body.style.overflow = 'hidden';
        }
        // Animation slide-up
        requestAnimationFrame(() => overlay.classList.add('open'));

        // Close au clic sur overlay (pas sur la sheet)
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeSheet();
        });
    }

    function closeSheet() {
        const overlay = document.getElementById('export-csv-overlay');
        if (!overlay) return;
        overlay.classList.remove('open');
        setTimeout(() => {
            overlay.remove();
            if (typeof ModalManager !== 'undefined' && ModalManager.unlock) {
                ModalManager.unlock('export-csv-overlay');
            } else {
                document.body.style.overflow = '';
            }
        }, 220);
    }

    async function exportAll() {
        const r1 = await exportSessions();
        // Léger délai pour éviter de spammer le system share
        await new Promise(r => setTimeout(r, 350));
        const r2 = await exportWeeklyStats();
        await new Promise(r => setTimeout(r, 350));
        const r3 = await exportNutrition();
        if (typeof showToast === 'function' && r1.success && r2.success && r3.success) {
            showToast('3 CSV exportés', 'success');
        }
    }

    // ──────────── EXPORT ────────────
    window.DataExport = {
        // Builders bruts (testables)
        buildSessionsCSV,
        buildWeeklyStatsCSV,
        buildNutritionCSV,
        // Actions UI
        exportSessions,
        exportWeeklyStats,
        exportNutrition,
        exportAll,
        openExportSheet,
        closeSheet
    };

    console.log('📤 DataExport module loaded (V10)');
})();
