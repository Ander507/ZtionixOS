/**
 * Play Doom IWAD sound lumps (8-bit PCM) via Web Audio.
 * doom.wasm has no audio API — we trigger classic samples on key actions.
 */

let ctx: AudioContext | null = null
let muted = false
let unlocked = false
let loadPromise: Promise<void> | null = null
const buffers = new Map<string, AudioBuffer>()

function getCtx(): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null
  if (!ctx) ctx = new AudioContext()
  return ctx
}

export function setDoomMuted(on: boolean): void {
  muted = on
}

export function isDoomMuted(): boolean {
  return muted
}

export async function unlockDoomAudio(): Promise<void> {
  const c = getCtx()
  if (!c) return
  if (c.state === 'suspended') await c.resume()
  unlocked = true
  await ensureSoundsLoaded()
}

function readName(bytes: Uint8Array, offset: number): string {
  let s = ''
  for (let i = 0; i < 8; i++) {
    const b = bytes[offset + i]
    if (b === 0) break
    s += String.fromCharCode(b)
  }
  return s.toUpperCase()
}

/** Doom sound lump: 2 unused + uint16 rate + uint16 samples + 2 pad + PCM u8 */
function decodeDoomSound(c: AudioContext, data: Uint8Array): AudioBuffer | null {
  if (data.length < 8) return null
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  const rate = view.getUint16(2, true)
  const count = view.getUint16(4, true)
  if (rate < 1000 || rate > 48000 || count < 1) return null
  const pcmStart = 8
  const n = Math.min(count, data.length - pcmStart)
  if (n < 1) return null
  const buf = c.createBuffer(1, n, rate)
  const ch = buf.getChannelData(0)
  for (let i = 0; i < n; i++) {
    ch[i] = (data[pcmStart + i] - 128) / 128
  }
  return buf
}

async function ensureSoundsLoaded(): Promise<void> {
  if (buffers.size > 0) return
  if (loadPromise) return loadPromise
  loadPromise = (async () => {
    const c = getCtx()
    if (!c) return
    try {
      const res = await fetch('/doom/doom1.wad')
      if (!res.ok) throw new Error('wad missing')
      const ab = await res.arrayBuffer()
      const bytes = new Uint8Array(ab)
      if (readName(bytes, 0) !== 'IWAD' && bytes[0] !== 0x49) {
        // IWAD ascii
      }
      const magic = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3])
      if (magic !== 'IWAD' && magic !== 'PWAD') throw new Error('bad wad')
      const view = new DataView(ab)
      const numLumps = view.getUint32(4, true)
      const dirOff = view.getUint32(8, true)
      const want = new Set(['DSPISTOL', 'DSPSTOP', 'DSITMBK', 'DSDOROPN', 'DSSWTCHN', 'DSSWTCHX', 'DSPLDETH', 'DSBAREXP'])
      for (let i = 0; i < numLumps; i++) {
        const e = dirOff + i * 16
        const off = view.getUint32(e, true)
        const size = view.getUint32(e + 4, true)
        const name = readName(bytes, e + 8)
        if (!want.has(name) || size < 8) continue
        const lump = bytes.subarray(off, off + size)
        const audio = decodeDoomSound(c, lump)
        if (audio) buffers.set(name, audio)
      }
    } catch (err) {
      console.warn('[Doom] WAD sounds unavailable', err)
    }
  })()
  return loadPromise
}

function playLump(name: string, gainPeak = 0.35): void {
  if (muted || !unlocked) return
  const c = getCtx()
  if (!c) return
  const buf = buffers.get(name)
  if (!buf) {
    // soft fallback while loading / missing lump
    return
  }
  const src = c.createBufferSource()
  src.buffer = buf
  const gain = c.createGain()
  gain.gain.value = gainPeak
  src.connect(gain)
  gain.connect(c.destination)
  src.start()
}

export function doomSfxFire(): void {
  void ensureSoundsLoaded().then(() => playLump('DSPISTOL', 0.4))
}

export function doomSfxUse(): void {
  void ensureSoundsLoaded().then(() => {
    playLump('DSITMBK', 0.35)
  })
}

export function doomSfxMenu(): void {
  void ensureSoundsLoaded().then(() => {
    playLump('DSSWTCHN', 0.3)
    if (!buffers.has('DSSWTCHN')) playLump('DSPSTOP', 0.25)
  })
}

export function stopDoomAudio(): void {
  if (ctx) {
    void ctx.close()
    ctx = null
  }
  unlocked = false
  buffers.clear()
  loadPromise = null
}
