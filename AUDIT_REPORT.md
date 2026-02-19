# Auditoría Técnica: IA ligera en navegador + MCP + flujo agente→tools→backend

Fecha: 2026-02-19

## Alcance evaluado

Se auditó el código y se hicieron pruebas locales para validar tres afirmaciones:

1. IA ultra ligera ejecutándose en el navegador, sin APIs externas de IA ni llaves.
2. Uso real de MCP para invocación de herramientas.
3. Flujo auténtico agente → tools → backend (sin mock).

## Veredicto ejecutivo

- **(1) IA en navegador:** **Parcialmente cumplido**. La inferencia de embeddings sí se ejecuta en cliente con `@xenova/transformers`, pero hay un camino heurístico que evita IA en muchos casos y la carga de modelo depende de descarga de assets del modelo (sin llaves, pero no necesariamente 100% offline).
- **(2) MCP real:** **No cumplido (estricto)**. Hay un endpoint HTTP `/mcp` con `tool`+`input`, pero no implementa el protocolo MCP estándar (JSON-RPC, inicialización, negociación, `tools/list`, `tools/call`, etc.).
- **(3) Flujo agente→tools→backend auténtico:** **Sí, cumplido**. El front construye intent/tool/payload, llama `/mcp`, el backend ejecuta servicios reales y persiste en SQLite.

---

## Hallazgos por criterio

### 1) IA ultra ligera en navegador (sin APIs externas de IA, sin llaves)

✅ Evidencia a favor:

- El cliente usa `@xenova/transformers` y `pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')` directamente en frontend. Esto es inferencia local en browser (WebGPU/WASM).  
- No se observan SDKs de OpenAI/Anthropic ni variables de API key para IA.  

⚠️ Matices importantes:

- `detectIntent` aplica reglas regex primero y sólo si no matchean intenta embeddings. Por eso no toda entrada “pasa por IA”; parte del flujo es heurístico clásico.
- El modelo puede descargarse desde origen remoto en runtime (normal en Transformers.js). Esto no usa llaves, pero no es equivalente a “offline estricto”.

### 2) Uso real de MCP para tools

✅ Evidencia a favor (limitada):

- Existe endpoint dedicado `/mcp` que recibe una tool y su input.
- Hay validación de payload por tool y ejecución real de handlers.

❌ Razón de incumplimiento estricto MCP:

- No es servidor MCP estándar; es un contrato HTTP propio con body `{ tool, input }`.
- Una llamada JSON-RPC tipo `tools/list` devuelve 400 por esquema incompatible (espera campo `tool`).

Conclusión: **“MCP-style”, no MCP protocol-compliant**.

### 3) Flujo agente → tools → backend auténtico

✅ Evidencia fuerte:

- Frontend:
  - Interpreta intención y extrae entidades.
  - Mapea intent a `tool` y `payload`.
  - Ejecuta `api.callMcp(result.tool, result.payload)`.
- Backend:
  - Recibe `/mcp`, valida por Zod y enruta a servicios reales (`customers`, `quotes`).
  - Los servicios escriben/leen SQLite (`run/get/all`) y retornan entidades persistidas.

✅ Validación empírica ejecutada:

- `POST /mcp` con `create_customer` creó un cliente real y luego apareció en `list_customers`.

---

## Recomendaciones concretas

1. **Si quieres reclamar MCP real**, migra `/mcp` a MCP spec (JSON-RPC, lifecycle, `tools/list`, `tools/call`, capacidades y errores MCP).
2. **Si quieres “IA siempre activa”**, mueve heurísticas a fallback final y fuerza paso por embeddings/mini-classifier primero.
3. **Si quieres “sin internet” real**, empaqueta modelo localmente (assets estáticos versionados) y configura Transformers.js para resolver desde bundle local.
4. **Operatividad dev:** revisar path de SQLite cuando se arranca `npm run dev -w apps/server` (usa `process.cwd()` y puede apuntar a ruta inválida dependiendo del cwd).

## Dictamen final

- **Afirmación 1:** “IA ultra ligera en navegador” → **Sí, pero con reservas**.
- **Afirmación 2:** “Uso real de MCP” → **No, actualmente es un wrapper propio tipo MCP**.
- **Afirmación 3:** “agente→tools→backend auténtico” → **Sí, implementado y comprobable**.
