import { useEffect, useState } from 'react'
import { KeyRound, Eye, EyeOff, Check } from 'lucide-react'
import { getGeminiKey, hasGeminiKey, setGeminiKey } from '../services/geminiService'

export function ApiKeyBar() {
  const [key, setKey] = useState('')
  const [saved, setSaved] = useState(hasGeminiKey())
  const [show, setShow] = useState(false)

  useEffect(() => {
    const stored = getGeminiKey()
    if (stored) setKey(stored)
  }, [])

  const save = () => {
    const trimmed = key.trim()
    if (trimmed && !/^AIza[0-9A-Za-z_-]{35}$/.test(trimmed)) {
      alert('Invalid Gemini key format. It should start with AIza and be 39 characters.')
      return
    }
    setGeminiKey(trimmed)
    setSaved(Boolean(trimmed))
    setTimeout(() => setSaved(hasGeminiKey()), 1500)
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 backdrop-blur">
      <KeyRound className="h-3.5 w-3.5 shrink-0 text-[#00ff87]" />
      <input
        type={show ? 'text' : 'password'}
        value={key}
        onChange={e => setKey(e.target.value)}
        placeholder="Paste Gemini API key (AIza...)"
        className="w-56 bg-transparent text-[11px] text-white placeholder:text-neutral-500 focus:outline-none sm:w-72"
      />
      <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? 'Hide key' : 'Show key'} className="rounded p-1 text-neutral-400 hover:text-white">
        {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
      <button type="button" onClick={save} className="rounded-lg bg-[#00ff87] px-2.5 py-1 text-[11px] font-bold text-black hover:bg-[#00ff87]/90">
        {saved ? <span className="flex items-center gap-1"><Check className="h-3 w-3" /> Saved</span> : 'Save'}
      </button>
      <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="hidden text-[10px] text-sky-300 hover:text-white sm:inline">Get key</a>
    </div>
  )
}
