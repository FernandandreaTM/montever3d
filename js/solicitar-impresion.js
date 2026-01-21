// ===== SOLICITAR IMPRESIÓN - FORM LOGIC =====

let allModels = [];
let currentFormData = {};
let logoLabim3d = null;
let logoUach = null;

// ===== LOAD LOGOS AS BASE64 =====
async function loadLogos() {
    try {
        // Load LABIM3D logo
        const labim3dResponse = await fetch('images/logo/logo-labim3d.png');
        const labim3dBlob = await labim3dResponse.blob();
        logoLabim3d = await blobToBase64(labim3dBlob);
        
        // Load UACh logo
        const uachResponse = await fetch('images/logo/logo-uach.png');
        const uachBlob = await uachResponse.blob();
        logoUach = await blobToBase64(uachBlob);
        
        console.log('✅ Logos loaded successfully');
    } catch (error) {
        console.error('Error loading logos:', error);
    }
}

// ===== CONVERT BLOB TO BASE64 =====
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// ===== LOAD MODELS FROM CATALOG =====
async function loadModels() {
    try {
        const indexResponse = await fetch('data/index.json');
        const index = await indexResponse.json();
        
        const modelPromises = index.models.map(modelId => 
            fetch(`data/models/${modelId}.json`)
                .then(response => response.json())
                .catch(error => {
                    console.error(`Error loading ${modelId}:`, error);
                    return null;
                })
        );
        
        const models = await Promise.all(modelPromises);
        allModels = models.filter(m => m !== null);
        
        populateModelSelect();
        checkURLParams();
        
        console.log(`✅ Loaded ${allModels.length} models`);
    } catch (error) {
        console.error('Error loading models:', error);
    }
}

// ===== POPULATE MODEL DROPDOWN =====
function populateModelSelect() {
    const select = document.getElementById('modelo');
    
    allModels.forEach(model => {
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = `${model.title} (${model.category})`;
        select.appendChild(option);
    });
}

// ===== CHECK URL PARAMETERS =====
function checkURLParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const modelParam = urlParams.get('modelo');
    
    if (modelParam) {
        const select = document.getElementById('modelo');
        select.value = modelParam;
    }
}

// ===== TOGGLE ADVANCED SECTION =====
function toggleAdvanced() {
    const content = document.getElementById('advancedContent');
    const icon = document.getElementById('advancedIcon');
    
    content.classList.toggle('active');
    icon.textContent = content.classList.contains('active') ? '▲' : '▼';
}

// ===== SHOW/HIDE OTHER MATERIAL INPUT =====
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('input[name="material"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const otroGroup = document.getElementById('otroMaterialGroup');
            otroGroup.style.display = this.value === 'Otro' ? 'block' : 'none';
        });
    });
});

// ===== COLLECT FORM DATA =====
function collectFormData() {
    const modelSelect = document.getElementById('modelo');
    const selectedModel = allModels.find(m => m.id === modelSelect.value);
    
    const material = document.querySelector('input[name="material"]:checked');
    const materialValue = material ? material.value : 'No especificado';
    const materialFinal = materialValue === 'Otro' ? 
        document.getElementById('otroMaterial').value : materialValue;
    
    const prioridad = document.querySelector('input[name="prioridad"]:checked');
    const soportes = document.querySelector('input[name="soportes"]:checked');
    
    currentFormData = {
        // Auto-generated
        numeroOrden: `${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0')}`,
        fecha: new Date().toLocaleDateString('es-CL'),
        
        // Solicitante
        nombre: document.getElementById('nombre').value,
        instituto: document.getElementById('instituto').value,
        email: document.getElementById('email').value,
        telefono: document.getElementById('telefono').value || 'No especificado',
        
        // Proyecto
        nombreProyecto: selectedModel ? selectedModel.title : modelSelect.value,
        archivoSTL: document.getElementById('archivoSTL').value || (selectedModel?.['3dFiles']?.[0]?.name || 'No especificado'),
        cantidad: document.getElementById('cantidad').value,
        
        // Características
        material: materialFinal,
        color: document.getElementById('color').value || 'Disponible',
        prioridad: prioridad ? prioridad.value : 'Normal',
        
        // Avanzado
        relleno: document.getElementById('relleno').value || 'No especificado',
        alturaCapa: document.getElementById('alturaCapa').value || 'No especificado',
        soportes: soportes ? soportes.value : 'No especificado',
        largo: document.getElementById('largo').value || '-',
        ancho: document.getElementById('ancho').value || '-',
        alto: document.getElementById('alto').value || '-',
        
        // Otros
        usoPrevisto: document.getElementById('usoPrevisto').value || 'No especificado',
        observaciones: document.getElementById('observaciones').value || 'Ninguna'
    };
    
    return currentFormData;
}

// ===== GENERATE PDF =====
async function generatePDF() {
    // Validate required fields
    const form = document.getElementById('printRequestForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const data = collectFormData();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Colors
    const primaryColor = [245, 200, 66]; // Yellow
    const secondaryColor = [26, 26, 26]; // Dark
    const grayColor = [74, 74, 74];
    
    let y = 20;
    
    // HEADER - Yellow background
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 40, 'F');
    
    // Logos (if loaded)
    if (logoLabim3d) {
        try {
            doc.addImage(logoLabim3d, 'PNG', 15, 8, 35, 25);
        } catch (e) {
            console.error('Error adding LABIM3D logo:', e);
        }
    }
    
    if (logoUach) {
        try {
            doc.addImage(logoUach, 'PNG', 160, 5, 40, 30);
        } catch (e) {
            console.error('Error adding UACh logo:', e);
        }
    }
    
    // Title
    doc.setFontSize(18);
    doc.setTextColor(...secondaryColor);
    doc.setFont(undefined, 'bold');
    doc.text('ORDEN DE TRABAJO', 105, 16, { align: 'center' });
    doc.text('IMPRESIÓN 3D', 105, 24, { align: 'center' });
    
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text('Universidad Austral de Chile - TecMedHub', 105, 31, { align: 'center' });
    doc.text('Laboratorio de Impresión 3D Biomédica', 105, 36, { align: 'center' });
    
    y = 50;
    
    // Order Info
    doc.setFontSize(9);
    doc.setTextColor(...grayColor);
    doc.text(`Número de orden: ${data.numeroOrden}`, 15, y);
    doc.text(`Fecha de solicitud: ${data.fecha}`, 150, y);
    
    y += 10;
    
    // SECTION 1: Datos del Solicitante
    doc.setFontSize(12);
    doc.setTextColor(...secondaryColor);
    doc.setFont(undefined, 'bold');
    doc.text('1. DATOS DEL SOLICITANTE', 15, y);
    y += 7;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...grayColor);
    doc.text(`• Nombre completo: ${data.nombre}`, 15, y);
    y += 6;
    doc.text(`• Instituto/Escuela: ${data.instituto}`, 15, y);
    y += 6;
    doc.text(`• Correo electrónico: ${data.email}`, 15, y);
    y += 6;
    doc.text(`• Teléfono: ${data.telefono}`, 15, y);
    
    y += 10;
    
    // SECTION 2: Especificaciones
    doc.setFontSize(12);
    doc.setTextColor(...secondaryColor);
    doc.setFont(undefined, 'bold');
    doc.text('2. ESPECIFICACIONES DEL PROYECTO', 15, y);
    y += 7;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...grayColor);
    doc.text(`• Nombre del proyecto: ${data.nombreProyecto}`, 15, y);
    y += 6;
    doc.text(`• Archivo(s) STL adjunto(s): ${data.archivoSTL}`, 15, y);
    y += 6;
    doc.text(`• Cantidad de piezas: ${data.cantidad}`, 15, y);
    
    y += 10;
    
    // SECTION 2.1: Características
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('2.1 Características de impresión', 15, y);
    y += 7;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`• Material requerido: ${data.material}`, 15, y);
    y += 6;
    doc.text(`• Color: ${data.color}`, 15, y);
    y += 6;
    doc.text(`• Relleno (%): ${data.relleno}`, 15, y);
    y += 6;
    doc.text(`• Altura de capa (mm): ${data.alturaCapa}`, 15, y);
    y += 6;
    doc.text(`• Soportes requeridos: ${data.soportes}`, 15, y);
    
    y += 10;
    
    // SECTION 2.2: Dimensiones
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('2.2 Dimensiones', 15, y);
    y += 7;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`• Largo: ${data.largo} mm`, 15, y);
    y += 6;
    doc.text(`• Ancho: ${data.ancho} mm`, 15, y);
    y += 6;
    doc.text(`• Alto: ${data.alto} mm`, 15, y);
    
    y += 10;
    
    // SECTION 3: Prioridad
    doc.setFontSize(12);
    doc.setTextColor(...secondaryColor);
    doc.setFont(undefined, 'bold');
    doc.text('3. PRIORIDAD', 15, y);
    y += 7;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...grayColor);
    doc.text(`• ${data.prioridad}`, 15, y);
    
    y += 10;
    
    // SECTION 4: Uso Previsto
    doc.setFontSize(12);
    doc.setTextColor(...secondaryColor);
    doc.setFont(undefined, 'bold');
    doc.text('4. USO PREVISTO', 15, y);
    y += 7;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...grayColor);
    const usoPrevisto = doc.splitTextToSize(data.usoPrevisto, 180);
    doc.text(usoPrevisto, 15, y);
    y += (usoPrevisto.length * 6);
    
    y += 10;
    
    // SECTION 5: Observaciones
    doc.setFontSize(12);
    doc.setTextColor(...secondaryColor);
    doc.setFont(undefined, 'bold');
    doc.text('5. OBSERVACIONES ADICIONALES', 15, y);
    y += 7;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...grayColor);
    const observaciones = doc.splitTextToSize(data.observaciones, 180);
    doc.text(observaciones, 15, y);
    y += (observaciones.length * 6);
    
    y += 15;
    
    // SECTION 6: Para uso interno
    if (y > 240) {
        doc.addPage();
        y = 20;
    }
    
    doc.setFontSize(12);
    doc.setTextColor(...secondaryColor);
    doc.setFont(undefined, 'bold');
    doc.text('6. PARA USO INTERNO', 15, y);
    y += 7;
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(...grayColor);
    doc.text('• Recibido por: ______________________________ Fecha: ______________', 15, y);
    y += 8;
    doc.text('• Tiempo estimado de impresión: ______________________________', 15, y);
    y += 8;
    doc.text('• Gramos de material estimados: ______________________________', 15, y);
    y += 10;
    doc.text('Estado del proyecto:', 15, y);
    y += 6;
    doc.text('[ ] Pendiente de revision  [ ] En cola  [ ] En proceso', 15, y);
    y += 6;
    doc.text('[ ] Finalizado  [ ] Entregado', 15, y);
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('LABIM3D - TecMedHub | fernanda.lopez@uach.cl', 105, 285, { align: 'center' });
    
    // Save PDF
    const filename = `OT_LABIM3D_${data.numeroOrden}_${data.nombre.replace(/\s+/g, '_')}.pdf`;
    doc.save(filename);
    
    // Show success message and email button
    document.getElementById('successMessage').classList.add('active');
    document.getElementById('emailButton').style.display = 'block';
    
    // Scroll to success message
    document.getElementById('successMessage').scrollIntoView({ behavior: 'smooth' });
}

// ===== OPEN EMAIL =====
function openEmail() {
    const data = currentFormData;
    
    const subject = encodeURIComponent(`Solicitud Impresión 3D - ${data.nombreProyecto} - ${data.fecha}`);
    const body = encodeURIComponent(`Estimados TecMedHub,

Adjunto la Orden de Trabajo para la impresión del modelo "${data.nombreProyecto}".

Detalles de la solicitud:
- Modelo: ${data.nombreProyecto}
- Cantidad: ${data.cantidad}
- Prioridad: ${data.prioridad}

Quedo atento/a a su respuesta.

Saludos cordiales,
${data.nombre}
${data.email}`);
    
    window.location.href = `mailto:fernanda.lopez@uach.cl?subject=${subject}&body=${body}`;
}

// ===== INITIALIZE =====
document.addEventListener('DOMContentLoaded', () => {
    loadLogos();
    loadModels();
});