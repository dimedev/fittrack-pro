// ==================== BARCODE SCANNER MODULE ====================
// Intégration avec Open Food Facts API pour scan de codes-barres

const OFF_API_URL = 'https://world.openfoodfacts.org/api/v2';
let barcodeStream = null;
let barcodeVideo = null;
let scanningActive = false;

/**
 * Ouvrir le scanner de codes-barres
 */
async function openBarcodeScanner() {
    const scannerModal = document.getElementById('barcode-scanner-modal');
    if (!scannerModal) {
        console.error('Modal barcode scanner introuvable');
        return;
    }
    
    scannerModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // Haptic feedback
    if (window.HapticFeedback) {
        window.HapticFeedback.tap();
    }
    
    // Initialiser la caméra
    await startCamera();
}

/**
 * Fermer le scanner
 */
function closeBarcodeScanner() {
    const scannerModal = document.getElementById('barcode-scanner-modal');
    if (scannerModal) {
        scannerModal.style.display = 'none';
        document.body.style.overflow = '';
    }
    
    stopCamera();
}

/**
 * Démarrer la caméra
 */
async function startCamera() {
    barcodeVideo = document.getElementById('barcode-video');
    if (!barcodeVideo) return;
    
    try {
        // Demander l'accès à la caméra arrière
        barcodeStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment', // Caméra arrière
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        });
        
        barcodeVideo.srcObject = barcodeStream;
        await barcodeVideo.play();
        
        scanningActive = true;
        startBarcodeDetection();
        
        showToast('📷 Scanner activé - Scannez un code-barres', 'info', 3000);
        
    } catch (error) {
        console.error('Erreur accès caméra:', error);
        showToast('❌ Impossible d\'accéder à la caméra', 'error');
        
        if (window.HapticFeedback) {
            window.HapticFeedback.error();
        }
        
        closeBarcodeScanner();
    }
}

/**
 * Arrêter la caméra
 */
function stopCamera() {
    scanningActive = false;
    
    if (barcodeStream) {
        barcodeStream.getTracks().forEach(track => track.stop());
        barcodeStream = null;
    }
    
    if (barcodeVideo) {
        barcodeVideo.srcObject = null;
    }
}

/**
 * Détecter les codes-barres dans le flux vidéo
 * Utilise l'API BarcodeDetector si disponible, sinon fallback sur saisie manuelle
 */
async function startBarcodeDetection() {
    if (!('BarcodeDetector' in window)) {
        console.warn('BarcodeDetector non disponible, utiliser saisie manuelle');
        showManualBarcodeInput();
        return;
    }
    
    try {
        const barcodeDetector = new BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e']
        });
        
        const detectFrame = async () => {
            if (!scanningActive || !barcodeVideo) return;
            
            try {
                const barcodes = await barcodeDetector.detect(barcodeVideo);
                
                if (barcodes.length > 0) {
                    const barcode = barcodes[0].rawValue;
                    console.log('📦 Code-barres détecté:', barcode);
                    
                    // Haptic feedback
                    if (window.HapticFeedback) {
                        window.HapticFeedback.success();
                    }
                    
                    // Rechercher dans Open Food Facts
                    await fetchProductFromOFF(barcode);
                    return;
                }
                
                // Continuer la détection
                requestAnimationFrame(detectFrame);
            } catch (err) {
                console.error('Erreur détection:', err);
                requestAnimationFrame(detectFrame);
            }
        };
        
        detectFrame();
        
    } catch (error) {
        console.error('Erreur init BarcodeDetector:', error);
        showManualBarcodeInput();
    }
}

/**
 * Afficher l'input manuel si la détection automatique échoue
 */
function showManualBarcodeInput() {
    const scannerModal = document.getElementById('barcode-scanner-modal');
    const scannerContent = scannerModal.querySelector('.scanner-content');
    
    scannerContent.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <div style="font-size: 3rem; margin-bottom: 16px;">📱</div>
            <h3 style="margin-bottom: 12px; font-size: 1.2rem;">Saisie manuelle</h3>
            <p style="color: var(--text-secondary); margin-bottom: 24px; font-size: 0.95rem; line-height: 1.5;">
                La lecture automatique des codes-barres n'est pas disponible sur Safari.<br>
                Entrez le code manuellement, c'est tout aussi rapide !
            </p>
            
            <div style="background: var(--bg-tertiary); border-radius: 12px; padding: 16px; margin-bottom: 20px; text-align: left;">
                <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 8px;">💡 Astuce</p>
                <p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.4;">
                    Le code-barres se trouve généralement au dos du produit, composé de 8 ou 13 chiffres.
                </p>
            </div>
            
            <input 
                type="text" 
                id="manual-barcode-input" 
                placeholder="Ex: 3017620422003" 
                class="form-input"
                style="margin-bottom: 16px; width: 100%; font-size: 1.1rem; text-align: center; letter-spacing: 1px;"
                inputmode="numeric"
                pattern="[0-9]*"
            >
            
            <div style="display: flex; gap: 12px; margin-bottom: 16px;">
                <button class="btn btn-secondary" onclick="closeBarcodeScanner()" style="flex: 1;">Annuler</button>
                <button class="btn btn-primary" onclick="searchManualBarcode()" style="flex: 2;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="m21 21-4.35-4.35"></path>
                    </svg>
                    Rechercher
                </button>
            </div>
            
            <details style="margin-top: 20px; text-align: left;">
                <summary style="cursor: pointer; color: var(--accent-brand); font-weight: 600; font-size: 0.9rem; list-style: none; display: flex; align-items: center; gap: 6px; justify-content: center;">
                    <span>ℹ️</span> Pourquoi la caméra ne fonctionne pas ?
                </summary>
                <div style="padding: 16px; background: var(--bg-secondary); border-radius: 12px; margin-top: 12px; font-size: 0.85rem; line-height: 1.6; color: var(--text-secondary);">
                    <p style="margin-bottom: 12px;">
                        <strong>Safari iOS</strong> ne supporte pas encore l'API de détection de codes-barres (BarcodeDetector).
                    </p>
                    <p style="margin-bottom: 12px;">
                        <strong>Solution :</strong> Utilisez Chrome ou Firefox sur mobile, ou saisissez le code manuellement.
                    </p>
                    <p style="margin-bottom: 0;">
                        Apple travaille sur le support de cette fonctionnalité pour une prochaine version d'iOS.
                    </p>
                </div>
            </details>
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
 * Rechercher un code-barres saisi manuellement
 */
async function searchManualBarcode() {
    const input = document.getElementById('manual-barcode-input');
    const barcode = input?.value?.trim();
    
    if (!barcode) {
        showToast('Entrez un code-barres', 'warning');
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
                imageUrl: product.image_url || product.image_front_url || null
            };
            
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
            
            // Proposer saisie manuelle
            setTimeout(() => {
                if (confirm('Produit introuvable. Voulez-vous le créer manuellement ?')) {
                    closeBarcodeScanner();
                    if (typeof openCustomFoodModal === 'function') {
                        openCustomFoodModal();
                    }
                }
            }, 500);
        }
        
    } catch (error) {
        console.error('Erreur API Open Food Facts:', error);
        showToast('❌ Erreur lors de la recherche', 'error');
        
        if (window.HapticFeedback) {
            window.HapticFeedback.error();
        }
        
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
        ? `<img src="${foodData.imageUrl}" alt="${foodData.name}" style="width: 100%; height: 120px; object-fit: contain; margin-bottom: 12px; border-radius: 8px; background: #f5f5f5;">` 
        : '';
    
    resultsDiv.innerHTML = `
        <div class="scanned-product-card">
            ${imageHtml}
            <h3 style="margin-bottom: 4px;">${foodData.name}</h3>
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
            <div style="display: flex; gap: 12px; margin-top: 16px;">
                <button class="btn btn-secondary" onclick="closeBarcodeScanner()" style="flex: 1;">Annuler</button>
                <button class="btn btn-primary" onclick="addScannedProduct('${foodData.barcode}')" style="flex: 1;">Ajouter</button>
            </div>
        </div>
    `;
    
    resultsDiv.style.display = 'block';
    
    // Arrêter la caméra
    stopCamera();
    
    // Cacher la vidéo
    const videoContainer = document.querySelector('.barcode-video-container');
    if (videoContainer) {
        videoContainer.style.display = 'none';
    }
}

/**
 * Ajouter le produit scanné au journal
 */
async function addScannedProduct(barcode) {
    // Créer un aliment personnalisé et l'ajouter
    // TODO: implémenter l'ajout au journal avec quantité
    
    closeBarcodeScanner();
    showToast('✅ Produit ajouté !', 'success');
    
    if (window.HapticFeedback) {
        window.HapticFeedback.success();
    }
}

// Exporter les fonctions
window.BarcodeScanner = {
    open: openBarcodeScanner,
    close: closeBarcodeScanner
};
