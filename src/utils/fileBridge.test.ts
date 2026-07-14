import { describe, it, expect } from 'vitest'
import { getAppForPath } from './fileBridge'
import { initFileSystem, fileSystem } from '../core/fileSystem'

describe('getAppForPath', () => {
  it('routes file types to correct apps', async () => {
    await initFileSystem()
    fileSystem.write('/home/user/Desktop/test.txt', 'hello')
    fileSystem.writeBinary('/home/user/Desktop/img.png', 'abc', 'image/png')
    fileSystem.writeBinary('/home/user/Desktop/song.mp3', 'abc', 'audio/mpeg')

    expect(getAppForPath('/home/user/Desktop/test.txt')).toBe('editor')
    expect(getAppForPath('/home/user/Desktop/img.png')).toBe('paint')
    expect(getAppForPath('/home/user/Desktop/song.mp3')).toBe('music')
  })
})
