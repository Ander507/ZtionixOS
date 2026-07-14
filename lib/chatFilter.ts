export function parseFilterFile(text: string): string[] {
  return text
    .split(/[\n,]+/)
    .map((w) => w.trim().toLowerCase())
    .filter((w) => w.length > 1)
}

export function buildPattern(word: string): RegExp {
  const parts = word.split(/\s+/).map((part) =>
    part
      .split('')
      .map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('\\W*'),
  )
  const core = parts.join('\\W+')
  if (word.length <= 4 && !word.includes(' ')) {
    return new RegExp(`(?<!\\w)${core}(?!\\w)`, 'gi')
  }
  return new RegExp(core, 'gi')
}

export function applyFilter(text: string, words: string[]): { text: string; filtered: boolean } {
  let result = text
  let filtered = false

  for (const word of words) {
    const pattern = buildPattern(word)
    if (pattern.test(result)) {
      filtered = true
      result = result.replace(pattern, (match) => '*'.repeat(match.length))
    }
  }

  const collapsed = result.toLowerCase().replace(/[^a-z0-9]/g, '')
  for (const word of words) {
    const normalized = word.replace(/\s+/g, '')
    if (normalized.length < 4) continue
    if (collapsed.includes(normalized)) {
      const pattern = buildPattern(word)
      if (pattern.test(result)) {
        filtered = true
        result = result.replace(pattern, (match) => '*'.repeat(match.length))
      }
    }
  }

  return { text: result, filtered }
}
