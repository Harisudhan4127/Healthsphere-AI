import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  HeartPulse,
  Pill,
  Siren,
  Sparkles,
  Users,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { StatCard } from '@/components/StatCard'
import { RiskBadge } from '@/components/RiskBadge'
import { SeverityBadge } from '@/components/SeverityBadge'
import { Spinner } from '@/components/Spinner'
import { ErrorState } from '@/components/ErrorState'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { api } from '@/services/api'
import { formatDateTime } from '@/lib/utils'
import type { Analytics, DashboardSummary, Patient } from '@/types'

const PIE_COLORS = ['#10b981', '#f59e0b', '#f97316', '#ef4444']

export default function Dashboard() {
  const summaryQuery = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardSummary>('/dashboard/summary'),
  })
  const patientsQuery = useQuery({
    queryKey: ['patients'],
    queryFn: () => api.get<Patient[]>('/patients?limit=6'),
  })
  const analyticsQuery = useQuery({
    queryKey: ['analytics'],
    queryFn: () => api.get<Analytics>('/analytics'),
  })

  if (summaryQuery.isLoading) return <Spinner />
  if (summaryQuery.isError)
    return <ErrorState message={summaryQuery.error.message} onRetry={() => summaryQuery.refetch()} />

  const summary = summaryQuery.data!
  const pieData = Object.entries(summary.risk_distribution).map(([name, value]) => ({ name, value }))
  const riskTrend = (analyticsQuery.data?.risk_trend ?? []).slice(-14)

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Unified health intelligence overview"
        actions={
          <Link to="/patients" className="btn-primary">
            New patient
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Patients" value={summary.total_patients} icon={Users} tone="brand" hint="Active records" />
        <StatCard label="Active Alerts" value={summary.active_alerts} icon={AlertTriangle} tone="amber" hint={`${summary.medication_alerts} medication related`} />
        <StatCard label="Active Emergencies" value={summary.active_emergencies} icon={Siren} tone="red" hint="Needs attention" />
        <StatCard label="Average Risk" value={summary.average_risk.toFixed(1)} icon={Activity} tone={summary.average_risk > 40 ? 'red' : 'emerald'} hint="Across all patients" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="card p-5">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles size={16} className="text-brand-500" />
              <h2 className="text-sm font-semibold">AI Insight</h2>
            </div>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{summary.ai_insight}</p>
            <p className="mt-2 text-xs text-slate-400">
              Generated from deterministic risk-engine results · informational only
            </p>
          </div>

          <div className="card mt-6 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Recent risk trend</h2>
              <Link to="/analytics" className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
                View analytics
              </Link>
            </div>
            {riskTrend.length > 0 ? (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={riskTrend} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                    <defs>
                      <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0072c6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#0072c6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d: string) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} />
                    <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                    <Tooltip />
                    <Area type="monotone" dataKey="score" stroke="#0072c6" strokeWidth={2} fill="url(#riskGradient)" name="Risk score" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState title="No risk data yet" description="Risk assessments will appear here once calculated." />
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-semibold">Risk distribution</h2>
            <div className="flex items-center gap-4">
              <div className="h-40 w-40 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70} paddingAngle={2}>
                      {pieData.map((entry, i) => (
                        <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5">
                {pieData.map((entry, i) => (
                  <div key={entry.name} className="flex items-center gap-2 text-sm">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="capitalize text-slate-600 dark:text-slate-300">{entry.name.toLowerCase()}</span>
                    <span className="ml-auto font-medium">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Recent alerts</h2>
              <Link to="/alerts" className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
                View all
              </Link>
            </div>
            {summary.recent_alerts.length > 0 ? (
              <ul className="space-y-3">
                {summary.recent_alerts.slice(0, 4).map((alert) => (
                  <li key={alert.id} className="flex items-start gap-3">
                    <SeverityBadge severity={alert.severity} />
                    <div className="min-w-0">
                      <p className="truncate text-sm text-slate-700 dark:text-slate-200">{alert.message}</p>
                      <p className="text-xs text-slate-400">
                        {alert.patient_name ?? 'System'} · {formatDateTime(alert.created_at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No recent alerts" />
            )}
          </div>
        </div>
      </div>

      <div className="card mt-6 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Patients overview</h2>
          <Link to="/patients" className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
            View all
          </Link>
        </div>
        {patientsQuery.data && patientsQuery.data.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {patientsQuery.data.map((patient) => (
              <Link
                key={patient.id}
                to={`/patients/${patient.id}`}
                className="flex items-center gap-3 rounded-lg border border-slate-100 p-3 transition hover:border-brand-200 hover:bg-brand-50/40 dark:border-slate-800 dark:hover:border-brand-900 dark:hover:bg-brand-950/30"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                  {patient.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{patient.name}</p>
                  <p className="text-xs text-slate-400">{patient.age ?? '–'} yrs · {patient.gender ?? '–'}</p>
                </div>
                <RiskBadge level={patient.risk_level} score={patient.risk_score} />
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState title="No patients yet" description="Create a patient to begin health monitoring." />
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1.5"><HeartPulse size={14} /> Health</span>
        <span className="flex items-center gap-1.5"><Activity size={14} /> Disease risk</span>
        <span className="flex items-center gap-1.5"><Pill size={14} /> Medication</span>
        <span className="flex items-center gap-1.5"><Siren size={14} /> Emergency</span>
      </div>
    </div>
  )
}