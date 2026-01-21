const AUTOSAVE_KEY = 'labim3d_draft';
const EDIT_MODE_KEY = 'labim3d_edit_mode';

let allModels = [];
let currentMode = 'new';
let editingModelId = null;
let noteCount = 0;
let originalGeneratedId = '';

// Variables para archivos seleccionados
let selectedSTLFiles = [];
let selectedGalleryImages = [];
let thumbnailIndex = 0;

// Variables para archivos existentes (edit mode)
let existingSTLFiles = [];
let existingImages = { thumbnail: null, gallery: [] };

// Example data for tab auto-complete
const EXAMPLES = {
    title: 'Vértebra Lumbar Completa',
    description: 'Anatomía vertebral completa con cuerpo, apófisis espinosa, transversas y forámenes intervertebrales.',
    externalSource: 'https://3dprint.nih.gov/discover/3dpx-000559',
    license: 'CC BY 4.0',
    source: 'NIH 3D Print',
    tags: 'vertebra, lumbar, columna, esqueleto, escaner'
};

// ===== LOGIN SEGURO CON PHP =====
async function login(event) {
    event.preventDefault();
    const password = document.getElementById('passwordInput').value;
    const errorMsg = document.getElementById('loginError');
    const submitBtn = event.target.querySelector('button[type="submit"]');
    
    // Deshabilitar botón mientras se procesa
    submitBtn.disabled = true;
    submitBtn.textContent = 'Verificando...';
    
    try {
        const response = await fetch('api/login.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password: password })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Login exitoso
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('adminPanel').style.display = 'block';
            errorMsg.textContent = '';
            
            loadExistingModels();
            restoreFromLocalStorage();
        } else {
            // Contraseña incorrecta
            errorMsg.textContent = '⚠️ Contraseña incorrecta';
            document.getElementById('passwordInput').value = '';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Ingresar';
        }
    } catch (error) {
        console.error('Error al intentar iniciar sesión:', error);
        errorMsg.textContent = '❌ Error al conectar con el servidor';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Ingresar';
    }
}

async function logout() {
    try {
        await fetch('api/logout.php');
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
    }
    
    // Limpiar interfaz
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('adminPanel').style.display = 'none';
    document.getElementById('passwordInput').value = '';
}

function togglePassword() {
    const input = document.getElementById('passwordInput');
    const btn = document.querySelector('.toggle-password');
    
    if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🙈';
    } else {
        input.type = 'password';
        btn.textContent = '👁️';
    }
}

// Verificar autenticación al cargar
window.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('api/check-auth.php');
        const result = await response.json();
        
        if (result.authenticated) {
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('adminPanel').style.display = 'block';
            loadExistingModels();
            restoreFromLocalStorage();
        }
    } catch (error) {
        console.error('Error al verificar autenticación:', error);
    }
});

// ===== MODE SWITCHING =====
function switchMode(mode) {
    currentMode = mode;
    
    document.getElementById('btnModeNew').classList.toggle('active', mode === 'new');
    document.getElementById('btnModeEdit').classList.toggle('active', mode === 'edit');
    document.getElementById('btnModeDuplicate').classList.toggle('active', mode === 'duplicate');
    
    // Mostrar selector para edit Y duplicate
    document.getElementById('editModelSelector').style.display = 
        (mode === 'edit' || mode === 'duplicate') ? 'flex' : 'none';
    
    // Actualizar título según modo
    const titles = {
        'new': 'Agregar Nuevo Modelo',
        'edit': 'Editar Modelo Existente',
        'duplicate': 'Duplicar Modelo Existente'
    };
    document.getElementById('formTitle').textContent = titles[mode];
    
    if (mode === 'new') {
        resetForm();
    }
}

// ===== LOAD EXISTING MODELS (FROM INDEX) =====
async function loadExistingModels() {
    try {
        const indexResponse = await fetch('../data/index.json');
        const index = await indexResponse.json();
        
        const modelPromises = index.models.map(modelId => 
            fetch(`../data/models/${modelId}.json`)
                .then(response => response.json())
                .catch(error => {
                    console.error(`Error loading ${modelId}:`, error);
                    return null;
                })
        );
        
        const models = await Promise.all(modelPromises);
        allModels = models.filter(m => m !== null);
        
        const select = document.getElementById('selectModel');
        select.innerHTML = '<option value="">-- Seleccionar --</option>';
        
        allModels.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = `${model.title} (${model.category})`;
            select.appendChild(option);
        });
        
        console.log(`✅ Loaded ${allModels.length} models for editing`);
    } catch (error) {
        console.error('Error loading models:', error);
        alert('⚠️ Error al cargar modelos existentes');
    }
}
// ===== LOAD MODEL FOR EDITING =====
function loadModelForEdit() {
    const modelId = document.getElementById('selectModel').value;
    if (!modelId) {
        document.getElementById('deleteModelBtn').disabled = true;
        return;
    }
    
    // Habilitar botón eliminar
    document.getElementById('deleteModelBtn').disabled = false;
    
    const model = allModels.find(m => m.id === modelId);
    if (!model) return;
    
    // 🔧 SOLO establecer editingModelId si estamos en modo EDIT
    if (currentMode === 'edit') {
        editingModelId = modelId;
    } else {
        editingModelId = null; // Modo duplicate: permitir nuevo ID
    }
    
    document.getElementById('stlFilesPreview').innerHTML = '';
    document.getElementById('galleryImagesPreview').innerHTML = '';
    selectedSTLFiles = [];
    selectedGalleryImages = [];
    
    document.getElementById('modelTitle').value = model.title;
    document.getElementById('modelId').value = model.id;
    originalGeneratedId = model.id;
    document.getElementById('modelCategory').value = model.category;
    document.getElementById('modelType').value = model.type;
    document.getElementById('modelDescription').value = model.description;
    
    // NUEVO: Cargar fuente/origen
    document.querySelector(`input[name="source"][value="${model.source || 'Externo'}"]`).checked = true;
    document.querySelector(`input[name="origin"][value="${model.origin || 'Modelado'}"]`).checked = true;
    
    if (model.source === 'Externo') {
        document.querySelector(`input[name="sourceStatus"][value="${model.sourceStatus || 'Original'}"]`).checked = true;
        document.getElementById('sourceName').value = model.sourceName || '';
        document.getElementById('modifications').value = model.modifications || '';
    }
    
    toggleSourceFields();
    toggleModifications();
    
    // ATRIBUCIÓN
    document.getElementById('creator').value = model.creator || '';
    document.getElementById('creatorUrl').value = model.creatorUrl || '';
    document.getElementById('modelLicense').value = model.license || '';
    document.getElementById('licenseUrl').value = model.licenseUrl || '';
    document.getElementById('externalSource').value = model.externalSourceUrl || '';
    
    // STL files - cargar existentes y permitir eliminar
    existingSTLFiles = model['3dFiles'] ? [...model['3dFiles']] : [];
    
    if (existingSTLFiles.length > 0) {
        const container = document.getElementById('stlFilesPreview');
        container.innerHTML = '<h4>Archivos STL actuales:</h4>';
        existingSTLFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'stl-preview-item edit-mode';
            fileItem.innerHTML = `
                <div class="stl-preview-info">
                    <span class="stl-icon">📦</span>
                    <div>
                        <strong>${file.name}</strong>
                        <small>${file.path} (${file.fileSize})</small>
                    </div>
                </div>
                <button type="button" onclick="removeExistingSTL(${index})" class="btn-remove-file">🗑️</button>
            `;
            container.appendChild(fileItem);
        });
        container.innerHTML += '<p style="margin-top: 1rem; color: var(--color-gray);"><small>💡 Puedes eliminar archivos o agregar nuevos</small></p>';
    }
    
    // Notes
    document.getElementById('notesContainer').innerHTML = '';
    noteCount = 0;
    if (model.notes && model.notes.length > 0) {
        model.notes.forEach(note => {
            addNote(note.category, note.text, note.link || '');
        });
    }
    
    // Images - cargar existentes y permitir eliminar
    existingImages = {
        thumbnail: model.images?.thumbnail || null,
        gallery: model.images?.gallery ? [...model.images.gallery] : []
    };
    
    const container = document.getElementById('galleryImagesPreview');
    container.innerHTML = '<h4>Imágenes actuales:</h4>';
    
    if (existingImages.thumbnail) {
        container.innerHTML += `
            <div class="gallery-preview-item edit-mode">
                <img src="../${existingImages.thumbnail}" alt="Thumbnail">
                <div class="gallery-preview-controls">
                    <strong>📸 Thumbnail</strong>
                    <button type="button" onclick="removeExistingImage('thumbnail', 0)" 
                            class="btn-remove-file" style="margin-top: 0.5rem;">🗑️</button>
                </div>
            </div>`;
    }
    
    existingImages.gallery.forEach((img, index) => {
        container.innerHTML += `
            <div class="gallery-preview-item edit-mode">
                <img src="../${img}" alt="Gallery ${index + 1}">
                <div class="gallery-preview-controls">
                    <small>🖼️ Galería ${index + 1}</small>
                    <button type="button" onclick="removeExistingImage('gallery', ${index})" 
                            class="btn-remove-file" style="margin-top: 0.5rem;">🗑️</button>
                </div>
            </div>`;
    });
    
    container.innerHTML += '<p style="margin-top: 1rem; color: var(--color-gray);"><small>💡 Puedes eliminar imágenes o agregar nuevas</small></p>';
    
    // Tags
    document.getElementById('modelTags').value = model.tags?.join(', ') || '';
    
    updatePreview();
}

function generateId() {
    if (editingModelId) return;
    
    const title = document.getElementById('modelTitle').value;
    const id = title
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    
    document.getElementById('modelId').value = id;
    originalGeneratedId = id;
    
    // Hide update button since this is auto-generated
    document.getElementById('updatePathsBtn').style.display = 'none';
}

// ===== TOGGLE SOURCE FIELDS =====
function toggleSourceFields() {
    const source = document.querySelector('input[name="source"]:checked').value;
    const externalFields = document.getElementById('externalFields');
    
    if (source === 'Externo') {
        externalFields.style.display = 'block';
    } else {
        externalFields.style.display = 'none';
    }
    
    updatePreview();
    autoSave();
}

// ===== TOGGLE MODIFICATIONS FIELD =====
function toggleModifications() {
    const sourceStatusChecked = document.querySelector('input[name="sourceStatus"]:checked');
    const status = sourceStatusChecked ? sourceStatusChecked.value : 'Original';
    const modificationsField = document.getElementById('modificationsField');
    
    if (status === 'Modificado') {
        modificationsField.style.display = 'block';
    } else {
        modificationsField.style.display = 'none';
    }
    
    updatePreview();
    autoSave();
}

// ===== PREVIEW MULTIPLE 3D FILES (STL/OBJ/MTL) =====
function previewMultipleSTL(input) {
    if (!input.files || input.files.length === 0) {
        document.getElementById('stlFilesPreview').innerHTML = '';
        selectedSTLFiles = [];
        updateFileChecklist();
        return;
    }
    
    selectedSTLFiles = Array.from(input.files);
    const container = document.getElementById('stlFilesPreview');
    container.innerHTML = '<h4 style="margin-bottom: 1rem;">Archivos seleccionados:</h4>';
    
    selectedSTLFiles.forEach((file, index) => {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        const ext = file.name.split('.').pop().toLowerCase();
        
        // Icono según tipo de archivo
        let icon = '📦';
        if (ext === 'obj') icon = '🎨';
        if (ext === 'mtl') icon = '🖌️';
        if (ext === 'jpg' || ext === 'jpeg' || ext === 'png') icon = '🖼️';
        
        // Nombre sin extensión
        const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.'));
        
        const fileItem = document.createElement('div');
        fileItem.className = 'stl-preview-item';
        fileItem.innerHTML = `
            <div class="stl-preview-info">
                <span class="stl-icon">${icon}</span>
                <div>
                    <input type="text" class="stl-name-input" 
                        placeholder="Nombre del modelo" 
                        value="${nameWithoutExt}"
                        data-index="${index}"
                        oninput="updatePreview()">
                    <small>${file.name} (${sizeMB} MB)</small>
                </div>
            </div>
            <button type="button" onclick="removeSTLFile(${index})" class="btn-remove-file">❌</button>
        `;
        container.appendChild(fileItem);
    });
    
    updateFileChecklist();
    updatePreview();
}

function removeSTLFile(index) {
    const input = document.getElementById('stlFilesInput');
    const dt = new DataTransfer();
    
    selectedSTLFiles.forEach((file, i) => {
        if (i !== index) dt.items.add(file);
    });
    
    input.files = dt.files;
    previewMultipleSTL(input);
}
function removeExistingSTL(index) {
    if (!confirm('¿Eliminar este archivo STL del modelo?')) return;
    
    existingSTLFiles.splice(index, 1);
    
    // Recargar preview
    const container = document.getElementById('stlFilesPreview');
    container.innerHTML = '<h4>Archivos STL actuales:</h4>';
    
    if (existingSTLFiles.length > 0) {
        existingSTLFiles.forEach((file, i) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'stl-preview-item edit-mode';
            fileItem.innerHTML = `
                <div class="stl-preview-info">
                    <span class="stl-icon">📦</span>
                    <div>
                        <strong>${file.name}</strong>
                        <small>${file.path} (${file.fileSize})</small>
                    </div>
                </div>
                <button type="button" onclick="removeExistingSTL(${i})" class="btn-remove-file">🗑️</button>
            `;
            container.appendChild(fileItem);
        });
    } else {
        container.innerHTML = '<p class="placeholder">No hay archivos STL. Sube nuevos para continuar.</p>';
    }
    
    container.innerHTML += '<p style="margin-top: 1rem; color: var(--color-gray);"><small>💡 Puedes eliminar archivos o agregar nuevos</small></p>';
    
    updatePreview();
    autoSave();
}

function removeExistingImage(type, index) {
    if (!confirm('¿Eliminar esta imagen del modelo?')) return;
    
    if (type === 'thumbnail') {
        existingImages.thumbnail = null;
    } else if (type === 'gallery') {
        existingImages.gallery.splice(index, 1);
    }
    
    // Recargar preview
    const container = document.getElementById('galleryImagesPreview');
    container.innerHTML = '<h4>Imágenes actuales:</h4>';
    
    if (existingImages.thumbnail) {
        container.innerHTML += `
            <div class="gallery-preview-item edit-mode">
                <img src="../${existingImages.thumbnail}" alt="Thumbnail">
                <div class="gallery-preview-controls">
                    <strong>📸 Thumbnail</strong>
                    <button type="button" onclick="removeExistingImage('thumbnail', 0)" 
                            class="btn-remove-file" style="margin-top: 0.5rem;">🗑️ Eliminar</button>
                </div>
            </div>`;
    }
    
    existingImages.gallery.forEach((img, i) => {
        container.innerHTML += `
            <div class="gallery-preview-item edit-mode">
                <img src="../${img}" alt="Gallery ${i + 1}">
                <div class="gallery-preview-controls">
                    <small>🖼️ Galería ${i + 1}</small>
                    <button type="button" onclick="removeExistingImage('gallery', ${i})" 
                            class="btn-remove-file" style="margin-top: 0.5rem;">🗑️ Eliminar</button>
                </div>
            </div>`;
    });
    
    if (!existingImages.thumbnail && existingImages.gallery.length === 0) {
        container.innerHTML = '<p class="placeholder">No hay imágenes. Sube nuevas para continuar.</p>';
    }
    
    container.innerHTML += '<p style="margin-top: 1rem; color: var(--color-gray);"><small>💡 Puedes eliminar imágenes o agregar nuevas</small></p>';
    
    updatePreview();
    autoSave();
}
// ===== PREVIEW GALLERY IMAGES =====
function previewGalleryImages(input) {
    if (!input.files || input.files.length === 0) {
        document.getElementById('galleryImagesPreview').innerHTML = '';
        selectedGalleryImages = [];
        updateFileChecklist();
        return;
    }
    
    selectedGalleryImages = Array.from(input.files);
    const container = document.getElementById('galleryImagesPreview');
    container.innerHTML = '<h4 style="margin-bottom: 1rem;">Selecciona cuál será el Thumbnail:</h4>';
    
    selectedGalleryImages.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const imageItem = document.createElement('div');
            imageItem.className = 'gallery-preview-item';
            imageItem.innerHTML = `
                <img src="${e.target.result}" alt="${file.name}">
                <div class="gallery-preview-controls">
                    <label>
                        <input type="radio" name="thumbnailSelect" value="${index}" 
                            ${index === 0 ? 'checked' : ''}
                            onchange="selectThumbnail(${index})">
                        <span>📸 Thumbnail</span>
                    </label>
                    <small>${file.name}</small>
                </div>
            `;
            container.appendChild(imageItem);
        };
        reader.readAsDataURL(file);
    });
    
    thumbnailIndex = 0;
    updateFileChecklist();
    updatePreview();
}

function selectThumbnail(index) {
    thumbnailIndex = index;
    updatePreview();
}

function updateFileChecklist() {
    const checklist = document.getElementById('fileChecklist');
    let items = [];
    
    if (selectedSTLFiles.length > 0) {
        items.push('<h4>📦 Archivos STL</h4>');
        selectedSTLFiles.forEach((file) => {
            const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
            items.push(`<div class="checklist-item">
                <span>📦 ${file.name}</span>
                <span>${sizeMB} MB</span>
            </div>`);
        });
    }
    
    if (selectedGalleryImages.length > 0) {
        items.push('<h4 style="margin-top: 1rem;">🖼️ Imágenes</h4>');
        selectedGalleryImages.forEach((file, index) => {
            const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
            const badge = index === thumbnailIndex ? ' <strong>(Thumbnail)</strong>' : '';
            items.push(`<div class="checklist-item">
                <span>🖼️ ${file.name}${badge}</span>
                <span>${sizeMB} MB</span>
            </div>`);
        });
    }
    
    if (items.length === 0) {
        items.push('<p class="placeholder">Selecciona archivos para ver el resumen</p>');
    }
    
    checklist.innerHTML = items.join('');
}

// ===== NOTES MANAGEMENT =====
function addNote(category = '', text = '', link = '') {
    noteCount++;
    const container = document.getElementById('notesContainer');
    
    const noteItem = document.createElement('div');
    noteItem.className = 'note-item';
    noteItem.id = `note-${noteCount}`;
    
    noteItem.innerHTML = `
        <button type="button" onclick="removeNote(${noteCount})" class="note-remove">×</button>
        
        <div class="form-row">
            <div>
                <label style="font-size: 0.85rem; color: var(--color-gray); display: block; margin-bottom: 0.5rem;">Categoría</label>
                <select class="note-category" onchange="updatePreview(); autoSave()">
                    <option value="">-- Seleccionar --</option>
                    <option value="tecnica" ${category === 'tecnica' ? 'selected' : ''}>🔧 Nota Técnica</option>
                    <option value="pedagogica" ${category === 'pedagogica' ? 'selected' : ''}>📚 Nota Pedagógica</option>
                    <option value="recomendacion" ${category === 'recomendacion' ? 'selected' : ''}>💡 Recomendación</option>
                    <option value="curada" ${category === 'curada' ? 'selected' : ''}>✅ Curada por</option>
                    <option value="advertencia" ${category === 'advertencia' ? 'selected' : ''}>⚠️ Advertencia</option>
                    <option value="recurso" ${category === 'recurso' ? 'selected' : ''}>🔗 Recurso Externo</option>
                </select>
            </div>
            
            <div>
                <label style="font-size: 0.85rem; color: var(--color-gray); display: block; margin-bottom: 0.5rem;">Texto de la nota</label>
                <textarea class="note-text" placeholder="Descripción de la nota..." oninput="updatePreview(); autoSave()">${text}</textarea>
            </div>
        </div>
        
        <div>
            <label style="font-size: 0.85rem; color: var(--color-gray); display: block; margin-bottom: 0.5rem;">Link (opcional)</label>
            <input type="url" class="note-link" placeholder="https://..." value="${link}" oninput="updatePreview(); autoSave()">
        </div>
    `;
    
    container.appendChild(noteItem);
    updatePreview();
}

function removeNote(id) {
    const item = document.getElementById(`note-${id}`);
    if (item) {
        item.remove();
        updatePreview();
        autoSave();
    }
}

function getNotesData() {
    const noteItems = document.querySelectorAll('.note-item');
    const notes = [];
    
    noteItems.forEach(item => {
        const category = item.querySelector('.note-category').value;
        const text = item.querySelector('.note-text').value;
        const link = item.querySelector('.note-link').value;
        
        if (category && text) {
            notes.push({
                category: category,
                text: text,
                link: link || null
            });
        }
    });
    
    return notes;
}

// ===== UPDATE PREVIEW =====
function updatePreview() {
    const modelData = collectFormData();
    if (!modelData) return;
    
    const jsonString = JSON.stringify(modelData, null, 2);
    document.getElementById('jsonPreview').textContent = jsonString;
}

// ===== COLLECT FORM DATA =====
function collectFormData() {
    const id = document.getElementById('modelId').value;
    const title = document.getElementById('modelTitle').value;
    const category = document.getElementById('modelCategory').value;
    const type = document.getElementById('modelType').value;
    const description = document.getElementById('modelDescription').value;
    
    // ===== NUEVO SISTEMA: FUENTE/ORIGEN =====
    const source = document.querySelector('input[name="source"]:checked').value;
    const origin = document.querySelector('input[name="origin"]:checked').value;
    
    let sourceStatus = null;
    let sourceName = null;
    let modifications = null;
    
    if (source === 'Externo') {
        const sourceStatusChecked = document.querySelector('input[name="sourceStatus"]:checked');
        sourceStatus = sourceStatusChecked ? sourceStatusChecked.value : 'Original';
        sourceName = document.getElementById('sourceName').value || null;
        
        if (sourceStatus === 'Modificado') {
            modifications = document.getElementById('modifications').value || null;
        }
    }
    
    // ===== ATRIBUCIÓN =====
    const creator = document.getElementById('creator').value;
    const creatorUrl = document.getElementById('creatorUrl').value || null;
    const license = document.getElementById('modelLicense').value;
    const licenseUrl = document.getElementById('licenseUrl').value || null;
    const externalSource = document.getElementById('externalSource').value;
    
    const tagsInput = document.getElementById('modelTags').value;
    
    // Validate required fields
    if (!title || !category || !type || !description || !creator || !license || !licenseUrl) {
        return null;
    }
    
    // Validate external source fields
    if (source === 'Externo' && !sourceName) {
        return null;
    }
    
    // Process tags
    const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
    
    // Get STL files: MEZCLAR existentes + nuevos
    const stlFiles = [];
    
    // Primero agregar existentes (que no fueron eliminados)
    existingSTLFiles.forEach(file => {
        stlFiles.push(file);
    });
    
    // Luego agregar nuevos
    selectedSTLFiles.forEach((file, index) => {
        const nameInput = document.querySelector(`.stl-name-input[data-index="${index}"]`);
        
        // Obtener extensión del archivo
        const fileExt = file.name.split('.').pop().toLowerCase();
        
        // Nombre sin extensión
        const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.'));
        const customName = nameInput ? nameInput.value : nameWithoutExt;
        
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        
        // Para texturas (jpg/png), usar nombre original sin customName
        let finalName = customName;
        let finalPath = `models/${id}/${customName}.${fileExt}`;

        if (fileExt === 'jpg' || fileExt === 'jpeg' || fileExt === 'png') {
            finalName = file.name; // Mantener nombre original para texturas
            finalPath = `models/${id}/${file.name}`; // Path con nombre original
        }

        stlFiles.push({
            id: customName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
            name: finalName,
            path: finalPath,
            fileSize: `${sizeMB} MB`
        });
    });
    
    // Get images: MEZCLAR existentes + nuevas
    let thumbnail = existingImages.thumbnail;
    let gallery = [...existingImages.gallery];
    
    // Si hay nuevas imágenes seleccionadas
    if (selectedGalleryImages.length > 0) {
        // La nueva imagen thumbnail reemplaza la existente
        thumbnail = `images/models/${id}/thumb.jpg`;
        
        // Agregar nuevas imágenes a gallery (después de las existentes)
        selectedGalleryImages.forEach((file, index) => {
            if (index !== thumbnailIndex) {
                const galleryNumber = gallery.length + 1;
                gallery.push(`images/models/${id}/gallery-${galleryNumber}.jpg`);
            }
        });
    }
    
    // Si NO hay thumbnail en absoluto (ni existente ni nuevo)
    if (!thumbnail) {
        thumbnail = 'images/models/placeholders/default-thumb.jpg';
    }
    
    // Si NO hay gallery en absoluto
    if (gallery.length === 0) {
        gallery = ['images/models/placeholders/default-1.jpg'];
    }
    
    // Get notes
    const notes = getNotesData();
    
    // Get current date
    const today = new Date().toISOString().split('T')[0];
    
    return {
        id: id,
        title: title,
        category: category,
        type: type,
        description: description,
        
        // NUEVO SISTEMA
        source: source,
        sourceStatus: sourceStatus,
        sourceName: sourceName,
        origin: origin,
        
        // ATRIBUCIÓN
        creator: creator,
        creatorUrl: creatorUrl,
        license: license,
        licenseUrl: licenseUrl,
        modifications: modifications,
        externalSourceUrl: externalSource || null,
        
        images: {
            thumbnail: thumbnail,
            gallery: gallery.length > 0 ? gallery : ['images/models/placeholders/default-1.jpg']
        },
        "3dFiles": stlFiles,
        notes: notes,
        datasheetUrl: null,
        tags: tags,
        dateAdded: today
    };
}

// ===== AUTO-SAVE TO LOCALSTORAGE =====
function autoSave() {
    const source = document.querySelector('input[name="source"]:checked').value;
    const origin = document.querySelector('input[name="origin"]:checked').value;
    
    let sourceStatus = null;
    let sourceName = null;
    let modifications = null;
    
    if (source === 'Externo') {
        const sourceStatusChecked = document.querySelector('input[name="sourceStatus"]:checked');
        sourceStatus = sourceStatusChecked ? sourceStatusChecked.value : 'Original';
        sourceName = document.getElementById('sourceName').value;
        modifications = document.getElementById('modifications').value;
    }
    
    const formData = {
        title: document.getElementById('modelTitle').value,
        category: document.getElementById('modelCategory').value,
        type: document.getElementById('modelType').value,
        description: document.getElementById('modelDescription').value,
        source: source,
        sourceStatus: sourceStatus,
        sourceName: sourceName,
        origin: origin,
        modifications: modifications,
        creator: document.getElementById('creator').value,
        creatorUrl: document.getElementById('creatorUrl').value,
        license: document.getElementById('modelLicense').value,
        licenseUrl: document.getElementById('licenseUrl').value,
        externalSource: document.getElementById('externalSource').value,
        tags: document.getElementById('modelTags').value,
        notes: getNotesData(),
        timestamp: Date.now()
    };
    
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(formData));
}

// ===== RESTORE FROM LOCALSTORAGE =====
function restoreFromLocalStorage() {
    const saved = localStorage.getItem(AUTOSAVE_KEY);
    if (!saved) return;
    
    try {
        const formData = JSON.parse(saved);
        
        const daysSince = (Date.now() - formData.timestamp) / (1000 * 60 * 60 * 24);
        if (daysSince > 7) {
            localStorage.removeItem(AUTOSAVE_KEY);
            return;
        }
        
        document.getElementById('modelTitle').value = formData.title || '';
        document.getElementById('modelCategory').value = formData.category || '';
        document.getElementById('modelType').value = formData.type || '';
        document.getElementById('modelDescription').value = formData.description || '';
        
        // NUEVO
        document.querySelector(`input[name="source"][value="${formData.source || 'Externo'}"]`).checked = true;
        document.querySelector(`input[name="origin"][value="${formData.origin || 'Modelado'}"]`).checked = true;
        
        if (formData.source === 'Externo') {
            document.querySelector(`input[name="sourceStatus"][value="${formData.sourceStatus || 'Original'}"]`).checked = true;
            document.getElementById('sourceName').value = formData.sourceName || '';
            document.getElementById('modifications').value = formData.modifications || '';
        }
        
        toggleSourceFields();
        toggleModifications();
        
        // ATRIBUCIÓN
        document.getElementById('creator').value = formData.creator || '';
        document.getElementById('creatorUrl').value = formData.creatorUrl || '';
        document.getElementById('modelLicense').value = formData.license || '';
        document.getElementById('licenseUrl').value = formData.licenseUrl || '';
        
        document.getElementById('externalSource').value = formData.externalSource || '';
        document.getElementById('modelTags').value = formData.tags || '';
        
        generateId();
        
        // Restore notes
        document.getElementById('notesContainer').innerHTML = '';
        noteCount = 0;
        if (formData.notes && formData.notes.length > 0) {
            formData.notes.forEach(note => {
                addNote(note.category, note.text, note.link || '');
            });
        }
        
        updatePreview();
        
        console.log('✅ Borrador restaurado desde localStorage');
    } catch (error) {
        console.error('Error restoring draft:', error);
        localStorage.removeItem(AUTOSAVE_KEY);
    }
}

// ===== UPLOAD MODEL TO SERVER =====
async function uploadModel() {
    const modelData = collectFormData();
    
    if (!modelData) {
        alert('⚠️ Por favor completa todos los campos requeridos (*)');
        return;
    }
    
    // Validar STL files
    if (selectedSTLFiles.length === 0 && !editingModelId) {
        alert('⚠️ Debes seleccionar al menos un archivo STL');
        return;
    }
    
    // Force original ID if in edit mode
    if (editingModelId) {
        modelData.id = editingModelId;
    }
    
    const formData = new FormData();
    formData.append('modelData', JSON.stringify(modelData));
    
    // Enviar info de archivos existentes que se mantienen
    formData.append('existingSTLFiles', JSON.stringify(existingSTLFiles));
    formData.append('existingImages', JSON.stringify(existingImages));
    
    // Agregar archivos STL NUEVOS con nombres personalizados
    selectedSTLFiles.forEach((file, index) => {
        const nameInput = document.querySelector(`.stl-name-input[data-index="${index}"]`);
        const customName = nameInput ? nameInput.value : file.name.replace('.stl', '');
        
        // Crear nuevo File con nombre personalizado
        const renamedFile = new File([file], `${customName}.stl`, { type: file.type });
        formData.append('stlFiles[]', renamedFile);
    });
    
    // Agregar imágenes NUEVAS (thumbnail primero, luego gallery)
    if (selectedGalleryImages.length > 0) {
        // Thumbnail
        const thumbnailFile = selectedGalleryImages[thumbnailIndex];
        formData.append('thumbnail', thumbnailFile);
        
        // Gallery (resto de imágenes)
        let galleryCount = 1;
        selectedGalleryImages.forEach((file, index) => {
            if (index !== thumbnailIndex) {
                formData.append(`gallery${galleryCount}`, file);
                galleryCount++;
            }
        });
    }
    
    // Mostrar loading
    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ Subiendo...';
    btn.disabled = true;
    
    try {
        const response = await fetch('api/upload-model.php', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert(`✅ ${result.message}\n\n📊 Archivos subidos:\n- STL: ${result.data.stlFiles}\n- Imágenes: ${result.data.images}\n\n📁 JSON guardado en:\n${result.data.jsonPath}`);
            localStorage.removeItem(AUTOSAVE_KEY);
            resetForm();
            loadExistingModels();
        } else {
            alert(`❌ Error: ${result.message}`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error al conectar con el servidor. Verifica que PHP esté corriendo.');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// ===== COPY JSON =====
function copyJSON() {
    const jsonText = document.getElementById('jsonPreview').textContent;
    
    if (jsonText === '// Completa el formulario para ver el preview') {
        alert('⚡️ Primero genera el JSON');
        return;
    }
    
    navigator.clipboard.writeText(jsonText).then(() => {
        const btn = document.getElementById('copyBtn');
        btn.textContent = '✅ Copiado!';
        btn.classList.add('copied');
        
        setTimeout(() => {
            btn.textContent = '📋 Copiar';
            btn.classList.remove('copied');
        }, 2000);
    }).catch(err => {
        alert('⚠️ Error al copiar. Selecciona el texto manualmente.');
        console.error(err);
    });
}

// ===== RESET FORM =====
function resetForm() {
    if (document.getElementById('modelTitle').value && 
        !confirm('¿Seguro que quieres limpiar el formulario?')) {
        return;
    }
    
    document.getElementById('modelForm').reset();
    document.getElementById('modelId').value = '';
    document.getElementById('stlFilesPreview').innerHTML = '';
    document.getElementById('galleryImagesPreview').innerHTML = '';
    document.getElementById('stlFilesInput').value = '';
    document.getElementById('galleryImagesInput').value = '';
    document.getElementById('jsonPreview').textContent = '// Completa el formulario para ver el preview';
    document.getElementById('fileChecklist').innerHTML = '<p class="placeholder">Selecciona archivos para ver el resumen</p>';
    document.getElementById('selectModel').value = '';
    document.getElementById('notesContainer').innerHTML = '';
    
    selectedSTLFiles = [];
    selectedGalleryImages = [];
    thumbnailIndex = 0;
    noteCount = 0;
    
    // Limpiar archivos existentes (edit mode)
    existingSTLFiles = [];
    existingImages = { thumbnail: null, gallery: [] };
    
    // Reset radio buttons to default
    document.querySelector('input[name="source"][value="Externo"]').checked = true;
    document.querySelector('input[name="sourceStatus"][value="Original"]').checked = true;
    document.querySelector('input[name="origin"][value="Escáner"]').checked = true;
    
    toggleSourceFields();
    toggleModifications();
    
    editingModelId = null;
    updateFileChecklist();
    
    localStorage.removeItem(AUTOSAVE_KEY);
}
// ===== DELETE MODEL =====
async function deleteModel() {
    const modelId = document.getElementById('selectModel').value;
    
    if (!modelId) {
        alert('⚠️ Selecciona un modelo primero');
        return;
    }
    
    const model = allModels.find(m => m.id === modelId);
    if (!model) return;
    
    // Confirmación simple
    const confirmText = `⚠️ ELIMINAR MODELO\n\n` +
                    `Título: ${model.title}\n` +
                    `Categoría: ${model.category}\n\n` +
                    `Esta acción NO se puede deshacer.\n` +
                    `Se eliminarán:\n` +
                    `- Archivo JSON\n` +
                    `- Archivos STL\n` +
                    `- Imágenes\n\n` +
                    `¿Estás SEGURO que deseas eliminar este modelo?`;
    
    if (!confirm(confirmText)) {
        return;
    }
    
    // Mostrar loading
    const btn = document.getElementById('deleteModelBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ Eliminando...';
    btn.disabled = true;
    
    try {
        const response = await fetch('api/delete-model.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ modelId: modelId })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert(`✅ ${result.message}\n\nModelo "${model.title}" eliminado correctamente.`);
            
            // Recargar lista de modelos
            await loadExistingModels();
            
            // Limpiar formulario
            resetForm();
            
            // Resetear selector
            document.getElementById('selectModel').value = '';
            btn.disabled = true;
        } else {
            alert(`❌ Error: ${result.message}`);
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error al conectar con el servidor.');
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// ===== AUTO-FILL EXAMPLE =====
function autoFillExample() {
    if (document.getElementById('modelTitle').value && 
        !confirm('¿Sobrescribir con ejemplo?')) {
        return;
    }
    
    document.getElementById('modelTitle').value = EXAMPLES.title;
    document.getElementById('modelCategory').value = 'Sistema Esquelético';
    document.getElementById('modelType').value = 'Didáctico';
    document.getElementById('modelDescription').value = EXAMPLES.description;
    
    // NUEVO
    document.querySelector('input[name="source"][value="Externo"]').checked = true;
    document.querySelector('input[name="sourceStatus"][value="Original"]').checked = true;
    document.getElementById('sourceName').value = 'NIH 3D Print';
    document.querySelector('input[name="origin"][value="Escáner"]').checked = true;
    
    // ATRIBUCIÓN
    document.getElementById('creator').value = 'NIH 3D Print Exchange';
    document.getElementById('creatorUrl').value = 'https://3dprint.nih.gov';
    document.getElementById('modelLicense').value = EXAMPLES.license;
    document.getElementById('licenseUrl').value = 'https://creativecommons.org/licenses/by/4.0/';
    document.getElementById('externalSource').value = EXAMPLES.externalSource;
    document.getElementById('modelTags').value = EXAMPLES.tags;
    
    toggleSourceFields();
    toggleModifications();
    generateId();
    
    updatePreview();
    autoSave();
}

// ===== TAB AUTO-COMPLETE =====
document.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    
    const target = e.target;
    
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        const placeholder = target.placeholder;
        
        if (placeholder.includes('Tab:')) {
            const example = placeholder.split('Tab:')[1].trim();
            
            if (!target.value && example) {
                e.preventDefault();
                target.value = example;
                
                if (target.id === 'modelTitle') {
                    generateId();
                }
                updatePreview();
                autoSave();
            }
        }
    }
});

function checkIdChanged() {
    const currentId = document.getElementById('modelId').value;
    const updateBtn = document.getElementById('updatePathsBtn');
    
    // Show button if ID was manually changed (works in new and edit mode)
    if (currentId && currentId !== originalGeneratedId) {
        updateBtn.style.display = 'block';
    } else {
        updateBtn.style.display = 'none';
    }
}

function updateAllPaths() {
    const oldId = originalGeneratedId;
    const newId = document.getElementById('modelId').value;
    
    if (!newId) {
        alert('⚠️ El ID no puede estar vacío');
        return;
    }
    
    // Update editingModelId if in edit mode
    if (editingModelId === oldId) {
        editingModelId = newId;
    }
    
    // Update stored ID
    originalGeneratedId = newId;
    
    // Hide button
    document.getElementById('updatePathsBtn').style.display = 'none';
    
    updatePreview();
    autoSave();
    
    alert(`✅ ID actualizado!\n\nID anterior: ${oldId}\nID nuevo: ${newId}\n\n⚠️ Los paths se generarán automáticamente al subir los archivos`);
}
