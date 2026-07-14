import type { AppManifest } from '../../types'
import { fileSystem } from '../../core/fileSystem'
import { notificationService } from '../../core/notificationService'
import { themeEngine, normalizeWallpaperUrl, readWallpaperFile } from '../../core/themeEngine'
import { resetAll } from '../../core/systemReset'
import { getStorageEstimate } from '../../core/vfsStorage'
import { showConfirm, showAlert } from '../../shell/confirmDialog'
import { importFilesToVfs, openFilePicker } from '../../utils/fileBridge'
import { icon } from '../../utils/icons'

const WALLPAPERS = [
  { id: 'slate', label: 'Slate' },
  { id: 'dusk', label: 'Dusk' },
  { id: 'fog', label: 'Fog' },
  { id: 'ember', label: 'Ember' },
  { id: 'void', label: 'Void' },
]

const ACCENTS = [
  { color: '#c9a96e', label: 'Sand' },
  { color: '#7eb8a4', label: 'Sage' },
  { color: '#c47d6a', label: 'Clay' },
  { color: '#8b9eb3', label: 'Steel' },
  { color: '#b08cba', label: 'Mauve' },
  { color: '#d4a574', label: 'Amber' },
]

export const settingsApp: AppManifest = {
  id: 'settings',
  name: 'Settings',
  icon: icon('settings'),
  pinned: true,
  singleton: true,
  launch: () => {
    const root = document.createElement('div')
    root.className = 'app-settings'

    const sidebar = document.createElement('nav')
    sidebar.className = 'settings-sidebar'

    const content = document.createElement('div')
    content.className = 'settings-content'

    const sections = ['Appearance', 'Desktop', 'Storage', 'About']
    let activeSection = 'Appearance'

    const renderSidebar = () => {
      sidebar.innerHTML = ''
      for (const section of sections) {
        const btn = document.createElement('button')
        btn.className = `settings-nav-item${section === activeSection ? ' active' : ''}`
        btn.textContent = section
        btn.addEventListener('click', () => {
          activeSection = section
          renderSidebar()
          renderContent()
        })
        sidebar.append(btn)
      }
    }

    const renderContent = () => {
      content.innerHTML = ''
      const settings = themeEngine.getSettings()

      if (activeSection === 'Appearance') {
        content.innerHTML = '<h2>Appearance</h2>'

        const themeGroup = document.createElement('div')
        themeGroup.className = 'settings-group'
        themeGroup.innerHTML = '<label>Theme</label>'
        const themeRow = document.createElement('div')
        themeRow.className = 'settings-row'
        for (const theme of ['dark', 'light'] as const) {
          const btn = document.createElement('button')
          btn.className = `settings-chip${settings.theme === theme ? ' active' : ''}`
          btn.textContent = theme.charAt(0).toUpperCase() + theme.slice(1)
          btn.addEventListener('click', () => { themeEngine.setTheme(theme); renderContent() })
          themeRow.append(btn)
        }
        themeGroup.append(themeRow)
        content.append(themeGroup)

        const accentGroup = document.createElement('div')
        accentGroup.className = 'settings-group'
        accentGroup.innerHTML = '<label>Accent color</label>'
        const accentRow = document.createElement('div')
        accentRow.className = 'settings-row'
        for (const accent of ACCENTS) {
          const swatch = document.createElement('button')
          swatch.className = `settings-swatch${settings.accentColor === accent.color ? ' active' : ''}`
          swatch.style.background = accent.color
          swatch.title = accent.label
          swatch.addEventListener('click', () => { themeEngine.setAccentColor(accent.color); renderContent() })
          accentRow.append(swatch)
        }
        accentGroup.append(accentRow)
        content.append(accentGroup)

        const dockGroup = document.createElement('div')
        dockGroup.className = 'settings-group'
        dockGroup.innerHTML = `<label>Dock icon size: ${settings.dockSize}px</label>`
        const slider = document.createElement('input')
        slider.type = 'range'
        slider.min = '40'
        slider.max = '72'
        slider.value = String(settings.dockSize)
        slider.addEventListener('input', () => {
          themeEngine.setDockSize(Number(slider.value))
          dockGroup.querySelector('label')!.textContent = `Dock icon size: ${slider.value}px`
        })
        dockGroup.append(slider)
        content.append(dockGroup)
      }

      if (activeSection === 'Desktop') {
        content.innerHTML = '<h2>Desktop</h2>'
        const wpGroup = document.createElement('div')
        wpGroup.className = 'settings-group'
        wpGroup.innerHTML = '<label>Wallpaper</label>'
        const grid = document.createElement('div')
        grid.className = 'wallpaper-grid'

        for (const wp of WALLPAPERS) {
          const card = document.createElement('button')
          card.className = `wallpaper-card wallpaper-card--${wp.id}${settings.wallpaper === wp.id ? ' active' : ''}`
          card.innerHTML = `<div class="wallpaper-preview"></div><span>${wp.label}</span>`
          card.addEventListener('click', () => { themeEngine.setWallpaper(wp.id); renderContent() })
          grid.append(card)
        }

        const customCard = document.createElement('button')
        customCard.className = `wallpaper-card wallpaper-card--custom${settings.wallpaper === 'custom' ? ' active' : ''}`
        const customPreview = document.createElement('div')
        customPreview.className = 'wallpaper-preview wallpaper-preview--custom'
        if (settings.customWallpaper) {
          customPreview.style.backgroundImage = `url("${settings.customWallpaper}")`
        } else {
          customPreview.classList.add('wallpaper-preview--empty')
        }
        customCard.append(customPreview, Object.assign(document.createElement('span'), { textContent: 'Custom' }))
        customCard.addEventListener('click', () => {
          if (settings.customWallpaper) {
            themeEngine.setCustomWallpaper(settings.customWallpaper)
            renderContent()
          }
        })
        grid.append(customCard)

        wpGroup.append(grid)
        content.append(wpGroup)

        const customGroup = document.createElement('div')
        customGroup.className = 'settings-group wallpaper-custom-section'
        customGroup.innerHTML = '<label>Custom wallpaper</label>'

        const urlRow = document.createElement('div')
        urlRow.className = 'wallpaper-url-row'
        const urlInput = document.createElement('input')
        urlInput.type = 'url'
        urlInput.className = 'wallpaper-url-input'
        urlInput.placeholder = 'Paste image URL (https://…)'
        const urlBtn = document.createElement('button')
        urlBtn.className = 'settings-chip'
        urlBtn.textContent = 'Apply URL'
        urlBtn.addEventListener('click', async () => {
          const normalized = normalizeWallpaperUrl(urlInput.value)
          if (!normalized) {
            await showAlert({ title: 'Invalid URL', message: 'Enter a valid http:// or https:// image link.' })
            return
          }
          themeEngine.setCustomWallpaper(normalized)
          urlInput.value = ''
          notificationService.push('Wallpaper updated', 'Custom image applied')
          renderContent()
        })
        urlInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') urlBtn.click()
        })
        urlRow.append(urlInput, urlBtn)

        const uploadRow = document.createElement('div')
        uploadRow.className = 'settings-row'
        const uploadBtn = document.createElement('button')
        uploadBtn.className = 'settings-chip'
        uploadBtn.textContent = 'Upload image'
        uploadBtn.addEventListener('click', async () => {
          const files = await openFilePicker('image/jpeg,image/png,image/gif,image/webp,image/bmp', false)
          if (!files?.[0]) return
          const dataUrl = await readWallpaperFile(files[0])
          if (!dataUrl) {
            await showAlert({
              title: 'Upload failed',
              message: 'Use a JPG, PNG, GIF, or WebP under 3 MB.',
            })
            return
          }
          themeEngine.setCustomWallpaper(dataUrl)
          notificationService.push('Wallpaper updated', files[0].name)
          renderContent()
        })

        const removeBtn = document.createElement('button')
        removeBtn.className = 'settings-chip'
        removeBtn.textContent = 'Remove custom'
        removeBtn.disabled = !settings.customWallpaper
        removeBtn.addEventListener('click', () => {
          themeEngine.clearCustomWallpaper()
          notificationService.push('Wallpaper', 'Custom wallpaper removed')
          renderContent()
        })

        uploadRow.append(uploadBtn, removeBtn)

        const hint = document.createElement('p')
        hint.className = 'wallpaper-hint'
        hint.textContent = 'Supports JPG, PNG, GIF, and WebP. GIFs animate on desktop and login screen.'

        customGroup.append(urlRow, uploadRow, hint)
        content.append(customGroup)
      }

      if (activeSection === 'Storage') {
        content.innerHTML = '<h2>Storage</h2>'
        const usage = fileSystem.getUsage()
        const vfsSize = new Blob([fileSystem.exportSnapshot()]).size

        const info = document.createElement('div')
        info.className = 'settings-group storage-info'
        info.innerHTML = `
          <label>Virtual file system</label>
          <p class="storage-stat">${usage.items} items · ~${formatBytes(usage.bytes)} content</p>
          <p class="storage-stat">Snapshot size: ~${formatBytes(vfsSize)}</p>
          <p class="storage-stat storage-quota">Loading browser quota…</p>
        `
        content.append(info)

        getStorageEstimate().then((est) => {
          const el = info.querySelector('.storage-quota')
          if (el) {
            el.textContent = est.quota
              ? `Browser storage: ~${formatBytes(est.used)} used of ~${formatBytes(est.quota)}`
              : 'Browser storage quota unavailable'
          }
        })

        const actions = document.createElement('div')
        actions.className = 'settings-group'
        actions.innerHTML = '<label>Actions</label>'

        const clearDl = document.createElement('button')
        clearDl.className = 'settings-chip'
        clearDl.textContent = 'Clear Downloads'
        clearDl.addEventListener('click', async () => {
          const ok = await showConfirm({
            title: 'Clear Downloads',
            message: 'Remove all files in Downloads? This cannot be undone.',
            confirmLabel: 'Clear',
            danger: true,
          })
          if (ok) {
            fileSystem.clearDownloads()
            notificationService.push('Downloads cleared', 'All files removed')
          }
        })

        const exportBtn = document.createElement('button')
        exportBtn.className = 'settings-chip'
        exportBtn.textContent = 'Export VFS snapshot'
        exportBtn.addEventListener('click', () => {
          try {
            const json = fileSystem.exportSnapshot()
            const blob = new Blob([json], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'ztionixos-vfs-backup.json'
            a.click()
            URL.revokeObjectURL(url)
            notificationService.push('Exported', 'VFS snapshot saved')
          } catch {
            notificationService.push('Export failed', 'Storage quota exceeded')
          }
        })

        const importBtn = document.createElement('button')
        importBtn.className = 'settings-chip'
        importBtn.textContent = 'Import VFS snapshot'
        importBtn.addEventListener('click', async () => {
          const files = await openFilePicker('application/json', false)
          if (!files?.[0]) return
          try {
            const text = await files[0].text()
            if (fileSystem.importSnapshot(text)) {
              notificationService.push('Imported', 'VFS snapshot restored')
            } else {
              void showAlert({ title: 'Import failed', message: 'Invalid snapshot file.' })
            }
          } catch {
            notificationService.push('Import failed', 'Could not read snapshot')
          }
        })

        const resetBtn = document.createElement('button')
        resetBtn.className = 'settings-chip storage-danger'
        resetBtn.textContent = 'Reset VFS'
        resetBtn.addEventListener('click', async () => {
          const ok = await showConfirm({
            title: 'Reset VFS',
            message: 'Reset the virtual file system to defaults? Desktop files and folders will be restored. This cannot be undone.',
            confirmLabel: 'Reset',
            danger: true,
          })
          if (ok) {
            fileSystem.reset()
            notificationService.push('VFS reset', 'File system restored to defaults')
          }
        })

        const resetAllBtn = document.createElement('button')
        resetAllBtn.className = 'settings-chip storage-danger'
        resetAllBtn.textContent = 'Reset All'
        resetAllBtn.addEventListener('click', async () => {
          const ok = await showConfirm({
            title: 'Reset All',
            message: 'Reset everything to factory defaults? This clears files, desktop layout, settings, recent apps, and notifications. The page will reload.',
            confirmLabel: 'Reset All',
            danger: true,
          })
          if (ok) {
            resetAll()
            window.location.reload()
          }
        })

        const row = document.createElement('div')
        row.className = 'settings-row'
        row.append(clearDl, exportBtn, importBtn, resetBtn, resetAllBtn)
        actions.append(row)
        content.append(actions)

        const note = document.createElement('p')
        note.className = 'storage-note'
        note.textContent = 'Files are stored in IndexedDB with localStorage migration fallback. Large imports may hit browser quota limits.'
        content.append(note)
      }

      if (activeSection === 'About') {
        content.innerHTML = `
          <h2>About ZtionixOS</h2>
          <div class="about-card">
            <div class="about-logo">${icon('logo', 'about-logo-mark')}</div>
            <h3>ZtionixOS</h3>
            <p>Version 1.0.0</p>
            <p>A desktop environment that runs in your browser.</p>
            <p class="about-meta">Built with Vite and TypeScript.</p>
          </div>
        `
      }
    }

    renderSidebar()
    renderContent()
    root.append(sidebar, content)
    return root
  },
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
