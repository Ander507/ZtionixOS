# ZtionixOS

A full-featured web-based operating system that runs entirely in your browser. Built with Vite and TypeScript.

## Features

- **Desktop environment** with wallpaper, icons, and draggable/resizable windows
- **Taskbar & Start Menu** with app search, clock, and system tray
- **Virtual file system** persisted in IndexedDB
- **Multi-user login** with PIN authentication (default admin PIN: `1234`)
- **Built-in apps**: File Explorer, Terminal, Settings, Calculator, Notepad, Browser, App Store
- **App Store** to install additional apps (Music Player, Paint)
- **Themes** — dark/light mode, accent colors, wallpapers
- **Notifications** with toast alerts and notification center
- **Keyboard shortcuts** — `Win`/`Meta` for Start Menu, `Alt+Tab` to switch windows

## Getting Started

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`).

### Build for production

```bash
npm run build
npm run preview
```

## Default Login

| User | PIN |
|------|-----|
| Administrator | `1234` |
| Guest | No PIN required |

## Terminal Commands

`ls`, `cd`, `cat`, `mkdir`, `touch`, `rm`, `pwd`, `whoami`, `clear`, `help`, `theme`

## Tech Stack

- Vite + TypeScript
- IndexedDB (via `idb`)
- xterm.js (terminal emulator)
- CSS custom properties for theming

## License

MIT
