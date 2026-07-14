import type { AppManifest } from '../../types'

const STORAGE_KEY = 'ztionixos-notes'

const COLORS = ['#fff9c4', '#ffcdd2', '#c8e6c9', '#bbdefb', '#e1bee7', '#ffe0b2'] // sticky note palette

type NoteData = { text: string; color: string }

function load(): NoteData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      return JSON.parse(raw) as NoteData
    }
  } catch {
  }
  return { text: '', color: COLORS[0] }
}

function save(data: NoteData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) // autosave on every keystroke would be nicer, this is fine for now
}

export const notesApp: AppManifest = {
  id: 'notes',
  name: 'Notes',
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg>`,
  pinned: true,
  singleton: true,
  window: { width: 300, height: 340, minWidth: 240, minHeight: 260, centered: true },
  launch: () => {
    const data = load()
    const root = document.createElement('div')
    root.className = 'app-notes'

    const toolbar = document.createElement('div')
    toolbar.className = 'notes-colors'

    const area = document.createElement('textarea')
    area.className = 'notes-area'
    area.placeholder = 'Jot something down…'
    area.value = data.text
    area.spellcheck = true

    const applyColor = (hex: string) => {
      data.color = hex
      root.style.setProperty('--note-bg', hex)
      save(data)
    }

    applyColor(data.color)

    for (const hex of COLORS) {
      const sw = document.createElement('button')
      sw.type = 'button'
      sw.className = 'notes-swatch'
      sw.style.background = hex
      sw.title = 'Note color'
      if (hex === data.color) sw.classList.add('active')
      sw.addEventListener('click', () => {
        toolbar.querySelectorAll('.notes-swatch').forEach((b) => b.classList.remove('active'))
        sw.classList.add('active')
        applyColor(hex)
      })
      toolbar.append(sw)
    }

    let saveTimer: number | null = null
    area.addEventListener('input', () => {
      data.text = area.value
      if (saveTimer) window.clearTimeout(saveTimer)
      saveTimer = window.setTimeout(() => save(data), 300)
    })

    root.append(toolbar, area)
    return root
  },
}
