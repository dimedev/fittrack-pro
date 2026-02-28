// ==================== TRAINING SWAP (Exercise swap + variants) ====================
// Dépend de : training-shared.js (previewSession, fsSession, _fsSwapMode, _freePickerMode, _quickLogPickerMode, pendingSwap, swapSheetSwipeInitialized, etc.)

/**
 * Ouvre le bottom sheet pour changer un exercice
 * Version améliorée avec sections hiérarchiques et recherche
 */
function openExerciseSwapSheet(exerciseIndex) {
    const exercise = previewSession.exercises[exerciseIndex];
    if (!exercise) return;

    _fsSwapMode = false;

    // Cacher la section variante (pas en FS mode)
    const variantSection = document.getElementById('swap-variant-section');
    if (variantSection) variantSection.style.display = 'none';

    // Stocker l'index et l'exercice ID pour le swap
    previewSession.currentSwapIndex = exerciseIndex;
    const originalExerciseId = getExerciseIdByName(exercise.originalName, exercise.muscle);
    previewSession.currentSwapExerciseId = originalExerciseId;

    // Nom actuel
    const displayName = exercise.swappedName || exercise.originalName;
    document.getElementById('swap-current-name').textContent = displayName;

    // Réinitialiser la recherche
    const searchInput = document.getElementById('swap-search-input');
    if (searchInput) {
        searchInput.value = '';
    }

    // Obtenir les exercices équivalents et du même muscle
    const favoriteExercises = state.wizardResults?.favoriteExercises || [];
    const exerciseData = getEquivalentExercises(originalExerciseId, favoriteExercises);

    // Stocker pour la recherche
    previewSession.swapExerciseData = exerciseData;

    // Render les sections
    renderSwapSections(exerciseData.equivalents, exerciseData.sameMuscle, []);

    // Afficher le bottom sheet avec animation iOS-like
    const sheet = document.getElementById('swap-bottom-sheet');
    sheet.style.display = 'flex';
    sheet.offsetHeight;
    sheet.classList.remove('animate-in');
    void sheet.offsetWidth;
    sheet.classList.add('animate-in');

    // Initialiser le swipe to dismiss
    initSwapSheetSwipe();
}

/**
 * Render les sections du swap bottom sheet
 */
function renderSwapSections(equivalents, sameMuscle, searchResults) {
    const container = document.getElementById('swap-options-list');
    const searchResultsSection = document.getElementById('swap-search-results');
    const sectionsContainer = document.getElementById('swap-sections');

    // Si on a des résultats de recherche, les afficher
    if (searchResults && searchResults.length > 0) {
        if (searchResultsSection) searchResultsSection.style.display = 'block';
        if (sectionsContainer) sectionsContainer.style.display = 'none';

        if (searchResultsSection) {
            searchResultsSection.innerHTML = `
                <div class="swap-section">
                    <div class="swap-section-header">
                        <span class="swap-section-icon">🔍</span>
                        <span class="swap-section-title">Résultats de recherche</span>
                        <span class="swap-section-count">${searchResults.length}</span>
                    </div>
                    <div class="swap-section-list">
                        ${renderSwapItems(searchResults)}
                    </div>
                </div>
            `;
        }
        return;
    }

    // Sinon, afficher les sections normales
    if (searchResultsSection) searchResultsSection.style.display = 'none';
    if (sectionsContainer) sectionsContainer.style.display = 'block';

    let html = '';

    // Section 1: Exercices équivalents (même pattern)
    if (equivalents && equivalents.length > 0) {
        html += `
            <div class="swap-section">
                <div class="swap-section-header">
                    <span class="swap-section-icon">⚡</span>
                    <span class="swap-section-title">Exercices équivalents</span>
                    <span class="swap-section-count">${equivalents.length}</span>
                </div>
                <p class="swap-section-subtitle">Même mouvement, résultats similaires</p>
                <div class="swap-section-list">
                    ${renderSwapItems(equivalents)}
                </div>
            </div>
        `;
    }

    // Section 2: Autres exercices du même muscle
    if (sameMuscle && sameMuscle.length > 0) {
        const currentExercise = previewSession.exercises[previewSession.currentSwapIndex];
        const muscleName = muscleGroups[currentExercise?.muscle]?.name || 'ce muscle';

        html += `
            <div class="swap-section">
                <div class="swap-section-header">
                    <span class="swap-section-icon">💪</span>
                    <span class="swap-section-title">Autres exercices ${muscleName}</span>
                    <span class="swap-section-count">${sameMuscle.length}</span>
                </div>
                <p class="swap-section-subtitle">Même groupe musculaire</p>
                <div class="swap-section-list">
                    ${renderSwapItems(sameMuscle)}
                </div>
            </div>
        `;
    }

    // Message si aucun exercice
    if ((!equivalents || equivalents.length === 0) && (!sameMuscle || sameMuscle.length === 0)) {
        html = `
            <div class="empty-state" style="padding: 30px;">
                <p style="color: var(--text-muted);">Utilise la recherche pour trouver un exercice</p>
            </div>
        `;
    }

    if (sectionsContainer) {
        sectionsContainer.innerHTML = html;
    }
}

/**
 * Render les items d'une section de swap
 */
function renderSwapItems(exercises) {
    if (!exercises || exercises.length === 0) return '';

    return exercises.map(eq => `
        <div class="swap-option-item ${eq.isFavorite ? 'is-favorite' : ''}"
             onclick="swapExerciseInPreview('${eq.id}')">
            <div class="swap-option-info">
                <span class="swap-option-name">
                    ${eq.name}
                    ${eq.isFavorite ? '<span class="swap-option-favorite-badge">★</span>' : ''}
                </span>
                <span class="swap-option-muscle">${muscleGroups[eq.muscle]?.name || eq.muscle}</span>
            </div>
            <span class="swap-option-equip">${equipmentTypes[eq.equipment] || eq.equipment}</span>
        </div>
    `).join('');
}

/**
 * Gère la recherche dans le swap bottom sheet
 */
function handleSwapSearch(query) {
    const favoriteExercises = state.wizardResults?.favoriteExercises || [];
    const excludeId = previewSession.currentSwapExerciseId;

    // Afficher/masquer le bouton clear
    const clearBtn = document.querySelector('.swap-search-clear');
    if (clearBtn) {
        clearBtn.style.display = query && query.length > 0 ? 'flex' : 'none';
    }

    if (!query || query.length < 2) {
        // Réafficher les sections normales
        const exerciseData = previewSession.swapExerciseData;
        if (exerciseData) {
            renderSwapSections(exerciseData.equivalents, exerciseData.sameMuscle, []);
        }
        return;
    }

    // Rechercher les exercices
    const results = searchExercises(query, excludeId, favoriteExercises);
    renderSwapSections([], [], results);
}

/**
 * Efface la recherche et revient aux sections
 */
function clearSwapSearch() {
    const searchInput = document.getElementById('swap-search-input');
    if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
    }

    // Masquer le bouton clear
    const clearBtn = document.querySelector('.swap-search-clear');
    if (clearBtn) {
        clearBtn.style.display = 'none';
    }

    const exerciseData = previewSession.swapExerciseData;
    if (exerciseData) {
        renderSwapSections(exerciseData.equivalents, exerciseData.sameMuscle, []);
    }
}

/**
 * Ferme le bottom sheet
 */
function closeBottomSheet() {
    if (window.ModalManager) ModalManager.unlock('swap-bottom-sheet');
    document.getElementById('swap-bottom-sheet').style.display = 'none';
}

/**
 * Swap un exercice dans l'aperçu
 * Détecte si le type d'exercice change et propose une adaptation des paramètres
 */
function swapExerciseInPreview(exerciseId) {
    const exercise = state.exercises.find(e => e.id === exerciseId);
    if (!exercise) return;

    // Si on est en mode Quick Log, affecter l'exercice
    if (_quickLogPickerMode) {
        _quickLogPickerMode = false;
        const titleEl = document.querySelector('#swap-bottom-sheet .bottom-sheet-title');
        if (titleEl) titleEl.textContent = 'Remplacer l\'exercice';
        const currentSection = document.querySelector('.swap-current-exercise');
        if (currentSection) currentSection.style.display = '';
        setQuickLogExercise(exerciseId);
        return;
    }

    // Si on est en mode sélection séance libre, ajouter l'exercice
    if (_freePickerMode) {
        _freePickerMode = false;
        // Restaurer le titre du swap sheet
        const titleEl = document.querySelector('#swap-bottom-sheet .bottom-sheet-title');
        if (titleEl) titleEl.textContent = 'Remplacer l\'exercice';
        const currentExerciseSection = document.querySelector('.swap-current-exercise');
        if (currentExerciseSection) currentExerciseSection.style.display = '';
        addExerciseToFreeSession(exerciseId);
        return;
    }

    // Si on est en mode full-screen swap, déléguer
    if (_fsSwapMode) {
        _fsSwapMode = false;
        applyFsExerciseSwap(exerciseId, exercise.name);
        return;
    }

    if (previewSession.currentSwapIndex === null) return;

    const idx = previewSession.currentSwapIndex;
    const currentExercise = previewSession.exercises[idx];

    // Récupérer l'ID original (soit swappedId si déjà modifié, soit l'original)
    const originalId = currentExercise.swappedId || previewSession.currentSwapExerciseId;

    // Détecter si le type d'exercice change
    const typeChange = detectTypeChange(originalId, exerciseId);

    if (typeChange.changed) {
        // Stocker le swap en attente
        pendingSwap = {
            exerciseId: exerciseId,
            exerciseName: exercise.name,
            idx: idx,
            fromType: typeChange.from,
            toType: typeChange.to,
            originalSets: currentExercise.sets,
            originalReps: currentExercise.reps
        };

        // Récupérer les paramètres suggérés (hypertrophie par défaut)
        const suggested = getSuggestedParams(exerciseId, 'hypertrophy');

        // Fermer le sheet de swap et afficher le sheet de confirmation
        closeBottomSheet();
        showParamsConfirmationSheet(exercise.name, typeChange.to, suggested, currentExercise);
    } else {
        // Pas de changement de type, faire le swap direct
        executeSwap(exerciseId, exercise.name, idx);
    }
}

/**
 * Exécute le swap d'exercice (sans modification des paramètres)
 */
function executeSwap(exerciseId, exerciseName, idx) {
    previewSession.exercises[idx].swappedId = exerciseId;
    previewSession.exercises[idx].swappedName = exerciseName;
    previewSession.exercises[idx].isModified = true;
    previewSession.hasChanges = true;

    closeBottomSheet();
    closeParamsConfirmationSheet();
    showToast(`Exercice changé pour ${exerciseName}`, 'success');

    // Re-render UI + Brief (pour mettre à jour les suggestions)
    renderSessionPreviewUI();
    generateSessionBrief();
}

/**
 * Exécute le swap avec les nouveaux paramètres suggérés
 */
function executeSwapWithParams(exerciseId, exerciseName, idx, newSets, newRepsMin, newRepsMax) {
    previewSession.exercises[idx].swappedId = exerciseId;
    previewSession.exercises[idx].swappedName = exerciseName;
    previewSession.exercises[idx].sets = newSets;
    previewSession.exercises[idx].reps = `${newRepsMin}-${newRepsMax}`;
    previewSession.exercises[idx].isModified = true;
    previewSession.hasChanges = true;

    closeParamsConfirmationSheet();
    showToast(`${exerciseName} : ${newSets}x${newRepsMin}-${newRepsMax}`, 'success');

    // Re-render UI + Brief (pour mettre à jour les suggestions)
    renderSessionPreviewUI();
    generateSessionBrief();
}

// ==================== FS EXERCISE SWAP (DURING SESSION) ====================

/**
 * Ouvre le swap bottom sheet pour l'exercice en cours dans le full-screen session.
 * Réutilise le même bottom sheet que le preview, avec un flag pour le callback.
 */
function openFsExerciseSwap() {
    if (!fsSession.active) return;

    const exercise = fsSession.exercises[fsSession.currentExerciseIndex];
    if (!exercise) return;

    _fsSwapMode = true;

    // Construire un faux previewSession context pour réutiliser le swap sheet
    const originalExerciseId = getExerciseIdByName(exercise.effectiveName, exercise.muscle);
    previewSession.currentSwapIndex = fsSession.currentExerciseIndex;
    previewSession.currentSwapExerciseId = originalExerciseId;

    // Nom actuel
    const nameEl = document.getElementById('swap-current-name');
    if (nameEl) nameEl.textContent = exercise.effectiveName;

    // Réinitialiser la recherche
    const searchInput = document.getElementById('swap-search-input');
    if (searchInput) searchInput.value = '';

    // Afficher la section variante (FS mode only)
    const variantSection = document.getElementById('swap-variant-section');
    if (variantSection) variantSection.style.display = 'block';
    const variantInput = document.getElementById('swap-variant-input');
    if (variantInput) variantInput.value = '';

    // Obtenir les exercices équivalents
    const favoriteExercises = state.wizardResults?.favoriteExercises || [];
    const exerciseData = getEquivalentExercises(originalExerciseId, favoriteExercises);
    previewSession.swapExerciseData = exerciseData;

    renderSwapSections(exerciseData.equivalents, exerciseData.sameMuscle, []);

    // Ouvrir le sheet
    const sheet = document.getElementById('swap-bottom-sheet');
    if (sheet) {
        if (window.ModalManager) ModalManager.lock('swap-bottom-sheet');
        sheet.style.display = 'flex';
        sheet.offsetHeight;
        sheet.classList.remove('animate-in');
        void sheet.offsetWidth;
        sheet.classList.add('animate-in');
        initSwapSheetSwipe();
    }
}

/**
 * Crée une variante d'exercice (ex: "Chest Press Machine - Convergente Bas")
 */
function createExerciseVariant() {
    const input = document.getElementById('swap-variant-input');
    if (!input || !input.value.trim()) {
        showToast('Entre un nom de variante', 'error');
        return;
    }

    const suffix = input.value.trim();
    const exercise = fsSession.exercises[fsSession.currentExerciseIndex];
    if (!exercise) return;

    // Nom de base (sans variante existante)
    const baseName = exercise.originalName || exercise.effectiveName;
    const variantName = `${baseName} - ${suffix}`;

    // Sauvegarder la variante dans state
    if (!state.customExerciseVariants[baseName]) {
        state.customExerciseVariants[baseName] = [];
    }
    if (!state.customExerciseVariants[baseName].includes(suffix)) {
        state.customExerciseVariants[baseName].push(suffix);
        saveState();
    }

    // Appliquer comme un swap avec le nom de variante
    _fsSwapMode = false;
    fsSession.exercises[fsSession.currentExerciseIndex] = {
        ...exercise,
        effectiveName: variantName,
        originalName: baseName,
        swapped: true
    };

    closeBottomSheet();
    renderCurrentExercise();
    showToast(`Variante créée : ${variantName}`, 'success');
}

/**
 * Applique un swap d'exercice en cours de session full-screen.
 * Remplace le nom de l'exercice, conserve les séries déjà faites.
 */
function applyFsExerciseSwap(exerciseId, exerciseName) {
    const idx = fsSession.currentExerciseIndex;
    const old = fsSession.exercises[idx];

    fsSession.exercises[idx] = {
        ...old,
        effectiveName: exerciseName,
        effectiveId: exerciseId,
        originalName: old.originalName || old.effectiveName,
        swapped: true
    };

    closeBottomSheet();
    renderCurrentExercise();
    showToast(`Exercice changé : ${exerciseName}`, 'success');
}

/**
 * Affiche le bottom sheet de confirmation des paramètres
 */
function showParamsConfirmationSheet(exerciseName, exerciseType, suggested, currentExercise) {
    const sheet = document.getElementById('params-confirmation-sheet');
    if (!sheet) return;

    const typeLabel = exerciseType === 'isolation' ? 'Isolation' : 'Composé';
    const typeIcon = exerciseType === 'isolation' ? '🎯' : '💪';

    document.getElementById('params-exercise-name').textContent = exerciseName;
    document.getElementById('params-exercise-type').textContent = `${typeIcon} Exercice ${typeLabel}`;
    document.getElementById('params-suggested-sets').textContent = suggested.sets;
    document.getElementById('params-suggested-reps').textContent = suggested.reps;
    document.getElementById('params-suggested-rest').textContent = `${suggested.rest}s`;
    document.getElementById('params-current-sets').textContent = currentExercise.sets;
    document.getElementById('params-current-reps').textContent = currentExercise.reps || '-';

    sheet.style.display = 'flex';
    sheet.offsetHeight;
    sheet.classList.remove('animate-in');
    void sheet.offsetWidth;
    sheet.classList.add('animate-in');
}

/**
 * Ferme le bottom sheet de confirmation des paramètres
 */
function closeParamsConfirmationSheet() {
    const sheet = document.getElementById('params-confirmation-sheet');
    if (sheet) {
        sheet.style.display = 'none';
    }
    pendingSwap = null;
}

/**
 * Applique les paramètres suggérés
 */
function applySwapWithSuggestedParams() {
    if (!pendingSwap) return;

    const suggested = getSuggestedParams(pendingSwap.exerciseId, 'hypertrophy');
    executeSwapWithParams(
        pendingSwap.exerciseId,
        pendingSwap.exerciseName,
        pendingSwap.idx,
        suggested.sets,
        suggested.repsMin,
        suggested.repsMax
    );
}

/**
 * Garde les anciens paramètres lors du swap
 */
function applySwapKeepParams() {
    if (!pendingSwap) return;

    executeSwap(pendingSwap.exerciseId, pendingSwap.exerciseName, pendingSwap.idx);
}

// ==================== SWAP SHEET SWIPE-TO-DISMISS ====================

function initSwapSheetSwipe() {
    if (swapSheetSwipeInitialized) return;

    const sheetContainer = document.querySelector('#swap-bottom-sheet .bottom-sheet');
    const scrollableContent = sheetContainer?.querySelector('.swap-scrollable-content');
    const stickyHeader = sheetContainer?.querySelector('.swap-sticky-header');

    if (!sheetContainer) return;

    // Permettre le swipe depuis le header sticky ou depuis le handle
    const dragTargets = [stickyHeader, sheetContainer.querySelector('.bottom-sheet-header')].filter(Boolean);

    dragTargets.forEach(target => {
        target.addEventListener('touchstart', (e) => {
            swapSwipeStartY = e.touches[0].clientY;
            swapSwipeCurrentY = swapSwipeStartY;
            isSwapSwipeDragging = true;
        }, { passive: true });
    });

    // Permettre aussi le swipe depuis le contenu si on est en haut du scroll
    if (scrollableContent) {
        scrollableContent.addEventListener('touchstart', (e) => {
            swapSwipeStartY = e.touches[0].clientY;
            swapSwipeCurrentY = swapSwipeStartY;
            // Ne permettre le drag que si on est en haut du scroll
            isSwapSwipeDragging = scrollableContent.scrollTop <= 5;
        }, { passive: true });
    }

    sheetContainer.addEventListener('touchmove', (e) => {
        if (!isSwapSwipeDragging) return;

        swapSwipeCurrentY = e.touches[0].clientY;
        const deltaY = swapSwipeCurrentY - swapSwipeStartY;

        // Uniquement si on swipe vers le bas
        if (deltaY > 0) {
            sheetContainer.classList.add('dragging');
            sheetContainer.style.transform = `translateY(${deltaY}px)`;
            // Empêcher le scroll du contenu pendant le drag
            if (deltaY > 10) {
                e.preventDefault();
            }
        }
    }, { passive: false });

    sheetContainer.addEventListener('touchend', () => {
        if (!isSwapSwipeDragging) return;

        const deltaY = swapSwipeCurrentY - swapSwipeStartY;
        sheetContainer.classList.remove('dragging');

        // Si on a swipé plus de 100px vers le bas, on ferme
        if (deltaY > 100) {
            // Animation de fermeture vers le bas
            sheetContainer.style.transition = 'transform 0.3s ease-out';
            sheetContainer.style.transform = 'translateY(100%)';
            setTimeout(() => {
                closeBottomSheet();
                sheetContainer.style.transform = '';
                sheetContainer.style.transition = '';
            }, 300);
        } else {
            // Sinon on revient en position
            sheetContainer.style.transform = '';
        }

        isSwapSwipeDragging = false;
        swapSwipeStartY = 0;
        swapSwipeCurrentY = 0;
    }, { passive: true });

    swapSheetSwipeInitialized = true;
}

// ==================== EXPORTS GLOBAUX ====================
window.openExerciseSwapSheet = openExerciseSwapSheet;
window.closeBottomSheet = closeBottomSheet;
window.swapExerciseInPreview = swapExerciseInPreview;
window.executeSwap = executeSwap;
window.handleSwapSearch = handleSwapSearch;
window.clearSwapSearch = clearSwapSearch;
window.showParamsConfirmationSheet = showParamsConfirmationSheet;
window.closeParamsConfirmationSheet = closeParamsConfirmationSheet;
window.applySwapWithSuggestedParams = applySwapWithSuggestedParams;
window.applySwapKeepParams = applySwapKeepParams;
window.openFsExerciseSwap = openFsExerciseSwap;
window.createExerciseVariant = createExerciseVariant;
window.applyFsExerciseSwap = applyFsExerciseSwap;

console.log('✅ training-swap.js: Swap exercices exporté');
