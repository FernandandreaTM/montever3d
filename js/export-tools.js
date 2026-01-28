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
// Screenshot Gallery System
let screenshotGallery = [];
let maxGallerySize = 10;

// Notes System
let reportNotes = [];
const noteCategories = [
    'Observaciones Generales',
    'Hallazgos',
    'Recomendaciones',
    'Análisis Técnico',
    'Material Sugerido',
    'Uso Previsto',
    'Mediciones Adicionales',
    'Advertencias',
    'Contexto Arqueológico',
    'Estado de Conservación',
    'Otra'
];

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

// ===== CAPTURE SCREENSHOT FOR GALLERY =====
function captureScreenshotForGallery() {
    if (!renderer) return;
    
    if (screenshotGallery.length >= maxGallerySize) {
        showToast('⚠️ Máximo 10 screenshots alcanzado');
        return;
    }
    
    renderer.render(scene, camera);
    const dataURL = renderer.domElement.toDataURL('image/png');
    
    const screenshot = {
        id: Date.now(),
        data: dataURL,
        timestamp: new Date().toLocaleTimeString('es-CL'),
        viewName: cameraViews[currentViewIndex] || 'custom'
    };
    
    screenshotGallery.push(screenshot);
    updateGalleryUI();
    showToast(`📸 Screenshot ${screenshotGallery.length}/${maxGallerySize} guardado`);
    
    console.log(`✅ Screenshot added to gallery (${screenshotGallery.length} total)`);
}

// ===== UPDATE GALLERY UI =====
function updateGalleryUI() {
    const container = document.getElementById('screenshotGalleryContainer');
    if (!container) return;
    
    // Siempre mostrar el contenedor
    container.style.display = 'block';
    const list = document.getElementById('screenshotGalleryList');
    
    if (screenshotGallery.length === 0) {
        list.innerHTML = '<div style="padding: 1rem; text-align: center; color: #999; font-size: 0.85rem;">No hay screenshots guardados</div>';
        return;
    }
    
    list.innerHTML = screenshotGallery.map((screenshot, index) => `
        <div style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; background: rgba(255,255,255,0.5); border-radius: 6px;">
            <img src="${screenshot.data}" style="width: 60px; height: 45px; object-fit: cover; border-radius: 4px; border: 2px solid var(--color-light-gray);">
            <div style="flex: 1; font-size: 0.85rem;">
                <div style="font-weight: 600; color: var(--color-secondary);">Screenshot ${index + 1}</div>
                <div style="color: #666; font-size: 0.75rem;">${screenshot.timestamp}</div>
            </div>
            <button onclick="removeScreenshotFromGallery(${screenshot.id})" style="background: #E63946; color: white; border: none; padding: 0.4rem 0.6rem; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">🗑️</button>
        </div>
    `).join('');
}

// ===== REMOVE SCREENSHOT FROM GALLERY =====
function removeScreenshotFromGallery(id) {
    screenshotGallery = screenshotGallery.filter(s => s.id !== id);
    updateGalleryUI();
    showToast('🗑️ Screenshot eliminado');
}

// ===== CLEAR GALLERY =====
function clearScreenshotGallery() {
    screenshotGallery = [];
    updateGalleryUI();
    showToast('🗑️ Galería limpiada');
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

// ===== SCREENSHOT GALLERY SYSTEM =====
function captureScreenshotForGallery() {
    if (!renderer) return;
    
    if (screenshotGallery.length >= maxGallerySize) {
        showToast('⚠️ Máximo 10 screenshots alcanzado');
        return;
    }
    
    renderer.render(scene, camera);
    const dataURL = renderer.domElement.toDataURL('image/png');
    
    const screenshot = {
        id: Date.now(),
        data: dataURL,
        timestamp: new Date().toLocaleTimeString('es-CL'),
        viewName: cameraViews[currentViewIndex] || 'custom'
    };
    
    screenshotGallery.push(screenshot);
    updateGalleryUI();
    showToast(`📸 Screenshot ${screenshotGallery.length}/${maxGallerySize} guardado`);
    
    console.log(`✅ Screenshot added to gallery (${screenshotGallery.length} total)`);
}

function updateGalleryUI() {
    const container = document.getElementById('screenshotGalleryContainer');
    if (!container) return;
    
    if (screenshotGallery.length === 0) {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'block';
    const list = document.getElementById('screenshotGalleryList');
    
    list.innerHTML = screenshotGallery.map((screenshot, index) => `
        <div style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; background: rgba(255,255,255,0.5); border-radius: 6px;">
            <img src="${screenshot.data}" style="width: 60px; height: 45px; object-fit: cover; border-radius: 4px; border: 2px solid var(--color-light-gray);">
            <div style="flex: 1; font-size: 0.85rem;">
                <div style="font-weight: 600; color: var(--color-secondary);">Screenshot ${index + 1}</div>
                <div style="color: #666; font-size: 0.75rem;">${screenshot.timestamp}</div>
            </div>
            <button onclick="removeScreenshotFromGallery(${screenshot.id})" style="background: #E63946; color: white; border: none; padding: 0.4rem 0.6rem; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">🗑️</button>
        </div>
    `).join('');
}

function removeScreenshotFromGallery(id) {
    screenshotGallery = screenshotGallery.filter(s => s.id !== id);
    updateGalleryUI();
    showToast('🗑️ Screenshot eliminado');
}

function clearScreenshotGallery() {
    screenshotGallery = [];
    updateGalleryUI();
    showToast('🗑️ Galería limpiada');
}

// ===== NOTES SYSTEM =====
function addReportNote() {
    const note = {
        id: Date.now(),
        category: noteCategories[0],
        customCategory: '',
        text: '',
        timestamp: new Date().toLocaleString('es-CL')
    };
    
    reportNotes.push(note);
    updateNotesUI();
    
    // Auto-focus en el textarea de la nueva nota
    setTimeout(() => {
        const textarea = document.querySelector(`#noteText_${note.id}`);
        if (textarea) textarea.focus();
    }, 100);
    
    console.log(`✅ Note ${reportNotes.length} added`);
}

function updateNotesUI() {
    const container = document.getElementById('notesListContainer');
    if (!container) return;
    
    if (reportNotes.length === 0) {
        container.innerHTML = '<div style="padding: 1rem; text-align: center; color: #999; font-size: 0.85rem;">No hay notas guardadas</div>';
        return;
    }
    
    container.innerHTML = reportNotes.map((note, index) => `
        <div style="padding: 0.75rem; background: rgba(255,255,255,0.7); border-radius: 8px; border-left: 4px solid var(--color-secondary);">
            <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 0.5rem; gap: 0.5rem;">
                <div style="flex: 1;">
                    <label style="font-size: 0.75rem; color: #666; display: block; margin-bottom: 0.25rem;">Categoría:</label>
                    <select id="noteCategory_${note.id}" onchange="updateNoteCategory(${note.id}, this.value)" style="width: 100%; padding: 0.4rem; border: 1px solid var(--color-light-gray); border-radius: 4px; font-size: 0.85rem; font-weight: 600;">
                        ${noteCategories.map(cat => `<option value="${cat}" ${cat === note.category ? 'selected' : ''}>${cat}</option>`).join('')}
                    </select>
                </div>
                <button onclick="deleteReportNote(${note.id})" style="background: #E63946; color: white; border: none; padding: 0.5rem 0.7rem; border-radius: 4px; cursor: pointer; font-size: 0.9rem; margin-top: 1.2rem;" title="Eliminar">🗑️</button>
            </div>
            ${note.category === 'Otra' ? `
                <input type="text" id="noteCustomCategory_${note.id}" value="${note.customCategory}" onchange="updateNoteCustomCategory(${note.id}, this.value)" placeholder="Especificar categoría..." style="width: 100%; padding: 0.4rem; border: 1px solid var(--color-light-gray); border-radius: 4px; font-size: 0.85rem; margin-bottom: 0.5rem;">
            ` : ''}
            <textarea id="noteText_${note.id}" onchange="updateNoteText(${note.id}, this.value)" placeholder="Escribe tu nota aquí..." style="width: 100%; min-height: 80px; padding: 0.5rem; border: 1px solid var(--color-light-gray); border-radius: 4px; font-size: 0.85rem; resize: vertical; font-family: inherit;">${note.text}</textarea>
            <div style="font-size: 0.7rem; color: #999; margin-top: 0.25rem;">${note.timestamp}</div>
        </div>
    `).join('');
}

function updateNoteCategory(id, category) {
    const note = reportNotes.find(n => n.id === id);
    if (!note) return;
    
    note.category = category;
    if (category !== 'Otra') {
        note.customCategory = '';
    }
    updateNotesUI();
}

function updateNoteCustomCategory(id, customCategory) {
    const note = reportNotes.find(n => n.id === id);
    if (!note) return;
    
    note.customCategory = customCategory;
}

function updateNoteText(id, text) {
    const note = reportNotes.find(n => n.id === id);
    if (!note) return;
    
    note.text = text;
}

function deleteReportNote(id) {
    reportNotes = reportNotes.filter(n => n.id !== id);
    updateNotesUI();
    showToast('🗑️ Nota eliminada');
}

function clearAllNotes() {
    if (reportNotes.length === 0) return;
    
    if (confirm('¿Eliminar todas las notas?')) {
        reportNotes = [];
        updateNotesUI();
        showToast('🗑️ Todas las notas eliminadas');
    }
}
// ===== PDF REPORT MODAL =====
function openPDFReportModal() {
    // Update counters
    document.getElementById('galleryCountLabel').textContent = 
        `${screenshotGallery.length} screenshot${screenshotGallery.length !== 1 ? 's' : ''} guardado${screenshotGallery.length !== 1 ? 's' : ''}`;
    
    const measurementCount = typeof measurements !== 'undefined' ? measurements.length : 0;
    document.getElementById('measurementsCountLabel').textContent = 
        `${measurementCount} medici${measurementCount !== 1 ? 'ones' : 'ón'} activa${measurementCount !== 1 ? 's' : ''}`;
    
    document.getElementById('notesCountLabel').textContent = 
        `${reportNotes.length} nota${reportNotes.length !== 1 ? 's' : ''} guardada${reportNotes.length !== 1 ? 's' : ''}`;
    
    // Disable checkboxes if no content available
    document.getElementById('pdfIncludeGallery').disabled = screenshotGallery.length === 0;
    document.getElementById('pdfIncludeMeasurements').disabled = measurementCount === 0;
    document.getElementById('pdfIncludeNotes').disabled = reportNotes.length === 0;
    
    // Show modal
    document.getElementById('pdfReportModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closePDFReportModal() {
    document.getElementById('pdfReportModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

function generatePDFReport() {
    const config = {
        includeCurrentScreenshot: document.getElementById('pdfIncludeCurrentScreenshot').checked,
        includeGallery: document.getElementById('pdfIncludeGallery').checked,
        includeMeasurements: document.getElementById('pdfIncludeMeasurements').checked,
        includeDimensions: document.getElementById('pdfIncludeDimensions').checked,
        includeNotes: document.getElementById('pdfIncludeNotes').checked,
        includeAttribution: document.getElementById('pdfIncludeAttribution').checked,
        includeMetadata: document.getElementById('pdfIncludeMetadata').checked
    };
    
    closePDFReportModal();
    showToast('⏳ Generando PDF...');
    
    // Call PDF generation function
    setTimeout(() => {
        createPDFReport(config);
    }, 100);
}

// Close modal on click outside
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('pdfReportModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closePDFReportModal();
            }
        });
    }
});

// ===== GENERATE PDF REPORT =====
async function createPDFReport(config) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const primaryColor = [147, 128, 76]; // #93804c
    const accentColor = [212, 164, 53]; // #D4A435
    const darkColor = [26, 26, 26];
    const grayColor = [102, 102, 102];
    
    let y = 20;
    
    // ===== HEADER =====
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 38, 'F');

    // Logos (if available)
    try {
        const logoMV = await loadImageAsBase64('images/logo/logo-monteverde.png');
        doc.addImage(logoMV, 'PNG', 15, 5, 35, 28);
    } catch (e) {
        console.warn('Logo MonteVerde not loaded');
    }

    try {
        const logoUACh = await loadImageAsBase64('images/logo/logo-uach.png');
        doc.addImage(logoUACh, 'PNG', 160, 5, 35, 28);
    } catch (e) {
        console.warn('Logo UACh not loaded');
    }

    // Title
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.text('REPORTE TÉCNICO', 105, 16, { align: 'center' });
    doc.setFontSize(12);
    doc.text(currentModel.title, 105, 23, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text('MonteVer3D - Universidad Austral de Chile', 105, 30, { align: 'center' });

    y = 48;
    
    // Date
    doc.setFontSize(9);
    doc.setTextColor(...grayColor);
    doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-CL')}`, 15, y);
    
    y += 10;
    
    // ===== INFORMACIÓN BÁSICA =====
    doc.setFontSize(14);
    doc.setTextColor(...darkColor);
    doc.setFont(undefined, 'bold');
    doc.text('1. INFORMACIÓN DEL MODELO', 15, y);
    y += 7;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...grayColor);
    doc.text(`• Categoría: ${currentModel.category}`, 15, y);
    y += 6;
    doc.text(`• Tipo: ${currentModel.type}`, 15, y);
    y += 6;
    
    const file3D = get3DFile();
    if (file3D) {
        doc.text(`• Formato: ${file3D.format} (${file3D.fileSize})`, 15, y);
        y += 6;
    }
    
    y += 5;
    
    // ===== DIMENSIONES =====
    if (config.includeDimensions && currentMesh) {
        doc.setFontSize(14);
        doc.setTextColor(...darkColor);
        doc.setFont(undefined, 'bold');
        doc.text('2. DIMENSIONES', 15, y);
        y += 7;
        
        const box = new THREE.Box3().setFromObject(currentMesh);
        const size = box.getSize(new THREE.Vector3());
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...grayColor);
        doc.text(`• X (Ancho): ${formatDimension(size.x)}`, 15, y);
        y += 6;
        doc.text(`• Y (Alto): ${formatDimension(size.y)}`, 15, y);
        y += 6;
        doc.text(`• Z (Profundidad): ${formatDimension(size.z)}`, 15, y);
        y += 10;
    }
    
    // ===== SCREENSHOT ACTUAL =====
    if (config.includeCurrentScreenshot) {
        if (y > 240) {
            doc.addPage();
            y = 20;
        }
        
        doc.setFontSize(14);
        doc.setTextColor(...darkColor);
        doc.setFont(undefined, 'bold');
        doc.text('3. VISTA ACTUAL DEL MODELO', 15, y);
        y += 7;
        
        renderer.render(scene, camera);
        const screenshot = renderer.domElement.toDataURL('image/jpeg', 0.9);
        doc.addImage(screenshot, 'JPEG', 15, y, 180, 100);
        y += 110;
    }
    
    // ===== GALERÍA =====
    if (config.includeGallery && screenshotGallery.length > 0) {
        if (y > 200) {
            doc.addPage();
            y = 20;
        }
        
        doc.setFontSize(14);
        doc.setTextColor(...darkColor);
        doc.setFont(undefined, 'bold');
        doc.text('4. GALERÍA DE VISTAS', 15, y);
        y += 7;
        
        for (let i = 0; i < screenshotGallery.length; i += 2) {
            if (y > 220) {
                doc.addPage();
                y = 20;
            }
            
            // First image
            doc.addImage(screenshotGallery[i].data, 'PNG', 15, y, 85, 60);
            doc.setFontSize(8);
            doc.setTextColor(...grayColor);
            doc.text(`Vista ${i + 1} - ${screenshotGallery[i].timestamp}`, 15, y + 63);
            
            // Second image (if exists)
            if (i + 1 < screenshotGallery.length) {
                doc.addImage(screenshotGallery[i + 1].data, 'PNG', 110, y, 85, 60);
                doc.text(`Vista ${i + 2} - ${screenshotGallery[i + 1].timestamp}`, 110, y + 63);
            }
            
            y += 70;
        }
        
        y += 5;
    }
    
    // ===== MEDICIONES =====
    if (config.includeMeasurements && typeof measurements !== 'undefined' && measurements.length > 0) {
        if (y > 240) {
            doc.addPage();
            y = 20;
        }
        
        doc.setFontSize(14);
        doc.setTextColor(...darkColor);
        doc.setFont(undefined, 'bold');
        doc.text('5. MEDICIONES', 15, y);
        y += 7;
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...grayColor);
        
        measurements.forEach((m, index) => {
            if (y > 270) {
                doc.addPage();
                y = 20;
            }
            
            const distance = m.points[0].distanceTo(m.points[1]);
            const name = m.customName || `Medición ${index + 1}`;
            doc.text(`• ${name}: ${formatDimension(distance)}`, 15, y);
            y += 6;
        });
        
        y += 5;
    }
    
    // ===== NOTAS =====
    if (config.includeNotes && reportNotes.length > 0) {
        const notesWithText = reportNotes.filter(n => n.text.trim() !== '');
        
        if (notesWithText.length > 0) {
            if (y > 240) {
                doc.addPage();
                y = 20;
            }
            
            doc.setFontSize(14);
            doc.setTextColor(...darkColor);
            doc.setFont(undefined, 'bold');
            doc.text('6. NOTAS DEL REPORTE', 15, y);
            y += 7;
            
            notesWithText.forEach((note, index) => {
                if (y > 250) {
                    doc.addPage();
                    y = 20;
                }
                
                const categoryLabel = note.category === 'Otra' && note.customCategory 
                    ? note.customCategory 
                    : note.category;
                
                doc.setFontSize(11);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(...accentColor);
                doc.text(`${categoryLabel}:`, 15, y);
                y += 6;
                
                doc.setFontSize(10);
                doc.setFont(undefined, 'normal');
                doc.setTextColor(...grayColor);
                const lines = doc.splitTextToSize(note.text, 180);
                doc.text(lines, 15, y);
                y += (lines.length * 5) + 5;
            });
        }
    }
    
    // ===== ATRIBUCIÓN =====
    if (config.includeAttribution) {
        if (y > 240) {
            doc.addPage();
            y = 20;
        }
        
        doc.setFontSize(14);
        doc.setTextColor(...darkColor);
        doc.setFont(undefined, 'bold');
        doc.text('7. ATRIBUCIÓN Y LICENCIA', 15, y);
        y += 7;
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...grayColor);
        doc.text(`• Creador: ${currentModel.creator}`, 15, y);
        y += 6;
        doc.text(`• Licencia: ${currentModel.license}`, 15, y);
        y += 6;
        
        if (currentModel.source === 'Externo' && currentModel.sourceName) {
            doc.text(`• Fuente: ${currentModel.sourceName}`, 15, y);
            y += 6;
        }
    }
    
    // ===== METADATOS =====
    if (config.includeMetadata) {
        if (y > 230) {
            doc.addPage();
            y = 20;
        }
        
        doc.setFontSize(14);
        doc.setTextColor(...darkColor);
        doc.setFont(undefined, 'bold');
        doc.text('8. METADATOS', 15, y);
        y += 7;
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(...grayColor);
        
        if (currentModel.description) {
            doc.text('Descripción:', 15, y);
            y += 5;
            const descLines = doc.splitTextToSize(currentModel.description, 180);
            doc.text(descLines, 15, y);
            y += (descLines.length * 5) + 3;
        }
        
        doc.text(`• Origen: ${currentModel.origin || 'No especificado'}`, 15, y);
        y += 6;
        
        if (currentModel.tags && currentModel.tags.length > 0) {
            doc.text(`• Tags: ${currentModel.tags.join(', ')}`, 15, y);
        }
    }
    
    // Footer on all pages
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('MonteVer3D | fernanda.lopez@uach.cl', 105, 285, { align: 'center' });
        doc.text(`Página ${i} de ${pageCount}`, 195, 285, { align: 'right' });
    }
    
    // Save PDF
    const filename = `Reporte_${currentModel.id}_${Date.now()}.pdf`;
    doc.save(filename);
    
    showToast('✅ Reporte PDF generado');
    console.log('✅ PDF Report generated:', filename);
}

// Helper function to load images
function loadImageAsBase64(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = reject;
        img.src = url;
    });
}
console.log('✅ Export Tools loaded');