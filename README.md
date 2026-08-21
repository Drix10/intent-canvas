# Intent Canvas Frontend — Standalone (Vercel)

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev/) [![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/) [![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/) [![Gemini](https://img.shields.io/badge/Gemini-2.5--flash-8E75FF)](https://aistudio.google.com/)

A browser-first **spatial workspace** for expressing business outcomes through context nodes, relationships, and natural-language intent — now **standalone on Vercel** with your own Gemini API key. No backend folder, no server to run.

> **No backend:** This frontend calls `generativelanguage.googleapis.com` directly. Paste your Gemini key in the top bar (stored in `localStorage`). Legacy `intent-canvas-backend` remains in its own repo for reference.

## Why this exists — standalone

Most canvas tools need a server. Intent Canvas standalone does the thinking **in the browser**: you place evidence spatially, connect what relates, describe the outcome, and get back a plan you can read — all with your key, no backend.

## Product model — standalone

```
Context nodes + spatial relationships + user intent
                         |
                         v
                  SpatialGraphAST (browser)
                         |
                         v
              Gemini via user API key (direct fetch)
                         |
                         v
                 Inspectable plan review
                         |
                         v
                  User approval and execute
                         |
                         v
                 Results returned to canvas
```

The UI never executes every tool. It shows the tools the **Gemini plan selected** and renders only outputs for `executedSteps`.

## What you can do

1. **Place** datasets, documents, notes, examples, uploads on the canvas.
2. **Connect** with explicit edges; let centroid proximity (`240px` default) form spatial clusters.
3. **Paste** your Gemini API key in the top bar (or set `VITE_GEMINI_API_KEY` locally).
4. **Describe** the outcome in natural language.
5. **Inspect** the plan — context sources, confidence, why each source was chosen, expected outputs, verification checks.
6. **Approve** — plan is validated in-browser, runs via Gemini, returns to canvas.

## Workspace features

- **Spatial** — pointer + keyboard, pan/zoom, drag, file drop, relationships (`SpatialCanvas.tsx`).
- **Relationships** — explicit named edges + derived proximity; semantic retrieval is now a tiny local lexical matcher (no backend).
- **Nodes** — dataset, document, instruction, example, output, custom primitive; PDF/CSV/TXT/MD/JSON/raster uploads (SVG rejected, raster previews resized).
- **Plan review** — `PlanPreviewModal.tsx` shows context rationale, workflow stages, confidence, assumptions.
- **Execution** — `ResultNodeCard.tsx` renders 4 capabilities: data patterns (safe SVG), document synthesis, meeting insights, UI concepts with `referenceBasis`.
- **State** — `useCanvasStore.ts` persists only bounded workspace data (nodes, edges, prompt, primitives). Transient plans/results are not persisted.
- **Primitives** — compile your graph into a reusable custom primitive (client-persisted, no backend).

## Configuration — standalone

No backend env needed. For local dev, copy `.env.example` to `.env`:

```env
VITE_GEMINI_API_KEY=AIza...
VITE_GEMINI_MODEL=gemini-2.5-flash
VITE_CANVAS_ID=workspace_canvas
VITE_SPATIAL_CLUSTER_ID=primary
VITE_PROXIMITY_DISTANCE_PX=240
VITE_DEFAULT_INTENT_PROMPT=Analyze the supplied context, identify the most useful supported outcome, and propose grounded next steps.
VITE_PRIMITIVE_TITLE=Evidence-Based Risk & Opportunity Primitive
VITE_PRIMITIVE_DESCRIPTION=User-composed dynamic computational primitive
```

- Paste your key in the UI — it is stored in `localStorage` under `intent-canvas.gemini-key` and never sent anywhere except `generativelanguage.googleapis.com`.
- Every `VITE_*` is public (Vite bundles it). Never commit your key.

## Local development — standalone

```bash
cd frontend
npm install
cp .env.example .env   # add VITE_GEMINI_API_KEY or paste in UI
npm run dev            # → http://localhost:3000
```

No `backend` to run. If no key is set, a deterministic local fallback planner runs (limited, but the canvas works).

## Demo workflow — try in 2 minutes

1. Paste Gemini key in top bar (get one at https://aistudio.google.com/app/apikey).
2. Switch from showcase to interactive workspace.
3. Restore starter context if needed.
4. Arrange/connect nodes.
5. Enter an outcome — e.g., *“Analyze the supplied datasets and propose the most useful insights.”*
6. Inspect plan — context, tool, steps, confidence.
7. Approve.
8. Inspect business objects on canvas + result card.

## Limits — intentional bounds

- Upload 10 MB, PDF text 10k chars, image = bounded raster preview, SVG rejected.
- Workspace: 30 nodes, 60 edges, output payload 100 KB.
- Inline SVG sanitized + bounded.
- No database — browser persistence is per-profile, not multi-user.
- Gemini calls use `responseMimeType: application/json` and are validated with Zod; provider failures fall back to local plan.

## Scripts

```bash
npm run dev      # Vite dev
npm run build    # tsc + vite build → dist/
npm run preview  # serve dist
```

## Production deployment — Vercel (no backend)

1. Push this `frontend/` as the Vercel project root (single repo, no `backend/` folder).
2. In Vercel, set `VITE_GEMINI_API_KEY` (optional — users can also paste in UI) and `VITE_GEMINI_MODEL`.
3. `npm run build` → `dist/` is served statically.
4. No `CORS_ORIGINS` / `API` env needed.
5. Use HTTPS.

There is no backend database. Browser persistence is per-profile.

## Related

- `docs/ARCHITECTURE.md`, `docs/INTEGRATION_GUIDE.md` (legacy backend docs, now unused)
- Original backend remains in `Drix10/intent-canvas-backend` for reference

Built for the NYC Codex Community Hackathon — where spatial thinking becomes an inspectable plan, now with your own Gemini key.
