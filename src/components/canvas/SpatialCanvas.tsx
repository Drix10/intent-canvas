import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useCanvasStore } from '../../store/useCanvasStore';
import { CanvasNodeCard } from './CanvasNodeCard';
import { CanvasSVGEdges } from './CanvasSVGEdges';
import { APP_CONFIG } from '../../config';
import { Sparkles, RotateCcw, ZoomIn, ZoomOut, Maximize2, HelpCircle, Layers, Network, GitBranch, Ruler, HardDrive, Trash2 } from 'lucide-react';
import { buildSpatialEdges } from '../../utils/spatialRelations';

export const SpatialCanvas: React.FC<{ onAddFile?: (file: File) => void }> = ({ onAddFile }) => {
  const nodes = useCanvasStore((state) => state.nodes);
  const edges = useCanvasStore((state) => state.edges);
  const pan = useCanvasStore((state) => state.pan);
  const zoom = useCanvasStore((state) => state.zoom);
  const selectedNodeIds = useCanvasStore((state) => state.selectedNodeIds);
  const hasResult = useCanvasStore((state) => Boolean(state.executionResult));
  const setActiveIntentPrompt = useCanvasStore((state) => state.setActiveIntentPrompt);
  const resetVersion = useCanvasStore((state) => state.resetVersion);
  const resetDemoCanvas = useCanvasStore((state) => state.resetDemoCanvas);
  const clearCanvas = useCanvasStore((state) => state.clearCanvas);
  const setPan = useCanvasStore((state) => state.setPan);
  const setZoom = useCanvasStore((state) => state.setZoom);
  const updateNodePosition = useCanvasStore((state) => state.updateNodePosition);
  const selectNode = useCanvasStore((state) => state.selectNode);
  const clearSelection = useCanvasStore((state) => state.clearSelection);
  const addEdge = useCanvasStore((state) => state.addEdge);
  const removeEdge = useCanvasStore((state) => state.removeEdge);
  const removeNode = useCanvasStore((state) => state.removeNode);
  const updateNode = useCanvasStore((state) => state.updateNode);

  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [activeDraggingNodeId, setActiveDraggingNodeId] = useState<string | null>(null);
  const [nodeOffset, setNodeOffset] = useState({ x: 0, y: 0 });
  const [connectingSourceId, setConnectingSourceId] = useState<string | null>(null);
  const [dragBlocked, setDragBlocked] = useState(false);
  const [movementMessage, setMovementMessage] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const [isFileOver, setIsFileOver] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftSummary, setDraftSummary] = useState('');
  const contextNodes = nodes.filter(node => node.type !== 'output');
  const contextEdges = edges.filter(edge => contextNodes.some(node => node.id === edge.sourceNodeId) && contextNodes.some(node => node.id === edge.targetNodeId));
  const contextSpatialEdges = buildSpatialEdges(contextNodes, contextEdges);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activePointerId = useRef<number | null>(null);
  const captureElement = useRef<HTMLElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const pendingPan = useRef<{ x: number; y: number } | null>(null);
  const pendingNode = useRef<{ id: string; x: number; y: number } | null>(null);
  const dragDepth = useRef(0);

  const flushPointerUpdate = useCallback(() => {
    if (pendingPan.current) setPan(pendingPan.current);
    if (pendingNode.current) setDragBlocked(updateNodePosition(pendingNode.current.id, pendingNode.current.x, pendingNode.current.y) === 'collision');
    pendingPan.current = null;
    pendingNode.current = null;
    frameRef.current = null;
  }, [setPan, updateNodePosition]);

  const schedulePointerUpdate = useCallback(() => {
    if (frameRef.current === null) frameRef.current = requestAnimationFrame(flushPointerUpdate);
  }, [flushPointerUpdate]);

  const finishPointer = useCallback((pointerId: number) => {
    if (activePointerId.current !== pointerId) return;
    flushPointerUpdate();
    if (captureElement.current?.hasPointerCapture(pointerId)) captureElement.current.releasePointerCapture(pointerId);
    activePointerId.current = null;
    captureElement.current = null;
    setIsPanning(false);
    setActiveDraggingNodeId(null);
    setDragBlocked(false);
  }, [flushPointerUpdate]);

  useEffect(() => {
    const handleGlobalPointerEnd = (event: PointerEvent) => finishPointer(event.pointerId);
    window.addEventListener('pointerup', handleGlobalPointerEnd);
    window.addEventListener('pointercancel', handleGlobalPointerEnd);
    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerEnd);
      window.removeEventListener('pointercancel', handleGlobalPointerEnd);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [finishPointer]);

  useEffect(() => {
    const pointerId = activePointerId.current;
    if (pointerId !== null) finishPointer(pointerId);
    setConnectingSourceId(null);
  }, [finishPointer, resetVersion]);

  useEffect(() => {
    const editingNode = nodes.find((node) => node.id === editingNodeId);
    if (!editingNode) {
      setEditingNodeId(null);
      return;
    }
    setDraftTitle(editingNode.title);
    setDraftSummary(editingNode.dataPayload.contentSummary);
  }, [editingNodeId]);

  // Auto-center canvas nodes on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const initialPanX = Math.max(20, Math.round((window.innerWidth - 1100) / 2));
    const initialPanY = Math.max(90, Math.round((window.innerHeight - 450) / 2));
    setPan({ x: initialPanX, y: initialPanY });
    setZoom(1);
  }, [setPan, setZoom]);

  const handleBackgroundPointerDown = (event: React.PointerEvent) => {
    if (activePointerId.current !== null) return;
    clearSelection();
    setConnectingSourceId(null);
    setDragBlocked(false);
    activePointerId.current = event.pointerId;
    captureElement.current = event.currentTarget as HTMLElement;
    captureElement.current.setPointerCapture(event.pointerId);
    setIsPanning(true);
    setDragStart({ x: event.clientX - pan.x, y: event.clientY - pan.y });
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    if (activePointerId.current !== event.pointerId) return;
    if (isPanning) {
      pendingPan.current = { x: event.clientX - dragStart.x, y: event.clientY - dragStart.y };
      schedulePointerUpdate();
      return;
    }
    if (!activeDraggingNodeId) return;
    const newX = (event.clientX - pan.x) / zoom - nodeOffset.x;
    const newY = (event.clientY - pan.y) / zoom - nodeOffset.y;
    pendingNode.current = { id: activeDraggingNodeId, x: newX, y: newY };
    schedulePointerUpdate();
  };

  const handlePointerUp = (event: React.PointerEvent) => finishPointer(event.pointerId);

  const handleWheel = (event: React.WheelEvent) => {
    event.preventDefault();
    const zoomFactor = event.deltaY > 0 ? 0.96 : 1.04;
    const nextZoom = Math.min(Math.max(zoom * zoomFactor, APP_CONFIG.minZoom), APP_CONFIG.maxZoom);
    if (nextZoom === zoom) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cursorWorld = {
      x: (event.clientX - rect.left - pan.x) / zoom,
      y: (event.clientY - rect.top - pan.y) / zoom,
    };
    setPan({
      x: event.clientX - rect.left - cursorWorld.x * nextZoom,
      y: event.clientY - rect.top - cursorWorld.y * nextZoom,
    });
    setZoom(nextZoom);
  };

  const handleFileDrop = (event: React.DragEvent) => {
    event.preventDefault();
    dragDepth.current = 0;
    setIsFileOver(false);
    const file = event.dataTransfer.files[0];
    if (file && onAddFile) onAddFile(file);
  };

  const handleNodePointerDown = (event: React.PointerEvent, node: (typeof nodes)[0]) => {
    event.stopPropagation();
    if (activePointerId.current !== null) return;
    selectNode(node.id, event.shiftKey);
    activePointerId.current = event.pointerId;
    captureElement.current = event.currentTarget as HTMLElement;
    captureElement.current.setPointerCapture(event.pointerId);
    setActiveDraggingNodeId(node.id);
    setDragBlocked(false);
    setNodeOffset({
      x: (event.clientX - pan.x) / zoom - node.position.x,
      y: (event.clientY - pan.y) / zoom - node.position.y,
    });
  };

  const handleNodeKeyDown = (event: React.KeyboardEvent, node: (typeof nodes)[0]) => {
    if ((event.target as HTMLElement).closest('button, input, textarea, select, a')) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectNode(node.id, event.shiftKey);
      return;
    }
    const distance = event.shiftKey ? 100 : 20;
    const movement: Record<string, [number, number]> = {
      ArrowUp: [0, -distance],
      ArrowDown: [0, distance],
      ArrowLeft: [-distance, 0],
      ArrowRight: [distance, 0],
    };
    const offset = movement[event.key];
    if (!offset) return;
    event.preventDefault();
    let result: ReturnType<typeof updateNodePosition> = 'collision';
    for (let step = distance; step > 0; step -= 1) {
      result = updateNodePosition(node.id, node.position.x + Math.sign(offset[0]) * step, node.position.y + Math.sign(offset[1]) * step);
      if (result === 'updated' || result !== 'collision') break;
    }
    setDragBlocked(result === 'collision');
    setMovementMessage(result === 'collision' ? 'Movement blocked because nodes need a clear working gap.' : result === 'updated' ? 'Node moved.' : 'Node could not be moved.');
  };

  const handleStartConnection = useCallback((nodeId: string) => {
    if (connectingSourceId && connectingSourceId !== nodeId) {
      addEdge(connectingSourceId, nodeId);
      setConnectingSourceId(null);
    } else if (connectingSourceId === nodeId) {
      setConnectingSourceId(null);
    } else {
      setConnectingSourceId(nodeId);
    }
  }, [addEdge, connectingSourceId]);

  const handleRemoveConnection = useCallback((nodeId: string) => {
    const relation = edges.find(edge => edge.sourceNodeId === nodeId || edge.targetNodeId === nodeId);
    if (relation) removeEdge(relation.id);
  }, [edges, removeEdge]);

  const resetView = () => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  };

  return (
    <div
      ref={containerRef}
      id="canvas-background"
      tabIndex={-1}
      role="region"
      aria-label="Spatial intent canvas"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
      onDragEnter={(event) => { event.preventDefault(); dragDepth.current += 1; setIsFileOver(true); }}
      onDragOver={(event) => { event.preventDefault(); setIsFileOver(true); }}
      onDragLeave={(event) => { event.preventDefault(); dragDepth.current = Math.max(0, dragDepth.current - 1); if (!dragDepth.current) setIsFileOver(false); }}
      onDrop={handleFileDrop}
      style={{ touchAction: 'none' }}
      className="relative h-full w-full overflow-hidden bg-[#040406] bg-obsidian-grid cursor-grab active:cursor-grabbing select-none"
    >
      <div
        onPointerDown={handleBackgroundPointerDown}
        style={{ transform: `translate3d(${pan.x}px, ${pan.y}px, 0px) scale(${zoom})`, transformOrigin: '0 0', willChange: 'transform' }}
        className="absolute inset-0 h-full w-full"
      >
          <CanvasSVGEdges nodes={nodes} edges={contextSpatialEdges} />
        {nodes.map((node) => (
          <div
            key={node.id}
            onPointerDown={(event) => handleNodePointerDown(event, node)}
            onKeyDown={(event) => handleNodeKeyDown(event, node)}
            role="group"
            aria-roledescription="canvas node"
            aria-grabbed={activeDraggingNodeId === node.id}
            aria-selected={selectedNodeIds.includes(node.id)}
            tabIndex={0}
            aria-label={`${node.title}, ${node.type.replace('_', ' ')}. Use arrow keys to move.`}
            style={{ position: 'absolute', transform: `translate3d(${node.position.x}px, ${node.position.y}px, 0px)`, willChange: 'transform', zIndex: connectingSourceId === node.id ? 30 : 20 }}
            className="rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-[#00ff87] focus-visible:ring-offset-2 focus-visible:ring-offset-[#040406]"
          >
             <CanvasNodeCard
               node={node}
               isSelected={selectedNodeIds.includes(node.id)}
               onStartConnection={handleStartConnection}
               onRemove={removeNode}
               onEdit={node.type !== 'output' ? (nodeId) => setEditingNodeId(nodeId) : undefined}
               isConnectingSource={connectingSourceId === node.id}
               hasConnections={contextEdges.some(edge => edge.sourceNodeId === node.id || edge.targetNodeId === node.id)}
               onRemoveConnection={handleRemoveConnection}
               isConnectionTarget={node.type !== 'output' && Boolean(connectingSourceId && connectingSourceId !== node.id && !contextSpatialEdges.some(edge => (edge.sourceNodeId === connectingSourceId && edge.targetNodeId === node.id) || (edge.sourceNodeId === node.id && edge.targetNodeId === connectingSourceId)))}
               isConnectable={node.type !== 'output'}
             />
          </div>
        ))}
      </div>

      {/* Dynamic Status Pill when Connecting Nodes */}
      {connectingSourceId && (
        <div role="status" className="absolute top-20 left-1/2 z-40 -translate-x-1/2 rounded-full border border-[#00ff87]/40 bg-[#090a0f]/90 px-4 py-1.5 text-xs font-semibold text-[#00ff87] shadow-2xl backdrop-blur-xl animate-pulse">
          Click another node to connect a Bezier relation edge, or click again to cancel.
        </div>
      )}

      {/* Top-Right Collapsible Guidance HUD */}
      {!hasResult && (showGuide ? (
        <div className="absolute top-20 right-6 z-40 w-[min(24rem,calc(100vw-2rem))] rounded-3xl border border-[#00ff87]/25 bg-[#090a0f]/95 p-5 text-xs text-neutral-300 shadow-2xl backdrop-blur-2xl">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#00ff87] flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> Spatial Computing Primitive
              </p>
              <h4 className="mt-1 text-sm font-bold text-white">How Spatial Canvas Works</h4>
            </div>
            <button type="button" aria-label="Close guide" onClick={() => setShowGuide(false)} className="rounded-lg p-1 text-neutral-400 hover:bg-white/10 hover:text-white">
              &times;
            </button>
          </div>

          <div className="mb-3.5 grid grid-cols-3 gap-1.5 text-[10px]">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2">
              <span className="block font-bold text-[#00ff87]">01. Arrange</span>
             <span className="mt-0.5 block text-neutral-400">Drag cards within {APP_CONFIG.proximityDistancePixels}px to auto-cluster.</span>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2">
              <span className="block font-bold text-sky-400">02. Connect</span>
              <span className="mt-0.5 block text-neutral-400">Link explicit Bezier curve relations.</span>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2">
              <span className="block font-bold text-amber-400">03. Compute</span>
              <span className="mt-0.5 block text-neutral-400">State your goal in the Intent Bar.</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setActiveIntentPrompt(APP_CONFIG.defaultIntentPrompt);
              const el = document.getElementById('intent-prompt');
              if (el) el.focus();
            }}
            className="w-full rounded-xl border border-[#00ff87]/30 bg-[#00ff87]/10 px-3 py-2 text-left text-[11px] font-semibold text-[#b8ffd9] transition-colors hover:bg-[#00ff87]/20"
          >
             Try Guided Intent: <span className="text-[#00ff87]">"Identify the most important workspace risk"</span>
          </button>
        </div>
      ) : (
          <button
            type="button"
          onClick={() => setShowGuide(true)}
          className="absolute top-20 right-6 z-40 flex items-center gap-1.5 rounded-full border border-white/15 bg-[#090a0f]/90 px-3.5 py-1.5 text-xs font-semibold text-neutral-300 shadow-xl backdrop-blur-xl hover:border-[#00ff87]/50 hover:text-white"
        >
          <HelpCircle className="h-3.5 w-3.5 text-[#00ff87]" /> How Spatial Canvas Works
        </button>
      ))}

      {/* Bottom-Left Spatial Status HUD */}
      <div className="absolute top-1/2 left-3 z-40 flex w-14 -translate-y-1/2 flex-col items-center gap-3 rounded-2xl border border-white/15 bg-[#090a0f]/95 px-2 py-3 text-[10px] font-medium text-neutral-300 shadow-2xl backdrop-blur-2xl">
        <div className="flex flex-col items-center gap-1 border-b border-white/10 pb-2 font-bold text-[#00ff87]">
          <Layers className="h-4 w-4" />
          <span style={{ writingMode: 'vertical-rl' }}>AST</span>
        </div>
        <div className="flex flex-col items-center" title="Nodes"><Network className="h-3.5 w-3.5 text-neutral-500" aria-label="Nodes" /><strong className="font-mono text-white">{nodes.length}</strong></div>
        <div className="flex flex-col items-center" title="Edges"><GitBranch className="h-3.5 w-3.5 text-neutral-500" aria-label="Edges" /><strong className="font-mono text-white">{contextSpatialEdges.length}</strong></div>
        <div className="flex flex-col items-center" title="Proximity radius"><Ruler className="h-3.5 w-3.5 text-neutral-500" aria-label="Proximity radius" /><strong className="font-mono text-emerald-400">{APP_CONFIG.proximityDistancePixels}</strong></div>
        <div className="flex flex-col items-center" title="Local retention"><HardDrive className="h-3.5 w-3.5 text-neutral-500" aria-label="Local retention" /><strong className="text-emerald-400">On</strong></div>
        <button
          type="button"
          onClick={resetDemoCanvas}
          title="Restore Initial Starter Context"
          aria-label="Restore starter context"
          className="flex items-center justify-center rounded-lg border border-white/10 bg-white/5 p-1.5 text-neutral-300 hover:bg-white/10 hover:text-white"
        >
          <RotateCcw className="h-3 w-3 text-sky-400" />
        </button>
        <button
          type="button"
          onClick={() => { if (window.confirm('Clear every node and relationship from this canvas?')) clearCanvas(); }}
          title="Clear canvas"
          aria-label="Clear canvas"
          className="flex items-center justify-center rounded-lg border border-red-400/20 bg-red-400/5 p-1.5 text-red-300 hover:bg-red-400/10 hover:text-red-200"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {/* Bottom-Right Zoom HUD Controls */}
      {!hasResult && <div className="absolute bottom-28 right-6 z-40 flex items-center gap-1 rounded-2xl border border-white/15 bg-[#090a0f]/95 p-1.5 text-xs text-neutral-300 shadow-2xl backdrop-blur-2xl">
        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => setZoom(Math.max(APP_CONFIG.minZoom, zoom - 0.1))}
          title="Zoom Out"
          className="rounded-xl p-1.5 hover:bg-white/10 hover:text-white"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <span className="px-2 font-mono text-xs font-bold text-white">{Math.round(zoom * 100)}%</span>
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() => setZoom(Math.min(APP_CONFIG.maxZoom, zoom + 0.1))}
          title="Zoom In"
          className="rounded-xl p-1.5 hover:bg-white/10 hover:text-white"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <div className="h-4 w-px bg-white/10 mx-1" />
        <button
          type="button"
          aria-label="Reset canvas view"
          onClick={resetView}
          title="Reset View Position & Zoom"
          className="rounded-xl p-1.5 hover:bg-white/10 hover:text-white"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>}

      {/* Drag Collision Warning */}
      {dragBlocked && (
        <div role="status" className="absolute bottom-20 left-1/2 z-40 -translate-x-1/2 rounded-full border border-amber-400/40 bg-[#090a0f]/95 px-4 py-2 text-xs font-semibold text-amber-300 shadow-2xl">
          Move blocked: nodes keep a clear working gap.
        </div>
      )}

      <div className="sr-only" aria-live="polite">{movementMessage}</div>

      {isFileOver && (
        <div role="status" className="absolute inset-0 z-50 flex items-center justify-center bg-[#040406]/80 p-6 text-center backdrop-blur-sm">
          <div className="rounded-3xl border border-[#00ff87]/50 bg-[#090a0f]/95 px-8 py-10 text-[#b8ffd9] shadow-2xl">
            Drop PDF, CSV, text, JSON, or image files to add them to the canvas.
          </div>
        </div>
      )}

      {editingNodeId && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="edit-node-title">
          <div className="w-full max-w-lg rounded-3xl border border-white/15 bg-[#090a0f] p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between"><h2 id="edit-node-title" className="text-sm font-bold text-white">Edit context node</h2><button type="button" onClick={() => setEditingNodeId(null)} className="rounded-lg px-2 py-1 text-neutral-400 hover:bg-white/10 hover:text-white">&times;</button></div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400">Title<input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} maxLength={300} className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white outline-none focus:border-[#00ff87]/50" /></label>
            <label className="mt-3 block text-[10px] font-bold uppercase tracking-widest text-neutral-400">Context summary<textarea value={draftSummary} onChange={(event) => setDraftSummary(event.target.value)} maxLength={10_000} rows={7} className="mt-1 w-full resize-y rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs leading-relaxed text-white outline-none focus:border-[#00ff87]/50" /></label>
            <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setEditingNodeId(null)} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-neutral-300 hover:bg-white/5">Cancel</button><button type="button" disabled={!draftTitle.trim() || !draftSummary.trim()} onClick={() => { if (!editingNodeId || !draftTitle.trim() || !draftSummary.trim()) return; updateNode(editingNodeId, { title: draftTitle.trim(), contentSummary: draftSummary.trim() }); setEditingNodeId(null); }} className="rounded-xl bg-[#00ff87] px-4 py-2 text-xs font-bold text-black disabled:cursor-not-allowed disabled:opacity-40">Save changes</button></div>
          </div>
        </div>
      )}

      {/* High-Tech Smoked Glass Empty State Hub when all nodes are cleared */}
      {nodes.length === 0 && (
        <div role="status" className="absolute inset-0 z-30 flex items-center justify-center p-6 text-center">
          <div className="w-[min(28rem,calc(100vw-2rem))] rounded-3xl border border-white/15 bg-[#090a0f]/90 p-8 shadow-2xl backdrop-blur-2xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#00ff87]/30 bg-[#00ff87]/10 text-[#00ff87]">
              <Network className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-bold text-white">Spatial Intent Workspace Ready</h3>
            <p className="mt-2 text-xs leading-relaxed text-neutral-400">
               Your spatial graph AST is currently empty. Drop a PDF, CSV, text, JSON, or image file anywhere onto the canvas, or restore the starter context.
            </p>
             <div className="mt-6 flex flex-col gap-2">
              {onAddFile && (
                <>
                   <input ref={fileInputRef} type="file" accept=".pdf,.csv,.txt,.md,.json,image/png,image/jpeg,image/gif,image/webp,image/avif,image/bmp" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) onAddFile(file); event.target.value = ''; }} />
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="rounded-xl border border-[#00ff87]/30 bg-[#00ff87]/10 px-4 py-2.5 text-xs font-bold text-[#b8ffd9] hover:bg-[#00ff87]/20">
                    Add a supported file
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={resetDemoCanvas}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#00ff87] px-4 py-2.5 text-xs font-bold text-black hover:bg-[#00ff87]/90 shadow-[0_0_20px_rgba(0,255,135,0.3)] transition-all"
              >
                <RotateCcw className="h-4 w-4" /> Restore Starter Demo Context
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
