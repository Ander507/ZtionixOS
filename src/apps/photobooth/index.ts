import type { AppManifest } from '../../types'
import { fileSystem } from '../../core/fileSystem'
import { eventBus } from '../../core/eventBus'
import { notificationService } from '../../core/notificationService'
import { icon } from '../../utils/icons'

const FILTERS: { id: string; label: string; css: string }[] = [
  { id: 'normal', label: 'Normal', css: 'none' },
  { id: 'gray', label: 'Gray', css: 'grayscale(1)' },
  { id: 'sepia', label: 'Sepia', css: 'sepia(1)' },
  { id: 'invert', label: 'Invert', css: 'invert(1)' },
  { id: 'contrast', label: 'Contrast', css: 'contrast(1.6) saturate(1.3)' },
]

const PHOTOS_DIR = '/home/user/Photos'

export const photoBoothApp: AppManifest = {
  id: 'photobooth',
  name: 'Photo Booth',
  icon: icon('photobooth'),
  pinned: true,
  singleton: true,
  window: { width: 640, height: 520, minWidth: 420, minHeight: 360, centered: true },
  launch: (ctx) => {
    const root = document.createElement('div')
    root.className = 'app-photobooth'

    const toolbar = document.createElement('div')
    toolbar.className = 'app-toolbar photobooth-toolbar'

    const snapBtn = document.createElement('button')
    snapBtn.className = 'app-btn photobooth-snap'
    snapBtn.textContent = 'Snap'
    snapBtn.disabled = true

    const filterBar = document.createElement('div')
    filterBar.className = 'photobooth-filters'

    toolbar.append(snapBtn, filterBar)

    const stage = document.createElement('div')
    stage.className = 'photobooth-stage'

    const video = document.createElement('video')
    video.className = 'photobooth-video'
    video.autoplay = true
    video.playsInline = true
    video.muted = true

    const overlay = document.createElement('div')
    overlay.className = 'photobooth-overlay'
    overlay.textContent = 'Starting camera…'

    const flash = document.createElement('div')
    flash.className = 'photobooth-flash'

    stage.append(video, overlay, flash)

    const hint = document.createElement('p')
    hint.className = 'photobooth-hint'
    hint.textContent = 'Photos save to /home/user/Photos'

    root.append(toolbar, stage, hint)

    let stream: MediaStream | null = null
    let activeFilter = FILTERS[0]
    let countdown = false

    for (let i = 0; i < FILTERS.length; i++) {
      const f = FILTERS[i]
      const btn = document.createElement('button')
      btn.className = 'app-btn photobooth-filter' + (i === 0 ? ' active' : '')
      btn.textContent = f.label
      btn.addEventListener('click', () => {
        activeFilter = f
        video.style.filter = f.css
        filterBar.querySelectorAll('.photobooth-filter').forEach((el) => el.classList.remove('active'))
        btn.classList.add('active')
      })
      filterBar.append(btn)
    }

    const setOverlay = (text: string | null) => {
      if (!text) {
        overlay.classList.add('photobooth-overlay--hidden')
        overlay.textContent = ''
        return
      }
      overlay.classList.remove('photobooth-overlay--hidden')
      overlay.textContent = text
    }

    const ensurePhotosDir = () => {
      if (!fileSystem.exists(PHOTOS_DIR)) {
        fileSystem.mkdir(PHOTOS_DIR)
      }
    }

    const capture = async () => {
      if (!stream || countdown) return
      countdown = true
      snapBtn.disabled = true

      for (let n = 3; n >= 1; n--) {
        setOverlay(String(n))
        await new Promise((r) => setTimeout(r, 450))
      }
      setOverlay(null)

      flash.classList.add('photobooth-flash--on')
      setTimeout(() => flash.classList.remove('photobooth-flash--on'), 180)

      const w = video.videoWidth || 640
      const h = video.videoHeight || 480
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const c = canvas.getContext('2d')
      if (!c) {
        countdown = false
        snapBtn.disabled = false
        return
      }

      c.save()
      c.translate(w, 0)
      c.scale(-1, 1)
      c.filter = activeFilter.css
      c.drawImage(video, 0, 0, w, h)
      c.restore()

      const dataUrl = canvas.toDataURL('image/png')
      const base64 = dataUrl.split(',')[1]
      ensurePhotosDir()
      const path = `${PHOTOS_DIR}/photo-${Date.now()}.png`
      try {
        if (fileSystem.writeBinary(path, base64, 'image/png')) {
          notificationService.push('Photo saved', path.split('/').pop() ?? 'photo')
        } else {
          notificationService.push('Save failed', 'Could not write photo')
        }
      } catch {
        notificationService.push('Save failed', 'Storage quota may be exceeded')
      }

      countdown = false
      snapBtn.disabled = false
    }

    snapBtn.addEventListener('click', () => {
      void capture()
    })

    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setOverlay('Camera not supported in this browser')
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        })
        video.srcObject = stream
        video.style.filter = activeFilter.css
        setOverlay(null)
        snapBtn.disabled = false
      } catch {
        setOverlay('Camera permission denied or unavailable')
        snapBtn.disabled = true
      }
    }

    void startCamera()

    const stopCamera = () => {
      if (stream) {
        const tracks = stream.getTracks()
        for (let i = 0; i < tracks.length; i++) tracks[i].stop()
        stream = null
      }
      video.srcObject = null
    }

    const onClose = ({ id }: { id: string }) => {
      if (id !== ctx.windowId) return
      stopCamera()
      eventBus.off('window:close', onClose)
    }
    eventBus.on('window:close', onClose)

    return root
  },
}
