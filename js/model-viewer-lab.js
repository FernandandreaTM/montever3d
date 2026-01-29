// ===== MODEL-VIEWER-LAB.JS - Lab-only minimal loader =====

// ===== GLOBAL SHARED VARIABLES =====
let currentModel = null;
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
            showLabError();
            return;
        }
        
        const modelResponse = await fetch(`data/models/${modelId}.json`);
        
        if (!modelResponse.ok) {
            showLabError();
            return;
        }
        
        currentModel = await modelResponse.json();
        
        populateLabHeader();
        initialize3DViewer();

        // Auto-fullscreen on load
        setTimeout(() => {
            const container = document.querySelector('.viewer-hero-container');
            if (container && !document.fullscreenElement) {
                container.requestFullscreen().catch(err => {
                    console.log('Fullscreen bloqueado por navegador, modo regular activo');
                });
            }
        }, 500);
        
        console.log(`✅ Lab loaded model: ${currentModel.id}`);
        
    } catch (error) {
        console.error('Error loading model:', error);
        showLabError();
    }
}

// ===== POPULATE ONLY HEADER INFO =====
function populateLabHeader() {
    document.title = `${currentModel.title} - Laboratorio 3D - MonteVer3D`;
    document.getElementById('pageTitle').textContent = `${currentModel.title} - Laboratorio 3D - MonteVer3D`;
    
    // Update breadcrumb
    document.getElementById('breadcrumbCategory').textContent = currentModel.category;
    document.getElementById('breadcrumbTitle').textContent = currentModel.title;
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

// ===== INITIALIZE 3D VIEWER =====
function initialize3DViewer() {
    const file3D = get3DFile();
    
    if (!file3D || !file3D.hosted) {
        console.error('No 3D file available');
        return;
    }
    
    document.getElementById('viewerSection').style.display = 'block';
    
    // Multi-file selector if needed
    const modelFiles = currentModel['3dFiles'] ? currentModel['3dFiles'].filter(f => {
        const ext = f.path.toLowerCase().split('.').pop();
        return ext === 'obj' || ext === 'stl';
    }) : [];
    
    if (modelFiles.length > 1) {
        createSTLSelector();
    }
    
    // Load first valid model
    const firstModelIndex = currentModel['3dFiles'] ? currentModel['3dFiles'].findIndex(f => {
        const ext = f.path.toLowerCase().split('.').pop();
        return ext === 'obj' || ext === 'stl';
    }) : -1;
    
    if (firstModelIndex === -1) {
        console.error('No valid 3D model found');
        return;
    }
    
    const ext = currentModel['3dFiles'][firstModelIndex].path.toLowerCase().split('.').pop();
    
    if (ext === 'obj') {
        loadOBJ(firstModelIndex);
    } else {
        loadSTL(firstModelIndex);
    }
}

// ===== CREATE STL SELECTOR =====
function createSTLSelector() {
    const container = document.getElementById('modelViewer');
    const selector = document.createElement('div');
    selector.id = 'stlSelector';
    
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

// ===== CHANGE STL =====
function changeSTL(index) {
    const currentSTLIndex = parseInt(index);
    
    const filePath = currentModel['3dFiles'][currentSTLIndex].path;
    const ext = filePath.toLowerCase().split('.').pop();
    
    if (ext === 'obj') {
        loadOBJ(currentSTLIndex);
    } else {
        loadSTL(currentSTLIndex);
    }
}

// ===== ERROR DISPLAY =====
function showLabError() {
    const viewerSection = document.getElementById('viewerSection');
    if (viewerSection) {
        viewerSection.style.display = 'block';
        document.getElementById('modelViewer').innerHTML = `
            <div style="padding: 4rem; text-align: center;">
                <span style="font-size: 5rem; display: block; margin-bottom: 1rem;">⚠️</span>
                <h2 style="color: var(--color-secondary); margin-bottom: 1rem;">Error al cargar modelo</h2>
                <p style="color: var(--color-gray); margin-bottom: 2rem;">
                    No se pudo cargar el modelo 3D solicitado.
                </p>
                <a href="catalog.html" class="btn">VOLVER AL CATÁLOGO</a>
            </div>
        `;
    }
}
// Fullscreen Banner Controls
function closeFullscreenBanner() {
    const banner = document.getElementById('fullscreenBanner');
    if (banner) {
        banner.style.animation = 'slideDown 0.3s ease reverse';
        setTimeout(() => banner.remove(), 300);
    }
}

// Auto-hide banner after fullscreen activated
document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement) {
        closeFullscreenBanner();
    }
});

// Make banner clickable to activate fullscreen
window.addEventListener('load', () => {
    const banner = document.getElementById('fullscreenBanner');
    if (banner) {
        banner.addEventListener('click', (e) => {
            if (e.target.tagName !== 'BUTTON') {
                toggleViewerFullscreen();
            }
        });
    }
});

console.log('✅ Model Viewer Lab loaded');
