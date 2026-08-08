const numberEnv = (value: string | undefined, fallback: number) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const APP_CONFIG = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '',
  apiTimeoutMs: numberEnv(import.meta.env.VITE_API_TIMEOUT_MS, 10000),
  apiAccessToken: import.meta.env.VITE_API_ACCESS_TOKEN ?? '',
  canvasId: import.meta.env.VITE_CANVAS_ID ?? 'demo_canvas_1',
  spatialClusterId: import.meta.env.VITE_SPATIAL_CLUSTER_ID ?? 'primary',
  proximityDistancePixels: Math.max(1, numberEnv(import.meta.env.VITE_PROXIMITY_DISTANCE_PX, 240)),
  defaultIntentPrompt: import.meta.env.VITE_DEFAULT_INTENT_PROMPT ?? 'Analyze the supplied workspace evidence, identify the most important business risk or opportunity, recommend grounded next steps, and present the result using the supplied visual reference.',
  primitiveTitle: import.meta.env.VITE_PRIMITIVE_TITLE ?? 'Evidence-Based Risk & Opportunity Primitive',
  primitiveDescription: import.meta.env.VITE_PRIMITIVE_DESCRIPTION ?? 'User-composed dynamic computational primitive',
  canvasGridSize: 32,
  maxZoom: 2,
  minZoom: 0.5,
} as const

export const apiUrl = (path: string) => `${APP_CONFIG.apiBaseUrl.replace(/\/$/, '')}${path}`
