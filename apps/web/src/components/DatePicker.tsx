import { useState, useRef, useEffect } from 'react'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import '../styles/date-picker.css'

type Props = {
  value: string
  onChange: (date: string) => void
}

export default function DatePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Convert string date (YYYY-MM-DD) to Date object
  const getDateValue = () => {
    if (!value) return new Date()
    const [year, month, day] = value.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  // Convert Date object to string (YYYY-MM-DD)
  const formatDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Format date for display
  const displayDate = value
    ? new Date(value + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Select date'

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  return (
    <div className="date-picker" ref={containerRef}>
      <button
        type="button"
        className="date-picker__trigger input"
        onClick={() => setOpen(!open)}
      >
        <span className="date-picker__icon">📅</span>
        <span className="date-picker__value">{displayDate}</span>
      </button>

      {open && (
        <div className="date-picker__popover">
          <Calendar
            value={getDateValue()}
            onChange={(date) => {
              if (date instanceof Date) {
                onChange(formatDate(date))
                setOpen(false)
              }
            }}
            minDate={new Date()}
          />
        </div>
      )}
    </div>
  )
}
