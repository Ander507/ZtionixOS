export interface ChatMessage {
  id: string
  roomId: string
  senderId: string
  senderName: string
  text: string
  filtered: boolean
  timestamp: number
}

export interface ChatRoom {
  id: string
  users: [string, string]
  names: Record<string, string>
  createdAt: number
}

export interface WaitingUser {
  clientId: string
  name: string
  joinedAt: number
}

export type JoinResult =
  | { status: 'waiting' }
  | { status: 'matched'; roomId: string; partnerName: string }
