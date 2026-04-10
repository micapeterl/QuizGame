// ── Players ───────────────────────────────────────────
export interface Player {
  id: string
  name: string
  avatar: string | null   // base64 dataURL or null
  points: number
  color: string           // hex color, e.g. '#f5a623'
}

// ── Jeopardy ──────────────────────────────────────────
export interface JeopardyContent {
  text: string
  image: string | null    // base64 dataURL or null
}

export interface JeopardyCell {
  question: JeopardyContent
  answer: JeopardyContent
  answered: boolean
}

export interface JeopardyCategory {
  name: string
  bgImage: string | null
}

export interface JeopardyBoard {
  id: string
  cols: number
  rows: number
  basePts: number
  categories: JeopardyCategory[]
  cells: JeopardyCell[][]   // [col][row]
}

// ── Home settings ─────────────────────────────────────
export interface GameCard {
  id: string
  name: string
  bgImage: string | null
  desc: string
  available: boolean
}

export interface HomeSettings {
  title: string
  font: string
  cards: GameCard[]
}

// ── Game state (persisted) ────────────────────────────
export interface GameState {
  players: Player[]
  activePlayerId: string | null
  jeopardy: JeopardyBoard | null
  homeSettings: HomeSettings
}

// ── API responses ─────────────────────────────────────
export interface ApiResponse<T = unknown> {
  ok: boolean
  data?: T
  error?: string
}