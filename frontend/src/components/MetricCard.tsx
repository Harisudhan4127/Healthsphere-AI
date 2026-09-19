import { cn } from '@/lib/utils'

interface MetricCardProps {
  label: string
  value: string
  unit?: string
  status?: 'normal' | 'warning' | 'critical'
}

const statusDot = {
  normal: 'bg-emerald-500',
  warning: 'bg-amber-500',
  critical: 'bg-red-500',
}

export function MetricCard({ label, value, unit, status = 'normal' }: MetricCardProps) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-1.5">
        <span className={cn('h-1.5 w-1.5 rounded-full', statusDot[status])} />
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      </div>
      <p className="mt-2 text-xl font-semibold tracking-tight">
        {value}
        {unit && <span className="ml-1 text-sm font-normal text-slate-400">{unit}</span>}
      </p>
    </div>
  )
}