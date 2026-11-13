import { ColorType, createChart, CrosshairMode, LineStyle, type IChartApi, type ISeriesApi, type UTCTimestamp } from 'lightweight-charts'
import { useEffect, useRef } from 'react'
import type { Candle } from '../engine/types'

/** The chart library needs rgb colours; resolve our OKLCH tokens through a canvas pixel. */
const cache = new Map<string, string>()
export function token(name: string, alpha = 1): string {
  const key = `${name}/${alpha}`
  let v = cache.get(key)
  if (!v) {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
    const cv = document.createElement('canvas')
    cv.width = cv.height = 1
    const ctx = cv.getContext('2d', { willReadFrequently: true })!
    ctx.fillStyle = raw
    ctx.fillRect(0, 0, 1, 1)
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
    v = `rgba(${r}, ${g}, ${b}, ${alpha})`
    cache.set(key, v)
  }
  return v
}

/** Shift to local wall-clock time, since the chart library renders UTC. */
const local = (t: number) => ((t - new Date(t).getTimezoneOffset() * 60_000) / 1000) as UTCTimestamp

function baseChart(el: HTMLElement): IChartApi {
  return createChart(el, {
    autoSize: true,
    layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: token('--text-3'), fontFamily: "'JetBrains Mono Variable', ui-monospace, monospace", fontSize: 11 },
    grid: { vertLines: { color: token('--line-soft', 0.55) }, horzLines: { color: token('--line-soft', 0.55) } },
    rightPriceScale: { borderVisible: false },
    timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false, rightOffset: 4 },
    crosshair: { mode: CrosshairMode.Normal, vertLine: { color: token('--text-3', 0.5), style: LineStyle.Dashed, labelBackgroundColor: token('--surface-2') }, horzLine: { color: token('--text-3', 0.5), style: LineStyle.Dashed, labelBackgroundColor: token('--surface-2') } },
    handleScale: { axisPressedMouseMove: { time: true, price: false } },
  })
}

export interface PriceLine {
  price: number
  label: string
  kind: 'entry' | 'stop' | 'target'
}

export function CandleChart({ candles, live, decimals, lines = [], height = 420 }: { candles: Candle[]; live?: Candle | null; decimals: number; lines?: PriceLine[]; height?: number }) {
  const el = useRef<HTMLDivElement>(null)
  const chart = useRef<IChartApi | null>(null)
  const series = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const drawn = useRef<ReturnType<ISeriesApi<'Candlestick'>['createPriceLine']>[]>([])

  useEffect(() => {
    if (!el.current) return
    const c = baseChart(el.current)
    const up = token('--up')
    const down = token('--down')
    series.current = c.addCandlestickSeries({ upColor: up, downColor: down, borderUpColor: up, borderDownColor: down, wickUpColor: up, wickDownColor: down })
    chart.current = c
    return () => {
      c.remove()
      chart.current = null
      series.current = null
      drawn.current = []
    }
  }, [])

  useEffect(() => {
    const s = series.current
    if (!s) return
    s.applyOptions({ priceFormat: { type: 'price', precision: decimals, minMove: 1 / 10 ** decimals } })
    s.setData(candles.map((b) => ({ time: local(b.t), open: b.o, high: b.h, low: b.l, close: b.c })))
    if (candles.length) chart.current?.timeScale().setVisibleLogicalRange({ from: Math.max(0, candles.length - 140), to: candles.length + 4 })
  }, [candles, decimals])

  useEffect(() => {
    const s = series.current
    const last = candles[candles.length - 1]
    if (!s || !live || !last || live.t < last.t) return
    s.update({ time: local(live.t), open: live.o, high: live.h, low: live.l, close: live.c })
  }, [live, candles])

  useEffect(() => {
    const s = series.current
    if (!s) return
    drawn.current.forEach((l) => s.removePriceLine(l))
    const color = { entry: token('--text-2'), stop: token('--down'), target: token('--up') }
    drawn.current = lines.map((l) => s.createPriceLine({ price: l.price, color: color[l.kind], lineWidth: 1, lineStyle: l.kind === 'entry' ? LineStyle.Solid : LineStyle.Dashed, axisLabelVisible: true, title: l.label }))
  }, [lines])

  return <div className="chart" style={{ height }} ref={el} role="img" aria-label="Price chart" />
}

export interface Line {
  name: string
  points: { t: number; v: number }[]
  kind: 'primary' | 'baseline'
}

export function LineChart({ lines, height = 300, money = true }: { lines: Line[]; height?: number; money?: boolean }) {
  const el = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!el.current) return
    const c = baseChart(el.current)
    for (const l of lines) {
      // Chart times must be strictly increasing: keep the last value for any repeated second.
      const data: { time: UTCTimestamp; value: number }[] = []
      for (const p of l.points) {
        const time = local(p.t)
        if (data.length && data[data.length - 1].time >= time) data[data.length - 1].value = p.v
        else data.push({ time, value: p.v })
      }
      const fmt = { priceFormat: { type: 'custom' as const, minMove: 0.01, formatter: (v: number) => (money ? `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : v.toFixed(2)) } }
      if (l.kind === 'primary') {
        c.addAreaSeries({ lineColor: token('--accent'), topColor: token('--accent', 0.22), bottomColor: token('--accent', 0), lineWidth: 2, title: l.name, ...fmt }).setData(data)
      } else {
        c.addLineSeries({ color: token('--text-3'), lineWidth: 1, lineStyle: LineStyle.Dashed, title: l.name, ...fmt }).setData(data)
      }
    }
    c.timeScale().fitContent()
    return () => c.remove()
  }, [lines, money])
  return <div className="chart" style={{ height }} ref={el} role="img" aria-label={lines.map((l) => l.name).join(' against ')} />
}
