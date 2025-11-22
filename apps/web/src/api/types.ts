export type TaskStatus = 'pending' | 'in_progress' | 'completed'
export type TaskPriority = 'low' | 'medium' | 'high'
export type Task = { id: string; title: string; description?: string; dueDate?: string; status: TaskStatus; priority: TaskPriority; orderIndex: number }