import { Attachment, Task, User, RecurrenceRule } from './types'
import { query } from './db'
import crypto from 'crypto'

export const generateId = () => crypto.randomUUID()


export const addUser = async (u: Omit<User, 'id' | 'passwordHash'> & { passwordHash: string }): Promise<User> => {
  const id = generateId()
  try {
    const result = await query<User>(
      `INSERT INTO users (id, name, email, password_hash, theme)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, password_hash as "passwordHash", theme`,
      [id, u.name, u.email, u.passwordHash, u.theme || null]
    )
    if (result.rows.length === 0) {
      throw new Error('Failed to insert user - no rows returned')
    }
    console.log('User created successfully:', { id: result.rows[0].id, email: result.rows[0].email })
    return {
      id: result.rows[0].id,
      name: result.rows[0].name,
      email: result.rows[0].email,
      passwordHash: result.rows[0].passwordHash,
      theme: result.rows[0].theme as 'light' | 'dark' | undefined
    }
  } catch (error: any) {
    console.error('Error in addUser:', { 
      email: u.email, 
      error: error.message, 
      code: error.code, 
      detail: error.detail,
      constraint: error.constraint
    })
    throw error
  }
}

export const findUserByEmail = async (email: string): Promise<User | undefined> => {
  const result = await query<User>(
    `SELECT id, name, email, password_hash as "passwordHash", theme
     FROM users
     WHERE email = $1`,
    [email]
  )
  if (result.rows.length === 0) return undefined
  const row = result.rows[0]
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.passwordHash,
    theme: row.theme as 'light' | 'dark' | undefined
  }
}

export const getUser = async (id: string): Promise<User | undefined> => {
  const result = await query<User>(
    `SELECT id, name, email, password_hash as "passwordHash", theme
     FROM users
     WHERE id = $1`,
    [id]
  )
  if (result.rows.length === 0) return undefined
  const row = result.rows[0]
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.passwordHash,
    theme: row.theme as 'light' | 'dark' | undefined
  }
}

export const updateUserPassword = async (id: string, passwordHash: string): Promise<void> => {
  await query(
    `UPDATE users
     SET password_hash = $2, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [id, passwordHash]
  )
}


export const addTask = async (t: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> => {
  const id = generateId()
  try {
    const result = await query<Task>(
      `INSERT INTO tasks (id, user_id, title, description, due_date, status, priority, order_index)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING 
         id, user_id as "userId", title, description, due_date as "dueDate",
         status, priority, order_index as "orderIndex",
         created_at as "createdAt", updated_at as "updatedAt"`,
      [id, t.userId, t.title, t.description || null, t.dueDate || null, t.status, t.priority, t.orderIndex]
    )
    if (result.rows.length === 0) {
      throw new Error('Failed to insert task - no rows returned')
    }
    console.log('Task created successfully:', { id: result.rows[0].id, title: result.rows[0].title })
    return result.rows[0]
  } catch (error: any) {
    console.error('Error in addTask:', { task: t, error: error.message, code: error.code, detail: error.detail })
    throw error
  }
}

export const updateTask = async (id: string, patch: Partial<Task>): Promise<Task | undefined> => {
  const updates: string[] = []
  const values: any[] = []
  let paramIndex = 1

  if (patch.title !== undefined) {
    updates.push(`title = $${paramIndex++}`)
    values.push(patch.title)
  }
  if (patch.description !== undefined) {
    updates.push(`description = $${paramIndex++}`)
    values.push(patch.description)
  }
  if (patch.dueDate !== undefined) {
    updates.push(`due_date = $${paramIndex++}`)
    values.push(patch.dueDate)
  }
  if (patch.status !== undefined) {
    updates.push(`status = $${paramIndex++}`)
    values.push(patch.status)
  }
  if (patch.priority !== undefined) {
    updates.push(`priority = $${paramIndex++}`)
    values.push(patch.priority)
  }
  if (patch.orderIndex !== undefined) {
    updates.push(`order_index = $${paramIndex++}`)
    values.push(patch.orderIndex)
  }

  if (updates.length === 0) {
    return getTask(id)
  }

  values.push(id)
  try {
    const result = await query<Task>(
      `UPDATE tasks
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING 
         id, user_id as "userId", title, description, due_date as "dueDate",
         status, priority, order_index as "orderIndex",
         created_at as "createdAt", updated_at as "updatedAt"`,
      values
    )

    if (result.rows.length === 0) return undefined
    console.log('Task updated successfully:', { id: result.rows[0].id })
    return result.rows[0]
  } catch (error: any) {
    console.error('Error in updateTask:', { id, patch, error: error.message, code: error.code, detail: error.detail })
    throw error
  }
}

export const deleteTask = async (id: string): Promise<boolean> => {
  const result = await query(`DELETE FROM tasks WHERE id = $1`, [id])
  return (result.rowCount || 0) > 0
}

export const deleteTaskAndSave = async (id: string): Promise<boolean> => {
  return deleteTask(id)
}

export const getTask = async (id: string): Promise<Task | undefined> => {
  const result = await query<Task>(
    `SELECT 
       id, user_id as "userId", title, description, due_date as "dueDate",
       status, priority, order_index as "orderIndex",
       created_at as "createdAt", updated_at as "updatedAt"
     FROM tasks
     WHERE id = $1`,
    [id]
  )
  if (result.rows.length === 0) return undefined
  return result.rows[0]
}

export const listTasksByUser = async (userId: string): Promise<Task[]> => {
  const result = await query<Task>(
    `SELECT 
       id, user_id as "userId", title, description, due_date as "dueDate",
       status, priority, order_index as "orderIndex",
       created_at as "createdAt", updated_at as "updatedAt"
     FROM tasks
     WHERE user_id = $1
     ORDER BY order_index ASC`,
    [userId]
  )
  return result.rows
}


const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export const addRefreshToken = async (userId: string, token: string, msToExpire: number): Promise<string> => {
  const id = generateId()
  const tokenHash = hashToken(token)
  await query(
    `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [id, userId, tokenHash, Date.now() + msToExpire]
  )
  return id
}

export const findRefreshToken = async (userId: string, token: string): Promise<{ id: string; expiresAt: number; revoked: boolean } | undefined> => {
  const tokenHash = hashToken(token)
  const result = await query<{ id: string; expires_at: number; revoked: boolean }>(
    `SELECT id, expires_at, revoked
     FROM refresh_tokens
     WHERE user_id = $1 AND token_hash = $2`,
    [userId, tokenHash]
  )
  if (result.rows.length === 0) return undefined
  return {
    id: result.rows[0].id,
    expiresAt: result.rows[0].expires_at,
    revoked: result.rows[0].revoked
  }
}

export const revokeRefreshToken = async (id: string): Promise<boolean> => {
  const result = await query(
    `UPDATE refresh_tokens
     SET revoked = TRUE
     WHERE id = $1 AND revoked = FALSE`,
    [id]
  )
  return (result.rowCount || 0) > 0
}


export const addRecurrenceRule = async (r: Omit<RecurrenceRule, 'id'>): Promise<RecurrenceRule> => {
  const id = generateId()
  const enabled = r.enabled === undefined ? true : r.enabled
  const result = await query<RecurrenceRule>(
    `INSERT INTO recurrence_rules (id, user_id, title, description, priority, type, interval, end_date, enabled)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING 
       id, user_id as "userId", title, description, priority, type, interval,
       end_date as "endDate", enabled`,
    [id, r.userId, r.title, r.description || null, r.priority, r.type, r.interval, r.endDate || null, enabled]
  )
  return result.rows[0]
}

export const listRecurrenceRulesByUser = async (userId: string): Promise<RecurrenceRule[]> => {
  const result = await query<RecurrenceRule>(
    `SELECT 
       id, user_id as "userId", title, description, priority, type, interval,
       end_date as "endDate", enabled
     FROM recurrence_rules
     WHERE user_id = $1`,
    [userId]
  )
  return result.rows
}

export const deleteRecurrenceRule = async (id: string): Promise<boolean> => {
  const result = await query(`DELETE FROM recurrence_rules WHERE id = $1`, [id])
  return (result.rowCount || 0) > 0
}

export const deleteRecurrenceRuleAndSave = async (id: string): Promise<boolean> => {
  return deleteRecurrenceRule(id)
}

export const updateRecurrenceRule = async (id: string, patch: Partial<RecurrenceRule>): Promise<RecurrenceRule | undefined> => {
  const updates: string[] = []
  const values: any[] = []
  let paramIndex = 1

  if (patch.title !== undefined) {
    updates.push(`title = $${paramIndex++}`)
    values.push(patch.title)
  }
  if (patch.description !== undefined) {
    updates.push(`description = $${paramIndex++}`)
    values.push(patch.description)
  }
  if (patch.priority !== undefined) {
    updates.push(`priority = $${paramIndex++}`)
    values.push(patch.priority)
  }
  if (patch.type !== undefined) {
    updates.push(`type = $${paramIndex++}`)
    values.push(patch.type)
  }
  if (patch.interval !== undefined) {
    updates.push(`interval = $${paramIndex++}`)
    values.push(patch.interval)
  }
  if (patch.endDate !== undefined) {
    updates.push(`end_date = $${paramIndex++}`)
    values.push(patch.endDate)
  }
  if (patch.enabled !== undefined) {
    updates.push(`enabled = $${paramIndex++}`)
    values.push(patch.enabled)
  }

  if (updates.length === 0) {
    const result = await query<RecurrenceRule>(
      `SELECT 
         id, user_id as "userId", title, description, priority, type, interval,
         end_date as "endDate", enabled
       FROM recurrence_rules
       WHERE id = $1`,
      [id]
    )
    return result.rows[0] || undefined
  }

  values.push(id)
  const result = await query<RecurrenceRule>(
    `UPDATE recurrence_rules
     SET ${updates.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING 
       id, user_id as "userId", title, description, priority, type, interval,
       end_date as "endDate", enabled`,
    values
  )

  if (result.rows.length === 0) return undefined
  return result.rows[0]
}
