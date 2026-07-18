export interface AppManifest {
  id: string
  name: string
  icon: string
  pinned?: boolean
  singleton?: boolean
  window?: {
    width: number
    height: number
    minWidth?: number
    minHeight?: number
    centered?: boolean
    resizable?: boolean
    variant?: string
  }
  launch: (ctx: AppContext) => HTMLElement | Promise<HTMLElement>
}

export interface AppContext {
  windowId: string
  close: () => void
  setTitle: (title: string) => void
  minimize: () => void
  maximize: () => void
}

export interface WindowState {
  id: string
  appId: string
  title: string
  x: number
  y: number
  width: number
  height: number
  minWidth: number
  minHeight: number
  zIndex: number
  minimized: boolean
  maximized: boolean
  prevBounds?: { x: number; y: number; width: number; height: number }
}

export interface FsNode {
  type: 'file' | 'directory'
  name: string
  children?: Record<string, FsNode>
  content?: string
  mime?: string
  encoding?: 'utf8' | 'base64'
  createdAt: number
  modifiedAt: number
}

export interface FsEntry {
  name: string
  path: string
  type: 'file' | 'directory'
  modifiedAt: number
  size?: number
  mime?: string
}

export interface FsStat {
  path: string
  type: 'file' | 'directory'
  size: number
  mime?: string
  modifiedAt: number
}

export interface Settings {
  theme: 'dark' | 'light'
  wallpaper: string
  customWallpaper?: string | null
  dockSize: number
  accentColor: string
  crtMode?: boolean
}

export interface Notification {
  id: string
  title: string
  message: string
  read: boolean
  timestamp: number
}

export type EventMap = {
  'window:focus': { id: string; appId: string; title: string }
  'window:blur': { id: string }
  'window:open': { id: string; appId: string }
  'window:close': { id: string; appId: string }
  'window:minimize': { id: string }
  'window:maximize': { id: string }
  'window:restore': { id: string }
  'window:update': { id: string }
  'app:launch': { appId: string }
  'theme:change': { theme: Settings['theme'] }
  'filesystem:change': { path: string }
  'filesystem:rename': { oldPath: string; newPath: string }
  'filesystem:move': { from: string; to: string }
  'settings:change': Settings
  'file:open': { path: string; appId?: string }
  'desktop:selection': { paths: string[] }
  'system:lock': Record<string, never>
  'system:logout': Record<string, never>
  'system:restart': Record<string, never>
  'system:shutdown': Record<string, never>
  'notification:push': Notification
  'launcher:open': Record<string, never>
  'launcher:close': Record<string, never>
  'dock:pins': { ids: string[] }
}

export type EventName = keyof EventMap
