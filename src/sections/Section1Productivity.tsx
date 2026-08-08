import { motion } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import { AnimatedNetworkLines } from './AnimatedNetworkLines'
import { useIsMobile } from '../hooks/useIsMobile'
import { MobileShowcasePanel } from '../components/showcase/MobileShowcasePanel'
import { BlurFadeWords } from '../BlurFadeWords'
import { Sparkles, Cpu, CheckCircle2 } from 'lucide-react'
import { APP_CONFIG } from '../config'

function AnimatedWords({ text, baseDelay = 0, isInView }: {
  text: string
  baseDelay?: number
  isInView: boolean
}) {
  const words = text.split(' ')
  return (
    <>
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: isInView ? 1 : 0 }}
          transition={{ delay: baseDelay + i * 0.08, duration: 0.35, ease: 'easeOut' }}
          style={{ display: 'inline' }}
        >
          {word}{i < words.length - 1 ? ' ' : ''}
        </motion.span>
      ))}
    </>
  )
}

const MAGIC_BORDER_GREEN = 'conic-gradient(from 0deg, transparent 0%, transparent 35%, rgba(36,255,149,0.12) 42%, #24FF95 50%, rgba(36,255,149,0.12) 58%, transparent 65%, transparent 100%)'

function MagicBorder({ color, radius = '24px', reverse = false, duration = 5, initialAngle = 0, isInView = true }: { color: string; radius?: string; reverse?: boolean; duration?: number; initialAngle?: number; isInView?: boolean }) {
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

export function Section1Productivity({ isInView: propIsInView }: { isInView?: boolean } = {}) {
  const sectionRef = useRef<HTMLElement>(null)
  const [internalIsInView, setInternalIsInView] = useState(true)
  const isMobile = useIsMobile()
  const [scale, setScale] = useState(1)

  const isInView = propIsInView ?? internalIsInView

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
          setInternalIsInView(true)
        } else if (!entry.isIntersecting || ratio < exitRatio) {
          wasVisible = false
          setInternalIsInView(false)
        }
      },
      { threshold: [exitRatio, enterRatio] }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [isMobile])

  if (isMobile) {
    return <MobileShowcasePanel eyebrow="01 / Intent as Input" title="Stop clicking buttons. Express intent." description="Describe the outcome you want in plain language. Intent Canvas turns your goal into an inspectable computation instead of a chain of forms and commands." accentClass="text-[#24ff95]" />
  }

  const card = (
    <div
      className="landing-showcase-card"
      style={{
        position: 'relative',
        width: NATIVE_W,
        height: NATIVE_H,
        borderRadius: '24px',
        backgroundImage: 'url(https://qclay.design/lovable/glass-menu/s1-main-card-bg.png), linear-gradient(135deg, #09130f, #040406)',
        backgroundSize: '115%',
        backgroundPosition: 'center',
        overflow: 'hidden',
        boxShadow:
          '0 0 0 1px rgba(129,209,189,0.01), 0 40px 120px rgba(0,0,0,0.75), 0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
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
          objectPosition: 'center',
          pointerEvents: 'none',
          zIndex: 999,
          filter: 'drop-shadow(0 0 50px rgba(36, 255, 149, 0.75))',
        }}
      />

      {/* ── Text block ── */}
      <div
        style={{
          position: 'absolute',
          top: '40px',
          left: '65px',
          width: '480px',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 10,
          visibility: isInView ? 'visible' : 'hidden',
        }}
      >
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{ position: 'relative', width: '320px', height: '80px', marginBottom: '25px', marginLeft: '-30px' }}
        >
          <img
            src="https://qclay.design/lovable/glass-menu/s1-notification-badge.svg"
            alt=""
            onError={(event) => { event.currentTarget.style.display = 'none' }}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center center', display: 'block' }}
          />
          <span className="sr-only">01/04</span>
          <div style={{
            position: 'absolute', width: '155px', height: '155px',
            top: '50%', left: '44px', transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(circle, rgba(36,255,149,0.10) 0%, rgba(36,255,149,0) 70%)',
            pointerEvents: 'none', borderRadius: '50%',
          }} />
        </motion.div>

        <h1
          style={{
            fontFamily: 'var(--font-jakarta)',
            fontSize: '52px',
            fontWeight: 300,
            lineHeight: 1.08,
            letterSpacing: '-1.2px',
            color: '#ffffff',
            margin: 0,
            marginBottom: '8px',
          }}
        >
          <BlurFadeWords text="Stop Clicking Buttons. Express Intent." baseDelay={0.4} isInView={isInView} />
        </h1>

        <p
          style={{
            fontFamily: 'var(--font-jakarta)',
            fontSize: '28px',
            fontWeight: 300,
            lineHeight: 1.2,
            letterSpacing: '-0.5px',
            margin: 0,
            marginBottom: '16px',
          }}
        >
          <BlurFadeWords
            text="No forms. No syntax. Just tell the computer what you want."
            baseDelay={0.65}
            isInView={isInView}
            wordStyle={{
              background: 'linear-gradient(180deg, #9BFFCF 0%, #24FF95 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          />
        </p>

        <p
          style={{
            fontFamily: 'var(--font-jakarta)',
            fontSize: '17px',
            fontWeight: 300,
            lineHeight: 1.35,
            color: 'rgba(255,255,255,0.65)',
            margin: 0,
            maxWidth: '420px',
          }}
        >
          <BlurFadeWords text="Traditional software forces manual step-by-step procedures." baseDelay={0.9} isInView={isInView} />
          <br />
          <BlurFadeWords text="Intent Canvas turns your desires directly into automated computations." baseDelay={1.15} isInView={isInView} />
        </p>
      </div>

      {/* ── Network Lines ── */}
      <div
        style={{
          position: 'absolute',
          left: '35px',
          bottom: '-25px',
          width: '570px',
          height: '358px',
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        <AnimatedNetworkLines isInView={isInView} color="#24FF95" />
      </div>

      {/* ── Right Half Snappy Lightweight Cards ── */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: '-1%',
          width: '50%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          padding: '24px 28px 24px 73px',
          boxSizing: 'border-box',
          perspective: '1000px',
          zIndex: 15,
        }}
      >
        {/* Top Card: Spatial Graph AST Compiler */}
        <div style={{ flex: 0.93, position: 'relative', overflow: 'hidden' }}>
          <motion.div
            initial={{ opacity: 0, x: -60, scale: 0.95 }}
            animate={isInView ? { opacity: 1, x: 0, scale: 1 } : { opacity: 0, x: -60, scale: 0.95 }}
            transition={isInView ? { type: 'spring', stiffness: 50, damping: 20, mass: 0.9 } : { duration: 0 }}
            style={{ willChange: 'transform, opacity' }}
            className="smoked-glass relative h-full w-full rounded-3xl p-6 flex flex-col justify-between border border-[#00ff87]/30 bg-[#090a0f]/90 shadow-2xl backdrop-blur-xl"
          >
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#00ff87] uppercase tracking-wider">
                  <Cpu className="h-3.5 w-3.5" /> Spatial Graph AST Compiler
                </span>
                <span className="rounded-full border border-[#00ff87]/30 bg-[#00ff87]/10 px-2 py-0.5 text-[9px] font-bold text-[#00ff87]">
                  Primitive v1.0
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mb-1">Spatial Layout ➔ AST Compiler</h3>
              <p className="text-xs text-neutral-300 leading-relaxed">
                Nodes, distance vectors, and edge connectors are parsed into structured AST representations before execution.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
                <div className="text-[10px] text-neutral-400 font-mono">AST Node Count</div>
                <div className="text-sm font-bold text-white">3 Active Contexts</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
                <div className="text-[10px] text-neutral-400 font-mono">Distance Metric</div>
                 <div className="text-sm font-bold text-[#00ff87]">{APP_CONFIG.proximityDistancePixels}px Proximity</div>
              </div>
            </div>

            <MagicBorder color={MAGIC_BORDER_GREEN} radius="24px" isInView={isInView} />
          </motion.div>
        </div>

        {/* Bottom Card: MeshAPI Engine Execution */}
        <div style={{ flex: 1.07, overflow: 'hidden' }}>
          <motion.div
            initial={{ opacity: 0, x: 60, scale: 0.95 }}
            animate={isInView ? { opacity: 1, x: 0, scale: 1 } : { opacity: 0, x: 60, scale: 0.95 }}
            transition={isInView ? { type: 'spring', stiffness: 50, damping: 20, mass: 0.9, delay: 0.1 } : { duration: 0 }}
            style={{ willChange: 'transform, opacity' }}
            className="smoked-glass relative h-full w-full rounded-3xl p-6 flex flex-col justify-between border border-[#00ff87]/30 bg-[#090a0f]/90 shadow-2xl backdrop-blur-xl"
          >
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#00ff87] uppercase tracking-wider">
                  <Sparkles className="h-3.5 w-3.5" /> MeshAPI Reasoning Engine
                </span>
                <span className="font-mono text-[10px] text-neutral-400">Gemini 2.5 Flash</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Inspectable Execution Output</h3>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] p-2 text-xs">
                  <span className="flex items-center gap-2 text-neutral-200">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#00ff87]" /> August Revenue Churn Highlight
                  </span>
                  <span className="font-mono font-bold text-amber-400">-38.0%</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] p-2 text-xs">
                  <span className="flex items-center gap-2 text-neutral-200">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#00ff87]" /> Qualitative Feedback Synthesis
                  </span>
                  <span className="font-mono text-sky-400">Gateway v2 Migration</span>
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
              <span className="text-[11px] text-neutral-400">Target Outcome:</span>
              <span className="text-xs font-bold text-[#00ff87]">Dynamic Living Result Rendered</span>
            </div>

            <MagicBorder color={MAGIC_BORDER_GREEN} radius="24px" reverse isInView={isInView} />
          </motion.div>
        </div>
      </div>

      <MagicBorder color={MAGIC_BORDER_GREEN} radius="24px" duration={10} initialAngle={180} isInView={isInView} />
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
