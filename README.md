# QuickQuote Agent Demo

QuickQuote Agent Demo is a public monorepo demo of a small SaaS-style quoting system with a lightweight client-side AI agent. The app lets users manage customers, create quotes, and run Spanish natural-language commands that are interpreted in-browser using Transformers.js.

## Features

- Monorepo with npm workspaces (`apps/web`, `apps/server`)
- Frontend with Vite + React + TailwindCSS + React Router
- Backend with Express + SQLite persistence
- REST API under `/api`
- MCP-style tools endpoint under `/mcp`
- Shared business logic for API and MCP routes
- Zod validation for REST and MCP payloads
- SQLite auto-init and first-run seed data (2 customers, 1 quote)
- Agent Demo UI with:
  - Intent detection
  - Entity extraction JSON
  - Final tool payload preview
  - Step trace + server response
- Local AI only with `@xenova/transformers` (no API keys, no external AI service)

## Architecture

- `apps/server`: single Express service exposing both `/api` and `/mcp`
- `apps/web`: React SPA deployed separately or run in local dev
- Persistence: `apps/server/data/quickquote.db`

## Monorepo layout

```text
/
  package.json
  README.md
  .gitignore
  apps/
    server/
    web/
```

## Local development

Requirements:

- Node.js 20+
- npm 10+

Run:

```bash
npm install
npm run dev
```

- Web runs at `http://localhost:5173`
- Server runs at `http://localhost:8787`

## Environment variables

### Web (`apps/web`)

- `VITE_API_URL` (default `http://localhost:8787`)

### Server (`apps/server`)

- `PORT` (default `8787`)

## Deployment

### Render (server)

- Root directory: `apps/server`
- Build command: `npm install && npm run build`
- Start command: `npm run start`
- Ensure persistent disk if you want SQLite data to survive redeploys.

### Vercel or GitHub Pages (web)

- Root directory: `apps/web`
- Build command: `npm install && npm run build`
- Output directory: `dist`
- Configure `VITE_API_URL` to your deployed server URL.

## Transformers.js notes (WebGPU and WASM)

- The agent uses `@xenova/transformers` in the browser.
- If WebGPU is available, execution can be faster.
- If WebGPU is not available, it falls back to WASM. This is slower but still functional.
- The app always stays fully client-side for AI logic.

## API and MCP

REST endpoints:

- `GET /api/customers`
- `POST /api/customers`
- `PUT /api/customers/:id`
- `GET /api/quotes`
- `POST /api/quotes`
- `GET /api/quotes/:id`

MCP endpoint:

- `POST /mcp`

JSON-RPC MCP methods supported:

- `initialize`
- `tools/list`
- `tools/call`

Example `tools/call` payload:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "create_customer",
    "arguments": {}
  }
}
```

Legacy payload (`{ tool, input }`) is still accepted for backward compatibility.

Supported tools:

- `create_customer`
- `list_customers`
- `create_quote`
- `list_quotes`
- `get_quote`

All MCP responses follow:

```json
{ "ok": true, "result": {} }
```

or

```json
{ "ok": false, "error": { "message": "...", "details": {} } }
```

## Screenshot placeholders

- Dashboard screenshot: TODO
- Agent trace screenshot: TODO
- Quotes detail screenshot: TODO

## AI improvement roadmap

- See `AI_UPGRADE_PLAN.md` for a prioritized plan to significantly improve quote-generation AI quality with zero API-token costs.
