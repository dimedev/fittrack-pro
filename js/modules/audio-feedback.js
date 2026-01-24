// ==================== FITTRACK PRO - AUDIO FEEDBACK MODULE ====================
// Sons premium pour les actions de session

(function() {
    'use strict';

    // ==================== CONFIGURATION ====================
    
    const AudioConfig = {
        enabled: true,
        volume: 0.5, // 0-1
        sounds: {
            setComplete: true,
            newPR: true,
            timerEnd: true,
            exerciseComplete: true,
            sessionComplete: true
        }
    };
    
    // ==================== AUDIO CONTEXT ====================
    
    let audioContext = null;
    
    function getAudioContext() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        return audioContext;
    }
    
    // ==================== SOUND GENERATORS ====================
    
    /**
     * Génère un son de "click" satisfaisant pour la validation d'un set
     */
    function playSetComplete() {
        if (!AudioConfig.enabled || !AudioConfig.sounds.setComplete) return;
        
        const ctx = getAudioContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        // Son click court et satisfaisant
        oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5
        oscillator.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(AudioConfig.volume * 0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        
        oscillator.type = 'sine';
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.15);
    }
    
    /**
     * Génère un son de célébration pour un nouveau PR
     */
    function playNewPR() {
        if (!AudioConfig.enabled || !AudioConfig.sounds.newPR) return;
        
        const ctx = getAudioContext();
        
        // Accord majeur ascendant (C-E-G)
        const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5
        const startTime = ctx.currentTime;
        
        frequencies.forEach((freq, i) => {
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            oscillator.frequency.setValueAtTime(freq, startTime);
            oscillator.type = 'sine';
            
            const noteStart = startTime + (i * 0.1);
            gainNode.gain.setValueAtTime(0, noteStart);
            gainNode.gain.linearRampToValueAtTime(AudioConfig.volume * 0.4, noteStart + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.4);
            
            oscillator.start(noteStart);
            oscillator.stop(noteStart + 0.4);
        });
        
        // Vibration si disponible
        if (window.MobileGestures?.Haptics) {
            window.MobileGestures.Haptics.success();
        }
    }
    
    /**
     * Génère un son de notification douce pour la fin du timer
     */
    function playTimerEnd() {
        if (!AudioConfig.enabled || !AudioConfig.sounds.timerEnd) return;
        
        const ctx = getAudioContext();
        
        // Double bip doux
        [0, 0.15].forEach(delay => {
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            oscillator.frequency.setValueAtTime(587.33, ctx.currentTime + delay); // D5
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0, ctx.currentTime + delay);
            gainNode.gain.linearRampToValueAtTime(AudioConfig.volume * 0.25, ctx.currentTime + delay + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.2);
            
            oscillator.start(ctx.currentTime + delay);
            oscillator.stop(ctx.currentTime + delay + 0.2);
        });
    }
    
    /**
     * Génère un son de complétion pour la fin d'un exercice
     */
    function playExerciseComplete() {
        if (!AudioConfig.enabled || !AudioConfig.sounds.exerciseComplete) return;
        
        const ctx = getAudioContext();
        
        // Accord résolutif
        const frequencies = [392, 493.88, 587.33]; // G4, B4, D5
        
        frequencies.forEach((freq, i) => {
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            oscillator.frequency.setValueAtTime(freq, ctx.currentTime);
            oscillator.type = 'triangle';
            
            gainNode.gain.setValueAtTime(AudioConfig.volume * 0.2, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
            
            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.5);
        });
    }
    
    /**
     * Génère un son de fanfare pour la fin de session
     */
    function playSessionComplete() {
        if (!AudioConfig.enabled || !AudioConfig.sounds.sessionComplete) return;
        
        const ctx = getAudioContext();
        
        // Fanfare ascendante
        const notes = [
            { freq: 523.25, start: 0, duration: 0.15 },      // C5
            { freq: 587.33, start: 0.15, duration: 0.15 },   // D5
            { freq: 659.25, start: 0.3, duration: 0.15 },    // E5
            { freq: 783.99, start: 0.45, duration: 0.3 }     // G5 (long)
        ];
        
        notes.forEach(note => {
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            oscillator.frequency.setValueAtTime(note.freq, ctx.currentTime + note.start);
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0, ctx.currentTime + note.start);
            gainNode.gain.linearRampToValueAtTime(AudioConfig.volume * 0.35, ctx.currentTime + note.start + 0.03);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + note.start + note.duration);
            
            oscillator.start(ctx.currentTime + note.start);
            oscillator.stop(ctx.currentTime + note.start + note.duration);
        });
        
        // Vibration longue
        if (window.MobileGestures?.Haptics) {
            window.MobileGestures.Haptics.heavy();
        }
    }
    
    // ==================== SETTINGS ====================
    
    /**
     * Active/désactive l'audio globalement
     */
    function setEnabled(enabled) {
        AudioConfig.enabled = enabled;
        localStorage.setItem('repzy-audio-enabled', enabled ? 'true' : 'false');
    }
    
    /**
     * Définit le volume (0-1)
     */
    function setVolume(volume) {
        AudioConfig.volume = Math.max(0, Math.min(1, volume));
        localStorage.setItem('repzy-audio-volume', AudioConfig.volume.toString());
    }
    
    /**
     * Active/désactive un son spécifique
     */
    function setSoundEnabled(soundKey, enabled) {
        if (AudioConfig.sounds.hasOwnProperty(soundKey)) {
            AudioConfig.sounds[soundKey] = enabled;
            localStorage.setItem(`repzy-audio-${soundKey}`, enabled ? 'true' : 'false');
        }
    }
    
    /**
     * Charge les préférences depuis localStorage
     */
    function loadSettings() {
        const enabled = localStorage.getItem('repzy-audio-enabled');
        if (enabled !== null) {
            AudioConfig.enabled = enabled === 'true';
        }
        
        const volume = localStorage.getItem('repzy-audio-volume');
        if (volume !== null) {
            AudioConfig.volume = parseFloat(volume);
        }
        
        Object.keys(AudioConfig.sounds).forEach(key => {
            const setting = localStorage.getItem(`repzy-audio-${key}`);
            if (setting !== null) {
                AudioConfig.sounds[key] = setting === 'true';
            }
        });
    }
    
    /**
     * Génère le HTML pour les paramètres audio
     */
    function renderAudioSettings() {
        return `
            <div class="audio-settings">
                <div class="setting-row">
                    <span class="setting-label">Sons activés</span>
                    <label class="toggle-switch">
                        <input type="checkbox" ${AudioConfig.enabled ? 'checked' : ''} 
                               onchange="AudioFeedback.setEnabled(this.checked)">
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                <div class="setting-row">
                    <span class="setting-label">Volume</span>
                    <input type="range" min="0" max="100" value="${AudioConfig.volume * 100}" 
                           class="volume-slider"
                           onchange="AudioFeedback.setVolume(this.value / 100)">
                </div>
                <div class="setting-divider"></div>
                <div class="setting-row">
                    <span class="setting-label">Set validé</span>
                    <label class="toggle-switch">
                        <input type="checkbox" ${AudioConfig.sounds.setComplete ? 'checked' : ''} 
                               onchange="AudioFeedback.setSoundEnabled('setComplete', this.checked)">
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                <div class="setting-row">
                    <span class="setting-label">Nouveau PR</span>
                    <label class="toggle-switch">
                        <input type="checkbox" ${AudioConfig.sounds.newPR ? 'checked' : ''} 
                               onchange="AudioFeedback.setSoundEnabled('newPR', this.checked)">
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                <div class="setting-row">
                    <span class="setting-label">Timer terminé</span>
                    <label class="toggle-switch">
                        <input type="checkbox" ${AudioConfig.sounds.timerEnd ? 'checked' : ''} 
                               onchange="AudioFeedback.setSoundEnabled('timerEnd', this.checked)">
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
        `;
    }
    
    // ==================== INIT ====================
    
    // Charger les settings au démarrage
    loadSettings();
    
    // ==================== EXPORT ====================
    
    window.AudioFeedback = {
        // Sounds
        playSetComplete,
        playNewPR,
        playTimerEnd,
        playExerciseComplete,
        playSessionComplete,
        
        // Settings
        setEnabled,
        setVolume,
        setSoundEnabled,
        renderAudioSettings,
        
        // Config access
        getConfig: () => AudioConfig
    };
    
    console.log('🔊 Audio Feedback module loaded');

})();
