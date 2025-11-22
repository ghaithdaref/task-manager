import { pool, query } from './index'

async function testConnection() {
  try {
    console.log('Testing PostgreSQL connection...')
    
    // Test basic connection
    const result = await query('SELECT NOW() as current_time, version() as pg_version')
    console.log('✅ Connection successful!')
    console.log('Current time:', result.rows[0].current_time)
    console.log('PostgreSQL version:', result.rows[0].pg_version)
    
    // Test database name
    const dbResult = await query('SELECT current_database() as db_name')
    console.log('Connected to database:', dbResult.rows[0].db_name)
    
    // Check if tables exist
    const tablesResult = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `)
    
    if (tablesResult.rows.length > 0) {
      console.log('\n📊 Existing tables:')
      tablesResult.rows.forEach(row => {
        console.log(`  - ${row.table_name}`)
      })
    } else {
      console.log('\n⚠️  No tables found. Run schema initialization.')
    }
    
    await pool.end()
    console.log('\n✅ Connection test completed successfully!')
    process.exit(0)
  } catch (error: any) {
    console.error('\n❌ Connection test failed!')
    console.error('Error:', error.message)
    console.error('\nPlease check:')
    console.error('1. PostgreSQL is running')
    console.error('2. Database exists: CREATE DATABASE smart_task_manager;')
    console.error('3. Connection settings in .env file are correct')
    await pool.end()
    process.exit(1)
  }
}

testConnection()

