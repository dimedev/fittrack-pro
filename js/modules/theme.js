// ==================== THEME MODULE ====================
// Supports: auto (system), light, dark

(function() {
    'use strict';

    const THEME_KEY = 'repzy-theme';
    const VALID_THEMES = ['auto', 'light', 'dark'];

    /**
     * Get the current theme preference
     * PIT LANE CANON: dark par défaut. Auto et Light sont gardés en
     * preference mais tombent sur dark (Light n'est plus supporté visuellement).
     * @returns {string} 'auto', 'light', or 'dark'
     */
    function getTheme() {
        const saved = localStorage.getItem(THEME_KEY);
        if (saved && VALID_THEMES.includes(saved)) {
            return saved;
        }
        return 'dark'; // Pit Lane canon: dark is default
    }

    /**
     * Get the actual applied theme (resolves 'auto' to actual theme)
     * FORCE DARK: light et auto → dark. L'app n'est visuellement plus
     * supportée en light mode. On garde la fonction pour compat mais
     * elle retourne toujours 'dark'.
     * @returns {string} 'dark' (forcé)
     */
    function getAppliedTheme() {
        // Pit Lane : toujours dark, peu importe la préférence
        return 'dark';
    }

    /**
     * Set the theme
     * @param {string} theme - 'auto', 'light', or 'dark'
     */
    function setTheme(theme) {
        if (!VALID_THEMES.includes(theme)) {
            console.warn('Invalid theme:', theme);
            return;
        }

        // Save preference
        localStorage.setItem(THEME_KEY, theme);

        // Apply with transition
        applyTheme(theme, true);

        // Update UI if selector exists
        updateThemeSelector(theme);

        // Log
        console.log(`🎨 Theme set to: ${theme} (applied: ${getAppliedTheme()})`);

        // Haptic feedback
        if (window.HapticFeedback) {
            window.HapticFeedback.light();
        }
    }

    /**
     * Apply theme to document
     * @param {string} theme - 'auto', 'light', or 'dark'
     * @param {boolean} animate - Whether to animate the transition
     */
    function applyTheme(theme, animate = false) {
        const html = document.documentElement;

        if (animate) {
            html.classList.add('theme-transitioning');
            setTimeout(() => {
                html.classList.remove('theme-transitioning');
            }, 300);
        }

        // FORCE DARK: on applique toujours data-theme="dark" peu importe le choix user
        // (la préférence est sauvegardée mais n'a pas d'effet visuel actuellement)
        html.setAttribute('data-theme', 'dark');

        // Update meta theme-color for mobile browsers
        updateMetaThemeColor();
    }

    /**
     * Update the meta theme-color tag for mobile browser UI
     */
    function updateMetaThemeColor() {
        // PIT LANE : toujours noir profond (status bar iOS Safari aligné)
        const color = '#000000';

        let meta = document.querySelector('meta[name="theme-color"]');
        if (!meta) {
            meta = document.createElement('meta');
            meta.name = 'theme-color';
            document.head.appendChild(meta);
        }
        meta.content = color;
    }

    /**
     * Update the theme selector UI
     * @param {string} theme - Current theme
     */
    function updateThemeSelector(theme) {
        const options = document.querySelectorAll('.theme-option');
        options.forEach(option => {
            const optionTheme = option.dataset.theme;
            option.classList.toggle('active', optionTheme === theme);
        });
    }

    /**
     * Initialize the theme system
     */
    function init() {
        // Apply saved theme immediately (no animation on load)
        const savedTheme = getTheme();
        applyTheme(savedTheme, false);

        // Listen for system theme changes
        const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
        mediaQuery.addEventListener('change', (e) => {
            if (getTheme() === 'auto') {
                console.log(`🎨 System theme changed to: ${e.matches ? 'light' : 'dark'}`);
                updateMetaThemeColor();
            }
        });

        console.log(`🎨 Theme module initialized (${savedTheme}, applied: ${getAppliedTheme()})`);
    }

    /**
     * Render the theme selector HTML
     * @returns {string} HTML string
     */
    function renderThemeSelector() {
        const currentTheme = getTheme();

        // Pas de onclick inline — on bind via addEventListener après insertion dans le DOM
        return `
            <div class="theme-selector">
                <button class="theme-option ${currentTheme === 'auto' ? 'active' : ''}"
                        data-theme="auto">
                    <span class="theme-icon">🌗</span>
                    <span>Auto</span>
                </button>
                <button class="theme-option ${currentTheme === 'light' ? 'active' : ''}"
                        data-theme="light">
                    <span class="theme-icon">☀️</span>
                    <span>Clair</span>
                </button>
                <button class="theme-option ${currentTheme === 'dark' ? 'active' : ''}"
                        data-theme="dark">
                    <span class="theme-icon">🌙</span>
                    <span>Sombre</span>
                </button>
            </div>
        `;
    }

    /**
     * Bind events on theme buttons (called after DOM insertion)
     * Uses touchend + click fallback for iOS reliability
     */
    function bindThemeSelector() {
        document.querySelectorAll('.theme-selector').forEach(selector => {
            let touchHandled = false;

            // pointer-events: none sur les enfants (les taps tombent sur le bouton parent)
            selector.querySelectorAll('.theme-option span').forEach(span => {
                span.style.pointerEvents = 'none';
            });

            // touchend = réaction immédiate sur mobile
            selector.addEventListener('touchend', (e) => {
                e.preventDefault();
                const btn = e.target.closest('.theme-option');
                if (btn && btn.dataset.theme) {
                    touchHandled = true;
                    setTheme(btn.dataset.theme);
                }
            });

            // click = fallback desktop
            selector.addEventListener('click', (e) => {
                if (touchHandled) {
                    touchHandled = false;
                    return;
                }
                const btn = e.target.closest('.theme-option');
                if (btn && btn.dataset.theme) {
                    setTheme(btn.dataset.theme);
                }
            });
        });
    }

    /**
     * Toggle between light and dark (skips auto)
     */
    function toggleTheme() {
        const current = getAppliedTheme();
        setTheme(current === 'light' ? 'dark' : 'light');
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Export
    window.ThemeManager = {
        getTheme,
        getAppliedTheme,
        setTheme,
        toggleTheme,
        renderThemeSelector,
        bindThemeSelector,
        init
    };

})();
