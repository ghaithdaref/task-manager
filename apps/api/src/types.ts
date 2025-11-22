export type User = {
  id: string
  name: string
  email: string
  passwordHash: string
  theme?: 'light' | 'dark'
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed'
export type TaskPriority = 'low' | 'medium' | 'high'

export type Task = {
  id: string
  userId: string
  title: string
  description?: string
  dueDate?: string
  status: TaskStatus
  priority: TaskPriority
  orderIndex: number
  createdAt: string
  updatedAt: string
}

export type Attachment = {
  id: string
  taskId: string
  filename: string
  mimeType: string
  size: number
  storageKey: string
  uploadedAt: string
}

export type RecurrenceType = 'daily' | 'weekly' | 'monthly'
export type RecurrenceRule = {
  id: string
  userId: string
  title: string
  description?: string
  priority: TaskPriority
  type: RecurrenceType
  interval: number
  endDate?: string
  enabled?: boolean
}