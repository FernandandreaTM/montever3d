// ===== MATERIAL-MODES.JS - Material Toggle System =====

// Global material configuration storage
let originalMaterialConfigs = new Map();
let materialMode = 'texture';

// ===== TEXTURAS PROCEDURALES =====
let currentTexture = 'piedra';
let proceduralTextures = {};

// ===== GENERAR TEXTURAS PROCEDURALES =====
function generateProceduralTexture(type) {
    if (proceduralTextures[type]) {
        return proceduralTextures[type];
    }
    
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    switch(type) {
        case 'piedra':
            // Base gris
            ctx.fillStyle = '#888888';
            ctx.fillRect(0, 0, 512, 512);
            // Moteado
            for (let i = 0; i < 2000; i++) {
                const x = Math.random() * 512;
                const y = Math.random() * 512;
                const size = Math.random() * 3;
                const brightness = Math.floor(Math.random() * 60 - 30);
                ctx.fillStyle = `rgb(${136+brightness}, ${136+brightness}, ${136+brightness})`;
                ctx.fillRect(x, y, size, size);
            }
            break;
            
        case 'ceramica':
            // Base terracota
            ctx.fillStyle = '#D4735E';
            ctx.fillRect(0, 0, 512, 512);
            // Variaciones de tono
            for (let i = 0; i < 1000; i++) {
                const x = Math.random() * 512;
                const y = Math.random() * 512;
                const size = Math.random() * 5;
                const variation = Math.floor(Math.random() * 30 - 15);
                ctx.fillStyle = `rgb(${212+variation}, ${115+variation}, ${94+variation})`;
                ctx.fillRect(x, y, size, size);
            }
            break;
            
        case 'hueso':
            // Base beige
            ctx.fillStyle = '#E8DCC4';
            ctx.fillRect(0, 0, 512, 512);
            // Vetas oscuras
            ctx.strokeStyle = 'rgba(200, 180, 150, 0.3)';
            ctx.lineWidth = 2;
            for (let i = 0; i < 30; i++) {
                ctx.beginPath();
                ctx.moveTo(Math.random() * 512, 0);
                ctx.bezierCurveTo(
                    Math.random() * 512, Math.random() * 512,
                    Math.random() * 512, Math.random() * 512,
                    Math.random() * 512, 512
                );
                ctx.stroke();
            }
            break;
            
        case 'tierra':
            // Base café oscuro
            ctx.fillStyle = '#5C4A3A';
            ctx.fillRect(0, 0, 512, 512);
            // Textura granulosa
            for (let i = 0; i < 3000; i++) {
                const x = Math.random() * 512;
                const y = Math.random() * 512;
                const size = Math.random() * 2;
                const brightness = Math.floor(Math.random() * 40 - 20);
                ctx.fillStyle = `rgb(${92+brightness}, ${74+brightness}, ${58+brightness})`;
                ctx.fillRect(x, y, size, size);
            }
            break;
            
        case 'madera':
            // Base café
            ctx.fillStyle = '#8B6F47';
            ctx.fillRect(0, 0, 512, 512);
            // Vetas de madera
            ctx.strokeStyle = 'rgba(70, 50, 30, 0.4)';
            ctx.lineWidth = 3;
            for (let i = 0; i < 50; i++) {
                ctx.beginPath();
                const y = i * 10 + Math.random() * 5;
                ctx.moveTo(0, y);
                ctx.bezierCurveTo(
                    128, y + Math.random() * 10 - 5,
                    384, y + Math.random() * 10 - 5,
                    512, y
                );
                ctx.stroke();
            }
            break;
            
        case 'metal':
            // Base verde pátina
            ctx.fillStyle = '#6B8E6F';
            ctx.fillRect(0, 0, 512, 512);
            // Oxidación café
            for (let i = 0; i < 800; i++) {
                const x = Math.random() * 512;
                const y = Math.random() * 512;
                const size = Math.random() * 8;
                ctx.fillStyle = `rgba(139, 111, 71, ${Math.random() * 0.3})`;
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
            }
            break;
    }
    
    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    
    proceduralTextures[type] = texture;
    return texture;
}

// ===== APLICAR TEXTURA PROCEDURAL =====
function applyProceduralTexture(type) {
    if (!currentMesh) return;
    
    currentTexture = type;
    const texture = generateProceduralTexture(type);
    
    currentMesh.traverse(function(child) {
        if (child instanceof THREE.Mesh) {
            child.material = new THREE.MeshPhongMaterial({
                map: texture,
                side: THREE.DoubleSide,
                shininess: type === 'ceramica' ? 80 : 30
            });
            child.material.needsUpdate = true;
        }
    });
    
    const textureLabels = {
        'piedra': 'Piedra',
        'ceramica': 'Cerámica',
        'hueso': 'Hueso',
        'tierra': 'Tierra',
        'madera': 'Madera',
        'metal': 'Metal Oxidado'
    };
    
    showToast(`Textura: ${textureLabels[type]}`);
}

// ===== COLOR MODO SÓLIDO =====
let currentSolidColor = 0xcccccc; // Gris por defecto

// Paleta predefinida arqueológica
const solidColorPalette = {
    'hueso': 0xE8DCC4,
    'terracota': 0xD4735E,
    'piedra': 0x999999,
    'tierra': 0x8B6F47,
    'patina': 0x6B8E6F,
    'marfil': 0xF5F5DC
};

// ===== APLICAR COLOR SÓLIDO =====
function applySolidColor(color) {
    if (!currentMesh) return;
    
    currentSolidColor = typeof color === 'string' ? parseInt(color.replace('#', '0x')) : color;
    
    currentMesh.traverse(function(child) {
        if (child instanceof THREE.Mesh) {
            child.material = new THREE.MeshPhongMaterial({
                color: currentSolidColor,
                side: THREE.DoubleSide,
                specular: 0x222222,
                shininess: 30
            });
            child.material.needsUpdate = true;
        }
    });
    
    showToast('Color aplicado');
}

// ===== SELECTOR COLOR PERSONALIZADO =====
function openSolidColorPicker() {
    const input = document.createElement('input');
    input.type = 'color';
    input.value = '#' + currentSolidColor.toString(16).padStart(6, '0');
    
    input.addEventListener('change', (e) => {
        applySolidColor(e.target.value);
    });
    
    input.click();
}

// ===== APLICAR COLOR PREDEFINIDO MODELO =====
function applySolidColorPreset(colorName) {
    if (colorName === 'custom') {
        openSolidColorPicker();
        return;
    }
    
    const color = solidColorPalette[colorName];
    applySolidColor(color);
    
    const colorLabels = {
        'hueso': 'Beige Hueso',
        'terracota': 'Terracota',
        'piedra': 'Gris Piedra',
        'tierra': 'Café Tierra',
        'patina': 'Verde Pátina',
        'marfil': 'Blanco Marfil'
    };
    
    showToast(`Color: ${colorLabels[colorName]}`);
}

// ===== OPACIDAD/TRANSPARENCIA =====
let currentOpacity = 1.0;

// ===== APLICAR OPACIDAD =====
function applyOpacity(value) {
    if (!currentMesh) return;
    
    currentOpacity = parseFloat(value);
    
    currentMesh.traverse(function(child) {
        if (child instanceof THREE.Mesh) {
            child.material.opacity = currentOpacity;
            child.material.transparent = currentOpacity < 1.0;
            child.material.needsUpdate = true;
        }
    });
    
    document.getElementById('opacityValue').textContent = Math.round(currentOpacity * 100) + '%';
}

// ===== RESET OPACIDAD =====
function resetOpacity() {
    applyOpacity(1.0);
    document.getElementById('opacitySlider').value = 1.0;
}

// ===== MATERIAL MODE TOGGLE =====
function toggleMaterialMode() {
    if (!currentMesh) return;

    const modes = ['texture', 'solid', 'wireframe', 'normals'];
    const currentIndex = modes.indexOf(materialMode);
    materialMode = modes[(currentIndex + 1) % modes.length];

    currentMesh.traverse(function(child) {
        if (child instanceof THREE.Mesh) {
            let newMaterial;

            switch(materialMode) {
                case 'texture':
                    if (originalMaterialConfigs.has(child.uuid)) {
                        const config = originalMaterialConfigs.get(child.uuid);
                        newMaterial = new THREE.MeshPhongMaterial(config.properties);
                    } else if (currentTexture && currentTexture !== 'original') {
                        // Usar textura procedural si está seleccionada
                        const texture = generateProceduralTexture(currentTexture);
                        newMaterial = new THREE.MeshPhongMaterial({
                            map: texture,
                            side: THREE.DoubleSide,
                            shininess: currentTexture === 'ceramica' ? 80 : 30
                        });
                    } else {
                        newMaterial = child.material.map 
                            ? child.material 
                            : new THREE.MeshPhongMaterial({ color: 0xF5C842, specular: 0x666666, shininess: 150 });
                    }
                    break;
                case 'solid':
                    newMaterial = new THREE.MeshPhongMaterial({
                        color: currentSolidColor,
                        side: THREE.DoubleSide,
                        specular: 0x222222,
                        shininess: 30
                    });
                    break;
                case 'wireframe':
                    newMaterial = new THREE.MeshBasicMaterial({
                        color: 0x00ff00,
                        wireframe: true
                    });
                    break;
                case 'normals':
                    newMaterial = new THREE.MeshNormalMaterial();
                    break;
            }

            child.material = newMaterial;
            if (newMaterial.map) {
                newMaterial.map.needsUpdate = true;
            }
            child.material.needsUpdate = true;
        }
    });

    const modeLabels = {
        'texture': 'Textura',
        'solid': 'Sólido',
        'wireframe': 'Wireframe',
        'normals': 'Normales'
    };
    showToast(`Material: ${modeLabels[materialMode]}`);
}

// ===== SAVE ORIGINAL MATERIAL CONFIGURATIONS =====
function saveOriginalMaterialConfigs(object) {
    object.traverse(function(child) {
        if (child instanceof THREE.Mesh) {
            const config = {
                type: child.material.type,
                properties: {}
            };
            
            if (child.material.color) config.properties.color = child.material.color.clone();
            if (child.material.specular) config.properties.specular = child.material.specular.clone();
            if (child.material.emissive) config.properties.emissive = child.material.emissive.clone();
            if (child.material.shininess !== undefined) config.properties.shininess = child.material.shininess;
            if (child.material.opacity !== undefined) config.properties.opacity = child.material.opacity;
            if (child.material.transparent !== undefined) config.properties.transparent = child.material.transparent;
            if (child.material.side !== undefined) config.properties.side = child.material.side;
            if (child.material.map) {
                config.properties.map = child.material.map;
            }
            
            originalMaterialConfigs.set(child.uuid, config);
        }
    });
}

function showToast(message) {
    const toast = document.getElementById('viewerToast');
    if (toast) {
        toast.textContent = message;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 2000);
    }
}