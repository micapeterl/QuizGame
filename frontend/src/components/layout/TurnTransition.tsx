'use client'
import { useEffect, useRef, useState } from 'react'
import type { Player } from '@/types'
import { getInitial } from '@/lib/colors'

// ── Chip at the "active turn" size — matches TopBar's large chip exactly ──────
function ActiveChip({ player }: { player: Player }) {
  const color = player.color
  return (
    <div
      className="flex items-center gap-3 rounded-xl px-4 py-3 border-2"
      style={{
        borderColor: color,
        background:  `${color}15`,
        boxShadow:   `0 0 24px ${color}30`,
        width:       '220px',
        flexShrink:  0,
      }}
    >
      <div
        className="w-[58px] h-[58px] rounded-full overflow-hidden flex-shrink-0
                   flex items-center justify-center text-[20px] font-black border-2"
        style={{ borderColor: color, background: '#1a1a1a', color: '#888' }}
      >
        {player.avatar
          ? <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />
          : getInitial(player.name)
        }
      </div>
      <div className="flex flex-col gap-0.5 leading-none min-w-0">
        <span className="text-[16px] font-bold text-tx-primary tracking-tight truncate">{player.name}</span>
        <span className="text-[22px] font-black leading-none" style={{ color }}>
          {player.points} <span className="text-[12px] font-semibold tracking-wide">PTS</span>
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color, opacity: 0.7 }}>
          Active Turn
        </span>
      </div>
    </div>
  )
}

// ── Timing ────────────────────────────────────────────────────────────────────
const CHIP_W     = 220   // DOM width of ActiveChip
const CHIP_H     = 90    // approximate DOM height
const BIG_SCALE  = 4     // 4× the active size = 16× default
const SLIDE_MS   = 500
const LINGER_MS  = 1800
const FLY_MS     = 650

interface Props { initiator: Player; next: Player; onComplete: () => void }

export default function TurnTransition({ initiator, next, onComplete }: Props) {
  // Which chip is showing in the center window
  const [showNext,        setShowNext]        = useState(false)
  // Slide offset for the two-chip row (in un-scaled px, moves by CHIP_W)
  const [slideOffset,     setSlideOffset]     = useState(0)
  // Flying chip state
  const [flyVisible,      setFlyVisible]      = useState(false)
  const [flyLeft,         setFlyLeft]         = useState(0)
  const [flyTop,          setFlyTop]          = useState(0)
  const [flyScale,        setFlyScale]        = useState(BIG_SCALE)
  const [flyTransition,   setFlyTransition]   = useState('none')
  // Overlay opacity
  const [overlayOpacity,  setOverlayOpacity]  = useState(1)
  // Hide static centered chip once fly clone is live
  const [centerHidden,    setCenterHidden]    = useState(false)

  // Ref on the centered window so we can measure its screen position
  const windowRef = useRef<HTMLDivElement>(null)

  if (!initiator || !next) return null

  // Visual dimensions of one chip at BIG_SCALE
  const visW = CHIP_W * BIG_SCALE  // 880
  const visH = CHIP_H * BIG_SCALE  // 360

  useEffect(() => {
    let cancelled = false

    async function run() {
      // ── 1. Hold on initiator ───────────────────────────────
      await delay(1000)
      if (cancelled) return

      // ── 2. Slide to next player ────────────────────────────
      // Move the unscaled row left by CHIP_W so next chip is centered
      setSlideOffset(-CHIP_W)
      await delay(SLIDE_MS)
      if (cancelled) return
      setShowNext(true)

      // ── 3. Linger on next player ───────────────────────────
      await delay(LINGER_MS)
      if (cancelled) return

      // ── 4. Fly to topbar ───────────────────────────────────
      const winEl    = windowRef.current
      const targetEl = document.querySelector(`[data-playerid="${next.id}"]`)
      if (!winEl || !targetEl) { onComplete(); return }

      const winRect    = winEl.getBoundingClientRect()
      const targetRect = targetEl.getBoundingClientRect()

      // The clone is the chip at native size (CHIP_W × CHIP_H), scaled up.
      // Start: scaled to BIG_SCALE, positioned so top-left aligns with window top-left.
      // End:   scaled so it matches the topbar active chip size (targetRect),
      //        positioned at targetRect top-left.
      // Since transformOrigin is 'top left', position = where top-left corner goes.
      const endScale = targetRect.width / CHIP_W

      setFlyLeft(winRect.left)
      setFlyTop(winRect.top)
      setFlyScale(BIG_SCALE)
      setFlyTransition('none')
      setFlyVisible(true)
      setCenterHidden(true)

      await raf(); await raf()
      if (cancelled) return

      setFlyLeft(targetRect.left)
      setFlyTop(targetRect.top)
      setFlyScale(endScale)
      setFlyTransition(
        `left ${FLY_MS}ms cubic-bezier(0.4,0,0.2,1),
         top  ${FLY_MS}ms cubic-bezier(0.4,0,0.2,1),
         transform ${FLY_MS}ms cubic-bezier(0.4,0,0.2,1)`
      )
      setOverlayOpacity(0)

      await delay(FLY_MS + 100)
      if (cancelled) return
      onComplete()
    }

    run()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      {/* Dark overlay */}
      <div
        className="fixed inset-0 z-50 pointer-events-none"
        style={{
          background: 'rgba(0,0,0,0.80)',
          opacity:    overlayOpacity,
          transition: flyVisible ? `opacity ${FLY_MS}ms ease` : 'none',
        }}
      />

      {/* Centered clipping window — exactly one chip wide/tall at BIG_SCALE */}
      {!centerHidden && (
        <div
          ref={windowRef}
          className="fixed z-[51] pointer-events-none overflow-hidden"
          style={{
            width:     `${visW}px`,
            height:    `${visH}px`,
            left:      '50%',
            top:       '50%',
            marginLeft: `-${visW / 2}px`,
            marginTop:  `-${visH / 2}px`,
          }}
        >
          {/*
            Two chips side by side at native size, then scale the whole row up.
            translateX moves by CHIP_W (native) which becomes CHIP_W*SCALE visually.
          */}
          <div
            style={{
              display:         'flex',
              width:           `${CHIP_W * 2}px`,
              transform:       `scale(${BIG_SCALE}) translateX(${slideOffset}px)`,
              transformOrigin: 'top left',
              transition:      slideOffset !== 0
                ? `transform ${SLIDE_MS}ms cubic-bezier(0.4,0,0.2,1)`
                : 'none',
            }}
          >
            <ActiveChip player={initiator} />
            <ActiveChip player={next} />
          </div>
        </div>
      )}

      {/* Flying clone — native chip scaled up, flies and shrinks to topbar */}
      {flyVisible && (
        <div
          className="pointer-events-none z-[61]"
          style={{
            position:        'fixed',
            left:             flyLeft,
            top:              flyTop,
            width:            CHIP_W,
            height:           CHIP_H,
            transform:       `scale(${flyScale})`,
            transformOrigin: 'top left',
            transition:       flyTransition,
          }}
        >
          <ActiveChip player={next} />
        </div>
      )}
    </>
  )
}

const delay = (ms: number) => new Promise<void>(res => setTimeout(res, ms))
const raf   = ()           => new Promise<void>(res => requestAnimationFrame(() => res()))