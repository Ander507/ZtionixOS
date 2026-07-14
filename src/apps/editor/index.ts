import type { AppManifest } from '../../types'
import { fileSystem } from '../../core/fileSystem'
import { notificationService } from '../../core/notificationService'
import { exportVfsFile } from '../../utils/fileBridge'
import { showPrompt, showAlert, showConfirm } from '../../shell/confirmDialog'
import { showFilePicker } from '../../shell/filePicker'
import { icon } from '../../utils/icons'

export const editorApp: AppManifest = {
  id: 'editor',
  name: 'Text Editor',
  icon: icon('editor'),
  pinned: true,
  singleton: false,
  launch: (ctx) => {
    const root = document.createElement('div')
    root.className = 'app-editor'

    let currentPath: string | null = null
    let dirty = false
    let wordWrap = true

    const toolbar = document.createElement('div')
    toolbar.className = 'app-toolbar'

    const openBtn = document.createElement('button')
    openBtn.className = 'app-btn'
    openBtn.textContent = 'Open'

    const saveBtn = document.createElement('button')
    saveBtn.className = 'app-btn'
    saveBtn.textContent = 'Save'

    const saveAsBtn = document.createElement('button')
    saveAsBtn.className = 'app-btn'
    saveAsBtn.textContent = 'Save As'

    const exportBtn = document.createElement('button')
    exportBtn.className = 'app-btn'
    exportBtn.textContent = 'Export'

    const findBtn = document.createElement('button')
    findBtn.className = 'app-btn'
    findBtn.textContent = 'Find'

    const wrapBtn = document.createElement('button')
    wrapBtn.className = 'app-btn'
    wrapBtn.textContent = 'Wrap: On'

    const status = document.createElement('span')
    status.className = 'editor-status'

    toolbar.append(openBtn, saveBtn, saveAsBtn, exportBtn, findBtn, wrapBtn, status)

    const findBar = document.createElement('div')
    findBar.className = 'editor-findbar'
    findBar.hidden = true
    const findInput = document.createElement('input')
    findInput.className = 'editor-find-input'
    findInput.placeholder = 'Find…'
    const findCount = document.createElement('span')
    findCount.className = 'editor-find-count'
    findBar.append(findInput, findCount)

    const textarea = document.createElement('textarea')
    textarea.className = 'editor-textarea'
    textarea.spellcheck = false

    const updateStatus = () => {
      const name = currentPath?.split('/').pop() ?? 'Untitled'
      const lines = textarea.value.slice(0, textarea.selectionStart).split('\n')
      const line = lines.length
      const col = (lines[lines.length - 1]?.length ?? 0) + 1
      status.textContent = `${dirty ? '● ' : ''}${name} · Ln ${line}, Col ${col}`
      ctx.setTitle(dirty ? `${name} — Text Editor` : (currentPath ? `${name} — Text Editor` : 'Text Editor'))
    }

    const confirmDiscard = async (): Promise<boolean> => {
      if (!dirty) return true
      return showConfirm({
        title: 'Unsaved changes',
        message: 'Discard unsaved changes?',
        confirmLabel: 'Discard',
        danger: true,
      })
    }

    const loadFile = async (path: string) => {
      if (!(await confirmDiscard())) return
      const content = fileSystem.read(path)
      if (content === null) {
        await showAlert({ title: 'Open failed', message: 'Could not open file.' })
        return
      }
      currentPath = path
      textarea.value = content
      dirty = false
      updateStatus()
    }

    const saveFile = async (path?: string) => {
      const target = path ?? currentPath
      if (!target) {
        await saveAs()
        return
      }
      try {
        if (fileSystem.write(target, textarea.value)) {
          currentPath = target
          dirty = false
          updateStatus()
          notificationService.push('Saved', target.split('/').pop() ?? target)
        } else {
          await showAlert({ title: 'Save failed', message: 'Could not save file.' })
        }
      } catch {
        notificationService.push('Save failed', 'Storage quota may be exceeded')
      }
    }

    const saveAs = async () => {
      const name = await showPrompt({
        title: 'Save As',
        defaultValue: currentPath?.split('/').pop() ?? 'Untitled.txt',
        confirmLabel: 'Save',
      })
      if (!name) return
      await saveFile(`${fileSystem.getDocuments()}/${name}`)
    }

    const runFind = () => {
      const query = findInput.value
      if (!query) { findCount.textContent = ''; return }
      const text = textarea.value
      let count = 0
      let pos = 0
      while ((pos = text.indexOf(query, pos)) !== -1) { count++; pos += query.length }
      findCount.textContent = count ? `${count} match${count > 1 ? 'es' : ''}` : 'No matches'
      const idx = text.indexOf(query, textarea.selectionStart)
      if (idx >= 0) {
        textarea.focus()
        textarea.setSelectionRange(idx, idx + query.length)
      }
      updateStatus()
    }

    openBtn.addEventListener('click', async () => {
      const path = await showFilePicker({ title: 'Open file', mode: 'file', startPath: currentPath ?? fileSystem.getHome() })
      if (path) await loadFile(path)
    })

    saveBtn.addEventListener('click', () => { void saveFile() })
    saveAsBtn.addEventListener('click', () => { void saveAs() })

    exportBtn.addEventListener('click', async () => {
      if (!currentPath) { await showAlert({ title: 'Export', message: 'Save the file first.' }); return }
      if (exportVfsFile(currentPath)) notificationService.push('Exported', currentPath.split('/').pop() ?? 'file')
    })

    findBtn.addEventListener('click', () => {
      findBar.hidden = !findBar.hidden
      if (!findBar.hidden) findInput.focus()
    })

    findInput.addEventListener('input', runFind)
    findInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') runFind()
      if (e.key === 'Escape') { findBar.hidden = true }
    })

    wrapBtn.addEventListener('click', () => {
      wordWrap = !wordWrap
      textarea.style.whiteSpace = wordWrap ? 'pre-wrap' : 'pre'
      wrapBtn.textContent = wordWrap ? 'Wrap: On' : 'Wrap: Off'
    })

    textarea.addEventListener('input', () => { dirty = true; updateStatus() })
    textarea.addEventListener('click', updateStatus)
    textarea.addEventListener('keyup', updateStatus)

    textarea.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 's') { e.preventDefault(); void saveFile() }
      if (e.ctrlKey && e.key === 'f') { e.preventDefault(); findBar.hidden = false; findInput.focus() }
    })

    const init = (data: unknown) => {
      const payload = data as { path?: string }
      if (payload?.path) void loadFile(payload.path)
    }

    window.addEventListener('beforeunload', (e) => {
      if (dirty && root.isConnected) e.preventDefault()
    })

    updateStatus()
    root.append(toolbar, findBar, textarea)

    const el = root as HTMLElement & { init?: (data: unknown) => void }
    el.init = init
    return root
  },
}
