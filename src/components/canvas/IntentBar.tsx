import React from 'react';
import { useCanvasStore } from '../../store/useCanvasStore';
import { MagneticButton } from '../ui/MagneticButton';
import { Sparkles, Play, Plus, RefreshCw } from 'lucide-react';

interface IntentBarProps {
  onEvaluatePlan: (useGuidedIntent?: boolean) => void;
  onExecuteComputation: () => void;
  onAddNewNode: () => void;
  onAddFile: (file: File) => void;
}

export const IntentBar: React.FC<IntentBarProps> = ({
  onEvaluatePlan,
  onExecuteComputation,
  onAddNewNode,
  onAddFile,
}) => {
  const {
    activeIntentPrompt,
    setActiveIntentPrompt,
    isEvaluatingPlan,
    isExecutingPlan,
    activePlan,
    resetDemoCanvas,
  } = useCanvasStore();
  const hasIntent = activeIntentPrompt.trim().length > 0;
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const barRef = React.useRef<HTMLDivElement>(null);

  return (
    <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 flex-col items-center gap-2">
      {/* Quick Intent Suggestions Popover */}
      {showSuggestions && (
        <div className="smoked-glass hairline-border flex max-w-[calc(100vw-1rem)] flex-wrap items-center justify-center gap-2 rounded-2xl px-4 py-2 shadow-2xl backdrop-blur-2xl">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Guide:</span>
          {[
            'Identify the most important risk in this workspace',
            'Synthesize the supplied customer and account evidence',
            'Recommend grounded next steps using the connected sources',
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

      <div ref={barRef} className="smoked-glass hairline-border flex w-[calc(100vw-1rem)] max-w-5xl flex-wrap items-center justify-center gap-3 rounded-2xl px-3 py-3 shadow-2xl backdrop-blur-2xl sm:rounded-full sm:px-5">
        {/* Intent Input Prompt Bar */}
        <div className="relative flex w-full items-center sm:w-auto">
          <label htmlFor="intent-prompt" className="sr-only">Describe the outcome you want</label>
          <Sparkles className="absolute left-3.5 h-3.5 w-3.5 text-[#00ff87]" />
          <input
            id="intent-prompt"
            type="text"
            value={activeIntentPrompt}
            onChange={(e) => setActiveIntentPrompt(e.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && hasIntent && !isEvaluatingPlan && !isExecutingPlan) {
                event.preventDefault()
                onEvaluatePlan()
              }
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={(event) => {
              if (!barRef.current?.contains(event.relatedTarget as Node | null)) setShowSuggestions(false);
            }}
            placeholder="Type your natural computing intent..."
            className="w-[300px] sm:w-[420px] rounded-full border border-white/10 bg-white/[0.04] pl-9 pr-4 py-2 text-xs text-white placeholder-neutral-400 outline-none transition-colors focus:border-[#00ff87]/50 focus:bg-white/[0.08]"
          />
        </div>

        {/* Action Controls */}
        <div className="flex w-full flex-wrap items-center justify-center gap-2 sm:w-auto">
           <button
            type="button"
             onClick={() => onEvaluatePlan(!hasIntent)}
              disabled={isEvaluatingPlan || isExecutingPlan}
             className="rounded-full border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
              {isEvaluatingPlan ? 'Compiling...' : hasIntent ? 'Compile Intent' : 'Guide Me & Compile'}
           </button>

             <input ref={fileInputRef} type="file" accept=".pdf,.csv,.txt,.md,.json,image/png,image/jpeg,image/gif,image/webp,image/avif,image/bmp" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) onAddFile(file); event.target.value = ''; }} />
            <button type="button" aria-label="Upload a file or image node" onClick={() => fileInputRef.current?.click()} title="Upload file or image" className="rounded-full border border-white/10 bg-white/5 p-2 text-neutral-300 hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-[#00ff87]">
             <Plus className="h-3.5 w-3.5" />
           </button>

          <MagneticButton
            onClick={onExecuteComputation}
             disabled={isEvaluatingPlan || isExecutingPlan}
            className="bg-[#00ff87] px-5 py-2 text-xs font-bold text-black hover:bg-[#00ff87]/90 shadow-[0_0_20px_rgba(0,255,135,0.3)]"
          >
             {isExecutingPlan ? (
              <span className="flex items-center gap-1.5">
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-black border-t-transparent" />
                Computing...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                 <Play className="h-3 w-3 fill-black" /> {hasIntent ? (activePlan ? 'Execute' : 'Inspect & Execute') : 'Start Guided Demo'}
              </span>
            )}
          </MagneticButton>

           <button
            type="button"
             aria-label="Add blank document node"
            onClick={onAddNewNode}
            title="Add Document Card"
            className="rounded-full border border-white/10 bg-white/5 p-2 text-neutral-300 hover:bg-white/10 hover:text-white"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>

           <button
            type="button"
            aria-label="Reset demo canvas"
             onClick={() => { if (window.confirm('Restore the starter context? Your current canvas changes will be replaced.')) resetDemoCanvas(); }}
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
