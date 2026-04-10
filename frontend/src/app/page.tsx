'use client'
import { useCallback, useEffect, useState } from 'react'
import type { GameState, HomeSettings } from '@/types'
import * as api from '@/lib/api'
import { applyFont } from '@/components/games/HomeScreen'

import TopBar from '@/components/layout/TopBar'
import PlayerSidebar from '@/components/layout/PlayerSidebar'
import HomeScreen from '@/components/games/HomeScreen'
import JeopardyBoardView from '@/components/games/jeopardy/BoardView'
import QuestionScreen from '@/components/games/jeopardy/QuestionScreen'

type Screen = 'home' | 'jeopardy' | 'question' | 'answer'

export default function Page() {
  const [state, setState]           = useState<GameState | null>(null)
  const [screen, setScreen]         = useState<Screen>('home')
  const [sidebarOpen, setSidebar]   = useState(false)
  const [activeCell, setActiveCell] = useState<{ col: number; row: number } | null>(null)
  const [loading, setLoading]       = useState(true)

  const refresh = useCallback(async () => {
    const data = await api.getState()
    setState(data)
    // Apply saved font on every refresh so it persists across page loads
    if (data.homeSettings?.font) applyFont(data.homeSettings.font)
  }, [])

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [refresh])

  async function handleSetActive(id: string) {
    const newId = state?.activePlayerId === id ? null : id
    await api.setActivePlayer(newId)
    refresh()
  }

  function handleCellClick(col: number, row: number) {
    setActiveCell({ col, row })
    setScreen('question')
  }

  function handleSettingsChange(updated: HomeSettings) {
    if (!state) return
    setState({ ...state, homeSettings: updated })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-bg-root">
        <div className="flex items-center gap-2 text-tx-secondary text-[14px]">
          <span className="animate-spin text-accent text-lg">⚡</span>
          Loading Quiz Arena...
        </div>
      </div>
    )
  }

  if (!state) {
    return (
      <div className="flex items-center justify-center h-full bg-bg-root">
        <div className="text-tx-secondary text-[13px]">
          Cannot connect to backend. Make sure the server is running.
        </div>
      </div>
    )
  }

  const activePlayer = state.activePlayerId
    ? state.players.find(p => p.id === state.activePlayerId) ?? null
    : null

  const currentCell = activeCell && state.jeopardy
    ? state.jeopardy.cells[activeCell.col]?.[activeCell.row] ?? null
    : null

  return (
    <div className="flex flex-col h-full">
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

      <main
        className="flex-1 overflow-hidden"
        style={{ marginTop: state.players.some(p => p.id === state.activePlayerId) ? '80px' : '52px', transition: 'margin-top 0.25s ease' }}
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
            activePlayer={activePlayer}
            onBack={() => setScreen('jeopardy')}
            onReveal={() => {}}
            onAward={() => setScreen('jeopardy')}
            onRefresh={refresh}
          />
        )}
      </main>
    </div>
  )
}