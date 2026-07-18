import type { AppManifest } from '../../types'
import { fileSystem } from '../../core/fileSystem'
import { eventBus } from '../../core/eventBus'
import { notificationService } from '../../core/notificationService'
import { importFilesToVfs, openFilePicker } from '../../utils/fileBridge'
import { icon } from '../../utils/icons'

const LIBRARY_KEY = 'ztionixos-zvideo-library'

interface VideoItem {
  path: string
  name: string
}

function loadLibrary(): VideoItem[] {
  try {
    const s = localStorage.getItem(LIBRARY_KEY)
    if (s) return JSON.parse(s) as VideoItem[]
  } catch { /* */ }
  return []
}

function saveLibrary(items: VideoItem[]): void {
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(items))
}

function isVideoPath(path: string, mime?: string): boolean {
  if (mime?.startsWith('video/')) return true
  return /\.(mp4|webm|ogg|ogv|mov)$/i.test(path)
}

export const videoApp: AppManifest = {
  id: 'video',
  name: 'ZVideo',
  icon: icon('video'),
  pinned: true,
  singleton: true,
  window: { width: 820, height: 560, minWidth: 520, minHeight: 400, centered: true },
  launch: () => {
    const root = document.createElement('div')
    root.className = 'app-zvideo'

    let library = loadLibrary()
    let currentIndex = -1

    const sidebar = document.createElement('aside')
    sidebar.className = 'zvideo-sidebar'

    const header = document.createElement('div')
    header.className = 'zvideo-sidebar-header'
    header.innerHTML = '<span class="zvideo-logo">ZVideo</span>'

    const importBtn = document.createElement('button')
    importBtn.className = 'zvideo-import-btn'
    importBtn.textContent = '+ Import video'

    const list = document.createElement('div')
    list.className = 'zvideo-list'

    sidebar.append(header, importBtn, list)

    const main = document.createElement('main')
    main.className = 'zvideo-main'

    const titleEl = document.createElement('div')
    titleEl.className = 'zvideo-title'
    titleEl.textContent = 'No video selected'

    const stage = document.createElement('div')
    stage.className = 'zvideo-stage'

    const video = document.createElement('video')
    video.className = 'zvideo-player'
    video.controls = true
    video.playsInline = true

    const empty = document.createElement('div')
    empty.className = 'zvideo-empty'
    empty.textContent = 'Import a video or open a .mp4 / .webm file'

    stage.append(video, empty)
    main.append(titleEl, stage)
    root.append(sidebar, main)

    const persist = () => saveLibrary(library)

    const showEmpty = (on: boolean) => {
      empty.classList.toggle('zvideo-empty--hidden', !on)
      video.classList.toggle('zvideo-player--hidden', on)
    }

    const renderList = () => {
      list.innerHTML = ''
      if (library.length === 0) {
        list.innerHTML = '<div class="zvideo-list-empty">No videos yet</div>'
        return
      }
      for (let i = 0; i < library.length; i++) {
        const item = library[i]
        const btn = document.createElement('button')
        btn.className = 'zvideo-item' + (i === currentIndex ? ' active' : '')
        btn.textContent = item.name
        btn.addEventListener('click', () => loadVideo(i))
        list.append(btn)
      }
    }

    const loadVideo = (index: number) => {
      if (index < 0 || index >= library.length) return
      currentIndex = index
      const item = library[index]
      const dataUrl = fileSystem.readAsDataUrl(item.path)
      if (!dataUrl) {
        notificationService.push('Missing file', item.name)
        return
      }
      video.src = dataUrl
      titleEl.textContent = item.name
      showEmpty(false)
      renderList()
      video.play().catch(() => { /* autoplay blocked */ })
    }

    const addPath = (path: string) => {
      if (!fileSystem.isFile(path)) return
      const name = path.split('/').pop() ?? path
      if (!library.find((v) => v.path === path)) {
        library.push({ path, name })
        persist()
      }
      renderList()
      loadVideo(library.findIndex((v) => v.path === path))
    }

    const scanDownloads = () => {
      let added = false
      const entries = fileSystem.list(fileSystem.getDownloads())
      for (let i = 0; i < entries.length; i++) {
        const e = entries[i]
        if (e.type !== 'file') continue
        if (!isVideoPath(e.path, e.mime)) continue
        if (library.find((v) => v.path === e.path)) continue
        library.push({ path: e.path, name: e.name })
        added = true
      }
      if (added) {
        persist()
        renderList()
      }
    }

    importBtn.addEventListener('click', async () => {
      const files = await openFilePicker('video/*,.mp4,.webm,.ogg,.ogv')
      if (!files) return
      try {
        const imported = await importFilesToVfs(fileSystem.getDownloads(), files)
        for (let i = 0; i < imported.length; i++) addPath(imported[i])
        notificationService.push('Imported', `${imported.length} video(s)`)
      } catch {
        notificationService.push('Import failed', 'Storage quota may be exceeded')
      }
    })

    eventBus.on('filesystem:change', scanDownloads)

    const init = (data: unknown) => {
      const payload = data as { path?: string }
      if (payload?.path) addPath(payload.path)
    }

    scanDownloads()
    renderList()
    showEmpty(true)

    const el = root as HTMLElement & { init?: (data: unknown) => void }
    el.init = init
    return root
  },
}
