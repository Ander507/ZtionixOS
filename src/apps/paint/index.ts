import type { AppDefinition, AppContext } from '../../types';
import { ICONS } from '../../utils';

function renderPaint(_ctx: AppContext, container: HTMLElement): void {
  container.className = 'app-paint';
  container.innerHTML = `
    <div class="paint-toolbar">
      <input type="color" class="paint-color" value="#6c5ce7" />
      <input type="range" class="paint-size" min="1" max="30" value="4" />
      <button class="btn btn-ghost paint-clear">Clear</button>
    </div>
    <canvas class="paint-canvas"></canvas>
  `;

  // add a button to the toolbar to save the canvas as an image
  const saveButton = document.createElement('button');
  saveButton.className = 'btn btn-ghost paint-save';
  saveButton.textContent = 'Save';
  container.querySelector('.paint-toolbar')?.appendChild(saveButton);
  saveButton.addEventListener('click', () => {
    const image = canvas.toDataURL('image/png');
    window.open(image, '_blank');
  });

  const canvas = container.querySelector('.paint-canvas') as HTMLCanvasElement;
  const ctx2d = canvas.getContext('2d')!;
  const colorInput = container.querySelector('.paint-color') as HTMLInputElement;
  const sizeInput = container.querySelector('.paint-size') as HTMLInputElement;

  const resize = () => {
    const rect = canvas.parentElement!.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height - 48; // 48 is the height of the toolbar
    ctx2d.fillStyle = '#ffffff';
    ctx2d.fillRect(0, 0, canvas.width, canvas.height);
  };

  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(container);

  let drawing = false;

  const getPos = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  canvas.addEventListener('mousedown', (e) => {
    drawing = true;
    const pos = getPos(e);
    ctx2d.beginPath();
    ctx2d.moveTo(pos.x, pos.y);
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!drawing) return;
    const pos = getPos(e);
    ctx2d.strokeStyle = colorInput.value;
    ctx2d.lineWidth = parseInt(sizeInput.value);
    ctx2d.lineCap = 'round';
    ctx2d.lineTo(pos.x, pos.y);
    ctx2d.stroke();
  });

  canvas.addEventListener('mouseup', () => { drawing = false; });
  canvas.addEventListener('mouseleave', () => { drawing = false; });

  container.querySelector('.paint-clear')?.addEventListener('click', () => {
    ctx2d.fillStyle = '#ffffff';
    ctx2d.fillRect(0, 0, canvas.width, canvas.height);
  });
}

export const paintApp: AppDefinition = {
  id: 'paint',
  name: 'Paint',
  icon: ICONS.paint,
  description: 'Draw and sketch on a digital canvas.',
  defaultSize: { width: 600, height: 450 },
  installable: true,
  createWindow: renderPaint,
};
