# ZtionixOS

A desktop environment that runs entirely in your browser. ZtionixOS boots through a splash screen and login, then gives you a familiar shell — top bar, wallpaper desktop, dock, draggable windows, and a set of built-in apps — all backed by a virtual file system stored in `localStorage`.

Built with **Vite** and **vanilla TypeScript**. No React, no framework runtime — just direct DOM manipulation, a small event bus, and a window manager.

## Features

- **Boot sequence** — splash screen, login overlay, desktop reveal
- **Desktop** — draggable icons, grid snap, multi-select, marquee selection, context menus
- **Virtual file system** — files and folders under `/home/user`, with import/export, move, copy, and binary support
- **Window manager** — drag, resize, minimize, maximize, focus stacking, singleton apps
- **App launcher** — searchable overlay with recent apps
- **Notifications** — toast messages and a top-bar history panel
- **Session controls** — lock, log out, restart, shut down
- **Themes** — dark/light mode, accent colors, wallpapers, dock sizing

## Built-in apps

| App | Description |
|-----|-------------|
| **Files** | Browse, import, download, cut/copy/paste, rename, delete |
| **Terminal** | `ls`, `cd`, `cat`, `mkdir`, `touch`, `rm`, `mv`, `cp`, and more |
| **Text Editor** | Open, edit, save, save as, export |
| **Calculator** | Keypad and keyboard input |
| **Browser** | Address bar with sandboxed iframe browsing |
| **Paint** | Canvas drawing, save PNG to Downloads |
| **ZMusic** | Import audio, playlists, playback controls |
| **Settings** | Appearance, desktop wallpaper, storage management |
| **About** | System info |

Double-clicking a file on the desktop opens it in the right app: text → Editor, images → Paint, audio → ZMusic.

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+

### Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Sign in as **Admin** to reach the desktop.

### Build for production

```bash
npm run build
npm run preview
```

## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Open app launcher |
| `Ctrl/Cmd + L` | Lock session |
| `Ctrl/Cmd + ,` | Open Settings |
| `Alt + Tab` | Cycle open windows |
| `Delete` | Delete selected desktop items |
| `F2` | Rename selected desktop item |
| `Ctrl/Cmd + A` | Select all desktop icons |
| `Shift + drag` | Free-place desktop icon (no grid snap) |

## Project structure

```
src/
├── main.ts              # Entry point
├── types/               # Shared TypeScript types and event map
├── core/
│   ├── kernel.ts        # Boots the shell and registers apps
│   ├── fileSystem.ts    # localStorage-backed VFS
│   ├── windowManager.ts # Window lifecycle and layout
│   ├── eventBus.ts      # Pub/sub between components
│   ├── appRegistry.ts   # App manifest registry
│   ├── themeEngine.ts   # Theme and appearance settings
│   ├── shortcutManager.ts
│   ├── notificationService.ts
│   └── desktopLayout.ts # Desktop icon positions
├── shell/
│   ├── bootManager.ts   # Splash → login → desktop
│   ├── desktop.ts       # Desktop icons and selection
│   ├── topbar.ts        # Menu bar, clock, notifications
│   ├── dock.ts          # Pinned app launcher bar
│   ├── appLauncher.ts   # Searchable app overlay
│   └── window.ts        # Window chrome and controls
├── apps/                # One folder per built-in app
└── styles/              # CSS themes and shell styling
```

## Data and storage

All user data lives in the browser:

| Key | Contents |
|-----|----------|
| `ztionixos-vfs` | Virtual file system |
| `ztionixos-desktop-layout` | Desktop icon positions |
| `ztionixos-settings` | Theme, wallpaper, accent, dock size |
| `ztionixos-recent-apps` | App launcher recents |

Files are stored as UTF-8 text or base64-encoded binary in `localStorage`. Large imports may hit browser quota limits — Settings → Storage lets you export a snapshot, clear Downloads, reset the VFS, or **Reset All** back to factory defaults.

## Tech stack

- **Vite 6** — dev server and bundler
- **TypeScript** — strict typing throughout
- **Tailwind CSS v4** — utility classes (with `tw:` prefix) for boot/login screens
- **IBM Plex Sans / Mono** — UI and terminal fonts

## License

A [Hack Club](https://hackclub.com/) project by **Ander507**. All rights reserved unless otherwise noted.
