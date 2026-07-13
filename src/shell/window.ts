import type { Kernel } from '../core/kernel';
import type { WindowState } from '../types';
import { svgIcon, ICONS } from '../utils';

export class WindowComponent {
  element: HTMLElement;
  private contentEl: HTMLElement;

  constructor(
    private kernel: Kernel,
    state: WindowState
  ) {
    this.element = document.createElement('div');
    this.element.className = 'window';
    this.element.dataset.windowId = state.id;
    this.element.style.cssText = this.getStyle(state);

    this.element.innerHTML = `
      <div class="window-titlebar">
        <div class="window-title">
          <span class="window-title-icon"></span>
          <span class="window-title-text">${state.title}</span>
        </div>
        <div class="window-controls">
          <button class="window-btn minimize" title="Minimize">${svgIcon(ICONS.minimize, 14)}</button>
          <button class="window-btn maximize" title="Maximize">${svgIcon(ICONS.maximize, 14)}</button>
          <button class="window-btn close" title="Close">${svgIcon(ICONS.close, 14)}</button>
        </div>
      </div>
      <div class="window-content"></div>
      <div class="resize-handle resize-n"></div>
      <div class="resize-handle resize-s"></div>
      <div class="resize-handle resize-e"></div>
      <div class="resize-handle resize-w"></div>
      <div class="resize-handle resize-ne"></div>
      <div class="resize-handle resize-nw"></div>
      <div class="resize-handle resize-se"></div>
      <div class="resize-handle resize-sw"></div>
    `;

    this.contentEl = this.element.querySelector('.window-content') as HTMLElement;
    this.setupControls(state);
    this.setupDrag(state);
    this.setupResize(state);

    this.kernel.bus.on('window:update', (win) => {
      if (win.id === state.id) this.applyState(win);
    });
  }

  getContent(): HTMLElement {
    return this.contentEl;
  }

  private getStyle(state: WindowState): string {
    if (state.minimized) return 'display:none;';
    if (state.maximized) {
      return `left:0;top:0;width:100%;height:100%;z-index:${state.zIndex};`;
    }
    return `left:${state.x}px;top:${state.y}px;width:${state.width}px;height:${state.height}px;z-index:${state.zIndex};`;
  }

  private applyState(state: WindowState): void {
    this.element.style.cssText = this.getStyle(state);
    if (!state.minimized) {
      this.element.classList.toggle('maximized', state.maximized);
      this.element.classList.toggle('active', this.kernel.windowManager.getActive()?.id === state.id);
    }
  }

  private setupControls(state: WindowState): void {
    this.element.querySelector('.minimize')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.kernel.windowManager.minimize(state.id);
    });
    this.element.querySelector('.maximize')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.kernel.windowManager.maximize(state.id);
    });
    this.element.querySelector('.close')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.element.classList.add('closing');
      setTimeout(() => {
        this.kernel.windowManager.close(state.id);
        this.element.remove();
      }, 180);
    });

    this.element.querySelector('.window-titlebar')?.addEventListener('dblclick', () => {
      this.kernel.windowManager.maximize(state.id);
    });

    this.element.addEventListener('mousedown', () => {
      this.kernel.windowManager.focus(state.id);
    });
  }

  private setupDrag(state: WindowState): void {
    const titlebar = this.element.querySelector('.window-titlebar') as HTMLElement;
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let origX = 0;
    let origY = 0;

    titlebar.addEventListener('mousedown', (e) => {
      if ((e.target as HTMLElement).closest('.window-controls')) return;
      const win = this.kernel.windowManager.get(state.id);
      if (!win || win.maximized) return;

      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      origX = win.x;
      origY = win.y;
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      this.kernel.windowManager.update(state.id, {
        x: Math.max(0, origX + dx),
        y: Math.max(0, origY + dy),
      });
    });

    document.addEventListener('mouseup', () => {
      dragging = false;
    });
  }

  private setupResize(state: WindowState): void {
    const handles = this.element.querySelectorAll('.resize-handle');
    handles.forEach((handle) => {
      handle.addEventListener('mousedown', (e) => {
        const ev = e as MouseEvent;
        ev.preventDefault();
        ev.stopPropagation();
        const win = this.kernel.windowManager.get(state.id);
        if (!win || win.maximized) return;

        const dir = (handle as HTMLElement).className.split(' ')[1];
        const startX = ev.clientX;
        const startY = ev.clientY;
        const origW = win.width;
        const origH = win.height;
        const origX = win.x;
        const origY = win.y;

        const onMove = (ev: MouseEvent) => {
          const dx = ev.clientX - startX;
          const dy = ev.clientY - startY;
          let w = origW;
          let h = origH;
          let x = origX;
          let y = origY;

          if (dir.includes('e')) w = Math.max(300, origW + dx);
          if (dir.includes('w')) {
            w = Math.max(300, origW - dx);
            x = origX + (origW - w);
          }
          if (dir.includes('s')) h = Math.max(200, origH + dy);
          if (dir.includes('n')) {
            h = Math.max(200, origH - dy);
            y = origY + (origH - h);
          }

          this.kernel.windowManager.update(state.id, { x, y, width: w, height: h });
        };

        const onUp = () => {
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });
    });
  }
}
