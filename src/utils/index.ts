export function generateId(): string {
  return crypto.randomUUID();
}

export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + 'ztionix-salt');
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function formatTime(date: Date, format: '12h' | '24h'): string {
  if (format === '24h') {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Record<string, string>,
  children?: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (key === 'className') element.className = value;
      else element.setAttribute(key, value);
    }
  }
  children?.forEach((child) => {
    if (typeof child === 'string') element.appendChild(document.createTextNode(child));
    else element.appendChild(child);
  });
  return element;
}

export function svgIcon(path: string, size = 16): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
}

export const ICONS = {
  folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
  file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>',
  explorer: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
  terminal: '<polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/>',
  settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  calculator: '<rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/>',
  notepad: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  browser: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
  store: '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  power: '<path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.77 0"/>',
  minimize: '<path d="M5 12h14"/>',
  maximize: '<rect width="18" height="18" x="3" y="3" rx="2"/>',
  close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  image: '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  paint: '<path d="m14.5 2-6 6"/><path d="M14 8 8 14"/><path d="m9 15 1 4 4-1 7-7-4-4Z"/><path d="m2 22 5.5-1.5L21.17 6.83a2.82 2.82 0 0 0-3.99-3.99L2 17l1 5Z"/>',
};

export const WALLPAPERS = [
  {
    id: 'aurora',
    name: 'Aurora',
    css: 'radial-gradient(ellipse 80% 60% at 20% 10%, rgba(108,92,231,0.55) 0%, transparent 55%), radial-gradient(ellipse 70% 50% at 85% 25%, rgba(0,206,201,0.4) 0%, transparent 55%), radial-gradient(ellipse 90% 70% at 50% 95%, rgba(232,67,147,0.35) 0%, transparent 60%), linear-gradient(160deg, #0f0c29 0%, #1a1440 50%, #24243e 100%)',
  },
  {
    id: 'nebula',
    name: 'Nebula',
    css: 'radial-gradient(circle at 25% 30%, rgba(162,155,254,0.5) 0%, transparent 45%), radial-gradient(circle at 75% 70%, rgba(253,121,168,0.4) 0%, transparent 50%), radial-gradient(circle at 60% 20%, rgba(116,185,255,0.35) 0%, transparent 40%), linear-gradient(135deg, #0a0a1a 0%, #16123a 60%, #0d0d24 100%)',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    css: 'radial-gradient(ellipse 100% 80% at 50% 110%, rgba(250,177,160,0.7) 0%, transparent 60%), radial-gradient(ellipse 80% 60% at 80% 90%, rgba(255,118,117,0.55) 0%, transparent 55%), linear-gradient(180deg, #2d3561 0%, #c05c7e 55%, #f3826f 85%, #ffb961 100%)',
  },
  {
    id: 'emerald',
    name: 'Emerald',
    css: 'radial-gradient(ellipse 70% 60% at 15% 20%, rgba(0,184,148,0.45) 0%, transparent 55%), radial-gradient(ellipse 60% 50% at 90% 80%, rgba(85,239,196,0.3) 0%, transparent 50%), linear-gradient(150deg, #0b1e1a 0%, #134e4a 55%, #0f2e2b 100%)',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    css: 'radial-gradient(ellipse 90% 70% at 70% 15%, rgba(52,73,148,0.5) 0%, transparent 55%), radial-gradient(ellipse 60% 50% at 20% 90%, rgba(72,52,148,0.4) 0%, transparent 50%), linear-gradient(165deg, #0a0e1f 0%, #141e30 50%, #1a2440 100%)',
  },
  {
    id: 'neon',
    name: 'Neon City',
    css: 'radial-gradient(ellipse 60% 50% at 80% 20%, rgba(232,67,147,0.4) 0%, transparent 50%), radial-gradient(ellipse 70% 60% at 15% 80%, rgba(9,132,227,0.45) 0%, transparent 55%), radial-gradient(ellipse 50% 40% at 55% 50%, rgba(108,92,231,0.3) 0%, transparent 50%), linear-gradient(135deg, #0a0a12 0%, #12122a 50%, #0d1530 100%)',
  },
  {
    id: 'ocean',
    name: 'Deep Ocean',
    css: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(116,185,255,0.4) 0%, transparent 55%), radial-gradient(ellipse 70% 60% at 80% 100%, rgba(0,206,201,0.35) 0%, transparent 55%), linear-gradient(180deg, #0a1628 0%, #0e2a47 55%, #0a3d62 100%)',
  },
  {
    id: 'blossom',
    name: 'Blossom',
    css: 'radial-gradient(ellipse 70% 60% at 20% 20%, rgba(253,121,168,0.45) 0%, transparent 55%), radial-gradient(ellipse 60% 50% at 85% 75%, rgba(162,155,254,0.4) 0%, transparent 50%), linear-gradient(140deg, #1a0f2e 0%, #2d1b4e 55%, #1f1235 100%)',
  },
];
