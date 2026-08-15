import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, CreditCard, ExternalLink, RefreshCw, ShieldCheck } from 'lucide-react';
import { DodoSignal, RecoveryCase } from '../../types/canvas';

interface RecoveryCasePanelProps {
  cases: RecoveryCase[];
  signals: DodoSignal[];
  loading: boolean;
  sandboxEnabled: boolean;
  creatingSandboxCheckout: boolean;
  onRefresh: () => void;
  onCreateSandboxCheckout: () => void;
  onApprove: (recoveryCase: RecoveryCase, actionType: 'customer_follow_up' | 'payment_method_update') => void;
  onAddEvidence: (recoveryCase: RecoveryCase) => void;
  onAddSignalEvidence: (signal: DodoSignal) => void;
}

const statusStyle: Record<RecoveryCase['status'], string> = {
  detected: 'border-rose-400/30 bg-rose-400/10 text-rose-100',
  approved: 'border-amber-400/30 bg-amber-400/10 text-amber-100',
  recovered: 'border-[#00ff87]/30 bg-[#00ff87]/10 text-[#b8ffd9]',
  escalated: 'border-orange-400/30 bg-orange-400/10 text-orange-100',
  ignored: 'border-white/15 bg-white/5 text-neutral-300',
};

const signalStyle: Record<DodoSignal['classification'], string> = {
  recovery_case: 'border-rose-400/30 bg-rose-400/10 text-rose-100',
  recovery: 'border-[#00ff87]/30 bg-[#00ff87]/10 text-[#b8ffd9]',
  operational: 'border-amber-400/30 bg-amber-400/10 text-amber-100',
  context: 'border-white/15 bg-white/5 text-neutral-300',
};

export const RecoveryCasePanel: React.FC<RecoveryCasePanelProps> = ({ cases, signals, loading, sandboxEnabled, creatingSandboxCheckout, onRefresh, onCreateSandboxCheckout, onApprove, onAddEvidence, onAddSignalEvidence }) => {
  const [expanded, setExpanded] = useState<string | null>(null);
  return <aside className="w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl border border-sky-400/25 bg-[#090a0f]/95 p-3 shadow-2xl backdrop-blur-2xl">
    <div className="mb-3 flex items-start justify-between gap-3">
      <div><div className="flex items-center gap-1.5 text-sky-200"><ShieldCheck className="h-4 w-4" /><h2 className="text-xs font-bold">Revenue Rescue</h2></div><p className="mt-0.5 text-[10px] leading-snug text-neutral-400">Verified Dodo signals. Every recovery action needs human approval.</p></div>
      <div className="flex gap-1">{sandboxEnabled && <button type="button" onClick={onCreateSandboxCheckout} disabled={creatingSandboxCheckout} className="rounded-lg border border-sky-300/25 bg-sky-400/10 px-2 py-1 text-[9px] font-semibold text-sky-100 hover:bg-sky-400/20 disabled:opacity-50">{creatingSandboxCheckout ? 'Creating…' : 'Create test payment'}</button>}<button type="button" onClick={onRefresh} aria-label="Refresh Dodo recovery cases" className="rounded-lg border border-white/10 p-1.5 text-neutral-300 hover:bg-white/10"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /></button></div>
    </div>
    {cases.length === 0 ? <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-3 text-[10px] leading-relaxed text-neutral-400">No Dodo recovery cases yet. Signed Dodo events are still retained below as CRM evidence.</div> : <div className="max-h-[45vh] space-y-2 overflow-y-auto pr-1" data-scrollable="true">
      {cases.map((item) => <article key={item.caseId} className="rounded-xl border border-white/[0.09] bg-black/20 p-2.5">
        <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-[11px] font-bold text-white">{item.account}</p><p className="mt-0.5 text-[9px] text-neutral-500">{item.eventType} {item.nextBillingDate ? `• next bill ${item.nextBillingDate}` : ''}</p></div><span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-bold capitalize ${statusStyle[item.status]}`}>{item.status}</span></div>
        <p className="mt-2 text-[10px] leading-snug text-neutral-300">{item.riskReason}</p>
        <div className="mt-2 flex flex-wrap gap-1.5"><button type="button" onClick={() => onAddEvidence(item)} className="rounded-lg border border-sky-300/25 bg-sky-400/10 px-2 py-1 text-[9px] font-semibold text-sky-100 hover:bg-sky-400/20"><ExternalLink className="mr-1 inline h-3 w-3" />Add evidence</button>
          {(item.status === 'detected' || item.status === 'escalated') && <><button type="button" onClick={() => onApprove(item, 'customer_follow_up')} className="rounded-lg border border-[#00ff87]/25 bg-[#00ff87]/10 px-2 py-1 text-[9px] font-semibold text-[#b8ffd9] hover:bg-[#00ff87]/20"><CheckCircle2 className="mr-1 inline h-3 w-3" />Approve follow-up</button><button type="button" onClick={() => onApprove(item, 'payment_method_update')} className="rounded-lg border border-amber-300/25 bg-amber-400/10 px-2 py-1 text-[9px] font-semibold text-amber-100 hover:bg-amber-400/20"><CreditCard className="mr-1 inline h-3 w-3" />Approve payment outreach</button></>}
          {item.status === 'approved' && <span className="flex items-center gap-1 px-1 text-[9px] text-amber-100"><AlertTriangle className="h-3 w-3" />No charge or email sent</span>}</div>
        <button type="button" onClick={() => setExpanded(expanded === item.caseId ? null : item.caseId)} className="mt-2 text-[9px] font-semibold text-neutral-500 hover:text-white">{expanded === item.caseId ? 'Hide timeline' : 'View timeline'}</button>
        {expanded === item.caseId && <ol className="mt-1.5 space-y-1 border-l border-white/10 pl-2 text-[9px] leading-snug text-neutral-400">{item.timeline.map((event, index) => <li key={`${event.at}-${index}`}><strong className="text-neutral-200">{event.label}</strong> — {event.detail}</li>)}</ol>}
      </article>)}
    </div>}
    <section className="mt-3 border-t border-white/10 pt-3">
      <div className="mb-1.5 flex items-center justify-between"><p className="text-[10px] font-bold text-neutral-200">Latest Dodo signals</p><span className="text-[9px] text-neutral-500">{signals.length} shown</span></div>
      {signals.length === 0 ? <p className="text-[10px] leading-relaxed text-neutral-500">No signed signals received yet.</p> : <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1" data-scrollable="true">{signals.slice(0, 8).map((signal) => <div key={signal.signalId} className="rounded-lg border border-white/[0.08] bg-black/15 p-2"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-[10px] font-semibold text-neutral-100">{signal.title}</p><p className="truncate text-[9px] text-neutral-500">{signal.account}</p></div><span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[8px] font-bold ${signalStyle[signal.classification]}`}>{signal.classification.replace('_', ' ')}</span></div><p className="mt-1 line-clamp-2 text-[9px] leading-snug text-neutral-400">{signal.summary}</p><button type="button" onClick={() => onAddSignalEvidence(signal)} className="mt-1.5 rounded border border-sky-300/25 bg-sky-400/10 px-1.5 py-0.5 text-[8px] font-semibold text-sky-100 hover:bg-sky-400/20">Add as evidence</button></div>)}</div>}
    </section>
  </aside>;
};
