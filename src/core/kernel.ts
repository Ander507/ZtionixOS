import { appRegistry } from './appRegistry'
import { themeEngine } from './themeEngine'
import { windowManager } from './windowManager'
import { eventBus } from './eventBus'
import { createTopBar } from '../shell/topbar'
import { createDesktop } from '../shell/desktop'
import { createDock } from '../shell/dock'
import { createAppLauncher, openLauncher } from '../shell/appLauncher'
import { notificationService } from './notificationService'
import { shortcutManager, registerDefaultShortcuts, launchApp } from './shortcutManager'
import { getAppForPath } from '../utils/fileBridge'
import type { BootManager } from '../shell/bootManager'
import { filesApp } from '../apps/files'
import { terminalApp } from '../apps/terminal'
import { editorApp } from '../apps/editor'
import { settingsApp } from '../apps/settings'
import { aboutApp } from '../apps/about'
import { calculatorApp } from '../apps/calculator'
import { browserApp } from '../apps/browser'
import { paintApp } from '../apps/paint'
import { musicApp } from '../apps/music'
import { messagesApp } from '../apps/messages'

export class Kernel {
  private root: HTMLElement
  private bootManager: BootManager | null

  constructor(root: HTMLElement, bootManager?: BootManager) {
    this.root = root
    this.bootManager = bootManager ?? null
  }

  boot(): void {
    this.root.innerHTML = ''
    this.root.className = 'os-root'

    this.registerApps()
    themeEngine.apply()

    const shell = document.createElement('div')
    shell.className = 'os-shell'

    const topbar = createTopBar({
      onLock: () => this.bootManager?.lock(),
      onLogout: () => this.bootManager?.logout(),
      onRestart: () => this.bootManager?.restart(),
      onShutdown: () => this.bootManager?.shutdown(),
      onOpenLauncher: () => openLauncher(),
    })
    const desktop = createDesktop()
    const windowLayer = document.createElement('div')
    windowLayer.className = 'window-layer'
    const dock = createDock()
    const launcher = createAppLauncher()

    shell.append(topbar, desktop, windowLayer, dock)
    this.root.append(shell, launcher)

    windowManager.init(windowLayer)
    notificationService.init(shell)

    window.addEventListener('resize', () => windowManager.handleResize())

    shortcutManager.init()
    registerDefaultShortcuts({
      openLauncher: () => openLauncher(),
      lock: () => this.bootManager?.lock(),
      openSettings: () => launchApp('settings'),
    })

    eventBus.on('file:open', ({ path, appId }) => {
      const target = appId ?? getAppForPath(path)
      windowManager.launch(target, { data: { path } })
    })
  }

  private registerApps(): void {
    appRegistry.register(filesApp)
    appRegistry.register(terminalApp)
    appRegistry.register(editorApp)
    appRegistry.register(settingsApp)
    appRegistry.register(aboutApp)
    appRegistry.register(calculatorApp)
    appRegistry.register(browserApp)
    appRegistry.register(paintApp)
    appRegistry.register(musicApp)
    appRegistry.register(messagesApp)
  }
}
