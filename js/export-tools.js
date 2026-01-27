// ===== EXPORT-TOOLS.JS - Screenshot & GIF Recording System =====

let isRecording = false;
let gifRecorder = null;
let recordedFrames = [];
let recordingInterval = null;

// ===== TOGGLE EXPORT MENU =====
function toggleExportMenu() {
    const menu = document.getElementById('exportMenu');
    menu.classList.toggle('active');
}

// ===== CLOSE MENU (click outside) =====
document.addEventListener('click', (e) => {
    const menu = document.getElementById('exportMenu');
    const btn = document.getElementById('exportBtn');
    
    if (menu && !menu.contains(e.target) && !btn.contains(e.target)) {
        menu.classList.remove('active');
    }
});

// ===== SCREENSHOT EXPORT =====
function exportScreenshot(format) {
    if (!renderer) return;
    
    renderer.render(scene, camera);
    let mimeType = 'image/png';
    let extension = 'png';
    
    switch(format) {
        case 'jpg':
            mimeType = 'image/jpeg';
            extension = 'jpg';
            break;
        case 'webp':
            mimeType = 'image/webp';
            extension = 'webp';
            break;
    }
    
    const dataURL = renderer.domElement.toDataURL(mimeType, 0.95);
    const link = document.createElement('a');
    link.download = `${currentModel.id}_${Date.now()}.${extension}`;
    link.href = dataURL;
    link.click();
    
    showToast(`Screenshot guardado (${format.toUpperCase()})`);
    toggleExportMenu();
}

// ===== GIF RECORDING =====
function toggleGIFRecording() {
    if (!isRecording) {
        startGIFRecording();
    } else {
        stopGIFRecording();
    }
}

function startGIFRecording() {
    isRecording = true;
    recordedFrames = [];
    
    const btn = document.getElementById('gifRecordBtn');
    btn.textContent = '⏹️ Detener GIF';
    btn.style.background = 'rgba(230, 57, 70, 0.9)';
    
    showToast('🎬 Grabación GIF iniciada');
    toggleExportMenu();
    
    recordingInterval = setInterval(() => {
        if (recordedFrames.length < 60) {
            captureFrame();
        } else {
            stopGIFRecording();
        }
    }, 100);
}

function captureFrame() {
    renderer.render(scene, camera);
    const imageData = renderer.domElement.toDataURL('image/png');
    recordedFrames.push(imageData);
}

function stopGIFRecording() {
    isRecording = false;
    clearInterval(recordingInterval);
    
    const btn = document.getElementById('gifRecordBtn');
    btn.textContent = '🎞️ Grabar GIF';
    btn.style.background = 'rgba(255, 255, 255, 0.85)';
    
    if (recordedFrames.length < 10) {
        showToast('❌ GIF muy corto (mínimo 1 seg)');
        recordedFrames = [];
        return;
    }
    
    showToast('⏳ Generando GIF...');
    generateGIF();
}

function generateGIF() {
    const gif = new GIF({
        workers: 2,
        quality: 10,
        width: renderer.domElement.width,
        height: renderer.domElement.height,
        workerScript: 'js/gif.worker.js'
    });
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = renderer.domElement.width;
    tempCanvas.height = renderer.domElement.height;
    const ctx = tempCanvas.getContext('2d', { willReadFrequently: true });
    
    recordedFrames.forEach(frame => {
        const img = new Image();
        img.src = frame;
        img.onload = () => {
            ctx.drawImage(img, 0, 0);
            gif.addFrame(ctx, { copy: true, delay: 100 });
        };
    });
    
    gif.on('finished', (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `${currentModel.id}_animation_${Date.now()}.gif`;
        link.href = url;
        link.click();
        
        showToast('✅ GIF exportado');
        recordedFrames = [];
    });
    
    setTimeout(() => {
        gif.render();
    }, 500);
}

console.log('✅ Export Tools loaded');