import { useQuery } from '@tanstack/react-query'
import { Building2, CheckCircle2, ShieldCheck, SlidersHorizontal, XCircle } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Spinner } from '@/components/Spinner'
import { ErrorState } from '@/components/ErrorState'
import { api } from '@/services/api'
import type { Settings } from '@/types'

export default function SettingsPage() {
  const query = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get<Settings>('/settings'),
  })

  if (query.isLoading) return <Spinner />
  if (query.isError) return <ErrorState message={query.error.message} onRetry={() => query.refetch()} />

  const settings = query.data!
  const modules = settings.modules

  return (
    <div>
      <PageHeader title="Settings" subtitle="Organization configuration and platform modules" />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Building2 size={16} className="text-brand-500" />
            <h2 className="text-sm font-semibold">Organization</h2>
          </div>
          {settings.organization ? (
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">Name</dt>
                <dd className="font-medium">{settings.organization.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">Type</dt>
                <dd className="capitalize font-medium">{settings.organization.type}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-slate-500">No organization assigned.</p>
          )}
        </div>

        <div className="card p-5">
          <div className="mb-4 flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-brand-500" />
            <h2 className="text-sm font-semibold">Enabled modules</h2>
          </div>
          <ul className="space-y-2.5">
            {Object.entries(modules).map(([key, enabled]) => (
              <li key={key} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm dark:border-slate-800">
                <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                {enabled ? (
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={16} /> Enabled
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <XCircle size={16} /> Disabled
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="card p-5">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck size={16} className="text-brand-500" />
            <h2 className="text-sm font-semibold">Risk engine thresholds</h2>
          </div>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500 dark:text-slate-400">Low</dt>
              <dd className="font-medium">0 – {settings.risk_config.low_max}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500 dark:text-slate-400">Moderate</dt>
              <dd className="font-medium">{settings.risk_config.low_max + 1} – {settings.risk_config.moderate_max}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500 dark:text-slate-400">Elevated</dt>
              <dd className="font-medium">{settings.risk_config.moderate_max + 1} – {settings.risk_config.elevated_max}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500 dark:text-slate-400">High</dt>
              <dd className="font-medium">{settings.risk_config.elevated_max + 1} – 100</dd>
            </div>
          </dl>
          <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            These are software demonstration categories, not clinical diagnostic thresholds.
          </p>
        </div>
      </div>
    </div>
  )
}