// ===== MEASUREMENT-TOOLS.JS - Distance, Scale, Dimensions =====

// ===== GLOBAL VARIABLES =====
let measurementUnit = 'mm'; // Default: millimeters
let dimensionsVisible = false;
let dimensionBoxGroup = null; // Three.js Group for bounding box visualization
let dimensionLabels = []; // Array of sprite label elements

// Unit conversion factors (assuming 1 Three.js unit = 1mm)
const unitConversions = {
    'mm': 1,
    'cm': 0.1,
    'm': 0.001
};

const unitSymbols = {
    'mm': 'mm',
    'cm': 'cm',
    'm': 'm'
};

// ===== CREATE TEXT SPRITE FOR 3D LABELS =====
function createTextSprite(text, backgroundColor) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    // Double resolution for sharper text
    canvas.width = 512;
    canvas.height = 128;
    
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    context.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    context.lineWidth = 6;
    context.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
    
    context.font = 'Bold 56px Arial';
    context.fillStyle = 'white';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    
    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    
    const material = new THREE.SpriteMaterial({ 
        map: texture,
        depthTest: false,  // Always render on top
        depthWrite: false
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(20, 5, 1);
    sprite.renderOrder = 999; // Render last (on top)
    
    return sprite;
}

// ===== CHANGE MEASUREMENT UNIT =====
function changeMeasurementUnit(unit) {
    measurementUnit = unit;
    console.log('📏 Unit changed to:', unit);
    
    // If dimensions are visible, update labels
    if (dimensionsVisible && currentMesh) {
        updateDimensionLabels();
    }
    
    // Update distance measurement labels
    measurements.forEach(m => {
        if (m.label && m.points.length === 2) {
            const distance = m.points[0].distanceTo(m.points[1]);
            const text = formatDimension(distance);
            updateSpriteText(m.label, text, 'rgba(212, 164, 53, 0.95)');
        }
    });
}

// ===== UPDATE SPRITE TEXT =====
function updateSpriteText(sprite, text, backgroundColor) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 128;
    
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    context.lineWidth = 6;
    context.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
    context.font = 'Bold 56px Arial';
    context.fillStyle = 'white';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    
    sprite.material.map.image = canvas;
    sprite.material.map.needsUpdate = true;
}

// ===== TOGGLE DIMENSIONS =====
function toggleDimensions() {
    if (!currentMesh || !scene) {
        console.warn('⚠️ No model loaded');
        return;
    }
    
    dimensionsVisible = !dimensionsVisible;
    
    const btn = document.getElementById('dimensionsToggle');
    
    if (dimensionsVisible) {
        createDimensionVisualization();
        btn.textContent = '📦 Ocultar Dimensiones';
        btn.style.background = 'rgba(245, 200, 66, 0.9)';
    } else {
        removeDimensionVisualization();
        btn.textContent = '📦 Mostrar Dimensiones';
        btn.style.background = 'rgba(255, 255, 255, 0.85)';
    }
}

// ===== CREATE DIMENSION VISUALIZATION =====
function createDimensionVisualization() {
    // Remove existing if any
    removeDimensionVisualization();
    
    // Calculate bounding box
    const box = new THREE.Box3().setFromObject(currentMesh);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    
    // Create group for all dimension elements
    dimensionBoxGroup = new THREE.Group();
    
    // Create bounding box edges
    const edges = createBoundingBoxEdges(box);
    dimensionBoxGroup.add(edges);
    
    scene.add(dimensionBoxGroup);
    
    // Create sprite labels for dimensions
    createDimensionLabels(size, center, box);
    
    console.log('✅ Dimensions displayed:', {
        X: formatDimension(size.x),
        Y: formatDimension(size.y),
        Z: formatDimension(size.z)
    });
}

// ===== CREATE BOUNDING BOX EDGES =====
function createBoundingBoxEdges(box) {
    const geometry = new THREE.Geometry();
    
    // Bottom face
    geometry.vertices.push(
        new THREE.Vector3(box.min.x, box.min.y, box.min.z),
        new THREE.Vector3(box.max.x, box.min.y, box.min.z),
        new THREE.Vector3(box.max.x, box.min.y, box.max.z),
        new THREE.Vector3(box.min.x, box.min.y, box.max.z),
        new THREE.Vector3(box.min.x, box.min.y, box.min.z)
    );
    
    // Vertical edges
    geometry.vertices.push(
        new THREE.Vector3(box.min.x, box.max.y, box.min.z),
        new THREE.Vector3(box.max.x, box.max.y, box.min.z),
        new THREE.Vector3(box.max.x, box.min.y, box.min.z),
        new THREE.Vector3(box.max.x, box.max.y, box.min.z),
        new THREE.Vector3(box.max.x, box.max.y, box.max.z),
        new THREE.Vector3(box.max.x, box.min.y, box.max.z),
        new THREE.Vector3(box.max.x, box.max.y, box.max.z),
        new THREE.Vector3(box.min.x, box.max.y, box.max.z),
        new THREE.Vector3(box.min.x, box.min.y, box.max.z),
        new THREE.Vector3(box.min.x, box.max.y, box.max.z),
        new THREE.Vector3(box.min.x, box.max.y, box.min.z)
    );
    
    const material = new THREE.LineBasicMaterial({ 
        color: 0xD4A435,
        linewidth: 2,
        transparent: true,
        opacity: 0.8
    });
    
    return new THREE.Line(geometry, material);
}

// ===== CREATE DIMENSION LABELS =====
function createDimensionLabels(size, center, box) {
    dimensionLabels.forEach(label => {
        if (label.parent) {
            label.parent.remove(label);
        }
    });
    dimensionLabels = [];
    
    const dimensions = [
        { 
            axis: 'X', 
            value: size.x, 
            color: '#E63946',
            position: new THREE.Vector3(box.max.x + 15, center.y, center.z)
        },
        { 
            axis: 'Y', 
            value: size.y, 
            color: '#06D6A0',
            position: new THREE.Vector3(center.x, box.max.y + 15, center.z)
        },
        { 
            axis: 'Z', 
            value: size.z, 
            color: '#118AB2',
            position: new THREE.Vector3(center.x, center.y, box.max.z + 15)
        }
    ];
    
    dimensions.forEach(dim => {
        const text = `${dim.axis}: ${formatDimension(dim.value)}`;
        const sprite = createTextSprite(text, dim.color);
        sprite.position.copy(dim.position);
        dimensionBoxGroup.add(sprite);
        dimensionLabels.push(sprite);
    });
}

// ===== UPDATE DIMENSION LABELS (when unit changes) =====
function updateDimensionLabels() {
    if (!currentMesh || dimensionLabels.length === 0) return;
    
    const box = new THREE.Box3().setFromObject(currentMesh);
    const size = box.getSize(new THREE.Vector3());
    
    const dimensions = [
        { axis: 'X', value: size.x, color: '#E63946' },
        { axis: 'Y', value: size.y, color: '#06D6A0' },
        { axis: 'Z', value: size.z, color: '#118AB2' }
    ];
    
    dimensionLabels.forEach((sprite, index) => {
        const dim = dimensions[index];
        const text = `${dim.axis}: ${formatDimension(dim.value)}`;
        updateSpriteText(sprite, text, dim.color);
    });
}

// ===== FORMAT DIMENSION VALUE =====
function formatDimension(value) {
    const converted = value * unitConversions[measurementUnit];
    return `${converted.toFixed(2)} ${unitSymbols[measurementUnit]}`;
}

// ===== REMOVE DIMENSION VISUALIZATION =====
function removeDimensionVisualization() {
    if (dimensionBoxGroup) {
        scene.remove(dimensionBoxGroup);
        dimensionBoxGroup = null;
    }
    
    dimensionLabels = [];
}

console.log('✅ Measurement Tools loaded');

// ===== DISTANCE MEASUREMENT TOOL =====

let distanceMeasurementActive = false;
let measurements = []; // Array of measurement objects
let currentMeasurement = null; // Current measurement being created
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();

const measurementColors = [
    { marker1: 0xE63946, marker2: 0xC1121F, line: 0xE63946, name: 'Rojo' },
    { marker1: 0x118AB2, marker2: 0x073B4C, line: 0x118AB2, name: 'Azul' },
    { marker1: 0x06D6A0, marker2: 0x048f6a, line: 0x06D6A0, name: 'Verde' },
    { marker1: 0xF77F00, marker2: 0xD62828, line: 0xF77F00, name: 'Naranja' },
    { marker1: 0x9D4EDD, marker2: 0x7209B7, line: 0x9D4EDD, name: 'Morado' }
];

function toggleDistanceMeasurement() {
    distanceMeasurementActive = !distanceMeasurementActive;
    
    const btn = document.getElementById('distanceMeasureToggle');
    const info = document.getElementById('distanceInfo');
    
    if (distanceMeasurementActive) {
        btn.textContent = '📏 Desactivar Medición';
        btn.style.background = 'rgba(245, 200, 66, 0.9)';
        info.style.display = 'block';
        info.textContent = 'Click para marcar Punto A';
        
        const canvas = renderer.domElement;
        canvas.addEventListener('click', onCanvasClick);
        canvas.style.cursor = 'crosshair';
        
        console.log('📍 Distance measurement activated');
    } else {
        btn.textContent = '📏 Activar Medición';
        btn.style.background = 'rgba(255, 255, 255, 0.85)';
        info.style.display = 'none';
        
        const canvas = renderer.domElement;
        canvas.removeEventListener('click', onCanvasClick);
        canvas.style.cursor = 'default';
        
        console.log('📍 Distance measurement deactivated');
    }
}

function onCanvasClick(event) {
    if (!distanceMeasurementActive || !currentMesh) return;
    
    const canvas = renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(currentMesh, true);
    
    if (intersects.length > 0) {
        const point = intersects[0].point;
        
        if (!currentMeasurement) {
            startNewMeasurement(point);
        } else if (currentMeasurement.points.length === 1) {
            completeMeasurement(point);
        }
    }
}

function startNewMeasurement(point) {
    const colorIndex = measurements.length % measurementColors.length;
    const colors = measurementColors[colorIndex];
    
    currentMeasurement = {
        points: [point],
        markers: [],
        line: null,
        label: null,
        colors: colors
    };
    
    const marker = createMarker(point, colors.marker1);
    currentMeasurement.markers.push(marker);
    
    document.getElementById('distanceInfo').textContent = 'Click para marcar Punto B';
    console.log(`📍 Medición ${measurements.length + 1} - Punto A`);
}

function completeMeasurement(point) {
    currentMeasurement.points.push(point);
    
    const marker = createMarker(point, currentMeasurement.colors.marker2);
    currentMeasurement.markers.push(marker);
    
    createMeasurementLine(currentMeasurement);
    
    // Add custom name property
    currentMeasurement.customName = '';
    currentMeasurement.id = Date.now();
    
    createMeasurementLabel(currentMeasurement);
    
    measurements.push(currentMeasurement);
    currentMeasurement = null;
    
    updateMeasurementList();
    
    document.getElementById('distanceInfo').textContent = `${measurements.length} medición(es) activa(s) - Click para nueva medición`;
    document.getElementById('clearDistanceBtn').disabled = false;
    document.getElementById('clearDistanceBtn').style.opacity = '1';
    
    console.log(`📍 Medición ${measurements.length} completada`);
}

function createMarker(point, color) {
    const geometry = new THREE.SphereGeometry(2, 16, 16);
    const material = new THREE.MeshBasicMaterial({ color: color });
    const marker = new THREE.Mesh(geometry, material);
    marker.position.copy(point);
    scene.add(marker);
    return marker;
}

function createMeasurementLine(measurement) {
    const geometry = new THREE.Geometry();
    geometry.vertices.push(measurement.points[0].clone());
    geometry.vertices.push(measurement.points[1].clone());
    
    const material = new THREE.LineBasicMaterial({ 
        color: measurement.colors.line,
        linewidth: 5
    });
    
    measurement.line = new THREE.Line(geometry, material);
    scene.add(measurement.line);
}

function createMeasurementLabel(measurement) {
    const distance = measurement.points[0].distanceTo(measurement.points[1]);
    const text = formatDimension(distance);
    const midpoint = new THREE.Vector3().addVectors(
        measurement.points[0],
        measurement.points[1]
    ).multiplyScalar(0.5);
    
    // Use sprite instead of HTML
    const sprite = createTextSprite(text, 'rgba(212, 164, 53, 0.95)');
    sprite.position.copy(midpoint);
    scene.add(sprite);
    
    measurement.label = sprite;
}

function clearDistanceMeasurement() {
    measurements.forEach(m => {
        m.markers.forEach(marker => scene.remove(marker));
        if (m.line) scene.remove(m.line);
        if (m.label) scene.remove(m.label);
    });
    
    if (currentMeasurement) {
        currentMeasurement.markers.forEach(marker => scene.remove(marker));
        currentMeasurement = null;
    }
    
    measurements = [];
    
    updateMeasurementList(); // ADD THIS LINE
    
    document.getElementById('clearDistanceBtn').disabled = true;
    document.getElementById('clearDistanceBtn').style.opacity = '0.5';
    
    if (distanceMeasurementActive) {
        document.getElementById('distanceInfo').textContent = 'Click para marcar Punto A';
    }
    
    console.log('🗑️ Todas las mediciones borradas');
}

// ===== UPDATE MEASUREMENT TOOLS (called from animate loop) =====
function updateMeasurementTools() {
    // All labels are now 3D sprites - no HTML position updates needed
    // This function remains as placeholder for future features
}

// ===== UPDATE MEASUREMENT LIST =====
function updateMeasurementList() {
    const container = document.getElementById('measurementList');
    const listContainer = document.getElementById('measurementListContainer');
    
    if (measurements.length === 0) {
        listContainer.style.display = 'none';
        return;
    }
    
    listContainer.style.display = 'block';
    
    container.innerHTML = measurements.map((m, index) => {
        const distance = m.points[0].distanceTo(m.points[1]);
        const defaultName = `Medición ${index + 1}`;
        const displayName = m.customName || defaultName;
        
        return `
            <div style="display: flex; gap: 0.5rem; align-items: center; padding: 0.5rem; background: rgba(255,255,255,0.5); border-radius: 6px;">
                <input 
                    type="text" 
                    value="${displayName}"
                    placeholder="${defaultName}"
                    onchange="updateMeasurementName(${m.id}, this.value)"
                    style="flex: 1; padding: 0.4rem; border: 1px solid var(--color-light-gray); border-radius: 4px; font-size: 0.85rem; font-weight: 600;"
                >
                <span style="min-width: 70px; font-weight: 700; color: var(--color-secondary); font-size: 0.9rem;">${formatDimension(distance)}</span>
                <button 
                    onclick="deleteMeasurement(${m.id})"
                    style="background: #E63946; color: white; border: none; padding: 0.4rem 0.6rem; border-radius: 4px; cursor: pointer; font-size: 0.8rem; font-weight: 600;"
                    title="Eliminar"
                >🗑️</button>
            </div>
        `;
    }).join('');
}

// ===== UPDATE MEASUREMENT NAME =====
function updateMeasurementName(id, newName) {
    const measurement = measurements.find(m => m.id === id);
    if (!measurement) return;
    
    measurement.customName = newName.trim();
    
    // Update sprite label
    const distance = measurement.points[0].distanceTo(measurement.points[1]);
    const text = measurement.customName ? `${measurement.customName}: ${formatDimension(distance)}` : formatDimension(distance);
    updateSpriteText(measurement.label, text, 'rgba(212, 164, 53, 0.95)');
    
    console.log(`📝 Medición renombrada: ${measurement.customName || 'sin nombre'}`);
}

// ===== DELETE SINGLE MEASUREMENT =====
function deleteMeasurement(id) {
    const index = measurements.findIndex(m => m.id === id);
    if (index === -1) return;
    
    const m = measurements[index];
    
    // Remove from scene
    m.markers.forEach(marker => scene.remove(marker));
    if (m.line) scene.remove(m.line);
    if (m.label) scene.remove(m.label);
    
    // Remove from array
    measurements.splice(index, 1);
    
    // Update list
    updateMeasurementList();
    
    // Update UI
    if (measurements.length === 0) {
        document.getElementById('clearDistanceBtn').disabled = true;
        document.getElementById('clearDistanceBtn').style.opacity = '0.5';
    }
    
    document.getElementById('distanceInfo').textContent = measurements.length > 0 
        ? `${measurements.length} medición(es) activa(s) - Click para nueva medición`
        : 'Click para marcar Punto A';
    
    console.log('🗑️ Medición eliminada');
}

console.log('✅ Measurement Tools loaded');