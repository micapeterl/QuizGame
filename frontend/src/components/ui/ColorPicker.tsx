'use client'
import { useCallback, useEffect, useRef, useState } from 'react'

// ── HSV ↔ RGB/HEX helpers ────────────────────────────────────────────────────
function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const f = (n: number) => {
    const k = (n + h / 60) % 6
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1))
  }
  return [Math.round(f(5) * 255), Math.round(f(3) * 255), Math.round(f(1) * 255)]
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  const full  = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean.padEnd(6, '0')
  const n = parseInt(full, 16) || 0
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
  let h = 0
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h = Math.round(h * 60)
    if (h < 0) h += 360
  }
  return [h, max === 0 ? 0 : d / max, max]
}

function hexIsValid(hex: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(hex)
}

// ── Component ─────────────────────────────────────────────────────────────────
interface ColorPickerProps {
  value: string       // hex color
  onChange: (hex: string) => void
}

export default function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [rgb]   = [hexToRgb(hexIsValid(value) ? value : '#f5a623')]
  const initHsv = rgbToHsv(...rgb)

  const [hue, setHue]     = useState(initHsv[0])
  const [sat, setSat]     = useState(initHsv[1])
  const [val, setVal]     = useState(initHsv[2])
  const [hexInput, setHexInput] = useState(value)

  const gradientRef = useRef<HTMLDivElement>(null)
  const hueRef      = useRef<HTMLDivElement>(null)
  const draggingGradient = useRef(false)
  const draggingHue      = useRef(false)

  // Sync hex input whenever hsv changes
  useEffect(() => {
    const hex = rgbToHex(...hsvToRgb(hue, sat, val))
    setHexInput(hex)
    onChange(hex)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hue, sat, val])

  // ── Gradient drag ──────────────────────────────────
  const handleGradientPointer = useCallback((e: PointerEvent | React.PointerEvent) => {
    const el = gradientRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top)  / rect.height))
    setSat(x)
    setVal(1 - y)
  }, [])

  useEffect(() => {
    const move = (e: PointerEvent) => { if (draggingGradient.current) handleGradientPointer(e) }
    const up   = () => { draggingGradient.current = false }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
  }, [handleGradientPointer])

  // ── Hue drag ───────────────────────────────────────
  const handleHuePointer = useCallback((e: PointerEvent | React.PointerEvent) => {
    const el = hueRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    setHue(Math.round(x * 360))
  }, [])

  useEffect(() => {
    const move = (e: PointerEvent) => { if (draggingHue.current) handleHuePointer(e) }
    const up   = () => { draggingHue.current = false }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
  }, [handleHuePointer])

  // ── Hex input ──────────────────────────────────────
  function handleHexInput(raw: string) {
    const v = raw.startsWith('#') ? raw : '#' + raw
    setHexInput(v)
    if (hexIsValid(v)) {
      const [r2, g2, b2] = hexToRgb(v)
      const [h2, s2, v2] = rgbToHsv(r2, g2, b2)
      setHue(h2); setSat(s2); setVal(v2)
    }
  }

  const hueColor  = rgbToHex(...hsvToRgb(hue, 1, 1))
  const thumbLeft = `${sat * 100}%`
  const thumbTop  = `${(1 - val) * 100}%`

  return (
    <div className="flex flex-col gap-3 w-full select-none">
      {/* ── Gradient box ── */}
      <div
        ref={gradientRef}
        className="relative w-full rounded-lg overflow-hidden cursor-crosshair"
        style={{ height: '160px' }}
        onPointerDown={e => {
          draggingGradient.current = true
          handleGradientPointer(e)
          e.currentTarget.setPointerCapture(e.pointerId)
        }}
      >
        {/* Base hue */}
        <div className="absolute inset-0" style={{ background: hueColor }} />
        {/* White overlay (saturation) */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, #fff 0%, transparent 100%)' }} />
        {/* Black overlay (value) */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 0%, #000 100%)' }} />
        {/* Thumb */}
        <div
          className="absolute w-4 h-4 rounded-full border-2 border-white -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{
            left: thumbLeft,
            top:  thumbTop,
            boxShadow: '0 0 0 1.5px rgba(0,0,0,0.4), 0 2px 6px rgba(0,0,0,0.5)',
          }}
        />
      </div>

      {/* ── Hue slider ── */}
      <div
        ref={hueRef}
        className="relative w-full rounded-full cursor-pointer"
        style={{
          height: '14px',
          background: 'linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)',
        }}
        onPointerDown={e => {
          draggingHue.current = true
          handleHuePointer(e)
          e.currentTarget.setPointerCapture(e.pointerId)
        }}
      >
        {/* Hue thumb */}
        <div
          className="absolute top-1/2 w-4 h-4 rounded-full border-2 border-white -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{
            left: `${(hue / 360) * 100}%`,
            background: hueColor,
            boxShadow: '0 0 0 1.5px rgba(0,0,0,0.4), 0 2px 6px rgba(0,0,0,0.4)',
          }}
        />
      </div>

      {/* ── Hex input + swatch ── */}
      <div className="flex items-center gap-2">
        {/* Color swatch */}
        <div
          className="w-8 h-8 rounded flex-shrink-0 border border-border"
          style={{ background: hexIsValid(hexInput) ? hexInput : '#1a1a1a' }}
        />
        {/* Hex text input */}
        <div className="flex-1 flex items-center bg-bg-input border border-border rounded px-3 py-1.5 gap-1.5">
          <span className="text-[12px] text-tx-dim font-mono">#</span>
          <input
            className="flex-1 bg-transparent text-tx-primary text-[13px] font-mono
                       focus:outline-none min-w-0"
            value={hexInput.replace('#', '')}
            onChange={e => handleHexInput(e.target.value)}
            maxLength={7}
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  )
}