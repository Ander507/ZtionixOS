import { fileSystem } from '../core/fileSystem'
import { icon } from '../utils/icons'

export interface FilePickerOptions {
  title?: string
  mode?: 'file' | 'directory' | 'both'
  startPath?: string
}

export function showFilePicker(options: FilePickerOptions = {}): Promise<string | null> {
  const mode = options.mode ?? 'file'
  const title = options.title ?? (mode === 'directory' ? 'Choose folder' : 'Choose file')
  let currentPath = options.startPath ?? fileSystem.getHome()

  return new Promise((resolve) => {
    const overlay = document.createElement('div')
    overlay.className = 'confirm-overlay file-picker-overlay'

    const dialog = document.createElement('div')
    dialog.className = 'confirm-dialog file-picker-dialog'

    const heading = document.createElement('h3')
    heading.className = 'confirm-title'
    heading.textContent = title

    const breadcrumb = document.createElement('div')
    breadcrumb.className = 'file-picker-breadcrumb'

    const list = document.createElement('div')
    list.className = 'file-picker-list'

    const actions = document.createElement('div')
    actions.className = 'confirm-actions'

    const cancelBtn = document.createElement('button')
    cancelBtn.className = 'confirm-btn confirm-btn--cancel'
    cancelBtn.textContent = 'Cancel'

    const selectBtn = document.createElement('button')
    selectBtn.className = 'confirm-btn confirm-btn--confirm'
    selectBtn.textContent = mode === 'directory' ? 'Select folder' : 'Open'

    let selectedPath: string | null = null

    const finish = (path: string | null) => {
      overlay.remove()
      resolve(path)
    }

    const renderBreadcrumb = () => {
      breadcrumb.innerHTML = ''
      const parts = currentPath.split('/').filter(Boolean)
      const segments: { label: string; path: string }[] = [{ label: '/', path: '/' }]
      let built = ''
      for (const part of parts) {
        built += `/${part}`
        segments.push({ label: part, path: built })
      }
      for (const seg of segments) {
        const btn = document.createElement('button')
        btn.className = 'file-picker-crumb'
        btn.textContent = seg.label
        btn.addEventListener('click', () => {
          currentPath = seg.path
          selectedPath = mode === 'directory' ? currentPath : null
          render()
        })
        breadcrumb.append(btn)
      }
    }

    const render = () => {
      renderBreadcrumb()
      list.innerHTML = ''
      selectBtn.disabled = mode === 'file' && !selectedPath

      if (currentPath !== '/') {
        const up = document.createElement('button')
        up.className = 'file-picker-row'
        up.innerHTML = `<span class="file-picker-icon">${icon('folder', 'files-row-svg')}</span><span>..</span>`
        up.addEventListener('click', () => {
          const parts = currentPath.split('/').filter(Boolean)
          parts.pop()
          currentPath = '/' + parts.join('/')
          if (currentPath === '') currentPath = '/'
          if (mode === 'directory') selectedPath = currentPath
          render()
        })
        list.append(up)
      }

      if (mode === 'directory') {
        selectedPath = currentPath
        selectBtn.disabled = false
      }

      const entries = fileSystem.list(currentPath)
      for (const entry of entries) {
        const row = document.createElement('button')
        row.className = `file-picker-row${selectedPath === entry.path ? ' selected' : ''}`
        const iconName = entry.type === 'directory' ? 'folder' : 'file'
        row.innerHTML = `<span class="file-picker-icon">${icon(iconName, 'files-row-svg')}</span><span>${entry.name}</span>`

        row.addEventListener('click', () => {
          if (entry.type === 'directory') {
            currentPath = entry.path
            if (mode === 'directory') selectedPath = entry.path
            else selectedPath = null
            render()
          } else if (mode === 'file' || mode === 'both') {
            selectedPath = entry.path
            render()
          }
        })

        row.addEventListener('dblclick', () => {
          if (entry.type === 'directory') return
          if (mode === 'file' || mode === 'both') finish(entry.path)
        })

        list.append(row)
      }

      if (entries.length === 0 && currentPath === '/') {
        list.innerHTML = '<div class="file-picker-empty">Empty folder</div>'
      }
    }

    cancelBtn.addEventListener('click', () => finish(null))
    selectBtn.addEventListener('click', () => {
      if (mode === 'directory') finish(currentPath)
      else if (selectedPath) finish(selectedPath)
    })

    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) finish(null) })

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); finish(null) }
    }
    document.addEventListener('keydown', onKey)
    cancelBtn.addEventListener('click', () => document.removeEventListener('keydown', onKey), { once: true })
    selectBtn.addEventListener('click', () => document.removeEventListener('keydown', onKey), { once: true })

    actions.append(cancelBtn, selectBtn)
    dialog.append(heading, breadcrumb, list, actions)
    overlay.append(dialog)
    document.body.append(overlay)
    requestAnimationFrame(() => overlay.classList.add('confirm-overlay--visible'))
    render()
  })
}
