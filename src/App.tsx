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
import { getApiErrorMessage, intentApi, intentPath, isExecutionPlan, isExecutionResult, isRequestCancelled } from './api'
import { createId } from './utils/id'

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

  const [showPlanModal, setShowPlanModal] = useState(false)
  const [disambiguationData, setDisambiguationData] = useState<NonNullable<ExecutionPlan['disambiguation']> | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [isSavingPrimitive, setIsSavingPrimitive] = useState(false)
  const closePlanModal = useCallback(() => setShowPlanModal(false), [])
  const closeDisambiguation = useCallback(() => setDisambiguationData(null), [])
  const requestRef = useRef<{ id: number; controller: AbortController; canvasKey: string } | null>(null)
  const requestSequence = useRef(0)

  const getCanvasKey = () => {
    const state = useCanvasStore.getState()
    return JSON.stringify({ nodes: state.nodes, edges: state.edges, activeIntentPrompt: state.activeIntentPrompt })
  }
  const cancelRequest = (clearSaving = true) => {
    requestRef.current?.controller.abort()
    requestRef.current = null
    if (clearSaving) setIsSavingPrimitive(false)
  }
  const beginRequest = () => {
    cancelRequest()
    const request = {
      id: ++requestSequence.current,
      controller: new AbortController(),
      canvasKey: getCanvasKey(),
    }
    requestRef.current = request
    return request
  }
  const isCurrentRequest = (request: typeof requestRef.current) => Boolean(
    request && requestRef.current?.id === request.id && request.canvasKey === getCanvasKey(),
  )
  const isActiveRequest = (request: typeof requestRef.current) => Boolean(request && requestRef.current?.id === request.id)

  useEffect(() => () => cancelRequest(false), [])
  useEffect(() => {
    const updateVisibility = () => document.body.dataset.pageHidden = String(document.hidden)
    updateVisibility()
    document.addEventListener('visibilitychange', updateVisibility)
    return () => document.removeEventListener('visibilitychange', updateVisibility)
  }, [])
  useEffect(() => {
    // Abort work as soon as its input graph changes, not only after a stale response arrives.
    cancelRequest()
    setIsEvaluatingPlan(false)
    setIsExecutingPlan(false)
    setShowPlanModal(false)
    setDisambiguationData(null)
    setActivePlan(null)
    setExecutionResult(null)
    setErrorMessage(null)
  }, [nodes, edges, activeIntentPrompt])
  useEffect(() => {
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
  const getASTPayload = () => ({
    canvasId: APP_CONFIG.canvasId,
    nodes: nodes.map((n) => ({
      id: n.id,
      title: n.title,
      type: n.type,
      position: n.position,
      dataPayload: n.dataPayload,
    })),
    edges: edges.map((e) => ({
      id: e.id,
      sourceNodeId: e.sourceNodeId,
      targetNodeId: e.targetNodeId,
      relationType: e.relationType,
         distancePixels: (() => {
         const source = nodes.find((node) => node.id === e.sourceNodeId)
         const target = nodes.find((node) => node.id === e.targetNodeId)
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
    spatialClusters: nodes.length === 0 ? [] : (() => {
      const bounds = nodes.reduce((result, node) => ({
        minX: Math.min(result.minX, node.position.x),
        minY: Math.min(result.minY, node.position.y),
        maxX: Math.max(result.maxX, node.position.x + node.position.width),
        maxY: Math.max(result.maxY, node.position.y + node.position.height),
      }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity })
      return [{ clusterId: APP_CONFIG.spatialClusterId, nodeIds: nodes.map((n) => n.id), boundingBox: bounds }]
    })(),
    activeIntentInput: {
      modality: 'text' as const,
      rawPrompt: activeIntentPrompt.trim() || APP_CONFIG.defaultIntentPrompt,
      timestamp: Date.now(),
    },
  })

  // Evaluate Intent & Inspect Plan
  const handleEvaluatePlan = async () => {
    const request = beginRequest()
    setErrorMessage(null)
    setStatusMessage(null)
    setIsExecutingPlan(false)
    setIsEvaluatingPlan(true)
    try {
      const res = await intentApi.post(intentPath('/api/intent/plan'), getASTPayload(), { signal: request.controller.signal })
      if (!isCurrentRequest(request)) {
        if (isActiveRequest(request)) setErrorMessage('The canvas changed while the plan was being prepared. Please try again.')
        return
      }
      if (res.data?.success && isExecutionPlan(res.data.data)) {
        setActivePlan(res.data.data)
        setShowPlanModal(true)
      } else {
        setErrorMessage(res.data?.message ?? 'The service returned an invalid execution plan.')
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
  const handleExecuteComputation = async (adaptation?: AdaptationRequest) => {
    const request = beginRequest()
    setErrorMessage(null)
    setStatusMessage(null)
    setIsEvaluatingPlan(false)
    setExecutionResult(null)
    setIsExecutingPlan(true)
    setShowPlanModal(false)
    setDisambiguationData(null)
    try {
      const res = await intentApi.post(intentPath('/api/intent/execute'), {
        ...getASTPayload(),
         adaptation,
      }, { signal: request.controller.signal })

      if (!isCurrentRequest(request)) {
        if (isActiveRequest(request)) setErrorMessage('The canvas changed while computation was running. Please run it again.')
        return
      }
      if (res.data?.success && isExecutionResult(res.data.data)) {
        const data = res.data.data
        if (data.executionStatus === 'disambiguation_required' && data.disambiguation?.options?.length) {
          setDisambiguationData(data.disambiguation)
        } else if (data.executionStatus === 'disambiguation_required') {
          setErrorMessage('The service requested clarification but returned no options.')
        } else {
          setExecutionResult(data)
          setViewMode('interactive')
        }
      } else setErrorMessage(res.data?.message ?? 'The service returned an invalid execution result.')
    } catch (err) {
      if (isCurrentRequest(request) && !isRequestCancelled(err)) setErrorMessage(getApiErrorMessage(err, 'Unable to execute the intent plan.'))
    } finally {
      if (isActiveRequest(request)) {
        setIsExecutingPlan(false)
        requestRef.current = null
      }
    }
  }

  // Step 2 Adaptability Flow
  const handleFilterEnterprise = () => {
    handleExecuteComputation({ adaptationOptionId: 'opt_churn', filterModifier: 'enterprise' })
  }

  const adaptationForOption = (optionId: 'opt_churn' | 'opt_trend'): AdaptationRequest => ({
    adaptationOptionId: optionId,
    filterModifier: optionId === 'opt_churn' ? 'enterprise' : 'trend',
  })

  // Add New Document Node
  const handleAddNewNode = () => {
    const newNode: CanvasNode = {
       id: createId('node_doc'),
       title: 'Q3_Strategy_Brief.pdf',
       type: 'document',
       position: findVisibleNodePosition(280, 160),
      dataPayload: {
        mimeType: 'application/pdf',
        contentSummary: 'Strategic growth roadmap & retention targets for enterprise and SMB self-service accounts.',
      },
    }
    addNode(newNode)
  }

  // Save Executed Output as Higher-Order Custom Primitive
  const handleSaveAsPrimitive = async () => {
    if (isSavingPrimitive) return
    const request = beginRequest()
    setErrorMessage(null)
    setStatusMessage(null)
    setIsSavingPrimitive(true)
    try {
      const res = await intentApi.post(intentPath('/api/intent/create-primitive'), {
        title: APP_CONFIG.primitiveTitle,
        description: APP_CONFIG.primitiveDescription,
        inputNodeTypes: [...new Set(nodes.map((node) => node.type))],
        ast: getASTPayload(),
      }, { signal: request.controller.signal })

      if (!isCurrentRequest(request)) {
        if (isActiveRequest(request)) setErrorMessage('The canvas changed while saving. Please try again.')
        return
      }
      if (res.data?.success && typeof res.data.data?.primitiveId === 'string' && typeof res.data.data?.title === 'string') {
        const primitive = res.data.data
        addCustomPrimitive(primitive)
        const primitiveNode: CanvasNode = {
          id: primitive.primitiveId,
          title: primitive.title,
          type: 'custom_primitive',
          position: findVisibleNodePosition(300, 160),
          dataPayload: {
            mimeType: 'application/x-intent-primitive',
            contentSummary: 'Composed Higher-Order Primitive: Automatically executes data anomaly detection & qualitative sentiment synthesis.',
          },
        }
        addNode(primitiveNode)
        setStatusMessage(`Custom computational primitive "${primitive.title}" created.`)
      } else setErrorMessage(res.data?.message ?? 'The service returned an invalid primitive.')
    } catch (err) {
      if (isCurrentRequest(request) && !isRequestCancelled(err)) setErrorMessage(getApiErrorMessage(err, 'Unable to create the custom primitive.'))
    } finally {
      if (isActiveRequest(request)) {
        setIsSavingPrimitive(false)
        requestRef.current = null
      }
    }
  }

  const intentHandlers = {
    onEvaluatePlan: handleEvaluatePlan,
    onExecuteComputation: () => handleExecuteComputation(),
    onFilterEnterprise: handleFilterEnterprise,
    onAddNewNode: handleAddNewNode,
  };

  return (
    <SmoothScrollProvider enabled={viewMode === 'showcase'}>
      <main className="relative h-screen w-screen overflow-hidden bg-[#040406]">
        <div data-app-content>
        {errorMessage && (
          <div role="alert" className="fixed top-5 left-1/2 z-[60] flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-3 rounded-xl border border-red-400/30 bg-red-950/90 px-4 py-3 text-xs text-red-100 shadow-2xl backdrop-blur-xl">
            <span>{errorMessage}</span>
            <button type="button" aria-label="Dismiss error" onClick={() => setErrorMessage(null)} className="text-red-200 hover:text-white">&times;</button>
          </div>
        )}
        {/* Render Navbar & IntentBar ONLY in interactive canvas view mode */}
        <Navbar />
        {viewMode === 'interactive' && <IntentBar {...intentHandlers} />}

        {/* View Mode Switcher: Showcase vs Interactive Spatial Canvas */}
        {viewMode === 'showcase' ? (
          <SpatialScroll {...intentHandlers} />
        ) : (
          <SpatialCanvas />
        )}

        {/* In-Canvas Result Overlay Container */}
        {executionResult && viewMode === 'interactive' && (
          <div className="absolute top-20 right-6 z-30 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <ResultNodeCard
              result={executionResult}
              onSaveAsPrimitive={handleSaveAsPrimitive}
              isSavingPrimitive={isSavingPrimitive}
            />
          </div>
        )}
        </div>

        {statusMessage && (
          <div role="status" aria-live="polite" className="fixed top-5 left-1/2 z-[60] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-xl border border-[#00ff87]/30 bg-[#05291b]/95 px-4 py-3 text-xs text-[#b8ffd9] shadow-2xl backdrop-blur-xl">
            {statusMessage}
            <button type="button" aria-label="Dismiss status" onClick={() => setStatusMessage(null)} className="ml-3 text-[#b8ffd9] hover:text-white">&times;</button>
          </div>
        )}

        {/* Inspectable Execution Plan Modal */}
        {showPlanModal && activePlan && (
          <PlanPreviewModal
            plan={activePlan}
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
