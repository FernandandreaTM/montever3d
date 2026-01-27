// ===== MODEL-VIEWER.JS - CORE Module (Refactored) =====

// ===== GLOBAL SHARED VARIABLES =====
let currentModel = null;
let allModels = [];
let currentImageIndex = 0;
let galleryImages = [];
let scene, camera, renderer, controls, currentMesh;
let isAutoRotating = false;
let autoRotateAnimationId = null;


// ===== INITIALIZE =====
document.addEventListener('DOMContentLoaded', () => {
    loadModelData();
});

// ===== LOAD MODEL FROM INDIVIDUAL JSON FILE =====
async function loadModelData() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const modelId = urlParams.get('id');
        
        if (!modelId) {
            show404();
            return;
        }
        
        const modelResponse = await fetch(`data/models/${modelId}.json`);
        
        if (!modelResponse.ok) {
            show404();
            return;
        }
        
        currentModel = await modelResponse.json();
        
        const indexResponse = await fetch('data/index.json');
        const index = await indexResponse.json();
        
        const modelPromises = index.models.map(id => 
            fetch(`data/models/${id}.json`)
                .then(response => response.json())
                .catch(error => {
                    console.error(`Error loading model ${id}:`, error);
                    return null;
                })
        );
        
        const models = await Promise.all(modelPromises);
        allModels = models.filter(model => model !== null);
        
        populatePage();
        initializeGallery();
        initialize3DViewer();
        loadRelatedModels();
        
        console.log(`✅ Loaded model: ${currentModel.id}`);
        
    } catch (error) {
        console.error('Error loading model:', error);
        show404();
    }
}

// ===== POPULATE PAGE CONTENT =====
function populatePage() {
    document.title = `${currentModel.title} - MonteVer3D`;
    document.getElementById('pageTitle').textContent = `${currentModel.title} - MonteVer3D`;
    
    document.getElementById('modelTitle').textContent = currentModel.title;
    document.getElementById('modelCategory').textContent = currentModel.category;
    document.getElementById('breadcrumbCategory').textContent = currentModel.category;
    
    const badgesContainer = document.getElementById('modelBadges');
    badgesContainer.innerHTML = createBadges(currentModel);
    
    document.getElementById('modelDescription').textContent = currentModel.description;
    
    document.getElementById('infoCat').textContent = currentModel.category;
    document.getElementById('infoType').textContent = currentModel.type;
    
    const sourceText = formatSourceText(currentModel);
    document.getElementById('infoSource').textContent = sourceText;
    
    document.getElementById('infoOrigin').textContent = currentModel.origin || 'No especificado';
    
    const file3D = get3DFile();
    if (file3D) {
        const fileInfo = document.getElementById('fileInfoContainer');
        fileInfo.style.display = 'flex';
        document.getElementById('infoFile').textContent = 
            `${file3D.format || 'STL'} - ${file3D.fileSize}`;
    }
    
    const tagsContainer = document.getElementById('modelTags');
    if (currentModel.tags && currentModel.tags.length > 0) {
        tagsContainer.innerHTML = currentModel.tags
            .map(tag => `<a href="catalog.html?tag=${encodeURIComponent(tag)}" class="tag tag-clickable">${tag}</a>`)
            .join('');
    } else {
        tagsContainer.innerHTML = '<span class="tag">Sin etiquetas</span>';
    }
    
    populateAttribution();
    
    if (currentModel.notes && currentModel.notes.length > 0) {
        loadNotes();
    }
    
    createActionButtons();
}

// ===== FORMAT SOURCE TEXT =====
function formatSourceText(model) {
    if (model.source === 'Interno') {
        return 'Interno (MonteVer3D)';
    }
    
    let text = 'Externo';
    
    if (model.sourceStatus) {
        text += ` (${model.sourceStatus})`;
    }
    
    if (model.sourceName) {
        text += ` - ${model.sourceName}`;
    }
    
    return text;
}

// ===== POPULATE ATTRIBUTION CARD =====
function populateAttribution() {
    const creatorSpan = document.getElementById('attrCreator');
    if (currentModel.creatorUrl) {
        creatorSpan.innerHTML = `<a href="${currentModel.creatorUrl}" target="_blank" rel="noopener noreferrer">${currentModel.creator}</a>`;
    } else {
        creatorSpan.textContent = currentModel.creator;
    }
    
    const licenseSpan = document.getElementById('attrLicense');
    if (currentModel.licenseUrl) {
        licenseSpan.innerHTML = `<a href="${currentModel.licenseUrl}" target="_blank" rel="noopener noreferrer">${currentModel.license}</a>`;
    } else {
        licenseSpan.textContent = currentModel.license;
    }
    
    if (currentModel.source === 'Externo' && currentModel.sourceName) {
        document.getElementById('attrSourceContainer').style.display = 'flex';
        const sourceNameSpan = document.getElementById('attrSourceName');
        
        if (currentModel.externalSourceUrl) {
            try {
                const url = new URL(currentModel.externalSourceUrl);
                const baseUrl = `${url.protocol}//${url.hostname}`;
                sourceNameSpan.innerHTML = `<a href="${baseUrl}" target="_blank" rel="noopener noreferrer">${currentModel.sourceName}</a>`;
            } catch {
                sourceNameSpan.textContent = currentModel.sourceName;
            }
        } else {
            sourceNameSpan.textContent = currentModel.sourceName;
        }
    } else {
        document.getElementById('attrSourceContainer').style.display = 'none';
    }
    
    if (currentModel.modifications) {
        document.getElementById('attrModsContainer').style.display = 'flex';
        document.getElementById('attrModifications').textContent = currentModel.modifications;
    } else {
        document.getElementById('attrModsContainer').style.display = 'none';
    }
}

// ===== LOAD AND RENDER NOTES =====
function loadNotes() {
    if (!currentModel.notes || currentModel.notes.length === 0) {
        return;
    }
    
    const notesSection = document.getElementById('notesSection');
    const notesContainer = document.getElementById('notesContainer');
    
    if (!notesSection || !notesContainer) {
        console.error('⚠️ Notes containers not found in DOM');
        return;
    }
    
    const categoryOrder = ['pedagogica', 'tecnica', 'recomendacion', 'curada', 'advertencia', 'recurso'];
    const sortedNotes = [...currentModel.notes].sort((a, b) => {
        return categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);
    });
    
    notesContainer.innerHTML = sortedNotes.map(note => createNoteCard(note)).join('');
    notesSection.style.display = 'block';
}

function createNoteCard(note) {
    const categoryConfig = {
        'tecnica': { emoji: '🔧', label: 'Nota Técnica', class: 'tecnica' },
        'pedagogica': { emoji: '📚', label: 'Nota Pedagógica', class: 'pedagogica' },
        'recomendacion': { emoji: '💡', label: 'Recomendación', class: 'recomendacion' },
        'curada': { emoji: '✅', label: 'Curada por', class: 'curada' },
        'advertencia': { emoji: '⚠️', label: 'Advertencia', class: 'advertencia' },
        'recurso': { emoji: '🔗', label: 'Recurso Externo', class: 'recurso' }
    };
    
    const config = categoryConfig[note.category] || categoryConfig['recurso'];
    const linkHTML = note.link 
        ? `<a href="${note.link}" target="_blank" rel="noopener noreferrer" class="note-link">🔗 Enlace de interés</a>`
        : '';
    
    return `
        <div class="note-card note-${config.class}">
            <div class="note-header">
                <span class="note-badge badge-${config.class}">
                    ${config.emoji} ${config.label}
                </span>
            </div>
            <p class="note-text">${note.text}</p>
            ${linkHTML}
        </div>
    `;
}

// ===== CREATE BADGES =====
function createBadges(model) {
    let badges = [];
    
    if (model.type === 'Funcional') {
        badges.push('<span class="model-badge badge-functional">🔧 FUNCIONAL</span>');
    }
    
    if (model.source === 'Interno') {
        badges.push('<span class="model-badge badge-original">⭐ INTERNO</span>');
    } else if (model.sourceStatus === 'Modificado') {
        badges.push('<span class="model-badge badge-modified">✏️ MODIFICADO</span>');
    } else if (model.sourceStatus === 'Original') {
        badges.push('<span class="model-badge badge-external">🌍 EXTERNO</span>');
    }
    
    return badges.join('');
}

// ===== CREATE ACTION BUTTONS =====
function createActionButtons() {
    const container = document.getElementById('actionButtons');
    let buttons = [];
    const hasMultipleSTL = currentModel['3dFiles'] && currentModel['3dFiles'].length > 0;
    
    if (currentModel.externalSourceUrl) {
        buttons.push(`<a href="${currentModel.externalSourceUrl}" target="_blank" rel="noopener noreferrer" class="btn">🌍 VER EN FUENTE</a>`);
    }
    
    if (hasMultipleSTL) {
        buttons.push('<button onclick="showDownloadModal()" class="btn">📥 DESCARGAR MODELO</button>');
    } else {
        const file3D = get3DFile();
        if (file3D && file3D.hosted) {
            buttons.push('<a href="'+file3D.path+'" download class="btn">📥 DESCARGAR MODELO</a>');
        }
    }
    
    buttons.push('<a href="solicitar-impresion.html?modelo='+currentModel.id+'" class="btn btn-accent">🖨️ SOLICITAR IMPRESIÓN</a>');
    buttons.push('<a href="catalog.html" class="btn btn-secondary">← VOLVER AL CATÁLOGO</a>');
    
    container.innerHTML = buttons.join('');
    
    if (hasMultipleSTL) {
        createDownloadModal();
    }
}

// ===== CREATE DOWNLOAD MODAL =====
function createDownloadModal() {
    const modal = document.createElement('div');
    modal.id = 'downloadModal';
    modal.style.cssText = 'display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:10000;align-items:center;justify-content:center;';
    
    let downloadLinks = '';
    currentModel['3dFiles'].forEach((file, index) => {
        let path = file.path;
        if (!path.includes('/')) path = 'models/' + path;
        downloadLinks += '<a href="'+path+'" download style="display:block;padding:1rem 1.5rem;background:var(--gradient-primary);color:var(--color-dark);font-weight:600;text-decoration:none;border-radius:10px;transition:all 0.3s ease;text-align:left;">📥 '+file.name+' <span style="color:#666;font-size:0.85rem;">('+file.fileSize+')</span></a>';
    });
    
    modal.innerHTML = '<div style="background:white;padding:2rem;border-radius:15px;max-width:500px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.3);"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;border-bottom:2px solid var(--color-light-gray);padding-bottom:1rem;"><h3 style="margin:0;color:var(--color-secondary);font-size:1.5rem;">Descargar Archivos 3D</h3><button onclick="closeDownloadModal()" style="background:none;border:none;font-size:2rem;cursor:pointer;color:#999;transition:color 0.3s ease;line-height:1;" onmouseover="this.style.color=\'#E63946\'" onmouseout="this.style.color=\'#999\'">✕</button></div><div style="display:flex;flex-direction:column;gap:0.75rem;">'+downloadLinks+'</div></div>';
    
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
        if (e.target.id === 'downloadModal') closeDownloadModal();
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'flex') {
            closeDownloadModal();
        }
    });
}

function showDownloadModal() {
    const modal = document.getElementById('downloadModal');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeDownloadModal() {
    const modal = document.getElementById('downloadModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// ===== INITIALIZE GALLERY =====
function initializeGallery() {
    galleryImages = [
        currentModel.images.thumbnail,
        ...currentModel.images.gallery
    ];
    
    const mainImage = document.getElementById('mainImage');
    mainImage.src = galleryImages[0];
    mainImage.alt = currentModel.title;
    
    const thumbnailsContainer = document.getElementById('galleryThumbnails');
    thumbnailsContainer.innerHTML = galleryImages.map((img, index) => `
        <img src="${img}" 
            alt="${currentModel.title} - imagen ${index + 1}"
            class="${index === 0 ? 'active' : ''}"
            onclick="selectImage(${index})">
    `).join('');
    
    document.getElementById('fullscreenBtn').addEventListener('click', openLightbox);
    document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
    document.getElementById('lightboxPrev').addEventListener('click', prevImage);
    document.getElementById('lightboxNext').addEventListener('click', nextImage);
    document.getElementById('lightbox').addEventListener('click', (e) => {
        if (e.target.id === 'lightbox') {
            closeLightbox();
        }
    });
    
    document.addEventListener('keydown', (e) => {
        const lightbox = document.getElementById('lightbox');
        if (lightbox.classList.contains('active')) {
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowLeft') prevImage();
            if (e.key === 'ArrowRight') nextImage();
        }
    });
}

// ===== GALLERY FUNCTIONS =====
function selectImage(index) {
    currentImageIndex = index;
    const mainImage = document.getElementById('mainImage');
    mainImage.src = galleryImages[index];
    
    const thumbnails = document.querySelectorAll('.gallery-thumbnails img');
    thumbnails.forEach((thumb, i) => {
        thumb.classList.toggle('active', i === index);
    });
}

function openLightbox() {
    document.getElementById('lightbox').classList.add('active');
    document.getElementById('lightboxImage').src = galleryImages[currentImageIndex];
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    document.getElementById('lightbox').classList.remove('active');
    document.body.style.overflow = 'auto';
}

function prevImage() {
    currentImageIndex = (currentImageIndex - 1 + galleryImages.length) % galleryImages.length;
    document.getElementById('lightboxImage').src = galleryImages[currentImageIndex];
}

function nextImage() {
    currentImageIndex = (currentImageIndex + 1) % galleryImages.length;
    document.getElementById('lightboxImage').src = galleryImages[currentImageIndex];
}

// ===== LOAD RELATED MODELS =====
function loadRelatedModels() {
    const related = allModels
        .filter(m => m.category === currentModel.category && m.id !== currentModel.id)
        .slice(0, 3);
    
    if (related.length === 0) {
        return;
    }
    
    const relatedSection = document.getElementById('relatedSection');
    relatedSection.style.display = 'block';
    
    const container = document.getElementById('relatedModels');
    container.innerHTML = related.map(model => createRelatedCard(model)).join('');
    
    container.querySelectorAll('.model-card').forEach(card => {
        card.addEventListener('click', () => {
            window.location.href = `model.html?id=${card.dataset.id}`;
        });
    });
}

function createRelatedCard(model) {
    const badge = model.type === 'Funcional' 
        ? '<span class="model-badge badge-functional">🔧 FUNCIONAL</span>'
        : '';
    
    return `
        <div class="model-card" data-id="${model.id}">
            <div class="model-image">
                <img src="${model.images.thumbnail}" alt="${model.title}">
                ${badge}
            </div>
            <div class="model-info">
                <div class="model-category">${model.category}</div>
                <h3>${model.title}</h3>
            </div>
        </div>
    `;
}

// ===== 404 ERROR =====
function show404() {
    document.getElementById('modelTitle').textContent = 'Modelo no encontrado';
    document.getElementById('modelDescription').textContent = 
        'El modelo que buscas no existe o ha sido eliminado.';
    
    const container = document.querySelector('.model-grid');
    container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem;">
            <span style="font-size: 5rem; display: block; margin-bottom: 1rem;">🔍</span>
            <h2 style="color: var(--color-secondary); margin-bottom: 1rem;">Modelo no encontrado</h2>
            <p style="color: var(--color-gray); margin-bottom: 2rem;">
                El modelo que buscas no existe o la URL es incorrecta.
            </p>
            <a href="catalog.html" class="btn">VER CATÁLOGO COMPLETO</a>
        </div>
    `;
}
