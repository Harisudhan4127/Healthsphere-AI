import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, clearToken, getToken, setToken } from '@/services/api'
import type { User } from '@/types'

interface AuthContextValue {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string, organizationName?: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setTokenState] = useState<string | null>(getToken())
  const [loading, setLoading] = useState<boolean>(Boolean(token))

  useEffect(() => {
    if (!token) return
    api
      .get<User>('/auth/me')
      .then(setUser)
      .catch(() => {
        clearToken()
        setTokenState(null)
      })
      .finally(() => setLoading(false))
  }, [token])

  async function login(email: string, password: string) {
    const data = await api.post<{ access_token: string; user: User }>('/auth/login', { email, password })
    setToken(data.access_token)
    setTokenState(data.access_token)
    setUser(data.user)
  }

  async function register(name: string, email: string, password: string, organizationName?: string) {
    const data = await api.post<{ access_token: string; user: User }>('/auth/register', {
      name,
      email,
      password,
      organization_name: organizationName,
    })
    setToken(data.access_token)
    setTokenState(data.access_token)
    setUser(data.user)
  }

  function logout() {
    clearToken()
    setTokenState(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}