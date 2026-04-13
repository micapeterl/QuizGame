'use client'
import { useEffect, useRef, useState } from 'react'
import type { Player } from '@/types'
import { getInitial } from '@/lib/colors'

// ── Large chip (mirrors active chip in TopBar) ────────────────────────────────
function LargeChip({ player }: { player: Player }) {
  const color = player.color
  return (
    <div
      className="flex items-center gap-3 rounded-xl px-4 py-3 border-2 flex-shrink-0"
      style={{
        borderColor: color,
        background: `${color}15`,
        boxShadow: `0 0 24px ${color}30`,
        width: '220px',
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

const CHIP_W   = 220
const SLIDE_MS = 500
const LINGER_MS = 1800
const FLY_MS   = 600

interface TurnTransitionProps {
  initiator:  Player
  next:       Player
  onComplete: () => void
}

export default function TurnTransition({ initiator, next, onComplete }: TurnTransitionProps) {
  // overlay + strip
  const [overlayOpacity, setOverlayOpacity] = useState(1)
  const [stripX, setStripX]                 = useState(0)

  // phase: slide → linger → fly → (onComplete)
  const [phase, setPhase] = useState<'slide' | 'linger' | 'fly'>('slide')

  // flying chip
  const [flyStyle, setFlyStyle]   = useState<React.CSSProperties>({})
  const [flyVisible, setFlyVisible] = useState(false)
  const [chipHidden, setChipHidden] = useState(false)   // hide centered chip once fly clone appears

  const centerRef = useRef<HTMLDivElement>(null)

  if (!next || !initiator) return null

  useEffect(() => {
    let cancelled = false

    async function run() {
      // ── Phase 1: brief hold then slide ───────────────────
      await delay(1000)
      if (cancelled) return
      setStripX(-CHIP_W)
      await delay(SLIDE_MS)
      if (cancelled) return

      // ── Phase 2: linger ───────────────────────────────────
      setPhase('linger')
      await delay(LINGER_MS)
      if (cancelled) return

      // ── Phase 3: fly to topbar ────────────────────────────
      setPhase('fly')

      // Find the topbar chip for the next player
      const targetEl = document.querySelector(`[data-playerid="${next.id}"]`)
      const chipEl   = centerRef.current
      if (!targetEl || !chipEl) { onComplete(); return }

      const fromRect   = chipEl.getBoundingClientRect()
      const targetRect = targetEl.getBoundingClientRect()

      // Place flying clone exactly on top of the centered chip
      setFlyStyle({
        position:        'fixed',
        left:            `${fromRect.left}px`,
        top:             `${fromRect.top}px`,
        width:           `${fromRect.width}px`,
        height:          `${fromRect.height}px`,
        transformOrigin: 'top left',
        transform:       'scale(1)',
        transition:      'none',
        zIndex:          60,
      })
      setFlyVisible(true)
      setChipHidden(true)   // hide the static centered chip so there's no double

      // One rAF to ensure the clone is painted before we start animating
      await raf()
      await raf()
      if (cancelled) return

      // Scale factor so chip shrinks to fit the target rect
      const scale = Math.min(
        targetRect.width  / fromRect.width,
        targetRect.height / fromRect.height,
      )

      setFlyStyle({
        position:        'fixed',
        left:            `${targetRect.left}px`,
        top:             `${targetRect.top}px`,
        width:           `${fromRect.width}px`,
        height:          `${fromRect.height}px`,
        transformOrigin: 'top left',
        transform:       `scale(${scale})`,
        transition:      `left ${FLY_MS}ms cubic-bezier(0.4,0,0.2,1),
                          top  ${FLY_MS}ms cubic-bezier(0.4,0,0.2,1),
                          transform ${FLY_MS}ms cubic-bezier(0.4,0,0.2,1)`,
        zIndex:          60,
      })

      // Fade overlay out at the same time
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
      {/* Dark overlay behind everything */}
      <div
        className="fixed inset-0 z-50 pointer-events-none"
        style={{
          background: 'rgba(0,0,0,0.78)',
          opacity:    overlayOpacity,
          transition: phase === 'fly' ? `opacity ${FLY_MS}ms ease` : 'none',
        }}
      />

      {/* Clipping window + sliding strip (slide & linger phases) */}
      {!flyVisible && (
        <div
          className="fixed z-[51] pointer-events-none"
          style={{
            left:      '50%',
            top:       '50%',
            transform: 'translate(-50%, -50%)',
            width:     `${CHIP_W}px`,
            overflow:  'hidden',
          }}
        >
          <div
            className="flex"
            style={{
              width:      `${CHIP_W * 2}px`,
              transform:  `translateX(${stripX}px)`,
              transition: phase === 'slide'
                ? `transform ${SLIDE_MS}ms cubic-bezier(0.4,0,0.2,1)`
                : 'none',
            }}
          >
            {/* Initiator — slides out left */}
            <div style={{ width: CHIP_W, flexShrink: 0 }}>
              <LargeChip player={initiator} />
            </div>
            {/* Next player — slides in from right */}
            <div
              ref={phase === 'slide' ? centerRef : undefined}
              style={{ width: CHIP_W, flexShrink: 0 }}
            >
              <LargeChip player={next} />
            </div>
          </div>
        </div>
      )}

      {/* Linger — chip statically centered so we can measure it for the fly */}
      {phase === 'linger' && !chipHidden && (
        <div
          ref={centerRef}
          className="fixed z-[51] pointer-events-none"
          style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
        >
          <LargeChip player={next} />
        </div>
      )}

      {/* Flying clone */}
      {flyVisible && (
        <div className="pointer-events-none" style={{ ...flyStyle, position: 'fixed' }}>
          <LargeChip player={next} />
        </div>
      )}
    </>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const delay = (ms: number) => new Promise<void>(res => setTimeout(res, ms))
const raf   = ()           => new Promise<void>(res => requestAnimationFrame(() => res()))