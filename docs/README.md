# MonteVer3D

**Repositorio de Modelos Arqueológicos 3D para Conservación Digital del Patrimonio**

[![Status](https://img.shields.io/badge/Status-Active-green)]()
[![License](https://img.shields.io/badge/License-Educational-blue)]()
[![Institution](https://img.shields.io/badge/Institution-UACh-gold)]()

---

## 🎯 PROJECT OVERVIEW

MonteVer3D es una plataforma web de digitalización 3D para la conservación y difusión del patrimonio arqueológico desarrollada por TecMedHub en la Universidad Austral de Chile, Sede Puerto Montt. La plataforma sirve como repositorio educativo y de investigación para artefactos, estructuras y sitios arqueológicos, presentando modelos 3D curados con visualización interactiva en navegador y capacidades de solicitud de impresión.

**Características Principales:**
- 🏛️ Catálogo curado de modelos arqueológicos 3D con filtrado
- 🔍 Búsqueda en tiempo real y filtros avanzados
- 🎨 Visor 3D interactivo (Three.js)
- 📄 Sistema profesional de solicitud de impresión con generación de PDF
- ⚙️ Panel de administración para gestión de contenido
- 📱 Diseño completamente responsivo
- 🌍 Acceso universal y licencias abiertas

---

## 🚀 QUICK START

### Requisitos Previos
- Servidor web (Apache/Nginx) con soporte PHP 7.4+
- Navegador moderno (Chrome, Firefox, Edge)
- PHP con extensiones: json, fileinfo, session

### Instalación
```bash
# Clonar repositorio
git clone https://github.com/your-org/montever3d.git

# Configurar servidor web
cd montever3d

# Para desarrollo local con PHP built-in server
php -S localhost:8000

# O usar servidor Apache/Nginx
```

### Puntos de Acceso
- **Homepage:** `index.html`
- **Catálogo:** `catalog.html`
- **Panel Admin:** `admin/index.html` (contraseña: labim3d2025)
- **Solicitar Impresión:** `solicitar-impresion.html`
- **Detalle de Modelo:** `model.html?id={model-id}`

---

## 📂 PROJECT STRUCTURE
```
montever3d/
├── index.html              # Página principal
├── catalog.html            # Catálogo de modelos
├── model.html              # Detalle de modelo + visor 3D
├── solicitar-impresion.html # Formulario de solicitud de impresión
├── about.html              # Acerca del proyecto
├── casos.html              # Casos de uso
├── css/                    # Hojas de estilo modulares
│   ├── base.css           # Estilos globales + variables
│   ├── home.css           # Homepage
│   ├── catalog.css        # Catálogo
│   ├── model.css          # Páginas de detalle
│   └── solicitar-impresion.css # Formulario de impresión
├── js/                     # Módulos JavaScript
│   ├── nav.js             # Navegación
│   ├── home.js            # Homepage
│   ├── catalog.js         # Lógica del catálogo
│   ├── model-viewer.js    # Visor 3D + página de detalle
│   └── solicitar-impresion.js # Formulario + PDF
├── data/
│   ├── index.json         # Lista maestra de modelos
│   └── models/*.json      # Archivos individuales de modelos
├── models/                # Archivos STL
│   └── {model-id}/       # Carpeta por modelo
├── images/                # Miniaturas + galería
│   ├── logo/             # Logos institucionales
│   └── models/           # Imágenes de modelos
│       └── {model-id}/   # thumb.jpg + gallery-*.jpg
└── admin/                 # Panel de administración
    ├── index.html         # Interfaz del panel admin
    ├── admin.css          # Estilos del panel
    ├── admin.js           # Lógica del panel
    └── api/               # Backend PHP
        ├── auth-config.php    # Configuración de autenticación
        ├── check-auth.php     # Verificación de sesión
        ├── config.php         # Configuración global
        ├── delete-model.php   # Eliminar modelos
        ├── login.php          # Endpoint de login
        ├── logout.php         # Endpoint de logout
        └── upload-model.php   # Subida de modelos
```

---

## 🛠️ CORE SYSTEMS

### Sistema de Catálogo
- Búsqueda en tiempo real
- Multi-filtro (categoría, tipo, origen)
- Toggle vista cuadrícula/lista
- Opciones de ordenamiento
- Categorías: Cerámica, Lítico, Estructuras, Restos Óseos, Textil, Metálico

### Visor 3D
- Three.js r84 con STLLoader
- Soporte multi-archivo STL
- OrbitControls con amortiguación
- Auto-centrado y escalado
- Controles táctiles para móviles

### Panel de Administración
- Autenticación segura con PHP Sessions
- Tres modos: Nuevo / Editar / Duplicar
- Gestión de múltiples archivos STL
- Auto-guardado en localStorage
- Validación en tiempo real
- Preview de JSON generado
- Sistema de subida de archivos con PHP backend

### Sistema de Solicitud de Impresión
- Campos mínimos requeridos
- Generación de PDF (jsPDF)
- Logos desde servidor
- Integración con mailto
- Detalles técnicos opcionales

---

## 📊 TIPOS DE MODELOS

### Categorías Principales
1. **Cerámica** - Vasijas, fragmentos, alfarería decorada
2. **Lítico** - Puntas de proyectil, lascas, núcleos, manos de moler
3. **Estructuras** - Fogones, recintos, contextos arquitectónicos
4. **Restos Óseos** - Fauna, restos humanos
5. **Textil** - Fragmentos de tejidos, cestería
6. **Metálico** - Objetos de cobre, bronce u otros metales

### Tipos de Modelos
- 🏺 **Completo** - Artefacto íntegro
- 🧩 **Fragmento** - Pieza parcial
- 🔧 **Reconstrucción** - Restauración digital

### Origen de Modelos
- 🌍 **Externo** - De repositorios como Zenodo, Open Context, tDAR
- ✏️ **Modificado** - Adaptado de fuentes externas
- ⭐ **Digitalizado por MonteVer3D** - Creación original

---

## 🔧 USAGE

### Agregar Nuevo Modelo
1. Acceder a `admin/index.html`
2. Iniciar sesión (contraseña: montever3d2025)
3. Llenar formulario con detalles del modelo
4. Agregar archivos STL (validación automática de rutas)
5. Agregar imágenes (thumbnail + galería opcional)
6. Guardar → Los archivos se suben al servidor
7. El sistema actualiza automáticamente:
   - Crea `{id}.json` en `data/models/`
   - Actualiza `index.json` en `data/`
   - Sube archivos STL a `models/{id}/`
   - Sube imágenes a `images/models/{id}/`

### Editar Modelo Existente
1. Acceder al panel admin
2. Hacer clic en "Editar" en el modelo deseado
3. Modificar campos necesarios
4. Mantener archivos existentes o agregar nuevos
5. Guardar cambios → Actualización en el servidor

### Solicitar Impresión
1. Navegar a la página de detalle del modelo
2. Hacer clic en "Solicitar Impresión"
3. Llenar campos mínimos (nombre, email, modelo, cantidad)
4. Generar PDF (descarga automática)
5. Enviar email con PDF adjunto

---

## 📚 DOCUMENTATION

### Estructura de Datos

**index.json**
```json
{
  "lastUpdated": "2026-01-21",
  "models": ["model-id-1", "model-id-2", ...]
}
```

**models/{id}.json**
```json
{
  "id": "vasija-pitren",
  "title": "Vasija Cultura Pitrén",
  "category": "ceramica",
  "description": "Cerámica completa del período Alfarero Temprano...",
  "3dFiles": [
    {
      "name": "Modelo Principal",
      "path": "models/vasija-pitren/vasija-pitren.stl"
    }
  ],
  "images": {
    "thumbnail": "images/models/vasija-pitren/thumb.jpg",
    "gallery": [...]
  },
  "metadata": {
    "type": "completo",
    "origin": "original",
    "source": "Monte Verde",
    "period": "800-1300 d.C.",
    "tags": ["Alfarero Temprano", "Decoración Incisa"]
  },
  "attribution": {
    "creator": "MonteVer3D - UACh",
    "license": "CC BY 4.0",
    ...
  }
}
```

---

## 🎨 TECHNOLOGY STACK

**Frontend:**
- HTML5 + CSS3 (Custom properties, Grid, Flexbox)
- Vanilla JavaScript (ES6+)
- Three.js r84 (Renderizado 3D)
- jsPDF (Generación de PDF)

**Backend:**
- PHP 7.4+ (Autenticación, gestión de archivos)
- Sessions nativas de PHP
- File system para almacenamiento

**Data:**
- Archivos JSON (sin base de datos)
- Hosting de archivos estáticos

**Desarrollo:**
- VS Code + Live Server
- Control de versiones Git

---

## 🔐 SEGURIDAD

### Sistema de Autenticación
- PHP Sessions con regeneración de ID
- Password hashing con `password_hash()`
- Timeout de sesión configurable (8 horas default)
- Verificación en cada endpoint del API

### Cambiar Contraseña
Editar `admin/api/auth-config.php`:
```php
define('ADMIN_PASSWORD_HASH', password_hash('tu-nueva-contraseña', PASSWORD_DEFAULT));
```

---

## 🛡️ KNOWN ISSUES

- Cache de JavaScript del navegador requiere hard refresh (Ctrl+Shift+R)
- Archivos STL grandes (>10MB) pueden tardar 2-3 segundos en cargar
- Email requiere adjuntar manualmente el PDF generado
- Tildes y caracteres especiales ya corregidos con UTF-8

---

## 👥 TEAM

**Desarrollador:** Fernanda López Moncada  
**Organización:** TecMedHub - Universidad Austral de Chile  
**Ubicación:** Puerto Montt, Chile  
**Contacto:** fernanda.lopez@uach.cl  
**Web:** https://tmeduca.org/

---

## 📜 LICENSE

Uso Educativo - Universidad Austral de Chile  
Modelos bajo licencias Creative Commons (según atribución individual)

---

## 🗺️ ROADMAP

- [x] Sistema de catálogo con filtros
- [x] Visor 3D interactivo
- [x] Panel de administración completo
- [x] Sistema de solicitud de impresión
- [x] Autenticación y seguridad
- [ ] Crecimiento de base de datos (meta: 50+ modelos)
- [ ] Sistema de retroalimentación de usuarios
- [ ] Integración con repositorios externos
- [ ] Análisis y estadísticas de uso

---

## 🌟 ABOUT THE PROJECT

MonteVer3D surge como una iniciativa de conservación digital del patrimonio arqueológico de la región de Los Lagos y Chile. Mediante tecnologías de fotogrametría y modelado 3D, buscamos preservar artefactos y estructuras arqueológicas para las futuras generaciones, democratizando el acceso al patrimonio cultural y facilitando la investigación científica sin necesidad de manipular materiales frágiles u originales.

El proyecto se enfoca en:
- 🏛️ Preservación digital permanente
- 📚 Educación y difusión patrimonial
- 🔬 Apoyo a la investigación arqueológica
- 🌍 Acceso universal al patrimonio
- 🤝 Colaboración interinstitucional

---

**Última Actualización:** 2026-01-21  
**Versión:** 1.0  
**Estado:** Desarrollo Activo
