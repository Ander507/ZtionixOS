import type { AppManifest } from '../../types'
import { icon } from '../../utils/icons'

const BOOKMARKS_KEY = 'ztionixos-browser-bookmarks'

function loadBookmarks(): string[] {
  try {
    const s = localStorage.getItem(BOOKMARKS_KEY)
    if (s) {
      const urls = JSON.parse(s) as string[]
      const cleaned = urls.filter((u) => !u.includes('news.ycombinator.com'))
      if (!cleaned.includes('https://ztionix-os.vercel.app/')) {
        cleaned.unshift('https://ztionix-os.vercel.app/')
      }
      return cleaned
    }
  } catch { /* */ }
  return ['https://ztionix-os.vercel.app/', 'https://example.com', 'https://en.wikipedia.org']
}

function saveBookmarks(urls: string[]): void {
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(urls.slice(0, 12)))
}

type BrowserView = 'home' | 'frame' | 'fallback'

export const browserApp: AppManifest = {
  id: 'browser',
  name: 'Browser',
  icon: icon('browser'),
  pinned: true,
  singleton: false,
  window: { width: 900, height: 600, minWidth: 480, minHeight: 320 },
  launch: () => {
    const root = document.createElement('div')
    root.className = 'app-browser'

    const bookmarks = loadBookmarks()
    saveBookmarks(bookmarks)

    const toolbar = document.createElement('div')
    toolbar.className = 'app-toolbar browser-toolbar'

    const backBtn = document.createElement('button')
    backBtn.className = 'app-btn'
    backBtn.textContent = '←'

    const forwardBtn = document.createElement('button')
    forwardBtn.className = 'app-btn'
    forwardBtn.textContent = '→'

    const refreshBtn = document.createElement('button')
    refreshBtn.className = 'app-btn'
    refreshBtn.textContent = '↻'

    const homeBtn = document.createElement('button')
    homeBtn.className = 'app-btn'
    homeBtn.textContent = '⌂'
    homeBtn.title = 'Home'

    const address = document.createElement('input')
    address.className = 'browser-address'
    address.placeholder = 'Enter URL…'

    const goBtn = document.createElement('button')
    goBtn.className = 'app-btn'
    goBtn.textContent = 'Go'

    const newTabBtn = document.createElement('button')
    newTabBtn.className = 'app-btn'
    newTabBtn.textContent = 'New tab'
    newTabBtn.title = 'Open in new browser tab'

    const bookmarkBtn = document.createElement('button')
    bookmarkBtn.className = 'app-btn'
    bookmarkBtn.textContent = '★'
    bookmarkBtn.title = 'Bookmark this page'

    toolbar.append(backBtn, forwardBtn, refreshBtn, homeBtn, address, goBtn, newTabBtn, bookmarkBtn)

    const bookmarkBar = document.createElement('div')
    bookmarkBar.className = 'browser-bookmarks'

    const notice = document.createElement('div')
    notice.className = 'browser-notice'
    notice.textContent = 'Some sites block iframes with X-Frame-Options. Use New tab if a page stays blank.'

    const frameWrap = document.createElement('div')
    frameWrap.className = 'browser-frame-wrap'

    const homepage = document.createElement('div')
    homepage.className = 'browser-homepage'
    homepage.innerHTML = `
      <div class="browser-homepage-inner">
        <h2>Ztionix Browser</h2>
        <p>Enter a URL above or select a bookmark to get started.</p>
      </div>
    `

    const iframe = document.createElement('iframe')
    iframe.className = 'browser-frame browser-view--hidden'
    iframe.title = 'Browser content'
    iframe.referrerPolicy = 'no-referrer-when-downgrade'
    iframe.setAttribute('allow', 'fullscreen')

    const fallback = document.createElement('div')
    fallback.className = 'browser-fallback browser-view--hidden'
    fallback.innerHTML = '<p>This site refused to load in the embedded browser. Try New tab.</p>'

    frameWrap.append(homepage, iframe, fallback)
    root.append(toolbar, bookmarkBar, notice, frameWrap)

    const history: string[] = []
    let historyIdx = -1
    let onHomepage = true
    let loadTimer: number | null = null

    const showView = (view: BrowserView) => {
      homepage.classList.toggle('browser-view--hidden', view !== 'home')
      iframe.classList.toggle('browser-view--hidden', view !== 'frame')
      fallback.classList.toggle('browser-view--hidden', view !== 'fallback')
      onHomepage = view === 'home'
    }

    const showHomepage = () => {
      showView('home')
      address.value = ''
      iframe.removeAttribute('src')
    }

    const renderBookmarks = () => {
      bookmarkBar.innerHTML = ''
      for (let b = 0; b < bookmarks.length; b++) {
        const url = bookmarks[b]
        const btn = document.createElement('button')
        btn.className = 'browser-bookmark'
        try {
          const u = new URL(url)
          btn.textContent = u.hostname
        } catch {
          btn.textContent = url
        }
        btn.title = url
        btn.addEventListener('click', () => {
          navigate(url)
        })
        bookmarkBar.append(btn)
      }
    }

    const normalizeUrl = (raw: string): string => {
      const trimmed = raw.trim()
      if (!trimmed) return 'about:blank'
      if (trimmed.indexOf('http://') === 0) return trimmed
      if (trimmed.indexOf('https://') === 0) return trimmed
      return 'https://' + trimmed
    }

    const navigate = (url: string, pushHistory = true) => {
      const normalized = normalizeUrl(url)
      if (normalized === 'about:blank') {
        showHomepage()
        return
      }

      address.value = normalized
      showView('frame')

      if (pushHistory) {
        history.splice(historyIdx + 1)
        history.push(normalized)
        historyIdx = history.length - 1
      }

      if (loadTimer) window.clearTimeout(loadTimer)
      iframe.src = normalized
    }

    iframe.addEventListener('load', () => {
      if (onHomepage) return
      if (loadTimer) window.clearTimeout(loadTimer)
      try {
        const doc = iframe.contentDocument
        if (doc && doc.body && doc.body.innerHTML.trim() === '') {
          showView('fallback')
        }
      } catch {
        // cross-origin load usually means it worked
      }
    })

    iframe.addEventListener('error', () => {
      if (!onHomepage) showView('fallback')
    })

    goBtn.addEventListener('click', () => {
      if (!address.value.trim()) showHomepage()
      else navigate(address.value)
    })

    address.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (!address.value.trim()) showHomepage()
        else navigate(address.value)
      }
    })

    homeBtn.addEventListener('click', showHomepage)

    newTabBtn.addEventListener('click', () => {
      const url = address.value.trim() ? normalizeUrl(address.value) : 'about:blank'
      if (url !== 'about:blank') window.open(url, '_blank', 'noopener')
    })

    bookmarkBtn.addEventListener('click', () => {
      if (onHomepage || !address.value.trim()) return
      const url = normalizeUrl(address.value)
      if (!bookmarks.includes(url)) {
        bookmarks.unshift(url)
        saveBookmarks(bookmarks)
        renderBookmarks()
      }
    })

    backBtn.addEventListener('click', () => {
      if (historyIdx > 0) {
        historyIdx--
        const url = history[historyIdx]
        if (url === 'about:blank') showHomepage()
        else navigate(url, false)
      }
    })

    forwardBtn.addEventListener('click', () => {
      if (historyIdx < history.length - 1) {
        historyIdx++
        const url = history[historyIdx]
        if (url === 'about:blank') showHomepage()
        else navigate(url, false)
      }
    })

    refreshBtn.addEventListener('click', () => {
      if (onHomepage) return
      navigate(address.value, false)
    })

    renderBookmarks()
    showHomepage()
    return root
  },
}
