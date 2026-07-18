import { fileSystem } from '../core/fileSystem'
import { notificationService } from '../core/notificationService'

export async function importFilesToVfs(destDir: string, files: FileList): Promise<string[]> {
  const imported: string[] = []
  for (const file of Array.from(files)) {
    try {
      const path = `${destDir}/${file.name}`
      if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.json')) {
        const text = await file.text()
        if (fileSystem.write(path, text, file.type || undefined)) imported.push(path)
      } else {
        const buf = await file.arrayBuffer()
        const bytes = new Uint8Array(buf)
        let binary = ''
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
        const base64 = btoa(binary)
        if (fileSystem.writeBinary(path, base64, file.type || 'application/octet-stream')) imported.push(path)
      }
    } catch {
      notificationService.push('Import failed', `Could not import ${file.name}`)
    }
  }
  return imported
}

export function exportVfsFile(path: string): boolean {
  const stat = fileSystem.stat(path)
  if (!stat || stat.type !== 'file') return false

  let blob: Blob
  const content = fileSystem.read(path)
  const isBinary = (stat.mime?.startsWith('image/') || stat.mime?.startsWith('audio/') || stat.mime?.startsWith('video/')) ?? false
  if (isBinary) {
    const dataUrl = fileSystem.readAsDataUrl(path)
    if (!dataUrl) return false
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = path.split('/').pop() ?? 'download'
    a.click()
    return true
  }

  blob = new Blob([content ?? ''], { type: stat.mime ?? 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = path.split('/').pop() ?? 'download'
  a.click()
  URL.revokeObjectURL(url)
  return true
}

export function openFilePicker(accept?: string, multiple = true): Promise<FileList | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = multiple
    if (accept) input.accept = accept
    input.addEventListener('change', () => resolve(input.files))
    input.click()
  })
}

export function getAppForPath(path: string): string {
  const stat = fileSystem.stat(path)
  if (!stat) return 'files'
  if (stat.type !== 'file') return 'files'
  const mime = stat.mime ?? ''
  const name = path.toLowerCase()
  if (mime.startsWith('image/')) return 'paint'
  if (/\.(png|jpg|jpeg|gif|webp)$/.test(name)) return 'paint'
  if (mime.startsWith('video/') || /\.(mp4|webm|ogg|ogv|mov)$/.test(name)) return 'video'
  if (mime.startsWith('audio/')) return 'music'
  if (/\.(mp3|wav|ogg)$/.test(name) && !/\.(ogv)$/.test(name)) return 'music'
  if (/\.csv$/.test(name) || mime === 'text/csv') return 'calc'
  if (/\.html?$/.test(name) && name.includes('document')) return 'writer'
  if (mime === 'text/html') return 'writer'
  if (mime.startsWith('text/')) return 'editor'
  if (/\.(txt|md|json|js|ts|css)$/.test(name)) return 'editor'
  if (/\.html?$/.test(name)) return 'writer'
  return 'editor'
}
