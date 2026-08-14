import React from 'react';
import { CanvasNode, CanvasEdge } from '../../types/canvas';

interface CanvasSVGEdgesProps {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

export const CanvasSVGEdges: React.FC<CanvasSVGEdgesProps> = ({ nodes, edges }) => {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const getNodeAnchor = (id: string, toward: { x: number; y: number }) => {
    const node = nodesById.get(id);
    if (!node) return null;
    const center = { x: node.position.x + node.position.width / 2, y: node.position.y + node.position.height / 2 };
    const dx = toward.x - center.x;
    const dy = toward.y - center.y;
    if (dx === 0 && dy === 0) return center;
    const scale = 1 / Math.max(Math.abs(dx) / (node.position.width / 2), Math.abs(dy) / (node.position.height / 2));
    return { x: center.x + dx * scale, y: center.y + dy * scale };
  };

  return (
    <svg aria-label="Spatial relationships" role="img" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible z-10">
      <defs>
        <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#00ff87" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.9" />
        </linearGradient>
      </defs>

      {edges.map((edge) => {
         const source = nodesById.get(edge.sourceNodeId);
         const target = nodesById.get(edge.targetNodeId);
        if (!source || !target) return null;
        const sourceCenter = { x: source.position.x + source.position.width / 2, y: source.position.y + source.position.height / 2 };
        const targetCenter = { x: target.position.x + target.position.width / 2, y: target.position.y + target.position.height / 2 };
        const start = getNodeAnchor(edge.sourceNodeId, targetCenter);
        const end = getNodeAnchor(edge.targetNodeId, sourceCenter);
        if (!start || !end) return null;

        const dx = end.x - start.x;
        const cx1 = start.x + dx * 0.5;
        const cy1 = start.y;
        const cx2 = start.x + dx * 0.5;
        const cy2 = end.y;

         const pathD = `M ${start.x} ${start.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${end.x} ${end.y}`;
         const isSemantic = edge.relationType === 'semantic_match';
         const isExplicit = edge.relationType === 'explicit_connector';

        // Exact Cubic Bezier Midpoint Calculation at t = 0.5
         const midX = 0.125 * start.x + 0.375 * cx1 + 0.375 * cx2 + 0.125 * end.x;
         const midY = 0.125 * start.y + 0.375 * cy1 + 0.375 * cy2 + 0.125 * end.y;
        return (
          <g key={edge.id}>
            <title>{`${source.title} to ${target.title}: ${edge.label || edge.relationType}`}</title>
            {/* Ambient Background Glow Path */}
            <path
              d={pathD}
              fill="none"
               stroke={isSemantic ? '#c084fc' : '#00ff87'}
              strokeWidth="5"
              strokeOpacity="0.2"
            />
            {/* Primary Glowing Curve */}
            <path
              d={pathD}
              fill="none"
               stroke={isSemantic ? '#c084fc' : 'url(#edgeGradient)'}
               strokeWidth="2.5"
               strokeDasharray={isExplicit ? undefined : '6 4'}
               strokeOpacity={isSemantic ? 0.8 : 1}
               className={isExplicit ? undefined : 'animate-pulse'}
            />
            {/* Midpoint Spatial Relationship Label Pill */}
            {edge.label && (
              <foreignObject
                x={midX - 90}
                y={midY - 14}
                width="180"
                height="32"
                className="overflow-visible pointer-events-none"
              >
                <div className="flex h-full w-full items-center justify-center">
                     <span className={`whitespace-nowrap rounded-full border bg-[#040406]/95 px-3 py-1 text-[10px] font-bold shadow-xl backdrop-blur-xl ${isSemantic ? 'border-purple-400/50 text-purple-300' : 'border-[#00ff87]/40 text-[#00ff87]'}`}>
                    {edge.label}
                  </span>
                </div>
              </foreignObject>
            )}
          </g>
        );
      })}
    </svg>
  );
};
