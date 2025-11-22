import { useEffect, useState } from 'react'

export type FocusSession = {
  id: string
  taskId?: string
  taskTitle?: string
  startedAt: number
  durationMinutes: number
  mode: 'focus' | 'break'
}

const STORAGE_KEY = 'stm-focus-sessions'
export const FOCUS_EVENT = 'stm-focus-sessions-changed'

export const loadFocusSessions = (): FocusSession[] => {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const persistSessions = (sessions: FocusSession[]) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
    window.dispatchEvent(new Event(FOCUS_EVENT))
  } catch {
    
  }
}

export const computeFocusSummary = (sessions: FocusSession[]) => {
  const today = new Date().toDateString()
  const todayMinutes = sessions
    .filter(session => new Date(session.startedAt).toDateString() === today && session.mode === 'focus')
    .reduce((total, session) => total + session.durationMinutes, 0)
  const streakDays = (() => {
    const seen = new Set<string>()
    sessions
      .filter(session => session.mode === 'focus')
      .forEach(session => seen.add(new Date(session.startedAt).toDateString()))
    return seen.size
  })()
  const totalMinutes = sessions.reduce((total, session) => total + session.durationMinutes, 0)
  return { todayMinutes, streakDays, totalMinutes }
}

export const useFocusSummary = () => {
  const [summary, setSummary] = useState(() => computeFocusSummary(loadFocusSessions()))
  useEffect(()=>{
    const sync = () => setSummary(computeFocusSummary(loadFocusSessions()))
    window.addEventListener(FOCUS_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(FOCUS_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])
  return summary
}

export const useFocusSessions = () => {
  const [sessions, setSessions] = useState<FocusSession[]>(() => loadFocusSessions())
  useEffect(()=>{
    persistSessions(sessions)
  }, [sessions])
  useEffect(()=>{
    const sync = () => setSessions(loadFocusSessions())
    window.addEventListener(FOCUS_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(FOCUS_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])
  return { sessions, setSessions }
}

