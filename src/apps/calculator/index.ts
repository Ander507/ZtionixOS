import type { AppManifest } from '../../types'
import { icon } from '../../utils/icons'
import { showCalc67Secret } from '../../shell/calc67Popup'

export const calculatorApp: AppManifest = {
  id: 'calculator',
  name: 'Calculator',
  icon: icon('calculator'),
  pinned: true,
  singleton: true,
  window: { width: 280, height: 400, minWidth: 260, minHeight: 380, resizable: false, centered: true },
  launch: () => {
    const root = document.createElement('div')
    root.className = 'app-calculator'

    let display = '0'
    let accumulator: number | null = null
    let pendingOp: string | null = null
    let fresh = true
    let last67Trigger = 0

    const screen = document.createElement('div')
    screen.className = 'calc-display'
    screen.textContent = display

    const keypad = document.createElement('div')
    keypad.className = 'calc-keypad'

    const buttons: Array<{ label: string; type?: string; action: () => void }> = [
      { label: 'C', type: 'fn', action: () => { display = '0'; accumulator = null; pendingOp = null; fresh = true; update() } },
      { label: '±', type: 'fn', action: () => { display = String(-parseFloat(display)); update() } },
      { label: '%', type: 'fn', action: () => { display = String(parseFloat(display) / 100); update() } },
      { label: '÷', type: 'op', action: () => applyOp('/') },
      { label: '7', action: () => inputDigit('7') },
      { label: '8', action: () => inputDigit('8') },
      { label: '9', action: () => inputDigit('9') },
      { label: '×', type: 'op', action: () => applyOp('*') },
      { label: '4', action: () => inputDigit('4') },
      { label: '5', action: () => inputDigit('5') },
      { label: '6', action: () => inputDigit('6') },
      { label: '−', type: 'op', action: () => applyOp('-') },
      { label: '1', action: () => inputDigit('1') },
      { label: '2', action: () => inputDigit('2') },
      { label: '3', action: () => inputDigit('3') },
      { label: '+', type: 'op', action: () => applyOp('+') },
      { label: '0', type: 'wide', action: () => inputDigit('0') },
      { label: '.', action: () => inputDecimal() },
      { label: '=', type: 'eq', action: () => compute() },
    ]

    const maybeSixtySeven = () => {
      if (display !== '67') return
      const now = Date.now()
      if (now - last67Trigger < 1500) return
      last67Trigger = now
      showCalc67Secret()
    }

    const update = () => {
      screen.textContent = display
      maybeSixtySeven()
    }

    const inputDigit = (d: string) => {
      if (fresh) { display = d; fresh = false }
      else if (display === '0') display = d
      else display += d
      update()
    }

    const inputDecimal = () => {
      if (fresh) { display = '0.'; fresh = false }
      else if (!display.includes('.')) display += '.'
      update()
    }

    const applyOp = (op: string) => {
      const val = parseFloat(display)
      if (accumulator !== null && pendingOp && !fresh) compute()
      else accumulator = val
      pendingOp = op
      fresh = true
    }

    const compute = () => {
      if (accumulator === null || !pendingOp) return
      const val = parseFloat(display)
      let result = val
      if (pendingOp === '+') {
        result = accumulator + val
      } else if (pendingOp === '-') {
        result = accumulator - val
      } else if (pendingOp === '*') {
        result = accumulator * val
      } else if (pendingOp === '/') {
        if (val === 0) {
          result = NaN
        } else {
          result = accumulator / val
        }
      }
      if (Number.isFinite(result)) {
        display = String(parseFloat(result.toPrecision(12)))
      } else {
        display = 'Error'
      }
      accumulator = null
      pendingOp = null
      fresh = true
      update()
    }

    for (let b = 0; b < buttons.length; b++) {
      const btn = buttons[b]
      const el = document.createElement('button')
      let cls = 'calc-btn'
      if (btn.type) {
        cls = cls + ' calc-btn--' + btn.type
      }
      el.className = cls
      el.textContent = btn.label
      el.addEventListener('click', btn.action)
      keypad.append(el)
    }

    root.addEventListener('keydown', (e) => {
      if (e.key >= '0' && e.key <= '9') inputDigit(e.key)
      else if (e.key === '.') inputDecimal()
      else if (e.key === '+') applyOp('+')
      else if (e.key === '-') applyOp('-')
      else if (e.key === '*') applyOp('*')
      else if (e.key === '/') { e.preventDefault(); applyOp('/') }
      else if (e.key === 'Enter' || e.key === '=') compute()
      else if (e.key === 'Escape') { display = '0'; accumulator = null; pendingOp = null; fresh = true; update() }
      else if (e.key === 'Backspace') {
        display = display.length > 1 ? display.slice(0, -1) : '0'
        update()
      }
    })

    root.tabIndex = 0
    root.append(screen, keypad)
    setTimeout(() => root.focus(), 50)
    return root
  },
}
