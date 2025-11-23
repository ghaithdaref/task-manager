import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { config } from './config'
import { initializeSchema } from './db'
import path from 'path'

import authRoutes from './routes/auth'
import taskRoutes from './routes/tasks'
import recurringRoutes from './routes/recurring'
import analyticsRoutes from './routes/analytics'

const app = express()
app.use(express.json())
app.use(cookieParser())
app.use(helmet())
app.use(cors({ origin: (origin, cb) => {
  if (!origin) return cb(null, true)
  cb(null, config.allowedOrigins.includes(origin))
}, credentials: true }))

app.get('/health', (_req, res) => res.json({ ok: true }))
app.use('/auth', authRoutes)
app.use('/tasks', taskRoutes)
app.use('/recurring', recurringRoutes)
app.use('/analytics', analyticsRoutes)

// API is now served separately from the Web App.
// The Web App (frontend) handles its own static file serving and routing.

// Initialize database schema on startup
const startServer = async () => {
  try {
   
    console.log('Testing database connection...')
    const { pool } = await import('./db')
    const testResult = await pool.query('SELECT NOW() as now, current_database() as db')
    console.log('✅ Database connected:', testResult.rows[0].db, 'at', testResult.rows[0].now)
    
   
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Initialize schema
    console.log('Initializing database schema...')
    await initializeSchema()
    console.log('✅ Schema initialized')
    
    
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `)
    console.log('📊 Tables:', tablesResult.rows.map(r => r.table_name).join(', '))
    
   
    app.listen(config.port, () => {
      console.log(`✅ Server running on port ${config.port}`)
      console.log(`📊 Database: ${config.database.database} @ ${config.database.host}:${config.database.port}`)
    })
  } catch (error: any) {
    console.error('❌ Failed to start server:', error.message)
    console.error('Error details:', error.code, error.detail)
    console.error('\nPlease ensure:')
    console.error('1. PostgreSQL is running')
    console.error('2. Database exists: CREATE DATABASE smart_task_manager;')
    console.error('3. Connection settings in .env are correct')
    console.error('\nRun "npm run test-db" to test your connection')
    process.exit(1)
  }
}

startServer()