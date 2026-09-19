import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Siren } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { SeverityBadge } from '@/components/SeverityBadge'
import { Spinner, InlineSpinner } from '@/components/Spinner'
import { ErrorState } from '@/components/ErrorState'
import { EmptyState } from '@/components/EmptyState'
import { api } from '@/services/api'
import { formatDateTime } from '@/lib/utils'
import type { EmergencyEvent } from '@/types'

const TRANSITIONS: Record<string, string[]> = {
  DETECTED: ['VERIFYING', 'RESOLVED'],
  VERIFYING: ['ALERTED', 'RESOLVED'],
  ALERTED: ['RESPONDING', 'RESOLVED'],
  RESPONDING: ['RESOLVED'],
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    DETECTED: 'bg-red-50 text-red-700 ring-red-600/20',
    VERIFYING: 'bg-amber-50 text-amber-700 ring-amber-600/25',
    ALERTED: 'bg-orange-50 text-orange-700 ring-orange-600/25',
    RESPONDING: 'bg-blue-50 text-blue-700 ring-blue-600/20',
    RESOLVED: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  }
  return map[status] || 'bg-slate-100 text-slate-600 ring-slate-500/20'
}

export default function Emergency() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const query = useQuery({
    queryKey: ['emergencies', filter],
    queryFn: () => api.get<EmergencyEvent[]>(`/emergencies${filter ? `?status=${filter}` : ''}`),
    refetchInterval: 30000,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.put<EmergencyEvent>(`/emergencies/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergencies'] })
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  return (
    <div>
      <PageHeader
        title="Emergency Center"
        subtitle="Event severity, status, location and response workflow"
        actions={
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Siren size={16} /> Report event
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {['', 'DETECTED', 'VERIFYING', 'ALERTED', 'RESPONDING', 'RESOLVED'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition ${
              filter === s
                ? 'bg-slate-900 text-white ring-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:ring-slate-100'
                : 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700'
            }`}
          >
            {s === '' ? 'All' : s}
          </button>
        ))}
      </div>

      {query.isLoading ? (
        <Spinner />
      ) : query.isError ? (
        <ErrorState message={query.error.message} onRetry={() => query.refetch()} />
      ) : query.data && query.data.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {query.data.map((event) => (
            <div key={event.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-medium">{event.event_type}</h3>
                  <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                    {event.patient_name ?? 'Unknown patient'}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusBadge(event.status)}`}>
                    {event.status}
                  </span>
                  <SeverityBadge severity={event.severity} />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-slate-400">Detected</p>
                  <p className="font-medium">{formatDateTime(event.detected_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Location</p>
                  <p className="font-medium">
                    {event.latitude && event.longitude
                      ? `${event.latitude.toFixed(4)}, ${event.longitude.toFixed(4)}`
                      : '—'}
                  </p>
                </div>
              </div>

              {event.timeline.length > 0 && (
                <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Timeline</p>
                  <ol className="space-y-1.5">
                    {event.timeline.map((entry) => (
                      <li key={`${entry.time}`} className="flex items-center gap-2 text-sm">
                        <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
                        <span className="font-mono text-xs text-slate-400">
                          {new Date(entry.time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-slate-600 dark:text-slate-300">{entry.label}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {TRANSITIONS[event.status] && event.status !== 'RESOLVED' && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {TRANSITIONS[event.status].map((next) => (
                    <button
                      key={next}
                      onClick={() => updateMutation.mutate({ id: event.id, status: next })}
                      disabled={updateMutation.isPending}
                      className="btn-secondary px-3 py-1.5 text-xs"
                    >
                      {updateMutation.isPending && <InlineSpinner />}
                      Move to {next}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="No emergency events" description="Reported emergency events will appear here." />
      )}

      {showCreate && <CreateEmergencyModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}

function CreateEmergencyModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [patientId, setPatientId] = useState('')
  const [eventType, setEventType] = useState('MEDICAL')
  const [severity, setSeverity] = useState('MODERATE')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [error, setError] = useState('')

  const patientsQuery = useQuery({
    queryKey: ['patients'],
    queryFn: () => api.get<Array<{ id: string; name: string }>>('/patients?limit=200'),
  })

  const mutation = useMutation({
    mutationFn: () =>
      api.post<EmergencyEvent>('/emergencies', {
        patient_id: patientId,
        event_type: eventType,
        severity,
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergencies'] })
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      onClose()
    },
    onError: (err: Error) => setError(err.message),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-slate-900/50" onClick={onClose} aria-label="Close" />
      <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900">
        <h2 className="mb-4 text-lg font-semibold">Report emergency event</h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Patient</label>
            <select className="input" value={patientId} onChange={(e) => setPatientId(e.target.value)}>
              <option value="">Select patient</option>
              {patientsQuery.data?.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Event type</label>
              <select className="input" value={eventType} onChange={(e) => setEventType(e.target.value)}>
                <option>MEDICAL</option>
                <option>COLLISION</option>
                <option>MOTOR_ACCIDENT</option>
                <option>FALL</option>
                <option>UNKNOWN</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Severity</label>
              <select className="input" value={severity} onChange={(e) => setSeverity(e.target.value)}>
                <option>LOW</option>
                <option>MODERATE</option>
                <option>HIGH</option>
                <option>CRITICAL</option>
              </select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Latitude</label>
              <input type="number" step="any" className="input" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="12.9716" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Longitude</label>
              <input type="number" step="any" className="input" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="77.5946" />
            </div>
          </div>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button onClick={() => mutation.mutate()} disabled={!patientId || mutation.isPending} className="btn-primary">
              {mutation.isPending && <InlineSpinner />} Report event
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}