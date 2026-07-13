import type { AppDefinition, AppContext } from '../../types';
import { ICONS } from '../../utils';

function renderBrowser(_ctx: AppContext, container: HTMLElement): void {
  container.className = 'app-browser';
  container.innerHTML = `
    <div class="browser-toolbar">
      <button class="btn btn-ghost browser-back">←</button>
      <button class="btn btn-ghost browser-forward">→</button>
      <button class="btn btn-ghost browser-refresh">↻</button>
      <input type="text" class="browser-url" value="https://example.com" />
      <button class="btn btn-primary browser-go">Go</button>
    </div>
    <div class="browser-warning">
      External sites open in a sandboxed iframe. Some sites may block embedding.
    </div>
    <iframe class="browser-frame" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" src="https://example.com"></iframe>
  `;

  const urlInput = container.querySelector('.browser-url') as HTMLInputElement;
  const frame = container.querySelector('.browser-frame') as HTMLIFrameElement;
  const history: string[] = ['https://example.com'];
  let historyIdx = 0;

  const navigate = (url: string) => {
    let finalUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      finalUrl = 'https://' + url;
    }
    frame.src = finalUrl;
    urlInput.value = finalUrl;
    history.splice(historyIdx + 1);
    history.push(finalUrl);
    historyIdx = history.length - 1;
  };

  container.querySelector('.browser-go')?.addEventListener('click', () => navigate(urlInput.value));
  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') navigate(urlInput.value);
  });

  container.querySelector('.browser-back')?.addEventListener('click', () => {
    if (historyIdx > 0) {
      historyIdx--;
      frame.src = history[historyIdx];
      urlInput.value = history[historyIdx];
    }
  });

  container.querySelector('.browser-forward')?.addEventListener('click', () => {
    if (historyIdx < history.length - 1) {
      historyIdx++;
      frame.src = history[historyIdx];
      urlInput.value = history[historyIdx];
    }
  });

  container.querySelector('.browser-refresh')?.addEventListener('click', () => {
    frame.src = frame.src;
  });
}

export const browserApp: AppDefinition = {
  id: 'browser',
  name: 'Browser',
  icon: ICONS.browser,
  defaultSize: { width: 900, height: 600 },
  createWindow: renderBrowser,
};
