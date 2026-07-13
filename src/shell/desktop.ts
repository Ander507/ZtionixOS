import type { Kernel } from '../core/kernel';
import { Taskbar } from './taskbar';
import { StartMenu } from './startMenu';
import { ContextMenu } from './contextMenu';
import { WindowComponent } from './window';
import { svgIcon, ICONS } from '../utils';

export class DesktopShell {
  private root: HTMLElement | null = null;
  private windowsArea: HTMLElement | null = null;
  private windowComponents = new Map<string, WindowComponent>();
  private taskbar: Taskbar;
  private startMenu: StartMenu;
  private contextMenu: ContextMenu;

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

    this.renderDesktopIcons();
    this.setupEvents();
    this.setupDesktopContextMenu();
  }

  unmount(): void {
    this.root?.remove();
    this.taskbar.element.remove();
    this.startMenu.element.remove();
    this.windowComponents.clear();
  }

  getWindowContent(windowId: string): HTMLElement | null {
    return this.windowComponents.get(windowId)?.getContent() ?? null;
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

    this.kernel.bus.on('window:update', () => this.taskbar.update());
    this.kernel.bus.on('fs:change', () => this.renderDesktopIcons());
    this.kernel.bus.on('settings:change', () => {
      this.renderDesktopIcons();
      this.kernel.themeEngine.apply();
    });
  }

  private renderDesktopIcons(): void {
    const iconsEl = this.root?.querySelector('.desktop-icons');
    if (!iconsEl) return;
    iconsEl.innerHTML = '';

    const settings = this.kernel.userManager.getSettings();
    const apps = this.kernel.appRegistry.getInstalled(settings.installedApps);

    for (const app of apps) {
      const icon = document.createElement('button');
      icon.className = 'desktop-icon';
      icon.innerHTML = `
        <span class="desktop-icon-img">${svgIcon(app.icon, 32)}</span>
        <span class="desktop-icon-label">${app.name}</span>
      `;
      icon.addEventListener('dblclick', () => this.kernel.launchApp(app.id));
      iconsEl.appendChild(icon);
    }

    const desktopPath = `${this.kernel.fileSystem.getHomePath()}/Desktop`;
    const desktopFiles = this.kernel.fileSystem.listDir(desktopPath);
    for (const file of desktopFiles) {
      const icon = document.createElement('button');
      icon.className = 'desktop-icon';
      const iconPath = file.type === 'folder' ? ICONS.folder : ICONS.file;
      icon.innerHTML = `
        <span class="desktop-icon-img">${svgIcon(iconPath, 32)}</span>
        <span class="desktop-icon-label">${file.name}</span>
      `;
      icon.addEventListener('dblclick', () => {
        if (file.type === 'file') {
          this.kernel.launchApp('notepad', { path: file.path });
        } else {
          this.kernel.launchApp('explorer', { path: file.path });
        }
      });
      iconsEl.appendChild(icon);
    }
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
        { label: 'Refresh', icon: ICONS.search, action: () => this.renderDesktopIcons() },
      ]);
    });
  }
}
