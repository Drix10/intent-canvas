import React, { useCallback, useEffect, useRef, useState } from 'react'
import { SmoothScrollProvider } from './components/providers/SmoothScrollProvider'
import { SpatialScroll } from './SpatialScroll'
import { SpatialCanvas } from './components/canvas/SpatialCanvas'
import { useCanvasStore } from './store/useCanvasStore'
import { Navbar } from './components/layout/Navbar'
import { IntentBar } from './components/canvas/IntentBar'
import { PlanPreviewModal } from './components/canvas/PlanPreviewModal'
import { ResultNodeCard } from './components/canvas/ResultNodeCard'
import { DisambiguationModal } from './components/canvas/DisambiguationModal'
import { AdaptationRequest, CanvasNode, ExecutionPlan } from './types/canvas'
import { APP_CONFIG } from './config'
import { getApiErrorMessage, isCustomPrimitiveRecord, isExecutionPlan, isExecutionResult, isRequestCancelled } from './api'
import { generatePlanWithGemini, executeWithGemini, hasGeminiKey } from './services/geminiService'
import { ApiKeyBar } from './components/ApiKeyBar'
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

function inferIntentFromContext(nodes: CanvasNode[]): string {
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
  const isEvaluatingPlan = useCanvasStore((state) => state.isEvaluatingPlan)
  const isExecutingPlan = useCanvasStore((state) => state.isExecutingPlan)
  const viewMode = useCanvasStore((state) => state.viewMode)
  const setIsEvaluatingPlan = useCanvasStore((state) => state.setIsEvaluatingPlan)
  const setIsExecutingPlan = useCanvasStore((state) => state.setIsExecutingPlan)
  const setActivePlan = useCanvasStore((state) => state.setActivePlan)
  const setExecutionResult = useCanvasStore((state) => state.setExecutionResult)
  const setViewMode = useCanvasStore((state) => state.setViewMode)
  const addNode = useCanvasStore((state) => state.addNode)
  const addCustomPrimitive = useCanvasStore((state) => state.addCustomPrimitive)
  const upsertOutputNode = useCanvasStore((state) => state.upsertOutputNode)

  const [showPlanModal, setShowPlanModal] = useState(false)
  const [disambiguationData, setDisambiguationData] = useState<NonNullable<ExecutionPlan['disambiguation']> | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [isSavingPrimitive, setIsSavingPrimitive] = useState(false)
  const closePlanModal = useCallback(() => setShowPlanModal(false), [])
  const closeDisambiguation = useCallback(() => setDisambiguationData(null), [])
  const requestRef = useRef<{ id: number; controller: AbortController; canvasKey: string } | null>(null)
  const requestSequence = useRef(0)
  const fileReadSequence = useRef(0)
  const fileReadController = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)
  const suppressNextInputReset = useRef(false)
  const clearPromptAfterExecution = useRef(false)
  const inputGraphKey = JSON.stringify({ nodes: nodes.filter(node => node.type !== 'output'), edges, activeIntentPrompt })

  const getCanvasKey = () => {
    const state = useCanvasStore.getState()
    return JSON.stringify({ nodes: state.nodes, edges: state.edges, activeIntentPrompt: state.activeIntentPrompt })
  }
  const cancelRequest = (clearSaving = true) => {
    requestRef.current?.controller.abort()
    requestRef.current = null
    if (clearSaving) setIsSavingPrimitive(false)
  }
  const invalidateIntentState = () => {
    cancelRequest()
    setIsEvaluatingPlan(false)
    setIsExecutingPlan(false)
    setShowPlanModal(false)
    setDisambiguationData(null)
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
      cancelRequest(false)
      fileReadController.current?.abort()
    }
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
    setDisambiguationData(null)
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
    setDisambiguationData(null)
    setIsSavingPrimitive(false)
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

  // Evaluate Intent & Inspect Plan — standalone: direct Gemini with user key
  const handleEvaluatePlan = async () => {
    const prompt = activeIntentPrompt.trim() || inferIntentFromContext(useCanvasStore.getState().nodes)
    if (!prompt) {
      setErrorMessage('Describe the outcome you want before inspecting a plan.')
      document.getElementById('intent-prompt')?.focus()
      return
    }
    if (!hasGeminiKey()) {
      setErrorMessage('Add your Gemini API key above to generate an AI plan. A local fallback plan will be used otherwise.')
    }
    const request = beginRequest()
    setErrorMessage(null)
    setStatusMessage(null)
    setIsExecutingPlan(false)
    setStatusMessage(hasGeminiKey() ? 'Asking Gemini for an inspectable plan...' : 'Building a local fallback plan...')
    setIsEvaluatingPlan(true)
    try {
      const plan = await generatePlanWithGemini(getASTPayload(prompt) as any, request.controller.signal)
      if (!isCurrentRequest(request)) {
        if (isActiveRequest(request)) setErrorMessage('The canvas changed while the plan was being prepared. Please try again.')
        return
      }
      if (isExecutionPlan(plan)) {
        setActivePlan(plan)
        if (!activeIntentPrompt.trim()) {
          suppressNextInputReset.current = true
          useCanvasStore.getState().setActiveIntentPrompt(prompt)
        }
        setStatusMessage(plan.planningMode === 'local_fallback' ? 'Local plan ready — add a Gemini key for richer AI planning.' : 'Plan ready for review.')
        if (plan.disambiguation?.requiresUserClarification) {
          setDisambiguationData(plan.disambiguation)
        } else {
          setShowPlanModal(true)
        }
      } else {
        setErrorMessage('The generated plan was invalid.')
      }
    } catch (err) {
      if (isCurrentRequest(request) && !isRequestCancelled(err)) setErrorMessage(getApiErrorMessage(err, 'Unable to evaluate the intent plan. Check your Gemini key.'))
    } finally {
      if (isActiveRequest(request)) {
        setIsEvaluatingPlan(false)
        requestRef.current = null
      }
    }
  }

  // Execute Intent & Render In-Canvas Result — standalone Gemini
  const handleExecuteComputation = async (adaptation?: AdaptationRequest) => {
    if (!adaptation && !activePlan) {
      await handleEvaluatePlan()
      return
    }
    const request = beginRequest()
    setErrorMessage(null)
    setStatusMessage(null)
    setIsEvaluatingPlan(false)
    setExecutionResult(null)
    setIsExecutingPlan(true)
    setStatusMessage(hasGeminiKey() ? 'Running plan with Gemini...' : 'Running local execution...')
    setShowPlanModal(false)
    setDisambiguationData(null)
    try {
      const ast: any = getASTPayload()
      const plan = activePlan!
      // Handle disambiguation adaptation locally
      let effectivePlan = plan
      if (adaptation && plan.disambiguation?.requiresUserClarification) {
        const option = plan.disambiguation.options.find(c => c.optionId === adaptation.adaptationOptionId)
        if (!option) throw new Error('Adaptation option not offered')
        const datasetNodes = ast.nodes.filter(n => n.type === 'dataset')
        if (!datasetNodes.length) throw new Error('Adaptation requires a dataset')
        effectivePlan = {
          ...plan,
          goalSummary: option.label,
          confidenceScore: 0.85,
          disambiguation: undefined,
          steps: [{ stepId: 1, title: option.label, description: option.actionHint, requiredCapability: 'DataPatternFinder', inputNodeIds: datasetNodes.map(n => n.id), status: 'pending' }],
        } as ExecutionPlan
      } else if (plan.disambiguation?.requiresUserClarification) {
        // Should not execute a disambiguation plan directly
        throw new Error('This plan needs clarification first')
      }
      const data = await executeWithGemini(effectivePlan, ast, request.controller.signal)

      if (!isCurrentRequest(request)) {
        if (isActiveRequest(request)) setErrorMessage('The canvas changed while computation was running. Please run it again.')
        return
      }
      if (isExecutionResult(data)) {
        if (data.executionStatus === 'disambiguation_required' && data.disambiguation?.options?.length) {
          setDisambiguationData(data.disambiguation)
        } else if (data.executionStatus === 'disambiguation_required') {
          setErrorMessage('The service requested clarification but returned no options.')
        } else {
          setExecutionResult(data)
          const resultSummary = data.goalSummary ?? 'Computed intent result'
          const outputInserted = upsertOutputNode(resultSummary, data.outputPayload ?? {})
          setViewMode('interactive')
          clearPromptAfterExecution.current = true
          setStatusMessage(outputInserted ? 'Computation complete. The result was added to the workspace.' : 'Computation complete. The result is available in the result panel; remove a node to place it on the canvas.')
        }
      } else setErrorMessage('The execution returned an invalid result.')
    } catch (err) {
      if (isCurrentRequest(request) && !isRequestCancelled(err)) setErrorMessage(getApiErrorMessage(err, 'Unable to execute the intent plan. Check your Gemini key.'))
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

  const adaptationForOption = (optionId: 'opt_churn' | 'opt_trend'): AdaptationRequest => ({
    adaptationOptionId: optionId,
    filterModifier: optionId === 'opt_churn' ? 'enterprise' : 'trend',
  })

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
    setViewMode('interactive')
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
        // Standalone: client-side PDF text — best-effort via FileReader; for full extraction add pdfjs-dist
        try {
          const text = await readTextFile(file, readController.signal)
          contentSummary = text.slice(0, 10_000) || `PDF: ${safeFileName} (${file.size} bytes)`
        } catch {
          contentSummary = `PDF: ${safeFileName} (${file.size} bytes)`
        }
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
         type: isImage ? 'example' : isDataset ? 'dataset' : 'document',
        position: findVisibleNodePosition(280, 160),
         dataPayload: { mimeType: isPdf ? 'application/pdf' : file.type.slice(0, 160) || 'application/octet-stream', contentSummary, rawReference: safeFileName, previewUrl },
       }
       addNode(uploadedNode)
       setViewMode('interactive')
       setStatusMessage(`Added "${safeFileName}" to the Intent Canvas workspace. The workspace node is retained in this browser.`)
    } catch (error) {
      if (mountedRef.current && !isRequestCancelled(error)) setErrorMessage(getApiErrorMessage(error, 'The selected file could not be read or parsed.'))
    } finally {
      if (fileReadController.current === readController) fileReadController.current = null
    }
  }

  // Save Executed Output as Higher-Order Custom Primitive — standalone, no backend
  const handleSaveAsPrimitive = async () => {
    if (isSavingPrimitive) return
    if (useCanvasStore.getState().nodes.length >= 30) {
      setErrorMessage('The canvas is full. Remove a node before saving a primitive.')
      return
    }
    setErrorMessage(null)
    setStatusMessage(null)
    setIsSavingPrimitive(true)
    try {
      const primitiveId = `primitive_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      const inputNodeTypes = [...new Set(useCanvasStore.getState().nodes.filter((node: CanvasNode) => node.type !== 'output').map((node: CanvasNode) => node.type))] as CanvasNode['type'][]
      const primitiveRecord = {
        primitiveId,
        title: APP_CONFIG.primitiveTitle,
        description: APP_CONFIG.primitiveDescription,
        inputNodeTypes,
        createdAt: Date.now(),
      }
      if (!isCustomPrimitiveRecord(primitiveRecord)) throw new Error('Invalid primitive')
      addCustomPrimitive(primitiveRecord)
      const primitiveNode: CanvasNode = {
        id: primitiveId,
        title: primitiveRecord.title,
        type: 'custom_primitive',
        position: findVisibleNodePosition(300, 160),
        dataPayload: {
          mimeType: 'application/x-intent-primitive',
          contentSummary: 'Saved plan record for the current canvas. Re-execution with new inputs is not enabled in this MVP.',
        },
      }
      addNode(primitiveNode)
      setStatusMessage(`Custom primitive "${primitiveRecord.title}" created.`)
    } catch (err) {
      if (!isRequestCancelled(err)) setErrorMessage(getApiErrorMessage(err, 'Unable to create the custom primitive.'))
    } finally {
      setIsSavingPrimitive(false)
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
        {/* Render Navbar & IntentBar ONLY in interactive canvas view mode */}
        <Navbar />
        <div className="absolute top-16 left-1/2 z-40 -translate-x-1/2">
          <ApiKeyBar />
        </div>
        {viewMode === 'interactive' && <IntentBar {...intentHandlers} />}

        {/* View Mode Switcher: Showcase vs Interactive Spatial Canvas */}
        {viewMode === 'showcase' ? (
           <SpatialScroll />
        ) : (
          <SpatialCanvas onAddFile={handleAddFile} />
        )}

        {/* In-Canvas Result Overlay Container */}
        {executionResult && viewMode === 'interactive' && (
            <div data-scrollable="true" onWheel={(event) => event.stopPropagation()} className="absolute top-20 right-6 z-[55] max-h-[calc(100dvh-7rem)] max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded-2xl pb-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <ResultNodeCard
              result={executionResult}
              onSaveAsPrimitive={handleSaveAsPrimitive}
              isSavingPrimitive={isSavingPrimitive}
            />
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

        {/* Disambiguation Option Gate Modal */}
        {disambiguationData && (
          <DisambiguationModal
            reason={disambiguationData.reason}
            options={disambiguationData.options}
             onSelectOption={(optId) => {
               if (optId !== 'opt_churn' && optId !== 'opt_trend') {
                 setErrorMessage('The service returned an unsupported adaptation option.')
                 return
               }
               handleExecuteComputation(adaptationForOption(optId))
             }}
            onClose={closeDisambiguation}
            isLoading={isExecutingPlan}
          />
        )}
      </main>
    </SmoothScrollProvider>
  )
}
