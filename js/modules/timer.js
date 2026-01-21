// ==================== TIMER MODULE ====================

let timerInterval = null;
let timerSeconds = 0;
let timerRunning = false;

function setTimer(seconds) {
    timerSeconds = seconds;
    timerRunning = false;
    clearInterval(timerInterval);
    document.getElementById('timer-toggle').textContent = 'Démarrer';
    updateTimerDisplay();
}

function toggleTimer() {
    if (timerRunning) {
        // Pause
        clearInterval(timerInterval);
        timerRunning = false;
        document.getElementById('timer-toggle').textContent = 'Reprendre';
    } else {
        // Start
        if (timerSeconds <= 0) timerSeconds = 90; // Défaut: 1:30
        timerRunning = true;
        document.getElementById('timer-toggle').textContent = 'Pause';
        
        timerInterval = setInterval(() => {
            timerSeconds--;
            updateTimerDisplay();
            
            if (timerSeconds <= 0) {
                clearInterval(timerInterval);
                timerRunning = false;
                document.getElementById('timer-toggle').textContent = 'Démarrer';
                playTimerSound();
                
                // Vibration si supportée
                if (navigator.vibrate) {
                    navigator.vibrate([200, 100, 200, 100, 200]);
                }
            }
        }, 1000);
    }
}

function resetTimer() {
    clearInterval(timerInterval);
    timerRunning = false;
    timerSeconds = 0;
    document.getElementById('timer-toggle').textContent = 'Démarrer';
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const minutes = Math.floor(timerSeconds / 60);
    const seconds = timerSeconds % 60;
    const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    document.getElementById('timer-display').textContent = display;
    
    // Changer la couleur quand il reste peu de temps
    const timerEl = document.getElementById('timer-display');
    if (timerSeconds <= 10 && timerSeconds > 0) {
        timerEl.style.color = 'var(--warning)';
    } else if (timerSeconds === 0) {
        timerEl.style.color = 'var(--danger)';
    } else {
        timerEl.style.color = 'var(--accent-primary)';
    }
}

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

// Permettre le contrôle par raccourcis clavier
document.addEventListener('keydown', (e) => {
    // Seulement si on est sur la section training et l'onglet timer
    const trainingSection = document.getElementById('training');
    const timerTab = document.getElementById('tab-timer');
    
    if (!trainingSection.classList.contains('active') || timerTab.style.display === 'none') {
        return;
    }
    
    switch (e.code) {
        case 'Space':
            e.preventDefault();
            toggleTimer();
            break;
        case 'KeyR':
            resetTimer();
            break;
        case 'Digit1':
            setTimer(60);
            break;
        case 'Digit2':
            setTimer(90);
            break;
        case 'Digit3':
            setTimer(120);
            break;
        case 'Digit4':
            setTimer(180);
            break;
    }
});
