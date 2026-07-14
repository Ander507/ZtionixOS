import type { Notification } from '../types'
import { eventBus } from './eventBus'

const STORAGE_KEY = 'ztionixos-notifications'

class NotificationService {
  private notifications: Notification[] = []
  private toastContainer: HTMLElement | null = null

  constructor() {
    this.notifications = this.load()
  }

  private load(): Notification[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) return JSON.parse(stored) as Notification[]
    } catch { /* empty */ }
    return []
  }

  private persist(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.notifications.slice(0, 50)))
  }

  init(container: HTMLElement): void {
    this.toastContainer = document.createElement('div')
    this.toastContainer.className = 'toast-container'
    container.append(this.toastContainer)
  }

  push(title: string, message: string): Notification {
    const n: Notification = {
      id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title,
      message,
      read: false,
      timestamp: Date.now(),
    }
    this.notifications.unshift(n)
    if (this.notifications.length > 50) this.notifications.pop()
    this.persist()
    eventBus.emit('notification:push', n)
    this.showToast(n)
    return n
  }

  getAll(): Notification[] {
    return [...this.notifications]
  }

  getUnreadCount(): number {
    return this.notifications.filter((n) => !n.read).length
  }

  markRead(id: string): void {
    const n = this.notifications.find((x) => x.id === id)
    if (n) { n.read = true; this.persist() }
  }

  markAllRead(): void {
    this.notifications.forEach((n) => { n.read = true })
    this.persist()
  }

  clear(): void {
    this.notifications = []
    localStorage.removeItem(STORAGE_KEY)
  }

  private showToast(n: Notification): void {
    if (!this.toastContainer) return
    const toast = document.createElement('div')
    toast.className = 'toast'
    toast.innerHTML = `<strong>${n.title}</strong><span>${n.message}</span>`
    this.toastContainer.append(toast)
    requestAnimationFrame(() => toast.classList.add('toast--visible'))
    window.setTimeout(() => {
      toast.classList.remove('toast--visible')
      window.setTimeout(() => toast.remove(), 300)
    }, 4000)
  }
}

export const notificationService = new NotificationService()
