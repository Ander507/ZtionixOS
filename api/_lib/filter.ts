import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { applyFilter, parseFilterFile } from '../../lib/chatFilter.js'

let cachedWords: string[] | null = null

function loadWords(): string[] {
  if (cachedWords) return cachedWords
  const dir = join(process.cwd(), 'data', 'filters')
  const nsfw = readFileSync(join(dir, 'filter_nsfw.txt'), 'utf8')
  const slurs = readFileSync(join(dir, 'filter_slurs.txt'), 'utf8')
  const extra = readFileSync(join(dir, 'filter_extra.txt'), 'utf8')
  const all = new Set([
    ...parseFilterFile(nsfw),
    ...parseFilterFile(slurs),
    ...parseFilterFile(extra),
  ])
  cachedWords = [...all].sort((a, b) => b.length - a.length)
  return cachedWords
}

export function filterText(text: string): { text: string; filtered: boolean } {
  return applyFilter(text, loadWords())
}
