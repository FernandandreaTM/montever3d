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
