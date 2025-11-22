import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { listTasksByUser } from '../store'

const router = Router()
router.use(requireAuth)

router.get('/summary', async (req, res) => {
  const userId = (req as any).userId as string
  const tasks = await listTasksByUser(userId)
  const completed = tasks.filter(t=>t.status==='completed')
  const totalCompleted = completed.length
  const days = 30
  const avgPerDay = +(totalCompleted / days).toFixed(2)
  const productivity = Math.round((totalCompleted / (days * 1)) * 100) 
  res.json({ totalCompleted, avgPerDay, productivity })
})

export default router