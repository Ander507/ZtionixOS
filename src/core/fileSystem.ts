import type { FsEntry, FsNode, FsStat } from '../types'
import { eventBus } from './eventBus'
import { desktopLayout } from './desktopLayout'
import { loadVfsFromStorage, saveVfsToStorage, clearVfsStorage } from './vfsStorage'

const STORAGE_KEY = 'ztionixos-vfs'

function now(): number {
  return Date.now()
}

function createDir(name: string): FsNode {
  return { type: 'directory', name, children: {}, createdAt: now(), modifiedAt: now() }
}

function createFile(name: string, content = '', mime = 'text/plain', encoding: 'utf8' | 'base64' = 'utf8'): FsNode {
  return { type: 'file', name, content, mime, encoding, createdAt: now(), modifiedAt: now() }
}

function fileSize(node: FsNode): number {
  if (node.type !== 'file' || !node.content) return 0
  if (node.encoding === 'base64') return Math.floor((node.content.length * 3) / 4)
  return new Blob([node.content]).size
}

function guessMime(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase()
  const map: Record<string, string> = {
    txt: 'text/plain', md: 'text/markdown', json: 'application/json',
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
    mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg',
  }
  return map[ext ?? ''] ?? 'application/octet-stream'
}

function seedFs(): FsNode {
  const root = createDir('/')
  const home = createDir('home')
  const user = createDir('user')
  const desktop = createDir('Desktop')
  const documents = createDir('Documents')
  const downloads = createDir('Downloads')

  desktop.children!['Welcome.txt'] = createFile(
    'Welcome.txt',
    'Welcome to ZtionixOS!\n\nThis is your virtual desktop. Open Files, Terminal, or Text Editor from the dock.\n',
  )
  desktop.children!['Notes.txt'] = createFile('Notes.txt', 'My notes...\n')
  documents.children!['readme.md'] = createFile('readme.md', '# ZtionixOS\n\nA web-based operating system built with Vite and TypeScript.\n', 'text/markdown')

  user.children!['Desktop'] = desktop
  user.children!['Documents'] = documents
  user.children!['Downloads'] = downloads
  home.children!['user'] = user
  root.children!['home'] = home

  return root
}

function normalizePath(path: string): string {
  const parts = path.split('/').filter(Boolean)
  const resolved: string[] = []
  for (const part of parts) {
    if (part === '.') continue
    if (part === '..') resolved.pop()
    else resolved.push(part)
  }
  return '/' + resolved.join('/')
}

function joinPath(base: string, segment: string): string {
  if (segment.startsWith('/')) return normalizePath(segment)
  const baseNorm = normalizePath(base)
  return normalizePath(baseNorm === '/' ? `/${segment}` : `${baseNorm}/${segment}`)
}

function basename(path: string): string {
  const parts = normalizePath(path).split('/').filter(Boolean)
  return parts[parts.length - 1] ?? ''
}

class VirtualFileSystem {
  private root: FsNode
  private saveTimer: ReturnType<typeof setTimeout> | null = null
  private ready = false

  constructor() {
    this.root = seedFs()
  }

  async init(): Promise<void> {
    if (this.ready) return
    try {
      const stored = await loadVfsFromStorage()
      if (stored) {
        const root = JSON.parse(stored) as FsNode
        this.repairNode(root)
        this.root = root
      }
    } catch { /* keep seed */ }
    this.ready = true
  }

  isReady(): boolean {
    return this.ready
  }

  private repairNode(node: FsNode): void {
    if (node.type === 'directory' && !node.children) node.children = {}
    if (node.type === 'file') {
      if (!node.encoding) node.encoding = 'utf8'
      if (!node.mime) node.mime = guessMime(node.name)
    }
    if (node.children) {
      for (const child of Object.values(node.children)) this.repairNode(child)
    }
  }

  private save(): void {
    const json = JSON.stringify(this.root)
    if (this.saveTimer) clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(() => {
      saveVfsToStorage(json).catch(() => {
        try { localStorage.setItem(STORAGE_KEY, json) } catch { /* quota */ }
      })
    }, 120)
    eventBus.emit('filesystem:change', { path: '/' })
  }

  private resolveNode(path: string): FsNode | null {
    const norm = normalizePath(path)
    if (norm === '/') return this.root
    const parts = norm.split('/').filter(Boolean)
    let current: FsNode = this.root
    for (const part of parts) {
      if (current.type !== 'directory' || !current.children?.[part]) return null
      current = current.children[part]
    }
    return current
  }

  private resolveParent(path: string): { parent: FsNode; name: string; parentPath: string } | null {
    const norm = normalizePath(path)
    const parts = norm.split('/').filter(Boolean)
    if (parts.length === 0) return null
    const name = parts.pop()!
    const parentPath = '/' + parts.join('/')
    const parent = this.resolveNode(parentPath === '/' ? '/' : parentPath)
    if (!parent || parent.type !== 'directory') return null
    if (!parent.children) parent.children = {}
    return { parent, name, parentPath: parentPath === '' ? '/' : parentPath }
  }

  private uniqueName(parent: FsNode, baseName: string): string {
    if (!parent.children) parent.children = {}
    if (!parent.children[baseName]) return baseName
    const dot = baseName.lastIndexOf('.')
    const stem = dot > 0 ? baseName.slice(0, dot) : baseName
    const ext = dot > 0 ? baseName.slice(dot) : ''
    let i = 2
    while (parent.children[`${stem} ${i}${ext}`]) i++
    return `${stem} ${i}${ext}`
  }

  private cloneNode(node: FsNode): FsNode {
    if (node.type === 'directory') {
      const copy = createDir(node.name)
      copy.createdAt = node.createdAt
      copy.modifiedAt = now()
      if (node.children) {
        for (const [k, v] of Object.entries(node.children)) {
          copy.children![k] = this.cloneNode(v)
        }
      }
      return copy
    }
    const copy = createFile(node.name, node.content ?? '', node.mime, node.encoding)
    copy.createdAt = node.createdAt
    copy.modifiedAt = now()
    return copy
  }

  sanitizeName(name: string): string | null {
    const trimmed = name.trim()
    if (!trimmed || trimmed.includes('/') || trimmed === '.' || trimmed === '..') return null
    return trimmed
  }

  exists(path: string): boolean {
    return this.resolveNode(path) !== null
  }

  isDirectory(path: string): boolean {
    return this.resolveNode(path)?.type === 'directory'
  }

  isFile(path: string): boolean {
    return this.resolveNode(path)?.type === 'file'
  }

  list(path: string): FsEntry[] {
    const node = this.resolveNode(path)
    if (!node || node.type !== 'directory') return []
    if (!node.children) node.children = {}
    const base = normalizePath(path)
    return Object.values(node.children)
      .map((child) => ({
        name: child.name,
        path: base === '/' ? `/${child.name}` : `${base}/${child.name}`,
        type: child.type,
        modifiedAt: child.modifiedAt,
        size: child.type === 'file' ? fileSize(child) : undefined,
        mime: child.type === 'file' ? child.mime : undefined,
      }))
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
        return a.name.localeCompare(b.name)
      })
  }

  stat(path: string): FsStat | null {
    const node = this.resolveNode(path)
    if (!node) return null
    return {
      path: normalizePath(path),
      type: node.type,
      size: node.type === 'file' ? fileSize(node) : 0,
      mime: node.type === 'file' ? node.mime : undefined,
      modifiedAt: node.modifiedAt,
    }
  }

  read(path: string): string | null {
    const node = this.resolveNode(path)
    if (!node || node.type !== 'file') return null
    return node.content ?? ''
  }

  readAsDataUrl(path: string): string | null {
    const node = this.resolveNode(path)
    if (!node || node.type !== 'file') return null
    const mime = node.mime ?? 'application/octet-stream'
    if (node.encoding === 'base64') return `data:${mime};base64,${node.content ?? ''}`
    return `data:${mime};base64,${btoa(unescape(encodeURIComponent(node.content ?? '')))}`
  }

  write(path: string, content: string, mime?: string): boolean {
    const resolved = this.resolveNode(path)
    if (resolved?.type === 'file') {
      resolved.content = content
      resolved.encoding = 'utf8'
      if (mime) resolved.mime = mime
      resolved.modifiedAt = now()
      this.save()
      return true
    }
    const parentInfo = this.resolveParent(path)
    if (!parentInfo) return false
    const safeName = this.sanitizeName(parentInfo.name)
    if (!safeName) return false
    parentInfo.parent.children![safeName] = createFile(safeName, content, mime ?? guessMime(safeName))
    parentInfo.parent.modifiedAt = now()
    this.save()
    return true
  }

  writeBinary(path: string, base64: string, mime: string): boolean {
    const parentInfo = this.resolveParent(path)
    if (!parentInfo) return false
    const safeName = this.sanitizeName(parentInfo.name)
    if (!safeName) return false
    const existing = parentInfo.parent.children![safeName]
    if (existing?.type === 'file') {
      existing.content = base64
      existing.encoding = 'base64'
      existing.mime = mime
      existing.modifiedAt = now()
    } else {
      const file = createFile(safeName, base64, mime, 'base64')
      parentInfo.parent.children![safeName] = file
    }
    parentInfo.parent.modifiedAt = now()
    this.save()
    return true
  }

  mkdir(path: string): boolean {
    const norm = normalizePath(path)
    if (this.exists(norm)) return false
    const parentInfo = this.resolveParent(norm)
    if (!parentInfo) return false
    const safeName = this.sanitizeName(parentInfo.name)
    if (!safeName) return false
    parentInfo.parent.children![safeName] = createDir(safeName)
    parentInfo.parent.modifiedAt = now()
    this.save()
    return true
  }

  mkdirIn(parentPath: string, name: string): string | null {
    const safeName = this.sanitizeName(name)
    if (!safeName) return null
    const parent = this.resolveNode(normalizePath(parentPath))
    if (!parent || parent.type !== 'directory') return null
    if (!parent.children) parent.children = {}
    const finalName = this.uniqueName(parent, safeName)
    parent.children[finalName] = createDir(finalName)
    parent.modifiedAt = now()
    this.save()
    return joinPath(parentPath, finalName)
  }

  touch(path: string): boolean {
    const norm = normalizePath(path)
    if (this.exists(norm)) {
      const node = this.resolveNode(norm)
      if (node?.type === 'file') { node.modifiedAt = now(); this.save(); return true }
      return false
    }
    const parentInfo = this.resolveParent(norm)
    if (!parentInfo) return false
    const safeName = this.sanitizeName(parentInfo.name)
    if (!safeName) return false
    parentInfo.parent.children![safeName] = createFile(safeName, '')
    parentInfo.parent.modifiedAt = now()
    this.save()
    return true
  }

  touchIn(parentPath: string, name: string): string | null {
    const safeName = this.sanitizeName(name)
    if (!safeName) return null
    const parent = this.resolveNode(normalizePath(parentPath))
    if (!parent || parent.type !== 'directory') return null
    if (!parent.children) parent.children = {}
    const finalName = this.uniqueName(parent, safeName)
    parent.children[finalName] = createFile(finalName, '')
    parent.modifiedAt = now()
    this.save()
    return joinPath(parentPath, finalName)
  }

  remove(path: string, recursive = false): boolean {
    const norm = normalizePath(path)
    if (norm === '/' || norm === '/home' || norm === '/home/user') return false
    const node = this.resolveNode(norm)
    if (!node) return false
    if (node.type === 'directory' && node.children && Object.keys(node.children).length > 0 && !recursive) return false
    const parentInfo = this.resolveParent(norm)
    if (!parentInfo) return false
    delete parentInfo.parent.children![parentInfo.name]
    parentInfo.parent.modifiedAt = now()
    desktopLayout.remove(norm)
    this.save()
    return true
  }

  rename(oldPath: string, newName: string): string | null {
    const norm = normalizePath(oldPath)
    const parentInfo = this.resolveParent(norm)
    if (!parentInfo) return null
    const safeName = this.sanitizeName(newName)
    if (!safeName || parentInfo.parent.children?.[safeName]) return null
    const node = parentInfo.parent.children?.[parentInfo.name]
    if (!node) return null
    node.name = safeName
    parentInfo.parent.children[safeName] = node
    delete parentInfo.parent.children[parentInfo.name]
    parentInfo.parent.modifiedAt = now()
    const newPath = joinPath(parentInfo.parentPath, safeName)
    desktopLayout.renamePath(norm, newPath)
    eventBus.emit('filesystem:rename', { oldPath: norm, newPath })
    this.save()
    return newPath
  }

  move(src: string, destDir: string): string | null {
    const srcNorm = normalizePath(src)
    const destNorm = normalizePath(destDir)
    if (!this.exists(srcNorm) || !this.isDirectory(destNorm)) return null
    const parentInfo = this.resolveParent(srcNorm)
    if (!parentInfo) return null
    const destParent = this.resolveNode(destNorm)
    if (!destParent?.children) return null
    const finalName = this.uniqueName(destParent, parentInfo.name)
    const node = parentInfo.parent.children![parentInfo.name]
    delete parentInfo.parent.children[parentInfo.name]
    node.name = finalName
    destParent.children[finalName] = node
    destParent.modifiedAt = now()
    parentInfo.parent.modifiedAt = now()
    const newPath = joinPath(destNorm, finalName)
    desktopLayout.renamePath(srcNorm, newPath)
    eventBus.emit('filesystem:move', { from: srcNorm, to: newPath })
    this.save()
    return newPath
  }

  copy(src: string, destDir: string): string | null {
    const srcNorm = normalizePath(src)
    const destNorm = normalizePath(destDir)
    const node = this.resolveNode(srcNorm)
    const destParent = this.resolveNode(destNorm)
    if (!node || !destParent || destParent.type !== 'directory') return null
    if (!destParent.children) destParent.children = {}
    const finalName = this.uniqueName(destParent, node.name)
    destParent.children[finalName] = this.cloneNode(node)
    destParent.modifiedAt = now()
    const newPath = joinPath(destNorm, finalName)
    this.save()
    return newPath
  }

  getUsage(): { items: number; bytes: number } {
    let items = 0
    let bytes = 0
    const walk = (node: FsNode) => {
      if (node.type === 'file') { items++; bytes += fileSize(node) }
      else if (node.children) Object.values(node.children).forEach(walk)
    }
    walk(this.root)
    return { items, bytes }
  }

  exportSnapshot(): string {
    return JSON.stringify(this.root)
  }

  importSnapshot(json: string): boolean {
    try {
      const root = JSON.parse(json) as FsNode
      this.repairNode(root)
      this.root = root
      this.save()
      return true
    } catch { return false }
  }

  reset(): void {
    this.root = seedFs()
    clearVfsStorage().catch(() => localStorage.removeItem(STORAGE_KEY))
    this.save()
  }

  clearDownloads(): void {
    const dl = this.resolveNode('/home/user/Downloads')
    if (dl?.type === 'directory') {
      dl.children = {}
      dl.modifiedAt = now()
      this.save()
    }
  }

  resolve(path: string, cwd: string): string {
    return joinPath(cwd, path)
  }

  getHome(): string { return '/home/user' }
  getDesktop(): string { return '/home/user/Desktop' }
  getDocuments(): string { return '/home/user/Documents' }
  getDownloads(): string { return '/home/user/Downloads' }
}

export const fileSystem = new VirtualFileSystem()

export async function initFileSystem(): Promise<void> {
  await fileSystem.init()
}

export { basename, guessMime, joinPath, normalizePath }
