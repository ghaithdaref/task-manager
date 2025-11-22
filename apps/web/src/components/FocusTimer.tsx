import { useEffect, useMemo, useRef, useState } from 'react'
import { useFocusSessions, computeFocusSummary, FocusSession } from '../hooks/useFocusSessions'

type FocusTimerProps = {
  taskId?: string
  taskTitle?: string
  focusMinutes?: number
  breakMinutes?: number
}

const makeSessionId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2)
}

export default function FocusTimer({ taskId, taskTitle, focusMinutes = 25, breakMinutes = 5 }: FocusTimerProps) {
  const [mode, setMode] = useState<'focus' | 'break'>('focus')
  const [isRunning, setIsRunning] = useState(false)
  const [focusLength, setFocusLength] = useState(focusMinutes)
  const [breakLength, setBreakLength] = useState(breakMinutes)
  const [secondsRemaining, setSecondsRemaining] = useState(focusMinutes * 60)
  const { sessions, setSessions } = useFocusSessions()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(()=>{
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  useEffect(()=>{
    if (isRunning) {
      intervalRef.current = setInterval(()=>{
        setSecondsRemaining(prev => {
          if (prev <= 1) {
            handleSessionComplete()
            return prev
          }
          return prev - 1
        })
      }, 1000)
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, mode])

  useEffect(()=>{
    if (isRunning) return
    setSecondsRemaining(mode === 'focus' ? focusLength * 60 : breakLength * 60)
  }, [focusLength, breakLength, mode, isRunning])

  const handleSessionComplete = () => {
    setIsRunning(false)
    const duration = mode === 'focus' ? focusLength : breakLength
    const entry: FocusSession = {
      id: makeSessionId(),
      taskId,
      taskTitle,
      startedAt: Date.now() - duration * 60 * 1000,
      durationMinutes: duration,
      mode
    }
    setSessions(prev => [entry, ...prev].slice(0, 50))
    if (mode === 'focus') {
      setMode('break')
      setSecondsRemaining(breakLength * 60)
    } else {
      setMode('focus')
      setSecondsRemaining(focusLength * 60)
    }
  }

  const toggleRunning = () => {
    setIsRunning(prev => !prev)
  }

  const handleReset = () => {
    setIsRunning(false)
    setSecondsRemaining(mode === 'focus' ? focusLength * 60 : breakLength * 60)
  }

  const handleModeSwitch = (nextMode: 'focus' | 'break') => {
    setMode(nextMode)
    setIsRunning(false)
    setSecondsRemaining(nextMode === 'focus' ? focusLength * 60 : breakLength * 60)
  }

  const logManualSession = () => {
    const duration = mode === 'focus' ? focusLength : breakLength
    const entry: FocusSession = {
      id: makeSessionId(),
      taskId,
      taskTitle,
      startedAt: Date.now(),
      durationMinutes: duration,
      mode
    }
    setSessions(prev => [entry, ...prev].slice(0, 50))
  }

  const minutes = Math.floor(secondsRemaining / 60).toString().padStart(2, '0')
  const seconds = (secondsRemaining % 60).toString().padStart(2, '0')

  const stats = useMemo(()=>computeFocusSummary(sessions), [sessions])

  return (
    <div className="focus-timer">
      <div className="focus-timer__header">
        <div>
          <div className="focus-timer__eyebrow">Focus timer</div>
          <div className="focus-timer__title">{taskTitle || 'Quick session'}</div>
        </div>
        <div className="focus-timer__lengths">
          <label>
            Focus
            <input
              type="number"
              min={5}
              max={90}
              value={focusLength}
              onChange={e=>setFocusLength(Math.max(5, Math.min(90, Number(e.target.value) || 25)))}
            />
            min
          </label>
          <label>
            Break
            <input
              type="number"
              min={1}
              max={30}
              value={breakLength}
              onChange={e=>setBreakLength(Math.max(1, Math.min(30, Number(e.target.value) || 5)))}
            />
            min
          </label>
        </div>
      </div>
      <div className="focus-timer__mode-buttons" role="tablist">
        <button
          className={`focus-timer__mode${mode==='focus'?' is-active':''}`}
          onClick={()=>handleModeSwitch('focus')}
          role="tab"
          aria-selected={mode==='focus'}
        >
          Focus
        </button>
        <button
          className={`focus-timer__mode${mode==='break'?' is-active':''}`}
          onClick={()=>handleModeSwitch('break')}
          role="tab"
          aria-selected={mode==='break'}
        >
          Break
        </button>
      </div>
      <div className="focus-timer__display">
        <span>{minutes}</span>
        <span>:</span>
        <span>{seconds}</span>
      </div>
      <div className="focus-timer__actions">
        <button className="button button-primary" onClick={toggleRunning}>
          {isRunning ? 'Pause' : 'Start'}
        </button>
        <button className="button button-ghost" onClick={handleReset}>
          Reset
        </button>
        <button className="button button-secondary" onClick={logManualSession}>
          Log session
        </button>
      </div>
      <div className="focus-timer__stats">
        <div>
          <div className="focus-timer__stat-label">Today</div>
          <div className="focus-timer__stat-value">{stats.todayMinutes} min</div>
        </div>
        <div>
          <div className="focus-timer__stat-label">Streak</div>
          <div className="focus-timer__stat-value">{stats.streakDays} days</div>
        </div>
      </div>
      <div className="focus-timer__sessions">
        <div className="focus-timer__sessions-title">Recent sessions</div>
        {sessions.length === 0 && <p className="focus-timer__sessions-empty">No sessions logged yet.</p>}
        {sessions.slice(0,4).map(session=>(
          <div key={session.id} className="focus-timer__session">
            <div>
              <div className="focus-timer__session-title">{session.taskTitle || 'Focus block'}</div>
              <div className="focus-timer__session-meta">
                {session.durationMinutes} min · {session.mode === 'focus' ? 'Deep work' : 'Break'} · {new Date(session.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

