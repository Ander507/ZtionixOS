import type { AppManifest } from '../types'

class AppRegistry {
  private apps = new Map<string, AppManifest>()

  register(app: AppManifest): void {
    this.apps.set(app.id, app)
  }

  get(id: string): AppManifest | undefined {
    return this.apps.get(id)
  }

  getAll(): AppManifest[] {
    return Array.from(this.apps.values())
  }

  getPinned(): AppManifest[] {
    return this.getAll().filter((app) => app.pinned)
  }
}

export const appRegistry = new AppRegistry()
