import { icon } from '../utils/icons'

const BOOT_DURATION_MS = 2500

export function createSplash(onComplete: () => void): HTMLElement {
  const splash = document.createElement('div')
  splash.className =
    'boot-splash tw:fixed tw:inset-0 tw:z-[20000] tw:flex tw:flex-col tw:items-center tw:justify-center tw:bg-[#111111] tw:transition-opacity tw:duration-500 tw:ease-in-out'

  splash.innerHTML = `
    <div class="boot-splash-logo tw:mb-10 tw:flex tw:flex-col tw:items-center tw:gap-4">
      ${icon('logo', 'boot-logo-mark')}
      <span class="tw:text-xl tw:font-semibold tw:tracking-wide tw:text-neutral-200">ZtionixOS</span>
    </div>
    <div class="boot-splash-progress tw:w-48 tw:h-1 tw:rounded-full tw:bg-neutral-800 tw:overflow-hidden">
      <div class="boot-splash-progress-bar tw:h-full tw:rounded-full tw:bg-neutral-400"></div>
    </div>
  `

  const bar = splash.querySelector('.boot-splash-progress-bar') as HTMLElement
  requestAnimationFrame(() => {
    bar.style.transition = `width ${BOOT_DURATION_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`
    bar.style.width = '100%'
  })

  window.setTimeout(() => {
    splash.classList.add('boot-splash--out')
    splash.addEventListener(
      'transitionend',
      () => {
        splash.remove()
        onComplete()
      },
      { once: true },
    )
  }, BOOT_DURATION_MS)

  return splash
}
