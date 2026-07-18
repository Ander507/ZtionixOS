import type { AppManifest } from '../../types'
import { eventBus } from '../../core/eventBus'
import { icon } from '../../utils/icons'
import {
  unlockDoomAudio,
  doomSfxFire,
  doomSfxUse,
  doomSfxMenu,
  setDoomMuted,
  isDoomMuted,
  stopDoomAudio,
} from './sfx'

function readModuleMemoryAsUtf8String(
  moduleMemory: WebAssembly.Memory,
  offsetIntoMemory: number,
  stringByteLength: number,
): string {
  const buffer8 = new Uint8Array(moduleMemory.buffer)
  const dec = new TextDecoder('utf-8', { fatal: false })
  const data = buffer8.slice(offsetIntoMemory, offsetIntoMemory + stringByteLength)
  return dec.decode(data)
}

type DoomExports = {
  memory: WebAssembly.Memory
  initGame: () => void
  tickGame: () => void
  reportKeyDown: (key: number) => void
  reportKeyUp: (key: number) => void
  KEY_LEFTARROW: number
  KEY_RIGHTARROW: number
  KEY_UPARROW: number
  KEY_DOWNARROW: number
  KEY_STRAFE_L: number
  KEY_STRAFE_R: number
  KEY_FIRE: number
  KEY_USE: number
  KEY_SHIFT: number
  KEY_TAB: number
  KEY_ESCAPE: number
  KEY_ENTER: number
  KEY_BACKSPACE: number
  KEY_ALT: number
}

async function startDoom(
  canvas: HTMLCanvasElement,
  onReady: () => void,
  onError: (msg: string) => void,
): Promise<{ stop: () => void }> {
  let moduleInstanceMemory: WebAssembly.Memory | null = null
  let scratchSpaceImageData: ImageData | null = null
  let tickTimer: number | null = null
  let exportsRef: DoomExports | null = null

  const ctx2d = canvas.getContext('2d')
  if (!ctx2d) {
    onError('Canvas not supported')
    return { stop: () => {} }
  }

  const onGameInit = (width: number, height: number) => {
    canvas.width = width
    canvas.height = height
    scratchSpaceImageData = ctx2d.createImageData(width, height)
  }

  const drawFrame = (indexOfFrameBuffer: number) => {
    if (!moduleInstanceMemory || !scratchSpaceImageData) return
    const doomFrameBuffer = new Uint8Array(
      moduleInstanceMemory.buffer,
      indexOfFrameBuffer,
      canvas.width * canvas.height * 4,
    )
    const data = scratchSpaceImageData.data
    for (let i = 0; i < data.length / 4; i++) {
      data[4 * i + 0] = doomFrameBuffer[4 * i + 2]
      data[4 * i + 1] = doomFrameBuffer[4 * i + 1]
      data[4 * i + 2] = doomFrameBuffer[4 * i + 0]
      data[4 * i + 3] = 255
    }
    ctx2d.putImageData(scratchSpaceImageData, 0, 0)
  }

  const timeInMilliseconds = (): bigint => BigInt(Math.trunc(performance.now()))

  const onInfoMessage = (messagePtr: number, length: number) => {
    if (!moduleInstanceMemory) return
    console.log('[Doom]', readModuleMemoryAsUtf8String(moduleInstanceMemory, messagePtr, length))
  }

  const onErrorMessage = (messagePtr: number, length: number) => {
    if (!moduleInstanceMemory) return
    console.error('[Doom]', readModuleMemoryAsUtf8String(moduleInstanceMemory, messagePtr, length))
  }

  const imports: WebAssembly.Imports = {
    loading: {
      onGameInit,
      wadSizes: () => {},
      readWads: () => {},
    },
    ui: { drawFrame },
    runtimeControl: { timeInMilliseconds },
    console: { onInfoMessage, onErrorMessage },
    gameSaving: {
      sizeOfSaveGame: () => 0,
      readSaveGame: () => 0,
      writeSaveGame: () => 0,
    },
  }

  try {
    const result = await WebAssembly.instantiateStreaming(fetch('/doom/doom.wasm'), imports)
    const exports = result.instance.exports as unknown as DoomExports
    exportsRef = exports
    moduleInstanceMemory = exports.memory

    const doomKeyFromJavascriptKey = new Map<string, number>([
      ['ArrowLeft', exports.KEY_LEFTARROW],
      ['ArrowRight', exports.KEY_RIGHTARROW],
      ['ArrowUp', exports.KEY_UPARROW],
      ['ArrowDown', exports.KEY_DOWNARROW],
      [',', exports.KEY_STRAFE_L],
      ['.', exports.KEY_STRAFE_R],
      ['Control', exports.KEY_FIRE],
      [' ', exports.KEY_USE],
      ['Shift', exports.KEY_SHIFT],
      ['Tab', exports.KEY_TAB],
      ['Escape', exports.KEY_ESCAPE],
      ['Enter', exports.KEY_ENTER],
      ['Backspace', exports.KEY_BACKSPACE],
      ['Alt', exports.KEY_ALT],
    ])

    const convertKeyEventToDoomKey = (e: KeyboardEvent): number | null => {
      let correspondingDoomKey: number | null = null
      if (doomKeyFromJavascriptKey.has(e.key)) {
        correspondingDoomKey = doomKeyFromJavascriptKey.get(e.key) ?? null
      } else if (e.key.length === 1) {
        correspondingDoomKey = e.key.charCodeAt(0)
      }
      if (correspondingDoomKey !== null) {
        e.stopPropagation()
        e.preventDefault()
      }
      return correspondingDoomKey
    }

    const maybeSfx = (doomKey: number) => {
      if (doomKey === exports.KEY_FIRE) doomSfxFire()
      else if (doomKey === exports.KEY_USE) doomSfxUse()
      else if (doomKey === exports.KEY_ENTER || doomKey === exports.KEY_ESCAPE) doomSfxMenu()
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (document.activeElement !== canvas) return
      if (event.repeat) {
        const doomKey = convertKeyEventToDoomKey(event)
        if (doomKey !== null) exports.reportKeyDown(doomKey)
        return
      }
      const doomKey = convertKeyEventToDoomKey(event)
      if (doomKey !== null) {
        maybeSfx(doomKey)
        exports.reportKeyDown(doomKey)
      }
    }

    const onKeyUp = (event: KeyboardEvent) => {
      if (document.activeElement !== canvas) return
      const doomKey = convertKeyEventToDoomKey(event)
      if (doomKey !== null) exports.reportKeyUp(doomKey)
    }

    canvas.addEventListener('keydown', onKeyDown)
    canvas.addEventListener('keyup', onKeyUp)

    exports.initGame()
    tickTimer = window.setInterval(() => {
      if (exportsRef) exportsRef.tickGame()
    }, 1000 / 35)

    onReady()

    return {
      stop: () => {
        if (tickTimer !== null) {
          window.clearInterval(tickTimer)
          tickTimer = null
        }
        canvas.removeEventListener('keydown', onKeyDown)
        canvas.removeEventListener('keyup', onKeyUp)
        exportsRef = null
        moduleInstanceMemory = null
        stopDoomAudio()
      },
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to load Doom'
    onError(msg)
    return { stop: () => {} }
  }
}

export const doomApp: AppManifest = {
  id: 'doom',
  name: 'Doom',
  icon: icon('doom'),
  pinned: true,
  singleton: true,
  window: { width: 680, height: 540, minWidth: 400, minHeight: 380, centered: true },
  launch: (ctx) => {
    const root = document.createElement('div')
    root.className = 'app-doom'

    const status = document.createElement('div')
    status.className = 'doom-status'
    status.textContent = 'Loading Doom…'

    const canvas = document.createElement('canvas')
    canvas.className = 'doom-canvas'
    canvas.tabIndex = 0
    canvas.width = 320
    canvas.height = 200
    canvas.title = 'Click to focus, then play'

    const hint = document.createElement('p')
    hint.className = 'doom-hint'
    hint.textContent = 'Click canvas · Arrows · Ctrl fire · Space use · Esc menu · WAD SFX'

    const muteBtn = document.createElement('button')
    muteBtn.className = 'app-btn doom-mute'
    muteBtn.textContent = isDoomMuted() ? 'Unmute SFX' : 'Mute SFX'
    muteBtn.addEventListener('click', () => {
      setDoomMuted(!isDoomMuted())
      muteBtn.textContent = isDoomMuted() ? 'Unmute SFX' : 'Mute SFX'
    })

    root.append(status, canvas, hint, muteBtn)

    let stopFn: (() => void) | null = null

    void startDoom(
      canvas,
      () => {
        status.textContent = 'Ready — click the game (unlocks WAD sound)'
        status.classList.add('doom-status--ready')
        canvas.focus()
      },
      (msg) => {
        status.textContent = 'Could not load Doom: ' + msg
        status.classList.add('doom-status--error')
      },
    ).then((handle) => {
      stopFn = handle.stop
    })

    canvas.addEventListener('click', () => {
      void unlockDoomAudio()
      canvas.focus()
    })

    const onClose = ({ id }: { id: string }) => {
      if (id !== ctx.windowId) return
      if (stopFn) stopFn()
      eventBus.off('window:close', onClose)
    }
    eventBus.on('window:close', onClose)

    return root
  },
}
