import React from 'react';
import { SpotlightCard } from '../ui/SpotlightCard';
import { CanvasNode } from '../../types/canvas';
import { FileText, Database, Layout, Sparkles, Box, Trash2, Plus, Minus, Pencil } from 'lucide-react';

interface CanvasNodeCardProps {
  node: CanvasNode;
  isSelected: boolean;
  onStartConnection: (nodeId: string) => void;
  onRemove: (nodeId: string) => void;
  onEdit?: (nodeId: string) => void;
  isConnectingSource: boolean;
  hasConnections: boolean;
  onRemoveConnection: (nodeId: string) => void;
  isConnectionTarget: boolean;
  isConnectable: boolean;
}

export const CanvasNodeCard: React.FC<CanvasNodeCardProps> = React.memo(({
  node,
  isSelected,
  onStartConnection,
  onRemove,
  onEdit,
  isConnectingSource,
  hasConnections,
  onRemoveConnection,
  isConnectionTarget,
  isConnectable,
}) => {
  const getIcon = () => {
    switch (node.type) {
      case 'dataset':
        return <Database className="h-3.5 w-3.5 text-[#00ff87]" />;
      case 'document':
        return <FileText className="h-3.5 w-3.5 text-sky-400" />;
      case 'example':
        return <Layout className="h-3.5 w-3.5 text-purple-400" />;
      case 'custom_primitive':
        return <Box className="h-3.5 w-3.5 text-amber-400" />;
      default:
        return <Sparkles className="h-3.5 w-3.5 text-[#00ff87]" />;
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
      className={`relative cursor-grab active:cursor-grabbing select-none transition-all ${
        isSelected ? 'ring-2 ring-[#00ff87] ring-offset-2 ring-offset-[#040406] shadow-[0_0_25px_rgba(0,255,135,0.25)]' :
        isConnectionTarget ? 'ring-2 ring-sky-400 shadow-[0_0_28px_rgba(56,189,248,0.35)]' : ''
      }`}
      style={{
        width: node.position.width,
        height: node.position.height,
      }}
    >
      <SpotlightCard className="flex h-full w-full flex-col overflow-hidden p-4">
        {/* Node Header */}
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <div className="shrink-0 rounded-lg border border-white/10 bg-white/5 p-1.5">{getIcon()}</div>
             <h3 className="truncate text-xs font-bold text-white/95">{node.title}</h3>
           </div>
           <div className="flex shrink-0 items-center gap-1">
             <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${getTypeBadge()}`}>
               {node.type.replace('_', ' ')}
             </span>
              {onEdit && <button type="button" aria-label={`Edit ${node.title}`} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onEdit(node.id); }} className="rounded-md p-1 text-neutral-500 hover:bg-white/10 hover:text-white"><Pencil className="h-3 w-3" /></button>}
              <button type="button" aria-label={`Remove ${node.title}`} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onRemove(node.id); }} className="rounded-md p-1 text-neutral-500 hover:bg-red-500/10 hover:text-red-300"><Trash2 className="h-3 w-3" /></button>
           </div>
        </div>

        {node.type === 'example' && node.dataPayload.previewUrl && (
          <img
            src={node.dataPayload.previewUrl}
            alt={`Preview of ${node.title}`}
            draggable={false}
            onDragStart={(event) => event.preventDefault()}
            className="mb-2 h-12 w-full shrink-0 rounded-lg border border-white/10 object-cover"
          />
        )}

        {/* Payload Summary */}
        <p className="line-clamp-2 min-h-0 text-[11px] leading-relaxed text-neutral-300">
          {node.dataPayload.contentSummary}
        </p>

         {/* Connection Controls */}
         {isConnectable && <div className="mt-auto flex shrink-0 gap-1.5 pt-2">
          <button
          type="button"
           aria-label={isConnectingSource ? `Cancel connection from ${node.title}` : `Connect ${node.title} to another node`}
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onStartConnection(node.id);
          }}
           className="flex min-w-0 flex-1 items-center justify-center gap-1 rounded-xl border border-white/[0.1] bg-white/[0.04] py-1.5 text-[10px] font-bold text-neutral-200 transition-colors hover:border-[#00ff87]/50 hover:bg-[#00ff87]/10 hover:text-[#00ff87]"
        >
           {isConnectingSource ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />} {isConnectingSource ? 'Cancel Connection' : isConnectionTarget ? 'Connect Here' : 'Connect Relation'}
         </button>
          {hasConnections && !isConnectingSource && (
            <button type="button" aria-label={`Remove a relation from ${node.title}`} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onRemoveConnection(node.id); }} className="flex shrink-0 items-center justify-center rounded-xl border border-red-400/20 bg-red-400/5 px-2 text-red-300 hover:bg-red-400/10">
              <Minus className="h-3 w-3" />
            </button>
          )}
         </div>}
      </SpotlightCard>
    </div>
  );
});
