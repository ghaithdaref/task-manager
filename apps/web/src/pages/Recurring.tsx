import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ensureAuth } from '../api/client'
import Modal from '../components/Modal'

export default function Recurring() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<any | undefined>(undefined)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const [type, setType] = useState('weekly')
  const [interval, setInterval] = useState(1)
  const [endDate, setEndDate] = useState('')
  const [formError, setFormError] = useState('')
  useEffect(()=>{ ensureAuth() },[])
  const { data, isLoading, error } = useQuery({ queryKey: ['recurring'], queryFn: async () => (await api.get('/recurring')).data })
  const resetForm = () => {
    setTitle('')
    setDescription('')
    setPriority('medium')
    setType('weekly')
    setInterval(1)
    setEndDate('')
    setEditing(undefined)
  }
  const closeModal = () => {
    setOpen(false)
    resetForm()
    setFormError('')
  }
  const openNewRule = () => {
    resetForm()
    setFormError('')
    setOpen(true)
  }
  const handleEdit = (r: any) => {
    setEditing(r)
    setTitle(r.title || '')
    setDescription(r.description || '')
    setPriority(r.priority || 'medium')
    setType(r.type || 'weekly')
    setInterval(r.interval || 1)
    setEndDate(r.endDate || '')
    setFormError('')
    setOpen(true)
  }
  const createRecurring = useMutation({
    mutationFn: async () => (await api.post('/recurring', { title, description, priority, type, interval, endDate: endDate || undefined })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recurring'] })
      closeModal()
    },
    onError: () => setFormError('Unable to create recurring task right now.')
  })
  const del = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/recurring/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurring'] })
  })
  const updateRecurring = useMutation({
    mutationFn: async () => (await api.patch(`/recurring/${editing!.id}`, { title, description, priority, type, interval, endDate: endDate || undefined })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recurring'] })
      closeModal()
    },
    onError: () => setFormError('Unable to update recurring task.')
  })
  const toggle = useMutation({ mutationFn: async (r: any) => { const isEnabled = r.enabled !== false; return (await api.patch(`/recurring/${r.id}`, { enabled: !isEnabled })).data }, onSuccess: () => qc.invalidateQueries({ queryKey: ['recurring'] }) })
  const rules = Array.isArray(data) ? data : []
  const priorityOptions = ['low','medium','high'] as const
  const recurrenceOptions = ['daily','weekly','monthly'] as const
  const modalBusy = editing ? updateRecurring.isPending : createRecurring.isPending
  const isSaveDisabled = !title.trim() || interval < 1 || modalBusy
  return (
    <div className="content">
      <h1>Recurring Tasks</h1>
      <div className="task-toolbar recurring-toolbar card-float">
        <div>
          <span className="task-toolbar__eyebrow">Automations</span>
          <div className="task-toolbar__title">Keep tasks on schedule</div>
          <p className="task-toolbar__copy">Create smart rules, pause them, or add the next batch with one click.</p>
        </div>
        <div className="recurring-toolbar__actions">
          <button className="button btn-glitch" onClick={openNewRule}>
            New Recurring Task
          </button>
        </div>
      </div>
      {isLoading && <div className="card card-float recurring-empty">Loading recurring rules…</div>}
      {error && <div className="card card-float recurring-empty" style={{ color:'var(--title1)' }}>Failed to load recurring rules.</div>}
      {!isLoading && !error && rules.length === 0 && (
        <div className="card card-float recurring-empty">
          <p>No recurring rules yet. Create one to automate task creation.</p>
          <button className="button button-primary" onClick={openNewRule}>Create first rule</button>
        </div>
      )}
      <div className="list motion-grid">
        {rules.map((r:any)=>(
          <div key={r.id} className="item card-float recurring-item">
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <input type="checkbox" className="task-checkbox" checked={r.enabled!==false} onChange={()=>toggle.mutate(r)} aria-label="Enable rule" />
              <div className="recurring-item__details">
                <div className="recurring-item__title">{r.title}</div>
                <div className="recurring-item__meta">
                  <span className="badge">{r.priority} · {r.type} / {r.interval}</span>
                  <span className={`recurring-status${r.enabled===false?' recurring-status--paused':''}`}>
                    {r.enabled===false ? 'Paused' : 'Active'}
                  </span>
                </div>
              </div>
            </div>
            <div className="task-actions">
              <button className="button button-ghost" onClick={()=>handleEdit(r)}>
                Edit
              </button>
              <button className="button button-danger" onClick={()=>del.mutate(r.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
      <Modal open={open} title={editing ? 'Edit Recurring Task' : 'Create Recurring Task'} onClose={closeModal}
        actions={<>
          <button className="button button-ghost" onClick={closeModal} disabled={modalBusy}>Cancel</button>
          {editing ? (
            <button className="button button-primary" onClick={()=>updateRecurring.mutate()} disabled={isSaveDisabled}>
              {updateRecurring.isPending ? 'Saving...' : 'Save'}
            </button>
          ) : (
            <button className="button button-primary" onClick={()=>createRecurring.mutate()} disabled={isSaveDisabled}>
              {createRecurring.isPending ? 'Creating...' : 'Create'}
            </button>
          )}
        </>}>
        <div className="modal-stack">
          <div className="modal-field">
            <label htmlFor="rule-title">Title *</label>
            <input id="rule-title" className="input" value={title} onChange={e=>setTitle(e.target.value)} />
          </div>
          <div className="modal-field">
            <label htmlFor="rule-description">Description</label>
            <textarea id="rule-description" className="input" value={description} onChange={e=>setDescription(e.target.value)} style={{ minHeight:100, resize:'vertical' }} />
          </div>
          <div className="modal-two-col">
            <div className="modal-field">
              <span>Priority</span>
              <div className="pill-group">
                {priorityOptions.map(level=>(
                  <button
                    key={level}
                    type="button"
                    className={`pill-option priority-${level}${priority===level?' is-active':''}`}
                    onClick={()=>setPriority(level)}
                    aria-pressed={priority===level}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
            <div className="modal-field">
              <span>Recurrence type</span>
              <div className="pill-group">
                {recurrenceOptions.map(option=>(
                  <button
                    key={option}
                    type="button"
                    className={`pill-option pill-option--recurrence${type===option?' is-active':''}`}
                    onClick={()=>setType(option)}
                    aria-pressed={type===option}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="modal-two-col">
            <div className="modal-field">
              <label htmlFor="rule-interval">Interval</label>
              <input
                id="rule-interval"
                className="input"
                type="number"
                min={1}
                value={interval}
                onChange={e=>setInterval(Math.max(1, parseInt(e.target.value||'1', 10) || 1))}
              />
              <p className="field-hint">How often to spawn the next task.</p>
            </div>
            <div className="modal-field">
              <label htmlFor="rule-end-date">End date (optional)</label>
              <input id="rule-end-date" className="input" type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} />
              <p className="field-hint">Leave blank to repeat indefinitely.</p>
            </div>
          </div>
          {formError && <div className="form-banner form-banner--error" role="alert">{formError}</div>}
        </div>
      </Modal>
    </div>
  )
}