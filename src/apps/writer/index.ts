import type { AppManifest } from '../../types'
import { fileSystem } from '../../core/fileSystem'
import { notificationService } from '../../core/notificationService'
import { icon } from '../../utils/icons'

export const writerApp: AppManifest = {
  id: 'writer',
  name: 'Writer',
  icon: icon('writer'),
  pinned: true,
  singleton: false,
  window: { width: 780, height: 560, minWidth: 480, minHeight: 360 },
  launch: (ctx) => {
    const root = document.createElement('div')
    root.className = 'app-writer'

    let currentPath: string | null = null

    const toolbar = document.createElement('div')
    toolbar.className = 'app-toolbar writer-toolbar'

    const makeBtn = (label: string, title: string, cmd?: string, value?: string) => {
      const btn = document.createElement('button')
      btn.className = 'app-btn'
      btn.textContent = label
      btn.title = title
      if (cmd) {
        btn.addEventListener('click', () => {
          document.execCommand(cmd, false, value)
          editor.focus()
        })
      }
      return btn
    }

    const boldBtn = makeBtn('B', 'Bold', 'bold')
    boldBtn.style.fontWeight = '700'
    const italicBtn = makeBtn('I', 'Italic', 'italic')
    italicBtn.style.fontStyle = 'italic'
    const underlineBtn = makeBtn('U', 'Underline', 'underline')
    const h1Btn = makeBtn('H1', 'Heading', 'formatBlock', 'h1')
    const h2Btn = makeBtn('H2', 'Subheading', 'formatBlock', 'h2')
    const pBtn = makeBtn('P', 'Paragraph', 'formatBlock', 'p')
    const ulBtn = makeBtn('• List', 'Bullet list', 'insertUnorderedList')

    const saveBtn = makeBtn('Save', 'Save document')
    const saveAsBtn = makeBtn('Save As', 'Save as HTML')
    const exportTxtBtn = makeBtn('Export .txt', 'Export plain text')

    toolbar.append(boldBtn, italicBtn, underlineBtn, h1Btn, h2Btn, pBtn, ulBtn, saveBtn, saveAsBtn, exportTxtBtn)

    const editor = document.createElement('div')
    editor.className = 'writer-editor'
    editor.contentEditable = 'true'
    editor.spellcheck = true
    editor.innerHTML = '<p>Start writing…</p>'

    root.append(toolbar, editor)

    const saveTo = (path: string) => {
      const html = editor.innerHTML
      if (fileSystem.write(path, html, 'text/html')) {
        currentPath = path
        ctx.setTitle('Writer — ' + (path.split('/').pop() ?? 'document'))
        notificationService.push('Saved', path.split('/').pop() ?? 'document')
        return true
      }
      notificationService.push('Save failed', 'Could not write file')
      return false
    }

    saveBtn.addEventListener('click', () => {
      if (currentPath) saveTo(currentPath)
      else {
        const path = `${fileSystem.getDocuments()}/Document-${Date.now()}.html`
        saveTo(path)
      }
    })

    saveAsBtn.addEventListener('click', () => {
      const path = `${fileSystem.getDocuments()}/Document-${Date.now()}.html`
      saveTo(path)
    })

    exportTxtBtn.addEventListener('click', () => {
      const plain = (editor.innerText || '').replace(/\u00a0/g, ' ').trimEnd() + '\n'
      const base = currentPath
        ? (currentPath.split('/').pop() ?? 'Document').replace(/\.html?$/i, '')
        : 'Document-' + Date.now()
      const path = `${fileSystem.getDocuments()}/${base}.txt`
      if (fileSystem.write(path, plain, 'text/plain')) {
        notificationService.push('Exported', path.split('/').pop() ?? 'txt')
      } else {
        notificationService.push('Export failed', 'Could not write .txt')
      }
    })

    const init = (data: unknown) => {
      const payload = data as { path?: string }
      if (!payload?.path) return
      const content = fileSystem.read(payload.path)
      if (content == null) return
      currentPath = payload.path
      editor.innerHTML = content
      ctx.setTitle('Writer — ' + (payload.path.split('/').pop() ?? 'document'))
    }

    const el = root as HTMLElement & { init?: (data: unknown) => void }
    el.init = init
    return root
  },
}
