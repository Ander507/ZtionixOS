import type { AppDefinition } from '../../types';
import type { AppContext } from '../../types';
import { ICONS, svgIcon } from '../../utils';

function renderExplorer(ctx: AppContext, container: HTMLElement): void {
  const fs = ctx.kernel.fileSystem;
  let currentPath = fs.getHomePath();

  const params = container.dataset.params;
  if (params) {
    try {
      const parsed = JSON.parse(params);
      if (parsed.path) currentPath = parsed.path;
    } catch { /* ignore */ }
  }

  container.className = 'app-explorer';
  container.innerHTML = `
    <div class="explorer-toolbar">
      <button class="btn btn-ghost explorer-back" title="Back">←</button>
      <button class="btn btn-ghost explorer-up" title="Up">↑</button>
      <span class="explorer-path"></span>
      <button class="btn btn-primary explorer-new-folder">${svgIcon(ICONS.plus, 14)} Folder</button>
      <button class="btn btn-primary explorer-new-file">${svgIcon(ICONS.plus, 14)} File</button>
    </div>
    <div class="explorer-content"></div>
  `;

  const pathEl = container.querySelector('.explorer-path') as HTMLElement;
  const contentEl = container.querySelector('.explorer-content') as HTMLElement;

  const render = () => {
    pathEl.textContent = currentPath;
    contentEl.innerHTML = '';
    const items = fs.listDir(currentPath);

    if (currentPath !== '/') {
      const parent = document.createElement('button');
      parent.className = 'explorer-item';
      parent.innerHTML = `${svgIcon(ICONS.folder, 24)}<span>..</span>`;
      parent.addEventListener('dblclick', () => {
        const parts = currentPath.split('/').filter(Boolean);
        parts.pop();
        currentPath = '/' + parts.join('/') || fs.getHomePath();
        if (currentPath === '/home') currentPath = fs.getHomePath();
        render();
      });
      contentEl.appendChild(parent);
    }

    for (const item of items.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    })) {
      const el = document.createElement('button');
      el.className = 'explorer-item';
      const icon = item.type === 'folder' ? ICONS.folder : ICONS.file;
      el.innerHTML = `${svgIcon(icon, 24)}<span>${item.name}</span>`;

      el.addEventListener('dblclick', () => {
        if (item.type === 'folder') {
          currentPath = item.path;
          render();
        } else {
          ctx.kernel.launchApp('notepad', { path: item.path });
        }
      });

      el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.left = `${e.clientX}px`;
        menu.style.top = `${e.clientY}px`;
        menu.innerHTML = `
          <button class="context-menu-item" data-action="rename">Rename</button>
          <button class="context-menu-item" data-action="delete">Delete</button>
        `;
        document.body.appendChild(menu);

        menu.querySelector('[data-action="rename"]')?.addEventListener('click', async () => {
          const newName = prompt('New name:', item.name);
          if (newName) await fs.rename(item.path, newName);
          menu.remove();
          render();
        });
        menu.querySelector('[data-action="delete"]')?.addEventListener('click', async () => {
          if (confirm(`Delete ${item.name}?`)) await fs.delete(item.path);
          menu.remove();
          render();
        });

        setTimeout(() => {
          document.addEventListener('click', () => menu.remove(), { once: true });
        }, 0);
      });

      contentEl.appendChild(el);
    }
  };

  container.querySelector('.explorer-back')?.addEventListener('click', () => {
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    currentPath = '/' + parts.join('/') || '/';
    if (currentPath === '/home' || currentPath === '/') currentPath = fs.getHomePath();
    render();
  });

  container.querySelector('.explorer-up')?.addEventListener('click', () => {
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    currentPath = '/' + parts.join('/') || '/';
    if (currentPath === '/home' || currentPath === '/') currentPath = fs.getHomePath();
    render();
  });

  container.querySelector('.explorer-new-folder')?.addEventListener('click', async () => {
    const name = prompt('Folder name:', 'New Folder');
    if (name) {
      await fs.createFolder(currentPath, name);
      render();
    }
  });

  container.querySelector('.explorer-new-file')?.addEventListener('click', async () => {
    const name = prompt('File name:', 'untitled.txt');
    if (name) {
      await fs.createFile(currentPath, name, '');
      render();
    }
  });

  ctx.kernel.bus.on('fs:change', render);
  render();
}

export const explorerApp: AppDefinition = {
  id: 'explorer',
  name: 'File Explorer',
  icon: ICONS.explorer,
  defaultSize: { width: 800, height: 500 },
  createWindow: renderExplorer,
};
