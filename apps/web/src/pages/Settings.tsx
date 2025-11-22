import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api, changePassword } from '../api/client'
import Modal from '../components/Modal'
import { ensurePermission } from '../utils/notify'

export default function Settings() {
  const [theme, setTheme] = useState(localStorage.getItem('stm-theme')||'light')
  const [compact, setCompact] = useState(localStorage.getItem('stm-compact')==='true')
  const [accent1, setAccent1] = useState(localStorage.getItem('stm-accent1') || getComputedStyle(document.documentElement).getPropertyValue('--title1').trim() || '#ff4d9e')
  const [accent2, setAccent2] = useState(localStorage.getItem('stm-accent2') || getComputedStyle(document.documentElement).getPropertyValue('--title2').trim() || '#8a5cff')
  const [accent3, setAccent3] = useState(localStorage.getItem('stm-accent3') || getComputedStyle(document.documentElement).getPropertyValue('--title3').trim() || '#00c2a8')
  const [defaultPriority, setDefaultPriority] = useState(localStorage.getItem('stm-default-priority') || 'medium')
  const [profileOpen, setProfileOpen] = useState(false)
  const [dataOpen, setDataOpen] = useState(false)
  const [notifyOpen, setNotifyOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPasswordValue, setNewPasswordValue] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [reminders, setReminders] = useState(localStorage.getItem('stm-reminders')==='true')
  const [notifications, setNotifications] = useState(localStorage.getItem('stm-notifications')==='true')
  const supportsNotifications = typeof window !== 'undefined' && 'Notification' in window
  const openPasswordModal = () => {
    setPasswordFeedback(null)
    setCurrentPassword('')
    setNewPasswordValue('')
    setConfirmPassword('')
    setPasswordOpen(true)
  }
  const closePasswordModal = () => {
    setPasswordOpen(false)
    setCurrentPassword('')
    setNewPasswordValue('')
    setConfirmPassword('')
    setPasswordFeedback(null)
  }
  const passwordMutation = useMutation({
    mutationFn: async () => {
      if (newPasswordValue !== confirmPassword) {
        throw new Error('Passwords do not match')
      }
      const result = await changePassword(currentPassword, newPasswordValue)
      if (!result.ok) {
        throw new Error(result.error || 'Unable to update password')
      }
    },
    onSuccess: () => {
      setPasswordFeedback({ type: 'success', text: 'Password updated successfully.' })
      setCurrentPassword('')
      setNewPasswordValue('')
      setConfirmPassword('')
    },
    onError: (error: any) => {
      setPasswordFeedback({ type: 'error', text: error?.message || 'Unable to update password. Please try again.' })
    }
  })
  
  const requestNotifications = async () => {
    if (!supportsNotifications) return
    try {
      await ensurePermission()
    } catch {}
  }
  
  useEffect(()=>{
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('stm-theme', theme)
  },[theme])
  useEffect(()=>{
    document.documentElement.setAttribute('data-compact', compact ? 'true' : 'false')
    localStorage.setItem('stm-compact', compact ? 'true' : 'false')
  },[compact])
  useEffect(()=>{
    document.documentElement.style.setProperty('--title1', accent1)
    document.documentElement.style.setProperty('--title2', accent2)
    document.documentElement.style.setProperty('--title3', accent3)
    localStorage.setItem('stm-accent1', accent1)
    localStorage.setItem('stm-accent2', accent2)
    localStorage.setItem('stm-accent3', accent3)
  },[accent1, accent2, accent3])
  useEffect(()=>{
    localStorage.setItem('stm-default-priority', defaultPriority)
  },[defaultPriority])
  useEffect(()=>{
    localStorage.setItem('stm-reminders', reminders ? 'true' : 'false')
  },[reminders])
  useEffect(()=>{
    localStorage.setItem('stm-notifications', notifications ? 'true' : 'false')
    if (notifications && supportsNotifications) requestNotifications()
  },[notifications, supportsNotifications])
  return (
    <div className="content">
      <h1>Settings</h1>

      <div className="settings-launch-grid">
        <div className="card settings-launch-card">
          <div>
            <div className="settings-section-title">Profile & Appearance</div>
            <p className="settings-section-description">Adjust theme, spacing, and accent colors in one focused overlay.</p>
          </div>
          <button className="button button-secondary" onClick={()=>setProfileOpen(true)}>Show options</button>
        </div>
        <div className="card settings-launch-card">
          <div>
            <div className="settings-section-title">Data & Backup</div>
            <p className="settings-section-description">Export or import JSON backups without leaving your current flow.</p>
          </div>
          <button className="button button-secondary" onClick={()=>setDataOpen(true)}>Show options</button>
        </div>
        <div className="card settings-launch-card">
          <div>
            <div className="settings-section-title">Notifications & Shortcuts</div>
            <p className="settings-section-description">Toggle reminders, enable desktop alerts, and keep shortcuts handy.</p>
          </div>
          <button className="button button-secondary" onClick={()=>setNotifyOpen(true)}>Show options</button>
        </div>
        <div className="card settings-launch-card">
          <div>
            <div className="settings-section-title">Security</div>
            <p className="settings-section-description">Update your password to keep your workspace protected.</p>
          </div>
          <button className="button button-secondary" onClick={openPasswordModal}>Show options</button>
        </div>
      </div>

      <Modal open={profileOpen} title="Profile & Appearance" onClose={()=>setProfileOpen(false)} actions={<button className="button button-ghost" onClick={()=>setProfileOpen(false)}>Done</button>}>
        <div className="settings-modal-stack">
          <div className="settings-row">
            <div>Theme</div>
            <button className="button button-secondary" onClick={()=>setTheme(theme==='light'?'dark':'light')}>{theme==='light'?'🌙 Dark Mode':'☀️ Light Mode'}</button>
          </div>
          <div className="settings-form-grid">
            <label style={{ display:'grid', gap:6 }}>
              <span>Compact mode</span>
              <input type="checkbox" checked={compact} onChange={e=>setCompact(e.target.checked)} />
            </label>
            <label style={{ display:'grid', gap:6 }}>
              <span>Default task priority</span>
              <select className="input" value={defaultPriority} onChange={e=>setDefaultPriority(e.target.value)} style={{ width:'100%' }}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
          </div>
          <div>
            <div className="settings-subtitle">Accent colors</div>
            <div className="settings-accent-grid">
              <label style={{ display:'grid', gap:6 }}>
                <span>Title 1</span>
                <input type="color" value={accent1} onChange={e=>setAccent1(e.target.value)} />
              </label>
              <label style={{ display:'grid', gap:6 }}>
                <span>Title 2</span>
                <input type="color" value={accent2} onChange={e=>setAccent2(e.target.value)} />
              </label>
              <label style={{ display:'grid', gap:6 }}>
                <span>Title 3</span>
                <input type="color" value={accent3} onChange={e=>setAccent3(e.target.value)} />
              </label>
            </div>
          </div>
        </div>
      </Modal>

      <Modal open={dataOpen} title="Data & Backup" onClose={()=>setDataOpen(false)} actions={<button className="button button-ghost" onClick={()=>setDataOpen(false)}>Close</button>}>
        <div className="settings-modal-stack">
          <div className="settings-action-row">
            <button className="button primary-outline" onClick={async()=>{
              const tasks = (await api.get('/tasks')).data
              const blob = new Blob([JSON.stringify(tasks,null,2)], { type:'application/json' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = 'tasks-export.json'
              a.click()
              URL.revokeObjectURL(url)
            }}>Export JSON</button>
            <label className="button button-ghost" style={{ display:'inline-block', cursor:'pointer' }}>
              Import JSON
              <input type="file" accept="application/json" style={{ display:'none' }} onChange={async e=>{
                const file = e.target.files?.[0]
                if (!file) return
                const text = await file.text()
                try {
                  const arr = JSON.parse(text)
                  if (Array.isArray(arr)) {
                    for (const t of arr) {
                      const payload:any = { title: t.title, description: t.description, dueDate: t.dueDate, priority: t.priority || 'medium', status: t.status || 'pending' }
                      await api.post('/tasks', payload)
                    }
                  }
                  alert('Import complete')
                } catch (err) {
                  alert('Invalid JSON file')
                }
                e.currentTarget.value = ''
              }} />
            </label>
          </div>
          <p className="settings-description">Tip: exports include all task fields. Keep backups in a secure location.</p>
        </div>
      </Modal>

      <Modal open={notifyOpen} title="Notifications & Shortcuts" onClose={()=>setNotifyOpen(false)} actions={<button className="button button-ghost" onClick={()=>setNotifyOpen(false)}>Close</button>}>
        <div className="settings-modal-stack">
          <div className="settings-form-grid">
            <label style={{ display:'grid', gap:6 }}>
              <span>Daily reminders (UI)</span>
              <input type="checkbox" checked={reminders} onChange={e=>setReminders(e.target.checked)} />
            </label>
            <label style={{ display:'grid', gap:6 }}>
              <span>Desktop notifications</span>
              <span className="settings-description">
                Receive OS alerts when tasks are due today or overdue.
              </span>
              <input
                type="checkbox"
                checked={supportsNotifications && notifications}
                onChange={e=>{
                  if (!supportsNotifications) return
                  setNotifications(e.target.checked)
                }}
                disabled={!supportsNotifications}
              />
              {!supportsNotifications && (
                <span style={{ fontSize:12, color:'var(--title1)' }}>Not supported in this browser</span>
              )}
            </label>
          </div>
          <div className="settings-action-row">
            <button className="button button-secondary" onClick={()=>setShortcutsOpen(true)}>Keyboard shortcuts</button>
          </div>
        </div>
      </Modal>

      <Modal
        open={passwordOpen}
        title="Change Password"
        onClose={closePasswordModal}
        actions={
          <>
            <button className="button button-ghost" onClick={closePasswordModal}>Cancel</button>
            <button
              className="button button-primary"
              onClick={()=>passwordMutation.mutate()}
              disabled={!currentPassword || !newPasswordValue || !confirmPassword || passwordMutation.isPending}
            >
              {passwordMutation.isPending ? 'Updating…' : 'Update password'}
            </button>
          </>
        }
      >
        <div className="settings-modal-stack">
          {passwordFeedback && (
            <div style={{ padding:12, borderRadius:12, background: passwordFeedback.type==='success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.15)', color: passwordFeedback.type==='success' ? '#065f46' : '#7f1d1d' }}>
              {passwordFeedback.text}
            </div>
          )}
          <label style={{ display:'grid', gap:6 }}>
            <span>Current password</span>
            <input className="input" type="password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} />
          </label>
          <label style={{ display:'grid', gap:6 }}>
            <span>New password</span>
            <input className="input" type="password" value={newPasswordValue} onChange={e=>setNewPasswordValue(e.target.value)} placeholder="At least 8 chars, Aa1!" />
          </label>
          <label style={{ display:'grid', gap:6 }}>
            <span>Confirm new password</span>
            <input className="input" type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} />
          </label>
        </div>
      </Modal>

      <Modal open={shortcutsOpen} title={'Keyboard Shortcuts'} onClose={()=>setShortcutsOpen(false)} actions={<button className="button button-ghost" onClick={()=>setShortcutsOpen(false)}>Close</button>}>
        <div style={{ display:'grid', gap:8 }}>
          <div><b>Global</b></div>
          <div>Alt + N — New task</div>
          <div>Alt + F — Focus search</div>
          <div>Alt + T — Toggle theme</div>
        </div>
      </Modal>
    </div>
  )
}