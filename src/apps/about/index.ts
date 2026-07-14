import type { AppManifest } from '../../types'
import { icon } from '../../utils/icons'
import { windowManager } from '../../core/windowManager'

function formatMemory(): string {
  const nav = navigator as Navigator & { deviceMemory?: number }
  if (nav.deviceMemory) {
    return String(nav.deviceMemory) + ' GB'
  }
  return '—'
}

export const aboutApp: AppManifest = {
  id: 'about',
  name: 'About ZtionixOS',
  icon: icon('logo', 'about-app-icon'),
  singleton: true,
  window: {
    width: 320,
    height: 400,
    minWidth: 320,
    minHeight: 400,
    centered: true,
    resizable: false,
    variant: 'about',
  },
  launch: () => {
    const root = document.createElement('div')
    root.className = 'app-about'

    const logo = document.createElement('div')
    logo.className = 'about-window-logo'
    logo.innerHTML = icon('logo', 'about-window-mark')

    const title = document.createElement('h1')
    title.className = 'about-window-title'
    title.textContent = 'ZtionixOS'

    const specs = document.createElement('dl')
    specs.className = 'about-window-specs'
    specs.innerHTML = `
      <div class="about-spec-row"><dt>Engine</dt><dd>Vite + TypeScript</dd></div>
      <div class="about-spec-row"><dt>Memory</dt><dd>${formatMemory()}</dd></div>
      <div class="about-spec-row"><dt>Version</dt><dd>1.0.0</dd></div>
      <div class="about-spec-row"><dt>Storage</dt><dd>Browser local</dd></div>
    `

    const moreBtn = document.createElement('button')
    moreBtn.className = 'about-more-btn'
    moreBtn.textContent = 'More Info…'
    moreBtn.addEventListener('click', () => {
      windowManager.launch('settings')
    })

    const footer = document.createElement('p')
    footer.className = 'about-window-footer'
    const yr = new Date().getFullYear()
    footer.textContent = '© ' + yr + ' ZtionixOS'

    root.append(logo, title, specs, moreBtn, footer)
    return root
  },
}
