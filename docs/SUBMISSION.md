# Hack Club Submission Checklist

## Live demo

**URL:** https://www.zymetrix.app/

**Login:** Click **Enter** on the login screen — no password required.

## Requirements met

| Requirement | Status |
|-------------|--------|
| Working webpage with draggable windows | Yes — window manager with drag, resize, minimize, maximize |
| Looks like your own (not a guide clone) | Yes — dark/gold Ztionix branding, 10 apps, custom shell |
| At least 3 devlogs | Post devlogs #1–#3 on Hack Club (see `docs/DEVLOG-3.md` for #3) |
| At least 1 feature not in the guide | Yes — Messages (random chat + filter), ZMusic playlists, IndexedDB VFS, window snapping |
| No password | Yes — click-to-enter login only |

## What to try on the demo

1. Click **Enter** to reach the desktop
2. Read **Welcome.txt** on the Desktop
3. Open **Messages** → **Find stranger** (open a second browser/incognito tab to match)
4. Open **ZMusic**, **Paint**, or **Terminal** from the dock
5. Click the **clock** in the top bar for the calendar popover

## Features beyond the guide

- Random 1-on-1 **Messages** with server-side word filter
- **ZMusic** with playlists (Library + Downloads)
- **IndexedDB** virtual file system with import/export
- Custom OS **dialogs** (no browser alert/confirm)
- **Window edge snapping**
- **Drag-and-drop** file import to desktop
- **Online visitor counter** in Messages

## Deploy / chat setup

See [DEPLOY.md](../DEPLOY.md) for Vercel + Upstash Redis instructions.
