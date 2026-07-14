const STORAGE_KEY = 'ztionixos-recent-apps'

export function getRecentApps(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored) as string[]
  } catch {
  }
  return []
}

export function addRecentApp(appId: string): void {
  const recent = getRecentApps().filter((id) => id !== appId) // bump to top, no dupes
  recent.unshift(appId)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recent.slice(0, 8)))
}
