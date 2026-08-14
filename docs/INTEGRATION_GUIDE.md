# Frontend Integration & Deployment Guide

> **Repository**: `NYC-R3-FRONTEND`  
> **Target Platforms**: Vercel, Netlify, Local Node.js  

---

## 1. Local Development Setup

### Installation Steps
```bash
# Clone repository
git clone https://github.com/Drix10/intent-canvas-frontend.git
cd intent-canvas-frontend

# Install dependencies
npm install

# Configure environment variables (.env)
cp .env.example .env

# Start Vite development server
npm run dev
```

### Environment Variables (.env)
```env
VITE_API_BASE_URL=http://localhost:25655
VITE_API_PROXY_TARGET=http://localhost:25655
VITE_API_TIMEOUT_MS=25000
VITE_API_ACCESS_TOKEN=replace_with_the_backend_access_token
VITE_CANVAS_ID=workspace_canvas
VITE_SPATIAL_CLUSTER_ID=primary
VITE_PROXIMITY_DISTANCE_PX=240
```

---

## 2. Vercel Production Deployment

When deploying `NYC-R3-FRONTEND` to Vercel:

1. Import the `NYC-R3-FRONTEND` project in Vercel.
2. Set Environment Variables in Vercel project settings:
   - `VITE_API_BASE_URL`: Your deployed backend domain (e.g. `https://api.yourdomain.com`).
    - `VITE_API_ACCESS_TOKEN`: The matching backend access token. Treat it as public because `VITE_*` values are bundled into the browser.
3. Set Build Command to `npm run build` and Output Directory to `dist`.

---

## 3. Error Boundary & Error Handling Standards

The frontend includes centralized error handling:
- **Axios Error Interception**: `getApiErrorMessage(error)` parses structured API error codes (`UNAUTHORIZED`, `RATE_LIMITED`, `INVALID_PAYLOAD`, `UPSTREAM_UNAVAILABLE`).
- **Toast Notifications**: Replaces disruptive page alerts with top-center glassmorphic toast banners.
- **Request Cancellation**: `AbortController` instances cancel stale in-flight requests when intent inputs or node positions update rapidly.
