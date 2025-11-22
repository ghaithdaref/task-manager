import axios from 'axios'

const baseURL = import.meta.env.VITE_BASE_URL || 'http://localhost:5020'\nexport const api = axios.create({ baseURL, withCredentials: true })

export const setAccessToken = (token?: string) => {
  if (!token) delete (api.defaults.headers as any).Authorization
  else (api.defaults.headers as any).Authorization = `Bearer ${token}`
}

let authed = (()=>{ try { return localStorage.getItem('stm-auth')==='true' } catch { return false } })()
export const isAuthed = () => authed

export const ensureAuth = async (): Promise<boolean> => {
  if (authed) return true
  const email = 'test@example.com'
  const password = 'Passw0rd!'
  try {
    const r = await api.post('/auth/login', { email, password })
    setAccessToken(r.data.accessToken)
    authed = true
    try { localStorage.setItem('stm-logged-out','false'); localStorage.setItem('stm-auth','true') } catch {}
    return true
  } catch {
    try {
      const r = await api.post('/auth/register', { name: 'Test User', email, password })
      setAccessToken(r.data.accessToken)
      authed = true
      try { localStorage.setItem('stm-logged-out','false'); localStorage.setItem('stm-auth','true') } catch {}
      return true
    } catch {
      return false
    }
  }
}

export const login = async (email: string, password: string): Promise<{ ok: boolean, error?: string }> => {
  try {
    const r = await api.post('/auth/login', { email, password })
    setAccessToken(r.data.accessToken)
    authed = true
    try { localStorage.setItem('stm-logged-out','false'); localStorage.setItem('stm-auth','true') } catch {}
    return { ok: true }
  } catch (err: any) {
    const msg = err?.response?.data?.error || 'login_failed'
    return { ok: false, error: msg }
  }
}

export const register = async (name: string, email: string, password: string): Promise<{ ok: boolean, error?: string, details?: any }> => {
  try {
    const r = await api.post('/auth/register', { name, email, password })
    setAccessToken(r.data.accessToken)
    authed = true
    try { localStorage.setItem('stm-logged-out','false'); localStorage.setItem('stm-auth','true') } catch {}
    return { ok: true }
  } catch (err: any) {
    const msg = err?.response?.data?.error || 'register_failed'
    const details = err?.response?.data
    console.error('Register error:', { msg, details, fullError: err })
    return { ok: false, error: msg, details }
  }
}

export const changePassword = async (currentPassword: string, newPassword: string): Promise<{ ok: boolean, error?: string }> => {
  try {
    await api.post('/auth/change-password', { currentPassword, newPassword })
    return { ok: true }
  } catch (err: any) {
    const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'change_password_failed'
    return { ok: false, error: msg }
  }
}

export const refresh = async (): Promise<boolean> => {
  try {
    const r = await api.post('/auth/refresh')
    setAccessToken(r.data.accessToken)
    authed = true
    try { localStorage.setItem('stm-auth','true') } catch {}
    return true
  } catch {
    setAccessToken(undefined)
    authed = false
    try { localStorage.setItem('stm-auth','false') } catch {}
    return false
  }
}

export const initAuth = async () => {
  const hasAuth = (()=>{ try { return localStorage.getItem('stm-auth')==='true' } catch { return false } })()
  const hasHeader = !!(api.defaults.headers as any).Authorization
  if (hasAuth && !hasHeader) await refresh()
}

api.interceptors.response.use(undefined, async (error) => {
  const status = error?.response?.status
  const config = error?.config
  
  // Log error for debugging
  if (process.env.NODE_ENV === 'development') {
    console.error('API Error:', {
      url: config?.url,
      method: config?.method,
      status,
      error: error?.response?.data,
      message: error?.message
    })
  }
  
  if (status === 401 && config && !config.__retried) {
    const ok = await refresh()
    if (ok) {
      config.__retried = true
      return api.request(config)
    } else {
      // Refresh failed, clear auth
      setAccessToken(undefined)
      authed = false
      try { localStorage.setItem('stm-auth','false') } catch {}
    }
  }
  return Promise.reject(error)
})

export const logout = async () => {
  try { await api.post('/auth/logout') } catch {}
  setAccessToken(undefined)
  authed = false
  try { localStorage.setItem('stm-logged-out','true'); localStorage.setItem('stm-auth','false') } catch {}
}