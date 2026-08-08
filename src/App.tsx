import React, { useState } from 'react'
import axios from 'axios'
import { SmoothScrollProvider } from './components/providers/SmoothScrollProvider'
import { SpatialScroll } from './SpatialScroll'
import { SpatialCanvas } from './components/canvas/SpatialCanvas'
import { useCanvasStore } from './store/useCanvasStore'
import { Navbar } from './components/layout/Navbar'
import { IntentBar } from './components/canvas/IntentBar'
import { PlanPreviewModal } from './components/canvas/PlanPreviewModal'
import { ResultNodeCard } from './components/canvas/ResultNodeCard'
import { DisambiguationModal } from './components/canvas/DisambiguationModal'
import { CanvasNode } from './types/canvas'

export default function App() {
  const {
    nodes,
    edges,
    activeIntentPrompt,
    activePlan,
    executionResult,
    isEvaluatingPlan,
    isExecutingPlan,
    viewMode,
    setIsEvaluatingPlan,
    setIsExecutingPlan,
    setActivePlan,
    setExecutionResult,
    addNode,
    addCustomPrimitive,
  } = useCanvasStore()

  const [showPlanModal, setShowPlanModal] = useState(false)
  const [disambiguationData, setDisambiguationData] = useState<any>(null)

  // Compile Spatial Canvas AST Payload
  const getASTPayload = () => ({
    canvasId: 'demo_canvas_1',
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
      distancePixels: 240,
    })),
    spatialClusters: [
      {
        clusterId: 'cluster_1',
        nodeIds: nodes.map((n) => n.id),
        boundingBox: { minX: 100, minY: 140, maxX: 1060, maxY: 300 },
      },
    ],
    activeIntentInput: {
      modality: 'text' as const,
      rawPrompt: activeIntentPrompt,
      timestamp: Date.now(),
    },
  })

  // Evaluate Intent & Inspect Plan
  const handleEvaluatePlan = async () => {
    setIsEvaluatingPlan(true)
    try {
      const res = await axios.post('/api/intent/plan', getASTPayload())
      if (res.data?.success) {
        setActivePlan(res.data.data)
        setShowPlanModal(true)
      }
    } catch (err) {
      console.error('[Plan Evaluation Error]:', err)
    } finally {
      setIsEvaluatingPlan(false)
    }
  }

  // Execute Intent & Render In-Canvas Result
  const handleExecuteComputation = async (filterModifier?: string) => {
    setIsExecutingPlan(true)
    setShowPlanModal(false)
    setDisambiguationData(null)
    try {
      const res = await axios.post('/api/intent/execute', {
        ...getASTPayload(),
        filterModifier,
      })

      if (res.data?.success) {
        const data = res.data.data
        if (data.executionStatus === 'disambiguation_required') {
          setDisambiguationData(data.disambiguation)
        } else {
          setExecutionResult(data)
        }
      }
    } catch (err) {
      console.error('[Execution Error]:', err)
    } finally {
      setIsExecutingPlan(false)
    }
  }

  // Step 2 Adaptability Flow
  const handleFilterEnterprise = () => {
    handleExecuteComputation('enterprise')
  }

  // Add New Document Node
  const handleAddNewNode = () => {
    const newNode: CanvasNode = {
      id: `node_doc_${Date.now()}`,
      title: 'Q3_Strategy_Brief.pdf',
      type: 'document',
      position: { x: 300, y: 340, width: 280, height: 160 },
      dataPayload: {
        mimeType: 'application/pdf',
        contentSummary: 'Strategic growth roadmap & retention targets for enterprise and SMB self-service accounts.',
      },
    }
    addNode(newNode)
  }

  // Save Executed Output as Higher-Order Custom Primitive
  const handleSaveAsPrimitive = async () => {
    try {
      const res = await axios.post('/api/intent/create-primitive', {
        title: 'Revenue Anomaly & Sentiment Primitive',
        description: 'User-composed dynamic computational primitive',
        inputNodeTypes: ['dataset', 'document'],
        ast: getASTPayload(),
      })

      if (res.data?.success) {
        const primitive = res.data.data
        addCustomPrimitive(primitive)
        const primitiveNode: CanvasNode = {
          id: primitive.primitiveId,
          title: primitive.title,
          type: 'custom_primitive',
          position: { x: 500, y: 340, width: 300, height: 160 },
          dataPayload: {
            mimeType: 'application/x-intent-primitive',
            contentSummary: 'Composed Higher-Order Primitive: Automatically executes data anomaly detection & qualitative sentiment synthesis.',
          },
        }
        addNode(primitiveNode)
        alert(`Object Created: Custom Computational Primitive "${primitive.title}"!`)
      }
    } catch (err) {
      console.error('[Create Primitive Error]:', err)
    }
  }

  const intentHandlers = {
    onEvaluatePlan: handleEvaluatePlan,
    onExecuteComputation: () => handleExecuteComputation(),
    onFilterEnterprise: handleFilterEnterprise,
    onAddNewNode: handleAddNewNode,
  };

  return (
    <SmoothScrollProvider>
      <main className="relative h-screen w-screen overflow-hidden bg-[#040406]">
        {/* Render Navbar & IntentBar ONLY in interactive canvas view mode */}
        {viewMode === 'interactive' && (
          <>
            <Navbar />
            <IntentBar {...intentHandlers} />
          </>
        )}

        {/* View Mode Switcher: Showcase vs Interactive Spatial Canvas */}
        {viewMode === 'showcase' ? (
          <SpatialScroll {...intentHandlers} />
        ) : (
          <SpatialCanvas />
        )}

        {/* In-Canvas Result Overlay Container */}
        {executionResult && (
          <div className="absolute top-20 right-6 z-30 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <ResultNodeCard
              result={executionResult}
              onSaveAsPrimitive={handleSaveAsPrimitive}
            />
          </div>
        )}

        {/* Inspectable Execution Plan Modal */}
        {showPlanModal && activePlan && (
          <PlanPreviewModal
            plan={activePlan}
            isExecuting={isExecutingPlan}
            onExecute={() => handleExecuteComputation()}
            onClose={() => setShowPlanModal(false)}
          />
        )}

        {/* Disambiguation Option Gate Modal */}
        {disambiguationData && (
          <DisambiguationModal
            reason={disambiguationData.reason}
            options={disambiguationData.options}
            onSelectOption={(optId) => handleExecuteComputation(optId)}
            onClose={() => setDisambiguationData(null)}
          />
        )}
      </main>
    </SmoothScrollProvider>
  )
}
