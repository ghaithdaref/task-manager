import { NavLink, Route, Routes, useNavigate, Navigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { logout, isAuthed, ensureAuth } from './api/client'
import LoadingScreen from './components/LoadingScreen'
import Dashboard from './pages/Dashboard'
import Tasks from './pages/Tasks'
import Calendar from './pages/Calendar'
import Recurring from './pages/Recurring'
import Settings from './pages/Settings'
import Focus from './pages/Focus'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import RequireAuth from './components/RequireAuth'
import useSystemNotifications from './hooks/useSystemNotifications'
import NotificationCenter from './components/NotificationCenter'
 

export default function App() {
  const initialTheme = ((): string => {
    const saved = localStorage.getItem('stm-theme')
    if (saved) return saved
    try { return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light' } catch { return 'light' }
  })()
  const [theme, setTheme] = useState(initialTheme)
  const navigate = useNavigate()
  const [authed, setAuthed] = useState(isAuthed())
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const sidebarRef = useRef<HTMLDivElement | null>(null)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const notificationPanelRef = useRef<HTMLDivElement | null>(null)
  const notificationButtonRef = useRef<HTMLButtonElement | null>(null)
  useSystemNotifications(authed)
  useEffect(() => {
    const h = (e: MouseEvent) => {
      const x = Math.round((e.clientX / window.innerWidth) * 100)
      const y = Math.round((e.clientY / window.innerHeight) * 100)
      document.documentElement.style.setProperty('--bgx', `${x}%`)
      document.documentElement.style.setProperty('--bgy', `${y}%`)
    }
    window.addEventListener('mousemove', h)
    return () => window.removeEventListener('mousemove', h)
  }, [])
  useEffect(()=>{
    const onStorage = (e: StorageEvent) => {
      if (e.key==='stm-auth') setAuthed(e.newValue==='true')
    }
    window.addEventListener('storage', onStorage)
    return ()=>window.removeEventListener('storage', onStorage)
  },[])
  useEffect(()=>{
    ensureAuth().then(()=>{
      setAuthed(isAuthed())
      setLoading(false)
    })
  },[])
  useEffect(()=>{
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false)
    }
    if (sidebarOpen) window.addEventListener('keydown', onKey)
    return ()=>window.removeEventListener('keydown', onKey)
  }, [sidebarOpen])
  useEffect(()=>{
    if (!sidebarOpen) return
    const prevBodyOverflow = document.body.style.overflow
    const prevHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevBodyOverflow
      document.documentElement.style.overflow = prevHtmlOverflow
    }
  }, [sidebarOpen])
  useEffect(()=>{
    if (!sidebarOpen) return
    const sidebar = sidebarRef.current
    if (!sidebar) return
    const focusable = sidebar.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')
    const first = focusable[0]
    const last = focusable[focusable.length - 1] || first
    first?.focus()
    const onTab = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || focusable.length === 0) return
      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault()
          const target = last || first
          if (target) target.focus()
        }
      } else if (document.activeElement === last) {
        event.preventDefault()
        if (first) first.focus()
      }
    }
    document.addEventListener('keydown', onTab)
    return () => document.removeEventListener('keydown', onTab)
  }, [sidebarOpen])
  useEffect(()=>{
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('stm-theme', theme)
  },[theme])
  useEffect(()=>{
    if (!notificationsOpen) return
    const onClick = (event: MouseEvent) => {
      const target = event.target as Node | null
      if (notificationPanelRef.current?.contains(target)) return
      if (notificationButtonRef.current?.contains(target)) return
      setNotificationsOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [notificationsOpen])
  useEffect(()=>{
    if (!notificationsOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setNotificationsOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [notificationsOpen])
  const unreadCount = 0
  return (
    <div className="layout" data-sidebar={sidebarOpen ? 'open' : 'closed'}>
      <div className="floating-controls" aria-live="polite">
        <div className="floating-controls__cluster floating-controls__cluster--left">
          <div className="overlay-block">
            <button
              className="button button-secondary box-frame"
              aria-expanded={sidebarOpen}
              aria-controls="app-sidebar"
              aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
              onClick={()=>setSidebarOpen(s=>!s)}
            >{sidebarOpen?'Close Menu':'☰ Menu'}</button>
          </div>
          <div className="overlay-block">
            <span className="overlay-label">Theme</span>
            <label className="switch theme-toggle" title={theme==='light'?'Enable dark mode':'Disable dark mode'}>
              <input
                id="theme-input"
                type="checkbox"
                checked={theme==='light'}
                onChange={e=>setTheme(e.currentTarget.checked?'light':'dark')}
                aria-label="Toggle theme"
              />
              <div className="slider round">
                <div className="sun-moon">
                  <svg id="moon-dot-1" className="moon-dot" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" /></svg>
                  <svg id="moon-dot-2" className="moon-dot" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" /></svg>
                  <svg id="moon-dot-3" className="moon-dot" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" /></svg>
                  <svg id="light-ray-1" className="light-ray" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" /></svg>
                  <svg id="light-ray-2" className="light-ray" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" /></svg>
                  <svg id="light-ray-3" className="light-ray" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" /></svg>
                  <svg id="cloud-1" className="cloud-dark" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" /></svg>
                  <svg id="cloud-2" className="cloud-dark" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" /></svg>
                  <svg id="cloud-3" className="cloud-dark" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" /></svg>
                  <svg id="cloud-4" className="cloud-light" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" /></svg>
                  <svg id="cloud-5" className="cloud-light" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" /></svg>
                  <svg id="cloud-6" className="cloud-light" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" /></svg>
                </div>
                <div className="stars">
                  <svg id="star-1" className="star" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" /></svg>
                  <svg id="star-2" className="star" viewBox="0 0 20 20"><circle cx="10" cy="10" r="3" /></svg>
                  <svg id="star-3" className="star" viewBox="0 0 20 20"><circle cx="10" cy="10" r="6" /></svg>
                  <svg id="star-4" className="star" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" /></svg>
                </div>
              </div>
            </label>
          </div>
        </div>
        <div className="floating-controls__cluster floating-controls__cluster--right">
          <div className="overlay-block notification-overlay">
            <span className="overlay-label">Alerts</span>
            <div className="notification-anchor">
              <button
                ref={notificationButtonRef}
                className={`button button-secondary notification-bell${notificationsOpen ? ' is-active' : ''}`}
                aria-pressed={notificationsOpen}
                aria-expanded={notificationsOpen}
                aria-controls="notification-center"
                onClick={()=>setNotificationsOpen(open=>!open)}
              >
                <span className="notification-bell__icon" aria-hidden="true">🔔</span>
                <span className="visually-hidden">Toggle notifications</span>
                {unreadCount > 0 && <span className="notification-bell__badge" aria-hidden="true">{unreadCount}</span>}
              </button>
              {notificationsOpen && (
                <div
                  id="notification-center"
                  className="notification-popover"
                  role="dialog"
                  aria-label="Notifications"
                  ref={notificationPanelRef}
                >
                  <NotificationCenter />
                </div>
              )}
            </div>
          </div>
          <div className="overlay-block">
            <span className="overlay-label">{authed ? 'Session' : 'Account'}</span>
            {authed ? (
              <button className="button btn-glitch" onClick={async()=>{ await logout(); setAuthed(false); setSidebarOpen(false); navigate('/signin'); }}>
                <span className="text">Logout</span>
                <span className="decoration" aria-hidden="true">→</span>
              </button>
            ) : (
              <div className="topbar-auth" style={{ width:'100%' }}>
                <button className="button btn-glitch" onClick={()=>{ setSidebarOpen(false); navigate('/signin') }}>
                  <span className="text">Login</span>
                  <span className="decoration" aria-hidden="true">→</span>
                </button>
                <button className="button button-secondary" onClick={()=>{ setSidebarOpen(false); navigate('/signup') }}>Sign Up</button>
              </div>
            )}
          </div>
        </div>
      </div>
      <aside
        className="sidebar"
        id="app-sidebar"
        aria-hidden={!sidebarOpen}
        ref={sidebarRef}
      >
        <div className="brand">Smart Task Manager</div>
        <nav className="nav" role="navigation" aria-label="Primary">
          <NavLink to="/" end onClick={()=>setSidebarOpen(false)}>Dashboard</NavLink>
          <NavLink to="/tasks" onClick={()=>setSidebarOpen(false)}>My Tasks</NavLink>
          <NavLink to="/focus" onClick={()=>setSidebarOpen(false)}>Focus Center</NavLink>
          <NavLink to="/calendar" onClick={()=>setSidebarOpen(false)}>Calendar</NavLink>
          <NavLink to="/recurring" onClick={()=>setSidebarOpen(false)}>Recurring</NavLink>
          <NavLink to="/settings" onClick={()=>setSidebarOpen(false)}>Settings</NavLink>
        </nav>
      </aside>
      <div className="sidebar-backdrop" aria-hidden onClick={()=>setSidebarOpen(false)} />
      <main className="animate-page" aria-hidden={sidebarOpen}>
        {loading && <LoadingScreen />}
        <div className="topbar" />
        <Routes>
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={authed ? <Navigate to="/" replace /> : <SignUp />} />
          {loading ? (
            <Route path="*" element={<div style={{ padding: 20, textAlign: 'center' }}>Loading application...</div>} />
          ) : (
            <>
          <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/tasks" element={<RequireAuth><Tasks /></RequireAuth>} />
          <Route path="/focus" element={<RequireAuth><Focus /></RequireAuth>} />
          <Route path="/calendar" element={<RequireAuth><Calendar /></RequireAuth>} />
          <Route path="/recurring" element={<RequireAuth><Recurring /></RequireAuth>} />
          <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
            </>
          )}
        </Routes>
      </main>
    </div>
  )
}