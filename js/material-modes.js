// ===== MATERIAL-MODES.JS - Material Toggle System =====

// Global material configuration storage
let originalMaterialConfigs = new Map();
let materialMode = 'texture';

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
                    } else {
                        newMaterial = child.material.map 
                            ? child.material 
                            : new THREE.MeshPhongMaterial({ color: 0xF5C842, specular: 0x666666, shininess: 150 });
                    }
                    break;
                case 'solid':
                    newMaterial = new THREE.MeshPhongMaterial({
                        color: 0xcccccc,
                        side: THREE.DoubleSide
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
    document.getElementById('materialModeLabel').textContent = modeLabels[materialMode];
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
