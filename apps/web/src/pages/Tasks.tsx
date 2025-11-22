import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Task, TaskStatus } from '../api/types'
import TaskModal from '../components/TaskModal'
import Modal from '../components/Modal'
import FocusTimer from '../components/FocusTimer'
import { DndContext, closestCenter, useSensor, useSensors, MouseSensor, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const STATUS_META: Record<TaskStatus, { label: string; cardClass: string; pillClass: string }> = {
  pending: { label: 'Pending', cardClass: 'task-card--pending', pillClass: 'status-pill--pending' },
  in_progress: { label: 'In progress', cardClass: 'task-card--in-progress', pillClass: 'status-pill--in-progress' },
  completed: { label: 'Completed', cardClass: 'task-card--completed', pillClass: 'status-pill--completed' }
}

export default function Tasks() {
  
  const qc = useQueryClient()
  const statusFilterOptions = [
    { label: 'All', value: '' },
    { label: 'Pending', value: 'pending' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Completed', value: 'completed' }
  ] as const
  const priorityFilterOptions = [
    { label: 'All', value: '' },
    { label: 'Low', value: 'low' },
    { label: 'Medium', value: 'medium' },
    { label: 'High', value: 'high' }
  ] as const
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [priorityFilter, setPriorityFilter] = useState<string>('')
  const [search, setSearch] = useState('')
  const params = useMemo(()=>{
    const p: any = {}
    if (statusFilter) p.status = statusFilter
    if (priorityFilter) p.priority = priorityFilter
    if (search) p.search = search
    return p
  }, [statusFilter, priorityFilter, search])
  const { data, isLoading, error } = useQuery<Task[]>({ queryKey: ['tasks', params], queryFn: async () => (await api.get('/tasks', { params })).data, retry: false, refetchOnWindowFocus: false })
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Task | undefined>(undefined)
  const [timerOpen, setTimerOpen] = useState(false)
  const [timerTask, setTimerTask] = useState<Task | null>(null)
  const del = useMutation({ mutationFn: async (id: string) => (await api.delete(`/tasks/${id}`)).data, onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }) })
  const setStatus = useMutation({ mutationFn: async ({ t, next }: { t: Task; next: TaskStatus }) => (await api.patch(`/tasks/${t.id}`, { status: next })).data, onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }) })
  const sensors = useSensors(useSensor(MouseSensor))
  const [orderedTasks, setOrderedTasks] = useState<Task[]>([])
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({})
  const orderMutation = useMutation({
    mutationFn: async (tasksToPersist: Task[]) => {
      await Promise.all(tasksToPersist.map((task, index) => api.patch(`/tasks/${task.id}`, { orderIndex: index + 1 })))
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
    }
  })
  useEffect(() => {
    if (Array.isArray(data)) {
      const sorted = [...data].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
      setOrderedTasks(sorted)
    } else {
      setOrderedTasks([])
    }
  }, [data])
  const toggleDescription = (id: string) => {
    setExpandedDescriptions(prev => ({ ...prev, [id]: !prev[id] }))
  }
  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!active || !over || active.id === over.id) return
    const fromIndex = orderedTasks.findIndex(t => t.id === active.id)
    const toIndex = orderedTasks.findIndex(t => t.id === over.id)
    if (fromIndex < 0 || toIndex < 0) return
    const reordered = arrayMove(orderedTasks, fromIndex, toIndex).map((task, index) => ({ ...task, orderIndex: index + 1 }))
    setOrderedTasks(reordered)
    orderMutation.mutate(reordered)
  }
  const clearFilters = () => {
    setStatusFilter('')
    setPriorityFilter('')
    setSearch('')
  }
  const openFocusTimer = (task: Task) => {
    setTimerTask(task)
    setTimerOpen(true)
  }
  const closeFocusTimer = () => {
    setTimerOpen(false)
    setTimerTask(null)
  }
  return (
    <div className="content animate-page">
      <h1>My Tasks</h1>
      {isLoading && <div style={{ padding:12 }}>Loading...</div>}
      {error && <div style={{ padding:12, color:'var(--title1)' }}>Failed to load tasks.</div>}
      <div className="task-toolbar card-float">
        <div className="task-toolbar__info">
          <span className="task-toolbar__eyebrow">Focus mode</span>
          <span className="task-toolbar__title">Dial in the list</span>
          <p className="task-toolbar__copy">Search or filter, then add a fresh task when inspiration strikes.</p>
        </div>
        <div className="task-toolbar__filters">
          <div className="filter-field filter-field--search">
            <div className="filter-field__label">Search</div>
            <p className="filter-field__hint">Find a task by its title</p>
            <div className="input-shell">
              <span aria-hidden className="input-icon">🔍</span>
              <input
                className="input input-search"
                placeholder="Search by title…"
                value={search}
                onChange={e=>setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="filter-field">
            <div className="filter-field__label">Status</div>
            <div className="filter-chip-group" role="group" aria-label="Filter by status">
              {statusFilterOptions.map(option=>(
                <button
                  key={option.value || 'all'}
                  type="button"
                  className={`filter-chip${statusFilter===option.value ? ' is-active' : ''}`}
                  onClick={()=>setStatusFilter(option.value)}
                  aria-pressed={statusFilter===option.value}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-field">
            <div className="filter-field__label">Priority</div>
            <div className="filter-chip-group" role="group" aria-label="Filter by priority">
              {priorityFilterOptions.map(option=>(
                <button
                  key={option.value || 'all'}
                  type="button"
                  className={`filter-chip${option.value ? ` priority-${option.value}` : ''}${priorityFilter===option.value ? ' is-active' : ''}`}
                  onClick={()=>setPriorityFilter(option.value)}
                  aria-pressed={priorityFilter===option.value}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="task-toolbar__actions">
          <button className="button button-ghost" onClick={clearFilters} disabled={!search && !statusFilter && !priorityFilter}>Clear Filters</button>
          <button className="button btn-glitch" onClick={()=>{ setEditing(undefined); setOpen(true) }}>New Task</button>
        </div>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={orderedTasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
          <div className="list motion-grid">
            {orderedTasks.map(task => {
              const tone = STATUS_META[task.status] ?? STATUS_META.pending
              const checkboxId = `task-check-${task.id}`
              return (
                <SortableTaskCard
                  key={task.id}
                  task={task}
                  checkboxId={checkboxId}
                  tone={tone}
                  expanded={!!expandedDescriptions[task.id]}
                  onToggleDescription={()=>toggleDescription(task.id)}
                  onToggleComplete={(checked)=>setStatus.mutate({ t: task, next: checked ? 'completed' : 'in_progress' })}
                  onMarkPending={()=>setStatus.mutate({ t: task, next:'pending' })}
                  onUnpin={()=>setStatus.mutate({ t: task, next:'in_progress' })}
                  onEdit={()=>{ setEditing(task); setOpen(true) }}
                  onDelete={()=>del.mutate(task.id)}
                />
              )
            })}
          </div>
        </SortableContext>
      </DndContext>
      <TaskModal open={open} onClose={()=>{ setOpen(false); setEditing(undefined) }} task={editing} />
      <Modal open={timerOpen} title={timerTask ? `Focus: ${timerTask.title}` : 'Focus mode'} onClose={closeFocusTimer}>
        <FocusTimer taskId={timerTask?.id} taskTitle={timerTask?.title} />
      </Modal>
    </div>
  )
}

type SortableTaskCardProps = {
  task: Task
  checkboxId: string
  tone: { label: string; cardClass: string; pillClass: string }
  expanded: boolean
  onToggleDescription: () => void
  onToggleComplete: (checked: boolean) => void
  onMarkPending: () => void
  onUnpin: () => void
  onEdit: () => void
  onDelete: () => void
}

function SortableTaskCard({ task, checkboxId, tone, expanded, onToggleDescription, onToggleComplete, onMarkPending, onUnpin, onEdit, onDelete }: SortableTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1
  }
  return (
    <div ref={setNodeRef} style={style} className={`item card-float task-card ${tone.cardClass}`}>
      <div className="task-card__header">
        <button className="task-drag-handle" aria-label={`Drag ${task.title}`} {...attributes} {...listeners}>
          <span />
        </button>
        <div className="task-card__info">
          <input
            id={checkboxId}
            type="checkbox"
            className="task-checkbox-ui"
            checked={task.status==='completed'}
            onChange={e=>onToggleComplete(e.currentTarget.checked)}
            aria-label="Toggle status"
          />
          <label htmlFor={checkboxId} className="checkbox-label">
            <div className="checkbox-box">
              <div className="checkbox-fill" />
              <div className="checkmark">
                <svg viewBox="0 0 24 24" className="check-icon">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                </svg>
              </div>
              <div className="success-ripple" />
            </div>
            <span className="checkbox-text">{task.title}</span>
                  <div className={`priority-badge priority-${task.priority}`} style={{ marginLeft:8 }}>{task.priority}</div>
          </label>
        </div>
      </div>
      <div className="task-actions">
        <span className={`status-pill ${tone.pillClass}`}>{tone.label}</span>
        <button className="button button-ghost" onClick={onToggleDescription} disabled={!task.description}>{expanded ? 'Hide Description' : 'Show Description'}</button>
        {task.status === 'pending'
          ? <button className="button button-ghost" onClick={onUnpin}>Unpin</button>
          : <button className="button button-ghost" onClick={onMarkPending}>Mark Pending</button>
        }
          <button className="button button-ghost" onClick={()=>openFocusTimer(task)}>Focus</button>
        <button className="button button-ghost" onClick={onEdit}>Edit</button>
        <button className="button button-danger" onClick={onDelete}>Delete</button>
      </div>
      {expanded && task.description && (
        <div className="task-description">
          {task.description}
        </div>
      )}
    </div>
  )
}