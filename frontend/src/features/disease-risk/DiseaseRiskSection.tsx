import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Info } from 'lucide-react'
import { Spinner, InlineSpinner } from '@/components/Spinner'
import { ErrorState } from '@/components/ErrorState'
import { EmptyState } from '@/components/EmptyState'
import { RiskBadge } from '@/components/RiskBadge'
import { FactorBars } from '@/components/FactorBars'
import { api } from '@/services/api'
import { formatDateTime } from '@/lib/utils'
import type { DiseaseAssessment } from '@/types'

interface Props {
  patientId: string
}

export function DiseaseRiskSection({ patientId }: Props) {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)

  const query = useQuery({
    queryKey: ['disease', patientId],
    queryFn: () => api.get<DiseaseAssessment[]>(`/patients/${patientId}/disease-assessments`),
  })

  const [error, setError] = useState('')
  const [form, setForm] = useState({
    assessment_type: 'General risk profile',
    biomarker: '',
    symptoms: '',
    history: '',
    age_group: 'adult',
    risk_factors: '',
  })

  const mutation = useMutation({
    mutationFn: () =>
      api.post<DiseaseAssessment>(`/patients/${patientId}/disease-assessment`, {
        assessment_type: form.assessment_type,
        biomarker_observations: form.biomarker
          ? { alpha: Number(form.biomarker) || 0 }
          : {},
        symptom_indicators: form.symptoms
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        health_history: form.history
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        age_group: form.age_group,
        risk_factors: form.risk_factors
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disease', patientId] })
      queryClient.invalidateQueries({ queryKey: ['risk', patientId] })
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      setShowForm(false)
      setForm((f) => ({ ...f, biomarker: '', symptoms: '', history: '', risk_factors: '' }))
    },
    onError: (err: Error) => setError(err.message),
  })

  const latest = query.data?.[0]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700 dark:bg-brand-950 dark:text-brand-300">
          <Info size={14} />
          <span>Risk assessment is for decision-support purposes and is not a medical diagnosis.</span>
        </div>
        <button onClick={() => setShowForm((s) => !s)} className="btn-secondary shrink-0">
          Run new assessment
        </button>
      </div>

      {showForm && (
        <div className="card p-5">
          <h3 className="mb-4 text-sm font-semibold">New disease-risk assessment</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium">Assessment type</label>
              <select className="input" value={form.assessment_type} onChange={(e) => setForm((f) => ({ ...f, assessment_type: e.target.value }))}>
                <option>General risk profile</option>
                <option>Cardiovascular risk profile</option>
                <option>Cardiometabolic profile</option>
                <option>Metabolic risk profile</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Biomarker observation (0-100)</label>
              <input type="number" className="input" value={form.biomarker} onChange={(e) => setForm((f) => ({ ...f, biomarker: e.target.value }))} placeholder="e.g. 42" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Age group</label>
              <select className="input" value={form.age_group} onChange={(e) => setForm((f) => ({ ...f, age_group: e.target.value }))}>
                <option value="young">Young</option>
                <option value="adult">Adult</option>
                <option value="middle">Middle-aged</option>
                <option value="senior">Senior</option>
                <option value="elderly">Elderly</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Symptom indicators (comma separated)</label>
              <input className="input" value={form.symptoms} onChange={(e) => setForm((f) => ({ ...f, symptoms: e.target.value }))} placeholder="fatigue, fever" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Health history (comma separated)</label>
              <input className="input" value={form.history} onChange={(e) => setForm((f) => ({ ...f, history: e.target.value }))} placeholder="family history" />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium">Risk factors (comma separated)</label>
              <input className="input" value={form.risk_factors} onChange={(e) => setForm((f) => ({ ...f, risk_factors: e.target.value }))} placeholder="sedentary, smoker" />
            </div>
          </div>
          {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">{error}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            <button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="btn-primary">
              {mutation.isPending && <InlineSpinner />} Run assessment
            </button>
          </div>
        </div>
      )}

      {query.isLoading ? (
        <Spinner />
      ) : query.isError ? (
        <ErrorState message={query.error.message} onRetry={() => query.refetch()} />
      ) : query.data && query.data.length > 0 ? (
        <>
          {latest && (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="card p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Latest assessment</h3>
                  <RiskBadge level={latest.risk_level} score={latest.risk_score} />
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300">{latest.explanation}</p>
                <p className="mt-3 text-xs text-slate-400">
                  {latest.assessment_type} · {formatDateTime(latest.created_at)}
                </p>
                {latest.followup && (
                  <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    <span className="font-medium">Recommended follow-up:</span> {latest.followup}
                  </p>
                )}
              </div>
              <div className="card p-5">
                <h3 className="mb-4 text-sm font-semibold">Contributing factors</h3>
                <FactorBars factors={latest.factors ?? []} />
              </div>
            </div>
          )}

          <div className="card overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-3 dark:border-slate-800">
              <h3 className="text-sm font-semibold">Assessment history</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <th className="px-5 py-2.5 font-medium">Type</th>
                    <th className="px-5 py-2.5 font-medium">Level</th>
                    <th className="px-5 py-2.5 font-medium">Score</th>
                    <th className="px-5 py-2.5 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {query.data.map((a) => (
                    <tr key={a.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                      <td className="px-5 py-3">{a.assessment_type}</td>
                      <td className="px-5 py-3"><RiskBadge level={a.risk_level} /></td>
                      <td className="px-5 py-3">{a.risk_score.toFixed(1)}</td>
                      <td className="px-5 py-3 text-slate-500">{formatDateTime(a.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <EmptyState title="No assessments" description="Run a disease-risk assessment to see results here." />
      )}
    </div>
  )
}