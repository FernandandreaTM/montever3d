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

// ===== AUTO-ROTATION =====
function toggleAutoRotate() {
    if (!currentMesh) return;
    
    isAutoRotating = !isAutoRotating;
    
    const btn = document.getElementById('autoRotateBtn');
    if (btn) {
        btn.style.background = isAutoRotating 
            ? 'rgba(245, 200, 66, 0.9)' 
            : 'rgba(255, 255, 255, 0.85)';
    }
    
    console.log('🔄 Auto-rotation:', isAutoRotating ? 'ON' : 'OFF');
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
            // Entrando a fullscreen
            camera.aspect = window.innerWidth / window.innerHeight;
            renderer.setSize(window.innerWidth, window.innerHeight);
        } else {
            // Saliendo de fullscreen
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

function setBackground(type) {
    if (!scene) return;
    
    currentBackground = type;
    
    if (groundMesh) {
        scene.remove(groundMesh);
        groundMesh = null;
    }
    if (gridMesh) {
        scene.remove(gridMesh);
        gridMesh = null;
    }
    
    switch(type) {
        case 'default':
            scene.background = null;
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
            
            gridMesh = new THREE.GridHelper(200, 20, 0x999999, 0xdddddd);
            gridMesh.position.y = -39.9;
            scene.add(gridMesh);
            break;
            
        case 'transparent':
            scene.background = null;
            break;
            
        case 'white':
            scene.background = new THREE.Color(0xffffff);
            break;
            
        case 'black':
            scene.background = new THREE.Color(0x000000);
            break;
            
        case 'gradient-green':
            scene.background = new THREE.Color(0x2F5233);
            break;
            
        case 'gradient-blue':
            scene.background = new THREE.Color(0x1a3a52);
            break;
            
        case 'grid-only':
            scene.background = null;
            gridMesh = new THREE.GridHelper(200, 20, 0x999999, 0xdddddd);
            gridMesh.position.y = -39.9;
            scene.add(gridMesh);
            break;
    }
    
    console.log('Background changed to:', type);
}