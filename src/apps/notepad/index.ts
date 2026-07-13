import type { AppDefinition, AppContext } from '../../types';
import { ICONS } from '../../utils';

function renderNotepad(ctx: AppContext, container: HTMLElement): void {
  let currentPath: string | null = null;

  const params = container.dataset.params;
  if (params) {
    try {
      const parsed = JSON.parse(params);
      if (parsed.path) currentPath = parsed.path;
    } catch { /* ignore */ }
  }

  container.className = 'app-notepad';
  container.innerHTML = `
    <div class="notepad-toolbar">
      <button class="btn btn-ghost notepad-new">New</button>
      <button class="btn btn-ghost notepad-open">Open</button>
      <button class="btn btn-primary notepad-save">Save</button>
      <span class="notepad-filename">Untitled</span>
    </div>
    <textarea class="notepad-editor" spellcheck="false"></textarea>
  `;

  const editor = container.querySelector('.notepad-editor') as HTMLTextAreaElement;
  const filenameEl = container.querySelector('.notepad-filename') as HTMLElement;
  const fs = ctx.kernel.fileSystem;

  if (currentPath) {
    const content = fs.readFile(currentPath);
    if (content !== null) {
      editor.value = content;
      filenameEl.textContent = currentPath.split('/').pop() ?? 'Untitled';
    }
  }

  container.querySelector('.notepad-new')?.addEventListener('click', () => {
    editor.value = '';
    currentPath = null;
    filenameEl.textContent = 'Untitled';
  });

  container.querySelector('.notepad-open')?.addEventListener('click', () => {
    const path = prompt('Enter file path:', fs.getHomePath() + '/Documents/');
    if (path) {
      const content = fs.readFile(path);
      if (content !== null) {
        editor.value = content;
        currentPath = path;
        filenameEl.textContent = path.split('/').pop() ?? 'Untitled';
      } else {
        ctx.kernel.bus.emit('notify', { title: 'Notepad', message: 'File not found.' });
      }
    }
  });

  container.querySelector('.notepad-save')?.addEventListener('click', async () => {
    if (!currentPath) {
      const name = prompt('Save as:', 'untitled.txt');
      if (!name) return;
      const dir = fs.getHomePath() + '/Documents';
      const node = await fs.createFile(dir, name, editor.value);
      if (node) {
        currentPath = node.path;
        filenameEl.textContent = name;
        ctx.kernel.bus.emit('notify', { title: 'Notepad', message: `Saved ${name}` });
      }
    } else {
      await fs.updateFile(currentPath, editor.value);
      ctx.kernel.bus.emit('notify', { title: 'Notepad', message: `Saved ${filenameEl.textContent}` });
    }
  });
}

export const notepadApp: AppDefinition = {
  id: 'notepad',
  name: 'Notepad',
  icon: ICONS.notepad,
  defaultSize: { width: 600, height: 450 },
  createWindow: renderNotepad,
};
