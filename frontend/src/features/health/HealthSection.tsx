import { useQuery } from '@tanstack/react-query'
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Activity, Droplets, HeartPulse, Moon, Thermometer, TrendingUp } from 'lucide-react'
import { MetricCard } from '@/components/MetricCard'
import { Spinner } from '@/components/Spinner'
import { ErrorState } from '@/components/ErrorState'
import { EmptyState } from '@/components/EmptyState'
import { api } from '@/services/api'
import type { HealthRecord } from '@/types'

interface Props {
  patientId: string
}

function metricStatus(metric: string, value: number | null): 'normal' | 'warning' | 'critical' {
  if (value === null) return 'normal'
  switch (metric) {
    case 'spo2':
      if (value < 92) return 'critical'
      if (value < 95) return 'warning'
      return 'normal'
    case 'heart_rate':
      if (value > 120 || value < 50) return 'critical'
      if (value > 100 || value < 60) return 'warning'
      return 'normal'
    case 'temperature':
      if (value > 38.5 || value < 35.5) return 'critical'
      if (value > 37.5 || value < 36) return 'warning'
      return 'normal'
    default:
      return 'normal'
  }
}

export function HealthSection({ patientId }: Props) {
  const trendsQuery = useQuery({
    queryKey: ['health', patientId],
    queryFn: () => api.get<HealthRecord[]>(`/patients/${patientId}/health/trends?days=14`),
  })

  if (trendsQuery.isLoading) return <Spinner />
  if (trendsQuery.isError) return <ErrorState message={trendsQuery.error.message} onRetry={() => trendsQuery.refetch()} />

  const records = trendsQuery.data ?? []
  const latest = records[records.length - 1]

  if (records.length === 0)
    return (
      <EmptyState
        title="No health records"
        description="Health readings recorded for this patient will appear here."
      />
    )

  const metrics = [
    { label: 'Heart Rate', value: latest.heart_rate, unit: 'BPM', icon: HeartPulse, metric: 'heart_rate' },
    { label: 'SpO₂', value: latest.spo2, unit: '%', icon: Droplets, metric: 'spo2' },
    { label: 'Temperature', value: latest.temperature, unit: '°C', icon: Thermometer, metric: 'temperature' },
    { label: 'Activity', value: latest.activity, unit: '', icon: Activity, metric: 'activity' },
    { label: 'Sleep', value: latest.sleep, unit: 'h', icon: Moon, metric: 'sleep' },
  ]

  const chartData = records.map((r) => ({
    date: new Date(r.recorded_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
    heart_rate: r.heart_rate,
    spo2: r.spo2,
    temperature: r.temperature,
  }))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {metrics.map((m) => (
          <MetricCard
            key={m.label}
            label={m.label}
            value={m.value?.toFixed(m.metric === 'temperature' ? 1 : 0) ?? '—'}
            unit={m.unit}
            status={metricStatus(m.metric, m.value)}
          />
        ))}
      </div>

      <div className="card p-5">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp size={16} className="text-brand-500" />
          <h3 className="text-sm font-semibold">14-day health trend</h3>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="hr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="spo2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0c91e8" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#0c91e8" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="temp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={40} />
              <Tooltip />
              <Area type="monotone" dataKey="heart_rate" stroke="#ef4444" strokeWidth={1.5} fill="url(#hr)" name="Heart rate" />
              <Area type="monotone" dataKey="spo2" stroke="#0c91e8" strokeWidth={1.5} fill="url(#spo2)" name="SpO₂" />
              <Area type="monotone" dataKey="temperature" stroke="#f59e0b" strokeWidth={1.5} fill="url(#temp)" name="Temp" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}