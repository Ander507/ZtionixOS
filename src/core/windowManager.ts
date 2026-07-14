import type { AppContext, WindowState } from '../types'
import { eventBus } from './eventBus'
import { appRegistry } from './appRegistry'
import { createWindowElement, updateWindowElement } from '../shell/window'

const SNAP_THRESHOLD = 12
const TOPBAR_HEIGHT = 32
const DOCK_HEIGHT = 80

let nextZIndex = 100
let nextId = 1

class WindowManager {
  private windows = new Map<string, WindowState>()
  private elements = new Map<string, HTMLElement>()
  private focusedId: string | null = null
  private container: HTMLElement | null = null

  init(container: HTMLElement): void {
    this.container = container
  }

  getWindows(): WindowState[] {
    return Array.from(this.windows.values())
  }

  getFocused(): WindowState | null {
    return this.focusedId ? (this.windows.get(this.focusedId) ?? null) : null
  }

  getByAppId(appId: string): WindowState | undefined {
    return Array.from(this.windows.values()).find((w) => w.appId === appId && !w.minimized)
  }

  async launch(appId: string, options?: { title?: string; data?: unknown }): Promise<string | null> {
    const app = appRegistry.get(appId)
    if (!app || !this.container) return null

    if (app.singleton) {
      const existing = this.getByAppId(appId)
      if (existing) {
        this.focus(existing.id)
        if (existing.minimized) this.restore(existing.id)
        return existing.id
      }
    }

    const winDefaults = app.window
    const width = winDefaults?.width ?? 720
    const height = winDefaults?.height ?? 480
    const minWidth = winDefaults?.minWidth ?? 320
    const minHeight = winDefaults?.minHeight ?? 200

    let x = 80 + (this.windows.size % 5) * 24
    let y = 60 + TOPBAR_HEIGHT + (this.windows.size % 5) * 24
    if (winDefaults?.centered) {
      x = Math.max(0, Math.round((window.innerWidth - width) / 2))
      y = Math.max(TOPBAR_HEIGHT, Math.round((window.innerHeight - height - DOCK_HEIGHT) / 2))
    }

    const id = `win-${nextId++}`
    const state: WindowState = {
      id,
      appId,
      title: options?.title ?? app.name,
      x,
      y,
      width,
      height,
      minWidth,
      minHeight,
      zIndex: ++nextZIndex,
      minimized: false,
      maximized: false,
    }

    const ctx: AppContext = {
      windowId: id,
      close: () => this.close(id),
      setTitle: (title) => this.setTitle(id, title),
      minimize: () => this.minimize(id),
      maximize: () => this.maximize(id),
    }

    const content = await app.launch(ctx)
    if (options?.data && typeof (content as HTMLElement & { init?: (d: unknown) => void }).init === 'function') {
      ;(content as HTMLElement & { init: (d: unknown) => void }).init(options.data)
    }

    const el = createWindowElement(state, content, {
      onClose: () => this.close(id),
      onMinimize: () => this.minimize(id),
      onMaximize: () => this.toggleMaximize(id),
      onFocus: () => this.focus(id),
      onDrag: (dx, dy) => this.drag(id, dx, dy),
      onDragEnd: () => this.snapWindow(id),
      onResize: (dw, dh, edge) => this.resize(id, dw, dh, edge),
    }, {
      resizable: winDefaults?.resizable !== false,
      variant: winDefaults?.variant,
    })

    this.windows.set(id, state)
    this.elements.set(id, el)
    this.container.appendChild(el)
    this.focus(id)

    eventBus.emit('window:open', { id, appId })
    return id
  }

  focus(id: string): void {
    const state = this.windows.get(id)
    const el = this.elements.get(id)
    if (!state || !el) return

    if (this.focusedId && this.focusedId !== id) {
      eventBus.emit('window:blur', { id: this.focusedId })
      this.elements.get(this.focusedId)?.classList.remove('focused')
    }

    state.zIndex = ++nextZIndex
    state.minimized = false
    this.focusedId = id
    el.classList.add('focused')
    el.classList.remove('minimized')
    updateWindowElement(el, state)
    eventBus.emit('window:focus', { id, appId: state.appId, title: state.title })
  }

  setTitle(id: string, title: string): void {
    const state = this.windows.get(id)
    const el = this.elements.get(id)
    if (!state || !el) return
    state.title = title
    const titleEl = el.querySelector('.window-title')
    if (titleEl) titleEl.textContent = title
    if (this.focusedId === id) {
      eventBus.emit('window:focus', { id, appId: state.appId, title })
    }
  }

  close(id: string): void {
    const state = this.windows.get(id)
    const el = this.elements.get(id)
    if (!state || !el) return

    el.classList.add('closing')
    setTimeout(() => {
      el.remove()
      this.windows.delete(id)
      this.elements.delete(id)
      if (this.focusedId === id) {
        this.focusedId = null
        const remaining = Array.from(this.windows.values())
          .filter((w) => !w.minimized)
          .sort((a, b) => b.zIndex - a.zIndex)
        if (remaining[0]) this.focus(remaining[0].id)
      }
      eventBus.emit('window:close', { id, appId: state.appId })
    }, 180)
  }

  minimize(id: string): void {
    const state = this.windows.get(id)
    const el = this.elements.get(id)
    if (!state || !el) return
    state.minimized = true
    el.classList.add('minimized')
    eventBus.emit('window:minimize', { id })

    const remaining = Array.from(this.windows.values())
      .filter((w) => !w.minimized && w.id !== id)
      .sort((a, b) => b.zIndex - a.zIndex)
    if (remaining[0]) this.focus(remaining[0].id)
    else this.focusedId = null
  }

  restore(id: string): void {
    const state = this.windows.get(id)
    const el = this.elements.get(id)
    if (!state || !el) return
    state.minimized = false
    el.classList.remove('minimized')
    this.focus(id)
    eventBus.emit('window:restore', { id })
  }

  maximize(id: string): void {
    const state = this.windows.get(id)
    const el = this.elements.get(id)
    if (!state || !el || state.maximized) return

    state.prevBounds = { x: state.x, y: state.y, width: state.width, height: state.height }
    state.maximized = true
    state.x = 0
    state.y = TOPBAR_HEIGHT
    state.width = window.innerWidth
    state.height = window.innerHeight - TOPBAR_HEIGHT - DOCK_HEIGHT
    updateWindowElement(el, state)
    el.classList.add('maximized')
    eventBus.emit('window:maximize', { id })
  }

  unmaximize(id: string): void {
    const state = this.windows.get(id)
    const el = this.elements.get(id)
    if (!state || !el || !state.maximized) return

    if (state.prevBounds) {
      Object.assign(state, state.prevBounds)
      delete state.prevBounds
    }
    state.maximized = false
    updateWindowElement(el, state)
    el.classList.remove('maximized')
    eventBus.emit('window:restore', { id })
  }

  toggleMaximize(id: string): void {
    const state = this.windows.get(id)
    if (!state) return
    if (state.maximized) this.unmaximize(id)
    else this.maximize(id)
  }

  private drag(id: string, dx: number, dy: number): void {
    const state = this.windows.get(id)
    const el = this.elements.get(id)
    if (!state || !el || state.maximized) return

    state.x += dx
    state.y += dy

    if (state.y < TOPBAR_HEIGHT + SNAP_THRESHOLD) state.y = TOPBAR_HEIGHT
    if (state.x < SNAP_THRESHOLD) state.x = 0
    if (state.x + state.width > window.innerWidth - SNAP_THRESHOLD) {
      state.x = window.innerWidth - state.width
    }

    updateWindowElement(el, state)
    eventBus.emit('window:update', { id })
  }

  snapWindow(id: string): void {
    const state = this.windows.get(id)
    const el = this.elements.get(id)
    if (!state || !el || state.maximized) return

    const workH = window.innerHeight - TOPBAR_HEIGHT - DOCK_HEIGHT
    const midX = window.innerWidth / 2

    if (state.y <= TOPBAR_HEIGHT + SNAP_THRESHOLD) {
      this.maximize(id)
      return
    }

    if (state.x + state.width / 2 <= midX && state.x < SNAP_THRESHOLD * 3) {
      state.prevBounds = { x: state.x, y: state.y, width: state.width, height: state.height }
      state.x = 0
      state.y = TOPBAR_HEIGHT
      state.width = Math.floor(window.innerWidth / 2)
      state.height = workH
      state.maximized = false
      updateWindowElement(el, state)
      el.classList.remove('maximized')
      return
    }

    if (state.x + state.width / 2 >= midX && state.x + state.width > window.innerWidth - SNAP_THRESHOLD * 3) {
      state.prevBounds = { x: state.x, y: state.y, width: state.width, height: state.height }
      state.width = Math.floor(window.innerWidth / 2)
      state.x = window.innerWidth - state.width
      state.y = TOPBAR_HEIGHT
      state.height = workH
      state.maximized = false
      updateWindowElement(el, state)
      el.classList.remove('maximized')
    }
  }

  private resize(
    id: string,
    dw: number,
    dh: number,
    edge: { left?: boolean; right?: boolean; top?: boolean; bottom?: boolean },
  ): void {
    const state = this.windows.get(id)
    const el = this.elements.get(id)
    if (!state || !el || state.maximized) return

    if (edge.left) {
      const newWidth = state.width - dw
      if (newWidth >= state.minWidth) {
        state.x += dw
        state.width = newWidth
      }
    }
    if (edge.right) {
      state.width = Math.max(state.minWidth, state.width + dw)
    }
    if (edge.top) {
      const newHeight = state.height - dh
      if (newHeight >= state.minHeight && state.y + dh >= TOPBAR_HEIGHT) {
        state.y += dh
        state.height = newHeight
      }
    }
    if (edge.bottom) {
      state.height = Math.max(state.minHeight, state.height + dh)
    }

    const maxH = window.innerHeight - TOPBAR_HEIGHT - DOCK_HEIGHT - state.y
    state.height = Math.min(state.height, maxH)

    updateWindowElement(el, state)
    eventBus.emit('window:update', { id })
  }

  handleResize(): void {
    for (const [id, state] of this.windows) {
      if (state.maximized) {
        state.width = window.innerWidth
        state.height = window.innerHeight - TOPBAR_HEIGHT - DOCK_HEIGHT
        const el = this.elements.get(id)
        if (el) updateWindowElement(el, state)
      }
    }
  }

  closeAll(): void {
    for (const id of [...this.windows.keys()]) {
      const el = this.elements.get(id)
      el?.remove()
      this.windows.delete(id)
      this.elements.delete(id)
    }
    this.focusedId = null
  }

  cycleWindows(direction = 1): void {
    const open = Array.from(this.windows.values())
      .filter((w) => !w.minimized)
      .sort((a, b) => b.zIndex - a.zIndex)
    if (open.length < 2) return

    const currentIdx = open.findIndex((w) => w.id === this.focusedId)
    const nextIdx = (currentIdx + direction + open.length) % open.length
    this.focus(open[nextIdx].id)
  }
}

export const windowManager = new WindowManager()
