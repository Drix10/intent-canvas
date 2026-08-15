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
  return <section className="mb-3 overflow-hidden rounded-xl border border-sky-300/25 bg-gradient-to-br from-sky-400/[0.10] via-[#090a0f] to-[#00ff87]/[0.06] p-3 shadow-lg">
    <div className="flex items-start gap-2.5"><div className="rounded-xl border border-sky-300/25 bg-sky-400/10 p-2 text-sky-100"><Radio className="h-4 w-4" /></div><div className="min-w-0"><p className="text-[11px] font-bold text-white">Connect your Dodo workspace</p><p className="mt-0.5 text-[9px] leading-relaxed text-neutral-400">Start with live signals, then securely backfill historical payment activity.</p></div></div>
    <div className="mt-3 grid grid-cols-2 gap-1.5"><span className={`rounded-lg border px-2 py-1.5 text-[9px] font-semibold ${statusClass(webhookReady)}`}><ShieldCheck className="mr-1 inline h-3 w-3" />Webhook {webhookReady ? 'ready' : 'needs setup'}</span><span className={`rounded-lg border px-2 py-1.5 text-[9px] font-semibold ${statusClass(Boolean(connection?.apiKeyConfigured))}`}><KeyRound className="mr-1 inline h-3 w-3" />API key {connection?.apiKeyConfigured ? 'ready' : 'optional'}</span></div>
    <ol className="mt-3 space-y-2 text-[9px] leading-relaxed text-neutral-300"><li className="flex gap-2"><span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/10 text-[8px] font-bold text-white">1</span><span>In Dodo, create a webhook under <strong className="text-white">Developer → Webhooks</strong> and select the events you want Revenue Rescue to monitor.</span></li><li className="flex gap-2"><span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/10 text-[8px] font-bold text-white">2</span><span>Save the webhook signing key as <code className="rounded bg-white/10 px-1 text-sky-100">DODO_PAYMENTS_WEBHOOK_KEY</code> on your server. It is never requested in this browser.</span></li></ol>
    <div className="mt-2 flex items-center gap-1.5"><button type="button" onClick={copyWebhook} disabled={!connection?.webhookUrl} className="min-w-0 flex-1 truncate rounded-lg border border-white/10 bg-black/25 px-2 py-1.5 text-left font-mono text-[8px] text-neutral-300 hover:bg-black/40 disabled:cursor-not-allowed disabled:opacity-50">{connection?.webhookUrl || 'Set INTENT_CANVAS_PUBLIC_WEBHOOK_URL on the server'}</button><button type="button" onClick={copyWebhook} disabled={!connection?.webhookUrl} aria-label="Copy webhook URL" className="rounded-lg border border-sky-300/25 bg-sky-400/10 p-1.5 text-sky-100 hover:bg-sky-400/20 disabled:opacity-50">{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}</button></div>
    <a className="mt-2 inline-flex items-center gap-1 text-[9px] font-semibold text-sky-200 hover:text-white" href="https://docs.dodopayments.com/developer-resources/webhooks" target="_blank" rel="noreferrer">Open Dodo webhook setup <ExternalLink className="h-3 w-3" /></a>
    <div className="mt-3 border-t border-white/10 pt-3"><div className="flex items-center justify-between gap-2"><div><p className="flex items-center gap-1 text-[10px] font-bold text-white"><DatabaseZap className="h-3.5 w-3.5 text-[#00ff87]" />Historical payment monitor</p><p className="mt-0.5 text-[8px] text-neutral-500">Imports payment history server-side and deduplicates it against webhooks.</p></div><span className="text-[8px] uppercase tracking-wide text-neutral-500">{connection ? (connection.environment === 'test_mode' ? 'Test mode' : 'Live mode') : 'Checking'}</span></div><div className="mt-2 flex gap-1.5">{[30, 90, 365].map(option => <button key={option} type="button" onClick={() => setDays(option)} className={`rounded-md border px-2 py-1 text-[9px] font-semibold ${days === option ? 'border-[#00ff87]/30 bg-[#00ff87]/15 text-[#b8ffd9]' : 'border-white/10 bg-white/[0.03] text-neutral-400 hover:text-white'}`}>{option}d</button>)}<button type="button" disabled={!connection?.historyImportAvailable || importing || loading} onClick={() => onImportHistory(days, continuation?.nextPage ?? 0)} className="ml-auto rounded-md border border-[#00ff87]/25 bg-[#00ff87]/10 px-2 py-1 text-[9px] font-semibold text-[#b8ffd9] hover:bg-[#00ff87]/20 disabled:cursor-not-allowed disabled:opacity-50">{importing ? <><RefreshCw className="mr-1 inline h-3 w-3 animate-spin" />Importing</> : continuation ? 'Continue' : 'Import history'}</button></div></div>
  </section>;
}
