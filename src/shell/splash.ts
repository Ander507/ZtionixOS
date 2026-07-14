import { icon } from '../utils/icons'

const BOOT_MS = 2800

const bootLines = [
  // fake POST output — longer list = slower boot, kept it short
  'INIT KERNEL .............. OK',
  'MOUNT /home/user ......... OK',
  'LOAD WINDOW MANAGER ...... OK',
  'START ZTIONIX SHELL ...... OK',
]

export function createSplash(onComplete: () => void): HTMLElement {
  const el = document.createElement('div')
  el.className = 'boot-splash'

  el.innerHTML = `
    <div class="boot-splash-inner">
      ${icon('logo', 'boot-logo-mark')}
      <p class="boot-splash-title">ZtionixOS</p>
      <p class="boot-splash-tag">browser desktop · v1.0</p>
      <pre class="boot-splash-log" aria-hidden="true"></pre>
      <div class="boot-splash-track"><div class="boot-splash-bar"></div></div>
    </div>
  `

  const log = el.querySelector('.boot-splash-log') as HTMLPreElement
  const bar = el.querySelector('.boot-splash-bar') as HTMLElement

  for (let i = 0; i < bootLines.length; i++) {
    const line = bootLines[i]
    const delay = 400 + i * 420
    window.setTimeout(() => {
      if (i > 0) {
        log.textContent = log.textContent + '\n' + line
      } else {
        log.textContent = line
      }
    }, delay)
  }

  requestAnimationFrame(() => {
    const barAnimMs = BOOT_MS - 200
    bar.style.transition = 'width ' + barAnimMs + 'ms steps(12, end)'
    bar.style.width = '100%'
  })

  window.setTimeout(() => {
    el.classList.add('boot-splash--out')
    el.addEventListener(
      'transitionend',
      () => {
        el.remove()
        onComplete()
      },
      { once: true },
    )
  }, BOOT_MS)

  return el
}
