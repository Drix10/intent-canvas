import { create } from 'zustand';
import { CanvasNode, CanvasEdge, ExecutionPlan, ExecutionResult } from '../types/canvas';

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
  customPrimitives: any[];

  // Actions
  setPan: (pan: { x: number; y: number }) => void;
  setZoom: (zoom: number) => void;
  addNode: (node: CanvasNode) => void;
  updateNodePosition: (id: string, x: number, y: number) => void;
  addEdge: (sourceId: string, targetId: string) => void;
  removeEdge: (edgeId: string) => void;
  selectNode: (id: string, multi?: boolean) => void;
  clearSelection: () => void;
  setActiveIntentPrompt: (prompt: string) => void;
  setIsEvaluatingPlan: (evaluating: boolean) => void;
  setIsExecutingPlan: (executing: boolean) => void;
  setActivePlan: (plan: ExecutionPlan | null) => void;
  setExecutionResult: (result: ExecutionResult | null) => void;
  addCustomPrimitive: (primitive: any) => void;
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

export const useCanvasStore = create<CanvasState>((set) => ({
  nodes: initialDemoNodes,
  edges: initialDemoEdges,
  pan: { x: 0, y: 0 },
  zoom: 1,
  selectedNodeIds: [],
  activeIntentPrompt: 'Show me why revenue dropped in August and present it like this design system example.',
  isEvaluatingPlan: false,
  isExecutingPlan: false,
  activePlan: null,
  executionResult: null,
  customPrimitives: [],

  setPan: (pan) => set({ pan }),
  setZoom: (zoom) => set({ zoom }),
  addNode: (node) => set((state) => ({ nodes: [...state.nodes, node] })),
  updateNodePosition: (id, x, y) => set((state) => ({
    nodes: state.nodes.map((n) => (n.id === id ? { ...n, position: { ...n.position, x, y } } : n)),
  })),
  addEdge: (sourceNodeId, targetNodeId) => set((state) => ({
    edges: [
      ...state.edges,
      {
        id: `edge_${Date.now()}`,
        sourceNodeId,
        targetNodeId,
        relationType: 'explicit_connector',
        label: 'Spatial Relation',
      },
    ],
  })),
  removeEdge: (edgeId) => set((state) => ({
    edges: state.edges.filter((e) => e.id !== edgeId),
  })),
  selectNode: (id, multi) => set((state) => ({
    selectedNodeIds: multi ? (state.selectedNodeIds.includes(id) ? state.selectedNodeIds.filter((i) => i !== id) : [...state.selectedNodeIds, id]) : [id],
  })),
  clearSelection: () => set({ selectedNodeIds: [] }),
  setActiveIntentPrompt: (activeIntentPrompt) => set({ activeIntentPrompt }),
  setIsEvaluatingPlan: (isEvaluatingPlan) => set({ isEvaluatingPlan }),
  setIsExecutingPlan: (isExecutingPlan) => set({ isExecutingPlan }),
  setActivePlan: (activePlan) => set({ activePlan }),
  setExecutionResult: (executionResult) => set({ executionResult }),
  addCustomPrimitive: (primitive) => set((state) => ({ customPrimitives: [...state.customPrimitives, primitive] })),
  resetDemoCanvas: () => set({
    nodes: initialDemoNodes,
    edges: initialDemoEdges,
    activePlan: null,
    executionResult: null,
    activeIntentPrompt: 'Show me why revenue dropped in August and present it like this design system example.',
  }),
}));
