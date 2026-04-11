'use client'
import { useState } from 'react'
import { Settings, ArrowLeft, RotateCcw } from 'lucide-react'
import type { CLBoard, CLCategory } from '@/types'
import Modal from '@/components/ui/Modal'
import ImageUpload from '@/components/ui/ImageUpload'
import { FormField, inputClass } from '@/components/ui/FormField'
import * as api from '@/lib/api'

const VARIANT_LABELS: Record<string, string> = {
  common_link: 'Common Link',
  odd_one_out: 'Odd One Out',
  sequence:    'Finish the Sequence',
}

const VARIANT_COLORS: Record<string, string> = {
  common_link: '#6c8ef5',
  odd_one_out: '#e05d5d',
  sequence:    '#4caf7d',
}

interface CLBoardViewProps {
  board: CLBoard | null
  onBack: () => void
  onQuestionClick: (catIndex: number, qIndex: number) => void
  onRefresh: () => void
}

export default function CLBoardView({ board, onBack, onQuestionClick, onRefresh }: CLBoardViewProps) {
  // ── Settings modal ────────────────────────────────────
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [clRounds, setClRounds]   = useState(3)
  const [oooRounds, setOooRounds] = useState(3)
  const [seqRounds, setSeqRounds] = useState(3)
  const [clPts, setClPts]   = useState(200)
  const [oooPts, setOooPts] = useState(200)
  const [seqPts, setSeqPts] = useState(200)
  const [building, setBuilding] = useState(false)

  // ── Category edit modal ───────────────────────────────
  const [catOpen, setCatOpen]       = useState(false)
  const [catIndex, setCatIndex]     = useState(0)
  const [catName, setCatName]       = useState('')
  const [catDesc, setCatDesc]       = useState('')
  const [catImg, setCatImg]         = useState<string | null>(null)
  const [catSaving, setCatSaving]   = useState(false)

  // ── Reset confirm ─────────────────────────────────────
  const [resetConfirm, setResetConfirm] = useState(false)
  const [resetting, setResetting]       = useState(false)

  function openSettings() {
    if (board) {
      const cl  = board.categories.find(c => c.variant === 'common_link')
      const ooo = board.categories.find(c => c.variant === 'odd_one_out')
      const seq = board.categories.find(c => c.variant === 'sequence')
      setClRounds(cl?.questions.length ?? 3)
      setOooRounds(ooo?.questions.length ?? 3)
      setSeqRounds(seq?.questions.length ?? 3)
      setClPts(cl?.points ?? 200)
      setOooPts(ooo?.points ?? 200)
      setSeqPts(seq?.points ?? 200)
    }
    setSettingsOpen(true)
  }

  async function handleBuild() {
    setBuilding(true)
    try {
      await api.buildCLBoard(clRounds, oooRounds, seqRounds, clPts, oooPts, seqPts)
      onRefresh()
      setSettingsOpen(false)
    } finally {
      setBuilding(false)
    }
  }

  function openCatEdit(cat: CLCategory, index: number) {
    setCatIndex(index)
    setCatName(cat.name)
    setCatDesc(cat.description)
    setCatImg(cat.bgImage)
    setCatOpen(true)
  }

  async function handleCatSave() {
    setCatSaving(true)
    try {
      await api.updateCLCategory(catIndex, catName, catDesc, catImg)
      onRefresh()
      setCatOpen(false)
    } finally {
      setCatSaving(false)
    }
  }

  async function handleReset() {
    if (!resetConfirm) { setResetConfirm(true); return }
    setResetting(true)
    try { await api.resetCLBoard(); onRefresh() }
    finally { setResetting(false); setResetConfirm(false) }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Sub-topbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-subtle
                      bg-bg-topbar flex-shrink-0 gap-3">
        <button onClick={onBack}
          className="flex items-center gap-1.5 text-[12px] font-medium text-tx-secondary
                     hover:text-tx-primary border border-border hover:border-border-focus
                     rounded px-3 py-1.5 transition-all">
          <ArrowLeft size={13} /> Home
        </button>
        <span className="text-[13px] font-semibold text-tx-primary tracking-wide">Common Link</span>
        <div className="flex items-center gap-2">
          {board && (
            <button onClick={handleReset} onMouseLeave={() => setResetConfirm(false)}
              disabled={resetting}
              className={`flex items-center gap-1.5 text-[12px] font-medium rounded px-3 py-1.5 transition-all border
                ${resetConfirm
                  ? 'border-red-500/50 text-red-400 bg-red-500/10'
                  : 'text-tx-secondary hover:text-tx-primary border-border hover:border-border-focus'}`}
            >
              <RotateCcw size={13} />
              {resetConfirm ? 'Confirm Reset?' : 'Reset Board'}
            </button>
          )}
          <button onClick={openSettings}
            className="flex items-center gap-1.5 text-[12px] font-medium text-tx-secondary
                       hover:text-tx-primary border border-border hover:border-border-focus
                       rounded px-3 py-1.5 transition-all">
            <Settings size={13} /> Settings
          </button>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-auto p-4">
        {!board ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="text-[32px] opacity-40">🔗</div>
            <p className="text-[14px] font-semibold text-tx-secondary">No board configured</p>
            <p className="text-[12px] text-tx-dim max-w-[260px] leading-relaxed">
              Click Settings to set up your rounds and point values.
            </p>
            <button onClick={openSettings}
              className="mt-1 flex items-center gap-1.5 text-[12px] font-medium
                         bg-bg-card border border-border hover:border-border-focus
                         text-tx-secondary hover:text-tx-primary rounded px-3 py-1.5 transition-all">
              <Settings size={12} /> Open Settings
            </button>
          </div>
        ) : (
          /* Three columns — one per variant */
          <div className="grid grid-cols-3 gap-4 w-full max-w-[1100px] mx-auto">
            {board.categories.map((cat, ci) => {
              const color = VARIANT_COLORS[cat.variant]
              return (
                <div key={cat.variant} className="flex flex-col gap-2">
                  {/* Category header */}
                  <button
                    onClick={() => openCatEdit(cat, ci)}
                    className="relative overflow-hidden bg-bg-panel border border-border-subtle
                               rounded-lg flex flex-col items-center justify-center text-center
                               p-3 min-h-[80px] hover:border-border-focus hover:bg-bg-hover
                               transition-all cursor-pointer group"
                    title="Click to edit category"
                  >
                    {/* Colored top accent */}
                    <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: color }} />
                    {cat.bgImage && (
                      <img src={cat.bgImage} alt=""
                        className="absolute inset-0 w-full h-full object-cover opacity-[0.12]" />
                    )}
                    <span className="relative z-10 text-[12px] font-bold text-tx-primary uppercase tracking-wide">
                      {cat.name}
                    </span>
                    {cat.description && (
                      <span className="relative z-10 text-[11px] text-tx-secondary mt-1 leading-tight">
                        {cat.description}
                      </span>
                    )}
                    <span className="relative z-10 text-[11px] mt-1.5 font-semibold" style={{ color }}>
                      {cat.points} pts each
                    </span>
                  </button>

                  {/* Question cells */}
                  {cat.questions.map((q, qi) => (
                    <button
                      key={qi}
                      onClick={() => !q.answered && onQuestionClick(ci, qi)}
                      disabled={q.answered}
                      className={`bg-bg-panel border rounded-lg flex items-center justify-center
                                  min-h-[52px] transition-all text-[14px] font-bold
                                  ${q.answered
                                    ? 'border-border-subtle opacity-25 cursor-default'
                                    : 'border-border-subtle hover:bg-bg-hover cursor-pointer'
                                  }`}
                      style={!q.answered ? { '--hover-border': color } as React.CSSProperties : {}}
                      onMouseEnter={e => { if (!q.answered) (e.currentTarget as HTMLElement).style.borderColor = color }}
                      onMouseLeave={e => { if (!q.answered) (e.currentTarget as HTMLElement).style.borderColor = '' }}
                    >
                      <span style={{ color: q.answered ? 'transparent' : color }}>
                        {cat.points}
                      </span>
                    </button>
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Settings modal */}
      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Common Link Settings">
        <div className="grid grid-cols-2 gap-x-3 gap-y-3">
          <FormField label="Common Link — Rounds">
            <input className={inputClass} type="number" min={1} max={20} value={clRounds}
              onChange={e => setClRounds(+e.target.value)} />
          </FormField>
          <FormField label="Common Link — Points">
            <input className={inputClass} type="number" min={100} step={100} value={clPts}
              onChange={e => setClPts(+e.target.value)} />
          </FormField>
          <FormField label="Odd One Out — Rounds">
            <input className={inputClass} type="number" min={1} max={20} value={oooRounds}
              onChange={e => setOooRounds(+e.target.value)} />
          </FormField>
          <FormField label="Odd One Out — Points">
            <input className={inputClass} type="number" min={100} step={100} value={oooPts}
              onChange={e => setOooPts(+e.target.value)} />
          </FormField>
          <FormField label="Sequence — Rounds">
            <input className={inputClass} type="number" min={1} max={20} value={seqRounds}
              onChange={e => setSeqRounds(+e.target.value)} />
          </FormField>
          <FormField label="Sequence — Points">
            <input className={inputClass} type="number" min={100} step={100} value={seqPts}
              onChange={e => setSeqPts(+e.target.value)} />
          </FormField>
        </div>
        <div className="flex gap-2 justify-end pt-1.5 border-t border-border-subtle mt-1">
          <button onClick={() => setSettingsOpen(false)}
            className="px-4 py-2 text-[13px] font-medium text-tx-secondary border border-border
                       hover:border-border-focus hover:text-tx-primary rounded transition-all">
            Cancel
          </button>
          <button onClick={handleBuild} disabled={building}
            className="px-4 py-2 text-[13px] font-semibold bg-accent hover:bg-accent-hover
                       text-tx-accent rounded transition-colors disabled:opacity-50">
            {building ? 'Building...' : 'Build Board'}
          </button>
        </div>
      </Modal>

      {/* Category edit modal */}
      <Modal open={catOpen} onClose={() => setCatOpen(false)} title="Edit Category">
        <FormField label="Category Title">
          <input className={inputClass} value={catName}
            onChange={e => setCatName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCatSave() }} autoFocus />
        </FormField>
        <FormField label="Description (shown below title)">
          <input className={inputClass} value={catDesc} placeholder="Optional description..."
            onChange={e => setCatDesc(e.target.value)} />
        </FormField>
        <ImageUpload label="Background Image (optional)" value={catImg} onChange={setCatImg} />
        <div className="flex gap-2 justify-end pt-1.5 border-t border-border-subtle mt-1">
          <button onClick={() => setCatOpen(false)}
            className="px-4 py-2 text-[13px] font-medium text-tx-secondary border border-border
                       hover:border-border-focus hover:text-tx-primary rounded transition-all">
            Cancel
          </button>
          <button onClick={handleCatSave} disabled={catSaving}
            className="px-4 py-2 text-[13px] font-semibold bg-accent hover:bg-accent-hover
                       text-tx-accent rounded transition-colors disabled:opacity-50">
            {catSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </Modal>
    </div>
  )
}