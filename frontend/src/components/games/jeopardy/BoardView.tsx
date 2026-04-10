'use client'
import { useState } from 'react'
import { Settings, ArrowLeft, RotateCcw } from 'lucide-react'
import type { JeopardyBoard } from '@/types'
import Modal from '@/components/ui/Modal'
import ImageUpload from '@/components/ui/ImageUpload'
import { FormField, inputClass } from '@/components/ui/FormField'
import * as api from '@/lib/api'

interface JeopardyBoardProps {
  board: JeopardyBoard | null
  onBack: () => void
  onCellClick: (col: number, row: number) => void
  onRefresh: () => void
}

export default function JeopardyBoardView({ board, onBack, onCellClick, onRefresh }: JeopardyBoardProps) {
  // Settings modal
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [cols, setCols]     = useState(6)
  const [rows, setRows]     = useState(5)
  const [basePts, setBasePts] = useState(200)
  const [building, setBuilding] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetConfirm, setResetConfirm] = useState(false)

  // Category edit modal
  const [catOpen, setCatOpen]   = useState(false)
  const [catCol, setCatCol]     = useState(0)
  const [catName, setCatName]   = useState('')
  const [catImg, setCatImg]     = useState<string | null>(null)
  const [catSaving, setCatSaving] = useState(false)

  async function handleBuild() {
    setBuilding(true)
    try {
      await api.buildJeopardyBoard(
        Math.max(1, Math.min(12, cols)),
        Math.max(1, Math.min(10, rows)),
        Math.max(100, basePts)
      )
      onRefresh()
      setSettingsOpen(false)
    } finally {
      setBuilding(false)
    }
  }

  function openCatEdit(col: number) {
    if (!board) return
    const cat = board.categories[col]
    setCatCol(col)
    setCatName(cat.name)
    setCatImg(cat.bgImage)
    setCatOpen(true)
  }

  async function handleCatSave() {
    setCatSaving(true)
    try {
      await api.updateCategory(catCol, catName || `Category ${catCol + 1}`, catImg)
      onRefresh()
      setCatOpen(false)
    } finally {
      setCatSaving(false)
    }
  }

  async function handleReset() {
    if (!resetConfirm) { setResetConfirm(true); return }
    setResetting(true)
    try {
      await api.resetBoard()
      onRefresh()
    } finally {
      setResetting(false)
      setResetConfirm(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Sub-topbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-subtle
                      bg-bg-topbar flex-shrink-0 gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-[12px] font-medium text-tx-secondary
                     hover:text-tx-primary border border-border hover:border-border-focus
                     rounded px-3 py-1.5 transition-all"
        >
          <ArrowLeft size={13} /> Home
        </button>
        <span className="text-[13px] font-semibold text-tx-primary tracking-wide">Jeopardy</span>
        <div className="flex items-center gap-2">
          {board && (
            <button
              onClick={handleReset}
              onMouseLeave={() => setResetConfirm(false)}
              disabled={resetting}
              className={`flex items-center gap-1.5 text-[12px] font-medium rounded px-3 py-1.5 transition-all border
                ${resetConfirm
                  ? 'border-red-500/50 text-red-400 bg-red-500/10 hover:bg-red-500/15'
                  : 'text-tx-secondary hover:text-tx-primary border-border hover:border-border-focus'
                }`}
              title="Reset all answered questions"
            >
              <RotateCcw size={13} />
              {resetConfirm ? 'Confirm Reset?' : 'Reset Board'}
            </button>
          )}
          <button
            onClick={() => {
              if (board) { setCols(board.cols); setRows(board.rows); setBasePts(board.basePts) }
              setSettingsOpen(true)
            }}
            className="flex items-center gap-1.5 text-[12px] font-medium text-tx-secondary
                       hover:text-tx-primary border border-border hover:border-border-focus
                       rounded px-3 py-1.5 transition-all"
          >
            <Settings size={13} /> Settings
          </button>
        </div>
      </div>

      {/* Board area */}
      <div className="flex-1 overflow-auto p-3.5 flex flex-col items-center">
        {!board ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="text-[32px] opacity-40">❓</div>
            <p className="text-[14px] font-semibold text-tx-secondary">No board configured</p>
            <p className="text-[12px] text-tx-dim max-w-[240px] leading-relaxed">
              Click Settings to set up your categories and questions.
            </p>
            <button
              onClick={() => setSettingsOpen(true)}
              className="mt-1 flex items-center gap-1.5 text-[12px] font-medium
                         bg-bg-card border border-border hover:border-border-focus
                         text-tx-secondary hover:text-tx-primary rounded px-3 py-1.5 transition-all"
            >
              <Settings size={12} /> Open Settings
            </button>
          </div>
        ) : (
          <div
            className="grid gap-1.5 w-full max-w-[1400px]"
            style={{ gridTemplateColumns: `repeat(${board.cols}, 1fr)` }}
          >
            {/* Category header row */}
            {board.categories.map((cat, c) => (
              <button
                key={c}
                onClick={() => openCatEdit(c)}
                className="relative overflow-hidden bg-bg-panel border border-border-subtle
                           rounded-lg flex items-center justify-center text-center p-2.5
                           min-h-[70px] hover:border-border-focus hover:bg-bg-hover
                           transition-all cursor-pointer group"
                title="Click to edit category"
              >
                {/* Orange top accent */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent opacity-70" />
                {cat.bgImage && (
                  <img src={cat.bgImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-[0.12]" />
                )}
                <span className="relative z-10 text-[clamp(9px,1.1vw,12px)] font-bold text-tx-primary
                                 uppercase tracking-wide leading-tight break-words">
                  {cat.name}
                </span>
              </button>
            ))}

            {/* Question rows */}
            {Array.from({ length: board.rows }, (_, r) => {
              const pts = board.basePts * (r + 1)
              return board.categories.map((_, c) => {
                const cell = board.cells[c]?.[r]
                const answered = cell?.answered ?? false
                return (
                  <button
                    key={`${c}-${r}`}
                    onClick={() => !answered && onCellClick(c, r)}
                    disabled={answered}
                    className={`
                      bg-bg-panel border rounded-lg flex items-center justify-center
                      min-h-[58px] transition-all
                      ${answered
                        ? 'border-border-subtle opacity-25 cursor-default'
                        : 'border-border-subtle hover:border-accent hover:bg-bg-hover cursor-pointer'
                      }
                    `}
                  >
                    <span className={`
                      text-[clamp(15px,2vw,24px)] font-bold tracking-tight
                      ${answered ? 'opacity-0' : 'text-accent'}
                    `}>
                      {pts}
                    </span>
                  </button>
                )
              })
            })}
          </div>
        )}
      </div>

      {/* Settings modal */}
      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Jeopardy Settings">
        <FormField label="Number of Categories (columns)">
          <input className={inputClass} type="number" min={1} max={12} value={cols}
            onChange={e => setCols(+e.target.value)} />
        </FormField>
        <FormField label="Question Rows per Category">
          <input className={inputClass} type="number" min={1} max={10} value={rows}
            onChange={e => setRows(+e.target.value)} />
        </FormField>
        <FormField label="Base Point Value (×row number)">
          <input className={inputClass} type="number" min={100} step={100} value={basePts}
            onChange={e => setBasePts(+e.target.value)} />
        </FormField>
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
        <FormField label="Category Name">
          <input className={inputClass} placeholder="Category name..." value={catName}
            onChange={e => setCatName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCatSave() }}
            autoFocus />
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