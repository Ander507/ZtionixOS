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

  for (const item of items) {
    if (item.separator) {
      const sep = document.createElement('div')
      sep.className = 'context-menu-separator'
      menu.append(sep)
      continue
    }

    const btn = document.createElement('button')
    btn.className = 'context-menu-item'
    btn.textContent = item.label
    btn.disabled = !!item.disabled
    if (item.action && !item.disabled) {
      btn.addEventListener('click', () => {
        item.action!()
        hideContextMenu()
      })
    }
    menu.append(btn)
  }

  document.body.append(menu)

  const rect = menu.getBoundingClientRect()
  const left = Math.min(x, window.innerWidth - rect.width - 8)
  const top = Math.min(y, window.innerHeight - rect.height - 8)
  menu.style.left = `${left}px`
  menu.style.top = `${top}px`

  activeMenu = menu
}

export function hideContextMenu(): void {
  activeMenu?.remove()
  activeMenu = null
}

document.addEventListener('mousedown', (e) => {
  if (activeMenu && !activeMenu.contains(e.target as Node)) {
    hideContextMenu()
  }
})

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') hideContextMenu()
})

document.addEventListener('scroll', hideContextMenu, true)
