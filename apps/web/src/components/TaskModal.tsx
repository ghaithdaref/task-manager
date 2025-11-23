import { useEffect, useMemo, useState } from 'react'
import Modal from './Modal'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { TaskPriority } from '../api/types'
import DatePicker from './DatePicker'

type Props = { open: boolean; onClose: () => void; task?: any; initialDueDate?: string }

export default function TaskModal({ open, onClose, task, initialDueDate }: Props) {
  const defaultPriority = useMemo(() => {
    if (typeof window === 'undefined') return 'medium'
    try {
      return localStorage.getItem('stm-default-priority') || 'medium'
    } catch {
      return 'medium'
    }
  }, [])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState(defaultPriority as TaskPriority)
  const [error, setError] = useState('')
  const qc = useQueryClient()
  const isEdit = !!task
  const priorityOptions: TaskPriority[] = ['low','medium','high']
  useEffect(() => {
    if (!open) return
    setTitle(task?.title || '')
    setDescription(task?.description || '')
    setDueDate(task?.dueDate || initialDueDate || '')
    setPriority(task?.priority || defaultPriority)
    setError('')
  }, [task, open, defaultPriority, initialDueDate])
  const mutation = useMutation({
    mutationFn: async () => {
      if (isEdit) return (await api.patch(`/tasks/${task.id}`, { title, description, dueDate, priority })).data
      return (await api.post('/tasks', { title, description, dueDate, priority })).data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['tasks-summary'] })
      onClose()
    },
    onError: (error: any) => {
      console.error('Task mutation error:', error)
      const errorMessage = error?.response?.data?.message || error?.response?.data?.error || error?.message || 'Something went wrong. Please try again.'
      setError(errorMessage)
    }
  })
  return (
    <Modal open={open} title={isEdit ? 'Edit Task' : 'Create New Task'} onClose={onClose}
      actions={<>
        <button className="button button-ghost" onClick={onClose}>Cancel</button>
        <button className="button button-primary" onClick={()=>mutation.mutate()} disabled={!title || mutation.isPending}>
          {mutation.isPending ? 'Saving...' : isEdit ? 'Save' : 'Create Task'}
        </button>
      </>}>
      <div className="modal-stack">
        {error && <div className="form-banner form-banner--error">{error}</div>}
        <div className="modal-field">
          <label htmlFor="task-title">Title *</label>
          <input id="task-title" className="input" value={title} onChange={e=>setTitle(e.target.value)} />
        </div>
        <div className="modal-field">
          <label htmlFor="task-description">Description</label>
          <textarea id="task-description" className="input" value={description} onChange={e=>setDescription(e.target.value)} style={{ minHeight:100, resize:'vertical' }} />
        </div>
        <div className="modal-two-col">
          <div className="modal-field">
            <label htmlFor="task-due-date">Due date</label>
            <DatePicker value={dueDate} onChange={setDueDate} />
          </div>
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
        </div>
      </div>
    </Modal>
  )
}