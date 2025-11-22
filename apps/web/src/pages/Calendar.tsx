import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import { format, startOfMonth, endOfMonth, addMonths, eachDayOfInterval } from 'date-fns'
import TaskModal from '../components/TaskModal'

const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

export default function Calendar() {
  const [month, setMonth] = useState(new Date())
  const [open, setOpen] = useState(false)
  const [presetDate, setPresetDate] = useState('')
  const [editing, setEditing] = useState<any>(undefined)
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) })
  const { data, isLoading, error } = useQuery({ queryKey: ['tasks'], queryFn: async () => (await api.get('/tasks')).data, retry: false, refetchOnWindowFocus: false })
  const tasks = Array.isArray(data) ? data : []
  const monthLabel = format(month, 'MMMM yyyy')
  const start = startOfMonth(month)
  const end = endOfMonth(month)
  const leading = Array(start.getDay()).fill(null)
  const trailingCount = 6 - end.getDay()
  const trailing = trailingCount > 0 ? Array(trailingCount).fill(null) : []
  const paddedDays = [...leading, ...days, ...trailing]
  const tasksByDate = useMemo(()=>{
    const map: Record<string, any[]> = {}
    for (const task of tasks) {
      if (!task?.dueDate) continue
      const dateKey = format(new Date(task.dueDate), 'yyyy-MM-dd')
      if (!map[dateKey]) map[dateKey] = []
      map[dateKey].push(task)
    }
    return map
  }, [tasks])
  const upcoming = useMemo(()=>{
    return tasks
      .filter((t:any)=>t.dueDate)
      .sort((a:any,b:any)=>a.dueDate.localeCompare(b.dueDate))
      .slice(0,10)
  }, [tasks])
  useEffect(()=>{
    if (!selectedDate) {
      if (upcoming.length > 0) {
        setSelectedDate(upcoming[0].dueDate)
      }
      return
    }
    if (tasksByDate[selectedDate] && tasksByDate[selectedDate].length > 0) return
    if (upcoming.length > 0) {
      setSelectedDate(upcoming[0].dueDate)
    }
  }, [selectedDate, tasksByDate, upcoming])
  const openModalForDate = (date?: string, task?: any) => {
    if (task) {
      setEditing(task)
      setPresetDate(task.dueDate || '')
    } else {
      setEditing(undefined)
      setPresetDate(date || '')
    }
    setOpen(true)
  }
  const closeModal = () => {
    setOpen(false)
    setPresetDate('')
    setEditing(undefined)
  }
  const selectDay = (dateKey: string) => {
    setSelectedDate(dateKey)
  }
  const selectedDayTasks = selectedDate ? (tasksByDate[selectedDate] || []) : []
  const selectedLabel = selectedDate ? format(new Date(selectedDate), 'EEE, MMM d') : 'Choose a date'
  return (
    <div className="content calendar-page animate-page">
      <h1>Calendar</h1>
      {(isLoading) && <div style={{ padding:12 }}>Loading...</div>}
      {error && <div style={{ padding:12, color:'var(--title1)' }}>Failed to load tasks.</div>}

      <div className="card card-float calendar-header-card">
        <div>
          <div className="calendar-header-eyebrow">Monthly overview</div>
          <div className="calendar-header-title">{monthLabel}</div>
          <p className="settings-description" style={{ maxWidth:420 }}>Tap any day to add a task or review what’s coming up. Use the agenda pane to triage upcoming work.</p>
        </div>
        <div className="calendar-header-actions">
        <button className="button button-ghost" onClick={()=>{ setMonth(new Date()) }}>Today</button>
          <div className="calendar-nav">
          <button className="button button-icon" aria-label="Previous month" onClick={()=>setMonth(m=>addMonths(m,-1))}>{'<'}</button>
          <button className="button button-icon" aria-label="Next month" onClick={()=>setMonth(m=>addMonths(m,1))}>{'>'}</button>
          </div>
        <button className="button btn-glitch" onClick={()=>openModalForDate()}>New task</button>
        </div>
      </div>

      <div className="calendar-layout motion-grid" data-motion="fast">
        <div className="card card-float calendar-grid-card">
          <div className="calendar-weekdays">
            {WEEKDAYS.map(day => <span key={day}>{day}</span>)}
          </div>
          <div className="calendar-days">
            {paddedDays.map((value, idx) => {
              if (!value) return <div key={`empty-${idx}`} className="calendar-day calendar-day--empty" />
              const dateKey = format(value, 'yyyy-MM-dd')
              const dayTasks = tasksByDate[dateKey] || []
              const displayTasks = dayTasks.slice(0,2)
              const remaining = dayTasks.length - displayTasks.length
              return (
                <button
                  type="button"
                  key={value.toISOString()}
                  className={`calendar-day${selectedDate===dateKey?' calendar-day--selected':''}`}
                  onClick={()=>selectDay(dateKey)}
                >
                  <div className="calendar-day__date">
                    <span className="calendar-day__number">{format(value,'d')}</span>
                    <span className="calendar-day__weekday">{format(value,'EEE')}</span>
                  </div>
                  <div className="calendar-day__tasks">
                    {displayTasks.map((task:any)=>(
                      <span key={task.id} className="calendar-event">{task.title}</span>
                    ))}
                    {remaining > 0 && <span className="calendar-event calendar-event--more">+{remaining} more</span>}
                  </div>
                  <div className="calendar-day__footer">
                    <span className="calendar-day__count">{dayTasks.length} {dayTasks.length===1?'task':'tasks'}</span>
                    <button
                      type="button"
                      className="calendar-day__add"
                      aria-label={`Add task on ${format(value,'EEEE, MMM d')}`}
                      onClick={(e)=>{ e.stopPropagation(); openModalForDate(dateKey) }}
                    >
                      +
                    </button>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
        <div className="card card-float calendar-agenda">
          <div className="calendar-agenda-selected">
            <div className="calendar-agenda-header">
              <div>
                <div className="settings-subtitle">Selected day</div>
                <div className="calendar-agenda-date-label">{selectedLabel}</div>
              </div>
          <button className="button button-ghost" onClick={()=>openModalForDate(selectedDate)} disabled={!selectedDate}>
                Add task
              </button>
            </div>
            <div className="calendar-agenda-list">
              {selectedDayTasks.length === 0 && <div className="settings-description">No tasks planned for this day yet.</div>}
              {selectedDayTasks.map((task:any)=>(
                <div key={task.id} className="calendar-agenda-task">
                  <div>
                    <div className="calendar-agenda-title">{task.title}</div>
                    <div className="calendar-agenda-date">{task.priority || 'medium'} · {task.status?.replace('_',' ')}</div>
                  </div>
                  <button className="button button-ghost" onClick={()=>openModalForDate(undefined, task)}>
                    Edit
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="calendar-agenda-divider" aria-hidden />
          <div>
          <div className="settings-subtitle">Upcoming focus</div>
            <div className="calendar-agenda-list">
              {upcoming.length === 0 && <div className="settings-description">No scheduled tasks yet.</div>}
              {upcoming.map((task:any)=>(
                <div key={task.id} className="calendar-agenda-item">
                  <div>
                    <div className="calendar-agenda-title">{task.title}</div>
                    <div className="calendar-agenda-date">{task.dueDate ? format(new Date(task.dueDate), 'EEE, MMM d') : 'No date'}</div>
                  </div>
                  <div className="calendar-agenda-meta">
                    <span className="badge">{task.priority || 'medium'}</span>
                    <span className="calendar-agenda-status">{task.status?.replace('_',' ') || 'pending'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <TaskModal open={open} onClose={closeModal} initialDueDate={presetDate} task={editing} />
    </div>
  )
}