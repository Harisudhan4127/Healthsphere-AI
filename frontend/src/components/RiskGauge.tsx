import { getRiskStyles } from '@/lib/utils'
import type { RiskLevel } from '@/types'

const levelColors: Record<RiskLevel, string> = {
  LOW: 'stroke-emerald-400',
  MODERATE: 'stroke-amber-400',
  ELEVATED: 'stroke-orange-400',
  HIGH: 'stroke-red-500',
}

export function RiskGauge({ score, level }: { score: number; level: RiskLevel | string }) {
  const numeric = Math.max(0, Math.min(100, score))
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - numeric / 100)
  const color = levelColors[(level as RiskLevel) || 'LOW']

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="140" height="140" viewBox="0 0 140 140" role="img" aria-label={`Risk score ${Math.round(numeric)} of 100`}>
        <circle cx="70" cy="70" r={radius} fill="none" strokeWidth="10" className="stroke-slate-100 dark:stroke-slate-800" />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 70 70)"
          className={`${color} transition-all duration-500`}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-3xl font-bold tracking-tight">{numeric.toFixed(0)}</p>
        <p className={`text-xs font-medium ${getRiskStyles(level).badge.split(' ')[0]}`}>
          {getRiskStyles(level).label}
        </p>
      </div>
    </div>
  )
}