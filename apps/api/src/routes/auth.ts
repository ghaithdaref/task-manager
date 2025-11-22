import { Router } from 'express'
import { z } from 'zod'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { addUser, findUserByEmail, addRefreshToken, revokeRefreshToken, findRefreshToken, getUser, updateUserPassword } from '../store'
import { config } from '../config'
import { requireAuth } from '../middleware/auth'

const router = Router()

const strongPassword = z.string()
  .min(8)
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/)
const registerSchema = z.object({ name: z.string().min(1), email: z.string().email(), password: strongPassword })
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(8) })
const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: strongPassword
})

router.post('/register', async (req, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() })
    }
    
    const existing = await findUserByEmail(parsed.data.email)
    if (existing) {
      return res.status(409).json({ error: 'email_taken' })
    }
    
    const passwordHash = await bcrypt.hash(parsed.data.password, 10)
    const user = await addUser({ name: parsed.data.name, email: parsed.data.email, passwordHash })
    
    const access = jwt.sign({ sub: user.id }, config.jwtSecret, { expiresIn: '15m' })
    const refresh = jwt.sign({ sub: user.id }, config.jwtRefreshSecret, { expiresIn: '7d' })
    
    await addRefreshToken(user.id, refresh, 7 * 24 * 60 * 60 * 1000)
    res.cookie('refresh_token', refresh, { httpOnly: true, sameSite: 'lax' })
    res.json({ accessToken: access, user: { id: user.id, name: user.name, email: user.email } })
  } catch (error: any) {
    console.error('Error in register:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      constraint: error.constraint,
      stack: error.stack
    })
    
    // Check for specific database errors
    if (error.code === '23505') { 
      return res.status(409).json({ error: 'email_taken', message: 'Email is already registered' })
    }
    if (error.code === '42P01') { 
      return res.status(500).json({ error: 'database_error', message: 'Database table not found. Please check database setup.' })
    }
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return res.status(500).json({ error: 'database_error', message: 'Cannot connect to database. Please check your database connection.' })
    }
    if (error.code === '28P01') { 
      return res.status(500).json({ error: 'database_error', message: 'Database authentication failed. Please check your credentials.' })
    }
    if (error.code === '3D000') { 
      return res.status(500).json({ error: 'database_error', message: 'Database does not exist. Please create the database first.' })
    }
    
    res.status(500).json({ 
      error: 'internal_error', 
      message: error.message || 'An unexpected error occurred',
      code: error.code,
      detail: error.detail
    })
  }
})

router.post('/login', async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() })
    }
    const user = await findUserByEmail(parsed.data.email)
    if (!user) {
      return res.status(401).json({ error: 'invalid_credentials' })
    }
    const ok = await bcrypt.compare(parsed.data.password, user.passwordHash)
    if (!ok) {
      return res.status(401).json({ error: 'invalid_credentials' })
    }
    const access = jwt.sign({ sub: user.id }, config.jwtSecret, { expiresIn: '15m' })
    const refresh = jwt.sign({ sub: user.id }, config.jwtRefreshSecret, { expiresIn: '7d' })
    await addRefreshToken(user.id, refresh, 7 * 24 * 60 * 60 * 1000)
    res.cookie('refresh_token', refresh, { httpOnly: true, sameSite: 'lax' })
    res.json({ accessToken: access, user: { id: user.id, name: user.name, email: user.email } })
  } catch (error: any) {
    console.error('Error in login:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      stack: error.stack
    })
    res.status(500).json({ 
      error: 'internal_error', 
      message: error.message || 'An unexpected error occurred',
      code: error.code
    })
  }
})

router.post('/refresh', async (req, res) => {
  const token = req.cookies?.refresh_token
  if (!token) return res.status(401).json({ error: 'missing_refresh' })
  try {
    const payload = jwt.verify(token, config.jwtRefreshSecret) as { sub: string }
    const storedToken = await findRefreshToken(payload.sub, token)
    
    if (!storedToken || storedToken.revoked || storedToken.expiresAt < Date.now()) {
      return res.status(401).json({ error: 'invalid_refresh' })
    }
    
    const access = jwt.sign({ sub: payload.sub }, config.jwtSecret, { expiresIn: '15m' })
    res.json({ accessToken: access })
  } catch {
    res.status(401).json({ error: 'invalid_refresh' })
  }
})

router.post('/logout', async (req, res) => {
  const token = req.cookies?.refresh_token
  if (token) {
    try {
      const payload = jwt.verify(token, config.jwtRefreshSecret) as { sub: string }
      const storedToken = await findRefreshToken(payload.sub, token)
      if (storedToken) {
        await revokeRefreshToken(storedToken.id)
      }
    } catch {
      // Token invalid, continue with logout
    }
  }
  res.clearCookie('refresh_token')
  res.json({ ok: true })
})

router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const parsed = changePasswordSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() })
    }
    const userId = (req as any).userId as string | undefined
    if (!userId) {
      return res.status(401).json({ error: 'missing_auth' })
    }
    const user = await getUser(userId)
    if (!user) {
      return res.status(404).json({ error: 'user_not_found' })
    }
    const matches = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash)
    if (!matches) {
      return res.status(400).json({ error: 'invalid_current', message: 'Current password is incorrect' })
    }
    if (parsed.data.currentPassword === parsed.data.newPassword) {
      return res.status(400).json({ error: 'password_unchanged', message: 'New password must be different' })
    }
    const newHash = await bcrypt.hash(parsed.data.newPassword, 10)
    await updateUserPassword(user.id, newHash)
    res.json({ ok: true })
  } catch (error: any) {
    console.error('Error in change-password:', error)
    res.status(500).json({ error: 'internal_error', message: error.message || 'Unable to change password' })
  }
})

export default router