'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Settings, ArrowLeft } from 'lucide-react'
import type { JeopardyCell, DoubleSettings, Player } from '@/types'
import Modal from '@/components/ui/Modal'
import ImageUpload from '@/components/ui/ImageUpload'
import { FormField, inputClass } from '@/components/ui/FormField'
import * as api from '@/lib/api'

interface QuestionScreenProps {
  col: number
  row: number
  cell: JeopardyCell
  basePts: number
  mode: 'question' | 'answer'
  isDouble: boolean
  doubleSettings: DoubleSettings
  activePlayer: Player | null
  halfPoints: boolean        // true when active player has cycled back to initiator
  initiatorId: string | null
  onBack: () => void
  onReveal: () => void
  onAward: () => void
  onRefresh: () => void
}

export default function QuestionScreen({
  col, row, cell, basePts, mode,
  isDouble, doubleSettings,
  activePlayer, halfPoints, initiatorId,
  onBack, onReveal, onAward, onRefresh
}: QuestionScreenProps) {
  const [editOpen, setEditOpen]       = useState(false)
  const [editText, setEditText]       = useState('')
  const [editImage, setEditImage]     = useState<string | null>(null)
  const [editTimerOverride, setEditTimerOverride] = useState<string>('')
  const [saving, setSaving]           = useState(false)
  const [awardWarn, setAwardWarn] = useState(false)

  // Double popup state — only fires on question mode
  const [popupVisible, setPopupVisible]   = useState(false)
  const [popupOpacity, setPopupOpacity]   = useState(1)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const basePtsCalc = basePts * (row + 1) * (isDouble ? 2 : 1)
  const pts = halfPoints ? Math.floor(basePtsCalc / 2) : basePtsCalc
  const data = mode === 'question' ? cell.question : cell.answer
  const hasContent = data.text || data.image

  // ── Auto-scale text to fit container ───────────────────
  const containerRef = useRef<HTMLDivElement>(null)
  const textRef      = useRef<HTMLParagraphElement>(null)

  const scaleText = useCallback(() => {
    const container = containerRef.current
    const textEl    = textRef.current
    if (!container || !textEl) return

    const maxSize = data.image ? 32 : 56
    const minSize = 12

    // Available space = container minus its own padding
    const style     = window.getComputedStyle(container)
    const padTop    = parseFloat(style.paddingTop)
    const padBottom = parseFloat(style.paddingBottom)
    const padLeft   = parseFloat(style.paddingLeft)
    const padRight  = parseFloat(style.paddingRight)
    const availH    = container.clientHeight - padTop - padBottom
    const availW    = container.clientWidth  - padLeft - padRight

    // Binary search for the largest font size that fits
    let lo = minSize, hi = maxSize
    textEl.style.fontSize = `${hi}px`

    while (lo < hi) {
      const mid = Math.floor((lo + hi + 1) / 2)
      textEl.style.fontSize = `${mid}px`
      if (textEl.scrollHeight <= availH && textEl.scrollWidth <= availW) {
        lo = mid
      } else {
        hi = mid - 1
      }
    }

    textEl.style.fontSize = `${lo}px`
  }, [data.image, data.text])

  useEffect(() => {
    scaleText()
    // Re-run on window resize
    window.addEventListener('resize', scaleText)
    return () => window.removeEventListener('resize', scaleText)
  }, [scaleText])

  // ── Double popup: fires once on mount if this is a double question ────────
  useEffect(() => {
    if (!isDouble || mode !== 'question') return

    setPopupVisible(true)
    setPopupOpacity(1)

    // Play audio if set
    if (doubleSettings.audio) {
      const audio = new Audio(doubleSettings.audio)
      audioRef.current = audio
      audio.play().catch(() => {})
    }

    // Fade starts at 4s, fully hidden at 5.5s
    const fadeTimer = setTimeout(() => setPopupOpacity(0), 4000)
    const hideTimer = setTimeout(() => {
      setPopupVisible(false)
      audioRef.current?.pause()
    }, 5500)

    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(hideTimer)
      audioRef.current?.pause()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function openEdit() {
    setEditText(data.text)
    setEditImage(data.image)
    const to = cell.timerOverride
    setEditTimerOverride(to !== null && to !== undefined ? String(to) : '')
    setEditOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const to = editTimerOverride.trim() === '' ? undefined
               : editTimerOverride.trim() === '0' ? 0
               : Math.max(0, parseInt(editTimerOverride) || 0)
      await api.updateCell(col, row, mode, editText.trim(), editImage, to === undefined ? undefined : to)
      onRefresh()
      setEditOpen(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleAward() {
    if (!activePlayer) {
      setAwardWarn(true)
      setTimeout(() => setAwardWarn(false), 1800)
      return
    }
    await api.awardPoints(activePlayer.id, pts)
    await api.markAnswered(col, row, true)
    await api.advanceTurn()
    onRefresh()
    onAward()
  }

  async function handleBackFromAnswer() {
    await api.markAnswered(col, row, true)
    onRefresh()
    onBack()
  }

  return (
    <div
      className="relative h-full flex flex-col"
      style={{ background: mode === 'answer' ? '#0a0c10' : '#0d0d0d' }}
    >
      {/* ── Double Points Popup ── */}
      {popupVisible && (
        <div
          className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-6
                     bg-black/90"
          style={{ opacity: popupOpacity, transition: 'opacity 1.5s ease' }}
        >
          {doubleSettings.image && (
            <img
              src={doubleSettings.image}
              alt=""
              className="max-h-[45vh] max-w-[80%] object-contain rounded-xl"
            />
          )}
          <p
            className="font-black text-center tracking-wide px-8"
            style={{
              fontSize: 'clamp(32px, 7vw, 96px)',
              color: '#f5a623',
              textShadow: '0 0 40px rgba(245,166,35,0.6), 0 0 80px rgba(245,166,35,0.3)',
            }}
          >
            {doubleSettings.text || 'DOUBLE POINTS!'}
          </p>
        </div>
      )}

      {/* ── Double Points banner (stays after popup fades) ── */}
      {isDouble && !popupVisible && mode === 'question' && (
        <div className="flex-shrink-0 flex items-center justify-center gap-2 py-2
                        border-b border-accent/30 bg-accent/8">
          <span className="text-[11px] font-black uppercase tracking-widest text-accent">
            ⚡ {doubleSettings.text || 'DOUBLE POINTS!'} ⚡
          </span>
        </div>
      )}

      {/* ── Half points banner — shown when active player is back to initiator ── */}
      {halfPoints && (
        <div className="flex-shrink-0 flex items-center justify-center gap-2 py-2
                        border-b border-red-500/30 bg-red-500/8">
          <span className="text-[11px] font-black uppercase tracking-widest text-red-400">
            ½ Points — Second question round
          </span>
        </div>
      )}

      {/* Gear icon top-right */}
      <button
        onClick={openEdit}
        className="absolute top-3 right-3 z-10 flex items-center justify-center
                   w-9 h-9 bg-bg-panel border border-border hover:border-border-focus
                   text-tx-secondary hover:text-tx-primary rounded transition-all"
      >
        <Settings size={15} />
      </button>

      {/* Content — fills all space between topbar and bottom buttons */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 flex flex-col items-center justify-center gap-4
                   px-16 pt-12 pb-20 w-full overflow-hidden"
      >
        {hasContent ? (
          <>
            {data.image && (
              <div className={`min-h-0 w-full flex items-center justify-center
                              ${data.text ? 'flex-1' : 'flex-[2]'}`}>
                <img
                  src={data.image}
                  alt=""
                  className="max-h-full max-w-full w-auto h-auto object-contain rounded-lg border border-border"
                  style={{ maxHeight: data.text ? '50vh' : '75vh' }}
                />
              </div>
            )}
            {data.text && (
              <div
                className={`min-h-0 w-full flex items-center justify-center
                            ${data.image ? 'flex-shrink-0' : 'flex-1 overflow-hidden'}`}
              >
                <p
                  ref={textRef}
                  className="text-center font-bold leading-tight tracking-tight break-words
                             max-w-[860px] w-full"
                  style={{
                    color: mode === 'answer' ? '#f5a623' : '#e8e8e8',
                    fontSize: data.image ? 'clamp(14px, 2.2vw, 32px)' : '56px',
                  }}
                >
                  {data.text}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 opacity-30">
            <span className="text-[36px]">✏️</span>
            <p className="text-[14px] text-tx-secondary">
              Nothing here — click ⚙ to add content
            </p>
          </div>
        )}
      </div>

      {/* Bottom-left: back to board */}
      <button
        onClick={mode === 'question' ? onBack : handleBackFromAnswer}
        className="absolute bottom-4 left-4 flex items-center gap-1.5 text-[13px] font-medium
                   text-tx-secondary hover:text-tx-primary border border-border
                   hover:border-border-focus bg-bg-panel rounded px-4 py-2 transition-all"
      >
        <ArrowLeft size={13} /> Board
      </button>

      {/* Bottom-right: reveal / award */}
      {mode === 'question' ? (
        <button
          onClick={onReveal}
          className="absolute bottom-4 right-4 text-[13px] font-semibold
                     bg-accent hover:bg-accent-hover text-tx-accent rounded px-5 py-2 transition-colors"
        >
          Reveal Answer →
        </button>
      ) : (
        <button
          onClick={handleAward}
          className={`absolute bottom-4 right-4 text-[13px] font-semibold rounded px-5 py-2 transition-all
            ${awardWarn
              ? 'bg-red-700 text-white animate-pulse'
              : 'bg-[#3d9e62] hover:bg-[#4aaf70] text-white'
            }`}
        >
          {awardWarn
            ? '⚠ No active player!'
            : `✓ Award ${pts} pts${activePlayer ? ` to ${activePlayer.name}` : ''}`
          }
        </button>
      )}

      {/* Edit modal */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={mode === 'question' ? 'Edit Question' : 'Edit Answer'}
        wide
      >
        <ImageUpload
          label="Image (optional — appears above text)"
          value={editImage}
          onChange={setEditImage}
        />
        <FormField label="Text">
          <textarea
            className={`${inputClass} resize-y min-h-[80px]`}
            placeholder="Enter text..."
            value={editText}
            onChange={e => setEditText(e.target.value)}
            autoFocus
          />
        </FormField>
        {/* Timer override — only shown on question side */}
        {mode === 'question' && (
          <div className="border-t border-border-subtle pt-3 flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-tx-secondary uppercase tracking-wide">⏱ Timer Override (seconds)</label>
            <p className="text-[11px] text-tx-dim">Leave blank to use category/board setting. Enter 0 to disable timer for this question only.</p>
            <input
              className={inputClass}
              type="number"
              min={0}
              step={5}
              placeholder="Inherit from category / board"
              value={editTimerOverride}
              onChange={e => setEditTimerOverride(e.target.value)}
            />
          </div>
        )}

        <div className="flex gap-2 justify-end pt-1.5 border-t border-border-subtle mt-1">
          <button onClick={() => setEditOpen(false)}
            className="px-4 py-2 text-[13px] font-medium text-tx-secondary border border-border
                       hover:border-border-focus hover:text-tx-primary rounded transition-all">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 text-[13px] font-semibold bg-accent hover:bg-accent-hover
                       text-tx-accent rounded transition-colors disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </Modal>
    </div>
  )
}