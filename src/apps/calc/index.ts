import type { AppManifest } from '../../types'
import { fileSystem } from '../../core/fileSystem'
import { notificationService } from '../../core/notificationService'
import { icon } from '../../utils/icons'

const ROWS = 12
const COLS = 8

function colLabel(i: number): string {
  return String.fromCharCode(65 + i)
}

function parseCellRef(ref: string): { r: number; c: number } | null {
  const m = /^([A-H])(\d{1,2})$/i.exec(ref.trim())
  if (!m) return null
  const c = m[1].toUpperCase().charCodeAt(0) - 65
  const r = parseInt(m[2], 10) - 1
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null
  return { r, c }
}

function parseRange(range: string): { r0: number; c0: number; r1: number; c1: number } | null {
  const parts = range.split(':')
  if (parts.length === 1) {
    const one = parseCellRef(parts[0])
    if (!one) return null
    return { r0: one.r, c0: one.c, r1: one.r, c1: one.c }
  }
  if (parts.length !== 2) return null
  const a = parseCellRef(parts[0])
  const b = parseCellRef(parts[1])
  if (!a || !b) return null
  return {
    r0: Math.min(a.r, b.r),
    c0: Math.min(a.c, b.c),
    r1: Math.max(a.r, b.r),
    c1: Math.max(a.c, b.c),
  }
}

function collectNumbers(
  cells: string[][],
  range: { r0: number; c0: number; r1: number; c1: number },
  resolve: (r: number, c: number, stack: string[]) => number | null,
  stack: string[],
): number[] {
  const nums: number[] = []
  for (let r = range.r0; r <= range.r1; r++) {
    for (let c = range.c0; c <= range.c1; c++) {
      const n = resolve(r, c, stack)
      if (n !== null && Number.isFinite(n)) nums.push(n)
    }
  }
  return nums
}

function evalArithmetic(expr: string): number | null {
  const tokens: string[] = []
  const re = /\d+(\.\d+)?|[+\-*/()]/g
  let m: RegExpExecArray | null
  let lastIndex = 0
  const cleaned = expr.replace(/\s+/g, '')
  while ((m = re.exec(cleaned))) {
    if (m.index !== lastIndex) return null
    tokens.push(m[0])
    lastIndex = m.index + m[0].length
  }
  if (lastIndex !== cleaned.length || tokens.length === 0) return null

  let i = 0
  const peek = () => tokens[i]
  const eat = () => tokens[i++]

  const parseExpr = (): number => {
    let v = parseTerm()
    while (peek() === '+' || peek() === '-') {
      const op = eat()
      const r = parseTerm()
      v = op === '+' ? v + r : v - r
    }
    return v
  }

  const parseTerm = (): number => {
    let v = parseFactor()
    while (peek() === '*' || peek() === '/') {
      const op = eat()
      const r = parseFactor()
      v = op === '*' ? v * r : v / r
    }
    return v
  }

  const parseFactor = (): number => {
    if (peek() === '-') {
      eat()
      return -parseFactor()
    }
    if (peek() === '+') {
      eat()
      return parseFactor()
    }
    if (peek() === '(') {
      eat()
      const v = parseExpr()
      if (peek() !== ')') throw new Error('paren')
      eat()
      return v
    }
    const t = eat()
    const n = parseFloat(t)
    if (!Number.isFinite(n)) throw new Error('num')
    return n
  }

  try {
    const v = parseExpr()
    if (i !== tokens.length) return null
    return Number.isFinite(v) ? v : null
  } catch {
    return null
  }
}

function evalFormula(
  raw: string,
  cells: string[][],
  resolve: (r: number, c: number, stack: string[]) => number | null,
  stack: string[],
): number | string {
  const expr = raw.slice(1).trim()
  const fnMatch = /^(SUM|AVERAGE|AVG|MIN|MAX|COUNT)\(([^)]+)\)$/i.exec(expr)
  if (fnMatch) {
    const fn = fnMatch[1].toUpperCase()
    const range = parseRange(fnMatch[2])
    if (!range) return '#REF!'
    const nums = collectNumbers(cells, range, resolve, stack)
    if (fn === 'SUM') return nums.reduce((a, b) => a + b, 0)
    if (fn === 'AVERAGE' || fn === 'AVG') return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0
    if (fn === 'MIN') return nums.length ? Math.min(...nums) : 0
    if (fn === 'MAX') return nums.length ? Math.max(...nums) : 0
    if (fn === 'COUNT') return nums.length
  }

  let replaced = expr.replace(/[A-H]\d{1,2}/gi, (ref) => {
    const pos = parseCellRef(ref)
    if (!pos) return 'NaN'
    const n = resolve(pos.r, pos.c, stack)
    return n === null ? '0' : String(n)
  })
  const val = evalArithmetic(replaced)
  if (val === null) return '#ERR!'
  return val
}

export const calcOfficeApp: AppManifest = {
  id: 'calc',
  name: 'Calc',
  icon: icon('calc'),
  pinned: true,
  singleton: false,
  window: { width: 900, height: 560, minWidth: 560, minHeight: 400 },
  launch: (ctx) => {
    const root = document.createElement('div')
    root.className = 'app-calc-office'

    let currentPath: string | null = null
    let selected = { r: 0, c: 0 }
    const cells: string[][] = []
    for (let r = 0; r < ROWS; r++) {
      cells[r] = []
      for (let c = 0; c < COLS; c++) cells[r][c] = ''
    }

    const toolbar = document.createElement('div')
    toolbar.className = 'app-toolbar'
    const saveBtn = document.createElement('button')
    saveBtn.className = 'app-btn'
    saveBtn.textContent = 'Save'
    const clearBtn = document.createElement('button')
    clearBtn.className = 'app-btn'
    clearBtn.textContent = 'Clear'
    const hint = document.createElement('span')
    hint.className = 'calc-office-hint'
    hint.textContent = '=SUM(A1:A5) · AVERAGE · MIN · MAX · COUNT'
    toolbar.append(saveBtn, clearBtn, hint)

    const formulaBar = document.createElement('div')
    formulaBar.className = 'calc-formula-bar'

    const cellLabel = document.createElement('span')
    cellLabel.className = 'calc-formula-cell'
    cellLabel.textContent = 'A1'

    const formulaInput = document.createElement('input')
    formulaInput.className = 'calc-formula-input'
    formulaInput.placeholder = 'fx  e.g. =SUM(A1:B3) or =A1+A2'
    formulaInput.spellcheck = false

    formulaBar.append(cellLabel, formulaInput)

    const wrap = document.createElement('div')
    wrap.className = 'calc-office-wrap'

    const table = document.createElement('table')
    table.className = 'calc-office-table'

    const thead = document.createElement('thead')
    const headRow = document.createElement('tr')
    headRow.append(document.createElement('th'))
    for (let c = 0; c < COLS; c++) {
      const th = document.createElement('th')
      th.textContent = colLabel(c)
      headRow.append(th)
    }
    thead.append(headRow)
    table.append(thead)

    const tbody = document.createElement('tbody')
    const inputs: HTMLInputElement[][] = []

    const resolveCell = (r: number, c: number, stack: string[]): number | null => {
      const key = colLabel(c) + String(r + 1)
      if (stack.includes(key)) return null
      const raw = cells[r][c].trim()
      if (!raw) return null
      if (raw.startsWith('=')) {
        const out = evalFormula(raw, cells, resolveCell, [...stack, key])
        return typeof out === 'number' ? out : null
      }
      const n = parseFloat(raw)
      return Number.isFinite(n) ? n : null
    }

    const displayValue = (r: number, c: number): string => {
      const raw = cells[r][c]
      if (!raw.startsWith('=')) return raw
      const out = evalFormula(raw, cells, resolveCell, [])
      if (typeof out === 'number') {
        return String(parseFloat(out.toPrecision(12)))
      }
      return out
    }

    const refreshDisplays = () => {
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (document.activeElement === inputs[r][c]) continue
          inputs[r][c].value = displayValue(r, c)
        }
      }
    }

    const selectCell = (r: number, c: number) => {
      selected = { r, c }
      cellLabel.textContent = colLabel(c) + String(r + 1)
      formulaInput.value = cells[r][c]
      for (let rr = 0; rr < ROWS; rr++) {
        for (let cc = 0; cc < COLS; cc++) {
          inputs[rr][cc].classList.toggle('calc-office-cell--selected', rr === r && cc === c)
        }
      }
    }

    const commitFormulaBar = () => {
      cells[selected.r][selected.c] = formulaInput.value
      refreshDisplays()
    }

    for (let r = 0; r < ROWS; r++) {
      const tr = document.createElement('tr')
      const rowHead = document.createElement('th')
      rowHead.textContent = String(r + 1)
      tr.append(rowHead)
      inputs[r] = []
      for (let c = 0; c < COLS; c++) {
        const td = document.createElement('td')
        const input = document.createElement('input')
        input.className = 'calc-office-cell'
        input.value = ''
        input.addEventListener('focus', () => {
          selectCell(r, c)
          input.value = cells[r][c]
        })
        input.addEventListener('input', () => {
          cells[r][c] = input.value
          formulaInput.value = input.value
        })
        input.addEventListener('blur', () => {
          refreshDisplays()
        })
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            cells[r][c] = input.value
            refreshDisplays()
            const nr = Math.min(ROWS - 1, r + 1)
            inputs[nr][c].focus()
          }
        })
        inputs[r][c] = input
        td.append(input)
        tr.append(td)
      }
      tbody.append(tr)
    }
    table.append(tbody)
    wrap.append(table)
    root.append(toolbar, formulaBar, wrap)

    formulaInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        commitFormulaBar()
        inputs[selected.r][selected.c].focus()
      }
    })
    formulaInput.addEventListener('blur', commitFormulaBar)

    const syncInputs = () => {
      refreshDisplays()
      selectCell(selected.r, selected.c)
    }

    const toCsv = (): string => {
      const lines: string[] = []
      for (let r = 0; r < ROWS; r++) {
        const row = cells[r].map((v) => {
          if (v.includes(',') || v.includes('"') || v.includes('\n')) {
            return '"' + v.replace(/"/g, '""') + '"'
          }
          return v
        })
        lines.push(row.join(','))
      }
      while (lines.length > 0 && lines[lines.length - 1].replace(/,/g, '') === '') {
        lines.pop()
      }
      return lines.join('\n')
    }

    const fromCsv = (text: string) => {
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) cells[r][c] = ''
      }
      const lines = text.split(/\r?\n/)
      for (let r = 0; r < Math.min(lines.length, ROWS); r++) {
        const parts = lines[r].split(',')
        for (let c = 0; c < Math.min(parts.length, COLS); c++) {
          cells[r][c] = parts[c].replace(/^"(.*)"$/, '$1').replace(/""/g, '"')
        }
      }
      syncInputs()
    }

    saveBtn.addEventListener('click', () => {
      const path = currentPath ?? `${fileSystem.getDocuments()}/Sheet-${Date.now()}.csv`
      if (fileSystem.write(path, toCsv(), 'text/csv')) {
        currentPath = path
        ctx.setTitle('Calc — ' + (path.split('/').pop() ?? 'sheet'))
        notificationService.push('Saved', path.split('/').pop() ?? 'sheet')
      } else {
        notificationService.push('Save failed', 'Could not write file')
      }
    })

    clearBtn.addEventListener('click', () => {
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) cells[r][c] = ''
      }
      syncInputs()
    })

    const init = (data: unknown) => {
      const payload = data as { path?: string }
      if (!payload?.path) return
      const content = fileSystem.read(payload.path)
      if (content == null) return
      currentPath = payload.path
      fromCsv(content)
      ctx.setTitle('Calc — ' + (payload.path.split('/').pop() ?? 'sheet'))
    }

    selectCell(0, 0)
    const el = root as HTMLElement & { init?: (data: unknown) => void }
    el.init = init
    return root
  },
}
