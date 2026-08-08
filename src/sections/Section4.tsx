import { motion } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import { AnimatedNetworkLines } from './AnimatedNetworkLines'
import { useIsMobile } from '../hooks/useIsMobile'
import { MobileShowcasePanel } from '../components/showcase/MobileShowcasePanel'
import { BlurFadeWords } from '../BlurFadeWords'
import { useCanvasStore } from '../store/useCanvasStore'
import { MagneticButton } from '../components/ui/MagneticButton'
import { Sparkles, Play, Plus, RefreshCw, Filter, Database, ArrowRight } from 'lucide-react'

const MAGIC_BORDER_WHITE = 'conic-gradient(from 0deg, transparent 0%, transparent 35%, rgba(255,255,255,0.12) 42%, #ffffff 50%, rgba(255,255,255,0.12) 58%, transparent 65%, transparent 100%)'

function MagicBorder({ color, radius = '24px', reverse = false, duration = 4, initialAngle = 0, isInView = true }: { color: string; radius?: string; reverse?: boolean; duration?: number; initialAngle?: number; isInView?: boolean }) {
  if (!isInView) return null
  const fromAngle = reverse ? -initialAngle : initialAngle
  const toAngle = fromAngle + (reverse ? -360 : 360)
  return (
    <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, borderRadius: radius, pointerEvents: 'none', overflow: 'hidden', zIndex: 60, padding: '2px', WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' }}>
      <motion.div
        style={{ position: 'absolute', left: '50%', top: '50%', width: '250%', height: '250%', background: color, x: '-50%', y: '-50%', transformOrigin: 'center center', willChange: 'transform' }}
        animate={{ rotate: [fromAngle, toAngle] }}
        transition={{ repeat: Infinity, duration, ease: 'linear' }}
      />
    </div>
  )
}

const NATIVE_W = 1040
const NATIVE_H = 684

interface Section4Props {
  onEvaluatePlan: () => void;
  onExecuteComputation: () => void;
  onFilterEnterprise: () => void;
  onAddNewNode: () => void;
}

export function Section4({
  onEvaluatePlan,
  onExecuteComputation,
  onFilterEnterprise,
  onAddNewNode,
}: Section4Props) {
  const sectionRef = useRef<HTMLElement>(null)
  const [isInView, setIsInView] = useState(true)
  const isMobile = useIsMobile()
  const [scale, setScale] = useState(1)

  const {
    activeIntentPrompt,
    setActiveIntentPrompt,
    isEvaluatingPlan,
    isExecutingPlan,
    resetDemoCanvas,
    setViewMode,
  } = useCanvasStore()

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      setScale(w > 1024 ? Math.min(1, w / 1440, h / 900) : Math.max(0.28, (w - 24) / NATIVE_W))
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    let wasVisible = false
    const enterRatio = isMobile ? 0.2 : 0.35
    const exitRatio = isMobile ? 0.05 : 0.1
    const obs = new IntersectionObserver(
      ([entry]) => {
        const ratio = entry.intersectionRatio
        if (entry.isIntersecting && ratio >= enterRatio && !wasVisible) {
          wasVisible = true
          setIsInView(true)
        } else if (!entry.isIntersecting || ratio < exitRatio) {
          wasVisible = false
          setIsInView(false)
        }
      },
      { threshold: [exitRatio, enterRatio] }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [isMobile])

  if (isMobile) {
    return (
      <MobileShowcasePanel eyebrow="04 / Try It Live" title="Shape an outcome, then make it real." description="Start with a plain-language goal. Inspect the generated plan when you want confidence, or execute directly to see the result in the workspace." accentClass="text-[#00ff87]">
        <label htmlFor="mobile-showcase-intent" className="sr-only">Describe the outcome you want</label>
        <input
          id="mobile-showcase-intent"
          type="text"
          value={activeIntentPrompt}
          onChange={(event) => setActiveIntentPrompt(event.target.value)}
          placeholder="e.g. Explain the August revenue drop"
          className="mt-6 w-full rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-[#00ff87]/60"
        />
        <div className="mt-3 grid grid-cols-1 gap-2">
          <button type="button" onClick={onEvaluatePlan} disabled={isEvaluatingPlan} className="rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
            {isEvaluatingPlan ? 'Preparing plan...' : 'Inspect plan first'}
          </button>
          <MagneticButton type="button" onClick={onExecuteComputation} disabled={isExecutingPlan} className="w-full bg-[#00ff87] px-4 py-3 text-sm font-bold text-black disabled:opacity-50">
            {isExecutingPlan ? 'Computing...' : 'Execute computation'}
          </MagneticButton>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={onFilterEnterprise} className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300">Adapt for enterprise</button>
          <button type="button" onClick={onAddNewNode} className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-neutral-200">Add document</button>
        </div>
        <button type="button" onClick={() => setViewMode('interactive')} className="mt-4 w-full text-xs text-neutral-400 underline underline-offset-4 hover:text-white">Open the full workspace</button>
      </MobileShowcasePanel>
    )
  }

  const card = (
      <div
        className="landing-showcase-card"
      style={{
        position: 'relative',
        width: NATIVE_W,
        height: NATIVE_H,
        borderRadius: '24px',
        backgroundImage: 'url(https://qclay.design/lovable/glass-menu/s4-card-bg.png), linear-gradient(135deg, #0c1518, #040406)',
        backgroundSize: '115%',
        backgroundPosition: 'center',
        overflow: 'hidden',
        boxShadow:
          '0 0 0 1px rgba(255,255,255,0.01), 0 40px 120px rgba(0,0,0,0.75), 0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
      }}
    >
      <img
        src="https://qclay.design/lovable/glass-menu/card-light-overlay.png"
        alt=""
        onError={(event) => { event.currentTarget.style.display = 'none' }}
        style={{
          position: 'absolute',
          top: 0, left: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
          pointerEvents: 'none',
          zIndex: 999,
          filter: 'drop-shadow(0 0 50px rgba(255, 255, 255, 0.75))',
        }}
      />

      {/* Main Section Header */}
      <div style={{ position: 'absolute', top: '35px', left: '55px', right: '55px', display: 'flex', flexDirection: 'column', zIndex: 10 }}>
        <h1 style={{ fontFamily: 'var(--font-jakarta)', fontSize: '46px', fontWeight: 300, color: '#ffffff', margin: 0, marginBottom: '6px' }}>
          <BlurFadeWords text="Experience Intent-Driven Computation." baseDelay={0.4} isInView={isInView} />
        </h1>

        <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '17px', fontWeight: 300, color: 'rgba(255,255,255,0.7)', margin: 0, marginBottom: '18px' }}>
          <BlurFadeWords text="Type your natural intent below, inspect the execution plan, or execute the dynamic computation live." baseDelay={0.7} isInView={isInView} />
        </p>

        {/* User Guidance Step Pills */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 15 }}
          transition={{ delay: 0.9, duration: 0.5 }}
          className="mb-5 grid grid-cols-3 gap-3"
        >
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur-md">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#00ff87]">
              <Database className="h-3.5 w-3.5" /> 1. Context Nodes Linked
            </div>
            <p className="mt-1 text-[11px] text-neutral-400">
              `Sales_Q3_Metrics.csv` + `Customer_Feedback.txt` connected on spatial canvas.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur-md">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-400">
              <Sparkles className="h-3.5 w-3.5" /> 2. Express Outcome
            </div>
            <p className="mt-1 text-[11px] text-neutral-400">
              State desired result in plain English. No syntax or commands needed.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur-md">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
              <Play className="h-3.5 w-3.5" /> 3. Live Execution & Adaptation
            </div>
            <p className="mt-1 text-[11px] text-neutral-400">
              Inspect step-by-step Gemini plans & render SVG metrics directly on canvas.
            </p>
          </div>
        </motion.div>

        {/* Embedded Interactive Intent Console */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.96 }}
          transition={{ delay: 1.1, duration: 0.6 }}
          className="rounded-2xl border border-white/15 bg-[#090a0f]/90 p-4 shadow-2xl backdrop-blur-2xl"
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold text-white">
              <Sparkles className="h-4 w-4 text-[#00ff87]" /> Natural Intent Input Console
            </span>
            <button
              type="button"
              onClick={() => setViewMode('interactive')}
              className="flex items-center gap-1 text-[11px] font-semibold text-neutral-400 hover:text-[#00ff87]"
            >
              Open Full Drag & Drop Spatial Workspace <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {/* Prompt Input Box */}
          <div className="relative mb-2.5">
            <label htmlFor="showcase-intent-prompt" className="sr-only">Describe the outcome you want</label>
            <input
              id="showcase-intent-prompt"
              type="text"
              value={activeIntentPrompt}
              onChange={(e) => setActiveIntentPrompt(e.target.value)}
              placeholder="Type what outcome you desire (e.g. 'Show me why revenue dropped in August')..."
              className="w-full rounded-xl border border-white/15 bg-white/[0.05] px-4 py-2.5 text-xs text-white placeholder-neutral-400 outline-none transition-colors focus:border-[#00ff87]/60 focus:bg-white/[0.08]"
            />
          </div>

          {/* Quick Guided Prompt Suggestion Chips */}
          <div className="mb-3.5 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Try intent:</span>
            {[
              'Show me why revenue dropped in August',
              'Analyze customer churn sentiment notes',
              'Compare Q3 metrics with design system',
            ].map((suggestion, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveIntentPrompt(suggestion)}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-neutral-300 transition-colors hover:border-[#00ff87]/50 hover:bg-[#00ff87]/10 hover:text-[#00ff87]"
              >
                "{suggestion}"
              </button>
            ))}
          </div>

          {/* Console Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onFilterEnterprise}
                title="Filter Enterprise Adaptability Demo"
                className="flex items-center gap-1 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-400 hover:bg-amber-500/20"
              >
                <Filter className="h-3 w-3" /> Adapt (Filter Enterprise)
              </button>

              <button
                type="button"
                onClick={onAddNewNode}
                title="Add Document Card"
                className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:bg-white/10 hover:text-white"
              >
                <Plus className="h-3.5 w-3.5" /> Add Document Card
              </button>

              <button
                type="button"
                aria-label="Reset demo canvas"
                onClick={resetDemoCanvas}
                title="Reset Demo State"
                className="rounded-xl border border-white/10 bg-white/5 p-1.5 text-neutral-400 hover:bg-white/10 hover:text-white"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onEvaluatePlan}
                disabled={isEvaluatingPlan}
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-white/10"
              >
                {isEvaluatingPlan ? 'Evaluating...' : 'Inspect Plan'}
              </button>

              <MagneticButton
                onClick={onExecuteComputation}
                disabled={isExecutingPlan}
                className="bg-[#00ff87] px-6 py-2 text-xs font-bold text-black hover:bg-[#00ff87]/90 shadow-[0_0_20px_rgba(0,255,135,0.3)]"
              >
                {isExecutingPlan ? (
                  <span className="flex items-center gap-1.5">
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-black border-t-transparent" />
                    Computing...
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Play className="h-3.5 w-3.5 fill-black" /> Confirm & Execute Computation
                  </span>
                )}
              </MagneticButton>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Network Lines */}
      <div style={{ position: 'absolute', left: '35px', bottom: '-25px', width: '570px', height: '358px', zIndex: 10 }}>
        <AnimatedNetworkLines isInView={isInView} color="#ffffff" />
      </div>

      <MagicBorder color={MAGIC_BORDER_WHITE} radius="24px" duration={10} initialAngle={90} isInView={isInView} />
    </div>
  )

  return (
    <section
      ref={sectionRef}
      style={{
        width: '100vw',
        height: isMobile ? 'auto' : '100vh',
        ...(isMobile ? { minHeight: '100svh', backgroundColor: '#040406', overflow: 'hidden' } : {}),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        contain: 'layout style paint',
      }}
    >
      <div style={{ position: 'relative', flexShrink: 0, width: NATIVE_W * scale, height: NATIVE_H * scale }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: NATIVE_W, height: NATIVE_H, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          {card}
        </div>
      </div>
    </section>
  )
}
