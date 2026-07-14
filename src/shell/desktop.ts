import { fileSystem } from '../core/fileSystem'
import { windowManager } from '../core/windowManager'
import { eventBus } from '../core/eventBus'
import { showContextMenu } from './contextMenu'
import { icon as svgIcon } from '../utils/icons'
import { getAppForPath } from '../utils/fileBridge'
import { notificationService } from '../core/notificationService'
import { showConfirm, showPrompt, showAlert, showProperties } from './confirmDialog'
import { setupDropZone } from '../utils/dropZone'
import {
  desktopLayout,
  clampPosition,
  nextDefaultPosition,
  getOccupiedCells,
  findFreeGridSlot,
  gridKey,
  resolveGridPlacement,
} from '../core/desktopLayout'

const DRAG_THRESHOLD = 4

export function createDesktop(): HTMLElement {
  const desktop = document.createElement('main')
  desktop.className = 'desktop'
  desktop.tabIndex = -1

  const icons = document.createElement('div')
  icons.className = 'desktop-icons'

  const marquee = document.createElement('div')
  marquee.className = 'desktop-marquee'
  icons.append(marquee)

  const selected = new Set<string>()
  let iconElements = new Map<string, HTMLElement>()

  const emitSelection = () => {
    eventBus.emit('desktop:selection', { paths: [...selected] })
    iconElements.forEach((el, path) => {
      el.classList.toggle('selected', selected.has(path))
    })
  }

  const selectOnly = (path: string) => {
    selected.clear()
    selected.add(path)
    emitSelection()
  }

  const toggleSelect = (path: string) => {
    if (selected.has(path)) selected.delete(path)
    else selected.add(path)
    emitSelection()
  }

  const selectAll = () => {
    selected.clear()
    for (const path of iconElements.keys()) selected.add(path)
    emitSelection()
  }

  const clearSelection = () => {
    if (selected.size === 0) return
    selected.clear()
    emitSelection()
  }

  const openEntry = (path: string, type: 'file' | 'directory') => {
    if (type === 'file') {
      const appId = getAppForPath(path)
      eventBus.emit('file:open', { path, appId })
    } else {
      windowManager.launch('files', { data: { path } })
    }
  }

  const deleteSelected = async () => {
    if (selected.size === 0) return
    const count = selected.size
    const paths = [...selected]
    const names = paths.map((p) => p.split('/').pop() ?? p)
    const message = count === 1
      ? `Are you sure you want to delete "${names[0]}"? This cannot be undone.`
      : `Are you sure you want to delete ${count} items?\n\n${names.slice(0, 5).join(', ')}${count > 5 ? ` and ${count - 5} more` : ''}`

    const ok = await showConfirm({
      title: count === 1 ? 'Delete item' : `Delete ${count} items`,
      message,
      confirmLabel: 'Delete',
      danger: true,
    })
    if (!ok) return

    let deleted = 0
    for (const path of paths) {
      if (fileSystem.remove(path, true)) deleted++
    }

    if (deleted > 0) {
      notificationService.push(
        deleted === 1 ? 'Deleted' : 'Deleted items',
        deleted === 1 ? (names[0] ?? 'item') : `${deleted} item(s) removed`,
      )
    }

    selected.clear()
    emitSelection()
  }

  const renameSelected = async () => {
    if (selected.size !== 1) return
    const path = [...selected][0]
    const name = path.split('/').pop() ?? ''
    const newName = await showPrompt({ title: 'Rename', defaultValue: name, confirmLabel: 'Rename' })
    if (!newName || newName === name) return
    const newPath = fileSystem.rename(path, newName)
    if (newPath) {
      selected.clear()
      selected.add(newPath)
      notificationService.push('Renamed', `${name} → ${newName}`)
    } else {
      await showAlert({ title: 'Rename failed', message: 'Could not rename this item.' })
    }
  }

  const showItemProperties = (path: string) => {
    const stat = fileSystem.stat(path)
    if (stat) void showProperties(stat)
  }

  const iconContextMenu = (path: string, type: 'file' | 'directory', x: number, y: number) => {
    if (!selected.has(path)) selectOnly(path)
    const count = selected.size
    showContextMenu(x, y, [
      { label: 'Open', action: () => openEntry(path, type), disabled: count > 1 },
      { label: 'Rename', action: () => { void renameSelected() }, disabled: count !== 1 },
      { label: count > 1 ? `Delete ${count} items` : 'Delete', action: () => deleteSelected() },
      { separator: true },
      { label: 'Properties', action: () => showItemProperties(path), disabled: count !== 1 },
    ])
  }

  const renderIcons = () => {
    icons.querySelectorAll('.desktop-icon').forEach((el) => el.remove())
    iconElements.clear()

    const entries = fileSystem.list(fileSystem.getDesktop())
    const validPaths = new Set(entries.map((e) => e.path))
    desktopLayout.prune(validPaths)

    for (const path of [...selected]) {
      if (!validPaths.has(path)) selected.delete(path)
    }

    const bounds = icons.getBoundingClientRect()
    const boundsSize = {
      width: bounds.width || icons.clientWidth || window.innerWidth,
      height: bounds.height || icons.clientHeight || window.innerHeight - 110,
    }

    const layout = desktopLayout.getAll()
    const occupied = new Set<string>()

    for (const entry of entries) {
      let pos = desktopLayout.get(entry.path)
      if (!pos) {
        pos = nextDefaultPosition(occupied, boundsSize)
      } else {
        pos = resolveGridPlacement(entry.path, pos, layout, boundsSize)
      }

      occupied.add(gridKey(pos.x, pos.y))
      desktopLayout.set(entry.path, pos.x, pos.y)

      const icon = document.createElement('button')
      icon.className = 'desktop-icon'
      if (selected.has(entry.path)) icon.classList.add('selected')
      icon.dataset.path = entry.path
      icon.style.left = `${pos.x}px`
      icon.style.top = `${pos.y}px`

      const iconName = entry.type === 'directory' ? 'folder' : 'file'
      icon.innerHTML = `${svgIcon(iconName, 'desktop-icon-svg')}<span class="desktop-icon-label">${entry.name}</span>`

      icon.addEventListener('click', (e) => {
        if (icon.dataset.dragged === 'true') return
        if (e.ctrlKey || e.metaKey) toggleSelect(entry.path)
        else selectOnly(entry.path)
        desktop.focus()
      })

      icon.addEventListener('dblclick', () => {
        if (icon.dataset.dragged === 'true') return
        openEntry(entry.path, entry.type)
      })

      icon.addEventListener('contextmenu', (e) => {
        e.preventDefault()
        e.stopPropagation()
        if (!selected.has(entry.path)) selectOnly(entry.path)
        iconContextMenu(entry.path, entry.type, e.clientX, e.clientY)
      })

      setupIconDrag(icon, icons, entry.path, clearSelection)
      iconElements.set(entry.path, icon)
      icons.insertBefore(icon, marquee)
    }

    emitSelection()
  }

  renderIcons()
  eventBus.on('filesystem:change', renderIcons)

  // Marquee selection
  let marqueeActive = false
  let marqueeStart = { x: 0, y: 0 }

  icons.addEventListener('pointerdown', (e) => {
    if ((e.target as HTMLElement).closest('.desktop-icon')) return
    if (e.button !== 0) return

    marqueeActive = true
    const rect = icons.getBoundingClientRect()
    marqueeStart = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    marquee.style.display = 'block'
    marquee.style.left = `${marqueeStart.x}px`
    marquee.style.top = `${marqueeStart.y}px`
    marquee.style.width = '0'
    marquee.style.height = '0'

    if (!e.ctrlKey && !e.metaKey) clearSelection()
    icons.setPointerCapture(e.pointerId)
    e.preventDefault()
  })

  icons.addEventListener('pointermove', (e) => {
    if (!marqueeActive) return
    const rect = icons.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const left = Math.min(marqueeStart.x, x)
    const top = Math.min(marqueeStart.y, y)
    const width = Math.abs(x - marqueeStart.x)
    const height = Math.abs(y - marqueeStart.y)

    marquee.style.left = `${left}px`
    marquee.style.top = `${top}px`
    marquee.style.width = `${width}px`
    marquee.style.height = `${height}px`

    const mRect = { left, top, right: left + width, bottom: top + height }
    iconElements.forEach((el, path) => {
      const iRect = el.getBoundingClientRect()
      const rel = {
        left: iRect.left - rect.left,
        top: iRect.top - rect.top,
        right: iRect.right - rect.left,
        bottom: iRect.bottom - rect.top,
      }
      const hit = rel.left < mRect.right && rel.right > mRect.left && rel.top < mRect.bottom && rel.bottom > mRect.top
      if (hit) selected.add(path)
      else if (!e.ctrlKey && !e.metaKey) selected.delete(path)
    })
    emitSelection()
  })

  const endMarquee = () => {
    if (!marqueeActive) return
    marqueeActive = false
    marquee.style.display = 'none'
  }

  icons.addEventListener('pointerup', endMarquee)
  icons.addEventListener('pointercancel', endMarquee)

  desktop.append(icons)

  desktop.addEventListener('contextmenu', (e) => {
    if ((e.target as HTMLElement).closest('.desktop-icon')) return
    e.preventDefault()
    clearSelection()
    showContextMenu(e.clientX, e.clientY, [
      { label: 'New Folder', action: () => { void createDesktopFolder() } },
      { label: 'New Text File', action: () => { void createDesktopFile() } },
      { separator: true },
      { label: 'Refresh', action: renderIcons },
      { separator: true },
      { label: 'Open Settings', action: () => windowManager.launch('settings') },
    ])
  })

  const handleDesktopKeys = (e: KeyboardEvent) => {
    if (isTypingTarget(e.target)) return

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
      e.preventDefault()
      selectAll()
      return
    }

    if (selected.size === 0) return

    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      void deleteSelected()
    } else if (e.key === 'F2') {
      e.preventDefault()
      void renameSelected()
    }
  }

  desktop.addEventListener('keydown', handleDesktopKeys)

  document.addEventListener('keydown', (e) => {
    if (document.querySelector('.confirm-overlay')) return
    if (isTypingTarget(e.target)) return
    if (!desktop.isConnected) return

    const inWindow = (e.target as HTMLElement)?.closest('.window')
    if (inWindow) return

    const isSelectAll = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a'
    if (selected.size === 0 && !isSelectAll) return

    handleDesktopKeys(e)
  })

  setupDropZone(desktop, () => fileSystem.getDesktop())

  return desktop
}

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable
}

function setupIconDrag(icon: HTMLElement, container: HTMLElement, path: string, onDragStart: () => void): void {
  let dragging = false
  let didDrag = false
  let freeplace = false
  let pointerId: number | null = null
  let offsetX = 0
  let offsetY = 0
  let originX = 0
  let originY = 0
  let startX = 0
  let startY = 0

  const getBounds = () => {
    const rect = container.getBoundingClientRect()
    return { width: rect.width, height: rect.height }
  }

  const placeIcon = (x: number, y: number) => {
    const clamped = clampPosition(x, y, getBounds())
    icon.style.left = `${clamped.x}px`
    icon.style.top = `${clamped.y}px`
    return clamped
  }

  const cancelDrag = () => {
    if (!dragging) return
    const pid = pointerId
    dragging = false
    didDrag = false
    pointerId = null
    icon.classList.remove('dragging', 'freeplace')
    icon.style.left = `${originX}px`
    icon.style.top = `${originY}px`
    if (pid !== null) {
      try { icon.releasePointerCapture(pid) } catch { /* */ }
    }
  }

  const finishDrag = (e: PointerEvent) => {
    if (!dragging) return
    dragging = false
    icon.classList.remove('dragging', 'freeplace')

    if (pointerId !== null && icon.hasPointerCapture(pointerId)) {
      icon.releasePointerCapture(pointerId)
    }
    pointerId = null

    if (!didDrag) return

    icon.dataset.dragged = 'true'
    const bounds = getBounds()
    const x = parseInt(icon.style.left, 10) || 0
    const y = parseInt(icon.style.top, 10) || 0

    if (freeplace || e.shiftKey) {
      const final = clampPosition(x, y, bounds)
      icon.style.left = `${final.x}px`
      icon.style.top = `${final.y}px`
      desktopLayout.set(path, final.x, final.y)
    } else {
      const occupied = getOccupiedCells(desktopLayout.getAll(), path)
      const final = findFreeGridSlot({ x, y }, occupied, bounds)
      icon.style.left = `${final.x}px`
      icon.style.top = `${final.y}px`
      desktopLayout.set(path, final.x, final.y)
    }

    window.setTimeout(() => { icon.dataset.dragged = 'false' }, 0)
  }

  icon.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return

    const iconRect = icon.getBoundingClientRect()
    dragging = true
    didDrag = false
    freeplace = e.shiftKey
    pointerId = e.pointerId
    icon.dataset.dragged = 'false'
    originX = parseInt(icon.style.left, 10) || 0
    originY = parseInt(icon.style.top, 10) || 0
    offsetX = e.clientX - iconRect.left
    offsetY = e.clientY - iconRect.top
    startX = e.clientX
    startY = e.clientY

    icon.setPointerCapture(e.pointerId)
    e.preventDefault()
  })

  icon.addEventListener('pointermove', (e) => {
    if (!dragging || e.pointerId !== pointerId) return

    const moved = Math.hypot(e.clientX - startX, e.clientY - startY)
    if (!didDrag && moved < DRAG_THRESHOLD) return

    if (!didDrag) onDragStart()
    didDrag = true
    freeplace = e.shiftKey
    icon.classList.add('dragging')
    icon.classList.toggle('freeplace', freeplace)

    const containerRect = container.getBoundingClientRect()
    const x = e.clientX - containerRect.left - offsetX
    const y = e.clientY - containerRect.top - offsetY
    placeIcon(x, y)
  })

  icon.addEventListener('pointerup', (e) => {
    if (e.pointerId !== pointerId) return
    finishDrag(e)
  })

  icon.addEventListener('pointercancel', cancelDrag)
  window.addEventListener('blur', cancelDrag)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelDrag()
  })
}

async function createDesktopFolder(): Promise<void> {
  const name = await showPrompt({ title: 'New Folder', defaultValue: 'New Folder', confirmLabel: 'Create' })
  if (!name) return
  if (!fileSystem.mkdirIn(fileSystem.getDesktop(), name)) {
    await showAlert({ title: 'Error', message: 'Could not create folder.' })
  }
}

async function createDesktopFile(): Promise<void> {
  const name = await showPrompt({ title: 'New Text File', defaultValue: 'New File.txt', confirmLabel: 'Create' })
  if (!name) return
  if (!fileSystem.touchIn(fileSystem.getDesktop(), name)) {
    await showAlert({ title: 'Error', message: 'Could not create file.' })
  }
}
