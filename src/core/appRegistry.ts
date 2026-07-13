import type { AppDefinition, StoreApp } from '../types';
import { ICONS } from '../utils';

export const STORE_CATALOG: StoreApp[] = [
  {
    id: 'musicplayer',
    name: 'Music Player',
    description: 'A simple music player for your tunes.',
    icon: ICONS.music,
    version: '1.0.0',
    category: 'Entertainment',
  },
  {
    id: 'paint',
    name: 'Paint',
    description: 'Draw and sketch on a digital canvas.',
    icon: ICONS.paint,
    version: '1.0.0',
    category: 'Creative',
  },
];

export class AppRegistry {
  private apps = new Map<string, AppDefinition>();

  register(app: AppDefinition): void {
    this.apps.set(app.id, app);
  }

  get(id: string): AppDefinition | undefined {
    return this.apps.get(id);
  }

  getAll(): AppDefinition[] {
    return [...this.apps.values()];
  }

  getInstalled(installedIds: string[]): AppDefinition[] {
    return this.getAll().filter((a) => installedIds.includes(a.id) && !a.storeOnly);
  }

  getStoreCatalog(): StoreApp[] {
    return STORE_CATALOG;
  }
}
