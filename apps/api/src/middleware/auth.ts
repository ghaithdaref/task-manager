import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config'

export type AuthPayload = { sub: string }

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const auth = req.headers.authorization
  if (!auth) {
    console.error('Missing authorization header')
    return res.status(401).json({ error: 'missing_auth', message: 'Authorization header is required' })
  }
  const [, token] = auth.split(' ')
  if (!token) {
    console.error('Missing token in authorization header')
    return res.status(401).json({ error: 'missing_auth', message: 'Token is required' })
  }
  try {
    const payload = jwt.verify(token, config.jwtSecret) as AuthPayload
    if (!payload.sub) {
      console.error('Invalid token payload - no user ID')
      return res.status(401).json({ error: 'invalid_token', message: 'Token does not contain user ID' })
    }
    ;(req as any).userId = payload.sub
    console.log('Auth successful for user:', payload.sub)
    next()
  } catch (error: any) {
    console.error('Token verification failed:', error.message)
    res.status(401).json({ error: 'invalid_token', message: error.message })
  }
}