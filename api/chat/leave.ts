import type { VercelRequest, VercelResponse } from '@vercel/node'
import { leaveChat } from '../_lib/store.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { clientId } = req.body ?? {}
  if (!clientId || typeof clientId !== 'string') {
    res.status(400).json({ error: 'clientId required' })
    return
  }

  await leaveChat(clientId)
  res.status(200).json({ ok: true })
}
