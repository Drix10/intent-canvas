# 🔮 Intent Canvas — A New Computing Primitive

> **NYC CodeQuest Round 3 — CREATIVE Category**  
> *"Stop commanding computers. Start shaping them."*

---

## 🚀 Overview

For over four decades, human-computer interaction has relied on rigid, command-based interfaces: buttons, forms, menus, feeds, and syntax. Humans have been forced to learn software syntax and manually translate their desires into step-by-step procedures.

**Intent Canvas** introduces a new computing primitive: **Intent-Driven Computation**.

Instead of telling the computer *how* to perform a task step-by-step, the user expresses **what outcome they desire** using whatever natural representation is easiest—language, spatial node connections, examples, visual layout references, and multimodal files.

The system compiles the spatial layout into a formal **Spatial Graph Abstract Syntax Tree (AST)**, interprets the user's intent using **MeshAPI**, generates an inspectable execution plan, runs registered capability engines, and surfaces the computed output directly inside the spatial environment.

```
Human Intent & Spatial Layout
           │
           ▼
Spatial Graph AST Compiler
           │
           ▼
     MeshAPI Engine
(https://developers.meshapi.ai)
           │
           ▼
 Inspectable Execution Plan
           │
           ▼
   Capability Engines
┌──────────┬──────────┬──────────┐
│ Data     │ Document │ Meeting  │
│ Pattern  │ Synthes- │ Insight  │
│ Finder   │ izer     │ Extractor│
└──────────┴──────────┴──────────┘
           │
           ▼
  In-Canvas Output &
  Adaptability Loop
```

---

## 🛠️ Architecture & System Topology

The frontend is a React/Vite workspace. The backend architecture is implemented separately in `../NYC-R3-BACKEND`:

- **Frontend API Layer**: `src/api.ts` sends requests and applies bounded runtime checks before rendering responses.
- **Backend Route/Validation Layers**: `../NYC-R3-BACKEND/src/server.ts` and `../NYC-R3-BACKEND/src/validators/spatialAstValidator.ts` expose and validate the API contract.
- **Service Layer**:
  - `MeshApiService`: Integrates with MeshAPI (`https://developers.meshapi.ai`) for LLM reasoning and intent decomposition. Deterministic bounded local planning is used when no credential exists or when the provider times out or returns an unusable response; the plan is marked as a local fallback.
  - `DataPatternFinderService`: Parses numeric CSV rows when supplied and generates bounded SVG charts; text-only demo nodes are explicitly labeled as synthetic previews.
  - `DocumentSynthesizerService`: Extracts semantic concepts, joint takeaways, and cross-document contradictions.
  - `MeetingInsightExtractorService`: Parses transcripts into decisions, action items, owner tags, and risk factors.
  - `UIConceptGeneratorService`: Generates Vercel/Linear pitch obsidian component hierarchies and design tokens.

---

## 🎨 Design System & Aesthetics

- **Dark Theme Base**: Pitch Obsidian (`#040406`) canvas base with sub-pixel 32px grid.
- **Glassmorphism**: Smoked Graphite (`#090a0f`/85) cards with backdrop blur (`backdrop-blur-2xl`) and hairline borders (`border-white/[0.08]`).
- **Accent Palette**: Electric Mint (`#00ff87`) primary accents, Cyber Amber (`#ffb703`) anomaly alerts.
- **Performance**: Pointer movement is throttled with `requestAnimationFrame`; the showcase uses one custom wheel owner rather than running Lenis and showcase navigation together.

---

## ⚙️ Setup & Environment Configuration

### Prerequisites
- Node.js v18+
- npm / yarn / pnpm

### Backend Installation (`NYC-R3-BACKEND`)
```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables (.env)
PORT=5000
NODE_ENV=development
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173
INTENT_API_ACCESS_TOKEN=
MESH_API_KEY=your_mesh_api_key_here
MESH_API_BASE_URL=https://api.meshapi.ai/v1
MESH_API_MODEL=google/gemini-2.5-flash

# 3. Start backend development server
npm run dev
```

Set the same access token in `VITE_API_ACCESS_TOKEN` when the backend token is enabled. A `VITE_` token is visible to browser users, so it is an access gate rather than a secret. The frontend accepts zero-step plans only when they contain a disambiguation gate, sends typed adaptation choices, and executes only the short-lived plan returned for the current canvas state.

### Frontend Installation (`NYC-R3-FRONTEND`)
```bash
# 1. Install dependencies
npm install

# 2. Start Vite development server
npm run dev
```

---

## 🛡️ Technical Verification & Judge Q&A Defense

### MVP API Contract

```text
Canvas nodes + edges + intent
        -> SpatialGraphAST
        -> inspect plan
        -> confirm exact plan
        -> execute/adapt
        -> output node + result panel
```

The current MVP supports typed intent, spatial arrangement, explicit connections, and uploaded CSV, TXT, MD, JSON, and image nodes. PDF parsing, voice, sketch, and gesture ingestion remain future extensions. Numeric CSV rows are analyzed directly; nodes without parseable numeric rows produce an explicitly labeled preview instead of pretending to be source data.

Uploading context never starts computation. The user must type a non-empty outcome in the intent field before plan inspection or execution controls become available.

- **Q: Isn't this just an AI agent or chatbot?**  
  *Answer*: No. An agent is an execution mechanism. Intent Canvas introduces a constrained interaction model where typed intent, spatial proximity, explicit connections, and uploaded context compile into a validated `SpatialGraphAST` before computation.
- **Q: How do you prevent infinite execution loops or memory leaks?**  
  *Answer*: We enforce strict boundaries: five plan steps, an 8-second provider timeout, a 50KB capability-output rejection limit, request-scoped abort cancellation, a ten-minute plan binding, and structured errors.
- **Q: Can users create new primitives?**  
  *Answer*: The current MVP saves the current non-output canvas graph as a locally persisted custom-primitive record. The record is visible on the canvas, but executing saved primitives with new inputs and a shared server registry are future extensions.

The backend provider timeout is 8 seconds. The browser HTTP timeout defaults to 10 seconds (`VITE_API_TIMEOUT_MS`) to leave room for response handling. A configured API token is an access gate, not a browser secret.

Canvas nodes, explicit edges, prompts, and custom-primitive metadata are retained in browser `localStorage`. This is single-browser retention, not shared account or server persistence. Uploaded image binaries are not stored; image nodes retain their file name and visual-reference metadata.

---

## 📄 License
Built for NYC CodeQuest Round 3 Hackathon.
