import { ReactNode } from 'react'
import { isAuthed } from '../api/client'
import { Navigate, useLocation } from 'react-router-dom'

export default function RequireAuth({ children }: { children: ReactNode }) {
  const authed = isAuthed()
  const location = useLocation()
  if (!authed) return <Navigate to="/signin" replace state={{ from: location }} />
  return <>{children}</>
}