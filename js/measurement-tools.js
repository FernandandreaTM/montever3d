// ===== MEASUREMENT-TOOLS.JS - Distance, Scale, Dimensions =====

// ===== GLOBAL VARIABLES =====
let measurementUnit = 'mm'; // Default: millimeters
let dimensionsVisible = false;
let dimensionBoxGroup = null; // Three.js Group for bounding box visualization
let dimensionLabels = []; // Array of HTML label elements

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

// ===== CHANGE MEASUREMENT UNIT =====
function changeMeasurementUnit(unit) {
    measurementUnit = unit;
    console.log('📐 Unit changed to:', unit);
    
    // If dimensions are visible, update labels
    if (dimensionsVisible && currentMesh) {
        updateDimensionLabels();
    }
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
    
    // Create HTML labels for dimensions
    createDimensionLabels(size, center);
    
    console.log('✅ Dimensions displayed:', {
        X: formatDimension(size.x),
        Y: formatDimension(size.y),
        Z: formatDimension(size.z)
    });
}

// ===== CREATE BOUNDING BOX EDGES =====
function createBoundingBoxEdges(box) {
    // Use Geometry with vertices for Three.js r84
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

// ===== CREATE DIMENSION LABELS (HTML OVERLAY) =====
function createDimensionLabels(size, center) {
    const container = document.getElementById('modelViewer');
    
    // Clear existing labels
    dimensionLabels.forEach(label => label.remove());
    dimensionLabels = [];
    
    // Create labels for X, Y, Z
    const dimensions = [
        { axis: 'X', value: size.x, color: '#E63946' },
        { axis: 'Y', value: size.y, color: '#06D6A0' },
        { axis: 'Z', value: size.z, color: '#118AB2' }
    ];
    
    dimensions.forEach(dim => {
        const label = document.createElement('div');
        label.className = 'dimension-label';
        label.style.cssText = `
            position: absolute;
            background: ${dim.color};
            color: white;
            padding: 0.25rem 0.5rem;
            border-radius: 5px;
            font-size: 0.85rem;
            font-weight: 600;
            pointer-events: none;
            z-index: 100;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            white-space: nowrap;
        `;
        label.textContent = `${dim.axis}: ${formatDimension(dim.value)}`;
        
        container.appendChild(label);
        dimensionLabels.push(label);
    });
    
    // Update label positions
    updateDimensionLabelPositions();
}

// ===== UPDATE DIMENSION LABEL POSITIONS =====
function updateDimensionLabelPositions() {
    if (!dimensionsVisible || dimensionLabels.length === 0) return;
    
    const box = new THREE.Box3().setFromObject(currentMesh);
    const container = document.getElementById('modelViewer');
    const rect = container.getBoundingClientRect();
    
    // Define 3D positions for labels
    const labelPositions = [
        new THREE.Vector3(box.max.x + 10, box.min.y, (box.min.z + box.max.z) / 2), // X axis
        new THREE.Vector3(box.min.x, box.max.y + 10, (box.min.z + box.max.z) / 2), // Y axis
        new THREE.Vector3((box.min.x + box.max.x) / 2, box.min.y, box.max.z + 10)  // Z axis
    ];
    
    labelPositions.forEach((pos, index) => {
        const screenPos = toScreenPosition(pos, camera, container);
        
        if (dimensionLabels[index]) {
            dimensionLabels[index].style.left = `${screenPos.x}px`;
            dimensionLabels[index].style.top = `${screenPos.y}px`;
        }
    });
}

// ===== CONVERT 3D POSITION TO SCREEN POSITION =====
function toScreenPosition(position, camera, container) {
    const vector = position.clone();
    vector.project(camera);
    
    const widthHalf = container.offsetWidth / 2;
    const heightHalf = 600 / 2; // Canvas height
    
    return {
        x: (vector.x * widthHalf) + widthHalf,
        y: -(vector.y * heightHalf) + heightHalf
    };
}

// ===== UPDATE DIMENSION LABELS (WHEN UNIT CHANGES) =====
function updateDimensionLabels() {
    if (!currentMesh || dimensionLabels.length === 0) return;
    
    const box = new THREE.Box3().setFromObject(currentMesh);
    const size = box.getSize(new THREE.Vector3());
    
    const dimensions = [
        { axis: 'X', value: size.x },
        { axis: 'Y', value: size.y },
        { axis: 'Z', value: size.z }
    ];
    
    dimensions.forEach((dim, index) => {
        if (dimensionLabels[index]) {
            dimensionLabels[index].textContent = `${dim.axis}: ${formatDimension(dim.value)}`;
        }
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
    
    dimensionLabels.forEach(label => label.remove());
    dimensionLabels = [];
}

// ===== UPDATE LABELS ON CAMERA MOVE =====
// Hook into animation loop (called from loader-utils.js animate function)
function updateMeasurementTools() {
    if (dimensionsVisible) {
        updateDimensionLabelPositions();
    }
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
        btn.textContent = '📍 Desactivar Medición';
        btn.style.background = 'rgba(245, 200, 66, 0.9)';
        info.style.display = 'block';
        info.textContent = 'Click para marcar Punto A';
        
        const canvas = renderer.domElement;
        canvas.addEventListener('click', onCanvasClick);
        canvas.style.cursor = 'crosshair';
        
        console.log('📍 Distance measurement activated');
    } else {
        btn.textContent = '📍 Activar Medición';
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
    createMeasurementLabel(currentMeasurement);
    
    measurements.push(currentMeasurement);
    currentMeasurement = null;
    
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
    const container = document.getElementById('modelViewer');
    const distance = measurement.points[0].distanceTo(measurement.points[1]);
    
    const label = document.createElement('div');
    label.className = 'distance-label';
    label.style.cssText = `
        position: absolute;
        background: rgba(212, 164, 53, 0.7);
        color: white;
        padding: 0.4rem 0.6rem;
        border-radius: 6px;
        font-size: 0.85rem;
        font-weight: 600;
        pointer-events: none;
        z-index: 100;
        box-shadow: 0 3px 8px rgba(0,0,0,0.25);
        white-space: nowrap;
        border: 1px solid rgba(255, 255, 255, 0.5);
        backdrop-filter: blur(4px);
    `;
    label.textContent = formatDimension(distance);
    
    container.appendChild(label);
    measurement.label = label;
    
    updateMeasurementLabelPosition(measurement);
}

function updateMeasurementLabelPosition(measurement) {
    if (!measurement.label || measurement.points.length !== 2) return;
    
    const midpoint = new THREE.Vector3().addVectors(
        measurement.points[0],
        measurement.points[1]
    ).multiplyScalar(0.5);
    
    const container = document.getElementById('modelViewer');
    const screenPos = toScreenPosition(midpoint, camera, container);
    
    measurement.label.style.left = `${screenPos.x}px`;
    measurement.label.style.top = `${screenPos.y}px`;
    measurement.label.style.transform = 'translate(-50%, -50%)';
}

function clearDistanceMeasurement() {
    measurements.forEach(m => {
        m.markers.forEach(marker => scene.remove(marker));
        if (m.line) scene.remove(m.line);
        if (m.label) m.label.remove();
    });
    
    if (currentMeasurement) {
        currentMeasurement.markers.forEach(marker => scene.remove(marker));
        currentMeasurement = null;
    }
    
    measurements = [];
    
    document.getElementById('clearDistanceBtn').disabled = true;
    document.getElementById('clearDistanceBtn').style.opacity = '0.5';
    
    if (distanceMeasurementActive) {
        document.getElementById('distanceInfo').textContent = 'Click para marcar Punto A';
    }
    
    console.log('🗑️ Todas las mediciones borradas');
}

function updateMeasurementTools() {
    if (dimensionsVisible) {
        updateDimensionLabelPositions();
    }
    
    measurements.forEach(m => {
        if (m.label && m.points.length === 2) {
            updateMeasurementLabelPosition(m);
        }
    });
}

console.log('✅ Measurement Tools loaded');