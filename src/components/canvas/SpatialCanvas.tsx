import React, { useRef, useState, useEffect } from 'react';
import { useCanvasStore } from '../../store/useCanvasStore';
import { CanvasNodeCard } from './CanvasNodeCard';
import { CanvasSVGEdges } from './CanvasSVGEdges';

export const SpatialCanvas: React.FC = () => {
  const {
    nodes,
    edges,
    pan,
    zoom,
    selectedNodeIds,
    setPan,
    setZoom,
    updateNodePosition,
    selectNode,
    clearSelection,
    addEdge,
  } = useCanvasStore();

  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [activeDraggingNodeId, setActiveDraggingNodeId] = useState<string | null>(null);
  const [nodeOffset, setNodeOffset] = useState({ x: 0, y: 0 });
  const [connectingSourceId, setConnectingSourceId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Global mouse release safety listener to prevent stuck drag states
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsPanning(false);
      setActiveDraggingNodeId(null);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('mouseleave', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('mouseleave', handleGlobalMouseUp);
    };
  }, []);

  // Pan Canvas Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).id === 'canvas-background') {
      clearSelection();
      setConnectingSourceId(null);
      setIsPanning(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    } else if (activeDraggingNodeId) {
      // 60fps Uncontrolled transient position update
      const newX = (e.clientX - pan.x) / zoom - nodeOffset.x;
      const newY = (e.clientY - pan.y) / zoom - nodeOffset.y;
      updateNodePosition(activeDraggingNodeId, newX, newY);
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setActiveDraggingNodeId(null);
  };

  // Wheel Zoom Handler
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.96 : 1.04;
    const newZoom = Math.min(Math.max(zoom * zoomFactor, 0.5), 2.0);
    setZoom(newZoom);
  };

  // Node Drag Handler
  const handleNodeMouseDown = (e: React.MouseEvent, node: (typeof nodes)[0]) => {
    e.stopPropagation();
    selectNode(node.id, e.shiftKey);
    setActiveDraggingNodeId(node.id);
    setNodeOffset({
      x: (e.clientX - pan.x) / zoom - node.position.x,
      y: (e.clientY - pan.y) / zoom - node.position.y,
    });
  };

  // Node Connection Handler
  const handleStartConnection = (nodeId: string) => {
    if (connectingSourceId && connectingSourceId !== nodeId) {
      addEdge(connectingSourceId, nodeId);
      setConnectingSourceId(null);
    } else {
      setConnectingSourceId(nodeId);
    }
  };

  return (
    <div
      ref={containerRef}
      id="canvas-background"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      className="relative h-full w-full overflow-hidden bg-[#040406] bg-obsidian-grid cursor-grab active:cursor-grabbing"
    >
      {/* Pan & Zoom Transform Matrix Viewport */}
      <div
        style={{
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0px) scale(${zoom})`,
          transformOrigin: '0 0',
          willChange: 'transform',
        }}
        className="absolute inset-0 h-full w-full"
      >
        {/* Render Bezier Connector Lines */}
        <CanvasSVGEdges nodes={nodes} edges={edges} />

        {/* Render Spatial Canvas Nodes */}
        {nodes.map((node) => (
          <div
            key={node.id}
            onMouseDown={(e) => handleNodeMouseDown(e, node)}
            style={{
              position: 'absolute',
              transform: `translate3d(${node.position.x}px, ${node.position.y}px, 0px)`,
              willChange: 'transform',
              zIndex: connectingSourceId === node.id ? 30 : 20,
            }}
          >
            <CanvasNodeCard
              node={node}
              isSelected={selectedNodeIds.includes(node.id)}
              onSelect={(e) => handleNodeMouseDown(e, node)}
              onStartConnection={handleStartConnection}
            />
          </div>
        ))}
      </div>

      {/* Active Connection Helper Toast Banner */}
      {connectingSourceId && (
        <div className="absolute top-6 left-1/2 z-40 -translate-x-1/2 rounded-full border border-[#00ff87]/40 bg-[#090a0f]/90 px-4 py-1.5 text-xs font-semibold text-[#00ff87] shadow-2xl backdrop-blur-xl animate-pulse">
          Click "Connect Relation" on target node to link edge...
        </div>
      )}
    </div>
  );
};
