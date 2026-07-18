import type { AppManifest } from '../../types'
import { fileSystem } from '../../core/fileSystem'
import { notificationService } from '../../core/notificationService'
import { icon } from '../../utils/icons'

interface Slide {
  title: string
  body: string
}

const DEFAULT_SLIDES: Slide[] = [
  { title: 'Untitled Presentation', body: 'Click Edit to change this slide.' },
]

export const impressApp: AppManifest = {
  id: 'impress',
  name: 'Impress',
  icon: icon('impress'),
  pinned: false,
  singleton: false,
  window: { width: 800, height: 540, minWidth: 520, minHeight: 380, centered: true },
  launch: (ctx) => {
    const root = document.createElement('div')
    root.className = 'app-impress'

    let slides: Slide[] = DEFAULT_SLIDES.map((s) => ({ ...s }))
    let index = 0
    let currentPath: string | null = null
    let presenting = false

    const toolbar = document.createElement('div')
    toolbar.className = 'app-toolbar impress-toolbar'

    const prevBtn = document.createElement('button')
    prevBtn.className = 'app-btn'
    prevBtn.textContent = '←'
    const nextBtn = document.createElement('button')
    nextBtn.className = 'app-btn'
    nextBtn.textContent = '→'
    const addBtn = document.createElement('button')
    addBtn.className = 'app-btn'
    addBtn.textContent = '+ Slide'
    const presentBtn = document.createElement('button')
    presentBtn.className = 'app-btn'
    presentBtn.textContent = 'Present'
    const saveBtn = document.createElement('button')
    saveBtn.className = 'app-btn'
    saveBtn.textContent = 'Save'
    const counter = document.createElement('span')
    counter.className = 'impress-counter'

    toolbar.append(prevBtn, nextBtn, addBtn, presentBtn, saveBtn, counter)

    const stage = document.createElement('div')
    stage.className = 'impress-stage'

    const titleInput = document.createElement('input')
    titleInput.className = 'impress-title'
    titleInput.placeholder = 'Slide title'

    const bodyInput = document.createElement('textarea')
    bodyInput.className = 'impress-body'
    bodyInput.placeholder = 'Slide content…'

    stage.append(titleInput, bodyInput)
    root.append(toolbar, stage)

    const render = () => {
      const slide = slides[index] ?? slides[0]
      titleInput.value = slide.title
      bodyInput.value = slide.body
      counter.textContent = `${index + 1} / ${slides.length}`
      titleInput.readOnly = presenting
      bodyInput.readOnly = presenting
      stage.classList.toggle('impress-stage--present', presenting)
      presentBtn.textContent = presenting ? 'Exit' : 'Present'
    }

    const commit = () => {
      if (!slides[index]) return
      slides[index].title = titleInput.value
      slides[index].body = bodyInput.value
    }

    titleInput.addEventListener('input', commit)
    bodyInput.addEventListener('input', commit)

    prevBtn.addEventListener('click', () => {
      commit()
      index = (index - 1 + slides.length) % slides.length
      render()
    })

    nextBtn.addEventListener('click', () => {
      commit()
      index = (index + 1) % slides.length
      render()
    })

    addBtn.addEventListener('click', () => {
      commit()
      slides.push({ title: 'New slide', body: '' })
      index = slides.length - 1
      render()
    })

    presentBtn.addEventListener('click', () => {
      commit()
      presenting = !presenting
      render()
    })

    saveBtn.addEventListener('click', () => {
      commit()
      const path = currentPath ?? `${fileSystem.getDocuments()}/Presentation-${Date.now()}.json`
      const json = JSON.stringify({ slides }, null, 2)
      if (fileSystem.write(path, json, 'application/json')) {
        currentPath = path
        ctx.setTitle('Impress — ' + (path.split('/').pop() ?? 'presentation'))
        notificationService.push('Saved', path.split('/').pop() ?? 'presentation')
      } else {
        notificationService.push('Save failed', 'Could not write file')
      }
    })

    const init = (data: unknown) => {
      const payload = data as { path?: string }
      if (!payload?.path) return
      const content = fileSystem.read(payload.path)
      if (content == null) return
      try {
        const parsed = JSON.parse(content) as { slides?: Slide[] }
        if (parsed.slides && parsed.slides.length > 0) {
          slides = parsed.slides
          index = 0
          currentPath = payload.path
          ctx.setTitle('Impress — ' + (payload.path.split('/').pop() ?? 'presentation'))
          render()
        }
      } catch {
        notificationService.push('Open failed', 'Not a valid Impress file')
      }
    }

    render()
    const el = root as HTMLElement & { init?: (data: unknown) => void }
    el.init = init
    return root
  },
}
