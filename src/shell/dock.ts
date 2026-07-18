import { appRegistry } from '../core/appRegistry'
import { eventBus } from '../core/eventBus'
import { windowManager } from '../core/windowManager'
import { launchApp } from '../core/shortcutManager'
import { getPinnedIds, unpinApp, pinApp, isPinned, reorderPinned } from '../core/dockPins'
import { showContextMenu } from './contextMenu'

export function createDock(): HTMLElement {
  const dock = document.createElement('nav')
  dock.className = 'dock'

  const inner = document.createElement('div')
  inner.className = 'dock-inner'

  const items = new Map<string, HTMLElement>()
  let dragFromId: string | null = null
  let suppressClick = false

  const render = () => {
    inner.innerHTML = ''
    items.clear()

    const pinnedIds = getPinnedIds()
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

    const showIds = [...pinnedIds]
    for (const appId of runningAppIds) {
      if (!showIds.includes(appId)) showIds.push(appId)
    }
    for (const appId of minimizedAppIds) {
      if (!showIds.includes(appId)) showIds.push(appId)
    }

    for (let i = 0; i < showIds.length; i++) {
      const app = appRegistry.get(showIds[i])
      if (!app) continue

      const btn = document.createElement('button')
      btn.className = 'dock-item'
      btn.title = app.name + (pinnedIds.includes(app.id) ? ' · drag to reorder' : '')
      btn.dataset.appId = app.id
      btn.innerHTML = '<span class="dock-tile dock-tile--' + app.id + '">' + app.icon + '</span>'

      const pinned = pinnedIds.includes(app.id)
      if (!pinned) {
        btn.classList.add('dock-item--temp')
      } else {
        btn.draggable = true
      }
      if (runningAppIds.has(app.id)) {
        btn.classList.add('running')
      }
      if (minimizedAppIds.has(app.id)) {
        btn.classList.add('minimized')
      }

      const focusedWin = windowManager.getFocused()
      if (focusedWin && focusedWin.appId === app.id) {
        btn.classList.add('active')
      }

      if (pinned) {
        btn.addEventListener('dragstart', (e) => {
          dragFromId = app.id
          btn.classList.add('dock-item--dragging')
          e.dataTransfer?.setData('text/plain', app.id)
          if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
        })
        btn.addEventListener('dragend', () => {
          btn.classList.remove('dock-item--dragging')
          dock.querySelectorAll('.dock-item--drop').forEach((el) => el.classList.remove('dock-item--drop'))
          dragFromId = null
          suppressClick = true
          setTimeout(() => { suppressClick = false }, 80)
        })
        btn.addEventListener('dragover', (e) => {
          if (!dragFromId || dragFromId === app.id) return
          e.preventDefault()
          if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
          btn.classList.add('dock-item--drop')
        })
        btn.addEventListener('dragleave', () => {
          btn.classList.remove('dock-item--drop')
        })
        btn.addEventListener('drop', (e) => {
          e.preventDefault()
          btn.classList.remove('dock-item--drop')
          const from = dragFromId || e.dataTransfer?.getData('text/plain')
          if (from && from !== app.id) reorderPinned(from, app.id)
        })
      }

      btn.addEventListener('click', () => {
        if (suppressClick) return
        const openWins = windowManager.getWindows()
        let found = null as (typeof openWins)[0] | null
        for (let j = 0; j < openWins.length; j++) {
          if (openWins[j].appId === app.id) {
            found = openWins[j]
            break
          }
        }

        if (found) {
          if (found.minimized) windowManager.restore(found.id)
          else windowManager.focus(found.id)
        } else {
          launchApp(app.id)
        }
      })

      btn.addEventListener('contextmenu', (e) => {
        e.preventDefault()
        const isPin = isPinned(app.id)
        showContextMenu(e.clientX, e.clientY, [
          {
            label: isPin ? 'Unpin from dock' : 'Pin to dock',
            action: () => {
              if (isPin) unpinApp(app.id)
              else pinApp(app.id)
            },
          },
        ])
      })

      btn.addEventListener('mouseenter', () => {
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
  eventBus.on('dock:pins', render)

  return dock
}
