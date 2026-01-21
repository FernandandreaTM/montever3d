# LABIM3D - ARCHITECTURE

**Last Updated:** Session 7 (2025-01-04)  
**Status:** 75% Complete (7/8 sessions)

---

## SYSTEM OVERVIEW

LABIM3D is a static web-based catalog system for 3D biomedical models, requiring no backend infrastructure. Built with vanilla JavaScript, modular CSS, and JSON-based content management.

**Core Principles:**
- Static hosting (no server required)
- Modular file architecture
- JSON-based content
- Progressive enhancement
- Mobile-first responsive

---

## DIRECTORY STRUCTURE
```
labim3d/
├── index.html                    # Homepage
├── catalog.html                  # Model catalog
├── model.html                    # Model detail pages
├── solicitar-impresion.html      # Print request form
├── admin/
│   ├── index.html                # Admin panel
│   ├── admin.css
│   └── admin.js
├── css/
│   ├── base.css                  # Global styles + variables
│   ├── catalog.css               # Catalog-specific
│   ├── home.css                  # Homepage
│   ├── model.css                 # Model detail pages
│   ├── solicitar-impresion.css   # Print form
│   └── admin.css                 # Admin panel
├── js/
│   ├── nav.js                    # Navigation (shared)
│   ├── catalog.js                # Catalog filtering/display
│   ├── model-viewer.js           # 3D viewer + detail logic
│   ├── solicitar-impresion.js    # Print form + PDF
│   └── admin.js                  # Admin panel logic
├── data/
│   ├── index.json                # Master model list
│   └── models/
│       ├── model-1.json
│       ├── model-2.json
│       └── ...
├── models/                       # STL files
├── images/
│   ├── logo/
│   └── models/
│       ├── model-id/
│       │   ├── thumb.jpg
│       │   ├── gallery-1.jpg
│       │   └── ...
└── mnt/skills/                   # Read-only skill files
```

---

## DATA ARCHITECTURE

### Master Index (index.json)
```json
{
  "models": ["model-id-1", "model-id-2", ...]
}
```

### Individual Model (models/{id}.json)
```json
{
  "id": "unique-id",
  "title": "Model Name",
  "category": "Sistema Esquelético",
  "type": "Didáctico|Funcional",
  "origin": "Externo|Modificado|Original",
  "description": "...",
  "images": {
    "thumbnail": "images/models/id/thumb.jpg",
    "gallery": ["gallery-1.jpg", "gallery-2.jpg", ...]
  },
  "3dFiles": [
    {
      "id": "file-id",
      "name": "Display Name",
      "path": "models/file.stl",
      "fileSize": "2.5 MB"
    }
  ],
  "externalSourceUrl": "https://...",
  "license": "CC BY 4.0",
  "source": "NIH 3D Print",
  "tags": ["tag1", "tag2"],
  "dateAdded": "2025-01-04"
}
```

**Key Features:**
- Multi-STL support (`3dFiles[]` array)
- Backward compatible with single file schemas
- Optional fields (images, external links)
- Auto-path validation for STL files

---

## CORE SYSTEMS

### 1. Catalog System
**Files:** `catalog.html`, `catalog.js`, `catalog.css`

**Features:**
- Real-time search across title/description/tags
- Multi-filter (category, type, origin)
- Grid/List view toggle
- Sort by: recent, alphabetical, category
- Loads models from modular JSON files

### 2. 3D Viewer System
**Files:** `model.html`, `model-viewer.js`, `model.css`

**Technology:** Three.js r84 + STLLoader + OrbitControls

**Features:**
- Multi-STL support with dropdown selector
- Auto-centering and scaling per model
- Atmospheric lighting (hemisphere + directional)
- OrbitControls with damping
- Responsive camera positioning
- Download modal for multi-file models

**Implementation:**
```javascript
// Full scene rebuild per STL (vs mesh swap)
function loadSTL(index) {
    let stlPath = model['3dFiles'][index].path;
    if (!stlPath.includes('/')) stlPath = 'models/' + stlPath; // Auto-fix
    
    // Clear + rebuild scene
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(...);
    // ... load STL, center, scale
}
```

### 3. Admin Panel System
**Files:** `admin/index.html`, `admin.js`, `admin.css`

**Features:**
- Password-protected (sessionStorage)
- Two modes: New model | Edit existing
- Auto-fill (ID generation, image paths, STL data)
- Tab key auto-complete
- localStorage auto-save
- Multi-STL management
- Edit mode ID preservation
- Path validation (auto-adds "models/" prefix)
- Generates downloadable JSON files

**Critical Fix (Session 6):**
```javascript
// Edit mode preserves original ID
let editingModelId = null;

function generateId() {
    if (editingModelId) return; // ✅ BLOCK in edit mode
    // ... generate new ID
}

function saveModel() {
    if (editingModelId) {
        modelData.id = editingModelId; // ✅ FORCE original
    }
    // ... save
}
```

### 4. Print Request System
**Files:** `solicitar-impresion.html`, `solicitar-impresion.js`, `solicitar-impresion.css`

**Features:**
- Minimal required fields (name, email, model, quantity)
- Dynamic model dropdown from catalog
- URL parameter pre-selection
- Collapsible advanced section
- PDF generation with jsPDF
- Logo fetch from server
- Professional OT document layout
- mailto integration

**PDF Generation:**
```javascript
async function generatePDF() {
    // Load logos
    await loadLogos();
    
    // Collect form data
    const data = collectFormData();
    
    // Generate PDF with jsPDF
    const doc = new jsPDF();
    doc.addImage(logoLabim3d, 'PNG', 15, 8, 30, 25);
    // ... add content
    doc.save(`OT_LABIM3D_${orderNum}_${name}.pdf`);
    
    // Show email button
    document.getElementById('emailButton').style.display = 'block';
}
```

---

## STRATEGIC DECISIONS

### 1. Modular JSON vs Single File
**Chosen:** Individual JSON per model
**Rationale:** Scalability, easier editing, version control friendly

### 2. Three.js r84 vs Latest
**Chosen:** r84 (stable CDN)
**Rationale:** Proven reliability, all features needed, lighter

### 3. Multi-STL Scene Rebuild vs Mesh Swap
**Chosen:** Full scene rebuild per file
**Rationale:** Different models need different camera/lighting, cleaner state

### 4. Admin Panel: New + Edit vs Separate Pages
**Chosen:** Mode toggle in single page
**Rationale:** Shared form logic, better UX

### 5. Print Request: Backend vs mailto
**Chosen:** PDF download + mailto
**Rationale:** Zero infrastructure, professional OT document

---

## COLOR SYSTEM
```css
--color-primary: #F5C842;        /* LABIM3D Yellow */
--color-secondary: #1A1A1A;      /* Dark */
--color-accent: #E63946;         /* Red CTA */
--gradient-primary: linear-gradient(135deg, #F5C842 0%, #FFD666 100%);
```

---

## EXTERNAL DEPENDENCIES
```html
<!-- Three.js Ecosystem (r84) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/84/three.min.js"></script>
<script src="https://cdn.rawgit.com/mrdoob/three.js/r84/examples/js/loaders/STLLoader.js"></script>
<script src="https://cdn.rawgit.com/mrdoob/three.js/r84/examples/js/controls/OrbitControls.js"></script>

<!-- jsPDF (PDF Generation) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
```

---

## WORKFLOWS

### Adding New Model
1. Access admin panel (password: labim3d2025)
2. Fill form (title, category, type, etc.)
3. Add STL files with paths
4. Generate JSON → Downloads 2 files
5. Upload `{id}.json` to `data/models/`
6. Replace `data/index.json`
7. Upload STL files to `models/`
8. Upload images to `images/models/{id}/`

### Editing Existing Model
1. Switch to "Edit" mode
2. Select model from dropdown
3. Modify fields (ID preserved automatically)
4. Save → Downloads updated files
5. Replace files on server

### Requesting Print
1. Navigate to model detail page
2. Click "Solicitar Impresión"
3. Fill minimal fields
4. Generate PDF (auto-downloads)
5. Click "Enviar Email"
6. Attach PDF manually

---

## KNOWN LIMITATIONS

- **Browser caching:** Aggressive JS caching requires hard refresh
- **STL file size:** 10MB+ may take 2-3 seconds to load
- **Logo loading:** Requires server (fetch API)
- **Email:** User must attach PDF manually (no automatic)

---

## FUTURE ENHANCEMENTS

- Batch model upload (CSV import)
- Direct STL file upload in admin
- Image upload with preview
- Model versioning system
- User feedback/ratings
- Analytics dashboard
- Search autocomplete
- Print queue management

---

*Last updated: Session 7 (2025-01-04)*  
*Architecture finalized for production*