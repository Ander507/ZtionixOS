import type { Kernel } from '../core/kernel';
import { svgIcon, ICONS } from '../utils';

export class StartMenu {
  element: HTMLElement;

  constructor(private kernel: Kernel) {
    this.element = document.createElement('div');
    this.element.className = 'start-menu';
    this.render();

    this.kernel.bus.on('startmenu:toggle', () => {
      this.element.classList.toggle('open');
      if (this.element.classList.contains('open')) this.render();
    });

    document.addEventListener('click', (e) => {
      if (!this.element.contains(e.target as Node) && !(e.target as HTMLElement).closest('.taskbar-start')) {
        this.element.classList.remove('open');
      }
    });
  }

  private render(): void {
    const user = this.kernel.userManager.currentUser;
    const settings = this.kernel.userManager.getSettings();
    const apps = this.kernel.appRegistry.getInstalled(settings.installedApps);

    this.element.innerHTML = `
      <div class="start-menu-header">
        <div class="start-menu-avatar">${user?.avatar ?? '?'}</div>
        <div>
          <div class="start-menu-name">${user?.displayName ?? 'User'}</div>
          <div class="start-menu-sub">@${user?.username ?? 'user'}</div>
        </div>
      </div>
      <div class="start-menu-search">
        <span class="search-icon">${svgIcon(ICONS.search, 16)}</span>
        <input type="text" placeholder="Search apps..." class="start-search-input" />
      </div>
      <div class="start-menu-apps"></div>
      <div class="start-menu-footer">
        <button class="start-menu-power logout">${svgIcon(ICONS.user, 16)} Log out</button>
        <button class="start-menu-power shutdown">${svgIcon(ICONS.power, 16)} Shut down</button>
      </div>
    `;

    const appsEl = this.element.querySelector('.start-menu-apps') as HTMLElement;
    const searchInput = this.element.querySelector('.start-search-input') as HTMLInputElement;

    const renderApps = (filter = '') => {
      appsEl.innerHTML = '';
      const filtered = apps.filter((a) => a.name.toLowerCase().includes(filter.toLowerCase()));
      for (const app of filtered) {
        const btn = document.createElement('button');
        btn.className = 'start-menu-app';
        btn.innerHTML = `${svgIcon(app.icon, 20)}<span>${app.name}</span>`;
        btn.addEventListener('click', () => {
          this.kernel.launchApp(app.id);
          this.element.classList.remove('open');
        });
        appsEl.appendChild(btn);
      }
    };

    renderApps();
    searchInput.addEventListener('input', () => renderApps(searchInput.value));

    this.element.querySelector('.logout')?.addEventListener('click', () => {
      this.element.classList.remove('open');
      this.kernel.logout();
    });

    this.element.querySelector('.shutdown')?.addEventListener('click', () => {
      this.element.classList.remove('open');
      this.kernel.shutdown();
    });
  }
}
