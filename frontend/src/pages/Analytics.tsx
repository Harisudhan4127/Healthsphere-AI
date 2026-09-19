import { useQuery } from '@tanstack/react-query'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Activity, Pill, Siren, Users } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { StatCard } from '@/components/StatCard'
import { Spinner } from '@/components/Spinner'
import { ErrorState } from '@/components/ErrorState'
import { EmptyState } from '@/components/EmptyState'
import { SeverityBadge } from '@/components/SeverityBadge'
import { api } from '@/services/api'
import type { Analytics as AnalyticsData } from '@/types'

export default function Analytics() {
  const query = useQuery({
    queryKey: ['analytics'],
    queryFn: () => api.get<AnalyticsData>('/analytics'),
  })

  if (query.isLoading) return <Spinner />
  if (query.isError) return <ErrorState message={query.error.message} onRetry={() => query.refetch()} />

  const data = query.data!
  const riskTrend = data.risk_trend.slice(-30)

  return (
    <div>
      <PageHeader title="Analytics" subtitle="Population-level health intelligence" />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Patients" value={data.patient_statistics.total} icon={Users} tone="brand" />
        <StatCard label="Risk Assessments" value={data.patient_statistics.assessments} icon={Activity} tone="brand" />
        <StatCard label="Tracked Medications" value={data.medication_safety.medications} icon={Pill} tone="amber" />
        <StatCard label="Emergency Events" value={data.emergency_events.length} icon={Siren} tone="red" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-semibold">Risk score trend</h2>
          {riskTrend.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={riskTrend} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-800" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d: string) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke="#0072c6" strokeWidth={2} name="Risk score" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="No risk trend available" />
          )}
        </div>

        <div className="card p-5">
          <h2 className="mb-4 text-sm font-semibold">Alert trend</h2>
          {data.alert_trend.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.alert_trend} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-800" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="total" fill="#0c91e8" name="Alerts" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="No alert data" />
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-semibold">Patient statistics</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-slate-500 dark:text-slate-400">Total patients</dt>
              <dd className="font-medium">{data.patient_statistics.total}</dd>
            </div>
            {Object.entries(data.patient_statistics.gender).map(([gender, count]) => (
              <div key={gender} className="flex items-center justify-between">
                <dt className="capitalize text-slate-500 dark:text-slate-400">{gender}</dt>
                <dd className="font-medium">{count}</dd>
              </div>
            ))}
            <div className="flex items-center justify-between">
              <dt className="text-slate-500 dark:text-slate-400">Medications</dt>
              <dd className="font-medium">{data.patient_statistics.medications}</dd>
            </div>
          </dl>
        </div>

        <div className="card p-5">
          <h2 className="mb-4 text-sm font-semibold">Medication safety</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-slate-500 dark:text-slate-400">Safety compliance</dt>
              <dd className="font-medium">{data.medication_safety.safe_percent}%</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500 dark:text-slate-400">Out-of-range readings</dt>
              <dd className="font-medium text-red-500">{data.medication_safety.out_of_range}</dd>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${data.medication_safety.safe_percent}%` }}
              />
            </div>
          </dl>
        </div>

        <div className="card p-5">
          <h2 className="mb-4 text-sm font-semibold">Recent emergency events</h2>
          {data.emergency_events.length > 0 ? (
            <ul className="space-y-2.5">
              {data.emergency_events.slice(0, 6).map((event) => (
                <li key={event.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-slate-600 dark:text-slate-300">
                    {event.patient_name ?? 'Unknown'} · {event.type}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <SeverityBadge severity={event.severity} />
                    <span className="text-xs capitalize text-slate-400">{event.status.toLowerCase()}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No emergency events" />
          )}
        </div>
      </div>
    </div>
  )
}