import React, { useRef } from 'react';
import { SpotlightCard } from '../ui/SpotlightCard';
import { AlertCircle, ArrowRight, X } from 'lucide-react';
import { useDialog } from '../../hooks/useDialog';

interface DisambiguationModalProps {
  reason: string;
  options: { optionId: string; label: string; actionHint: string }[];
  onSelectOption: (optionId: string) => void;
  onClose: () => void;
  isLoading?: boolean;
}

export const DisambiguationModal: React.FC<DisambiguationModalProps> = ({
  reason,
  options,
  onSelectOption,
  onClose,
  isLoading = false,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialog(dialogRef, onClose);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4" role="presentation">
      <div ref={dialogRef} className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="disambiguation-title">
        <SpotlightCard spotlightColor="rgba(255, 183, 3, 0.25)" className="smoked-glass border-amber-500/40 relative rounded-3xl p-6">
          <button
            type="button"
            aria-label="Close disambiguation"
            onClick={onClose}
            className="absolute top-4 right-4 rounded-full border border-white/10 bg-white/5 p-1.5 text-neutral-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="mb-3 flex items-center gap-2 text-amber-400 pr-8">
            <AlertCircle className="h-5 w-5 shrink-0" />
             <h3 id="disambiguation-title" className="text-base font-bold">Intent Disambiguation Gate</h3>
          </div>

          <p className="mb-4 text-xs text-neutral-300 leading-relaxed border-b border-amber-500/20 pb-3">
            {reason}
          </p>

          <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1" data-scrollable="true">
            {options.map((opt) => (
              <button
                key={opt.optionId}
                type="button"
                disabled={isLoading}
                onClick={() => onSelectOption(opt.optionId)}
                className="group flex w-full items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-left transition-colors hover:border-amber-400 hover:bg-amber-500/20 disabled:cursor-wait disabled:opacity-50"
              >
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-xs font-bold text-white">{opt.label}</h4>
                  <p className="mt-0.5 text-[10px] text-neutral-300">{opt.actionHint}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-amber-400 transition-transform group-hover:translate-x-1" />
              </button>
            ))}
          </div>
        </SpotlightCard>
      </div>
    </div>
  );
};
