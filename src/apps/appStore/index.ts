import type { AppDefinition, AppContext } from '../../types';
import { ICONS, svgIcon } from '../../utils';

function renderAppStore(ctx: AppContext, container: HTMLElement): void {
  const catalog = ctx.kernel.appRegistry.getStoreCatalog();

  container.className = 'app-store';
  container.innerHTML = `
    <div class="store-header">
      <h2>${svgIcon(ICONS.store, 24)} App Store</h2>
      <p>Discover and install apps for ZtionixOS</p>
    </div>
    <div class="store-grid"></div>
  `;

  const grid = container.querySelector('.store-grid') as HTMLElement;

  const render = () => {
    grid.innerHTML = '';
    const currentInstalled = ctx.kernel.userManager.getSettings().installedApps;

    for (const app of catalog) {
      const isInstalled = currentInstalled.includes(app.id);
      const card = document.createElement('div');
      card.className = 'store-card';
      card.innerHTML = `
        <div class="store-card-icon">${svgIcon(app.icon, 40)}</div>
        <div class="store-card-info">
          <h3>${app.name}</h3>
          <span class="store-card-category">${app.category}</span>
          <p>${app.description}</p>
          <span class="store-card-version">v${app.version}</span>
        </div>
        <button class="btn ${isInstalled ? 'btn-ghost' : 'btn-primary'} store-action">
          ${isInstalled ? 'Uninstall' : 'Install'}
        </button>
      `;

      card.querySelector('.store-action')?.addEventListener('click', async () => {
        if (isInstalled) {
          await ctx.kernel.userManager.uninstallApp(app.id);
          ctx.kernel.bus.emit('notify', { title: 'App Store', message: `${app.name} uninstalled.` });
        } else {
          await ctx.kernel.userManager.installApp(app.id);
          ctx.kernel.bus.emit('notify', { title: 'App Store', message: `${app.name} installed!` });
        }
        render();
      });

      grid.appendChild(card);
    }
  };

  render();
}

export const appStoreApp: AppDefinition = {
  id: 'appstore',
  name: 'App Store',
  icon: ICONS.store,
  defaultSize: { width: 720, height: 520 },
  createWindow: renderAppStore,
};
