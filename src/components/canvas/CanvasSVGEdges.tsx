import React from 'react';
import { CanvasNode, CanvasEdge } from '../../types/canvas';

interface CanvasSVGEdgesProps {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

export const CanvasSVGEdges: React.FC<CanvasSVGEdgesProps> = ({ nodes, edges }) => {
  const getNodeCenter = (id: string) => {
    const n = nodes.find((node) => node.id === id);
    if (!n) return { x: 0, y: 0 };
    return {
      x: n.position.x + n.position.width / 2,
      y: n.position.y + n.position.height / 2,
    };
  };

  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
      <defs>
        <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#00ff87" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.8" />
        </linearGradient>
      </defs>

      {edges.map((edge) => {
        const start = getNodeCenter(edge.sourceNodeId);
        const end = getNodeCenter(edge.targetNodeId);

        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const cx1 = start.x + dx * 0.5;
        const cy1 = start.y;
        const cx2 = start.x + dx * 0.5;
        const cy2 = end.y;

        const pathD = `M ${start.x} ${start.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${end.x} ${end.y}`;
        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2;

        return (
          <g key={edge.id}>
            {/* Ambient Background Glow Path */}
            <path
              d={pathD}
              fill="none"
              stroke="#00ff87"
              strokeWidth="4"
              strokeOpacity="0.15"
            />
            {/* Primary Glowing Curve */}
            <path
              d={pathD}
              fill="none"
              stroke="url(#edgeGradient)"
              strokeWidth="2"
              strokeDasharray="6 4"
              className="animate-pulse"
            />
            {/* Midpoint Spatial Relationship Label Pill */}
            {edge.label && (
              <foreignObject
                x={midX - 60}
                y={midY - 12}
                width="120"
                height="24"
                className="overflow-visible pointer-events-none"
              >
                <div className="flex h-full w-full items-center justify-center">
                  <span className="rounded-full border border-[#00ff87]/30 bg-[#090a0f]/90 px-2.5 py-0.5 text-[9px] font-medium text-[#00ff87] shadow-lg backdrop-blur-md">
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
