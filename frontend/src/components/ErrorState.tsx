import { AlertTriangle } from 'lucide-react'

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500 dark:bg-red-950">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Something went wrong</p>
      <p className="max-w-sm break-words text-xs text-slate-500 dark:text-slate-400">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary mt-2">
          Retry
        </button>
      )}
    </div>
  )
}