import { appRegistry } from './appRegistry'
import { eventBus } from './eventBus'

const PINS_KEY = 'ztionixos-dock-pins'

/** Curated first-run dock — users can change this in Settings or via right-click */
const CORE_DEFAULTS = [
  'files',
  'terminal',
  'browser',
  'writer',
  'calc',
  'video',
  'music',
  'settings',
]

/** Fallback when user has never customized the dock */
export function getDefaultPinIds(): string[] {
  const ids: string[] = []
  for (let i = 0; i < CORE_DEFAULTS.length; i++) {
    if (appRegistry.get(CORE_DEFAULTS[i])) ids.push(CORE_DEFAULTS[i])
  }
  if (ids.length > 0) return ids
  const all = appRegistry.getAll()
  for (let i = 0; i < all.length; i++) {
    if (all[i].pinned) ids.push(all[i].id)
  }
  return ids
}

export function getPinnedIds(): string[] {
  try {
    const raw = localStorage.getItem(PINS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as string[]
      if (Array.isArray(parsed) && parsed.length > 0) {
        const valid: string[] = []
        for (let i = 0; i < parsed.length; i++) {
          if (appRegistry.get(parsed[i])) valid.push(parsed[i])
        }
        if (valid.length > 0) return valid
      }
    }
  } catch { /* */ }
  return getDefaultPinIds()
}

export function setPinnedIds(ids: string[]): void {
  const unique: string[] = []
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i]
    if (!appRegistry.get(id)) continue
    if (unique.includes(id)) continue
    unique.push(id)
  }
  localStorage.setItem(PINS_KEY, JSON.stringify(unique))
  eventBus.emit('dock:pins', { ids: unique })
}

export function isPinned(appId: string): boolean {
  return getPinnedIds().includes(appId)
}

export function pinApp(appId: string): void {
  if (!appRegistry.get(appId)) return
  const ids = getPinnedIds()
  if (ids.includes(appId)) return
  setPinnedIds([...ids, appId])
}

export function unpinApp(appId: string): void {
  setPinnedIds(getPinnedIds().filter((id) => id !== appId))
}

export function togglePin(appId: string): void {
  if (isPinned(appId)) unpinApp(appId)
  else pinApp(appId)
}

export function reorderPinned(fromId: string, toId: string): void {
  const ids = getPinnedIds()
  const from = ids.indexOf(fromId)
  const to = ids.indexOf(toId)
  if (from < 0 || to < 0 || from === to) return
  const next = [...ids]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  setPinnedIds(next)
}

