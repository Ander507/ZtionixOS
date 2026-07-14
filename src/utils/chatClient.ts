export function getClientId(): string {  const key = 'ztionixos-chat-id'
  let id = sessionStorage.getItem(key)
  if (!id) {
    id = `u_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    sessionStorage.setItem(key, id)
  }
  return id
}

export function randomDisplayName(): string {
  const names = ['Nova', 'Echo', 'Pixel', 'Orbit', 'Flux', 'Drift', 'Cipher', 'Lumen', 'Vanta', 'Astra']
  const pick = names[Math.floor(Math.random() * names.length)]
  const num = Math.floor(1000 + Math.random() * 9000)
  return `${pick}-${num}`
}

export interface ChatMessage {
  id: string
  roomId: string
  senderId: string
  senderName: string
  text: string
  filtered: boolean
  timestamp: number
}

export async function chatJoin(clientId: string, name: string) {
  const res = await fetch('/api/chat/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, name }),
  })
  if (!res.ok) throw new Error('Join failed')
  return res.json() as Promise<{
    status: 'waiting' | 'matched'
    roomId?: string
    partnerName?: string
    redis?: boolean
  }>
}

export async function chatPoll(roomId: string, clientId: string, after: number) {
  const res = await fetch(`/api/chat/poll?roomId=${encodeURIComponent(roomId)}&clientId=${encodeURIComponent(clientId)}&after=${after}`)
  if (!res.ok) throw new Error('Poll failed')
  return res.json() as Promise<{ messages: ChatMessage[] }>
}

export async function chatSend(roomId: string, clientId: string, name: string, text: string) {
  const res = await fetch('/api/chat/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomId, clientId, name, text }),
  })
  if (!res.ok) throw new Error('Send failed')
  return res.json() as Promise<{ message: ChatMessage }>
}

export async function chatLeave(clientId: string) {
  await fetch('/api/chat/leave', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId }),
  })
}

export async function chatOnline(): Promise<number> {
  try {
    const res = await fetch('/api/chat/online')
    if (!res.ok) return 0
    const data = await res.json() as { online: number }
    return data.online
  } catch {
    return 0
  }
}
