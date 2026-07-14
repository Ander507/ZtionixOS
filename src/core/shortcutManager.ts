import { appRegistry } from './appRegistry'
import { eventBus } from './eventBus'
import { windowManager } from './windowManager'
import { addRecentApp } from './recentApps'

type ShortcutHandler = (e: KeyboardEvent) => void

interface Shortcut {
  key: string
  ctrl?: boolean
  alt?: boolean
  shift?: boolean
  handler: ShortcutHandler
}

class ShortcutManager {
  private shortcuts: Shortcut[] = []
  private altTabHeld = false

  init(): void {
    document.addEventListener('keydown', (e) => this.handleKeyDown(e))
    document.addEventListener('keyup', (e) => {
      if (e.key === 'Alt') this.altTabHeld = false
    })
  }

  register(shortcut: Shortcut): void {
    this.shortcuts.push(shortcut)
  }

  private isTypingTarget(target: EventTarget | null): boolean {
    const el = target as HTMLElement | null
    if (!el) return false
    const tag = el.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable) return true
    if (el.closest('.app-launcher, .app-terminal, .editor-textarea, .browser-address')) return true
    return false
  }

  private handleKeyDown(e: KeyboardEvent): void {
    // Alt+Tab window cycling
    if (e.altKey && e.key === 'Tab') {
      e.preventDefault()
      if (!this.altTabHeld) {
        this.altTabHeld = true
        windowManager.cycleWindows(e.shiftKey ? -1 : 1)
      }
      return
    }

    if (this.isTypingTarget(e.target)) return

    for (const s of this.shortcuts) {
      const ctrl = e.ctrlKey || e.metaKey
      if (s.ctrl && !ctrl) continue
      if (!s.ctrl && ctrl && s.key !== ',') continue
      if (s.alt && !e.altKey) continue
      if (!s.alt && e.altKey) continue
      if (s.shift && !e.shiftKey) continue
      if (!s.shift && e.shiftKey) continue
      if (e.key.toLowerCase() !== s.key.toLowerCase()) continue
      e.preventDefault()
      s.handler(e)
      return
    }
  }
}

export const shortcutManager = new ShortcutManager()

export function launchApp(appId: string): void {
  windowManager.launch(appId)
  addRecentApp(appId)
  eventBus.emit('app:launch', { appId })
}

export function registerDefaultShortcuts(opts: {
  openLauncher: () => void
  lock: () => void
  openSettings: () => void
}): void {
  shortcutManager.register({ key: 'k', ctrl: true, handler: () => opts.openLauncher() })
  shortcutManager.register({ key: 'l', ctrl: true, handler: () => opts.lock() })
  shortcutManager.register({ key: ',', ctrl: true, handler: () => opts.openSettings() })
}

export function getAllApps() {
  return appRegistry.getAll()
}
