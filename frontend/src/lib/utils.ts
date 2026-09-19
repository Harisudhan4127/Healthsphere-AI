import type { RiskLevel } from '@/types'

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatNumber(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined) return '—'
  return value.toLocaleString(undefined, { maximumFractionDigits: decimals })
}

export const riskStyles: Record<RiskLevel, { badge: string; bar: string; label: string }> = {
  LOW: {
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    bar: 'bg-emerald-500',
    label: 'Low',
  },
  MODERATE: {
    badge: 'bg-amber-50 text-amber-700 ring-amber-600/25',
    bar: 'bg-amber-500',
    label: 'Moderate',
  },
  ELEVATED: {
    badge: 'bg-orange-50 text-orange-700 ring-orange-600/25',
    bar: 'bg-orange-500',
    label: 'Elevated',
  },
  HIGH: {
    badge: 'bg-red-50 text-red-700 ring-red-600/20',
    bar: 'bg-red-500',
    label: 'High',
  },
}

export const severityStyles: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-700 ring-slate-500/20',
  MODERATE: 'bg-amber-50 text-amber-700 ring-amber-600/25',
  HIGH: 'bg-orange-50 text-orange-700 ring-orange-600/25',
  CRITICAL: 'bg-red-50 text-red-700 ring-red-600/20',
}

export function getRiskStyles(level: RiskLevel | string | null | undefined) {
  return riskStyles[(level as RiskLevel) || 'LOW'] || riskStyles.LOW
}

export function getSeverityStyles(severity: string | null | undefined) {
  return severityStyles[(severity || 'LOW').toUpperCase()] || severityStyles.LOW
}