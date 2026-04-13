'use client'
import { useCallback, useEffect, useState } from 'react'
import type { GameState, HomeSettings } from '@/types'
import * as api from '@/lib/api'
import { applyFont, injectCustomFont } from '@/components/games/HomeScreen'

import TopBar from '@/components/layout/TopBar'
import PlayerSidebar from '@/components/layout/PlayerSidebar'
import HomeScreen from '@/components/games/HomeScreen'
import JeopardyBoardView from '@/components/games/jeopardy/BoardView'
import QuestionScreen from '@/components/games/jeopardy/QuestionScreen'
import CLBoardView from '@/components/games/commonlink/BoardView'
import CLQuestionScreen from '@/components/games/commonlink/QuestionScreen'

type Screen = 'home' | 'jeopardy' | 'question' | 'answer' | 'commonlink' | 'cl_question'

const TOPBAR_DEFAULT = 52
const TOPBAR_ACTIVE  = 80

export default function Page() {
  const [state, setState]             = useState<GameState | null>(null)
  const [screen, setScreen]           = useState<Screen>('home')
  const [sidebarOpen, setSidebar]     = useState(false)
  const [activeCell, setActiveCell]   = useState<{ col: number; row: number } | null>(null)
  const [clActiveCell, setCLActiveCell] = useState<{ catIndex: number; qIndex: number } | null>(null)
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

  const hasActivePlayer = state.players.some(p => p.id === state.activePlayerId)
  const topbarH         = hasActivePlayer ? TOPBAR_ACTIVE : TOPBAR_DEFAULT

  const activePlayer = state.activePlayerId
    ? state.players.find(p => p.id === state.activePlayerId) ?? null
    : null

  const currentCell = activeCell && state.jeopardy
    ? state.jeopardy.cells[activeCell.col]?.[activeCell.row] ?? null
    : null

  // CL question lookup
  const clCat = clActiveCell ? state.commonLink?.categories[clActiveCell.catIndex] ?? null : null
  const clQ   = clActiveCell && clCat ? clCat.questions[clActiveCell.qIndex] ?? null : null

  return (
    <>
      <TopBar
        players={state.players}
        activePlayerId={state.activePlayerId}
        onToggleSidebar={() => setSidebar(o => !o)}
        onSetActive={handleSetActive}
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
            onSelectGame={g => setScreen(g as Screen)}
            onSettingsChange={handleSettingsChange}
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
            onBack={() => setScreen('jeopardy')}
            onReveal={() => setScreen('answer')}
            onAward={() => setScreen('jeopardy')}
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
            onBack={() => setScreen('jeopardy')}
            onReveal={() => {}}
            onAward={() => setScreen('jeopardy')}
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
    </>
  )
}