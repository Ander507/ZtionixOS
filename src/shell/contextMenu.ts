import { svgIcon } from '../utils';

interface MenuItem {
  label: string;
  icon: string;
  action: () => void;
}

export class ContextMenu {
  show(x: number, y: number, items: MenuItem[]): void {
    document.querySelector('.context-menu')?.remove();

    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;

    for (const item of items) {
      const btn = document.createElement('button');
      btn.className = 'context-menu-item';
      btn.innerHTML = `${svgIcon(item.icon, 14)}<span>${item.label}</span>`;
      btn.addEventListener('click', () => {
        item.action();
        menu.remove();
      });
      menu.appendChild(btn);
    }

    document.body.appendChild(menu);

    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) menu.style.left = `${x - rect.width}px`;
    if (rect.bottom > window.innerHeight) menu.style.top = `${y - rect.height}px`;

    const close = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node)) {
        menu.remove();
        document.removeEventListener('click', close);
      }
    };
    setTimeout(() => document.addEventListener('click', close), 0);
  }
}
