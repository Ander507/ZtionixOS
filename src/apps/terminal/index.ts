import type { AppDefinition, AppContext } from '../../types';
import { ICONS } from '../../utils';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

function renderTerminal(ctx: AppContext, container: HTMLElement): () => void {
  container.className = 'app-terminal';
  const termEl = document.createElement('div');
  termEl.className = 'terminal-container';
  container.appendChild(termEl);

  const term = new Terminal({
    theme: {
      background: '#1a1a2e',
      foreground: '#e0e0e0',
      cursor: '#6c5ce7',
    },
    fontFamily: 'Consolas, "Courier New", monospace',
    fontSize: 14,
  });

  const fitAddon = new FitAddon();
  term.loadAddon(fitAddon);
  term.open(termEl);
  fitAddon.fit();

  const fs = ctx.kernel.fileSystem;
  let cwd = fs.getHomePath();
  const user = ctx.kernel.userManager.currentUser;

  const writeln = (text: string) => term.writeln(text);
  const write = (text: string) => term.write(text);

  const resolvePath = (path: string): string => {
    if (path.startsWith('/')) return path.replace(/\/+/g, '/');
    const parts = cwd.split('/').filter(Boolean);
    for (const p of path.split('/')) {
      if (p === '..') parts.pop();
      else if (p !== '.' && p) parts.push(p);
    }
    return '/' + parts.join('/');
  };

  const prompt = () => write(`\r\n\x1b[35m${user?.username ?? 'user'}\x1b[0m:\x1b[34m${cwd}\x1b[0m$ `);

  const commands: Record<string, (args: string[]) => void | Promise<void>> = {
    help: () => {
      writeln('Available commands:');
      writeln('  ls [path]     - List directory contents');
      writeln('  cd <path>     - Change directory');
      writeln('  cat <file>    - Display file contents');
      writeln('  mkdir <name>  - Create directory');
      writeln('  touch <name>  - Create empty file');
      writeln('  rm <path>     - Delete file or folder');
      writeln('  pwd           - Print working directory');
      writeln('  whoami        - Print current user');
      writeln('  clear         - Clear terminal');
      writeln('  theme <name>  - Switch theme (dark/light)');
    },
    ls: (args) => {
      const path = resolvePath(args[0] || '.');
      const items = fs.listDir(path);
      if (items.length === 0) writeln('(empty)');
      else writeln(items.map((i) => (i.type === 'folder' ? `\x1b[34m${i.name}/\x1b[0m` : i.name)).join('  '));
    },
    cd: (args) => {
      if (!args[0]) { cwd = fs.getHomePath(); return; }
      const path = resolvePath(args[0]);
      const node = fs.getNodeByPath(path);
      if (!node || node.type !== 'folder') writeln(`cd: ${args[0]}: No such directory`);
      else cwd = path;
    },
    cat: (args) => {
      if (!args[0]) { writeln('cat: missing file operand'); return; }
      const content = fs.readFile(resolvePath(args[0]));
      if (content === null) writeln(`cat: ${args[0]}: No such file`);
      else writeln(content);
    },
    mkdir: async (args) => {
      if (!args[0]) { writeln('mkdir: missing operand'); return; }
      const result = await fs.createFolder(cwd, args[0]);
      if (!result) writeln(`mkdir: cannot create directory '${args[0]}'`);
    },
    touch: async (args) => {
      if (!args[0]) { writeln('touch: missing operand'); return; }
      const result = await fs.createFile(cwd, args[0], '');
      if (!result) writeln(`touch: cannot create '${args[0]}'`);
    },
    rm: async (args) => {
      if (!args[0]) { writeln('rm: missing operand'); return; }
      const ok = await fs.delete(resolvePath(args[0]));
      if (!ok) writeln(`rm: cannot remove '${args[0]}'`);
    },
    pwd: () => writeln(cwd),
    whoami: () => writeln(user?.username ?? 'guest'),
    clear: () => term.clear(),
    theme: async (args) => {
      const t = args[0];
      if (t !== 'dark' && t !== 'light') {
        writeln('theme: usage: theme <dark|light>');
        return;
      }
      await ctx.kernel.userManager.updateSettings({ theme: t });
      ctx.kernel.themeEngine.apply();
      writeln(`Theme set to ${t}`);
    },
  };

  let input = '';
  writeln('ZtionixOS Terminal v1.0');
  writeln('Type "help" for available commands.');
  prompt();

  const dataHandler = term.onData((data) => {
    const code = data.charCodeAt(0);
    if (code === 13) {
      const parts = input.trim().split(/\s+/);
      const cmd = parts[0]?.toLowerCase() ?? '';
      const args = parts.slice(1);
      if (cmd) {
        const handler = commands[cmd];
        if (handler) {
          const result = handler(args);
          if (result && typeof (result as Promise<void>).then === 'function') {
            (result as Promise<void>).then(() => prompt());
            input = '';
            return;
          }
        } else {
          writeln(`\x1b[31mCommand not found: ${cmd}\x1b[0m`);
        }
      }
      input = '';
      prompt();
    } else if (code === 127) {
      if (input.length > 0) {
        input = input.slice(0, -1);
        term.write('\b \b');
      }
    } else if (code >= 32) {
      input += data;
      term.write(data);
    }
  });

  const resizeObserver = new ResizeObserver(() => fitAddon.fit());
  resizeObserver.observe(termEl);

  return () => {
    dataHandler.dispose();
    resizeObserver.disconnect();
    term.dispose();
  };
}

export const terminalApp: AppDefinition = {
  id: 'terminal',
  name: 'Terminal',
  icon: ICONS.terminal,
  defaultSize: { width: 700, height: 420 },
  createWindow: renderTerminal,
};
