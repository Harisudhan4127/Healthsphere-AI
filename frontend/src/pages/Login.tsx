import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { HeartPulse, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { InlineSpinner } from '@/components/Spinner'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-slate-100 to-brand-50 px-4 dark:from-slate-950 dark:via-slate-950 dark:to-brand-950">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg">
            <HeartPulse size={28} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">HealthSphere AI</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Secure Healthcare Intelligence</p>
        </div>

        <div className="card p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="you@healthsphere.ai"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400" role="alert">
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading && <InlineSpinner />}
              Sign In
            </button>
          </form>

          <div className="mt-6 rounded-lg bg-slate-50 p-3 text-center dark:bg-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Demo credentials
            </p>
            <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-300">
              admin@healthsphere.ai · admin123
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck size={14} />
          <span>Decision-support platform · Not a medical diagnosis</span>
        </div>
      </div>
    </div>
  )
}