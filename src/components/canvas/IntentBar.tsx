import React from 'react';
import { useCanvasStore } from '../../store/useCanvasStore';
import { MagneticButton } from '../ui/MagneticButton';
import { Sparkles, Play, Plus, RefreshCw, Filter } from 'lucide-react';

interface IntentBarProps {
  onEvaluatePlan: () => void;
  onExecuteComputation: () => void;
  onFilterEnterprise: () => void;
  onAddNewNode: () => void;
}

export const IntentBar: React.FC<IntentBarProps> = ({
  onEvaluatePlan,
  onExecuteComputation,
  onFilterEnterprise,
  onAddNewNode,
}) => {
  const {
    activeIntentPrompt,
    setActiveIntentPrompt,
    isEvaluatingPlan,
    isExecutingPlan,
    resetDemoCanvas,
  } = useCanvasStore();

  return (
    <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3">
      <div className="smoked-glass hairline-border flex items-center gap-3 rounded-full px-5 py-3 shadow-2xl backdrop-blur-2xl">
        {/* Intent Input Prompt Bar */}
        <div className="relative flex items-center">
          <Sparkles className="absolute left-3.5 h-3.5 w-3.5 text-[#00ff87]" />
          <input
            type="text"
            value={activeIntentPrompt}
            onChange={(e) => setActiveIntentPrompt(e.target.value)}
            placeholder="Express your natural computing intent..."
            className="w-[300px] sm:w-[420px] rounded-full border border-white/10 bg-white/[0.04] pl-9 pr-4 py-2 text-xs text-white placeholder-neutral-500 outline-none transition-colors focus:border-[#00ff87]/50 focus:bg-white/[0.08]"
          />
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onEvaluatePlan}
            disabled={isEvaluatingPlan}
            className="rounded-full border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-white/10"
          >
            {isEvaluatingPlan ? 'Evaluating...' : 'Inspect Plan'}
          </button>

          <MagneticButton
            onClick={onExecuteComputation}
            disabled={isExecutingPlan}
            className="bg-[#00ff87] px-5 py-2 text-xs font-bold text-black hover:bg-[#00ff87]/90 shadow-[0_0_20px_rgba(0,255,135,0.3)]"
          >
            {isExecutingPlan ? (
              <span className="flex items-center gap-1.5">
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-black border-t-transparent" />
                Computing...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Play className="h-3 w-3 fill-black" /> Execute
              </span>
            )}
          </MagneticButton>

          <button
            onClick={onFilterEnterprise}
            title="Step 2 Adaptability Demo: Filter Enterprise"
            className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-400 hover:bg-amber-500/20"
          >
            <Filter className="h-3 w-3" /> Adapt
          </button>

          <button
            onClick={onAddNewNode}
            title="Add Document Card"
            className="rounded-full border border-white/10 bg-white/5 p-2 text-neutral-300 hover:bg-white/10 hover:text-white"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={resetDemoCanvas}
            title="Reset Demo State"
            className="rounded-full border border-white/10 bg-white/5 p-2 text-neutral-400 hover:bg-white/10 hover:text-white"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
