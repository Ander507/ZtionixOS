import { desktopLayout } from './desktopLayout'
import { fileSystem } from './fileSystem'
import { notificationService } from './notificationService'
import { themeEngine } from './themeEngine'
import { clearVfsStorage } from './vfsStorage'

const RECENT_APPS_KEY = 'ztionixos-recent-apps'
const PLAYLIST_KEY = 'ztionixos-playlist'

export function resetAll(): void {
  fileSystem.reset()
  desktopLayout.reset()
  themeEngine.reset()
  notificationService.clear()
  localStorage.removeItem(RECENT_APPS_KEY)
  localStorage.removeItem(PLAYLIST_KEY)
  localStorage.removeItem('ztionixos-notifications')
  void clearVfsStorage()
}
