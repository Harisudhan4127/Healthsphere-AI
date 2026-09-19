export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center p-8 ${className}`}>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" role="status" aria-label="Loading" />
    </div>
  )
}

export function InlineSpinner() {
  return (
    <span
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600"
      role="status"
    />
  )
}