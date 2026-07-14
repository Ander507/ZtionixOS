import { applyFilter, parseFilterFile } from '../../lib/chatFilter'

let cachedWords: string[] | null = null

async function loadWords(): Promise<string[]> {
  if (cachedWords) return cachedWords
  const [nsfwRes, slursRes, extraRes] = await Promise.all([
    fetch('/filters/filter_nsfw.txt'),
    fetch('/filters/filter_slurs.txt'),
    fetch('/filters/filter_extra.txt'),
  ])
  const nsfw = await nsfwRes.text()
  const slurs = await slursRes.text()
  const extra = await extraRes.text()
  const all = new Set([
    ...parseFilterFile(nsfw),
    ...parseFilterFile(slurs),
    ...parseFilterFile(extra),
  ])
  cachedWords = [...all].sort((a, b) => b.length - a.length)
  return cachedWords
}

export async function filterMessage(text: string): Promise<{ text: string; filtered: boolean }> {
  const words = await loadWords()
  return applyFilter(text, words)
}
