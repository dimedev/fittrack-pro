// ==================== FITTRACK PRO - MOBILE GESTURES MODULE ====================
// Swipe to delete, haptic feedback, pull to refresh

(function() {
    'use strict';

    // ==================== HAPTIC FEEDBACK ====================
    // Gate: vibrate() requires prior user gesture (Chrome intervention fix)
    let _userActive = false;
    document.addEventListener('pointerdown', () => { _userActive = true; }, { once: true, passive: true });

    const Haptics = {
        light: () => { if (!_userActive) return; try { navigator.vibrate?.(10); } catch(e) {} },
        medium: () => { if (!_userActive) return; try { navigator.vibrate?.(20); } catch(e) {} },
        heavy: () => { if (!_userActive) return; try { navigator.vibrate?.(30); } catch(e) {} },
        success: () => { if (!_userActive) return; try { navigator.vibrate?.([10, 50, 20]); } catch(e) {} },
        warning: () => { if (!_userActive) return; try { navigator.vibrate?.([30, 50, 30]); } catch(e) {} },
        error: () => { if (!_userActive) return; try { navigator.vibrate?.([50, 100, 50]); } catch(e) {} }
    };

    // ==================== SWIPE TO DELETE ====================
    class SwipeToDelete {
        constructor(element, options = {}) {
            this.element = element;
            // Seuil proportionnel : 50% de la largeur de l'élément
            this.thresholdRatio = options.thresholdRatio || 0.5;
            this.onDelete = options.onDelete || (() => {});
            this.onSwipeStart = options.onSwipeStart || (() => {});
            
            this.startX = 0;
            this.currentX = 0;
            this.startY = 0;
            this.isDragging = false;
            this.deleteBackground = null;
            
            if (this.isTouchDevice()) {
                this.init();
            }
        }
        
        getThreshold() {
            // Calculer le seuil dynamiquement (50% de la largeur)
            return this.element.offsetWidth * this.thresholdRatio;
        }
        
        isTouchDevice() {
            return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        }
        
        init() {
            // Wrapper le contenu existant
            const content = document.createElement('div');
            content.className = 'swipe-content';
            while (this.element.firstChild) {
                content.appendChild(this.element.firstChild);
            }
            this.element.appendChild(content);
            this.content = content;
            
            // Créer le fond de suppression
            this.createDeleteBackground();
            
            // Event listeners
            this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
            this.element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
            this.element.addEventListener('touchend', this.handleTouchEnd.bind(this));
            this.element.addEventListener('touchcancel', this.handleTouchEnd.bind(this));
        }
        
        createDeleteBackground() {
            this.deleteBackground = document.createElement('div');
            this.deleteBackground.className = 'swipe-delete-bg';
            this.deleteBackground.innerHTML = `
                <span class="swipe-delete-icon">🗑️</span>
                <span class="swipe-delete-text">Supprimer</span>
            `;
            this.element.style.position = 'relative';
            this.element.style.overflow = 'hidden';
            this.element.insertBefore(this.deleteBackground, this.element.firstChild);
        }
        
        handleTouchStart(e) {
            // Exclure les inputs, buttons et éléments interactifs du swipe
            const target = e.target;
            const isExcluded = target.matches('input, button, select, textarea') || 
                               target.closest('input, button, select, textarea, .journal-entry-qty, .journal-entry-delete');
            
            if (isExcluded) {
                this.isDragging = false;
                return;
            }
            
            this.startX = e.touches[0].clientX;
            this.startY = e.touches[0].clientY;
            this.isDragging = true;
            this.content.style.transition = 'none';
            this.onSwipeStart();
        }
        
        handleTouchMove(e) {
            if (!this.isDragging) return;

            this.currentX = e.touches[0].clientX;
            const currentY = e.touches[0].clientY;
            const diffX = this.currentX - this.startX;
            const diffY = currentY - this.startY;

            // FIX: Si scroll vertical (geste plus vertical qu'horizontal), laisser le scroll natif
            if (Math.abs(diffY) > Math.abs(diffX)) {
                // Reset le swipe et laisse le scroll fonctionner
                this.content.style.transform = '';
                this.deleteBackground.style.opacity = '0';
                return;
            }

            // Seulement swipe vers la gauche ET avec un mouvement significatif (> 10px)
            if (diffX < 0 && Math.abs(diffX) > 10) {
                e.preventDefault();
                const maxSwipe = this.element.offsetWidth * 0.7; // Max 70% de la largeur
                const translateX = Math.max(diffX, -maxSwipe);
                this.content.style.transform = `translateX(${translateX}px)`;
                
                // Feedback visuel progressif avec opacité progressive
                const threshold = this.getThreshold();
                const progress = Math.min(Math.abs(diffX) / threshold, 1);
                this.deleteBackground.style.opacity = progress * 0.95; // Opacité max 95%
                
                // Échelle progressive du fond
                const scale = 0.95 + (progress * 0.05); // De 0.95 à 1
                this.deleteBackground.style.transform = `scaleX(${scale})`;
                
                if (progress >= 1) {
                    this.deleteBackground.classList.add('ready');
                    if (!this.hasVibrated) {
                        Haptics.medium();
                        this.hasVibrated = true;
                    }
                } else {
                    this.deleteBackground.classList.remove('ready');
                    this.hasVibrated = false;
                }
            }
        }
        
        handleTouchEnd() {
            if (!this.isDragging) return;
            this.isDragging = false;
            this.content.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            this.deleteBackground.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            
            const diffX = this.currentX - this.startX;
            const threshold = this.getThreshold();
            
            // Utiliser le seuil proportionnel (50% de la largeur)
            if (Math.abs(diffX) > threshold) {
                this.confirmDelete();
            } else {
                this.reset();
            }
            
            this.hasVibrated = false;
        }
        
        confirmDelete() {
            Haptics.success();
            
            // Animation de suppression
            this.element.style.transition = 'all 0.3s ease';
            this.element.style.transform = 'translateX(-100%)';
            this.element.style.opacity = '0';
            this.element.style.height = this.element.offsetHeight + 'px';
            
            setTimeout(() => {
                this.element.style.height = '0';
                this.element.style.marginBottom = '0';
                this.element.style.padding = '0';
            }, 100);
            
            setTimeout(() => {
                this.onDelete(this.element);
                this.element.remove();
            }, 400);
        }
        
        reset() {
            this.content.style.transform = 'translateX(0)';
            this.deleteBackground.style.opacity = '0';
            this.deleteBackground.style.transform = 'scaleX(0.95)';
            this.deleteBackground.classList.remove('ready');
        }
    }

    // ==================== TAP FEEDBACK ====================
    function initTapFeedback() {
        // Ajouter feedback sur tous les boutons et éléments interactifs
        const interactiveElements = document.querySelectorAll(`
            .btn,
            .tab,
            .nav-tab,
            .mobile-nav-item,
            .food-select-item,
            .food-search-item,
            .program-card,
            .exercise-card-header,
            .timer-preset-btn,
            .food-btn,
            .btn-icon
        `);
        
        interactiveElements.forEach(el => {
            el.addEventListener('touchstart', () => {
                Haptics.light();
            }, { passive: true });
        });
        
        // Feedback sur les boutons primaires (actions importantes)
        document.querySelectorAll('.btn-primary, .btn-brand').forEach(btn => {
            btn.addEventListener('click', () => {
                Haptics.medium();
            });
        });
        
        // Feedback sur les actions de suppression
        document.querySelectorAll('.btn-danger').forEach(btn => {
            btn.addEventListener('click', () => {
                Haptics.warning();
            });
        });
    }

    // ==================== PULL TO REFRESH ====================
    class PullToRefresh {
        constructor(container, onRefresh) {
            this.container = container;
            this.onRefresh = onRefresh;
            this.pullThreshold = 80;
            this.startY = 0;
            this.pulling = false;
            this.refreshing = false;
            
            if (this.isTouchDevice()) {
                this.init();
            }
        }
        
        isTouchDevice() {
            return 'ontouchstart' in window;
        }
        
        init() {
            this.indicator = this.createIndicator();
            
            this.container.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: true });
            this.container.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
            this.container.addEventListener('touchend', this.onTouchEnd.bind(this));
        }
        
        createIndicator() {
            const indicator = document.createElement('div');
            indicator.className = 'pull-refresh-indicator';
            indicator.innerHTML = `
                <div class="pull-refresh-spinner">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 12a9 9 0 11-6.219-8.56"/>
                    </svg>
                </div>
                <span class="pull-refresh-text">Tirer pour actualiser</span>
            `;
            // Insérer au début du container (pousse le contenu vers le bas)
            this.container.insertBefore(indicator, this.container.firstChild);
            return indicator;
        }
        
        onTouchStart(e) {
            if (this.refreshing) return;
            if (this.container.scrollTop === 0) {
                this.startY = e.touches[0].clientY;
                this.pulling = true;
            }
        }
        
        onTouchMove(e) {
            if (!this.pulling || this.refreshing) return;

            const currentY = e.touches[0].clientY;
            const pull = currentY - this.startY;

            if (pull > 0 && this.container.scrollTop === 0) {
                e.preventDefault();

                const resistance = 0.5;
                const actualPull = Math.min(pull * resistance, 100);
                const progress = Math.min(actualPull / this.pullThreshold, 1);

                // Utiliser la hauteur pour pousser le contenu (pas translateY)
                this.indicator.style.height = `${actualPull}px`;
                this.indicator.style.padding = actualPull > 20 ? '12px 0' : '0';

                // Rotation du spinner
                const rotation = pull * 2;
                this.indicator.querySelector('.pull-refresh-spinner').style.transform = `rotate(${rotation}deg)`;

                if (progress >= 1) {
                    this.indicator.querySelector('.pull-refresh-text').textContent = 'Relâcher pour actualiser';
                    this.indicator.classList.add('visible');
                    if (!this.hasVibrated) {
                        Haptics.light();
                        this.hasVibrated = true;
                    }
                } else {
                    this.indicator.querySelector('.pull-refresh-text').textContent = 'Tirer pour actualiser';
                    this.indicator.classList.remove('visible');
                    this.hasVibrated = false;
                }

                // Stocker la valeur pour onTouchEnd
                this.currentPull = actualPull;
            }
        }
        
        async onTouchEnd() {
            if (!this.pulling || this.refreshing) return;
            this.pulling = false;
            this.hasVibrated = false;

            const pull = this.currentPull || 0;

            if (pull >= this.pullThreshold) {
                // Déclencher refresh
                this.refreshing = true;
                Haptics.medium();

                this.indicator.classList.add('refreshing');
                this.indicator.classList.remove('visible');
                this.indicator.style.height = '60px';
                this.indicator.querySelector('.pull-refresh-text').textContent = 'Actualisation...';

                try {
                    await this.onRefresh();
                    Haptics.success();
                } catch (error) {
                    Haptics.error();
                }

                this.indicator.classList.remove('refreshing');
            }

            // Animation de retour fluide
            this.indicator.style.transition = 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1), padding 0.3s ease';
            this.indicator.style.height = '0';
            this.indicator.style.padding = '0';
            this.indicator.classList.remove('visible');

            setTimeout(() => {
                this.indicator.style.transition = '';
                this.indicator.querySelector('.pull-refresh-text').textContent = 'Tirer pour actualiser';
                this.indicator.querySelector('.pull-refresh-spinner').style.transform = '';
                this.refreshing = false;
                this.currentPull = 0;
            }, 300);
        }
    }

    // ==================== SWIPE TO DISMISS MODAL ====================
    class SwipeToDismiss {
        constructor(modalOverlay, options = {}) {
            this.modalOverlay = modalOverlay;
            this.modal = modalOverlay.querySelector('.modal, .recipe-modal, .meal-history-modal, .barcode-scanner-modal');
            this.threshold = options.threshold || 100;
            this.onDismiss = options.onDismiss || (() => {});

            this.startY = 0;
            this.currentY = 0;
            this.isDragging = false;
            this.dragStarted = false;
            this.hasVibrated = false;

            if (this.isTouchDevice() && window.innerWidth <= 768 && this.modal) {
                this.init();
            }
        }

        isTouchDevice() {
            return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        }

        init() {
            // Only allow swipe on the header area (top 100px of modal)
            const header = this.modal.querySelector('.modal-header');
            const dragTarget = header || this.modal;

            // Make header indicate it's draggable
            dragTarget.style.touchAction = 'pan-x';
            dragTarget.style.cursor = 'grab';

            dragTarget.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
            this.modal.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
            this.modal.addEventListener('touchend', this.handleTouchEnd.bind(this));
            this.modal.addEventListener('touchcancel', this.handleTouchEnd.bind(this));
        }

        handleTouchStart(e) {
            // Only start on header area
            this.startY = e.touches[0].clientY;
            this.isDragging = true;
            this.dragStarted = false;
            this.modal.style.transition = 'none';
            this.modalOverlay.style.transition = 'none';
        }

        handleTouchMove(e) {
            if (!this.isDragging) return;

            this.currentY = e.touches[0].clientY;
            const diffY = this.currentY - this.startY;

            // Only allow downward swipe (positive diffY)
            if (diffY > 10) {
                e.preventDefault();
                this.dragStarted = true;

                // Add resistance as user drags further
                const resistance = 0.6;
                const translateY = Math.min(diffY * resistance, 350);

                this.modal.style.transform = `translateY(${translateY}px)`;
                this.modal.classList.add('dragging');

                // Fade overlay proportionally
                const progress = Math.min(translateY / this.threshold, 1);
                const opacity = 0.6 * (1 - progress * 0.5);
                this.modalOverlay.style.backgroundColor = `rgba(0, 0, 0, ${opacity})`;

                // Haptic feedback at threshold
                if (translateY >= this.threshold && !this.hasVibrated) {
                    Haptics.medium();
                    this.hasVibrated = true;
                } else if (translateY < this.threshold) {
                    this.hasVibrated = false;
                }
            }
        }

        handleTouchEnd() {
            if (!this.isDragging) return;
            this.isDragging = false;

            const diffY = this.currentY - this.startY;
            const resistance = 0.6;
            const translateY = diffY * resistance;

            // Restore transitions
            this.modal.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)';
            this.modalOverlay.style.transition = 'background-color 0.3s ease';

            if (this.dragStarted && translateY > this.threshold) {
                // Dismiss the modal
                this.dismiss();
            } else {
                // Snap back
                this.modal.style.transform = 'translateY(0)';
                this.modalOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
                this.modal.classList.remove('dragging');
            }

            this.hasVibrated = false;
        }

        dismiss() {
            Haptics.success();

            this.modal.classList.add('closing');
            this.modal.style.transform = 'translateY(100%)';
            this.modalOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0)';

            setTimeout(() => {
                this.onDismiss();
                // Reset styles
                this.modal.classList.remove('closing', 'dragging');
                this.modal.style.transform = '';
                this.modal.style.transition = '';
                this.modalOverlay.style.transition = '';
                this.modalOverlay.style.backgroundColor = '';
            }, 300);
        }
    }

    // ==================== SWIPE TO DISMISS INITIALIZATION ====================
    function initSwipeToDismissModals() {
        // Get all modal overlays
        const modals = document.querySelectorAll('.modal-overlay');

        modals.forEach(modalOverlay => {
            // Skip if already initialized
            if (modalOverlay.dataset.swipeInitialized) return;
            modalOverlay.dataset.swipeInitialized = 'true';

            new SwipeToDismiss(modalOverlay, {
                threshold: 100,
                onDismiss: () => {
                    // Close modal using existing closeModal function
                    const modalId = modalOverlay.id;
                    if (modalId && typeof closeModal === 'function') {
                        closeModal(modalId);
                    } else {
                        // Fallback
                        modalOverlay.style.display = 'none';
                        modalOverlay.classList.remove('active');
                    }
                }
            });
        });

        // Observer for dynamically added/shown modals
        const modalObserver = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                // Check for new modals
                mutation.addedNodes.forEach(node => {
                    if (node.classList?.contains('modal-overlay')) {
                        if (!node.dataset.swipeInitialized) {
                            node.dataset.swipeInitialized = 'true';
                            new SwipeToDismiss(node, {
                                threshold: 100,
                                onDismiss: () => {
                                    const modalId = node.id;
                                    if (modalId && typeof closeModal === 'function') {
                                        closeModal(modalId);
                                    }
                                }
                            });
                        }
                    }
                });

                // Check for modals becoming visible
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    const target = mutation.target;
                    if (target.classList?.contains('modal-overlay') && !target.dataset.swipeInitialized) {
                        target.dataset.swipeInitialized = 'true';
                        new SwipeToDismiss(target, {
                            threshold: 100,
                            onDismiss: () => {
                                const modalId = target.id;
                                if (modalId && typeof closeModal === 'function') {
                                    closeModal(modalId);
                                }
                            }
                        });
                    }
                }
            });
        });

        modalObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class']
        });

        console.log('📱 Swipe-to-dismiss initialized for modals');
    }

    // ==================== INITIALISATION ====================
    function initMobileGestures() {
        // Ne s'exécute que sur mobile
        if (window.innerWidth > 768) return;
        
        // Initialiser le feedback tactile
        initTapFeedback();
        
        // Observer les nouveaux éléments du journal pour le swipe to delete
        const journalObserver = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.classList?.contains('journal-entry')) {
                        new SwipeToDelete(node, {
                            onDelete: (element) => {
                                // Le gestionnaire de suppression sera appelé par app.js
                                const deleteBtn = element.querySelector('.journal-entry-delete');
                                if (deleteBtn) {
                                    deleteBtn.click();
                                }
                            }
                        });
                    }
                });
            });
        });
        
        const journalEntries = document.getElementById('journal-entries');
        if (journalEntries) {
            journalObserver.observe(journalEntries, { childList: true });
            
            // Initialiser les entrées existantes
            journalEntries.querySelectorAll('.journal-entry').forEach(entry => {
                new SwipeToDelete(entry, {
                    onDelete: (element) => {
                        const deleteBtn = element.querySelector('.journal-entry-delete');
                        if (deleteBtn) {
                            deleteBtn.click();
                        }
                    }
                });
            });
        }
        
        // Initialiser Pull-to-Refresh sur les sections principales
        initPullToRefresh();

        // Initialiser Swipe-to-Dismiss pour les modales
        initSwipeToDismissModals();

        console.log('📱 Mobile gestures initialized');
    }

    // ==================== PULL TO REFRESH INITIALIZATION ====================
    function initPullToRefresh() {
        // Dashboard - refresh sync data
        const dashboard = document.getElementById('dashboard');
        if (dashboard) {
            new PullToRefresh(dashboard, async () => {
                console.log('🔄 Pull-to-refresh: Dashboard');

                // Sync données si connecté
                if (window.supabaseClient && window.currentUser) {
                    try {
                        await loadTrainingSettingsFromSupabase();
                        showToast('✅ Données synchronisées', 'success', 2000);
                    } catch (err) {
                        console.error('Refresh error:', err);
                        showToast('Erreur de synchronisation', 'error');
                    }
                }

                // Re-render widgets
                if (window.SmartTraining?.renderMuscleRecoveryWidget) {
                    window.SmartTraining.renderMuscleRecoveryWidget();
                }
                if (window.Hydration?.renderHydrationWidget) {
                    window.Hydration.renderHydrationWidget();
                }
                if (typeof renderDailyMacros === 'function') {
                    renderDailyMacros();
                }
                if (typeof renderTodaySession === 'function') {
                    renderTodaySession();
                }
            });
        }

        // Nutrition - refresh journal
        const nutrition = document.getElementById('nutrition');
        if (nutrition) {
            new PullToRefresh(nutrition, async () => {
                console.log('🔄 Pull-to-refresh: Nutrition');

                // Sync si connecté
                if (window.supabaseClient && window.currentUser) {
                    try {
                        await loadNutritionFromSupabase();
                        showToast('✅ Journal synchronisé', 'success', 2000);
                    } catch (err) {
                        console.error('Refresh error:', err);
                    }
                }

                // Re-render
                if (typeof renderFoodJournal === 'function') {
                    renderFoodJournal();
                }
            });
        }

        // Progress - refresh history
        const progress = document.getElementById('progress');
        if (progress) {
            new PullToRefresh(progress, async () => {
                console.log('🔄 Pull-to-refresh: Progress');

                if (window.supabaseClient && window.currentUser) {
                    try {
                        await loadTrainingSettingsFromSupabase();
                        showToast('✅ Historique synchronisé', 'success', 2000);
                    } catch (err) {
                        console.error('Refresh error:', err);
                    }
                }

                // Re-render progress tab
                if (typeof renderProgressTab === 'function') {
                    renderProgressTab();
                }
            });
        }
    }

    // ==================== STYLES DYNAMIQUES ====================
    function injectStyles() {
        const styles = document.createElement('style');
        styles.textContent = `
            /* Swipe to Delete */
            .swipe-content {
                display: flex;
                width: 100%;
                padding: 10px;
                position: relative;
                z-index: 1;
                background: var(--bg-card);
                transition: transform 0.2s ease;
            }
            
            .swipe-delete-bg {
                position: absolute;
                right: 0;
                top: 0;
                bottom: 0;
                width: 100px;
                background: var(--danger);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 4px;
                color: white;
                font-weight: 600;
                font-size: 0.75rem;
                opacity: 0;
                transition: opacity 0.1s ease;
                z-index: 0;
            }
            
            .swipe-delete-bg.ready {
                background: #dc2626;
            }
            
            .swipe-delete-icon {
                font-size: 1.2rem;
            }
            
            /* Pull to Refresh - Push content design */
            .pull-refresh-indicator {
                width: 100%;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 8px;
                height: 0;
                overflow: hidden;
                transition: height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                background: linear-gradient(180deg, var(--bg-tertiary) 0%, var(--bg-primary) 100%);
            }

            .pull-refresh-indicator.visible {
                height: 70px;
                padding: 12px 0;
            }

            .pull-refresh-indicator.refreshing {
                height: 60px;
                padding: 10px 0;
            }

            .pull-refresh-spinner {
                width: 28px;
                height: 28px;
                color: var(--accent-primary);
                transition: transform 0.1s ease;
            }

            .pull-refresh-spinner svg {
                width: 100%;
                height: 100%;
            }

            .pull-refresh-indicator.refreshing .pull-refresh-spinner svg {
                animation: spin 1s linear infinite;
            }

            .pull-refresh-text {
                font-size: 0.8rem;
                font-weight: 500;
                color: var(--text-secondary);
                text-align: center;
            }

            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(styles);
    }

    // ==================== EXPORT ====================
    window.MobileGestures = {
        SwipeToDelete,
        SwipeToDismiss,
        PullToRefresh,
        Haptics,
        init: initMobileGestures,
        initSwipeToDismissModals
    };

    // Auto-init au chargement
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            injectStyles();
            initMobileGestures();
        });
    } else {
        injectStyles();
        initMobileGestures();
    }

})();
