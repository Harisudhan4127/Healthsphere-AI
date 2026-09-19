import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: ReactNode
  icon: LucideIcon
  hint?: string
  tone?: 'default' | 'brand' | 'amber' | 'red' | 'emerald'
}

const tones = {
  default: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  brand: 'bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
  red: 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
}

export function StatCard({ label, value, icon: Icon, hint, tone = 'default' }: StatCardProps) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight">{value}</p>
          {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
        </div>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}>
          <Icon className="h-4.5 w-4.5" size={18} />
        </div>
      </div>
    </div>
  )
}