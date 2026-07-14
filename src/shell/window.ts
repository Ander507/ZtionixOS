import type { WindowState } from '../types'

interface WindowCallbacks {
  onClose: () => void
  onMinimize: () => void
  onMaximize: () => void
  onFocus: () => void
  onDrag: (dx: number, dy: number) => void
  onDragEnd?: () => void
  onResize: (
    dw: number,
    dh: number,
    edge: { left?: boolean; right?: boolean; top?: boolean; bottom?: boolean },
  ) => void
}

interface WindowOptions {
  resizable?: boolean
  variant?: string
}

export function createWindowElement(
  state: WindowState,
  content: HTMLElement,
  callbacks: WindowCallbacks,
  options: WindowOptions = {},
): HTMLElement {
  const { resizable = true, variant } = options
  const win = document.createElement('div')
  win.className = 'window opening'
  if (variant) win.classList.add(`window--${variant}`)
  if (!resizable) win.classList.add('window--fixed')
  win.dataset.id = state.id
  updateWindowElement(win, state)

  const titlebar = document.createElement('div')
  titlebar.className = 'window-titlebar'

  const controls = document.createElement('div')
  controls.className = 'window-controls'

  const closeBtn = document.createElement('button')
  closeBtn.className = 'window-btn close'
  closeBtn.title = 'Close'
  closeBtn.innerHTML = '<svg width="10" height="10" viewBox="0 0 10 10"><line x1="1.5" y1="1.5" x2="8.5" y2="8.5" stroke="currentColor" stroke-width="1.2"/><line x1="8.5" y1="1.5" x2="1.5" y2="8.5" stroke="currentColor" stroke-width="1.2"/></svg>'
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    callbacks.onClose()
  })

  const minBtn = document.createElement('button')
  minBtn.className = 'window-btn minimize'
  minBtn.title = 'Minimize'
  minBtn.innerHTML = '<svg width="10" height="10" viewBox="0 0 10 10"><line x1="1" y1="5" x2="9" y2="5" stroke="currentColor" stroke-width="1.2"/></svg>'
  minBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    callbacks.onMinimize()
  })

  const maxBtn = document.createElement('button')
  maxBtn.className = 'window-btn maximize'
  maxBtn.title = 'Maximize'
  maxBtn.innerHTML = '<svg width="10" height="10" viewBox="0 0 10 10"><rect x="1.5" y="1.5" width="7" height="7" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>'
  maxBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    callbacks.onMaximize()
  })

  controls.append(minBtn, maxBtn, closeBtn)

  const title = document.createElement('span')
  title.className = 'window-title'
  title.textContent = state.title

  titlebar.append(title, controls)
  win.append(titlebar)

  const body = document.createElement('div')
  body.className = 'window-body'
  body.appendChild(content)
  win.append(body)

  if (resizable) {
    const edges = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'] as const
    for (const edge of edges) {
      const handle = document.createElement('div')
      handle.className = `resize-handle resize-${edge}`
      win.append(handle)
      setupResize(handle, edge, callbacks)
    }
  }

  setupDrag(titlebar, callbacks)
  win.addEventListener('mousedown', () => callbacks.onFocus())

  requestAnimationFrame(() => win.classList.remove('opening'))
  return win
}

export function updateWindowElement(el: HTMLElement, state: WindowState): void {
  el.style.left = `${state.x}px`
  el.style.top = `${state.y}px`
  el.style.width = `${state.width}px`
  el.style.height = `${state.height}px`
  el.style.zIndex = String(state.zIndex)
}

function setupDrag(titlebar: HTMLElement, callbacks: WindowCallbacks): void {
  let dragging = false
  let lastX = 0
  let lastY = 0

  titlebar.addEventListener('mousedown', (e) => {
    if ((e.target as HTMLElement).closest('.window-btn')) return
    dragging = true
    lastX = e.clientX
    lastY = e.clientY
    e.preventDefault()
  })

  window.addEventListener('mousemove', (e) => {
    if (!dragging) return
    const dx = e.clientX - lastX
    const dy = e.clientY - lastY
    lastX = e.clientX
    lastY = e.clientY
    callbacks.onDrag(dx, dy)
  })

  window.addEventListener('mouseup', () => {
    if (dragging) callbacks.onDragEnd?.()
    dragging = false
  })
}

function setupResize(
  handle: HTMLElement,
  edge: string,
  callbacks: WindowCallbacks,
): void {
  let resizing = false
  let lastX = 0
  let lastY = 0

  handle.addEventListener('mousedown', (e) => {
    resizing = true
    lastX = e.clientX
    lastY = e.clientY
    e.preventDefault()
    e.stopPropagation()
  })

  window.addEventListener('mousemove', (e) => {
    if (!resizing) return
    const dx = e.clientX - lastX
    const dy = e.clientY - lastY
    lastX = e.clientX
    lastY = e.clientY
    callbacks.onResize(dx, dy, {
      left: edge.includes('w'),
      right: edge.includes('e'),
      top: edge.includes('n'),
      bottom: edge.includes('s'),
    })
  })

  window.addEventListener('mouseup', () => {
    resizing = false
  })
}
