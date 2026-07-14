import type { AppManifest } from '../../types'
import { fileSystem } from '../../core/fileSystem'
import { notificationService } from '../../core/notificationService'
import { showAlert } from '../../shell/confirmDialog'
import { icon } from '../../utils/icons'

const CANVAS_BG = '#1a1a1e'

type Tool = 'brush' | 'eraser' | 'rect' | 'circle'

export const paintApp: AppManifest = {
  id: 'paint',
  name: 'Paint',
  icon: icon('paint'),
  pinned: true,
  singleton: false,
  window: { width: 720, height: 520, minWidth: 400, minHeight: 300 },
  launch: () => {
    const root = document.createElement('div')
    root.className = 'app-paint'

    let currentPath: string | null = null
    let tool: Tool = 'brush'
    const undoStack: ImageData[] = []
    const MAX_UNDO = 20

    const toolbar = document.createElement('div')
    toolbar.className = 'app-toolbar paint-toolbar'

    const colorInput = document.createElement('input')
    colorInput.type = 'color'
    colorInput.className = 'paint-color'
    colorInput.value = '#c9a96e'
    colorInput.title = 'Color'

    const sizeWrap = document.createElement('div')
    sizeWrap.className = 'paint-size-wrap'
    const sizeLabel = document.createElement('span')
    sizeLabel.className = 'paint-size-label'
    sizeLabel.textContent = '4px'
    const sizeInput = document.createElement('input')
    sizeInput.type = 'range'
    sizeInput.className = 'paint-size'
    sizeInput.min = '1'
    sizeInput.max = '48'
    sizeInput.value = '4'
    sizeInput.title = 'Brush size'
    sizeWrap.append(sizeLabel, sizeInput)

    const brushBtn = document.createElement('button')
    brushBtn.className = 'app-btn active'
    brushBtn.textContent = 'Brush'

    const eraserBtn = document.createElement('button')
    eraserBtn.className = 'app-btn'
    eraserBtn.textContent = 'Eraser'

    const rectBtn = document.createElement('button')
    rectBtn.className = 'app-btn'
    rectBtn.textContent = 'Rect'

    const circleBtn = document.createElement('button')
    circleBtn.className = 'app-btn'
    circleBtn.textContent = 'Circle'

    const undoBtn = document.createElement('button')
    undoBtn.className = 'app-btn'
    undoBtn.textContent = 'Undo'

    const clearBtn = document.createElement('button')
    clearBtn.className = 'app-btn'
    clearBtn.textContent = 'Clear'

    const saveBtn = document.createElement('button')
    saveBtn.className = 'app-btn'
    saveBtn.textContent = 'Save'

    toolbar.append(colorInput, sizeWrap, brushBtn, eraserBtn, rectBtn, circleBtn, undoBtn, clearBtn, saveBtn)

    const canvas = document.createElement('canvas')
    canvas.className = 'paint-canvas'
    canvas.width = 680
    canvas.height = 420

    const ctx = canvas.getContext('2d')!
    const fillBackground = () => {
      ctx.fillStyle = CANVAS_BG
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
    fillBackground()

    let drawing = false
    let shapeStart: { x: number; y: number } | null = null
    let snapshotBeforeShape: ImageData | null = null
    let lastX = 0
    let lastY = 0

    const toolBtns: Record<Tool, HTMLButtonElement> = {
      brush: brushBtn,
      eraser: eraserBtn,
      rect: rectBtn,
      circle: circleBtn,
    }

    const setTool = (t: Tool) => {
      tool = t
      for (const [key, btn] of Object.entries(toolBtns)) {
        btn.classList.toggle('active', key === t)
      }
    }

    const pushUndo = () => {
      undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height))
      if (undoStack.length > MAX_UNDO) undoStack.shift()
    }

    const getPos = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      }
    }

    const getStrokeStyle = () => (tool === 'eraser' ? CANVAS_BG : colorInput.value)

    const drawLine = (x: number, y: number) => {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = getStrokeStyle()
      ctx.lineWidth = Number(sizeInput.value)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(lastX, lastY)
      ctx.lineTo(x, y)
      ctx.stroke()
      lastX = x
      lastY = y
    }

    const drawShapePreview = (x: number, y: number) => {
      if (!shapeStart || !snapshotBeforeShape) return
      ctx.putImageData(snapshotBeforeShape, 0, 0)
      const w = x - shapeStart.x
      const h = y - shapeStart.y
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = colorInput.value
      ctx.lineWidth = Number(sizeInput.value)
      ctx.beginPath()
      if (tool === 'rect') {
        ctx.strokeRect(shapeStart.x, shapeStart.y, w, h)
      } else {
        const rx = Math.abs(w) / 2
        const ry = Math.abs(h) / 2
        const cx = shapeStart.x + w / 2
        const cy = shapeStart.y + h / 2
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
        ctx.stroke()
      }
    }

    const finalizeShape = (x: number, y: number) => {
      if (!shapeStart || !snapshotBeforeShape) return
      ctx.putImageData(snapshotBeforeShape, 0, 0)
      const w = x - shapeStart.x
      const h = y - shapeStart.y
      if (Math.abs(w) < 2 && Math.abs(h) < 2) return
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = colorInput.value
      ctx.lineWidth = Number(sizeInput.value)
      ctx.beginPath()
      if (tool === 'rect') {
        ctx.strokeRect(shapeStart.x, shapeStart.y, w, h)
      } else {
        const rx = Math.abs(w) / 2
        const ry = Math.abs(h) / 2
        const cx = shapeStart.x + w / 2
        const cy = shapeStart.y + h / 2
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
        ctx.stroke()
      }
      snapshotBeforeShape = null
      shapeStart = null
    }

    brushBtn.addEventListener('click', () => setTool('brush'))
    eraserBtn.addEventListener('click', () => setTool('eraser'))
    rectBtn.addEventListener('click', () => setTool('rect'))
    circleBtn.addEventListener('click', () => setTool('circle'))

    sizeInput.addEventListener('input', () => {
      sizeLabel.textContent = `${sizeInput.value}px`
    })

    undoBtn.addEventListener('click', () => {
      const prev = undoStack.pop()
      if (prev) ctx.putImageData(prev, 0, 0)
    })

    canvas.addEventListener('pointerdown', (e) => {
      pushUndo()
      drawing = true
      const pos = getPos(e)

      if (tool === 'rect' || tool === 'circle') {
        shapeStart = pos
        snapshotBeforeShape = ctx.getImageData(0, 0, canvas.width, canvas.height)
      } else {
        lastX = pos.x
        lastY = pos.y
      }

      canvas.setPointerCapture(e.pointerId)
    })

    canvas.addEventListener('pointermove', (e) => {
      if (!drawing) return
      const pos = getPos(e)
      if (tool === 'rect' || tool === 'circle') {
        drawShapePreview(pos.x, pos.y)
      } else {
        drawLine(pos.x, pos.y)
      }
    })

    const stopDraw = (e: PointerEvent) => {
      if (!drawing) return
      drawing = false
      if (tool === 'rect' || tool === 'circle') {
        const pos = getPos(e)
        finalizeShape(pos.x, pos.y)
      }
    }

    canvas.addEventListener('pointerup', stopDraw)
    canvas.addEventListener('pointercancel', () => { drawing = false; shapeStart = null })

    clearBtn.addEventListener('click', () => {
      pushUndo()
      fillBackground()
    })

    saveBtn.addEventListener('click', async () => {
      const dataUrl = canvas.toDataURL('image/png')
      const base64 = dataUrl.split(',')[1]
      let path = currentPath
      if (!path) {
        path = `${fileSystem.getDownloads()}/drawing-${Date.now()}.png`
      }
      try {
        if (fileSystem.writeBinary(path, base64, 'image/png')) {
          currentPath = path
          notificationService.push('Saved', path.split('/').pop() ?? 'image')
        } else {
          await showAlert({ title: 'Save failed', message: 'Could not save image.' })
        }
      } catch {
        notificationService.push('Save failed', 'Storage quota may be exceeded')
      }
    })

    const init = (data: unknown) => {
      const payload = data as { path?: string }
      if (!payload?.path) return
      currentPath = payload.path
      const dataUrl = fileSystem.readAsDataUrl(payload.path)
      if (!dataUrl) return
      const img = new Image()
      img.onload = () => {
        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)
      }
      img.src = dataUrl
    }

    root.append(toolbar, canvas)

    const el = root as HTMLElement & { init?: (data: unknown) => void }
    el.init = init
    return root
  },
}
