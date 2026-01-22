// ==================== MAIN APP ====================

// Mode hors-ligne (sans compte)
let offlineMode = false;

// Initialisation de l'application
function init() {
    console.log('🏋️ FitTrack Pro - Initialisation...');
    
    // Charger l'état local d'abord
    loadState();
    
    // Initialiser le système d'objectifs
    initGoalsTracking();
    
    // Initialiser l'interface
    initUI();
    
    // Initialiser le timer
    if (typeof initTimer === 'function') {
        initTimer();
    }

    // Initialiser Supabase
    initSupabase();
    
    // Rendre les composants (en attendant auth)
    renderProgramTypes();
    renderFoodsList();
    renderDailyMenu();
    renderFavoritesList(); // Initialiser les favoris
    updateDashboard();
    updateWeeklySchedule();
    populateSessionDaySelect();
    populateProgressExerciseSelect();
    updateSessionHistory();
    
    // Initialiser les PRs
    if (typeof renderPRsSection === 'function') {
        renderPRsSection();
    }
    
    // Initialiser les photos de progression
    if (typeof renderPhotosGallery === 'function') {
        renderPhotosGallery();
    }

    // Initialiser les statistiques
    if (typeof initStatsModule === 'function') {
        initStatsModule();
    }

    // Initialiser le journal
    initJournal();
    
    console.log('✅ FitTrack Pro - Prêt !');
}

// ==================== AUTH HANDLERS ====================

function switchAuthTab(tab) {
    const loginTab = document.getElementById('auth-tab-login');
    const signupTab = document.getElementById('auth-tab-signup');
    const loginForm = document.getElementById('auth-form-login');
    const signupForm = document.getElementById('auth-form-signup');
    
    if (tab === 'login') {
        loginTab.classList.replace('btn-secondary', 'btn-primary');
        signupTab.classList.replace('btn-primary', 'btn-secondary');
        loginForm.style.display = 'block';
        signupForm.style.display = 'none';
    } else {
        signupTab.classList.replace('btn-secondary', 'btn-primary');
        loginTab.classList.replace('btn-primary', 'btn-secondary');
        signupForm.style.display = 'block';
        loginForm.style.display = 'none';
    }
}

async function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    
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
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const passwordConfirm = document.getElementById('signup-password-confirm').value;
    
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
