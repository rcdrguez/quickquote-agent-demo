# Plan Maestro para Mejorar la IA de Cotizaciones (sin costos de APIs)

## Objetivo

Convertir el asistente actual en una experiencia que los usuarios perciban como una IA realmente robusta, confiable y útil para ventas/cotizaciones, manteniendo una base **sin costo por token** y con ejecución en la web siempre que sea posible.

---

## 1) Diagnóstico del estado actual

El proyecto ya tiene una base muy buena:

- Interpretación de intención en cliente con `@xenova/transformers` + heurísticas.
- Extracción de entidades con reglas y parsing tolerante (moneda, precios, cantidades).
- Ejecución real de herramientas vía `/mcp` (`tools/call`) y persistencia en SQLite.
- UI de trazas, sugerencias y voz.

### Limitaciones que impiden que “se sienta premium”

1. **Cobertura limitada de intenciones**
   - Solo 4 intenciones principales (`CREATE_CUSTOMER`, `CREATE_QUOTE`, `LIST_CUSTOMERS`, `LIST_QUOTES`).
   - Faltan tareas naturales para usuarios reales: editar cotización, duplicar, convertir moneda, negociar descuento, generar resumen ejecutivo, etc.

2. **Extracción basada mayormente en regex**
   - Funciona en frases “simples”, pero cae en instrucciones ambiguas/multi-paso.
   - Falta confirmación estructurada previa cuando hay incertidumbre.

3. **No hay memoria conversacional del negocio**
   - El sistema no usa historial para “aprender” estilo del vendedor, términos frecuentes o preferencias por cliente.

4. **Falta de scoring de confianza + UX de desambiguación**
   - No hay umbral explícito de confianza por intención o entidad para preguntar antes de ejecutar.

5. **Poca instrumentación de calidad del agente**
   - No existe tablero de precisión por intención, tasa de corrección humana ni métricas de éxito por flujo.

---

## 2) Arquitectura objetivo (sin costo de APIs)

### Capa A — NLU híbrida de alta precisión en frontend

Mantener enfoque local/browser, pero pasar a una arquitectura por etapas:

1. **Clasificador de intención principal (embeddings / zero-shot local)**
2. **Extractor estructurado con validaciones semánticas**
3. **Reglas de negocio como “guardrails”**
4. **Motor de confirmación si confianza < umbral**

> Resultado: menos errores silenciosos y más sensación de “IA que entiende”.

### Capa B — Orquestador de herramientas con planificación

Agregar “planner” ligero:

- Entrada del usuario → plan de 1..N pasos
- Cada paso mapea a una herramienta concreta
- Verificación post-ejecución (ej. cotización creada con total > 0)

Esto hace posible prompts del tipo: _“Crea cotización para ACME y luego envíame un resumen de lo pendiente por cobrar”_.

### Capa C — Memoria útil y controlada

- Memoria de sesión (chat actual).
- Memoria corta por usuario (últimos clientes usados, moneda preferida).
- Memoria de negocio (catálogo de servicios frecuentes, descripciones típicas, descuentos históricos).

Sin API externa: persistir en SQLite y usar embeddings locales para recuperación semántica.

---

## 3) Herramientas recomendadas (web + sin costo)

## Imprescindibles

1. **Transformers.js** (ya usado)
   - Mantener para clasificación/embeddings en navegador.

2. **ONNX Runtime Web**
   - Para ejecutar modelos ONNX optimizados en WASM/WebGPU y reducir latencia.

3. **Fuse.js**
   - Búsqueda difusa local para nombres de clientes y servicios (evita fallos por typos).

4. **Zod** (ya usado)
   - Elevar validaciones semánticas del payload antes de invocar tools.

## Muy recomendables

5. **DuckDB-WASM**
   - Analítica local en frontend (reportes rápidos de cotizaciones sin backend pesado).

6. **Comlink + Web Workers**
   - Mover inferencia y parsing a worker para evitar congelamiento de UI.

7. **WebLLM (opcional por dispositivo)**
   - Si hardware lo permite, habilitar modo “Pro IA local” para respuestas generativas más naturales.
   - Debe ser modo opcional con fallback al pipeline actual.

## Backend (sin costo)

8. **Temporal / BullMQ (opcional)**
   - Para tareas asíncronas gratuitas/autogestionadas (ej. enviar PDFs, colas de procesamiento).

9. **Meilisearch o SQLite FTS5**
   - Búsqueda semántica/simple por texto de cotizaciones y clientes.

---

## 4) Nuevas herramientas MCP que elevarán mucho la experiencia

Implementar estas tools en `/mcp`:

1. `draft_quote_from_prompt`
   - Genera borrador estructurado con campos faltantes detectados.
2. `validate_quote_draft`
   - Devuelve lista de errores y advertencias (precio cero, qty inválida, moneda faltante).
3. `suggest_quote_items`
   - Sugiere ítems frecuentes por cliente/sector con precios históricos.
4. `apply_discount_policy`
   - Aplica reglas de descuento seguras por rango.
5. `revise_quote`
   - Permite “edita la cotización #X: sube diseño 10% y agrega hosting”.
6. `convert_currency`
   - Conversión básica con tabla local/manual configurable (sin API).
7. `explain_quote`
   - Resume en lenguaje comercial para enviar al cliente.
8. `quote_risk_check`
   - Señala riesgos: margen bajo, impuestos inconsistentes, ítems ambiguos.

---

## 5) UX para que “se sienta IA real”

1. **Modo Confirmación Inteligente**
   - Antes de ejecutar, mostrar: “Entendí X, Y, Z. ¿Confirmas?” cuando confianza sea baja.

2. **Streaming de razonamiento visible (seguro)**
   - Mostrar pasos: intención, entidades, validaciones, tool ejecutada, resultado.

3. **Autocompletado semántico proactivo**
   - Sugerir comandos según contexto real (si está en detalle de cliente, sugerir crear cotización para ese cliente).

4. **Correcciones guiadas 1-click**
   - Si falta dato, presentar chips: “Agregar cantidad”, “usar moneda DOP”, “asignar cliente encontrado similar”.

5. **Plantillas inteligentes por industria**
   - Marketing, software, construcción, legal, etc. con ítems y textos predeterminados.

---

## 6) Métricas para mejorar de forma continua

Agregar telemetría (anónima por evento) y medir:

- Precisión de intención (%).
- Tasa de payload válido en primer intento.
- % de ejecuciones con confirmación/rechazo del usuario.
- Tiempo total desde prompt hasta cotización creada.
- Tasa de edición posterior (indicador de mala interpretación inicial).

Con esto puedes iterar semanalmente y demostrar mejora real.

---

## 7) Roadmap recomendado (30/60/90 días)

## Día 0-30 (impacto rápido)

- Agregar `confidence_score` en `detectIntent` y en extracción.
- Implementar confirmación condicional cuando confianza sea baja.
- Introducir matching difuso de clientes (Fuse.js).
- Crear tools: `draft_quote_from_prompt`, `validate_quote_draft`.
- Añadir dashboard básico de métricas de agente.

## Día 31-60 (escala funcional)

- Implementar memoria corta por usuario y sugerencias por historial.
- Incorporar `revise_quote`, `suggest_quote_items`, `explain_quote`.
- Ejecutar inferencia en Web Worker (Comlink) para mejor UX.
- Añadir pruebas automáticas de prompts críticos (suite de regresión).

## Día 61-90 (experiencia premium)

- Planner multi-paso para instrucciones compuestas.
- Motor de políticas comerciales (descuentos/margen/riesgo).
- Modo opcional WebLLM para redacción avanzada sin API externa.
- A/B testing de prompts y mensajes de confirmación.

---

## 8) Prioridad técnica exacta para este repositorio

1. **Subir precisión sin romper simplicidad**
   - Extender `intent.ts` para devolver `score`, `reasons`, `alternatives`.

2. **Introducir validación previa al `callMcp`**
   - En `AgentDemoView`, bloquear ejecución con checklist claro cuando falten datos críticos.

3. **Crear capa de “quote draft”**
   - Nuevo paso entre `buildAgentResult` y `api.callMcp` para revisar y confirmar estructura.

4. **Expandir herramientas MCP de edición y explicación**
   - En backend, añadir servicios para actualizar cotizaciones y generar textos de propuesta.

5. **Instrumentación de calidad**
   - Loggear intent detectado vs acción final confirmada para medir precisión real.

---

## 9) Qué comunicar a tus usuarios (copy recomendado)

Para reforzar la percepción de valor real:

- “La IA entiende instrucciones en español y valida automáticamente antes de crear la cotización.”
- “Funciona sin depender de APIs pagas de IA para tareas críticas.”
- “Aprende tus patrones de cotización y acelera cada operación.”
- “Siempre tienes control: confirma o corrige antes de guardar.”

---

## 10) Resultado esperado al aplicar este plan

Si ejecutas este roadmap, vas a conseguir:

- Menos errores de interpretación.
- Más velocidad de creación de cotizaciones.
- Mayor confianza del usuario final (“sí, esta IA sí sirve”).
- Diferenciación real frente a formularios tradicionales disfrazados de IA.

