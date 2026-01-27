// ==================== TIMER MODULE ====================

let timerInterval = null;
let timerSeconds = 0;
let timerRunning = false;
let autoTimerEnabled = true; // Timer auto activé par défaut
let timerEndTime = 0; // Timestamp de fin pour calcul précis

// Configuration des temps de repos recommandés (en secondes)
// Ces valeurs sont maintenant définies dans exercises.js (REST_TIMES)
const restTimeConfig = {
    // Exercices composés lourds (force: 1-5 reps)
    heavy_compound: 180,    // 3 minutes
    // Exercices composés moyens (hypertrophie: 6-10 reps)
    compound: 120,          // 2 minutes
    // Exercices d'isolation (12+ reps)
    isolation: 90,          // 1:30
    // Par défaut
    default: 90
};

// Exercices composés (multi-articulaires)
const compoundExercises = [
    'squat', 'soulevé', 'deadlift', 'développé', 'bench', 'press',
    'rowing', 'row', 'tractions', 'pull-up', 'dips', 'fentes', 'lunge',
    'hip thrust', 'good morning', 'front squat', 'clean', 'snatch'
];

function isCompoundExercise(exerciseName) {
    const nameLower = exerciseName.toLowerCase();
    return compoundExercises.some(compound => nameLower.includes(compound));
}

/**
 * Retourne le temps de repos recommandé en secondes
 * Priorité : objectif du wizard > type d'exercice/reps
 */
function getRecommendedRestTime(exerciseName, targetReps) {
    // 1. Vérifier si un objectif wizard est défini
    if (state.wizardResults && state.wizardResults.goal && typeof REST_TIMES !== 'undefined') {
        const goal = state.wizardResults.goal;
        const config = REST_TIMES[goal];
        if (config) {
            return config.default;
        }
    }

    // 2. Fallback: calculer selon le type d'exercice et les reps
    // Parser les reps (peut être "6-8", "8-10", "12-15", "Max", etc.)
    let minReps = 8;
    if (typeof targetReps === 'string') {
        const match = targetReps.match(/(\d+)/);
        if (match) {
            minReps = parseInt(match[1]);
        }
    } else if (typeof targetReps === 'number') {
        minReps = targetReps;
    }

    const isCompound = isCompoundExercise(exerciseName);

    // Force (1-5 reps) + composé = repos long
    if (minReps <= 5 && isCompound) {
        return restTimeConfig.heavy_compound;
    }
    // Hypertrophie (6-10 reps) + composé = repos moyen
    if (minReps <= 10 && isCompound) {
        return restTimeConfig.compound;
    }
    // Isolation ou reps élevées = repos court
    if (minReps >= 12 || !isCompound) {
        return restTimeConfig.isolation;
    }

    return restTimeConfig.default;
}

/**
 * Retourne le temps de repos par défaut selon l'objectif du wizard
 * Utilisé par le full-screen session
 */
function getRestTimeForGoal() {
    if (state.wizardResults && state.wizardResults.goal && typeof REST_TIMES !== 'undefined') {
        const goal = state.wizardResults.goal;
        const config = REST_TIMES[goal];
        if (config) {
            return config.default;
        }
    }
    return 90; // Default fallback
}

function setTimer(seconds) {
    timerSeconds = seconds;
    timerRunning = false;
    clearInterval(timerInterval);
    const toggleBtn = document.getElementById('timer-toggle');
    if (toggleBtn) toggleBtn.textContent = 'Démarrer';
    updateTimerDisplay();
    updateMiniTimer();
}

function toggleTimer() {
    const toggleBtn = document.getElementById('timer-toggle');
    if (timerRunning) {
        // Pause - recalculer timerSeconds depuis le temps restant réel
        clearInterval(timerInterval);
        const remaining = timerEndTime - Date.now();
        timerSeconds = Math.max(0, Math.ceil(remaining / 1000));
        timerRunning = false;
        if (toggleBtn) toggleBtn.textContent = 'Reprendre';
        updateMiniTimerState();
    } else {
        // Start
        if (timerSeconds <= 0) timerSeconds = 90; // Défaut: 1:30
        startTimerCountdown();
    }
}

function startTimerCountdown() {
    timerRunning = true;
    const toggleBtn = document.getElementById('timer-toggle');
    if (toggleBtn) toggleBtn.textContent = 'Pause';
    updateMiniTimerState();

    // Calculer l'heure de fin basée sur Date.now() pour précision
    timerEndTime = Date.now() + (timerSeconds * 1000);

    timerInterval = setInterval(() => {
        // Calculer le temps restant réel basé sur Date.now()
        const remaining = timerEndTime - Date.now();
        timerSeconds = Math.max(0, Math.ceil(remaining / 1000));
        
        updateTimerDisplay();
        updateMiniTimer();

        if (remaining <= 0) {
            clearInterval(timerInterval);
            timerRunning = false;
            timerSeconds = 0;
            if (toggleBtn) toggleBtn.textContent = 'Démarrer';
            playTimerSound();

            // Vibration si supportée
            if (navigator.vibrate) {
                try {
                    navigator.vibrate([200, 100, 200, 100, 200]);
                } catch(e) {}
            }

            // Notification visuelle sur le mini-timer
            showTimerFinishedNotification();
            updateMiniTimerState();
        }
    }, 1000);
}

function resetTimer() {
    clearInterval(timerInterval);
    timerRunning = false;
    timerSeconds = 0;
    const toggleBtn = document.getElementById('timer-toggle');
    if (toggleBtn) toggleBtn.textContent = 'Démarrer';
    updateTimerDisplay();
    updateMiniTimer();
    hideMiniTimer();
}

function updateTimerDisplay() {
    const minutes = Math.floor(timerSeconds / 60);
    const seconds = timerSeconds % 60;
    const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    const timerEl = document.getElementById('timer-display');
    if (timerEl) {
        timerEl.textContent = display;

        // Changer la couleur quand il reste peu de temps
        if (timerSeconds <= 10 && timerSeconds > 0) {
            timerEl.style.color = 'var(--warning)';
        } else if (timerSeconds === 0) {
            timerEl.style.color = 'var(--danger)';
        } else {
            timerEl.style.color = 'var(--accent-primary)';
        }
    }
}

// ==================== MINI TIMER FLOTTANT ====================

function createMiniTimer() {
    // Vérifier si le mini-timer existe déjà
    if (document.getElementById('mini-timer')) return;

    const miniTimer = document.createElement('div');
    miniTimer.id = 'mini-timer';
    miniTimer.className = 'mini-timer';
    miniTimer.innerHTML = `
        <div class="mini-timer-content">
            <div class="mini-timer-display">
                <span class="mini-timer-icon">⏱️</span>
                <span class="mini-timer-time">00:00</span>
            </div>
            <div class="mini-timer-controls">
                <button class="mini-timer-btn" onclick="toggleTimer()" title="Pause/Reprendre">
                    <span class="mini-timer-pause">⏸</span>
                </button>
                <button class="mini-timer-btn" onclick="resetTimer()" title="Arrêter">✕</button>
            </div>
        </div>
        <div class="mini-timer-progress">
            <div class="mini-timer-progress-bar"></div>
        </div>
    `;

    document.body.appendChild(miniTimer);
}

function showMiniTimer() {
    createMiniTimer();
    const miniTimer = document.getElementById('mini-timer');
    if (miniTimer) {
        miniTimer.classList.add('visible');
    }
}

function hideMiniTimer() {
    const miniTimer = document.getElementById('mini-timer');
    if (miniTimer) {
        miniTimer.classList.remove('visible');
    }
}

function updateMiniTimer() {
    const miniTimer = document.getElementById('mini-timer');
    if (!miniTimer) return;

    const minutes = Math.floor(timerSeconds / 60);
    const seconds = timerSeconds % 60;
    const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    const timeEl = miniTimer.querySelector('.mini-timer-time');
    if (timeEl) {
        timeEl.textContent = display;

        // Couleur selon le temps restant
        if (timerSeconds <= 10 && timerSeconds > 0) {
            timeEl.style.color = 'var(--warning)';
            miniTimer.classList.add('warning');
        } else if (timerSeconds === 0) {
            timeEl.style.color = 'var(--danger)';
            miniTimer.classList.add('finished');
        } else {
            timeEl.style.color = 'var(--accent-primary)';
            miniTimer.classList.remove('warning', 'finished');
        }
    }

    // Mettre à jour la barre de progression
    const progressBar = miniTimer.querySelector('.mini-timer-progress-bar');
    if (progressBar && miniTimer.dataset.totalTime) {
        const total = parseInt(miniTimer.dataset.totalTime);
        const percent = (timerSeconds / total) * 100;
        progressBar.style.width = `${percent}%`;
    }
}

function updateMiniTimerState() {
    const miniTimer = document.getElementById('mini-timer');
    if (!miniTimer) return;

    const pauseBtn = miniTimer.querySelector('.mini-timer-pause');
    if (pauseBtn) {
        pauseBtn.textContent = timerRunning ? '⏸' : '▶';
    }
}

function showTimerFinishedNotification() {
    const miniTimer = document.getElementById('mini-timer');
    if (miniTimer) {
        miniTimer.classList.add('pulse');
        setTimeout(() => {
            miniTimer.classList.remove('pulse');
        }, 2000);
    }

    // Audio feedback
    if (typeof AudioFeedback !== 'undefined') {
        AudioFeedback.playTimerEnd();
    }

    showToast('⏱️ Repos terminé ! Prêt pour la série suivante', 'success');
}

// ==================== AUTO-TIMER SUR VALIDATION DE SÉRIE ====================

function startAutoTimer(exerciseName, targetReps) {
    if (!autoTimerEnabled) return;

    const restTime = getRecommendedRestTime(exerciseName, targetReps);

    // Arrêter le timer précédent si en cours
    clearInterval(timerInterval);

    // Configurer et démarrer le nouveau timer
    timerSeconds = restTime;

    // Sauvegarder le temps total pour la barre de progression
    const miniTimer = document.getElementById('mini-timer') || createMiniTimer();
    if (document.getElementById('mini-timer')) {
        document.getElementById('mini-timer').dataset.totalTime = restTime;
    }

    // Afficher le mini-timer et démarrer
    showMiniTimer();
    updateTimerDisplay();
    updateMiniTimer();
    startTimerCountdown();

    // Afficher le temps de repos recommandé
    const minutes = Math.floor(restTime / 60);
    const seconds = restTime % 60;
    const timeStr = seconds > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')}` : `${minutes} min`;
    showToast(`⏱️ Repos ${timeStr}`, 'info');
}

function toggleAutoTimer() {
    autoTimerEnabled = !autoTimerEnabled;

    // Sauvegarder la préférence
    localStorage.setItem('fittrack-auto-timer', autoTimerEnabled ? 'true' : 'false');

    updateAutoTimerToggle();
    showToast(autoTimerEnabled ? 'Timer auto activé ⏱️' : 'Timer auto désactivé', 'info');
}

function updateAutoTimerToggle() {
    const toggle = document.getElementById('auto-timer-toggle');
    if (toggle) {
        toggle.classList.toggle('active', autoTimerEnabled);
        toggle.querySelector('.toggle-status').textContent = autoTimerEnabled ? 'ON' : 'OFF';
    }
}

function loadAutoTimerPreference() {
    const saved = localStorage.getItem('fittrack-auto-timer');
    if (saved !== null) {
        autoTimerEnabled = saved === 'true';
    }
    updateAutoTimerToggle();
}

// ==================== SOUND ====================

function playTimerSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        // Jouer 3 bips
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                const oscillator = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioCtx.destination);

                oscillator.frequency.value = 800 + (i * 100); // Fréquence croissante
                oscillator.type = 'sine';
                gainNode.gain.value = 0.3;

                oscillator.start();
                setTimeout(() => oscillator.stop(), 150);
            }, i * 200);
        }
    } catch (e) {
        console.log('Audio non supporté');
    }
}

// ==================== KEYBOARD SHORTCUTS ====================

document.addEventListener('keydown', (e) => {
    // Seulement si on est sur la section training et en mode full-screen session
    const trainingSection = document.getElementById('training');
    const fullscreenSession = document.getElementById('fullscreen-session');
    
    // Vérifier si on est en full-screen session
    const isInFullscreen = fullscreenSession && fullscreenSession.style.display !== 'none';
    
    if (!trainingSection || !trainingSection.classList.contains('active')) {
        return;
    }

    // Raccourcis uniquement disponibles en session full-screen
    if (!isInFullscreen) return;

    switch (e.code) {
        case 'Space':
            e.preventDefault();
            // Valider série ou toggle timer
            if (typeof validateCurrentSet === 'function') {
                validateCurrentSet();
            }
            break;
        case 'KeyR':
            resetFsTimer();
            break;
    }
});

// ==================== INITIALISATION ====================

function initTimer() {
    loadAutoTimerPreference();
    createMiniTimer();
}
