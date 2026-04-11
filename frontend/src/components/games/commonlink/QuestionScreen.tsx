'use client'
import { useState } from 'react'
import { ArrowLeft, Settings } from 'lucide-react'
import type { CLQuestion, CLSlot, CLVariant, Player } from '@/types'
import Modal from '@/components/ui/Modal'
import ImageUpload from '@/components/ui/ImageUpload'
import { FormField, inputClass } from '@/components/ui/FormField'
import * as api from '@/lib/api'

const VARIANT_LABELS: Record<CLVariant, string> = {
  common_link: 'Common Link',
  odd_one_out:  'Odd One Out',
  sequence:     'Finish the Sequence',
}

const VARIANT_COLORS: Record<CLVariant, string> = {
  common_link: '#6c8ef5',
  odd_one_out:  '#e05d5d',
  sequence:     '#4caf7d',
}

// ── One of the four display slots ────────────────────────────────────────────
function SlotCard({
  slot, index, variant, revealed,
  isAnswer, isHidden,
  editMode, onEditSlot,
  answerIndex, hiddenIndex,
  onSetAnswer, onSetHidden,
}: {
  slot: CLSlot
  index: number
  variant: CLVariant
  revealed: boolean
  isAnswer: boolean
  isHidden: boolean
  editMode: boolean
  onEditSlot: (i: number, field: 'text' | 'image', val: string | null) => void
  answerIndex: number | null
  hiddenIndex: number | null
  onSetAnswer: (i: number) => void
  onSetHidden: (i: number) => void
}) {
  const isEmpty = !slot.text && !slot.image

  // Visual state after reveal
  let cardStyle: React.CSSProperties = {}
  let borderClass = 'border-border-subtle'

  if (revealed) {
    if (variant === 'odd_one_out') {
      if (isAnswer) {
        borderClass = 'border-2'
        cardStyle = { borderColor: VARIANT_COLORS.odd_one_out, boxShadow: `0 0 20px ${VARIANT_COLORS.odd_one_out}40` }
      } else {
        cardStyle = { opacity: 0.35 }
      }
    } else if (variant === 'sequence' && isHidden) {
      borderClass = 'border-2'
      cardStyle = { borderColor: VARIANT_COLORS.sequence, boxShadow: `0 0 20px ${VARIANT_COLORS.sequence}40` }
    }
  }

  // For sequence: hide the designated slot until revealed
  const showContent = !(variant === 'sequence' && isHidden && !revealed)

  return (
    <div
      className={`relative flex flex-col items-center justify-center bg-bg-panel
                  border ${borderClass} rounded-xl p-4 flex-1 min-h-[200px]
                  transition-all duration-300 overflow-hidden`}
      style={cardStyle}
    >
      {/* Edit mode: designate answer/hidden slot */}
      {editMode && (
        <div className="absolute top-2 right-2 flex gap-1 z-10">
          {variant === 'odd_one_out' && (
            <button
              onClick={() => onSetAnswer(index)}
              className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-all
                ${answerIndex === index
                  ? 'bg-red-500/20 border-red-500/60 text-red-400'
                  : 'bg-bg-card border-border text-tx-dim hover:text-red-400 hover:border-red-500/40'}`}
            >
              {answerIndex === index ? '✓ Answer' : 'Set Answer'}
            </button>
          )}
          {variant === 'sequence' && (
            <button
              onClick={() => onSetHidden(index)}
              className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-all
                ${hiddenIndex === index
                  ? 'bg-green-500/20 border-green-500/60 text-green-400'
                  : 'bg-bg-card border-border text-tx-dim hover:text-green-400 hover:border-green-500/40'}`}
            >
              {hiddenIndex === index ? '✓ Hidden' : 'Set Hidden'}
            </button>
          )}
        </div>
      )}

      {/* Sequence hidden placeholder */}
      {variant === 'sequence' && isHidden && !revealed && (
        <div className="flex flex-col items-center gap-2 opacity-40">
          <span className="text-[32px]">?</span>
          <span className="text-[12px] text-tx-dim">Hidden</span>
        </div>
      )}

      {/* Actual content */}
      {showContent && (
        <>
          {slot.image && (
            <img src={slot.image} alt=""
              className="max-h-[140px] max-w-full object-contain rounded-lg mb-2" />
          )}
          {slot.text && (
            <p className={`text-center font-semibold leading-snug break-words
                          ${slot.image ? 'text-[13px] text-tx-secondary' : 'text-[clamp(14px,2vw,22px)] text-tx-primary'}`}>
              {slot.text}
            </p>
          )}
          {isEmpty && !editMode && (
            <span className="text-[12px] text-tx-dim opacity-40">Empty</span>
          )}
        </>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
interface CLQuestionScreenProps {
  catIndex: number
  qIndex: number
  question: CLQuestion
  variant: CLVariant
  points: number
  activePlayer: Player | null
  onBack: () => void
  onAward: () => void
  onRefresh: () => void
}

export default function CLQuestionScreen({
  catIndex, qIndex, question, variant, points,
  activePlayer, onBack, onAward, onRefresh,
}: CLQuestionScreenProps) {
  const [revealed, setRevealed] = useState(false)
  const [awardWarn, setAwardWarn] = useState(false)

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false)
  const [draftSlots, setDraftSlots] = useState<CLSlot[]>(question.slots.map(s => ({ ...s })))
  const [draftAnswerText, setDraftAnswerText] = useState(question.answerText)
  const [draftAnswerIndex, setDraftAnswerIndex] = useState<number | null>(question.answerIndex)
  const [draftHiddenIndex, setDraftHiddenIndex] = useState<number | null>(question.hiddenIndex)
  const [saving, setSaving] = useState(false)

  const color = VARIANT_COLORS[variant]

  function openEdit() {
    setDraftSlots(question.slots.map(s => ({ ...s })))
    setDraftAnswerText(question.answerText)
    setDraftAnswerIndex(question.answerIndex)
    setDraftHiddenIndex(question.hiddenIndex)
    setEditOpen(true)
  }

  function updateDraftSlot(i: number, field: 'text' | 'image', val: string | null) {
    setDraftSlots(prev => prev.map((s, idx) =>
      idx === i ? { ...s, [field]: field === 'text' ? (val ?? '') : val } : s
    ))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await api.updateCLQuestion(
        catIndex, qIndex,
        draftSlots,
        draftAnswerText,
        draftAnswerIndex,
        draftHiddenIndex,
      )
      onRefresh()
      setEditOpen(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleReveal() {
    setRevealed(true)
  }

  async function handleAward() {
    if (!activePlayer) {
      setAwardWarn(true)
      setTimeout(() => setAwardWarn(false), 1800)
      return
    }
    await api.awardPoints(activePlayer.id, points)
    await api.markCLAnswered(catIndex, qIndex, true)
    await api.advanceTurn()
    onRefresh()
    onAward()
  }

  async function handleBackNoAward() {
    await api.markCLAnswered(catIndex, qIndex, true)
    onRefresh()
    onBack()
  }

  const slots = question.slots

  return (
    <div className="relative h-full flex flex-col" style={{ background: '#0d0d0d' }}>

      {/* Gear */}
      <button onClick={openEdit}
        className="absolute top-3 right-3 z-10 w-9 h-9 flex items-center justify-center
                   bg-bg-panel border border-border hover:border-border-focus
                   text-tx-secondary hover:text-tx-primary rounded transition-all">
        <Settings size={15} />
      </button>

      {/* Variant label */}
      <div className="flex-shrink-0 flex items-center justify-center pt-5 pb-2">
        <span className="text-[12px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border"
          style={{ color, borderColor: color + '50', background: color + '12' }}>
          {VARIANT_LABELS[variant]}
        </span>
      </div>

      {/* Four slots */}
      <div className="flex-1 flex items-center justify-center px-8 py-4 gap-4 min-h-0">
        {slots.map((slot, i) => (
          <SlotCard
            key={i}
            slot={slot}
            index={i}
            variant={variant}
            revealed={revealed}
            isAnswer={question.answerIndex === i}
            isHidden={question.hiddenIndex === i}
            editMode={false}
            onEditSlot={updateDraftSlot}
            answerIndex={question.answerIndex}
            hiddenIndex={question.hiddenIndex}
            onSetAnswer={() => {}}
            onSetHidden={() => {}}
          />
        ))}
      </div>

      {/* Common Link answer — shown after reveal */}
      {variant === 'common_link' && revealed && question.answerText && (
        <div className="flex-shrink-0 flex items-center justify-center pb-4">
          <div className="px-8 py-3 bg-bg-panel border-2 rounded-xl text-center max-w-[600px]"
            style={{ borderColor: color, boxShadow: `0 0 24px ${color}30` }}>
            <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color }}>
              The Common Link
            </p>
            <p className="text-[clamp(18px,3vw,32px)] font-bold text-tx-primary">{question.answerText}</p>
          </div>
        </div>
      )}

      {/* Bottom left: back */}
      <button onClick={revealed ? handleBackNoAward : onBack}
        className="absolute bottom-4 left-4 flex items-center gap-1.5 text-[13px] font-medium
                   text-tx-secondary hover:text-tx-primary border border-border
                   hover:border-border-focus bg-bg-panel rounded px-4 py-2 transition-all">
        <ArrowLeft size={13} /> Board
      </button>

      {/* Bottom right: reveal or award */}
      {!revealed ? (
        <button onClick={handleReveal}
          className="absolute bottom-4 right-4 text-[13px] font-semibold rounded px-5 py-2 transition-colors"
          style={{ background: color, color: '#fff' }}>
          Reveal Answer →
        </button>
      ) : (
        <button onClick={handleAward}
          className={`absolute bottom-4 right-4 text-[13px] font-semibold rounded px-5 py-2 transition-all
            ${awardWarn ? 'bg-red-700 text-white animate-pulse' : 'bg-[#3d9e62] hover:bg-[#4aaf70] text-white'}`}>
          {awardWarn
            ? '⚠ No active player!'
            : `✓ Award ${points} pts${activePlayer ? ` to ${activePlayer.name}` : ''}`
          }
        </button>
      )}

      {/* ── Edit modal ── */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Question" wide>
        <p className="text-[12px] text-tx-dim -mt-2">
          Variant: <span className="text-tx-secondary font-medium">{VARIANT_LABELS[variant]}</span>
        </p>

        {/* Four slot editors */}
        <div className="flex flex-col gap-4">
          {draftSlots.map((slot, i) => (
            <div key={i} className="flex flex-col gap-2 p-3 bg-bg-card border border-border rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-tx-secondary">Slot {i + 1}</span>
                <div className="flex gap-1.5">
                  {variant === 'odd_one_out' && (
                    <button
                      onClick={() => setDraftAnswerIndex(draftAnswerIndex === i ? null : i)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-all
                        ${draftAnswerIndex === i
                          ? 'bg-red-500/20 border-red-500/60 text-red-400'
                          : 'bg-bg-input border-border text-tx-dim hover:border-red-500/40 hover:text-red-400'}`}
                    >
                      {draftAnswerIndex === i ? '✓ This is the Answer' : 'Mark as Answer'}
                    </button>
                  )}
                  {variant === 'sequence' && (
                    <button
                      onClick={() => setDraftHiddenIndex(draftHiddenIndex === i ? null : i)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-all
                        ${draftHiddenIndex === i
                          ? 'bg-green-500/20 border-green-500/60 text-green-400'
                          : 'bg-bg-input border-border text-tx-dim hover:border-green-500/40 hover:text-green-400'}`}
                    >
                      {draftHiddenIndex === i ? '✓ This is Hidden' : 'Mark as Hidden'}
                    </button>
                  )}
                </div>
              </div>
              <ImageUpload
                label="Image (optional)"
                value={slot.image}
                onChange={v => updateDraftSlot(i, 'image', v)}
              />
              <FormField label="Text (optional caption / prompt)">
                <input className={inputClass} value={slot.text} placeholder="Text..."
                  onChange={e => updateDraftSlot(i, 'text', e.target.value)} />
              </FormField>
            </div>
          ))}
        </div>

        {/* Common link answer text */}
        {variant === 'common_link' && (
          <FormField label="Answer — The Common Link">
            <input className={inputClass} value={draftAnswerText}
              placeholder="What connects the four items..."
              onChange={e => setDraftAnswerText(e.target.value)} />
          </FormField>
        )}

        {variant === 'odd_one_out' && (
          <p className="text-[11px] text-tx-dim">
            Mark one slot above as the Answer — it will be highlighted when revealed.
          </p>
        )}
        {variant === 'sequence' && (
          <p className="text-[11px] text-tx-dim">
            Mark one slot as Hidden — it will be concealed until the answer is revealed.
          </p>
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