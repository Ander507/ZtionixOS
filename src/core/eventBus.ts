import type { EventMap, EventName } from '../types'

// Lightweight pub/sub — keeps apps from importing each other in a circle
type Listener<T> = (payload: T) => void

class EventBus {
  private listeners = new Map<string, Set<Listener<unknown>>>()

  on<K extends EventName>(event: K, listener: Listener<EventMap[K]>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(listener as Listener<unknown>)
    return () => this.off(event, listener) // unsubscribe fn, use it or leak listeners forever
  }

  off<K extends EventName>(event: K, listener: Listener<EventMap[K]>): void {
    this.listeners.get(event)?.delete(listener as Listener<unknown>)
  }

  emit<K extends EventName>(event: K, payload: EventMap[K]): void {
    const set = this.listeners.get(event)
    if (set) {
      set.forEach((listener) => {
        listener(payload)
      })
    }
  }

  once<K extends EventName>(event: K, listener: Listener<EventMap[K]>): void {
    const unsubscribe = this.on(event, (payload) => {
      unsubscribe()
      listener(payload)
    })
  }
}

export const eventBus = new EventBus()
