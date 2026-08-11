<div align="center">
  <br />

  # 🎨 Intent Canvas

  **Spatial intent, multimodal evidence, and AI-driven execution planning**

  *Turn node graphs, prompts, and uploads into inspectable AI-backed outcomes.*

  [![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue?logo=typescript)](https://www.typescriptlang.org/)
  [![React](https://img.shields.io/badge/React-18+-blue?logo=react)](https://react.dev/)
  [![Vite](https://img.shields.io/badge/Vite-6.x-purple?logo=vite)](https://vitejs.dev/)
  [![MeshAPI](https://img.shields.io/badge/MeshAPI-google%2Fgemini--2.5--flash-6f42c1)](https://developers.meshapi.ai)

  **🏆 NYC CodeQuest Round 3: CREATIVE Category**

</div>

---

## What is Intent Canvas?

Intent Canvas is a browser-first spatial workspace that lets users express outcomes through nodes, edges, and uploads instead of step-by-step commands.

It compiles the canvas into a formal `SpatialGraphAST`, sends it to the backend engine, generates an inspectable execution plan, and renders the computed output directly in the canvas.

---

## Core Experience

- **Spatial reasoning**: nodes and proximity define intent structure.
- **Multimodal evidence**: PDF, CSV, TXT, MD, JSON, and image nodes are first-class inputs.
- **Inspectable plans**: backend plan generation is visible before execution.
- **Custom primitives**: compose reusable canvas primitives from active graphs.
- **Auth-safe API**: requests use bearer tokens and optional `X-Intent-Canvas-Key` support.

---

## How the system works

```
User intent + canvas layout
           │
           ▼
Spatial Graph AST
           │
           ▼
Frontend API client
           │
           ▼
Backend MeshAPI engine
           │
           ▼
Execution plan + capability output
           │
           ▼
Canvas result node
```

---

## Frontend Architecture

- **React + Vite**: fast interactive canvas and panel rendering.
- **Axios API client**: `src/api.ts` builds requests, attaches auth headers, and validates backend plan/result payloads.
- **Runtime safety**: the client checks structured plans, capability payloads, and cancellation behavior before rendering.
- **Spatial canvas UI**: `src/components/canvas` contains node cards, edges, modals, and result visuals.
- **State management**: `zustand` stores canvas state, primitives, and viewport details.

---

## Backend Integration

The frontend communicates with the backend API using:

- `VITE_API_BASE_URL` for the backend origin
- `VITE_API_ACCESS_TOKEN` for bearer authorization

Supported backend flows:

- `POST /api/intent/parse`
- `POST /api/files/pdf-text`
- `POST /api/intent/plan`
- `POST /api/intent/execute`
- `POST /api/intent/create-primitive`

---

## Quick Start

```bash
git clone <repository-url>
cd NYC-R3-FRONTEND
npm install
cp .env.example .env
# Edit .env to point at the backend and set access token
npm run dev
```

---

## Required Environment Variables

```env
VITE_API_BASE_URL=http://localhost:25655
VITE_API_ACCESS_TOKEN=your_api_access_token
VITE_API_TIMEOUT_MS=10000
VITE_CANVAS_ID=demo_canvas_1
VITE_SPATIAL_CLUSTER_ID=primary
VITE_PROXIMITY_DISTANCE_PX=240
```

---

## Runtime Guardrails

- **Payload validation**: client-side validation mirrors backend plan and output contracts.
- **Request safety**: abort-safe Axios calls and friendly timeout handling.
- **SVG / content limits**: output payloads are size-bound and sanitized before display.

---

## Project Structure

```
src/
+-- api.ts                # backend API client and runtime guards
+-- App.tsx               # application shell and routing
+-- config.ts             # environment config and URL helpers
+-- components/
|   +-- canvas/           # canvas nodes, edges, modals, result cards
|   +-- layout/           # Navbar and layout shell
|   +-- providers/        # smooth scroll provider
|   +-- ui/               # reusable UI components
+-- hooks/                # canvas dialog and mobile helpers
+-- sections/             # landing page and showcase sections
+-- store/                # Zustand canvas state store
+-- types/                # canvas and execution types
+-- utils/                # ID generation, SVG sanitization, spatial relations
```

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Build the frontend bundle |
| `npm run preview` | Preview the production build |

---

## License
Built for NYC CodeQuest Round 3 Hackathon.
