import React from 'react';
import { SpotlightCard } from '../ui/SpotlightCard';
import { AlertCircle, ArrowRight, X } from 'lucide-react';

interface DisambiguationModalProps {
  reason: string;
  options: { optionId: string; label: string; actionHint: string }[];
  onSelectOption: (optionId: string) => void;
  onClose: () => void;
}

export const DisambiguationModal: React.FC<DisambiguationModalProps> = ({
  reason,
  options,
  onSelectOption,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
      <div className="w-full max-w-md p-4">
        <SpotlightCard spotlightColor="rgba(255, 183, 3, 0.25)" className="smoked-glass border-amber-500/40 relative rounded-3xl p-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 rounded-full border border-white/10 bg-white/5 p-1.5 text-neutral-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="mb-3 flex items-center gap-2 text-amber-400">
            <AlertCircle className="h-5 w-5" />
            <h3 className="text-base font-bold">Intent Disambiguation Gate</h3>
          </div>

          <p className="mb-4 text-xs text-neutral-300 leading-relaxed">
            {reason}
          </p>

          <div className="space-y-2">
            {options.map((opt) => (
              <button
                key={opt.optionId}
                onClick={() => onSelectOption(opt.optionId)}
                className="group flex w-full items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-left transition-colors hover:border-amber-400 hover:bg-amber-500/15"
              >
                <div>
                  <h4 className="text-xs font-semibold text-white">{opt.label}</h4>
                  <p className="text-[10px] text-neutral-400">{opt.actionHint}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-amber-400 transition-transform group-hover:translate-x-1" />
              </button>
            ))}
          </div>
        </SpotlightCard>
      </div>
    </div>
  );
};
