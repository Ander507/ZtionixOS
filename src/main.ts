import './styles/tailwind.css'
import './styles/base.css'
import './styles/shell.css'
import './styles/window.css'
import './styles/themes/dark.css'
import './styles/themes/light.css'
import './styles/boot.css'
import { BootManager } from './shell/bootManager'
import { initFileSystem } from './core/fileSystem'

const app = document.querySelector<HTMLDivElement>('#app')

if (app) {
  initFileSystem().then(() => new BootManager(app))
}
