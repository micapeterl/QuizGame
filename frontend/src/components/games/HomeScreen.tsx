'use client'
import { useRef, useState } from 'react'
import { Settings, Upload, X } from 'lucide-react'
import type { HomeSettings, GameCard } from '@/types'
import Modal from '@/components/ui/Modal'
import { FormField, inputClass } from '@/components/ui/FormField'
import * as api from '@/lib/api'

// ── Available fonts ───────────────────────────────────────────────────────────
export const FONTS = [
  { label: 'Inter',            value: 'Inter',            import: 'Inter:wght@400;500;600;700;800' },
  { label: 'Roboto',           value: 'Roboto',            import: 'Roboto:wght@400;500;700;900' },
  { label: 'Poppins',          value: 'Poppins',           import: 'Poppins:wght@400;500;600;700;800' },
  { label: 'Montserrat',       value: 'Montserrat',        import: 'Montserrat:wght@400;500;600;700;800' },
  { label: 'Raleway',          value: 'Raleway',           import: 'Raleway:wght@400;500;600;700;800' },
  { label: 'Oswald',           value: 'Oswald',            import: 'Oswald:wght@400;500;600;700' },
  { label: 'Playfair Display', value: 'Playfair Display',  import: 'Playfair+Display:wght@400;500;600;700;800' },
  { label: 'Source Code Pro',  value: 'Source Code Pro',   import: 'Source+Code+Pro:wght@400;500;600;700' },
  { label: 'DM Sans',          value: 'DM Sans',           import: 'DM+Sans:wght@400;500;600;700;800' },
  { label: 'Space Grotesk',    value: 'Space Grotesk',     import: 'Space+Grotesk:wght@400;500;600;700' },
  { label: 'Bebas Neue',       value: 'Bebas Neue',        import: 'Bebas+Neue' },
  { label: 'Cinzel',           value: 'Cinzel',            import: 'Cinzel:wght@400;600;700;900' },
]

interface HomeScreenProps {
  settings: HomeSettings
  onSelectGame: (game: string) => void
  onSettingsChange: (updated: HomeSettings) => void
}

// ── Small image upload button used inside the modal card rows ─────────────────
function CardImageButton({
  value,
  onChange,
}: {
  value: string | null
  onChange: (v: string | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => onChange(ev.target?.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <div className="flex-shrink-0 relative group">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        title={value ? 'Change card image' : 'Upload card image'}
        className="w-9 h-9 rounded flex items-center justify-center border transition-all overflow-hidden"
        style={{
          background: value ? 'transparent' : '#1a1a1a',
          borderColor: value ? 'transparent' : '#2a2a2a',
        }}
      >
        {value ? (
          <img src={value} alt="" className="w-full h-full object-cover rounded" />
        ) : (
          <Upload size={13} className="text-tx-dim group-hover:text-tx-secondary transition-colors" />
        )}
      </button>

      {/* Remove button — only shown when image is set */}
      {value && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onChange(null) }}
          title="Remove image"
          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-bg-panel border border-border
                     text-tx-dim hover:text-red-400 flex items-center justify-center
                     opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X size={9} />
        </button>
      )}

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function HomeScreen({ settings, onSelectGame, onSettingsChange }: HomeScreenProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [draft, setDraft]         = useState<HomeSettings>(settings)
  const [saving, setSaving]       = useState(false)

  function openModal() {
    setDraft(JSON.parse(JSON.stringify(settings)))
    setModalOpen(true)
  }

  function updateCard(index: number, field: keyof GameCard, value: string | boolean | null) {
    setDraft(d => ({
      ...d,
      cards: d.cards.map((c, i) => i === index ? { ...c, [field]: value } : c),
    }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await api.updateHomeSettings(draft)
      onSettingsChange(draft)
      applyFont(draft.font)
      setModalOpen(false)
    } finally {
      setSaving(false)
    }
  }

  // Split title on CamelCase boundary for accent coloring
  const words = settings.title.trim().split(/(?=[A-Z])/)
  const titleDisplay = words.length > 1
    ? { plain: words.slice(0, -1).join(''), accent: words[words.length - 1] }
    : { plain: '', accent: settings.title }

  return (
    <div className="relative flex flex-col items-center justify-center h-full gap-8 px-6 pb-8 overflow-y-auto">

      {/* Settings gear */}
      <button
        onClick={openModal}
        className="absolute top-4 right-4 flex items-center justify-center w-8 h-8
                   bg-bg-panel border border-border hover:border-border-focus
                   text-tx-secondary hover:text-tx-primary rounded transition-all"
        title="Edit home screen"
      >
        <Settings size={14} />
      </button>

      {/* Title */}
      <div className="text-center">
        <h1 className="text-[clamp(32px,5vw,52px)] font-black tracking-tight leading-none">
          {titleDisplay.plain}
          <span className="text-accent">{titleDisplay.accent}</span>
        </h1>
        <p className="text-[13px] text-tx-secondary mt-2">Select a game mode to get started</p>
      </div>

      {/* Game cards */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-2.5 w-full max-w-[860px]">
        {settings.cards.map(g => (
          <div
            key={g.id}
            onClick={() => g.available && onSelectGame(g.id)}
            className={`
              relative overflow-hidden bg-bg-panel border border-border-subtle rounded-lg
              p-6 text-center transition-all duration-150 min-h-[140px]
              flex flex-col items-center justify-center gap-2
              ${g.available
                ? 'cursor-pointer hover:border-border-focus hover:bg-bg-hover'
                : 'opacity-40 cursor-default'
              }
            `}
          >
            {/* Background image */}
            {g.bgImage && (
              <img
                src={g.bgImage}
                alt=""
                className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
              />
            )}

            {!g.available && (
              <span className="absolute top-2.5 right-2.5 bg-bg-card border border-border
                               text-tx-dim text-[10px] font-semibold px-1.5 py-0.5 rounded
                               uppercase tracking-wide z-10">
                Soon
              </span>
            )}

            <div className="relative z-10 text-[13px] font-bold text-tx-primary tracking-tight">{g.name}</div>
            <div className="relative z-10 text-[12px] text-tx-secondary leading-relaxed">{g.desc}</div>
          </div>
        ))}
      </div>

      {/* ── Settings modal ── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Home Screen Settings" wide>

        <FormField label="Page Title">
          <input
            className={inputClass}
            value={draft.title}
            onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
            placeholder="QuizArena"
          />
          <p className="text-[11px] text-tx-dim mt-1">
            Tip: Use CamelCase (e.g. <span className="text-tx-secondary">QuizArena</span>) — the last word gets the orange accent color.
          </p>
        </FormField>

        <FormField label="Global Font">
          <select
            className={inputClass}
            value={draft.font}
            onChange={e => setDraft(d => ({ ...d, font: e.target.value }))}
            style={{ fontFamily: draft.font }}
          >
            {FONTS.map(f => (
              <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                {f.label}
              </option>
            ))}
          </select>
          <div
            className="mt-2 px-3 py-2 bg-bg-card border border-border rounded text-[13px] text-tx-secondary"
            style={{ fontFamily: draft.font }}
          >
            The quick brown fox jumps over the lazy dog — 1234567890
          </div>
        </FormField>

        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-medium text-tx-secondary">Game Cards</label>
          <div className="flex flex-col gap-2">
            {draft.cards.map((card, i) => (
              <div
                key={card.id}
                className="flex items-center gap-2.5 bg-bg-card border border-border rounded-lg px-3 py-2.5"
              >
                {/* Image upload button — where the emoji used to be */}
                <CardImageButton
                  value={card.bgImage ?? null}
                  onChange={v => updateCard(i, 'bgImage', v)}
                />

                {/* Name input */}
                <input
                  className="flex-1 bg-bg-input border border-border text-tx-primary
                             rounded px-2.5 py-1.5 text-[13px] focus:outline-none
                             focus:border-border-focus transition-colors min-w-0"
                  value={card.name}
                  onChange={e => updateCard(i, 'name', e.target.value)}
                  placeholder="Game name"
                />

                {/* Active / Soon toggle */}
                <button
                  onClick={() => updateCard(i, 'available', !card.available)}
                  className={`flex-shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded border transition-all
                    ${card.available
                      ? 'bg-accent/10 border-accent/40 text-accent'
                      : 'bg-bg-input border-border text-tx-dim hover:border-border-focus'
                    }`}
                >
                  {card.available ? 'Active' : 'Soon'}
                </button>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-tx-dim mt-0.5">
            Click the image button on the left to set a background for each card.
          </p>
        </div>

        <div className="flex gap-2 justify-end pt-1.5 border-t border-border-subtle mt-1">
          <button
            onClick={() => setModalOpen(false)}
            className="px-4 py-2 text-[13px] font-medium text-tx-secondary border border-border
                       hover:border-border-focus hover:text-tx-primary rounded transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !draft.title.trim()}
            className="px-4 py-2 text-[13px] font-semibold bg-accent hover:bg-accent-hover
                       text-tx-accent rounded transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </Modal>
    </div>
  )
}

// ── Apply font globally ───────────────────────────────────────────────────────
export function applyFont(fontName: string) {
  const font = FONTS.find(f => f.value === fontName)
  if (!font) return
  const id = 'dynamic-font-link'
  let link = document.getElementById(id) as HTMLLinkElement | null
  if (!link) {
    link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    document.head.appendChild(link)
  }
  link.href = `https://fonts.googleapis.com/css2?family=${font.import}&display=swap`
  document.documentElement.style.setProperty('--font-override', `'${fontName}', sans-serif`)
}