export const notificationsEnabled = () => {
  try { return localStorage.getItem('stm-notifications') === 'true' } catch { return false }
}

export const ensurePermission = async (): Promise<boolean> => {
  if (typeof window === 'undefined' || !('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const p = await Notification.requestPermission()
  return p === 'granted'
}

export const notify = (title: string, options?: NotificationOptions): boolean => {
  if (typeof window === 'undefined' || !('Notification' in window)) return false
  if (!notificationsEnabled()) return false
  if (Notification.permission !== 'granted') return false
  new Notification(title, options)
  return true
}