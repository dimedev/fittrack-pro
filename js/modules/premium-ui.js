// ==================== FITTRACK PRO - PREMIUM UI MODULE ====================
// Composants avancés : Progress Ring, Skeletons contextuels, Command Palette

// ==================== PROGRESS RING COMPONENT ====================

function createProgressRing(container, { value, max, label, type = 'calories', size = 120, unit = '' }) {
    if (!container) return;
    
    const percentage = Math.min((value / max) * 100, 100);
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;
    
    const displayValue = Math.round(value);
    const formattedValue = displayValue > 9999 ? Math.round(displayValue / 1000) + 'k' : displayValue;
    
    container.innerHTML = `
        <div class="progress-ring progress-ring--${type}" style="width: ${size}px; height: ${size}px;">
            <svg class="progress-ring__svg" viewBox="0 0 100 100">
                <defs>
                    <linearGradient id="gradient-calories" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stop-color="#ff0000" />
                        <stop offset="100%" stop-color="#ff6b6b" />
                    </linearGradient>
                    <linearGradient id="gradient-protein" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stop-color="#22c55e" />
                        <stop offset="100%" stop-color="#4ade80" />
                    </linearGradient>
                    <linearGradient id="gradient-carbs" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stop-color="#f59e0b" />
                        <stop offset="100%" stop-color="#fbbf24" />
                    </linearGradient>
                    <linearGradient id="gradient-fat" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stop-color="#8b5cf6" />
                        <stop offset="100%" stop-color="#a78bfa" />
                    </linearGradient>
                </defs>
                <circle class="progress-ring__circle-bg" cx="50" cy="50" r="${radius}"/>
                <circle 
                    class="progress-ring__circle progress-ring__circle--${type}" 
                    cx="50" cy="50" r="${radius}"
                    stroke-dasharray="${circumference}"
                    stroke-dashoffset="${circumference}"
                    style="stroke: url(#gradient-${type})"
                />
            </svg>
            <div class="progress-ring__value">
                <div class="progress-ring__number">${formattedValue}</div>
                <div class="progress-ring__label">${label}${unit ? ` ${unit}` : ''}</div>
            </div>
        </div>
    `;
    
    requestAnimationFrame(() => {
        const circle = container.querySelector('.progress-ring__circle');
        const ring = container.querySelector('.progress-ring');
        if (circle) {
            circle.style.strokeDashoffset = offset;
            if (percentage >= 100) {
                ring.classList.add('progress-ring--complete');
            }
        }
    });
}

function updateProgressRing(container, value, max) {
    const circle = container.querySelector('.progress-ring__circle');
    const numberEl = container.querySelector('.progress-ring__number');
    const ring = container.querySelector('.progress-ring');
    if (!circle || !numberEl) return;
    
    const percentage = Math.min((value / max) * 100, 100);
    const circumference = 2 * Math.PI * 45;
    const offset = circumference - (percentage / 100) * circumference;
    
    circle.style.strokeDashoffset = offset;
    
    // Formater le nombre pour éviter débordement
    const displayValue = Math.round(value);
    const formattedValue = displayValue > 9999 ? Math.round(displayValue / 1000) + 'k' : displayValue;
    animateValue(numberEl, parseInt(numberEl.textContent) || 0, formattedValue, 400);
    
    if (percentage >= 100) {
        ring?.classList.add('progress-ring--complete');
    } else {
        ring?.classList.remove('progress-ring--complete');
    }
}

// ==================== SKELETON LOADERS ====================

const SkeletonTemplates = {
    statCard: () => `
        <div class="skeleton-stat-card">
            <div class="skeleton skeleton-label"></div>
            <div class="skeleton skeleton-value"></div>
            <div class="skeleton skeleton-unit"></div>
        </div>
    `,
    
    statGrid: (count = 4) => `
        <div class="grid grid-${Math.min(count, 4)}" style="gap: 10px;">
            ${Array(count).fill('').map(() => SkeletonTemplates.statCard()).join('')}
        </div>
    `,
    
    exerciseCard: (setsCount = 4) => `
        <div class="skeleton-exercise">
            <div class="skeleton-exercise-header">
                <div class="skeleton skeleton-exercise-name"></div>
                <div class="skeleton skeleton-exercise-badge"></div>
            </div>
            <div class="skeleton-exercise-sets">
                ${Array(setsCount).fill('').map(() => `
                    <div class="skeleton-set-row">
                        <div class="skeleton skeleton-set-number"></div>
                        <div class="skeleton skeleton-set-input"></div>
                        <div class="skeleton skeleton-set-input"></div>
                        <div class="skeleton skeleton-set-number"></div>
                    </div>
                `).join('')}
            </div>
        </div>
    `,
    
    exerciseList: (count = 3) => `
        <div class="skeleton-stagger">
            ${Array(count).fill('').map(() => SkeletonTemplates.exerciseCard()).join('')}
        </div>
    `,
    
    foodItem: () => `
        <div class="skeleton-food-item">
            <div class="skeleton-food-info">
                <div class="skeleton skeleton-food-name"></div>
                <div class="skeleton skeleton-food-macros"></div>
            </div>
            <div class="skeleton skeleton-food-calories"></div>
        </div>
    `,
    
    foodList: (count = 4) => `
        <div class="skeleton-stagger">
            ${Array(count).fill('').map(() => SkeletonTemplates.foodItem()).join('')}
        </div>
    `,
    
    progressRing: () => `<div class="skeleton skeleton-ring"></div>`,
    
    macrosBars: () => `
        <div style="display: flex; flex-direction: column; gap: 16px;">
            ${Array(3).fill('').map(() => `
                <div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <div class="skeleton" style="width: 60px; height: 12px;"></div>
                        <div class="skeleton" style="width: 80px; height: 12px;"></div>
                    </div>
                    <div class="skeleton" style="width: 100%; height: 8px; border-radius: 4px;"></div>
                </div>
            `).join('')}
        </div>
    `,
    
    chart: () => `<div class="skeleton" style="width: 100%; height: 200px; border-radius: var(--radius-lg);"></div>`,
    
    card: () => `
        <div class="skeleton-card" style="padding: 24px;">
            <div class="skeleton" style="width: 50%; height: 20px; margin-bottom: 16px;"></div>
            <div class="skeleton" style="width: 100%; height: 14px; margin-bottom: 8px;"></div>
            <div class="skeleton" style="width: 80%; height: 14px; margin-bottom: 8px;"></div>
            <div class="skeleton" style="width: 60%; height: 14px;"></div>
        </div>
    `
};

function showContextualSkeleton(containerId, type, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const template = SkeletonTemplates[type];
    if (template) {
        container.innerHTML = typeof template === 'function' ? template(options.count) : template;
    } else {
        container.innerHTML = SkeletonTemplates.card();
    }
}

// ==================== COMMAND PALETTE ====================

const CommandPalette = {
    commands: [],
    selectedIndex: 0,
    filteredCommands: [],
    overlay: null,
    input: null,
    results: null,
    isInitialized: false,
    
    defaultCommands: [
        { id: 'nav-dashboard', icon: '📊', title: 'Dashboard', description: 'Voir le tableau de bord', group: 'Navigation', action: () => navigateToSection('dashboard'), keywords: ['home', 'accueil', 'stats'] },
        { id: 'nav-nutrition', icon: '🍽️', title: 'Nutrition', description: 'Gérer l\'alimentation', group: 'Navigation', action: () => navigateToSection('nutrition'), keywords: ['food', 'macros', 'calories', 'repas'] },
        { id: 'nav-training', icon: '🏋️', title: 'Training', description: 'Programme d\'entraînement', group: 'Navigation', action: () => navigateToSection('training'), keywords: ['workout', 'exercice', 'séance', 'muscu'] },
        { id: 'nav-progress', icon: '📈', title: 'Progression', description: 'Suivre les progrès', group: 'Navigation', action: () => navigateToSection('progress'), keywords: ['stats', 'graphique', 'évolution', 'photos'] },
        { id: 'add-food', icon: '➕', title: 'Ajouter un aliment', description: 'Au menu du jour', group: 'Actions rapides', action: () => typeof openAddFoodModal === 'function' && openAddFoodModal(), shortcut: ['A'] },
        { id: 'start-session', icon: '💪', title: 'Démarrer une séance', description: 'Commencer l\'entraînement', group: 'Actions rapides', action: () => { navigateToSection('training'); setTimeout(() => document.querySelector('[data-tab="session"]')?.click(), 100); } },
        { id: 'timer', icon: '⏱️', title: 'Timer de repos', description: 'Ouvrir le timer', group: 'Actions rapides', action: () => { navigateToSection('training'); setTimeout(() => document.querySelector('[data-tab="timer"]')?.click(), 100); } },
        { id: 'journal', icon: '📝', title: 'Menu du jour', description: 'Voir le menu du jour', group: 'Actions rapides', action: () => { navigateToSection('nutrition'); setTimeout(() => document.querySelector('[data-tab="journal"]')?.click(), 100); } },
        { id: 'profile', icon: '👤', title: 'Mon profil', description: 'Modifier mes informations', group: 'Profil', action: () => typeof openProfileModal === 'function' && openProfileModal() },
    ],
    
    init(additionalCommands = []) {
        if (this.isInitialized) return;
        this.commands = [...this.defaultCommands, ...additionalCommands];
        this.createDOM();
        this.bindEvents();
        this.isInitialized = true;
    },
    
    createDOM() {
        const overlay = document.createElement('div');
        overlay.className = 'command-palette-overlay';
        overlay.id = 'command-palette';
        overlay.innerHTML = `
            <div class="command-palette">
                <div class="command-input-wrapper">
                    <span class="command-input-icon">🔍</span>
                    <input type="text" class="command-input" placeholder="Rechercher une action..." autocomplete="off" spellcheck="false">
                    <div class="command-shortcut"><span class="command-key">ESC</span></div>
                </div>
                <div class="command-results"></div>
                <div class="command-footer">
                    <div class="command-footer-hints">
                        <span class="command-footer-hint"><span class="command-key">↑↓</span> Naviguer</span>
                        <span class="command-footer-hint"><span class="command-key">↵</span> Sélectionner</span>
                    </div>
                    <span>⌘K pour ouvrir</span>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        this.overlay = overlay;
        this.input = overlay.querySelector('.command-input');
        this.results = overlay.querySelector('.command-results');
    },
    
    bindEvents() {
        document.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                this.toggle();
            }
            if (this.isOpen()) {
                if (e.key === 'Escape') { e.preventDefault(); this.close(); }
                else if (e.key === 'ArrowDown') { e.preventDefault(); this.selectNext(); }
                else if (e.key === 'ArrowUp') { e.preventDefault(); this.selectPrev(); }
                else if (e.key === 'Enter') { e.preventDefault(); this.executeSelected(); }
            }
        });
        this.overlay.addEventListener('click', (e) => { if (e.target === this.overlay) this.close(); });
        this.input.addEventListener('input', () => this.search(this.input.value));
        this.input.addEventListener('keydown', (e) => { if (e.key === 'Enter') e.preventDefault(); });
    },
    
    isOpen() { return this.overlay?.classList.contains('active'); },
    toggle() { this.isOpen() ? this.close() : this.open(); },
    
    open() {
        this.overlay.classList.add('active');
        this.input.value = '';
        this.input.focus();
        this.search('');
        document.body.style.overflow = 'hidden';
    },
    
    close() {
        this.overlay.classList.remove('active');
        document.body.style.overflow = '';
        this.input.blur();
    },
    
    search(query) {
        query = query.toLowerCase().trim();
        this.filteredCommands = query === '' ? [...this.commands] : this.commands.filter(cmd => {
            const searchText = `${cmd.title} ${cmd.description} ${(cmd.keywords || []).join(' ')}`.toLowerCase();
            return searchText.includes(query);
        });
        this.selectedIndex = 0;
        this.render();
    },
    
    render() {
        if (this.filteredCommands.length === 0) {
            this.results.innerHTML = `<div class="command-empty"><div style="font-size: 2rem; margin-bottom: 8px;">🔍</div><div>Aucun résultat</div></div>`;
            return;
        }
        const groups = {};
        this.filteredCommands.forEach(cmd => {
            const group = cmd.group || 'Autres';
            if (!groups[group]) groups[group] = [];
            groups[group].push(cmd);
        });
        let html = '';
        let globalIndex = 0;
        for (const [groupName, commands] of Object.entries(groups)) {
            html += `<div class="command-group"><div class="command-group-title">${groupName}</div>`;
            commands.forEach(cmd => {
                const isSelected = globalIndex === this.selectedIndex;
                html += `
                    <div class="command-item ${isSelected ? 'selected' : ''}" data-index="${globalIndex}">
                        <span class="command-item-icon">${cmd.icon}</span>
                        <div class="command-item-content">
                            <div class="command-item-title">${cmd.title}</div>
                            <div class="command-item-description">${cmd.description}</div>
                        </div>
                        ${cmd.shortcut ? `<div class="command-item-shortcut">${cmd.shortcut.map(k => `<span class="command-key">${k}</span>`).join('')}</div>` : ''}
                    </div>
                `;
                globalIndex++;
            });
            html += `</div>`;
        }
        this.results.innerHTML = html;
        this.results.querySelectorAll('.command-item').forEach(item => {
            item.addEventListener('click', () => { this.selectedIndex = parseInt(item.dataset.index); this.executeSelected(); });
            item.addEventListener('mouseenter', () => { this.selectedIndex = parseInt(item.dataset.index); this.updateSelection(); });
        });
    },
    
    updateSelection() {
        this.results.querySelectorAll('.command-item').forEach((item, index) => {
            item.classList.toggle('selected', index === this.selectedIndex);
        });
        const selected = this.results.querySelector('.command-item.selected');
        if (selected) selected.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    },
    
    selectNext() { this.selectedIndex = Math.min(this.selectedIndex + 1, this.filteredCommands.length - 1); this.updateSelection(); },
    selectPrev() { this.selectedIndex = Math.max(this.selectedIndex - 1, 0); this.updateSelection(); },
    
    executeSelected() {
        const cmd = this.filteredCommands[this.selectedIndex];
        if (cmd && typeof cmd.action === 'function') {
            this.close();
            setTimeout(() => cmd.action(), 50);
        }
    }
};

// ==================== BADGE HELPERS ====================

function createBadge(text, type = 'default', options = {}) {
    const { dot = false, animated = false, counter = false } = options;
    let classes = ['badge'];
    if (counter) { classes.push('badge-counter'); }
    else {
        classes.push(`badge-${type}`);
        if (dot) classes.push('badge-dot');
        if (animated) classes.push('badge-new');
    }
    return `<span class="${classes.join(' ')}">${text}</span>`;
}

function addBadgeOverlay(element, text, type = 'brand') {
    if (!element) return;
    element.querySelector('.badge-overlay')?.remove();
    const position = window.getComputedStyle(element).position;
    if (position === 'static') element.style.position = 'relative';
    const badge = document.createElement('span');
    badge.className = `badge badge-${type} badge-overlay`;
    badge.textContent = text;
    element.appendChild(badge);
}

// ==================== INITIALIZATION ====================

function initPremiumUI() {
    CommandPalette.init();
    
    // Show keyboard shortcut hint for new users
    showKbdHint();
    
    console.log('✨ FitTrack Premium UI initialized');
}

function showKbdHint() {
    // Only show on desktop
    if (window.innerWidth <= 768) return;
    
    // Check if user has used command palette before
    const hasUsedCmdK = localStorage.getItem('fittrack_used_cmdk');
    if (hasUsedCmdK) return;
    
    // Create hint element
    const hint = document.createElement('div');
    hint.className = 'kbd-hint';
    hint.innerHTML = `
        <span>Astuce : </span>
        <span class="command-key">⌘</span>
        <span class="command-key">K</span>
        <span>pour rechercher</span>
    `;
    document.body.appendChild(hint);
    
    // Show after 3 seconds
    setTimeout(() => {
        hint.classList.add('visible');
    }, 3000);
    
    // Hide after 8 seconds
    setTimeout(() => {
        hint.classList.remove('visible');
        setTimeout(() => hint.remove(), 300);
        localStorage.setItem('fittrack_used_cmdk', 'true');
    }, 11000);
}

// Add skeletons on page load
function showInitialSkeletons() {
    // Dashboard stats skeleton
    const statsGrid = document.querySelector('#dashboard .grid.grid-4');
    if (statsGrid && !statsGrid.dataset.loaded) {
        const statCards = statsGrid.querySelectorAll('.stat-card');
        statCards.forEach(card => {
            const value = card.querySelector('.stat-value');
            if (value && value.textContent === '--') {
                card.classList.add('skeleton-loading');
            }
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPremiumUI);
} else {
    initPremiumUI();
}

// ==================== EXPORTS ====================
window.PremiumUI = {
    createProgressRing,
    updateProgressRing,
    showContextualSkeleton,
    SkeletonTemplates,
    CommandPalette,
    createBadge,
    addBadgeOverlay
};
