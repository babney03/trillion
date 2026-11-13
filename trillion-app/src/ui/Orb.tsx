import { useEffect, useRef } from 'react'

export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking'

/**
 * The voice orb: the one authored motion in the app. Concentric amber arcs
 * that breathe when idle, tighten while listening and ripple while speaking.
 */
export function Orb({ state }: { state: OrbState }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    let energy = 0.2
    let size = 0
    const fit = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      size = canvas.clientWidth
      canvas.width = canvas.height = Math.round(size * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(canvas)

    const draw = (ms: number) => {
      const t = ms / 1000
      const s = stateRef.current
      const target = s === 'speaking' ? 1 : s === 'listening' ? 0.75 : s === 'thinking' ? 0.5 : 0.2
      energy += (target - energy) * 0.06
      const c = size / 2
      ctx.clearRect(0, 0, size, size)

      // Core glow
      const pulse = s === 'speaking' ? 0.5 + 0.5 * Math.abs(Math.sin(t * 7.3) * Math.sin(t * 3.1)) : 0.5 + 0.5 * Math.sin(t * (s === 'listening' ? 4 : 1.2))
      const coreR = size * (0.13 + 0.035 * energy * pulse)
      const glow = ctx.createRadialGradient(c, c, 0, c, c, size * 0.5)
      glow.addColorStop(0, `oklch(0.9 0.14 86 / ${0.55 + 0.35 * energy})`)
      glow.addColorStop(coreR / (size * 0.5), `oklch(0.82 0.15 78 / ${0.28 + 0.2 * energy})`)
      glow.addColorStop(0.62, 'oklch(0.7 0.14 60 / 0.05)')
      glow.addColorStop(1, 'oklch(0.7 0.14 60 / 0)')
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(c, c, size * 0.5, 0, Math.PI * 2)
      ctx.fill()

      // Rings: broken arcs at different speeds; a waveform rides the middle ring while speaking.
      const rings = [
        { r: 0.24, w: 2.2, speed: 0.5, gaps: 3, a: 0.95 },
        { r: 0.31, w: 1.2, speed: -0.32, gaps: 5, a: 0.6 },
        { r: 0.385, w: 3, speed: 0.18, gaps: 2, a: 0.8 },
        { r: 0.455, w: 1, speed: -0.1, gaps: 9, a: 0.4 },
      ]
      ctx.lineCap = 'round'
      rings.forEach((ring, k) => {
        const rot = t * ring.speed * (0.6 + energy * 1.6)
        const breathe = 1 + 0.018 * Math.sin(t * 1.4 + k) * (0.4 + energy)
        const seg = (Math.PI * 2) / ring.gaps
        ctx.strokeStyle = `oklch(${0.84 + 0.05 * energy} 0.145 ${82 - k * 3} / ${ring.a * (0.45 + 0.55 * energy)})`
        ctx.lineWidth = ring.w
        for (let g = 0; g < ring.gaps; g++) {
          const a0 = rot + g * seg + seg * 0.12
          const a1 = rot + (g + 1) * seg - seg * (0.12 + 0.1 * Math.sin(t * 0.7 + g + k))
          ctx.beginPath()
          if (k === 2 && s === 'speaking') {
            for (let a = a0; a <= a1; a += 0.03) {
              const wob = 1 + 0.03 * energy * Math.sin(a * 14 + t * 11) * Math.sin(a * 3 - t * 5)
              const x = c + Math.cos(a) * size * ring.r * breathe * wob
              const y = c + Math.sin(a) * size * ring.r * breathe * wob
              if (a === a0) ctx.moveTo(x, y)
              else ctx.lineTo(x, y)
            }
          } else ctx.arc(c, c, size * ring.r * breathe, a0, a1)
          ctx.stroke()
        }
      })

      // Tick marks, like a bezel
      ctx.strokeStyle = 'oklch(0.84 0.1 82 / 0.28)'
      ctx.lineWidth = 1
      for (let i = 0; i < 60; i++) {
        const a = (i / 60) * Math.PI * 2
        const r0 = size * (i % 5 === 0 ? 0.478 : 0.486)
        ctx.beginPath()
        ctx.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0)
        ctx.lineTo(c + Math.cos(a) * size * 0.495, c + Math.sin(a) * size * 0.495)
        ctx.stroke()
      }
      if (!reduce) raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  return <canvas ref={ref} aria-hidden="true" />
}
