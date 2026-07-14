import { themeEngine } from '../core/themeEngine'

export interface LoginOptions {
  username?: string
  onLogin: () => void
  mode?: 'login' | 'lock'
}

export function createLoginScreen(options: LoginOptions): HTMLElement {
  const name = options.username ?? 'Admin'
  const wp = themeEngine.getSettings().wallpaper
  let wpClass = wp
  if (wp === 'custom') {
    wpClass = 'custom'
  }

  const screen = document.createElement('div')
  screen.className = 'login-screen login-screen--wallpaper-' + wpClass
  if (options.mode === 'lock') {
    screen.dataset.phase = 'lock'
  } else {
    screen.dataset.phase = 'login'
  }

  let hintText = 'No password needed' // it's a demo, not production auth
  let btnText = 'Enter desktop'
  if (options.mode === 'lock') {
    hintText = 'Session locked'
    btnText = 'Unlock'
  }

  screen.innerHTML = `
    <div class="login-wallpaper"></div>
    <div class="login-overlay"></div>
    <div class="login-content">
      <div class="login-card">
        <div class="login-avatar">${name.charAt(0).toUpperCase()}</div>
        <p class="login-name">${name}</p>
        <p class="login-hint">${hintText}</p>
        <button type="button" class="login-enter">${btnText}</button>
      </div>
      <p class="login-footer">ZtionixOS · press Enter</p>
    </div>
  `

  let signingIn = false

  const signIn = () => {
    if (signingIn) {
      return
    }
    signingIn = true
    screen.classList.add('login-screen--exit')

    let done = false
    const finish = () => {
      if (done) return
      done = true
      options.onLogin()
    }

    screen.addEventListener('transitionend', finish, { once: true })
    window.setTimeout(finish, 520) // backup if transitionend never fires
  }

  const enterBtn = screen.querySelector('.login-enter')
  if (enterBtn) {
    enterBtn.addEventListener('click', signIn)
  }

  screen.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      signIn()
    }
  })

  screen.tabIndex = 0
  requestAnimationFrame(() => {
    screen.classList.add('login-screen--visible')
  })

  return screen
}
