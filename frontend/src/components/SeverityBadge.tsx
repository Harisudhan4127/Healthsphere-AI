import { getSeverityStyles } from '@/lib/utils'

export function SeverityBadge({ severity }: { severity: string }) {
  const styles = getSeverityStyles(severity)
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${styles}`}>
      {severity}
    </span>
  )
}