// ==================== BARCODE SCANNER MODULE ====================
// Scan de codes-barres universel avec QuaggaJS (iOS/Android/Desktop)
// Intégration avec Open Food Facts API

const OFF_API_URL = 'https://world.openfoodfacts.org/api/v2';
let scanningActive = false;
let lastScannedBarcode = null;
let scannerInitialized = false;

/**
 * Ouvrir le scanner de codes-barres
 */
async function openBarcodeScanner() {
    // Barcode scanner désactivé - feature non prête
    if (window.showToast) showToast('Scanner indisponible pour le moment', 'info');
    return;

    const scannerModal = document.getElementById('barcode-scanner-modal');
    if (!scannerModal) {
        console.error('Modal barcode scanner introuvable');
        return;
    }

    // Pit Lane unified : .modal-overlay + .active = display:flex via CSS
    scannerModal.classList.add('active');
    if (typeof ModalManager !== 'undefined') ModalManager.lock('barcode-scanner-modal');

    // Haptic feedback
    if (window.HapticFeedback) {
        window.HapticFeedback.tap();
    }

    // Reset de l'UI
    resetScannerUI();

    // Initialiser QuaggaJS
    await initQuaggaScanner();
}

/**
 * Reset l'UI du scanner
 */
function resetScannerUI() {
    const resultsDiv = document.getElementById('barcode-results');
    const loadingDiv = document.getElementById('barcode-loading');
    const videoContainer = document.querySelector('.barcode-video-container');
    const scannerContent = document.querySelector('#barcode-scanner-modal .modal-body');

    if (resultsDiv) resultsDiv.style.display = 'none';
    if (loadingDiv) loadingDiv.style.display = 'none';
    if (videoContainer) videoContainer.style.display = 'block';

    // Restaurer le contenu original si nécessaire
    if (scannerContent && !document.getElementById('barcode-video')) {
        scannerContent.innerHTML = `
            <div class="barcode-video-container">
                <div id="interactive" class="viewport" style="width: 100%; height: 300px; position: relative; overflow: hidden; border-radius: 12px;"></div>
                <div class="scan-overlay">
                    <div class="scan-line"></div>
                </div>
            </div>
        `;
    }
}

/**
 * Initialiser QuaggaJS pour le scan
 */
async function initQuaggaScanner() {
    // Vérifier si Quagga est disponible
    if (typeof Quagga === 'undefined') {
        console.error('QuaggaJS non chargé');
        showManualBarcodeInput();
        return;
    }

    const interactive = document.getElementById('interactive');
    if (!interactive) {
        console.error('Container viewport non trouvé');
        showManualBarcodeInput();
        return;
    }

    // Configuration QuaggaJS
    const config = {
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: interactive,
            constraints: {
                facingMode: "environment", // Caméra arrière
                width: { min: 640, ideal: 1280, max: 1920 },
                height: { min: 480, ideal: 720, max: 1080 }
            },
            area: { // Zone de détection centrale
                top: "20%",
                right: "10%",
                left: "10%",
                bottom: "20%"
            }
        },
        locator: {
            patchSize: "medium",
            halfSample: true
        },
        numOfWorkers: navigator.hardwareConcurrency || 2,
        frequency: 10,
        decoder: {
            readers: [
                "ean_reader",
                "ean_8_reader",
                "upc_reader",
                "upc_e_reader"
            ]
        },
        locate: true
    };

    try {
        // Arrêter toute instance précédente
        if (scannerInitialized) {
            Quagga.stop();
            scannerInitialized = false;
        }

        // Initialiser Quagga
        await new Promise((resolve, reject) => {
            Quagga.init(config, (err) => {
                if (err) {
                    console.error('Erreur init Quagga:', err);
                    reject(err);
                    return;
                }
                resolve();
            });
        });

        scannerInitialized = true;
        scanningActive = true;
        lastScannedBarcode = null;

        // Démarrer le scan
        Quagga.start();

        // Écouter les détections
        Quagga.onDetected(onBarcodeDetected);

        // Feedback visuel de détection
        Quagga.onProcessed(onQuaggaProcessed);

        showToast('📷 Scanner activé - Scannez un code-barres', 'info', 3000);

    } catch (error) {
        console.error('Erreur initialisation scanner:', error);

        // Afficher message d'erreur selon le type
        if (error.name === 'NotAllowedError') {
            showToast('❌ Accès caméra refusé. Autorisez l\'accès dans les paramètres.', 'error', 5000);
        } else if (error.name === 'NotFoundError') {
            showToast('❌ Aucune caméra détectée', 'error');
        } else {
            showToast('❌ Erreur caméra. Essayez la saisie manuelle.', 'error');
        }

        if (window.HapticFeedback) {
            window.HapticFeedback.error();
        }

        // Fallback sur saisie manuelle
        showManualBarcodeInput();
    }
}

/**
 * Callback quand un code-barres est détecté
 */
function onBarcodeDetected(result) {
    if (!scanningActive) return;

    const barcode = result.codeResult.code;

    // Éviter les scans multiples du même code
    if (barcode === lastScannedBarcode) return;

    // Valider le format EAN/UPC (8-13 chiffres)
    if (!/^\d{8,13}$/.test(barcode)) return;

    lastScannedBarcode = barcode;
    console.log('📦 Code-barres détecté:', barcode);

    // Haptic feedback
    if (window.HapticFeedback) {
        window.HapticFeedback.success();
    }

    // Arrêter le scan et rechercher le produit
    stopScanning();
    fetchProductFromOFF(barcode);
}

/**
 * Feedback visuel pendant le traitement
 */
function onQuaggaProcessed(result) {
    const drawingCtx = Quagga.canvas.ctx.overlay;
    const drawingCanvas = Quagga.canvas.dom.overlay;

    if (!result || !drawingCtx || !drawingCanvas) return;

    // Effacer le canvas
    drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);

    // Dessiner les zones de détection si des boxes sont trouvées
    if (result.boxes) {
        result.boxes.filter(box => box !== result.box).forEach(box => {
            Quagga.ImageDebug.drawPath(box, { x: 0, y: 1 }, drawingCtx, {
                color: 'rgba(0, 200, 0, 0.3)',
                lineWidth: 2
            });
        });
    }

    // Mettre en évidence la détection confirmée
    if (result.box) {
        Quagga.ImageDebug.drawPath(result.box, { x: 0, y: 1 }, drawingCtx, {
            color: '#00ff00',
            lineWidth: 3
        });
    }

    // Ligne de code-barres détectée
    if (result.codeResult && result.codeResult.code) {
        Quagga.ImageDebug.drawPath(result.line, { x: 'x', y: 'y' }, drawingCtx, {
            color: '#ff0000',
            lineWidth: 3
        });
    }
}

/**
 * Arrêter le scan
 */
function stopScanning() {
    scanningActive = false;

    if (scannerInitialized && typeof Quagga !== 'undefined') {
        try {
            Quagga.stop();
            Quagga.offDetected(onBarcodeDetected);
            Quagga.offProcessed(onQuaggaProcessed);
        } catch (e) {
            console.warn('Erreur arrêt Quagga:', e);
        }
        scannerInitialized = false;
    }
}

/**
 * Fermer le scanner
 */
function closeBarcodeScanner() {
    const scannerModal = document.getElementById('barcode-scanner-modal');
    if (scannerModal) {
        scannerModal.classList.remove('active');
        if (typeof ModalManager !== 'undefined') ModalManager.unlock('barcode-scanner-modal');
    }

    stopScanning();
}

/**
 * Afficher l'input manuel si la détection automatique échoue
 */
function showManualBarcodeInput() {
    stopScanning();

    const scannerModal = document.getElementById('barcode-scanner-modal');
    const scannerContent = scannerModal?.querySelector('.modal-body');

    if (!scannerContent) return;

    // V5-D : refonte Pit Lane — typo, tokens, SVG icons
    scannerContent.innerHTML = `
        <div class="manual-barcode-pane">
            <div class="manual-barcode-icon" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="1"/><line x1="6" y1="9" x2="6" y2="15"/><line x1="9" y1="9" x2="9" y2="15"/><line x1="13" y1="9" x2="13" y2="15"/><line x1="17" y1="9" x2="17" y2="15"/></svg>
            </div>
            <h4 class="manual-barcode-title">Saisie manuelle</h4>
            <p class="manual-barcode-desc">Entrez le code-barres pour rechercher le produit.</p>

            <div class="manual-barcode-tip">
                <span class="manual-barcode-tip-label">Astuce</span>
                <p>Le code-barres se trouve au dos du produit, 8 à 13 chiffres.</p>
            </div>

            <input
                type="text"
                id="manual-barcode-input"
                placeholder="Ex : 3017620422003"
                class="form-input num"
                inputmode="numeric"
                pattern="[0-9]*"
                autocomplete="off"
                style="text-align:center;letter-spacing:0.12em;"
            >

            <div class="manual-barcode-actions">
                <button class="btn btn-secondary" type="button" onclick="closeBarcodeScanner()">Annuler</button>
                <button class="btn btn-primary" type="button" onclick="searchManualBarcode()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                    Rechercher
                </button>
            </div>

            <button class="btn btn-ghost btn-block" type="button" onclick="retryScanner()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                Réessayer le scanner
            </button>
        </div>
    `;

    // Focus sur l'input avec validation
    setTimeout(() => {
        const input = document.getElementById('manual-barcode-input');
        if (input) {
            input.focus();
            // Validation en temps réel : seulement chiffres
            input.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
            });
            // Enter pour rechercher
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    searchManualBarcode();
                }
            });
        }
    }, 100);
}

/**
 * Réessayer le scanner après saisie manuelle
 */
async function retryScanner() {
    resetScannerUI();
    await initQuaggaScanner();
}

/**
 * Rechercher un code-barres saisi manuellement
 */
async function searchManualBarcode() {
    const input = document.getElementById('manual-barcode-input');
    const barcode = input?.value?.trim();

    if (!barcode) {
        showToast('Entrez un code-barres', 'warning');
        return;
    }

    if (!/^\d{8,13}$/.test(barcode)) {
        showToast('Code-barres invalide (8-13 chiffres)', 'warning');
        return;
    }

    if (window.HapticFeedback) {
        window.HapticFeedback.tap();
    }

    await fetchProductFromOFF(barcode);
}

/**
 * Récupérer les informations produit depuis Open Food Facts
 */
async function fetchProductFromOFF(barcode) {
    const loadingDiv = document.getElementById('barcode-loading');
    if (loadingDiv) {
        loadingDiv.style.display = 'flex';
    }

    // Cacher la vidéo
    const videoContainer = document.querySelector('.barcode-video-container');
    if (videoContainer) {
        videoContainer.style.display = 'none';
    }

    try {
        const response = await fetch(`${OFF_API_URL}/product/${barcode}.json`);
        const data = await response.json();

        if (data.status === 1 && data.product) {
            const product = data.product;

            // Extraire les macros (pour 100g)
            const nutrients = product.nutriments || {};
            const foodData = {
                name: product.product_name || product.product_name_fr || 'Produit inconnu',
                brand: product.brands || '',
                barcode: barcode,
                calories: Math.round(nutrients['energy-kcal_100g'] || nutrients['energy-kcal'] || 0),
                protein: Math.round((nutrients['proteins_100g'] || nutrients['proteins'] || 0) * 10) / 10,
                carbs: Math.round((nutrients['carbohydrates_100g'] || nutrients['carbohydrates'] || 0) * 10) / 10,
                fat: Math.round((nutrients['fat_100g'] || nutrients['fat'] || 0) * 10) / 10,
                fiber: Math.round((nutrients['fiber_100g'] || nutrients['fiber'] || 0) * 10) / 10,
                imageUrl: product.image_url || product.image_front_url || null
            };

            // Stocker temporairement pour l'ajout
            window._scannedProduct = foodData;

            // Afficher les résultats
            displayScannedProduct(foodData);

            // Haptic feedback
            if (window.HapticFeedback) {
                window.HapticFeedback.success();
            }

        } else {
            showToast('❌ Produit non trouvé dans la base Open Food Facts', 'error');

            if (window.HapticFeedback) {
                window.HapticFeedback.error();
            }

            // Proposer création manuelle
            setTimeout(() => {
                if (confirm('Produit introuvable. Voulez-vous le créer manuellement ?')) {
                    closeBarcodeScanner();
                    if (typeof openCustomFoodModal === 'function') {
                        openCustomFoodModal();
                    }
                } else {
                    showManualBarcodeInput();
                }
            }, 500);
        }

    } catch (error) {
        console.error('Erreur API Open Food Facts:', error);
        showToast('❌ Erreur lors de la recherche', 'error');

        if (window.HapticFeedback) {
            window.HapticFeedback.error();
        }

        showManualBarcodeInput();

    } finally {
        if (loadingDiv) {
            loadingDiv.style.display = 'none';
        }
    }
}

/**
 * Afficher le produit scanné
 */
function displayScannedProduct(foodData) {
    const resultsDiv = document.getElementById('barcode-results');
    if (!resultsDiv) return;

    const brandText = foodData.brand ? `<div style="color: var(--text-muted); font-size: 0.85rem;">${foodData.brand}</div>` : '';
    const imageHtml = foodData.imageUrl
        ? `<img src="${foodData.imageUrl}" alt="${foodData.name}" style="width: 100%; height: 140px; object-fit: contain; margin-bottom: 12px; border-radius: 8px; background: #f5f5f5;">`
        : '';

    resultsDiv.innerHTML = `
        <div class="scanned-product-card" style="padding: 20px;">
            ${imageHtml}
            <h3 style="margin-bottom: 4px; font-size: 1.1rem;">${foodData.name}</h3>
            ${brandText}
            <div class="food-macros" style="margin-top: 12px; padding: 12px; background: var(--bg-secondary); border-radius: 8px;">
                <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 8px;">Pour 100g :</div>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
                    <div><strong>${foodData.calories}</strong> kcal</div>
                    <div>P: <strong>${foodData.protein}g</strong></div>
                    <div>G: <strong>${foodData.carbs}g</strong></div>
                    <div>L: <strong>${foodData.fat}g</strong></div>
                </div>
            </div>

            <!-- Quantité -->
            <div style="margin-top: 16px;">
                <label style="font-size: 0.9rem; color: var(--text-secondary); display: block; margin-bottom: 8px;">Quantité (g)</label>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <input
                        type="number"
                        id="scanned-quantity"
                        value="100"
                        min="1"
                        max="9999"
                        class="form-input"
                        style="flex: 1; text-align: center; font-size: 1.1rem; min-height: 48px;"
                    >
                    <span style="color: var(--text-muted);">g</span>
                </div>
                <div style="display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap;">
                    <button class="btn btn-secondary" onclick="document.getElementById('scanned-quantity').value='50'" style="flex: 1; min-width: 60px;">50g</button>
                    <button class="btn btn-secondary" onclick="document.getElementById('scanned-quantity').value='100'" style="flex: 1; min-width: 60px;">100g</button>
                    <button class="btn btn-secondary" onclick="document.getElementById('scanned-quantity').value='150'" style="flex: 1; min-width: 60px;">150g</button>
                    <button class="btn btn-secondary" onclick="document.getElementById('scanned-quantity').value='200'" style="flex: 1; min-width: 60px;">200g</button>
                </div>
            </div>

            <div style="display: flex; gap: 12px; margin-top: 20px;">
                <button class="btn btn-secondary" onclick="closeBarcodeScanner()" style="flex: 1; min-height: 48px;">Annuler</button>
                <button class="btn btn-primary" onclick="addScannedProductToJournal()" style="flex: 1; min-height: 48px;">
                    ✓ Ajouter
                </button>
            </div>
        </div>
    `;

    resultsDiv.style.display = 'block';
}

/**
 * Ajouter le produit scanné au journal alimentaire
 */
async function addScannedProductToJournal() {
    const foodData = window._scannedProduct;
    if (!foodData) {
        showToast('❌ Erreur: produit non trouvé', 'error');
        return;
    }

    const quantityInput = document.getElementById('scanned-quantity');
    const quantity = parseInt(quantityInput?.value) || 100;

    // Créer l'aliment personnalisé s'il n'existe pas déjà
    let foodId = `off-${foodData.barcode}`;

    // Vérifier si l'aliment existe déjà dans state.foods
    const existingFood = state.foods?.find(f => f.id === foodId);

    if (!existingFood) {
        // Ajouter l'aliment à la base locale
        const newFood = {
            id: foodId,
            name: foodData.brand ? `${foodData.name} (${foodData.brand})` : foodData.name,
            category: 'other',
            calories: foodData.calories,
            protein: foodData.protein,
            carbs: foodData.carbs,
            fat: foodData.fat,
            fiber: foodData.fiber || 0,
            unit: 'g',
            portion: 100,
            barcode: foodData.barcode,
            source: 'openfoodfacts'
        };

        if (!state.foods) state.foods = [];
        state.foods.push(newFood);
    }

    // Ajouter au journal
    const today = new Date().toISOString().split('T')[0];
    const mealType = getCurrentMealType();

    if (!state.foodJournal) state.foodJournal = {};
    if (!state.foodJournal[today]) state.foodJournal[today] = [];

    const entry = {
        foodId: foodId,
        quantity: quantity,
        mealType: mealType,
        timestamp: new Date().toISOString()
    };

    state.foodJournal[today].push(entry);

    // Sauvegarder
    if (typeof saveState === 'function') {
        saveState();
    }

    // Rafraîchir l'UI nutrition si disponible
    if (typeof updateNutritionUI === 'function') {
        updateNutritionUI();
    }
    if (typeof renderFoodJournal === 'function') {
        renderFoodJournal();
    }

    closeBarcodeScanner();
    showToast(`✅ ${foodData.name} ajouté (${quantity}g)`, 'success');

    if (window.HapticFeedback) {
        window.HapticFeedback.success();
    }

    // Cleanup
    delete window._scannedProduct;
}

/**
 * Déterminer le type de repas actuel selon l'heure
 */
function getCurrentMealType() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 10) return 'breakfast';
    if (hour >= 10 && hour < 14) return 'lunch';
    if (hour >= 14 && hour < 17) return 'snack';
    if (hour >= 17 && hour < 21) return 'dinner';
    return 'snack';
}

// Exporter les fonctions
window.BarcodeScanner = {
    open: openBarcodeScanner,
    close: closeBarcodeScanner,
    showManual: showManualBarcodeInput,
    retry: retryScanner
};

// Exports globaux pour les onclick HTML
window.openBarcodeScanner = openBarcodeScanner;
window.closeBarcodeScanner = closeBarcodeScanner;
window.showManualBarcodeInput = showManualBarcodeInput;
window.searchManualBarcode = searchManualBarcode;
window.retryScanner = retryScanner;
window.addScannedProductToJournal = addScannedProductToJournal;
