import { useEffect, useState } from 'react'
import { KeyRound, Eye, EyeOff, Check, Settings2, X, Sparkles } from 'lucide-react'
import { getGeminiKey, hasGeminiKey, setGeminiKey } from '../services/geminiService'

export function ApiKeyBar() {
  const [key, setKey] = useState('')
  const [saved, setSaved] = useState(hasGeminiKey())
  const [show, setShow] = useState(false)
  const [expanded, setExpanded] = useState(!hasGeminiKey())

  useEffect(() => {
    const stored = getGeminiKey()
    if (stored) {
      setKey(stored)
      setExpanded(false)
    } else {
      setExpanded(true)
    }
  }, [])

  const save = () => {
    const trimmed = key.trim()
    if (trimmed && trimmed.length < 20) {
      alert('Invalid Gemini key. Paste the full key from aistudio.google.com (at least 20 characters).')
      return
    }
    setGeminiKey(trimmed)
    const hasKey = Boolean(trimmed)
    setSaved(hasKey)
    if (hasKey) setExpanded(false)
    setTimeout(() => setSaved(hasGeminiKey()), 1500)
  }

  const clear = () => {
    setKey('')
    setGeminiKey('')
    setSaved(false)
    setExpanded(true)
  }

  // Collapsed state — tiny indicator in workspace corner
  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="group flex items-center gap-2 rounded-full border border-white/10 bg-[#090a0f]/80 px-3 py-2 text-[11px] text-neutral-300 shadow-xl backdrop-blur-xl hover:border-[#00ff87]/30 hover:bg-[#090a0f]/90 hover:text-white transition-all"
        title={hasGeminiKey() ? 'Gemini key saved — click to manage' : 'Add Gemini API key'}
      >
        <span className={`h-2 w-2 rounded-full ${hasGeminiKey() ? 'bg-[#00ff87] shadow-[0_0_8px_rgba(0,255,135,0.6)]' : 'bg-amber-400'}`} />
        <KeyRound className="h-3 w-3" />
        <span className="hidden sm:inline font-medium">{hasGeminiKey() ? 'Gemini ready' : 'Add API key'}</span>
        <Settings2 className="h-3 w-3 opacity-60 group-hover:opacity-100" />
      </button>
    )
  }

  // Expanded — full card for workspace
  return (
    <div className="w-[320px] rounded-2xl border border-white/10 bg-[#090a0f]/90 p-4 shadow-2xl backdrop-blur-2xl">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg border border-[#00ff87]/20 bg-[#00ff87]/10 p-1.5 text-[#00ff87]">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div>
            <p className="text-xs font-bold text-white">Gemini API Key</p>
            <p className="text-[10px] leading-none text-neutral-500">Powers planning & execution</p>
          </div>
        </div>
        <button type="button" onClick={() => hasGeminiKey() && setExpanded(false)} className="rounded-full p-1 text-neutral-500 hover:bg-white/10 hover:text-white">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {!hasGeminiKey() && (
        <p className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-2.5 py-2 text-[11px] leading-relaxed text-amber-200">
          Add your Gemini key to enable AI planning. Without it, a local fallback runs — useful, but less rich.
        </p>
      )}

      <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-2.5 py-2">
        <KeyRound className="h-3.5 w-3.5 shrink-0 text-neutral-500" />
        <input
          type={show ? 'text' : 'password'}
          value={key}
          onChange={e => setKey(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && save()}
          placeholder="Paste Gemini API key"
          className="flex-1 bg-transparent text-xs text-white placeholder:text-neutral-500 focus:outline-none"
        />
        <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? 'Hide key' : 'Show key'} className="rounded p-1 text-neutral-500 hover:text-white">
          {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button type="button" onClick={save} className="flex-1 rounded-xl bg-[#00ff87] px-3 py-2 text-xs font-bold text-black hover:bg-[#00ff87]/90">
          {saved ? <span className="flex items-center justify-center gap-1"><Check className="h-3.5 w-3.5" /> Saved</span> : 'Save key'}
        </button>
        {hasGeminiKey() && (
          <button type="button" onClick={clear} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-neutral-300 hover:bg-white/10 hover:text-white">
            Clear
          </button>
        )}
        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="rounded-xl border border-sky-500/20 bg-sky-500/5 px-3 py-2 text-xs font-semibold text-sky-300 hover:bg-sky-500/10 hover:text-sky-200">
          Get key
        </a>
      </div>

      <p className="mt-2 text-center text-[10px] leading-relaxed text-neutral-500">
        Stored only in this browser. Never sent except to <span className="text-neutral-300">generativelanguage.googleapis.com</span>
      </p>
    </div>
  )
}
