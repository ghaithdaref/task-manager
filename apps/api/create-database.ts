import { Pool } from 'pg'
import { config } from './src/config'

async function createDatabase() {
  // Connect to default 'postgres' database first
  const adminPool = new Pool({
    host: config.database.host,
    port: config.database.port,
    database: 'postgres', 
    user: config.database.user,
    password: config.database.password,
  })

  try {
    console.log('Connecting to PostgreSQL...')
    const result = await adminPool.query('SELECT NOW()')
    console.log('✅ Connected to PostgreSQL at:', result.rows[0].now)

    // Check if database exists
    const dbCheck = await adminPool.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [config.database.database]
    )

    if (dbCheck.rows.length > 0) {
      console.log(`✅ Database "${config.database.database}" already exists`)
    } else {
      console.log(`Creating database "${config.database.database}"...`)
      await adminPool.query(`CREATE DATABASE ${config.database.database}`)
      console.log(`✅ Database "${config.database.database}" created successfully`)
    }

    await adminPool.end()
    process.exit(0)
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    if (error.code === '28P01') {
      console.error('\nPassword authentication failed!')
      console.error('Please update DB_PASSWORD in .env file with your PostgreSQL password')
    }
    await adminPool.end()
    process.exit(1)
  }
}

createDatabase()

