# VIDERE — Product Requirements Document

## Descripción del Producto
VIDERE es un sistema de fusión de datos y ontología para PyMEs. El nombre viene del latín *vidēre* (ver, comprender). El sitio web es una landing page premium con una demo interactiva del motor de datos en el navegador.

## Problema que Resuelve
Las PyMEs tienen datos dispersos en CRMs, planillas, webs y sistemas de pedidos. VIDERE los conecta en una sola visión del negocio para tomar decisiones con fundamento.

## Stack Técnico
- **Frontend**: React (SPA), Tailwind CSS, Framer Motion (solo para tabs/transitions internas de la demo), Lenis (smooth scroll)
- **Backend**: FastAPI (Python)
- **Base de datos**: MongoDB
- **Font**: Quicksand (única tipografía)
- **Estética**: Dark Palantir-inspired, temática clásica latina/romana

## Estructura de la Página

### 1. Navegación (Navigation.jsx)
- Logo VIDERE con marca SVG
- 3 links: Cómo funciona, Demo, Confianza
- CTA: "Ver demo" (borde dorado)
- Menú hamburguesa en mobile
- **SIN "Solicitar acceso"**

### 2. Hero (Hero.jsx)
- Título: "Menos ruido. Más claridad." (acento dorado)
- Subtítulo descriptivo
- CTA: "Explorar la demo"
- Nota latina: "Del latín vidēre — ver, comprender"
- Imagen de estatua romana clásica (Unsplash)
- **SIN eyebrows, SIN labels pequeñas**

### 3. Cómo Funciona (HowItWorks.jsx)
- Título: "No te faltan datos. Te falta conectarlos."
- 3 tarjetas oscuras con íconos dorados
- **SIN chapter labels (01/, 02/, etc.)**

### 4. Demo Interactiva (Demo.jsx + DemoSources/DemoConnect/DemoQuestions)
- Workspace card clara dentro de la página oscura
- 3 pasos: Conectar → Entender → Preguntar
- Datos MOCKEADOS en el frontend (intencional)
- Decisión de merge se guarda en localStorage
- 4 preguntas de negocio con respuestas calculadas
- **SIN chapter labels, SIN "Solicitar acceso" CTA**

### 5. Confianza (Trust.jsx)
- Foto de columnas geométricas de hormigón (grayscale, Unsplash)
- 3 principios de confianza con íconos dorados
- **SIN "OTRA PERSPECTIVA", SIN labels pequeñas**

### 6. FAQ (Closing.jsx → FAQ)
- 4 preguntas frecuentes en accordion
- Layout 2 columnas (título sticky + accordion)

### 7. Footer (Closing.jsx → Footer)
- Logo, definición latina, links
- Gran "videre" wordmark watermark
- Copyright y "Volver arriba"
- **SIN "Solicitar acceso"**

## API Endpoints
- `POST /api/access-requests` — Guarda solicitudes de acceso en MongoDB (endpoint activo aunque la UI fue removida)

## Schema de Base de Datos
```
access_requests: {
  name: string,
  email: string,
  role: string,
  intent: string,
  status: string,
  created_at: datetime
}
```

## Decisiones de Diseño
- **Color palette**: #08090C (fondo), #0F1117 (surface), #C5A059 (acento dorado), #E8E4DD (texto)
- **Tipografía**: Solo Quicksand (pesos 300-700)
- **Sin animaciones de scroll** — todo visible de entrada
- **Sin labels marketing** — sin eyebrows, chapter numbers, tags pequeñas
- **Sin carrusel/marquee**
- **Demo workspace queda clara** dentro de la página oscura (contraste intencional)

## Estado Actual
- ✅ Landing page completa con estética Palantir oscura
- ✅ Demo interactiva funcionando (mocked frontend)
- ✅ Backend API para leads activo
- ✅ Responsive (desktop + tablet + mobile)
- ✅ Testing: 19/19 tests passed (iteration 2)

## Archivos Clave
- `/app/frontend/src/App.js` — Estructura principal
- `/app/frontend/src/App.css` — Estilos completos
- `/app/frontend/src/index.css` — Variables globales + Quicksand import
- `/app/frontend/src/components/` — Todos los componentes
- `/app/frontend/src/data/demo.js` — Datos mockeados para la demo
- `/app/backend/server.py` — FastAPI con endpoint de access requests
