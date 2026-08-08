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
    <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible z-10">
      <defs>
        <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#00ff87" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.9" />
        </linearGradient>
      </defs>

      {edges.map((edge) => {
        const start = getNodeCenter(edge.sourceNodeId);
        const end = getNodeCenter(edge.targetNodeId);

        const dx = end.x - start.x;
        const cx1 = start.x + dx * 0.5;
        const cy1 = start.y;
        const cx2 = start.x + dx * 0.5;
        const cy2 = end.y;

        const pathD = `M ${start.x} ${start.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${end.x} ${end.y}`;

        // Exact Cubic Bezier Midpoint Calculation at t = 0.5
        const midX = 0.125 * start.x + 0.375 * cx1 + 0.375 * cx2 + 0.125 * end.x;
        const midY = 0.125 * start.y + 0.375 * cy1 + 0.375 * cy2 + 0.125 * end.y;

        return (
          <g key={edge.id}>
            {/* Ambient Background Glow Path */}
            <path
              d={pathD}
              fill="none"
              stroke="#00ff87"
              strokeWidth="5"
              strokeOpacity="0.2"
            />
            {/* Primary Glowing Curve */}
            <path
              d={pathD}
              fill="none"
              stroke="url(#edgeGradient)"
              strokeWidth="2.5"
              strokeDasharray="6 4"
              className="animate-pulse"
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
                  <span className="whitespace-nowrap rounded-full border border-[#00ff87]/40 bg-[#040406]/95 px-3 py-1 text-[10px] font-bold text-[#00ff87] shadow-xl backdrop-blur-xl">
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
