export interface MenuItem {
  label: string
  action?: () => void
  separator?: boolean
  disabled?: boolean
}

let activeMenu: HTMLElement | null = null

export function showContextMenu(x: number, y: number, items: MenuItem[]): void {
  hideContextMenu()

  const menu = document.createElement('div')
  menu.className = 'context-menu'

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item.separator) {
      const sep = document.createElement('div')
      sep.className = 'context-menu-separator'
      menu.append(sep)
      continue
    }

    const btn = document.createElement('button')
    btn.className = 'context-menu-item'
    btn.textContent = item.label
    if (item.disabled) {
      btn.disabled = true
    } else {
      btn.disabled = false
    }
    if (item.action) {
      if (!item.disabled) {
        const act = item.action
        btn.addEventListener('click', () => {
          act()
          hideContextMenu()
        })
      }
    }
    menu.append(btn)
  }

  document.body.append(menu)

  const rect = menu.getBoundingClientRect()
  let left = x
  let top = y
  if (left + rect.width > window.innerWidth - 8) {
    left = window.innerWidth - rect.width - 8
  }
  if (top + rect.height > window.innerHeight - 8) {
    top = window.innerHeight - rect.height - 8
  }
  menu.style.left = left + 'px'
  menu.style.top = top + 'px'

  activeMenu = menu
}

export function hideContextMenu(): void {
  if (activeMenu) {
    activeMenu.remove()
  }
  activeMenu = null
}

document.addEventListener('mousedown', (e) => {
  if (activeMenu) {
    if (!activeMenu.contains(e.target as Node)) {
      hideContextMenu()
    }
  }
})

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    hideContextMenu()
  }
})

document.addEventListener('scroll', hideContextMenu, true)
