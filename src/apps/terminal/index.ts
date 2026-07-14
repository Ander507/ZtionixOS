import type { AppManifest } from '../../types'
import { fileSystem } from '../../core/fileSystem'
import { eventBus } from '../../core/eventBus'
import { launchApp } from '../../core/shortcutManager'
import { startPartyMode } from '../../core/partyMode'
import { getAppForPath } from '../../utils/fileBridge'
import { icon } from '../../utils/icons'

const COMMAND_HELP: Record<string, string> = {
  ls: 'ls [path]          List directory contents',
  cd: 'cd [path]          Change directory (default: home)',
  pwd: 'pwd                 Print working directory',
  cat: 'cat <file>          Print file contents',
  mkdir: 'mkdir <dir>         Create a directory',
  touch: 'touch <file>        Create an empty file or update timestamp',
  rm: 'rm [-r] <path>       Remove a file or directory (-r for recursive)',
  mv: 'mv <src> <dest>       Move or rename a file/directory',
  cp: 'cp <src> <dest>       Copy a file/directory to a destination',
  open: 'open <path>         Open a file in the default app',
  launch: 'launch <appId>      Launch an application',
  echo: 'echo <text>         Print text to the terminal',
  clear: 'clear               Clear the terminal screen',
  help: 'help [command]      Show help for a specific command',
  secret: 'secret              ???',
}

export const terminalApp: AppManifest = {
  id: 'terminal',
  name: 'Terminal',
  icon: icon('terminal'),
  pinned: true,
  launch: () => {
    const root = document.createElement('div')
    root.className = 'app-terminal'

    const output = document.createElement('div')
    output.className = 'terminal-output'

    let cwd = fileSystem.getHome()
    const history: string[] = []
    let historyIndex = -1

    const inputLine = document.createElement('div')
    inputLine.className = 'terminal-input-line'

    const prompt = document.createElement('span')
    prompt.className = 'terminal-prompt'

    const input = document.createElement('input')
    input.className = 'terminal-input'
    input.autocomplete = 'off'
    input.spellcheck = false

    inputLine.append(prompt, input)
    root.append(output, inputLine)

    const print = (text: string, className = '') => {
      const line = document.createElement('div')
      line.className = `terminal-line ${className}`.trim()
      line.textContent = text
      output.append(line)
      output.scrollTop = output.scrollHeight
    }

    const updatePrompt = () => {
      const short = cwd.replace('/home/user', '~')
      prompt.textContent = `user@ztionix:${short}$ `
    }

    const runCommand = (raw: string) => {
      const trimmed = raw.trim()
      if (!trimmed) { updatePrompt(); return }

      print(`${prompt.textContent}${trimmed}`)
      history.push(trimmed)
      historyIndex = history.length

      const parts = trimmed.split(/\s+/)
      const cmd = parts[0]
      const args = parts.slice(1)

      switch (cmd) {
        case 'help': {
          if (args[0]) {
            const entry = COMMAND_HELP[args[0]]
            if (entry) print(entry)
            else print(`help: no help topics match '${args[0]}'`, 'error')
            break
          }
          print('Available commands:')
          for (const entry of Object.values(COMMAND_HELP)) print(`  ${entry}`)
          print('')
          print('Type "help <command>" for details on a specific command.')
          break
        }
        case 'clear':
          output.innerHTML = ''
          break
        case 'pwd':
          print(cwd)
          break
        case 'ls': {
          const target = args[0] ? fileSystem.resolve(args[0], cwd) : cwd
          if (!fileSystem.isDirectory(target)) {
            print(`ls: cannot access '${args[0]}': Not a directory`, 'error')
            break
          }
          const entries = fileSystem.list(target)
          print(entries.map((e) => (e.type === 'directory' ? `${e.name}/` : e.name)).join('  ') || '')
          break
        }
        case 'cd': {
          const target = args[0] ? fileSystem.resolve(args[0], cwd) : fileSystem.getHome()
          if (!fileSystem.isDirectory(target)) {
            print(`cd: ${args[0] ?? ''}: No such directory`, 'error')
            break
          }
          cwd = target
          break
        }
        case 'cat': {
          if (!args[0]) { print('cat: missing file operand', 'error'); break }
          const target = fileSystem.resolve(args[0], cwd)
          if (!fileSystem.isFile(target)) { print(`cat: ${args[0]}: No such file`, 'error'); break }
          print(fileSystem.read(target) ?? '')
          break
        }
        case 'mkdir': {
          if (!args[0]) { print('mkdir: missing operand', 'error'); break }
          const target = fileSystem.resolve(args[0], cwd)
          if (!fileSystem.mkdir(target)) print(`mkdir: cannot create '${args[0]}'`, 'error')
          break
        }
        case 'touch': {
          if (!args[0]) { print('touch: missing file operand', 'error'); break }
          const target = fileSystem.resolve(args[0], cwd)
          if (!fileSystem.touch(target)) print(`touch: cannot touch '${args[0]}'`, 'error')
          break
        }
        case 'rm': {
          const recursive = args[0] === '-r'
          const operand = recursive ? args[1] : args[0]
          if (!operand) { print('rm: missing operand', 'error'); break }
          const target = fileSystem.resolve(operand, cwd)
          if (!fileSystem.remove(target, recursive)) {
            print(`rm: cannot remove '${operand}'${recursive ? '' : ' (use rm -r for directories)'}`, 'error')
          }
          break
        }
        case 'mv': {
          if (args.length < 2) { print('mv: missing operand', 'error'); break }
          const src = fileSystem.resolve(args[0], cwd)
          const dest = fileSystem.resolve(args[1], cwd)
          if (fileSystem.isDirectory(dest)) {
            const result = fileSystem.move(src, dest)
            if (!result) print(`mv: cannot move '${args[0]}' to '${args[1]}'`, 'error')
          } else {
            const parent = dest.split('/').slice(0, -1).join('/') || '/'
            const newName = dest.split('/').pop()!
            if (!fileSystem.move(src, parent)) {
              print(`mv: cannot move '${args[0]}'`, 'error')
              break
            }
            const movedPath = `${parent}/${src.split('/').pop()}`
            if (!fileSystem.rename(movedPath, newName)) print(`mv: cannot rename to '${newName}'`, 'error')
          }
          break
        }
        case 'cp': {
          if (args.length < 2) { print('cp: missing operand', 'error'); break }
          const src = fileSystem.resolve(args[0], cwd)
          const dest = fileSystem.resolve(args[1], cwd)
          const destDir = fileSystem.isDirectory(dest) ? dest : dest.split('/').slice(0, -1).join('/') || '/'
          if (!fileSystem.copy(src, destDir)) print(`cp: cannot copy '${args[0]}' to '${args[1]}'`, 'error')
          break
        }
        case 'open': {
          if (!args[0]) { print('open: missing file operand', 'error'); break }
          const target = fileSystem.resolve(args[0], cwd)
          if (!fileSystem.isFile(target)) { print(`open: ${args[0]}: No such file`, 'error'); break }
          const appId = getAppForPath(target)
          eventBus.emit('file:open', { path: target, appId })
          print(`Opened ${target} in ${appId}`)
          break
        }
        case 'launch': {
          if (!args[0]) { print('launch: missing app name', 'error'); break }
          launchApp(args[0])
          print(`Launched ${args[0]}`)
          break
        }
        case 'echo':
          print(args.join(' '))
          break
        case 'secret': {
          // hidden commands — party, pet, snake. not in help on purpose
          const msg = args.join(' ')
          if (msg === 'party') {
            startPartyMode(15000)
            print('ok fine. party mode.')
          } else if (msg === 'pet') {
            print('the pet is watching. probably.')
            const pet = document.querySelector('.desktop-pet-body')
            if (pet) {
              pet.textContent = '◉'
              window.setTimeout(() => { pet.textContent = '◉' }, 100)
            }
          } else {
            if (msg.length === 0) {
              print('try: secret party')
            } else {
              if (msg.indexOf('snake') >= 0) {
                launchApp('snake')
                print('snake time')
              } else {
                print('nothing happened. good.')
              }
            }
          }
          break
        }
        default:
          print(`${cmd}: command not found`, 'error')
      }

      updatePrompt()
    }

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        runCommand(input.value)
        input.value = ''
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        if (history.length === 0) return
        historyIndex = Math.max(0, historyIndex - 1)
        input.value = history[historyIndex] ?? ''
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        if (history.length === 0) return
        historyIndex = Math.min(history.length, historyIndex + 1)
        input.value = history[historyIndex] ?? ''
      }
    })

    root.addEventListener('click', () => input.focus())

    print('ZtionixOS Terminal — type "help" for commands')
    updatePrompt()
    setTimeout(() => input.focus(), 50)

    return root
  },
}
