import { describe, it, expect } from 'vitest'
import { normalizePath, guessMime } from '../core/fileSystem'
import { gridKey, snapPosition } from '../core/desktopLayout'

describe('fileSystem helpers', () => {
  it('normalizes paths', () => {
    expect(normalizePath('/home/user/../user/Desktop')).toBe('/home/user/Desktop')
    expect(normalizePath('/a/./b')).toBe('/a/b')
  })

  it('guesses mime types', () => {
    expect(guessMime('notes.txt')).toBe('text/plain')
    expect(guessMime('photo.png')).toBe('image/png')
    expect(guessMime('song.mp3')).toBe('audio/mpeg')
  })
})

describe('desktopLayout', () => {
  it('snaps icon positions to grid', () => {
    const snapped = snapPosition(20, 20)
    expect(snapped.x).toBe(16)
    expect(snapped.y).toBe(16)
  })

  it('creates stable grid keys', () => {
    expect(gridKey(16, 16)).toBe('16,16')
  })
})
