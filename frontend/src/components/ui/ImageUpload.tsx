'use client'
import { useRef } from 'react'
import { Upload, X } from 'lucide-react'

interface ImageUploadProps {
  label: string
  value: string | null
  onChange: (val: string | null) => void
}

export default function ImageUpload({ label, value, onChange }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => onChange(ev.target?.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] font-medium text-tx-secondary">{label}</label>
      <div
        className="bg-bg-input border border-dashed border-border rounded cursor-pointer
                   hover:border-border-focus hover:bg-bg-hover transition-colors
                   flex flex-col items-center justify-center gap-2 min-h-[68px] p-4"
        onClick={() => inputRef.current?.click()}
      >
        {value ? (
          <>
            <img src={value} alt="upload preview" className="max-h-[100px] max-w-full rounded object-cover" />
            <button
              onClick={e => { e.stopPropagation(); onChange(null) }}
              className="flex items-center gap-1 text-[11px] px-2 py-1 rounded
                         bg-red-500/10 border border-red-500/25 text-red-400
                         hover:bg-red-500/20 transition-colors"
            >
              <X size={10} /> Remove image
            </button>
          </>
        ) : (
          <>
            <Upload size={16} className="text-tx-dim" />
            <span className="text-[12px] text-tx-dim">Click to upload</span>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
      </div>
    </div>
  )
}