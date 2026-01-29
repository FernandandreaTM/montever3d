// ===== MODEL-VIEWER-SIMPLE.JS - Lightweight 3D Viewer =====

let currentModel = null;
let allModels = [];
let currentImageIndex = 0;
let galleryImages = [];
let scene, camera, renderer, controls, currentMesh;
let isCameraRotating = true;
let animationFrameId = null;

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
        badges.push('<span class="model-badge badge-external">🌐 EXTERNO</span>');
    }
    
    return badges.join('');
}

// ===== CREATE ACTION BUTTONS =====
function createActionButtons() {
    const container = document.getElementById('actionButtons');
    let buttons = [];
    const hasMultipleSTL = currentModel['3dFiles'] && currentModel['3dFiles'].length > 0;
    
    if (currentModel.externalSourceUrl) {
        buttons.push(`<a href="${currentModel.externalSourceUrl}" target="_blank" rel="noopener noreferrer" class="btn">🌐 VER EN FUENTE</a>`);
    }
    
    if (hasMultipleSTL) {
        buttons.push('<button onclick="showDownloadModal()" class="btn">📥 DESCARGAR MODELO</button>');
    } else {
        const file3D = get3DFile();
        if (file3D && file3D.hosted) {
            buttons.push('<a href="'+file3D.path+'" download class="btn">📥 DESCARGAR MODELO</a>');
        }
    }
    
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

// ===== GET 3D FILE =====
function get3DFile() {
    if (currentModel['3dFiles'] && currentModel['3dFiles'].length > 0) {
        // Buscar primer archivo OBJ o STL (ignorar MTL/JPG/textures)
        const modelFile = currentModel['3dFiles'].find(f => {
            const ext = f.path.toLowerCase().split('.').pop();
            return ext === 'obj' || ext === 'stl';
        });
        
        if (!modelFile) return null;
        
        let path = modelFile.path;
        if (!path.startsWith('models/')) {
            path = 'models/' + path;
        }
        
        const ext = path.toLowerCase().split('.').pop();
        
        return {
            hosted: true,
            path: path,
            format: ext === 'obj' ? 'OBJ' : 'STL',
            fileSize: modelFile.fileSize
        };
    }
    
    if (currentModel['3dFile']) {
        return currentModel['3dFile'];
    }
    
    return null;
}

// ===== INITIALIZE 3D VIEWER (SIMPLE) =====
function initialize3DViewer() {
    const file3D = get3DFile();
    
    if (!file3D || !file3D.hosted) {
        return;
    }
    
    document.getElementById('viewerSection').style.display = 'block';
    
    const ext = file3D.path.toLowerCase().split('.').pop();
    
    if (ext === 'obj') {
        loadOBJ(file3D.path);
    } else {
        loadSTL(file3D.path);
    }
}

// ===== LOAD STL (OPTIMIZED) =====
function loadSTL(stlPath) {
    const container = document.getElementById('modelViewer');
    container.innerHTML = '<div class="viewer-loading"><div class="loader"></div><p>Cargando modelo 3D...</p></div>';
    
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2F5233);
    
    camera = new THREE.PerspectiveCamera(50, container.offsetWidth / 600, 0.1, 1000);
    camera.position.set(0, 30, 80);
    
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.offsetWidth, 600);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    
    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
    scene.add(hemisphereLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(100, 100, 100);
    scene.add(directionalLight);
    
    // Ground plane (permanent)
    const groundGeometry = new THREE.PlaneGeometry(400, 400);
    const groundMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xcccccc, 
        side: THREE.DoubleSide, 
        shininess: 0, 
        transparent: true, 
        opacity: 0.3 
    });
    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -40;
    scene.add(groundMesh);
    
    // Grid helper (permanent)
    const gridHelper = new THREE.GridHelper(200, 20, 0x999999, 0xdddddd);
    gridHelper.position.y = -39.9;
    scene.add(gridHelper);
    
    const loader = new THREE.STLLoader();
    loader.load(stlPath, function(geometry) {
        const material = new THREE.MeshPhongMaterial({ 
            color: 0xF5C842, 
            specular: 0x666666, 
            shininess: 100
        });
        
        currentMesh = new THREE.Mesh(geometry, material);
        
        geometry.computeBoundingBox();
        geometry.center();
        
        const size = new THREE.Vector3();
        geometry.boundingBox.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 80 / maxDim;
        currentMesh.scale.setScalar(scale);
        currentMesh.rotation.x = -Math.PI / 2;
        
        scene.add(currentMesh);
        
        const box = new THREE.Box3().setFromObject(currentMesh);
        const center = box.getCenter(new THREE.Vector3());
        controls.target.copy(center);
        
        const distance = Math.max(size.x, size.y, size.z) * scale * 1.5;
        camera.position.set(center.x, center.y + distance * 0.5, center.z + distance);
        camera.lookAt(center);
        
        animate();
        
        console.log('✅ STL loaded');
    }, undefined, function(error) {
        console.error('❌ Error loading STL:', error);
        container.innerHTML = '<p style="padding: 2rem; text-align: center; color: #E63946;">Error al cargar modelo 3D</p>';
    });
    
    window.addEventListener('resize', () => {
        if (camera && renderer) {
            camera.aspect = container.offsetWidth / 600;
            camera.updateProjectionMatrix();
            renderer.setSize(container.offsetWidth, 600);
        }
    });
}

// ===== LOAD OBJ (OPTIMIZED) =====
function loadOBJ(objPath) {
    const container = document.getElementById('modelViewer');
    container.innerHTML = '<div class="viewer-loading"><div class="loader"></div><p>Cargando modelo 3D...</p></div>';
    
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2F5233);
    
    camera = new THREE.PerspectiveCamera(50, container.offsetWidth / 600, 0.1, 1000);
    camera.position.set(0, 30, 80);
    
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.offsetWidth, 600);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    
    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
    scene.add(hemisphereLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(100, 100, 100);
    scene.add(directionalLight);
    
    // Ground plane (permanent)
    const groundGeometry = new THREE.PlaneGeometry(400, 400);
    const groundMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xcccccc, 
        side: THREE.DoubleSide, 
        shininess: 0, 
        transparent: true, 
        opacity: 0.3 
    });
    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -40;
    scene.add(groundMesh);
    
    // Grid helper (permanent)
    const gridHelper = new THREE.GridHelper(200, 20, 0x999999, 0xdddddd);
    gridHelper.position.y = -39.9;
    scene.add(gridHelper);
    
    const mtlPath = objPath.replace('.obj', '.mtl');
    const mtlFileName = mtlPath.substring(mtlPath.lastIndexOf('/') + 1);
    const texturePath = objPath.substring(0, objPath.lastIndexOf('/') + 1);
    const objLoader = new THREE.OBJLoader();
    
    const mtlLoader = new THREE.MTLLoader();
    mtlLoader.setPath(texturePath);
    mtlLoader.load(
        mtlFileName,
        function(materials) {
            materials.preload();
            objLoader.setMaterials(materials);
            loadOBJGeometry(objLoader, objPath);
        },
        undefined,
        function(error) {
            console.log('⚠️ MTL not found, using default material');
            loadOBJGeometry(objLoader, objPath);
        }
    );
    
    function loadOBJGeometry(loader, path) {
        loader.load(path, function(object) {
            currentMesh = object;
            
            const box = new THREE.Box3().setFromObject(object);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 80 / maxDim;
            object.scale.setScalar(scale);
            
            object.position.sub(center.multiplyScalar(scale));
            object.position.y += size.y * scale / 2 - 40;
            
            scene.add(object);
            
            controls.target.set(0, 0, 0);
            
            const distance = Math.max(size.x, size.y, size.z) * scale * 1.5;
            camera.position.set(0, distance * 0.5, distance);
            camera.lookAt(controls.target);
            
            animate();
            
            console.log('✅ OBJ loaded');
        }, undefined, function(error) {
            console.error('❌ Error loading OBJ:', error);
            container.innerHTML = '<p style="padding: 2rem; text-align: center; color: #E63946;">Error al cargar modelo 3D</p>';
        });
    }
    
    window.addEventListener('resize', () => {
        if (camera && renderer) {
            camera.aspect = container.offsetWidth / 600;
            camera.updateProjectionMatrix();
            renderer.setSize(container.offsetWidth, 600);
        }
    });
}

// ===== ANIMATION LOOP (OPTIMIZED) =====
function animate() {
    animationFrameId = requestAnimationFrame(animate);
    
    if (isCameraRotating) {
        const angle = 0.005;
        const x = camera.position.x;
        const z = camera.position.z;
        camera.position.x = x * Math.cos(angle) - z * Math.sin(angle);
        camera.position.z = x * Math.sin(angle) + z * Math.cos(angle);
        camera.lookAt(controls.target);
    }
    
    controls.update();
    renderer.render(scene, camera);
}

// ===== BASIC CONTROLS =====
const cameraViews = ['front', 'top', 'isometric', 'back', 'left', 'right'];
let currentViewIndex = 0;

function cycleCameraView() {
    if (!currentMesh || !camera || !controls) return;
    
    currentViewIndex = (currentViewIndex + 1) % cameraViews.length;
    const view = cameraViews[currentViewIndex];
    
    const box = new THREE.Box3().setFromObject(currentMesh);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const distance = Math.max(size.x, size.y, size.z) * 1.5;
    
    controls.target.copy(center);
    
    switch(view) {
        case 'front':
            camera.position.set(center.x, center.y, center.z + distance);
            break;
        case 'back':
            camera.position.set(center.x, center.y, center.z - distance);
            break;
        case 'left':
            camera.position.set(center.x - distance, center.y, center.z);
            break;
        case 'right':
            camera.position.set(center.x + distance, center.y, center.z);
            break;
        case 'top':
            camera.position.set(center.x, center.y + distance, center.z);
            break;
        case 'isometric':
            camera.position.set(center.x + distance * 0.7, center.y + distance * 0.7, center.z + distance * 0.7);
            break;
    }
    
    camera.lookAt(center);
    controls.update();
    
    const viewLabels = {
        'front': 'Frontal',
        'back': 'Trasera',
        'left': 'Izquierda',
        'right': 'Derecha',
        'top': 'Superior',
        'isometric': 'Isométrica'
    };
    
    showToast(`Vista: ${viewLabels[view]}`);
}

function toggleCameraRotation() {
    isCameraRotating = !isCameraRotating;
    
    const btn = document.getElementById('cameraRotateBtn');
    if (btn) {
        btn.style.background = isCameraRotating 
            ? 'rgba(245, 200, 66, 0.9)' 
            : 'rgba(255, 255, 255, 0.85)';
    }
}

function resetView() {
    if (!currentMesh || !camera || !controls) return;
    
    const box = new THREE.Box3().setFromObject(currentMesh);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const distance = Math.max(size.x, size.y, size.z) * 1.5;
    
    controls.target.copy(center);
    camera.position.set(center.x, center.y + distance * 0.5, center.z + distance);
    camera.lookAt(center);
    controls.update();
    
    isCameraRotating = true;
    const btn = document.getElementById('cameraRotateBtn');
    if (btn) btn.style.background = 'rgba(245, 200, 66, 0.9)';
    
    showToast('Vista reseteada');
}

function toggleViewerFullscreen() {
    const container = document.querySelector('.viewer-hero-container');
    
    if (!document.fullscreenElement) {
        container.requestFullscreen().catch(err => {
            console.error('Error attempting fullscreen:', err);
        });
    } else {
        document.exitFullscreen();
    }
}

document.addEventListener('fullscreenchange', () => {
    const viewerCanvas = document.getElementById('modelViewer');
    
    if (document.fullscreenElement) {
        if (renderer && camera) {
            camera.aspect = window.innerWidth / window.innerHeight;
            renderer.setSize(window.innerWidth, window.innerHeight);
            camera.updateProjectionMatrix();
        }
    } else {
        if (renderer && camera) {
            camera.aspect = viewerCanvas.offsetWidth / 600;
            renderer.setSize(viewerCanvas.offsetWidth, 600);
            camera.updateProjectionMatrix();
        }
    }
});

function showToast(message) {
    const toast = document.getElementById('viewerToast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
}

// ===== 404 ERROR =====
function show404() {
    document.getElementById('modelTitle').textContent = 'Modelo no encontrado';
    
    const container = document.querySelector('.model-grid');
    if (container) {
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
}

console.log('✅ Model Viewer Simple loaded');
