import type { AppManifest } from '../../types'
import { windowManager } from '../../core/windowManager'
import { appRegistry } from '../../core/appRegistry'
import { eventBus } from '../../core/eventBus'
import { icon } from '../../utils/icons'

interface ProcRow {
  id: string
  name: string
  status: string
  cpu: number
}

function fakeCpu(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  const t = Date.now() / 900
  const base = Math.abs(h % 18) + 2
  const wobble = Math.abs(Math.sin(t + (h % 7))) * 12
  return Math.min(99, Math.round(base + wobble))
}

export const taskmgrApp: AppManifest = {
  id: 'taskmgr',
  name: 'Task Manager',
  icon: icon('taskmgr'),
  pinned: true,
  singleton: true,
  window: { width: 560, height: 420, minWidth: 420, minHeight: 300, centered: true },
  launch: (ctx) => {
    const root = document.createElement('div')
    root.className = 'app-taskmgr'

    const toolbar = document.createElement('div')
    toolbar.className = 'app-toolbar taskmgr-toolbar'

    const endBtn = document.createElement('button')
    endBtn.className = 'app-btn'
    endBtn.textContent = 'End Task'
    endBtn.disabled = true

    const refreshBtn = document.createElement('button')
    refreshBtn.className = 'app-btn'
    refreshBtn.textContent = 'Refresh'

    const summary = document.createElement('span')
    summary.className = 'taskmgr-summary'

    toolbar.append(endBtn, refreshBtn, summary)

    const tableWrap = document.createElement('div')
    tableWrap.className = 'taskmgr-table-wrap'

    const table = document.createElement('table')
    table.className = 'taskmgr-table'
    table.innerHTML = `
      <thead>
        <tr>
          <th>Name</th>
          <th>PID</th>
          <th>Status</th>
          <th>CPU</th>
        </tr>
      </thead>
      <tbody></tbody>
    `
    tableWrap.append(table)
    root.append(toolbar, tableWrap)

    const tbody = table.querySelector('tbody') as HTMLTableSectionElement
    let selectedId: string | null = null
    let rows: ProcRow[] = []

    const collect = (): ProcRow[] => {
      const wins = windowManager.getWindows()
      const out: ProcRow[] = []
      for (let i = 0; i < wins.length; i++) {
        const w = wins[i]
        const app = appRegistry.get(w.appId)
        out.push({
          id: w.id,
          name: app?.name ?? w.appId,
          status: w.minimized ? 'Minimized' : 'Running',
          cpu: fakeCpu(w.id + w.appId),
        })
      }
      out.sort((a, b) => a.name.localeCompare(b.name))
      return out
    }

    const render = () => {
      rows = collect()
      tbody.innerHTML = ''
      summary.textContent = rows.length + ' process' + (rows.length === 1 ? '' : 'es')

      if (selectedId) {
        let stillThere = false
        for (let i = 0; i < rows.length; i++) {
          if (rows[i].id === selectedId) {
            stillThere = true
            break
          }
        }
        if (!stillThere) selectedId = null
      }
      endBtn.disabled = !selectedId

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const tr = document.createElement('tr')
        if (row.id === selectedId) tr.classList.add('selected')
        if (row.id === ctx.windowId) tr.classList.add('taskmgr-self')

        const nameTd = document.createElement('td')
        nameTd.textContent = row.name
        const pidTd = document.createElement('td')
        pidTd.textContent = row.id
        const statusTd = document.createElement('td')
        statusTd.textContent = row.status
        const cpuTd = document.createElement('td')
        cpuTd.textContent = row.cpu + '%'

        tr.append(nameTd, pidTd, statusTd, cpuTd)
        tr.addEventListener('click', () => {
          selectedId = row.id
          render()
        })
        tr.addEventListener('dblclick', () => {
          if (row.id !== ctx.windowId) windowManager.focus(row.id)
        })
        tbody.append(tr)
      }
    }

    endBtn.addEventListener('click', () => {
      if (!selectedId) return
      const killId = selectedId
      selectedId = null
      windowManager.close(killId)
      render()
    })

    refreshBtn.addEventListener('click', render)

    const unsubs = [
      eventBus.on('window:open', render),
      eventBus.on('window:close', render),
      eventBus.on('window:minimize', render),
      eventBus.on('window:restore', render),
      eventBus.on('window:focus', render),
      eventBus.on('window:update', render),
    ]

    const cpuTimer = window.setInterval(render, 1000)

    const onClose = ({ id }: { id: string }) => {
      if (id !== ctx.windowId) return
      window.clearInterval(cpuTimer)
      for (let i = 0; i < unsubs.length; i++) unsubs[i]()
      eventBus.off('window:close', onClose)
    }
    eventBus.on('window:close', onClose)

    render()
    return root
  },
}
