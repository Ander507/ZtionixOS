import type { AppManifest } from '../../types'

const SCORE_KEY = 'ztionixos-snake-best'
const GRID = 16
const TICK = 110

type Point = { x: number; y: number }

function loadBest(): number {
  const n = Number(localStorage.getItem(SCORE_KEY))
  return Number.isFinite(n) ? n : 0
}

function saveBest(score: number): void {
  localStorage.setItem(SCORE_KEY, String(score))
}

export const snakeApp: AppManifest = {
  id: 'snake',
  name: 'Snake',
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>`,
  pinned: false,
  singleton: true,
  window: { width: 360, height: 420, minWidth: 320, minHeight: 380, resizable: false, centered: true },
  launch: () => {
    const root = document.createElement('div')
    root.className = 'app-snake'
    root.tabIndex = 0

    const hud = document.createElement('div')
    hud.className = 'snake-hud'
    const scoreEl = document.createElement('span')
    const bestEl = document.createElement('span')
    hud.append(scoreEl, bestEl)

    const canvas = document.createElement('canvas')
    canvas.className = 'snake-canvas'
    canvas.width = 320
    canvas.height = 320

    const hint = document.createElement('p')
    hint.className = 'snake-hint'
    hint.textContent = 'Arrow keys · Space to pause'

    root.append(hud, canvas, hint)

    const ctx = canvas.getContext('2d')!
    const cols = canvas.width / GRID
    const rows = canvas.height / GRID

    let snake: Point[] = [{ x: 8, y: 8 }]
    let dir: Point = { x: 1, y: 0 }
    let nextDir: Point = dir
    let food = spawnFood()
    let score = 0
    let best = loadBest()
    let alive = true
    let paused = false
    let loopId: number | null = null

    function spawnFood(): Point {
      let p: Point
      let ok = false
      while (!ok) {
        p = { x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows) }
        ok = true
        for (let s = 0; s < snake.length; s++) {
          if (snake[s].x === p.x && snake[s].y === p.y) {
            ok = false
            break
          }
        }
      }
      return p!
    }

    function updateHud(): void {
      scoreEl.textContent = 'Score ' + score
      bestEl.textContent = 'Best ' + best
    }

    function draw(): void {
      ctx.fillStyle = '#0c0c10'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.strokeStyle = 'rgba(0, 229, 255, 0.08)'
      for (let x = 0; x <= cols; x++) {
        ctx.beginPath()
        ctx.moveTo(x * GRID, 0)
        ctx.lineTo(x * GRID, canvas.height)
        ctx.stroke()
      }
      for (let y = 0; y <= rows; y++) {
        ctx.beginPath()
        ctx.moveTo(0, y * GRID)
        ctx.lineTo(canvas.width, y * GRID)
        ctx.stroke()
      }

      ctx.fillStyle = '#ff2d6a'
      ctx.fillRect(food.x * GRID + 2, food.y * GRID + 2, GRID - 4, GRID - 4)

      snake.forEach((seg, i) => {
        if (i === 0) {
          ctx.fillStyle = '#00e5ff'
        } else {
          ctx.fillStyle = '#00b8cc'
        }
        ctx.fillRect(seg.x * GRID + 1, seg.y * GRID + 1, GRID - 2, GRID - 2)
      })

      if (!alive) {
        ctx.fillStyle = 'rgba(0,0,0,0.55)'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.fillStyle = '#fff'
        ctx.font = '600 18px JetBrains Mono, monospace'
        ctx.textAlign = 'center'
        ctx.fillText('Game over', canvas.width / 2, canvas.height / 2 - 8)
        ctx.font = '12px JetBrains Mono, monospace'
        ctx.fillStyle = '#aaa'
        ctx.fillText('Enter to restart', canvas.width / 2, canvas.height / 2 + 16)
      } else if (paused) {
        ctx.fillStyle = 'rgba(0,0,0,0.45)'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.fillStyle = '#00e5ff'
        ctx.font = '600 16px JetBrains Mono, monospace'
        ctx.textAlign = 'center'
        ctx.fillText('Paused', canvas.width / 2, canvas.height / 2)
      }
    }

    function tick(): void {
      if (!alive || paused) return

      dir = nextDir
      const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y }

      if (head.x < 0 || head.y < 0 || head.x >= cols || head.y >= rows) {
        alive = false
        draw()
        return
      }
      let hitSelf = false
      for (let i = 0; i < snake.length; i++) {
        if (snake[i].x === head.x && snake[i].y === head.y) {
          hitSelf = true
          break
        }
      }
      if (hitSelf) {
        alive = false
        draw()
        return
      }

      snake.unshift(head)

      if (head.x === food.x && head.y === food.y) {
        score += 1
        if (score > best) {
          best = score
          saveBest(best)
        }
        food = spawnFood()
      } else {
        snake.pop()
      }

      updateHud()
      draw()
    }

    function reset(): void {
      snake = [{ x: 8, y: 8 }]
      dir = { x: 1, y: 0 }
      nextDir = dir
      food = spawnFood()
      score = 0
      alive = true
      paused = false
      updateHud()
      draw()
    }

    root.addEventListener('keydown', (e) => {
      if (e.key === ' ') {
        e.preventDefault()
        if (alive) paused = !paused
        draw()
        return
      }

      if (!alive && e.key === 'Enter') {
        reset()
        return
      }

      let nd: Point | null = null
      if (e.key === 'ArrowUp') nd = { x: 0, y: -1 }
      else if (e.key === 'ArrowDown') nd = { x: 0, y: 1 }
      else if (e.key === 'ArrowLeft') nd = { x: -1, y: 0 }
      else if (e.key === 'ArrowRight') nd = { x: 1, y: 0 }
      if (!nd) return
      e.preventDefault()
      if (nd.x === -dir.x && nd.y === -dir.y) return
      nextDir = nd
    })

    updateHud()
    draw()
    loopId = window.setInterval(tick, TICK)

    const observer = new MutationObserver(() => {
      if (!root.isConnected) {
        if (loopId) window.clearInterval(loopId)
        observer.disconnect()
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })

    return root
  },
}
