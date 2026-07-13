import type { UserManager } from '../core/userManager';

export class LoginScreen {
  constructor(
    private container: HTMLElement,
    private userManager: UserManager
  ) {}

  show(): Promise<boolean> {
    return new Promise((resolve) => {
      const screen = document.createElement('div');
      screen.className = 'login-screen';
      screen.innerHTML = `
        <div class="login-panel">
          <div class="login-header">
            <div class="login-logo"><svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#a29bfe" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></div>
            <h2>ZtionixOS</h2>
            <p>Select a user to sign in</p>
          </div>
          <div class="login-users"></div>
          <div class="login-pin hidden">
            <p class="login-pin-user"></p>
            <input type="password" class="login-pin-input" placeholder="Enter PIN" maxlength="8" />
            <div class="login-pin-actions">
              <button class="btn btn-ghost login-back">Back</button>
              <button class="btn btn-primary login-submit">Sign In</button>
            </div>
          </div>
        </div>
      `;

      this.container.appendChild(screen);
      requestAnimationFrame(() => screen.classList.add('visible'));

      const usersEl = screen.querySelector('.login-users') as HTMLElement;
      const pinSection = screen.querySelector('.login-pin') as HTMLElement;
      const pinUser = screen.querySelector('.login-pin-user') as HTMLElement;
      const pinInput = screen.querySelector('.login-pin-input') as HTMLInputElement;
      let selectedUsername = '';

      for (const user of this.userManager.getUsers()) {
        const card = document.createElement('button');
        card.className = 'login-user-card';
        card.innerHTML = `
          <div class="login-avatar">${user.avatar}</div>
          <span class="login-username">${user.displayName}</span>
          ${user.isGuest ? '<span class="login-badge">Guest</span>' : ''}
        `;
        card.addEventListener('click', () => {
          selectedUsername = user.username;
          if (user.isGuest) {
            this.attemptLogin(selectedUsername, '', screen, resolve);
          } else {
            usersEl.classList.add('hidden');
            pinSection.classList.remove('hidden');
            pinUser.textContent = `Signing in as ${user.displayName}`;
            pinInput.value = '';
            pinInput.focus();
          }
        });
        usersEl.appendChild(card);
      }

      screen.querySelector('.login-back')?.addEventListener('click', () => {
        pinSection.classList.add('hidden');
        usersEl.classList.remove('hidden');
        selectedUsername = '';
      });

      const submit = () => {
        if (selectedUsername) {
          this.attemptLogin(selectedUsername, pinInput.value, screen, resolve);
        }
      };

      screen.querySelector('.login-submit')?.addEventListener('click', submit);
      pinInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submit();
      });
    });
  }

  private async attemptLogin(
    username: string,
    pin: string,
    screen: HTMLElement,
    resolve: (value: boolean) => void
  ): Promise<void> {
    const success = await this.userManager.login(username, pin);
    if (success) {
      screen.classList.add('fade-out');
      setTimeout(() => {
        screen.remove();
        resolve(true);
      }, 500);
    } else {
      const err = document.createElement('div');
      err.className = 'login-error';
      err.textContent = 'Invalid PIN. Default admin PIN is 1234.';
      screen.querySelector('.login-panel')?.appendChild(err);
      setTimeout(() => err.remove(), 3000);
    }
  }
}
