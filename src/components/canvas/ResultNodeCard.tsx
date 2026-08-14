import React from 'react';
import { SpotlightCard } from '../ui/SpotlightCard';
import { ExecutionResult } from '../../types/canvas';
import { Sparkles, AlertTriangle, CheckCircle2, TrendingUp, Box, X, ListChecks, Palette, CalendarDays, ShieldAlert } from 'lucide-react';
import { useCanvasStore } from '../../store/useCanvasStore';
import { sanitizeSvg } from '../../utils/sanitizeSvg';
import { capabilityOutputKeys } from '../../api';
import { RenewalRescuePayload } from '../../types/canvas';

interface ResultNodeCardProps {
  result: ExecutionResult;
  onSaveAsPrimitive?: () => void;
  isSavingPrimitive?: boolean;
}

export const ResultNodeCard: React.FC<ResultNodeCardProps> = ({ result, onSaveAsPrimitive, isSavingPrimitive = false }) => {
  const setExecutionResult = useCanvasStore((state) => state.setExecutionResult);
  const dataPattern = result.outputPayload?.dataPattern as {
    summary?: string;
    anomalyDetected?: boolean;
    anomalyDetails?: { month?: string; deviationPercent?: string; probableCause?: string };
    chartSvg?: string;
    insights?: string[];
  } | undefined;
  const docSynthesis = result.outputPayload?.documentSynthesis as {
    synthesisTitle?: string;
    keyTakeaways?: string[];
  } | undefined;
  const meetingInsights = result.outputPayload?.meetingInsights as {
    summary?: string;
    decisions?: string[];
    actionItems?: { task?: string; owner?: string; deadline?: string }[];
    riskFactors?: string[];
  } | undefined;
  const uiConcept = result.outputPayload?.uiConcept as {
     conceptTitle?: string;
     referenceBasis?: string;
    componentHierarchy?: string[];
    stylingDirectives?: string[];
    themePalette?: { background?: string; surface?: string; accent?: string; border?: string };
  } | undefined;
  const renewalRescue = result.outputPayload?.renewalRescue as RenewalRescuePayload | undefined;
  const selectedCapabilities = new Set((result.executedSteps ?? []).map((step) => step.requiredCapability));
  const hasCapability = (capability: keyof typeof capabilityOutputKeys) => selectedCapabilities.has(capability);
  const safeChartSvg = sanitizeSvg(dataPattern?.chartSvg);

  return (
    <div className="w-[420px] max-w-[calc(100vw-2rem)]">
      <SpotlightCard spotlightColor="rgba(0, 255, 135, 0.18)" className="relative border-[#00ff87]/40 bg-[#090a0f]/95 shadow-2xl backdrop-blur-2xl">
        {/* Close / Dismiss Button */}
        <button
          type="button"
          aria-label="Close computed output"
          onClick={() => setExecutionResult(null)}
          className="absolute top-3.5 right-3.5 rounded-full border border-white/10 bg-white/5 p-1 text-neutral-400 hover:bg-white/10 hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        {/* Card Header */}
        <div className="mb-3 flex items-center justify-between pr-8">
          <div className="flex items-center gap-2">
            <div className="rounded-lg border border-[#00ff87]/30 bg-[#00ff87]/10 p-1.5 text-[#00ff87]">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">Computed Output Result</h3>
              <p className="text-[10px] text-neutral-400">Primitive Execution Completed</p>
            </div>
          </div>
             <span className="rounded-full border border-[#00ff87]/30 bg-[#00ff87]/10 px-2.5 py-0.5 text-[10px] font-bold text-[#00ff87]">
             {Math.round(Math.max(0, Math.min(1, result.confidenceScore ?? 0)) * 100)}% Match
           </span>
         </div>
         {!!result.executedSteps?.length && <p className="mb-3 text-[10px] text-neutral-400">Tools used: <span className="text-neutral-200">{result.executedSteps.map(step => step.requiredCapability).join(' • ')}</span></p>}

         {/* Goal Summary */}
        <p className="mb-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-2.5 text-[11px] font-medium leading-relaxed text-neutral-200">
          {result.goalSummary}
        </p>

        {/* Data Pattern Anomaly Alert */}
        {hasCapability('DataPatternFinder') && dataPattern?.summary && (
          <p className="mb-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-2.5 text-[11px] leading-relaxed text-neutral-300">
            {dataPattern.summary}
          </p>
        )}
        {hasCapability('DataPatternFinder') && dataPattern?.anomalyDetected && (
          <div className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" /> Anomaly Highlight: {dataPattern.anomalyDetails?.month}
            </div>
            <p className="mt-1 text-[10px] leading-relaxed text-amber-200/90">
              Deviation: <span className="font-mono font-bold text-amber-300">{dataPattern.anomalyDetails?.deviationPercent}</span>: {dataPattern.anomalyDetails?.probableCause}
            </p>
          </div>
        )}

        {/* Inline SVG Chart */}
        {hasCapability('DataPatternFinder') && safeChartSvg && (
          <div className="mb-3 rounded-xl border border-white/[0.08] bg-[#040406] p-2 overflow-x-auto">
            <div className="mb-1 flex items-center justify-between px-1">
              <span className="flex items-center gap-1 text-[10px] font-semibold text-neutral-400">
                <TrendingUp className="h-3 w-3 text-[#00ff87]" /> Dynamic Rendered Metric Chart
              </span>
              <span className="text-[9px] font-mono text-neutral-500">SVG Payload</span>
            </div>
             <div
               role="img"
               aria-label="Rendered metric chart"
              className="flex justify-center min-w-[280px]"
              dangerouslySetInnerHTML={{ __html: safeChartSvg }}
            />
          </div>
        )}

        {/* Insights Bullets */}
        {hasCapability('DataPatternFinder') && Array.isArray(dataPattern?.insights) && (
          <div className="mb-3 space-y-1.5">
            {dataPattern.insights.map((insight: string, idx: number) => (
              <div key={idx} className="flex items-start gap-1.5 text-[11px] text-neutral-300">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#00ff87]" />
                <span className="leading-snug">{insight}</span>
              </div>
            ))}
          </div>
        )}

        {/* Document Synthesis Section */}
        {hasCapability('DocumentSynthesizer') && docSynthesis && (
          <div className="mb-3 rounded-xl border border-sky-500/20 bg-sky-500/5 p-2.5">
            <h4 className="mb-1 text-xs font-bold text-sky-400">{docSynthesis.synthesisTitle}</h4>
            <ul className="space-y-1 pl-3 text-[10px] text-neutral-300 list-disc">
              {(docSynthesis.keyTakeaways ?? []).map((takeaway: string, idx: number) => (
                <li key={idx} className="leading-snug">{takeaway}</li>
              ))}
            </ul>
          </div>
        )}

        {hasCapability('MeetingInsightExtractor') && meetingInsights && (
          <div className="mb-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-2.5">
            <h4 className="mb-1 flex items-center gap-1 text-xs font-bold text-amber-300"><ListChecks className="h-3.5 w-3.5" /> Meeting Insights</h4>
            {meetingInsights.summary && <p className="mb-2 text-[10px] leading-snug text-neutral-300">{meetingInsights.summary}</p>}
            {!!meetingInsights.decisions?.length && <p className="text-[10px] text-neutral-300"><strong className="text-white">Decisions:</strong> {meetingInsights.decisions.join(' • ')}</p>}
            {!!meetingInsights.actionItems?.length && <ul className="mt-1 space-y-1 text-[10px] text-neutral-300">{meetingInsights.actionItems.map((item, index) => <li key={index}><strong className="text-white">Action:</strong> {item.task} <span className="text-neutral-500">({item.owner}, {item.deadline})</span></li>)}</ul>}
            {!!meetingInsights.riskFactors?.length && <p className="mt-1 text-[10px] text-amber-200"><strong>Risks:</strong> {meetingInsights.riskFactors.join(' • ')}</p>}
          </div>
        )}

        {hasCapability('UIConceptGenerator') && uiConcept && (
          <div className="mb-3 rounded-xl border border-purple-500/20 bg-purple-500/5 p-2.5">
           <h4 className="mb-1 flex items-center gap-1 text-xs font-bold text-purple-300"><Palette className="h-3.5 w-3.5" /> {uiConcept.conceptTitle || 'UI Concept'}</h4>
           {uiConcept.referenceBasis && <p className="mb-1 text-[10px] leading-snug text-neutral-300"><strong className="text-white">Reference:</strong> {uiConcept.referenceBasis}</p>}
            {!!uiConcept.componentHierarchy?.length && <p className="text-[10px] leading-snug text-neutral-300"><strong className="text-white">Components:</strong> {uiConcept.componentHierarchy.join(' • ')}</p>}
            {!!uiConcept.stylingDirectives?.length && <p className="mt-1 text-[10px] leading-snug text-neutral-300"><strong className="text-white">Style:</strong> {uiConcept.stylingDirectives.join(' • ')}</p>}
            {uiConcept.themePalette && <div className="mt-2 grid grid-cols-2 gap-1 text-[9px] text-neutral-400">{Object.entries(uiConcept.themePalette).map(([key, value]) => <span key={key} className="rounded border border-white/10 px-1.5 py-1"><strong className="block text-neutral-200">{key}</strong><span className="mt-0.5 block truncate" title={String(value)}>{String(value)}</span></span>)}</div>}
          </div>
        )}

        {hasCapability('RenewalRescue') && renewalRescue && (
          <div className="mb-3 rounded-xl border border-rose-500/25 bg-rose-500/5 p-2.5">
            <div className="mb-2 flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 text-rose-300" />
              <h4 className="text-xs font-bold text-rose-200">Renewal risk and recovery plans</h4>
            </div>
            <p className="mb-2 rounded-lg border border-white/[0.08] bg-white/[0.03] p-2 text-[10px] leading-relaxed text-neutral-300">{renewalRescue.executiveSummary}</p>
            <div className="space-y-2">
              {renewalRescue.riskRecords.map((record, index) => (
                <div key={`${record.account}-${record.renewalDate}-${index}`} className="rounded-lg border border-white/10 bg-black/20 p-2">
                  <div className="flex items-start justify-between gap-2">
                    <div><p className="text-[11px] font-bold text-white">{record.account}</p><p className="mt-0.5 text-[10px] text-neutral-400">${record.ARR.toLocaleString('en-US')} ARR <span className="mx-1 text-neutral-600">•</span> <CalendarDays className="inline h-3 w-3" /> {record.renewalDate}</p></div>
                     <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${record.riskLevel === 'critical' ? 'bg-rose-500/20 text-rose-200' : record.riskLevel === 'high' ? 'bg-amber-500/20 text-amber-200' : 'bg-sky-500/20 text-sky-200'}`}>{record.riskLevel} risk</span>
                  </div>
                  <dl className="mt-2 space-y-1 text-[10px] leading-snug text-neutral-300">
                     <div><dt className="inline font-semibold text-neutral-500">Driver:</dt> <dd className="inline">{record.driver}</dd></div>
                     <div><dt className="inline font-semibold text-neutral-500">Risk score:</dt> <dd className="inline">{record.riskScore} <span className="text-neutral-500">({record.riskScoreSource})</span></dd></div>
                      <div><dt className="block font-semibold text-neutral-500">Evidence:</dt> <dd><ul className="mt-0.5 list-disc space-y-0.5 pl-4">{record.evidence.map((item, evidenceIndex) => <li key={`${evidenceIndex}-${item}`}>{item}</li>)}</ul></dd></div>
                    <div><dt className="inline font-semibold text-neutral-500">Recovery action:</dt> <dd className="inline text-[#b8ffd9]">{record.recommendedAction}</dd></div>
                  </dl>
                  <p className="mt-2 border-t border-white/5 pt-1.5 text-[10px] text-neutral-400"><strong className="text-neutral-200">Owner:</strong> {record.owner} <span className="mx-1 text-neutral-600">•</span> <strong className="text-neutral-200">Deadline:</strong> {record.deadline}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dynamic Custom Primitive Saver Button */}
        {onSaveAsPrimitive && (
          <button
            type="button"
            onClick={onSaveAsPrimitive}
            disabled={isSavingPrimitive}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 py-2 text-xs font-bold text-amber-400 transition-colors hover:bg-amber-500/20"
          >
            <Box className="h-3.5 w-3.5" /> {isSavingPrimitive ? 'Saving Primitive...' : 'Save as Custom Higher-Order Primitive'}
          </button>
        )}
      </SpotlightCard>
    </div>
  );
};
