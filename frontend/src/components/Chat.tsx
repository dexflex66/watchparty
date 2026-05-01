import { useState, useEffect, useRef } from 'react'
import { ChatMessage } from '../types'

interface ChatProps {
  messages: ChatMessage[]
  onSend: (text: string) => void
  currentUserId: string
}

export default function Chat({ messages, onSend, currentUserId }: ChatProps) {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    const text = input.trim()
    if (!text) return
    onSend(text)
    setInput('')
  }

  return (
    <div className="flex flex-col flex-1 bg-gray-800 rounded-lg overflow-hidden min-h-0">
      <div className="px-3 py-2 border-b border-gray-700">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Chat</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {messages.map((msg) => {
          const isOwn = msg.senderId === currentUserId
          return (
            <div key={msg.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
              {!isOwn && (
                <span className="text-xs text-gray-400 mb-1 ml-1">{msg.senderName}</span>
              )}
              <div
                className={`px-3 py-2 rounded-lg text-sm max-w-[85%] break-words ${
                  isOwn ? 'bg-purple-600 text-white' : 'bg-gray-700 text-white'
                }`}
              >
                {msg.text}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div className="p-2 border-t border-gray-700 flex gap-2">
        <input
          className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-purple-500"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button
          onClick={handleSend}
          className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  )
}
