// ==================== FITMEDIA — Visuels d'exercices Pit Lane ====================
// Unifie les 3 sources d'images :
//   1. Supabase Storage WebP (getExerciseImageUrl) — baseline existante
//   2. Free-Exercise-DB (yuhonas, MIT) — 2 photos par exo via jsDelivr CDN
//   3. Fallback SVG+emoji (jamais de 404 visible)
//
// API publique : window.FitMedia
//   - resolveImages(exercise)  → Array<{src, type, index}>
//   - renderSlot(el, exercise) → injecte <div class="ex-media-slot"> avec carousel/lazy
//   - renderThumb(exercise)    → string HTML pour miniature 44px (exercise-card list)
//   - preloadVisible()         → hook pour IntersectionObserver global
//
// Cache des matches résolus en localStorage (clé fit_media_cache_v1).

(function() {
    'use strict';

    const CACHE_KEY = 'fit_media_cache_v1';
    const CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 jours

    // Emojis de fallback par muscle — réutilisés partout
    const MUSCLE_EMOJI = {
        chest: '🫁', back: '🔙', shoulders: '🎯', 'rear-delts': '🎯',
        triceps: '💪', biceps: '💪', quads: '🦵', hamstrings: '🦵',
        glutes: '🍑', calves: '🦶', traps: '🔺', abs: '🎽',
        forearms: '✊', cardio: '🏃', full: '🏋️'
    };

    // ========== CACHE LOCALSTORAGE ==========

    function _loadCache() {
        try {
            const raw = localStorage.getItem(CACHE_KEY);
            if (!raw) return {};
            const parsed = JSON.parse(raw);
            // Purge entrées expirées
            const now = Date.now();
            Object.keys(parsed).forEach(k => {
                if (!parsed[k] || (parsed[k].t && now - parsed[k].t > CACHE_TTL)) {
                    delete parsed[k];
                }
            });
            return parsed;
        } catch { return {}; }
    }

    function _saveCache(cache) {
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch {}
    }

    let _cache = _loadCache();

    function _setCached(key, value) {
        _cache[key] = { v: value, t: Date.now() };
        // debounce write
        clearTimeout(_saveCache._to);
        _saveCache._to = setTimeout(() => _saveCache(_cache), 400);
    }

    function _getCached(key) {
        const entry = _cache[key];
        return entry ? entry.v : undefined;
    }

    // ========== RÉSOLUTION SOURCES ==========

    /**
     * Retourne l'URL jsDelivr Free-DB pour un ID exo FitTrack, via mapping explicite.
     */
    function _getFreeDbSlug(exerciseId) {
        if (!exerciseId) return null;
        const map = window.FREE_EXERCISE_DB_MAP || {};
        if (map[exerciseId]) return map[exerciseId];
        // Tentative fallback : TitleCase avec _ (rarement juste mais couvre quelques cas)
        const cached = _getCached('fb:' + exerciseId);
        if (cached === false) return null;
        return null; // pas de match auto côté runtime (évite 404 spam)
    }

    /**
     * Retourne toutes les images disponibles (ordonnées par qualité/pertinence).
     * @param {Object|string} ex — objet exercice {id, muscle, name} OU string id
     * @returns {Array<{src, type, index, alt}>}
     */
    function resolveImages(ex) {
        if (!ex) return [];
        const exercise = typeof ex === 'string' ? { id: ex, name: ex } : ex;
        const out = [];

        // Source 1 : Supabase Storage WebP (si mapping existe)
        if (typeof getExerciseImageUrl === 'function' && exercise.id) {
            const localUrl = getExerciseImageUrl(exercise.id);
            if (localUrl) {
                out.push({ src: localUrl, type: 'local', index: 0, alt: exercise.name || exercise.id });
            }
        }

        // Source 2 : Free-Exercise-DB via jsDelivr (2 photos)
        // NB: structure réelle du repo = exercises/<slug>/<n>.jpg (pas de sous-dossier images/)
        const slug = _getFreeDbSlug(exercise.id);
        if (slug) {
            const base = window.FREE_DB_BASE || 'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises';
            const count = window.FREE_DB_COUNT || 2;
            for (let i = 0; i < count; i++) {
                out.push({
                    src: `${base}/${slug}/${i}.jpg`,
                    type: 'freedb',
                    index: i,
                    alt: `${exercise.name || exercise.id} — image ${i + 1}`
                });
            }
        }

        return out;
    }

    /**
     * Variante filtrée par types (ex: excludeTypes: ['local'] pour éviter le doublon
     * avec un hero qui affiche déjà l'image locale).
     */
    function resolveImagesFiltered(ex, opts = {}) {
        let imgs = resolveImages(ex);
        if (Array.isArray(opts.excludeTypes) && opts.excludeTypes.length > 0) {
            imgs = imgs.filter(i => !opts.excludeTypes.includes(i.type));
        }
        // Ré-indexation pour rester cohérent avec le kicker 01/02
        imgs.forEach((img, i) => { img.index = i; });
        return imgs;
    }

    function resolvePrimary(ex) {
        const list = resolveImages(ex);
        return list[0] || null;
    }

    function getFallbackEmoji(ex) {
        const exercise = typeof ex === 'string' ? { muscle: 'full' } : (ex || {});
        return MUSCLE_EMOJI[exercise.muscle] || '🏋️';
    }

    // ========== RENDU THUMB (liste exercices) ==========

    /**
     * Génère le HTML d'une miniature 44×44 avec fallback chaîné en cascade.
     * Un seul <img> qui tente src[0], et onerror passe à src[1], etc.
     */
    function renderThumb(ex) {
        const images = resolveImages(ex);
        if (images.length === 0) {
            return `<div class="ex-media-thumb ex-media-thumb--fallback" aria-hidden="true">${getFallbackEmoji(ex)}</div>`;
        }
        const urls = images.map(i => i.src);
        const alt = (typeof ex === 'object' ? ex.name : ex) || 'Exercice';
        const emoji = getFallbackEmoji(ex);
        const urlsAttr = urls.join('||');
        // data-urls sert au handler d'erreur en cascade
        return `<img src="${urls[0]}"
                     alt="${alt.replace(/"/g, '&quot;')}"
                     class="ex-media-thumb"
                     loading="lazy"
                     decoding="async"
                     data-urls="${urlsAttr}"
                     data-fallback-emoji="${emoji}"
                     onerror="FitMedia._onThumbError(this)">`;
    }

    function _onThumbError(img) {
        if (!img || !img.dataset) return;
        const urls = (img.dataset.urls || '').split('||').filter(Boolean);
        const currentIdx = parseInt(img.dataset.fallbackIdx || '0', 10);
        const nextIdx = currentIdx + 1;
        if (nextIdx < urls.length) {
            img.dataset.fallbackIdx = String(nextIdx);
            img.src = urls[nextIdx];
        } else {
            // Toutes les sources ont échoué → remplace par fallback emoji
            const emoji = img.dataset.fallbackEmoji || '🏋️';
            const wrapper = document.createElement('div');
            wrapper.className = 'ex-media-thumb ex-media-thumb--fallback';
            wrapper.setAttribute('aria-hidden', 'true');
            wrapper.textContent = emoji;
            if (img.parentNode) img.parentNode.replaceChild(wrapper, img);
        }
    }

    // ========== RENDU CAROUSEL (panneau détail exo) ==========

    /**
     * Injecte dans <container> un carousel Pit Lane :
     *   - 1 image → static
     *   - 2+ images → dots + swipe (tactile) + keyboard arrows
     * Lazy-load via IntersectionObserver.
     */
    function renderSlot(container, ex, opts = {}) {
        if (!container) return;
        const images = resolveImagesFiltered(ex, opts);
        const variant = opts.variant || 'detail'; // 'detail' | 'compact'
        const emoji = getFallbackEmoji(ex);
        const exerciseName = (typeof ex === 'object' ? ex.name : ex) || 'Exercice';

        if (images.length === 0) {
            container.innerHTML = `
                <div class="ex-media-slot ex-media-slot--${variant} ex-media-slot--fallback">
                    <div class="ex-media-fallback" aria-hidden="true">${emoji}</div>
                </div>
            `;
            return;
        }

        const slides = images.map((img, i) => `
            <div class="ex-media-slide" data-idx="${i}" ${i === 0 ? '' : 'aria-hidden="true"'}>
                <img data-src="${img.src}"
                     alt="${img.alt.replace(/"/g, '&quot;')}"
                     class="ex-media-img"
                     decoding="async"
                     data-source="${img.type}"
                     onerror="FitMedia._onSlideError(this, '${emoji}')">
                <span class="ex-media-source-tag ex-media-source-tag--${img.type}">
                    ${img.type === 'local' ? 'HQ' : 'REF'}
                </span>
            </div>
        `).join('');

        const dots = images.length > 1 ? `
            <div class="ex-media-dots" role="tablist" aria-label="Images de l'exercice">
                ${images.map((_, i) => `
                    <button type="button"
                            class="ex-media-dot ${i === 0 ? 'is-active' : ''}"
                            data-idx="${i}"
                            role="tab"
                            aria-selected="${i === 0}"
                            aria-label="Image ${i + 1} sur ${images.length}"
                            onclick="FitMedia._gotoSlide(this, ${i})"></button>
                `).join('')}
            </div>
        ` : '';

        container.innerHTML = `
            <div class="ex-media-slot ex-media-slot--${variant}"
                 data-count="${images.length}"
                 data-current="0"
                 tabindex="0"
                 role="region"
                 aria-roledescription="Carousel d'images d'exercice"
                 aria-label="${exerciseName.replace(/"/g, '&quot;')}">
                <div class="ex-media-track" style="transform: translateX(0%)">
                    ${slides}
                </div>
                <div class="ex-media-kicker">
                    <span class="ex-media-kicker-num">01</span>
                    <span class="ex-media-kicker-label">${images.length > 1 ? 'Technique' : 'Référence'}</span>
                </div>
                ${dots}
            </div>
        `;

        const slot = container.querySelector('.ex-media-slot');
        _attachLazyLoad(slot);
        _attachCarouselGestures(slot);
    }

    function _attachLazyLoad(slot) {
        if (!slot) return;
        if (!('IntersectionObserver' in window)) {
            // Fallback : charge tout de suite
            slot.querySelectorAll('img[data-src]').forEach(img => {
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
            });
            return;
        }
        const io = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                const container = entry.target;
                container.querySelectorAll('img[data-src]').forEach(img => {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                });
                io.unobserve(container);
            });
        }, { rootMargin: '200px 0px' });
        io.observe(slot);
    }

    function _attachCarouselGestures(slot) {
        if (!slot) return;
        const count = parseInt(slot.dataset.count || '1', 10);
        if (count < 2) return;

        // Touch swipe
        let startX = 0;
        let deltaX = 0;
        slot.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            deltaX = 0;
        }, { passive: true });
        slot.addEventListener('touchmove', (e) => {
            deltaX = e.touches[0].clientX - startX;
        }, { passive: true });
        slot.addEventListener('touchend', () => {
            if (Math.abs(deltaX) < 40) return;
            const current = parseInt(slot.dataset.current || '0', 10);
            const next = deltaX < 0 ? Math.min(current + 1, count - 1) : Math.max(current - 1, 0);
            _setSlide(slot, next);
        });

        // Clavier
        slot.addEventListener('keydown', (e) => {
            const current = parseInt(slot.dataset.current || '0', 10);
            if (e.key === 'ArrowRight') { _setSlide(slot, Math.min(current + 1, count - 1)); e.preventDefault(); }
            if (e.key === 'ArrowLeft')  { _setSlide(slot, Math.max(current - 1, 0));          e.preventDefault(); }
        });
    }

    function _setSlide(slot, idx) {
        if (!slot) return;
        slot.dataset.current = String(idx);
        const track = slot.querySelector('.ex-media-track');
        if (track) track.style.transform = `translateX(-${idx * 100}%)`;
        slot.querySelectorAll('.ex-media-dot').forEach((d, i) => {
            d.classList.toggle('is-active', i === idx);
            d.setAttribute('aria-selected', i === idx ? 'true' : 'false');
        });
        slot.querySelectorAll('.ex-media-slide').forEach((s, i) => {
            if (i === idx) s.removeAttribute('aria-hidden');
            else s.setAttribute('aria-hidden', 'true');
        });
        // Met à jour le kicker "01 / 02"
        const kickerNum = slot.querySelector('.ex-media-kicker-num');
        if (kickerNum) kickerNum.textContent = String(idx + 1).padStart(2, '0');
    }

    function _gotoSlide(btn, idx) {
        const slot = btn.closest('.ex-media-slot');
        _setSlide(slot, idx);
    }

    function _onSlideError(img, emoji) {
        const slide = img.closest('.ex-media-slide');
        if (!slide) return;
        slide.innerHTML = `<div class="ex-media-fallback" aria-hidden="true">${emoji || '🏋️'}</div>`;
    }

    // ========== EXPORT ==========

    window.FitMedia = {
        resolveImages,
        resolveImagesFiltered,
        resolvePrimary,
        getFallbackEmoji,
        renderThumb,
        renderSlot,
        // Internals (exposés pour handlers inline)
        _onThumbError,
        _onSlideError,
        _gotoSlide,
        _setCached,
        _getCached
    };
})();
