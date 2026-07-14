import { themeEngine } from '../core/themeEngine'

export interface LoginOptions {
  username?: string
  onLogin: () => void
  mode?: 'login' | 'lock'
}

export function createLoginScreen(options: LoginOptions): HTMLElement {
  const username = options.username ?? 'Admin'
  const { wallpaper } = themeEngine.getSettings()
  const wallpaperClass = wallpaper === 'custom' ? 'custom' : wallpaper

  const login = document.createElement('div')
  login.className = `login-screen login-screen--wallpaper-${wallpaperClass}`
  login.dataset.phase = options.mode === 'lock' ? 'lock' : 'login'

  login.innerHTML = `
    <div class="login-wallpaper"></div>
    <div class="login-overlay tw:absolute tw:inset-0 tw:bg-black/40 tw:backdrop-blur-md"></div>
    <div class="login-content tw:relative tw:z-10 tw:flex tw:h-full tw:w-full tw:flex-col tw:items-center tw:justify-center">
      <button type="button" class="login-profile tw:group tw:flex tw:flex-col tw:items-center tw:gap-5 tw:border-0 tw:bg-transparent tw:p-0 tw:cursor-pointer tw:outline-none" aria-label="Sign in as ${username}">
        <span class="login-avatar-ring tw:relative tw:flex tw:h-28 tw:w-28 tw:items-center tw:justify-center tw:rounded-full tw:transition-all tw:duration-500 tw:ease-in-out group-hover:tw:scale-105">
          <span class="login-avatar tw:flex tw:h-24 tw:w-24 tw:items-center tw:justify-center tw:rounded-full tw:bg-neutral-800/80 tw:text-3xl tw:font-medium tw:text-neutral-100 tw:ring-2 tw:ring-white/20 tw:transition-all tw:duration-500 group-hover:tw:ring-[var(--accent)] group-hover:tw:shadow-[0_0_24px_rgba(201,169,110,0.35)]">
            ${username.charAt(0).toUpperCase()}
          </span>
        </span>
        <span class="tw:text-2xl tw:font-medium tw:tracking-tight tw:text-white">${username}</span>
      </button>
      <button type="button" class="login-enter tw:mt-8 tw:rounded-full tw:border tw:border-white/20 tw:bg-white/10 tw:px-8 tw:py-2 tw:text-sm tw:font-medium tw:text-neutral-200 tw:backdrop-blur-sm tw:transition-all tw:duration-500 tw:ease-in-out hover:tw:bg-white/20 hover:tw:text-white">
        ${options.mode === 'lock' ? 'Unlock' : 'Enter'}
      </button>
    </div>
  `

  const signIn = () => {
    if (login.dataset.signingIn === 'true') return
    login.dataset.signingIn = 'true'
    login.classList.add('login-screen--exit')

    let finished = false
    const finish = () => {
      if (finished) return
      finished = true
      options.onLogin()
    }

    login.addEventListener('transitionend', finish, { once: true })
    window.setTimeout(finish, 550)
  }

  const profileBtn = login.querySelector('.login-profile') as HTMLButtonElement
  const enterBtn = login.querySelector('.login-enter') as HTMLButtonElement

  profileBtn.addEventListener('click', signIn)
  enterBtn.addEventListener('click', signIn)

  login.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      signIn()
    }
  })

  login.tabIndex = 0
  requestAnimationFrame(() => login.classList.add('login-screen--visible'))

  return login
}
