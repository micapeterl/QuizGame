import axios from 'axios'
import type { GameState, Player, JeopardyBoard } from '@/types'

const api = axios.create({ baseURL: '/api' })

// ── Game state ────────────────────────────────────────
export const getState = () =>
  api.get<GameState>('/state').then(r => r.data)

// ── Players ───────────────────────────────────────────
export const addPlayer = (data: Omit<Player, 'id'>) =>
  api.post<Player>('/players', data).then(r => r.data)

export const updatePlayer = (id: string, data: Partial<Player>) =>
  api.patch<Player>(`/players/${id}`, data).then(r => r.data)

export const deletePlayer = (id: string) =>
  api.delete(`/players/${id}`).then(r => r.data)

export const setActivePlayer = (id: string | null) =>
  api.post('/players/active', { id }).then(r => r.data)

export const awardPoints = (playerId: string, points: number) =>
  api.post('/players/award', { player_id: playerId, points }).then(r => r.data)

// ── Jeopardy ──────────────────────────────────────────
export const buildJeopardyBoard = (cols: number, rows: number, basePts: number) =>
  api.post<JeopardyBoard>('/jeopardy/build', { cols, rows, base_pts: basePts }).then(r => r.data)

export const updateCategory = (col: number, name: string, bgImage: string | null) =>
  api.patch('/jeopardy/category', { col, name, bg_image: bgImage }).then(r => r.data)

export const updateCell = (
  col: number, row: number,
  side: 'question' | 'answer',
  text: string, image: string | null
) =>
  api.patch('/jeopardy/cell', { col, row, side, text, image }).then(r => r.data)

export const markAnswered = (col: number, row: number, answered: boolean) =>
  api.patch('/jeopardy/cell/answered', { col, row, answered }).then(r => r.data)

// ── Home settings ─────────────────────────────────────────────────────────────
export const updateHomeSettings = (settings: import('@/types').HomeSettings) =>
  api.patch('/home-settings', settings).then(r => r.data)

export const resetBoard = () =>
  api.post('/jeopardy/reset').then(r => r.data)

export const advanceTurn = () =>
  api.post('/players/advance-turn').then(r => r.data)

export const reorderPlayers = (ids: string[]) =>
  api.post('/players/reorder', { ids }).then(r => r.data)