import type { Kernel } from '../core/kernel';
import { Taskbar } from './taskbar';
import { StartMenu } from './startMenu';
import { ContextMenu } from './contextMenu';
import { WindowComponent } from './window';
import { svgIcon, ICONS, formatTime, formatDate } from '../utils';

const ICON_CELL_W = 92;
const ICON_CELL_H = 98;

export class DesktopShell {
  private root: HTMLElement | null = null;
  private windowsArea: HTMLElement | null = null;
  private windowComponents = new Map<string, WindowComponent>();
  private taskbar: Taskbar;
  private startMenu: StartMenu;
  private contextMenu: ContextMenu;
  private iconPositions: Record<string, { x: number; y: number }> = {};
  private lastIconDrag = 0;
  private clockTimer: number | null = null;

  constructor(
    private container: HTMLElement,
    private kernel: Kernel
  ) {
    this.taskbar = new Taskbar(kernel);
    this.startMenu = new StartMenu(kernel);
    this.contextMenu = new ContextMenu();
  }

  async mount(): Promise<void> {
    this.root = document.createElement('div');
    this.root.className = 'desktop-shell';
    this.root.innerHTML = `
      <div class="desktop">
        <header class="system-bar">
          <div class="system-bar-brand">
            <span class="system-bar-mark"></span>
            <span>ZtionixOS</span>
            <button class="system-bar-menu">Applications</button>
          </div>
          <div class="system-bar-clock"></div>
          <div class="system-bar-status">
            <span>Workspace</span>
            <span class="system-bar-dot"></span>
            <span>Online</span>
          </div>
        </header>
        <div class="desktop-icons"></div>
        <div class="windows-area"></div>
      </div>
      <div class="notification-toasts"></div>
      <div class="notification-center hidden"></div>
    `;

    this.windowsArea = this.root.querySelector('.windows-area');
    this.container.appendChild(this.root);
    this.container.appendChild(this.taskbar.element);
    this.container.appendChild(this.startMenu.element);

    try {
      this.iconPositions = JSON.parse(localStorage.getItem(this.iconStorageKey()) ?? '{}');
    } catch {
      this.iconPositions = {};
    }

    this.root.querySelector('.system-bar-menu')?.addEventListener('click', () => {
      this.kernel.bus.emit('startmenu:toggle', undefined);
    });

    this.updateSystemClock();
    this.clockTimer = window.setInterval(() => this.updateSystemClock(), 1000);

    this.renderDesktopIcons();
    this.setupEvents();
    this.setupDesktopContextMenu();
  }

  unmount(): void {
    if (this.clockTimer !== null) {
      clearInterval(this.clockTimer);
      this.clockTimer = null;
    }
    this.root?.remove();
    this.taskbar.element.remove();
    this.startMenu.element.remove();
    this.windowComponents.clear();
  }

  getWindowContent(windowId: string): HTMLElement | null {
    return this.windowComponents.get(windowId)?.getContent() ?? null;
  }

  private iconStorageKey(): string {
    return `ztionix-icons:${this.kernel.userManager.currentUser?.id ?? 'guest'}`;
  }

  private updateSystemClock(): void {
    const el = this.root?.querySelector('.system-bar-clock');
    if (!el) return;
    const now = new Date();
    const settings = this.kernel.userManager.getSettings();
    el.textContent = `${formatDate(now)}  ${formatTime(now, settings.clockFormat)}`;
  }

  private setupEvents(): void {
    this.kernel.bus.on('window:open', (state) => {
      if (!this.windowsArea) return;
      const winComp = new WindowComponent(this.kernel, state);
      this.windowComponents.set(state.id, winComp);
      this.windowsArea.appendChild(winComp.element);
      this.taskbar.update();
    });

    this.kernel.bus.on('window:close', (id) => {
      this.windowComponents.get(id)?.element.remove();
      this.windowComponents.delete(id);
      this.taskbar.update();
    });

    this.kernel.bus.on('fs:change', () => this.renderDesktopIcons());
    this.kernel.bus.on('settings:change', () => {
      this.renderDesktopIcons();
      this.kernel.themeEngine.apply();
    });
  }

  private renderDesktopIcons(): void {
    const iconsEl = this.root?.querySelector('.desktop-icons') as HTMLElement | null;
    if (!iconsEl) return;
    iconsEl.innerHTML = '';

    const settings = this.kernel.userManager.getSettings();
    const apps = this.kernel.appRegistry.getInstalled(settings.installedApps);

    type IconItem = { key: string; iconSvg: string; label: string; open: () => void };
    const items: IconItem[] = apps.map((app) => ({
      key: `app:${app.id}`,
      iconSvg: svgIcon(app.icon, 30),
      label: app.name,
      open: () => this.kernel.launchApp(app.id),
    }));

    const desktopPath = `${this.kernel.fileSystem.getHomePath()}/Desktop`;
    for (const file of this.kernel.fileSystem.listDir(desktopPath)) {
      items.push({
        key: `file:${file.path}`,
        iconSvg: svgIcon(file.type === 'folder' ? ICONS.folder : ICONS.file, 30),
        label: file.name,
        open: () =>
          file.type === 'file'
            ? this.kernel.launchApp('notepad', { path: file.path })
            : this.kernel.launchApp('explorer', { path: file.path }),
      });
    }

    const availH = Math.max(iconsEl.clientHeight || window.innerHeight - 120, ICON_CELL_H);
    const rows = Math.max(1, Math.floor(availH / ICON_CELL_H));

    items.forEach((item, i) => {
      const btn = document.createElement('button');
      btn.className = 'desktop-icon';
      btn.innerHTML = `
        <span class="desktop-icon-img">${item.iconSvg}</span>
        <span class="desktop-icon-label">${item.label}</span>
      `;

      const saved = this.iconPositions[item.key];
      const col = Math.floor(i / rows);
      const row = i % rows;
      btn.style.left = `${saved?.x ?? col * ICON_CELL_W}px`;
      btn.style.top = `${saved?.y ?? row * ICON_CELL_H}px`;

      btn.addEventListener('dblclick', () => {
        if (Date.now() - this.lastIconDrag < 300) return;
        item.open();
      });

      this.makeIconDraggable(btn, item.key, iconsEl);
      iconsEl.appendChild(btn);
    });
  }

  private makeIconDraggable(icon: HTMLElement, key: string, area: HTMLElement): void {
    icon.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      const startX = e.clientX;
      const startY = e.clientY;
      const origX = parseFloat(icon.style.left) || 0;
      const origY = parseFloat(icon.style.top) || 0;
      let moved = false;
      let done = false;

      const onMove = (ev: PointerEvent) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        if (!moved) {
          if (Math.hypot(dx, dy) < 6) return;
          moved = true;
          icon.setPointerCapture(e.pointerId);
          icon.classList.add('dragging');
        }
        icon.style.left = `${origX + dx}px`;
        icon.style.top = `${origY + dy}px`;
      };

      const onUp = () => {
        if (done) return;
        done = true;
        icon.removeEventListener('pointermove', onMove);
        if (!moved) return;

        icon.classList.remove('dragging');
        this.lastIconDrag = Date.now();

        const maxX = Math.max(0, area.clientWidth - ICON_CELL_W);
        const maxY = Math.max(0, area.clientHeight - ICON_CELL_H);
        const rawX = parseFloat(icon.style.left) || 0;
        const rawY = parseFloat(icon.style.top) || 0;
        const x = Math.min(maxX, Math.max(0, Math.round(rawX / ICON_CELL_W) * ICON_CELL_W));
        const y = Math.min(maxY, Math.max(0, Math.round(rawY / ICON_CELL_H) * ICON_CELL_H));
        icon.style.left = `${x}px`;
        icon.style.top = `${y}px`;

        this.iconPositions[key] = { x, y };
        localStorage.setItem(this.iconStorageKey(), JSON.stringify(this.iconPositions));
      };

      icon.addEventListener('pointermove', onMove);
      icon.addEventListener('pointerup', onUp, { once: true });
      icon.addEventListener('pointercancel', onUp, { once: true });
    });
  }

  private setupDesktopContextMenu(): void {
    const desktop = this.root?.querySelector('.desktop') as HTMLElement;
    desktop?.addEventListener('contextmenu', (e) => {
      if ((e.target as HTMLElement).closest('.window')) return;
      e.preventDefault();
      this.contextMenu.show(e.clientX, e.clientY, [
        { label: 'New Folder', icon: ICONS.folder, action: async () => {
          const path = `${this.kernel.fileSystem.getHomePath()}/Desktop`;
          await this.kernel.fileSystem.createFolder(path, `New Folder ${Date.now().toString(36)}`);
        }},
        { label: 'New Text File', icon: ICONS.file, action: async () => {
          const path = `${this.kernel.fileSystem.getHomePath()}/Desktop`;
          await this.kernel.fileSystem.createFile(path, `untitled-${Date.now().toString(36)}.txt`, '');
        }},
        { label: 'Change Wallpaper', icon: ICONS.image, action: () => this.kernel.launchApp('settings') },
        { label: 'Reset Icon Layout', icon: ICONS.search, action: () => {
          this.iconPositions = {};
          localStorage.removeItem(this.iconStorageKey());
          this.renderDesktopIcons();
        }},
      ]);
    });
  }
}
