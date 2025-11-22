import { useEffect, useMemo, useState } from 'react'
import { notify, notificationsEnabled } from '../utils/notify'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { format, addDays } from 'date-fns'
import { useFocusSummary } from '../hooks/useFocusSessions'

export default function Dashboard() {
  
  const { data, isLoading, error } = useQuery({ queryKey: ['tasks-summary'], queryFn: async () => (await api.get('/tasks')).data, retry: false, refetchOnWindowFocus: false })
  
  const total = Array.isArray(data) ? data.length : 0
  const pending = Array.isArray(data) ? data.filter((t:any)=>t.status==='pending').length : 0
  const completed = Array.isArray(data) ? data.filter((t:any)=>t.status==='completed').length : 0
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const overdue = Array.isArray(data) ? data.filter((t:any)=>t.dueDate && t.status!=='completed' && t.dueDate < todayStr).length : 0
  const dueToday = Array.isArray(data) ? data.filter((t:any)=>t.dueDate === todayStr && t.status!=='completed').length : 0
  const upcoming7 = Array.isArray(data) ? data.filter((t:any)=>{
    if (!t.dueDate || t.status==='completed') return false
    return t.dueDate > todayStr && t.dueDate <= format(addDays(new Date(), 7), 'yyyy-MM-dd')
  }).length : 0
  const lowCount = Array.isArray(data) ? data.filter((t:any)=>t.priority==='low').length : 0
  const medCount = Array.isArray(data) ? data.filter((t:any)=>t.priority==='medium').length : 0
  const highCount = Array.isArray(data) ? data.filter((t:any)=>t.priority==='high').length : 0
  const completionPct = total>0 ? Math.round((completed/total)*100) : 0
  const next7 = useMemo(()=>{
    const days = [] as { date: string; count: number }[]
    for (let i=1;i<=7;i++) {
      const d = format(addDays(new Date(), i), 'yyyy-MM-dd')
      const count = Array.isArray(data) ? data.filter((t:any)=>t.dueDate===d && t.status!=='completed').length : 0
      days.push({ date: d, count })
    }
    return days
  }, [data])
  useEffect(()=>{ if (notificationsEnabled() && dueToday>0) notify('Due Today', { body: `${dueToday} tasks due today` }) }, [dueToday])
  const qc = useQueryClient()
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState(localStorage.getItem('stm-default-priority') || 'medium')
  const [createError, setCreateError] = useState('')
  const focusSummary = useFocusSummary()
  const create = useMutation({
    mutationFn: async () => (await api.post('/tasks', { title, priority, dueDate })).data,
    onSuccess: () => { 
      if (notificationsEnabled()) notify('Task created', { body: title||'New task' }); 
      qc.invalidateQueries({ queryKey: ['tasks'] }); 
      qc.invalidateQueries({ queryKey: ['tasks-summary'] }); 
      setTitle(''); 
      setDueDate(''); 
      setPriority('medium');
      setCreateError('')
    },
    onError: (error: any) => {
      console.error('Task creation error:', error)
      const errorMessage = error?.response?.data?.message || error?.response?.data?.error || error?.message || 'Failed to create task. Please try again.'
      setCreateError(errorMessage)
    }
  })
  return (
    <div className="content animate-page">
      <h1>Dashboard</h1>
      <div className="card quick-add-card card-float">
        {createError && <div className="quick-add-error">{createError}</div>}
        <div className="quick-add-grid">
          <div className="quick-add-field quick-add-field--wide">
            <span>Task</span>
            <input className="input" placeholder="Quick add a task..." value={title} onChange={e=>setTitle(e.target.value)} />
          </div>
          <div className="quick-add-field">
            <span>Due date</span>
            <input className="input" type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} />
          </div>
          <div className="quick-add-field quick-add-priority">
            <span>Priority</span>
            <div className="priority-chips">
              {(['low','medium','high'] as const).map(level=>(
                <button
                  key={level}
                  type="button"
                  aria-pressed={priority===level}
                  className={`priority-chip priority-${level}${priority===level?' is-active':''}`}
                  onClick={()=>setPriority(level)}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
          <div className="quick-add-action">
            <button className="button btn-glitch" onClick={()=>create.mutate()} disabled={!title}>
              <span className="text">Create task</span>
              <span className="decoration" aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </div>
      {isLoading && <div style={{ padding:12 }}>Loading...</div>}
      {error && <div style={{ padding:12, color:'var(--title1)' }}>Failed to load data.</div>}
      <div className="cards motion-grid">
        <div className="card card-float metric metric--calendar">
          <div>
            <div className="metric-label">Due Today</div>
            <div className="metric-value">{dueToday}</div>
            <div className="metric-sub">Today’s workload</div>
          </div>
          <div className="metric-icon glow-ring" aria-hidden>
            <div className="calendar-glow" />
            <div className="calendar-icon">
              <div className="cal-header"></div>
              <div className="cal-body"></div>
              <div className="particles">
                <div className="particle"></div>
                <div className="particle"></div>
                <div className="particle"></div>
                <div className="particle"></div>
                <div className="particle"></div>
                <div className="particle"></div>
                <div className="particle"></div>
                <div className="particle"></div>
              </div>
            </div>
          </div>
        </div>
        <div className="card card-float metric metric--focus-streak">
          <div>
            <div className="metric-label">Overdue</div>
            <div className="metric-value">{overdue}</div>
            <div className="metric-sub">Past due and open</div>
          </div>
          <div className="metric-icon glow-ring" aria-hidden>
            <div className="warning-icon" role="img" aria-label="Overdue warning">
              <span className="spark spark-1" />
              <span className="spark spark-2" />
              <span className="spark spark-3" />
            </div>
          </div>
        </div>
        <div className="card card-float metric">
          <div>
            <div className="metric-label">Upcoming 7d</div>
            <div className="metric-value">{upcoming7}</div>
            <div className="metric-sub">Scheduled next week</div>
          </div>
          <div className="metric-icon glow-ring" aria-hidden>
            <div className="future-icon" role="img" aria-label="Upcoming tasks">
              <span className="future-arrow" />
              <span className="trail trail-1" />
              <span className="trail trail-2" />
              <span className="trail trail-3" />
            </div>
          </div>
        </div>
        <div className="card card-float metric">
          <div>
            <div className="metric-label">Pending</div>
            <div className="metric-value">{pending}</div>
            <div className="metric-sub">Awaiting action</div>
          </div>
          <div className="metric-icon glow-ring" aria-hidden>
            <div className="hourglass-icon" role="img" aria-label="Pending hourglass">
              <div className="hourglass-shell">
                <span className="hourglass-sand top" />
                <span className="hourglass-stream" />
                <span className="hourglass-sand bottom" />
              </div>
            </div>
          </div>
        </div>
        <div className="card card-float metric metric--completed">
          <div>
            <div className="metric-label">Completed</div>
            <div className="metric-value">{completed}</div>
            <div className="metric-sub">Done and archived</div>
          </div>
          <div className="metric-icon glow-ring" aria-hidden>
            <div className="fire">
              <div className="fire-left">
                <div className="main-fire"></div>
                <div className="particle-fire"></div>
              </div>
              <div className="fire-center">
                <div className="main-fire"></div>
                <div className="particle-fire"></div>
              </div>
              <div className="fire-right">
                <div className="main-fire"></div>
                <div className="particle-fire"></div>
              </div>
              <div className="fire-bottom">
                <div className="main-fire"></div>
              </div>
            </div>
          </div>
        </div>
        <div className="card card-float metric">
          <div>
            <div className="metric-label">Total Tasks</div>
            <div className="metric-value">{total}</div>
            <div className="metric-sub">All tasks across lists</div>
          </div>
          <div className="metric-icon glow-ring" aria-hidden>
            <div className="stack-icon glow-shell" role="img" aria-label="Task stack">
              <span className="stack-layer" />
              <span className="stack-layer" />
              <span className="stack-layer" />
            </div>
          </div>
        </div>
        <div className="card card-float metric metric--focus-streak">
          <div>
            <div className="metric-label">Focus streak</div>
            <div className="metric-value metric-value--focus">{focusSummary.streakDays}d</div>
            <div className="metric-sub">{focusSummary.todayMinutes} min today</div>
          </div>
          <div className="metric-icon glow-ring metric-icon--focus" aria-hidden>
            <div className="focus-streak-icon">
              <span className="pulse-dot" />
            </div>
          </div>
        </div>
      </div>
      <h2 className="section-title typing">Insights</h2>
      <div className="cards motion-grid">
        <div className="card card-float metric">
          <div>
            <div className="metric-label">Completion</div>
            <div className="metric-value">{completionPct}%</div>
            <div className="metric-sub">Of all tasks</div>
          </div>
          <div className="metric-icon glow-ring" aria-hidden>
            <div className="target-icon" role="img" aria-label="Completion pulse">
              <span className="target-ring" />
              <span className="target-ring" />
              <span className="target-ring" />
            </div>
          </div>
        </div>
        <div className="card card-float metric">
          <div>
            <div className="metric-label">Priority</div>
            <div className="metric-sub">Low {lowCount} • Medium {medCount} • High {highCount}</div>
            <div className="metric-sub">Distribution</div>
          </div>
          <div className="metric-icon glow-ring" aria-hidden>
            <div className="tag-icon" role="img" aria-label="Priority tag" />
          </div>
        </div>
        <div className="card card-float metric">
          <div style={{ width:'100%' }}>
            <div className="metric-label">Next 7 days</div>
            <div className="metric-sub">Scheduled tasks</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:8, marginTop:10 }}>
              {next7.map(d => (
                <div key={d.date} style={{ display:'grid', gap:4, alignItems:'center', justifyItems:'center' }}>
                  <div className="badge" style={{ background:'var(--bg3)' }}>{format(new Date(d.date), 'EEE')}</div>
                  <div className="badge" style={{ background:d.count>0?'var(--accent2)':'var(--bg3)' }}>{d.count}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="metric-icon glow-ring" aria-hidden>
            <div className="weekbars-icon" role="img" aria-label="Weekly activity">
              <span className="bar" />
              <span className="bar" />
              <span className="bar" />
              <span className="bar" />
              <span className="bar" />
              <span className="bar" />
              <span className="bar" />
            </div>
          </div>
        </div>
      </div>
      
    </div>
  )
}