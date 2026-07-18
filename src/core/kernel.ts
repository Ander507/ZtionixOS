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
import { notesApp } from '../apps/notes'
import { snakeApp } from '../apps/snake'
import { taskmgrApp } from '../apps/taskmgr'
import { doomApp } from '../apps/doom'
import { photoBoothApp } from '../apps/photobooth'
import { videoApp } from '../apps/video'
import { writerApp } from '../apps/writer'
import { calcOfficeApp } from '../apps/calc'
import { impressApp } from '../apps/impress'
import { initEasterEggs } from './easterEgg'

export class Kernel {
  private root: HTMLElement
  private bootManager: BootManager | null

  constructor(root: HTMLElement, bootManager?: BootManager) {
    this.root = root
    if (bootManager) {
      this.bootManager = bootManager
    } else {
      this.bootManager = null
    }
  }

  boot(): void {
    // Assemble the shell: topbar, desktop, windows, dock, launcher
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

    window.addEventListener('resize', () => {
      windowManager.handleResize()
    })

    shortcutManager.init()
    registerDefaultShortcuts({
      openLauncher: () => openLauncher(),
      lock: () => this.bootManager?.lock(),
      openSettings: () => launchApp('settings'),
    })

    eventBus.on('file:open', ({ path, appId }) => {
      let target = appId
      if (!target) {
        target = getAppForPath(path)
      }
      windowManager.launch(target, { data: { path } })
    })

    initEasterEggs() // konami, crt triple-click, snake shortcut — the fun stuff
  }

  private registerApps(): void {
    const apps = [
      filesApp,
      terminalApp,
      editorApp,
      settingsApp,
      aboutApp,
      calculatorApp,
      browserApp,
      paintApp,
      musicApp,
      notesApp,
      snakeApp,
      taskmgrApp,
      doomApp,
      photoBoothApp,
      videoApp,
      writerApp,
      calcOfficeApp,
      impressApp,
    ]
    for (let i = 0; i < apps.length; i++) {
      appRegistry.register(apps[i])
    }
  }
}
