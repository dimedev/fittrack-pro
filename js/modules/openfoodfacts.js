// ==================== OPEN FOOD FACTS MODULE ====================

// Variables
let scannerStream = null;
let isScanning = false;

// ==================== API CALLS ====================

/**
 * Recherche un produit par code-barres
 * @param {string} barcode - Code-barres EAN
 * @returns {Promise<object|null>} - Produit formaté ou null
 */
async function searchByBarcode(barcode) {
    try {
        const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
        const data = await response.json();
        
        if (data.status === 1 && data.product) {
            return formatOFFProduct(data.product);
        }
        return null;
    } catch (error) {
        console.error('Erreur Open Food Facts:', error);
        return null;
    }
}

/**
 * Recherche des produits par nom
 * @param {string} query - Terme de recherche
 * @param {number} page - Page de résultats (défaut: 1)
 * @returns {Promise<array>} - Liste de produits formatés
 */
async function searchByName(query, page = 1) {
    try {
        // Utiliser l'API de recherche avec filtre France + données nutritionnelles complètes
        const url = new URL('https://world.openfoodfacts.org/cgi/search.pl');
        url.searchParams.set('search_terms', query);
        url.searchParams.set('search_simple', '1');
        url.searchParams.set('action', 'process');
        url.searchParams.set('json', '1');
        url.searchParams.set('page_size', '20');
        url.searchParams.set('page', page.toString());
        // Prioriser les produits avec données nutritionnelles
        url.searchParams.set('fields', 'code,product_name,product_name_fr,brands,image_small_url,nutriments,serving_size,nutrition_grades');
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.products && data.products.length > 0) {
            return data.products
                .filter(p => p.nutriments && (p.nutriments['energy-kcal_100g'] || p.nutriments.energy_100g))
                .map(p => formatOFFProduct(p))
                .filter(p => p !== null);
        }
        return [];
    } catch (error) {
        console.error('Erreur recherche Open Food Facts:', error);
        return [];
    }
}

/**
 * Formate un produit Open Food Facts vers notre format
 * @param {object} product - Produit brut de l'API
 * @returns {object|null} - Produit formaté
 */
function formatOFFProduct(product) {
    const nutriments = product.nutriments || {};
    
    // Obtenir les calories (peut être en kJ ou kcal)
    let calories = nutriments['energy-kcal_100g'];
    if (!calories && nutriments.energy_100g) {
        // Convertir kJ en kcal si nécessaire
        calories = Math.round(nutriments.energy_100g / 4.184);
    }
    
    // Si pas de calories, produit inutilisable
    if (!calories || calories <= 0) return null;
    
    const protein = Math.round((nutriments.proteins_100g || 0) * 10) / 10;
    const carbs = Math.round((nutriments.carbohydrates_100g || 0) * 10) / 10;
    const fat = Math.round((nutriments.fat_100g || 0) * 10) / 10;
    
    // Déterminer le nom (préférer le nom français)
    let name = product.product_name_fr || product.product_name || 'Produit inconnu';
    
    // Ajouter la marque si disponible
    if (product.brands) {
        const brand = product.brands.split(',')[0].trim();
        if (brand && !name.toLowerCase().includes(brand.toLowerCase())) {
            name = `${name} (${brand})`;
        }
    }
    
    // Limiter la longueur du nom
    if (name.length > 50) {
        name = name.substring(0, 47) + '...';
    }
    
    // Déterminer la catégorie automatiquement
    const category = guessCategory(protein, carbs, fat, name);
    
    return {
        id: `off-${product.code}`,
        barcode: product.code,
        name: name,
        calories: Math.round(calories),
        protein,
        carbs,
        fat,
        category,
        image: product.image_small_url || null,
        nutriscore: product.nutrition_grades || null,
        servingSize: product.serving_size || null,
        source: 'openfoodfacts'
    };
}

/**
 * Devine la catégorie d'un aliment basé sur ses macros
 */
function guessCategory(protein, carbs, fat, name) {
    const nameLower = name.toLowerCase();
    
    // Mots-clés pour catégories spécifiques
    if (nameLower.includes('lait') || nameLower.includes('yaourt') || nameLower.includes('fromage') || nameLower.includes('milk') || nameLower.includes('yogurt')) {
        return 'dairy';
    }
    if (nameLower.includes('fruit') || nameLower.includes('pomme') || nameLower.includes('banane') || nameLower.includes('orange') || nameLower.includes('jus')) {
        return 'fruit';
    }
    if (nameLower.includes('légume') || nameLower.includes('salade') || nameLower.includes('tomate') || nameLower.includes('carotte')) {
        return 'vegetable';
    }
    
    // Basé sur les macros
    const total = protein + carbs + fat;
    if (total === 0) return 'other';
    
    const proteinRatio = protein / total;
    const carbsRatio = carbs / total;
    const fatRatio = fat / total;
    
    if (proteinRatio > 0.4) return 'protein';
    if (carbsRatio > 0.5) return 'carbs';
    if (fatRatio > 0.5) return 'fat';
    
    return 'other';
}

// ==================== SCANNER CODE-BARRES ====================

/**
 * Démarre le scanner de code-barres
 */
async function startBarcodeScanner() {
    const videoContainer = document.getElementById('scanner-video-container');
    const video = document.getElementById('scanner-video');
    const statusEl = document.getElementById('scanner-status');
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast('Caméra non supportée sur ce navigateur', 'error');
        statusEl.textContent = 'Caméra non disponible';
        return;
    }
    
    try {
        statusEl.textContent = 'Démarrage de la caméra...';
        
        // Demander l'accès à la caméra arrière
        scannerStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        });
        
        video.srcObject = scannerStream;
        video.play();
        
        isScanning = true;
        videoContainer.style.display = 'block';
        statusEl.textContent = 'Pointez vers un code-barres...';
        
        // Démarrer la détection
        requestAnimationFrame(scanFrame);
        
    } catch (error) {
        console.error('Erreur caméra:', error);
        statusEl.textContent = 'Accès caméra refusé';
        showToast('Impossible d\'accéder à la caméra', 'error');
    }
}

/**
 * Arrête le scanner
 */
function stopBarcodeScanner() {
    isScanning = false;
    
    if (scannerStream) {
        scannerStream.getTracks().forEach(track => track.stop());
        scannerStream = null;
    }
    
    const video = document.getElementById('scanner-video');
    if (video) {
        video.srcObject = null;
    }
    
    const videoContainer = document.getElementById('scanner-video-container');
    if (videoContainer) {
        videoContainer.style.display = 'none';
    }
}

/**
 * Analyse une frame pour détecter un code-barres
 * Utilise l'API BarcodeDetector si disponible
 */
async function scanFrame() {
    if (!isScanning) return;
    
    const video = document.getElementById('scanner-video');
    
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
        requestAnimationFrame(scanFrame);
        return;
    }
    
    try {
        // Utiliser BarcodeDetector si disponible (Chrome, Edge)
        if ('BarcodeDetector' in window) {
            const barcodeDetector = new BarcodeDetector({
                formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e']
            });
            
            const barcodes = await barcodeDetector.detect(video);
            
            if (barcodes.length > 0) {
                const barcode = barcodes[0].rawValue;
                console.log('Code-barres détecté:', barcode);
                
                // Arrêter le scanner et rechercher le produit
                stopBarcodeScanner();
                await handleBarcodeDetected(barcode);
                return;
            }
        }
    } catch (error) {
        console.error('Erreur détection:', error);
    }
    
    // Continuer à scanner
    if (isScanning) {
        requestAnimationFrame(scanFrame);
    }
}

/**
 * Gère un code-barres détecté
 */
async function handleBarcodeDetected(barcode) {
    const statusEl = document.getElementById('scanner-status');
    const resultsEl = document.getElementById('off-search-results');
    
    statusEl.textContent = 'Recherche du produit...';
    resultsEl.innerHTML = '<div class="loading-spinner"></div>';
    
    const product = await searchByBarcode(barcode);
    
    if (product) {
        statusEl.textContent = `Produit trouvé : ${barcode}`;
        displayOFFResults([product]);
    } else {
        statusEl.textContent = 'Produit non trouvé';
        resultsEl.innerHTML = `
            <div class="empty-state" style="padding: 20px;">
                <div class="empty-state-icon">🔍</div>
                <div class="empty-state-title">Produit non trouvé</div>
                <p>Code-barres : ${barcode}</p>
                <p style="font-size: 0.85rem; color: var(--text-muted);">Ce produit n'est pas dans la base Open Food Facts</p>
            </div>
        `;
    }
}

// ==================== RECHERCHE MANUELLE ====================

let searchTimeout = null;

/**
 * Lance une recherche avec debounce
 */
function searchOFFProducts() {
    const query = document.getElementById('off-search-input').value.trim();
    const resultsEl = document.getElementById('off-search-results');
    const statusEl = document.getElementById('scanner-status');
    
    // Clear timeout précédent
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    
    if (query.length < 2) {
        resultsEl.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">Tapez au moins 2 caractères...</p>';
        return;
    }
    
    // Vérifier si c'est un code-barres (uniquement des chiffres, 8 ou 13 caractères)
    if (/^\d{8,13}$/.test(query)) {
        handleBarcodeDetected(query);
        return;
    }
    
    // Debounce de 300ms pour la recherche par nom
    searchTimeout = setTimeout(async () => {
        statusEl.textContent = 'Recherche en cours...';
        resultsEl.innerHTML = '<div style="text-align: center; padding: 20px;"><div class="loading-spinner"></div></div>';
        
        const products = await searchByName(query);
        
        if (products.length > 0) {
            statusEl.textContent = `${products.length} produit(s) trouvé(s)`;
            displayOFFResults(products);
        } else {
            statusEl.textContent = 'Aucun résultat';
            resultsEl.innerHTML = `
                <div class="empty-state" style="padding: 20px;">
                    <div class="empty-state-icon">🔍</div>
                    <div class="empty-state-title">Aucun produit trouvé</div>
                    <p style="font-size: 0.85rem; color: var(--text-muted);">Essayez avec d'autres mots-clés</p>
                </div>
            `;
        }
    }, 300);
}

// ==================== AFFICHAGE DES RÉSULTATS ====================

/**
 * Affiche les résultats de recherche
 */
function displayOFFResults(products) {
    const container = document.getElementById('off-search-results');
    
    container.innerHTML = products.map(product => {
        const nutriscoreHTML = product.nutriscore ? 
            `<span class="nutriscore nutriscore-${product.nutriscore}">${product.nutriscore.toUpperCase()}</span>` : '';
        
        return `
            <div class="off-product-item" onclick="selectOFFProduct('${product.barcode}')">
                ${product.image ? `<img src="${product.image}" alt="" class="off-product-image" onerror="this.style.display='none'">` : ''}
                <div class="off-product-info">
                    <div class="off-product-name">${product.name}</div>
                    <div class="off-product-macros">
                        <span>🔥 ${product.calories} kcal</span>
                        <span>P: ${product.protein}g</span>
                        <span>G: ${product.carbs}g</span>
                        <span>L: ${product.fat}g</span>
                        ${nutriscoreHTML}
                    </div>
                </div>
                <div class="off-product-add">
                    <span class="add-icon">+</span>
                </div>
            </div>
        `;
    }).join('');
}

// ==================== SÉLECTION ET AJOUT ====================

let selectedOFFProduct = null;

/**
 * Sélectionne un produit pour l'ajouter
 */
async function selectOFFProduct(barcode) {
    // Récupérer le produit complet
    const product = await searchByBarcode(barcode);
    
    if (!product) {
        showToast('Erreur lors de la récupération du produit', 'error');
        return;
    }
    
    selectedOFFProduct = product;
    
    // Afficher le modal de confirmation avec options
    const confirmEl = document.getElementById('off-confirm-section');
    const detailsEl = document.getElementById('off-product-details');
    
    detailsEl.innerHTML = `
        <div class="off-product-preview">
            ${product.image ? `<img src="${product.image}" alt="" class="off-preview-image">` : ''}
            <div class="off-preview-info">
                <div class="off-preview-name">${product.name}</div>
                <div class="off-preview-macros">
                    <div class="macro-item">
                        <span class="macro-value">${product.calories}</span>
                        <span class="macro-label">kcal</span>
                    </div>
                    <div class="macro-item protein">
                        <span class="macro-value">${product.protein}g</span>
                        <span class="macro-label">Protéines</span>
                    </div>
                    <div class="macro-item carbs">
                        <span class="macro-value">${product.carbs}g</span>
                        <span class="macro-label">Glucides</span>
                    </div>
                    <div class="macro-item fat">
                        <span class="macro-value">${product.fat}g</span>
                        <span class="macro-label">Lipides</span>
                    </div>
                </div>
                ${product.servingSize ? `<p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 8px;">Portion : ${product.servingSize}</p>` : ''}
            </div>
        </div>
        
        <div class="form-group" style="margin-top: 15px;">
            <label class="form-label">Catégorie</label>
            <select class="form-select" id="off-category">
                <option value="protein" ${product.category === 'protein' ? 'selected' : ''}>🥩 Protéines</option>
                <option value="carbs" ${product.category === 'carbs' ? 'selected' : ''}>🍚 Glucides</option>
                <option value="fat" ${product.category === 'fat' ? 'selected' : ''}>🥑 Lipides</option>
                <option value="vegetable" ${product.category === 'vegetable' ? 'selected' : ''}>🥦 Légumes</option>
                <option value="fruit" ${product.category === 'fruit' ? 'selected' : ''}>🍎 Fruits</option>
                <option value="dairy" ${product.category === 'dairy' ? 'selected' : ''}>🥛 Produits Laitiers</option>
                <option value="other" ${product.category === 'other' ? 'selected' : ''}>📦 Autre</option>
            </select>
        </div>
        
        <div class="form-group">
            <label class="form-label">Que voulez-vous faire ?</label>
            <div style="display: flex; flex-direction: column; gap: 10px;">
                <button class="btn btn-primary" onclick="addOFFToFoods()" style="width: 100%;">
                    ➕ Ajouter à ma base d'aliments
                </button>
                <button class="btn btn-secondary" onclick="addOFFToJournal()" style="width: 100%;">
                    📝 Ajouter au journal du jour
                </button>
            </div>
        </div>
    `;
    
    confirmEl.style.display = 'block';
    
    // Scroll vers la confirmation
    confirmEl.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Ajoute le produit sélectionné à la base d'aliments
 */
function addOFFToFoods() {
    if (!selectedOFFProduct) return;
    
    // Mettre à jour la catégorie si modifiée
    const category = document.getElementById('off-category').value;
    selectedOFFProduct.category = category;
    
    // Vérifier si l'aliment existe déjà
    const existingFood = state.foods.find(f => f.barcode === selectedOFFProduct.barcode);
    
    if (existingFood) {
        showToast('Cet aliment est déjà dans votre base', 'info');
        closeModal('off-search-modal');
        return;
    }
    
    // Ajouter à la base d'aliments
    const newFood = {
        id: selectedOFFProduct.id,
        barcode: selectedOFFProduct.barcode,
        name: selectedOFFProduct.name,
        calories: selectedOFFProduct.calories,
        protein: selectedOFFProduct.protein,
        carbs: selectedOFFProduct.carbs,
        fat: selectedOFFProduct.fat,
        category: selectedOFFProduct.category,
        source: 'openfoodfacts',
        mealTags: [] // L'utilisateur pourra les configurer plus tard
    };
    
    state.foods.push(newFood);
    saveState();
    
    // Sync avec Supabase si connecté
    if (typeof isLoggedIn === 'function' && isLoggedIn()) {
        saveCustomFoodToSupabase(newFood);
    }
    
    closeModal('off-search-modal');
    renderFoodsList();
    showToast(`${newFood.name} ajouté à votre base ! 🎉`, 'success');
}

/**
 * Ajoute le produit sélectionné au journal du jour
 */
function addOFFToJournal() {
    if (!selectedOFFProduct) return;
    
    // Fermer le modal OFF
    closeModal('off-search-modal');
    
    // D'abord ajouter à la base si pas déjà présent
    if (!state.foods.find(f => f.barcode === selectedOFFProduct.barcode)) {
        const category = document.getElementById('off-category').value;
        selectedOFFProduct.category = category;
        
        const newFood = {
            id: selectedOFFProduct.id,
            barcode: selectedOFFProduct.barcode,
            name: selectedOFFProduct.name,
            calories: selectedOFFProduct.calories,
            protein: selectedOFFProduct.protein,
            carbs: selectedOFFProduct.carbs,
            fat: selectedOFFProduct.fat,
            category: selectedOFFProduct.category,
            source: 'openfoodfacts',
            mealTags: []
        };
        
        state.foods.push(newFood);
        saveState();
    }
    
    // Ouvrir le modal de quantité pour le journal
    // On simule le comportement du journal
    const food = state.foods.find(f => f.barcode === selectedOFFProduct.barcode);
    if (food && typeof addFoodToJournalWithQuantity === 'function') {
        // Si la fonction existe dans nutrition.js
        openJournalQuantityModal(food);
    } else {
        showToast(`${selectedOFFProduct.name} ajouté à votre base ! Allez dans le Journal pour l'ajouter.`, 'success');
    }
}

/**
 * Ouvre le modal de quantité pour le journal
 */
function openJournalQuantityModal(food) {
    selectedFoodForAdd = food;
    
    document.getElementById('quantity-food-info').innerHTML = `
        <div style="background: var(--bg-tertiary); padding: 12px; border-radius: 8px;">
            <strong>${food.name}</strong>
            <div class="food-search-macros" style="margin-top: 8px;">
                <span>🔥 ${food.calories} kcal/100g</span>
                <span>P: ${food.protein}g</span>
                <span>G: ${food.carbs}g</span>
                <span>L: ${food.fat}g</span>
            </div>
        </div>
    `;
    
    document.getElementById('food-quantity').value = 100;
    
    // Modifier temporairement le comportement de confirmAddFood
    window._offJournalMode = true;
    
    openModal('quantity-modal');
}

// ==================== MODAL OPEN FOOD FACTS ====================

/**
 * Ouvre le modal de recherche Open Food Facts
 */
function openOFFSearchModal() {
    // Réinitialiser
    document.getElementById('off-search-input').value = '';
    document.getElementById('off-search-results').innerHTML = `
        <div class="off-intro">
            <div class="off-intro-icon">🔍</div>
            <p>Recherchez un aliment par <strong>nom</strong> ou <strong>code-barres</strong></p>
            <p style="font-size: 0.85rem; color: var(--text-muted);">
                Les données proviennent de la base Open Food Facts
            </p>
        </div>
    `;
    document.getElementById('off-confirm-section').style.display = 'none';
    document.getElementById('scanner-status').textContent = '';
    
    // Arrêter le scanner si actif
    stopBarcodeScanner();
    
    openModal('off-search-modal');
}

/**
 * Ferme le modal et nettoie
 */
function closeOFFSearchModal() {
    stopBarcodeScanner();
    selectedOFFProduct = null;
    closeModal('off-search-modal');
}
