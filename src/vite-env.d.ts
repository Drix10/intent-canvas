interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_API_TIMEOUT_MS?: string
  readonly VITE_API_ACCESS_TOKEN?: string
  readonly VITE_CANVAS_ID?: string
  readonly VITE_SPATIAL_CLUSTER_ID?: string
  readonly VITE_PROXIMITY_DISTANCE_PX?: string
  readonly VITE_DEFAULT_INTENT_PROMPT?: string
  readonly VITE_PRIMITIVE_TITLE?: string
  readonly VITE_PRIMITIVE_DESCRIPTION?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
