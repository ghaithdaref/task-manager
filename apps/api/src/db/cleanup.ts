import { query, pool } from './index'
import { initializeSchema } from './index'

async function cleanupDatabase() {
  try {
    console.log('Starting database cleanup...')
    
    // Drop tables in reverse order of dependencies
    const tables = [
      'attachments',
      'recurrence_rules',
      'refresh_tokens',
      'tasks',
      'users'
    ]
    
    // Drop triggers first
    console.log('Dropping triggers...')
    await query('DROP TRIGGER IF EXISTS update_recurrence_rules_updated_at ON recurrence_rules')
    await query('DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks')
    await query('DROP TRIGGER IF EXISTS update_users_updated_at ON users')
    
    // Drop functions
    console.log('Dropping functions...')
    await query('DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE')
    
    // Drop indexes
    console.log('Dropping indexes...')
    await query('DROP INDEX IF EXISTS idx_attachments_task_id')
    await query('DROP INDEX IF EXISTS idx_recurrence_rules_user_id')
    await query('DROP INDEX IF EXISTS idx_refresh_tokens_expires_at')
    await query('DROP INDEX IF EXISTS idx_refresh_tokens_user_id')
    await query('DROP INDEX IF EXISTS idx_tasks_order_index')
    await query('DROP INDEX IF EXISTS idx_tasks_due_date')
    await query('DROP INDEX IF EXISTS idx_tasks_user_priority')
    await query('DROP INDEX IF EXISTS idx_tasks_user_status')
    await query('DROP INDEX IF EXISTS idx_tasks_user_id')
    
    // Drop tables
    console.log('Dropping tables...')
    for (const table of tables) {
      try {
        await query(`DROP TABLE IF EXISTS ${table} CASCADE`)
        console.log(`  ✓ Dropped table: ${table}`)
      } catch (error: any) {
        console.warn(`  ⚠ Warning dropping ${table}:`, error.message)
      }
    }
    
    console.log('Database cleanup completed successfully!')
    
    // Optionally reinitialize schema
    const args = process.argv.slice(2)
    if (args.includes('--reinit') || args.includes('-r')) {
      console.log('\nReinitializing schema...')
      await initializeSchema()
      console.log('Schema reinitialized successfully!')
    }
    
  } catch (error: any) {
    console.error('Error during cleanup:', error.message)
    throw error
  } finally {
    await pool.end()
  }
}

// Run if executed directly
if (require.main === module) {
  cleanupDatabase()
    .then(() => {
      console.log('Done!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Cleanup failed:', error)
      process.exit(1)
    })
}

export { cleanupDatabase }

