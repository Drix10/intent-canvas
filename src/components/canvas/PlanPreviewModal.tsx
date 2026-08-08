import React, { useRef } from 'react';
import { ExecutionPlan } from '../../types/canvas';
import { SpotlightCard } from '../ui/SpotlightCard';
import { MagneticButton } from '../ui/MagneticButton';
import { CheckCircle2, Play, X, Sparkles } from 'lucide-react';
import { useDialog } from '../../hooks/useDialog';

interface PlanPreviewModalProps {
  plan: ExecutionPlan;
  isExecuting: boolean;
  onExecute: () => void;
  onClose: () => void;
}

export const PlanPreviewModal: React.FC<PlanPreviewModalProps> = ({
  plan,
  isExecuting,
  onExecute,
  onClose,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialog(dialogRef, onClose);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4" role="presentation">
      <div ref={dialogRef} className="max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="plan-modal-title">
        <SpotlightCard className="smoked-glass hairline-border relative overflow-hidden rounded-3xl p-6">
          {/* Close Button */}
          <button
            type="button"
            aria-label="Close execution plan"
            onClick={onClose}
            className="absolute top-4 right-4 rounded-full border border-white/10 bg-white/5 p-1.5 text-neutral-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Modal Header */}
          <div className="mb-4 flex items-center gap-2 pr-8">
            <Sparkles className="h-5 w-5 text-[#00ff87]" />
             <h2 id="plan-modal-title" className="text-base font-bold text-white">Inspectable Execution Plan</h2>
          </div>

          <div className="mb-4 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
            <p className="text-xs font-semibold leading-relaxed text-neutral-200">{plan.goalSummary}</p>
            <div className="mt-2 flex items-center justify-between text-[11px] text-neutral-400 border-t border-white/5 pt-2">
              <span>Evaluation Confidence</span>
              <span className="font-bold text-[#00ff87]">{(plan.confidenceScore * 100).toFixed(0)}%</span>
            </div>
          </div>

          {/* Plan Steps (Scrollable Container) */}
           <div className="mb-6 max-h-[50vh] overflow-y-auto space-y-2.5 pr-1" data-scrollable="true">
             {plan.steps.length === 0 ? (
               <p className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-relaxed text-amber-200">
                 No executable steps were generated yet. Choose an intent direction in the clarification gate to continue.
               </p>
             ) : plan.steps.map((step) => (
              <div
                key={step.stepId}
                className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 text-left transition-colors hover:border-white/20"
              >
                <div className="mt-0.5 shrink-0 rounded-full bg-[#00ff87]/10 p-1 text-[#00ff87]">
                  {step.status === 'completed' ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : step.status === 'running' ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#00ff87] border-t-transparent" />
                  ) : (
                    <span className="flex h-4 w-4 items-center justify-center text-[10px] font-bold">
                      {step.stepId}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="truncate text-xs font-bold text-white">{step.title}</h4>
                    <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-mono text-neutral-300">
                      {step.requiredCapability}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-neutral-400">{step.description}</p>
                </div>
              </div>
             ))}
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3">
             <button
               type="button"
               onClick={onClose}
              className="rounded-full border border-white/10 px-4 py-2 text-xs font-medium text-neutral-300 hover:bg-white/5"
            >
              Dismiss
            </button>
            <MagneticButton
              onClick={onExecute}
              disabled={isExecuting}
              className="bg-[#00ff87] px-6 py-2 text-xs font-bold text-black hover:bg-[#00ff87]/90"
            >
              {isExecuting ? (
                <span className="flex items-center gap-2">
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-black border-t-transparent" />
                  Executing Plan...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Play className="h-3.5 w-3.5 fill-black" /> Confirm & Execute Computation
                </span>
              )}
            </MagneticButton>
          </div>
        </SpotlightCard>
      </div>
    </div>
  );
};
