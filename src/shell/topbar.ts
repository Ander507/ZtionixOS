import { eventBus } from '../core/eventBus'
import { themeEngine } from '../core/themeEngine'
import { windowManager } from '../core/windowManager'
import { notificationService } from '../core/notificationService'
import { showContextMenu } from './contextMenu'
import { icon } from '../utils/icons'

export interface TopBarOptions {
  onLock?: () => void
  onLogout?: () => void
  onRestart?: () => void
  onShutdown?: () => void
  onOpenLauncher?: () => void
}

export function createTopBar(options: TopBarOptions = {}): HTMLElement {
  const bar = document.createElement('header')
  bar.className = 'topbar'

  const left = document.createElement('div')
  left.className = 'topbar-left'

  const logo = document.createElement('button')
  logo.className = 'topbar-logo'
  logo.innerHTML = `${icon('logo', 'topbar-logo-mark')}<span class="topbar-logo-text">Ztionix</span>`
  logo.title = 'System menu'
  logo.addEventListener('click', () => {
    const rect = logo.getBoundingClientRect()
    showContextMenu(rect.left, rect.bottom + 4, [
      { label: 'About ZtionixOS', action: () => windowManager.launch('about') },
      { separator: true },
      { label: 'Settings', action: () => windowManager.launch('settings') },
      { separator: true },
      { label: 'Lock', action: () => options.onLock?.() },
      { label: 'Log Out', action: () => options.onLogout?.() },
      { separator: true },
      { label: 'Restart', action: () => options.onRestart?.() },
      { label: 'Shut Down', action: () => options.onShutdown?.() },
    ])
  })

  const activeApp = document.createElement('span')
  activeApp.className = 'topbar-active-app'
  activeApp.textContent = 'Desktop'

  const searchBtn = document.createElement('button')
  searchBtn.className = 'topbar-btn topbar-search'
  searchBtn.title = 'Search apps (Ctrl+K)'
  searchBtn.innerHTML = icon('search')
  searchBtn.addEventListener('click', () => options.onOpenLauncher?.())

  left.append(logo, activeApp, searchBtn)

  const right = document.createElement('div')
  right.className = 'topbar-right'

  const notifBtn = document.createElement('button')
  notifBtn.className = 'topbar-btn topbar-notif'
  notifBtn.title = 'Notifications'
  notifBtn.innerHTML = icon('bell')

  const notifBadge = document.createElement('span')
  notifBadge.className = 'topbar-notif-badge'
  notifBadge.hidden = true
  notifBtn.append(notifBadge)

  let notifPanel: HTMLElement | null = null

  const updateBadge = () => {
    const count = notificationService.getUnreadCount()
    notifBadge.hidden = count === 0
    notifBadge.textContent = count > 9 ? '9+' : String(count)
  }

  const hideNotifPanel = () => {
    notifPanel?.remove()
    notifPanel = null
  }

  const showNotifPanel = () => {
    hideNotifPanel()
    notifPanel = document.createElement('div')
    notifPanel.className = 'notif-panel'

    const header = document.createElement('div')
    header.className = 'notif-panel-header'
    header.innerHTML = '<span>Notifications</span>'
    const clearBtn = document.createElement('button')
    clearBtn.textContent = 'Clear all'
    clearBtn.addEventListener('click', () => {
      notificationService.clear()
      updateBadge()
      hideNotifPanel()
    })
    header.append(clearBtn)
    notifPanel.append(header)

    const list = document.createElement('div')
    list.className = 'notif-panel-list'
    const items = notificationService.getAll()
    if (items.length === 0) {
      list.innerHTML = '<div class="notif-panel-empty">No notifications</div>'
    } else {
      for (const n of items) {
        const item = document.createElement('button')
        item.className = `notif-item${n.read ? '' : ' unread'}`
        item.innerHTML = `<strong>${n.title}</strong><span>${n.message}</span><time>${new Date(n.timestamp).toLocaleTimeString()}</time>`
        item.addEventListener('click', () => {
          notificationService.markRead(n.id)
          updateBadge()
          item.classList.remove('unread')
        })
        list.append(item)
      }
    }
    notifPanel.append(list)

    const rect = notifBtn.getBoundingClientRect()
    notifPanel.style.top = `${rect.bottom + 6}px`
    notifPanel.style.right = `${window.innerWidth - rect.right}px`
    document.body.append(notifPanel)
    notificationService.markAllRead()
    updateBadge()
  }

  notifBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    if (notifPanel) hideNotifPanel()
    else showNotifPanel()
  })

  document.addEventListener('mousedown', (e) => {
    if (notifPanel && !notifPanel.contains(e.target as Node) && !notifBtn.contains(e.target as Node)) {
      hideNotifPanel()
    }
  })

  const themeBtn = document.createElement('button')
  themeBtn.className = 'topbar-btn'
  themeBtn.title = 'Toggle theme'
  themeBtn.innerHTML = icon('moon')
  themeBtn.addEventListener('click', () => {
    themeEngine.toggleTheme()
    const isDark = themeEngine.getSettings().theme === 'dark'
    themeBtn.innerHTML = icon(isDark ? 'moon' : 'sun')
  })

  const clock = document.createElement('span')
  clock.className = 'topbar-clock'

  const updateClock = () => {
    const now = new Date()
    clock.textContent = now.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  updateClock()
  setInterval(updateClock, 30_000)

  right.append(notifBtn, themeBtn, clock)
  bar.append(left, right)

  eventBus.on('window:focus', ({ title }) => {
    activeApp.textContent = title
  })

  eventBus.on('window:close', () => {
    const focused = windowManager.getFocused()
    activeApp.textContent = focused?.title ?? 'Desktop'
  })

  eventBus.on('notification:push', updateBadge)
  updateBadge()

  return bar
}
