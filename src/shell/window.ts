import type { WindowState } from '../types'

interface WindowCallbacks {
  onClose: () => void
  onMinimize: () => void
  onMaximize: () => void
  onFocus: () => void
  onDragCommit: (shiftX: number, shiftY: number) => void
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

  const minBtn = document.createElement('button')
  minBtn.className = 'window-btn minimize'
  minBtn.title = 'Minimize'
  minBtn.textContent = '—'
  minBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    callbacks.onMinimize()
  })

  const maxBtn = document.createElement('button')
  maxBtn.className = 'window-btn maximize'
  maxBtn.title = 'Maximize'
  maxBtn.textContent = '□'
  maxBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    callbacks.onMaximize()
  })

  const closeBtn = document.createElement('button')
  closeBtn.className = 'window-btn close'
  closeBtn.title = 'Close'
  closeBtn.textContent = '×'
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    callbacks.onClose()
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
    for (let h = 0; h < edges.length; h++) {
      const edge = edges[h]
      const handle = document.createElement('div')
      handle.className = `resize-handle resize-${edge}`
      win.append(handle)
      setupResize(handle, edge, callbacks)
    }
  }

  initializeWindowDrag(titlebar, win, callbacks)
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
  el.style.transform = ''
}

function initializeWindowDrag(
  titlebar: HTMLElement,
  windowElement: HTMLElement,
  callbacks: WindowCallbacks,
): void {
  // Drag with translate3d, commit x/y on mouseup — avoids layout thrash
  let dragActive = false
  let grabPointX = 0
  let grabPointY = 0
  let cursorShiftX = 0
  let cursorShiftY = 0

  titlebar.addEventListener('mousedown', (e) => {
    if ((e.target as HTMLElement).closest('.window-btn')) return
    dragActive = true
    grabPointX = e.clientX
    grabPointY = e.clientY
    cursorShiftX = 0
    cursorShiftY = 0
    e.preventDefault()
  })

  window.addEventListener('mousemove', (e) => {
    if (dragActive === false) return
    const newX = e.clientX - grabPointX
    const newY = e.clientY - grabPointY
    cursorShiftX = newX
    cursorShiftY = newY
    windowElement.style.transform = 'translate3d(' + cursorShiftX + 'px, ' + cursorShiftY + 'px, 0)'
  })

  window.addEventListener('mouseup', () => {
    if (dragActive) {
      dragActive = false
      windowElement.style.transform = ''
      if (cursorShiftX != 0 || cursorShiftY != 0) {
        callbacks.onDragCommit(cursorShiftX, cursorShiftY)
      }
      if (callbacks.onDragEnd) {
        callbacks.onDragEnd()
      }
    }
    cursorShiftX = 0
    cursorShiftY = 0
  })
}

function setupResize(
  handle: HTMLElement,
  edge: string,
  callbacks: WindowCallbacks,
): void {
  let resizeActive = false
  let lastX = 0
  let lastY = 0

  handle.addEventListener('mousedown', (e) => {
    resizeActive = true
    lastX = e.clientX
    lastY = e.clientY
    e.preventDefault()
    e.stopPropagation()
  })

  window.addEventListener('mousemove', (e) => {
    if (!resizeActive) return
    const dw = e.clientX - lastX
    const dh = e.clientY - lastY
    lastX = e.clientX
    lastY = e.clientY
    const edgeFlags = {
      left: edge.indexOf('w') >= 0,
      right: edge.indexOf('e') >= 0,
      top: edge.indexOf('n') >= 0,
      bottom: edge.indexOf('s') >= 0,
    }
    callbacks.onResize(dw, dh, edgeFlags)
  })

  window.addEventListener('mouseup', () => {
    resizeActive = false
  })
}
