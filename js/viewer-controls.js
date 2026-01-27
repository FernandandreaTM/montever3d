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
    
    document.getElementById('cameraViewLabel').textContent = viewLabels[view];
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
    const container = document.getElementById('modelViewer');
    
    if (!document.fullscreenElement) {
        container.requestFullscreen().catch(err => {
            console.error('Error attempting fullscreen:', err);
        });
    } else {
        document.exitFullscreen();
    }
}

document.addEventListener('fullscreenchange', () => {
    if (renderer && camera) {
        const container = document.getElementById('modelViewer');
        if (document.fullscreenElement) {
            camera.aspect = window.innerWidth / window.innerHeight;
            renderer.setSize(window.innerWidth, window.innerHeight);
        } else {
            camera.aspect = container.offsetWidth / 600;
            renderer.setSize(container.offsetWidth, 600);
        }
        camera.updateProjectionMatrix();
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

function setSceneColor(color) {
    if (!scene) return;
    scene.background = new THREE.Color(color);
}