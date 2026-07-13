import type { AppDefinition, AppContext } from '../../types';
import { ICONS } from '../../utils';

function renderMusicPlayer(_ctx: AppContext, container: HTMLElement): void {
  container.className = 'app-music';
  container.innerHTML = `
    <div class="music-visual">
      <div class="music-disc"><svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg></div>
    </div>
    <div class="music-info">
      <h3>Demo Track</h3>
      <p>ZtionixOS Theme</p>
    </div>
    <div class="music-progress">
      <div class="music-progress-bar"></div>
    </div>
    <div class="music-controls">
      <button class="btn btn-ghost music-prev">⏮</button>
      <button class="btn btn-primary music-play">▶ Play</button>
      <button class="btn btn-ghost music-next">⏭</button>
    </div>
    <p class="music-note">Music playback is simulated in this demo.</p>
  `;

  let playing = false;
  const playBtn = container.querySelector('.music-play') as HTMLButtonElement;
  const progressBar = container.querySelector('.music-progress-bar') as HTMLElement;
  const disc = container.querySelector('.music-disc') as HTMLElement;

  playBtn.addEventListener('click', () => {
    playing = !playing;
    playBtn.textContent = playing ? '⏸ Pause' : '▶ Play';
    disc.classList.toggle('playing', playing);
    if (playing) {
      let progress = 0;
      const interval = setInterval(() => {
        if (!playing) { clearInterval(interval); return; }
        progress = (progress + 1) % 100;
        progressBar.style.width = `${progress}%`;
      }, 200);
    }
  });
}

export const musicPlayerApp: AppDefinition = {
  id: 'musicplayer',
  name: 'Music Player',
  icon: ICONS.music,
  description: 'A simple music player for your tunes.',
  defaultSize: { width: 380, height: 420 },
  installable: true,
  createWindow: renderMusicPlayer,
};
