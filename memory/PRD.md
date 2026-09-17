# VIDERE — Documento de producto

## Solicitud original
«Crea una página de aterrizaje: Necesito que hagas una página web. Busca mucha información de las páginas de Anthropic y Palantir y que saques los estilos tipográficos. Tiene que ser una página simple, pero que esté muy bien, que se entienda y que cuando uno entra le parezca demasiado perfecto. Usá ángulos perfectos como los de Apple. El header tiene que ser como pastillas. Si hay un panel para elegir qué querés hacer ahora mismo, que sea como con una animación, como que se va moviendo. Todo tiene que ser tranquilo, suave. No pongas animación por poner animación: para que el usuario entienda más las cosas. No pongas muchos colores.»

### El proyecto descrito por el usuario
Un sistema que toma los datos sueltos y desprolijos de una pyme (CRM, web, pedidos, columnas con nombres distintos) y los convierte en un modelo único y confiable consultable en lenguaje natural. Arquitectura de ontología + pipeline + razonamiento IA + gobernanza, utilizando la propia clave API del negocio y sin implementaciones largas y caras.

Dos piezas mencionadas, **no suministradas**:
1. `ontologia-agente.html`: demo visual para dueños de negocios, sin jerga, con tres tablas de ejemplo. Detecta posibles personas repetidas por superposición de valores, pregunta dudas en lenguaje cotidiano y crea un modelo con cuatro preguntas de negocio prearmadas. Navegador y heurísticas, no el motor real.
2. `agente_ontologia.py`: motor descrito con pandas, perfilado de CSV, detección de superposiciones y consultas a Claude en ambigüedades, memoria de decisiones (`memoria_decisiones.json`), modelo (`ontologia.json`), versiones (`historial_versiones.json`), advertencias de consistencia, gobernanza por roles y campos (`permisos.json`, `registro_accesos.json`) aplicada antes del razonamiento, preguntas naturales convertidas a cálculos pandas.
Flujo original del motor: `python agente_ontologia.py clientes_crm.csv usuarios_web.csv pedidos.csv`; perfilar, detectar email/correo en común, reutilizar decisión previa o consultar Claude/humano, fusionar y revisar contradicciones, guardar versión, pedir rol y responder preguntas con datos permitidos.

### Decisiones explícitas del usuario
- Nombre: **VIDERE**.
- Acción principal: **ambas, explorar una demo y pedir acceso**.
- No dispone de los archivos: **crear landing y demo visual a partir de la descripción**.
- Insistencia en investigar **Anthropic y Palantir**.
- Calidad editorial / Awwwards: dirección única, hero con revelado enmascarado por líneas, fotografía tratada deliberadamente, capítulos numerados, un marquee lento, Framer Motion, Lenis y un momento sutil 3D/parallax. Movimiento con propósito, no distracciones.

## Alcance implementado
Landing completa en español rioplatense, demo determinista local y captación real de solicitudes. No se implementó el motor Python original, conexión a Claude, autenticación, carga de archivos, envío de emails ni integración con CRMs. La interfaz explica claramente que la demo usa datos ficticios, sin IA ni archivos personales.

## Investigación y dirección visual
- Se consultaron `https://www.anthropic.com` y `https://www.palantir.com` con extracción completa, más investigación sobre tipografía de Anthropic.
- Anthropic: calidez editorial, contraste serif/sans, claridad del lenguaje, papel cálido.
- Palantir: precisión, capítulos numerados, diagramas de sistemas y trazabilidad.
- Sistema propio: papel `#f5f4ed`, tinta `#282c25`, oliva suave; Instrument Serif (display), DM Sans (interfaz), IBM Plex Mono (etiquetas). No se usan fuentes propietarias de las referencias.
- Marca SVG original; toro proyectado de 70 curvas en el hero, leve inclinación siguiendo el cursor; etiquetas CRM/web/pedidos conectadas.
- Hero con revelado de líneas; navegación en pastillas con indicador deslizante; capítulos con reveal al entrar en pantalla; marquee lento con pausa; respeto a `prefers-reduced-motion`.
- Fotografía arquitectónica Unsplash de referencia editorial, tratada en monocromo y con sobreimpresión segura.

## Arquitectura
- React 19 / CRA + CRACO, estilos propios y Shadcn UI (Button, Dialog, Input, Accordion).
- Framer Motion 11 y Lenis 1.3.26. Lucide para iconos y Sonner para notificaciones.
- FastAPI con Motor y MongoDB. Configuración desde archivos `.env` existentes, sin alterar variables protegidas.
- URL frontend/API: `REACT_APP_BACKEND_URL` existente. Rutas backend bajo `/api`.
- Componentes en `frontend/src/components`: Brand, Navigation, Hero, LensVisual, HowItWorks, Demo, DemoSources, DemoConnect, DemoQuestions, Trust, Closing, AccessModal.
- Datos y cálculos: `frontend/src/data/demo.js`.
- Estilos y responsive: `frontend/src/App.css`, `index.css`.

## Experiencias disponibles
1. Hero «Menos ruido. Más claridad.» con CTA demo/acceso.
2. Capítulo 01: conexión de herramientas, coincidencias y preguntas.
3. Capítulo 02: demo interactiva en tres pasos, tablas expandibles.
4. Capítulo 03: confianza, procedencia de respuestas y principios del motor propuesto.
5. Marquee editorial pausable; capítulo 04 preguntas frecuentes.
6. Cierre editorial, marca grande, privacidad y volver arriba.
7. Modal de acceso con validación, consentimiento explícito, estados de envío/error/éxito y guardado real.
8. Menú móvil; navegación por anclas; foco atrapado en modal; Escape/cierre; saltar al contenido; metadata y favicon propios.

## Demo: funcionamiento y resultados
- CRM: 5 registros. Web: 5. Pedidos: 6. Total 16 registros.
- Coincidencias por valores: 4 de 5 correos web también en CRM, 80%.
- Tres coincidencias de persona claras. Una ambigua: Pedro Ruiz / Pedro Rodríguez con mismo correo.
- El usuario decide unir o separar; se guarda `videre-demo-decision-v1` en localStorage (manejo seguro si storage está deshabilitado). Reiniciar elimina memoria y etapas.
- Unir: 6 clientes únicos, 6 pedidos conectados. No unir: 7 clientes, 5 pedidos conectados, 1 por revisar. Estado «Modelo por revisar» y advertencia explícita. Ambos Pedros se excluyen del análisis de inactividad por ambigüedad.
- Cuatro respuestas calculadas:
  - Clientes únicos: 6 unidos, 7 separados.
  - Sin compras en 60 días al 1/6/2026: Lucas, Pedro, Lucía (3) con unión; Lucas y Lucía (2) sin unión.
  - Ventas mayo 2026: ARS 191.000, cuatro pedidos. Incluye el total de pedidos sin doble conteo por personas.
  - Mejor cliente: Ana García, ARS 73.000.
- Cada respuesta tiene método, fuentes y registros expandibles.
- Preguntas prearmadas, no chat libre ni inferencia LLM. Fecha y moneda de ejemplo indicadas.

## API y persistencia
`GET /api/` → `{name: 'VIDERE', status: 'ok'}`.

`POST /api/access-requests` → HTTP 201, confirmación tipada.
- Entrada: name (2–100), email válido, company (2–150), company_size (1–10, 11–50, 51–200, Más de 200), consent true.
- Valida espacios en blanco; normaliza email a minúsculas; rechaza campos extra.
- Colección `access_requests`: UUID, nombre, email, negocio, tamaño, consentimiento, fecha UTC ISO.
- Índice único por email y upsert `$setOnInsert`: duplicados idempotentes. No revela si el email estaba registrado.
- No hay endpoint público para leer solicitudes. No se exponen datos ni ObjectIds.
- Error de persistencia: HTTP 503 con mensaje seguro. Frontend trata errores de red y validación.

## Verificación completada
- Informe del agente: `/app/test_reports/iteration_1.json`.
- Backend: 7/7 pruebas pasadas. Archivo `/app/backend/tests/test_access_requests.py`, JUnit `/app/test_reports/pytest/pytest_results.xml`.
- E2E: navegación, ambas ramas demo, preguntas, fuentes, memoria y reinicio, formulario/persistencia/idempotencia, privacidad, FAQ, pausa, responsive en 320/390/768/1440/1920, foco/modal/movimiento reducido. Sin desbordamiento horizontal de página.
- Único error detectado: conteo estático de pedidos conectados en rama sin unión. **Corregido**: ahora derivado del modelo. También eliminado solapamiento temporal de identificadores de respuesta durante transiciones.
- Autoverificación posterior: rama sin unión 7/5/1, inactividad 2, una sola respuesta en DOM durante cambio; rama con unión 6/6; formulario abre. Todo aprobado.
- `yarn build` final compiló correctamente (JS gzip ~177 KB, CSS ~17 KB).
- Datos de QA: una solicitud sintética `qa.videre@example.com` existe en MongoDB. No es usuario ni cuenta; no hay credenciales de autenticación.

## Backlog priorizado
### P0
- Ningún fallo abierto en el alcance entregado.

### P1 — Siguientes funcionalidades opcionales
- Recibir el motor original para integrar procesamiento real. Acordar proveedor/modelo y credenciales antes de cualquier conexión IA.
- Si se añaden archivos reales: almacenamiento de objetos persistente obligatorio, límites de carga, validación, autorización y sandbox seguro para cálculos; no ejecutar libremente código de LLM.
- Panel privado para gestionar solicitudes y seguimiento. Requiere diseñar autenticación usando el playbook de integración antes de escribir código de auth.
- Avisos al equipo y confirmación por email, con proveedor real y credenciales correspondientes. Actualmente no se envían correos automáticos.

### P2 — Mejoras de conversión
- Casos de uso por rubro (tienda online, distribuidora, servicios) que adapten la demo.
- Enlace compartible a una pregunta/respuesta de ejemplo.
- Instrumentación propia de conversiones y política de privacidad definitiva con contacto del responsable.

## Próxima tarea recomendada
Revisar la propuesta visual con el usuario; añadir casos de uso por rubro o conectar el motor real cuando estén disponibles los archivos y requisitos de integración.