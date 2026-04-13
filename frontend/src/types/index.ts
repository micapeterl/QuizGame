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
  doubleIndex: number | null
}

export interface DoubleSettings {
  text: string
  image: string | null
  audio: string | null
}

export interface JeopardyBoard {
  id: string
  cols: number
  rows: number
  basePts: number
  categories: JeopardyCategory[]
  cells: JeopardyCell[][]   // [col][row]
  doubleSettings: DoubleSettings
}

// ── Home settings ─────────────────────────────────────
export interface GameCard {
  id: string
  name: string
  bgImage: string | null
  desc: string
  available: boolean
}

export interface CustomFont {
  label: string       // display name entered by user
  value: string       // same as label, used as CSS font-family
  dataUrl: string     // base64 data URL of the font file
  format: string      // 'truetype' | 'opentype' | 'woff' | 'woff2'
}

export interface HomeSettings {
  title: string
  font: string
  cards: GameCard[]
  customFonts: CustomFont[]
}

// ── Common Link game ──────────────────────────────────
export type CLVariant = 'common_link' | 'odd_one_out' | 'sequence'

export interface CLSlot {
  text: string
  image: string | null
}

export interface CLQuestion {
  variant: CLVariant
  slots: CLSlot[]
  answerText: string
  answerIndex: number | null   // odd_one_out
  hiddenIndex: number | null   // sequence
  answered: boolean
}

export interface CLCategory {
  variant: CLVariant
  name: string
  description: string
  bgImage: string | null
  points: number
  questions: CLQuestion[]
}

export interface CLBoard {
  id: string
  categories: CLCategory[]
}

// ── Game state (persisted) ────────────────────────────
export interface GameState {
  players: Player[]
  activePlayerId: string | null
  jeopardy: JeopardyBoard | null
  commonLink: CLBoard | null
  homeSettings: HomeSettings
}

// ── API responses ─────────────────────────────────────
export interface ApiResponse<T = unknown> {
  ok: boolean
  data?: T
  error?: string
}