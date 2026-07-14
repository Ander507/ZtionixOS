import type { VercelRequest, VercelResponse } from '@vercel/node'
import { joinQueue, isRedisConfigured } from '../_lib/store.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { clientId, name } = req.body ?? {}
  if (!clientId || typeof clientId !== 'string') {
    res.status(400).json({ error: 'clientId required' })
    return
  }

  const displayName = typeof name === 'string' && name.trim() ? name.trim().slice(0, 24) : 'Stranger'
  const result = await joinQueue(clientId, displayName)
  res.status(200).json({ ...result, redis: isRedisConfigured() })
}
