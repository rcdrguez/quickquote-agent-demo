# quickquote-agent-demo

Local AI. Real Persistence. Zero API Keys.

QuickQuote Agent Demo is a full-stack SaaS-style application that demonstrates how to build a lightweight AI agent running entirely in the browser using Transformers.js, without relying on OpenAI, Gemini, or any external AI services.

This project combines:

- A modern React + Tailwind dashboard UI
- A Node.js + Express backend
- SQLite persistent storage
- MCP-style tool invocation over HTTP
- A client-side Local AI agent for intent detection and entity extraction
- No API keys
- No external AI providers

---

## Project Goal

To demonstrate that you can build a:

- Functional AI-driven agent
- Persistent full-stack SaaS-style system
- Clean developer architecture
- Without calling OpenAI, Gemini, or any paid API

Everything runs locally or on simple hosting like Render and Vercel.

---

## What This Demo Shows

- Local AI intent classification in Spanish
- Slot filling (entity extraction)
- Deterministic fallback parsing
- MCP-style structured tool calls
- RESTful backend
- SQLite persistence
- Modern dashboard UI
- Clean TypeScript codebase

---

## Architecture

Monorepo structure:

/
apps
/web        → Frontend (React + Vite + Tailwind)
/server     → Backend (Express + SQLite + MCP tools)
package.json
README.md

---

## Frontend (apps/web)

Stack:

- React
- Vite
- TypeScript
- TailwindCSS
- Transformers.js (@xenova/transformers)

Key Features:

- Sidebar navigation (Clientes, Cotizaciones, Agent Demo)
- Topbar with "Local AI: ON" indicator
- Agent Demo chat interface
- Agent Trace panel
- Responsive UI
- Light/Dark theme

---

## Backend (apps/server)

Stack:

- Node.js
- Express
- TypeScript
- SQLite
- Zod validation
- CORS enabled
- Seed data

---

## REST API

Customers:

- GET /api/customers
- POST /api/customers

Quotes:

- GET /api/quotes
- POST /api/quotes
- GET /api/quotes/:id

---

## MCP Tools Endpoint

POST /mcp

Available tools:

- create_customer
- list_customers
- create_quote
- list_quotes
- get_quote

Example request:

{
  "tool": "create_customer",
  "input": {
    "name": "Juan Pérez",
    "email": "juan@correo.com"
  }
}

---

## Data Model

Customer:

- id (uuid)
- name
- rnc (optional)
- email (optional)
- phone (optional)
- createdAt

Quote:

- id (uuid)
- customerId
- title
- currency (default DOP)
- items [{ description, qty, unitPrice }]
- subtotal
- tax
- total
- createdAt

---

## Local AI Design

The AI agent runs entirely in the browser using:

@xenova/transformers

It performs:

1) Intent classification:
   - CREATE_CUSTOMER
   - CREATE_QUOTE
   - LIST_CUSTOMERS
   - LIST_QUOTES

2) Entity extraction:
   - Name
   - Email
   - RNC
   - Phone
   - Quote items
   - Quantities
   - Prices

If ML confidence is insufficient for numeric parsing, the system applies deterministic fallback rules using regex patterns such as:

- "2 unidades a 500"
- "por 15000"
- "3 x 7500"

No OpenAI.
No Gemini.
No external AI.
No API keys.

---

## Example Prompts

- Crea un cliente Juan Pérez, RNC 131-1234567-8, correo juan@correo.com, teléfono 8095551234
- Crea una cotización para Juan Pérez por Servicio de logística, 2 unidades a 7500
- Lista los clientes
- Lista las cotizaciones

---

## Running Locally

Install dependencies:

npm install

Run development mode:

npm run dev

This will start:

- Frontend (Vite)
- Backend (Express)
- SQLite database (auto-created)
- Seed data inserted automatically

---

## Seed Data

On first run, the system initializes:

- 2 customers
- 1 example quote

---

## Deployment

Backend → Render

- Deploy /apps/server
- Use Node 18+
- Recommended: persistent disk for SQLite

Frontend → Vercel

- Deploy /apps/web
- Configure environment variable:
  VITE_API_URL=https://your-render-url

---

## Transformers.js Compatibility Notes

The AI runs fully in the browser.

Supported backends:

- WebGPU (if available)
- WASM fallback (default)

If WebGPU is not available, the system automatically falls back to WASM without breaking functionality.

Performance depends on the user's device.

---

## Why This Project Exists

Most AI demos depend on expensive APIs and secret keys.

This demo proves you can:

- Build local AI agents
- Maintain full persistence
- Expose structured tools (MCP-style)
- Deliver a professional SaaS UI

All without external AI providers.

---

## License

MIT
