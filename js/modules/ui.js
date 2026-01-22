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

function setupNavigation() {
    // Navigation desktop et mobile
    document.querySelectorAll('.nav-tab, .mobile-nav-item').forEach(tab => {
        tab.addEventListener('click', () => {
            const section = tab.dataset.section;
            navigateToSection(section);
        });
    });
}

function navigateToSection(sectionId) {
    // Mettre à jour les onglets
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.mobile-nav-item').forEach(t => t.classList.remove('active'));
    document.querySelectorAll(`[data-section="${sectionId}"]`).forEach(t => t.classList.add('active'));
    
    // Afficher la section
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
    
    // Scroll en haut
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    const modal = overlay.querySelector('.modal');
    if (!modal) return;
    
    let startY = 0;
    let currentY = 0;
    let isDragging = false;
    
    const header = modal.querySelector('.modal-header');
    if (!header) return;
    
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
}

// Toast notifications
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
    
    toast.innerHTML = `
        <span style="font-size: 1.2rem;">${icon}</span>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);

    // Animation de sortie
    setTimeout(() => {
        toast.style.animation = 'toastIn 0.3s ease reverse forwards';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 300);
    }, 3000);
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
    
    // Mettre à jour le sélecteur de jours
    if (state.trainingDays) {
        document.getElementById('training-days').value = state.trainingDays;
    }
}
