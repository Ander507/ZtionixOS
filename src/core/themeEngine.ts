import type { EventBus } from './eventBus';
import type { UserManager } from './userManager';
import { WALLPAPERS } from '../utils';

export class ThemeEngine {
  constructor(
    private bus: EventBus,
    private userManager: UserManager
  ) {}

  init(): void {
    this.bus.on('settings:change', () => this.apply());
    this.bus.on('user:login', () => this.apply());
  }

  apply(): void {
    const settings = this.userManager.getSettings();
    document.documentElement.setAttribute('data-theme', settings.theme);
    document.documentElement.style.setProperty('--accent', settings.accentColor);

    const wallpaper = WALLPAPERS.find((w) => w.id === settings.wallpaper);
    const desktop = document.querySelector('.desktop') as HTMLElement | null;
    if (desktop && wallpaper) {
      desktop.style.background = wallpaper.css;
    }

    this.bus.emit('theme:change', undefined);
  }

  getWallpaperCss(id: string): string {
    return WALLPAPERS.find((w) => w.id === id)?.css ?? WALLPAPERS[0].css;
  }
}
