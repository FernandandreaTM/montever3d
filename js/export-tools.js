// ===== EXPORT-TOOLS.JS - Screenshot, GIF & Video Recording System =====

let isRecording = false;
let gifRecorder = null;
let recordedFrames = [];
let recordingInterval = null;
let isVideoRecording = false;
let videoRecorder = null;
let videoChunks = [];
let videoFormat = 'mp4';
let videoStream = null;
let videoProgressInterval = null;
let videoStartTime = 0;

// ===== EXPORT SETTINGS (USER CONFIGURABLE) =====
let exportSettings = {
    gif: {
        fps: 10,
        duration: 6
    },
    video: {
        resolution: 720,
        duration: 20,
        bitrate: 2.5,
        format: 'mp4'
    },
    screenshot: {
        scale: 2,
        format: 'png'
    }
};

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

// ===== EXPORT SETTINGS MODAL =====
function openExportSettings() {
    document.getElementById('exportSettingsModal').style.display = 'flex';
    toggleExportMenu();
}

function closeExportSettings() {
    document.getElementById('exportSettingsModal').style.display = 'none';
}

function updateSettingValue(setting, value) {
    const numValue = parseFloat(value);
    
    switch(setting) {
        case 'gifFps':
            exportSettings.gif.fps = numValue;
            document.getElementById('gifFpsValue').textContent = value;
            break;
        case 'gifDuration':
            exportSettings.gif.duration = numValue;
            document.getElementById('gifDurationValue').textContent = value;
            break;
        case 'videoResolution':
            exportSettings.video.resolution = numValue;
            break;
        case 'videoDuration':
            exportSettings.video.duration = numValue;
            document.getElementById('videoDurationValue').textContent = value;
            break;
        case 'videoBitrate':
            exportSettings.video.bitrate = numValue;
            document.getElementById('videoBitrateValue').textContent = value;
            break;
        case 'screenshotScale':
            exportSettings.screenshot.scale = numValue;
            break;
        case 'screenshotFormat':
            exportSettings.screenshot.format = value;
            break;
        case 'videoFormat':
            exportSettings.video.format = value;
            break;            
    }
}

// Close modal on click outside
document.addEventListener('click', (e) => {
    const modal = document.getElementById('exportSettingsModal');
    if (modal && e.target === modal) {
        closeExportSettings();
    }
});

// ===== WRAPPER FUNCTIONS (use configured settings) =====
function exportScreenshotDefault() {
    exportScreenshot(exportSettings.screenshot.format);
}

function toggleVideoRecordingDefault() {
    toggleVideoRecording(exportSettings.video.format);
}

// ===== SCREENSHOT EXPORT =====
function exportScreenshot(format) {
    if (!renderer) return;
    
    const scale = exportSettings.screenshot.scale;
    const originalWidth = renderer.domElement.width;
    const originalHeight = renderer.domElement.height;
    
    // Temporarily increase resolution
    renderer.setSize(originalWidth * scale, originalHeight * scale);
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
    
    // Restore original resolution
    renderer.setSize(originalWidth, originalHeight);
    camera.aspect = originalWidth / originalHeight;
    camera.updateProjectionMatrix();
    
    showToast(`Screenshot guardado (${format.toUpperCase()} ${scale}x)`);
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
    
    const fps = exportSettings.gif.fps;
    const duration = exportSettings.gif.duration;
    const maxFrames = fps * duration;
    const frameDelay = 1000 / fps;
    
    recordingInterval = setInterval(() => {
        if (recordedFrames.length < maxFrames) {
            captureFrame();
        } else {
            stopGIFRecording();
        }
    }, frameDelay);
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
    
    if (recordedFrames.length < 5) {
        showToast('❌ GIF muy corto (mínimo 0.5 seg)');
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
    
    const frameDelay = 1000 / exportSettings.gif.fps;
    
    recordedFrames.forEach(frame => {
        const img = new Image();
        img.src = frame;
        img.onload = () => {
            ctx.drawImage(img, 0, 0);
            gif.addFrame(ctx, { copy: true, delay: frameDelay });
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

// ===== VIDEO RECORDING =====
function toggleVideoRecording(format) {
    videoFormat = format || exportSettings.video.format;
    
    if (!isVideoRecording) {
        startVideoRecording();
    } else {
        stopVideoRecording();
    }
}

function startVideoRecording() {
    isVideoRecording = true;
    videoChunks = [];
    videoStartTime = Date.now();
    
    const btn = document.getElementById('videoRecordBtn');
    btn.textContent = '⏹️ Detener Video';
    btn.style.background = 'rgba(230, 57, 70, 0.9)';
    
    toggleExportMenu();
    
    // Show progress bar
    const progressBar = document.getElementById('videoProgressBar');
    progressBar.style.display = 'block';
    
    const canvas = renderer.domElement;
    
    // Set canvas resolution based on settings
    const resolution = exportSettings.video.resolution;
    const originalWidth = renderer.domElement.width;
    const originalHeight = renderer.domElement.height;
    
    let width, height;
    switch(resolution) {
        case 720:
            width = 1280;
            height = 720;
            break;
        case 1080:
            width = 1920;
            height = 1080;
            break;
        case 1440:
            width = 2560;
            height = 1440;
            break;
        default:
            width = originalWidth;
            height = originalHeight;
    }
    
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    
    videoStream = canvas.captureStream(30);
    
    const mimeType = videoFormat === 'mp4' 
        ? 'video/webm;codecs=h264'
        : 'video/webm;codecs=vp9';
    
    const bitrate = exportSettings.video.bitrate * 1000000; // Convert to bps
    
    videoRecorder = new MediaRecorder(videoStream, {
        mimeType: mimeType,
        videoBitsPerSecond: bitrate
    });
    
    videoRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            videoChunks.push(event.data);
        }
    };
    
    videoRecorder.onstop = () => {
        // Restore original resolution
        renderer.setSize(originalWidth, originalHeight);
        camera.aspect = originalWidth / originalHeight;
        camera.updateProjectionMatrix();
        
        generateVideo();
    };
    
    videoRecorder.start();
    
    // Update progress bar
    updateVideoProgress();
    
    // Auto-stop after duration
    const duration = exportSettings.video.duration * 1000;
    setTimeout(() => {
        if (isVideoRecording) {
            stopVideoRecording();
        }
    }, duration);
}

function updateVideoProgress() {
    if (!isVideoRecording) return;
    
    const duration = exportSettings.video.duration * 1000;
    const elapsed = Date.now() - videoStartTime;
    const remaining = Math.max(0, Math.ceil((duration - elapsed) / 1000));
    const progress = Math.min(100, (elapsed / duration) * 100);
    
    document.getElementById('videoProgressFill').style.width = progress + '%';
    document.getElementById('videoTimeRemaining').textContent = remaining + 's';
    
    if (isVideoRecording) {
        videoProgressInterval = setTimeout(() => updateVideoProgress(), 100);
    }
}

function stopVideoRecording() {
    if (!videoRecorder || videoRecorder.state === 'inactive') return;
    
    isVideoRecording = false;
    clearTimeout(videoProgressInterval);
    
    videoRecorder.stop();
    
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
    
    const btn = document.getElementById('videoRecordBtn');
    btn.textContent = '🎥 Grabar Video MP4';
    btn.style.background = 'rgba(255, 255, 255, 0.85)';
    
    // Hide progress bar
    document.getElementById('videoProgressBar').style.display = 'none';
    
    showToast('⏳ Generando video...');
}

function generateVideo() {
    const blob = new Blob(videoChunks, { 
        type: videoFormat === 'mp4' ? 'video/webm' : 'video/webm'
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const extension = videoFormat === 'mp4' ? 'mp4' : 'webm';
    link.download = `${currentModel.id}_video_${Date.now()}.${extension}`;
    link.href = url;
    link.click();
    
    URL.revokeObjectURL(url);
    videoChunks = [];
    
    showToast(`✅ Video exportado (${extension.toUpperCase()})`);
}

console.log('✅ Export Tools loaded');