// ==================== UI MODULE ====================

// ==================== SKELETON LOADERS ====================

function showSkeleton(containerId, type = 'card') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const skeletons = {
        card: `
            <div class="skeleton-card">
                <div class="skeleton skeleton-title"></div>
                <div class="skeleton skeleton-text lg"></div>
                <div class="skeleton skeleton-text md"></div>
                <div class="skeleton skeleton-text sm"></div>
            </div>
        `,
        stats: `
            <div class="skeleton skeleton-stat"></div>
        `,
        list: `
            <div style="display: flex; flex-direction: column; gap: 10px;">
                ${Array(4).fill('<div class="skeleton skeleton-text full" style="height: 50px;"></div>').join('')}
            </div>
        `,
        chart: `
            <div class="skeleton skeleton-chart"></div>
        `
    };

    container.innerHTML = skeletons[type] || skeletons.card;
}

function hideSkeleton(containerId) {
    // La fonction de rendu remplacera naturellement le skeleton
}

// ==================== ANIMATED COUNTERS ====================

function animateValue(element, start, end, duration = 500) {
    if (!element) return;

    const startTime = performance.now();
    const difference = end - start;

    function updateValue(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function (ease-out)
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentValue = Math.round(start + (difference * easeOut));

        element.textContent = currentValue;

        if (progress < 1) {
            requestAnimationFrame(updateValue);
        } else {
            // Pulse animation when done
            element.closest('.stat-card')?.classList.add('updating');
            setTimeout(() => {
                element.closest('.stat-card')?.classList.remove('updating');
            }, 300);
        }
    }

    requestAnimationFrame(updateValue);
}

function updateStatWithAnimation(elementId, newValue) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const currentValue = parseInt(element.textContent) || 0;
    const targetValue = parseInt(newValue) || 0;

    if (currentValue !== targetValue) {
        animateValue(element, currentValue, targetValue);
    }
}

// ==================== NAVIGATION ====================

let currentSection = 'dashboard';

function setupNavigation() {
    // Navigation desktop et mobile
    document.querySelectorAll('.nav-tab, .mobile-nav-item').forEach(tab => {
        tab.addEventListener('click', () => {
            const section = tab.dataset.section;
            navigateToSection(section);
        });
    });
    
    // Initialize current section
    const activeSection = document.querySelector('.section.active');
    if (activeSection) {
        currentSection = activeSection.id;
    }
}

function navigateToSection(sectionId) {
    // 1. RESET scroll AVANT animation (instant pour éviter conflit visuel)
    window.scrollTo({ top: 0, behavior: 'instant' });
    
    // Ordre des sections pour les animations directionnelles
    const sectionOrder = ['progression', 'dashboard', 'training', 'nutrition'];
    
    // Déterminer la direction de l'animation
    const currentIndex = sectionOrder.indexOf(currentSection);
    const targetIndex = sectionOrder.indexOf(sectionId);
    const direction = targetIndex > currentIndex ? 'right' : 'left';
    
    // Mettre à jour les onglets
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.mobile-nav-item').forEach(t => t.classList.remove('active'));
    document.querySelectorAll(`[data-section="${sectionId}"]`).forEach(t => t.classList.add('active'));
    
    // Déplacer l'indicateur du menu mobile
    updateMobileNavIndicator(sectionId);
    
    // Afficher la section avec animation directionnelle
    document.querySelectorAll('.section').forEach(s => {
        s.classList.remove('active', 'slide-left', 'slide-right');
    });
    
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        // Appliquer l'animation uniquement si on change de section
        if (currentSection && currentSection !== sectionId) {
            targetSection.classList.add(`slide-${direction}`);
        }
    }
    
    // Mettre à jour la section actuelle
    currentSection = sectionId;
}

/**
 * Déplace l'indicateur du menu mobile vers l'onglet actif
 */
function updateMobileNavIndicator(sectionId) {
    const indicator = document.querySelector('.mobile-nav-indicator');
    if (!indicator) return;
    
    // Mapping des sections vers leur index dans le menu mobile
    // Ordre dans le HTML: dashboard, nutrition, training, progress
    const navOrder = {
        'dashboard': 0,
        'nutrition': 1,
        'training': 2,
        'progress': 3,
        'progression': 3 // Alias pour progress
    };
    
    const index = navOrder[sectionId];
    if (index !== undefined) {
        // Chaque onglet fait 25% de la largeur (4 onglets)
        const translateX = index * 100;
        indicator.style.transform = `translateX(${translateX}%)`;
    }
}

/**
 * Initialiser la position de l'indicateur au chargement
 */
function initMobileNavIndicator() {
    const activeItem = document.querySelector('.mobile-nav-item.active');
    if (activeItem) {
        const sectionId = activeItem.dataset.section;
        updateMobileNavIndicator(sectionId);
    }
}

// Tabs internes
function setupTabs() {
    document.querySelectorAll('.tabs').forEach(tabGroup => {
        tabGroup.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                
                // Mettre à jour les boutons
                tabGroup.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Afficher le contenu
                const parent = tabGroup.closest('.section') || tabGroup.parentElement;
                parent.querySelectorAll('.tab-content').forEach(content => {
                    content.style.display = 'none';
                });
                const targetContent = document.getElementById(`tab-${tabName}`);
                if (targetContent) {
                    targetContent.style.display = 'block';
                }
            });
        });
    });
}

// Modals
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Setup swipe to close on mobile
        if (window.innerWidth <= 768) {
            setupModalSwipe(modal);
        }
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        // Animate out on mobile
        if (window.innerWidth <= 768) {
            const modalContent = modal.querySelector('.modal');
            if (modalContent) {
                modalContent.style.transform = 'translateY(100%)';
                setTimeout(() => {
                    modal.classList.remove('active');
                    modalContent.style.transform = '';
                    document.body.style.overflow = '';
                }, 300);
                return;
            }
        }
        
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Swipe to close for mobile drawers
function setupModalSwipe(overlay) {
    const modal = overlay.querySelector('.modal') || overlay.querySelector('.modal-content') || overlay.querySelector('.bottom-sheet') || overlay;
    if (!modal) return;
    
    let startY = 0;
    let currentY = 0;
    let isDragging = false;
    
    // Chercher un header ou utiliser le modal lui-même
    const header = modal.querySelector('.modal-header') || modal.querySelector('.bottom-sheet-header') || modal;
    
    header.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
        isDragging = true;
        modal.style.transition = 'none';
    }, { passive: true });
    
    header.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        
        currentY = e.touches[0].clientY;
        const deltaY = currentY - startY;
        
        // Only allow dragging down
        if (deltaY > 0) {
            modal.style.transform = `translateY(${deltaY}px)`;
            
            // Dim overlay based on drag distance
            const progress = Math.min(deltaY / 300, 1);
            overlay.style.background = `rgba(0, 0, 0, ${0.8 * (1 - progress * 0.5)})`;
        }
    }, { passive: true });
    
    header.addEventListener('touchend', () => {
        if (!isDragging) return;
        isDragging = false;
        
        modal.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)';
        overlay.style.transition = 'background 0.3s ease';
        
        const deltaY = currentY - startY;
        
        // Close if dragged more than 100px
        if (deltaY > 100) {
            closeModal(overlay.id);
        } else {
            modal.style.transform = 'translateY(0)';
            overlay.style.background = '';
        }
        
        startY = 0;
        currentY = 0;
    });
}

// Fermer les modales en cliquant sur l'overlay
function setupModals() {
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    });
    
    // Fermer avec Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay.active').forEach(modal => {
                modal.classList.remove('active');
            });
            document.body.style.overflow = '';
        }
    });
    
    // Initialiser swipe-to-close sur toutes les modals (mobile uniquement)
    initUniversalSwipeToClose();
}

// Initialiser swipe-to-close sur TOUTES les modals au chargement
function initUniversalSwipeToClose() {
    // Ne faire que sur mobile
    if (window.innerWidth > 768) return;
    
    // Sélectionner toutes les modals
    const allModals = document.querySelectorAll('.modal-overlay, [id$="-modal"], [id$="-sheet"], [id*="modal"], [id*="sheet"]');
    
    let count = 0;
    allModals.forEach(overlay => {
        // Éviter de ré-initialiser
        if (overlay.dataset.swipeInit === 'true') return;
        overlay.dataset.swipeInit = 'true';
        
        setupModalSwipe(overlay);
        count++;
    });
    
    if (count > 0) {
        console.log(`✅ Swipe-to-close activé sur ${count} modals`);
    }
}

// Toast notifications - Premium redesign
const MAX_TOASTS = 3;

function showToast(message, type = 'success', duration = 2500) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    // Limiter le nombre de toasts affichés
    const existingToasts = container.querySelectorAll('.toast:not(.hiding)');
    if (existingToasts.length >= MAX_TOASTS) {
        // Retirer le plus ancien
        const oldest = existingToasts[0];
        removeToast(oldest);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Icônes premium
    const icons = {
        success: '✓',
        error: '✕',
        info: 'ℹ'
    };
    const icon = icons[type] || icons.info;
    
    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${message}</span>
    `;
    
    container.appendChild(toast);

    // Animation de sortie après la durée
    setTimeout(() => {
        removeToast(toast);
    }, duration);
}

function removeToast(toast) {
    if (!toast || toast.classList.contains('hiding')) return;
    
    toast.classList.add('hiding');
    
    // Retirer après l'animation
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 250);
}

// Formattage des nombres
function formatNumber(num) {
    return new Intl.NumberFormat('fr-FR').format(num);
}

// Date relative
function getRelativeDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Aujourd\'hui';
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaines`;
    return date.toLocaleDateString('fr-FR');
}

// Initialisation de l'interface
function initUI() {
    setupNavigation();
    setupTabs();
    setupModals();
    
    // Initialiser la position de l'indicateur du menu mobile
    initMobileNavIndicator();
    
    // Mettre à jour le sélecteur de jours (legacy - peut ne plus exister)
    const trainingDaysSelect = document.getElementById('training-days');
    if (trainingDaysSelect && state.trainingDays) {
        trainingDaysSelect.value = state.trainingDays;
    }
}

// ==================== EXPORTS GLOBAUX ====================
window.openModal = openModal;
window.closeModal = closeModal;
window.showToast = showToast;
window.initUI = initUI;
window.switchTab = switchTab;
window.formatNumber = formatNumber;
window.getRelativeDate = getRelativeDate;
window.initUniversalSwipeToClose = initUniversalSwipeToClose;

console.log('✅ ui.js: Fonctions exportées au scope global');
