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

// Service Worker pour PWA (optionnel)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // navigator.serviceWorker.register('/sw.js')
        //     .then(registration => console.log('SW registered'))
        //     .catch(error => console.log('SW registration failed'));
    });
}
