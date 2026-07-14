import type { VercelRequest, VercelResponse } from '@vercel/node'
import { pollMessages } from '../_lib/store.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const roomId = String(req.query.roomId ?? '')
  const clientId = String(req.query.clientId ?? '')
  const after = Number(req.query.after ?? 0)

  if (!roomId || !clientId) {
    res.status(400).json({ error: 'roomId and clientId required' })
    return
  }

  const messages = await pollMessages(roomId, clientId, after)
  res.status(200).json({ messages })
}
