import { appRegistry } from '../core/appRegistry'
import { eventBus } from '../core/eventBus'
import { windowManager } from '../core/windowManager'
import { launchApp } from '../core/shortcutManager'

export function createDock(): HTMLElement {
  const dock = document.createElement('nav')
  dock.className = 'dock'

  const inner = document.createElement('div')
  inner.className = 'dock-inner'

  const pinned = appRegistry.getPinned()
  const items = new Map<string, HTMLElement>()

  const render = () => {
    inner.innerHTML = ''
    items.clear()

    const windows = windowManager.getWindows()
    const runningAppIds = new Set(windows.filter((w) => !w.minimized).map((w) => w.appId))
    const minimizedAppIds = new Set(windows.filter((w) => w.minimized).map((w) => w.appId))

    for (const app of pinned) {
      const btn = document.createElement('button')
      btn.className = 'dock-item'
      btn.title = app.name
      btn.dataset.appId = app.id
      btn.innerHTML = `<span class="dock-tile dock-tile--${app.id}">${app.icon}</span>`

      if (runningAppIds.has(app.id)) btn.classList.add('running')
      if (minimizedAppIds.has(app.id)) btn.classList.add('minimized')

      const focused = windowManager.getFocused()
      if (focused?.appId === app.id) btn.classList.add('active')

      btn.addEventListener('click', () => {
        const existing = windows.find((w) => w.appId === app.id)
        if (existing) {
          if (existing.minimized) windowManager.restore(existing.id)
          else windowManager.focus(existing.id)
        } else {
          launchApp(app.id)
        }
      })

      btn.addEventListener('mouseenter', () => {
        dock.querySelectorAll('.dock-item').forEach((el) => el.classList.remove('magnified'))
        btn.classList.add('magnified')
      })

      items.set(app.id, btn)
      inner.append(btn)
    }
  }

  dock.append(inner)

  dock.addEventListener('mouseleave', () => {
    dock.querySelectorAll('.dock-item').forEach((el) => el.classList.remove('magnified'))
  })

  render()

  eventBus.on('window:open', render)
  eventBus.on('window:close', render)
  eventBus.on('window:focus', render)
  eventBus.on('window:minimize', render)
  eventBus.on('window:restore', render)

  return dock
}
