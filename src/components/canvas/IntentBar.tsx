import React from 'react';
import { useCanvasStore } from '../../store/useCanvasStore';
import { Sparkles, Upload, FilePlus2, RefreshCw } from 'lucide-react';

interface IntentBarProps {
  onEvaluatePlan: () => void;
  onAddNewNode: () => void;
  onAddFile: (file: File) => void;
}

export const IntentBar: React.FC<IntentBarProps> = ({
  onEvaluatePlan,
  onAddNewNode,
  onAddFile,
}) => {
  const { activeIntentPrompt, setActiveIntentPrompt, isEvaluatingPlan, isExecutingPlan, resetDemoCanvas } = useCanvasStore();
  const hasIntent = activeIntentPrompt.trim().length > 0;
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 flex-col items-center gap-2">
      <div className="smoked-glass hairline-border flex w-[min(39rem,calc(100vw-1rem))] flex-wrap items-center justify-center gap-2 rounded-2xl px-2.5 py-2.5 shadow-2xl backdrop-blur-2xl sm:rounded-full sm:px-3.5">
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
            placeholder="Type your natural computing intent..."
             className="w-[min(17rem,calc(100vw-4rem))] rounded-full border border-white/10 bg-white/[0.04] pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-400 outline-none transition-colors focus:border-[#00ff87]/50 focus:bg-white/[0.08] sm:w-[300px]"
          />
        </div>

        {/* Action Controls */}
        <div className="flex w-full flex-wrap items-center justify-center gap-2 sm:w-auto">
           <button
            type="button"
              onClick={onEvaluatePlan}
              disabled={isEvaluatingPlan || isExecutingPlan}
             className="flex shrink-0 items-center justify-center rounded-xl bg-[#00ff87] px-4 py-2.5 text-xs font-bold text-black shadow-[0_0_20px_rgba(0,255,135,0.25)] transition-colors hover:bg-[#00ff87]/90 disabled:cursor-not-allowed disabled:opacity-45"
          >
              {isEvaluatingPlan ? 'Compiling...' : hasIntent ? 'Compile Intent' : 'Generate Intent'}
           </button>

             <input ref={fileInputRef} type="file" accept=".pdf,.csv,.txt,.md,.json,image/png,image/jpeg,image/gif,image/webp,image/avif,image/bmp" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) onAddFile(file); event.target.value = ''; }} />
              <button type="button" aria-label="Upload a file or image node" disabled={isEvaluatingPlan || isExecutingPlan} onClick={() => fileInputRef.current?.click()} title="Upload source file" className="rounded-full border border-white/10 bg-white/5 p-2 text-neutral-300 hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-[#00ff87] disabled:cursor-not-allowed disabled:opacity-40">
              <Upload className="h-3.5 w-3.5" />
           </button>

           <button
            type="button"
             aria-label="Add blank document node"
             disabled={isEvaluatingPlan || isExecutingPlan}
             onClick={onAddNewNode}
             title="Add blank document"
             className="rounded-full border border-white/10 bg-white/5 p-2 text-neutral-300 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
             <FilePlus2 className="h-3.5 w-3.5" />
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
