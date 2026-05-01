import { Platform } from '../types'
import { Socket } from 'socket.io-client'

interface PlatformSelectorProps {
  current: Platform
  roomId: string
  socket: Socket
}

const PLATFORMS: { id: Platform; label: string }[] = [
  { id: 'youtube', label: 'YouTube' },
  { id: 'netflix', label: 'Netflix' },
  { id: 'prime', label: 'Prime' },
]

export default function PlatformSelector({ current, roomId, socket }: PlatformSelectorProps) {
  const handleSelect = (platform: Platform) => {
    if (platform === current) return
    socket.emit('video-source', { roomId, platform, videoId: null })
  }

  return (
    <div className="bg-gray-800 rounded-lg p-3">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
        Platform
      </h3>
      <div className="flex gap-2">
        {PLATFORMS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => handleSelect(id)}
            className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              current === id
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
