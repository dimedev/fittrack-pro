// ==================== FOOD API MODULE ====================
// Recherche d'aliments via Open Food Facts API
// Version 1.0

(function() {
    'use strict';

    // ==================== CONFIGURATION ====================

    const OFF_SEARCH_URL = 'https://world.openfoodfacts.org/cgi/search.pl';
    const OFF_PRODUCT_URL = 'https://world.openfoodfacts.org/api/v0/product/';

    // Cache pour éviter les requêtes répétées
    const searchCache = new Map();
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    // ==================== RECHERCHE ====================

    /**
     * Recherche des aliments via Open Food Facts
     * @param {string} query - Terme de recherche
     * @param {number} limit - Nombre max de résultats
     * @returns {Promise<Array>} Liste des aliments trouvés
     */
    async function searchOpenFoodFacts(query, limit = 15) {
        if (!query || query.length < 2) return [];

        // Vérifier le cache
        const cacheKey = `search:${query.toLowerCase()}`;
        const cached = searchCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
            return cached.results;
        }

        try {
            const params = new URLSearchParams({
                search_terms: query,
                search_simple: 1,
                action: 'process',
                json: 1,
                page_size: limit,
                fields: 'code,product_name,brands,nutriments,image_front_small_url,quantity,categories_tags',
                // Prioriser les produits français
                tagtype_0: 'countries',
                tag_contains_0: 'contains',
                tag_0: 'france'
            });

            const response = await fetch(`${OFF_SEARCH_URL}?${params}`, {
                headers: {
                    'User-Agent': 'Repzy/1.0 (fitness app)'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            const results = (data.products || [])
                .filter(p => p.product_name && p.nutriments)
                .map(normalizeOFFProduct);

            // Mettre en cache
            searchCache.set(cacheKey, {
                results,
                timestamp: Date.now()
            });

            return results;

        } catch (error) {
            console.error('Erreur recherche OFF:', error);
            return [];
        }
    }

    /**
     * Récupère un produit par code-barres
     * @param {string} barcode - Code-barres EAN
     * @returns {Promise<Object|null>} Produit ou null
     */
    async function getProductByBarcode(barcode) {
        if (!barcode) return null;

        // Vérifier le cache
        const cacheKey = `barcode:${barcode}`;
        const cached = searchCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
            return cached.result;
        }

        try {
            const response = await fetch(`${OFF_PRODUCT_URL}${barcode}.json`, {
                headers: {
                    'User-Agent': 'Repzy/1.0 (fitness app)'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            if (data.status !== 1 || !data.product) {
                return null;
            }

            const result = normalizeOFFProduct(data.product);

            // Mettre en cache
            searchCache.set(cacheKey, {
                result,
                timestamp: Date.now()
            });

            return result;

        } catch (error) {
            console.error('Erreur lecture produit OFF:', error);
            return null;
        }
    }

    // ==================== NORMALISATION ====================

    /**
     * Normalise un produit OFF vers le format Repzy
     * @param {Object} product - Produit brut OFF
     * @returns {Object} Aliment formaté pour Repzy
     */
    function normalizeOFFProduct(product) {
        const nutriments = product.nutriments || {};

        // Extraire les valeurs nutritionnelles (pour 100g)
        const calories = Math.round(nutriments['energy-kcal_100g'] || nutriments['energy_100g'] / 4.184 || 0);
        const protein = Math.round((nutriments.proteins_100g || 0) * 10) / 10;
        const carbs = Math.round((nutriments.carbohydrates_100g || 0) * 10) / 10;
        const fat = Math.round((nutriments.fat_100g || 0) * 10) / 10;

        // Construire le nom
        let name = product.product_name || 'Produit inconnu';
        if (product.brands) {
            name = `${name} (${product.brands.split(',')[0]})`;
        }

        // Déterminer la catégorie
        const category = inferCategory(product.categories_tags || [], nutriments);

        return {
            id: `off-${product.code}`,
            name: name.substring(0, 60), // Limiter la longueur
            barcode: product.code,
            calories,
            protein,
            carbs,
            fat,
            category,
            source: 'openfoodfacts',
            image: product.image_front_small_url || null,
            quantity: product.quantity || null
        };
    }

    /**
     * Infère la catégorie d'un aliment
     * @param {Array} tags - Tags de catégorie OFF
     * @param {Object} nutriments - Données nutritionnelles
     * @returns {string} Catégorie Repzy
     */
    function inferCategory(tags, nutriments) {
        const tagsStr = tags.join(',').toLowerCase();

        // Ordre de priorité des catégories
        if (tagsStr.includes('viande') || tagsStr.includes('meat') ||
            tagsStr.includes('poisson') || tagsStr.includes('fish') ||
            tagsStr.includes('oeuf') || tagsStr.includes('egg')) {
            return 'protein';
        }

        if (tagsStr.includes('lait') || tagsStr.includes('dairy') ||
            tagsStr.includes('fromage') || tagsStr.includes('cheese') ||
            tagsStr.includes('yaourt') || tagsStr.includes('yogurt')) {
            return 'dairy';
        }

        if (tagsStr.includes('légume') || tagsStr.includes('vegetable')) {
            return 'vegetable';
        }

        if (tagsStr.includes('fruit')) {
            return 'fruit';
        }

        if (tagsStr.includes('céréale') || tagsStr.includes('cereal') ||
            tagsStr.includes('pain') || tagsStr.includes('bread') ||
            tagsStr.includes('pâte') || tagsStr.includes('pasta') ||
            tagsStr.includes('riz') || tagsStr.includes('rice')) {
            return 'carbs';
        }

        if (tagsStr.includes('huile') || tagsStr.includes('oil') ||
            tagsStr.includes('beurre') || tagsStr.includes('butter') ||
            tagsStr.includes('noix') || tagsStr.includes('nut')) {
            return 'fat';
        }

        // Fallback basé sur les macros
        if (nutriments.proteins_100g > 15) return 'protein';
        if (nutriments.carbohydrates_100g > 40) return 'carbs';
        if (nutriments.fat_100g > 30) return 'fat';

        return 'other';
    }

    // ==================== INTÉGRATION RECHERCHE ====================

    /**
     * Recherche hybride: local + Open Food Facts
     * @param {string} query - Terme de recherche
     * @returns {Promise<Object>} Résultats locaux et OFF
     */
    async function hybridSearch(query) {
        if (!query || query.length < 2) {
            return { local: [], online: [], combined: [] };
        }

        // Recherche locale (synchrone)
        const normalizedQuery = query.toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/œ/g, 'oe')
            .replace(/æ/g, 'ae');

        const localResults = (typeof state !== 'undefined' ? state.foods : [])
            .filter(f => {
                const normalizedName = f.name.toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/œ/g, 'oe')
                    .replace(/æ/g, 'ae');
                return normalizedName.includes(normalizedQuery);
            })
            .slice(0, 8);

        // Recherche Open Food Facts (async)
        let onlineResults = [];
        try {
            onlineResults = await searchOpenFoodFacts(query, 10);
        } catch (e) {
            console.warn('Recherche OFF échouée:', e);
        }

        // Combiner: locaux d'abord, puis OFF sans doublons
        const localIds = new Set(localResults.map(f => f.barcode || f.id));
        const filteredOnline = onlineResults.filter(f => !localIds.has(f.barcode));

        return {
            local: localResults,
            online: filteredOnline,
            combined: [...localResults, ...filteredOnline].slice(0, 15)
        };
    }

    /**
     * Ajoute un aliment OFF à la base locale
     * @param {Object} offFood - Aliment OFF normalisé
     * @returns {Object} Aliment ajouté au state
     */
    function addOFFToLocalFoods(offFood) {
        if (!offFood || !offFood.id) return null;

        // Vérifier si déjà présent
        const existing = state.foods.find(f => f.id === offFood.id || f.barcode === offFood.barcode);
        if (existing) {
            return existing;
        }

        // Créer l'aliment local
        const localFood = {
            ...offFood,
            addedAt: Date.now(),
            isCustom: false,
            source: 'openfoodfacts'
        };

        state.foods.push(localFood);
        saveState();

        return localFood;
    }

    // ==================== PUBLIC API ====================

    window.FoodAPI = {
        search: searchOpenFoodFacts,
        getByBarcode: getProductByBarcode,
        hybridSearch,
        addToLocal: addOFFToLocalFoods,
        clearCache: () => searchCache.clear()
    };

    console.log('🍎 Food API module loaded');

})();
