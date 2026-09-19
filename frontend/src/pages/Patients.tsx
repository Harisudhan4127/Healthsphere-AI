import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { RiskBadge } from '@/components/RiskBadge'
import { Spinner } from '@/components/Spinner'
import { ErrorState } from '@/components/ErrorState'
import { EmptyState } from '@/components/EmptyState'
import { InlineSpinner } from '@/components/Spinner'
import { api } from '@/services/api'
import { formatDate } from '@/lib/utils'
import type { Patient } from '@/types'

export default function Patients() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [debounced, setDebounced] = useState('')

  const query = useQuery({
    queryKey: ['patients', debounced, statusFilter],
    queryFn: () =>
      api.get<Patient[]>(
        `/patients?limit=200${debounced ? `&search=${encodeURIComponent(debounced)}` : ''}${statusFilter ? `&status=${statusFilter}` : ''}`
      ),
  })

  function handleSearchChange(value: string) {
    setSearch(value)
    const t = setTimeout(() => setDebounced(value), 250)
    return () => clearTimeout(t)
  }

  return (
    <div>
      <PageHeader
        title="Patients"
        subtitle={`${query.data?.length ?? 0} patient records`}
        actions={
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus size={16} /> New patient
          </button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search by name or contact…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        <select className="input sm:w-48" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        {query.isLoading ? (
          <Spinner />
        ) : query.isError ? (
          <ErrorState message={query.error.message} onRetry={() => query.refetch()} />
        ) : query.data && query.data.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="px-4 py-3 font-medium">Patient</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Risk</th>
                  <th className="px-4 py-3 font-medium">Age / Gender</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Last activity</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {query.data.map((patient) => (
                  <tr key={patient.id} className="border-b border-slate-100 transition last:border-0 hover:bg-slate-50/70 dark:border-slate-800 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-medium">{patient.name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${patient.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 ring-slate-500/20'}`}>
                        {patient.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <RiskBadge level={patient.risk_level} score={patient.risk_score} />
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {patient.age ?? '–'} / {(patient.gender ?? '–')}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{patient.contact ?? '–'}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{formatDate(patient.updated_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/patients/${patient.id}`} className="btn-ghost px-3 py-1.5 text-xs">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No patients found" description="Try adjusting the search, or create a new patient." />
        )}
      </div>

      {showCreate && <CreatePatientModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}

function CreatePatientModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState('')
  const [contact, setContact] = useState('')
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: (payload: Record<string, string>) => api.post<Patient>('/patients', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      onClose()
    },
    onError: (err: Error) => setError(err.message),
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const payload: Record<string, string> = { name }
    if (dob) payload.date_of_birth = dob
    if (gender) payload.gender = gender
    if (contact) payload.contact = contact
    mutation.mutate(payload)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-slate-900/50" onClick={onClose} aria-label="Close" />
      <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900">
        <h2 className="mb-4 text-lg font-semibold">New patient</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Full name *</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Date of birth</label>
              <input type="date" className="input" value={dob} onChange={(e) => setDob(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Gender</label>
              <select className="input" value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Contact</label>
            <input className="input" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="+91 …" />
          </div>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              {mutation.isPending && <InlineSpinner />} Create patient
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}