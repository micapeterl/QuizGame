'use client'
import { useCallback, useEffect, useState } from 'react'
import type { GameState, HomeSettings, Player } from '@/types'
import * as api from '@/lib/api'
import { applyFont, injectCustomFont } from '@/components/games/HomeScreen'

import TopBar from '@/components/layout/TopBar'
import PlayerSidebar from '@/components/layout/PlayerSidebar'
import HomeScreen from '@/components/games/HomeScreen'
import JeopardyBoardView from '@/components/games/jeopardy/BoardView'
import QuestionScreen from '@/components/games/jeopardy/QuestionScreen'
import CLBoardView from '@/components/games/commonlink/BoardView'
import CLQuestionScreen from '@/components/games/commonlink/QuestionScreen'
import TurnTransition from '@/components/layout/TurnTransition'

type Screen = 'home' | 'jeopardy' | 'question' | 'answer' | 'commonlink' | 'cl_question'

const TOPBAR_DEFAULT     = 52
const TOPBAR_ACTIVE      = 80
const TOPBAR_FINAL_GUESS = 96

export default function Page() {
  const [state, setState]             = useState<GameState | null>(null)
  const [screen, setScreen]           = useState<Screen>('home')
  const [sidebarOpen, setSidebar]     = useState(false)
  const [activeCell, setActiveCell]   = useState<{ col: number; row: number } | null>(null)
  const [initiatorId, setInitiatorId]   = useState<string | null>(null)
  const [questionRound, setQuestionRound] = useState(1)  // 1 = first round (full pts), 2+ = half pts
  const [clActiveCell, setCLActiveCell] = useState<{ catIndex: number; qIndex: number } | null>(null)
  const [rollResults, setRollResults]   = useState<Record<string, number>>({})
  const [transition, setTransition]     = useState<{ initiator: Player; next: Player } | null>(null)
  const [loading, setLoading]         = useState(true)

  const refresh = useCallback(async () => {
    const data = await api.getState()
    setState(data)
    ;(data.homeSettings?.customFonts ?? []).forEach(injectCustomFont)
    if (data.homeSettings?.font) applyFont(data.homeSettings.font, data.homeSettings.customFonts ?? [])
  }, [])

  useEffect(() => { refresh().finally(() => setLoading(false)) }, [refresh])

  async function handleSetActive(id: string) {
    const newId = state?.activePlayerId === id ? null : id
    await api.setActivePlayer(newId)
    refresh()
  }

  function handleCellClick(col: number, row: number) {
    setActiveCell({ col, row })
    setInitiatorId(state?.activePlayerId ?? null)
    setQuestionRound(1)
    setScreen('question')
  }

  function handleCLCellClick(catIndex: number, qIndex: number) {
    setCLActiveCell({ catIndex, qIndex })
    setScreen('cl_question')
  }

  function handleSettingsChange(updated: HomeSettings) {
    if (!state) return
    setState({ ...state, homeSettings: updated })
  }

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-bg-root">
        <div className="flex items-center gap-2 text-tx-secondary text-[14px]">
          <span className="animate-spin text-accent text-lg">⚡</span>
          Loading Quiz Arena...
        </div>
      </div>
    )
  }

  if (!state) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-bg-root">
        <div className="text-tx-secondary text-[13px]">
          Cannot connect to backend. Make sure the server is running.
        </div>
      </div>
    )
  }

  const hasActivePlayer  = state.players.some(p => p.id === state.activePlayerId)

  const activePlayer = state.activePlayerId
    ? state.players.find(p => p.id === state.activePlayerId) ?? null
    : null

  const currentCell = activeCell && state.jeopardy
    ? state.jeopardy.cells[activeCell.col]?.[activeCell.row] ?? null
    : null

  // ── Turn-tracking logic for question pages ───────────────────────────────
  const isOnQuestionPage = screen === 'question' || screen === 'answer'
  const players = state.players
  const initiatorIndex = initiatorId ? players.findIndex(p => p.id === initiatorId) : -1

  // finalGuessPlayer = the player one step BEFORE the initiator in turn order.
  // When Next Player is pressed for them, it would cycle back to the initiator,
  // completing a full loop and starting round 2.
  const finalGuessIndex = players.length > 1 && initiatorIndex >= 0
    ? (initiatorIndex - 1 + players.length) % players.length
    : -1
  const finalGuessPlayerId = finalGuessIndex >= 0 ? players[finalGuessIndex]?.id ?? null : null

  // Half points kicks in on round 2+ (after a full loop has completed)
  const halfPoints = isOnQuestionPage && questionRound >= 2

  // Next Player is only locked during round 2+, when the active player is the finalGuessPlayer
  // (meaning pressing Next would loop back to initiator again — no more guesses)
  const nextPlayerLocked = isOnQuestionPage
    && questionRound >= 2
    && finalGuessPlayerId !== null
    && state.activePlayerId === finalGuessPlayerId
    && players.length > 1

  // CL question lookup
  const clCat = clActiveCell ? state.commonLink?.categories[clActiveCell.catIndex] ?? null : null
  const clQ   = clActiveCell && clCat ? clCat.questions[clActiveCell.qIndex] ?? null : null

  const hasFinalGuess = isOnQuestionPage && questionRound >= 2 && finalGuessPlayerId !== null
  const topbarH       = hasFinalGuess ? TOPBAR_FINAL_GUESS : hasActivePlayer ? TOPBAR_ACTIVE : TOPBAR_DEFAULT

  return (
    <>
      <TopBar
        players={state.players}
        activePlayerId={state.activePlayerId}
        rollResults={rollResults}
        finalGuessPlayerId={isOnQuestionPage && questionRound >= 2 ? finalGuessPlayerId : null}
        nextPlayerLocked={nextPlayerLocked}
        onToggleSidebar={() => setSidebar(o => !o)}
        onSetActive={handleSetActive}
        onAdvanceTurn={async () => {
          // Detect if this advance will land on the initiator — if so, increment round
          const currentIndex = state.players.findIndex(p => p.id === state.activePlayerId)
          const nextIndex = (currentIndex + 1) % state.players.length
          const nextId = state.players[nextIndex]?.id
          const willLoopToInitiator = nextId === initiatorId && isOnQuestionPage
          await api.advanceTurn()
          await refresh()
          // Increment AFTER refresh so the new activePlayer and new round apply together
          if (willLoopToInitiator) {
            setQuestionRound(r => r + 1)
          }
        }}
      />

      <PlayerSidebar
        open={sidebarOpen}
        onClose={() => setSidebar(false)}
        players={state.players}
        onRefresh={refresh}
      />

      {/* Content area — sits below the topbar, fills the rest of the viewport */}
      <div
        className="fixed left-0 right-0 bottom-0 bg-bg-root"
        style={{ top: `${topbarH}px`, transition: 'top 0.25s ease' }}
      >
        {screen === 'home' && (
          <HomeScreen
            settings={state.homeSettings}
            players={state.players}
            activePlayerId={state.activePlayerId}
            onSelectGame={g => setScreen(g as Screen)}
            onSettingsChange={handleSettingsChange}
            onRefresh={refresh}
            onRollResults={setRollResults}
          />
        )}

        {screen === 'jeopardy' && (
          <JeopardyBoardView
            board={state.jeopardy}
            onBack={() => setScreen('home')}
            onCellClick={handleCellClick}
            onRefresh={refresh}
          />
        )}

        {screen === 'question' && activeCell && currentCell && state.jeopardy && (
          <QuestionScreen
            col={activeCell.col}
            row={activeCell.row}
            cell={currentCell}
            basePts={state.jeopardy.basePts}
            mode="question"
            isDouble={state.jeopardy.categories[activeCell.col]?.doubleIndex === activeCell.row}
            doubleSettings={state.jeopardy.doubleSettings ?? { text: 'DOUBLE POINTS!', image: null, audio: null }}
            activePlayer={activePlayer}
            halfPoints={halfPoints}
            initiatorId={initiatorId}
            onBack={async () => {
              if (initiatorId && state.activePlayerId !== initiatorId) {
                await api.setActivePlayer(initiatorId); refresh()
              }
              setInitiatorId(null); setQuestionRound(1); setScreen('jeopardy')
            }}
            onReveal={() => setScreen('answer')}
            onAward={async () => {
              const curIdx  = state.players.findIndex(p => p.id === state.activePlayerId)
              const nextIdx = curIdx >= 0 ? (curIdx + 1) % state.players.length : -1
              const initiatorPlayer = state.players.find(p => p.id === initiatorId) ?? (curIdx >= 0 ? state.players[curIdx] : null)
              const nextPlayer = nextIdx >= 0 ? state.players[nextIdx] : null
              setInitiatorId(null); setQuestionRound(1)
              const showTransition = !!(nextPlayer?.color && initiatorPlayer?.color && nextPlayer.id !== initiatorPlayer.id && state.players.length > 1)
              if (showTransition) {
                // Change screen first so board is visible behind the overlay
                setScreen('jeopardy')
                setTransition({ initiator: initiatorPlayer!, next: nextPlayer! })
              } else {
                setScreen('jeopardy')
              }
            }}
            onRefresh={refresh}
          />
        )}

        {screen === 'answer' && activeCell && currentCell && state.jeopardy && (
          <QuestionScreen
            col={activeCell.col}
            row={activeCell.row}
            cell={currentCell}
            basePts={state.jeopardy.basePts}
            mode="answer"
            isDouble={state.jeopardy.categories[activeCell.col]?.doubleIndex === activeCell.row}
            doubleSettings={state.jeopardy.doubleSettings ?? { text: 'DOUBLE POINTS!', image: null, audio: null }}
            activePlayer={activePlayer}
            halfPoints={halfPoints}
            initiatorId={initiatorId}
            onBack={async () => {
              if (initiatorId && state.activePlayerId !== initiatorId) {
                await api.setActivePlayer(initiatorId); refresh()
              }
              setInitiatorId(null); setQuestionRound(1); setScreen('jeopardy')
            }}
            onReveal={() => {}}
            onAward={async () => {
              const curIdx  = state.players.findIndex(p => p.id === state.activePlayerId)
              const nextIdx = curIdx >= 0 ? (curIdx + 1) % state.players.length : -1
              const initiatorPlayer = state.players.find(p => p.id === initiatorId) ?? (curIdx >= 0 ? state.players[curIdx] : null)
              const nextPlayer = nextIdx >= 0 ? state.players[nextIdx] : null
              setInitiatorId(null); setQuestionRound(1)
              const showTransition = !!(nextPlayer?.color && initiatorPlayer?.color && nextPlayer.id !== initiatorPlayer.id && state.players.length > 1)
              if (showTransition) {
                setScreen('jeopardy')
                setTransition({ initiator: initiatorPlayer!, next: nextPlayer! })
              } else {
                setScreen('jeopardy')
              }
            }}
            onRefresh={refresh}
          />
        )}

        {screen === 'commonlink' && (
          <CLBoardView
            board={state.commonLink ?? null}
            onBack={() => setScreen('home')}
            onQuestionClick={handleCLCellClick}
            onRefresh={refresh}
          />
        )}

        {screen === 'cl_question' && clActiveCell && clCat && clQ && (
          <CLQuestionScreen
            catIndex={clActiveCell.catIndex}
            qIndex={clActiveCell.qIndex}
            question={clQ}
            variant={clCat.variant as import('@/types').CLVariant}
            points={clCat.points}
            activePlayer={activePlayer}
            onBack={() => setScreen('commonlink')}
            onAward={() => setScreen('commonlink')}
            onRefresh={refresh}
          />
        )}
      </div>
      {/* Turn transition overlay */}
      {transition && (
        <TurnTransition
          initiator={transition.initiator}
          next={transition.next}
          onComplete={() => setTransition(null)}
        />
      )}
    </>
  )
}