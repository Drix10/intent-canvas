# Frontend Architecture Specification

> **Repository**: `NYC-R3-FRONTEND`  
> **Framework**: React 18 + Vite + TypeScript + Tailwind CSS + Framer Motion + Lenis  

---

## 1. Executive Architecture Overview

The `NYC-R3-FRONTEND` workspace delivers an interactive spatial computing environment where natural human intent is compiled into structured computations. The workspace features two primary interaction modes:

1. **Spatial Showcase Navigation (`SpatialScroll.tsx`)**: A 2D grid matrix presentation room ($200\text{vw} \times 200\text{vh}$) panning across four showcase glass cards with Lenis hardware-accelerated smooth wheel scrolling.
2. **Interactive Spatial Workspace (`SpatialCanvas.tsx`)**: An uncontrolled 60fps canvas workspace supporting node positioning, drag-and-drop file ingestion, spatial proximity clustering ($240\text{px}$ radius), real-time Bezier curve connector rendering, and in-canvas living result nodes.

---

## 2. Component Topology & Data Flow

```
                               ┌─────────────────────────┐
                               │       App.tsx           │
                               └────────────┬────────────┘
                                            │
                      ┌─────────────────────┴─────────────────────┐
                      ▼                                           ▼
         ┌─────────────────────────┐                 ┌─────────────────────────┐
         │    SpatialScroll.tsx    │                 │    SpatialCanvas.tsx    │
         │   (4-Section Showcase)  │                 │  (Interactive Workspace)│
         └─────────────────────────┘                 └────────────┬────────────┘
                                                                  │
                                            ┌─────────────────────┼─────────────────────┐
                                            ▼                     ▼                     ▼
                               ┌─────────────────┐       ┌─────────────────┐   ┌─────────────────┐
                               │ CanvasNodeCard  │       │ CanvasSVGEdges  │   │ ResultNodeCard  │
                               └─────────────────┘       └─────────────────┘   └─────────────────┘
```

### Core Components
- **`App.tsx`**: Top-level orchestrator. Connects Zustand state, manages API requests, controls modal visibilities, handles native OS file uploads, and renders global toast feedback notifications.
- **`SpatialScroll.tsx`**: Renders the 4-section spatial showcase grid with Framer Motion matrix translations (`left: 74vw`, `top: 82vh`) and synchronized section entrance text animations.
- **`SpatialCanvas.tsx`**: Implements the interactive workspace viewport with matrix pan/zoom, node drag pointer captures, floating spatial cluster tags, bottom-left Spatial HUD, and bottom-right Zoom controls.
- **`CanvasNodeCard.tsx`**: Glassmorphic card representation for dataset, document, instruction, and example nodes with interactive action controls (`+ Connect Relation`, `− Remove Relation`, inspect details).
- **`CanvasSVGEdges.tsx`**: Renders dynamic SVG Bezier curve connectors between connected canvas nodes with glow filters and midpoint relationship labels.
- **`ResultNodeCard.tsx`**: Living output card rendering computed SVG metric charts, anomaly alerts, document takeaways, meeting action items, and UI concept hierarchies.
- **`IntentBar.tsx`**: Bottom intent input console supporting text prompt input, prompt suggestion chips, file uploads, and plan execution triggers.

---

## 3. State Management & Store Architecture (`useCanvasStore.ts`)

State is managed via **Zustand** without unnecessary re-render overhead.

### State Schema
```typescript
interface CanvasState {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  pan: { x: number; y: number };
  zoom: number;
  selectedNodeIds: string[];
  activeIntentPrompt: string;
  activePlan: ExecutionPlan | null;
  executionResult: ExecutionResult | null;
  isEvaluatingPlan: boolean;
  isExecutingPlan: boolean;
  viewMode: 'showcase' | 'interactive';
  resetVersion: number;
  customPrimitives: CustomPrimitiveDefinition[];
}
```

### Proximity Vector Calculation
When a node position updates, the store automatically recalculates spatial proximity vectors:
- **Distance Threshold**: $240\text{px}$ centroid-to-centroid distance.
- **Spatial Clusters**: Nodes within $240\text{px}$ are grouped into spatial clusters (`SpatialCluster`), establishing implicit contextual relationships sent in the `SpatialGraphAST`.

---

## 4. API Client & Security (`api.ts`)

API requests to `NYC-R3-BACKEND` are managed by a centralized Axios client instance (`intentApi`):
- **Base URL**: Configured via `VITE_API_BASE_URL` (defaults to `/api` or `http://localhost:25655`).
- **Security Headers**: Automatically attaches `Authorization: Bearer <token>` and `X-Intent-Canvas-Key: <token>` configured via `VITE_API_ACCESS_TOKEN`.
- **Timeout**: Uses a 60-second default to cover provider-backed planning and execution; override with `VITE_API_TIMEOUT_MS`.
- **Response Validation**: Validates incoming payloads with type guard helpers (`isExecutionPlan`, `isExecutionResult`) before updating UI state.

---

## 5. Performance Optimizations

1. **Pointer Move Throttling**: Drag positioning updates are batched using `requestAnimationFrame` to maintain 60fps rendering without React state thrashing.
2. **GPU Rasterization**: Smoked glass visual components use GPU-efficient `backdrop-filter: blur(8px)` with hairline borders (`border-white/[0.08]`).
3. **Scroll Isolation**: Lenis smooth scroll provider is disabled during spatial canvas drag operations to prevent pointer event conflicts.
