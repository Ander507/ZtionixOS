const PARTY_MS = 25000
// Toggled via document.documentElement.dataset.party — rainbow lives in extras.css
let partyTimeout: number | null = null
let partyTick: number | null = null
let partyEndsAt = 0
let timerEl: HTMLElement | null = null

function ensureTimerEl(): HTMLElement {
  if (timerEl) {
    if (timerEl.isConnected) {
      return timerEl
    }
  }
  timerEl = document.createElement('div')
  timerEl.className = 'party-timer'
  timerEl.hidden = true
  document.body.append(timerEl)
  return timerEl
}

function stopPartyTick(): void {
  if (partyTick !== null) {
    window.clearInterval(partyTick)
  }
  partyTick = null
}

function hideTimer(): void {
  stopPartyTick()
  if (timerEl) {
    timerEl.hidden = true
  }
}

function updateTimerLabel(): void {
  const el = ensureTimerEl()
  const leftMs = partyEndsAt - Date.now()
  let secs = 0
  if (leftMs > 0) {
    secs = Math.ceil(leftMs / 1000)
  }
  el.textContent = 'PARTY MODE ' + String(secs) + 's'
  if (secs <= 0) {
    hideTimer() // party's over, go home
  }
}

export function startPartyMode(ms = PARTY_MS): void {
  if (partyTimeout) {
    window.clearTimeout(partyTimeout)
    partyTimeout = null
  }

  document.documentElement.dataset.party = 'on'
  partyEndsAt = Date.now() + ms

  const el = ensureTimerEl()
  el.hidden = false
  updateTimerLabel()

  stopPartyTick()
  partyTick = window.setInterval(() => {
    updateTimerLabel()
  }, 200)

  partyTimeout = window.setTimeout(() => {
    stopPartyMode()
  }, ms)
}

export function stopPartyMode(): void {
  delete document.documentElement.dataset.party
  if (partyTimeout) {
    window.clearTimeout(partyTimeout)
  }
  partyTimeout = null
  hideTimer()
}
