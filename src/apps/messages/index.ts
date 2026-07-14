import type { AppManifest } from '../../types'
import {
  chatJoin,
  chatLeave,
  chatOnline,
  chatPoll,
  chatSend,
  getClientId,
  randomDisplayName,
  type ChatMessage,
} from '../../utils/chatClient'
import { filterMessage } from '../../utils/chatFilter'
import { icon } from '../../utils/icons'

export const messagesApp: AppManifest = {
  id: 'messages',
  name: 'Messages',
  icon: icon('messages'),
  pinned: true,
  singleton: true,
  window: { width: 420, height: 520, minWidth: 360, minHeight: 400, centered: true },
  launch: () => {
    const root = document.createElement('div')
    root.className = 'app-messages'

    const clientId = getClientId()
    const displayName = randomDisplayName()
    let roomId: string | null = null
    let partnerName = ''
    let lastTimestamp = 0
    let pollTimer: number | null = null
    let matchTimer: number | null = null
    let onlineTimer: number | null = null
    let active = true
    const seenIds = new Set<string>()

    const status = document.createElement('div')
    status.className = 'messages-status'

    const statusText = document.createElement('span')
    statusText.className = 'messages-status-text'

    const onlineBadge = document.createElement('span')
    onlineBadge.className = 'messages-online'
    onlineBadge.textContent = '0 online'

    status.append(statusText, onlineBadge)

    const log = document.createElement('div')
    log.className = 'messages-log'

    const inputRow = document.createElement('div')
    inputRow.className = 'messages-input-row'

    const input = document.createElement('input')
    input.className = 'messages-input'
    input.placeholder = 'Type a message…'
    input.disabled = true

    const sendBtn = document.createElement('button')
    sendBtn.className = 'app-btn messages-send'
    sendBtn.textContent = 'Send'
    sendBtn.disabled = true

    const actions = document.createElement('div')
    actions.className = 'messages-actions'

    const findBtn = document.createElement('button')
    findBtn.className = 'app-btn messages-find'
    findBtn.textContent = 'Find stranger'

    const leaveBtn = document.createElement('button')
    leaveBtn.className = 'app-btn'
    leaveBtn.textContent = 'Leave chat'
    leaveBtn.hidden = true

    inputRow.append(input, sendBtn)
    actions.append(findBtn, leaveBtn)
    root.append(status, log, inputRow, actions)

    const setStatus = (text: string) => {
      statusText.textContent = text
    }

    const refreshOnline = async () => {
      const count = await chatOnline()
      onlineBadge.textContent = `${count} online`
    }

    const startOnlinePolling = () => {
      refreshOnline()
      onlineTimer = window.setInterval(refreshOnline, 5000)
    }

    const scrollLog = () => {
      log.scrollTop = log.scrollHeight
    }

    const addBubble = (msg: ChatMessage, mine: boolean) => {
      if (seenIds.has(msg.id)) return
      seenIds.add(msg.id)
      const row = document.createElement('div')
      row.className = `messages-bubble-row${mine ? ' messages-bubble-row--mine' : ''}`

      const bubble = document.createElement('div')
      bubble.className = `messages-bubble${msg.filtered ? ' messages-bubble--filtered' : ''}`
      bubble.textContent = msg.text

      const meta = document.createElement('div')
      meta.className = 'messages-meta'
      meta.textContent = mine ? 'You' : msg.senderName

      row.append(meta, bubble)
      log.append(row)
      scrollLog()
    }

    const addSystem = (text: string) => {
      const el = document.createElement('div')
      el.className = 'messages-system'
      el.textContent = text
      log.append(el)
      scrollLog()
    }

    const enableChat = () => {
      input.disabled = false
      sendBtn.disabled = false
      findBtn.hidden = true
      leaveBtn.hidden = false
      input.focus()
    }

    const disableChat = () => {
      input.disabled = true
      sendBtn.disabled = true
      findBtn.hidden = false
      leaveBtn.hidden = true
    }

    const stopPolling = () => {
      if (pollTimer) {
        window.clearInterval(pollTimer)
        pollTimer = null
      }
      if (matchTimer) {
        window.clearInterval(matchTimer)
        matchTimer = null
      }
      if (onlineTimer) {
        window.clearInterval(onlineTimer)
        onlineTimer = null
      }
    }

    const startPolling = () => {
      if (!roomId) return
      stopPolling()
      pollTimer = window.setInterval(async () => {
        if (!roomId || !active) return
        try {
          const { messages } = await chatPoll(roomId, clientId, lastTimestamp)
          for (const msg of messages) {
            lastTimestamp = Math.max(lastTimestamp, msg.timestamp)
            addBubble(msg, msg.senderId === clientId)
          }
        } catch {
          setStatus('Connection lost. Try leaving and finding a new stranger.')
        }
      }, 1500)
    }

    const onMatched = (id: string, partner: string) => {
      if (matchTimer) {
        window.clearInterval(matchTimer)
        matchTimer = null
      }
      roomId = id
      partnerName = partner
      lastTimestamp = Date.now()
      seenIds.clear()
      log.innerHTML = ''
      setStatus(`Connected to ${partnerName}`)
      addSystem(`You matched with ${partnerName}. Say hi!`)
      enableChat()
      startPolling()
    }

    const findStranger = async () => {
      stopPolling()
      roomId = null
      disableChat()
      log.innerHTML = ''
      setStatus('Looking for someone online…')
      addSystem('Searching for another visitor…')

      try {
        const result = await chatJoin(clientId, displayName)
        if (result.status === 'matched' && result.roomId && result.partnerName) {
          onMatched(result.roomId, result.partnerName)
          return
        }

        matchTimer = window.setInterval(async () => {
          if (!active || roomId) return
          try {
            const retry = await chatJoin(clientId, displayName)
            if (retry.status === 'matched' && retry.roomId && retry.partnerName) {
              if (matchTimer) {
                window.clearInterval(matchTimer)
                matchTimer = null
              }
              onMatched(retry.roomId, retry.partnerName)
            }
          } catch {
            setStatus('Chat server unavailable. Deploy with Redis or run vercel dev.')
          }
        }, 1000)
      } catch {
        setStatus('Chat server unavailable. Deploy to Vercel or run vercel dev locally.')
        addSystem('Real-time chat needs the API routes running (Vercel deployment).')
      }
    }

    const sendMessage = async () => {
      const raw = input.value.trim()
      if (!raw || !roomId) return

      const { filtered } = await filterMessage(raw)
      if (filtered) {
        addSystem('Message blocked — inappropriate language is not allowed.')
        input.value = ''
        return
      }

      input.value = ''

      try {
        const { message } = await chatSend(roomId, clientId, displayName, raw)
        lastTimestamp = Math.max(lastTimestamp, message.timestamp)
        addBubble(message, true)
      } catch {
        addSystem('Failed to send message.')
      }
    }

    findBtn.addEventListener('click', findStranger)
    leaveBtn.addEventListener('click', async () => {
      stopPolling()
      await chatLeave(clientId)
      roomId = null
      disableChat()
      setStatus('Left the chat')
      addSystem('You left the conversation.')
      startOnlinePolling()
    })

    sendBtn.addEventListener('click', sendMessage)
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendMessage()
    })

    setStatus(`Signed in as ${displayName}`)
    addSystem('Click "Find stranger" to match with another visitor on the site.')
    startOnlinePolling()

    const cleanup = () => {
      active = false
      stopPolling()
      chatLeave(clientId)
    }

    window.addEventListener('beforeunload', cleanup)

    const el = root as HTMLElement & { destroy?: () => void }
    el.destroy = () => {
      cleanup()
      window.removeEventListener('beforeunload', cleanup)
    }

    return root
  },
}
