import React, { useRef } from 'react';
import { ExecutionPlan } from '../../types/canvas';
import { SpotlightCard } from '../ui/SpotlightCard';
import { MagneticButton } from '../ui/MagneticButton';
import { CheckCircle2, Play, X, Sparkles } from 'lucide-react';
import { useDialog } from '../../hooks/useDialog';

interface PlanPreviewModalProps {
  plan: ExecutionPlan;
  contextNodeTitles?: string[];
  contextDetails?: { title: string; purpose: string; spatialBasis: string }[];
  availableContextCount?: number;
  isExecuting: boolean;
  onExecute: () => void;
  onClose: () => void;
}

export const PlanPreviewModal: React.FC<PlanPreviewModalProps> = ({
  plan,
  contextNodeTitles = [],
  contextDetails = [],
  availableContextCount = contextDetails.length,
  isExecuting,
  onExecute,
  onClose,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialog(dialogRef, onClose);
  const isRenewalPlan = plan.steps.some((step) => step.requiredCapability === 'RenewalRescue');

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
             <div>
                <h2 id="plan-modal-title" className="text-base font-bold text-white">{isRenewalPlan ? 'Renewal Rescue Plan Review' : 'Business Plan Review'}</h2>
                {plan.planningMode === 'local_fallback' && <p className="mt-0.5 text-[10px] text-amber-300">Planning used a local backup and is ready for review.</p>}
             </div>
          </div>

          <div className="mb-4 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#00ff87]">I understood your goal as</p>
              <p className="mt-1 text-xs font-semibold leading-relaxed text-neutral-200">{plan.goalSummary}</p>
              {!!contextDetails.length && <p className="mt-2 text-[10px] text-neutral-400">Using <span className="font-semibold text-neutral-200">{contextDetails.length} of {availableContextCount} available source{availableContextCount === 1 ? '' : 's'}</span> from the canvas.</p>}
              {!!contextDetails.length ? <div className="mt-3 border-t border-white/5 pt-2"><p className="text-[10px] font-semibold text-neutral-400">Why this context</p><div className="mt-1.5 space-y-1.5">{contextDetails.map((item) => <div key={item.title} className="rounded-lg border border-white/10 bg-white/[0.03] p-2"><div className="flex items-center justify-between gap-2"><span className="text-[10px] font-semibold text-neutral-200">{item.title}</span><span className="rounded-full border border-[#00ff87]/20 px-1.5 py-0.5 text-[9px] text-[#b8ffd9]">{item.spatialBasis.replace('_', ' ')}</span></div><p className="mt-0.5 text-[10px] text-neutral-400">{item.purpose}</p></div>)}</div></div> : !!contextNodeTitles.length && <div className="mt-3 border-t border-white/5 pt-2"><p className="text-[10px] font-semibold text-neutral-400">Context used</p><div className="mt-1.5 flex flex-wrap gap-1.5">{contextNodeTitles.map((title) => <span key={title} className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-neutral-300">{title}</span>)}</div></div>}
             <div className="mt-2 flex items-center justify-between text-[11px] text-neutral-400 border-t border-white/5 pt-2">
               <span>Plan confidence</span>
              <span className="font-bold text-[#00ff87]">{(plan.confidenceScore * 100).toFixed(0)}%</span>
            </div>
           </div>

           {!!plan.expectedOutputs.length && <div className="mb-3 rounded-xl border border-sky-500/20 bg-sky-500/5 p-3"><p className="text-[10px] font-bold uppercase tracking-widest text-sky-300">Expected outputs</p><p className="mt-1 text-[10px] leading-relaxed text-neutral-300">{plan.expectedOutputs.join(' • ')}</p></div>}
           {!!plan.verification.length && <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3"><p className="text-[10px] font-bold uppercase tracking-widest text-amber-300">Verification</p><ul className="mt-1 space-y-1 text-[10px] text-neutral-300">{plan.verification.map((item) => <li key={item}>• {item}</li>)}</ul></div>}

           {!!plan.workflowStages.length && <div className="mb-6"><p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#00ff87]">Workflow the computer will follow</p><div className="space-y-1.5">{plan.workflowStages.map((stage) => <div key={stage.stageId} className="flex gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] p-2.5"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#00ff87]/10 text-[10px] font-bold text-[#00ff87]">{stage.stageId}</span><div><p className="text-[11px] font-semibold text-white">{stage.title}</p><p className="mt-0.5 text-[10px] leading-relaxed text-neutral-400">{stage.description}</p><p className="mt-1 text-[9px] font-medium uppercase tracking-wide text-[#b8ffd9]">Output: {stage.output}</p></div></div>)}</div></div>}

           {/* Selected tools and execution steps */}
           <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-sky-300">Selected tools</p>
           <div className="mb-6 max-h-[50vh] overflow-y-auto space-y-2.5 pr-1" data-scrollable="true">
             {plan.steps.length === 0 ? (
               <p className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-relaxed text-amber-200">
                  There is no recovery action to review yet. Choose an intent direction to continue.
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
                       {step.requiredCapability === 'RenewalRescue' ? 'Renewal risk assessment' : step.requiredCapability === 'DataPatternFinder' ? 'Business trend analysis' : step.requiredCapability === 'DocumentSynthesizer' ? 'Evidence synthesis' : step.requiredCapability === 'MeetingInsightExtractor' ? 'Meeting insight review' : 'Experience concept'}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-neutral-400">{step.description}</p>
                </div>
              </div>
             ))}
          </div>

          {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-end gap-3">
             <button
               type="button"
               onClick={onClose}
                className="min-w-24 rounded-full border border-white/10 px-4 py-2 text-xs font-medium text-neutral-300 hover:bg-white/5"
            >
              Dismiss
            </button>
             <MagneticButton
               onClick={onExecute}
               disabled={isExecuting || plan.steps.length === 0}
               className="min-w-48 max-w-full whitespace-normal bg-[#00ff87] px-6 py-2 text-xs font-bold text-black hover:bg-[#00ff87]/90"
            >
               {plan.steps.length === 0 ? 'Choose an intent direction' : isExecuting ? (
                <span className="flex items-center gap-2">
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-black border-t-transparent" />
                   {isRenewalPlan ? 'Building recovery plans...' : 'Running business plan...'}
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                    <Play className="h-3.5 w-3.5 fill-black" /> {isRenewalPlan ? 'Approve & build recovery plans' : 'Approve & run selected tools'}
                </span>
              )}
            </MagneticButton>
          </div>
        </SpotlightCard>
      </div>
    </div>
  );
};
