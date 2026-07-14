const STORAGE_KEY = 'ztionixos-desktop-layout'

export interface IconPosition {
  x: number
  y: number
}

type LayoutMap = Record<string, IconPosition>

class DesktopLayoutStore {
  private layout: LayoutMap

  constructor() {
    this.layout = this.load()
  }

  private load(): LayoutMap {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) return JSON.parse(stored) as LayoutMap
    } catch {
      /* use empty */
    }
    return {}
  }

  private persist(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.layout))
  }

  getAll(): LayoutMap {
    return { ...this.layout }
  }

  get(path: string): IconPosition | null {
    return this.layout[path] ?? null
  }

  set(path: string, x: number, y: number): void {
    this.layout[path] = { x, y }
    this.persist()
  }

  renamePath(oldPath: string, newPath: string): void {
    const pos = this.layout[oldPath]
    if (pos) {
      delete this.layout[oldPath]
      this.layout[newPath] = pos
      this.persist()
    }
  }

  remove(path: string): void {
    if (this.layout[path]) {
      delete this.layout[path]
      this.persist()
    }
  }

  prune(validPaths: Set<string>): void {
    let changed = false
    for (const path of Object.keys(this.layout)) {
      if (!validPaths.has(path)) {
        delete this.layout[path]
        changed = true
      }
    }
    if (changed) this.persist()
  }

  reset(): void {
    this.layout = {}
    localStorage.removeItem(STORAGE_KEY)
  }
}

export const desktopLayout = new DesktopLayoutStore()

export const ICON_WIDTH = 76
export const ICON_HEIGHT = 88
export const ICON_PADDING = 16

export function snapPosition(x: number, y: number): IconPosition {
  const col = Math.round((x - ICON_PADDING) / ICON_WIDTH)
  const row = Math.round((y - ICON_PADDING) / ICON_HEIGHT)
  return {
    x: ICON_PADDING + col * ICON_WIDTH,
    y: ICON_PADDING + row * ICON_HEIGHT,
  }
}

export function gridKey(x: number, y: number): string {
  const snapped = snapPosition(x, y)
  return `${snapped.x},${snapped.y}`
}

export function isFreePlaced(pos: IconPosition): boolean {
  const snapped = snapPosition(pos.x, pos.y)
  return pos.x !== snapped.x || pos.y !== snapped.y
}

export function clampPosition(
  x: number,
  y: number,
  bounds: { width: number; height: number },
): IconPosition {
  return {
    x: Math.max(ICON_PADDING, Math.min(x, bounds.width - ICON_WIDTH)),
    y: Math.max(ICON_PADDING, Math.min(y, bounds.height - ICON_HEIGHT)),
  }
}

export function getOccupiedCells(layout: LayoutMap, excludePath?: string): Set<string> {
  const occupied = new Set<string>()
  for (const [path, pos] of Object.entries(layout)) {
    if (path === excludePath) continue
    occupied.add(gridKey(pos.x, pos.y))
  }
  return occupied
}

export function findFreeGridSlot(
  preferred: IconPosition,
  occupied: Set<string>,
  bounds: { width: number; height: number },
): IconPosition {
  const snapped = clampPosition(
    snapPosition(preferred.x, preferred.y).x,
    snapPosition(preferred.x, preferred.y).y,
    bounds,
  )
  const key = gridKey(snapped.x, snapped.y)
  if (!occupied.has(key)) return snapped

  const startCol = Math.round((snapped.x - ICON_PADDING) / ICON_WIDTH)
  const startRow = Math.round((snapped.y - ICON_PADDING) / ICON_HEIGHT)
  const maxCol = Math.max(0, Math.floor((bounds.width - ICON_PADDING) / ICON_WIDTH))
  const maxRow = Math.max(0, Math.floor((bounds.height - ICON_PADDING) / ICON_HEIGHT))

  for (let radius = 1; radius <= Math.max(maxCol, maxRow) + 1; radius++) {
    for (let dc = -radius; dc <= radius; dc++) {
      for (let dr = -radius; dr <= radius; dr++) {
        if (Math.abs(dc) !== radius && Math.abs(dr) !== radius) continue
        const col = startCol + dc
        const row = startRow + dr
        if (col < 0 || row < 0 || col > maxCol || row > maxRow) continue
        const pos = {
          x: ICON_PADDING + col * ICON_WIDTH,
          y: ICON_PADDING + row * ICON_HEIGHT,
        }
        const k = gridKey(pos.x, pos.y)
        if (!occupied.has(k)) return pos
      }
    }
  }

  return snapped
}

export function nextDefaultPosition(
  occupied: Set<string>,
  bounds: { width: number; height: number },
): IconPosition {
  const maxCol = Math.max(0, Math.floor((bounds.width - ICON_PADDING) / ICON_WIDTH))
  const maxRow = Math.max(0, Math.floor((bounds.height - ICON_PADDING) / ICON_HEIGHT))

  for (let col = 0; col <= maxCol; col++) {
    for (let row = 0; row <= maxRow; row++) {
      const pos = {
        x: ICON_PADDING + col * ICON_WIDTH,
        y: ICON_PADDING + row * ICON_HEIGHT,
      }
      if (!occupied.has(gridKey(pos.x, pos.y))) return pos
    }
  }

  return { x: ICON_PADDING, y: ICON_PADDING }
}

export function resolveGridPlacement(
  path: string,
  pos: IconPosition,
  layout: LayoutMap,
  bounds: { width: number; height: number },
): IconPosition {
  if (isFreePlaced(pos)) return clampPosition(pos.x, pos.y, bounds)

  const occupied = getOccupiedCells(layout, path)
  return findFreeGridSlot(pos, occupied, bounds)
}
