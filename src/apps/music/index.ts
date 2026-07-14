import type { AppManifest } from '../../types'
import { fileSystem } from '../../core/fileSystem'
import { eventBus } from '../../core/eventBus'
import { notificationService } from '../../core/notificationService'
import { importFilesToVfs, openFilePicker } from '../../utils/fileBridge'
import { icon } from '../../utils/icons'

const PLAYLISTS_KEY = 'ztionixos-playlists'
const LEGACY_PLAYLIST_KEY = 'ztionixos-playlist'

interface Track {
  path: string
  name: string
}

interface Playlist {
  id: string
  name: string
  tracks: Track[]
}

function loadPlaylists(): Playlist[] {
  try {
    const stored = localStorage.getItem(PLAYLISTS_KEY)
    if (stored) return JSON.parse(stored) as Playlist[]
  } catch { /* empty */ }

  const legacy = localStorage.getItem(LEGACY_PLAYLIST_KEY)
  if (legacy) {
    const tracks = JSON.parse(legacy) as Track[]
    return [
      { id: 'library', name: 'Library', tracks },
      { id: 'downloads', name: 'Downloads', tracks: [] },
    ]
  }

  return [
    { id: 'library', name: 'Library', tracks: [] },
    { id: 'downloads', name: 'Downloads', tracks: [] },
  ]
}

function savePlaylists(playlists: Playlist[]): void {
  localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists))
}

export const musicApp: AppManifest = {
  id: 'music',
  name: 'ZMusic',
  icon: icon('music'),
  pinned: true,
  singleton: true,
  window: { width: 720, height: 520, minWidth: 560, minHeight: 420, centered: true },
  launch: () => {
    const root = document.createElement('div')
    root.className = 'app-zmusic'

    const playlists = loadPlaylists()
    let activePlaylistId = playlists[0]?.id ?? 'library'
    let currentIndex = -1

    const audio = document.createElement('audio')
    audio.className = 'zmusic-audio'

    const sidebar = document.createElement('aside')
    sidebar.className = 'zmusic-sidebar'

    const sidebarHeader = document.createElement('div')
    sidebarHeader.className = 'zmusic-sidebar-header'
    sidebarHeader.innerHTML = '<span class="zmusic-logo">ZMusic</span>'

    const playlistNav = document.createElement('nav')
    playlistNav.className = 'zmusic-playlist-nav'

    const importBtn = document.createElement('button')
    importBtn.className = 'zmusic-import-btn'
    importBtn.textContent = '+ Import audio'

    const main = document.createElement('main')
    main.className = 'zmusic-main'

    const mainHeader = document.createElement('div')
    mainHeader.className = 'zmusic-main-header'

    const trackList = document.createElement('div')
    trackList.className = 'zmusic-track-list'

    const playerBar = document.createElement('footer')
    playerBar.className = 'zmusic-player'

    const nowPlaying = document.createElement('div')
    nowPlaying.className = 'zmusic-now-playing'
    nowPlaying.innerHTML = '<span class="zmusic-track-title">No track selected</span><span class="zmusic-track-sub">ZMusic</span>'

    const centerControls = document.createElement('div')
    centerControls.className = 'zmusic-center'

    const transport = document.createElement('div')
    transport.className = 'zmusic-transport'

    const prevBtn = document.createElement('button')
    prevBtn.className = 'zmusic-btn'
    prevBtn.textContent = '⏮'
    prevBtn.title = 'Previous'

    const playBtn = document.createElement('button')
    playBtn.className = 'zmusic-btn zmusic-btn--play'
    playBtn.textContent = '▶'
    playBtn.title = 'Play'

    const nextBtn = document.createElement('button')
    nextBtn.className = 'zmusic-btn'
    nextBtn.textContent = '⏭'
    nextBtn.title = 'Next'

    transport.append(prevBtn, playBtn, nextBtn)

    const seekWrap = document.createElement('div')
    seekWrap.className = 'zmusic-seek-wrap'

    const timeCurrent = document.createElement('span')
    timeCurrent.className = 'zmusic-time'
    timeCurrent.textContent = '0:00'

    const seekBar = document.createElement('input')
    seekBar.type = 'range'
    seekBar.className = 'zmusic-seek'
    seekBar.min = '0'
    seekBar.max = '100'
    seekBar.value = '0'

    const timeTotal = document.createElement('span')
    timeTotal.className = 'zmusic-time'
    timeTotal.textContent = '0:00'

    seekWrap.append(timeCurrent, seekBar, timeTotal)
    centerControls.append(transport, seekWrap)

    const rightControls = document.createElement('div')
    rightControls.className = 'zmusic-right'

    const volIcon = document.createElement('span')
    volIcon.className = 'zmusic-vol-icon'
    volIcon.textContent = '🔊'

    const volumeBar = document.createElement('input')
    volumeBar.type = 'range'
    volumeBar.className = 'zmusic-volume'
    volumeBar.min = '0'
    volumeBar.max = '100'
    volumeBar.value = '80'
    volumeBar.title = 'Volume'

    rightControls.append(volIcon, volumeBar)

    playerBar.append(nowPlaying, centerControls, rightControls)

    const getActivePlaylist = () => playlists.find((p) => p.id === activePlaylistId) ?? playlists[0]

    const getTracks = (): Track[] => getActivePlaylist()?.tracks ?? []

    const persist = () => savePlaylists(playlists)

    const formatTime = (s: number) => {
      if (!Number.isFinite(s)) return '0:00'
      const m = Math.floor(s / 60)
      const sec = Math.floor(s % 60)
      return `${m}:${sec.toString().padStart(2, '0')}`
    }

    const renderPlaylistNav = () => {
      playlistNav.innerHTML = ''
      for (const pl of playlists) {
        const btn = document.createElement('button')
        btn.className = `zmusic-pl-item${pl.id === activePlaylistId ? ' active' : ''}`
        btn.innerHTML = `<span class="zmusic-pl-icon">♫</span><span>${pl.name}</span><span class="zmusic-pl-count">${pl.tracks.length}</span>`
        btn.addEventListener('click', () => {
          activePlaylistId = pl.id
          currentIndex = -1
          renderPlaylistNav()
          renderTrackList()
          updateNowPlaying()
        })
        playlistNav.append(btn)
      }
    }

    const updateNowPlaying = () => {
      const tracks = getTracks()
      const titleEl = nowPlaying.querySelector('.zmusic-track-title')!
      const subEl = nowPlaying.querySelector('.zmusic-track-sub')!
      if (currentIndex >= 0 && tracks[currentIndex]) {
        titleEl.textContent = tracks[currentIndex].name
        subEl.textContent = getActivePlaylist()?.name ?? 'ZMusic'
      } else {
        titleEl.textContent = 'No track selected'
        subEl.textContent = getActivePlaylist()?.name ?? 'ZMusic'
      }
    }

    const renderTrackList = () => {
      const pl = getActivePlaylist()
      mainHeader.textContent = pl?.name ?? 'Library'
      trackList.innerHTML = ''
      const tracks = getTracks()

      if (tracks.length === 0) {
        trackList.innerHTML = '<div class="zmusic-empty">No tracks in this playlist. Import audio to get started.</div>'
        return
      }

      tracks.forEach((track, i) => {
        const row = document.createElement('button')
        row.className = `zmusic-track${i === currentIndex ? ' active' : ''}`
        row.innerHTML = `<span class="zmusic-track-num">${i + 1}</span><span class="zmusic-track-name">${track.name}</span>`
        row.addEventListener('click', () => loadTrack(i))
        trackList.append(row)
      })
    }

    const loadTrack = (index: number) => {
      const tracks = getTracks()
      if (index < 0 || index >= tracks.length) return
      currentIndex = index
      const track = tracks[index]
      const dataUrl = fileSystem.readAsDataUrl(track.path)
      if (!dataUrl) return
      audio.src = dataUrl
      updateNowPlaying()
      renderTrackList()
      audio.play().catch(() => { /* autoplay blocked */ })
      playBtn.textContent = '⏸'
    }

    const scanDownloads = () => {
      const dl = playlists.find((p) => p.id === 'downloads')
      if (!dl) return
      const entries = fileSystem.list(fileSystem.getDownloads())
      let added = false
      for (const e of entries) {
        if (e.type === 'file' && (e.mime?.startsWith('audio/') || /\.(mp3|wav|ogg)$/i.test(e.name))) {
          if (!dl.tracks.find((t) => t.path === e.path)) {
            dl.tracks.push({ path: e.path, name: e.name })
            added = true
          }
        }
      }
      if (added) {
        persist()
        if (activePlaylistId === 'downloads') renderTrackList()
        renderPlaylistNav()
      }
    }

    audio.addEventListener('timeupdate', () => {
      if (!audio.duration) return
      seekBar.value = String((audio.currentTime / audio.duration) * 100)
      timeCurrent.textContent = formatTime(audio.currentTime)
      timeTotal.textContent = formatTime(audio.duration)
    })

    seekBar.addEventListener('input', () => {
      if (audio.duration) audio.currentTime = (Number(seekBar.value) / 100) * audio.duration
    })

    volumeBar.addEventListener('input', () => {
      audio.volume = Number(volumeBar.value) / 100
      volIcon.textContent = audio.volume === 0 ? '🔇' : audio.volume < 0.5 ? '🔉' : '🔊'
    })
    audio.volume = 0.8

    playBtn.addEventListener('click', () => {
      const tracks = getTracks()
      if (currentIndex < 0 && tracks.length > 0) loadTrack(0)
      else if (audio.paused) { audio.play(); playBtn.textContent = '⏸' }
      else { audio.pause(); playBtn.textContent = '▶' }
    })

    prevBtn.addEventListener('click', () => {
      const tracks = getTracks()
      if (tracks.length === 0) return
      loadTrack((currentIndex - 1 + tracks.length) % tracks.length)
    })

    nextBtn.addEventListener('click', () => {
      const tracks = getTracks()
      if (tracks.length === 0) return
      loadTrack((currentIndex + 1) % tracks.length)
    })

    audio.addEventListener('ended', () => {
      const tracks = getTracks()
      if (tracks.length > 0) loadTrack((currentIndex + 1) % tracks.length)
    })

    importBtn.addEventListener('click', async () => {
      const files = await openFilePicker('audio/*')
      if (!files) return
      try {
        const imported = await importFilesToVfs(fileSystem.getDownloads(), files)
        const library = playlists.find((p) => p.id === 'library')!
        for (const path of imported) {
          const track = { path, name: path.split('/').pop() ?? path }
          if (!library.tracks.find((t) => t.path === path)) library.tracks.push(track)
        }
        scanDownloads()
        persist()
        renderPlaylistNav()
        renderTrackList()
        notificationService.push('Imported', `${imported.length} audio file(s)`)
      } catch {
        notificationService.push('Import failed', 'Storage quota may be exceeded')
      }
    })

    eventBus.on('filesystem:change', scanDownloads)

    const init = (data: unknown) => {
      const payload = data as { path?: string }
      if (payload?.path && fileSystem.isFile(payload.path)) {
        const name = payload.path.split('/').pop() ?? payload.path
        const library = playlists.find((p) => p.id === 'library')!
        if (!library.tracks.find((t) => t.path === payload.path)) {
          library.tracks.push({ path: payload.path, name })
          persist()
        }
        activePlaylistId = 'library'
        renderPlaylistNav()
        loadTrack(library.tracks.findIndex((t) => t.path === payload.path))
      }
    }

    sidebar.append(sidebarHeader, playlistNav, importBtn)
    main.append(mainHeader, trackList)
    root.append(sidebar, main, playerBar, audio)

    scanDownloads()
    renderPlaylistNav()
    renderTrackList()

    const el = root as HTMLElement & { init?: (data: unknown) => void }
    el.init = init
    return root
  },
}
