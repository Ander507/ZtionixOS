import './styles/base.css';
import './styles/themes/dark.css';
import './styles/themes/light.css';
import './styles/shell.css';
import { Kernel } from './core/kernel';

const app = document.querySelector<HTMLDivElement>('#app')!;
document.documentElement.setAttribute('data-theme', 'dark');

const kernel = new Kernel(app);
kernel.init().catch(console.error);
