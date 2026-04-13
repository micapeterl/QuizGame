'use client'
import { useRef, useState } from 'react'
import { ArrowLeft, Settings, Lock } from 'lucide-react'
import type { CLQuestion, CLSlot, CLVariant, Player } from '@/types'
import Modal from '@/components/ui/Modal'
import ImageUpload from '@/components/ui/ImageUpload'
import { FormField, inputClass } from '@/components/ui/FormField'
import { getInitial } from '@/lib/colors'
import * as api from '@/lib/api'

// ── Constants ─────────────────────────────────────────────────────────────────
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

// ── Checkmark type ────────────────────────────────────────────────────────────
type CheckmarkType = 'correct' | 'alternate' | 'funny' | null

interface PlayerAnswer {
  playerId: string
  text: string
  round: 1 | 2
  checkmark: CheckmarkType
}

// ── Small player chip (unselected size) ───────────────────────────────────────
function MiniChip({ player }: { player: Player }) {
  const color = player.color
  return (
    <div className="flex items-center gap-1.5 rounded-full px-2 pr-2.5 py-0.5 border flex-shrink-0"
      style={{ borderColor: color + '60', background: color + '0a' }}>
      <div className="w-[22px] h-[22px] rounded-full overflow-hidden flex-shrink-0 border"
        style={{ borderColor: color + '80', background: '#1a1a1a' }}>
        {player.avatar
          ? <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />
          : <span className="text-[9px] font-bold flex items-center justify-center h-full"
              style={{ color }}>{getInitial(player.name)}</span>
        }
      </div>
      <span className="text-[11px] font-semibold" style={{ color }}>{player.name}</span>
    </div>
  )
}

// ── Slot card ─────────────────────────────────────────────────────────────────
function SlotCard({ slot, index, variant, revealed, isAnswer, isHidden }: {
  slot: CLSlot; index: number; variant: CLVariant
  revealed: boolean; isAnswer: boolean; isHidden: boolean
}) {
  const isEmpty = !slot.text && !slot.image
  let cardStyle: React.CSSProperties = {}
  let borderClass = 'border-border-subtle'
  if (revealed) {
    if (variant === 'odd_one_out') {
      if (isAnswer) { borderClass = 'border-2'; cardStyle = { borderColor: VARIANT_COLORS.odd_one_out, boxShadow: `0 0 20px ${VARIANT_COLORS.odd_one_out}40` } }
      else cardStyle = { opacity: 0.35 }
    } else if (variant === 'sequence' && isHidden) {
      borderClass = 'border-2'; cardStyle = { borderColor: VARIANT_COLORS.sequence, boxShadow: `0 0 20px ${VARIANT_COLORS.sequence}40` }
    }
  }
  const showContent = !(variant === 'sequence' && isHidden && !revealed)
  return (
    <div className={`relative flex flex-col items-center justify-center bg-bg-panel border ${borderClass} rounded-xl p-4 flex-1 min-h-[160px] transition-all duration-300 overflow-hidden`}
      style={cardStyle}>
      {variant === 'sequence' && isHidden && !revealed && (
        <div className="flex flex-col items-center gap-2 opacity-40">
          <span className="text-[32px]">?</span>
          <span className="text-[12px] text-tx-dim">Hidden</span>
        </div>
      )}
      {showContent && (
        <>
          {slot.image && <img src={slot.image} alt="" className="max-h-[120px] max-w-full object-contain rounded-lg mb-2" />}
          {slot.text && (
            <p className={`text-center font-semibold leading-snug break-words ${slot.image ? 'text-[12px] text-tx-secondary' : 'text-[clamp(13px,1.8vw,20px)] text-tx-primary'}`}>
              {slot.text}
            </p>
          )}
          {isEmpty && <span className="text-[12px] text-tx-dim opacity-40">Empty</span>}
        </>
      )}
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface CLQuestionScreenProps {
  catIndex:    number
  qIndex:      number
  question:    CLQuestion
  variant:     CLVariant
  points:      number
  players:     Player[]
  initiatorId: string | null
  activePlayer: Player | null
  onBack:      () => void
  onAward:     () => void
  onRefresh:   () => void
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function CLQuestionScreen({
  catIndex, qIndex, question, variant, points,
  players, initiatorId, activePlayer,
  onBack, onAward, onRefresh,
}: CLQuestionScreenProps) {

  // ── Common Link answer collection state ───────────────────────────────────
  const [answers, setAnswers]     = useState<PlayerAnswer[]>([])
  const [inputText, setInputText] = useState('')
  const [phase, setPhase]         = useState<'collecting' | 'judging' | 'revealed'>('collecting')
  const [round, setRound]         = useState<1 | 2>(1)
  const [revealed, setRevealed]   = useState(false)
  const [awardWarn, setAwardWarn] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Edit modal ────────────────────────────────────────────────────────────
  const [editOpen, setEditOpen]             = useState(false)
  const [draftSlots, setDraftSlots]         = useState<CLSlot[]>(question.slots.map(s => ({ ...s })))
  const [draftAnswerText, setDraftAnswerText] = useState(question.answerText)
  const [draftAnswerIndex, setDraftAnswerIndex] = useState<number | null>(question.answerIndex)
  const [draftHiddenIndex, setDraftHiddenIndex] = useState<number | null>(question.hiddenIndex)
  const [saving, setSaving] = useState(false)

  const color = VARIANT_COLORS[variant]

  // ── Turn order logic ──────────────────────────────────────────────────────
  // Ordered starting from initiator, going through all players
  const initiatorIndex = initiatorId ? players.findIndex(p => p.id === initiatorId) : 0
  const orderedPlayers = initiatorIndex >= 0
    ? [...players.slice(initiatorIndex), ...players.slice(0, initiatorIndex)]
    : players

  // Which players still need to submit this round
  const submittedThisRound = new Set(answers.filter(a => a.round === round).map(a => a.playerId))
  const pendingPlayers = orderedPlayers.filter(p => !submittedThisRound.has(p.id))
  const currentInputPlayer = pendingPlayers[0] ?? null

  // Is current input player the last one (final guess)?
  const finalGuessPlayerId = orderedPlayers.length > 1
    ? orderedPlayers[orderedPlayers.length - 1]?.id
    : null
  const isFinalGuess = phase === 'collecting' && currentInputPlayer?.id === finalGuessPlayerId

  // ── Submit answer ─────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!inputText.trim() || !currentInputPlayer) return
    const newAnswer: PlayerAnswer = {
      playerId: currentInputPlayer.id,
      text:     inputText.trim(),
      round,
      checkmark: null,
    }
    const newAnswers = [...answers.filter(a => !(a.playerId === currentInputPlayer.id && a.round === round)), newAnswer]
    setAnswers(newAnswers)
    setInputText('')

    // Check if this was the last player for this round
    const stillPending = orderedPlayers.filter(p =>
      !newAnswers.some(a => a.playerId === p.id && a.round === round)
    )
    if (stillPending.length === 0) {
      setPhase('judging')
      // Always reset active player to initiator for judging
      if (initiatorId) {
        await api.setActivePlayer(initiatorId)
        onRefresh()
      }
    } else {
      // Advance to next player
      await api.advanceTurn()
      onRefresh()
    }
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  // ── Set checkmark ─────────────────────────────────────────────────────────
  function setCheckmark(playerId: string, type: CheckmarkType) {
    setAnswers(prev => prev.map(a => {
      if (a.playerId !== playerId || a.round !== round) return a
      // Toggle off if same mark clicked again
      return { ...a, checkmark: a.checkmark === type ? null : type }
    }))
  }

  // ── Compute pending points for display ────────────────────────────────────
  function pendingPts(answer: PlayerAnswer): number | null {
    if (!answer.checkmark) return null
    if (answer.checkmark === 'funny') return 1
    const base = round === 1 ? points : Math.floor(points / 2)
    if (answer.checkmark === 'correct') return base
    if (answer.checkmark === 'alternate') return Math.floor(base / 2)
    return null
  }

  // Has anyone been marked correct this round?
  const hasCorrect = answers.some(a => a.round === round && a.checkmark === 'correct')

  // Can reveal: someone marked correct, OR round 2 judging complete
  const canReveal = phase === 'judging' && (hasCorrect || round === 2)

  // ── Award all points ──────────────────────────────────────────────────────
  async function handleAward() {
    const toAward = answers.filter(a => a.checkmark !== null)
    for (const a of toAward) {
      const pts = pendingPts(a)
      if (pts && pts > 0) await api.awardPoints(a.playerId, pts)
    }
    await api.markCLAnswered(catIndex, qIndex, true)
    onRefresh()
    onAward()
  }

  // ── Start round 2 (called when turn advances back to initiator with no correct answer) ──
  async function handleAdvanceToRound2() {
    // Award non-correct marks from round 1
    const toAward = answers.filter(a => a.round === 1 && a.checkmark !== null && a.checkmark !== 'correct')
    for (const a of toAward) {
      const pts = pendingPts(a)
      if (pts && pts > 0) await api.awardPoints(a.playerId, pts)
    }
    // Always reset active player to initiator regardless of current state
    if (initiatorId) {
      await api.setActivePlayer(initiatorId)
      await onRefresh()
    }
    // Clear round 1 answers and start round 2
    setAnswers(prev => prev.filter(a => a.round !== 1))
    setRound(2)
    setPhase('collecting')
  }

  // ── Edit handlers ─────────────────────────────────────────────────────────
  function openEdit() {
    setDraftSlots(question.slots.map(s => ({ ...s })))
    setDraftAnswerText(question.answerText)
    setDraftAnswerIndex(question.answerIndex)
    setDraftHiddenIndex(question.hiddenIndex)
    setEditOpen(true)
  }
  function updateDraftSlot(i: number, field: 'text' | 'image', val: string | null) {
    setDraftSlots(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: field === 'text' ? (val ?? '') : val } : s))
  }
  async function handleSave() {
    setSaving(true)
    try {
      await api.updateCLQuestion(catIndex, qIndex, draftSlots, draftAnswerText, draftAnswerIndex, draftHiddenIndex)
      onRefresh(); setEditOpen(false)
    } finally { setSaving(false) }
  }

  const isCommonLink = variant === 'common_link'

  // ── Render ────────────────────────────────────────────────────────────────
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
      <div className="flex-shrink-0 flex items-center justify-center pt-4 pb-2">
        <span className="text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border"
          style={{ color, borderColor: color + '50', background: color + '12' }}>
          {VARIANT_LABELS[variant]}
          {isCommonLink && round === 2 && (
            <span className="ml-2 text-red-400">· Round 2 (½ pts)</span>
          )}
        </span>
      </div>

      {/* Common Link revealed answer — above the slots */}
      {isCommonLink && revealed && question.answerText && (
        <div className="flex-shrink-0 flex items-center justify-center pb-2">
          <div className="px-6 py-2 bg-bg-panel border-2 rounded-xl text-center"
            style={{ borderColor: color, boxShadow: `0 0 20px ${color}30` }}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color }}>The Common Link</p>
            <p className="text-[clamp(16px,2.5vw,28px)] font-bold text-tx-primary">{question.answerText}</p>
          </div>
        </div>
      )}

      {/* Four content slots */}
      <div className="flex-shrink-0 flex items-stretch gap-3 px-6 py-2"
        style={{ maxHeight: isCommonLink ? '35vh' : '55vh' }}>
        {question.slots.map((slot, i) => (
          <SlotCard key={i} slot={slot} index={i} variant={variant} revealed={revealed}
            isAnswer={question.answerIndex === i} isHidden={question.hiddenIndex === i} />
        ))}
      </div>

      {/* ── COMMON LINK: answer collection + judging ── */}
      {isCommonLink && (
        <div className="flex-1 flex flex-col overflow-hidden px-6 pb-16">

          {/* Submitted answers list */}
          <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 py-2">
            {orderedPlayers.map(p => {
              const answer = answers.find(a => a.playerId === p.id && a.round === round)
              const isCurrentInput = phase === 'collecting' && currentInputPlayer?.id === p.id
              const pts = answer ? pendingPts(answer) : null

              return (
                <div key={p.id} className="flex items-center gap-2.5 min-h-[36px]">
                  {/* Player chip */}
                  <MiniChip player={p} />

                  {/* Input bar or submitted answer */}
                  {isCurrentInput ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        ref={inputRef}
                        autoFocus
                        className="flex-1 bg-bg-card border border-border-focus text-tx-primary
                                   rounded px-3 py-1.5 text-[13px] focus:outline-none"
                        style={{ borderColor: p.color }}
                        placeholder={`${p.name}'s answer...`}
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
                      />
                      <button onClick={handleSubmit}
                        disabled={!inputText.trim()}
                        className="px-3 py-1.5 text-[12px] font-semibold rounded border transition-all
                                   disabled:opacity-40"
                        style={{ borderColor: p.color, color: p.color, background: p.color + '15' }}>
                        {isFinalGuess ? 'Submit →' : 'Submit →'}
                      </button>
                    </div>
                  ) : answer ? (
                    <div className="flex-1 flex items-center gap-2">
                      {/* Answer text */}
                      <span className="flex-1 text-[13px] text-tx-primary bg-bg-card border border-border
                                       rounded px-3 py-1.5 truncate">
                        {answer.text}
                      </span>

                      {/* Pending points badge */}
                      {pts !== null && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: p.color + '20', color: p.color }}>
                          +{pts}
                        </span>
                      )}

                      {/* Checkboxes — only shown in judging phase */}
                      {phase === 'judging' && (
                        <div className="flex gap-1 flex-shrink-0">
                          {(['correct', 'alternate', 'funny'] as CheckmarkType[]).map(type => (
                            <button key={type!}
                              onClick={() => setCheckmark(p.id, type)}
                              title={type === 'correct' ? 'Correct answer' : type === 'alternate' ? 'Alternate answer' : 'Funny answer'}
                              className={`w-7 h-7 rounded border text-[10px] font-black transition-all
                                ${answer.checkmark === type
                                  ? type === 'correct' ? 'bg-green-500/20 border-green-500 text-green-400'
                                    : type === 'alternate' ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                                    : 'bg-yellow-500/20 border-yellow-500 text-yellow-400'
                                  : 'bg-bg-card border-border text-tx-dim hover:border-border-focus'
                                }`}>
                              {type === 'correct' ? '✓' : type === 'alternate' ? '~' : '😄'}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Waiting */
                    <span className="text-[12px] text-tx-dim italic">Waiting...</span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Judging action buttons */}
          {phase === 'judging' && (
            <div className="flex-shrink-0 flex items-center gap-3 py-2 border-t border-border-subtle">
              {!hasCorrect && round === 1 && (
                <button onClick={handleAdvanceToRound2}
                  className="flex-1 py-2 text-[13px] font-semibold rounded border border-border
                             text-tx-secondary hover:border-border-focus hover:text-tx-primary transition-all">
                  No correct answer → Start Round 2
                </button>
              )}
              {canReveal && (
                <button onClick={() => { setRevealed(true); setPhase('revealed') }}
                  className="flex-1 py-2 text-[13px] font-semibold rounded transition-colors"
                  style={{ background: color, color: '#fff' }}>
                  Reveal Answer →
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── ODD ONE OUT / SEQUENCE: original flow ── */}
      {!isCommonLink && (
        <div className="flex-1 flex items-center justify-center px-8 pb-16">
          {!revealed && (
            <div className="flex flex-col items-center gap-3 opacity-30">
              <span className="text-[36px]">✏️</span>
              <p className="text-[14px] text-tx-secondary">Click Reveal Answer when ready</p>
            </div>
          )}
        </div>
      )}

      {/* Back button */}
      <button onClick={onBack}
        className="absolute bottom-4 left-4 flex items-center gap-1.5 text-[13px] font-medium
                   text-tx-secondary hover:text-tx-primary border border-border
                   hover:border-border-focus bg-bg-panel rounded px-4 py-2 transition-all">
        <ArrowLeft size={13} /> Board
      </button>

      {/* Bottom-right: reveal (non-CL) or award (revealed) */}
      {!isCommonLink && !revealed && (
        <button onClick={() => setRevealed(true)}
          className="absolute bottom-4 right-4 text-[13px] font-semibold rounded px-5 py-2"
          style={{ background: color, color: '#fff' }}>
          Reveal Answer →
        </button>
      )}

      {!isCommonLink && revealed && (
        <button onClick={async () => {
          if (!activePlayer) { setAwardWarn(true); setTimeout(() => setAwardWarn(false), 1800); return }
          await api.awardPoints(activePlayer.id, points)
          await api.markCLAnswered(catIndex, qIndex, true)
          await api.advanceTurn()
          onRefresh(); onAward()
        }}
          className={`absolute bottom-4 right-4 text-[13px] font-semibold rounded px-5 py-2 transition-all
            ${awardWarn ? 'bg-red-700 text-white animate-pulse' : 'bg-[#3d9e62] hover:bg-[#4aaf70] text-white'}`}>
          {awardWarn ? '⚠ No active player!' : `✓ Award ${points} pts${activePlayer ? ` to ${activePlayer.name}` : ''}`}
        </button>
      )}

      {/* Common Link: award on revealed phase */}
      {isCommonLink && phase === 'revealed' && (
        <button onClick={handleAward}
          className="absolute bottom-4 right-4 text-[13px] font-semibold rounded px-5 py-2 bg-[#3d9e62] hover:bg-[#4aaf70] text-white transition-all">
          ✓ Award Points
        </button>
      )}

      {/* Common Link: reveal locked indicator when not yet revealable */}
      {isCommonLink && phase === 'collecting' && (
        <div className="absolute bottom-4 right-4 flex items-center gap-1.5 text-[13px] font-medium
                        text-tx-dim border border-border rounded px-4 py-2 bg-bg-panel opacity-50 cursor-default">
          <Lock size={13} /> Reveal Answer
        </div>
      )}

      {/* Edit modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Question" wide>
        <p className="text-[12px] text-tx-dim -mt-2">
          Variant: <span className="text-tx-secondary font-medium">{VARIANT_LABELS[variant]}</span>
        </p>
        {draftSlots.map((slot, i) => (
          <div key={i} className="flex flex-col gap-2 p-3 bg-bg-card border border-border rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold text-tx-secondary">Slot {i + 1}</span>
              <div className="flex gap-1.5">
                {variant === 'odd_one_out' && (
                  <button onClick={() => setDraftAnswerIndex(draftAnswerIndex === i ? null : i)}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-all
                      ${draftAnswerIndex === i ? 'bg-red-500/20 border-red-500/60 text-red-400' : 'bg-bg-input border-border text-tx-dim hover:border-red-500/40 hover:text-red-400'}`}>
                    {draftAnswerIndex === i ? '✓ This is the Answer' : 'Mark as Answer'}
                  </button>
                )}
                {variant === 'sequence' && (
                  <button onClick={() => setDraftHiddenIndex(draftHiddenIndex === i ? null : i)}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-all
                      ${draftHiddenIndex === i ? 'bg-green-500/20 border-green-500/60 text-green-400' : 'bg-bg-input border-border text-tx-dim hover:border-green-500/40 hover:text-green-400'}`}>
                    {draftHiddenIndex === i ? '✓ This is Hidden' : 'Mark as Hidden'}
                  </button>
                )}
              </div>
            </div>
            <ImageUpload label="Image (optional)" value={slot.image} onChange={v => updateDraftSlot(i, 'image', v)} />
            <FormField label="Text (optional)">
              <input className={inputClass} value={slot.text} placeholder="Text..."
                onChange={e => updateDraftSlot(i, 'text', e.target.value)} />
            </FormField>
          </div>
        ))}
        {variant === 'common_link' && (
          <FormField label="Answer — The Common Link">
            <input className={inputClass} value={draftAnswerText}
              placeholder="What connects the four items..."
              onChange={e => setDraftAnswerText(e.target.value)} />
          </FormField>
        )}
        <div className="flex gap-2 justify-end pt-1.5 border-t border-border-subtle mt-1">
          <button onClick={() => setEditOpen(false)}
            className="px-4 py-2 text-[13px] font-medium text-tx-secondary border border-border
                       hover:border-border-focus hover:text-tx-primary rounded transition-all">Cancel</button>
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