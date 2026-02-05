// ==================== THEME MODULE ====================
// Supports: auto (system), light, dark

(function() {
    'use strict';

    const THEME_KEY = 'repzy-theme';
    const VALID_THEMES = ['auto', 'light', 'dark'];

    /**
     * Get the current theme preference
     * @returns {string} 'auto', 'light', or 'dark'
     */
    function getTheme() {
        const saved = localStorage.getItem(THEME_KEY);
        if (saved && VALID_THEMES.includes(saved)) {
            return saved;
        }
        return 'auto'; // Default
    }

    /**
     * Get the actual applied theme (resolves 'auto' to actual theme)
     * @returns {string} 'light' or 'dark'
     */
    function getAppliedTheme() {
        const theme = getTheme();
        if (theme === 'auto') {
            return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
        }
        return theme;
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

        html.setAttribute('data-theme', theme);

        // Update meta theme-color for mobile browsers
        updateMetaThemeColor();
    }

    /**
     * Update the meta theme-color tag for mobile browser UI
     */
    function updateMetaThemeColor() {
        const appliedTheme = getAppliedTheme();
        const color = appliedTheme === 'light' ? '#f8f9fa' : '#0a0a0f';

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

        return `
            <div class="theme-selector">
                <button class="theme-option ${currentTheme === 'auto' ? 'active' : ''}"
                        data-theme="auto" onclick="ThemeManager.setTheme('auto')">
                    <span class="theme-icon">🌗</span>
                    <span>Auto</span>
                </button>
                <button class="theme-option ${currentTheme === 'light' ? 'active' : ''}"
                        data-theme="light" onclick="ThemeManager.setTheme('light')">
                    <span class="theme-icon">☀️</span>
                    <span>Clair</span>
                </button>
                <button class="theme-option ${currentTheme === 'dark' ? 'active' : ''}"
                        data-theme="dark" onclick="ThemeManager.setTheme('dark')">
                    <span class="theme-icon">🌙</span>
                    <span>Sombre</span>
                </button>
            </div>
        `;
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
        init
    };

})();
