const BOOT_MESSAGES = [
  'Initializing kernel...',
  'Mounting virtual file system...',
  'Loading system services...',
  'Starting window manager...',
  'Preparing desktop...',
];

export class SplashScreen {
  constructor(private container: HTMLElement) {}

  show(): Promise<void> {
    return new Promise((resolve) => {
      const splash = document.createElement('div');
      splash.className = 'splash-screen';
      splash.innerHTML = `
        <div class="splash-bg">
          <div class="splash-orb splash-orb-1"></div>
          <div class="splash-orb splash-orb-2"></div>
          <div class="splash-orb splash-orb-3"></div>
        </div>
        <div class="splash-grid"></div>
        <div class="splash-logo">
          <div class="splash-icon-ring">
            <svg class="splash-icon" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
          </div>
          <h1 class="splash-title">Ztionix<span class="splash-title-accent">OS</span></h1>
          <p class="splash-tagline">Your OS in the browser</p>
        </div>
        <div class="splash-progress">
          <div class="splash-loader"><div class="splash-loader-bar"></div></div>
          <p class="splash-status">Booting...</p>
        </div>
        <div class="splash-version">ZtionixOS v1.0</div>
      `;
      this.container.appendChild(splash);

      requestAnimationFrame(() => splash.classList.add('visible'));

      const statusEl = splash.querySelector('.splash-status') as HTMLElement;
      let msgIdx = 0;
      const msgInterval = setInterval(() => {
        if (msgIdx < BOOT_MESSAGES.length) {
          statusEl.textContent = BOOT_MESSAGES[msgIdx];
          statusEl.classList.remove('splash-status-in');
          void statusEl.offsetWidth;
          statusEl.classList.add('splash-status-in');
          msgIdx++;
        }
      }, 520);

      setTimeout(() => {
        clearInterval(msgInterval);
        splash.classList.add('fade-out');
        setTimeout(() => {
          splash.remove();
          resolve();
        }, 700);
      }, 3000);
    });
  }
}
