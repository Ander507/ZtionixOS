import type { AppManifest } from '../types'

class AppRegistry {
  private apps = new Map<string, AppManifest>()

  register(app: AppManifest): void {
    if (this.apps.has(app.id)) {
      console.warn('appRegistry: re-registering', app.id)
    }
    this.apps.set(app.id, app)
  }

  get(id: string): AppManifest | undefined {
    return this.apps.get(id)
  }

  getAll(): AppManifest[] {
    const out: AppManifest[] = []
    this.apps.forEach((app) => {
      out.push(app)
    })
    return out
  }

  getPinned(): AppManifest[] {
    const all = this.getAll()
    const pinned: AppManifest[] = []
    for (let i = 0; i < all.length; i++) {
      if (all[i].pinned) {
        pinned.push(all[i])
      }
    }
    return pinned
  }
}

export const appRegistry = new AppRegistry()
