// ===== LOADER-UTILS.JS - 3D Model Loading (STL/OBJ) =====

let currentSTLIndex = 0;
let groundMesh = null;
let gridMesh = null;
let currentBackground = 'default';
let animationFrameId = null;

// ===== GET 3D FILE (COMPATIBLE WITH BOTH SCHEMAS + AUTO-DETECT FORMAT) =====
function get3DFile() {
    if (currentModel['3dFiles'] && currentModel['3dFiles'].length > 0) {
        let path = currentModel['3dFiles'][0].path;
        
        if (!path.startsWith('models/')) {
            path = 'models/' + path;
        }
        
        const ext = path.toLowerCase().split('.').pop();
        const format = ext === 'obj' ? 'OBJ' : 'STL';
        
        return {
            hosted: true,
            path: path,
            format: format,
            fileSize: currentModel['3dFiles'][0].fileSize
        };
    }
    
    if (currentModel['3dFile']) {
        return currentModel['3dFile'];
    }
    
    return null;
}

// ===== INITIALIZE 3D VIEWER =====
function initialize3DViewer() {
    const file3D = get3DFile();
    
    if (!file3D || !file3D.hosted) {
        return;
    }
    
    document.getElementById('viewerSection').style.display = 'block';
    
    let firstModelIndex = -1;
    for (let i = 0; i < currentModel['3dFiles'].length; i++) {
        const ext = currentModel['3dFiles'][i].path.toLowerCase().split('.').pop();
        if (ext === 'stl' || ext === 'obj') {
            firstModelIndex = i;
            break;
        }
    }
    
    if (firstModelIndex === -1) {
        console.error('No 3D model files found');
        return;
    }
    
    const modelFilesCount = currentModel['3dFiles'].filter(f => {
        const ext = f.path.toLowerCase().split('.').pop();
        return ext === 'stl' || ext === 'obj';
    }).length;
    
    if (modelFilesCount > 1) {
        createSTLSelector();
    }
    
    const ext = currentModel['3dFiles'][firstModelIndex].path.toLowerCase().split('.').pop();
    
    if (ext === 'obj') {
        loadOBJ(firstModelIndex);
    } else {
        loadSTL(firstModelIndex);
    }
}

// ===== CREATE STL SELECTOR =====
function createSTLSelector() {
    const container = document.getElementById('modelViewer');
    const selector = document.createElement('div');
    selector.id = 'stlSelector';
    
    const modelFiles = currentModel['3dFiles']
        .map((file, originalIndex) => ({ file, originalIndex }))
        .filter(item => {
            const ext = item.file.path.toLowerCase().split('.').pop();
            return ext === 'stl' || ext === 'obj';
        });
    
    selector.innerHTML = '<label style="font-weight:600;color:var(--color-secondary);font-size:0.9rem;">Archivo 3D:</label><select id="stlSelect" style="padding:0.5rem;border:2px solid var(--color-light-gray);border-radius:8px;font-size:0.9rem;cursor:pointer;background:white;" onchange="changeSTL(this.value)">' + 
        modelFiles.map(item => 
            '<option value="'+item.originalIndex+'">'+item.file.name+' ('+item.file.fileSize+')</option>'
        ).join('') + 
        '</select>';
    container.appendChild(selector);
}

// ===== CHANGE STL =====
function changeSTL(index) {
    currentSTLIndex = parseInt(index);
    
    const filePath = currentModel['3dFiles'][currentSTLIndex].path;
    const ext = filePath.toLowerCase().split('.').pop();
    
    if (ext === 'obj') {
        loadOBJ(currentSTLIndex);
    } else {
        loadSTL(currentSTLIndex);
    }
}

// ===== LOAD STL =====
function loadSTL(index) {
    const container = document.getElementById('modelViewer');
    let stlPath;
    
    if (currentModel['3dFiles'] && currentModel['3dFiles'].length > 0) {
        stlPath = currentModel['3dFiles'][index].path;
        if (!stlPath.startsWith('models/')) {
            stlPath = 'models/' + stlPath;
        }
    } else if (currentModel['3dFile']) {
        stlPath = currentModel['3dFile'].path;
    }
    
    console.log('Loading STL:', stlPath);
    
    const selector = document.getElementById('stlSelector');
    container.innerHTML = '';
    if (selector) container.appendChild(selector);
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2F5233);
    
    camera = new THREE.PerspectiveCamera(50, container.offsetWidth / 600, 0.1, 1000);
    camera.position.set(0, 30, 80);
    
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.offsetWidth, 600);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.rotateSpeed = 0.5;
    controls.zoomSpeed = 0.8;
    controls.panSpeed = 0.5;
    controls.minDistance = 40;
    controls.maxDistance = 150;
    controls.maxPolarAngle = Math.PI;
    controls.target.set(0, 0, 0);
    
    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
    hemisphereLight.position.set(0, 200, 0);
    scene.add(hemisphereLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
    directionalLight.position.set(100, 100, 100);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    scene.add(directionalLight);
    
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight2.position.set(-50, 50, -50);
    scene.add(directionalLight2);
    
    const groundGeometry = new THREE.PlaneGeometry(400, 400);
    const groundMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xcccccc, 
        side: THREE.DoubleSide, 
        shininess: 0, 
        transparent: true, 
        opacity: 0.3 
    });
    groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -40;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    gridMesh = new THREE.GridHelper(200, 20, 0x999999, 0xdddddd);
    gridMesh.position.y = -39.9;
    scene.add(gridMesh);
    
    document.getElementById('cameraRotateBtn').style.background = 'rgba(245, 200, 66, 0.9)';
    document.getElementById('groundBtn').style.background = 'rgba(245, 200, 66, 0.9)';
    document.getElementById('gridBtn').style.background = 'rgba(245, 200, 66, 0.9)';

    const loader = new THREE.STLLoader();
    loader.load(stlPath, function(geometry) {
        const material = new THREE.MeshPhongMaterial({ 
            color: 0xF5C842, 
            specular: 0x666666, 
            shininess: 150, 
            flatShading: false 
        });
        
        currentMesh = new THREE.Mesh(geometry, material);
        currentMesh.castShadow = true;
        currentMesh.receiveShadow = true;
        
        geometry.computeBoundingBox();
        geometry.center();
        geometry.computeBoundingBox();
        
        const size = new THREE.Vector3();
        geometry.boundingBox.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 80 / maxDim;
        currentMesh.scale.setScalar(scale);
        currentMesh.rotation.x = -Math.PI / 2;
        
        saveOriginalMaterialConfigs(currentMesh);
        scene.add(currentMesh);
        
        const box = new THREE.Box3().setFromObject(currentMesh);
        const center = box.getCenter(new THREE.Vector3());
        const meshSize = box.getSize(new THREE.Vector3());
        
        controls.target.copy(center);
        controls.update();
        
        const distance = Math.max(meshSize.x, meshSize.y, meshSize.z) * 1.5;
        camera.position.set(center.x, center.y + distance * 0.5, center.z + distance);
        camera.lookAt(center);
        
        controls.minDistance = distance * 0.5;
        controls.maxDistance = distance * 2.5;
        
        // Cancel previous animation loop if exists
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }

        function animate() {
            animationFrameId = requestAnimationFrame(animate);
            
            if (isCameraRotating) {
                const radius = camera.position.length();
                const angle = 0.005;
                const x = camera.position.x;
                const z = camera.position.z;
                camera.position.x = x * Math.cos(angle) - z * Math.sin(angle);
                camera.position.z = x * Math.sin(angle) + z * Math.cos(angle);
                camera.lookAt(controls.target);
            }
            
            if (isModelRotating && currentMesh) {
                currentMesh.rotation[rotationAxis] += rotationSpeed;
            }
            // Update measurement tools
            if (typeof updateMeasurementTools === 'function' && 
                (measurements.length > 0 || dimensionsVisible)) {
                updateMeasurementTools();
            }         
            controls.update();
            renderer.render(scene, camera);
        }       
        animate();
        
        console.log('✅ STL loaded successfully');
    }, function(xhr) {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    }, function(error) {
        console.error('❌ Error loading STL:', error);
        container.innerHTML = '<p style="padding: 2rem; text-align: center; color: #E63946;">Error al cargar modelo 3D</p>';
    });
    
    window.addEventListener('resize', () => {
        if (camera && renderer) {
            camera.aspect = container.offsetWidth / 600;
            camera.updateProjectionMatrix();
            renderer.setSize(container.offsetWidth, 600);
        }
    });
}

// ===== LOAD OBJ FILE =====
function loadOBJ(index) {
    const container = document.getElementById('modelViewer');
    let objPath;
    
    if (currentModel['3dFiles'] && currentModel['3dFiles'].length > 0) {
        objPath = currentModel['3dFiles'][index].path;
        if (!objPath.startsWith('models/')) {
            objPath = 'models/' + objPath;
        }
    }
    
    console.log('Loading OBJ:', objPath);
    
    const selector = document.getElementById('stlSelector');
    container.innerHTML = '';
    if (selector) container.appendChild(selector);
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2F5233);
    
    camera = new THREE.PerspectiveCamera(50, container.offsetWidth / 600, 0.1, 1000);
    camera.position.set(0, 30, 80);
    
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.offsetWidth, 600);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.rotateSpeed = 0.5;
    controls.zoomSpeed = 0.8;
    controls.panSpeed = 0.5;
    controls.minDistance = 40;
    controls.maxDistance = 150;
    controls.maxPolarAngle = Math.PI;
    controls.target.set(0, 0, 0);
    
    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
    hemisphereLight.position.set(0, 200, 0);
    scene.add(hemisphereLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
    directionalLight.position.set(100, 100, 100);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight2.position.set(-50, 50, -50);
    scene.add(directionalLight2);
    
    const groundGeometry = new THREE.PlaneGeometry(400, 400);
    const groundMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xcccccc, 
        side: THREE.DoubleSide, 
        shininess: 0, 
        transparent: true, 
        opacity: 0.3 
    });
    groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -40;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    gridMesh = new THREE.GridHelper(200, 20, 0x999999, 0xdddddd);
    gridMesh.position.y = -39.9;
    scene.add(gridMesh);

    document.getElementById('cameraRotateBtn').style.background = 'rgba(245, 200, 66, 0.9)';
    document.getElementById('groundBtn').style.background = 'rgba(245, 200, 66, 0.9)';
    document.getElementById('gridBtn').style.background = 'rgba(245, 200, 66, 0.9)';
    
    const mtlPath = objPath.replace('.obj', '.mtl');
    const mtlFileName = mtlPath.substring(mtlPath.lastIndexOf('/') + 1);
    const texturePath = objPath.substring(0, objPath.lastIndexOf('/') + 1);
    const objLoader = new THREE.OBJLoader();
    
    console.log('🔍 Attempting to load MTL:', mtlFileName);
    
    const mtlLoader = new THREE.MTLLoader();
    mtlLoader.setPath(texturePath);
    mtlLoader.load(
        mtlFileName,
        function(materials) {
            console.log('✅ MTL loaded successfully');
            materials.preload();
            objLoader.setMaterials(materials);
            loadOBJGeometry(objLoader, objPath);
        },
        function(xhr) {
            console.log('📊 MTL loading progress:', (xhr.loaded / xhr.total * 100) + '%');
        },
        function(error) {
            console.log('❌ MTL loading failed, using default material');
            loadOBJGeometry(objLoader, objPath);
        }
    );
    
    function loadOBJGeometry(loader, path) {
        loader.load(path, function(object) {
            console.log('🎨 OBJ loaded');
            
            object.traverse(function(child) {
                if (child instanceof THREE.Mesh) {
                    if (child.material && child.material.map) {
                        const texture = child.material.map;
                        if (texture.image && !texture.image.complete) {
                            texture.image.onload = function() {
                                texture.needsUpdate = true;
                                child.material.needsUpdate = true;
                            };
                        } else {
                            texture.needsUpdate = true;
                            child.material.needsUpdate = true;
                        }
                    }
                }
            });
            
            currentMesh = object;
            
            const box = new THREE.Box3().setFromObject(object);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 80 / maxDim;
            object.scale.setScalar(scale);
            
            object.position.sub(center.multiplyScalar(scale));
            object.position.y += size.y * scale / 2 - 40;
            
            scene.add(object);
            saveOriginalMaterialConfigs(object);
            
            const meshSize = size.multiplyScalar(scale);
            controls.target.set(0, meshSize.y / 2 - 40, 0);
            controls.update();
            
            const distance = Math.max(meshSize.x, meshSize.y, meshSize.z) * 1.5;
            camera.position.set(0, distance * 0.5, distance);
            camera.lookAt(controls.target);
            
            controls.minDistance = distance * 0.5;
            controls.maxDistance = distance * 2.5;
            
            // Cancel previous animation loop if exists
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
            function animate() {
                animationFrameId = requestAnimationFrame(animate);
                
                if (isCameraRotating) {
                    const radius = camera.position.length();
                    const angle = 0.005;
                    const x = camera.position.x;
                    const z = camera.position.z;
                    camera.position.x = x * Math.cos(angle) - z * Math.sin(angle);
                    camera.position.z = x * Math.sin(angle) + z * Math.cos(angle);
                    camera.lookAt(controls.target);
                }
                
                if (isModelRotating && currentMesh) {
                    currentMesh.rotation[rotationAxis] += rotationSpeed;
                }
                // Update measurement tools
                if (typeof updateMeasurementTools === 'function' && 
                    (measurements.length > 0 || dimensionsVisible)) {
                    updateMeasurementTools();
                }               
                controls.update();
                renderer.render(scene, camera);
            }
            animate();
            
            console.log('✅ OBJ loaded successfully');
        }, function(xhr) {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        }, function(error) {
            console.error('❌ Error loading OBJ:', error);
            container.innerHTML = '<p style="padding: 2rem; text-align: center; color: #E63946;">Error al cargar modelo 3D</p>';
        });
    }
    
    window.addEventListener('resize', () => {
        if (camera && renderer) {
            camera.aspect = container.offsetWidth / 600;
            camera.updateProjectionMatrix();
            renderer.setSize(container.offsetWidth, 600);
        }
    });
}
