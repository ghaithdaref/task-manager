import { useEffect } from 'react'
import { differenceInCalendarDays } from 'date-fns'
import { api } from '../api/client'
import type { Task } from '../api/types'
import { ensurePermission, notificationsEnabled, notify } from '../utils/notify'

const LAST_STATE_KEY = 'stm-last-system-notification'
const CHECK_INTERVAL_MS = 15 * 60 * 1000

const safeGet = (key: string) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

const safeSet = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value)
  } catch {
    
  }
}

const buildHash = (dateKey: string, overdue: number, dueToday: number) => `${dateKey}:${overdue}:${dueToday}`

export const useSystemNotifications = (enabled: boolean) => {
  useEffect(() => {
    if (!enabled) return
    let timer: ReturnType<typeof setInterval> | undefined
    let cancelled = false

    const runCheck = async () => {
      if (!enabled || cancelled) return
      if (!notificationsEnabled()) return
      const permitted = await ensurePermission()
      if (!permitted) return
      try {
        const { data } = await api.get<Task[]>('/tasks')
        const tasks = Array.isArray(data) ? data : []
        const now = new Date()
        let overdue = 0
        let dueToday = 0
        for (const task of tasks) {
          if (!task?.dueDate) continue
          if (task.status === 'completed') continue
          const dueDate = new Date(`${task.dueDate}T00:00:00`)
          const diff = differenceInCalendarDays(dueDate, now)
          if (diff < 0) overdue += 1
          else if (diff === 0) dueToday += 1
        }
        if (overdue === 0 && dueToday === 0) return
        const todayKey = now.toISOString().slice(0, 10)
        const hash = buildHash(todayKey, overdue, dueToday)
        if (safeGet(LAST_STATE_KEY) === hash) return
        const parts = []
        if (overdue > 0) parts.push(`${overdue} overdue`)
        if (dueToday > 0) parts.push(`${dueToday} due today`)
        const body = parts.join(' • ')
        notify('Task reminders', { body })
        safeSet(LAST_STATE_KEY, hash)
      } catch {
       
      }
    }

    runCheck()
    timer = setInterval(runCheck, CHECK_INTERVAL_MS)

    return () => {
      cancelled = true
      if (timer) clearInterval(timer)
    }
  }, [enabled])
}

export default useSystemNotifications

