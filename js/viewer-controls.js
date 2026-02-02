// ===== VIEWER-CONTROLS.JS - Camera, Rotation, Screenshot, Fullscreen Controls =====

// ===== CAMERA PRESETS =====
function setCameraView(view) {
    if (!currentMesh || !camera || !controls) return;
    
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
    console.log('📸 Camera view set to:', view);
}

const cameraViews = ['front', 'top', 'isometric', 'back', 'left', 'right'];
let currentViewIndex = 0;

function cycleCameraView() {
    currentViewIndex = (currentViewIndex + 1) % cameraViews.length;
    const view = cameraViews[currentViewIndex];
    setCameraView(view);
    
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

// ===== AUTO-ROTATION =====
let rotationSpeed = 0.01;
let rotationAxis = 'y';
let rotationMode = 'camera';
let isCameraRotating = true;
let isModelRotating = false;

function toggleCameraRotation() {
    isCameraRotating = !isCameraRotating;
    
    const btn = document.getElementById('cameraRotateBtn');
    if (btn) {
        btn.style.background = isCameraRotating 
            ? 'rgba(245, 200, 66, 0.9)' 
            : 'rgba(255, 255, 255, 0.85)';
    }
}

function toggleModelRotation() {
    isModelRotating = !isModelRotating;
    
    const btn = document.getElementById('modelRotateToggle');
    if (btn) {
        btn.style.background = isModelRotating 
            ? 'rgba(245, 200, 66, 0.9)' 
            : 'rgba(255, 255, 255, 0.85)';
    }
}

function toggleRepositionPanel() {
    const panel = document.getElementById('repositionPanel');
    if (panel) {
        panel.classList.toggle('active');
    }
}

function updateRotationSpeed(value) {
    rotationSpeed = parseFloat(value);
    document.getElementById('speedValue').textContent = value;
}

function setRotationAxis(axis) {
    rotationAxis = axis;
}

function resetRotationSettings() {
    rotationSpeed = 0.01;
    rotationAxis = 'y';
    isModelRotating = false;
    
    document.getElementById('speedSlider').value = 0.01;
    document.getElementById('speedValue').textContent = '0.01';
    document.getElementById('axisSelect').value = 'y';
    document.getElementById('modelRotateToggle').style.background = 'rgba(255, 255, 255, 0.85)';
}

function setManualRotation(axis, value) {
    if (!currentMesh) return;
    const radians = (parseFloat(value) * Math.PI) / 180;
    currentMesh.rotation[axis] = radians;
}

function updateRotationInput(axis, value) {
    document.getElementById(`rotation-${axis}-value`).value = value;
    setManualRotation(axis, value);
}

function resetManualRotation() {
    if (!currentMesh) return;
    currentMesh.rotation.set(0, 0, 0);
    ['x', 'y', 'z'].forEach(axis => {
        document.getElementById(`rotation-${axis}-slider`).value = 0;
        document.getElementById(`rotation-${axis}-value`).value = 0;
    });
}

// ===== SCREENSHOT =====
function takeScreenshot() {
    if (!renderer) return;
    
    try {
        renderer.render(scene, camera);
        const dataURL = renderer.domElement.toDataURL('image/png');
        
        const link = document.createElement('a');
        link.download = `${currentModel.id}_screenshot_${Date.now()}.png`;
        link.href = dataURL;
        link.click();
        
        console.log('📷 Screenshot saved');
        
        const btn = document.getElementById('screenshotBtn');
        if (btn) {
            const originalBg = btn.style.background;
            btn.style.background = 'rgba(6, 214, 160, 0.9)';
            setTimeout(() => {
                btn.style.background = originalBg;
            }, 500);
        }
    } catch (error) {
        console.error('Error taking screenshot:', error);
    }
}

// ===== FULLSCREEN =====
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
    const container = document.querySelector('.viewer-hero-container');
    
    if (document.fullscreenElement) {
        if (renderer && camera) {
            // Fullscreen activado
            const width = window.innerWidth;
            const height = window.innerHeight;
            
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
            
            // Forzar canvas a ocupar todo
            if (renderer.domElement) {
                renderer.domElement.style.width = '100%';
                renderer.domElement.style.height = '100%';
            }
        }
        console.log('✅ Fullscreen activado');
    } else {
        if (renderer && camera) {
            // Fullscreen desactivado
            const width = viewerCanvas.offsetWidth;
            const height = 700;
            
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
            
            // Restaurar tamaño normal
            if (renderer.domElement) {
                renderer.domElement.style.width = '100%';
                renderer.domElement.style.height = '100%';
            }
        }
        console.log('✅ Fullscreen desactivado');
    }
});

// ===== RESET AND SCROLL =====
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

// ===== ROTATION HINT =====
function closeRotationHint() {
    const hint = document.getElementById('rotationHint');
    if (hint) {
        hint.classList.remove('active');
    }
}

function toggleGround() {
    if (!scene) return;
    
    if (groundMesh) {
        scene.remove(groundMesh);
        groundMesh = null;
        document.getElementById('groundBtn').style.background = 'rgba(255, 255, 255, 0.85)';
    } else {
        const groundGeometry = new THREE.PlaneGeometry(400, 400);
        const groundMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xcccccc, 
            side: THREE.DoubleSide, 
            shininess: 0, 
            transparent: true, 
            opacity: 0.3 
        });
        groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
        groundMesh.rotation.x = -Math.PI / 2;
        groundMesh.position.y = -40;
        groundMesh.receiveShadow = true;
        scene.add(groundMesh);
        document.getElementById('groundBtn').style.background = 'rgba(245, 200, 66, 0.9)';
    }
}

function toggleGrid() {
    if (!scene) return;
    
    if (gridMesh) {
        scene.remove(gridMesh);
        gridMesh = null;
        document.getElementById('gridBtn').style.background = 'rgba(255, 255, 255, 0.85)';
    } else {
        gridMesh = new THREE.GridHelper(200, 20, 0x999999, 0xdddddd);
        gridMesh.position.y = -39.9;
        scene.add(gridMesh);
        document.getElementById('gridBtn').style.background = 'rgba(245, 200, 66, 0.9)';
    }
}

// ===== LANDSCAPES/BACKGROUNDS =====
const landscapeColors = {
    'desierto': 0xae8656,
    'bosque': 0x2F5233,
    'oceano': 0x4A90A4,
    'noche': 0x1A1A2E,
    'nieve': 0xe8e8d4
};

let currentLandscape = 'desierto';

// ===== APLICAR LANDSCAPE PREDEFINIDO =====
function applyLandscape(type) {
    if (!scene) return;
    
    currentLandscape = type;
    const color = landscapeColors[type];
    scene.background = new THREE.Color(color);
    
    const landscapeLabels = {
        'desierto': 'Desierto',
        'bosque': 'Bosque',
        'oceano': 'Océano',
        'noche': 'Noche',
        'nieve': 'Nieve'
    };
    
    showToast(`Fondo: ${landscapeLabels[type]}`);
}

// ===== LANDSCAPE CON OPCIÓN CUSTOM =====
function selectLandscape(value) {
    if (value === 'custom') {
        openBackgroundColorPicker();
        return;
    }
    applyLandscape(value);
}

// ===== SELECTOR COLOR BACKGROUND PERSONALIZADO =====
function openBackgroundColorPicker() {
    const input = document.createElement('input');
    input.type = 'color';
    input.style.position = 'fixed';
    input.style.top = '16px';
    input.style.right = '160px';
    input.style.opacity = '0';
    input.style.pointerEvents = 'none';
    
    const currentColor = scene.background;
    const hex = '#' + currentColor.getHexString();
    input.value = hex;
    
    input.addEventListener('change', (e) => {
        setSceneColor(e.target.value);
        currentLandscape = 'custom';
        showToast('Fondo personalizado');
        document.body.removeChild(input);
    });
    
    input.addEventListener('blur', () => {
        setTimeout(() => {
            if (document.body.contains(input)) {
                document.body.removeChild(input);
            }
        }, 100);
    });
    
    document.body.appendChild(input);
    input.click();
}

function setSceneColor(color) {
    if (!scene) return;
    scene.background = new THREE.Color(color);
}

function toggleMeasurementPanel() {
    const panel = document.getElementById('measurementPanel');
    if (panel) {
        panel.classList.toggle('active');
    }
}

function showToast(message) {
    const toast = document.getElementById('viewerToast');
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
}

// ===== TOGGLE CONTROLS VISIBILITY (MANUAL ONLY) =====
function toggleControlsVisibility() {
    const allGroups = document.querySelectorAll('.control-group:not(:has(#toggleControlsBtn))');
    const btn = document.getElementById('toggleControlsBtn');
    
    if (btn.dataset.hidden === 'true') {
        allGroups.forEach(group => {
            group.style.opacity = '1';
            group.style.pointerEvents = 'all';
        });
        btn.textContent = '👁️';
        btn.dataset.hidden = 'false';
    } else {
        allGroups.forEach(group => {
            group.style.opacity = '0';
            group.style.pointerEvents = 'none';
        });
        btn.textContent = '🙈';
        btn.dataset.hidden = 'true';
    }
}

function toggleNotesPanel() {
    const panel = document.getElementById('notesPanel');
    if (panel) {
        panel.classList.toggle('active');
    }
}

function toggleOpacityPanel() {
    const panel = document.getElementById('opacityPanel');
    if (panel) {
        panel.classList.toggle('active');
    }
}

// ===== COLAPSAR GRUPOS DE CONTROLES =====
function toggleControlGroup(groupId) {
    const group = document.getElementById(groupId);
    if (group) {
        group.classList.toggle('collapsed');
    }
}

// ===== COLAPSAR BARRA DE HERRAMIENTAS =====
function toggleToolsBar() {
    const toolbar = document.getElementById('toolsContainer');
    if (toolbar) {
        toolbar.classList.toggle('collapsed');
    }
}

// ===== TEXTURE SELECTOR MENU =====
function toggleTextureMenu() {
    const menu = document.getElementById('textureMenu');
    const landscapeMenu = document.getElementById('landscapeMenu');
    const exportMenu = document.getElementById('exportMenu');
    
    // Cerrar otros menús
    if (landscapeMenu) landscapeMenu.classList.remove('active');
    if (exportMenu) exportMenu.classList.remove('active');
    
    menu.classList.toggle('active');
}

function selectTexture(type) {
    applyProceduralTexture(type);
    toggleTextureMenu();
}

// ===== LANDSCAPE SELECTOR MENU =====
function toggleLandscapeMenu() {
    const menu = document.getElementById('landscapeMenu');
    const textureMenu = document.getElementById('textureMenu');
    const exportMenu = document.getElementById('exportMenu');
    
    // Cerrar otros menús
    if (textureMenu) textureMenu.classList.remove('active');
    if (exportMenu) exportMenu.classList.remove('active');
    
    menu.classList.toggle('active');
}

function selectLandscapeFromMenu(type) {
    if (type === 'custom') {
        toggleLandscapeMenu();
        openBackgroundColorPicker();
    } else {
        applyLandscape(type);
        toggleLandscapeMenu();
    }
}

// ===== LIGHTING PRESETS =====
function toggleLightingMenu() {
    const menu = document.getElementById('lightingMenu');
    const textureMenu = document.getElementById('textureMenu');
    const landscapeMenu = document.getElementById('landscapeMenu');
    const exportMenu = document.getElementById('exportMenu');
    
    // Cerrar otros menús
    if (textureMenu) textureMenu.classList.remove('active');
    if (landscapeMenu) landscapeMenu.classList.remove('active');
    if (exportMenu) exportMenu.classList.remove('active');
    
    menu.classList.toggle('active');
}

function applyLightingPreset(preset) {
    if (!scene) return;
    
    // Limpiar luces existentes (excepto ambient)
    const lightsToRemove = [];
    scene.children.forEach(child => {
        if (child instanceof THREE.DirectionalLight || child instanceof THREE.HemisphereLight) {
            lightsToRemove.push(child);
        }
    });
    lightsToRemove.forEach(light => scene.remove(light));
    
    switch(preset) {
        case 'studio':
            // 3 luces balanceadas (key, fill, rim)
            const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
            keyLight.position.set(100, 100, 100);
            keyLight.castShadow = true;
            scene.add(keyLight);
            
            const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
            fillLight.position.set(-50, 50, -50);
            scene.add(fillLight);
            
            const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
            rimLight.position.set(0, 50, -100);
            scene.add(rimLight);
            
            const hemiStudio = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
            scene.add(hemiStudio);
            
            showToast('Iluminación: Studio');
            break;
            
        case 'exterior':
            // Luz natural tipo sol
            const sunLight = new THREE.DirectionalLight(0xffffcc, 1.0);
            sunLight.position.set(150, 200, 100);
            sunLight.castShadow = true;
            scene.add(sunLight);
            
            const skyLight = new THREE.HemisphereLight(0x87CEEB, 0x8B7355, 0.8);
            scene.add(skyLight);
            
            showToast('Iluminación: Exterior');
            break;
            
        case 'dramatico':
            // Luz fuerte desde un lado con sombras marcadas
            const dramaticLight = new THREE.DirectionalLight(0xffffff, 1.2);
            dramaticLight.position.set(150, 100, 50);
            dramaticLight.castShadow = true;
            scene.add(dramaticLight);
            
            const hemiDark = new THREE.HemisphereLight(0x444444, 0x222222, 0.3);
            scene.add(hemiDark);
            
            showToast('Iluminación: Dramático');
            break;
            
        case 'nocturno':
            // Luz suave y tenue
            const moonLight = new THREE.DirectionalLight(0xaaccff, 0.5);
            moonLight.position.set(50, 100, 80);
            moonLight.castShadow = true;
            scene.add(moonLight);
            
            const hemiNight = new THREE.HemisphereLight(0x334466, 0x111122, 0.4);
            scene.add(hemiNight);
            
            showToast('Iluminación: Nocturno');
            break;
    }
    
    toggleLightingMenu();
}

// ===== CLOSE TEXTURE/LANDSCAPE MENUS (click outside) =====
document.addEventListener('click', (e) => {
    const textureMenu = document.getElementById('textureMenu');
    const landscapeMenu = document.getElementById('landscapeMenu');
    
    // Texture menu
    if (textureMenu && !textureMenu.contains(e.target) && 
        !e.target.closest('[onclick*="toggleTextureMenu"]')) {
        textureMenu.classList.remove('active');
    }
    
    // Landscape menu
    if (landscapeMenu && !landscapeMenu.contains(e.target) && 
        !e.target.closest('[onclick*="toggleLandscapeMenu"]')) {
        landscapeMenu.classList.remove('active');
    }
});

