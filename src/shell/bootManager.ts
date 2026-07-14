import { Kernel } from '../core/kernel'
import { createSplash } from './splash'
import { createLoginScreen } from './login'
import { windowManager } from '../core/windowManager'
import { eventBus } from '../core/eventBus'
import { notificationService } from '../core/notificationService'

export type BootPhase = 'booting' | 'login' | 'desktop' | 'locked' | 'shutdown'

export class BootManager {
  private root: HTMLElement
  private desktopHost: HTMLElement
  private overlay: HTMLElement
  private phase: BootPhase = 'booting'
  private kernel: Kernel | null = null
  private onPhaseChange?: (phase: BootPhase) => void
  private lockLogin: HTMLElement | null = null

  constructor(root: HTMLElement, options?: { onPhaseChange?: (phase: BootPhase) => void }) {
    this.root = root
    this.onPhaseChange = options?.onPhaseChange
    this.root.innerHTML = ''
    this.root.className = 'os-root'

    this.desktopHost = document.createElement('div')
    this.desktopHost.className = 'desktop-host desktop-host--preboot'

    this.overlay = document.createElement('div')
    this.overlay.className = 'boot-overlay'

    this.root.append(this.desktopHost, this.overlay)
    this.start()
  }

  getPhase(): BootPhase {
    return this.phase
  }

  private setPhase(phase: BootPhase): void {
    this.phase = phase
    this.onPhaseChange?.(phase)
  }

  private start(): void {
    this.setPhase('booting')

    this.kernel = new Kernel(this.desktopHost, this)
    this.kernel.boot()

    const splash = createSplash(() => this.showLogin())
    this.overlay.append(splash)
  }

  private showLogin(): void {
    this.setPhase('login')

    const login = createLoginScreen({
      username: 'Admin',
      onLogin: () => this.enterDesktop(),
    })

    this.overlay.append(login)
  }

  private enterDesktop(): void {
    this.setPhase('desktop')

    this.overlay.querySelector('.login-screen')?.remove()
    this.desktopHost.classList.remove('desktop-host--preboot')
    this.desktopHost.classList.add('desktop-host--active')

    window.setTimeout(() => {
      if (this.phase === 'desktop') this.overlay.remove()
    }, 520)

    this.showFirstRunHints()
  }

  private showFirstRunHints(): void {
    const key = 'ztionixos-onboarded'
    if (localStorage.getItem(key)) return
    localStorage.setItem(key, '1')
    window.setTimeout(() => {
      notificationService.push(
        'Welcome to ZtionixOS',
        'Open Welcome.txt on the Desktop, or try Messages to chat with other visitors.',
      )
    }, 800)
  }

  lock(): void {
    if (this.phase !== 'desktop') return
    this.setPhase('locked')

    if (!this.overlay.isConnected) {
      this.root.append(this.overlay)
    }

    this.lockLogin?.remove()
    this.lockLogin = createLoginScreen({
      username: 'Admin',
      onLogin: () => this.unlock(),
      mode: 'lock',
    })
    this.overlay.append(this.lockLogin)
    eventBus.emit('system:lock', {})
    notificationService.push('Locked', 'Session locked')
  }

  unlock(): void {
    if (this.phase !== 'locked') return
    this.setPhase('desktop')
    this.lockLogin?.remove()
    this.lockLogin = null
    if (this.overlay.children.length === 0) this.overlay.remove()
  }

  logout(): void {
    if (this.phase !== 'desktop' && this.phase !== 'locked') return
    windowManager.closeAll()
    this.setPhase('login')

    if (!this.overlay.isConnected) this.root.append(this.overlay)
    this.overlay.innerHTML = ''

    const login = createLoginScreen({
      username: 'Admin',
      onLogin: () => this.enterDesktop(),
    })
    this.overlay.append(login)
    eventBus.emit('system:logout', {})
    notificationService.push('Logged out', 'Sign in to continue')
  }

  restart(): void {
    windowManager.closeAll()
    eventBus.emit('system:restart', {})
    notificationService.push('Restarting', 'Reloading ZtionixOS…')
    window.setTimeout(() => window.location.reload(), 600)
  }

  shutdown(): void {
    windowManager.closeAll()
    this.setPhase('shutdown')
    eventBus.emit('system:shutdown', {})

    this.desktopHost.innerHTML = ''
    this.overlay.innerHTML = `
      <div class="shutdown-screen">
        <p>It is now safe to close this tab.</p>
      </div>
    `
    if (!this.overlay.isConnected) this.root.append(this.overlay)
    notificationService.push('Shut down', 'ZtionixOS has been shut down')
  }
}
