import axios from 'axios'
import { APP_CONFIG, apiUrl } from './config'
import { CanvasNode, CustomPrimitiveRecord, ExecutionPlan, ExecutionResult, NodeType, RenewalRescuePayload, RelationType } from './types/canvas'

const MAX_SHORT_STRING = 500
const MAX_LONG_STRING = 3000
const MAX_OUTPUT_DEPTH = 5
const MAX_OUTPUT_BYTES = 100_000
const MAX_SVG_BYTES = 50_000
const MAX_PRIMITIVE_BYTES = 10_000
const isBoundedString = (value: unknown, max = MAX_SHORT_STRING): value is string => typeof value === 'string' && value.length <= max
const isRequiredString = (value: unknown, max = MAX_SHORT_STRING): value is string => isBoundedString(value, max) && value.trim().length > 0

function isDisambiguation(value: unknown): value is NonNullable<ExecutionPlan['disambiguation']> {
  if (!value || typeof value !== 'object') return false
  const gate = value as Partial<NonNullable<ExecutionPlan['disambiguation']>>
  return typeof gate.requiresUserClarification === 'boolean' &&
    isBoundedString(gate.reason, MAX_LONG_STRING) &&
    Array.isArray(gate.options) &&
     gate.options.length > 0 && gate.options.length <= 2 &&
     gate.options.every((option) => option && ['opt_churn', 'opt_trend'].includes(option.optionId ?? '') && isBoundedString(option.label) && isBoundedString(option.actionHint, MAX_LONG_STRING))
}

function isSafePayload(value: unknown, depth = 0): boolean {
  if (depth > MAX_OUTPUT_DEPTH) return false
  if (value == null || typeof value === 'boolean' || typeof value === 'number') return typeof value !== 'number' || Number.isFinite(value)
  if (typeof value === 'string') return value.length <= MAX_LONG_STRING
  if (Array.isArray(value)) return value.length <= 100 && value.every((item) => isSafePayload(item, depth + 1))
  if (typeof value !== 'object') return false
  const entries = Object.entries(value)
  return entries.length <= 100 && entries.every(([key, item]) => isBoundedString(key) && isSafePayload(item, depth + 1))
}

function isStringArray(value: unknown, maxLength = 30): value is string[] {
  return Array.isArray(value) && value.length <= maxLength && value.every(item => isBoundedString(item, MAX_LONG_STRING))
}

function hasStringFields(value: unknown, fields: string[]): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return fields.every(field => isBoundedString(record[field], MAX_LONG_STRING))
}

function isRenewalRescuePayload(value: unknown): value is RenewalRescuePayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const payload = value as Partial<RenewalRescuePayload>
  if (!isBoundedString(payload.executiveSummary, MAX_LONG_STRING) || !Array.isArray(payload.riskRecords) || payload.riskRecords.length > 100) return false
  return payload.riskRecords.every((record) => {
    if (!record || typeof record !== 'object' || Array.isArray(record)) return false
    const item = record as unknown as Record<string, unknown>
    return isBoundedString(item.account, MAX_LONG_STRING) &&
      typeof item.ARR === 'number' && Number.isFinite(item.ARR) && item.ARR >= 0 &&
      isBoundedString(item.renewalDate, MAX_LONG_STRING) &&
       typeof item.riskScore === 'number' && Number.isInteger(item.riskScore) && item.riskScore >= 0 && item.riskScore <= 100 &&
       ['supplied', 'derived'].includes(item.riskScoreSource as string) &&
      ['critical', 'high', 'medium', 'low'].includes(item.riskLevel as string) &&
       isStringArray(item.evidence, 10) && ['driver', 'recommendedAction', 'owner', 'deadline'].every((field) => isBoundedString(item[field], MAX_LONG_STRING))
  })
}

function isCapabilityPayload(key: string, value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const payload = value as Record<string, unknown>
  if (key === 'dataPattern') return isBoundedString(payload.summary, MAX_LONG_STRING) && typeof payload.anomalyDetected === 'boolean' && typeof payload.chartSvg === 'string' && new TextEncoder().encode(payload.chartSvg).length <= MAX_SVG_BYTES && isStringArray(payload.insights, 100) && (!payload.anomalyDetected || hasStringFields(payload.anomalyDetails, ['month', 'metric', 'deviationPercent', 'probableCause']))
  if (key === 'documentSynthesis') return isBoundedString(payload.synthesisTitle, MAX_LONG_STRING) && isStringArray(payload.keyTakeaways, 100) && Array.isArray(payload.crossDocumentConnections) && payload.crossDocumentConnections.length <= 100 && payload.crossDocumentConnections.every(item => hasStringFields(item, ['sourceDoc', 'targetDoc', 'connection'])) && isStringArray(payload.contradictions, 100)
  if (key === 'meetingInsights') return isBoundedString(payload.summary, MAX_LONG_STRING) && isStringArray(payload.decisions, 100) && isStringArray(payload.riskFactors, 100) && Array.isArray(payload.actionItems) && payload.actionItems.length <= 100 && payload.actionItems.every(item => hasStringFields(item, ['task', 'owner', 'deadline']))
  if (key === 'uiConcept') return isBoundedString(payload.conceptTitle, MAX_LONG_STRING) && isBoundedString(payload.referenceBasis, MAX_LONG_STRING) && isStringArray(payload.componentHierarchy, 100) && isStringArray(payload.stylingDirectives, 100) && hasStringFields(payload.themePalette, ['background', 'surface', 'accent', 'border'])
  if (key === 'renewalRescue') return isRenewalRescuePayload(value)
  return false
}

export const capabilityOutputKeys = {
  DataPatternFinder: 'dataPattern',
  DocumentSynthesizer: 'documentSynthesis',
  MeetingInsightExtractor: 'meetingInsights',
  UIConceptGenerator: 'uiConcept',
  RenewalRescue: 'renewalRescue',
} as const

function isPlanStep(value: unknown): value is ExecutionPlan['steps'][number] {
  if (!value || typeof value !== 'object') return false
  const step = value as Partial<ExecutionPlan['steps'][number]>
  return typeof step.stepId === 'number' && Number.isInteger(step.stepId) && step.stepId > 0 && isBoundedString(step.title) && isBoundedString(step.description, MAX_LONG_STRING) &&
     ['DataPatternFinder', 'DocumentSynthesizer', 'MeetingInsightExtractor', 'UIConceptGenerator', 'RenewalRescue'].includes(step.requiredCapability ?? '') &&
     Array.isArray(step.inputNodeIds) && step.inputNodeIds.length > 0 && step.inputNodeIds.length <= 30 && step.inputNodeIds.every((id) => isBoundedString(id)) &&
    ['pending', 'running', 'completed', 'failed'].includes(step.status ?? '')
}

function isPlanContextItem(value: unknown): value is ExecutionPlan['context'][number] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const item = value as Partial<ExecutionPlan['context'][number]>
  return isBoundedString(item.nodeId) && isRequiredString(item.purpose, MAX_LONG_STRING) && ['explicit_connector', 'spatial_proximity', 'enclosure_group', 'semantic_match', 'standalone'].includes(item.spatialBasis ?? '')
}

function isWorkflowStage(value: unknown): value is ExecutionPlan['workflowStages'][number] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const stage = value as Partial<ExecutionPlan['workflowStages'][number]>
  return typeof stage.stageId === 'number' && Number.isInteger(stage.stageId) && stage.stageId > 0 && isRequiredString(stage.title) && isRequiredString(stage.description, MAX_LONG_STRING) && isRequiredString(stage.output, MAX_LONG_STRING)
}

export const intentApi = axios.create({
  baseURL: APP_CONFIG.apiBaseUrl,
  timeout: APP_CONFIG.apiTimeoutMs,
  maxContentLength: 200_000,
  maxBodyLength: 10_000_000,
  headers: { 'Content-Type': 'application/json' },
})

if (APP_CONFIG.apiAccessToken) {
  intentApi.defaults.headers.common.Authorization = `Bearer ${APP_CONFIG.apiAccessToken}`
  intentApi.defaults.headers.common['X-Intent-Canvas-Key'] = APP_CONFIG.apiAccessToken
}

export const intentPath = (path: string) => apiUrl(path)

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED') return 'The request timed out. Please try again.'
    if (!error.response) return 'The intent service is unavailable. Check that the backend is running.'
    const message = error.response.data?.error?.message ?? error.response.data?.message
     if (typeof message === 'string') return message.slice(0, MAX_SHORT_STRING)
  }
  return fallback
}

export function isCustomPrimitiveRecord(value: unknown): value is CustomPrimitiveRecord {
  if (!value || typeof value !== 'object') return false
  const primitive = value as Partial<CustomPrimitiveRecord>
  const allowedTypes: NodeType[] = ['document', 'dataset', 'example', 'instruction', 'output', 'custom_primitive']
  return typeof primitive.primitiveId === 'string' && /^[A-Za-z0-9_.:-]{1,120}$/.test(primitive.primitiveId) &&
    isBoundedString(primitive.title, 160) && (!primitive.description || isBoundedString(primitive.description, 500)) &&
    (!primitive.inputNodeTypes || (Array.isArray(primitive.inputNodeTypes) && primitive.inputNodeTypes.length <= 6 && primitive.inputNodeTypes.every(type => allowedTypes.includes(type)))) &&
    (!primitive.createdAt || (typeof primitive.createdAt === 'number' && Number.isFinite(primitive.createdAt) && primitive.createdAt >= 0)) &&
    new TextEncoder().encode(JSON.stringify(value)).length <= MAX_PRIMITIVE_BYTES
}

export function isRequestCancelled(error: unknown): boolean {
  return axios.isCancel(error) || (typeof DOMException !== 'undefined' && error instanceof DOMException && error.name === 'AbortError')
}

export interface ContextRelationSuggestion {
  sourceNodeId: string
  targetNodeId: string
  relationType: 'semantic_match'
  label: string
  score: number
  evidence: string[]
}

function isContextRelationSuggestion(value: unknown, nodeIds: Set<string>): value is ContextRelationSuggestion {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const relation = value as Partial<ContextRelationSuggestion> & { relationType?: RelationType }
  return typeof relation.sourceNodeId === 'string' && nodeIds.has(relation.sourceNodeId) &&
    typeof relation.targetNodeId === 'string' && nodeIds.has(relation.targetNodeId) && relation.sourceNodeId !== relation.targetNodeId &&
    relation.relationType === 'semantic_match' &&
    isBoundedString(relation.label, 300) &&
    typeof relation.score === 'number' && Number.isFinite(relation.score) && relation.score >= 0 && relation.score <= 1 &&
    Array.isArray(relation.evidence) && relation.evidence.length <= 10 && relation.evidence.every(item => isBoundedString(item, MAX_LONG_STRING))
}

export async function suggestContextRelations(nodes: CanvasNode[], signal: AbortSignal): Promise<ContextRelationSuggestion[]> {
  const nodeIds = new Set(nodes.map(node => node.id))
  const requestBody = {
    nodes: nodes.map(({ id, title, type, position, dataPayload }) => ({
      id, title, type, position,
      dataPayload: { mimeType: dataPayload.mimeType, contentSummary: dataPayload.contentSummary, rawReference: dataPayload.rawReference },
    })),
  }
  if (new TextEncoder().encode(JSON.stringify(requestBody)).length > 400_000) throw new Error('The relation context is too large to analyze.')
  const response = await intentApi.post(intentPath('/api/context/relations'), requestBody, { signal })
  const data = response.data?.data
  const suggestions = Array.isArray(data) ? data : data && Array.isArray(data.relations) ? data.relations : []
  return suggestions.filter((suggestion: unknown): suggestion is ContextRelationSuggestion => isContextRelationSuggestion(suggestion, nodeIds)).slice(0, 60)
}

export function isExecutionPlan(value: unknown): value is ExecutionPlan {
  if (!value || typeof value !== 'object') return false
  const plan = value as Partial<ExecutionPlan>
  const confidenceScore = plan.confidenceScore
  const steps = Array.isArray(plan.steps) ? plan.steps : []
  const stepIds = steps.map(step => typeof step === 'object' && step !== null ? (step as { stepId?: unknown }).stepId : undefined)
  return (!plan.planningMode || plan.planningMode === 'provider' || plan.planningMode === 'local_fallback') && (!plan.planningNotice || isBoundedString(plan.planningNotice, MAX_SHORT_STRING)) &&
     isBoundedString(plan.planId) &&
     isBoundedString(plan.goalSummary, MAX_LONG_STRING) &&
     Array.isArray(plan.context) && plan.context.length <= 30 && plan.context.every(isPlanContextItem) &&
     isStringArray(plan.assumptions, 30) && isStringArray(plan.constraints, 30) && isStringArray(plan.expectedOutputs, 30) && isStringArray(plan.verification, 30) &&
      Array.isArray(plan.workflowStages) && plan.workflowStages.length <= 10 && plan.workflowStages.length > 0 && plan.workflowStages.every(isWorkflowStage) && plan.workflowStages.every((stage, index) => stage.stageId === index + 1) &&
    typeof confidenceScore === 'number' && Number.isFinite(confidenceScore) &&
    confidenceScore >= 0 && confidenceScore <= 1 &&
     Array.isArray(plan.steps) && plan.steps.length <= 5 && plan.steps.every(isPlanStep) && new Set(stepIds).size === stepIds.length &&
     (plan.steps.length > 0 || Boolean(plan.disambiguation?.requiresUserClarification)) && (!plan.disambiguation || isDisambiguation(plan.disambiguation)) &&
     !(plan.disambiguation?.requiresUserClarification && plan.steps.length > 0)
}

export function isExecutionResult(value: unknown): value is ExecutionResult {
  if (!value || typeof value !== 'object') return false
  const result = value as Partial<ExecutionResult>
  let outputWithinLimit = true
  if (result.executionStatus === 'completed' && result.outputPayload) {
    try {
      outputWithinLimit = new TextEncoder().encode(JSON.stringify(result.outputPayload)).length <= MAX_OUTPUT_BYTES
    } catch {
      outputWithinLimit = false
    }
  }
  const executedCapabilities = new Set((result.executedSteps ?? []).map((step) => step.requiredCapability))
  const executedStepIds = (result.executedSteps ?? []).map((step) => step.stepId)
  const executedStepsAreSequential = (result.executedSteps ?? []).every((step, index) => step.stepId === index + 1)
  const outputKeysMatchSteps = result.executionStatus !== 'completed' || (
    executedCapabilities.size > 0 && executedCapabilities.size === (result.executedSteps ?? []).length && executedStepsAreSequential && new Set(executedStepIds).size === executedStepIds.length &&
    Object.keys(result.outputPayload ?? {}).every((key) => Object.values(capabilityOutputKeys).includes(key as typeof capabilityOutputKeys[keyof typeof capabilityOutputKeys])) &&
    Object.keys(result.outputPayload ?? {}).every((key) => executedCapabilities.has(
      (Object.entries(capabilityOutputKeys).find(([, outputKey]) => outputKey === key)?.[0] ?? '') as ExecutionPlan['steps'][number]['requiredCapability'],
    )) &&
    [...executedCapabilities].every((capability) => Object.prototype.hasOwnProperty.call(result.outputPayload ?? {}, capabilityOutputKeys[capability as keyof typeof capabilityOutputKeys]))
  )
  return (result.executionStatus === 'completed' || result.executionStatus === 'disambiguation_required') &&
    (result.executionStatus === 'completed' ?
      isBoundedString(result.planId) && isBoundedString(result.goalSummary, MAX_LONG_STRING) &&
      typeof result.confidenceScore === 'number' && Number.isFinite(result.confidenceScore) && result.confidenceScore >= 0 && result.confidenceScore <= 1 &&
      Array.isArray(result.executedSteps) && result.executedSteps.length <= 5 && result.executedSteps.every(isPlanStep) &&
       typeof result.outputPayload === 'object' && result.outputPayload !== null && !Array.isArray(result.outputPayload) && Object.keys(result.outputPayload).length > 0 && outputWithinLimit && outputKeysMatchSteps && isSafePayload(result.outputPayload) && Object.entries(result.outputPayload).every(([key, payload]) => isCapabilityPayload(key, payload)) : isDisambiguation(result.disambiguation)) &&
    (!result.disambiguation || isDisambiguation(result.disambiguation))
}
