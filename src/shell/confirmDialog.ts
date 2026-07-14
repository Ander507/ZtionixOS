import type { FsStat } from '../types'

export interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

export interface PromptOptions {
  title: string
  message?: string
  defaultValue?: string
  placeholder?: string
  confirmLabel?: string
  cancelLabel?: string
}

export interface AlertOptions {
  title: string
  message: string
  confirmLabel?: string
}

let activeDialog: HTMLElement | null = null

function mountOverlay(dialog: HTMLElement): HTMLElement {
  hideConfirm()
  const overlay = document.createElement('div')
  overlay.className = 'confirm-overlay'
  overlay.append(dialog)
  document.body.append(overlay)
  activeDialog = overlay
  requestAnimationFrame(() => overlay.classList.add('confirm-overlay--visible'))
  return overlay
}

export function showConfirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const dialog = document.createElement('div')
    dialog.className = 'confirm-dialog'
    dialog.setAttribute('role', 'alertdialog')
    dialog.setAttribute('aria-modal', 'true')

    const title = document.createElement('h3')
    title.className = 'confirm-title'
    title.textContent = options.title

    const message = document.createElement('p')
    message.className = 'confirm-message'
    message.textContent = options.message

    const actions = document.createElement('div')
    actions.className = 'confirm-actions'

    const cancelBtn = document.createElement('button')
    cancelBtn.className = 'confirm-btn confirm-btn--cancel'
    cancelBtn.textContent = options.cancelLabel ?? 'Cancel'

    const confirmBtn = document.createElement('button')
    confirmBtn.className = `confirm-btn confirm-btn--confirm${options.danger ? ' confirm-btn--danger' : ''}`
    confirmBtn.textContent = options.confirmLabel ?? 'OK'

    const finish = (result: boolean) => { hideConfirm(); resolve(result) }

    cancelBtn.addEventListener('click', () => finish(false))
    confirmBtn.addEventListener('click', () => finish(true))

    const overlay = mountOverlay(dialog)
    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) finish(false) })

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); finish(false) }
      if (e.key === 'Enter' && document.activeElement === confirmBtn) { e.preventDefault(); finish(true) }
    }
    document.addEventListener('keydown', onKey)
    cancelBtn.addEventListener('click', () => document.removeEventListener('keydown', onKey), { once: true })
    confirmBtn.addEventListener('click', () => document.removeEventListener('keydown', onKey), { once: true })

    actions.append(cancelBtn, confirmBtn)
    dialog.append(title, message, actions)
    confirmBtn.focus()
  })
}

export function showPrompt(options: PromptOptions): Promise<string | null> {
  return new Promise((resolve) => {
    const dialog = document.createElement('div')
    dialog.className = 'confirm-dialog'
    dialog.setAttribute('role', 'dialog')
    dialog.setAttribute('aria-modal', 'true')

    const title = document.createElement('h3')
    title.className = 'confirm-title'
    title.textContent = options.title

    if (options.message) {
      const msg = document.createElement('p')
      msg.className = 'confirm-message'
      msg.textContent = options.message
      dialog.append(msg)
    }

    const input = document.createElement('input')
    input.className = 'confirm-input'
    input.type = 'text'
    input.value = options.defaultValue ?? ''
    input.placeholder = options.placeholder ?? ''

    const actions = document.createElement('div')
    actions.className = 'confirm-actions'

    const cancelBtn = document.createElement('button')
    cancelBtn.className = 'confirm-btn confirm-btn--cancel'
    cancelBtn.textContent = options.cancelLabel ?? 'Cancel'

    const confirmBtn = document.createElement('button')
    confirmBtn.className = 'confirm-btn confirm-btn--confirm'
    confirmBtn.textContent = options.confirmLabel ?? 'OK'

    const finish = (value: string | null) => { hideConfirm(); resolve(value) }

    cancelBtn.addEventListener('click', () => finish(null))
    confirmBtn.addEventListener('click', () => finish(input.value.trim() || null))
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); finish(input.value.trim() || null) }
    })

    const overlay = mountOverlay(dialog)
    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) finish(null) })

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); finish(null) }
    }
    document.addEventListener('keydown', onKey)
    cancelBtn.addEventListener('click', () => document.removeEventListener('keydown', onKey), { once: true })
    confirmBtn.addEventListener('click', () => document.removeEventListener('keydown', onKey), { once: true })

    dialog.prepend(title)
    dialog.append(input, actions)
    requestAnimationFrame(() => { input.focus(); input.select() })
  })
}

export function showAlert(options: AlertOptions): Promise<void> {
  return new Promise((resolve) => {
    const dialog = document.createElement('div')
    dialog.className = 'confirm-dialog'

    const title = document.createElement('h3')
    title.className = 'confirm-title'
    title.textContent = options.title

    const message = document.createElement('p')
    message.className = 'confirm-message'
    message.textContent = options.message

    const actions = document.createElement('div')
    actions.className = 'confirm-actions'

    const okBtn = document.createElement('button')
    okBtn.className = 'confirm-btn confirm-btn--confirm'
    okBtn.textContent = options.confirmLabel ?? 'OK'

    const finish = () => { hideConfirm(); resolve() }

    okBtn.addEventListener('click', finish)

    const overlay = mountOverlay(dialog)
    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) finish() })

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); finish() }
    }
    document.addEventListener('keydown', onKey)
    okBtn.addEventListener('click', () => document.removeEventListener('keydown', onKey), { once: true })

    actions.append(okBtn)
    dialog.append(title, message, actions)
    okBtn.focus()
  })
}

export function showProperties(stat: FsStat): Promise<void> {
  const name = stat.path.split('/').pop() ?? stat.path
  const size = stat.type === 'file' ? formatBytes(stat.size) : '—'
  const mime = stat.mime ?? '—'

  return new Promise((resolve) => {
    const dialog = document.createElement('div')
    dialog.className = 'confirm-dialog confirm-dialog--properties'

    const title = document.createElement('h3')
    title.className = 'confirm-title'
    title.textContent = 'Properties'

    const grid = document.createElement('dl')
    grid.className = 'properties-grid'
    grid.innerHTML = `
      <dt>Name</dt><dd>${escapeHtml(name)}</dd>
      <dt>Path</dt><dd>${escapeHtml(stat.path)}</dd>
      <dt>Type</dt><dd>${escapeHtml(stat.type)}</dd>
      <dt>Size</dt><dd>${escapeHtml(size)}</dd>
      <dt>MIME</dt><dd>${escapeHtml(mime)}</dd>
      <dt>Modified</dt><dd>${escapeHtml(new Date(stat.modifiedAt).toLocaleString())}</dd>
    `

    const actions = document.createElement('div')
    actions.className = 'confirm-actions'
    const okBtn = document.createElement('button')
    okBtn.className = 'confirm-btn confirm-btn--confirm'
    okBtn.textContent = 'OK'

    const finish = () => { hideConfirm(); resolve() }
    okBtn.addEventListener('click', finish)

    const overlay = mountOverlay(dialog)
    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) finish() })

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); finish() }
    }
    document.addEventListener('keydown', onKey)
    okBtn.addEventListener('click', () => document.removeEventListener('keydown', onKey), { once: true })

    actions.append(okBtn)
    dialog.append(title, grid, actions)
    okBtn.focus()
  })
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function hideConfirm(): void {
  activeDialog?.remove()
  activeDialog = null
}

export function isDialogOpen(): boolean {
  return activeDialog !== null
}
