import type { EventBus } from './eventBus';
import type { Persistence } from './persistence';
import type { FSNode } from '../types';
import { generateId } from '../utils';

export class FileSystem {
  private nodes: FSNode[] = [];
  private userId: string | null = null;

  constructor(
    private persistence: Persistence,
    private bus: EventBus
  ) {}

  async initForUser(userId: string): Promise<void> {
    this.userId = userId;
    this.nodes = await this.persistence.getFSNodes(userId);
    if (this.nodes.length === 0) {
      await this.seedDefaultFS(userId);
    }
  }

  private async seedDefaultFS(userId: string): Promise<void> {
    const home = this.createNode('home', 'folder', null, `/home`, userId);
    const userFolder = this.createNode(userId, 'folder', home.id, `/home/${userId}`, userId);
    const desktop = this.createNode('Desktop', 'folder', userFolder.id, `/home/${userId}/Desktop`, userId);
    const documents = this.createNode('Documents', 'folder', userFolder.id, `/home/${userId}/Documents`, userId);
    const downloads = this.createNode('Downloads', 'folder', userFolder.id, `/home/${userId}/Downloads`, userId);
    const apps = this.createNode('Apps', 'folder', userFolder.id, `/home/${userId}/Apps`, userId);

    const welcome = this.createNode('welcome.txt', 'file', documents.id, `/home/${userId}/Documents/welcome.txt`, userId);
    welcome.content = 'Welcome to ZtionixOS!\n\nThis is your virtual file system. Use the File Explorer or Terminal to manage files.';

    const readme = this.createNode('README.txt', 'file', desktop.id, `/home/${userId}/Desktop/README.txt`, userId);
    readme.content = 'Double-click files to open them in Notepad.\nRight-click the desktop for more options.';

    const seed = [home, userFolder, desktop, documents, downloads, apps, welcome, readme];
    for (const node of seed) {
      await this.persistence.saveFSNode(node);
      this.nodes.push(node);
    }
  }

  private createNode(name: string, type: 'file' | 'folder', parentId: string | null, path: string, userId: string): FSNode {
    const now = Date.now();
    return { id: generateId(), name, type, parentId, path, createdAt: now, modifiedAt: now, userId };
  }

  getNodes(): FSNode[] {
    return [...this.nodes];
  }

  getNodeByPath(path: string): FSNode | undefined {
    return this.nodes.find((n) => n.path === path);
  }

  getNodeById(id: string): FSNode | undefined {
    return this.nodes.find((n) => n.id === id);
  }

  getChildren(parentId: string | null): FSNode[] {
    return this.nodes.filter((n) => n.parentId === parentId);
  }

  getHomePath(): string {
    return `/home/${this.userId}`;
  }

  async createFolder(parentPath: string, name: string): Promise<FSNode | null> {
    const parent = this.getNodeByPath(parentPath);
    if (!parent || parent.type !== 'folder') return null;
    const path = `${parentPath}/${name}`.replace(/\/+/g, '/');
    if (this.getNodeByPath(path)) return null;

    const node = this.createNode(name, 'folder', parent.id, path, this.userId!);
    await this.persistence.saveFSNode(node);
    this.nodes.push(node);
    this.bus.emit('fs:change', undefined);
    return node;
  }

  async createFile(parentPath: string, name: string, content = ''): Promise<FSNode | null> {
    const parent = this.getNodeByPath(parentPath);
    if (!parent || parent.type !== 'folder') return null;
    const path = `${parentPath}/${name}`.replace(/\/+/g, '/');
    if (this.getNodeByPath(path)) return null;

    const node = this.createNode(name, 'file', parent.id, path, this.userId!);
    node.content = content;
    await this.persistence.saveFSNode(node);
    this.nodes.push(node);
    this.bus.emit('fs:change', undefined);
    return node;
  }

  async updateFile(path: string, content: string): Promise<boolean> {
    const node = this.getNodeByPath(path);
    if (!node || node.type !== 'file') return false;
    node.content = content;
    node.modifiedAt = Date.now();
    await this.persistence.saveFSNode(node);
    this.bus.emit('fs:change', undefined);
    return true;
  }

  async rename(path: string, newName: string): Promise<boolean> {
    const node = this.getNodeByPath(path);
    if (!node) return false;
    const parentPath = path.substring(0, path.lastIndexOf('/')) || '/';
    const newPath = `${parentPath}/${newName}`.replace(/\/+/g, '/');
    if (this.getNodeByPath(newPath)) return false;

    const oldPath = node.path;
    node.name = newName;
    node.path = newPath;
    node.modifiedAt = Date.now();

    const descendants = this.nodes.filter((n) => n.path.startsWith(oldPath + '/'));
    for (const d of descendants) {
      d.path = d.path.replace(oldPath, newPath);
      d.modifiedAt = Date.now();
      await this.persistence.saveFSNode(d);
    }

    await this.persistence.saveFSNode(node);
    this.bus.emit('fs:change', undefined);
    return true;
  }

  async delete(path: string): Promise<boolean> {
    const node = this.getNodeByPath(path);
    if (!node || node.path === `/home/${this.userId}`) return false;

    const toDelete = this.nodes.filter((n) => n.path === path || n.path.startsWith(path + '/'));
    for (const n of toDelete) {
      await this.persistence.deleteFSNode(n.id);
    }
    this.nodes = this.nodes.filter((n) => !toDelete.some((d) => d.id === n.id));
    this.bus.emit('fs:change', undefined);
    return true;
  }

  listDir(path: string): FSNode[] {
    const node = this.getNodeByPath(path);
    if (!node || node.type !== 'folder') return [];
    return this.getChildren(node.id);
  }

  readFile(path: string): string | null {
    const node = this.getNodeByPath(path);
    if (!node || node.type !== 'file') return null;
    return node.content ?? '';
  }
}
