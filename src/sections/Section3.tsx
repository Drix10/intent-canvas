import { motion } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import { AnimatedNetworkLines } from './AnimatedNetworkLines'
import { useIsMobile } from '../hooks/useIsMobile'
import { BlurFadeWords } from '../BlurFadeWords'

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
          transition={{ delay: baseDelay + i * 0.1, duration: 0.4, ease: 'easeOut' }}
          style={{ display: 'inline' }}
        >
          {word}{i < words.length - 1 ? ' ' : ''}
        </motion.span>
      ))}
    </>
  )
}

const MAGIC_BORDER_BLUE = 'conic-gradient(from 0deg, transparent 0%, transparent 35%, rgba(76,109,255,0.12) 42%, #4C6DFF 50%, rgba(76,109,255,0.12) 58%, transparent 65%, transparent 100%)'

function MagicBorder({ color, radius = '24px', reverse = false, duration = 4, initialAngle = 0, isInView = true }: { color: string; radius?: string; reverse?: boolean; duration?: number; initialAngle?: number; isInView?: boolean }) {
  const fromAngle = reverse ? -initialAngle : initialAngle
  const toAngle = fromAngle + (reverse ? -360 : 360)
  return (
    <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, borderRadius: radius, pointerEvents: 'none', overflow: 'hidden', zIndex: 60, padding: '2px', WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' }}>
      <motion.div
        style={{ position: 'absolute', left: '50%', top: '50%', width: '250%', height: '250%', background: color, x: '-50%', y: '-50%', transformOrigin: 'center center', filter: 'drop-shadow(0 0 5px rgba(76, 109, 255, 0.5)) drop-shadow(0 0 10px rgba(76, 109, 255, 0.3))', willChange: 'transform' }}
        animate={isInView ? { rotate: [fromAngle, toAngle] } : false}
        transition={{ repeat: Infinity, duration, ease: 'linear' }}
      />
    </div>
  )
}

const NATIVE_W = 1040
const NATIVE_H = 684

export function Section3() {
  const sectionRef = useRef<HTMLElement>(null)
  const [isInView, setIsInView] = useState(false)
  const isMobile = useIsMobile()
  const [scale, setScale] = useState(1)

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
    const enterRatio = isMobile ? 0.2 : 0.92
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

  const card = (
    <div
      style={{
        position: 'relative',
        width: NATIVE_W,
        height: NATIVE_H,
        borderRadius: '24px',
        backgroundImage: 'url(https://qclay.design/lovable/glass-menu/s3-card-bg.png)',
        backgroundSize: '115%',
        backgroundPosition: 'center',
        overflow: 'hidden',
        boxShadow:
          '0 0 0 1px rgba(76,109,255,0.01), 0 40px 120px rgba(0,0,0,0.75), 0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
      }}
    >
      <img
        src="https://qclay.design/lovable/glass-menu/s3-card-light-overlay.png"
        alt=""
        style={{
          position: 'absolute',
          top: 0, left: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
          pointerEvents: 'none',
          zIndex: 999,
          filter: 'drop-shadow(0 0 50px rgba(76, 109, 255, 0.75))',
        }}
      />

      {/* ── Text block ── */}
      <div style={{ position: 'absolute', top: '40px', left: '65px', width: '480px', display: 'flex', flexDirection: 'column', zIndex: 10 }}>
        <h1 style={{ fontFamily: 'var(--font-jakarta)', fontSize: '52px', fontWeight: 300, color: '#ffffff', margin: 0, marginBottom: '8px' }}>
          <BlurFadeWords text="Inspect Plans Before Execution." baseDelay={0.5} isInView={isInView} />
        </h1>
        <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '28px', fontWeight: 300, margin: 0, marginBottom: '16px' }}>
          <BlurFadeWords
            text="Zero black boxes. Gemini 2.5 Flash breaks intent into clear steps."
            baseDelay={0.8}
            isInView={isInView}
            wordStyle={{
              background: 'linear-gradient(180deg, #A8C4FF 0%, #4C6DFF 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          />
        </p>
        <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: '17px', fontWeight: 300, color: 'rgba(255,255,255,0.65)', margin: 0, maxWidth: '420px' }}>
          <BlurFadeWords text="Review every tool and step before confirming." baseDelay={1.1} isInView={isInView} />
          <br />
          <BlurFadeWords text="If your prompt is ambiguous, interactive gates let you clarify instantly." baseDelay={1.45} isInView={isInView} />
        </p>
      </div>

      {/* ── Network Lines ── */}
      <div style={{ position: 'absolute', left: '35px', bottom: '-25px', width: '570px', height: '358px', zIndex: 10 }}>
        <AnimatedNetworkLines isInView={isInView} color="#4C6DFF" />
      </div>

      {/* ── Right Half Rich Glass Cards ── */}
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
          padding: '6px 0 6px 73px',
          boxSizing: 'border-box',
          perspective: '1200px',
        }}
      >
        {/* Top Card */}
        <div style={{ flex: 0.93, position: 'relative', overflow: 'hidden' }}>
          <motion.div
            initial={{ opacity: 0, x: -200, rotateY: -90, scale: 0.8 }}
            animate={isInView ? { opacity: 1, x: 0, rotateY: 0, scale: 1 } : { opacity: 0, x: -200, rotateY: -90, scale: 0.8 }}
            transition={isInView ? { type: 'spring', stiffness: 32, damping: 22, mass: 1.2 } : { duration: 0 }}
            style={{
              width: '100.5%',
              height: '100.5%',
              marginTop: '-0.25%',
              marginLeft: '-0.25%',
              borderRadius: '24px',
              backgroundImage: 'url(https://qclay.design/lovable/glass-menu/s3-card-bg.png)',
              backgroundSize: '100% 100%',
              overflow: 'hidden',
              position: 'relative',
              boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.01)',
            }}
          >
            <div style={{ position: 'absolute', inset: 0, padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-aeonik)', fontWeight: 600, color: '#4C6DFF', letterSpacing: '1px', textTransform: 'uppercase' }}>MeshAPI Reasoning Pipeline</span>
              <h3 style={{ fontSize: '20px', fontFamily: 'var(--font-jakarta)', fontWeight: 300, color: '#fff', margin: '6px 0' }}>Step-by-Step Deconstruction</h3>
              <p style={{ fontSize: '13px', fontFamily: 'var(--font-aeonik)', color: 'rgba(255,255,255,0.6)', margin: 0 }}>Every step maps directly to capability engines with 94%+ confidence scoring.</p>
            </div>
            <MagicBorder color={MAGIC_BORDER_BLUE} radius="24px" isInView={isInView} />
          </motion.div>
        </div>

        {/* Bottom Card */}
        <div style={{ flex: 1.07, overflow: 'hidden' }}>
          <motion.div
            initial={{ opacity: 0, x: 200, rotateY: 90, scale: 0.8 }}
            animate={isInView ? { opacity: 1, x: 0, rotateY: 0, scale: 1 } : { opacity: 0, x: 200, rotateY: 90, scale: 0.8 }}
            transition={isInView ? { type: 'spring', stiffness: 32, damping: 22, mass: 1.2, delay: 0.15 } : { duration: 0 }}
            style={{
              width: '100.5%',
              height: '100.5%',
              marginTop: '-0.25%',
              marginLeft: '-0.25%',
              borderRadius: '24px',
              backgroundImage: 'url(https://qclay.design/lovable/glass-menu/s3-card-bg.png)',
              backgroundSize: '100% 100%',
              overflow: 'hidden',
              position: 'relative',
              boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.01)',
            }}
          >
            <div style={{ position: 'absolute', inset: 0, padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <h3 style={{ fontSize: '20px', fontFamily: 'var(--font-aeonik)', fontWeight: 300, color: 'rgba(255,255,255,0.85)', margin: '0 0 8px 0' }}>Disambiguation Gate (&lt; 85%)</h3>
              <p style={{ fontSize: '13px', fontFamily: 'var(--font-aeonik)', color: 'rgba(255,255,255,0.5)', margin: 0 }}>Interactive option chips let humans resolve low-confidence intent ambiguities.</p>
            </div>
            <MagicBorder color={MAGIC_BORDER_BLUE} radius="24px" reverse isInView={isInView} />
          </motion.div>
        </div>
      </div>

      <MagicBorder color={MAGIC_BORDER_BLUE} radius="24px" duration={10} initialAngle={0} isInView={isInView} />
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
