import axios from 'axios'
import { APP_CONFIG, apiUrl } from './config'
import { ExecutionPlan, ExecutionResult } from './types/canvas'

const MAX_SHORT_STRING = 500
const MAX_LONG_STRING = 3000
const MAX_OUTPUT_DEPTH = 5
const MAX_SVG_BYTES = 50_000
const isBoundedString = (value: unknown, max = MAX_SHORT_STRING): value is string => typeof value === 'string' && value.length <= max

function isDisambiguation(value: unknown): value is NonNullable<ExecutionPlan['disambiguation']> {
  if (!value || typeof value !== 'object') return false
  const gate = value as Partial<NonNullable<ExecutionPlan['disambiguation']>>
  return typeof gate.requiresUserClarification === 'boolean' &&
    isBoundedString(gate.reason, MAX_LONG_STRING) &&
    Array.isArray(gate.options) &&
    gate.options.length > 0 && gate.options.length <= 10 &&
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

function isCapabilityPayload(key: string, value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const payload = value as Record<string, unknown>
  if (key === 'dataPattern') return typeof payload.anomalyDetected === 'boolean' && (!payload.anomalyDetails || hasStringFields(payload.anomalyDetails, ['month', 'metric', 'deviationPercent', 'probableCause'])) && (!payload.chartSvg || (typeof payload.chartSvg === 'string' && new TextEncoder().encode(payload.chartSvg).length <= MAX_SVG_BYTES)) && (!payload.insights || isStringArray(payload.insights))
  if (key === 'documentSynthesis') return isBoundedString(payload.synthesisTitle, MAX_LONG_STRING) && isStringArray(payload.keyTakeaways) && (!payload.crossDocumentConnections || (Array.isArray(payload.crossDocumentConnections) && payload.crossDocumentConnections.every(item => hasStringFields(item, ['sourceDoc', 'targetDoc', 'connection']))))
  if (key === 'meetingInsights') return isBoundedString(payload.summary, MAX_LONG_STRING) && isStringArray(payload.decisions) && isStringArray(payload.riskFactors) && (!payload.actionItems || (Array.isArray(payload.actionItems) && payload.actionItems.every(item => hasStringFields(item, ['task', 'owner', 'deadline']))))
  if (key === 'uiConcept') return isBoundedString(payload.conceptTitle, MAX_LONG_STRING) && isStringArray(payload.componentHierarchy) && isStringArray(payload.stylingDirectives) && (!payload.themePalette || hasStringFields(payload.themePalette, ['background', 'surface', 'accent', 'border']))
  return false
}

function isPlanStep(value: unknown): value is ExecutionPlan['steps'][number] {
  if (!value || typeof value !== 'object') return false
  const step = value as Partial<ExecutionPlan['steps'][number]>
  return Number.isInteger(step.stepId) && isBoundedString(step.title) && isBoundedString(step.description, MAX_LONG_STRING) &&
    ['DataPatternFinder', 'DocumentSynthesizer', 'MeetingInsightExtractor', 'UIConceptGenerator'].includes(step.requiredCapability ?? '') &&
     Array.isArray(step.inputNodeIds) && step.inputNodeIds.length > 0 && step.inputNodeIds.length <= 30 && step.inputNodeIds.every((id) => isBoundedString(id)) &&
    ['pending', 'running', 'completed', 'failed'].includes(step.status ?? '')
}

export const intentApi = axios.create({
  baseURL: APP_CONFIG.apiBaseUrl,
  timeout: APP_CONFIG.apiTimeoutMs,
  headers: { 'Content-Type': 'application/json' },
})

if (APP_CONFIG.apiAccessToken) {
  intentApi.defaults.headers.common.Authorization = `Bearer ${APP_CONFIG.apiAccessToken}`
}

export const intentPath = (path: string) => apiUrl(path)

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED') return 'The request timed out. Please try again.'
    if (!error.response) return 'The intent service is unavailable. Check that the backend is running.'
    const message = error.response.data?.error?.message ?? error.response.data?.message
    if (typeof message === 'string') return message
  }
  return fallback
}

export function isRequestCancelled(error: unknown): boolean {
  return axios.isCancel(error)
}

export function isExecutionPlan(value: unknown): value is ExecutionPlan {
  if (!value || typeof value !== 'object') return false
  const plan = value as Partial<ExecutionPlan>
  const confidenceScore = plan.confidenceScore
  return isBoundedString(plan.planId) &&
    isBoundedString(plan.goalSummary, MAX_LONG_STRING) &&
    typeof confidenceScore === 'number' && Number.isFinite(confidenceScore) &&
    confidenceScore >= 0 && confidenceScore <= 1 &&
    Array.isArray(plan.steps) && plan.steps.length <= 5 && plan.steps.every(isPlanStep) &&
    (plan.steps.length > 0 || Boolean(plan.disambiguation?.requiresUserClarification)) && (!plan.disambiguation || isDisambiguation(plan.disambiguation))
}

export function isExecutionResult(value: unknown): value is ExecutionResult {
  if (!value || typeof value !== 'object') return false
  const result = value as Partial<ExecutionResult>
  return (result.executionStatus === 'completed' || result.executionStatus === 'disambiguation_required') &&
    (result.executionStatus === 'completed' ?
      isBoundedString(result.planId) && isBoundedString(result.goalSummary, MAX_LONG_STRING) &&
      typeof result.confidenceScore === 'number' && Number.isFinite(result.confidenceScore) && result.confidenceScore >= 0 && result.confidenceScore <= 1 &&
      Array.isArray(result.executedSteps) && result.executedSteps.length <= 5 && result.executedSteps.every(isPlanStep) &&
       typeof result.outputPayload === 'object' && result.outputPayload !== null && !Array.isArray(result.outputPayload) && isSafePayload(result.outputPayload) && Object.entries(result.outputPayload).every(([key, payload]) => isCapabilityPayload(key, payload)) : isDisambiguation(result.disambiguation)) &&
    (!result.disambiguation || isDisambiguation(result.disambiguation))
}
