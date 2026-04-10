'use client'
import { Users } from 'lucide-react'
import type { Player } from '@/types'
import { getInitial } from '@/lib/colors'

interface TopBarProps {
  players: Player[]
  activePlayerId: string | null
  onToggleSidebar: () => void
  onSetActive: (id: string) => void
}

export default function TopBar({ players, activePlayerId, onToggleSidebar, onSetActive }: TopBarProps) {
  return (
    <header className="fixed top-0 left-0 right-0 bg-bg-topbar border-b border-border-subtle z-40
                       flex items-center gap-3 px-4"
            style={{ height: players.some(p => p.id === activePlayerId) ? '80px' : '52px',
                     transition: 'height 0.25s ease' }}>

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
      <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {players.map(p => {
          const color    = p.color
          const isActive = p.id === activePlayerId

          return isActive ? (
            /* ── ACTIVE player — large chip ── */
            <button
              key={p.id}
              onClick={() => onSetActive(p.id)}
              title={`${p.name} — active player`}
              className="flex items-center gap-3 flex-shrink-0 rounded-xl px-3 py-2
                         border-2 cursor-pointer transition-all duration-200"
              style={{
                borderColor: color,
                background: `${color}12`,
                boxShadow: `0 0 16px ${color}28`,
              }}
            >
              {/* Large avatar */}
              <div
                className="w-[52px] h-[52px] rounded-full overflow-hidden flex-shrink-0
                           flex items-center justify-center text-[18px] font-black
                           border-2"
                style={{ borderColor: color, background: '#1a1a1a', color: '#888' }}
              >
                {p.avatar
                  ? <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                  : getInitial(p.name)
                }
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="text-[15px] font-bold text-tx-primary tracking-tight">{p.name}</span>
                <span className="text-[20px] font-black leading-none" style={{ color }}>
                  {p.points}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color, opacity: 0.7 }}>
                  pts · active turn
                </span>
              </div>
            </button>
          ) : (
            /* ── INACTIVE player — small chip ── */
            <button
              key={p.id}
              onClick={() => onSetActive(p.id)}
              title={`${p.name} — click to set as active`}
              className="flex items-center gap-1.5 flex-shrink-0 rounded-full px-2.5 pr-3 py-0.5
                         border cursor-pointer transition-all duration-200 opacity-60 hover:opacity-100"
              style={{ borderColor: '#2a2a2a', background: 'transparent' }}
            >
              <div
                className="w-[26px] h-[26px] rounded-full overflow-hidden flex-shrink-0
                           flex items-center justify-center text-[10px] font-bold text-tx-secondary
                           border-[1.5px]"
                style={{ borderColor: 'transparent', background: '#1a1a1a' }}
              >
                {p.avatar
                  ? <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                  : getInitial(p.name)
                }
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-[12px] font-medium text-tx-primary">{p.name}</span>
                <span className="text-[11px] font-semibold" style={{ color }}>{p.points} pts</span>
              </div>
            </button>
          )
        })}

        {players.length === 0 && (
          <span className="text-[12px] text-tx-dim pl-1">No players — add one to get started</span>
        )}
      </div>

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