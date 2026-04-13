'use client'
import { useEffect, useRef, useState, useCallback } from 'react'

type TimerState = 'idle' | 'running' | 'paused'

interface TimerButtonProps {
  totalSeconds: number
  autoStart?: boolean
  onExpire: () => void
}

export default function TimerButton({ totalSeconds, autoStart = false, onExpire }: TimerButtonProps) {
  const [timerState, setTimerState] = useState<TimerState>(autoStart ? 'running' : 'idle')
  const [remaining, setRemaining]   = useState(totalSeconds)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const expiredRef  = useRef(false)

  // Reset completely when totalSeconds changes (e.g. new question opened)
  useEffect(() => {
    clearInterval(intervalRef.current!)
    expiredRef.current = false
    if (autoStart) {
      setTimerState('running')
      setRemaining(totalSeconds)
    } else {
      setTimerState('idle')
      setRemaining(totalSeconds)
    }
  }, [totalSeconds])

  // Start counting immediately if autoStart
  useEffect(() => {
    if (autoStart) startCounting()
    return () => clearInterval(intervalRef.current!)
  }, [])

  const startCounting = useCallback(() => {
    clearInterval(intervalRef.current!)
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!)
          if (!expiredRef.current) {
            expiredRef.current = true
            // Slight delay so the 0 renders before navigating
            setTimeout(() => onExpire(), 200)
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [onExpire])

  function handleClick() {
    if (timerState === 'idle') {
      // Start
      expiredRef.current = false
      setTimerState('running')
      startCounting()
    } else if (timerState === 'running') {
      // Pause
      clearInterval(intervalRef.current!)
      setTimerState('paused')
    } else {
      // Resume
      setTimerState('running')
      startCounting()
    }
  }

  // ── Color interpolation ───────────────────────────────────────────────────
  // 0 = start (white), 1 = end (red)
  const progress = timerState === 'idle' ? 0 : 1 - remaining / totalSeconds
  // White → red: rgb(255,255,255) → rgb(220,50,50)
  const r = 255
  const g = Math.round(255 - progress * 205)   // 255 → 50
  const b = Math.round(255 - progress * 205)   // 255 → 50
  const activeColor = timerState === 'paused' ? '#f5c842' : `rgb(${r},${g},${b})`

  const label = timerState === 'idle' ? `${totalSeconds}s` : `${remaining}s`

  return (
    <button
      onClick={handleClick}
      className="flex-shrink-0 flex items-center justify-center rounded px-3 py-1.5
                 transition-colors text-[13px] font-black tracking-wide select-none"
      style={{
        minWidth:  '52px',
        border:    `2px solid ${timerState === 'idle' ? '#444' : activeColor}`,
        color:     timerState === 'idle' ? '#888' : activeColor,
        background: timerState === 'idle' ? '#1a1a1a' : `${activeColor}12`,
        animation: timerState === 'paused' ? 'timerFlash 0.6s ease-in-out infinite' : 'none',
      }}
      title={
        timerState === 'idle'   ? 'Click to start turn timer' :
        timerState === 'running' ? 'Click to pause timer' :
        'Click to resume timer'
      }
    >
      {label}

      <style>{`
        @keyframes timerFlash {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.35; }
        }
      `}</style>
    </button>
  )
}