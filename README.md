# Revenue Rescue

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev/) [![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vite.dev/) [![Dodo Payments](https://img.shields.io/badge/Dodo_Payments-test_mode-6C47FF)](https://dodopayments.com/)

Revenue Rescue is a focused revenue-operations workspace for SaaS teams. Connect a Dodo Payments webhook, import historical payments, add account evidence to the canvas, and review a deterministic risk and recovery assessment before any human follow-up happens.

There is no seeded demo data and no general-purpose agent mode. The interface is purpose-built for financial evidence, Dodo signals, bounded recovery cases, and human-approved next steps.

## Product flow

1. Connect the backend to Dodo Payments Test Mode.
2. Monitor signed live webhook events or import past payment history in resumable batches.
3. Add a Dodo signal, recovery case, CSV, PDF, note, or financial document to the canvas.
4. Build and inspect a Revenue Rescue plan.
5. Execute the deterministic assessment and review evidence, owners, deadlines, and recommended recovery actions.

No customer charge, refund, payment retry, or subscription mutation can be made from this UI.

## Local setup

```bash
npm install
cp .env.example .env
npm run dev
```

Required variables:

```env
VITE_API_BASE_URL=http://localhost:25655
VITE_API_TIMEOUT_MS=60000
VITE_API_ACCESS_TOKEN=the-same-server-token-when-auth-is-enabled
VITE_DEFAULT_INTENT_PROMPT=Prioritize revenue risk from the supplied financial evidence and propose a safe recovery plan.
```

## Validation and safety

- All API payloads are runtime validated and size bounded before rendering.
- SVG risk charts are sanitized before insertion into the DOM.
- Requests are abortable; stale plans and results are discarded when the canvas changes.
- Persisted browser workspaces reject legacy demo/custom-primitive records and never retain image previews.
- A backend-generated plan is bound to the exact canvas state and can execute only once.

## Build

```bash
npm run build
```

For deployment, set `VITE_API_BASE_URL` to the HTTPS backend origin and never place Dodo API keys or webhook signing keys in frontend environment variables.
