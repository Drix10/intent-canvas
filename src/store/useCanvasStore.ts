import { create } from 'zustand';
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
  updateNodePosition: (id: string, x: number, y: number) => 'updated' | 'collision' | 'invalid' | 'missing';
  addEdge: (sourceId: string, targetId: string) => void;
  removeEdge: (edgeId: string) => void;
  selectNode: (id: string, multi?: boolean) => void;
  clearSelection: () => void;
  setActiveIntentPrompt: (prompt: string) => void;
  setIsEvaluatingPlan: (evaluating: boolean) => void;
  setIsExecutingPlan: (executing: boolean) => void;
  setActivePlan: (plan: ExecutionPlan | null) => void;
  setExecutionResult: (result: ExecutionResult | null) => void;
  addCustomPrimitive: (primitive: CustomPrimitiveRecord) => void;
  upsertOutputNode: (summary: string, payload: Record<string, unknown>) => void;
  resetDemoCanvas: () => void;
}

const initialDemoNodes: CanvasNode[] = [
  {
    id: 'node-sales-csv',
    title: 'Sales_Q3_Metrics.csv',
    type: 'dataset',
    position: { x: 100, y: 140, width: 280, height: 160 },
    dataPayload: {
      mimeType: 'text/csv',
      contentSummary: 'Quarterly Sales Records (May - Oct). Contains revenue, customer ID, tier, and transaction timestamps.',
    },
  },
  {
    id: 'node-customer-txt',
    title: 'Customer_Feedback.txt',
    type: 'document',
    position: { x: 440, y: 140, width: 280, height: 160 },
    dataPayload: {
      mimeType: 'text/plain',
      contentSummary: 'Qualitative Customer Feedback logs. Contains churn notes, gateway migration complaints, and enterprise NRR notes.',
    },
  },
  {
    id: 'node-example-ui',
    title: 'Executive_Dashboard_Style.png',
    type: 'example',
    position: { x: 780, y: 140, width: 280, height: 160 },
    dataPayload: {
      mimeType: 'image/png',
      contentSummary: 'Design System Reference: Pitch Obsidian palette, hairline mint borders, micro-sparkline charts, and high-contrast typography.',
    },
  },
];

const initialDemoEdges: CanvasEdge[] = [
  {
    id: 'edge-1',
    sourceNodeId: 'node-sales-csv',
    targetNodeId: 'node-customer-txt',
    relationType: 'explicit_connector',
    label: 'Joint Data Analysis',
  },
  {
    id: 'edge-2',
    sourceNodeId: 'node-customer-txt',
    targetNodeId: 'node-example-ui',
    relationType: 'spatial_proximity',
    label: 'Presentation Style',
  },
];

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

export const useCanvasStore = create<CanvasState>((set) => ({
  nodes: initialDemoNodes,
  edges: initialDemoEdges,
  pan: { x: 0, y: 0 },
  zoom: 1,
  selectedNodeIds: [],
  activeIntentPrompt: '',
  isEvaluatingPlan: false,
  isExecutingPlan: false,
  activePlan: null,
  executionResult: null,
  customPrimitives: [],
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
  addEdge: (sourceNodeId, targetNodeId) => set((state) => {
    if (state.edges.length >= 60 || sourceNodeId === targetNodeId || !state.nodes.some((node) => node.id === sourceNodeId) || !state.nodes.some((node) => node.id === targetNodeId)) return state;
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
          relationType: 'explicit_connector',
          label: 'Spatial Relation',
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
  addCustomPrimitive: (primitive) => set((state) => state.customPrimitives.some(existing => existing.primitiveId === primitive.primitiveId) ? state : ({ customPrimitives: [...state.customPrimitives, primitive] })),
  upsertOutputNode: (summary, payload) => set((state) => {
    const existing = state.nodes.find(node => node.type === 'output');
    if (existing) return { nodes: state.nodes.map(node => node.id === existing.id ? { ...node, dataPayload: { ...node.dataPayload, contentSummary: summary, parsedMetrics: payload } } : node) };
    if (state.nodes.length >= 30) return state;
    const position = freePosition(state.nodes, { id: 'result', title: 'Computed Intent Result', type: 'output', position: { x: 420, y: 360, width: 300, height: 180 }, dataPayload: { mimeType: 'application/json', contentSummary: summary } });
    return { nodes: [...state.nodes, { id: createId('node_output'), title: 'Computed Intent Result', type: 'output', position, dataPayload: { mimeType: 'application/json', contentSummary: summary, parsedMetrics: payload } }] };
  }),
  resetDemoCanvas: () => set((state) => ({
    nodes: [...initialDemoNodes, ...primitiveNodes(state.customPrimitives)],
    edges: initialDemoEdges,
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
}));
