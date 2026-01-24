// ==================== FITTRACK PRO - MOBILE GESTURES MODULE ====================
// Swipe to delete, haptic feedback, pull to refresh

(function() {
    'use strict';

    // ==================== HAPTIC FEEDBACK ====================
    const Haptics = {
        light: () => navigator.vibrate?.(10),
        medium: () => navigator.vibrate?.(20),
        heavy: () => navigator.vibrate?.(30),
        success: () => navigator.vibrate?.([10, 50, 20]),
        warning: () => navigator.vibrate?.([30, 50, 30]),
        error: () => navigator.vibrate?.([50, 100, 50])
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
            
            // Si scroll vertical, annuler le swipe
            if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffX) < 10) {
                return;
            }
            
            // Seulement swipe vers la gauche
            if (diffX < 0) {
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
            this.container.style.position = 'relative';
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
                
                const resistance = 0.4;
                const actualPull = pull * resistance;
                const progress = Math.min(actualPull / this.pullThreshold, 1);
                
                this.indicator.style.transform = `translateY(${actualPull}px)`;
                this.indicator.style.opacity = progress;
                
                // Rotation du spinner
                const rotation = pull * 2;
                this.indicator.querySelector('.pull-refresh-spinner').style.transform = `rotate(${rotation}deg)`;
                
                if (progress >= 1) {
                    this.indicator.querySelector('.pull-refresh-text').textContent = 'Relâcher pour actualiser';
                    if (!this.hasVibrated) {
                        Haptics.light();
                        this.hasVibrated = true;
                    }
                } else {
                    this.indicator.querySelector('.pull-refresh-text').textContent = 'Tirer pour actualiser';
                    this.hasVibrated = false;
                }
            }
        }
        
        async onTouchEnd() {
            if (!this.pulling || this.refreshing) return;
            this.pulling = false;
            this.hasVibrated = false;
            
            const transform = this.indicator.style.transform;
            const pull = parseFloat(transform.match(/translateY\(([^)]+)px\)/)?.[1] || 0);
            
            if (pull >= this.pullThreshold) {
                // Déclencher refresh
                this.refreshing = true;
                Haptics.medium();
                
                this.indicator.classList.add('refreshing');
                this.indicator.style.transform = 'translateY(60px)';
                this.indicator.querySelector('.pull-refresh-text').textContent = 'Actualisation...';
                
                try {
                    await this.onRefresh();
                    Haptics.success();
                } catch (error) {
                    Haptics.error();
                }
                
                this.indicator.classList.remove('refreshing');
            }
            
            this.indicator.style.transition = 'all 0.3s ease';
            this.indicator.style.transform = 'translateY(0)';
            this.indicator.style.opacity = '0';
            
            setTimeout(() => {
                this.indicator.style.transition = '';
                this.indicator.querySelector('.pull-refresh-text').textContent = 'Tirer pour actualiser';
                this.refreshing = false;
            }, 300);
        }
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
        
        console.log('📱 Mobile gestures initialized');
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
            
            /* Pull to Refresh */
            .pull-refresh-indicator {
                position: absolute;
                top: -60px;
                left: 50%;
                transform: translateX(-50%) translateY(0);
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
                opacity: 0;
                transition: opacity 0.1s ease;
                z-index: 10;
            }
            
            .pull-refresh-spinner {
                width: 32px;
                height: 32px;
                color: var(--accent-brand);
            }
            
            .pull-refresh-spinner svg {
                width: 100%;
                height: 100%;
            }
            
            .pull-refresh-indicator.refreshing .pull-refresh-spinner svg {
                animation: spin 1s linear infinite;
            }
            
            .pull-refresh-text {
                font-size: 0.75rem;
                color: var(--text-secondary);
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
        PullToRefresh,
        Haptics,
        init: initMobileGestures
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
