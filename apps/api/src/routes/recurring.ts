import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'
import { addRecurrenceRule, deleteRecurrenceRuleAndSave, listRecurrenceRulesByUser, addTask, updateRecurrenceRule } from '../store'

const router = Router()
router.use(requireAuth)

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(['low','medium','high']).default('medium'),
  type: z.enum(['daily','weekly','monthly']),
  interval: z.number().int().min(1),
  endDate: z.string().optional(),
  enabled: z.boolean().optional()
})
const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  priority: z.enum(['low','medium','high']).optional(),
  type: z.enum(['daily','weekly','monthly']).optional(),
  interval: z.number().int().min(1).optional(),
  endDate: z.string().optional(),
  enabled: z.boolean().optional()
})

router.get('/', async (req, res) => {
  const userId = (req as any).userId as string
  res.json(await listRecurrenceRulesByUser(userId))
})

router.post('/', async (req, res) => {
  const userId = (req as any).userId as string
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() })
  const rule = await addRecurrenceRule({ userId, enabled: parsed.data.enabled ?? true, ...parsed.data })
  res.status(201).json(rule)
})

router.patch('/:id', async (req, res) => {
  const id = req.params.id
  const parsed = updateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'invalid_input', details: parsed.error.flatten() })
  const updated = await updateRecurrenceRule(id, parsed.data)
  if (!updated) return res.status(404).json({ error: 'not_found' })
  res.json(updated)
})

router.delete('/:id', async (req, res) => {
  const ok = await deleteRecurrenceRuleAndSave(req.params.id)
  if (!ok) return res.status(404).json({ error: 'not_found' })
  res.status(204).end()
})

router.post('/generate', async (req, res) => {
  const userId = (req as any).userId as string
  const rules = (await listRecurrenceRulesByUser(userId)).filter(r => r.enabled !== false)
  const created: any[] = []
  const now = new Date()
  const end = new Date(now)
  end.setDate(end.getDate() + 30)
  for (const r of rules) {
    let cursor = new Date(now)
    const endLimit = r.endDate ? new Date(r.endDate) : end
    while (cursor <= endLimit) {
      const due = cursor.toISOString().slice(0,10)
      const task = await addTask({ userId, title: r.title, description: r.description, dueDate: due, status: 'pending', priority: r.priority, orderIndex: Date.now() })
      created.push(task)
      if (r.type === 'daily') cursor.setDate(cursor.getDate() + r.interval)
      else if (r.type === 'weekly') cursor.setDate(cursor.getDate() + 7 * r.interval)
      else cursor.setMonth(cursor.getMonth() + r.interval)
    }
  }
  res.json({ created: created.length })
})

export default router