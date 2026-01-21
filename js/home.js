// ===== HOME.JS - Homepage Logic =====

// ===== LOAD RANDOM FEATURED MODELS =====
async function loadFeaturedModels() {
    try {
        const indexResponse = await fetch('data/index.json');
        const index = await indexResponse.json();
        
        const modelPromises = index.models.map(modelId => 
            fetch(`data/models/${modelId}.json`)
                .then(response => response.json())
                .catch(() => null)
        );
        
        const models = await Promise.all(modelPromises);
        const allModels = models.filter(m => m !== null);
        
        // Select 4 random
        const shuffled = allModels.sort(() => 0.5 - Math.random());
        const featured = shuffled.slice(0, 4);
        
        const grid = document.querySelector('.featured-models .models-grid');
        grid.innerHTML = featured.map(model => createFeaturedCard(model)).join('');
        
        // Click handlers
        grid.querySelectorAll('.model-card').forEach(card => {
            card.addEventListener('click', () => {
                window.location.href = `model.html?id=${card.dataset.id}`;
            });
        });
        
    } catch (error) {
        console.error('Error loading featured models:', error);
    }
}

function createFeaturedCard(model) {
    let badges = [];
    
    if (model.type === 'Funcional') {
        badges.push('<span class="model-badge badge-functional">🔧 FUNCIONAL</span>');
    }
    
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
        badgeClass = 'badge-external';
        badgeIcon = '🌐';
        badgeText = 'EXTERNO';
    }
    
    const topPosition = badges.length > 0 ? 'style="top: 45px;"' : '';
    badges.push(`<span class="model-badge ${badgeClass}" ${topPosition}>${badgeIcon} ${badgeText}</span>`);
    
    return `
        <div class="model-card" data-id="${model.id}">
            <div class="model-image">
                <img src="${model.images.thumbnail}" alt="${model.title}">
                ${badges.join('')}
            </div>
            <div class="model-info">
                <div class="model-category">${model.category}</div>
                <h3>${model.title}</h3>
                <p class="model-description">${model.description}</p>
                <div class="model-meta">
                    <span class="model-license">${model.license}</span>
                    <span class="model-source">${model.sourceName || model.source}</span>
                </div>
            </div>
        </div>
    `;
}

// Initialize
document.addEventListener('DOMContentLoaded', loadFeaturedModels);