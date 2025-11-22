import { Pool, QueryResult, QueryResultRow } from 'pg'
import { config } from '../config'

// Create connection pool
export const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.database,
  user: config.database.user,
  password: config.database.password,
  max: config.database.max,
  idleTimeoutMillis: config.database.idleTimeoutMillis,
  connectionTimeoutMillis: config.database.connectionTimeoutMillis
})

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err)
  process.exit(-1)
})

// Test connection on startup (async)
const testConnection = async () => {
  try {
    const result = await pool.query('SELECT NOW()')
    console.log('Database connected successfully at:', result.rows[0].now)
  } catch (err: any) {
    console.error('Database connection error:', err.message)
    console.error('Please ensure PostgreSQL is running and connection settings are correct.')
    console.error('Connection config:', {
      host: config.database.host,
      port: config.database.port,
      database: config.database.database,
      user: config.database.user
    })
  }
}
testConnection()

// Helper function to execute queries
export const query = async <T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> => {
  const start = Date.now()
  try {
    const res = await pool.query<T>(text, params)
    const duration = Date.now() - start
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true') {
      console.log('Executed query', { 
        text: text.substring(0, 100), 
        params: params?.map(p => typeof p === 'string' ? p.substring(0, 50) : p),
        duration, 
        rows: res.rowCount 
      })
    }
    return res
  } catch (error: any) {
    console.error('Query error:', { 
      text: text.substring(0, 200), 
      params: params?.map(p => typeof p === 'string' ? p.substring(0, 50) : p),
      error: error.message,
      code: error.code,
      detail: error.detail
    })
    throw error
  }
}

// Helper function to get a client from the pool (for transactions)
export const getClient = async () => {
  const client = await pool.connect()
  const originalQuery = client.query.bind(client)
  const originalRelease = client.release.bind(client)
  
  // Set a timeout of 5 seconds, after which we will log this client's last query
  let timeout: NodeJS.Timeout = setTimeout(() => {
    console.error('A client has been checked out for more than 5 seconds!')
  }, 5000)
  
  // Wrap the query method to log slow queries
  const wrappedQuery: typeof client.query = ((text: any, params?: any) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => {
      console.error('A query has been running for more than 5 seconds!')
    }, 5000)
    return originalQuery(text, params)
  }) as any
  
  client.query = wrappedQuery
  
  // Wrap the release method
  client.release = () => {
    clearTimeout(timeout)
    return originalRelease()
  }
  
  return client
}

// Initialize database schema
export const initializeSchema = async () => {
  const fs = require('fs')
  const path = require('path')
  
  // Try both dev and production paths
  let schemaPath = path.resolve(__dirname, 'schema.sql')
  if (!fs.existsSync(schemaPath)) {
    schemaPath = path.resolve(__dirname, '../db/schema.sql')
  }
  if (!fs.existsSync(schemaPath)) {
    schemaPath = path.resolve(process.cwd(), 'src/db/schema.sql')
  }
  
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema file not found at: ${schemaPath}`)
  }
  
  try {
    const schema = fs.readFileSync(schemaPath, 'utf-8')
    
    // Remove comments and split by semicolon, but be careful with functions
    const lines = schema.split('\n')
    let currentStatement = ''
    const statements: string[] = []
    let inFunction = false
    
    for (const line of lines) {
      const trimmed = line.trim()
      
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('--')) continue
      
      currentStatement += line + '\n'
      
      // Check if we're entering or exiting a function/trigger block
      if (trimmed.includes('CREATE OR REPLACE FUNCTION') || trimmed.includes('CREATE FUNCTION')) {
        inFunction = true
      }
      
      // Check if we're in a $$ block (function body)
      if (trimmed.includes('$$')) {
        inFunction = !inFunction
      }
      
      // If we hit a semicolon and we're not in a function, it's the end of a statement
      if (trimmed.endsWith(';') && !inFunction) {
        const stmt = currentStatement.trim()
        if (stmt.length > 0) {
          statements.push(stmt)
        }
        currentStatement = ''
      }
    }
    
    // Execute each statement
    for (const statement of statements) {
      if (statement.length > 0) {
        try {
          await query(statement)
        } catch (error: any) {
          // Ignore "already exists" errors for IF NOT EXISTS statements
          const errorMsg = error.message || ''
          if (!errorMsg.includes('already exists') && 
              !errorMsg.includes('duplicate') &&
              !errorMsg.includes('relation') &&
              !errorMsg.includes('already defined')) {
            console.warn('Schema statement warning:', errorMsg.substring(0, 100))
          }
        }
      }
    }
    console.log('Database schema initialized successfully')
  } catch (error: any) {
    console.error('Error initializing schema:', error.message)
    throw error
  }
}

