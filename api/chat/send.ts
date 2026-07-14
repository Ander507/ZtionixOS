import type { VercelRequest, VercelResponse } from '@vercel/node'
import { filterText } from '../_lib/filter.js'
import { sendMessage } from '../_lib/store.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { roomId, clientId, name, text } = req.body ?? {}
  if (!roomId || !clientId || typeof text !== 'string') {
    res.status(400).json({ error: 'roomId, clientId, and text required' })
    return
  }

  const trimmed = text.trim().slice(0, 500)
  if (!trimmed) {
    res.status(400).json({ error: 'Empty message' })
    return
  }

  const { text: filteredText, filtered } = filterText(trimmed)
  if (filtered) {
    res.status(400).json({ error: 'Message blocked by filter' })
    return
  }

  const displayName = typeof name === 'string' && name.trim() ? name.trim().slice(0, 24) : 'Stranger'
  const msg = await sendMessage(roomId, clientId, displayName, filteredText, false)

  if (!msg) {
    res.status(403).json({ error: 'Not in this room' })
    return
  }

  res.status(200).json({ message: msg })
}
