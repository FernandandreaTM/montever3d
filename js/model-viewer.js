// ===== MODEL-VIEWER.JS - Model Detail Page Logic =====

let currentModel = null;
let allModels = [];
let currentImageIndex = 0;
let galleryImages = [];
let currentSTLIndex = 0;
let scene, camera, renderer, controls, currentMesh;

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

// ===== GET 3D FILE (COMPATIBLE WITH BOTH SCHEMAS + AUTO-DETECT FORMAT) =====
function get3DFile() {
    if (currentModel['3dFiles'] && currentModel['3dFiles'].length > 0) {
        let path = currentModel['3dFiles'][0].path;
        
        // Auto-fix path si no tiene prefijo models/
        if (!path.startsWith('models/')) {
            path = 'models/' + path;
        }
        
        // Detectar formato
        const ext = path.toLowerCase().split('.').pop();
        const format = ext === 'obj' ? 'OBJ' : 'STL';
        
        return {
            hosted: true,
            path: path,
            format: format,
            fileSize: currentModel['3dFiles'][0].fileSize
        };
    }
    
    if (currentModel['3dFile']) {
        return currentModel['3dFile'];
    }
    
    return null;
}

// ===== POPULATE PAGE CONTENT =====
function populatePage() {
    document.title = `${currentModel.title} - LABIM3D`;
    document.getElementById('pageTitle').textContent = `${currentModel.title} - LABIM3D`;
    
    document.getElementById('modelTitle').textContent = currentModel.title;
    document.getElementById('modelCategory').textContent = currentModel.category;
    document.getElementById('breadcrumbCategory').textContent = currentModel.category;
    
    const badgesContainer = document.getElementById('modelBadges');
    badgesContainer.innerHTML = createBadges(currentModel);
    
    document.getElementById('modelDescription').textContent = currentModel.description;
    
    // Info grid (SIN fuente/licencia, CON método)
    document.getElementById('infoCat').textContent = currentModel.category;
    document.getElementById('infoType').textContent = currentModel.type;
    
    // NUEVO: Mostrar fuente completa
    const sourceText = formatSourceText(currentModel);
    document.getElementById('infoSource').textContent = sourceText;
    
    // NUEVO: Mostrar método (origin)
    document.getElementById('infoOrigin').textContent = currentModel.origin || 'No especificado';
    
    const file3D = get3DFile();
    if (file3D) {
        const fileInfo = document.getElementById('fileInfoContainer');
        fileInfo.style.display = 'flex';
        document.getElementById('infoFile').textContent = 
            `${file3D.format || 'STL'} - ${file3D.fileSize}`;
    }
    
    // Tags - clickeables para buscar
    const tagsContainer = document.getElementById('modelTags');
    if (currentModel.tags && currentModel.tags.length > 0) {
        tagsContainer.innerHTML = currentModel.tags
            .map(tag => `<a href="catalog.html?tag=${encodeURIComponent(tag)}" class="tag tag-clickable">${tag}</a>`)
            .join('');
    } else {
        tagsContainer.innerHTML = '<span class="tag">Sin etiquetas</span>';
    }
    
    // NUEVA: Poblar attribution card
    populateAttribution();
    
        // Load notes
    if (currentModel.notes && currentModel.notes.length > 0) {
        loadNotes();
    }
    // Action buttons
    createActionButtons();
}

// ===== NUEVA: FORMAT SOURCE TEXT =====
function formatSourceText(model) {
    if (model.source === 'Interno') {
        return 'Interno (LABIM3D)';
    }
    
    // Externo
    let text = 'Externo';
    
    if (model.sourceStatus) {
        text += ` (${model.sourceStatus})`;
    }
    
    if (model.sourceName) {
        text += ` - ${model.sourceName}`;
    }
    
    return text;
}

// ===== NUEVA: POPULATE ATTRIBUTION CARD =====
function populateAttribution() {
    // Creator
    const creatorSpan = document.getElementById('attrCreator');
    if (currentModel.creatorUrl) {
        creatorSpan.innerHTML = `<a href="${currentModel.creatorUrl}" target="_blank" rel="noopener noreferrer">${currentModel.creator}</a>`;
    } else {
        creatorSpan.textContent = currentModel.creator;
    }
    
    // License
    const licenseSpan = document.getElementById('attrLicense');
    if (currentModel.licenseUrl) {
        licenseSpan.innerHTML = `<a href="${currentModel.licenseUrl}" target="_blank" rel="noopener noreferrer">${currentModel.license}</a>`;
    } else {
        licenseSpan.textContent = currentModel.license;
    }
    
    // Source name (solo si es Externo)
    if (currentModel.source === 'Externo' && currentModel.sourceName) {
        document.getElementById('attrSourceContainer').style.display = 'flex';
        const sourceNameSpan = document.getElementById('attrSourceName');
        
        // Si existe URL, hacer clickeable hacia el dominio principal
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
    
    // Modifications (solo si existen)
    if (currentModel.modifications) {
        document.getElementById('attrModsContainer').style.display = 'flex';
        document.getElementById('attrModifications').textContent = currentModel.modifications;
    } else {
        document.getElementById('attrModsContainer').style.display = 'none';
    }
}
// ===== LOAD AND RENDER NOTES =====
function loadNotes() {
    // Add defensive check
    if (!currentModel.notes || currentModel.notes.length === 0) {
        return;
    }
    const notesSection = document.getElementById('notesSection');
    const notesContainer = document.getElementById('notesContainer');
    
    // NULL CHECK - previene el error
    if (!notesSection || !notesContainer) {
        console.error('⚠️ Notes containers not found in DOM');
        return;
    }
    // Order by category
    const categoryOrder = ['pedagogica', 'tecnica', 'recomendacion', 'curada', 'advertencia', 'recurso'];
    const sortedNotes = [...currentModel.notes].sort((a, b) => {
        return categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);
    });
    
    // Render notes
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
    
    // Badge para fuente
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
    
    // PRIMERO: Botón "VER EN FUENTE" (si existe externalSourceUrl)
    if (currentModel.externalSourceUrl) {
        buttons.push(`<a href="${currentModel.externalSourceUrl}" target="_blank" rel="noopener noreferrer" class="btn">🌐 VER EN FUENTE</a>`);
    }
    
    // SEGUNDO: Botón de descarga
    if (hasMultipleSTL) {
        buttons.push('<button onclick="showDownloadModal()" class="btn">📁 DESCARGAR MODELO</button>');
    } else {
        const file3D = get3DFile();
        if (file3D) {
            if (file3D.hosted) {
                buttons.push('<a href="'+file3D.path+'" download class="btn">📁 DESCARGAR MODELO</a>');
            }
        }
    }
    
    // TERCERO: Solicitar impresión
    buttons.push('<a href="solicitar-impresion.html?modelo='+currentModel.id+'" class="btn btn-accent">🖨️ SOLICITAR IMPRESIÓN</a>');

    // CUARTO: Volver al catálogo
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
        downloadLinks += '<a href="'+path+'" download style="display:block;padding:1rem 1.5rem;background:var(--gradient-primary);color:var(--color-dark);font-weight:600;text-decoration:none;border-radius:10px;transition:all 0.3s ease;text-align:left;">📁 '+file.name+' <span style="color:#666;font-size:0.85rem;">('+file.fileSize+')</span></a>';
    });
    
    modal.innerHTML = '<div style="background:white;padding:2rem;border-radius:15px;max-width:500px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.3);"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;border-bottom:2px solid var(--color-light-gray);padding-bottom:1rem;"><h3 style="margin:0;color:var(--color-secondary);font-size:1.5rem;">Descargar Archivos STL</h3><button onclick="closeDownloadModal()" style="background:none;border:none;font-size:2rem;cursor:pointer;color:#999;transition:color 0.3s ease;line-height:1;" onmouseover="this.style.color=\'#E63946\'" onmouseout="this.style.color=\'#999\'">✕</button></div><div style="display:flex;flex-direction:column;gap:0.75rem;">'+downloadLinks+'</div></div>';
    
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

// ===== SHOW DOWNLOAD MODAL =====
function showDownloadModal() {
    const modal = document.getElementById('downloadModal');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// ===== CLOSE DOWNLOAD MODAL =====
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

// ===== INITIALIZE 3D VIEWER (THREE.JS) - MULTI-STL SUPPORT =====
function initialize3DViewer() {
    const file3D = get3DFile();
    
    if (!file3D || !file3D.hosted) {
        return;
    }
    
    document.getElementById('viewerSection').style.display = 'block';
    
    // Buscar primer archivo 3D real (STL o OBJ)
    let firstModelIndex = -1;
    for (let i = 0; i < currentModel['3dFiles'].length; i++) {
        const ext = currentModel['3dFiles'][i].path.toLowerCase().split('.').pop();
        if (ext === 'stl' || ext === 'obj') {
            firstModelIndex = i;
            break;
        }
    }
    
    if (firstModelIndex === -1) {
        console.error('No 3D model files found');
        return;
    }
    
    // Multi-file selector (si hay más de 1 archivo 3D)
    const modelFilesCount = currentModel['3dFiles'].filter(f => {
        const ext = f.path.toLowerCase().split('.').pop();
        return ext === 'stl' || ext === 'obj';
    }).length;
    
    if (modelFilesCount > 1) {
        createSTLSelector();
    }
    
    // Detectar formato y cargar
    const ext = currentModel['3dFiles'][firstModelIndex].path.toLowerCase().split('.').pop();
    
    if (ext === 'obj') {
        loadOBJ(firstModelIndex);
    } else {
        loadSTL(firstModelIndex);
    }
}

function createSTLSelector() {
    const container = document.getElementById('modelViewer');
    const selector = document.createElement('div');
    selector.id = 'stlSelector';
    
    // Filtrar solo archivos de modelos 3D (.stl, .obj)
    const modelFiles = currentModel['3dFiles']
        .map((file, originalIndex) => ({ file, originalIndex }))
        .filter(item => {
            const ext = item.file.path.toLowerCase().split('.').pop();
            return ext === 'stl' || ext === 'obj';
        });
    
    selector.innerHTML = '<label style="font-weight:600;color:var(--color-secondary);font-size:0.9rem;">Archivo 3D:</label><select id="stlSelect" style="padding:0.5rem;border:2px solid var(--color-light-gray);border-radius:8px;font-size:0.9rem;cursor:pointer;background:white;" onchange="changeSTL(this.value)">' + 
        modelFiles.map(item => 
            '<option value="'+item.originalIndex+'">'+item.file.name+' ('+item.file.fileSize+')</option>'
        ).join('') + 
        '</select>';
    container.appendChild(selector);
}

function changeSTL(index) {
    currentSTLIndex = parseInt(index);
    
    // Detectar formato del archivo
    const filePath = currentModel['3dFiles'][currentSTLIndex].path;
    const ext = filePath.toLowerCase().split('.').pop();
    
    if (ext === 'obj') {
        loadOBJ(currentSTLIndex);
    } else {
        loadSTL(currentSTLIndex);
    }
}

function loadSTL(index) {
    const container = document.getElementById('modelViewer');
    let stlPath;
    if (currentModel['3dFiles'] && currentModel['3dFiles'].length > 0) {
        stlPath = currentModel['3dFiles'][index].path;
        
        // Auto-fix path si no tiene prefijo models/
        // Soporta: "file.stl" o "models/file.stl"
        // Soporta: "models/file.stl" → sin cambios
        // Soporta: "models/id/file.stl" → sin cambios
        if (!stlPath.startsWith('models/')) {
            stlPath = 'models/' + stlPath;
        }
    } else if (currentModel['3dFile']) {
        stlPath = currentModel['3dFile'].path;
    }
    console.log('Loading STL:', stlPath);
    const selector = document.getElementById('stlSelector');
    container.innerHTML = '';
    if (selector) container.appendChild(selector);
    scene = new THREE.Scene();
    scene.background = null;
    scene.fog = new THREE.Fog(0xe0e0e0, 100, 350);
    camera = new THREE.PerspectiveCamera(50, container.offsetWidth / 600, 0.1, 1000);
    camera.position.set(0, 30, 80);
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.offsetWidth, 600);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.rotateSpeed = 0.5;
    controls.zoomSpeed = 0.8;
    controls.panSpeed = 0.5;
    controls.minDistance = 40;
    controls.maxDistance = 150;
    controls.maxPolarAngle = Math.PI;
    controls.target.set(0, 0, 0);
    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
    hemisphereLight.position.set(0, 200, 0);
    scene.add(hemisphereLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
    directionalLight.position.set(100, 100, 100);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    scene.add(directionalLight);
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight2.position.set(-50, 50, -50);
    scene.add(directionalLight2);
    const groundGeometry = new THREE.PlaneGeometry(400, 400);
    const groundMaterial = new THREE.MeshPhongMaterial({ color: 0xcccccc, side: THREE.DoubleSide, shininess: 0, transparent: true, opacity: 0.3 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -40;
    ground.receiveShadow = true;
    scene.add(ground);
    const gridHelper = new THREE.GridHelper(200, 20, 0x999999, 0xdddddd);
    gridHelper.position.y = -39.9;
    scene.add(gridHelper);
    const loader = new THREE.STLLoader();
    loader.load(stlPath, function(geometry) {
        const material = new THREE.MeshPhongMaterial({ color: 0xF5C842, specular: 0x666666, shininess: 150, flatShading: false });
        currentMesh = new THREE.Mesh(geometry, material);
        currentMesh.castShadow = true;
        currentMesh.receiveShadow = true;
        geometry.computeBoundingBox();
        geometry.center();
        geometry.computeBoundingBox();
        const size = new THREE.Vector3();
        geometry.boundingBox.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 80 / maxDim;
        currentMesh.scale.setScalar(scale);
        currentMesh.rotation.x = -Math.PI / 2;
        scene.add(currentMesh);
        const box = new THREE.Box3().setFromObject(currentMesh);
        const center = box.getCenter(new THREE.Vector3());
        const meshSize = box.getSize(new THREE.Vector3());
        controls.target.copy(center);
        controls.update();
        const distance = Math.max(meshSize.x, meshSize.y, meshSize.z) * 1.5;
        camera.position.set(center.x, center.y + distance * 0.5, center.z + distance);
        camera.lookAt(center);
        controls.minDistance = distance * 0.5;
        controls.maxDistance = distance * 2.5;
        function animate() {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        }
        animate();
        console.log('âœ… STL loaded successfully');
    }, function(xhr) {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    }, function(error) {
        console.error('âŒ Error loading STL:', error);
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

// ===== LOAD OBJ FILE =====
function loadOBJ(index) {
    const container = document.getElementById('modelViewer');
    let objPath;
    
    if (currentModel['3dFiles'] && currentModel['3dFiles'].length > 0) {
        objPath = currentModel['3dFiles'][index].path;
        
        if (!objPath.startsWith('models/')) {
            objPath = 'models/' + objPath;
        }
    }
    
    console.log('Loading OBJ:', objPath);
    const selector = document.getElementById('stlSelector');
    container.innerHTML = '';
    if (selector) container.appendChild(selector);
    
    // Scene setup (igual que STL)
    scene = new THREE.Scene();
    scene.background = null;
    scene.fog = new THREE.Fog(0xe0e0e0, 100, 350);
    camera = new THREE.PerspectiveCamera(50, container.offsetWidth / 600, 0.1, 1000);
    camera.position.set(0, 30, 80);
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.offsetWidth, 600);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.rotateSpeed = 0.5;
    controls.zoomSpeed = 0.8;
    controls.panSpeed = 0.5;
    controls.minDistance = 40;
    controls.maxDistance = 150;
    controls.maxPolarAngle = Math.PI;
    controls.target.set(0, 0, 0);
    
    // Lights (igual que STL)
    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
    hemisphereLight.position.set(0, 200, 0);
    scene.add(hemisphereLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
    directionalLight.position.set(100, 100, 100);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight2.position.set(-50, 50, -50);
    scene.add(directionalLight2);
    
    // Ground
    const groundGeometry = new THREE.PlaneGeometry(400, 400);
    const groundMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xcccccc, 
        side: THREE.DoubleSide, 
        shininess: 0, 
        transparent: true, 
        opacity: 0.3 
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -40;
    ground.receiveShadow = true;
    scene.add(ground);
    
    const gridHelper = new THREE.GridHelper(200, 20, 0x999999, 0xdddddd);
    gridHelper.position.y = -39.9;
    scene.add(gridHelper);
    
    // Buscar archivo MTL
    const mtlPath = objPath.replace('.obj', '.mtl');
    const mtlFileName = mtlPath.substring(mtlPath.lastIndexOf('/') + 1); // Solo nombre
    const texturePath = objPath.substring(0, objPath.lastIndexOf('/') + 1); // Carpeta
    const objLoader = new THREE.OBJLoader();

    // Intentar cargar MTL primero
    console.log('🔍 Attempting to load MTL:', mtlFileName);
    console.log('🔍 MTL path set to:', texturePath);
    console.log('🔍 Full MTL path would be:', texturePath + mtlFileName);

    const mtlLoader = new THREE.MTLLoader();
    mtlLoader.setPath(texturePath); // Carpeta base TAMBIÉN para texturas en r84
    mtlLoader.load(
        mtlFileName, // Solo nombre del archivo, sin path
        function(materials) {
            console.log('✅ MTL loaded successfully!');
            console.log('📦 Materials object:', materials);
            console.log('📦 Material names:', Object.keys(materials.materials));
            materials.preload();
            console.log('✅ Materials preloaded');
            objLoader.setMaterials(materials);
            console.log('✅ Materials set to OBJLoader');
            loadOBJGeometry(objLoader, objPath);
        },
        function(xhr) {
            console.log('📊 MTL loading progress:', (xhr.loaded / xhr.total * 100) + '%');
        },
        function(error) {
            console.log('❌ MTL loading failed');
            console.log('❌ Error details:', error);
            console.log('No MTL file found, using default material');
            loadOBJGeometry(objLoader, objPath);
        }
    );
    
    function loadOBJGeometry(loader, path) {
        loader.load(path, function(object) {
            console.log('🎨 OBJ Object loaded, inspecting...');
            console.log('🎨 Object:', object);
            
            let meshCount = 0;
            object.traverse(function(child) {
                if (child instanceof THREE.Mesh) {
                    meshCount++;
                    console.log(`🔍 Mesh #${meshCount}:`, child.name || 'unnamed');
                    console.log('  Material:', child.material);
                    console.log('  Material type:', child.material ? child.material.type : 'none');
                    
                    if (child.material) {
                        console.log('  Color:', child.material.color);
                        console.log('  Map (texture):', child.material.map);
                        
                        if (child.material.map) {
                            console.log('✅ Has texture map!');
                            console.log('  Texture image:', child.material.map.image);
                            console.log('  Texture source:', child.material.map.image ? child.material.map.image.src : 'no source');
                            
                            // CRITICAL: Esperar a que la textura cargue
                            const texture = child.material.map;
                            if (texture.image && !texture.image.complete) {
                                console.log('⏳ Waiting for texture to load...');
                                texture.image.onload = function() {
                                    console.log('✅ Texture loaded!');
                                    texture.needsUpdate = true;
                                    child.material.needsUpdate = true;
                                };
                            } else {
                                console.log('✅ Texture already loaded');
                                texture.needsUpdate = true;
                                child.material.needsUpdate = true;
                            }
                        }
                        else {
                            console.log('❌ No texture map found');
                        }
                    }
                }
            });
            
            console.log(`Total meshes found: ${meshCount}`);
            
            // Si no tiene materiales MTL, aplicar material dorado
            if (!object.material) {
                object.traverse(function(child) {
                    if (child instanceof THREE.Mesh) {
                        child.material = new THREE.MeshPhongMaterial({ 
                            color: 0xF5C842, 
                            specular: 0x666666, 
                            shininess: 150 
                        });
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
            }
            
            currentMesh = object;
            
            // Center and scale
            const box = new THREE.Box3().setFromObject(object);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 80 / maxDim;
            object.scale.setScalar(scale);
            
            object.position.sub(center.multiplyScalar(scale));
            object.position.y += size.y * scale / 2 - 40;
            
            scene.add(object);
            
            // Update camera
            const meshSize = size.multiplyScalar(scale);
            controls.target.set(0, meshSize.y / 2 - 40, 0);
            controls.update();
            
            const distance = Math.max(meshSize.x, meshSize.y, meshSize.z) * 1.5;
            camera.position.set(0, distance * 0.5, distance);
            camera.lookAt(controls.target);
            
            controls.minDistance = distance * 0.5;
            controls.maxDistance = distance * 2.5;
            
            function animate() {
                requestAnimationFrame(animate);
                controls.update();
                renderer.render(scene, camera);
            }
            animate();
            
            console.log('✅ OBJ loaded successfully');
        }, function(xhr) {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        }, function(error) {
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

// ===== CREATE RELATED MODEL CARD =====
function createRelatedCard(model) {
    const badge = model.type === 'Funcional' 
        ? '<span class="model-badge badge-functional">ðŸ”§ FUNCIONAL</span>'
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
            <span style="font-size: 5rem; display: block; margin-bottom: 1rem;">ðŸ”</span>
            <h2 style="color: var(--color-secondary); margin-bottom: 1rem;">Modelo no encontrado</h2>
            <p style="color: var(--color-gray); margin-bottom: 2rem;">
                El modelo que buscas no existe o la URL es incorrecta.
            </p>
            <a href="catalog.html" class="btn">VER CATÃLOGO COMPLETO</a>
        </div>
    `;
}

// ===== RESET AND SCROLL TO VIEWER =====
function resetAndScroll() {
    sessionStorage.setItem('scrollToViewer', 'true');
    location.reload();
}

window.addEventListener('load', () => {
    if (sessionStorage.getItem('scrollToViewer') === 'true') {
        sessionStorage.removeItem('scrollToViewer');
        
        setTimeout(() => {
            const viewer = document.getElementById('modelViewer');
            if (viewer) {
                viewer.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center'
                });
            }
        }, 300);
    }
});

// ===== CLOSE ROTATION HINT =====
function closeRotationHint() {
    const hint = document.getElementById('rotationHint');
    if (hint) {
        hint.classList.remove('active');
    }
}

// ===== MATERIAL MODE TOGGLE =====
let materialMode = 'texture'; // texture, wireframe, solid, normals
let originalMaterial = null;

function toggleMaterialMode() {
    if (!currentMesh) return;
    
    const modes = ['texture', 'solid', 'wireframe', 'normals'];
    const currentIndex = modes.indexOf(materialMode);
    materialMode = modes[(currentIndex + 1) % modes.length];
    
    currentMesh.traverse(function(child) {
        if (child instanceof THREE.Mesh) {
            // Guardar material original la primera vez
            if (!originalMaterial && child.material.map) {
                originalMaterial = child.material.clone();
            }
            
            switch(materialMode) {
                case 'texture':
                    if (originalMaterial) {
                        child.material = originalMaterial.clone();
                        child.material.needsUpdate = true;
                    }
                    break;
                    
                case 'solid':
                    child.material = new THREE.MeshPhongMaterial({
                        color: 0xcccccc,
                        flatShading: false
                    });
                    break;
                    
                case 'wireframe':
                    child.material = new THREE.MeshBasicMaterial({
                        color: 0x00ff00,
                        wireframe: true
                    });
                    break;
                    
                case 'normals':
                    child.material = new THREE.MeshNormalMaterial();
                    break;
            }
        }
    });
    
    // Actualizar label
    const modeLabels = {
        'texture': 'Textura',
        'solid': 'Sólido',
        'wireframe': 'Wireframe',
        'normals': 'Normales'
    };
    document.getElementById('materialModeLabel').textContent = modeLabels[materialMode];
    
    console.log('🎨 Material mode:', materialMode);
}