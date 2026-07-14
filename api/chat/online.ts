import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getOnlineCount } from '../_lib/store.js'

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  if (_req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const online = await getOnlineCount()
  res.status(200).json({ online })
}
