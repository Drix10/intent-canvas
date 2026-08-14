import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { CanvasNode, CanvasEdge, ExecutionPlan, ExecutionResult, CustomPrimitiveRecord } from '../types/canvas';
import { createId } from '../utils/id';

interface CanvasState {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  pan: { x: number; y: number };
  zoom: number;
  selectedNodeIds: string[];
  activeIntentPrompt: string;
  isEvaluatingPlan: boolean;
  isExecutingPlan: boolean;
  activePlan: ExecutionPlan | null;
  executionResult: ExecutionResult | null;
  customPrimitives: CustomPrimitiveRecord[];
  viewMode: 'showcase' | 'interactive';
  resetVersion: number;

  // Actions
  setPan: (pan: { x: number; y: number }) => void;
  setZoom: (zoom: number) => void;
  setViewMode: (mode: 'showcase' | 'interactive') => void;
  addNode: (node: CanvasNode) => void;
  removeNode: (id: string) => void;
  updateNodePosition: (id: string, x: number, y: number) => 'updated' | 'collision' | 'invalid' | 'missing';
  addEdge: (sourceId: string, targetId: string, relationType?: CanvasEdge['relationType'], label?: string) => void;
  removeEdge: (edgeId: string) => void;
  selectNode: (id: string, multi?: boolean) => void;
  clearSelection: () => void;
  setActiveIntentPrompt: (prompt: string) => void;
  setIsEvaluatingPlan: (evaluating: boolean) => void;
  setIsExecutingPlan: (executing: boolean) => void;
  setActivePlan: (plan: ExecutionPlan | null) => void;
  setExecutionResult: (result: ExecutionResult | null) => void;
  addCustomPrimitive: (primitive: CustomPrimitiveRecord) => void;
  upsertOutputNode: (summary: string, payload: Record<string, unknown>) => boolean;
  resetDemoCanvas: () => void;
}

// The domain-specific starter fixture is used only for the optional demo/reset canvas.
const demoStarterNodes: CanvasNode[] = [
  {
    id: 'node-account-health',
    title: 'Q3 Account Health',
    type: 'dataset',
    position: { x: 100, y: 140, width: 280, height: 160 },
    dataPayload: {
      mimeType: 'text/csv',
      contentSummary: 'account,arr,health_signal,risk_score\nNorthstar Health,480000,Weekly active users down 38%,92\nAcme Logistics,275000,Champion departure,78\nBrightline Media,190000,Budget scrutiny,54',
    },
  },
  {
    id: 'node-customer-usage',
    title: 'Customer Usage',
    type: 'document',
    position: { x: 560, y: 140, width: 280, height: 160 },
    dataPayload: {
      mimeType: 'text/plain',
      contentSummary: 'Northstar Health: weekly active users fell 38% quarter over quarter; reporting dashboard adoption is below target.\nAcme Logistics: core workflows remain active, but the new admin has not completed enablement.\nBrightline Media: seat utilization is stable while usage is concentrated in one team.',
    },
  },
  {
    id: 'node-renewal-calendar',
    title: 'Renewal Calendar',
    type: 'dataset',
    position: { x: 1020, y: 140, width: 280, height: 160 },
    dataPayload: {
      mimeType: 'text/csv',
      contentSummary: 'account,renewal_date,owner\nNorthstar Health,2026-09-15,Jordan Lee\nAcme Logistics,2026-10-01,Maya Patel\nBrightline Media,2027-01-20,Alex Chen',
    },
  },
  {
    id: 'node-customer-feedback',
    title: 'Customer Feedback',
    type: 'document',
    position: { x: 260, y: 380, width: 280, height: 160 },
    dataPayload: {
      mimeType: 'text/plain',
      contentSummary: 'Northstar Health asked for a recovery plan after a slow rollout and wants executive visibility.\nAcme Logistics confirmed the original champion left; the replacement has not joined a renewal conversation.\nBrightline Media requested a reduced-seat proposal before budget approval.',
    },
  },
  {
    id: 'node-csm-notes',
    title: 'CSM Notes',
    type: 'document',
    position: { x: 820, y: 380, width: 280, height: 160 },
    dataPayload: {
      mimeType: 'text/plain',
      contentSummary: 'Jordan Lee: book an executive adoption review for Northstar Health this week.\nMaya Patel: map Acme Logistics buying committee and identify a new sponsor.\nAlex Chen: prepare a value-backed seat scenario for Brightline Media.',
    },
  },
];

const demoStarterEdges: CanvasEdge[] = [
  {
    id: 'edge-account-usage',
    sourceNodeId: 'node-account-health',
    targetNodeId: 'node-customer-usage',
    relationType: 'explicit_connector',
    label: 'Health signals',
  },
  {
    id: 'edge-usage-calendar', sourceNodeId: 'node-customer-usage', targetNodeId: 'node-renewal-calendar', relationType: 'explicit_connector', label: 'Prioritize by timing',
  },
  {
    id: 'edge-calendar-feedback', sourceNodeId: 'node-renewal-calendar', targetNodeId: 'node-customer-feedback', relationType: 'explicit_connector', label: 'Renewal evidence',
  },
  {
    id: 'edge-feedback-csm', sourceNodeId: 'node-customer-feedback', targetNodeId: 'node-csm-notes', relationType: 'explicit_connector', label: 'Recovery ownership',
  },
  {
    id: 'edge-health-csm', sourceNodeId: 'node-account-health', targetNodeId: 'node-csm-notes', relationType: 'explicit_connector', label: 'Account action',
  },
];

const WORKSPACE_STORAGE_KEY = 'intent-canvas.workspace';
const memoryStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

const CUSTOM_PRIMITIVES_KEY = 'intent-canvas.custom-primitives';

function readCustomPrimitives(): CustomPrimitiveRecord[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const value: unknown = JSON.parse(localStorage.getItem(CUSTOM_PRIMITIVES_KEY) || '[]');
    if (!Array.isArray(value)) return [];
    return value.filter((primitive): primitive is CustomPrimitiveRecord => isValidPrimitive(primitive)).slice(0, 30);
  } catch {
    return [];
  }
}

function isValidPrimitive(value: unknown): value is CustomPrimitiveRecord {
  if (!value || typeof value !== 'object') return false;
  const primitive = value as Partial<CustomPrimitiveRecord>;
  const allowedTypes = ['document', 'dataset', 'example', 'instruction', 'output', 'custom_primitive'];
  return typeof primitive.primitiveId === 'string' && /^[A-Za-z0-9_.:-]{1,120}$/.test(primitive.primitiveId) &&
    typeof primitive.title === 'string' && primitive.title.length <= 160 &&
    (!primitive.description || (typeof primitive.description === 'string' && primitive.description.length <= 500)) &&
    (!primitive.inputNodeTypes || (Array.isArray(primitive.inputNodeTypes) && primitive.inputNodeTypes.length <= 6 && primitive.inputNodeTypes.every(type => allowedTypes.includes(type)))) &&
    (!primitive.createdAt || (typeof primitive.createdAt === 'number' && Number.isFinite(primitive.createdAt) && primitive.createdAt >= 0)) &&
    JSON.stringify(value).length <= 10_000;
}

function persistCustomPrimitives(primitives: CustomPrimitiveRecord[]) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(CUSTOM_PRIMITIVES_KEY, JSON.stringify(primitives.slice(-30)));
  } catch {
    // Browser storage can be unavailable in private browsing; in-memory state remains usable.
  }
}

function isStoredNode(value: unknown): value is CanvasNode {
  if (!value || typeof value !== 'object') return false;
  const node = value as Partial<CanvasNode>;
  const payload = node.dataPayload;
  const position = node.position;
  let parsedMetricsWithinLimit = true;
  const parsedMetricsIsRecord = !payload?.parsedMetrics || (typeof payload.parsedMetrics === 'object' && !Array.isArray(payload.parsedMetrics));
  try {
    parsedMetricsWithinLimit = !payload?.parsedMetrics || JSON.stringify(payload.parsedMetrics).length <= 50_000;
  } catch {
    parsedMetricsWithinLimit = false;
  }
  return typeof node.id === 'string' && /^[A-Za-z0-9_.:-]{1,120}$/.test(node.id) && typeof node.title === 'string' && node.title.length <= 300 &&
    ['document', 'dataset', 'example', 'instruction', 'output', 'custom_primitive'].includes(node.type ?? '') &&
    Boolean(position && [position.x, position.y].every(value => typeof value === 'number' && Number.isFinite(value)) && typeof position.width === 'number' && Number.isFinite(position.width) && position.width > 0 && position.width <= 2000 && typeof position.height === 'number' && Number.isFinite(position.height) && position.height > 0 && position.height <= 2000) &&
    Boolean(payload && typeof payload.mimeType === 'string' && payload.mimeType.length <= 160 && typeof payload.contentSummary === 'string' && payload.contentSummary.length <= 10_000 && (!payload.rawReference || (typeof payload.rawReference === 'string' && payload.rawReference.length <= 500)) && (!payload.previewUrl || (typeof payload.previewUrl === 'string' && payload.previewUrl.startsWith('data:image/') && payload.previewUrl.length <= 600_000)) && parsedMetricsIsRecord && parsedMetricsWithinLimit);
}

function isStoredEdge(value: unknown, nodeIds: Set<string>): value is CanvasEdge {
  if (!value || typeof value !== 'object') return false;
  const edge = value as Partial<CanvasEdge>;
  return typeof edge.id === 'string' && /^[A-Za-z0-9_.:-]{1,120}$/.test(edge.id) && typeof edge.sourceNodeId === 'string' && nodeIds.has(edge.sourceNodeId) &&
    typeof edge.targetNodeId === 'string' && nodeIds.has(edge.targetNodeId) && edge.sourceNodeId !== edge.targetNodeId &&
    ['explicit_connector', 'spatial_proximity', 'enclosure_group', 'semantic_match'].includes(edge.relationType ?? '') &&
    (!edge.label || (typeof edge.label === 'string' && edge.label.length <= 300)) &&
    (edge.distancePixels === undefined || (typeof edge.distancePixels === 'number' && Number.isFinite(edge.distancePixels) && edge.distancePixels >= 0 && edge.distancePixels <= 100_000));
}

function mergePersistedWorkspace(current: CanvasState, persisted: unknown): CanvasState {
  if (!persisted || typeof persisted !== 'object') return current;
  const stored = persisted as Partial<CanvasState>;
  if (!Array.isArray(stored.nodes)) return current;
  const storedNodeIds = new Set<string>();
  const storedNodes = stored.nodes.filter((node): node is CanvasNode => isStoredNode(node) && !storedNodeIds.has(node.id) && Boolean(storedNodeIds.add(node.id))).slice(0, 30);
  if (stored.nodes.length && !storedNodes.length) return current;
  const legacyStarterPositions: Record<string, CanvasNode['position']> = {
    'node-customer-txt': { x: 560, y: 140, width: 280, height: 160 },
    'node-example-ui': { x: 1020, y: 140, width: 280, height: 160 },
  };
  const normalizedNodes = storedNodes.map(node => legacyStarterPositions[node.id] && node.position.x === (node.id === 'node-customer-txt' ? 520 : 940) ? { ...node, position: legacyStarterPositions[node.id] } : node);
  const nodeIds = new Set(normalizedNodes.map(node => node.id));
  const edgeIds = new Set<string>();
  const edgePairs = new Set<string>();
  const storedEdges = Array.isArray(stored.edges) ? stored.edges.filter((edge): edge is CanvasEdge => {
    if (!isStoredEdge(edge, nodeIds) || edgeIds.has(edge.id)) return false;
    const pair = [edge.sourceNodeId, edge.targetNodeId].sort().join('|');
    if (edgePairs.has(pair)) return false;
    edgeIds.add(edge.id);
    edgePairs.add(pair);
    return true;
  }).slice(0, 60) : [];
  return {
    ...current,
    nodes: normalizedNodes,
    edges: storedEdges,
    activeIntentPrompt: typeof stored.activeIntentPrompt === 'string' ? stored.activeIntentPrompt.slice(0, 3000) : current.activeIntentPrompt,
    customPrimitives: Array.isArray(stored.customPrimitives) ? stored.customPrimitives.filter(isValidPrimitive).slice(0, 30) : current.customPrimitives,
    viewMode: stored.viewMode === 'interactive' || stored.viewMode === 'showcase' ? stored.viewMode : current.viewMode,
  };
}

const NODE_GAP = 16;

const primitiveNodes = (primitives: CustomPrimitiveRecord[]): CanvasNode[] => primitives.map((primitive, index) => ({
  id: primitive.primitiveId,
  title: primitive.title,
  type: 'custom_primitive',
  position: { x: 100 + index * 316, y: 360, width: 300, height: 160 },
  dataPayload: { mimeType: 'application/x-intent-primitive', contentSummary: primitive.description ?? 'Saved custom computational primitive.' },
}));

function overlaps(
  first: { x: number; y: number; width: number; height: number },
  second: { x: number; y: number; width: number; height: number },
) {
  return first.x < second.x + second.width + NODE_GAP &&
    first.x + first.width + NODE_GAP > second.x &&
    first.y < second.y + second.height + NODE_GAP &&
    first.y + first.height + NODE_GAP > second.y;
}

function freePosition(nodes: CanvasNode[], node: CanvasNode): CanvasNode['position'] {
  const start = node.position;
  for (let index = 0; index < 1000; index += 1) {
    const candidate = {
      ...start,
      x: start.x + (index % 10) * (start.width + NODE_GAP),
      y: start.y + Math.floor(index / 10) * (start.height + NODE_GAP),
    };
    if (!nodes.some((other) => overlaps(candidate, other.position))) return candidate;
  }
  const lowestNode = nodes.reduce((max, other) => Math.max(max, other.position.y + other.position.height), start.y);
  return { ...start, x: start.x, y: lowestNode + NODE_GAP };
}

export const useCanvasStore = create<CanvasState>()(persist((set) => ({
  nodes: [...demoStarterNodes, ...primitiveNodes(readCustomPrimitives())],
  edges: demoStarterEdges,
  pan: { x: 0, y: 0 },
  zoom: 1,
  selectedNodeIds: [],
  activeIntentPrompt: '',
  isEvaluatingPlan: false,
  isExecutingPlan: false,
  activePlan: null,
  executionResult: null,
  customPrimitives: readCustomPrimitives(),
  viewMode: 'showcase',
  resetVersion: 0,

  setPan: (pan) => set({
    pan: { x: Number.isFinite(pan.x) ? pan.x : 0, y: Number.isFinite(pan.y) ? pan.y : 0 },
  }),
  setZoom: (zoom) => set({ zoom: Number.isFinite(zoom) ? Math.min(Math.max(zoom, 0.5), 2) : 1 }),
  setViewMode: (viewMode) => set({ viewMode }),
  addNode: (node) => set((state) => {
    const { x, y, width, height } = node.position;
    if (!node.id || state.nodes.length >= 30 || state.nodes.some((existing) => existing.id === node.id) || ![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return state;
    return { nodes: [...state.nodes, { ...node, position: freePosition(state.nodes, node) }] };
  }),
  removeNode: (id) => set((state) => ({
    nodes: state.nodes.filter(node => node.id !== id),
    edges: state.edges.filter(edge => edge.sourceNodeId !== id && edge.targetNodeId !== id),
    selectedNodeIds: state.selectedNodeIds.filter(selectedId => selectedId !== id),
    customPrimitives: (() => {
      const removedNode = state.nodes.find(node => node.id === id);
      const remainingPrimitives = removedNode?.type === 'custom_primitive'
        ? state.customPrimitives.filter(primitive => primitive.primitiveId !== id)
        : state.customPrimitives;
      if (removedNode?.type === 'custom_primitive') persistCustomPrimitives(remainingPrimitives);
      return remainingPrimitives;
    })(),
  })),
  updateNodePosition: (id, x, y) => {
    let result: 'updated' | 'collision' | 'invalid' | 'missing' = 'missing';
    set((state) => {
      const moving = state.nodes.find((node) => node.id === id);
      if (!moving) return state;
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        result = 'invalid';
        return state;
      }
      const nextPosition = { ...moving.position, x, y };
      if (state.nodes.some((node) => node.id !== id && overlaps(nextPosition, node.position))) {
        result = 'collision';
        return state;
      }
      result = 'updated';
      return { nodes: state.nodes.map((node) => node.id === id ? { ...node, position: nextPosition } : node) };
    });
    return result;
  },
  addEdge: (sourceNodeId, targetNodeId, relationType = 'explicit_connector', label = 'Spatial Relation') => set((state) => {
    if (state.edges.length >= 60 || sourceNodeId === targetNodeId || !state.nodes.some((node) => node.id === sourceNodeId) || !state.nodes.some((node) => node.id === targetNodeId) || !['explicit_connector', 'spatial_proximity', 'enclosure_group', 'semantic_match'].includes(relationType) || typeof label !== 'string' || label.length > 300) return state;
    const exists = state.edges.some(
      (e) => (e.sourceNodeId === sourceNodeId && e.targetNodeId === targetNodeId) ||
             (e.sourceNodeId === targetNodeId && e.targetNodeId === sourceNodeId)
    );
    if (exists) return state;
    return {
      edges: [
        ...state.edges,
        {
          id: createId('edge'),
          sourceNodeId,
          targetNodeId,
           relationType,
           label: label.slice(0, 300),
        },
      ],
    };
  }),
  removeEdge: (edgeId) => set((state) => ({
    edges: state.edges.filter((e) => e.id !== edgeId),
  })),
  selectNode: (id, multi) => set((state) => {
    if (!state.nodes.some((node) => node.id === id)) return state;
    return {
    selectedNodeIds: multi ? (state.selectedNodeIds.includes(id) ? state.selectedNodeIds.filter((i) => i !== id) : [...state.selectedNodeIds, id]) : [id],
    };
  }),
  clearSelection: () => set({ selectedNodeIds: [] }),
  setActiveIntentPrompt: (activeIntentPrompt) => set({ activeIntentPrompt: activeIntentPrompt.slice(0, 3000) }),
  setIsEvaluatingPlan: (isEvaluatingPlan) => set({ isEvaluatingPlan }),
  setIsExecutingPlan: (isExecutingPlan) => set({ isExecutingPlan }),
  setActivePlan: (activePlan) => set({ activePlan }),
  setExecutionResult: (executionResult) => set({ executionResult }),
  addCustomPrimitive: (primitive) => set((state) => {
    if (!isValidPrimitive(primitive)) return state;
    if (state.customPrimitives.some(existing => existing.primitiveId === primitive.primitiveId)) return state;
    const customPrimitives = [...state.customPrimitives, primitive].slice(-30);
    persistCustomPrimitives(customPrimitives);
    return { customPrimitives };
  }),
  upsertOutputNode: (summary, payload) => {
    let inserted = true;
    set((state) => {
      const existing = state.nodes.find(node => node.type === 'output');
      const title = payload.renewalRescue ? 'Renewal Rescue Results' : 'Computed Intent Result';
      if (existing) return { nodes: state.nodes.map(node => node.id === existing.id ? { ...node, title, dataPayload: { ...node.dataPayload, contentSummary: summary, parsedMetrics: payload } } : node) };
      if (state.nodes.length >= 30) {
        inserted = false;
        return state;
      }
      const position = freePosition(state.nodes, { id: 'result', title: 'Computed Intent Result', type: 'output', position: { x: 420, y: 360, width: 300, height: 180 }, dataPayload: { mimeType: 'application/json', contentSummary: summary } });
       return { nodes: [...state.nodes, { id: createId('node_output'), title, type: 'output', position, dataPayload: { mimeType: 'application/json', contentSummary: summary, parsedMetrics: payload } }] };
    });
    return inserted;
  },
  resetDemoCanvas: () => set((state) => ({
    nodes: [...demoStarterNodes, ...primitiveNodes(state.customPrimitives)],
    edges: demoStarterEdges,
    pan: { x: 0, y: 0 },
    zoom: 1,
    selectedNodeIds: [],
    activePlan: null,
    executionResult: null,
    activeIntentPrompt: '',
    isEvaluatingPlan: false,
    isExecutingPlan: false,
    resetVersion: state.resetVersion + 1,
  })),
}), {
  name: WORKSPACE_STORAGE_KEY,
  storage: createJSONStorage(() => typeof localStorage === 'undefined' ? memoryStorage : localStorage),
  partialize: (state) => ({
    nodes: state.nodes.map(node => ({
      ...node,
      dataPayload: (({ previewUrl: _previewUrl, ...payload }) => payload)(node.dataPayload),
    })),
    edges: state.edges,
    activeIntentPrompt: state.activeIntentPrompt,
    customPrimitives: state.customPrimitives,
    viewMode: state.viewMode,
  }),
  merge: (persisted, current) => mergePersistedWorkspace(current, persisted),
}));
