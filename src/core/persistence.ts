import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { FSNode, Notification, User, UserSettings } from '../types';

interface ZtionixDB extends DBSchema {
  users: {
    key: string;
    value: User;
  };
  fsNodes: {
    key: string;
    value: FSNode;
    indexes: { 'by-user': string; 'by-path': string };
  };
  settings: {
    key: string;
    value: UserSettings;
  };
  notifications: {
    key: string;
    value: Notification;
    indexes: { 'by-user': string };
  };
}

const DB_NAME = 'ztionixos';
const DB_VERSION = 1;

export class Persistence {
  private db: IDBPDatabase<ZtionixDB> | null = null;

  async init(): Promise<void> {
    this.db = await openDB<ZtionixDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('users')) {
          db.createObjectStore('users', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('fsNodes')) {
          const store = db.createObjectStore('fsNodes', { keyPath: 'id' });
          store.createIndex('by-user', 'userId');
          store.createIndex('by-path', 'path');
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'userId' });
        }
        if (!db.objectStoreNames.contains('notifications')) {
          const store = db.createObjectStore('notifications', { keyPath: 'id' });
          store.createIndex('by-user', 'userId');
        }
      },
    });
  }

  private getDb(): IDBPDatabase<ZtionixDB> {
    if (!this.db) throw new Error('Database not initialized');
    return this.db;
  }

  async getUsers(): Promise<User[]> {
    return this.getDb().getAll('users');
  }

  async saveUser(user: User): Promise<void> {
    await this.getDb().put('users', user);
  }

  async getSettings(userId: string): Promise<UserSettings | undefined> {
    return this.getDb().get('settings', userId);
  }

  async saveSettings(settings: UserSettings): Promise<void> {
    await this.getDb().put('settings', settings);
  }

  async getFSNodes(userId: string): Promise<FSNode[]> {
    return this.getDb().getAllFromIndex('fsNodes', 'by-user', userId);
  }

  async saveFSNode(node: FSNode): Promise<void> {
    await this.getDb().put('fsNodes', node);
  }

  async deleteFSNode(id: string): Promise<void> {
    await this.getDb().delete('fsNodes', id);
  }

  async clearFSNodes(userId: string): Promise<void> {
    const nodes = await this.getFSNodes(userId);
    const tx = this.getDb().transaction('fsNodes', 'readwrite');
    await Promise.all(nodes.map((n) => tx.store.delete(n.id)));
    await tx.done;
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    return this.getDb().getAllFromIndex('notifications', 'by-user', userId);
  }

  async saveNotification(notification: Notification): Promise<void> {
    await this.getDb().put('notifications', notification);
  }

  async clearNotifications(userId: string): Promise<void> {
    const notifications = await this.getNotifications(userId);
    const tx = this.getDb().transaction('notifications', 'readwrite');
    await Promise.all(notifications.map((n) => tx.store.delete(n.id)));
    await tx.done;
  }
}
