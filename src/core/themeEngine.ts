import type { Settings } from '../types'
import { eventBus } from './eventBus'

const SETTINGS_KEY = 'ztionixos-settings'

const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  wallpaper: 'slate',
  dockSize: 44,
  accentColor: '#c9a96e',
}

class ThemeEngine {
  private settings: Settings

  constructor() {
    this.settings = this.load()
    this.apply()
  }

  private load(): Settings {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY)
      if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
    } catch {
      /* use defaults */
    }
    return { ...DEFAULT_SETTINGS }
  }

  private save(): void {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings))
    eventBus.emit('settings:change', { ...this.settings })
  }

  getSettings(): Settings {
    return { ...this.settings }
  }

  setTheme(theme: Settings['theme']): void {
    this.settings.theme = theme
    this.apply()
    this.save()
    eventBus.emit('theme:change', { theme })
  }

  setWallpaper(wallpaper: string): void {
    this.settings.wallpaper = wallpaper
    this.apply()
    this.save()
  }

  setDockSize(size: number): void {
    this.settings.dockSize = Math.max(40, Math.min(72, size))
    this.apply()
    this.save()
  }

  setAccentColor(color: string): void {
    this.settings.accentColor = color
    this.apply()
    this.save()
  }

  apply(): void {
    const root = document.documentElement
    root.dataset.theme = this.settings.theme
    root.style.setProperty('--accent', this.settings.accentColor)
    root.style.setProperty('--dock-icon-size', `${this.settings.dockSize}px`)
    root.dataset.wallpaper = this.settings.wallpaper
  }

  toggleTheme(): void {
    this.setTheme(this.settings.theme === 'dark' ? 'light' : 'dark')
  }

  reset(): void {
    this.settings = { ...DEFAULT_SETTINGS }
    localStorage.removeItem(SETTINGS_KEY)
    this.apply()
    eventBus.emit('settings:change', { ...this.settings })
    eventBus.emit('theme:change', { theme: this.settings.theme })
  }
}

export const themeEngine = new ThemeEngine()
