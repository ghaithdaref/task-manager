import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format, addDays, differenceInHours, isBefore, parseISO } from 'date-fns'
import { api } from '../api/client'
import type { Task } from '../api/types'

type NotificationEvent = {
  id: string
  type: 'overdue' | 'dueSoon' | 'upcoming' | 'focus'
  task: Task
  timestamp: number
  label: string
  detail: string
}

const SNOOZE_KEY = 'stm-notification-snoozes'
const DIGEST_KEY = 'stm-notification-digest'

export default function NotificationCenter() {
  const qc = useQueryClient()
  const [snoozedUntil, setSnoozedUntil] = useState<Record<string, number>>(() => {
    if (typeof window === 'undefined') return {}
    try {
      const raw = localStorage.getItem(SNOOZE_KEY)
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  })
  const [digestEnabled, setDigestEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(DIGEST_KEY) === '1'
  })
  useEffect(()=>{
    if (typeof window === 'undefined') return
    localStorage.setItem(SNOOZE_KEY, JSON.stringify(snoozedUntil))
  }, [snoozedUntil])
  useEffect(()=>{
    if (typeof window === 'undefined') return
    localStorage.setItem(DIGEST_KEY, digestEnabled ? '1' : '0')
  }, [digestEnabled])
  const { data, isLoading, error } = useQuery<Task[]>({
    queryKey: ['notifications', 'tasks'],
    queryFn: async () => (await api.get('/tasks')).data,
    staleTime: 60_000
  })
  const completeTask = useMutation({
    mutationFn: async (taskId: string) => (await api.patch(`/tasks/${taskId}`, { status: 'completed' })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['tasks-summary'] })
      qc.invalidateQueries({ queryKey: ['notifications', 'tasks'] })
    }
  })
  const rescheduleTask = useMutation({
    mutationFn: async ({ taskId, days }: { taskId: string; days: number }) => {
      const nextDate = format(addDays(new Date(), days), 'yyyy-MM-dd')
      return (await api.patch(`/tasks/${taskId}`, { dueDate: nextDate })).data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['tasks-summary'] })
      qc.invalidateQueries({ queryKey: ['notifications', 'tasks'] })
    }
  })
  const reminders = useMemo<NotificationEvent[]>(() => {
    if (!Array.isArray(data)) return []
    const now = new Date()
    const events: NotificationEvent[] = []
    data.forEach(task => {
      if (task.status === 'completed') return
      if (task.dueDate) {
        const due = parseISO(task.dueDate)
        const diffHours = differenceInHours(due, now)
        const idBase = `${task.id}-${task.dueDate}`
        if (isBefore(due, now)) {
          events.push({
            id: `${idBase}-overdue`,
            type: 'overdue',
            task,
            timestamp: due.getTime(),
            label: 'Task overdue',
            detail: `${task.title} was due ${format(due, 'EEE, MMM d')}`
          })
        } else if (diffHours <= 48) {
          events.push({
            id: `${idBase}-due-soon`,
            type: 'dueSoon',
            task,
            timestamp: due.getTime(),
            label: 'Due soon',
            detail: `${task.title} is due ${format(due, 'EEE, MMM d p')}`
          })
        } else if (diffHours <= 168) {
          events.push({
            id: `${idBase}-upcoming`,
            type: 'upcoming',
            task,
            timestamp: due.getTime(),
            label: 'Upcoming task',
            detail: `${task.title} scheduled for ${format(due, 'EEE, MMM d')}`
          })
        }
      } else if (task.priority === 'high') {
        events.push({
          id: `${task.id}-focus`,
          type: 'focus',
          task,
          timestamp: Date.now(),
          label: 'High-priority task',
          detail: `${task.title} is high priority with no due date`
        })
      }
    })
    return events
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(0, 8)
  }, [data])
  const visibleReminders = reminders.filter(rem => {
    const snoozed = snoozedUntil[rem.id]
    return !snoozed || snoozed < Date.now()
  })
  const snoozeReminder = (id: string, minutes = 60) => {
    const next = { ...snoozedUntil, [id]: Date.now() + minutes * 60 * 1000 }
    setSnoozedUntil(next)
  }
  const dismissReminder = (id: string) => {
    const next = { ...snoozedUntil }
    delete next[id]
    setSnoozedUntil(next)
  }
  const handleComplete = (taskId: string, reminderId: string) => {
    completeTask.mutate(taskId, {
      onSuccess: () => dismissReminder(reminderId)
    })
  }
  const handleReschedule = (taskId: string, reminderId: string, days: number) => {
    rescheduleTask.mutate({ taskId, days }, {
      onSuccess: () => dismissReminder(reminderId)
    })
  }
  return (
    <div className="notification-center">
      <div className="notification-center__header">
        <div>
          <div className="notification-center__title">Notifications</div>
          <p className="notification-center__subtitle">Snooze or act on upcoming reminders.</p>
        </div>
        <div className="notification-digest">
          <label className="notification-digest__toggle">
            <input
              type="checkbox"
              checked={digestEnabled}
              onChange={e=>setDigestEnabled(e.currentTarget.checked)}
            />
            <span>Daily digest</span>
          </label>
        </div>
      </div>
      <div className="notification-center__body">
        {isLoading && (
          <div className="notification-center__empty">Loading reminders…</div>
        )}
        {error && (
          <div className="notification-center__empty" role="alert">
            Unable to load notifications.
          </div>
        )}
        {!isLoading && !error && visibleReminders.length === 0 && (
          <div className="notification-center__empty">
            <span role="img" aria-label="All caught up">✨</span>
            <p>You’re all caught up for now.</p>
          </div>
        )}
        {!isLoading && !error && visibleReminders.length > 0 && (
          <div className="notification-timeline">
            {visibleReminders.map(reminder=>(
              <article key={reminder.id} className={`notification-item notification-item--${reminder.type}`}>
                <div className="notification-item__time">
                  {format(reminder.timestamp, 'EEE, MMM d')}
                </div>
                <div className="notification-item__content">
                  <div className="notification-item__title">{reminder.label}</div>
                  <div className="notification-item__meta">{reminder.detail}</div>
                  <div className="notification-item__actions">
                    <button
                      className="button button-ghost"
                      onClick={()=>handleComplete(reminder.task.id, reminder.id)}
                      disabled={completeTask.isPending}
                    >
                      Complete
                    </button>
                    <button
                      className="button button-ghost"
                      onClick={()=>handleReschedule(reminder.task.id, reminder.id, 1)}
                      disabled={rescheduleTask.isPending}
                    >
                      Move to tomorrow
                    </button>
                    <button
                      className="button button-secondary"
                      onClick={()=>snoozeReminder(reminder.id)}
                    >
                      Snooze 1h
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

