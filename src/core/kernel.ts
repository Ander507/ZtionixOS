import { EventBus } from './eventBus';
import { Persistence } from './persistence';
import { FileSystem } from './fileSystem';
import { UserManager } from './userManager';
import { ThemeEngine } from './themeEngine';
import { NotificationService } from './notificationService';
import { ProcessManager } from './processManager';
import { WindowManager } from './windowManager';
import { AppRegistry } from './appRegistry';
import { SplashScreen } from '../shell/splash';
import { LoginScreen } from '../shell/login';
import { DesktopShell } from '../shell/desktop';
import { explorerApp } from '../apps/explorer';
import { terminalApp } from '../apps/terminal';
import { settingsApp } from '../apps/settings';
import { calculatorApp } from '../apps/calculator';
import { notepadApp } from '../apps/notepad';
import { browserApp } from '../apps/browser';
import { appStoreApp } from '../apps/appStore';
import { musicPlayerApp } from '../apps/musicPlayer';
import { paintApp } from '../apps/paint';
import type { AppContext } from '../types';

export class Kernel {
  readonly bus = new EventBus();
  readonly persistence = new Persistence();
  readonly fileSystem = new FileSystem(this.persistence, this.bus);
  readonly userManager = new UserManager(this.persistence, this.bus);
  readonly processManager = new ProcessManager();
  readonly windowManager = new WindowManager(this.bus, this.processManager);
  readonly appRegistry = new AppRegistry();
  readonly themeEngine = new ThemeEngine(this.bus, this.userManager);
  readonly notifications = new NotificationService(this.persistence, this.userManager, this.bus);

  private container: HTMLElement;
  private desktopShell: DesktopShell | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  private initialized = false;

  async init(): Promise<void> {
    if (!this.initialized) {
      await this.persistence.init();
      await this.userManager.init();
      this.registerApps();
      this.windowManager.init();
      this.themeEngine.init();
      this.notifications.init();
      this.setupGlobalShortcuts();
      this.initialized = true;
    }

    const splash = new SplashScreen(this.container);
    await splash.show();

    const loggedIn = await this.showLogin();
    if (loggedIn) await this.startSession();
  }

  private async showLogin(): Promise<boolean> {
    const login = new LoginScreen(this.container, this.userManager);
    return login.show();
  }

  private async startSession(): Promise<void> {
    const user = this.userManager.currentUser!;
    if (!user.isGuest) {
      await this.fileSystem.initForUser(user.id);
    } else {
      await this.fileSystem.initForUser('guest-session');
    }

    this.desktopShell = new DesktopShell(this.container, this);
    await this.desktopShell.mount();
    this.themeEngine.apply();

    this.bus.emit('desktop:ready', undefined);
    this.bus.emit('notify', {
      title: 'Welcome to ZtionixOS',
      message: `Logged in as ${user.displayName}. Enjoy your session!`,
    });
  }

  private registerApps(): void {
    const apps = [
      explorerApp,
      terminalApp,
      settingsApp,
      calculatorApp,
      notepadApp,
      browserApp,
      appStoreApp,
      musicPlayerApp,
      paintApp,
    ];
    apps.forEach((app) => this.appRegistry.register(app));
  }

  launchApp(appId: string, params?: Record<string, string>): void {
    const app = this.appRegistry.get(appId);
    if (!app) return;
    if (!this.userManager.isAppInstalled(appId)) return;

    if (app.singleInstance) {
      const existing = this.processManager.getByApp(appId)[0];
      if (existing) {
        const win = this.windowManager.get(existing.windowId);
        if (win) {
          if (win.minimized) this.windowManager.update(win.id, { minimized: false });
          this.windowManager.focus(win.id);
          return;
        }
      }
    }

    const process = this.processManager.create(appId, '');
    const win = this.windowManager.create(app, process.id);
    process.windowId = win.id;

    const ctx: AppContext = {
      kernel: this,
      processId: process.id,
      windowId: win.id,
    };

    if (this.desktopShell) {
      const container = this.desktopShell.getWindowContent(win.id);
      if (container) {
        const cleanup = app.createWindow(ctx, container);
        if (typeof cleanup === 'function') {
          this.processManager.setCleanup(process.id, cleanup);
        }
        if (params) {
          this.bus.emit('app:launch', appId);
          container.dataset.params = JSON.stringify(params);
        }
      }
    }
  }

  async logout(): Promise<void> {
    this.desktopShell?.unmount();
    this.desktopShell = null;
    [...this.windowManager.getAll()].forEach((w) => this.windowManager.close(w.id));
    this.userManager.logout();

    const loggedIn = await this.showLogin();
    if (loggedIn) await this.startSession();
  }

  shutdown(): void {
    this.bus.emit('shutdown:start', undefined);
    const overlay = document.createElement('div');
    overlay.className = 'shutdown-overlay';
    overlay.innerHTML = '<div class="shutdown-text">Shutting down...</div>';
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('visible'));

    setTimeout(() => {
      this.desktopShell?.unmount();
      this.userManager.logout();
      document.body.innerHTML = '<div class="powered-off"><div class="powered-off-text">ZtionixOS</div><p>It is now safe to close this tab.</p><button class="power-on-btn">Power On</button></div>';
      document.querySelector('.power-on-btn')?.addEventListener('click', () => location.reload());
    }, 2000);
  }

  private setupGlobalShortcuts(): void {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Meta' || e.key === 'OS') {
        e.preventDefault();
        this.bus.emit('startmenu:toggle', undefined);
      }
      if (e.altKey && e.key === 'Tab') {
        e.preventDefault();
        this.windowManager.cycleWindows();
      }
      if (e.key === 'Escape') {
        document.querySelector('.context-menu')?.remove();
        document.querySelector('.start-menu')?.classList.remove('open');
      }
    });
  }
}
