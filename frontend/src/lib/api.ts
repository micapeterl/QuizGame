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

// ── Common Link ───────────────────────────────────────────────────────────────
export const buildCLBoard = (
  common_link_rounds: number, odd_one_out_rounds: number, sequence_rounds: number,
  common_link_pts: number, odd_one_out_pts: number, sequence_pts: number
) => api.post('/commonlink/build', {
  common_link_rounds, odd_one_out_rounds, sequence_rounds,
  common_link_pts, odd_one_out_pts, sequence_pts,
}).then(r => r.data)

export const updateCLCategory = (
  cat_index: number, name: string, description: string, bg_image: string | null
) => api.patch('/commonlink/category', { cat_index, name, description, bg_image }).then(r => r.data)

export const updateCLQuestion = (
  cat_index: number, q_index: number,
  slots: import('@/types').CLSlot[],
  answer_text: string,
  answer_index: number | null,
  hidden_index: number | null,
) => api.patch('/commonlink/question', {
  cat_index, q_index, slots, answer_text, answer_index, hidden_index,
}).then(r => r.data)

export const markCLAnswered = (cat_index: number, q_index: number, answered: boolean) =>
  api.patch('/commonlink/question/answered', { cat_index, q_index, answered }).then(r => r.data)

export const resetCLBoard = () =>
  api.post('/commonlink/reset').then(r => r.data)

export const updateDoubleSettings = (text: string, image: string | null, audio: string | null) =>
  api.patch('/jeopardy/double-settings', { text, image, audio }).then(r => r.data)