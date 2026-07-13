import type { EventBus } from './eventBus';
import type { Persistence } from './persistence';
import type { User, UserSettings } from '../types';
import { generateId, hashPin } from '../utils';

const DEFAULT_SETTINGS = (userId: string): UserSettings => ({
  userId,
  theme: 'dark',
  wallpaper: 'aurora',
  accentColor: '#6c5ce7',
  taskbarPosition: 'bottom',
  clockFormat: '24h',
  installedApps: ['explorer', 'terminal', 'settings', 'calculator', 'notepad', 'browser', 'appstore'],
});

export class UserManager {
  private users: User[] = [];
  currentUser: User | null = null;
  currentSettings: UserSettings | null = null;

  constructor(
    private persistence: Persistence,
    private bus: EventBus
  ) {}

  async init(): Promise<void> {
    this.users = await this.persistence.getUsers();
    if (this.users.length === 0) {
      await this.seedDefaultUsers();
    }
  }

  private async seedDefaultUsers(): Promise<void> {
    const admin: User = {
      id: generateId(),
      username: 'admin',
      displayName: 'Administrator',
      avatar: 'A',
      pinHash: await hashPin('1234'),
    };
    const guest: User = {
      id: 'guest',
      username: 'guest',
      displayName: 'Guest',
      avatar: 'G',
      pinHash: '',
      isGuest: true,
    };
    await this.persistence.saveUser(admin);
    await this.persistence.saveUser(guest);
    this.users = [admin, guest];

    const adminSettings = DEFAULT_SETTINGS(admin.id);
    await this.persistence.saveSettings(adminSettings);
  }

  getUsers(): User[] {
    return [...this.users];
  }

  async login(username: string, pin?: string): Promise<boolean> {
    const user = this.users.find((u) => u.username === username);
    if (!user) return false;

    if (!user.isGuest) {
      const hash = await hashPin(pin ?? '');
      if (hash !== user.pinHash) return false;
    }

    this.currentUser = user;
    let settings = await this.persistence.getSettings(user.id);
    if (!settings) {
      settings = DEFAULT_SETTINGS(user.id);
      if (!user.isGuest) {
        await this.persistence.saveSettings(settings);
      }
    }
    this.currentSettings = settings;
    this.bus.emit('user:login', user);
    return true;
  }

  logout(): void {
    this.currentUser = null;
    this.currentSettings = null;
    this.bus.emit('user:logout', undefined);
  }

  getSettings(): UserSettings {
    return this.currentSettings ?? DEFAULT_SETTINGS('guest');
  }

  async updateSettings(partial: Partial<UserSettings>): Promise<void> {
    if (!this.currentUser || this.currentUser.isGuest) return;
    this.currentSettings = { ...this.getSettings(), ...partial };
    await this.persistence.saveSettings(this.currentSettings);
    this.bus.emit('settings:change', this.currentSettings);
  }

  async installApp(appId: string): Promise<void> {
    const settings = this.getSettings();
    if (!settings.installedApps.includes(appId)) {
      await this.updateSettings({ installedApps: [...settings.installedApps, appId] });
    }
  }

  async uninstallApp(appId: string): Promise<void> {
    const settings = this.getSettings();
    const core = ['explorer', 'terminal', 'settings', 'calculator', 'notepad', 'browser', 'appstore'];
    if (core.includes(appId)) return;
    await this.updateSettings({
      installedApps: settings.installedApps.filter((id) => id !== appId),
    });
  }

  isAppInstalled(appId: string): boolean {
    return this.getSettings().installedApps.includes(appId);
  }
}
