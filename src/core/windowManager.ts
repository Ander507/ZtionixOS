import type { EventBus } from './eventBus';
import type { ProcessManager } from './processManager';
import type { AppDefinition, WindowState } from '../types';
import { generateId } from '../utils';

export class WindowManager {
  private windows = new Map<string, WindowState>();
  private zIndex = 100;
  private activeWindowId: string | null = null;

  constructor(
    private bus: EventBus,
    private processManager: ProcessManager
  ) {}

  init(): void {
    this.bus.on('window:focus', (id) => {
      this.activeWindowId = id;
    });
  }

  create(app: AppDefinition, processId: string): WindowState {
    const offset = this.windows.size * 30;
    const state: WindowState = {
      id: generateId(),
      processId,
      appId: app.id,
      title: app.name,
      x: 120 + offset,
      y: 60 + offset,
      width: app.defaultSize?.width ?? 700,
      height: app.defaultSize?.height ?? 480,
      minimized: false,
      maximized: false,
      zIndex: ++this.zIndex,
    };
    this.windows.set(state.id, state);
    this.activeWindowId = state.id;
    this.bus.emit('window:open', state);
    return state;
  }

  get(id: string): WindowState | undefined {
    return this.windows.get(id);
  }

  getAll(): WindowState[] {
    return [...this.windows.values()];
  }

  getActive(): WindowState | null {
    return this.activeWindowId ? this.windows.get(this.activeWindowId) ?? null : null;
  }

  update(id: string, partial: Partial<WindowState>): void {
    const win = this.windows.get(id);
    if (!win) return;
    Object.assign(win, partial);
    this.bus.emit('window:update', win);
  }

  focus(id: string): void {
    const win = this.windows.get(id);
    if (!win) return;
    win.zIndex = ++this.zIndex;
    this.activeWindowId = id;
    this.bus.emit('window:focus', id);
    this.bus.emit('window:update', win);
  }

  minimize(id: string): void {
    const win = this.windows.get(id);
    if (!win) return;
    win.minimized = true;
    this.bus.emit('window:minimize', id);
    this.bus.emit('window:update', win);
  }

  maximize(id: string): void {
    const win = this.windows.get(id);
    if (!win) return;
    win.maximized = !win.maximized;
    if (win.maximized) {
      this.bus.emit('window:maximize', id);
    } else {
      this.bus.emit('window:restore', id);
    }
    this.bus.emit('window:update', win);
  }

  close(id: string): void {
    const win = this.windows.get(id);
    if (!win) return;
    this.processManager.destroy(win.processId);
    this.windows.delete(id);
    if (this.activeWindowId === id) {
      const remaining = this.getAll().filter((w) => !w.minimized);
      this.activeWindowId = remaining.length ? remaining[remaining.length - 1].id : null;
    }
    this.bus.emit('window:close', id);
  }

  cycleWindows(): void {
    const open = this.getAll().filter((w) => !w.minimized);
    if (open.length < 2) return;
    const idx = open.findIndex((w) => w.id === this.activeWindowId);
    const next = open[(idx + 1) % open.length];
    this.focus(next.id);
  }
}
