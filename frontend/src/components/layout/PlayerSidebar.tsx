'use client'
import { useState, useRef } from 'react'
import { X, Plus, Pencil, Trash2, GripVertical } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import ImageUpload from '@/components/ui/ImageUpload'
import ColorPicker from '@/components/ui/ColorPicker'
import { FormField, inputClass } from '@/components/ui/FormField'
import type { Player } from '@/types'
import { getDefaultColor, getInitial } from '@/lib/colors'
import * as api from '@/lib/api'

interface PlayerSidebarProps {
  open: boolean
  onClose: () => void
  players: Player[]
  onRefresh: () => void
}

const emptyForm = { name: '', points: 0, avatar: null as string | null, color: '#f5a623' }

export default function PlayerSidebar({ open, onClose, players, onRefresh }: PlayerSidebarProps) {
  // ── Edit modal state ───────────────────────────────
  const [modalOpen, setModalOpen]     = useState(false)
  const [editingId, setEditingId]     = useState<string | null>(null)
  const [form, setForm]               = useState(emptyForm)
  const [saving, setSaving]           = useState(false)
  const [colorPickerOpen, setColorPickerOpen] = useState(false)

  // ── Drag state ────────────────────────────────────
  const [dragOrder, setDragOrder]     = useState<Player[] | null>(null)
  const dragIndexRef                  = useRef<number | null>(null)
  const dragOverIndexRef              = useRef<number | null>(null)

  const displayPlayers = dragOrder ?? players

  // ── Edit/Add handlers ─────────────────────────────
  function openAdd() {
    setEditingId(null)
    setColorPickerOpen(false)
    const defaultColor = getDefaultColor(players.length)
    setForm({ ...emptyForm, color: defaultColor })
    setModalOpen(true)
  }

  function openEdit(p: Player) {
    setEditingId(p.id)
    setColorPickerOpen(false)
    // Guard against old state.json players that have colorIndex but no color yet
    const safeColor = p.color && p.color.startsWith('#') ? p.color : getDefaultColor(players.indexOf(p))
    setForm({ name: p.name, points: p.points, avatar: p.avatar, color: safeColor })
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (editingId) {
        await api.updatePlayer(editingId, form)
      } else {
        await api.addPlayer({ name: form.name.trim(), points: form.points, avatar: form.avatar, color: form.color })
      }
      onRefresh()
      setModalOpen(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    await api.deletePlayer(id)
    onRefresh()
  }

  // ── Drag handlers ─────────────────────────────────
  function onDragStart(e: React.DragEvent, index: number) {
    dragIndexRef.current = index
    setDragOrder([...players])
    e.dataTransfer.effectAllowed = 'move'
    const ghost = document.createElement('div')
    ghost.style.position = 'absolute'
    ghost.style.top = '-9999px'
    document.body.appendChild(ghost)
    e.dataTransfer.setDragImage(ghost, 0, 0)
    setTimeout(() => document.body.removeChild(ghost), 0)
  }

  function onDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    const from = dragIndexRef.current
    if (from === null || from === index) return
    if (dragOverIndexRef.current === index) return
    dragOverIndexRef.current = index
    setDragOrder(prev => {
      const list = [...(prev ?? players)]
      const [moved] = list.splice(from, 1)
      list.splice(index, 0, moved)
      dragIndexRef.current = index
      return list
    })
  }

  async function onDrop(e: React.DragEvent) {
    e.preventDefault()
    if (!dragOrder) return
    const ids = dragOrder.map(p => p.id)
    dragIndexRef.current = null
    dragOverIndexRef.current = null
    await api.reorderPlayers(ids)
    setDragOrder(null)
    onRefresh()
  }

  function onDragEnd() {
    dragIndexRef.current = null
    dragOverIndexRef.current = null
    setDragOrder(null)
  }

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/40" onClick={onClose} />}

      <aside
        className={`fixed top-0 right-0 bottom-0 z-40 w-[280px]
                    bg-bg-panel border-l border-border-subtle flex flex-col
                    transition-transform duration-200
                    ${open ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ paddingTop: '52px' }}
      >
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border-subtle flex-shrink-0">
          <span className="text-[13px] font-semibold text-tx-primary">Players</span>
          <button onClick={onClose} className="text-tx-secondary hover:text-tx-primary transition-colors p-1 rounded">
            <X size={15} />
          </button>
        </div>

        <div
          className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-0.5"
          onDragOver={e => e.preventDefault()}
          onDrop={onDrop}
        >
          {players.length === 0 && (
            <p className="text-[12px] text-tx-dim text-center py-8 leading-relaxed px-4">
              No players yet.<br />Add one below to get started.
            </p>
          )}

          {displayPlayers.map((p, index) => {
            const isDragging = dragOrder !== null && dragIndexRef.current === index
            const color = (p.color && p.color.startsWith('#')) ? p.color : getDefaultColor(index)
            return (
              <div
                key={p.id}
                draggable
                onDragStart={e => onDragStart(e, index)}
                onDragOver={e => onDragOver(e, index)}
                onDragEnd={onDragEnd}
                className={`flex items-center gap-2.5 px-2 py-2 rounded-lg
                            transition-all duration-100 group select-none
                            ${isDragging ? 'opacity-40 scale-[0.97] bg-bg-hover' : 'hover:bg-bg-hover'}`}
              >
                <div className="flex-shrink-0 text-tx-dim group-hover:text-tx-secondary transition-colors cursor-grab active:cursor-grabbing">
                  <GripVertical size={14} />
                </div>

                {/* Color dot */}
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-black/20"
                  style={{ background: color }}
                />

                <div
                  className="w-[34px] h-[34px] rounded-full overflow-hidden flex-shrink-0
                             flex items-center justify-center text-[13px] font-bold
                             text-tx-secondary border bg-bg-card"
                  style={{ borderColor: color + '60' }}
                >
                  {p.avatar
                    ? <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                    : getInitial(p.name)
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-tx-primary truncate">{p.name}</div>
                  <div className="text-[12px] font-semibold" style={{ color }}>{p.points} pts</div>
                </div>

                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(p)}
                    className="w-[26px] h-[26px] rounded border border-border text-tx-dim
                               hover:border-border-focus hover:text-tx-secondary
                               flex items-center justify-center transition-all"
                  >
                    <Pencil size={11} />
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="w-[26px] h-[26px] rounded border border-border text-tx-dim
                               hover:border-red-500/50 hover:text-red-400
                               flex items-center justify-center transition-all"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="p-3 border-t border-border-subtle flex-shrink-0">
          <button
            onClick={openAdd}
            className="w-full flex items-center justify-center gap-1.5
                       bg-accent hover:bg-accent-hover text-tx-accent
                       text-[13px] font-semibold rounded py-2 transition-colors"
          >
            <Plus size={14} /> Add Player
          </button>
        </div>
      </aside>

      {/* Add / Edit modal */}
      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setColorPickerOpen(false) }}
        title={editingId ? 'Edit Player' : 'Add Player'}
      >
        <ImageUpload
          label="Profile Photo"
          value={form.avatar}
          onChange={val => setForm(f => ({ ...f, avatar: val }))}
        />

        {/* Name + color swatch button side by side */}
        <FormField label="Name">
          <div className="flex gap-2 items-center">
            <input
              className={inputClass + ' flex-1'}
              placeholder="Player name..."
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
              autoFocus
            />
            {/* Color swatch button */}
            <button
              type="button"
              onClick={() => setColorPickerOpen(o => !o)}
              title="Pick player color"
              className="flex-shrink-0 w-9 h-9 rounded border-2 transition-all"
              style={{
                background: form.color,
                borderColor: colorPickerOpen ? '#fff' : form.color + '80',
                boxShadow: colorPickerOpen ? `0 0 0 2px ${form.color}60` : 'none',
              }}
            />
          </div>
        </FormField>

        {/* Inline color picker — expands below name row */}
        {colorPickerOpen && (
          <div className="bg-bg-card border border-border rounded-lg p-3">
            <ColorPicker
              value={form.color}
              onChange={hex => setForm(f => ({ ...f, color: hex }))}
            />
          </div>
        )}

        <FormField label="Points">
          <input
            className={inputClass}
            type="number"
            value={form.points}
            onChange={e => setForm(f => ({ ...f, points: +e.target.value }))}
          />
        </FormField>

        <div className="flex gap-2 justify-end pt-1.5 border-t border-border-subtle mt-1">
          <button
            onClick={() => { setModalOpen(false); setColorPickerOpen(false) }}
            className="px-4 py-2 text-[13px] font-medium text-tx-secondary border border-border
                       hover:border-border-focus hover:text-tx-primary rounded transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.name.trim()}
            className="px-4 py-2 text-[13px] font-semibold bg-accent hover:bg-accent-hover
                       text-tx-accent rounded transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Player'}
          </button>
        </div>
      </Modal>
    </>
  )
}