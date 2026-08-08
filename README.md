# Intent Canvas: A New Computing Primitive

> **NYC CodeQuest Round 3: CREATIVE Category**  
> *"Stop commanding computers. Start shaping them."*

---

## Overview

For over four decades, human-computer interaction has relied on rigid, command-based interfaces: buttons, forms, menus, feeds, and syntax. Humans have been forced to learn software syntax and manually translate their desires into step-by-step procedures.

**Intent Canvas** introduces a new computing primitive: **Intent-Driven Computation**.

Instead of telling the computer how to perform a task step-by-step, the user expresses **what outcome they desire** using whatever natural representation is easiest: language, spatial node connections, examples, visual layout references, and multimodal files.

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

## Architecture & System Topology

The frontend is built with React 18, Vite, TypeScript, Tailwind CSS, and Framer Motion. The backend API is implemented separately in `../NYC-R3-BACKEND`:

- **Frontend API Layer**: `src/api.ts` sends requests with authorization headers and applies runtime checks before rendering responses.
- **Backend Route & Validation Layers**: `../NYC-R3-BACKEND/src/server.ts` and `../NYC-R3-BACKEND/src/validators/spatialAstValidator.ts` validate incoming payloads.
- **Service Layer**:
  - `MeshApiService`: Integrates with MeshAPI (`https://developers.meshapi.ai`) using `google/gemini-2.5-flash` for intent decomposition and plan generation.
  - `DataPatternFinderService`: Parses CSV rows and generates SVG metric charts and anomaly alerts.
  - `DocumentSynthesizerService`: Extracts semantic concepts, joint takeaways, and cross-document contradictions.
  - `MeetingInsightExtractorService`: Parses transcripts into decisions, action items, owner tags, and risk factors.
  - `UIConceptGeneratorService`: Generates pitch component hierarchies and design tokens.

---

## Design System & Aesthetics

- **Dark Theme Base**: Pitch Obsidian (`#040406`) canvas base with sub-pixel 32px grid.
- **Glassmorphism**: Smoked Graphite (`#090a0f`/85) cards with backdrop blur (`backdrop-blur-2xl`) and hairline borders (`border-white/[0.08]`).
- **Accent Palette**: Electric Mint (`#00ff87`) primary accents, Cyber Amber (`#ffb703`) anomaly alerts.
- **Performance**: Pointer movement is throttled with `requestAnimationFrame`; Lenis smooth scrolling isolates wheel handling to prevent interaction lag.

---

## Setup & Environment Configuration

### Prerequisites
- Node.js v18+
- npm / yarn / pnpm

### Backend Installation (`NYC-R3-BACKEND`)
```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables (.env)
PORT=25655
NODE_ENV=development
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://localhost:25655
INTENT_API_ACCESS_TOKEN=ic_sec_key_9f8a3b2c1d0e
REQUIRE_API_AUTH=true
MESH_API_KEY=your_mesh_api_key_here
MESH_API_BASE_URL=https://api.meshapi.ai/v1
MESH_API_MODEL=google/gemini-2.5-flash

# 3. Start backend development server
npm run dev
```

### Frontend Installation (`NYC-R3-FRONTEND`)
```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables (.env)
VITE_API_BASE_URL=http://localhost:25655
VITE_API_ACCESS_TOKEN=ic_sec_key_9f8a3b2c1d0e

# 3. Start Vite development server
npm run dev
```

---

## Technical Verification & Q&A Defense

### MVP API Contract

```text
Canvas nodes + edges + intent
        -> SpatialGraphAST
        -> inspect plan
        -> confirm exact plan
        -> execute/adapt
        -> output node + result panel
```

The current MVP supports typed intent, spatial arrangement, explicit connections, and uploaded PDF, CSV, TXT, MD, JSON, and image nodes. Voice, sketch, and gesture ingestion remain future extensions.

- **Q: How is this different from a standard AI chatbot?**  
  *Answer*: Chatbots take text in a chat window without visual context. Intent Canvas compiles node spatial arrangements, proximity distance vectors, explicit connection edges, and multimodal content into a formal `SpatialGraphAST` before executing inspectable capability steps.
- **Q: How are memory leaks and long-running requests handled?**  
  *Answer*: Request abort controllers, stream reader locks (`try ... finally { reader.releaseLock(); }`), step limits (max 5 steps), provider timeouts (25 seconds), and output payload byte caps (50 KB) prevent memory leaks.
- **Q: Can users save custom primitives?**  
  *Answer*: The current MVP saves the active canvas graph as a locally persisted custom primitive record in browser storage, allowing users to reuse created primitive definitions.

---

## License
Built for NYC CodeQuest Round 3 Hackathon.
