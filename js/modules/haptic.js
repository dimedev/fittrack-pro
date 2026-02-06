// ==================== HAPTIC FEEDBACK MODULE ====================
// Gère le feedback haptique sur toutes les actions utilisateur

/**
 * Patterns de vibration prédéfinis
 */
// Gate: vibrate() requires prior user gesture (Chrome intervention fix)
let _hapticUserInteracted = false;
document.addEventListener('pointerdown', () => { _hapticUserInteracted = true; }, { once: true, passive: true });

const HapticPatterns = {
    // Actions légères
    light: [10],
    
    // Tap / Sélection
    tap: [30],
    
    // Action complétée
    success: [30, 20, 30],
    
    // Erreur
    error: [50, 30, 50, 30, 50],
    
    // PR / Achievement
    achievement: [40, 20, 40, 20, 80],
    
    // Warning
    warning: [60, 40, 60],
    
    // Long press start
    longPress: [80],
    
    // Tick (timer/progression)
    tick: [15],
    
    // Double tap
    doubleTap: [20, 10, 20]
};

/**
 * Jouer un pattern de vibration
 */
function playHaptic(pattern) {
    if (!_hapticUserInteracted || !navigator.vibrate) return;
    
    try {
        const vibrationPattern = HapticPatterns[pattern] || HapticPatterns.tap;
        navigator.vibrate(vibrationPattern);
    } catch (e) {
        // Silencieux si non supporté
    }
}

/**
 * Haptic pour succès (set complété, aliment ajouté, etc.)
 */
function hapticSuccess() {
    playHaptic('success');
}

/**
 * Haptic pour erreur
 */
function hapticError() {
    playHaptic('error');
}

/**
 * Haptic pour warning
 */
function hapticWarning() {
    playHaptic('warning');
}

/**
 * Haptic pour tap léger (navigation, sélection)
 */
function hapticTap() {
    playHaptic('tap');
}

/**
 * Haptic pour light (hover, preview)
 */
function hapticLight() {
    playHaptic('light');
}

/**
 * Haptic pour achievement (PR, streak milestone)
 */
function hapticAchievement() {
    playHaptic('achievement');
}

/**
 * Haptic pour long press
 */
function hapticLongPress() {
    playHaptic('longPress');
}

/**
 * Haptic pour tick (timer countdown)
 */
function hapticTick() {
    playHaptic('tick');
}

/**
 * Ajouter haptic sur tous les boutons
 */
function initHapticFeedback() {
    // Haptic sur tous les boutons
    document.addEventListener('click', (e) => {
        const button = e.target.closest('button, .btn, [role="button"]');
        if (button && !button.disabled) {
            hapticTap();
        }
    }, { passive: true });
    
    // Haptic sur swipe-to-delete
    document.addEventListener('touchend', (e) => {
        const swipeable = e.target.closest('[data-swipe-action]');
        if (swipeable) {
            hapticLight();
        }
    }, { passive: true });
    
    console.log('🎯 Haptic feedback initialized');
}

// Initialiser au chargement du DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHapticFeedback);
} else {
    initHapticFeedback();
}

// Exporter les fonctions
window.HapticFeedback = {
    play: playHaptic,
    success: hapticSuccess,
    error: hapticError,
    warning: hapticWarning,
    tap: hapticTap,
    light: hapticLight,
    achievement: hapticAchievement,
    longPress: hapticLongPress,
    tick: hapticTick
};
