import type { EventMap } from '../types';

type EventHandler<T> = (payload: T) => void;

export class EventBus {
  private listeners = new Map<keyof EventMap, Set<EventHandler<unknown>>>();

  on<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler as EventHandler<unknown>);
    return () => this.off(event, handler);
  }

  off<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): void {
    this.listeners.get(event)?.delete(handler as EventHandler<unknown>);
  }

  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    this.listeners.get(event)?.forEach((handler) => handler(payload));
  }
}
