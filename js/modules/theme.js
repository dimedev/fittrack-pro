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
        dbg(`setTheme("${theme}") AVANT: saved="${getTheme()}" data-theme="${document.documentElement.getAttribute('data-theme')}"`);

        if (!VALID_THEMES.includes(theme)) {
            dbg(`INVALID theme: "${theme}"`);
            return;
        }

        // Save preference
        localStorage.setItem(THEME_KEY, theme);

        // Apply with transition
        applyTheme(theme, true);

        // Update UI if selector exists
        updateThemeSelector(theme);

        dbg(`setTheme DONE: saved="${getTheme()}" data-theme="${document.documentElement.getAttribute('data-theme')}"`);

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
     * On-screen debug panel (visible on iPhone without dev tools)
     */
    let debugPanel = null;
    let debugLogs = [];

    function dbg(msg) {
        const time = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
        const line = `${time} ${msg}`;
        debugLogs.push(line);
        if (debugLogs.length > 40) debugLogs.shift();
        console.log(`🔍 ${msg}`);
        if (debugPanel) {
            debugPanel.querySelector('.debug-content').textContent = debugLogs.join('\n');
            debugPanel.querySelector('.debug-content').scrollTop = 99999;
        }
    }

    function createDebugPanel() {
        if (debugPanel) return;
        debugPanel = document.createElement('div');
        debugPanel.id = 'theme-debug-panel';
        debugPanel.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                <b style="color:#0f0;font-size:11px;">DEBUG THEME/NAV</b>
                <button onclick="document.getElementById('theme-debug-panel').style.display='none'" style="background:#600;color:#fff;border:none;border-radius:4px;padding:2px 8px;font-size:11px;">X</button>
            </div>
            <pre class="debug-content" style="margin:0;white-space:pre-wrap;word-break:break-all;max-height:200px;overflow-y:auto;font-size:10px;line-height:1.3;color:#0f0;"></pre>
        `;
        debugPanel.style.cssText = 'position:fixed;top:60px;left:4px;right:4px;z-index:999999;background:rgba(0,0,0,0.92);color:#0f0;padding:8px;border-radius:8px;font-family:monospace;font-size:10px;pointer-events:auto;';
        document.body.appendChild(debugPanel);
    }

    function setupDebugListeners() {
        createDebugPanel();

        // Debug sur les boutons de thème
        const themeButtons = document.querySelectorAll('.theme-option');
        dbg(`Found ${themeButtons.length} theme btns`);
        themeButtons.forEach(btn => {
            btn.addEventListener('touchstart', (e) => {
                dbg(`THEME TOUCHSTART "${btn.dataset.theme}" target=${e.target.tagName}.${e.target.className}`);
            }, { passive: true });
            btn.addEventListener('touchend', (e) => {
                dbg(`THEME TOUCHEND "${btn.dataset.theme}" target=${e.target.tagName}.${e.target.className}`);
            }, { passive: true });
            btn.addEventListener('click', (e) => {
                dbg(`THEME CLICK "${btn.dataset.theme}" target=${e.target.tagName}.${e.target.className}`);
            });
        });

        // Debug sur les boutons de nav
        const navButtons = document.querySelectorAll('.mobile-nav-item');
        dbg(`Found ${navButtons.length} nav btns`);
        navButtons.forEach(btn => {
            btn.addEventListener('touchstart', (e) => {
                dbg(`NAV TOUCHSTART "${btn.dataset.section}" target=${e.target.tagName}${e.target.className ? '.' + e.target.className : ''}`);
            }, { passive: true });
            btn.addEventListener('touchend', (e) => {
                dbg(`NAV TOUCHEND "${btn.dataset.section}" target=${e.target.tagName}${e.target.className ? '.' + e.target.className : ''}`);
            }, { passive: true });
            btn.addEventListener('click', (e) => {
                dbg(`NAV CLICK "${btn.dataset.section}" target=${e.target.tagName}${e.target.className ? '.' + e.target.className : ''}`);
            });
        });

        dbg('Debug listeners ready!');
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
        document.addEventListener('DOMContentLoaded', () => {
            init();
            // Installer debug après un petit délai pour que le DOM soit complet
            setTimeout(setupDebugListeners, 1000);
        });
    } else {
        init();
        setTimeout(setupDebugListeners, 1000);
    }

    // Export
    window.ThemeManager = {
        getTheme,
        getAppliedTheme,
        setTheme,
        toggleTheme,
        renderThemeSelector,
        setupDebugListeners,
        init
    };

})();
