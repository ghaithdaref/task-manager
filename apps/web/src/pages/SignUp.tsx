import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { register } from '../api/client'

export default function SignUp() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as any)?.from?.pathname || '/'
  const validEmail = (v:string) => /.+@.+\..+/.test(v)
  const strong = (v:string) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(v)
  const valid = name.trim().length>1 && validEmail(email) && strong(password) && password===confirm
  const onSubmit = async () => {
    setError('')
    setLoading(true)
    const r = await register(name.trim(), email.trim(), password)
    setLoading(false)
    if (r.ok) navigate('/signin')
    else {
      if (r.error === 'email_taken') {
        setError('Email is already in use')
      } else if (r.error === 'database_error') {
        setError(r.details?.message || 'Database connection error. Please check server logs.')
      } else if (r.error === 'invalid_input') {
        setError('Please check your input and try again')
      } else {
        setError(r.details?.message || r.error || 'Sign up failed')
      }
    }
  }
  return (
    <div className="content">
      <div className="auth-center">
        <div className="container">
          <div className="heading">Sign Up</div>
          <div style={{ display:'grid', gap:12 }}>
            {error && <div style={{ color:'var(--title1)' }}>{error}</div>}
            <label style={{ display:'grid', gap:6 }}>
              <span>Name</span>
              <input className="input" value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" style={{ width:'100%' }} />
            </label>
            <label style={{ display:'grid', gap:6 }}>
              <span>Email</span>
              <input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" style={{ width:'100%' }} />
            </label>
            <label style={{ display:'grid', gap:6 }}>
              <span>Password</span>
              <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:8 }}>
                <input className="input" type={show?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 chars, Aa1!" style={{ width:'100%' }} />
                <button className="button button-ghost" onClick={()=>setShow(s=>!s)}>{show?'Hide':'Show'}</button>
              </div>
              {!strong(password) && password.length>0 && (
                <div style={{ color:'var(--title1)', fontSize:12 }}>
                  Must be 8+ chars with upper, lower, number, symbol
                </div>
              )}
            </label>
            <label style={{ display:'grid', gap:6 }}>
              <span>Confirm password</span>
              <input className="input" type={show?'text':'password'} value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Repeat password" style={{ width:'100%' }} />
              {confirm && confirm!==password && (
                <div style={{ color:'var(--title1)', fontSize:12 }}>
                  Passwords do not match
                </div>
              )}
            </label>
            <button className="button button-primary" onClick={onSubmit} disabled={!valid || loading}>{loading?'Creating account...':'Sign Up'}</button>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <Link to="/signin">Already have an account?</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}