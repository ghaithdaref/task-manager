import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'
import { addTask, deleteTaskAndSave, getTask, listTasksByUser, updateTask } from '../store'

const router = Router()

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['pending', 'in_progress', 'completed']).default('pending'),
  priority: z.enum(['low', 'medium', 'high']).default('medium')
})

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['pending', 'in_progress', 'completed']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  orderIndex: z.number().int().optional()
}).strict()

router.use(requireAuth)

router.get('/', async (req, res) => {
  const userId = (req as any).userId as string
  const { status, priority, search, from, to } = req.query
  let items = await listTasksByUser(userId)
  if (status && typeof status === 'string') items = items.filter(t => t.status === status)
  if (priority && typeof priority === 'string') items = items.filter(t => t.priority === priority)
  if (search && typeof search === 'string') items = items.filter(t => t.title.toLowerCase().includes(search.toLowerCase()))
  if (from && typeof from === 'string') items = items.filter(t => t.dueDate && t.dueDate >= from)
  if (to && typeof to === 'string') items = items.filter(t => t.dueDate && t.dueDate <= to)
  res.json(items)
})

router.post('/', async (req, res) => {
  try {
    const userId = (req as any).userId as string
    if (!userId) {
      console.error('No userId found in request')
      return res.status(401).json({ error: 'unauthorized', message: 'User ID not found' })
    }
    
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) {
      console.error('Validation error:', parsed.error.flatten())
      return res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() })
    }
    
    const orderIndex = Date.now()
    console.log('Creating task:', { userId, title: parsed.data.title, priority: parsed.data.priority })
    
    const task = await addTask({
      userId,
      title: parsed.data.title,
      description: parsed.data.description,
      dueDate: parsed.data.dueDate,
      status: parsed.data.status,
      priority: parsed.data.priority,
      orderIndex
    })
    
    console.log('Task created successfully:', { id: task.id, title: task.title })
    res.status(201).json(task)
  } catch (error: any) {
    console.error('Error creating task:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      constraint: error.constraint,
      stack: error.stack
    })
    res.status(500).json({ 
      error: 'internal_error', 
      message: error.message,
      code: error.code,
      detail: error.detail
    })
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const userId = (req as any).userId as string
    const id = req.params.id
    const parsed = updateSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() })
    const existing = await getTask(id)
    if (!existing || existing.userId !== userId) return res.status(404).json({ error: 'not_found' })
    const updated = await updateTask(id, parsed.data)
    if (!updated) return res.status(404).json({ error: 'not_found' })
    res.json(updated)
  } catch (error: any) {
    console.error('Error updating task:', error)
    res.status(500).json({ error: 'internal_error', message: error.message })
  }
})

router.delete('/:id', async (req, res) => {
  const userId = (req as any).userId as string
  const id = req.params.id
  const existing = await getTask(id)
  if (!existing || existing.userId !== userId) return res.status(404).json({ error: 'not_found' })
  const ok = await deleteTaskAndSave(id)
  if (!ok) return res.status(404).json({ error: 'not_found' })
  res.status(204).end()
})

export default router