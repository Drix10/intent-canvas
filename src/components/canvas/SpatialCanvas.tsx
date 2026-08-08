import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useCanvasStore } from '../../store/useCanvasStore';
import { CanvasNodeCard } from './CanvasNodeCard';
import { CanvasSVGEdges } from './CanvasSVGEdges';
import { APP_CONFIG } from '../../config';

export const SpatialCanvas: React.FC = () => {
  const nodes = useCanvasStore((state) => state.nodes);
  const edges = useCanvasStore((state) => state.edges);
  const pan = useCanvasStore((state) => state.pan);
  const zoom = useCanvasStore((state) => state.zoom);
  const selectedNodeIds = useCanvasStore((state) => state.selectedNodeIds);
  const setActiveIntentPrompt = useCanvasStore((state) => state.setActiveIntentPrompt);
  const resetVersion = useCanvasStore((state) => state.resetVersion);
  const setPan = useCanvasStore((state) => state.setPan);
  const setZoom = useCanvasStore((state) => state.setZoom);
  const updateNodePosition = useCanvasStore((state) => state.updateNodePosition);
  const selectNode = useCanvasStore((state) => state.selectNode);
  const clearSelection = useCanvasStore((state) => state.clearSelection);
  const addEdge = useCanvasStore((state) => state.addEdge);

  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [activeDraggingNodeId, setActiveDraggingNodeId] = useState<string | null>(null);
  const [nodeOffset, setNodeOffset] = useState({ x: 0, y: 0 });
  const [connectingSourceId, setConnectingSourceId] = useState<string | null>(null);
  const [dragBlocked, setDragBlocked] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const activePointerId = useRef<number | null>(null);
  const captureElement = useRef<HTMLElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const pendingPan = useRef<{ x: number; y: number } | null>(null);
  const pendingNode = useRef<{ id: string; x: number; y: number } | null>(null);

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
    finishPointer(activePointerId.current ?? -1);
    setConnectingSourceId(null);
  }, [finishPointer, resetVersion]);

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
      style={{ touchAction: 'none' }}
      className="relative h-full w-full overflow-hidden bg-[#040406] bg-obsidian-grid cursor-grab active:cursor-grabbing"
    >
      <div
        onPointerDown={handleBackgroundPointerDown}
        style={{ transform: `translate3d(${pan.x}px, ${pan.y}px, 0px) scale(${zoom})`, transformOrigin: '0 0', willChange: 'transform' }}
        className="absolute inset-0 h-full w-full"
      >
        <CanvasSVGEdges nodes={nodes} edges={edges} />
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
            <CanvasNodeCard node={node} isSelected={selectedNodeIds.includes(node.id)} onStartConnection={handleStartConnection} />
          </div>
        ))}
      </div>

      {connectingSourceId && (
        <div role="status" className="absolute top-6 left-1/2 z-40 -translate-x-1/2 rounded-full border border-[#00ff87]/40 bg-[#090a0f]/90 px-4 py-1.5 text-xs font-semibold text-[#00ff87] shadow-2xl backdrop-blur-xl">
          Choose another node to connect, or click Connect Relation again to cancel.
        </div>
      )}
       {showGuide && !connectingSourceId && (
         <div className="absolute top-24 left-5 z-40 w-[min(25rem,calc(100vw-2rem))] rounded-3xl border border-[#00ff87]/20 bg-[#090a0f]/95 p-5 text-xs text-neutral-300 shadow-2xl backdrop-blur-xl">
           <div className="mb-3 flex items-start justify-between gap-4">
             <div>
               <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#00ff87]">Start with intent</p>
               <p className="mt-2 text-base font-medium text-white">Shape your first computation</p>
               <p className="mt-1 leading-relaxed text-neutral-400">Your starter nodes are ready. Arrange context, connect related sources, then describe the outcome you want.</p>
             </div>
             <button type="button" aria-label="Close canvas guide" onClick={() => setShowGuide(false)} className="text-lg leading-none text-neutral-400 hover:text-white">&times;</button>
           </div>
           <div className="mb-4 grid grid-cols-3 gap-2 text-[10px]">
             <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2"><span className="block font-semibold text-white">01</span><span className="mt-1 block text-neutral-500">Arrange</span></div>
             <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2"><span className="block font-semibold text-white">02</span><span className="mt-1 block text-neutral-500">Connect</span></div>
             <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2"><span className="block font-semibold text-white">03</span><span className="mt-1 block text-neutral-500">Compute</span></div>
           </div>
           <button type="button" onClick={() => { setActiveIntentPrompt(APP_CONFIG.defaultIntentPrompt); document.getElementById('intent-prompt')?.focus(); }} className="w-full rounded-xl border border-[#00ff87]/30 bg-[#00ff87]/10 px-3 py-2.5 text-left text-[11px] font-medium text-[#b8ffd9] transition-colors hover:bg-[#00ff87]/20">
             Try the guided intent: <span className="text-[#00ff87]">why revenue dropped in August</span>
           </button>
           <ul className="mt-3 space-y-1 text-[11px] text-neutral-500">
             <li>Drag the canvas background to pan.</li>
             <li>Drag a node or use arrow keys to reposition it.</li>
             <li>Use Connect Relation to link two nodes.</li>
           </ul>
         </div>
      )}
      {dragBlocked && (
        <div role="status" className="absolute bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-full border border-amber-400/40 bg-[#090a0f]/95 px-4 py-2 text-xs font-semibold text-amber-300 shadow-2xl">
          Move blocked: nodes keep a clear working gap.
        </div>
      )}
      {nodes.length === 0 && (
        <div role="status" className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-neutral-400">
          Add a file, image, or document to begin shaping an intent.
        </div>
      )}
    </div>
  );
};
