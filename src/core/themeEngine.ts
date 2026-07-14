import type { Settings } from '../types'
import { eventBus } from './eventBus'

const SETTINGS_KEY = 'ztionixos-settings'
const CUSTOM_WALLPAPER_STYLE_ID = 'ztionix-custom-wallpaper'

const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  wallpaper: 'slate',
  customWallpaper: null,
  dockSize: 44,
  accentColor: '#c9a96e',
}

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp']
const MAX_UPLOAD_BYTES = 3 * 1024 * 1024

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

  setCustomWallpaper(src: string): void {
    this.settings.wallpaper = 'custom'
    this.settings.customWallpaper = src
    this.apply()
    this.save()
  }

  clearCustomWallpaper(): void {
    this.settings.customWallpaper = null
    if (this.settings.wallpaper === 'custom') {
      this.settings.wallpaper = 'slate'
    }
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

  getWallpaperId(): string {
    return this.settings.wallpaper
  }

  getCustomWallpaper(): string | null {
    return this.settings.customWallpaper ?? null
  }

  private applyCustomWallpaperStyle(): void {
    let styleEl = document.getElementById(CUSTOM_WALLPAPER_STYLE_ID) as HTMLStyleElement | null
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = CUSTOM_WALLPAPER_STYLE_ID
      document.head.append(styleEl)
    }

    if (this.settings.wallpaper === 'custom' && this.settings.customWallpaper) {
      const src = this.settings.customWallpaper.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
      styleEl.textContent = `
        [data-wallpaper="custom"] .os-shell::before,
        .login-screen--wallpaper-custom .login-wallpaper {
          background-image: url("${src}");
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
        }
      `
    } else {
      styleEl.textContent = ''
    }
  }

  apply(): void {
    const root = document.documentElement
    root.dataset.theme = this.settings.theme
    root.style.setProperty('--accent', this.settings.accentColor)
    root.style.setProperty('--dock-icon-size', `${this.settings.dockSize}px`)
    root.dataset.wallpaper = this.settings.wallpaper
    this.applyCustomWallpaperStyle()
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

export function normalizeWallpaperUrl(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  try {
    const url = new URL(trimmed)
    if (url.protocol === 'http:' || url.protocol === 'https:') return url.href
  } catch { /* not a valid URL */ }
  return null
}

export async function readWallpaperFile(file: File): Promise<string | null> {
  const isImage = IMAGE_TYPES.includes(file.type) || /\.(jpe?g|png|gif|webp|bmp)$/i.test(file.name)
  if (!isImage) return null
  if (file.size > MAX_UPLOAD_BYTES) return null
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null)
    reader.onerror = () => resolve(null)
    reader.readAsDataURL(file)
  })
}

export const themeEngine = new ThemeEngine()
