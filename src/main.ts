import './styles/base.css'
import './styles/shell.css'
import './styles/window.css'
import './styles/themes/dark.css'
import './styles/themes/light.css'
import './styles/boot.css'
import './styles/extras.css'
import { BootManager } from './shell/bootManager'
import { initFileSystem } from './core/fileSystem'

const app = document.querySelector<HTMLDivElement>('#app')

if (app) {
  // vfs first, then boot — desktop icons need files ready
  initFileSystem().then(() => {
    new BootManager(app)
  })
} else {
  console.error('ztionix: no #app element found')
}
