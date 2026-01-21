// ===== CATALOG.JS - Model Filtering and Display =====

let allModels = [];
let filteredModels = [];
let currentView = 'grid';

// ===== INITIALIZE =====
document.addEventListener('DOMContentLoaded', () => {
    loadModels();
    setupEventListeners();
    checkTagQueryParam(); 
});

// ===== LOAD MODELS FROM INDIVIDUAL JSON FILES =====
async function loadModels() {
    try {
        // 1. Load index
        const indexResponse = await fetch('data/index.json');
        const index = await indexResponse.json();
        
        // 2. Load each individual model
        const modelPromises = index.models.map(modelId => 
            fetch(`data/models/${modelId}.json`)
                .then(response => response.json())
                .catch(error => {
                    console.error(`Error loading model ${modelId}:`, error);
                    return null;
                })
        );
        
        // 3. Wait for all models to load
        const models = await Promise.all(modelPromises);
        
        // 4. Filter out any failed loads and assign to allModels
        allModels = models.filter(model => model !== null);
        filteredModels = [...allModels];
        
        populateCategoryFilters();
        renderModels();
        updateResultsCount();
        
        console.log(`✅ Loaded ${allModels.length} models from individual files`);
    } catch (error) {
        console.error('Error loading models:', error);
        document.getElementById('modelsGrid').innerHTML = 
            '<p style="text-align:center; padding: 2rem;">Error al cargar modelos</p>';
    }
}

// ===== POPULATE DYNAMIC FILTERS =====
function populateCategoryFilters() {
    const categories = [...new Set(allModels.map(m => m.category))];
    const container = document.getElementById('categoryFilters');
    
    container.innerHTML = categories.map(cat => `
        <label>
            <input type="checkbox" value="${cat}" class="filter-checkbox" data-filter="category">
            <span>${cat}</span>
        </label>
    `).join('');
    
    // Add event listeners
    container.querySelectorAll('.filter-checkbox').forEach(cb => {
        cb.addEventListener('change', applyFilters);
    });
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Search
    document.getElementById('searchInput').addEventListener('input', debounce(applyFilters, 300));
    
    // View toggle
    document.getElementById('viewGrid').addEventListener('click', () => switchView('grid'));
    document.getElementById('viewList').addEventListener('click', () => switchView('list'));
    
    // Sort
    document.getElementById('sortSelect').addEventListener('change', sortModels);
    
    // Reset filters
    document.getElementById('resetFilters').addEventListener('click', resetFilters);
    
    // Filter checkboxes
    document.querySelectorAll('.filter-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', applyFilters);
    });
}

// ===== APPLY FILTERS =====
function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    // Get selected filters
    const selectedCategories = getSelectedFilters('category');
    const selectedTypes = getSelectedFilters('type');
    const selectedOrigins = getSelectedFilters('origin');
    
    filteredModels = allModels.filter(model => {
        // Search filter
        const matchesSearch = !searchTerm || 
            model.title.toLowerCase().includes(searchTerm) ||
            model.description.toLowerCase().includes(searchTerm) ||
            model.category.toLowerCase().includes(searchTerm) ||
            (model.tags && model.tags.some(tag => tag.toLowerCase().includes(searchTerm)));
        
        // Category filter
        const matchesCategory = selectedCategories.length === 0 || 
            selectedCategories.includes(model.category);
        
        // Type filter
        const matchesType = selectedTypes.length === 0 || 
            selectedTypes.some(type => model.type.toLowerCase() === type);
        
        // Origin filter - NUEVO SISTEMA
        const matchesOrigin = selectedOrigins.length === 0 || 
            selectedOrigins.some(origin => {
                if (origin === 'externo') {
                    return model.source === 'Externo' && model.sourceStatus === 'Original';
                } else if (origin === 'modificado') {
                    return model.source === 'Externo' && model.sourceStatus === 'Modificado';
                } else if (origin === 'original') {
                    return model.source === 'Interno';
                }
                return false;
            });
        
        return matchesSearch && matchesCategory && matchesType && matchesOrigin;
    });
    
    renderModels();
    updateResultsCount();
}

// ===== GET SELECTED FILTERS =====
function getSelectedFilters(filterType) {
    return Array.from(document.querySelectorAll(`input[data-filter="${filterType}"]:checked`))
        .map(cb => cb.value);
}

// ===== SORT MODELS =====
function sortModels() {
    const sortBy = document.getElementById('sortSelect').value;
    
    switch(sortBy) {
        case 'alphabetical':
            filteredModels.sort((a, b) => a.title.localeCompare(b.title));
            break;
        case 'category':
            filteredModels.sort((a, b) => a.category.localeCompare(b.category));
            break;
        case 'recent':
        default:
            filteredModels.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
    }
    
    renderModels();
}

// ===== SWITCH VIEW =====
function switchView(view) {
    currentView = view;
    const grid = document.getElementById('modelsGrid');
    const gridBtn = document.getElementById('viewGrid');
    const listBtn = document.getElementById('viewList');
    
    if (view === 'grid') {
        grid.classList.remove('view-list');
        grid.classList.add('view-grid');
        gridBtn.classList.add('active');
        listBtn.classList.remove('active');
    } else {
        grid.classList.remove('view-grid');
        grid.classList.add('view-list');
        listBtn.classList.add('active');
        gridBtn.classList.remove('active');
    }
    
    renderModels();
}

// ===== RENDER MODELS =====
function renderModels() {
    const container = document.getElementById('modelsGrid');
    const noResults = document.getElementById('noResults');
    
    if (filteredModels.length === 0) {
        container.innerHTML = '';
        noResults.style.display = 'block';
        return;
    }
    
    noResults.style.display = 'none';
    
    container.innerHTML = filteredModels.map(model => createModelCard(model)).join('');
    
    // Add click handlers
    container.querySelectorAll('.model-card').forEach(card => {
        card.addEventListener('click', () => {
            window.location.href = `model.html?id=${card.dataset.id}`;
        });
    });
}

// ===== CREATE MODEL CARD =====
function createModelCard(model) {
    const badges = createBadges(model);
    
    // Determinar texto de fuente específica
    let sourceText;
    if (model.source === 'Interno') {
        sourceText = 'LABIM3D';
    } else {
        sourceText = model.sourceName || 'Fuente Externa';
    }
    
    return `
        <div class="model-card" data-id="${model.id}">
            <div class="model-image">
                <img src="${model.images.thumbnail}" alt="${model.title}">
                ${badges}
            </div>
            <div class="model-info">
                <div class="model-category">${model.category}</div>
                <h3>${model.title}</h3>
                <p class="model-description">${model.description}</p>
                <div class="model-meta">
                    <span class="model-license">${model.license}</span>
                    <span class="model-source">${sourceText}</span>
                </div>
            </div>
        </div>
    `;
}

// ===== CREATE BADGES =====
function createBadges(model) {
    let badges = [];
    
    // Type badge
    if (model.type === 'Funcional') {
        badges.push('<span class="model-badge badge-functional">🔧 FUNCIONAL</span>');
    }
    
    // Source badge - NUEVO SISTEMA
    let badgeClass, badgeIcon, badgeText;
    
    if (model.source === 'Interno') {
        badgeClass = 'badge-original';
        badgeIcon = '⭐';
        badgeText = 'INTERNO';
    } else if (model.source === 'Externo' && model.sourceStatus === 'Modificado') {
        badgeClass = 'badge-modified';
        badgeIcon = '✏️';
        badgeText = 'MODIFICADO';
    } else {
        // Externo Original (default)
        badgeClass = 'badge-external';
        badgeIcon = '🌐';
        badgeText = 'EXTERNO';
    }
    
    const topPosition = badges.length > 0 ? 'style="top: 45px;"' : '';
    badges.push(`<span class="model-badge ${badgeClass}" ${topPosition}>${badgeIcon} ${badgeText}</span>`);
    
    return badges.join('');
}

// ===== UPDATE RESULTS COUNT =====
function updateResultsCount() {
    document.getElementById('resultsCount').textContent = 
        `${filteredModels.length} ${filteredModels.length === 1 ? 'modelo encontrado' : 'modelos encontrados'}`;
}

// ===== RESET FILTERS =====
function resetFilters() {
    document.getElementById('searchInput').value = '';
    document.querySelectorAll('.filter-checkbox').forEach(cb => cb.checked = false);
    document.getElementById('sortSelect').value = 'recent';
    applyFilters();
}

// ===== UTILITY: DEBOUNCE =====
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
// ===== CHECK TAG QUERY PARAM =====
function checkTagQueryParam() {
    const urlParams = new URLSearchParams(window.location.search);
    const tagParam = urlParams.get('tag');
    
    if (tagParam) {
        // Esperar a que los modelos se carguen
        const checkModelsLoaded = setInterval(() => {
            if (allModels.length > 0) {
                clearInterval(checkModelsLoaded);
                
                // Aplicar filtro de tag
                document.getElementById('searchInput').value = tagParam;
                applyFilters();
                
                // Scroll suave al catálogo
                setTimeout(() => {
                    document.getElementById('catalogSection')?.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'start' 
                    });
                }, 100);
                
                console.log(`🏷️ Filtrando por tag: ${tagParam}`);
            }
        }, 100);
    }
}
