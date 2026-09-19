import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Spinner } from '@/components/Spinner'
import { useAuth } from '@/hooks/useAuth'
import { AppLayout } from '@/layouts/AppLayout'

const Login = lazy(() => import('@/pages/Login'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Patients = lazy(() => import('@/pages/Patients'))
const PatientDetail = lazy(() => import('@/pages/PatientDetail'))
const Analytics = lazy(() => import('@/pages/Analytics'))
const Emergency = lazy(() => import('@/pages/Emergency'))
const Alerts = lazy(() => import('@/pages/Alerts'))
const SettingsPage = lazy(() => import('@/pages/Settings'))
const NotFound = lazy(() => import('@/pages/NotFound'))

function PageLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Spinner />
    </div>
  )
}

function Protected({ children }: { children: JSX.Element }) {
  const { token, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Spinner />
      </div>
    )
  }
  if (!token) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <Protected>
              <AppLayout />
            </Protected>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="patients" element={<Patients />} />
          <Route path="patients/:patientId" element={<PatientDetail />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="emergency" element={<Emergency />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}