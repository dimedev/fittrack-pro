// ==================== FITTRACK PRO - PLATE CALCULATOR ====================
// Calculateur de disques pour visualiser le chargement de barre

(function() {
    'use strict';

    // ==================== CONSTANTES ====================

    // Poids standard de la barre olympique (20kg) et autres barres
    const BAR_WEIGHTS = {
        olympic: { name: 'Olympique', weight: 20 },
        womens: { name: 'Femmes', weight: 15 },
        ez: { name: 'EZ Curl', weight: 10 },
        standard: { name: 'Standard', weight: 10 },
        trap: { name: 'Trap Bar', weight: 20 },
        smith: { name: 'Smith', weight: 15 }
    };

    // Disques disponibles (en kg) - poids par côté
    const AVAILABLE_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];

    // Couleurs des disques (style IPF)
    const PLATE_COLORS = {
        25: '#e53935',    // Rouge
        20: '#1e88e5',    // Bleu
        15: '#fdd835',    // Jaune
        10: '#43a047',    // Vert
        5: '#f5f5f5',     // Blanc
        2.5: '#e53935',   // Rouge (petit)
        1.25: '#757575'   // Gris
    };

    // ==================== STATE ====================

    let currentBarType = 'olympic';
    let isModalOpen = false;

    // ==================== CORE FUNCTIONS ====================

    /**
     * Calcule les disques nécessaires pour atteindre le poids cible
     * @param {number} targetWeight - Poids total visé en kg
     * @param {string} barType - Type de barre
     * @returns {Object} - { plates: [...], barWeight, totalWeight, isAchievable }
     */
    function calculatePlates(targetWeight, barType = 'olympic') {
        const barWeight = BAR_WEIGHTS[barType]?.weight || 20;

        // Vérifier si le poids cible est réalisable
        if (targetWeight < barWeight) {
            return {
                plates: [],
                barWeight,
                totalWeight: barWeight,
                isAchievable: false,
                message: `Le poids minimum est ${barWeight}kg (barre seule)`
            };
        }

        // Poids à charger de chaque côté
        const weightPerSide = (targetWeight - barWeight) / 2;

        // Algorithme greedy pour trouver les disques
        let remaining = weightPerSide;
        const platesPerSide = [];

        for (const plateWeight of AVAILABLE_PLATES) {
            while (remaining >= plateWeight - 0.01) { // Tolérance floating point
                platesPerSide.push(plateWeight);
                remaining -= plateWeight;
                remaining = Math.round(remaining * 100) / 100; // Arrondir
            }
        }

        // Calculer le poids total réel
        const totalPlateWeight = platesPerSide.reduce((sum, p) => sum + p, 0) * 2;
        const actualTotal = barWeight + totalPlateWeight;

        return {
            plates: platesPerSide,
            barWeight,
            totalWeight: actualTotal,
            isAchievable: Math.abs(remaining) < 0.01,
            weightPerSide: platesPerSide.reduce((sum, p) => sum + p, 0),
            message: Math.abs(remaining) < 0.01
                ? null
                : `Poids le plus proche: ${actualTotal}kg (il manque ${(remaining * 2).toFixed(2)}kg)`
        };
    }

    // ==================== RENDER FUNCTIONS ====================

    /**
     * Génère le HTML de visualisation des disques
     */
    function renderPlateVisualization(plates, barWeight) {
        if (plates.length === 0) {
            return `
                <div class="plate-viz-empty">
                    <div class="plate-bar-only">
                        <div class="plate-bar-sleeve"></div>
                        <div class="plate-bar-center"></div>
                        <div class="plate-bar-sleeve"></div>
                    </div>
                    <p>Barre seule (${barWeight}kg)</p>
                </div>
            `;
        }

        // Créer les disques pour la visualisation
        const platesHTML = plates.map((weight, index) => {
            const color = PLATE_COLORS[weight] || '#888';
            const size = getPlateSize(weight);
            return `
                <div class="plate-disc"
                     style="background-color: ${color};
                            width: ${size}px;
                            height: ${size}px;
                            z-index: ${10 - index};"
                     title="${weight}kg">
                    <span class="plate-weight-label">${weight}</span>
                </div>
            `;
        }).join('');

        // Les disques en miroir pour l'autre côté
        const platesReversed = [...plates].reverse().map((weight, index) => {
            const color = PLATE_COLORS[weight] || '#888';
            const size = getPlateSize(weight);
            return `
                <div class="plate-disc"
                     style="background-color: ${color};
                            width: ${size}px;
                            height: ${size}px;
                            z-index: ${index};"
                     title="${weight}kg">
                    <span class="plate-weight-label">${weight}</span>
                </div>
            `;
        }).join('');

        return `
            <div class="plate-visualization">
                <div class="plate-side plate-side-left">
                    ${platesHTML}
                </div>
                <div class="plate-bar-center"></div>
                <div class="plate-side plate-side-right">
                    ${platesReversed}
                </div>
            </div>
        `;
    }

    /**
     * Détermine la taille visuelle du disque
     */
    function getPlateSize(weight) {
        const sizes = {
            25: 90,
            20: 85,
            15: 75,
            10: 65,
            5: 55,
            2.5: 45,
            1.25: 35
        };
        return sizes[weight] || 50;
    }

    /**
     * Génère la liste textuelle des disques
     */
    function renderPlateList(plates) {
        if (plates.length === 0) return '';

        // Compter les disques par poids
        const counts = {};
        plates.forEach(p => {
            counts[p] = (counts[p] || 0) + 1;
        });

        const listItems = Object.entries(counts)
            .sort(([a], [b]) => parseFloat(b) - parseFloat(a))
            .map(([weight, count]) => `
                <div class="plate-list-item">
                    <span class="plate-list-count">${count}×</span>
                    <span class="plate-list-weight" style="background-color: ${PLATE_COLORS[parseFloat(weight)]}">${weight}kg</span>
                    <span class="plate-list-detail">(par côté)</span>
                </div>
            `).join('');

        return `
            <div class="plate-list">
                <div class="plate-list-title">Disques à charger (par côté):</div>
                ${listItems}
            </div>
        `;
    }

    // ==================== MODAL ====================

    /**
     * Affiche le modal du plate calculator
     */
    function showPlateCalculator(initialWeight = null) {
        if (isModalOpen) return;
        isModalOpen = true;

        // Poids initial (utiliser le poids actuel de la session si disponible)
        const defaultWeight = initialWeight ||
            (window.fsSession?.currentWeight) ||
            60;

        const modalHTML = `
            <div class="plate-modal-overlay" id="plate-modal-overlay" onclick="window.PlateCalculator.close()">
                <div class="plate-modal" onclick="event.stopPropagation()">
                    <div class="plate-modal-header">
                        <h3>🏋️ Calculateur de Disques</h3>
                        <button class="plate-modal-close" onclick="window.PlateCalculator.close()">×</button>
                    </div>

                    <div class="plate-modal-body">
                        <!-- Input poids cible -->
                        <div class="plate-input-section">
                            <label for="plate-target-weight">Poids total visé</label>
                            <div class="plate-weight-input-group">
                                <button class="plate-weight-btn" onclick="window.PlateCalculator.adjustWeight(-5)">-5</button>
                                <button class="plate-weight-btn" onclick="window.PlateCalculator.adjustWeight(-2.5)">-2.5</button>
                                <input type="number"
                                       id="plate-target-weight"
                                       class="plate-weight-input"
                                       value="${defaultWeight}"
                                       min="0"
                                       max="500"
                                       step="0.5"
                                       oninput="window.PlateCalculator.update()">
                                <span class="plate-weight-unit">kg</span>
                                <button class="plate-weight-btn" onclick="window.PlateCalculator.adjustWeight(2.5)">+2.5</button>
                                <button class="plate-weight-btn" onclick="window.PlateCalculator.adjustWeight(5)">+5</button>
                            </div>
                        </div>

                        <!-- Sélection type de barre -->
                        <div class="plate-bar-section">
                            <label>Type de barre</label>
                            <div class="plate-bar-selector">
                                ${Object.entries(BAR_WEIGHTS).map(([key, bar]) => `
                                    <button class="plate-bar-option ${key === currentBarType ? 'active' : ''}"
                                            data-bar="${key}"
                                            onclick="window.PlateCalculator.setBarType('${key}')">
                                        ${bar.name}<br><span class="plate-bar-weight">${bar.weight}kg</span>
                                    </button>
                                `).join('')}
                            </div>
                        </div>

                        <!-- Résultat visualisation -->
                        <div class="plate-result" id="plate-result">
                            <!-- Sera rempli par update() -->
                        </div>
                    </div>

                    <div class="plate-modal-footer">
                        <button class="btn btn-secondary" onclick="window.PlateCalculator.close()">Fermer</button>
                    </div>
                </div>
            </div>
        `;

        // Ajouter le modal au DOM
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Calculer et afficher
        updatePlateCalculator();

        // Focus sur l'input
        setTimeout(() => {
            document.getElementById('plate-target-weight')?.focus();
        }, 100);

        // Haptic feedback
        if (window.HapticFeedback) {
            window.HapticFeedback.light();
        }
    }

    /**
     * Met à jour le résultat du calcul
     */
    function updatePlateCalculator() {
        const input = document.getElementById('plate-target-weight');
        const resultDiv = document.getElementById('plate-result');
        if (!input || !resultDiv) return;

        const targetWeight = parseFloat(input.value) || 0;
        const result = calculatePlates(targetWeight, currentBarType);

        resultDiv.innerHTML = `
            ${result.message ? `<div class="plate-warning">${result.message}</div>` : ''}

            ${renderPlateVisualization(result.plates, result.barWeight)}

            <div class="plate-summary">
                <div class="plate-summary-item">
                    <span class="plate-summary-label">Barre</span>
                    <span class="plate-summary-value">${result.barWeight}kg</span>
                </div>
                <div class="plate-summary-item">
                    <span class="plate-summary-label">Disques (×2)</span>
                    <span class="plate-summary-value">${result.weightPerSide ? result.weightPerSide * 2 : 0}kg</span>
                </div>
                <div class="plate-summary-item plate-summary-total">
                    <span class="plate-summary-label">Total</span>
                    <span class="plate-summary-value">${result.totalWeight}kg</span>
                </div>
            </div>

            ${renderPlateList(result.plates)}
        `;
    }

    /**
     * Ajuste le poids avec les boutons +/-
     */
    function adjustWeight(delta) {
        const input = document.getElementById('plate-target-weight');
        if (!input) return;

        const current = parseFloat(input.value) || 0;
        const newWeight = Math.max(0, Math.min(500, current + delta));
        input.value = newWeight;

        updatePlateCalculator();

        // Haptic feedback
        if (window.HapticFeedback) {
            window.HapticFeedback.selection();
        }
    }

    /**
     * Change le type de barre
     */
    function setBarType(barType) {
        currentBarType = barType;

        // Update UI
        document.querySelectorAll('.plate-bar-option').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.bar === barType);
        });

        updatePlateCalculator();

        // Haptic feedback
        if (window.HapticFeedback) {
            window.HapticFeedback.selection();
        }
    }

    /**
     * Ferme le modal
     */
    function closePlateCalculator() {
        const overlay = document.getElementById('plate-modal-overlay');
        if (overlay) {
            overlay.remove();
        }
        isModalOpen = false;
    }

    // ==================== EXPORT GLOBAL ====================

    window.PlateCalculator = {
        show: showPlateCalculator,
        close: closePlateCalculator,
        update: updatePlateCalculator,
        adjustWeight,
        setBarType,
        calculatePlates // Exposer pour tests
    };

})();
