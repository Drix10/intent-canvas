import React from 'react';
import { SpotlightCard } from '../ui/SpotlightCard';
import { ExecutionResult } from '../../types/canvas';
import { Sparkles, AlertTriangle, CheckCircle2, TrendingUp, Box } from 'lucide-react';

interface ResultNodeCardProps {
  result: ExecutionResult;
  onSaveAsPrimitive?: () => void;
}

export const ResultNodeCard: React.FC<ResultNodeCardProps> = ({ result, onSaveAsPrimitive }) => {
  const dataPattern = result.outputPayload?.dataPattern;
  const docSynthesis = result.outputPayload?.documentSynthesis;

  return (
    <div className="w-[420px] select-none">
      <SpotlightCard spotlightColor="rgba(0, 255, 135, 0.18)" className="border-[#00ff87]/30 bg-[#090a0f]/90">
        {/* Card Header */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-lg border border-[#00ff87]/30 bg-[#00ff87]/10 p-1.5 text-[#00ff87]">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">Computed Output Result</h3>
              <p className="text-[10px] text-neutral-400">Primitive Execution Completed</p>
            </div>
          </div>
          <span className="rounded-full border border-[#00ff87]/30 bg-[#00ff87]/10 px-2.5 py-0.5 text-[10px] font-semibold text-[#00ff87]">
            94% Match
          </span>
        </div>

        {/* Goal Summary */}
        <p className="mb-3 rounded-lg border border-white/[0.08] bg-white/[0.02] p-2.5 text-[11px] font-medium leading-relaxed text-neutral-200">
          {result.goalSummary}
        </p>

        {/* Data Pattern Anomaly Alert */}
        {dataPattern?.anomalyDetected && (
          <div className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" /> Anomaly Highlight: {dataPattern.anomalyDetails?.month}
            </div>
            <p className="mt-1 text-[10px] text-amber-200/90">
              Deviation: <span className="font-mono font-bold text-amber-300">{dataPattern.anomalyDetails?.deviationPercent}</span> — {dataPattern.anomalyDetails?.probableCause}
            </p>
          </div>
        )}

        {/* Inline SVG Chart */}
        {dataPattern?.chartSvg && (
          <div className="mb-3 rounded-xl border border-white/[0.08] bg-[#040406] p-2">
            <div className="mb-1 flex items-center justify-between px-1">
              <span className="flex items-center gap-1 text-[10px] font-semibold text-neutral-400">
                <TrendingUp className="h-3 w-3 text-[#00ff87]" /> Dynamic Rendered Metric Chart
              </span>
              <span className="text-[9px] font-mono text-neutral-500">SVG Payload</span>
            </div>
            <div
              className="flex justify-center"
              dangerouslySetInnerHTML={{ __html: dataPattern.chartSvg }}
            />
          </div>
        )}

        {/* Insights Bullets */}
        {dataPattern?.insights && (
          <div className="mb-3 space-y-1">
            {dataPattern.insights.map((insight: string, idx: number) => (
              <div key={idx} className="flex items-start gap-1.5 text-[11px] text-neutral-300">
                <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-[#00ff87]" />
                <span>{insight}</span>
              </div>
            ))}
          </div>
        )}

        {/* Document Synthesis Section */}
        {docSynthesis && (
          <div className="mb-3 rounded-xl border border-sky-500/20 bg-sky-500/5 p-2.5">
            <h4 className="mb-1 text-xs font-bold text-sky-400">{docSynthesis.synthesisTitle}</h4>
            <ul className="space-y-1 pl-3 text-[10px] text-neutral-300 list-disc">
              {docSynthesis.keyTakeaways.map((takeaway: string, idx: number) => (
                <li key={idx}>{takeaway}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Dynamic Custom Primitive Saver Button */}
        {onSaveAsPrimitive && (
          <button
            onClick={onSaveAsPrimitive}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 py-1.5 text-xs font-semibold text-amber-400 transition-colors hover:bg-amber-500/20"
          >
            <Box className="h-3.5 w-3.5" /> Save as Custom Higher-Order Primitive
          </button>
        )}
      </SpotlightCard>
    </div>
  );
};
