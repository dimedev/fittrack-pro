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

    // Icônes SVG monochromes Pit Lane (remplace emojis 🔍 ⚡ 💪)
    const SVG_SEARCH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
    const SVG_BOLT   = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>';
    const SVG_MUSCLE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 6.5C6.5 4 8 2.5 10 2.5s3.5 1.5 3.5 4c0 1-.5 2-1 3"/><path d="M12 8.5c2-.5 4 1 4.5 3 .5 2-.5 4-2 5"/><path d="M14 16c1 2 0 4-2 4.5-2 .5-4-.5-4.5-2"/><path d="M8 14c-2 0-4-1-4.5-3"/></svg>';

    // Si on a des résultats de recherche, les afficher
    if (searchResults && searchResults.length > 0) {
        if (searchResultsSection) searchResultsSection.style.display = 'block';
        if (sectionsContainer) sectionsContainer.style.display = 'none';

        if (searchResultsSection) {
            searchResultsSection.innerHTML = `
                <div class="swap-section">
                    <div class="swap-section-header">
                        <span class="swap-section-icon">${SVG_SEARCH}</span>
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
                    <span class="swap-section-icon">${SVG_BOLT}</span>
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
                    <span class="swap-section-icon">${SVG_MUSCLE}</span>
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
 * Pictogrammes SVG par équipement (monochrome Pit Lane)
 */
function _swapEquipIcon(type) {
    const ICONS = {
        barbell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="6.5" y1="6.5" x2="6.5" y2="17.5"/><line x1="17.5" y1="6.5" x2="17.5" y2="17.5"/><rect x="3" y="8" width="2" height="8" rx="0.5"/><rect x="19" y="8" width="2" height="8" rx="0.5"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
        dumbbell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="8" width="3" height="8" rx="0.5"/><rect x="5" y="10" width="2" height="4"/><rect x="7" y="11" width="10" height="2"/><rect x="17" y="10" width="2" height="4"/><rect x="19" y="8" width="3" height="8" rx="0.5"/></svg>',
        machine: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="13" y2="14"/></svg>',
        cable: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><path d="M7 11h10l-1 9H8z"/></svg>',
        bodyweight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="5" r="2.2"/><path d="M8 22V12l4-3 4 3v10"/><path d="M6 13l6-4 6 4"/></svg>',
        kettlebell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 4h6l1 2v1a3 3 0 0 1-1 2 6 6 0 1 1-6 0 3 3 0 0 1-1-2V6z"/></svg>',
        band: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12c0-4 2-7 8-7s8 3 8 7-2 7-8 7-8-3-8-7z"/><path d="M8 12h8"/></svg>'
    };
    return ICONS[type] || ICONS.machine;
}

/**
 * Render les items d'une section de swap — Pit Lane avec picto équipement + CTA rond
 */
function renderSwapItems(exercises) {
    if (!exercises || exercises.length === 0) return '';

    const SVG_PLUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';

    return exercises.map((eq, i) => {
        const equipLabel = equipmentTypes[eq.equipment] || eq.equipment || '';
        const muscleLabel = muscleGroups[eq.muscle]?.name || eq.muscle || '';
        const equipIcon = _swapEquipIcon(eq.equipment);
        const favStar = eq.isFavorite
            ? '<svg class="swap-option-favorite-badge" width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="12 2 15 9 22 10 17 15 18 22 12 19 6 22 7 15 2 10 9 9 12 2"/></svg>'
            : '';
        return `
        <button type="button" class="swap-option-item ${eq.isFavorite ? 'is-favorite' : ''}"
             style="--i:${i}"
             onclick="swapExerciseInPreview('${eq.id}')">
            <span class="swap-option-equip-icon" aria-hidden="true">${equipIcon}</span>
            <div class="swap-option-info">
                <span class="swap-option-name">${eq.name}${favStar}</span>
                <span class="swap-option-meta">
                    ${muscleLabel ? `<span class="swap-option-muscle">${muscleLabel}</span>` : ''}
                    ${equipLabel ? `<span class="swap-option-sep" aria-hidden="true">·</span><span class="swap-option-equip">${equipLabel}</span>` : ''}
                </span>
            </div>
            <span class="swap-option-cta" aria-hidden="true">${SVG_PLUS}</span>
        </button>
        `;
    }).join('');
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
