import type { AppDefinition, AppContext } from '../../types';
import { ICONS, WALLPAPERS } from '../../utils';

function renderSettings(ctx: AppContext, container: HTMLElement): void {
  const settings = ctx.kernel.userManager.getSettings();

  container.className = 'app-settings';
  container.innerHTML = `
    <div class="settings-sidebar">
      <button class="settings-nav active" data-section="appearance">Appearance</button>
      <button class="settings-nav" data-section="system">System</button>
      <button class="settings-nav" data-section="about">About</button>
    </div>
    <div class="settings-content"></div>
  `;

  const content = container.querySelector('.settings-content') as HTMLElement;

  const renderSection = (section: string) => {
    container.querySelectorAll('.settings-nav').forEach((n) => {
      n.classList.toggle('active', (n as HTMLElement).dataset.section === section);
    });

    if (section === 'appearance') {
      content.innerHTML = `
        <h3>Appearance</h3>
        <div class="settings-group">
          <label>Theme</label>
          <select class="settings-theme">
            <option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>Dark</option>
            <option value="light" ${settings.theme === 'light' ? 'selected' : ''}>Light</option>
          </select>
        </div>
        <div class="settings-group">
          <label>Accent Color</label>
          <input type="color" class="settings-accent" value="${settings.accentColor}" />
        </div>
        <div class="settings-group">
          <label>Wallpaper</label>
          <div class="settings-wallpapers"></div>
        </div>
      `;

      const wallpapersEl = content.querySelector('.settings-wallpapers') as HTMLElement;
      for (const wp of WALLPAPERS) {
        const btn = document.createElement('button');
        btn.className = `wallpaper-option${settings.wallpaper === wp.id ? ' active' : ''}`;
        btn.style.background = wp.css;
        btn.title = wp.name;
        btn.addEventListener('click', async () => {
          await ctx.kernel.userManager.updateSettings({ wallpaper: wp.id });
          ctx.kernel.themeEngine.apply();
          renderSection('appearance');
        });
        wallpapersEl.appendChild(btn);
      }

      content.querySelector('.settings-theme')?.addEventListener('change', async (e) => {
        await ctx.kernel.userManager.updateSettings({ theme: (e.target as HTMLSelectElement).value as 'dark' | 'light' });
        ctx.kernel.themeEngine.apply();
      });

      content.querySelector('.settings-accent')?.addEventListener('input', async (e) => {
        await ctx.kernel.userManager.updateSettings({ accentColor: (e.target as HTMLInputElement).value });
        ctx.kernel.themeEngine.apply();
      });
    } else if (section === 'system') {
      content.innerHTML = `
        <h3>System</h3>
        <div class="settings-group">
          <label>Clock Format</label>
          <select class="settings-clock">
            <option value="24h" ${settings.clockFormat === '24h' ? 'selected' : ''}>24-hour</option>
            <option value="12h" ${settings.clockFormat === '12h' ? 'selected' : ''}>12-hour</option>
          </select>
        </div>
        <div class="settings-group">
          <label>User</label>
          <p>${ctx.kernel.userManager.currentUser?.displayName ?? 'Unknown'}</p>
        </div>
      `;

      content.querySelector('.settings-clock')?.addEventListener('change', async (e) => {
        await ctx.kernel.userManager.updateSettings({ clockFormat: (e.target as HTMLSelectElement).value as '12h' | '24h' });
      });
    } else {
      content.innerHTML = `
        <h3>About ZtionixOS</h3>
        <div class="about-card">
          <div class="about-logo"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--accent)"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></div>
          <h2>ZtionixOS</h2>
          <p>Version 1.0.0</p>
          <p>A full-featured web-based operating system built with Vite and TypeScript.</p>
          <p class="about-credits">© 2026 HackTheClub</p>
        </div>
      `;
    }
  };

  container.querySelectorAll('.settings-nav').forEach((nav) => {
    nav.addEventListener('click', () => renderSection((nav as HTMLElement).dataset.section!));
  });

  renderSection('appearance');
}

export const settingsApp: AppDefinition = {
  id: 'settings',
  name: 'Settings',
  icon: ICONS.settings,
  defaultSize: { width: 640, height: 480 },
  createWindow: renderSettings,
};
