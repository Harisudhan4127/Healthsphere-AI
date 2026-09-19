import { Inbox } from 'lucide-react'

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
        <Inbox className="h-6 w-6" />
      </div>
      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{title}</p>
      {description && <p className="max-w-sm text-xs text-slate-500 dark:text-slate-400">{description}</p>}
    </div>
  )
}