// ==================== PROGRESS PHOTOS MODULE ====================

// Variables
let currentPhotoBlob = null;
let selectedPose = 'front';

// ==================== UPLOAD & STORAGE ====================

/**
 * Compresse une image avant upload
 */
async function compressImage(file, maxWidth = 1200, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            
            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }
            
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
        };
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
    });
}

/**
 * Upload une photo vers Supabase Storage
 */
async function uploadPhotoToStorage(imageBlob, pose, date) {
    if (!supabase || !isLoggedIn()) {
        showToast('Connectez-vous pour sauvegarder vos photos', 'error');
        return null;
    }
    
    try {
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) throw new Error('Non connecté');
        
        const fileName = `${date}_${pose}_${Date.now()}.jpg`;
        const filePath = `${user.id}/${fileName}`;
        
        const { data, error } = await supabase.storage
            .from('progress-photos')
            .upload(filePath, imageBlob, {
                contentType: 'image/jpeg',
                upsert: false
            });
        
        if (error) throw error;
        
        // URL signée valide 1 an
        const { data: urlData, error: urlError } = await supabase.storage
            .from('progress-photos')
            .createSignedUrl(filePath, 365 * 24 * 60 * 60);
        
        if (urlError) throw urlError;
        
        return { path: filePath, url: urlData.signedUrl };
        
    } catch (error) {
        console.error('Erreur upload photo:', error);
        showToast('Erreur lors de l\'upload', 'error');
        return null;
    }
}

/**
 * Sauvegarde les métadonnées de la photo
 */
async function savePhotoMetadata(photoPath, photoUrl, date, weight, bodyFat, pose, notes) {
    if (!supabase || !isLoggedIn()) return null;
    
    try {
        const user = (await supabase.auth.getUser()).data.user;
        
        const { data, error } = await supabase
            .from('progress_photos')
            .insert({
                user_id: user.id,
                photo_path: photoPath,
                photo_url: photoUrl,
                taken_at: date,
                weight: weight || null,
                body_fat: bodyFat || null,
                pose: pose,
                notes: notes || null
            })
            .select()
            .single();
        
        if (error) throw error;
        return data;
        
    } catch (error) {
        console.error('Erreur sauvegarde métadonnées:', error);
        return null;
    }
}

/**
 * Récupère toutes les photos de l'utilisateur
 */
async function fetchUserPhotos() {
    if (!supabase || !isLoggedIn()) return [];
    
    try {
        const { data, error } = await supabase
            .from('progress_photos')
            .select('*')
            .order('taken_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
        
    } catch (error) {
        console.error('Erreur récupération photos:', error);
        return [];
    }
}

/**
 * Supprime une photo
 */
async function deletePhoto(photoId, photoPath) {
    if (!supabase || !isLoggedIn()) return false;
    
    try {
        // Supprimer du storage
        await supabase.storage.from('progress-photos').remove([photoPath]);
        
        // Supprimer de la base
        const { error } = await supabase
            .from('progress_photos')
            .delete()
            .eq('id', photoId);
        
        if (error) throw error;
        return true;
        
    } catch (error) {
        console.error('Erreur suppression photo:', error);
        return false;
    }
}

// ==================== UI FUNCTIONS ====================

/**
 * Ouvre le modal d'ajout de photo
 */
function openAddPhotoModal() {
    if (!isLoggedIn()) {
        showToast('Connectez-vous pour ajouter des photos', 'error');
        return;
    }
    
    currentPhotoBlob = null;
    selectedPose = 'front';
    
    document.getElementById('photo-preview-container').innerHTML = `
        <div class="photo-upload-placeholder" onclick="document.getElementById('photo-input').click()">
            <div class="photo-upload-icon">📷</div>
            <p>Cliquez pour ajouter une photo</p>
            <p style="font-size: 0.8rem; color: var(--text-muted);">ou glissez-déposez</p>
        </div>
    `;
    
    document.getElementById('photo-input').value = '';
    document.getElementById('photo-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('photo-weight').value = state.profile?.weight || '';
    document.getElementById('photo-bodyfat').value = '';
    document.getElementById('photo-notes').value = '';
    
    document.querySelectorAll('.pose-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.pose === 'front');
    });
    
    openModal('add-photo-modal');
}

/**
 * Gère la sélection d'une photo
 */
function handlePhotoSelect(event) {
    const file = event.target.files[0];
    if (file) processSelectedPhoto(file);
}

/**
 * Gère le drag & drop
 */
function handlePhotoDrop(event) {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        processSelectedPhoto(file);
    }
}

function handlePhotoDragOver(event) {
    event.preventDefault();
}

/**
 * Traite la photo sélectionnée
 */
async function processSelectedPhoto(file) {
    const container = document.getElementById('photo-preview-container');
    
    container.innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <div class="loading-spinner"></div>
            <p style="margin-top: 15px; color: var(--text-muted);">Traitement...</p>
        </div>
    `;
    
    try {
        currentPhotoBlob = await compressImage(file);
        const previewUrl = URL.createObjectURL(currentPhotoBlob);
        
        container.innerHTML = `
            <div class="photo-preview">
                <img src="${previewUrl}" alt="Preview" class="photo-preview-img">
                <button class="photo-change-btn" onclick="document.getElementById('photo-input').click()">
                    📷 Changer
                </button>
            </div>
        `;
        
    } catch (error) {
        console.error('Erreur traitement photo:', error);
        container.innerHTML = `
            <div class="photo-upload-placeholder" onclick="document.getElementById('photo-input').click()">
                <div class="photo-upload-icon">❌</div>
                <p>Erreur, réessayez</p>
            </div>
        `;
        showToast('Erreur lors du traitement', 'error');
    }
}

/**
 * Sélectionne le type de pose
 */
function selectPose(pose) {
    selectedPose = pose;
    document.querySelectorAll('.pose-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.pose === pose);
    });
}

/**
 * Sauvegarde la photo
 */
async function saveProgressPhoto() {
    if (!currentPhotoBlob) {
        showToast('Sélectionnez une photo', 'error');
        return;
    }
    
    const date = document.getElementById('photo-date').value;
    const weight = parseFloat(document.getElementById('photo-weight').value) || null;
    const bodyFat = parseFloat(document.getElementById('photo-bodyfat').value) || null;
    const notes = document.getElementById('photo-notes').value.trim();
    
    if (!date) {
        showToast('Sélectionnez une date', 'error');
        return;
    }
    
    const saveBtn = document.querySelector('#add-photo-modal .btn-primary');
    const originalText = saveBtn.textContent;
    saveBtn.disabled = true;
    saveBtn.textContent = 'Envoi...';
    
    try {
        const uploadResult = await uploadPhotoToStorage(currentPhotoBlob, selectedPose, date);
        if (!uploadResult) throw new Error('Échec upload');
        
        const metadata = await savePhotoMetadata(
            uploadResult.path, uploadResult.url,
            date, weight, bodyFat, selectedPose, notes
        );
        
        if (!metadata) throw new Error('Échec métadonnées');
        
        closeModal('add-photo-modal');
        showToast('Photo enregistrée ! 📸', 'success');
        renderPhotosGallery();
        
    } catch (error) {
        console.error('Erreur sauvegarde:', error);
        showToast('Erreur lors de la sauvegarde', 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
    }
}

/**
 * Affiche la galerie de photos
 */
async function renderPhotosGallery() {
    const container = document.getElementById('photos-gallery');
    if (!container) return;
    
    if (!isLoggedIn()) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🔒</div>
                <div class="empty-state-title">Connectez-vous</div>
                <p>Les photos nécessitent un compte</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `<div style="text-align: center; padding: 40px;"><div class="loading-spinner"></div></div>`;
    
    const photos = await fetchUserPhotos();
    
    if (photos.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📸</div>
                <div class="empty-state-title">Aucune photo</div>
                <p>Prenez votre première photo de progression !</p>
            </div>
        `;
        return;
    }
    
    // Grouper par date
    const photosByDate = {};
    photos.forEach(photo => {
        const date = photo.taken_at;
        if (!photosByDate[date]) photosByDate[date] = [];
        photosByDate[date].push(photo);
    });
    
    let html = '<div class="photos-timeline">';
    
    Object.entries(photosByDate).forEach(([date, datePhotos]) => {
        const formattedDate = new Date(date).toLocaleDateString('fr-FR', {
            weekday: 'short', day: 'numeric', month: 'long', year: 'numeric'
        });
        const weight = datePhotos.find(p => p.weight)?.weight;
        
        html += `
            <div class="photos-date-group">
                <div class="photos-date-header">
                    <span class="photos-date">${formattedDate}</span>
                    ${weight ? `<span class="photos-weight">${weight} kg</span>` : ''}
                </div>
                <div class="photos-grid">
                    ${datePhotos.map(photo => `
                        <div class="photo-card" onclick="openPhotoViewer('${photo.id}')">
                            <img src="${photo.photo_url}" alt="${photo.pose}" loading="lazy">
                            <div class="photo-card-overlay">
                                <span class="photo-pose-badge">${getPoseLabel(photo.pose)}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    
    // Bouton comparaison
    if (Object.keys(photosByDate).length >= 2) {
        html += `
            <div style="margin-top: 20px; text-align: center;">
                <button class="btn btn-secondary" onclick="openCompareModal()">
                    🔄 Comparer Avant/Après
                </button>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

function getPoseLabel(pose) {
    return { 'front': '🧍 Face', 'side': '🧍‍♂️ Profil', 'back': '🔙 Dos' }[pose] || pose;
}

/**
 * Ouvre le viewer de photo
 */
let currentViewerPhotos = [];

async function openPhotoViewer(photoId) {
    currentViewerPhotos = await fetchUserPhotos();
    const photo = currentViewerPhotos.find(p => p.id === photoId);
    if (!photo) return;
    
    const formattedDate = new Date(photo.taken_at).toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'long', year: 'numeric'
    });
    
    document.getElementById('viewer-image').src = photo.photo_url;
    document.getElementById('viewer-date').textContent = formattedDate;
    document.getElementById('viewer-pose').textContent = getPoseLabel(photo.pose);
    document.getElementById('viewer-weight').textContent = photo.weight ? `${photo.weight} kg` : '-';
    document.getElementById('viewer-bodyfat').textContent = photo.body_fat ? `${photo.body_fat}%` : '-';
    document.getElementById('viewer-notes').textContent = photo.notes || '-';
    
    document.getElementById('photo-viewer-modal').dataset.photoId = photo.id;
    document.getElementById('photo-viewer-modal').dataset.photoPath = photo.photo_path;
    
    openModal('photo-viewer-modal');
}

/**
 * Supprime la photo courante
 */
async function deleteCurrentPhoto() {
    const modal = document.getElementById('photo-viewer-modal');
    const photoId = modal.dataset.photoId;
    const photoPath = modal.dataset.photoPath;
    
    if (!confirm('Supprimer cette photo définitivement ?')) return;
    
    const success = await deletePhoto(photoId, photoPath);
    
    if (success) {
        closeModal('photo-viewer-modal');
        showToast('Photo supprimée', 'success');
        renderPhotosGallery();
    } else {
        showToast('Erreur lors de la suppression', 'error');
    }
}

/**
 * Ouvre le modal de comparaison
 */
async function openCompareModal() {
    const photos = await fetchUserPhotos();
    const frontPhotos = photos.filter(p => p.pose === 'front');
    const dateOptions = [...new Set(frontPhotos.map(p => p.taken_at))].sort();
    
    if (dateOptions.length < 2) {
        showToast('Il faut au moins 2 photos de face pour comparer', 'info');
        return;
    }
    
    const optionsHtml = dateOptions.map(date => {
        const photo = frontPhotos.find(p => p.taken_at === date);
        const formatted = new Date(date).toLocaleDateString('fr-FR');
        const weight = photo?.weight ? ` (${photo.weight}kg)` : '';
        return `<option value="${date}">${formatted}${weight}</option>`;
    }).join('');
    
    document.getElementById('compare-before').innerHTML = optionsHtml;
    document.getElementById('compare-after').innerHTML = optionsHtml;
    
    document.getElementById('compare-before').value = dateOptions[0];
    document.getElementById('compare-after').value = dateOptions[dateOptions.length - 1];
    
    updateCompareImages();
    openModal('compare-modal');
}

/**
 * Met à jour les images de comparaison
 */
async function updateCompareImages() {
    const beforeDate = document.getElementById('compare-before').value;
    const afterDate = document.getElementById('compare-after').value;
    
    const photos = await fetchUserPhotos();
    
    const beforePhoto = photos.find(p => p.taken_at === beforeDate && p.pose === 'front');
    const afterPhoto = photos.find(p => p.taken_at === afterDate && p.pose === 'front');
    
    if (beforePhoto) {
        document.getElementById('compare-before-img').src = beforePhoto.photo_url;
        document.getElementById('compare-before-weight').textContent = beforePhoto.weight ? `${beforePhoto.weight} kg` : '-';
    }
    
    if (afterPhoto) {
        document.getElementById('compare-after-img').src = afterPhoto.photo_url;
        document.getElementById('compare-after-weight').textContent = afterPhoto.weight ? `${afterPhoto.weight} kg` : '-';
    }
    
    // Diff
    if (beforePhoto?.weight && afterPhoto?.weight) {
        const diff = afterPhoto.weight - beforePhoto.weight;
        const diffEl = document.getElementById('compare-diff');
        diffEl.textContent = `${diff > 0 ? '+' : ''}${diff.toFixed(1)} kg`;
        diffEl.style.color = diff < 0 ? 'var(--success)' : diff > 0 ? 'var(--warning)' : 'var(--text-primary)';
    }
}

// Init
function initPhotosModule() {
    const dropZone = document.getElementById('photo-preview-container');
    if (dropZone) {
        dropZone.addEventListener('dragover', handlePhotoDragOver);
        dropZone.addEventListener('drop', handlePhotoDrop);
    }
}
