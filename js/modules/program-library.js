// ════════════════════════════════════════════════════════════════════════════
// V9 — PROGRAM LIBRARY UI (Pit Lane Cockpit aesthetic)
// ════════════════════════════════════════════════════════════════════════════
// Affiche les BUILTIN_PROGRAMS dans une bottom sheet, gère le démarrage
// (avec saisie des Training Maxes / Working Weights) et le statut programme actif.
// ════════════════════════════════════════════════════════════════════════════

const ProgramLibrary = (function () {

    // ── Icons SVG par type de programme (Pit Lane aesthetic) ──────────────
    const ICONS = {
        plate: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="12" r="3"/><circle cx="18" cy="12" r="3"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="3" y1="9" x2="3" y2="15"/><line x1="21" y1="9" x2="21" y2="15"/></svg>`,
        lightning: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
        levels: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="20" x2="6" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="18" y1="20" x2="18" y2="14"/></svg>`,
        star: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
        spark: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 L13.5 9 L21 12 L13.5 15 L12 22 L10.5 15 L3 12 L10.5 9 Z"/></svg>`,
        split: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5"/><path d="M21 3l-7 7"/><path d="M8 21H3v-5"/><path d="M3 21l7-7"/></svg>`,
        bot: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/></svg>`
    };

    const DIFFICULTY_TIERS = {
        beginner:     { label: 'NOVICE',  cls: 'novice',  accent: '#4ade80' },
        intermediate: { label: 'INTERMÉDIAIRE', cls: 'inter', accent: '#7dd3fc' },
        advanced:     { label: 'AVANCÉ', cls: 'advanced', accent: '#ff6a3d' }
    };

    function escapeText(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /**
     * Ouvre la bibliothèque de programmes.
     */
    function openLibrary() {
        let sheet = document.getElementById('program-library-sheet');
        if (!sheet) {
            sheet = _buildSheet();
            document.body.appendChild(sheet);
        }
        _renderLibraryList(sheet);
        sheet.classList.add('is-open');
        if (typeof ModalManager !== 'undefined' && ModalManager.lock) {
            ModalManager.lock('program-library');
        }
        if (typeof haptic === 'function') haptic('light');
    }

    function closeLibrary(event) {
        if (event && event.target !== event.currentTarget) return;
        const sheet = document.getElementById('program-library-sheet');
        if (sheet) sheet.classList.remove('is-open');
        if (typeof ModalManager !== 'undefined' && ModalManager.unlock) {
            ModalManager.unlock('program-library');
        }
    }

    function _buildSheet() {
        const sheet = document.createElement('div');
        sheet.id = 'program-library-sheet';
        sheet.className = 'pl-library-overlay';
        sheet.setAttribute('role', 'dialog');
        sheet.setAttribute('aria-modal', 'true');
        sheet.setAttribute('aria-labelledby', 'pl-library-title');
        sheet.addEventListener('click', closeLibrary);
        sheet.innerHTML = `
            <div class="pl-library-sheet" onclick="event.stopPropagation()">
                <header class="pl-library-head">
                    <div class="pl-library-kicker">
                        <span class="pl-library-kicker-dot"></span>
                        <span>BIBLIOTHÈQUE · PROGRAMMES PROVEN</span>
                    </div>
                    <div class="pl-library-title-row">
                        <h2 id="pl-library-title" class="pl-library-title">Choisis ton programme</h2>
                        <button type="button" class="pl-library-close" onclick="ProgramLibrary.closeLibrary()" aria-label="Fermer">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                    </div>
                    <p class="pl-library-subtitle">6 programmes éprouvés. Force, hypertrophie, débutant à avancé.</p>
                </header>
                <div class="pl-library-body" id="pl-library-list"></div>
            </div>
        `;
        return sheet;
    }

    function _renderLibraryList(sheet) {
        const list = sheet.querySelector('#pl-library-list');
        if (!list) return;
        const programs = (typeof window !== 'undefined' && window.BUILTIN_PROGRAMS) || [];

        list.innerHTML = programs.map((p, idx) => {
            const tier = DIFFICULTY_TIERS[p.difficulty] || DIFFICULTY_TIERS.intermediate;
            const icon = ICONS[p.icon] || ICONS.plate;
            const tagsHtml = (p.tags || []).slice(0, 3)
                .map(t => `<span class="pl-program-tag">${escapeText(t)}</span>`)
                .join('');

            return `
                <article class="pl-program-card tier-${tier.cls}" style="animation-delay: ${idx * 60}ms">
                    <span class="pl-program-bar" aria-hidden="true"></span>
                    <header class="pl-program-head">
                        <div class="pl-program-icon">${icon}</div>
                        <div class="pl-program-title-block">
                            <span class="pl-program-author">${escapeText(p.author || 'Repzy')}</span>
                            <h3 class="pl-program-name">${escapeText(p.name)}</h3>
                        </div>
                        <span class="pl-program-tier">${tier.label}</span>
                    </header>
                    <p class="pl-program-summary">${escapeText(p.summary || '')}</p>
                    <div class="pl-program-meta">
                        <div class="pl-meta-cell">
                            <span class="pl-meta-kicker">JOURS / SEM</span>
                            <span class="pl-meta-value">${p.daysPerWeek}</span>
                        </div>
                        <div class="pl-meta-sep" aria-hidden="true"></div>
                        <div class="pl-meta-cell">
                            <span class="pl-meta-kicker">CYCLE</span>
                            <span class="pl-meta-value">${p.cycleWeeks > 1 ? p.cycleWeeks + ' SEM' : 'CONTINU'}</span>
                        </div>
                        <div class="pl-meta-sep" aria-hidden="true"></div>
                        <div class="pl-meta-cell">
                            <span class="pl-meta-kicker">FORMAT</span>
                            <span class="pl-meta-value">${p.requiresTM ? 'TM' : 'RM'}</span>
                        </div>
                    </div>
                    ${tagsHtml ? `<div class="pl-program-tags">${tagsHtml}</div>` : ''}
                    <footer class="pl-program-foot">
                        <button type="button" class="pl-program-cta" onclick="ProgramLibrary.openProgramDetail('${p.id}')">
                            <span>Détails</span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                        </button>
                        <button type="button" class="pl-program-start" onclick="ProgramLibrary.startProgram('${p.id}')">
                            <span>Démarrer</span>
                        </button>
                    </footer>
                </article>
            `;
        }).join('');
    }

    /**
     * Ouvre le détail d'un programme (modal). Affiche la description complète.
     */
    function openProgramDetail(programId) {
        const program = (window.ProgramRunner && window.ProgramRunner.getProgramById)
            ? window.ProgramRunner.getProgramById(programId)
            : null;
        if (!program) return;

        let detail = document.getElementById('pl-program-detail');
        if (!detail) {
            detail = document.createElement('div');
            detail.id = 'pl-program-detail';
            detail.className = 'pl-detail-overlay';
            detail.setAttribute('role', 'dialog');
            detail.addEventListener('click', (e) => { if (e.target === detail) closeProgramDetail(); });
            document.body.appendChild(detail);
        }

        const tier = DIFFICULTY_TIERS[program.difficulty] || DIFFICULTY_TIERS.intermediate;
        const icon = ICONS[program.icon] || ICONS.plate;
        const tagsHtml = (program.tags || [])
            .map(t => `<span class="pl-program-tag">${escapeText(t)}</span>`).join('');

        detail.innerHTML = `
            <div class="pl-detail-sheet" onclick="event.stopPropagation()">
                <button type="button" class="pl-detail-close" onclick="ProgramLibrary.closeProgramDetail()" aria-label="Fermer">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
                <header class="pl-detail-head">
                    <div class="pl-detail-icon">${icon}</div>
                    <span class="pl-program-author">${escapeText(program.author || 'Repzy')}</span>
                    <h2 class="pl-detail-name">${escapeText(program.name)}</h2>
                    <span class="pl-detail-tier tier-${tier.cls}">${tier.label}</span>
                </header>
                <div class="pl-detail-meta-grid">
                    <div class="pl-meta-cell">
                        <span class="pl-meta-kicker">JOURS / SEM</span>
                        <span class="pl-meta-value pl-meta-big">${program.daysPerWeek}</span>
                    </div>
                    <div class="pl-meta-cell">
                        <span class="pl-meta-kicker">CYCLE</span>
                        <span class="pl-meta-value pl-meta-big">${program.cycleWeeks > 1 ? program.cycleWeeks + ' SEM' : '1 SEM'}</span>
                    </div>
                    <div class="pl-meta-cell">
                        <span class="pl-meta-kicker">FORMAT</span>
                        <span class="pl-meta-value pl-meta-big">${program.requiresTM ? 'TM%' : 'RM'}</span>
                    </div>
                </div>
                <p class="pl-detail-description">${escapeText(program.description || program.summary || '')}</p>
                ${tagsHtml ? `<div class="pl-program-tags">${tagsHtml}</div>` : ''}
                ${program.requiresTM ? `
                    <div class="pl-detail-callout">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        <span>Ce programme requiert tes <strong>Training Maxes</strong> (≈ 90% de ton 1RM). Tu pourras les ajuster au démarrage.</span>
                    </div>
                ` : ''}
                <button type="button" class="pl-detail-cta" onclick="ProgramLibrary.startProgram('${program.id}')">
                    <span>Démarrer ${escapeText(program.shortName || program.name)}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
            </div>
        `;
        detail.classList.add('is-open');
    }

    function closeProgramDetail() {
        const detail = document.getElementById('pl-program-detail');
        if (detail) detail.classList.remove('is-open');
    }

    /**
     * Démarre un programme. Si requiresTM → ouvrir le sheet d'entrée des TM
     * avant de finaliser. Sinon → init directement.
     */
    function startProgram(programId) {
        const program = (window.ProgramRunner && window.ProgramRunner.getProgramById)
            ? window.ProgramRunner.getProgramById(programId)
            : null;
        if (!program) return;

        if (program.requiresTM) {
            _openTMSheet(program);
            return;
        }
        // Sinon : démarrage direct (le user entrera ses poids en séance)
        _confirmStart(program, {});
    }

    function _openTMSheet(program) {
        let sheet = document.getElementById('pl-tm-sheet');
        if (!sheet) {
            sheet = document.createElement('div');
            sheet.id = 'pl-tm-sheet';
            sheet.className = 'pl-tm-overlay';
            sheet.setAttribute('role', 'dialog');
            sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.classList.remove('is-open'); });
            document.body.appendChild(sheet);
        }

        // Estimer les TM depuis l'historique si dispo
        const estimated = (window.ProgramRunner && window.ProgramRunner.estimateTMsFromHistory)
            ? window.ProgramRunner.estimateTMsFromHistory()
            : { squat: null, bench: null, deadlift: null, press: null };

        const liftLabels = {
            squat: 'Squat',
            bench: 'Développé Couché',
            deadlift: 'Soulevé de Terre',
            press: 'Développé Militaire'
        };

        const tmRows = (program.coreLifts || ['squat', 'bench', 'deadlift', 'press']).map(lift => `
            <div class="pl-tm-row">
                <label class="pl-tm-label">
                    <span class="pl-tm-lift">${liftLabels[lift] || lift}</span>
                    <span class="pl-tm-hint">~ 90% du 1RM</span>
                </label>
                <div class="pl-tm-input-wrap">
                    <input type="number"
                           inputmode="decimal"
                           class="pl-tm-input"
                           id="pl-tm-${lift}"
                           data-lift="${lift}"
                           value="${estimated[lift] || ''}"
                           placeholder="${estimated[lift] || '0'}"
                           step="2.5"
                           min="0"
                           max="500">
                    <span class="pl-tm-unit">kg</span>
                </div>
            </div>
        `).join('');

        sheet.innerHTML = `
            <div class="pl-tm-sheet" onclick="event.stopPropagation()">
                <header class="pl-tm-head">
                    <span class="pl-tm-kicker">CONFIG · TRAINING MAX</span>
                    <h2 class="pl-tm-title">Configure tes TM</h2>
                    <p class="pl-tm-subtitle">Le Training Max correspond à ~90% de ton 1RM. Tu peux ajuster plus tard.</p>
                </header>
                <div class="pl-tm-body">${tmRows}</div>
                <footer class="pl-tm-foot">
                    <button type="button" class="pl-tm-back" onclick="document.getElementById('pl-tm-sheet').classList.remove('is-open')">
                        Annuler
                    </button>
                    <button type="button" class="pl-tm-confirm" onclick="ProgramLibrary._submitTMs('${program.id}')">
                        <span>Démarrer le programme</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                </footer>
            </div>
        `;
        sheet.classList.add('is-open');
    }

    function _submitTMs(programId) {
        const program = window.ProgramRunner.getProgramById(programId);
        if (!program) return;
        const tms = {};
        (program.coreLifts || []).forEach(lift => {
            const input = document.getElementById('pl-tm-' + lift);
            if (input && input.value) {
                const val = parseFloat(input.value);
                if (!isNaN(val) && val > 0) tms[lift] = val;
            }
        });
        document.getElementById('pl-tm-sheet').classList.remove('is-open');
        _confirmStart(program, { trainingMaxes: tms });
    }

    function _confirmStart(program, options) {
        if (!window.ProgramRunner) return;
        window.ProgramRunner.startProgram(program.id, options);

        // Sync wizardResults pour que le rendu Training continue de marcher
        if (typeof state !== 'undefined') {
            state.wizardResults = state.wizardResults || {};
            state.wizardResults.selectedProgram = program.id;
            state.wizardResults.frequency = program.daysPerWeek;
            state.wizardResults.builtinProgram = true;
            if (typeof saveState === 'function') saveState();
        }

        closeLibrary();
        closeProgramDetail();

        if (typeof showToast === 'function') {
            showToast(`Programme ${program.name} activé`, 'success');
        }
        if (typeof haptic === 'function') haptic('success');

        // Refresh UI
        if (typeof renderTrainingSection === 'function') renderTrainingSection();
        if (typeof updateDashboard === 'function') updateDashboard();
    }

    /**
     * Renders the active program status card (à mettre dans Training tab).
     * Retourne le HTML, le caller l'insère.
     */
    function renderActiveProgramCard() {
        if (!window.ProgramRunner) return '';
        const progress = window.ProgramRunner.getCurrentProgress();
        if (!progress) return '';
        const program = window.ProgramRunner.getProgramById(progress.programId);
        if (!program) return '';

        const next = window.ProgramRunner.getNextSession();
        const tier = DIFFICULTY_TIERS[program.difficulty] || DIFFICULTY_TIERS.intermediate;
        const icon = ICONS[program.icon] || ICONS.plate;
        const weekProgress = Math.round((progress.currentDayIndex / progress.daysPerWeek) * 100);

        return `
            <article class="pl-active-program-card tier-${tier.cls}">
                <span class="pl-program-bar" aria-hidden="true"></span>
                <header class="pl-active-head">
                    <div class="pl-active-icon">${icon}</div>
                    <div class="pl-active-title-block">
                        <span class="pl-active-kicker">PROGRAMME ACTIF · CYCLE ${progress.cycleNumber}</span>
                        <h3 class="pl-active-name">${escapeText(program.name)}</h3>
                    </div>
                </header>
                <div class="pl-active-meta">
                    <div class="pl-meta-cell">
                        <span class="pl-meta-kicker">SEMAINE</span>
                        <span class="pl-meta-value pl-meta-big">${progress.currentWeek}<span class="pl-meta-total">/${progress.cycleWeeks}</span></span>
                    </div>
                    <div class="pl-meta-sep" aria-hidden="true"></div>
                    <div class="pl-meta-cell">
                        <span class="pl-meta-kicker">JOUR</span>
                        <span class="pl-meta-value pl-meta-big">${progress.currentDayIndex + 1}<span class="pl-meta-total">/${progress.daysPerWeek}</span></span>
                    </div>
                    <div class="pl-meta-sep" aria-hidden="true"></div>
                    <div class="pl-meta-cell">
                        <span class="pl-meta-kicker">SESSIONS</span>
                        <span class="pl-meta-value pl-meta-big">${progress.totalSessions}</span>
                    </div>
                </div>
                ${progress.isDeloadWeek ? `
                    <div class="pl-active-deload-banner">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 2v6m0 8v6"/><circle cx="12" cy="12" r="2"/></svg>
                        <span>SEMAINE DELOAD · récupération active</span>
                    </div>
                ` : ''}
                ${next ? `
                    <div class="pl-active-next">
                        <div class="pl-active-next-label">
                            <span class="pl-meta-kicker">PROCHAINE SÉANCE</span>
                            <span class="pl-active-next-name">${escapeText(next.dayName)} · ${escapeText(next.weekLabel)}</span>
                        </div>
                        <button type="button" class="pl-active-start-btn" onclick="ProgramLibrary.startNextSession()">
                            <span>Démarrer</span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                        </button>
                    </div>
                ` : ''}
                <footer class="pl-active-foot">
                    <button type="button" class="pl-active-link" onclick="ProgramLibrary.openLibrary()">
                        Changer de programme
                    </button>
                    <button type="button" class="pl-active-link pl-active-link--danger" onclick="ProgramLibrary.confirmStopProgram()">
                        Arrêter
                    </button>
                </footer>
            </article>
        `;
    }

    function startNextSession() {
        if (!window.ProgramRunner) return;
        const next = window.ProgramRunner.getNextSession();
        if (!next) return;

        // Stocker la prochaine séance comme previewSession compatible
        if (typeof state !== 'undefined') {
            state.builtinNextSession = next;
            if (typeof saveState === 'function') saveState();
        }

        // Tenter d'utiliser le système de séance existant
        if (typeof startBuiltinSession === 'function') {
            startBuiltinSession(next);
        } else if (typeof showToast === 'function') {
            // Fallback : montrer un récap
            const lines = next.exercises.map(ex => {
                const wTxt = ex.suggestedWeight ? ex.suggestedWeight + 'kg' : '—';
                return `${ex.name} · ${ex.sets}×${ex.reps} · ${wTxt}`;
            }).slice(0, 5).join('<br>');
            showToast(`<strong>${escapeText(next.dayName)}</strong><br>${lines}`, 'info', 6000);
        }
    }

    function confirmStopProgram() {
        if (typeof showConfirmModal !== 'function') {
            if (window.ProgramRunner) {
                window.ProgramRunner.stopProgram();
                if (typeof renderTrainingSection === 'function') renderTrainingSection();
            }
            return;
        }
        showConfirmModal({
            title: 'Arrêter le programme ?',
            message: 'Ton historique sera conservé. Tu pourras relancer ce programme plus tard.',
            confirmText: 'Arrêter',
            cancelText: 'Annuler',
            danger: true
        }).then(confirmed => {
            if (!confirmed) return;
            window.ProgramRunner.stopProgram();
            if (typeof state !== 'undefined') {
                if (state.wizardResults) state.wizardResults.builtinProgram = false;
                state.activeBuiltinProgram = null;
                if (typeof saveState === 'function') saveState();
            }
            if (typeof showToast === 'function') showToast('Programme arrêté', 'info');
            if (typeof renderTrainingSection === 'function') renderTrainingSection();
        });
    }

    /**
     * Helper : dit si un programme builtin est actif.
     */
    function hasActiveProgram() {
        return !!(typeof state !== 'undefined' &&
                  state.activeBuiltinProgram &&
                  !state.activeBuiltinProgram.completed);
    }

    return {
        openLibrary,
        closeLibrary,
        openProgramDetail,
        closeProgramDetail,
        startProgram,
        startNextSession,
        confirmStopProgram,
        renderActiveProgramCard,
        hasActiveProgram,
        // exposed for inline handlers
        _submitTMs
    };
})();

if (typeof window !== 'undefined') {
    window.ProgramLibrary = ProgramLibrary;
}
