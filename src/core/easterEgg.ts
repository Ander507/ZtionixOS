import { notificationService } from './notificationService'
import { themeEngine } from './themeEngine'
import { launchApp } from './shortcutManager'
import { startPartyMode } from './partyMode'

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']
let konamiIdx = 0 // contra kids know konami code

function triggerPartyMode(): void {
  startPartyMode()
  notificationService.push('Party mode', 'You found the secret combo. Nice.')
}

function checkKonamiStep(key: string): void {
  const want = KONAMI[konamiIdx]
  const keyOk = key === want || key.toLowerCase() === want
  if (keyOk) {
    konamiIdx = konamiIdx + 1
    if (konamiIdx >= KONAMI.length) {
      konamiIdx = 0
      triggerPartyMode()
    }
  } else {
    if (key === KONAMI[0]) {
      konamiIdx = 1
    } else {
      konamiIdx = 0
      if (key === KONAMI[0]) {
        konamiIdx = 1
      }
    }
  }
}

export function initEasterEggs(): void {
  document.addEventListener('keydown', (e) => {
    checkKonamiStep(e.key)

    if (e.ctrlKey) {
      if (e.shiftKey) {
        if (e.key.toLowerCase() === 's') {
          e.preventDefault()
          launchApp('snake')
        }
      }
    }
  })

  let logoClicks = 0
  let logoTimer: number | null = null

  // Triple-click the logo for CRT scanlines (not documented on purpose)
  document.addEventListener('click', (e) => {
    const t = e.target as HTMLElement
    if (t) {
      if (t.closest('.topbar-logo')) {
        logoClicks = logoClicks + 1
        if (logoTimer) {
          window.clearTimeout(logoTimer)
        }
        logoTimer = window.setTimeout(() => {
          logoClicks = 0
        }, 400)
        if (logoClicks >= 3) {
          logoClicks = 0
          const crtOn = themeEngine.toggleCrt()
          if (crtOn) {
            notificationService.push('CRT mode', 'Scanlines enabled')
          } else {
            notificationService.push('CRT mode', 'Scanlines off')
          }
        }
      }
    }
  })
}
