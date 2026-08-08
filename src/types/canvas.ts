export type NodeType = 'document' | 'dataset' | 'example' | 'instruction' | 'output' | 'custom_primitive';

export type RelationType = 'explicit_connector' | 'spatial_proximity' | 'enclosure_group';

export interface CanvasNode {
  id: string;
  title: string;
  type: NodeType;
  position: { x: number; y: number; width: number; height: number };
  dataPayload: {
    mimeType: string;
    contentSummary: string;
    rawReference?: string;
    previewUrl?: string;
    parsedMetrics?: Record<string, unknown>;
  };
}

export interface CanvasEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationType: RelationType;
  label?: string;
  distancePixels?: number;
}

export interface PlanStep {
  stepId: number;
  title: string;
  description: string;
  requiredCapability: 'DataPatternFinder' | 'DocumentSynthesizer' | 'MeetingInsightExtractor' | 'UIConceptGenerator';
  inputNodeIds: string[];
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export interface ExecutionPlan {
  planId: string;
  goalSummary: string;
  confidenceScore: number;
  planningMode?: 'provider' | 'local_fallback';
  steps: PlanStep[];
  disambiguation?: {
    requiresUserClarification: boolean;
    reason: string;
    options: { optionId: string; label: string; actionHint: string }[];
  };
}

export interface ExecutionResult {
  executionStatus: 'completed' | 'disambiguation_required';
  planId?: string;
  goalSummary?: string;
  confidenceScore?: number;
  executedSteps?: PlanStep[];
  outputPayload?: Record<string, unknown>;
  disambiguation?: ExecutionPlan['disambiguation'];
}

export type AdaptationOptionId = 'opt_churn' | 'opt_trend';

export interface AdaptationRequest {
  adaptationOptionId: AdaptationOptionId;
  filterModifier: 'enterprise' | 'trend';
}

export interface CapabilityOutputPayload {
  dataPattern?: Record<string, unknown>;
  documentSynthesis?: Record<string, unknown>;
  meetingInsights?: Record<string, unknown>;
  uiConcept?: Record<string, unknown>;
}

export interface CustomPrimitiveRecord {
  primitiveId: string;
  title: string;
  description?: string;
  inputNodeTypes?: NodeType[];
  createdAt?: number;
}
