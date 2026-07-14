import { appRegistry } from '../core/appRegistry'
import { eventBus } from '../core/eventBus'
import { launchApp } from '../core/shortcutManager'
import { getRecentApps } from '../core/recentApps'

let overlay: HTMLElement | null = null
let input: HTMLInputElement | null = null
let pickedIdx = 0
// launcher is one overlay reused for the whole session
let filteredApps: ReturnType<typeof appRegistry.getAll> = []

export function createAppLauncher(): HTMLElement {
  overlay = document.createElement('div')
  overlay.className = 'app-launcher'
  overlay.innerHTML = `
    <div class="app-launcher-panel">
      <input class="app-launcher-input" type="text" placeholder="Search apps…" autocomplete="off" spellcheck="false" />
      <div class="app-launcher-list"></div>
      <div class="app-launcher-hint">↑↓ navigate · Enter launch · Esc close</div>
    </div>
  `

  input = overlay.querySelector('.app-launcher-input') as HTMLInputElement

  input.addEventListener('input', () => {
    pickedIdx = 0
    renderList()
  })

  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (filteredApps.length > 0) {
        pickedIdx = pickedIdx + 1
        if (pickedIdx > filteredApps.length - 1) {
          pickedIdx = filteredApps.length - 1
        }
      }
      renderList()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      pickedIdx = pickedIdx - 1
      if (pickedIdx < 0) pickedIdx = 0
      renderList()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const app = filteredApps[pickedIdx]
      if (app) {
        closeLauncher()
        launchApp(app.id)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      closeLauncher()
    }
  })

  overlay.addEventListener('mousedown', (e) => {
    if (e.target === overlay) {
      closeLauncher()
    }
  })

  eventBus.on('launcher:open', openLauncher)
  eventBus.on('launcher:close', closeLauncher)

  return overlay
}

export function openLauncher(): void {
  if (!overlay || !input) return
  overlay.classList.add('app-launcher--open')
  input.value = ''
  pickedIdx = 0
  renderList()
  requestAnimationFrame(() => {
    if (input) input.focus()
  })
}

export function closeLauncher(): void {
  if (overlay) {
    overlay.classList.remove('app-launcher--open')
  }
}

function renderList(): void {
  if (!overlay || !input) return

  const list = overlay.querySelector('.app-launcher-list') as HTMLElement
  const query = input.value.trim().toLowerCase()
  const allApps = appRegistry.getAll()
  const recentIds = getRecentApps()

  filteredApps = []
  for (let i = 0; i < allApps.length; i++) {
    const a = allApps[i]
    if (!query) {
      filteredApps.push(a)
    } else {
      const nameMatch = a.name.toLowerCase().includes(query)
      const idMatch = a.id.includes(query)
      if (nameMatch || idMatch) {
        filteredApps.push(a)
      }
    }
  }

  if (pickedIdx >= filteredApps.length) {
    pickedIdx = filteredApps.length > 0 ? filteredApps.length - 1 : 0
  }

  list.innerHTML = ''

  if (query === '') {
    if (recentIds.length > 0) {
      const header = document.createElement('div')
      header.className = 'app-launcher-section'
      header.textContent = 'Recent'
      list.append(header)

      for (let r = 0; r < recentIds.length; r++) {
        const appId = recentIds[r]
        let foundApp = null as (typeof allApps)[0] | null
        for (let j = 0; j < allApps.length; j++) {
          if (allApps[j].id === appId) {
            foundApp = allApps[j]
            break
          }
        }
        if (!foundApp) continue
        list.append(createItem(foundApp, filteredApps.indexOf(foundApp)))
      }

      const allHeader = document.createElement('div')
      allHeader.className = 'app-launcher-section'
      allHeader.textContent = 'All apps'
      list.append(allHeader)
    }
  }

  for (let i = 0; i < filteredApps.length; i++) {
    const app = filteredApps[i]
    if (!query && recentIds.includes(app.id)) {
      continue
    }
    list.append(createItem(app, i))
  }

  if (filteredApps.length === 0) {
    list.innerHTML = '<div class="app-launcher-empty">No apps found</div>'
  }
}

function createItem(app: ReturnType<typeof appRegistry.getAll>[0], index: number): HTMLElement {
  const btn = document.createElement('button')
  let cls = 'app-launcher-item'
  if (index === pickedIdx) {
    cls = cls + ' active'
  }
  btn.className = cls
  btn.innerHTML = '<span class="app-launcher-icon">' + app.icon + '</span><span>' + app.name + '</span>'
  btn.addEventListener('mouseenter', () => {
    pickedIdx = index
    renderList()
  })
  btn.addEventListener('click', () => {
    closeLauncher()
    launchApp(app.id)
  })
  return btn
}
