import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { SeverityBadge } from '@/components/SeverityBadge'
import { Spinner } from '@/components/Spinner'
import { ErrorState } from '@/components/ErrorState'
import { EmptyState } from '@/components/EmptyState'
import { api } from '@/services/api'
import { formatDateTime } from '@/lib/utils'
import type { Alert } from '@/types'

export default function Alerts() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState('')

  const query = useQuery({
    queryKey: ['alerts', filter],
    queryFn: () => api.get<Alert[]>(`/alerts?limit=200${filter ? `&status=${filter}` : ''}`),
    refetchInterval: 30000,
  })

  const resolveMutation = useMutation({
    mutationFn: (id: string) => api.put<Alert>(`/alerts/${id}/status`, { status: 'RESOLVED' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const filters: Array<{ label: string; value: string }> = [
    { label: 'All', value: '' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Resolved', value: 'RESOLVED' },
  ]

  const alertTypeStyles: Record<string, string> = {
    EMERGENCY: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950 dark:text-red-400',
    MEDICATION: 'bg-orange-50 text-orange-700 ring-orange-600/25 dark:bg-orange-950 dark:text-orange-400',
    HEALTH: 'bg-amber-50 text-amber-700 ring-amber-600/25 dark:bg-amber-950 dark:text-amber-400',
    SYSTEM: 'bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-400',
  }

  return (
    <div>
      <PageHeader title="Alerts" subtitle="Prioritized alerts across all healthcare modules" />

      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition ${
              filter === f.value
                ? 'bg-slate-900 text-white ring-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:ring-slate-100'
                : 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {query.isLoading ? (
        <Spinner />
      ) : query.isError ? (
        <ErrorState message={query.error.message} onRetry={() => query.refetch()} />
      ) : query.data && query.data.length > 0 ? (
        <div className="card divide-y divide-slate-100 dark:divide-slate-800">
          {query.data.map((alert) => (
            <div key={alert.id} className="flex items-start gap-4 p-4">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${alertTypeStyles[alert.type] || alertTypeStyles.SYSTEM}`}>
                    {alert.type}
                  </span>
                  <SeverityBadge severity={alert.severity} />
                  <span className={`text-xs ${alert.status === 'ACTIVE' ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {alert.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-800 dark:text-slate-200">{alert.message}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {alert.patient_name ?? 'System'} · {formatDateTime(alert.created_at)}
                </p>
              </div>
              {alert.status === 'ACTIVE' && (
                <button
                  onClick={() => resolveMutation.mutate(alert.id)}
                  disabled={resolveMutation.isPending}
                  className="btn-secondary shrink-0 px-3 py-1.5 text-xs"
                >
                  <Check size={14} /> Resolve
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="No alerts" description="Alerts from health, medication and emergency modules will appear here." />
      )}
    </div>
  )
}