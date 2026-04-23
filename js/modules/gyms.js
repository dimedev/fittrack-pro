// ==================== GYMS MODULE ====================
// Multi-gym weights — permet à l'utilisateur d'avoir plusieurs salles
// (Fitness Park, On Air…) avec des poids différents par machine.
//
// MODÈLE DE DONNÉES
//   state.gyms = [
//     { id: 'gym_xxx', name: 'On Air Paris 15', brand: 'on-air'|null, createdAt: ISO }
//   ]
//   state.activeGymId = 'gym_xxx' | null
//
//   session.gymId = snapshot au démarrage de la séance
//   progressLog[exo][i].gymId = snapshot à la validation
//
// INTERACTIONS
//   - findProgressLogs(name, gymId): filtrage transparent via progress.js
//   - openGymSwitcher(): bottom sheet (FS header chip)
//   - renderGymsManagerInto(container): Profil > Mes salles (CRUD)
//
// Dépend de: state, saveState(), showToast, ModalManager, openModal/closeModal

(function () {
    'use strict';

    // ── Brand presets connus (nom, couleur mnémonique, label) ─────────────────
    // Le user peut aussi taper un nom libre et brand reste null.
    const GYM_BRANDS = {
        'on-air':       { label: 'On Air',       short: 'ON AIR' },
        'fitness-park': { label: 'Fitness Park', short: 'FITNESS PARK' },
        'basic-fit':    { label: 'Basic-Fit',    short: 'BASIC-FIT' },
        'keepcool':     { label: 'Keepcool',     short: 'KEEPCOOL' },
        'neoness':      { label: 'Neoness',      short: 'NEONESS' },
        'cmg':          { label: 'CMG Sports',   short: 'CMG' },
        'magicform':    { label: 'Magic Form',   short: 'MAGIC FORM' },
        'home':         { label: 'Maison',       short: 'HOME GYM' },
        'other':        { label: 'Autre',        short: 'GYM' }
    };

    // Génération UUID courte (collision-safe pour <1M)
    function _genId() {
        return 'gym_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
    }

    // ── API PUBLIQUE ─────────────────────────────────────────────────────────

    /**
     * Crée une nouvelle salle. Retourne le gym créé.
     * Si c'est la première salle créée → devient automatiquement active.
     */
    function createGym(name, brand = null) {
        name = (name || '').trim();
        if (!name) throw new Error('Nom de salle requis');
        if (!state.gyms) state.gyms = [];
        const gym = {
            id: _genId(),
            name: name.slice(0, 40),
            brand: brand && GYM_BRANDS[brand] ? brand : null,
            createdAt: new Date().toISOString()
        };
        state.gyms.push(gym);
        if (!state.activeGymId) state.activeGymId = gym.id;
        if (typeof saveState === 'function') saveState();
        return gym;
    }

    /** Renomme / met à jour une salle */
    function updateGym(id, patch) {
        const gym = (state.gyms || []).find(g => g.id === id);
        if (!gym) return null;
        if (patch.name !== undefined) gym.name = (patch.name || '').trim().slice(0, 40) || gym.name;
        if (patch.brand !== undefined) gym.brand = patch.brand && GYM_BRANDS[patch.brand] ? patch.brand : null;
        if (typeof saveState === 'function') saveState();
        return gym;
    }

    /** Supprime une salle. Les sessions/logs gardent leur gymId orphelin (historique). */
    function deleteGym(id) {
        if (!state.gyms) return;
        state.gyms = state.gyms.filter(g => g.id !== id);
        if (state.activeGymId === id) {
            state.activeGymId = state.gyms.length > 0 ? state.gyms[0].id : null;
        }
        if (typeof saveState === 'function') saveState();
    }

    /** Change la salle active */
    function setActiveGym(id) {
        if (!state.gyms?.some(g => g.id === id) && id !== null) return;
        state.activeGymId = id;
        if (typeof saveState === 'function') saveState();
        // Notifier les observateurs
        try {
            document.dispatchEvent(new CustomEvent('gym:changed', { detail: { gymId: id } }));
        } catch (e) {}
        // Rafraîchir la UI de session si ouverte
        _refreshFsGymChip();
    }

    /** Retourne le gym actif (objet) ou null */
    function getActiveGym() {
        if (!state.activeGymId) return null;
        return (state.gyms || []).find(g => g.id === state.activeGymId) || null;
    }

    /** Retourne un gym par id (peut être orphelin → renvoie un fallback affichable) */
    function getGymById(id) {
        if (!id) return null;
        const gym = (state.gyms || []).find(g => g.id === id);
        if (gym) return gym;
        // Orphelin (supprimé) — affichable proprement
        return { id, name: 'Salle supprimée', brand: null, _orphan: true };
    }

    /** Label court uppercase pour les chips (DM Mono) */
    function getGymShortLabel(gymOrId) {
        const gym = typeof gymOrId === 'string' ? getGymById(gymOrId) : gymOrId;
        if (!gym) return '—';
        if (gym.brand && GYM_BRANDS[gym.brand]) return GYM_BRANDS[gym.brand].short;
        return gym.name.toUpperCase().slice(0, 20);
    }

    /**
     * Migration one-shot : si l'utilisateur a déjà des sessions mais aucune gym,
     * on crée une salle par défaut et on tague toutes les données existantes.
     * Idempotent (ne s'exécute qu'une fois grâce à state._gymsMigrated).
     */
    function migrateLegacyData() {
        if (state._gymsMigrated) return;

        if (!state.gyms) state.gyms = [];
        if (state.activeGymId === undefined) state.activeGymId = null;

        const hasHistory = (state.sessionHistory?.length || 0) > 0
                        || Object.keys(state.progressLog || {}).length > 0;

        if (state.gyms.length === 0 && hasHistory) {
            // Crée une salle legacy, active par défaut
            const legacy = {
                id: 'gym_legacy',
                name: 'Ma salle',
                brand: null,
                createdAt: new Date(0).toISOString(),
                _legacy: true
            };
            state.gyms.push(legacy);
            state.activeGymId = legacy.id;

            // Tag toutes les sessions sans gymId
            let tagged = 0;
            (state.sessionHistory || []).forEach(s => {
                if (!s.gymId) { s.gymId = legacy.id; tagged++; }
            });

            // Tag toutes les entrées progressLog sans gymId
            let taggedLogs = 0;
            Object.values(state.progressLog || {}).forEach(logs => {
                if (!Array.isArray(logs)) return;
                logs.forEach(entry => {
                    if (!entry.gymId) { entry.gymId = legacy.id; taggedLogs++; }
                });
            });

            console.log(`[gyms] Migration: salle 'Ma salle' créée, ${tagged} sessions + ${taggedLogs} logs taggés.`);
        }

        state._gymsMigrated = true;
    }

    // ── UI : CHIP DANS LE HEADER FS ──────────────────────────────────────────

    function _refreshFsGymChip() {
        const chip = document.getElementById('fs-gym-chip');
        if (!chip) return;
        const gym = getActiveGym();
        if (!gym) {
            chip.style.display = 'none';
            return;
        }
        chip.style.display = '';
        const label = chip.querySelector('#fs-gym-chip-name');
        if (label) label.textContent = getGymShortLabel(gym);
    }

    // ── UI : BOTTOM SHEET SWITCHER ───────────────────────────────────────────

    function openGymSwitcher() {
        const sheet = document.getElementById('gym-switcher-sheet');
        if (!sheet) return;
        _renderGymSwitcherList();
        sheet.classList.add('active');
        if (window.ModalManager) window.ModalManager.lock('gym-switcher-sheet');
    }

    function closeGymSwitcher() {
        const sheet = document.getElementById('gym-switcher-sheet');
        if (!sheet) return;
        sheet.classList.remove('active');
        if (window.ModalManager) window.ModalManager.unlock('gym-switcher-sheet');
    }

    function _renderGymSwitcherList() {
        const list = document.getElementById('gym-switcher-list');
        if (!list) return;
        const gyms = state.gyms || [];
        if (gyms.length === 0) {
            list.innerHTML = `
                <div class="gym-switcher-empty">
                    <p>Aucune salle. Ajoutes-en une pour tracker tes poids par lieu.</p>
                </div>`;
            return;
        }
        const activeId = state.activeGymId;
        list.innerHTML = gyms.map((g, i) => {
            const isActive = g.id === activeId;
            const brandLbl = g.brand && GYM_BRANDS[g.brand] ? GYM_BRANDS[g.brand].label : '';
            const brandChip = brandLbl
                ? `<span class="gym-item-brand">${brandLbl}</span>`
                : '';
            return `
            <button type="button"
                    class="gym-item ${isActive ? 'is-active' : ''}"
                    style="--i:${i}"
                    onclick="FitGyms.pickGym('${g.id}')">
                <span class="gym-item-radio" aria-hidden="true"></span>
                <div class="gym-item-body">
                    <span class="gym-item-name">${_escape(g.name)}</span>
                    ${brandChip}
                </div>
                ${isActive ? '<span class="gym-item-active-pill">EN COURS</span>' : ''}
            </button>`;
        }).join('');
    }

    function pickGym(id) {
        setActiveGym(id);
        _renderGymSwitcherList();
        _renderGymsManager(); // refresh profil si ouvert
        closeGymSwitcher();
        if (typeof showToast === 'function') {
            const gym = getActiveGym();
            showToast(`Salle active : ${gym?.name || '—'}`, 'success', 1800);
        }
    }

    // ── UI : FORM AJOUT SALLE (prompt léger) ─────────────────────────────────

    function openAddGymForm() {
        const sheet = document.getElementById('gym-add-sheet');
        if (!sheet) return;
        _resetAddGymForm();
        sheet.classList.add('active');
        if (window.ModalManager) window.ModalManager.lock('gym-add-sheet');
        setTimeout(() => {
            const input = document.getElementById('gym-add-name');
            if (input) input.focus();
        }, 250);
    }

    function closeAddGymForm() {
        const sheet = document.getElementById('gym-add-sheet');
        if (!sheet) return;
        sheet.classList.remove('active');
        if (window.ModalManager) window.ModalManager.unlock('gym-add-sheet');
    }

    function _resetAddGymForm() {
        const nameInput = document.getElementById('gym-add-name');
        if (nameInput) nameInput.value = '';
        const brandSel = document.getElementById('gym-add-brand');
        if (brandSel) brandSel.value = '';
        const editIdHidden = document.getElementById('gym-add-edit-id');
        if (editIdHidden) editIdHidden.value = '';
        const title = document.getElementById('gym-add-title');
        if (title) title.textContent = 'Nouvelle salle';
        const submit = document.getElementById('gym-add-submit');
        if (submit) submit.textContent = 'Ajouter';
    }

    function submitAddGymForm() {
        const nameInput = document.getElementById('gym-add-name');
        const brandSel = document.getElementById('gym-add-brand');
        const editId = document.getElementById('gym-add-edit-id')?.value;
        const name = (nameInput?.value || '').trim();
        const brand = brandSel?.value || null;
        if (!name) {
            if (typeof showToast === 'function') showToast('Donne un nom à la salle', 'warning');
            nameInput?.focus();
            return;
        }
        if (editId) {
            updateGym(editId, { name, brand });
            if (typeof showToast === 'function') showToast('Salle modifiée', 'success', 1500);
        } else {
            const gym = createGym(name, brand);
            setActiveGym(gym.id);
            if (typeof showToast === 'function') showToast(`${gym.name} ajoutée`, 'success', 1800);
        }
        closeAddGymForm();
        _renderGymSwitcherList();
        _renderGymsManager();
    }

    function openEditGymForm(gymId) {
        const gym = getGymById(gymId);
        if (!gym || gym._orphan) return;
        openAddGymForm();
        setTimeout(() => {
            document.getElementById('gym-add-name').value = gym.name;
            document.getElementById('gym-add-brand').value = gym.brand || '';
            document.getElementById('gym-add-edit-id').value = gym.id;
            document.getElementById('gym-add-title').textContent = 'Modifier la salle';
            document.getElementById('gym-add-submit').textContent = 'Enregistrer';
        }, 100);
    }

    async function confirmDeleteGym(gymId) {
        const gym = getGymById(gymId);
        if (!gym || gym._orphan) return;
        const confirmed = typeof showConfirmModal === 'function'
            ? await showConfirmModal({
                title: `Supprimer « ${gym.name} » ?`,
                message: 'Les sessions déjà enregistrées ne seront pas supprimées, mais ne seront plus liées à cette salle.',
                confirmText: 'Supprimer',
                cancelText: 'Annuler',
                confirmClass: 'btn-danger'
            })
            : confirm(`Supprimer ${gym.name} ?`);
        if (!confirmed) return;
        deleteGym(gymId);
        _renderGymsManager();
        _renderGymSwitcherList();
        _refreshFsGymChip();
        if (typeof showToast === 'function') showToast('Salle supprimée', 'info', 1500);
    }

    // ── UI : MES SALLES (dans modal profil) ──────────────────────────────────

    function renderGymsManagerInto(container) {
        if (!container) container = document.getElementById('gyms-manager-list');
        if (!container) return;
        const gyms = state.gyms || [];
        const activeId = state.activeGymId;

        if (gyms.length === 0) {
            container.innerHTML = `
                <div class="gyms-manager-empty">
                    <p>Aucune salle enregistrée.</p>
                </div>`;
            return;
        }

        container.innerHTML = gyms.map((g, i) => {
            const isActive = g.id === activeId;
            const brandLbl = g.brand && GYM_BRANDS[g.brand] ? GYM_BRANDS[g.brand].label : '—';
            // Nombre de sessions liées
            const sessionCount = (state.sessionHistory || []).filter(s => s.gymId === g.id).length;
            return `
            <div class="gyms-manager-item ${isActive ? 'is-active' : ''}" style="--i:${i}">
                <div class="gyms-manager-item-main">
                    <div class="gyms-manager-item-info">
                        <div class="gyms-manager-item-name">${_escape(g.name)}</div>
                        <div class="gyms-manager-item-meta">
                            <span class="gyms-manager-item-brand">${brandLbl}</span>
                            <span class="gyms-manager-item-sep" aria-hidden="true">·</span>
                            <span class="gyms-manager-item-count">${sessionCount} session${sessionCount > 1 ? 's' : ''}</span>
                        </div>
                    </div>
                    ${isActive ? '<span class="gyms-manager-active-dot" aria-label="Active"></span>' : ''}
                </div>
                <div class="gyms-manager-item-actions">
                    ${!isActive ? `<button type="button" class="gyms-manager-btn activate" onclick="FitGyms.pickGymFromProfil('${g.id}')">Activer</button>` : ''}
                    <button type="button" class="gyms-manager-btn edit" onclick="FitGyms.openEditGymForm('${g.id}')" aria-label="Modifier">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                    </button>
                    <button type="button" class="gyms-manager-btn delete" onclick="FitGyms.confirmDeleteGym('${g.id}')" aria-label="Supprimer">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                    </button>
                </div>
            </div>`;
        }).join('');
    }

    function _renderGymsManager() {
        const c = document.getElementById('gyms-manager-list');
        if (c) renderGymsManagerInto(c);
    }

    function pickGymFromProfil(id) {
        setActiveGym(id);
        _renderGymsManager();
        if (typeof showToast === 'function') {
            const gym = getActiveGym();
            showToast(`Salle active : ${gym?.name || '—'}`, 'success', 1500);
        }
    }

    // ── UTILS ────────────────────────────────────────────────────────────────

    function _escape(s) {
        return (s == null ? '' : String(s))
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    // ── INIT ─────────────────────────────────────────────────────────────────

    // Déclenché quand le state est chargé (app.js doit appeler FitGyms.migrateLegacyData())
    // et quand la session plein écran s'ouvre (on refresh le chip).
    document.addEventListener('DOMContentLoaded', () => {
        // Re-refresh chip au cas où
        setTimeout(_refreshFsGymChip, 200);
    });

    // ── EXPOSITION ───────────────────────────────────────────────────────────

    window.FitGyms = {
        GYM_BRANDS,
        createGym,
        updateGym,
        deleteGym,
        setActiveGym,
        getActiveGym,
        getGymById,
        getGymShortLabel,
        migrateLegacyData,
        openGymSwitcher,
        closeGymSwitcher,
        openAddGymForm,
        closeAddGymForm,
        submitAddGymForm,
        openEditGymForm,
        confirmDeleteGym,
        pickGym,
        pickGymFromProfil,
        renderGymsManagerInto,
        _refreshFsGymChip
    };

})();
