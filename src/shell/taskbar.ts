import type { Kernel } from '../core/kernel';
import { svgIcon, ICONS, formatTime, formatDate } from '../utils';

export class Taskbar {
  element: HTMLElement;

  constructor(private kernel: Kernel) {
    this.element = document.createElement('div');
    this.element.className = 'taskbar';
    this.element.innerHTML = `
      <button class="taskbar-start" title="Start">${svgIcon('<path d="M12 2v20"/><path d="M2 12h20"/>', 18)}</button>
      <div class="taskbar-apps"></div>
      <div class="taskbar-tray">
        <button class="tray-btn tray-notifications" title="Notifications">
          ${svgIcon(ICONS.bell, 16)}
          <span class="badge"></span>
        </button>
        <button class="tray-btn tray-settings" title="Settings">${svgIcon(ICONS.settings, 16)}</button>
        <div class="tray-clock">
          <span class="clock-time"></span>
          <span class="clock-date"></span>
        </div>
      </div>
    `;

    this.setup();
  }

  private setup(): void {
    this.element.querySelector('.taskbar-start')?.addEventListener('click', () => {
      this.kernel.bus.emit('startmenu:toggle', undefined);
    });

    this.element.querySelector('.tray-settings')?.addEventListener('click', () => {
      this.kernel.launchApp('settings');
    });

    this.element.querySelector('.tray-notifications')?.addEventListener('click', () => {
      this.toggleNotificationCenter();
    });

    this.updateClock();
    window.setInterval(() => this.updateClock(), 1000);

    this.kernel.bus.on('window:open', () => this.update());
    this.kernel.bus.on('window:close', () => this.update());
    this.kernel.bus.on('window:focus', () => this.update());
    this.kernel.bus.on('window:minimize', () => this.update());
    this.kernel.bus.on('window:restore', () => this.update());
  }

  update(): void {
    const appsEl = this.element.querySelector('.taskbar-apps') as HTMLElement;
    appsEl.innerHTML = '';

    const windows = this.kernel.windowManager.getAll();
    const activeId = this.kernel.windowManager.getActive()?.id;

    for (const win of windows) {
      const app = this.kernel.appRegistry.get(win.appId);
      const btn = document.createElement('button');
      btn.className = `taskbar-app${win.id === activeId ? ' active' : ''}${win.minimized ? ' minimized' : ''}`;
      btn.innerHTML = `${svgIcon(app?.icon ?? ICONS.file, 16)}<span>${win.title}</span>`;
      btn.addEventListener('click', () => {
        if (win.minimized) {
          this.kernel.windowManager.update(win.id, { minimized: false });
          this.kernel.windowManager.focus(win.id);
        } else if (win.id === activeId) {
          this.kernel.windowManager.minimize(win.id);
        } else {
          this.kernel.windowManager.focus(win.id);
        }
      });
      appsEl.appendChild(btn);
    }
  }

  private updateClock(): void {
    const now = new Date();
    const settings = this.kernel.userManager.getSettings();
    const timeEl = this.element.querySelector('.clock-time');
    const dateEl = this.element.querySelector('.clock-date');
    if (timeEl) timeEl.textContent = formatTime(now, settings.clockFormat);
    if (dateEl) dateEl.textContent = formatDate(now);
  }

  private toggleNotificationCenter(): void {
    const center = document.querySelector('.notification-center') as HTMLElement;
    if (!center) return;

    if (center.classList.contains('hidden')) {
      center.classList.remove('hidden');
      center.innerHTML = `
        <div class="notification-center-header">
          <h3>Notifications</h3>
          <button class="btn btn-ghost mark-read">Mark all read</button>
        </div>
        <div class="notification-center-list"></div>
      `;

      const list = center.querySelector('.notification-center-list') as HTMLElement;
      const notifications = this.kernel.notifications.getAll();

      if (notifications.length === 0) {
        list.innerHTML = '<p class="notification-empty">No notifications</p>';
      } else {
        for (const n of notifications) {
          const item = document.createElement('div');
          item.className = `notification-item${n.read ? '' : ' unread'}`;
          item.innerHTML = `
            <div class="notification-item-title">${n.title}</div>
            <div class="notification-item-message">${n.message}</div>
            <div class="notification-item-time">${new Date(n.timestamp).toLocaleTimeString()}</div>
          `;
          list.appendChild(item);
        }
      }

      center.querySelector('.mark-read')?.addEventListener('click', () => {
        this.kernel.notifications.markAllRead();
        center.classList.add('hidden');
      });

      const close = (e: MouseEvent) => {
        if (!center.contains(e.target as Node) && !(e.target as HTMLElement).closest('.tray-notifications')) {
          center.classList.add('hidden');
          document.removeEventListener('click', close);
        }
      };
      setTimeout(() => document.addEventListener('click', close), 0);
    } else {
      center.classList.add('hidden');
    }
  }
}
