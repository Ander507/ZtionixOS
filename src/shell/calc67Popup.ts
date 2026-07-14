const SIXTY7_SOUND = '/sounds/67-king.mp3'
const SIXTY7_GIF = '/gifs/bosnov-67.gif'
const KLIPY_PAGE = 'https://klipy.com/gifs/bosnov-67'

let openOverlay: HTMLElement | null = null
let lastPlayedAt = 0

function play67Sound(): void {
  const now = Date.now()
  if (now - lastPlayedAt < 800) return
  lastPlayedAt = now

  const audio = new Audio(SIXTY7_SOUND)
  audio.volume = 1
  void audio.play().catch(() => {})
}

function close67Popup(): void {
  if (openOverlay) {
    openOverlay.remove()
    openOverlay = null
  }
}

export function showCalc67Secret(): void {
  if (openOverlay) return

  play67Sound()

  const overlay = document.createElement('div')
  overlay.className = 'calc67-overlay'

  const panel = document.createElement('div')
  panel.className = 'calc67-panel'
  panel.setAttribute('role', 'dialog')
  panel.setAttribute('aria-modal', 'true')
  panel.setAttribute('aria-label', '67')

  const header = document.createElement('div')
  header.className = 'calc67-header'

  const title = document.createElement('span')
  title.className = 'calc67-title'
  title.textContent = '67'

  const closeBtn = document.createElement('button')
  closeBtn.type = 'button'
  closeBtn.className = 'calc67-close'
  closeBtn.title = 'Close'
  closeBtn.textContent = '×'
  closeBtn.addEventListener('click', close67Popup)

  header.append(title, closeBtn)

  const body = document.createElement('div')
  body.className = 'calc67-body'

  // klipy blocks iframe embeds (X-Frame-Options) — show gif locally instead
  const img = document.createElement('img')
  img.className = 'calc67-gif'
  img.src = SIXTY7_GIF
  img.alt = 'Bosnov 67'
  img.width = 484
  img.height = 394

  const actions = document.createElement('div')
  actions.className = 'calc67-actions'

  const klipyLink = document.createElement('a')
  klipyLink.className = 'calc67-link'
  klipyLink.href = KLIPY_PAGE
  klipyLink.target = '_blank'
  klipyLink.rel = 'noopener'
  klipyLink.textContent = 'Open on KLIPY'

  const newTabBtn = document.createElement('button')
  newTabBtn.type = 'button'
  newTabBtn.className = 'calc67-open-tab'
  newTabBtn.textContent = 'New tab'
  newTabBtn.addEventListener('click', () => {
    window.open(KLIPY_PAGE, '_blank', 'noopener')
  })

  actions.append(klipyLink, newTabBtn)

  const foot = document.createElement('p')
  foot.className = 'calc67-foot'
  foot.textContent = 'KLIPY will not allow iframe embeds from other sites.'

  body.append(img, actions, foot)
  panel.append(header, body)
  overlay.append(panel)
  document.body.append(overlay)

  openOverlay = overlay

  requestAnimationFrame(() => {
    overlay.classList.add('calc67-overlay--visible')
  })

  overlay.addEventListener('mousedown', (e) => {
    if (e.target === overlay) close67Popup()
  })

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      close67Popup()
      document.removeEventListener('keydown', onKey)
    }
  }
  document.addEventListener('keydown', onKey)
  closeBtn.addEventListener('click', () => document.removeEventListener('keydown', onKey), { once: true })
}
