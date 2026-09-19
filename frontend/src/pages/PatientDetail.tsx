import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import {
  Activity,
  ArrowLeft,
  Calendar,
  ClipboardList,
  HeartPulse,
  Pill,
  RefreshCw,
  Siren,
} from 'lucide-react'
import { Spinner, InlineSpinner } from '@/components/Spinner'
import { ErrorState } from '@/components/ErrorState'
import { RiskGauge } from '@/components/RiskGauge'
import { RiskBadge } from '@/components/RiskBadge'
import { FactorBars } from '@/components/FactorBars'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { api } from '@/services/api'
import { formatDate, formatDateTime } from '@/lib/utils'
import type { Patient, RiskResult } from '@/types'
import { HealthSection } from '@/features/health/HealthSection'
import { DiseaseRiskSection } from '@/features/disease-risk/DiseaseRiskSection'
import { MedicationSection } from '@/features/medication/MedicationSection'

const TABS = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'health', label: 'Health', icon: HeartPulse },
  { id: 'disease', label: 'Disease Risk', icon: ClipboardList },
  { id: 'medication', label: 'Medication', icon: Pill },
  { id: 'emergency', label: 'Emergency', icon: Siren },
  { id: 'timeline', label: 'Timeline', icon: Calendar },
]

export default function PatientDetail() {
  const { patientId = '' } = useParams()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState('overview')

  const patientQuery = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => api.get<Patient>(`/patients/${patientId}`),
  })

  const riskMutation = useMutation({
    mutationFn: () => api.post<RiskResult>(`/patients/${patientId}/risk/recalculate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk', patientId] })
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] })
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  if (patientQuery.isLoading) return <Spinner />
  if (patientQuery.isError)
    return <ErrorState message={patientQuery.error.message} onRetry={() => patientQuery.refetch()} />

  const patient = patientQuery.data!

  return (
    <div>
      <Link to="/patients" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
        <ArrowLeft size={16} /> Patients
      </Link>
      <PageHeader
        title={patient.name}
        subtitle={`${patient.age ?? '–'} yrs · ${patient.gender ?? '–'} · ${patient.status}`}
        actions={
          <button onClick={() => riskMutation.mutate()} disabled={riskMutation.isPending} className="btn-secondary">
            <RefreshCw size={16} className={riskMutation.isPending ? 'animate-spin' : ''} />
            {riskMutation.isPending ? <InlineSpinner /> : 'Recalculate risk'}
          </button>
        }
      />

      <div className="mb-6 flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              tab === t.id ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab patientId={patientId} patient={patient} />}
      {tab === 'health' && <HealthSection patientId={patientId} />}
      {tab === 'disease' && <DiseaseRiskSection patientId={patientId} />}
      {tab === 'medication' && <MedicationSection patientId={patientId} />}
      {tab === 'emergency' && <PatientEmergencyTab patientId={patientId} />}
      {tab === 'timeline' && <TimelineTab patientId={patientId} />}
    </div>
  )
}

function OverviewTab({ patientId, patient }: { patientId: string; patient: Patient }) {
  const riskQuery = useQuery({
    queryKey: ['risk', patientId],
    queryFn: () => api.get<RiskResult>(`/patients/${patientId}/risk`),
  })

  const alertsQuery = useQuery({
    queryKey: ['alerts', 'patient', patientId],
    queryFn: () => api.get<Array<{ id: string; type: string; severity: string; message: string; status: string; created_at: string }>>(`/alerts?limit=10`),
  })

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="card flex flex-col items-center p-6 lg:col-span-1">
        {riskQuery.data ? (
          <>
            <RiskGauge score={riskQuery.data.score} level={riskQuery.data.level} />
            <div className="mt-3 flex items-center gap-2">
              <RiskBadge level={riskQuery.data.level} score={riskQuery.data.score} />
            </div>
            <p className="mt-4 text-center text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {riskQuery.data.explanation}
            </p>
          </>
        ) : (
          <EmptyState title="No risk assessment yet" description="Recalculate risk to initialize the assessment." />
        )}
      </div>

      <div className="card p-5 lg:col-span-2">
        <h3 className="mb-4 text-sm font-semibold">Patient profile</h3>
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Date of birth</dt>
            <dd className="font-medium">{patient.date_of_birth ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Age</dt>
            <dd className="font-medium">{patient.age ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Gender</dt>
            <dd className="capitalize font-medium">{patient.gender ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Contact</dt>
            <dd className="font-medium">{patient.contact ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Status</dt>
            <dd className="font-medium">{patient.status}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Registered</dt>
            <dd className="font-medium">{formatDate(patient.created_at)}</dd>
          </div>
        </dl>

        <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800">
          <h3 className="mb-3 text-sm font-semibold">Contributing factors</h3>
          {riskQuery.data?.factors && riskQuery.data.factors.length > 0 ? (
            <FactorBars factors={riskQuery.data.factors} />
          ) : (
            <p className="text-sm text-slate-400">No contributing factors recorded.</p>
          )}
        </div>

        <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800">
          <h3 className="mb-3 text-sm font-semibold">Recent alerts</h3>
          {(alertsQuery.data ?? []).filter((a) => a.status === 'ACTIVE').slice(0, 5).length > 0 ? (
            <ul className="space-y-2">
              {(alertsQuery.data ?? [])
                .filter((a) => a.status === 'ACTIVE')
                .slice(0, 5)
                .map((a) => (
                  <li key={a.id} className="flex items-start gap-2 text-sm">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                    <span className="text-slate-700 dark:text-slate-200">{a.message}</span>
                  </li>
                ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">No active alerts for this patient.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function PatientEmergencyTab({ patientId }: { patientId: string }) {
  const query = useQuery({
    queryKey: ['emergencies', 'patient', patientId],
    queryFn: () =>
      api.get<Array<{ id: string; patient_id: string; event_type: string; severity: string; status: string; detected_at: string; resolved_at: string | null }>>('/emergencies'),
  })

  const events = (query.data ?? []).filter((e) => e.patient_id === patientId)

  if (query.isLoading) return <Spinner />
  if (query.isError) return <ErrorState message={query.error.message} onRetry={() => query.refetch()} />

  if (events.length === 0)
    return <EmptyState title="No emergency events" description="Emergency events for this patient will appear here." />

  return (
    <div className="card divide-y divide-slate-100 dark:divide-slate-800">
      {events.map((event) => (
        <div key={event.id} className="flex flex-wrap items-center gap-3 p-4 text-sm">
          <Siren size={18} className="text-red-500" />
          <span className="font-medium">{event.event_type}</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {event.status}
          </span>
          <span className="text-xs text-slate-400">{event.severity}</span>
          <span className="ml-auto text-xs text-slate-400">{formatDateTime(event.detected_at)}</span>
        </div>
      ))}
    </div>
  )
}

function TimelineTab({ patientId }: { patientId: string }) {
  const healthQuery = useQuery({
    queryKey: ['health', patientId],
    queryFn: () => api.get<Array<{ id: string; heart_rate: number | null; recorded_at: string }>>(`/patients/${patientId}/health?limit=30`),
  })
  const diseaseQuery = useQuery({
    queryKey: ['disease', patientId],
    queryFn: () => api.get<Array<{ id: string; assessment_type: string; risk_level: string; created_at: string }>>(`/patients/${patientId}/disease-assessments`),
  })
  const riskQuery = useQuery({
    queryKey: ['risk', patientId],
    queryFn: () => api.get<RiskResult>(`/patients/${patientId}/risk`),
  })

  const entries: Array<{ time: string; icon: string; text: string }> = []

  riskQuery.data?.created_at &&
    entries.push({
      time: riskQuery.data.created_at,
      icon: 'risk',
      text: `Risk assessment updated — ${riskQuery.data.level} (${riskQuery.data.score}/100)`,
    })

  ;(healthQuery.data ?? []).forEach((r) =>
    entries.push({
      time: r.recorded_at,
      icon: 'health',
      text: `Health reading recorded — HR ${r.heart_rate ?? '—'} BPM`,
    })
  )

  ;(diseaseQuery.data ?? []).forEach((a) =>
    entries.push({
      time: a.created_at,
      icon: 'disease',
      text: `${a.assessment_type} — ${a.risk_level} risk level`,
    })
  )

  entries.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())

  const iconMap: Record<string, string> = {
    risk: 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
    health: 'bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400',
    disease: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
  }

  const iconChar: Record<string, string> = { risk: 'R', health: 'H', disease: 'D' }

  if (entries.length === 0) return <EmptyState title="No timeline events" />

  return (
    <div className="card p-5">
      <h3 className="mb-5 text-sm font-semibold">Unified health timeline</h3>
      <ol className="relative space-y-5 border-l border-slate-200 pl-6 dark:border-slate-700">
        {entries.slice(0, 40).map((entry, i) => (
          <li key={i} className="relative">
            <span className={`absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${iconMap[entry.icon]}`}>
              {iconChar[entry.icon] || '•'}
            </span>
            <p className="text-sm text-slate-700 dark:text-slate-200">{entry.text}</p>
            <p className="mt-0.5 text-xs text-slate-400">{formatDateTime(entry.time)}</p>
          </li>
        ))}
      </ol>
    </div>
  )
}