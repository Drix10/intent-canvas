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

The backend engine follows a strict fail-fast 3-tier layering architecture compliant with senior engineering standards:

- **Route Layer**: `src/server.ts` exposes Zod-validated endpoints `/api/intent/parse`, `/api/intent/plan`, `/api/intent/execute`, and `/api/intent/create-primitive`. API routes support an optional bearer token through `INTENT_API_ACCESS_TOKEN`.
- **Validation Layer**: `src/validators/spatialAstValidator.ts` uses Zod schemas (`SpatialGraphASTSchema`, `SpatialNodeSchema`) to validate every network boundary.
- **Service Layer**:
  - `MeshApiService`: Integrates with MeshAPI (`https://developers.meshapi.ai`) for LLM reasoning and intent decomposition, featuring deterministic fallback execution.
  - `DataPatternFinderService`: Detects dataset anomalies (e.g. August revenue drop) and generates dynamic SVG charts.
  - `DocumentSynthesizerService`: Extracts semantic concepts, joint takeaways, and cross-document contradictions.
  - `MeetingInsightExtractorService`: Parses transcripts into decisions, action items, owner tags, and risk factors.
  - `UIConceptGeneratorService`: Generates Vercel/Linear pitch obsidian component hierarchies and design tokens.

---

## 🎨 Design System & Aesthetics

- **Dark Theme Base**: Pitch Obsidian (`#040406`) canvas base with sub-pixel 32px grid.
- **Glassmorphism**: Smoked Graphite (`#090a0f`/85) cards with backdrop blur (`backdrop-blur-2xl`) and hairline borders (`border-white/[0.08]`).
- **Accent Palette**: Electric Mint (`#00ff87`) primary accents, Cyber Amber (`#ffb703`) anomaly alerts.
- **Performance**: 60fps GPU-accelerated cursor spotlight tracking via CSS custom variables (`--mouse-x`, `--mouse-y`) to prevent React state re-render lag.

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
CORS_ORIGINS=http://localhost:3000
INTENT_API_ACCESS_TOKEN=
MESH_API_KEY=your_mesh_api_key_here
MESH_API_BASE_URL=https://api.meshapi.ai/v1

# 3. Start backend development server
npm run dev
```

Set the same access token in `VITE_API_ACCESS_TOKEN` when the backend token is enabled. The frontend accepts zero-step plans when they contain a disambiguation gate and sends typed adaptation choices to execution.

### Frontend Installation (`NYC-R3-FRONTEND`)
```bash
# 1. Install dependencies
npm install

# 2. Start Vite development server
npm run dev
```

---

## 🛡️ Technical Verification & Judge Q&A Defense

- **Q: Isn't this just an AI agent or chatbot?**  
  *Answer*: No. An agent is an execution mechanism. Intent Canvas introduces a new **input primitive** where spatial layout, edge distance vectors, and multimodal context compile into a formal `SpatialGraphAST` before computation.
- **Q: How do you prevent infinite execution loops or memory leaks?**  
  *Answer*: We enforce strict boundaries: `MAX_PLAN_STEPS = 5`, step timeout ceilings, 50KB tool output truncation, and client-side `AbortController` signal cancellation.
- **Q: Can users create new primitives?**  
  *Answer*: Yes! The system supports **Higher-Order Dynamic Primitive Composition**. Users can select executed result subgraphs and click *"Save as Custom Primitive"*, generating a new reusable node (`CustomPrimitiveDefinition`).

---

## 📄 License
Built for NYC CodeQuest Round 3 Hackathon.
