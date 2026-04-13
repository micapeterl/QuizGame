import type { JeopardyBoard } from '@/types'

/**
 * Resolve the effective timer duration (in seconds) for a specific cell.
 * Returns 0 if the timer should be disabled for this cell.
 *
 * Priority:
 *   1. Cell timerOverride (if set) — used as-is, no increment applied
 *   2. Category timerOverride + category/board increment
 *   3. Board baseTimer + board increment
 *
 * In all cases, 0 means disabled.
 */
export function resolveTimer(
  board: JeopardyBoard,
  col: number,
  row: number,
): number {
  const cell     = board.cells[col]?.[row]
  const category = board.categories[col]

  // 1. Cell-level override (no increment applied)
  if (cell?.timerOverride !== null && cell?.timerOverride !== undefined) {
    return cell.timerOverride   // 0 = disabled for this question
  }

  // 2. Category-level override
  if (category?.timerOverride !== null && category?.timerOverride !== undefined) {
    const base      = category.timerOverride
    if (base === 0) return 0   // disabled for whole category
    const increment = category.timerIncrementOverride !== null && category.timerIncrementOverride !== undefined
      ? category.timerIncrementOverride
      : board.timerIncrement
    return Math.max(0, base + increment * row)
  }

  // 3. Board-level
  const base = board.baseTimer
  if (base === 0) return 0     // disabled board-wide
  return Math.max(0, base + board.timerIncrement * row)
}