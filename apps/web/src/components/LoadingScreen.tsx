import { useEffect, useState } from 'react'

export default function LoadingScreen() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    // Delay showing the spinner to prevent flicker on fast loads
    const timer = setTimeout(() => setVisible(true), 200)
    return () => clearTimeout(timer)
  }, [])

  if (!visible) return null

  return (
    <div className="loading-screen">
      <div className="loading-spinner">
        <div className="spinner-dot dot-1"></div>
        <div className="spinner-dot dot-2"></div>
        <div className="spinner-dot dot-3"></div>
      </div>
      <p className="loading-text">Loading application...</p>
    </div>
  )
}
