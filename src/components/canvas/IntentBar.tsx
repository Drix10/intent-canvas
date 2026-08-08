import React from 'react';
import { useCanvasStore } from '../../store/useCanvasStore';
import { MagneticButton } from '../ui/MagneticButton';
import { Sparkles, Play, Plus, RefreshCw, Filter } from 'lucide-react';

interface IntentBarProps {
  onEvaluatePlan: () => void;
  onExecuteComputation: () => void;
  onFilterEnterprise: () => void;
  onAddNewNode: () => void;
  onAddFile: (file: File) => void;
}

export const IntentBar: React.FC<IntentBarProps> = ({
  onEvaluatePlan,
  onExecuteComputation,
  onFilterEnterprise,
  onAddNewNode,
  onAddFile,
}) => {
  const {
    activeIntentPrompt,
    setActiveIntentPrompt,
    isEvaluatingPlan,
    isExecutingPlan,
    resetDemoCanvas,
  } = useCanvasStore();
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 flex-col items-center gap-2">
      {/* Quick Intent Suggestions Popover */}
      {showSuggestions && (
        <div className="smoked-glass hairline-border flex max-w-[calc(100vw-1rem)] flex-wrap items-center justify-center gap-2 rounded-2xl px-4 py-2 shadow-2xl backdrop-blur-2xl">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Guide:</span>
          {[
            'Show me why revenue dropped in August',
            'Analyze customer churn sentiment notes',
            'Compare Q3 sales with design system',
          ].map((suggestion, idx) => (
             <button
               type="button"
               key={idx}
              onClick={() => {
                setActiveIntentPrompt(suggestion);
                setShowSuggestions(false);
              }}
              className="rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] font-medium text-neutral-200 transition-colors hover:border-[#00ff87]/50 hover:bg-[#00ff87]/10 hover:text-[#00ff87]"
            >
              "{suggestion}"
            </button>
          ))}
        </div>
      )}

      <div className="smoked-glass hairline-border flex w-[calc(100vw-1rem)] max-w-5xl flex-wrap items-center justify-center gap-3 rounded-2xl px-3 py-3 shadow-2xl backdrop-blur-2xl sm:rounded-full sm:px-5">
        {/* Intent Input Prompt Bar */}
        <div className="relative flex w-full items-center sm:w-auto">
          <label htmlFor="intent-prompt" className="sr-only">Describe the outcome you want</label>
          <Sparkles className="absolute left-3.5 h-3.5 w-3.5 text-[#00ff87]" />
          <input
            id="intent-prompt"
            type="text"
            value={activeIntentPrompt}
            onChange={(e) => setActiveIntentPrompt(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Type your natural computing intent..."
            className="w-[300px] sm:w-[420px] rounded-full border border-white/10 bg-white/[0.04] pl-9 pr-4 py-2 text-xs text-white placeholder-neutral-400 outline-none transition-colors focus:border-[#00ff87]/50 focus:bg-white/[0.08]"
          />
        </div>

        {/* Action Controls */}
        <div className="flex w-full flex-wrap items-center justify-center gap-2 sm:w-auto">
           <button
            type="button"
            onClick={onEvaluatePlan}
            disabled={isEvaluatingPlan}
            className="rounded-full border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-white/10"
          >
            {isEvaluatingPlan ? 'Evaluating...' : 'Inspect Plan'}
           </button>

           <input ref={fileInputRef} type="file" accept=".csv,.txt,.md,.json,image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) onAddFile(file); event.target.value = ''; }} />
           <button type="button" aria-label="Add file or image node" onClick={() => fileInputRef.current?.click()} title="Add file or image" className="rounded-full border border-white/10 bg-white/5 p-2 text-neutral-300 hover:bg-white/10 hover:text-white">
             <Plus className="h-3.5 w-3.5" />
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
            type="button"
            aria-label="Adapt computation for enterprise customers"
            onClick={onFilterEnterprise}
            title="Step 2 Adaptability Demo: Filter Enterprise"
            className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-400 hover:bg-amber-500/20"
          >
            <Filter className="h-3 w-3" /> Adapt
          </button>

           <button
            type="button"
            aria-label="Add document card"
            onClick={onAddNewNode}
            title="Add Document Card"
            className="rounded-full border border-white/10 bg-white/5 p-2 text-neutral-300 hover:bg-white/10 hover:text-white"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>

           <button
            type="button"
            aria-label="Reset demo canvas"
            onClick={resetDemoCanvas}
            title="Reset Demo State"
            className="rounded-full border border-white/10 bg-white/5 p-2 text-neutral-400 hover:bg-white/10 hover:text-white"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
        <span className="sr-only" aria-live="polite">
          {isEvaluatingPlan ? 'Preparing an inspectable plan.' : isExecutingPlan ? 'Computing your requested result.' : ''}
        </span>
      </div>
    </div>
  );
};
