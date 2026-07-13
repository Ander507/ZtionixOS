import type { EventBus } from './eventBus';
import type { Persistence } from './persistence';
import type { UserManager } from './userManager';
import type { Notification } from '../types';
import { generateId } from '../utils';

export class NotificationService {
  private notifications: Notification[] = [];

  constructor(
    private persistence: Persistence,
    private userManager: UserManager,
    private bus: EventBus
  ) {}

  init(): void {
    this.bus.on('notify', (data) => this.push(data));
    this.bus.on('user:login', async (user) => {
      if (!user.isGuest) {
        this.notifications = await this.persistence.getNotifications(user.id);
      } else {
        this.notifications = [];
      }
    });
  }

  async push(data: Omit<Notification, 'id' | 'timestamp' | 'read' | 'userId'>): Promise<void> {
    const user = this.userManager.currentUser;
    if (!user) return;

    const notification: Notification = {
      id: generateId(),
      userId: user.id,
      timestamp: Date.now(),
      read: false,
      ...data,
    };

    this.notifications.unshift(notification);
    if (!user.isGuest) {
      await this.persistence.saveNotification(notification);
    }
    this.renderToast(notification);
    this.updateBadge();
  }

  getAll(): Notification[] {
    return [...this.notifications];
  }

  getUnreadCount(): number {
    return this.notifications.filter((n) => !n.read).length;
  }

  async markAllRead(): Promise<void> {
    for (const n of this.notifications) {
      n.read = true;
      if (!this.userManager.currentUser?.isGuest) {
        await this.persistence.saveNotification(n);
      }
    }
    this.updateBadge();
  }

  private updateBadge(): void {
    const badge = document.querySelector('.tray-notifications .badge') as HTMLElement | null;
    const count = this.getUnreadCount();
    if (badge) {
      badge.textContent = count > 0 ? String(count) : '';
      badge.style.display = count > 0 ? 'flex' : 'none';
    }
  }

  private renderToast(notification: Notification): void {
    const container = document.querySelector('.notification-toasts') as HTMLElement | null;
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'notification-toast';
    toast.innerHTML = `
      <div class="notification-toast-title">${notification.title}</div>
      <div class="notification-toast-message">${notification.message}</div>
    `;
    container.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('visible'));
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
}
