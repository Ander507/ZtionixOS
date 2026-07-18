import type { AppManifest } from '../../types'
import { icon } from '../../utils/icons'
import { showCalc67Secret } from '../../shell/calc67Popup'

export const calculatorApp: AppManifest = {
  id: 'calculator',
  name: 'Calculator',
  icon: icon('calculator'),
  pinned: true,
  singleton: true,
  window: { width: 280, height: 460, minWidth: 260, minHeight: 400, resizable: true, centered: true },
  launch: (ctx) => {
    const root = document.createElement('div')
    root.className = 'app-calculator'

    let display = '0'
    let accumulator: number | null = null
    let pendingOp: string | null = null
    let fresh = true
    let last67Trigger = 0
    let sciMode = false
    let angleMode: 'deg' | 'rad' = 'deg'

    const topBar = document.createElement('div')
    topBar.className = 'calc-topbar'

    const modeBtn = document.createElement('button')
    modeBtn.className = 'app-btn calc-mode-btn'
    modeBtn.textContent = 'Scientific'

    const angleBtn = document.createElement('button')
    angleBtn.className = 'app-btn calc-mode-btn'
    angleBtn.textContent = 'DEG'
    angleBtn.hidden = true

    topBar.append(modeBtn, angleBtn)

    const screen = document.createElement('div')
    screen.className = 'calc-display'
    screen.textContent = display

    const keypad = document.createElement('div')
    keypad.className = 'calc-keypad'

    const sciPad = document.createElement('div')
    sciPad.className = 'calc-scipad'
    sciPad.hidden = true

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

    const setDisplayNum = (n: number) => {
      if (!Number.isFinite(n)) {
        display = 'Error'
      } else {
        display = String(parseFloat(n.toPrecision(12)))
      }
      fresh = true
      update()
    }

    const inputDigit = (d: string) => {
      if (fresh) { display = d; fresh = false }
      else if (display === '0') display = d
      else if (display === 'Error') { display = d; fresh = false }
      else display += d
      update()
    }

    const inputDecimal = () => {
      if (fresh || display === 'Error') { display = '0.'; fresh = false }
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
      if (pendingOp === '+') result = accumulator + val
      else if (pendingOp === '-') result = accumulator - val
      else if (pendingOp === '*') result = accumulator * val
      else if (pendingOp === '/') result = val === 0 ? NaN : accumulator / val
      else if (pendingOp === '^') result = Math.pow(accumulator, val)
      setDisplayNum(result)
      accumulator = null
      pendingOp = null
    }

    const toRad = (n: number) => (angleMode === 'deg' ? (n * Math.PI) / 180 : n)
    const fromRad = (n: number) => (angleMode === 'deg' ? (n * 180) / Math.PI : n)

    const unary = (fn: (n: number) => number) => {
      const val = parseFloat(display)
      setDisplayNum(fn(val))
    }

    const basicButtons: Array<{ label: string; type?: string; action: () => void }> = [
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

    const sciButtons: Array<{ label: string; action: () => void }> = [
      { label: 'sin', action: () => unary((n) => Math.sin(toRad(n))) },
      { label: 'cos', action: () => unary((n) => Math.cos(toRad(n))) },
      { label: 'tan', action: () => unary((n) => Math.tan(toRad(n))) },
      { label: 'asin', action: () => unary((n) => fromRad(Math.asin(n))) },
      { label: 'acos', action: () => unary((n) => fromRad(Math.acos(n))) },
      { label: 'atan', action: () => unary((n) => fromRad(Math.atan(n))) },
      { label: 'ln', action: () => unary((n) => Math.log(n)) },
      { label: 'log', action: () => unary((n) => Math.log10(n)) },
      { label: '√', action: () => unary((n) => Math.sqrt(n)) },
      { label: 'x²', action: () => unary((n) => n * n) },
      { label: 'xʸ', action: () => applyOp('^') },
      { label: '1/x', action: () => unary((n) => 1 / n) },
      { label: 'π', action: () => { display = String(Math.PI); fresh = true; update() } },
      { label: 'e', action: () => { display = String(Math.E); fresh = true; update() } },
      { label: '!', action: () => unary((n) => {
        if (n < 0 || !Number.isInteger(n) || n > 170) return NaN
        let f = 1
        for (let i = 2; i <= n; i++) f *= i
        return f
      }) },
      { label: 'exp', action: () => unary((n) => Math.exp(n)) },
    ]

    for (let b = 0; b < basicButtons.length; b++) {
      const btn = basicButtons[b]
      const el = document.createElement('button')
      let cls = 'calc-btn'
      if (btn.type) cls = cls + ' calc-btn--' + btn.type
      el.className = cls
      el.textContent = btn.label
      el.addEventListener('click', btn.action)
      keypad.append(el)
    }

    for (let b = 0; b < sciButtons.length; b++) {
      const btn = sciButtons[b]
      const el = document.createElement('button')
      el.className = 'calc-btn calc-btn--sci'
      el.textContent = btn.label
      el.addEventListener('click', btn.action)
      sciPad.append(el)
    }

    const applySciLayout = () => {
      root.classList.toggle('app-calculator--sci', sciMode)
      sciPad.hidden = !sciMode
      angleBtn.hidden = !sciMode
      modeBtn.textContent = sciMode ? 'Standard' : 'Scientific'
      ctx.setTitle(sciMode ? 'Calculator — Scientific' : 'Calculator')
    }

    modeBtn.addEventListener('click', () => {
      sciMode = !sciMode
      applySciLayout()
    })

    angleBtn.addEventListener('click', () => {
      angleMode = angleMode === 'deg' ? 'rad' : 'deg'
      angleBtn.textContent = angleMode === 'deg' ? 'DEG' : 'RAD'
    })

    root.addEventListener('keydown', (e) => {
      if (e.key >= '0' && e.key <= '9') inputDigit(e.key)
      else if (e.key === '.') inputDecimal()
      else if (e.key === '+') applyOp('+')
      else if (e.key === '-') applyOp('-')
      else if (e.key === '*') applyOp('*')
      else if (e.key === '/') { e.preventDefault(); applyOp('/') }
      else if (e.key === '^') applyOp('^')
      else if (e.key === 'Enter' || e.key === '=') compute()
      else if (e.key === 'Escape') { display = '0'; accumulator = null; pendingOp = null; fresh = true; update() }
      else if (e.key === 'Backspace') {
        display = display.length > 1 ? display.slice(0, -1) : '0'
        update()
      }
    })

    root.tabIndex = 0
    root.append(topBar, screen, sciPad, keypad)
    setTimeout(() => root.focus(), 50)
    return root
  },
}
