import { ExecutionPlan, ExecutionResult } from '../types/canvas'

type SpatialGraphAST = { nodes: { id: string; title: string; type: string; position: { x: number; y: number; width: number; height: number }; dataPayload: { mimeType: string; contentSummary: string; rawReference?: string } }[]; edges: { id: string; sourceNodeId: string; targetNodeId: string; relationType: string; label?: string }[]; spatialClusters: { clusterId: string; nodeIds: string[] }[]; activeIntentInput: { rawPrompt: string; timestamp: number } }

const GEMINI_KEY_STORAGE = 'intent-canvas.gemini-key'
const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash'

export function getGeminiKey(): string | null {
  try {
    const stored = localStorage.getItem(GEMINI_KEY_STORAGE)
    if (stored) return stored.trim()
  } catch {}
  return (import.meta.env.VITE_GEMINI_API_KEY as string | undefined)?.trim() || null
}

export function setGeminiKey(key: string) {
  try {
    if (!key.trim()) localStorage.removeItem(GEMINI_KEY_STORAGE)
    else localStorage.setItem(GEMINI_KEY_STORAGE, key.trim())
  } catch {}
}

export function hasGeminiKey(): boolean {
  const key = getGeminiKey()
  return Boolean(key && key.trim().length >= 20)
}

export function isValidGeminiKeyFormat(key: string): boolean {
  return key.trim().length >= 20
}

// Simple client-side rate limit: 20 calls per minute
const callTimestamps: number[] = []
function checkRateLimit(): void {
  const now = Date.now()
  while (callTimestamps.length && callTimestamps[0] < now - 60_000) callTimestamps.shift()
  if (callTimestamps.length >= 20) throw new Error('Too many requests. Please wait a minute before trying again.')
  callTimestamps.push(now)
}

// Gemini API call helper with retry for 429/5xx
async function callGemini(prompt: string, apiKey: string, signal?: AbortSignal): Promise<string> {
  checkRateLimit()
  let lastError: Error | null = null
  for (let attempt = 0; attempt < 3; attempt++) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(apiKey)}`
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.3 },
        }),
        signal,
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        if (res.status === 400 || res.status === 401 || res.status === 403) throw new Error('Gemini API key rejected. Check your key and try again.')
        if (res.status === 429 || res.status >= 500) {
          lastError = new Error(res.status === 429 ? 'Gemini rate limit hit. Please wait and try again.' : `Gemini temporarily unavailable (${res.status})`)
          if (attempt < 2) {
            await new Promise(r => setTimeout(r, 800 * (attempt + 1)))
            continue
          }
          throw lastError
        }
        throw new Error(text.slice(0, 500) || `Gemini request failed (${res.status})`)
      }
      const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
      if (!text) throw new Error('Gemini returned no content')
      return text
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw e
      lastError = e as Error
      if (lastError.message.includes('rate limit') && attempt < 2) {
        await new Promise(r => setTimeout(r, 800 * (attempt + 1)))
        continue
      }
      throw lastError
    }
  }
  throw lastError || new Error('Gemini request failed')
}

// Deterministic fallback when no key or Gemini fails — covers all 4 capabilities
function localFallbackPlan(ast: SpatialGraphAST): ExecutionPlan {
  const hasDataset = ast.nodes.some(n => n.type === 'dataset')
  const hasDocument = ast.nodes.some(n => n.type === 'document')
  const hasInstruction = ast.nodes.some(n => n.type === 'instruction')
  const hasExample = ast.nodes.some(n => n.type === 'example')
  const steps: ExecutionPlan['steps'] = []
  if (hasDataset) steps.push({ stepId: 1, title: 'Analyze data patterns', description: 'Examine the supplied dataset for trends and key metrics.', requiredCapability: 'DataPatternFinder', inputNodeIds: ast.nodes.filter(n => n.type === 'dataset').map(n => n.id), status: 'pending' })
  else if (hasDocument && hasInstruction) steps.push({ stepId: 1, title: 'Extract meeting insights', description: 'Review documents and instructions for decisions and actions.', requiredCapability: 'MeetingInsightExtractor', inputNodeIds: ast.nodes.filter(n => n.type === 'document' || n.type === 'instruction').map(n => n.id), status: 'pending' })
  else if (hasDocument) steps.push({ stepId: 1, title: 'Synthesize documents', description: 'Summarize and connect the supplied documents.', requiredCapability: 'DocumentSynthesizer', inputNodeIds: ast.nodes.filter(n => n.type === 'document').map(n => n.id), status: 'pending' })
  else if (hasExample) steps.push({ stepId: 1, title: 'Generate concept', description: 'Create a concept from the supplied examples.', requiredCapability: 'UIConceptGenerator', inputNodeIds: ast.nodes.filter(n => n.type === 'example').map(n => n.id), status: 'pending' })
  else if (hasInstruction) steps.push({ stepId: 1, title: 'Synthesize instructions', description: 'Summarize the supplied instructions.', requiredCapability: 'DocumentSynthesizer', inputNodeIds: ast.nodes.filter(n => n.type === 'instruction').map(n => n.id), status: 'pending' })
  if (!steps.length) {
    return {
      planId: `plan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      goalSummary: ast.activeIntentInput.rawPrompt.slice(0, 200) || 'Analyze the supplied context',
      confidenceScore: 0.6,
      planningMode: 'local_fallback',
      context: ast.nodes.filter(n => n.type !== 'output').slice(0, 5).map(n => ({ nodeId: n.id, purpose: `Use ${n.title}`, spatialBasis: 'standalone' as const })),
      assumptions: ['Limited to supplied context.'],
      constraints: ['No external data.'],
      expectedOutputs: ['Summary of supplied evidence'],
      verification: ['Check that outputs reference supplied sources.'],
      workflowStages: [{ stageId: 1, title: 'Review supplied context', description: 'Read the nodes on the canvas.', output: 'Evidence summary' }],
      steps: [],
      disambiguation: { requiresUserClarification: true, reason: 'Add a dataset, document, or example to generate a grounded plan.', options: [{ optionId: 'opt_trend', label: 'Analyze data', actionHint: 'Add a CSV dataset' }, { optionId: 'opt_churn', label: 'Synthesize documents', actionHint: 'Add documents' }] },
    }
  }
  const ctx = steps[0].inputNodeIds.slice(0, 5).map(id => {
    const n = ast.nodes.find(x => x.id === id)
    return { nodeId: id, purpose: `Use ${n?.title ?? id}`, spatialBasis: 'standalone' as const }
  })
  return {
    planId: `plan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    goalSummary: ast.activeIntentInput.rawPrompt.slice(0, 200),
    confidenceScore: 0.82,
    planningMode: 'local_fallback',
    context: ctx,
    assumptions: ['Based on supplied canvas evidence only.'],
    constraints: ['Do not invent missing facts.'],
    expectedOutputs: steps.map(s => s.title),
    verification: ['Outputs reference supplied sources.'],
    workflowStages: steps.map((s, i) => ({ stageId: i + 1, title: s.title, description: s.description, output: s.title })),
    steps,
  }
}

const PLAN_SYSTEM_PROMPT = `You are the Intent Canvas planner. Convert the spatial workspace (nodes + spatial relationships + user intent) into a safe, inspectable execution plan.
Registered capabilities: DataPatternFinder, DocumentSynthesizer, MeetingInsightExtractor, UIConceptGenerator.
Return ONLY valid JSON matching the schema. No markdown, no prose outside JSON.

Think step-by-step but do not output chain-of-thought. First identify the user's desired outcome, required evidence, and which nodes support it, then choose the smallest useful capability set.
Each capability may appear once, every inputNodeIds must be an exact node id from the workspace, and spatialBasis must be truthful (explicit_connector > spatial_proximity > enclosure_group > standalone).

Schema:
{
  "planId": "string",
  "goalSummary": "string (max 200)",
  "confidenceScore": "number 0-1",
  "context": [{"nodeId": "string", "purpose": "string", "spatialBasis": "explicit_connector|spatial_proximity|enclosure_group|standalone"}],
  "assumptions": ["string"],
  "constraints": ["string"],
  "expectedOutputs": ["string"],
  "verification": ["string"],
  "workflowStages": [{"stageId": 1, "title": "string", "description": "string", "output": "string"}],
  "steps": [{"stepId": 1, "title": "string", "description": "string", "requiredCapability": "DataPatternFinder|DocumentSynthesizer|MeetingInsightExtractor|UIConceptGenerator", "inputNodeIds": ["string"], "status": "pending"}],
  "disambiguation": {"requiresUserClarification": true, "reason": "string", "options": [{"optionId": "opt_churn|opt_trend", "label": "string", "actionHint": "string"}]} // or omit if steps present
}

Rules:
- Use at most 5 steps, each capability once, inputNodeIds must exist.
- Never invent node IDs.
- If unclear, return disambiguation with requiresUserClarification true and empty steps.
- Keep titles short, purposes concrete, confidence 0.85-0.99 for clear intents.
`

export async function generatePlanWithGemini(ast: SpatialGraphAST, signal?: AbortSignal): Promise<ExecutionPlan> {
  const key = getGeminiKey()
  if (!key) return localFallbackPlan(ast)
  const prompt = `${PLAN_SYSTEM_PROMPT}\n\nWorkspace:\n${JSON.stringify(ast, null, 2)}`
  try {
    const text = await callGemini(prompt, key, signal)
    const parsed = JSON.parse(text)
    // Basic shape check — frontend validators will do stricter checks
    if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { steps?: unknown }).steps)) {
      return {
        planId: String((parsed as { planId?: unknown }).planId || `plan_${Date.now()}`),
        goalSummary: String((parsed as { goalSummary?: unknown }).goalSummary || ast.activeIntentInput.rawPrompt).slice(0, 300),
        confidenceScore: typeof (parsed as { confidenceScore?: unknown }).confidenceScore === 'number' ? Math.min(1, Math.max(0, (parsed as { confidenceScore: number }).confidenceScore)) : 0.85,
        planningMode: 'provider' as const,
        context: Array.isArray((parsed as { context?: unknown }).context) ? (parsed as { context: ExecutionPlan['context'] }).context.slice(0, 30) : [],
        assumptions: Array.isArray((parsed as { assumptions?: unknown }).assumptions) ? (parsed as { assumptions: string[] }).assumptions.slice(0, 10) : [],
        constraints: Array.isArray((parsed as { constraints?: unknown }).constraints) ? (parsed as { constraints: string[] }).constraints.slice(0, 10) : [],
        expectedOutputs: Array.isArray((parsed as { expectedOutputs?: unknown }).expectedOutputs) ? (parsed as { expectedOutputs: string[] }).expectedOutputs.slice(0, 10) : [],
        verification: Array.isArray((parsed as { verification?: unknown }).verification) ? (parsed as { verification: string[] }).verification.slice(0, 10) : [],
        workflowStages: Array.isArray((parsed as { workflowStages?: unknown }).workflowStages) ? (parsed as { workflowStages: ExecutionPlan['workflowStages'] }).workflowStages.slice(0, 10) : [],
        steps: (parsed as { steps: ExecutionPlan['steps'] }).steps.slice(0, 5).map((s, i) => ({ ...s, stepId: i + 1, status: 'pending' as const })),
        disambiguation: (parsed as { disambiguation?: ExecutionPlan['disambiguation'] }).disambiguation,
      }
    }
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e
    console.warn('[Gemini plan]', (e as Error).message)
  }
  return localFallbackPlan(ast)
}

const EXECUTE_PROMPT = `You are the Intent Canvas execution engine. You receive the user intent and the nodes for ONE capability. Return ONLY JSON for that capability.
DataPatternFinder: {summary, anomalyDetected, anomalyDetails?, insights[], chartSvg}
DocumentSynthesizer: {synthesisTitle, keyTakeaways[], crossDocumentConnections[], contradictions[]}
MeetingInsightExtractor: {summary, decisions[], actionItems[{task,owner,deadline}], riskFactors[]}
UIConceptGenerator: {conceptTitle, referenceBasis, themePalette{background,surface,accent,border}, componentHierarchy[], stylingDirectives[]}
Keep it evidence-bound, no invented facts, concise, presentation-ready.`

export async function executeWithGemini(plan: ExecutionPlan, ast: SpatialGraphAST, signal?: AbortSignal): Promise<ExecutionResult> {
  const key = getGeminiKey()
  if (!key) {
    // Local fallback execution — return a simple completed result without LLM
    const outputs: Record<string, unknown> = {}
    for (const step of plan.steps) {
      if (step.requiredCapability === 'DataPatternFinder') outputs.dataPattern = { summary: 'Local analysis of supplied dataset.', anomalyDetected: false, insights: ['Add a Gemini API key for richer AI analysis.'], chartSvg: '' }
      if (step.requiredCapability === 'DocumentSynthesizer') outputs.documentSynthesis = { synthesisTitle: 'Local synthesis', keyTakeaways: ['Add a Gemini API key for AI synthesis.'], crossDocumentConnections: [], contradictions: [] }
      if (step.requiredCapability === 'MeetingInsightExtractor') outputs.meetingInsights = { summary: 'Local meeting extraction.', decisions: [], actionItems: [], riskFactors: [] }
      if (step.requiredCapability === 'UIConceptGenerator') outputs.uiConcept = { conceptTitle: 'Local concept', referenceBasis: 'Supplied examples', themePalette: { background: 'Deep navy', surface: 'Charcoal', accent: 'Mint', border: 'Subtle' }, componentHierarchy: ['Header', 'Content', 'Footer'], stylingDirectives: ['Keep it simple.'] }
    }
    return {
      executionStatus: 'completed',
      planId: plan.planId,
      goalSummary: plan.goalSummary,
      confidenceScore: plan.confidenceScore,
      executedSteps: plan.steps.map(s => ({ ...s, status: 'completed' as const })),
      outputPayload: outputs,
    }
  }
  const outputs: Record<string, unknown> = {}
  for (const step of plan.steps) {
    const nodes = ast.nodes.filter(n => step.inputNodeIds.includes(n.id))
    const prompt = `${EXECUTE_PROMPT}\n\nIntent: ${ast.activeIntentInput.rawPrompt}\nCapability: ${step.requiredCapability}\nNodes:\n${nodes.map(n => `${n.title} [${n.type}]: ${n.dataPayload.contentSummary.slice(0, 3000)}`).join('\n\n')}`
    try {
      const text = await callGemini(prompt, key, signal)
      outputs[step.requiredCapability === 'DataPatternFinder' ? 'dataPattern' : step.requiredCapability === 'DocumentSynthesizer' ? 'documentSynthesis' : step.requiredCapability === 'MeetingInsightExtractor' ? 'meetingInsights' : 'uiConcept'] = JSON.parse(text)
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw e
      console.warn(`[Gemini ${step.requiredCapability}]`, (e as Error).message)
      outputs[step.requiredCapability] = { summary: `Failed to generate ${step.requiredCapability} output.` }
    }
  }
  return {
    executionStatus: 'completed',
    planId: plan.planId,
    goalSummary: plan.goalSummary,
    confidenceScore: plan.confidenceScore,
    executedSteps: plan.steps.map(s => ({ ...s, status: 'completed' as const })),
    outputPayload: outputs,
  }
}
