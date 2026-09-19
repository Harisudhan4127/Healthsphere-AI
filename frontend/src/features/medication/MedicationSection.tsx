import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Thermometer } from 'lucide-react'
import { Spinner, InlineSpinner } from '@/components/Spinner'
import { ErrorState } from '@/components/ErrorState'
import { EmptyState } from '@/components/EmptyState'
import { SeverityBadge } from '@/components/SeverityBadge'
import { api } from '@/services/api'
import { formatDateTime } from '@/lib/utils'
import type { Medication, MedicationStatus } from '@/types'

interface Props {
  patientId: string
}

function statusColor(status: string) {
  if (status === 'SAFE') return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-400'
  if (status === 'WARNING') return 'bg-amber-50 text-amber-700 ring-amber-600/25 dark:bg-amber-950 dark:text-amber-400'
  return 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950 dark:text-red-400'
}

export function MedicationSection({ patientId }: Props) {
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [error, setError] = useState('')

  const query = useQuery({
    queryKey: ['medications', patientId],
    queryFn: () => api.get<Medication[]>(`/patients/${patientId}/medications`),
  })

  const addMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api.post<Medication>(`/patients/${patientId}/medications`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications', patientId] })
      setShowAdd(false)
    },
    onError: (err: Error) => setError(err.message),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">Medication storage and safety monitoring</p>
        <button onClick={() => setShowAdd(true)} className="btn-secondary">
          <Plus size={16} /> Add medication
        </button>
      </div>

      {showAdd && (
        <AddMedicationForm
          onClose={() => setShowAdd(false)}
          onSubmit={(payload) => addMutation.mutate(payload)}
          pending={addMutation.isPending}
          error={error}
        />
      )}

      {query.isLoading ? (
        <Spinner />
      ) : query.isError ? (
        <ErrorState message={query.error.message} onRetry={() => query.refetch()} />
      ) : query.data && query.data.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {query.data.map((med) => (
            <MedicationCard key={med.id} medicationId={med.id} />
          ))}
        </div>
      ) : (
        <EmptyState title="No medications" description="Add a medication to begin safety monitoring." />
      )}
    </div>
  )
}

function MedicationCard({ medicationId }: { medicationId: string }) {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['medication-status', medicationId],
    queryFn: () => api.get<MedicationStatus>(`/medications/${medicationId}/status`),
    refetchInterval: 30000,
  })

  const readingMutation = useMutation({
    mutationFn: (payload: { temperature: number; duration: number }) =>
      api.post<unknown>(`/medications/${medicationId}/readings`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medication-status', medicationId] })
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
    },
  })

  const [temp, setTemp] = useState('')
  const [duration, setDuration] = useState('')

  if (query.isLoading) return <Spinner className="py-6" />
  if (query.isError) return <ErrorState message={query.error.message} onRetry={() => query.refetch()} />

  const data = query.data!
  const med = data.medication

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-medium">{med.name}</h4>
          <p className="mt-0.5 text-xs text-slate-400">
            {med.storage_requirements.label ?? 'Storage'} · {med.storage_requirements.min_temp}–{med.storage_requirements.max_temp} °C
          </p>
        </div>
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusColor(data.status)}`}>
          {data.status}
        </span>
      </div>

      <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{data.condition}</p>
      <p className="mt-1 text-xs text-slate-400">Last check: {formatDateTime(data.last_check)}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Temperature °C</label>
          <input type="number" step="0.1" className="input" value={temp} onChange={(e) => setTemp(e.target.value)} placeholder="e.g. 6" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Duration (h)</label>
          <input type="number" className="input" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. 48" />
        </div>
        <div className="flex items-end">
          <button
            onClick={() => readingMutation.mutate({ temperature: Number(temp) || 0, duration: Number(duration) || 0 })}
            disabled={readingMutation.isPending || !temp}
            className="btn-primary w-full"
          >
            <Thermometer size={16} /> Record
          </button>
        </div>
      </div>

      {data.readings.length > 0 && (
        <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Recent readings</p>
          <div className="space-y-1.5">
            {data.readings.slice(0, 4).map((reading) => (
              <div key={reading.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-300">
                  {reading.temperature !== null ? `${reading.temperature} °C` : '—'}
                  {reading.duration !== null ? ` · ${reading.duration}h` : ''}
                </span>
                <SeverityBadge severity={reading.status === 'SAFE' ? 'LOW' : reading.status === 'WARNING' ? 'MODERATE' : 'HIGH'} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function AddMedicationForm({
  onClose,
  onSubmit,
  pending,
  error,
}: {
  onClose: () => void
  onSubmit: (payload: Record<string, unknown>) => void
  pending: boolean
  error: string
}) {
  const [name, setName] = useState('')
  const [minTemp, setMinTemp] = useState('2')
  const [maxTemp, setMaxTemp] = useState('8')

  return (
    <div className="card p-5">
      <h3 className="mb-4 text-sm font-semibold">Add medication</h3>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-3">
          <label className="mb-1.5 block text-sm font-medium">Medication name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Insulin" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Min temp °C</label>
          <input type="number" step="0.1" className="input" value={minTemp} onChange={(e) => setMinTemp(e.target.value)} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Max temp °C</label>
          <input type="number" step="0.1" className="input" value={maxTemp} onChange={(e) => setMaxTemp(e.target.value)} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Max duration (h)</label>
          <input type="number" className="input" defaultValue="720" />
        </div>
      </div>
      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">{error}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="btn-secondary">Cancel</button>
        <button
          onClick={() =>
            onSubmit({
              name,
              storage_requirements: {
                min_temp: Number(minTemp) || 0,
                max_temp: Number(maxTemp) || 0,
                max_duration_hours: 720,
                label: 'Refrigerated',
              },
            })
          }
          disabled={pending || !name}
          className="btn-primary"
        >
          {pending && <InlineSpinner />} Add
        </button>
      </div>
    </div>
  )
}