import type { Process } from '../types';
import { generateId } from '../utils';

export class ProcessManager {
  private processes = new Map<string, Process>();
  private cleanupFns = new Map<string, () => void>();

  create(appId: string, windowId: string): Process {
    const process: Process = { id: generateId(), appId, windowId };
    this.processes.set(process.id, process);
    return process;
  }

  get(id: string): Process | undefined {
    return this.processes.get(id);
  }

  getByWindow(windowId: string): Process | undefined {
    return [...this.processes.values()].find((p) => p.windowId === windowId);
  }

  getByApp(appId: string): Process[] {
    return [...this.processes.values()].filter((p) => p.appId === appId);
  }

  getAll(): Process[] {
    return [...this.processes.values()];
  }

  setCleanup(processId: string, fn: () => void): void {
    this.cleanupFns.set(processId, fn);
  }

  destroy(processId: string): void {
    this.cleanupFns.get(processId)?.();
    this.cleanupFns.delete(processId);
    this.processes.delete(processId);
  }
}
