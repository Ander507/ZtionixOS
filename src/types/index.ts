import type { Kernel } from '../core/kernel';

export interface AppContext {
  kernel: Kernel;
  processId: string;
  windowId: string;
}

export interface AppDefinition {
  id: string;
  name: string;
  icon: string;
  description?: string;
  defaultSize?: { width: number; height: number };
  resizable?: boolean;
  maximizable?: boolean;
  singleInstance?: boolean;
  createWindow: (ctx: AppContext, container: HTMLElement) => void | (() => void);
  installable?: boolean;
  storeOnly?: boolean;
}

export interface WindowState {
  id: string;
  processId: string;
  appId: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  minimized: boolean;
  maximized: boolean;
  zIndex: number;
}

export interface Process {
  id: string;
  appId: string;
  windowId: string;
}

export interface FSNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  parentId: string | null;
  path: string;
  content?: string;
  createdAt: number;
  modifiedAt: number;
  userId: string;
}

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  pinHash: string;
  isGuest?: boolean;
}

export interface UserSettings {
  userId: string;
  theme: 'dark' | 'light';
  wallpaper: string;
  accentColor: string;
  taskbarPosition: 'bottom';
  clockFormat: '12h' | '24h';
  installedApps: string[];
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  icon?: string;
}

export type EventMap = {
  'window:open': WindowState;
  'window:close': string;
  'window:focus': string;
  'window:minimize': string;
  'window:maximize': string;
  'window:restore': string;
  'window:update': WindowState;
  'app:launch': string;
  'app:close': string;
  'fs:change': void;
  notify: Omit<Notification, 'id' | 'timestamp' | 'read' | 'userId'>;
  'theme:change': void;
  'settings:change': UserSettings;
  'user:login': User;
  'user:logout': void;
  'desktop:ready': void;
  'startmenu:toggle': void;
  'shutdown:start': void;
};

export interface StoreApp {
  id: string;
  name: string;
  description: string;
  icon: string;
  version: string;
  category: string;
}
