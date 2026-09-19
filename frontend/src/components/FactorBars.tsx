import type { RiskFactor } from '@/types'

const impactColor: Record<string, string> = {
  low: 'bg-slate-300 dark:bg-slate-600',
  moderate: 'bg-amber-400',
  high: 'bg-red-500',
}

export function FactorBars({ factors }: { factors: RiskFactor[] }) {
  if (!factors || factors.length === 0) return null
  const max = Math.max(1, ...factors.map((f) => f.contribution || 0))

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Why did the risk change?
      </p>
      {factors.map((factor, i) => {
        const value = factor.contribution || 0
        const width = Math.max(2, (value / max) * 100)
        return (
          <div key={`${factor.name}-${i}`}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-200">{factor.name}</span>
              <span className="text-xs capitalize text-slate-500">{factor.impact} · {value.toFixed(1)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-500 ${impactColor[factor.impact] || impactColor.low}`}
                style={{ width: `${width}%` }}
              />
            </div>
            {factor.details && factor.details.length > 0 && (
              <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                {factor.details.map((d) => d.detail).join(', ')}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}