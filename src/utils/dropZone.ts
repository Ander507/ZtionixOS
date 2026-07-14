import { importFilesToVfs } from '../utils/fileBridge'
import { notificationService } from '../core/notificationService'

export function setupDropZone(
  el: HTMLElement,
  destDir: () => string,
  onComplete?: () => void,
): void {
  let dragDepth = 0
  const overlay = document.createElement('div')
  overlay.className = 'drop-overlay'
  overlay.innerHTML = '<span>Drop files to import</span>'

  const show = () => {
    if (!overlay.parentElement) el.append(overlay)
    overlay.classList.add('drop-overlay--visible')
  }

  const hide = () => {
    overlay.classList.remove('drop-overlay--visible')
  }

  el.addEventListener('dragenter', (e) => {
    e.preventDefault()
    dragDepth++
    show()
  })

  el.addEventListener('dragover', (e) => {
    e.preventDefault()
  })

  el.addEventListener('dragleave', () => {
    dragDepth--
    if (dragDepth <= 0) { dragDepth = 0; hide() }
  })

  el.addEventListener('drop', async (e) => {
    e.preventDefault()
    dragDepth = 0
    hide()
    const files = e.dataTransfer?.files
    if (!files || files.length === 0) return
    try {
      const imported = await importFilesToVfs(destDir(), files)
      notificationService.push('Import complete', `${imported.length} file(s) imported`)
      onComplete?.()
    } catch {
      notificationService.push('Import failed', 'Storage quota may be exceeded')
    }
  })
}
