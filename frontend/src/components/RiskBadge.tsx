import { getRiskStyles } from '@/lib/utils'
import type { RiskLevel } from '@/types'

export function RiskBadge({ level, score }: { level: RiskLevel | string | null | undefined; score?: number | null }) {
  const styles = getRiskStyles(level)
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${styles.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${styles.bar}`} />
      {styles.label}
      {score !== undefined && score !== null && <span className="opacity-70">{score.toFixed(0)}</span>}
    </span>
  )
}