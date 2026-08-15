import { useCallback, useEffect, useRef, useState } from 'react'
import { SmoothScrollProvider } from './components/providers/SmoothScrollProvider'
import { SpatialCanvas } from './components/canvas/SpatialCanvas'
import { useCanvasStore } from './store/useCanvasStore'
import { Navbar } from './components/layout/Navbar'
import { IntentBar } from './components/canvas/IntentBar'
import { PlanPreviewModal } from './components/canvas/PlanPreviewModal'
import { ResultNodeCard } from './components/canvas/ResultNodeCard'
import { RecoveryCasePanel } from './components/canvas/RecoveryCasePanel'
import { CanvasNode, DodoConnectionStatus, DodoSignal, ExecutionPlan, HistoricalImportResult, RecoveryCase, RevenueOperationsOverview } from './types/canvas'
import { APP_CONFIG } from './config'
import { getApiErrorMessage, intentApi, intentPath, isDodoConnectionStatus, isDodoSignal, isExecutionPlan, isExecutionResult, isHistoricalImportResult, isRecoveryCase, isRequestCancelled, isRevenueOperationsOverview } from './api'
import { createId } from './utils/id'
import { buildSpatialClusters, buildSpatialEdges } from './utils/spatialRelations'

const nodeOverlaps = (first: CanvasNode['position'], second: CanvasNode['position']) =>
  first.x < second.x + second.width + 16 && first.x + first.width + 16 > second.x &&
  first.y < second.y + second.height + 16 && first.y + first.height + 16 > second.y

function findVisibleNodePosition(width: number, height: number): CanvasNode['position'] {
  const state = useCanvasStore.getState()
  const viewportWidth = typeof window === 'undefined' ? 1200 : window.innerWidth
  const viewportHeight = typeof window === 'undefined' ? 800 : window.innerHeight
  const startX = Math.max(24, (-state.pan.x + 24) / state.zoom)
  const startY = Math.max(96, (-state.pan.y + 96) / state.zoom)
  const columns = Math.max(1, Math.floor((viewportWidth / state.zoom - 48) / (width + 16)))
  for (let index = 0; index < 200; index += 1) {
    const candidate = {
      x: startX + (index % columns) * (width + 16),
      y: startY + Math.floor(index / columns) * (height + 16),
      width,
      height,
    }
    if (candidate.y + height <= startY + viewportHeight / state.zoom - 24 && !state.nodes.some((node) => nodeOverlaps(candidate, node.position))) return candidate
  }
  return { x: startX, y: startY + state.nodes.length * (height + 16), width, height }
}

function responseMessage(data: unknown, fallback: string): string {
  if (data && typeof data === 'object') {
    const payload = data as { message?: unknown; error?: { message?: unknown } }
    const message = typeof payload.message === 'string' ? payload.message : payload.error?.message
    if (typeof message === 'string') return message.slice(0, 500)
  }
  return fallback
}

function inferIntentFromContext(): string {
  return APP_CONFIG.defaultIntentPrompt
}

async function readImagePreview(file: File, signal: AbortSignal): Promise<string | undefined> {
  if (typeof createImageBitmap === 'function') {
    let bitmap: ImageBitmap | undefined
    try {
      bitmap = await createImageBitmap(file)
      if (signal.aborted || bitmap.width > 8_000 || bitmap.height > 8_000) return undefined
      const scale = Math.min(1, 480 / bitmap.width, 240 / bitmap.height)
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(bitmap.width * scale))
      canvas.height = Math.max(1, Math.round(bitmap.height * scale))
      const context = canvas.getContext('2d')
      if (!context) return undefined
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      const preview = canvas.toDataURL('image/jpeg', 0.72)
      return preview.length <= 600_000 ? preview : undefined
    } catch {
      // Fall through to the small-file reader for browsers without bitmap decoding support.
    } finally {
      bitmap?.close()
    }
  }
  if (signal.aborted || file.size > 400_000) return undefined
  return new Promise((resolve) => {
    const reader = new FileReader()
    const abort = () => reader.abort()
    signal.addEventListener('abort', abort, { once: true })
    reader.onload = () => { signal.removeEventListener('abort', abort); resolve(typeof reader.result === 'string' ? reader.result : undefined) }
    reader.onerror = () => { signal.removeEventListener('abort', abort); resolve(undefined) }
    reader.onabort = () => { signal.removeEventListener('abort', abort); resolve(undefined) }
    if (signal.aborted) { reader.abort(); return }
    reader.readAsDataURL(file)
  })
}

function readTextFile(file: File, signal: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    const abort = () => reader.abort()
    signal.addEventListener('abort', abort, { once: true })
    reader.onload = () => { signal.removeEventListener('abort', abort); resolve(typeof reader.result === 'string' ? reader.result : '') }
    reader.onerror = () => { signal.removeEventListener('abort', abort); reject(reader.error || new Error('File read failed')) }
    reader.onabort = () => { signal.removeEventListener('abort', abort); reject(new DOMException('File read aborted', 'AbortError')) }
    if (signal.aborted) { reader.abort(); return }
    reader.readAsText(file)
  })
}

export default function App() {
  const nodes = useCanvasStore((state) => state.nodes)
  const edges = useCanvasStore((state) => state.edges)
  const resetVersion = useCanvasStore((state) => state.resetVersion)
  const activeIntentPrompt = useCanvasStore((state) => state.activeIntentPrompt)
  const activePlan = useCanvasStore((state) => state.activePlan)
  const executionResult = useCanvasStore((state) => state.executionResult)
  const isExecutingPlan = useCanvasStore((state) => state.isExecutingPlan)
  const setIsEvaluatingPlan = useCanvasStore((state) => state.setIsEvaluatingPlan)
  const setIsExecutingPlan = useCanvasStore((state) => state.setIsExecutingPlan)
  const setActivePlan = useCanvasStore((state) => state.setActivePlan)
  const setExecutionResult = useCanvasStore((state) => state.setExecutionResult)
  const addNode = useCanvasStore((state) => state.addNode)
  const upsertOutputNode = useCanvasStore((state) => state.upsertOutputNode)

  const [showPlanModal, setShowPlanModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [recoveryCases, setRecoveryCases] = useState<RecoveryCase[]>([])
  const [dodoSignals, setDodoSignals] = useState<DodoSignal[]>([])
  const [revenueOverview, setRevenueOverview] = useState<RevenueOperationsOverview | null>(null)
  const [dodoConnection, setDodoConnection] = useState<DodoConnectionStatus | null>(null)
  const [isLoadingCases, setIsLoadingCases] = useState(false)
  const [isImportingHistory, setIsImportingHistory] = useState(false)
  const [historyProgress, setHistoryProgress] = useState<{ days: number; nextPage: number } | null>(null)
  const closePlanModal = useCallback(() => setShowPlanModal(false), [])
  const requestRef = useRef<{ id: number; controller: AbortController; canvasKey: string } | null>(null)
  const requestSequence = useRef(0)
  const fileReadSequence = useRef(0)
  const fileReadController = useRef<AbortController | null>(null)
  const recoveryCaseRequestRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)
  const suppressNextInputReset = useRef(false)
  const clearPromptAfterExecution = useRef(false)
  const inputGraphKey = JSON.stringify({ nodes: nodes.filter(node => node.type !== 'output'), edges, activeIntentPrompt })

  const getCanvasKey = () => {
    const state = useCanvasStore.getState()
    return JSON.stringify({ nodes: state.nodes, edges: state.edges, activeIntentPrompt: state.activeIntentPrompt })
  }
  const cancelRequest = () => {
    requestRef.current?.controller.abort()
    requestRef.current = null
  }
  const invalidateIntentState = () => {
    cancelRequest()
    setIsEvaluatingPlan(false)
    setIsExecutingPlan(false)
    setShowPlanModal(false)
    setActivePlan(null)
    setExecutionResult(null)
    setErrorMessage(null)
    setStatusMessage(null)
  }
  const beginRequest = () => {
    cancelRequest()
    fileReadSequence.current += 1
    fileReadController.current?.abort()
    fileReadController.current = null
    const request = {
      id: ++requestSequence.current,
      controller: new AbortController(),
      canvasKey: getCanvasKey(),
    }
    requestRef.current = request
    return request
  }
  const isCurrentRequest = (request: typeof requestRef.current) => Boolean(
    mountedRef.current && request && requestRef.current?.id === request.id && request.canvasKey === getCanvasKey(),
  )
  const isActiveRequest = (request: typeof requestRef.current) => Boolean(mountedRef.current && request && requestRef.current?.id === request.id)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      cancelRequest()
      fileReadController.current?.abort()
      recoveryCaseRequestRef.current?.abort()
    }
  }, [])
  const loadRecoveryCases = useCallback(async () => {
    recoveryCaseRequestRef.current?.abort()
    const controller = new AbortController()
    recoveryCaseRequestRef.current = controller
    setIsLoadingCases(true)
    try {
      const [caseOutcome, signalOutcome, overviewOutcome, connectionOutcome] = await Promise.allSettled([
        intentApi.get(intentPath('/api/revenue-recovery/cases'), { signal: controller.signal }),
        intentApi.get(intentPath('/api/revenue-recovery/signals'), { signal: controller.signal }),
        intentApi.get(intentPath('/api/revenue-recovery/overview'), { signal: controller.signal }),
        intentApi.get(intentPath('/api/revenue-recovery/connection'), { signal: controller.signal }),
      ])
      if (mountedRef.current && recoveryCaseRequestRef.current === controller) {
        if (caseOutcome.status === 'fulfilled') {
          const caseValues = Array.isArray(caseOutcome.value.data?.data) ? caseOutcome.value.data.data : []
          setRecoveryCases(caseValues.filter(isRecoveryCase))
        }
        if (signalOutcome.status === 'fulfilled') {
          const signalValues = Array.isArray(signalOutcome.value.data?.data) ? signalOutcome.value.data.data : []
          setDodoSignals(signalValues.filter(isDodoSignal))
        }
        if (overviewOutcome.status === 'fulfilled' && isRevenueOperationsOverview(overviewOutcome.value.data?.data)) setRevenueOverview(overviewOutcome.value.data.data)
        if (connectionOutcome.status === 'fulfilled' && isDodoConnectionStatus(connectionOutcome.value.data?.data)) setDodoConnection(connectionOutcome.value.data.data)
        if (caseOutcome.status === 'rejected' && signalOutcome.status === 'rejected' && overviewOutcome.status === 'rejected' && connectionOutcome.status === 'rejected' && !isRequestCancelled(caseOutcome.reason) && !isRequestCancelled(signalOutcome.reason) && !isRequestCancelled(overviewOutcome.reason) && !isRequestCancelled(connectionOutcome.reason)) {
          setErrorMessage(getApiErrorMessage(caseOutcome.reason, 'Unable to load Dodo recovery data.'))
        }
      }
    } catch (error) {
      if (mountedRef.current && recoveryCaseRequestRef.current === controller && !isRequestCancelled(error)) setErrorMessage(getApiErrorMessage(error, 'Unable to load Dodo recovery cases.'))
    } finally {
      if (recoveryCaseRequestRef.current === controller) {
        recoveryCaseRequestRef.current = null
        if (mountedRef.current) setIsLoadingCases(false)
      }
    }
  }, [])
  useEffect(() => { void loadRecoveryCases() }, [loadRecoveryCases])
  const approveRecoveryCase = useCallback(async (recoveryCase: RecoveryCase, actionType: 'customer_follow_up' | 'payment_method_update') => {
    try {
      const response = await intentApi.post(intentPath(`/api/revenue-recovery/cases/${encodeURIComponent(recoveryCase.caseId)}/approve`), { actionType, operator: 'Revenue operator' })
      if (!response.data?.success || !isRecoveryCase(response.data.data)) throw new Error('Invalid recovery case response')
      setRecoveryCases(current => current.map(item => item.caseId === recoveryCase.caseId ? response.data.data : item))
      // Re-fetch the bounded overview so its aggregate approval count cannot go stale.
      void loadRecoveryCases()
      setStatusMessage(actionType === 'payment_method_update' ? 'Payment-update request approved. No customer charge was attempted.' : 'Owner-led recovery follow-up approved. No customer charge was attempted.')
    } catch (error) { setErrorMessage(getApiErrorMessage(error, 'Unable to approve the recovery action.')) }
  }, [loadRecoveryCases])
  const importDodoHistory = useCallback(async (days: number, startPage = 0) => {
    if (![30, 90, 365].includes(days)) return
    try {
      setIsImportingHistory(true)
      const response = await intentApi.post(intentPath('/api/revenue-recovery/import-history'), { days, startPage })
      if (!response.data?.success || !isHistoricalImportResult(response.data.data)) throw new Error('Invalid Dodo history import response')
      const result: HistoricalImportResult = response.data.data
      await loadRecoveryCases()
      if (mountedRef.current) {
        setHistoryProgress(result.hasMore && result.nextPage !== undefined ? { days, nextPage: result.nextPage } : null)
        setStatusMessage(`Imported ${result.eventsImported} payment events from ${result.paymentsScanned} records${result.casesCreated ? ` and opened ${result.casesCreated} recovery case${result.casesCreated === 1 ? '' : 's'}` : ''}.${result.hasMore ? ' The next batch is ready to continue.' : ''}`)
      }
    } catch (error) {
      if (mountedRef.current) setErrorMessage(getApiErrorMessage(error, 'Unable to import Dodo payment history. Confirm the server-side Dodo API key and try again.'))
    } finally { if (mountedRef.current) setIsImportingHistory(false) }
  }, [loadRecoveryCases])
  const addRecoveryEvidence = useCallback((recoveryCase: RecoveryCase) => {
    const currentNodes = useCanvasStore.getState().nodes
    if (currentNodes.length >= 30) { setErrorMessage('The workspace is full. Remove a node before adding Dodo evidence.'); return }
    if (currentNodes.some(node => node.dataPayload.rawReference === `dodo-case:${recoveryCase.caseId}`)) { setStatusMessage('This recovery case is already on the canvas.'); return }
    const node: CanvasNode = { id: createId('node_dodo'), title: `Dodo: ${recoveryCase.account}`, type: 'document', position: findVisibleNodePosition(280, 160), dataPayload: { mimeType: 'application/vnd.dodo-payments.event+json', rawReference: `dodo-case:${recoveryCase.caseId}`, contentSummary: `Verified Dodo event: ${recoveryCase.eventType}\nAccount: ${recoveryCase.account}\nStatus: ${recoveryCase.status}\nReason: ${recoveryCase.riskReason}\nSubscription: ${recoveryCase.subscriptionId || 'Not supplied'}\nNext billing: ${recoveryCase.nextBillingDate || 'Not supplied'}\nThis evidence does not authorize a charge.` } }
    addNode(node)
    setStatusMessage('Verified Dodo billing context added to the canvas. Generate a recovery plan to connect it with account evidence.')
  }, [addNode])
  const addDodoSignalEvidence = useCallback((signal: DodoSignal) => {
    const currentNodes = useCanvasStore.getState().nodes
    if (currentNodes.length >= 30) { setErrorMessage('The workspace is full. Remove a node before adding Dodo evidence.'); return }
    if (currentNodes.some(node => node.dataPayload.rawReference === `dodo-signal:${signal.signalId}`)) { setStatusMessage('This Dodo signal is already on the canvas.'); return }
    const riskScore = signal.classification === 'recovery_case' ? 82 : signal.classification === 'recovery' ? 20 : 35
    const node: CanvasNode = { id: createId('node_dodo'), title: `Dodo: ${signal.title}`, type: 'document', position: findVisibleNodePosition(280, 180), dataPayload: { mimeType: 'application/vnd.dodo-payments.event+json', rawReference: `dodo-signal:${signal.signalId}`, contentSummary: `Verified Dodo signal: ${signal.eventType}\nAccount: ${signal.account}\nRisk Score: ${riskScore}\nDriver: ${signal.title} — ${signal.summary}\nEvidence: signed Dodo event ${signal.eventId}\nOwner: Revenue operator\nSubscription: ${signal.subscriptionId || 'Not supplied'}\nOccurred: ${signal.occurredAt}\nThis evidence does not authorize a charge.` } }
    addNode(node)
    setStatusMessage('Verified Dodo signal added as evidence. Generate a recovery plan to combine it with account context.')
  }, [addNode])
  const recordCompletedRecoveryAnalyses = useCallback(async () => {
    const caseIds = [...new Set(useCanvasStore.getState().nodes
      .map(node => node.dataPayload.rawReference)
      .flatMap(reference => reference?.startsWith('dodo-case:') ? [reference.slice('dodo-case:'.length)] : []))]
    if (!caseIds.length) return
    const outcomes = await Promise.allSettled(caseIds.map(caseId => intentApi.post(intentPath(`/api/revenue-recovery/cases/${encodeURIComponent(caseId)}/analysis-complete`))))
    if (!mountedRef.current) return
    const metered = outcomes.filter(outcome => outcome.status === 'fulfilled' && outcome.value.data?.data?.meteringStatus === 'sent').length
    if (metered) setStatusMessage(`Computation complete. Dodo recorded ${metered} completed recovery analysis event${metered === 1 ? '' : 's'}.`)
  }, [])
  useEffect(() => {
    const updateVisibility = () => document.body.dataset.pageHidden = String(document.hidden)
    updateVisibility()
    document.addEventListener('visibilitychange', updateVisibility)
    return () => document.removeEventListener('visibilitychange', updateVisibility)
  }, [])
  useEffect(() => {
    // Abort work as soon as its input graph changes, not only after a stale response arrives.
    if (suppressNextInputReset.current) {
      suppressNextInputReset.current = false
      return
    }
    cancelRequest()
    setIsEvaluatingPlan(false)
    setIsExecutingPlan(false)
    setShowPlanModal(false)
    setActivePlan(null)
    setExecutionResult(null)
    setErrorMessage(null)
  }, [inputGraphKey])
  useEffect(() => {
    fileReadSequence.current += 1
    fileReadController.current?.abort()
    fileReadController.current = null
    cancelRequest()
    setShowPlanModal(false)
    setStatusMessage(null)
    setIsEvaluatingPlan(false)
    setIsExecutingPlan(false)
    setErrorMessage(null)
    setStatusMessage(null)
  }, [resetVersion])

  // Compile Spatial Canvas AST Payload
  const getASTPayload = (promptOverride?: string) => {
    const currentState = useCanvasStore.getState()
    const currentNodes = currentState.nodes
    const currentEdges = currentState.edges
    const contextNodes = currentNodes.filter((node) => node.type !== 'output')
    const spatialEdges = buildSpatialEdges(contextNodes, currentEdges)
    return {
    canvasId: APP_CONFIG.canvasId,
    nodes: contextNodes.map((n) => ({
      id: n.id,
      title: n.title,
      type: n.type,
      position: n.position,
      dataPayload: (({ previewUrl: _previewUrl, ...payload }) => payload)(n.dataPayload),
    })),
    edges: spatialEdges.map((e) => ({
      id: e.id,
      sourceNodeId: e.sourceNodeId,
      targetNodeId: e.targetNodeId,
      relationType: e.relationType,
         distancePixels: (() => {
          const source = currentNodes.find((node) => node.id === e.sourceNodeId)
          const target = currentNodes.find((node) => node.id === e.targetNodeId)
          if (typeof e.distancePixels === 'number') return e.distancePixels
          if (!source || !target) return 0
         const sourceCenter = {
           x: source.position.x + source.position.width / 2,
           y: source.position.y + source.position.height / 2,
         }
         const targetCenter = {
           x: target.position.x + target.position.width / 2,
           y: target.position.y + target.position.height / 2,
         }
          return Math.min(APP_CONFIG.proximityDistancePixels, Math.round(Math.hypot(targetCenter.x - sourceCenter.x, targetCenter.y - sourceCenter.y)))
       })(),
     })),
      spatialClusters: buildSpatialClusters(contextNodes, spatialEdges, APP_CONFIG.spatialClusterId),
    activeIntentInput: {
      modality: 'text' as const,
        rawPrompt: (promptOverride ?? activeIntentPrompt).trim(),
      timestamp: Date.now(),
    },
    }
  }

  // Evaluate Intent & Inspect Plan
  const handleEvaluatePlan = async () => {
    const prompt = activeIntentPrompt.trim() || inferIntentFromContext()
    if (!prompt) {
      setErrorMessage('Describe the outcome you want before inspecting a plan.')
      document.getElementById('intent-prompt')?.focus()
      return
    }
    const request = beginRequest()
    setErrorMessage(null)
    setStatusMessage(null)
    setIsExecutingPlan(false)
    setStatusMessage('Preparing an inspectable plan...')
    setIsEvaluatingPlan(true)
    try {
       const res = await intentApi.post(intentPath('/api/intent/plan'), getASTPayload(prompt), { signal: request.controller.signal })
      if (!isCurrentRequest(request)) {
        if (isActiveRequest(request)) setErrorMessage('The canvas changed while the plan was being prepared. Please try again.')
        return
      }
      if (res.data?.success && isExecutionPlan(res.data.data)) {
       setActivePlan(res.data.data)
         if (!activeIntentPrompt.trim()) {
          suppressNextInputReset.current = true
          useCanvasStore.getState().setActiveIntentPrompt(prompt)
        }
        setStatusMessage(res.data.data.planningMode === 'local_fallback' ? 'Provider unavailable. A bounded local plan is ready for review.' : 'Plan ready for review.')
        setShowPlanModal(true)
      } else {
         setErrorMessage(responseMessage(res.data, 'The service returned an invalid execution plan.'))
      }
    } catch (err) {
      if (isCurrentRequest(request) && !isRequestCancelled(err)) setErrorMessage(getApiErrorMessage(err, 'Unable to evaluate the intent plan.'))
    } finally {
      if (isActiveRequest(request)) {
        setIsEvaluatingPlan(false)
        requestRef.current = null
      }
    }
  }

  // Execute Intent & Render In-Canvas Result
  const handleExecuteComputation = async () => {
    if (!activePlan) {
      await handleEvaluatePlan()
      return
    }
    const request = beginRequest()
    setErrorMessage(null)
    setStatusMessage(null)
    setIsEvaluatingPlan(false)
    setExecutionResult(null)
    setIsExecutingPlan(true)
    setStatusMessage('Sending the confirmed intent plan...')
    setShowPlanModal(false)
    try {
      const res = await intentApi.post(intentPath('/api/intent/execute'), {
        ...getASTPayload(),
        executionPlan: activePlan,
      }, { signal: request.controller.signal })

      if (!isCurrentRequest(request)) {
        if (isActiveRequest(request)) setErrorMessage('The canvas changed while computation was running. Please run it again.')
        return
      }
      if (res.data?.success && isExecutionResult(res.data.data)) {
        const data = res.data.data
        setExecutionResult(data)
        const renewal = data.outputPayload?.renewalRescue as { executiveSummary?: string; riskRecords?: { account?: string; riskLevel?: string }[] } | undefined
        const resultSummary = renewal?.executiveSummary
          ? `${renewal.executiveSummary}${renewal.riskRecords?.length ? `\n${renewal.riskRecords.slice(0, 3).map((record) => `${record.account ?? 'Account'}: ${(record.riskLevel ?? 'unknown').toUpperCase()}`).join(' • ')}` : ''}`
          : data.goalSummary ?? 'Revenue risk assessment completed'
        const outputInserted = upsertOutputNode(resultSummary, data.outputPayload ?? {})
        clearPromptAfterExecution.current = true
        setStatusMessage(outputInserted ? 'Revenue-risk assessment complete. The result was added to the workspace.' : 'Revenue-risk assessment complete. Remove a node to place it on the canvas.')
        void recordCompletedRecoveryAnalyses()
       } else setErrorMessage(responseMessage(res.data, 'The service returned an invalid execution result.'))
    } catch (err) {
      if (isCurrentRequest(request) && !isRequestCancelled(err)) setErrorMessage(getApiErrorMessage(err, 'Unable to execute the intent plan.'))
    } finally {
      if (isActiveRequest(request)) {
         setIsExecutingPlan(false)
         requestRef.current = null
         if (clearPromptAfterExecution.current) {
           clearPromptAfterExecution.current = false
           suppressNextInputReset.current = true
           useCanvasStore.getState().setActiveIntentPrompt('')
         }
       }
    }
  }

  // Add New Document Node
  const handleAddNewNode = () => {
    if (useCanvasStore.getState().nodes.length >= 30) {
      setErrorMessage('The canvas is full. Remove a node before adding another.')
      return
    }
    const newNode: CanvasNode = {
       id: createId('node_doc'),
        title: 'Untitled document',
       type: 'document',
       position: findVisibleNodePosition(280, 160),
      dataPayload: {
        mimeType: 'text/plain',
         contentSummary: 'Start with your own notes here, or upload a file to add context.',
      },
    }
    addNode(newNode)
     setStatusMessage('Added an untitled document to the canvas. Add your own notes or upload a file.')
  }

  const handleAddFile = async (file: File) => {
    // A pending upload changes the eventual context, so do not leave an old
    // plan or result actionable while the new node is being read.
    invalidateIntentState()
    const readId = ++fileReadSequence.current
    const resetAtStart = useCanvasStore.getState().resetVersion
    fileReadController.current?.abort()
    const readController = new AbortController()
    fileReadController.current = readController
    try {
      const safeFileName = file.name.slice(0, 200) || 'uploaded-file'
      if (file.size > 10_000_000) {
        setErrorMessage('Files must be 10 MB or smaller.')
        return
      }
       const lowerFileName = safeFileName.toLowerCase()
       const isSvg = file.type === 'image/svg+xml' || lowerFileName.endsWith('.svg')
       const isImage = !isSvg && (file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|avif|bmp)$/i.test(safeFileName))
       const isPdf = file.type === 'application/pdf' || lowerFileName.endsWith('.pdf')
       const isDataset = file.type === 'text/csv' || lowerFileName.endsWith('.csv')
      const isText = file.type.startsWith('text/') || /\.(txt|md|json)$/i.test(safeFileName)
      if (!isImage && !isText && !isDataset && !isPdf) {
         setErrorMessage('Supported uploads are PDF, CSV, TXT, MD, JSON, and raster images.')
        return
      }
      setStatusMessage(isPdf ? `Extracting text from "${safeFileName}"...` : `Reading "${safeFileName}"...`)
       const previewUrl = isImage ? await readImagePreview(file, readController.signal) : undefined
      let contentSummary = isImage ? `Image reference: ${safeFileName}` : ''
      if (isPdf) {
        const response = await intentApi.post(intentPath('/api/files/pdf-text'), file, { signal: readController.signal, headers: { 'Content-Type': 'application/pdf' } })
         if (!response.data?.success || typeof response.data.data?.text !== 'string' || response.data.data.text.length > 10_000) throw new Error('The PDF text service returned an invalid or oversized response.')
         contentSummary = response.data.data.text.slice(0, 10_000)
      } else if (!isImage) {
        contentSummary = (await readTextFile(file, readController.signal)).slice(0, 10_000) || `Uploaded file: ${safeFileName}`
      }
       if (!mountedRef.current || readController.signal.aborted || readId !== fileReadSequence.current || resetAtStart !== useCanvasStore.getState().resetVersion) return
      if (useCanvasStore.getState().nodes.length >= 30) {
        setErrorMessage('The canvas is full. Remove a node before uploading another file.')
        return
      }
       const uploadedNode: CanvasNode = {
        id: createId('node_upload'),
         title: safeFileName,
         type: isDataset ? 'dataset' : 'document',
        position: findVisibleNodePosition(280, 160),
         dataPayload: { mimeType: isPdf ? 'application/pdf' : file.type.slice(0, 160) || 'application/octet-stream', contentSummary, rawReference: safeFileName, previewUrl },
       }
       addNode(uploadedNode)
       setStatusMessage(`Added "${safeFileName}" to the Intent Canvas workspace. The workspace node is retained in this browser.`)
    } catch (error) {
      if (mountedRef.current && !isRequestCancelled(error)) setErrorMessage(getApiErrorMessage(error, 'The selected file could not be read or parsed.'))
    } finally {
      if (fileReadController.current === readController) fileReadController.current = null
    }
  }

  const intentHandlers = {
    onEvaluatePlan: handleEvaluatePlan,
    onExecuteComputation: () => handleExecuteComputation(),
    onAddNewNode: handleAddNewNode,
    onAddFile: handleAddFile,
  };

  return (
    <SmoothScrollProvider enabled={false}>
      <main className="relative h-screen w-screen overflow-hidden bg-[#040406]">
        <div data-app-content className="relative h-full w-full">
        {errorMessage && (
          <div role="alert" className="fixed top-5 left-1/2 z-[60] flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-3 rounded-xl border border-red-400/30 bg-red-950/90 px-4 py-3 text-xs text-red-100 shadow-2xl backdrop-blur-xl">
            <span>{errorMessage}</span>
            <button type="button" aria-label="Dismiss error" onClick={() => setErrorMessage(null)} className="text-red-200 hover:text-white">&times;</button>
          </div>
        )}
        <Navbar />
        <IntentBar {...intentHandlers} />
        <SpatialCanvas onAddFile={handleAddFile} />

        {!executionResult && <div className="absolute top-20 right-6 z-[45] max-h-[calc(100dvh-7rem)] overflow-y-auto" data-scrollable="true"><RecoveryCasePanel cases={recoveryCases} signals={dodoSignals} overview={revenueOverview} connection={dodoConnection} loading={isLoadingCases} importingHistory={isImportingHistory} historyProgress={historyProgress} onRefresh={() => void loadRecoveryCases()} onImportHistory={importDodoHistory} onApprove={approveRecoveryCase} onAddEvidence={addRecoveryEvidence} onAddSignalEvidence={addDodoSignalEvidence} /></div>}

        {/* In-Canvas Result Overlay Container */}
        {executionResult && (
            <div data-scrollable="true" onWheel={(event) => event.stopPropagation()} className="absolute top-20 right-6 z-[55] max-h-[calc(100dvh-7rem)] max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded-2xl pb-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <ResultNodeCard result={executionResult} />
          </div>
        )}
        </div>

        {statusMessage && (
           <div role="status" aria-live="polite" className="fixed top-20 left-1/2 z-[60] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-xl border border-[#00ff87]/30 bg-[#05291b]/95 px-4 py-3 text-xs text-[#b8ffd9] shadow-2xl backdrop-blur-xl">
            {statusMessage}
            <button type="button" aria-label="Dismiss status" onClick={() => setStatusMessage(null)} className="ml-3 text-[#b8ffd9] hover:text-white">&times;</button>
          </div>
        )}

        {/* Inspectable Execution Plan Modal */}
        {showPlanModal && activePlan && (
           <PlanPreviewModal
              plan={activePlan}
              contextNodeTitles={[...new Set(activePlan.steps.flatMap((step) => step.inputNodeIds).map((id) => nodes.find((node) => node.id === id)?.title).filter((title): title is string => Boolean(title)))]}
              contextDetails={activePlan.context.map((item) => ({ title: nodes.find((node) => node.id === item.nodeId)?.title ?? item.nodeId, purpose: item.purpose, spatialBasis: item.spatialBasis }))}
              availableContextCount={nodes.filter((node) => node.type !== 'output').length}
             isExecuting={isExecutingPlan}
            onExecute={() => handleExecuteComputation()}
            onClose={closePlanModal}
          />
        )}

      </main>
    </SmoothScrollProvider>
  )
}
