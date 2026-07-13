import type { Kernel } from '../core/kernel';
import type { WindowState } from '../types';
import { svgIcon, ICONS } from '../utils';

const SYSTEM_BAR_HEIGHT = 30;

type SnapZone = 'left' | 'right' | 'top' | null;

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

    const app = this.kernel.appRegistry.get(state.appId);
    const resizable = app?.resizable !== false;
    const maximizable = app?.maximizable !== false;

    if (!resizable) {
      this.element.classList.add('window--fixed');
      if (app) this.element.classList.add(`window--${app.id}`);
      this.element.querySelectorAll('.resize-handle').forEach((h) => h.remove());
    }

    if (!maximizable) {
      this.element.querySelector('.maximize')?.remove();
    }

    this.setupControls(state, maximizable);
    this.setupDrag(state, resizable);
    if (resizable) this.setupResize(state);

    this.kernel.bus.on('window:update', (win) => {
      if (win.id === state.id) this.applyState(win);
    });

    this.kernel.bus.on('window:focus', () => {
      this.element.classList.toggle(
        'active',
        this.kernel.windowManager.getActive()?.id === state.id
      );
    });
  }

  getContent(): HTMLElement {
    return this.contentEl;
  }

  private getStyle(state: WindowState): string {
    if (state.minimized) return 'display:none;';
    if (state.maximized) {
      return `left:0;top:${SYSTEM_BAR_HEIGHT}px;width:100%;height:calc(100% - ${SYSTEM_BAR_HEIGHT}px);z-index:${state.zIndex};`;
    }
    return `left:${state.x}px;top:${state.y}px;width:${state.width}px;height:${state.height}px;z-index:${state.zIndex};`;
  }

  private applyState(state: WindowState): void {
    this.element.style.cssText = this.getStyle(state);
    if (!state.minimized) {
      this.element.classList.toggle('maximized', state.maximized);
      this.element.classList.toggle(
        'active',
        this.kernel.windowManager.getActive()?.id === state.id
      );
    }
  }

  private setupControls(state: WindowState, maximizable: boolean): void {
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
      }, 140);
    });

    this.element.querySelector('.window-titlebar')?.addEventListener('dblclick', (e) => {
      if ((e.target as HTMLElement).closest('.window-controls')) return;
      if (maximizable) this.kernel.windowManager.maximize(state.id);
    });

    this.element.addEventListener('pointerdown', () => {
      if (this.kernel.windowManager.getActive()?.id !== state.id) {
        this.kernel.windowManager.focus(state.id);
      }
    });
  }

  private getSnapPreview(area: HTMLElement): HTMLElement {
    let el = area.querySelector<HTMLElement>('.snap-preview');
    if (!el) {
      el = document.createElement('div');
      el.className = 'snap-preview';
      area.appendChild(el);
    }
    return el;
  }

  private setupDrag(state: WindowState, snappable: boolean): void {
    const titlebar = this.element.querySelector('.window-titlebar') as HTMLElement;

    titlebar.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      if ((e.target as HTMLElement).closest('.window-controls')) return;
      const win = this.kernel.windowManager.get(state.id);
      if (!win) return;

      const area = this.element.parentElement as HTMLElement;
      const preview = this.getSnapPreview(area);

      let startX = e.clientX;
      let startY = e.clientY;
      let origX = win.x;
      let origY = win.y;
      let curX = origX;
      let curY = origY;
      let dragging = false;
      let snap: SnapZone = null;
      let done = false;

      const onMove = (ev: PointerEvent) => {
        if (!dragging) {
          if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < 4) return;
          dragging = true;
          titlebar.setPointerCapture(e.pointerId);
          this.element.classList.add('dragging');

          const w = this.kernel.windowManager.get(state.id)!;
          if (w.maximized) {
            const ratio = ev.clientX / area.clientWidth;
            this.kernel.windowManager.update(state.id, { maximized: false });
            origX = Math.round(ev.clientX - w.width * ratio);
            origY = Math.max(SYSTEM_BAR_HEIGHT, ev.clientY - 17);
            startX = ev.clientX;
            startY = ev.clientY;
            this.element.classList.add('dragging');
          }
        }

        const w = this.kernel.windowManager.get(state.id)!;
        curX = origX + (ev.clientX - startX);
        curY = origY + (ev.clientY - startY);
        curX = Math.min(Math.max(curX, -w.width + 80), area.clientWidth - 60);
        curY = Math.min(Math.max(curY, 0), area.clientHeight - 36);
        this.element.style.left = `${curX}px`;
        this.element.style.top = `${curY}px`;

        if (!snappable) return;

        if (ev.clientX <= 8) snap = 'left';
        else if (ev.clientX >= window.innerWidth - 8) snap = 'right';
        else if (ev.clientY <= SYSTEM_BAR_HEIGHT + 4) snap = 'top';
        else snap = null;

        if (snap) {
          const half = Math.floor(area.clientWidth / 2);
          const fullH = area.clientHeight - SYSTEM_BAR_HEIGHT;
          if (snap === 'top') {
            preview.style.left = '0px';
            preview.style.width = `${area.clientWidth}px`;
          } else {
            preview.style.left = snap === 'left' ? '0px' : `${half}px`;
            preview.style.width = `${half}px`;
          }
          preview.style.top = `${SYSTEM_BAR_HEIGHT}px`;
          preview.style.height = `${fullH}px`;
          preview.classList.add('visible');
        } else {
          preview.classList.remove('visible');
        }
      };

      const onUp = () => {
        if (done) return;
        done = true;
        titlebar.removeEventListener('pointermove', onMove);
        preview.classList.remove('visible');
        this.element.classList.remove('dragging');
        if (!dragging) return;

        if (snap === 'top') {
          this.kernel.windowManager.update(state.id, { x: curX, y: curY });
          this.kernel.windowManager.maximize(state.id);
        } else if (snap === 'left' || snap === 'right') {
          const half = Math.floor(area.clientWidth / 2);
          this.kernel.windowManager.update(state.id, {
            x: snap === 'left' ? 0 : half,
            y: SYSTEM_BAR_HEIGHT,
            width: half,
            height: area.clientHeight - SYSTEM_BAR_HEIGHT,
            maximized: false,
          });
        } else {
          this.kernel.windowManager.update(state.id, { x: curX, y: curY });
        }
      };

      titlebar.addEventListener('pointermove', onMove);
      titlebar.addEventListener('pointerup', onUp, { once: true });
      titlebar.addEventListener('pointercancel', onUp, { once: true });
    });
  }

  private setupResize(state: WindowState): void {
    this.element.querySelectorAll<HTMLElement>('.resize-handle').forEach((handle) => {
      handle.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        const win = this.kernel.windowManager.get(state.id);
        if (!win || win.maximized) return;

        const dir = handle.className.split(' ')[1].replace('resize-', '');
        const startX = e.clientX;
        const startY = e.clientY;
        const orig = { w: win.width, h: win.height, x: win.x, y: win.y };
        let cur = { ...orig };
        let done = false;

        handle.setPointerCapture(e.pointerId);
        this.element.classList.add('dragging');

        const onMove = (ev: PointerEvent) => {
          const dx = ev.clientX - startX;
          const dy = ev.clientY - startY;
          let w = orig.w;
          let h = orig.h;
          let x = orig.x;
          let y = orig.y;

          if (dir.includes('e')) w = Math.max(300, orig.w + dx);
          if (dir.includes('w')) {
            w = Math.max(300, orig.w - dx);
            x = orig.x + (orig.w - w);
          }
          if (dir.includes('s')) h = Math.max(200, orig.h + dy);
          if (dir.includes('n')) {
            h = Math.max(200, orig.h - dy);
            y = orig.y + (orig.h - h);
          }

          cur = { w, h, x, y };
          this.element.style.left = `${x}px`;
          this.element.style.top = `${y}px`;
          this.element.style.width = `${w}px`;
          this.element.style.height = `${h}px`;
        };

        const onUp = () => {
          if (done) return;
          done = true;
          handle.removeEventListener('pointermove', onMove);
          this.element.classList.remove('dragging');
          this.kernel.windowManager.update(state.id, {
            x: cur.x,
            y: cur.y,
            width: cur.w,
            height: cur.h,
          });
        };

        handle.addEventListener('pointermove', onMove);
        handle.addEventListener('pointerup', onUp, { once: true });
        handle.addEventListener('pointercancel', onUp, { once: true });
      });
    });
  }
}
