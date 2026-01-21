// ==================== UI MODULE ====================

// Navigation
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
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
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
