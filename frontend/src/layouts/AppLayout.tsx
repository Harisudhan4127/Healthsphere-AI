import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  Bell,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Settings,
  ShieldAlert,
  Siren,
  Sun,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import type { Alert } from '@/types'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/patients', label: 'Patients', icon: Users },
  { to: '/analytics', label: 'Analytics', icon: Activity },
  { to: '/emergency', label: 'Emergency Center', icon: Siren },
  { to: '/alerts', label: 'Alerts', icon: AlertTriangle },
  { to: '/settings', label: 'Settings', icon: Settings },
]

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function AppLayout() {
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)

  const { data: alerts } = useQuery({
    queryKey: ['alerts', 'active'],
    queryFn: () => api.get<Alert[]>('/alerts?status=ACTIVE&limit=8'),
    refetchInterval: 60000,
  })

  const activeCount = alerts?.length ?? 0

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
          <HeartPulse size={20} />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">HealthSphere AI</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Healthcare Intelligence</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                isActive
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              )
            }
          >
            <item.icon size={18} />
            {item.label}
            {item.to === '/alerts' && activeCount > 0 && (
              <span className="ml-auto rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600 dark:bg-red-950 dark:text-red-400">
                {activeCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-200 p-3 dark:border-slate-800">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
            {user ? initials(user.name) : '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user?.name}</p>
            <p className="truncate text-xs text-slate-500">{user?.role}</p>
          </div>
          <button onClick={handleLogout} className="btn-ghost p-1.5" title="Sign out" aria-label="Sign out">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:block">
        {sidebar}
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            aria-label="Close menu"
            className="absolute inset-0 bg-slate-900/50"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-64 bg-white dark:bg-slate-900">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute right-3 top-4 text-slate-400 hover:text-slate-600"
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 sm:px-6">
          <button onClick={() => setSidebarOpen(true)} className="btn-ghost p-2 lg:hidden" aria-label="Open menu">
            <Menu size={20} />
          </button>
          <div className="hidden items-center gap-2 text-sm text-slate-500 sm:flex dark:text-slate-400">
            <UserRound size={16} />
            <span className="capitalize">{user?.role.toLowerCase()}</span>
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <div className="relative">
              <button
                onClick={() => setNotifOpen((o) => !o)}
                className="btn-ghost relative p-2"
                aria-label="Notifications"
              >
                <Bell size={18} />
                {activeCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                    {activeCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
                  <div className="border-b border-slate-100 px-4 py-2.5 text-sm font-medium dark:border-slate-800">
                    Notifications
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {alerts && alerts.length > 0 ? (
                      alerts.map((alert) => (
                        <div key={alert.id} className="border-b border-slate-50 px-4 py-2.5 last:border-0 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold uppercase text-slate-400">{alert.type}</span>
                            <span className="text-xs capitalize text-slate-500">{alert.severity}</span>
                          </div>
                          <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-200">{alert.message}</p>
                          <p className="mt-0.5 text-xs text-slate-400">
                            {alert.patient_name ?? 'System'}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="px-4 py-8 text-center text-sm text-slate-400">No active alerts</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button onClick={toggle} className="btn-ghost p-2" aria-label="Toggle theme">
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-[11px] text-slate-400 lg:hidden">
            <ShieldAlert size={12} />
            <span>Decision-support platform · Not a diagnosis</span>
          </div>
          <Outlet />
        </main>

        <footer className="px-6 pb-8 text-center text-xs text-slate-400 lg:text-left">
          <p>
            HealthSphere AI is a software-based decision-support and risk-awareness platform. Its outputs are
            informational and are not intended to replace professional medical diagnosis, treatment, or emergency
            services.
          </p>
        </footer>
      </div>
    </div>
  )
}