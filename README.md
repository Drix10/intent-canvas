# Intent Canvas Frontend

Intent Canvas is a browser-first spatial workspace for expressing business outcomes through context nodes, relationships, and natural-language intent.

The frontend lets a user:

1. place datasets, documents, notes, examples, and uploaded files on a canvas;
2. connect related context and let proximity form spatial clusters;
3. describe the desired outcome;
4. inspect the structured execution plan before anything runs;
5. approve the plan;
6. receive only the selected capability results back on the canvas.

## Product Model

```text
Context nodes + spatial relationships + user intent
                         |
                         v
                  SpatialGraphAST
                         |
                         v
                   Backend planner
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

The UI does not execute every available tool. It displays the tools selected by the backend plan and renders only outputs corresponding to completed steps.

## Workspace Features

- Spatial node positioning with pointer and keyboard movement.
- Explicit relationship edges and automatically derived proximity relationships.
- Manual named relationship edges and automatic proximity relationships; backend semantic retrieval informs planning without adding noisy automatic canvas edges.
- Dataset, document, instruction, example, output, and custom primitive nodes.
- PDF, CSV, TXT, MD, JSON, and raster image uploads.
- SVG uploads are rejected; raster previews are resized before storage.
- Inspectable plan review with context sources and confidence.
- Approval-gated execution.
- Plan context rationale showing why each source was selected and which spatial relationship supports it.
- Expected outputs and verification checks shown before approval.
- Full workflow stages shown separately from the underlying capability tool, so a single tool does not collapse a multi-step business process into one line.
- Tool-specific result rendering for data, documents, meetings, UI/UX concepts, and renewal rescue.
- Renewal Rescue results with risk score provenance, multi-source evidence bullets, owner, deadline, and recovery action.
- Local browser persistence for workspace state and saved primitive metadata.
- Resettable starter context for the demo workflow.

## Capability Result Behavior

The frontend accepts a result only when:

- the execution status is valid;
- executed steps are sequential and unique;
- every output key maps to an executed capability;
- every executed capability has a matching output;
- nested values, strings, arrays, SVG, and serialized output stay within limits;
- capability-specific required fields are present.

The displayed tools-used line is derived from `executedSteps`, not from the available tool registry. UI/UX output also displays `referenceBasis` so visual recommendations show what supplied reference informed them.

## Frontend Architecture

- `src/App.tsx`: application orchestration, AST construction, uploads, plan requests, execution requests, and top-level feedback.
- `src/components/canvas/SpatialCanvas.tsx`: pan, zoom, drag, keyboard movement, file drop, and relationship creation.
- `src/components/canvas/PlanPreviewModal.tsx`: business-facing plan review and approval.
- `src/components/canvas/ResultNodeCard.tsx`: validated capability-specific result rendering.
- `src/components/canvas/CanvasNodeCard.tsx`: source and output node presentation.
- `src/store/useCanvasStore.ts`: Zustand workspace state, persistence, node/edge operations, and starter reset.
- `src/api.ts`: Axios client, auth headers, response size limits, runtime validators, and capability-output contracts.
- `src/utils/spatialRelations.ts`: proximity edges and connected spatial clusters.
- `src/api.ts`: bounded API client and runtime validators; semantic retrieval remains a backend planning concern rather than an automatic visual edge generator.
- `src/utils/sanitizeSvg.ts`: allowlisted SVG sanitization before DOM insertion.
- `src/hooks/useDialog.ts`: focus trapping, inert background handling, Escape behavior, and focus restoration.

## Workspace State

The Zustand store persists only bounded workspace data:

- nodes and validated payload summaries;
- edges and relationship metadata;
- active prompt;
- saved custom primitive metadata;
- view mode.

Transient request state, active plans, and execution results are not persisted. Malformed local storage data is discarded at merge time. The starter business context is isolated to the demo reset state.

## Configuration

Copy `.env.example` to `.env`:

```env
VITE_API_BASE_URL=http://localhost:25655
VITE_API_PROXY_TARGET=http://localhost:25655
VITE_API_TIMEOUT_MS=60000
VITE_API_ACCESS_TOKEN=
VITE_CANVAS_ID=workspace_canvas
VITE_SPATIAL_CLUSTER_ID=primary
VITE_PROXIMITY_DISTANCE_PX=240
VITE_DEFAULT_INTENT_PROMPT=Analyze the supplied context, identify the most useful supported outcome, and propose grounded next steps.
VITE_PRIMITIVE_TITLE=Evidence-Based Risk and Opportunity Primitive
VITE_PRIMITIVE_DESCRIPTION=User-composed dynamic computational primitive
```

Configuration details:

- `VITE_API_BASE_URL`: backend origin. Leave empty when using the Vite proxy configuration.
- `VITE_API_PROXY_TARGET`: local Vite proxy target.
- `VITE_API_TIMEOUT_MS`: Axios request timeout. The default is 60 seconds because provider-backed planning and execution can exceed short browser timeouts.
- `VITE_API_ACCESS_TOKEN`: backend access token when backend authentication is enabled.
- `VITE_CANVAS_ID`: stable identifier for the workspace AST.
- `VITE_SPATIAL_CLUSTER_ID`: cluster ID prefix sent to the backend.
- `VITE_PROXIMITY_DISTANCE_PX`: centroid distance used to infer proximity relationships.
- `VITE_DEFAULT_INTENT_PROMPT`: neutral fallback used when the user presses Generate Intent without typing a prompt.
- `VITE_PRIMITIVE_TITLE` and `VITE_PRIMITIVE_DESCRIPTION`: metadata used when saving a custom primitive.

Important: every `VITE_*` value is public because Vite embeds it in the browser bundle. Never put a MeshAPI credential in frontend configuration. Treat `VITE_API_ACCESS_TOKEN` as a client access credential, not a secret, and protect the backend with origin restrictions, token rotation, and deployment controls.

## Local Development

Start the backend first, then the frontend:

```bash
# Terminal 1
cd NYC-R3-BACKEND
npm install
cp .env.example .env
npm run dev

# Terminal 2
cd NYC-R3-FRONTEND
npm install
cp .env.example .env
npm run dev
```

Open the Vite URL shown in the terminal, normally `http://localhost:5173`.

For a local Renewal Rescue demo without MeshAPI, use development backend settings with authentication disabled locally. General provider-backed tools require a configured backend `MESH_API_KEY`.

## Demo Workflow

1. Switch from showcase mode to the interactive workspace.
2. Restore the starter context if needed.
3. Arrange or connect context nodes.
4. Enter an outcome such as finding high-risk upcoming renewals and creating recovery plans.
5. Select plan inspection.
6. Review the context, selected tool, steps, and confidence.
7. Approve execution.
8. Inspect the resulting business objects on the canvas and in the result card.

The starter context is demo-only. Production workspaces should use uploaded or user-created context.

## Upload and Rendering Limits

- Maximum upload size: 10 MB in the browser.
- PDF request size: 5 MB at the backend.
- Extracted PDF text stored in a node: 10,000 characters.
- Image previews: bounded raster previews only.
- SVG uploads: rejected.
- Workspace nodes: 30.
- Workspace edges: 60.
- Output payload: 100 KB client-side validation limit.
- Inline SVG charts: sanitized and bounded before rendering.

## Scripts

```bash
npm run dev
npm run build
npm run preview
```

- `npm run dev`: start Vite development mode.
- `npm run build`: run TypeScript compilation and create the production bundle.
- `npm run preview`: serve the production bundle locally.

## Production Deployment

1. Build with `npm run build`.
2. Deploy the generated `dist` directory to a static host.
3. Set `VITE_API_BASE_URL` to the deployed backend origin before building.
4. Set the matching client access token only if backend authentication is enabled.
5. Configure the backend `CORS_ORIGINS` to include the deployed frontend origin.
6. Do not expose backend provider credentials in frontend variables.
7. Use HTTPS for both frontend and backend origins.

There is no frontend database. Browser persistence is local to the current browser profile and is not multi-user storage.

## Related Documentation

- `docs/ARCHITECTURE.md`: component and state architecture.
- `docs/INTEGRATION_GUIDE.md`: backend integration and deployment notes.
- `../NYC-R3-BACKEND/README.md`: backend setup, API contracts, capabilities, and operational limits.

## License

Built for the NYC Codex Community Hackathon.
