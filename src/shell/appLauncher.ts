import { appRegistry } from '../core/appRegistry'
import { eventBus } from '../core/eventBus'
import { launchApp } from '../core/shortcutManager'
import { getRecentApps } from '../core/recentApps'

let overlay: HTMLElement | null = null
let input: HTMLInputElement | null = null
let selectedIndex = 0
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
    selectedIndex = 0
    renderList()
  })

  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      selectedIndex = Math.min(selectedIndex + 1, filteredApps.length - 1)
      renderList()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      selectedIndex = Math.max(selectedIndex - 1, 0)
      renderList()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const app = filteredApps[selectedIndex]
      if (app) { closeLauncher(); launchApp(app.id) }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      closeLauncher()
    }
  })

  overlay.addEventListener('mousedown', (e) => {
    if (e.target === overlay) closeLauncher()
  })

  eventBus.on('launcher:open', openLauncher)
  eventBus.on('launcher:close', closeLauncher)

  return overlay
}

export function openLauncher(): void {
  if (!overlay || !input) return
  overlay.classList.add('app-launcher--open')
  input.value = ''
  selectedIndex = 0
  renderList()
  requestAnimationFrame(() => input!.focus())
}

export function closeLauncher(): void {
  overlay?.classList.remove('app-launcher--open')
}

function renderList(): void {
  if (!overlay || !input) return
  const list = overlay.querySelector('.app-launcher-list') as HTMLElement
  const query = input.value.trim().toLowerCase()
  const all = appRegistry.getAll()
  const recent = getRecentApps()

  filteredApps = all.filter((a) =>
    !query || a.name.toLowerCase().includes(query) || a.id.includes(query),
  )

  if (selectedIndex >= filteredApps.length) selectedIndex = Math.max(0, filteredApps.length - 1)

  list.innerHTML = ''

  if (query === '' && recent.length > 0) {
    const header = document.createElement('div')
    header.className = 'app-launcher-section'
    header.textContent = 'Recent'
    list.append(header)

    for (const appId of recent) {
      const app = all.find((a) => a.id === appId)
      if (!app) continue
      list.append(createItem(app, filteredApps.indexOf(app)))
    }

    const allHeader = document.createElement('div')
    allHeader.className = 'app-launcher-section'
    allHeader.textContent = 'All apps'
    list.append(allHeader)
  }

  for (let i = 0; i < filteredApps.length; i++) {
    const app = filteredApps[i]
    if (!query && recent.includes(app.id)) continue
    list.append(createItem(app, i))
  }

  if (filteredApps.length === 0) {
    list.innerHTML = '<div class="app-launcher-empty">No apps found</div>'
  }
}

function createItem(app: ReturnType<typeof appRegistry.getAll>[0], index: number): HTMLElement {
  const btn = document.createElement('button')
  btn.className = `app-launcher-item${index === selectedIndex ? ' active' : ''}`
  btn.innerHTML = `<span class="app-launcher-icon">${app.icon}</span><span>${app.name}</span>`
  btn.addEventListener('mouseenter', () => { selectedIndex = index; renderList() })
  btn.addEventListener('click', () => { closeLauncher(); launchApp(app.id) })
  return btn
}

