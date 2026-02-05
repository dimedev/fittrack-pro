// ==================== MAIN APP ====================
// Version MVP - Simplifié

// ==================== GESTION D'ERREURS GLOBALE ====================

// Gestionnaire d'erreurs JavaScript globales
window.addEventListener('error', (e) => {
    console.error('❌ Erreur globale:', {
        message: e.message,
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
        error: e.error
    });
    
    // Afficher un toast pour informer l'utilisateur des erreurs critiques
    if (typeof showToast === 'function') {
        showToast('Une erreur est survenue', 'error');
    }
});

// Gestionnaire des promesses rejetées non capturées
window.addEventListener('unhandledrejection', (e) => {
    console.error('❌ Promise rejetée:', {
        reason: e.reason,
        promise: e.promise
    });
    
    // Afficher un toast pour les erreurs de synchronisation
    if (typeof showToast === 'function' && e.reason?.message?.includes('sync')) {
        showToast('Erreur de synchronisation', 'warning');
    }
});

// Mode hors-ligne (sans compte)
let offlineMode = false;

// Afficher les skeletons pendant le chargement
function showInitialSkeletons() {
    if (!window.PremiumUI) return;
    
    // Dashboard: Stats grid skeleton
    const statsGrid = document.querySelector('#dashboard .grid.grid-4');
    if (statsGrid) {
        statsGrid.innerHTML = window.PremiumUI.SkeletonTemplates.statGrid(4);
        statsGrid.dataset.skeleton = 'true';
    }
    
    // Dashboard: Macros rings skeleton
    const macrosContainer = document.getElementById('daily-macros');
    if (macrosContainer) {
        macrosContainer.innerHTML = `
            <div class="macros-rings-grid">
                ${Array(4).fill('').map(() => `
                    <div class="macro-ring-item">
                        <div class="skeleton skeleton-ring" style="width: 90px; height: 90px;"></div>
                        <div class="skeleton" style="width: 60px; height: 12px; margin-top: 8px;"></div>
                    </div>
                `).join('')}
            </div>
        `;
        macrosContainer.dataset.skeleton = 'true';
    }
    
    // Dashboard: Profile summary skeleton
    const profileSummary = document.getElementById('profile-summary');
    if (profileSummary) {
        profileSummary.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                ${Array(6).fill('').map(() => `
                    <div class="skeleton" style="height: 20px; border-radius: 4px;"></div>
                `).join('')}
            </div>
        `;
        profileSummary.dataset.skeleton = 'true';
    }
    
    // Dashboard: Weight chart skeleton
    const chartContainer = document.querySelector('#bodyweight-chart')?.parentElement;
    if (chartContainer) {
        const canvas = document.getElementById('bodyweight-chart');
        if (canvas) canvas.style.display = 'none';
        const skeletonChart = document.createElement('div');
        skeletonChart.className = 'skeleton';
        skeletonChart.id = 'chart-skeleton';
        skeletonChart.style.cssText = 'width: 100%; height: 250px; border-radius: var(--radius-lg);';
        chartContainer.appendChild(skeletonChart);
    }
    
    // Dashboard goal cards supprimés (maintenant dans Mon Profil)
    
    // Training: Session exercises skeleton
    const sessionExercises = document.getElementById('session-exercises');
    if (sessionExercises && !sessionExercises.querySelector('.empty-state')) {
        sessionExercises.innerHTML = window.PremiumUI.SkeletonTemplates.exerciseList(3);
        sessionExercises.dataset.skeleton = 'true';
    }
    
    console.log('💀 Skeletons affichés');
}

// Retirer les skeletons quand le contenu est chargé
function removeSkeletons() {
    // Stats grid: restaurer la structure originale
    const statsGrid = document.querySelector('#dashboard .grid.grid-4');
    if (statsGrid && statsGrid.dataset.skeleton) {
        statsGrid.innerHTML = `
            <div class="stat-card">
                <div class="stat-label">Calories Objectif</div>
                <div class="stat-value" id="stat-calories">--</div>
                <div class="stat-unit">kcal/jour</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Protéines</div>
                <div class="stat-value" id="stat-protein">--</div>
                <div class="stat-unit">g/jour</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Programme</div>
                <div class="stat-value" id="stat-program" style="font-size: 1.3rem;">--</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Séances/semaine</div>
                <div class="stat-value" id="stat-days">--</div>
            </div>
        `;
        delete statsGrid.dataset.skeleton;
    }
    
    // Macros container: restaurer la structure
    const macrosContainer = document.getElementById('daily-macros');
    if (macrosContainer && macrosContainer.dataset.skeleton) {
        macrosContainer.innerHTML = `
            <div class="macros-rings-grid">
                <div class="macro-ring-item">
                    <div id="ring-calories" class="ring-container"></div>
                    <span class="ring-subtitle" id="ring-calories-detail">-- / -- kcal</span>
                </div>
                <div class="macro-ring-item">
                    <div id="ring-protein" class="ring-container"></div>
                    <span class="ring-subtitle" id="ring-protein-detail">-- / --g</span>
                </div>
                <div class="macro-ring-item">
                    <div id="ring-carbs" class="ring-container"></div>
                    <span class="ring-subtitle" id="ring-carbs-detail">-- / --g</span>
                </div>
                <div class="macro-ring-item">
                    <div id="ring-fat" class="ring-container"></div>
                    <span class="ring-subtitle" id="ring-fat-detail">-- / --g</span>
                </div>
            </div>
        `;
        delete macrosContainer.dataset.skeleton;
    }
    
    // Chart skeleton
    const chartSkeleton = document.getElementById('chart-skeleton');
    const canvas = document.getElementById('bodyweight-chart');
    if (chartSkeleton) {
        chartSkeleton.remove();
        if (canvas) canvas.style.display = 'block';
    }
    
    // Autres containers: juste supprimer le flag
    ['profile-summary', 'session-exercises'].forEach(id => {
        const el = document.getElementById(id);
        if (el) delete el.dataset.skeleton;
    });
    
    console.log('✨ Skeletons retirés');
}

// Initialisation de l'application
function init() {
    console.log('🏋️ Repzy - Initialisation...');
    
    // Afficher les skeletons immédiatement
    showInitialSkeletons();
    
    // Charger l'état local d'abord
    loadState();
    
    // Initialiser le système d'objectifs
    if (typeof initGoalsTracking === 'function') {
        initGoalsTracking();
    }
    
    // Initialiser l'interface
    initUI();
    
    // Initialiser le sticky header nutrition
    if (typeof initNutritionStickyScroll === 'function') {
        initNutritionStickyScroll();
    }
    
    // Initialiser le timer
    if (typeof initTimer === 'function') {
        initTimer();
    }

    // Initialiser Supabase
    if (typeof initSupabase === 'function') {
        initSupabase();
    }
    
    // Vérifier s'il y a une séance en attente de restauration
    setTimeout(() => {
        if (typeof tryRestorePendingSession === 'function') {
            tryRestorePendingSession();
        }
    }, 500);
    
    // Lancer la déduplication automatique (périodique)
    setTimeout(() => {
        if (typeof autoDeduplicatePeriodic === 'function') {
            autoDeduplicatePeriodic();
        }
    }, 3000);
    
    // Petit délai pour que les skeletons soient visibles
    setTimeout(() => {
        // Retirer les skeletons et restaurer la structure
        removeSkeletons();
        
        // Rendre les composants
        if (typeof renderProgramTypes === 'function') renderProgramTypes();
        if (typeof renderFoodsList === 'function') renderFoodsList();
        if (typeof updateDashboard === 'function') updateDashboard();
        if (typeof updateWeeklySchedule === 'function') updateWeeklySchedule();
        if (typeof populateSessionDaySelect === 'function') populateSessionDaySelect();
        if (typeof updateSessionHistory === 'function') updateSessionHistory();
        
        // Initialiser la section Progression
        if (typeof initProgressSection === 'function') {
            initProgressSection();
        }
        
        // Initialiser Smart Training (Recovery Widget)
        if (typeof SmartTraining !== 'undefined') {
            const recoveryContainer = document.getElementById('muscle-recovery-container');
            if (recoveryContainer) {
                recoveryContainer.innerHTML = SmartTraining.renderMuscleRecoveryWidget();
            }
        }
        
        // Initialiser les photos de progression
        if (typeof renderPhotosGallery === 'function') {
            renderPhotosGallery();
        }

        // Initialiser le journal alimentaire
        if (typeof initJournal === 'function') {
            initJournal();
        }
        
        // Mettre à jour les anneaux de macros depuis le journal
        if (typeof updateMacroRings === 'function') {
            updateMacroRings();
        }

        // Initialiser le sélecteur de thème
        if (typeof ThemeManager !== 'undefined') {
            const themeContainer = document.getElementById('theme-selector-container');
            if (themeContainer) {
                themeContainer.innerHTML = ThemeManager.renderThemeSelector();
            }
        }

        console.log('✅ Repzy - Prêt !');
    }, 400);
}

// ==================== AUTH HANDLERS ====================

function switchAuthTab(tab) {
    const loginTab = document.getElementById('auth-tab-login');
    const signupTab = document.getElementById('auth-tab-signup');
    const loginForm = document.getElementById('auth-form-login');
    const signupForm = document.getElementById('auth-form-signup');
    
    if (!loginTab || !signupTab) return;
    
    if (tab === 'login') {
        loginTab.classList.add('active');
        signupTab.classList.remove('active');
        if (loginForm) loginForm.style.display = 'block';
        if (signupForm) signupForm.style.display = 'none';
    } else {
        signupTab.classList.add('active');
        loginTab.classList.remove('active');
        if (signupForm) signupForm.style.display = 'block';
        if (loginForm) loginForm.style.display = 'none';
    }
}

async function handleLogin() {
    const email = document.getElementById('login-email')?.value.trim();
    const password = document.getElementById('login-password')?.value;
    
    if (!email || !password) {
        showToast('Remplissez tous les champs', 'error');
        return;
    }
    
    try {
        await signIn(email, password);
    } catch (error) {
        console.error('Login error:', error);
    }
}

async function handleSignup() {
    const email = document.getElementById('signup-email')?.value.trim();
    const password = document.getElementById('signup-password')?.value;
    const passwordConfirm = document.getElementById('signup-password-confirm')?.value;
    
    if (!email || !password || !passwordConfirm) {
        showToast('Remplissez tous les champs', 'error');
        return;
    }
    
    if (password.length < 6) {
        showToast('Le mot de passe doit contenir au moins 6 caractères', 'error');
        return;
    }
    
    if (password !== passwordConfirm) {
        showToast('Les mots de passe ne correspondent pas', 'error');
        return;
    }
    
    try {
        await signUp(email, password);
        switchAuthTab('login');
    } catch (error) {
        console.error('Signup error:', error);
    }
}

function continueOffline() {
    offlineMode = true;
    closeModal('auth-modal');
    showToast('Mode hors-ligne activé. Vos données sont stockées localement.', 'success');
}

// ==================== EXPORTS GLOBAUX ====================
window.switchAuthTab = switchAuthTab;
window.handleLogin = handleLogin;
window.handleSignup = handleSignup;
window.continueOffline = continueOffline;

// ==================== LIFECYCLE ====================

// Démarrer l'application quand le DOM est chargé
document.addEventListener('DOMContentLoaded', init);

// Sauvegarder avant de quitter la page
window.addEventListener('beforeunload', () => {
    saveState();
});

// ==================== SERVICE WORKER ====================

/**
 * Enregistrement et gestion du Service Worker pour PWA offline-first
 */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            // Déterminer le chemin de base pour GitHub Pages ou localhost
            const basePath = window.location.pathname.includes('/fittrack-pro')
                ? '/fittrack-pro/'
                : '/';

            const registration = await navigator.serviceWorker.register(`${basePath}sw.js`, {
                scope: basePath
            });

            console.log('✅ Service Worker enregistré:', registration.scope);

            // Gérer les mises à jour du SW
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                console.log('🔄 Nouveau Service Worker en installation...');

                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // Nouveau SW prêt, proposer la mise à jour
                        showUpdateAvailable(registration);
                    }
                });
            });

            // Écouter les messages du SW
            navigator.serviceWorker.addEventListener('message', handleSWMessage);

            // Vérifier les mises à jour périodiquement (toutes les heures)
            setInterval(() => {
                registration.update();
            }, 60 * 60 * 1000);

        } catch (error) {
            console.error('❌ Erreur enregistrement Service Worker:', error);
        }
    });
}

/**
 * Gère les messages reçus du Service Worker
 */
function handleSWMessage(event) {
    const { type, payload } = event.data || {};

    switch (type) {
        case 'SYNC_PENDING_DATA':
            // Le SW demande de synchroniser les données en attente
            console.log('📡 Sync demandée par le SW');
            if (typeof syncPendingData === 'function') {
                syncPendingData();
            }
            break;

        case 'CACHE_STATUS':
            console.log('📦 Status du cache:', payload);
            break;
    }
}

/**
 * Affiche une notification pour mettre à jour l'application
 */
function showUpdateAvailable(registration) {
    // Créer un toast persistant pour la mise à jour
    const updateToast = document.createElement('div');
    updateToast.className = 'update-toast';
    updateToast.innerHTML = `
        <div class="update-toast-content">
            <span class="update-toast-icon">🚀</span>
            <div class="update-toast-text">
                <strong>Mise à jour disponible</strong>
                <span>Rechargez pour obtenir la dernière version</span>
            </div>
            <button class="update-toast-btn" onclick="applyUpdate()">
                Mettre à jour
            </button>
            <button class="update-toast-close" onclick="this.parentElement.parentElement.remove()">
                ✕
            </button>
        </div>
    `;

    // Ajouter les styles si pas déjà présents
    if (!document.getElementById('update-toast-styles')) {
        const styles = document.createElement('style');
        styles.id = 'update-toast-styles';
        styles.textContent = `
            .update-toast {
                position: fixed;
                bottom: 90px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 10000;
                animation: slideUp 0.3s ease-out;
            }
            .update-toast-content {
                display: flex;
                align-items: center;
                gap: 12px;
                background: var(--bg-secondary, #1a1a1a);
                border: 1px solid var(--border-color, #333);
                border-radius: 12px;
                padding: 12px 16px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.4);
            }
            .update-toast-icon {
                font-size: 24px;
            }
            .update-toast-text {
                display: flex;
                flex-direction: column;
                gap: 2px;
            }
            .update-toast-text strong {
                color: var(--text-primary, #fff);
                font-size: 14px;
            }
            .update-toast-text span {
                color: var(--text-secondary, #888);
                font-size: 12px;
            }
            .update-toast-btn {
                background: var(--accent-primary, #22c55e);
                color: #000;
                border: none;
                border-radius: 8px;
                padding: 8px 16px;
                font-weight: 600;
                font-size: 13px;
                cursor: pointer;
                transition: opacity 0.2s;
            }
            .update-toast-btn:hover {
                opacity: 0.9;
            }
            .update-toast-close {
                background: none;
                border: none;
                color: var(--text-secondary, #888);
                font-size: 16px;
                cursor: pointer;
                padding: 4px;
            }
            @keyframes slideUp {
                from { transform: translateX(-50%) translateY(20px); opacity: 0; }
                to { transform: translateX(-50%) translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(styles);
    }

    document.body.appendChild(updateToast);

    // Stocker la registration pour la mise à jour
    window._swRegistration = registration;
}

/**
 * Applique la mise à jour du Service Worker
 */
function applyUpdate() {
    if (window._swRegistration && window._swRegistration.waiting) {
        // Dire au nouveau SW de prendre le contrôle
        window._swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    // Recharger la page
    window.location.reload();
}

// Exposer globalement
window.applyUpdate = applyUpdate;

// ==================== OFFLINE STATUS ====================

/**
 * Gestion de l'état de connexion
 * Note: On utilise une fonction wrapper car isOnline est déjà déclaré dans supabase.js
 */
function getConnectionStatus() {
    return navigator.onLine;
}

window.addEventListener('online', () => {
    console.log('🌐 Connexion rétablie');
    showToast('Connexion rétablie', 'success');
    updateOfflineIndicator(false);

    // Synchroniser les données en attente
    if (typeof syncPendingData === 'function') {
        setTimeout(() => syncPendingData(), 1000);
    }

    // Demander un sync au SW si disponible
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
        navigator.serviceWorker.ready.then(registration => {
            registration.sync.register('sync-pending-data');
        });
    }
});

window.addEventListener('offline', () => {
    console.log('📴 Mode hors-ligne');
    showToast('Mode hors-ligne - Vos données sont sauvegardées localement', 'warning');
    updateOfflineIndicator(true);
});

/**
 * Met à jour l'indicateur visuel de mode offline
 */
function updateOfflineIndicator(offline) {
    let indicator = document.getElementById('offline-indicator');

    if (offline) {
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'offline-indicator';
            indicator.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="1" y1="1" x2="23" y2="23"/>
                    <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
                    <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
                    <path d="M10.71 5.05A16 16 0 0 1 22.58 9"/>
                    <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
                    <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
                    <line x1="12" y1="20" x2="12.01" y2="20"/>
                </svg>
                <span>Hors ligne</span>
            `;
            indicator.style.cssText = `
                position: fixed;
                top: 60px;
                left: 50%;
                transform: translateX(-50%);
                background: var(--warning, #f59e0b);
                color: #000;
                padding: 6px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 6px;
                z-index: 9999;
                animation: slideDown 0.3s ease-out;
            `;
            document.body.appendChild(indicator);
        }
    } else {
        if (indicator) {
            indicator.style.animation = 'slideUp 0.3s ease-out forwards';
            setTimeout(() => indicator.remove(), 300);
        }
    }
}

// Vérifier l'état initial
if (!navigator.onLine) {
    updateOfflineIndicator(true);
}
