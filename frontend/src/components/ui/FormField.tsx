interface FormFieldProps {
  label: string
  children: React.ReactNode
}

export function FormField({ label, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] font-medium text-tx-secondary">{label}</label>
      {children}
    </div>
  )
}

export const inputClass =
  'bg-bg-input border border-border text-tx-primary placeholder-tx-dim ' +
  'rounded px-3 py-2 text-[13px] w-full transition-colors ' +
  'focus:outline-none focus:border-border-focus'