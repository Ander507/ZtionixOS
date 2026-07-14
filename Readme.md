# ZtionixOS

A desktop environment that runs entirely in your browser. ZtionixOS boots through a splash screen and login, then gives you a familiar shell — top bar, wallpaper desktop, dock, draggable windows, and 10 built-in apps — backed by a virtual file system persisted in **IndexedDB**.

Built with **Vite** and **vanilla TypeScript**. No React, no framework runtime — just direct DOM manipulation, a small event bus, and a window manager.

**Live demo:** [https://www.zymetrix.app/](https://www.zymetrix.app/) — click **Enter** on login (no password).

---

## Features

### Shell & desktop

- **Boot sequence** — splash screen, click-to-enter login, desktop reveal animation
- **Desktop** — draggable icons, grid snap, multi-select, marquee selection, right-click context menus
- **Window manager** — drag, resize, minimize, maximize, focus stacking, edge snapping, singleton apps
- **Dock** — pinned app launcher with running indicators
- **App launcher** — searchable overlay (`Ctrl+K`) with recent apps
- **Top bar** — system menu, active app title, notifications, theme toggle, clock with calendar popover
- **Notifications** — toast messages and a top-bar history panel
- **Session controls** — lock, log out, restart, shut down
- **Themes** — dark/light mode, accent colors, wallpapers, dock sizing
- **First-run onboarding** — Welcome.txt on Desktop + one-time welcome notification

### Files & storage

- **Virtual file system** — files and folders under `/home/user` (Desktop, Documents, Downloads)
- **IndexedDB persistence** — VFS stored in IndexedDB with localStorage migration fallback
- **Import/export** — drag-and-drop files onto desktop or Files app, download from VFS
- **File associations** — double-click opens the right app (text, images, audio)
- **Storage management** — export snapshot, clear Downloads, reset VFS, or Reset All in Settings

### Platform extras (beyond a typical guide)

- **Custom OS dialogs** — confirm, prompt, alert, and properties modals (no browser `alert`/`confirm`)
- **File picker** — native-style open dialog wired into Editor and Files
- **Drag-and-drop import** — drop files onto desktop or Files to add to the VFS
- **Window edge snapping** — drag windows to screen edges to tile them
- **Terminal bridge** — `open` and `launch` commands to open files and apps from the shell
- **PWA manifest** — installable as a standalone web app

---

## Built-in apps

| App | What it does |
|-----|----------------|
| **Files** | Browse folders, import/download files, cut/copy/paste, rename, delete, move-to picker |
| **Terminal** | `ls`, `cd`, `pwd`, `cat`, `mkdir`, `touch`, `rm`, `mv`, `cp`, `open`, `launch`, `echo`, `clear`, `help` |
| **Text Editor** | Open, edit, save, save as, export, find bar, word wrap, unsaved-changes prompt |
| **Calculator** | Keypad + keyboard input, dark/gold themed UI |
| **Browser** | Local homepage on launch, address bar, bookmarks, back/forward, sandboxed iframe |
| **Paint** | Brush, eraser, rectangle/circle tools, color picker, brush size slider, undo, save PNG |
| **ZMusic** | Import audio, Library + Downloads playlists, seek/volume controls, bottom player bar |
| **Messages** | Random 1-on-1 chat with other visitors, online counter, client + server word filter |
| **Settings** | Theme, wallpaper, accent color, dock size, storage/quota management, Reset All |
| **About** | System info and quick link to Settings |

**File associations:** `.txt` / `.md` → Editor · `.png` / `.jpg` / `.gif` → Paint · `.mp3` / `.wav` / `.ogg` → ZMusic

---

## Messages (live multiplayer chat)

Random 1-on-1 chat pairs two visitors who click **Find stranger** at the same time.

- **Online counter** — shows how many visitors are currently on the site
- **Word filter** — client-side and server-side filtering using bundled blocklists; blocked messages are rejected
- **Vercel API routes** — `join`, `poll`, `send`, `leave`, `online` under `/api/chat/`

**Production:** Connect [Upstash Redis](https://upstash.com/) to your Vercel project (see [DEPLOY.md](DEPLOY.md)). Without Redis, chat only works locally via `npx vercel dev`.

**Local API testing:**

```bash
npx vercel dev
```

---

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+

### Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Click **Enter** on the login screen — no password.

### Build & test

```bash
npm run build    # production build
npm run preview  # preview dist/
npm test         # run vitest tests
```

---

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

---

## Project structure

```
src/
├── main.ts                 # Entry point
├── types/                  # Shared TypeScript types and event map
├── core/
│   ├── kernel.ts           # Boots the shell and registers apps
│   ├── fileSystem.ts       # IndexedDB-backed VFS
│   ├── vfsStorage.ts       # IndexedDB + localStorage migration
│   ├── windowManager.ts    # Window lifecycle, snapping, layout
│   ├── eventBus.ts         # Pub/sub between components
│   ├── appRegistry.ts      # App manifest registry
│   ├── themeEngine.ts      # Theme and appearance settings
│   ├── shortcutManager.ts
│   ├── notificationService.ts
│   └── desktopLayout.ts    # Desktop icon positions
├── shell/
│   ├── bootManager.ts      # Splash → login → desktop
│   ├── desktop.ts          # Desktop icons, selection, drag-drop
│   ├── topbar.ts           # Menu bar, clock, notifications
│   ├── dock.ts             # Pinned app launcher bar
│   ├── appLauncher.ts      # Searchable app overlay
│   ├── confirmDialog.ts    # Custom OS-styled dialogs
│   ├── filePicker.ts       # File open picker
│   └── window.ts           # Window chrome and controls
├── apps/                   # One folder per built-in app
├── utils/                  # Icons, file bridge, chat client, drop zone
└── styles/                 # CSS themes and shell styling

api/
├── chat/                   # Vercel serverless chat routes
└── _lib/                   # Shared store + filter logic

lib/                        # Shared chat filter utilities
data/filters/               # NSFW + slur + extra wordlists
docs/                       # Devlogs and submission checklist
```

---

## Data and storage

| Key / store | Contents |
|-------------|----------|
| IndexedDB `ztionixos-vfs` | Virtual file system |
| `ztionixos-desktop-layout` | Desktop icon positions |
| `ztionixos-settings` | Theme, wallpaper, accent, dock size |
| `ztionixos-recent-apps` | App launcher recents |
| `ztionixos-onboarded` | First-run notification flag |

Files are stored as UTF-8 text or base64-encoded binary. Large imports may hit browser quota limits — use **Settings → Storage** to manage space.

---

## Deploy

See [DEPLOY.md](DEPLOY.md) for Vercel deployment and Upstash Redis setup.

See [docs/SUBMISSION.md](docs/SUBMISSION.md) for the Hack Club submission checklist.

---

## Tech stack

- **Vite 6** — dev server and bundler
- **TypeScript** — strict typing throughout
- **Tailwind CSS v4** — utility classes (`tw:` prefix) for boot/login screens
- **Vitest** — unit tests for VFS and file bridge
- **Vercel Serverless + Upstash Redis** — production chat backend
- **IBM Plex Sans / Mono** — UI and terminal fonts

---

## License

A [Hack Club](https://hackclub.com/) project by **Ander507**. All rights reserved unless otherwise noted.
