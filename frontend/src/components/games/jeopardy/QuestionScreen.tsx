'use client'
import { useState } from 'react'
import { Settings, ArrowLeft } from 'lucide-react'
import type { JeopardyCell, Player } from '@/types'
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
  activePlayer: Player | null
  onBack: () => void             // back to board (no award)
  onReveal: () => void           // question → answer
  onAward: () => void            // award + back to board
  onRefresh: () => void
}

export default function QuestionScreen({
  col, row, cell, basePts, mode,
  activePlayer, onBack, onReveal, onAward, onRefresh
}: QuestionScreenProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [editText, setEditText] = useState('')
  const [editImage, setEditImage] = useState<string | null>(null)
  const [saving, setSaving]     = useState(false)
  const [awardWarn, setAwardWarn] = useState(false)

  const pts = basePts * (row + 1)
  const data = mode === 'question' ? cell.question : cell.answer
  const hasContent = data.text || data.image

  function openEdit() {
    setEditText(data.text)
    setEditImage(data.image)
    setEditOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      await api.updateCell(col, row, mode, editText.trim(), editImage)
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
      className="relative h-full flex items-center justify-center"
      style={{ background: mode === 'answer' ? '#0a0c10' : '#0d0d0d' }}
    >
      {/* Gear icon top-right */}
      <button
        onClick={openEdit}
        className="absolute top-3 right-3 z-10 flex items-center justify-center
                   w-9 h-9 bg-bg-panel border border-border hover:border-border-focus
                   text-tx-secondary hover:text-tx-primary rounded transition-all"
      >
        <Settings size={15} />
      </button>

      {/* Content */}
      <div className="flex flex-col items-center justify-center gap-6 px-16 py-20 w-full max-w-[1000px] text-center overflow-hidden">
        {hasContent ? (
          <>
            {data.image && (
              <div className="flex-shrink-0 max-h-[45vh] flex items-center justify-center">
                <img
                  src={data.image}
                  alt=""
                  className="max-h-[45vh] max-w-full object-contain rounded-lg border border-border"
                />
              </div>
            )}
            {data.text && (
              <p
                className="text-[clamp(22px,4vw,56px)] font-bold leading-tight tracking-tight break-words max-w-[860px]"
                style={{ color: mode === 'answer' ? '#f5a623' : '#e8e8e8' }}
              >
                {data.text}
              </p>
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