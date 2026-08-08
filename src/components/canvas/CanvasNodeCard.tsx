import React from 'react';
import { SpotlightCard } from '../ui/SpotlightCard';
import { CanvasNode } from '../../types/canvas';
import { FileText, Database, Layout, Sparkles, Box } from 'lucide-react';

interface CanvasNodeCardProps {
  node: CanvasNode;
  isSelected: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onStartConnection: (nodeId: string) => void;
}

export const CanvasNodeCard: React.FC<CanvasNodeCardProps> = ({
  node,
  isSelected,
  onSelect,
  onStartConnection,
}) => {
  const getIcon = () => {
    switch (node.type) {
      case 'dataset':
        return <Database className="h-4 w-4 text-[#00ff87]" />;
      case 'document':
        return <FileText className="h-4 w-4 text-sky-400" />;
      case 'example':
        return <Layout className="h-4 w-4 text-purple-400" />;
      case 'custom_primitive':
        return <Box className="h-4 w-4 text-amber-400" />;
      default:
        return <Sparkles className="h-4 w-4 text-[#00ff87]" />;
    }
  };

  const getTypeBadge = () => {
    switch (node.type) {
      case 'dataset':
        return 'bg-[#00ff87]/10 text-[#00ff87] border-[#00ff87]/20';
      case 'document':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      case 'example':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'custom_primitive':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default:
        return 'bg-white/10 text-white border-white/20';
    }
  };

  return (
    <div
      onClick={onSelect}
      className={`relative cursor-grab active:cursor-grabbing select-none transition-shadow ${
        isSelected ? 'ring-2 ring-[#00ff87] ring-offset-2 ring-offset-[#040406]' : ''
      }`}
      style={{
        width: node.position.width,
        minHeight: node.position.height,
      }}
    >
      <SpotlightCard className="h-full w-full">
        {/* Node Header */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-lg border border-white/10 bg-white/5 p-1.5">{getIcon()}</div>
            <h3 className="truncate text-xs font-semibold text-white/90">{node.title}</h3>
          </div>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${getTypeBadge()}`}>
            {node.type.replace('_', ' ')}
          </span>
        </div>

        {/* Payload Summary */}
        <p className="line-clamp-3 text-[11px] leading-relaxed text-neutral-400">
          {node.dataPayload.contentSummary}
        </p>

        {/* Connection Handle Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStartConnection(node.id);
          }}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] py-1 text-[10px] font-medium text-neutral-300 transition-colors hover:border-[#00ff87]/40 hover:bg-[#00ff87]/10 hover:text-[#00ff87]"
        >
          <Sparkles className="h-3 w-3" /> Connect Relation
        </button>
      </SpotlightCard>
    </div>
  );
};
