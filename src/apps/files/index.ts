import type { AppManifest } from '../../types'
import { fileSystem } from '../../core/fileSystem'
import { eventBus } from '../../core/eventBus'
import { showContextMenu } from '../../shell/contextMenu'
import { notificationService } from '../../core/notificationService'
import { showConfirm, showPrompt, showAlert } from '../../shell/confirmDialog'
import { showFilePicker } from '../../shell/filePicker'
import { setupDropZone } from '../../utils/dropZone'
import { importFilesToVfs, exportVfsFile, openFilePicker } from '../../utils/fileBridge'
import { getAppForPath } from '../../utils/fileBridge'
import { icon } from '../../utils/icons'

const QUICK_PATHS = [
  { label: 'Home', path: '/home/user' },
  { label: 'Desktop', path: '/home/user/Desktop' },
  { label: 'Documents', path: '/home/user/Documents' },
  { label: 'Downloads', path: '/home/user/Downloads' },
]

export const filesApp: AppManifest = {
  id: 'files',
  name: 'Files',
  icon: icon('files'),
  pinned: true,
  launch: () => {
    const root = document.createElement('div')
    root.className = 'app-files'

    let currentPath = fileSystem.getHome()
    let clipboard: { mode: 'cut' | 'copy'; paths: string[] } | null = null
    let selectedRow: string | null = null

    const init = (data: unknown) => {
      const payload = data as { path?: string }
      if (payload?.path && fileSystem.isDirectory(payload.path)) {
        currentPath = payload.path
        render()
      }
    }

    const toolbar = document.createElement('div')
    toolbar.className = 'app-toolbar'

    const backBtn = document.createElement('button')
    backBtn.className = 'app-btn'
    backBtn.textContent = '←'
    backBtn.title = 'Back'

    const upBtn = document.createElement('button')
    upBtn.className = 'app-btn'
    upBtn.textContent = '↑'
    upBtn.title = 'Up'

    const pathBar = document.createElement('input')
    pathBar.className = 'app-pathbar'
    pathBar.readOnly = true

    const importBtn = document.createElement('button')
    importBtn.className = 'app-btn'
    importBtn.textContent = 'Import'

    const downloadBtn = document.createElement('button')
    downloadBtn.className = 'app-btn'
    downloadBtn.textContent = 'Download'

    const cutBtn = document.createElement('button')
    cutBtn.className = 'app-btn'
    cutBtn.textContent = 'Cut'

    const copyBtn = document.createElement('button')
    copyBtn.className = 'app-btn'
    copyBtn.textContent = 'Copy'

    const pasteBtn = document.createElement('button')
    pasteBtn.className = 'app-btn'
    pasteBtn.textContent = 'Paste'

    const newFolderBtn = document.createElement('button')
    newFolderBtn.className = 'app-btn'
    newFolderBtn.textContent = 'New Folder'

    const newFileBtn = document.createElement('button')
    newFileBtn.className = 'app-btn'
    newFileBtn.textContent = 'New File'

    toolbar.append(backBtn, upBtn, pathBar, importBtn, downloadBtn, cutBtn, copyBtn, pasteBtn, newFolderBtn, newFileBtn)

    const nav = document.createElement('div')
    nav.className = 'files-nav'
    for (const qp of QUICK_PATHS) {
      const btn = document.createElement('button')
      btn.className = 'files-nav-btn'
      btn.textContent = qp.label
      btn.addEventListener('click', () => {
        history.push(currentPath)
        currentPath = qp.path
        render()
      })
      nav.append(btn)
    }

    const list = document.createElement('div')
    list.className = 'files-list'

    const history: string[] = []

    const openEntry = (entry: { path: string; type: 'file' | 'directory'; name: string }) => {
      if (entry.type === 'directory') {
        history.push(currentPath)
        currentPath = entry.path
        render()
      } else {
        const appId = getAppForPath(entry.path)
        eventBus.emit('file:open', { path: entry.path, appId })
      }
    }

    const deleteEntry = async (entry: { path: string; name: string; type: 'file' | 'directory' }) => {
      const recursive = entry.type === 'directory'
      const ok = await showConfirm({
        title: 'Delete item',
        message: recursive
          ? `Delete "${entry.name}" and everything inside it? This cannot be undone.`
          : `Delete "${entry.name}"? This cannot be undone.`,
        confirmLabel: 'Delete',
        danger: true,
      })
      if (!ok) return
      if (fileSystem.remove(entry.path, recursive)) {
        notificationService.push('Deleted', entry.name)
        render()
      } else {
        await showAlert({ title: 'Delete failed', message: 'Folder may not be empty — try again with recursive delete.' })
      }
    }

    const rowMenu = (entry: { path: string; name: string; type: 'file' | 'directory' }, x: number, y: number) => {
      showContextMenu(x, y, [
        { label: 'Open', action: () => openEntry(entry) },
        { label: 'Cut', action: () => { clipboard = { mode: 'cut', paths: [entry.path] } } },
        { label: 'Copy', action: () => { clipboard = { mode: 'copy', paths: [entry.path] } } },
        { label: 'Rename', action: () => { void (async () => {
          const newName = await showPrompt({ title: 'Rename', defaultValue: entry.name, confirmLabel: 'Rename' })
          if (newName && fileSystem.rename(entry.path, newName)) {
            notificationService.push('Renamed', `${entry.name} → ${newName}`)
            render()
          } else if (newName) await showAlert({ title: 'Rename failed', message: 'Could not rename this item.' })
        })() }},
        { label: 'Move to…', action: () => { void (async () => {
          const dest = await showFilePicker({ title: 'Move to folder', mode: 'directory', startPath: fileSystem.getDownloads() })
          if (dest && fileSystem.move(entry.path, dest)) {
            notificationService.push('Moved', entry.name)
            render()
          } else if (dest) await showAlert({ title: 'Move failed', message: 'Could not move to that location.' })
        })() }},
        { separator: true },
        { label: 'Download', disabled: entry.type !== 'file', action: () => {
          if (exportVfsFile(entry.path)) notificationService.push('Downloaded', entry.name)
        }},
        { label: 'Delete', action: () => { void deleteEntry(entry) } },
      ])
    }

    const render = () => {
      pathBar.value = currentPath
      list.innerHTML = ''
      const entries = fileSystem.list(currentPath)

      if (entries.length === 0) {
        const empty = document.createElement('div')
        empty.className = 'files-empty'
        empty.textContent = 'This folder is empty'
        list.append(empty)
        return
      }

      for (const entry of entries) {
        const row = document.createElement('button')
        row.className = `files-row${selectedRow === entry.path ? ' selected' : ''}`
        const iconMarkup = entry.type === 'directory' ? icon('folder', 'files-row-svg') : icon('file', 'files-row-svg')
        const size = entry.size !== undefined ? formatSize(entry.size) : '—'
        row.innerHTML = `
          <span class="files-row-icon">${iconMarkup}</span>
          <span class="files-row-name">${entry.name}</span>
          <span class="files-row-type">${entry.type}</span>
          <span class="files-row-size">${size}</span>
          <span class="files-row-date">${new Date(entry.modifiedAt).toLocaleDateString()}</span>
        `

        row.addEventListener('click', () => { selectedRow = entry.path })
        row.addEventListener('dblclick', () => openEntry(entry))
        row.addEventListener('contextmenu', (e) => {
          e.preventDefault()
          e.stopPropagation()
          selectedRow = entry.path
          rowMenu(entry, e.clientX, e.clientY)
        })

        list.append(row)
      }
    }

    backBtn.addEventListener('click', () => {
      const prev = history.pop()
      if (prev) { currentPath = prev; render() }
    })

    upBtn.addEventListener('click', () => {
      if (currentPath === '/') return
      history.push(currentPath)
      const parts = currentPath.split('/').filter(Boolean)
      parts.pop()
      currentPath = '/' + parts.join('/')
      if (currentPath === '') currentPath = '/'
      render()
    })

    importBtn.addEventListener('click', async () => {
      const files = await openFilePicker()
      if (!files || files.length === 0) return
      try {
        const imported = await importFilesToVfs(currentPath, files)
        notificationService.push('Import complete', `${imported.length} file(s) imported`)
        render()
      } catch {
        notificationService.push('Import failed', 'Storage quota may be exceeded')
      }
    })

    downloadBtn.addEventListener('click', async () => {
      if (!selectedRow) { await showAlert({ title: 'No selection', message: 'Select a file first.' }); return }
      if (!fileSystem.isFile(selectedRow)) { await showAlert({ title: 'Invalid selection', message: 'Select a file to download.' }); return }
      if (exportVfsFile(selectedRow)) {
        notificationService.push('Downloaded', selectedRow.split('/').pop() ?? 'file')
      }
    })

    cutBtn.addEventListener('click', () => {
      if (!selectedRow) return
      clipboard = { mode: 'cut', paths: [selectedRow] }
    })

    copyBtn.addEventListener('click', () => {
      if (!selectedRow) return
      clipboard = { mode: 'copy', paths: [selectedRow] }
    })

    pasteBtn.addEventListener('click', () => {
      if (!clipboard) return
      const count = clipboard.paths.length
      const mode = clipboard.mode
      for (const src of clipboard.paths) {
        if (mode === 'copy') fileSystem.copy(src, currentPath)
        else fileSystem.move(src, currentPath)
      }
      if (mode === 'cut') clipboard = null
      notificationService.push('Paste complete', `${count} item(s)`)
      render()
    })

    newFolderBtn.addEventListener('click', async () => {
      const name = await showPrompt({ title: 'New Folder', defaultValue: 'New Folder', confirmLabel: 'Create' })
      if (name && fileSystem.mkdirIn(currentPath, name)) render()
      else if (name) await showAlert({ title: 'Error', message: 'Could not create folder.' })
    })

    newFileBtn.addEventListener('click', async () => {
      const name = await showPrompt({ title: 'New File', defaultValue: 'New File.txt', confirmLabel: 'Create' })
      if (name && fileSystem.touchIn(currentPath, name)) render()
      else if (name) await showAlert({ title: 'Error', message: 'Could not create file.' })
    })

    eventBus.on('filesystem:change', render)
    render()

    setupDropZone(root, () => currentPath, render)

    root.append(toolbar, nav, list)

    const el = root as HTMLElement & { init?: (data: unknown) => void }
    el.init = init
    return root
  },
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
