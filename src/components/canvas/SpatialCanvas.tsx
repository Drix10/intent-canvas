import React, { useRef, useState } from 'react';
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

  // Pan Canvas Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).id === 'canvas-background') {
      clearSelection();
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
        }}
        className="absolute inset-0 h-full w-full transition-transform duration-75 ease-out"
      >
        {/* SVG Relationship Edge Connectors */}
        <CanvasSVGEdges nodes={nodes} edges={edges} />

        {/* Spatial Node Cards */}
        {nodes.map((node) => (
          <div
            key={node.id}
            onMouseDown={(e) => handleNodeMouseDown(e, node)}
            style={{
              position: 'absolute',
              left: node.position.x,
              top: node.position.y,
            }}
          >
            <CanvasNodeCard
              node={node}
              isSelected={selectedNodeIds.includes(node.id)}
              onSelect={(e) => {
                if (connectingSourceId && connectingSourceId !== node.id) {
                  handleStartConnection(node.id);
                }
              }}
              onStartConnection={handleStartConnection}
            />
          </div>
        ))}
      </div>

      {/* Active Edge Connecting Indicator Banner */}
      {connectingSourceId && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 rounded-full border border-[#00ff87]/40 bg-[#090a0f]/90 px-4 py-1.5 text-xs font-semibold text-[#00ff87] shadow-xl backdrop-blur-md">
          Click any target node card to create a Spatial Graph Edge connection
        </div>
      )}
    </div>
  );
};
