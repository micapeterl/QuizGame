'use client'
import { Users } from 'lucide-react'
import type { Player } from '@/types'
import { getInitial } from '@/lib/colors'

// ── D20 SVG icon ─────────────────────────────────────────────────────────────
function D20Icon({ number, color }: { number: number; color: string }) {
  return (
    <svg viewBox="0 0 40 40" width="40" height="40" xmlns="http://www.w3.org/2000/svg">
      {/* Outer icosahedron silhouette — simple polygon approximation */}
      <polygon
        points="20,2 37,12 37,28 20,38 3,28 3,12"
        fill={color + '22'}
        stroke={color}
        strokeWidth="1.5"
      />
      {/* Inner triangle lines for facet feel */}
      <line x1="20" y1="2"  x2="20" y2="38" stroke={color} strokeWidth="0.6" opacity="0.4" />
      <line x1="3"  y1="12" x2="37" y2="28" stroke={color} strokeWidth="0.6" opacity="0.4" />
      <line x1="37" y1="12" x2="3"  y2="28" stroke={color} strokeWidth="0.6" opacity="0.4" />
      {/* Number */}
      <text
        x="20" y="24"
        textAnchor="middle"
        fontSize={number >= 10 ? "11" : "13"}
        fontWeight="900"
        fontFamily="inherit"
        fill={color}
      >
        {number}
      </text>
    </svg>
  )
}

// ── Speech bubble ─────────────────────────────────────────────────────────────
function RollBubble({ number, color, visible }: { number: number; color: string; visible: boolean }) {
  return (
    <div
      className="absolute left-1/2 flex flex-col items-center pointer-events-none z-50"
      style={{
        top: 'calc(100% + 6px)',
        transform: 'translateX(-50%)',
        opacity: visible ? 1 : 0,
        transition: visible ? 'opacity 0.2s ease' : 'opacity 0.5s ease',
      }}
    >
      {/* Bubble body */}
      <div
        className="rounded-lg px-2 py-1.5 shadow-lg"
        style={{
          background: '#1a1a1a',
          border: `1.5px solid ${color}`,
          boxShadow: `0 0 12px ${color}40`,
        }}
      >
        <D20Icon number={number} color={color} />
      </div>
      {/* Tail pointing up */}
      <div
        className="w-0 h-0 -mt-px"
        style={{
          borderLeft: '5px solid transparent',
          borderRight: '5px solid transparent',
          borderBottom: `6px solid ${color}`,
          order: -1,
          marginBottom: '-1px',
        }}
      />
    </div>
  )
}

// ── Main TopBar ───────────────────────────────────────────────────────────────
interface TopBarProps {
  players: Player[]
  activePlayerId: string | null
  rollResults: Record<string, number>   // playerId → roll (1-20), empty when not rolling
  onToggleSidebar: () => void
  finalGuessPlayerId: string | null
  nextPlayerLocked: boolean
  onSetActive: (id: string) => void
  onAdvanceTurn: () => void
}

export default function TopBar({ players, activePlayerId, rollResults, finalGuessPlayerId, nextPlayerLocked, onToggleSidebar, onSetActive, onAdvanceTurn }: TopBarProps) {
  const isRolling = Object.keys(rollResults).length > 0

  return (
    <header
      className="fixed top-0 left-0 right-0 bg-bg-topbar border-b border-border-subtle z-40
                 flex items-center gap-3 px-4"
      style={{
        height: finalGuessPlayerId !== null ? '96px' : players.some(p => p.id === activePlayerId) ? '80px' : '52px',
        transition: 'height 0.25s ease',
        overflow: isRolling ? 'visible' : 'hidden',
      }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-[30px] h-[30px] bg-accent rounded-sm flex items-center justify-center
                        text-[11px] font-black text-tx-accent select-none">
          QA
        </div>
        <span className="text-[15px] font-bold tracking-tight text-tx-primary">Quiz Arena</span>
      </div>

      {/* Divider */}
      <div className="w-px bg-border flex-shrink-0 self-stretch my-2" />

      {/* Player chips */}
      <div
        className="flex-1 flex items-center gap-2 no-scrollbar py-1"
        style={{ overflowX: isRolling ? 'visible' : 'auto' }}
      >
        {players.map(p => {
          const color    = p.color
          const isActive = p.id === activePlayerId
          const roll     = rollResults[p.id]
          const bubbleVisible = roll !== undefined

          return isActive ? (
            <div key={p.id} data-playerid={p.id} className="relative flex-shrink-0 flex flex-col items-center gap-0.5">
              {/* Final Guess label on active chip */}
              {finalGuessPlayerId === p.id && (
                <span className="text-[9px] font-black uppercase tracking-widest text-red-400 leading-none">
                  Final Guess
                </span>
              )}
              <button
                onClick={() => onSetActive(p.id)}
                title={`${p.name} — active player`}
                className="flex items-center gap-3 rounded-xl px-3 py-2 border-2 cursor-pointer transition-all duration-200"
                style={{ borderColor: finalGuessPlayerId === p.id ? '#e05d5d' : color, background: `${color}12`, boxShadow: `0 0 16px ${color}28` }}
              >
                <div className="w-[52px] h-[52px] rounded-full overflow-hidden flex-shrink-0
                               flex items-center justify-center text-[18px] font-black border-2"
                  style={{ borderColor: color, background: '#1a1a1a', color: '#888' }}>
                  {p.avatar
                    ? <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                    : getInitial(p.name)}
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="text-[15px] font-bold text-tx-primary tracking-tight">{p.name}</span>
                  <span className="text-[20px] font-black leading-none" style={{ color }}>
                    {p.points} <span className="text-[11px] font-semibold tracking-wide">PTS</span>
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color, opacity: 0.7 }}>
                    Active Turn
                  </span>
                </div>
              </button>
              {bubbleVisible && <RollBubble number={roll} color={color} visible={bubbleVisible} />}
            </div>
          ) : (
            <div key={p.id} data-playerid={p.id} className="relative flex-shrink-0">
              <button
                onClick={() => onSetActive(p.id)}
                title={`${p.name} — click to set as active`}
                className="flex items-center gap-1.5 rounded-full px-2.5 pr-3 py-0.5
                           border cursor-pointer transition-all duration-200 opacity-60 hover:opacity-100"
                style={{ borderColor: '#2a2a2a', background: 'transparent' }}
              >
                <div className="w-[26px] h-[26px] rounded-full overflow-hidden flex-shrink-0
                               flex items-center justify-center text-[10px] font-bold text-tx-secondary border-[1.5px]"
                  style={{ borderColor: 'transparent', background: '#1a1a1a' }}>
                  {p.avatar
                    ? <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                    : getInitial(p.name)}
                </div>
                <div className="flex flex-col leading-none">
                  <span className="text-[12px] font-medium text-tx-primary">{p.name}</span>
                  <span className="text-[11px] font-semibold" style={{ color }}>{p.points} pts</span>
                </div>
              </button>
              {bubbleVisible && <RollBubble number={roll} color={color} visible={bubbleVisible} />}
            </div>
          )
        })}

        {players.length === 0 && (
          <span className="text-[12px] text-tx-dim pl-1">No players — add one to get started</span>
        )}
      </div>

      {/* Next Player button — only shown when there are players */}
      {players.length > 1 && (
        <button
          onClick={nextPlayerLocked ? undefined : onAdvanceTurn}
          disabled={nextPlayerLocked}
          title={nextPlayerLocked ? 'This is the final guess — Next Player is locked' : undefined}
          className={`flex-shrink-0 flex items-center gap-1.5 text-[13px] font-medium
                     rounded px-3 py-1.5 transition-all border
                     ${nextPlayerLocked
                       ? 'border-border bg-bg-card text-tx-dim cursor-not-allowed opacity-60'
                       : 'bg-bg-card border-border hover:border-border-focus text-tx-secondary hover:text-tx-primary cursor-pointer'
                     }`}
        >
          {nextPlayerLocked ? '🔒' : 'Next Player →'}
        </button>
      )}

      {/* Players button */}
      <button
        onClick={onToggleSidebar}
        className="flex-shrink-0 flex items-center gap-1.5 text-[13px] font-medium
                   text-tx-secondary hover:text-tx-primary bg-bg-card border border-border
                   hover:border-border-focus rounded px-3 py-1.5 transition-all"
      >
        <Users size={14} />
        Players
      </button>
    </header>
  )
}