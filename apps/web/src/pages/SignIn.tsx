import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { login } from '../api/client'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as any)?.from?.pathname || '/'
  const validEmail = (v:string) => /.+@.+\..+/.test(v)
  const onSubmit = async () => {
    setError('')
    setLoading(true)
    const r = await login(email.trim(), password)
    setLoading(false)
    if (r.ok) {
      if (!remember) { try { localStorage.removeItem('stm-auth') } catch {} }
      navigate(from)
    }
    else setError(r.error==='invalid_credentials'?'Invalid credentials':'Sign in failed')
  }
  return (
    <div className="content">
      <div className="auth-center">
        <div className="container">
          <div className="heading">Sign In</div>
          <div style={{ display:'grid', gap:12 }}>
            {error && <div style={{ color:'var(--title1)' }}>{error}</div>}
            <label style={{ display:'grid', gap:6 }}>
              <span>Email</span>
              <input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" style={{ width:'100%' }} />
            </label>
            <label style={{ display:'grid', gap:6 }}>
              <span>Password</span>
              <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:8 }}>
                <input className="input" type={show?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="•••••••••" style={{ width:'100%' }} />
                <button className="button button-ghost" onClick={()=>setShow(s=>!s)}>{show?'Hide':'Show'}</button>
              </div>
            </label>
            <label style={{ display:'flex', alignItems:'center', gap:8 }}>
              <input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)} />
              <span>Remember me</span>
            </label>
            <button className="button button-primary" onClick={onSubmit} disabled={!email || !password || loading}>{loading?'Signing in...':'Sign In'}</button>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <Link to="/signup">Create an account</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}