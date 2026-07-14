import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { Redis } from '@upstash/redis'
import type { ChatMessage, ChatRoom, JoinResult, WaitingUser } from './types.js'

const ROOM_TTL = 60 * 60
const MSG_LIMIT = 200
const PRESENCE_TTL_MS = 90_000
const DEV_STORE_PATH = join(process.cwd(), '.data', 'chat-state.json')

interface MemoryState {
  waiting: WaitingUser[]
  rooms: Record<string, ChatRoom>
  userRoom: Record<string, string>
  messages: Record<string, ChatMessage[]>
  presence: Record<string, number>
}

interface MemoryStore {
  waiting: WaitingUser[]
  rooms: Map<string, ChatRoom>
  userRoom: Map<string, string>
  messages: Map<string, ChatMessage[]>
  presence: Map<string, number>
}

function emptyState(): MemoryState {
  return { waiting: [], rooms: {}, userRoom: {}, messages: {}, presence: {} }
}

function toStore(state: MemoryState): MemoryStore {
  return {
    waiting: state.waiting,
    rooms: new Map(Object.entries(state.rooms)),
    userRoom: new Map(Object.entries(state.userRoom)),
    messages: new Map(Object.entries(state.messages)),
    presence: new Map(Object.entries(state.presence ?? {})),
  }
}

function fromStore(store: MemoryStore): MemoryState {
  return {
    waiting: store.waiting,
    rooms: Object.fromEntries(store.rooms),
    userRoom: Object.fromEntries(store.userRoom),
    messages: Object.fromEntries(store.messages),
    presence: Object.fromEntries(store.presence),
  }
}

function getGlobalStore(): MemoryStore {
  const g = globalThis as typeof globalThis & { __ztionixChat?: MemoryStore }
  if (!g.__ztionixChat) g.__ztionixChat = toStore(emptyState())
  return g.__ztionixChat
}

function loadFileStore(): MemoryStore {
  try {
    if (!existsSync(DEV_STORE_PATH)) return getGlobalStore()
    const raw = readFileSync(DEV_STORE_PATH, 'utf8')
    const parsed = JSON.parse(raw) as MemoryState
    const store = toStore(parsed)
    const g = globalThis as typeof globalThis & { __ztionixChat?: MemoryStore }
    g.__ztionixChat = store
    return store
  } catch {
    return getGlobalStore()
  }
}

function saveFileStore(store: MemoryStore): void {
  const dir = join(process.cwd(), '.data')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(DEV_STORE_PATH, JSON.stringify(fromStore(store), null, 0), 'utf8')
}

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

const redis = getRedis()
const useFileStore = !redis

function withMemory<T>(fn: (store: MemoryStore) => T): T {
  const store = useFileStore ? loadFileStore() : getGlobalStore()
  const result = fn(store)
  if (useFileStore) saveFileStore(store)
  return result
}

function roomId(): string {
  return `room_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function msgId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function touchPresence(store: MemoryStore, clientId: string): void {
  store.presence.set(clientId, Date.now())
  const cutoff = Date.now() - PRESENCE_TTL_MS
  for (const [id, ts] of store.presence) {
    if (ts < cutoff) store.presence.delete(id)
  }
}

function countOnlineFromStore(store: MemoryStore): number {
  const cutoff = Date.now() - PRESENCE_TTL_MS
  const ids = new Set<string>()
  for (const [id, ts] of store.presence) {
    if (ts >= cutoff) ids.add(id)
  }
  for (const w of store.waiting) ids.add(w.clientId)
  for (const id of store.userRoom.keys()) ids.add(id)
  return ids.size
}

async function redisTouchPresence(clientId: string): Promise<void> {
  const presence = (await redis!.get<Record<string, number>>('chat:presence')) ?? {}
  presence[clientId] = Date.now()
  const cutoff = Date.now() - PRESENCE_TTL_MS
  for (const [id, ts] of Object.entries(presence)) {
    if (ts < cutoff) delete presence[id]
  }
  await redis!.set('chat:presence', presence, { ex: 600 })
}

function memJoin(clientId: string, name: string): JoinResult {
  return withMemory((store) => {
    touchPresence(store, clientId)
    const existing = store.userRoom.get(clientId)
    if (existing) {
      const room = store.rooms.get(existing)
      if (room) {
        const partnerId = room.users.find((u) => u !== clientId)!
        return { status: 'matched', roomId: existing, partnerName: room.names[partnerId] ?? 'Stranger' }
      }
    }

    const partner = store.waiting.find((w) => w.clientId !== clientId)
    if (partner) {
      store.waiting = store.waiting.filter((w) => w.clientId !== clientId && w.clientId !== partner.clientId)
      const id = roomId()
      const room: ChatRoom = {
        id,
        users: [clientId, partner.clientId],
        names: { [clientId]: name, [partner.clientId]: partner.name },
        createdAt: Date.now(),
      }
      store.rooms.set(id, room)
      store.userRoom.set(clientId, id)
      store.userRoom.set(partner.clientId, id)
      store.messages.set(id, [])
      return { status: 'matched', roomId: id, partnerName: partner.name }
    }

    const existingWait = store.waiting.find((w) => w.clientId === clientId)
    if (existingWait) {
      existingWait.name = name
      existingWait.joinedAt = Date.now()
    } else {
      store.waiting.push({ clientId, name, joinedAt: Date.now() })
    }

    return { status: 'waiting' }
  })
}

async function redisJoin(clientId: string, name: string): Promise<JoinResult> {
  await redisTouchPresence(clientId)
  const existingRoom = await redis!.get<string>(`chat:user:${clientId}`)
  if (existingRoom) {
    const room = await redis!.get<ChatRoom>(`chat:room:${existingRoom}`)
    if (room) {
      const partnerId = room.users.find((u) => u !== clientId)!
      return { status: 'matched', roomId: existingRoom, partnerName: room.names[partnerId] ?? 'Stranger' }
    }
  }

  const waiting = (await redis!.get<WaitingUser[]>('chat:waiting')) ?? []
  const partner = waiting.find((w) => w.clientId !== clientId)

  if (partner) {
    const nextWaiting = waiting.filter((w) => w.clientId !== clientId && w.clientId !== partner.clientId)
    await redis!.set('chat:waiting', nextWaiting)

    const id = roomId()
    const room: ChatRoom = {
      id,
      users: [clientId, partner.clientId],
      names: { [clientId]: name, [partner.clientId]: partner.name },
      createdAt: Date.now(),
    }
    await redis!.set(`chat:room:${id}`, room, { ex: ROOM_TTL })
    await redis!.set(`chat:user:${clientId}`, id, { ex: ROOM_TTL })
    await redis!.set(`chat:user:${partner.clientId}`, id, { ex: ROOM_TTL })
    await redis!.set(`chat:msgs:${id}`, [], { ex: ROOM_TTL })
    return { status: 'matched', roomId: id, partnerName: partner.name }
  }

  const nextWaiting = [...waiting]
  const idx = nextWaiting.findIndex((w) => w.clientId === clientId)
  if (idx >= 0) {
    nextWaiting[idx] = { clientId, name, joinedAt: Date.now() }
  } else {
    nextWaiting.push({ clientId, name, joinedAt: Date.now() })
  }
  await redis!.set('chat:waiting', nextWaiting, { ex: 300 })
  return { status: 'waiting' }
}

export async function joinQueue(clientId: string, name: string): Promise<JoinResult> {
  return redis ? redisJoin(clientId, name) : memJoin(clientId, name)
}

function memPoll(roomId: string, clientId: string, after: number): ChatMessage[] {
  return withMemory((store) => {
    touchPresence(store, clientId)
    const room = store.rooms.get(roomId)
    if (!room || !room.users.includes(clientId)) return []
    const msgs = store.messages.get(roomId) ?? []
    return msgs.filter((m) => m.timestamp > after)
  })
}

async function redisPoll(roomId: string, clientId: string, after: number): Promise<ChatMessage[]> {
  await redisTouchPresence(clientId)
  const room = await redis!.get<ChatRoom>(`chat:room:${roomId}`)
  if (!room || !room.users.includes(clientId)) return []
  const msgs = (await redis!.get<ChatMessage[]>(`chat:msgs:${roomId}`)) ?? []
  return msgs.filter((m) => m.timestamp > after)
}

export async function pollMessages(roomId: string, clientId: string, after: number): Promise<ChatMessage[]> {
  return redis ? redisPoll(roomId, clientId, after) : memPoll(roomId, clientId, after)
}

function memSend(
  roomId: string,
  clientId: string,
  senderName: string,
  text: string,
  filtered: boolean,
): ChatMessage | null {
  return withMemory((store) => {
    const room = store.rooms.get(roomId)
    if (!room || !room.users.includes(clientId)) return null
    const msg: ChatMessage = {
      id: msgId(),
      roomId,
      senderId: clientId,
      senderName,
      text,
      filtered,
      timestamp: Date.now(),
    }
    const msgs = store.messages.get(roomId) ?? []
    msgs.push(msg)
    if (msgs.length > MSG_LIMIT) msgs.splice(0, msgs.length - MSG_LIMIT)
    store.messages.set(roomId, msgs)
    return msg
  })
}

async function redisSend(
  roomId: string,
  clientId: string,
  senderName: string,
  text: string,
  filtered: boolean,
): Promise<ChatMessage | null> {
  const room = await redis!.get<ChatRoom>(`chat:room:${roomId}`)
  if (!room || !room.users.includes(clientId)) return null
  const msg: ChatMessage = {
    id: msgId(),
    roomId,
    senderId: clientId,
    senderName,
    text,
    filtered,
    timestamp: Date.now(),
  }
  const msgs = (await redis!.get<ChatMessage[]>(`chat:msgs:${roomId}`)) ?? []
  msgs.push(msg)
  if (msgs.length > MSG_LIMIT) msgs.splice(0, msgs.length - MSG_LIMIT)
  await redis!.set(`chat:msgs:${roomId}`, msgs, { ex: ROOM_TTL })
  return msg
}

export async function sendMessage(
  roomId: string,
  clientId: string,
  senderName: string,
  text: string,
  filtered: boolean,
): Promise<ChatMessage | null> {
  return redis ? redisSend(roomId, clientId, senderName, text, filtered) : memSend(roomId, clientId, senderName, text, filtered)
}

function memLeave(clientId: string): void {
  withMemory((store) => {
    store.presence.delete(clientId)
    store.waiting = store.waiting.filter((w) => w.clientId !== clientId)
    const roomId = store.userRoom.get(clientId)
    if (!roomId) return
    store.userRoom.delete(clientId)
    const room = store.rooms.get(roomId)
    if (room) {
      const other = room.users.find((u) => u !== clientId)
      if (other) store.userRoom.delete(other)
      store.rooms.delete(roomId)
      store.messages.delete(roomId)
    }
  })
}

async function redisLeave(clientId: string): Promise<void> {
  const presence = (await redis!.get<Record<string, number>>('chat:presence')) ?? {}
  delete presence[clientId]
  await redis!.set('chat:presence', presence, { ex: 600 })

  const waiting = (await redis!.get<WaitingUser[]>('chat:waiting')) ?? []
  await redis!.set('chat:waiting', waiting.filter((w) => w.clientId !== clientId))

  const roomId = await redis!.get<string>(`chat:user:${clientId}`)
  if (!roomId) return
  await redis!.del(`chat:user:${clientId}`)
  const room = await redis!.get<ChatRoom>(`chat:room:${roomId}`)
  if (room) {
    const other = room.users.find((u) => u !== clientId)
    if (other) await redis!.del(`chat:user:${other}`)
    await redis!.del(`chat:room:${roomId}`)
    await redis!.del(`chat:msgs:${roomId}`)
  }
}

export async function leaveChat(clientId: string): Promise<void> {
  return redis ? redisLeave(clientId) : memLeave(clientId)
}

export function isRedisConfigured(): boolean {
  return redis !== null
}

function memGetOnline(): number {
  return withMemory((store) => countOnlineFromStore(store))
}

async function redisGetOnline(): Promise<number> {
  const presence = (await redis!.get<Record<string, number>>('chat:presence')) ?? {}
  const waiting = (await redis!.get<WaitingUser[]>('chat:waiting')) ?? []
  const cutoff = Date.now() - PRESENCE_TTL_MS
  const ids = new Set<string>()
  for (const [id, ts] of Object.entries(presence)) {
    if (ts >= cutoff) ids.add(id)
  }
  for (const w of waiting) ids.add(w.clientId)
  return ids.size
}

export async function getOnlineCount(): Promise<number> {
  return redis ? redisGetOnline() : memGetOnline()
}
