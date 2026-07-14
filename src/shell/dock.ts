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
    // full rebuild on every window event — ~10 tiles, not worth diffing
    inner.innerHTML = ''
    items.clear()

    const windows = windowManager.getWindows()
    const runningAppIds = new Set<string>()
    const minimizedAppIds = new Set<string>()

    for (let w = 0; w < windows.length; w++) {
      const win = windows[w]
      if (win.minimized) {
        minimizedAppIds.add(win.appId)
      } else {
        runningAppIds.add(win.appId)
      }
    }

    for (const app of pinned) {
      const btn = document.createElement('button')
      btn.className = 'dock-item'
      btn.title = app.name
      btn.dataset.appId = app.id
      btn.innerHTML = '<span class="dock-tile dock-tile--' + app.id + '">' + app.icon + '</span>'

      if (runningAppIds.has(app.id)) {
        btn.classList.add('running')
      }
      if (minimizedAppIds.has(app.id)) {
        btn.classList.add('minimized')
      }

      const focusedWin = windowManager.getFocused()
      if (focusedWin) {
        if (focusedWin.appId === app.id) {
          btn.classList.add('active')
        }
      }

      btn.addEventListener('click', () => {
        // fresh window list — closure from render() can be stale
        const openWins = windowManager.getWindows()
        let found = null as (typeof openWins)[0] | null
        for (let i = 0; i < openWins.length; i++) {
          if (openWins[i].appId === app.id) {
            found = openWins[i]
            break
          }
        }

        if (found) {
          if (found.minimized) {
            windowManager.restore(found.id)
          } else {
            windowManager.focus(found.id)
          }
        } else {
          launchApp(app.id)
        }
      })

      btn.addEventListener('mouseenter', () => {
        // fake dock zoom. mac scales neighbors too, looked weird here
        const allTiles = dock.querySelectorAll('.dock-item')
        for (let t = 0; t < allTiles.length; t++) {
          allTiles[t].classList.remove('magnified')
        }
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
