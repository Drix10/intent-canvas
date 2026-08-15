import { useEffect, useRef, useState } from 'react';
import { Check, Copy, DatabaseZap, ExternalLink, KeyRound, Radio, RefreshCw, ShieldCheck } from 'lucide-react';
import { DodoConnectionStatus } from '../../types/canvas';

interface DodoConnectionCardProps {
  connection: DodoConnectionStatus | null;
  loading: boolean;
  importing: boolean;
  historyProgress: { days: number; nextPage: number } | null;
  onImportHistory: (days: number, startPage?: number) => void;
}

const statusClass = (ready: boolean) => ready ? 'border-[#00ff87]/25 bg-[#00ff87]/10 text-[#b8ffd9]' : 'border-amber-300/25 bg-amber-400/10 text-amber-100';

export function DodoConnectionCard({ connection, loading, importing, historyProgress, onImportHistory }: DodoConnectionCardProps) {
  const [copied, setCopied] = useState(false);
  const [days, setDays] = useState(90);
  const copiedResetTimer = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  useEffect(() => () => { if (copiedResetTimer.current !== null) window.clearTimeout(copiedResetTimer.current); }, []);
  const copyWebhook = async () => {
    if (!connection?.webhookUrl || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(connection.webhookUrl);
      if (copiedResetTimer.current !== null) window.clearTimeout(copiedResetTimer.current);
      setCopied(true);
      copiedResetTimer.current = window.setTimeout(() => { setCopied(false); copiedResetTimer.current = null; }, 1_800);
    } catch { setCopied(false); }
  };
  const webhookReady = Boolean(connection?.webhookSigningKeyConfigured && connection?.webhookUrl);
  const continuation = historyProgress?.days === days ? historyProgress : null;
  const environmentLabel = connection?.environment === 'live_mode' ? 'Live mode' : connection ? 'Test mode' : 'Checking connection';
  return <section className="mb-3 overflow-hidden rounded-2xl border border-sky-300/25 bg-gradient-to-br from-sky-400/[0.12] via-[#090a0f] to-[#00ff87]/[0.07] p-3.5 shadow-[0_12px_32px_rgba(0,0,0,.22)]">
    <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-2.5"><div className="rounded-xl border border-sky-300/25 bg-sky-400/10 p-2 text-sky-100"><Radio className="h-4 w-4" /></div><div className="min-w-0"><p className="text-xs font-bold text-white">Dodo Payments connection</p><p className="mt-0.5 text-[10px] leading-relaxed text-neutral-400">Monitor verified billing signals and backfill payment history.</p></div></div><span className="shrink-0 rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[8px] font-bold uppercase tracking-wide text-neutral-300">{environmentLabel}</span></div>
    <div className="mt-3 grid grid-cols-2 gap-2"><div className={`rounded-xl border p-2 text-[9px] font-semibold ${statusClass(webhookReady)}`}><ShieldCheck className="mr-1 inline h-3.5 w-3.5" />Webhook<br /><span className="ml-4 text-[8px] font-normal opacity-80">{webhookReady ? 'Signing key found' : 'Server setup required'}</span></div><div className={`rounded-xl border p-2 text-[9px] font-semibold ${statusClass(Boolean(connection?.apiKeyConfigured))}`}><KeyRound className="mr-1 inline h-3.5 w-3.5" />History import<br /><span className="ml-4 text-[8px] font-normal opacity-80">{connection?.apiKeyConfigured ? 'API key found' : 'API key required'}</span></div></div>
    <div className="mt-3"><div className="mb-1.5 flex items-center justify-between gap-2"><p className="text-[9px] font-semibold uppercase tracking-wide text-neutral-400">Webhook endpoint</p>{copied && <span className="text-[9px] font-semibold text-[#b8ffd9]">Copied</span>}</div><div className="flex gap-2"><button type="button" onClick={copyWebhook} disabled={!connection?.webhookUrl} title="Copy webhook URL" className="min-w-0 flex-1 truncate rounded-xl border border-white/10 bg-black/30 px-2.5 py-2 text-left font-mono text-[9px] text-neutral-300 hover:bg-black/45 disabled:cursor-not-allowed disabled:opacity-50">{connection?.webhookUrl || 'Set INTENT_CANVAS_PUBLIC_WEBHOOK_URL on the server'}</button><button type="button" onClick={copyWebhook} disabled={!connection?.webhookUrl} aria-label="Copy webhook URL" className="rounded-xl border border-sky-300/25 bg-sky-400/10 px-2.5 text-sky-100 hover:bg-sky-400/20 disabled:opacity-50">{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}</button></div></div>
    <div className="mt-2 rounded-xl border border-white/[0.08] bg-black/15 px-2.5 py-2 text-[9px] leading-relaxed text-neutral-300"><strong className="text-white">Next step:</strong> Create this endpoint in Dodo, select the events to monitor, then save its signing key as <code className="rounded bg-white/10 px-1 text-sky-100">DODO_PAYMENTS_WEBHOOK_KEY</code> on the server.</div>
    <a className="mt-2 inline-flex items-center gap-1 text-[9px] font-semibold text-sky-200 hover:text-white" href="https://docs.dodopayments.com/developer-resources/webhooks" target="_blank" rel="noreferrer">Dodo webhook instructions <ExternalLink className="h-3 w-3" /></a>
    <div className="mt-3 border-t border-white/10 pt-3"><div><p className="flex items-center gap-1.5 text-[10px] font-bold text-white"><DatabaseZap className="h-3.5 w-3.5 text-[#00ff87]" />Backfill payment history</p><p className="mt-0.5 text-[9px] leading-relaxed text-neutral-500">Imports server-side and safely deduplicates against received webhooks.</p></div><div className="mt-2.5 flex items-center gap-2"><div className="flex rounded-lg border border-white/10 bg-black/20 p-0.5">{[30, 90, 365].map(option => <button key={option} type="button" onClick={() => setDays(option)} aria-pressed={days === option} className={`rounded-md px-2 py-1 text-[9px] font-semibold transition-colors ${days === option ? 'bg-[#00ff87]/15 text-[#b8ffd9]' : 'text-neutral-400 hover:text-white'}`}>{option}d</button>)}</div><button type="button" disabled={!connection?.historyImportAvailable || importing || loading} onClick={() => onImportHistory(days, continuation?.nextPage ?? 0)} className="ml-auto shrink-0 rounded-lg border border-[#00ff87]/30 bg-[#00ff87] px-2.5 py-1.5 text-[9px] font-bold text-black hover:bg-[#b8ffd9] disabled:cursor-not-allowed disabled:opacity-50">{importing ? <><RefreshCw className="mr-1 inline h-3 w-3 animate-spin" />Importing</> : continuation ? 'Continue import' : `Import ${days} days`}</button></div></div>
  </section>;
}
