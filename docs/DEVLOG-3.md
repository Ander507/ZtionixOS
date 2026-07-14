# Devlog #3 — Live chat, moderation, and submission polish

ok so i had like half an hour before pushing and went through the apps that looked rough in screenshots lol

### Browser
it was opening hacker news on launch which felt weird. ripped that out. now it just shows a blank "ztionix browser" home screen until you actually type a url. added a home button too.

### Calculator
the `0` button text was sitting on the left and the display felt cramped. threw padding on the grid, centered everything with flex. operators get a little gold highlight on hover.

### Music → ZMusic
renamed it and rebuilt the layout. sidebar for playlists, track list in the middle, player bar on the bottom. volume slider lives in the bar now. imported tracks dedupe so you dont get the same file twice.

### Paint
eraser was leaving gray trails because it used `destination-out` instead of the actual canvas color. fixed that. added rect/circle tools and a brush size label.

---

## then i added Messages (the big one)

wanted something that felt alive when reviewers open the site — not just a fake desktop sitting there by itself.

**Messages app:**
- random 1-on-1 matching — two visitors click "find stranger" and get paired
- chat filter using my own wordlists (`filter_nsfw.txt` + `filter_slurs.txt` + extra roots like `fuck`, `pussy`, etc.)
- blocked messages get rejected entirely, not just starred out
- server-side filter too so you cant bypass it from the client
- online visitor counter so you can see other people on the site
- vercel api routes + upstash redis for production

**submission stuff:**
- welcome.txt on desktop with quick start hints
- first-run notification when you log in
- clock/calendar popover in the top bar (small thing but feels more like a real os)
- deploy guide in DEPLOY.md

**for reviewers:** no password. click Enter on login and youre in. try opening two tabs and matching in Messages.

live site: https://www.zymetrix.app/

— ander / Ander507
