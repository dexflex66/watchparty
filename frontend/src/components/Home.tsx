import React, { useState } from 'react'
import { BACKEND_URL } from '../config'

interface HomeProps {
  onNavigateToRoom: (roomId: string, userId: string, userName: string) => void
}

export default function Home({ onNavigateToRoom }: HomeProps) {
  const [displayName, setDisplayName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)

  const userId = React.useRef(crypto.randomUUID()).current

  const handleCreate = async () => {
    if (!displayName.trim()) {
      setError('Enter your display name first')
      return
    }
    setCreating(true)
    setError('')
    try {
      const res = await fetch(`${BACKEND_URL}/api/rooms`, { method: 'POST' })
      if (!res.ok) throw new Error('Server error')
      const data = await res.json()
      onNavigateToRoom(data.roomId, userId, displayName.trim())
    } catch {
      setError('Failed to create room. Is the backend running?')
    } finally {
      setCreating(false)
    }
  }

  const handleJoin = () => {
    if (!displayName.trim()) {
      setError('Enter your display name first')
      return
    }
    if (!joinCode.trim()) {
      setError('Enter a room code')
      return
    }
    setError('')
    onNavigateToRoom(joinCode.trim(), userId, displayName.trim())
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center px-4">
      <div className="mb-10 text-center">
        <h1 className="text-5xl font-bold text-purple-400 mb-2">WatchParty</h1>
        <p className="text-gray-400 text-lg">Watch together, anywhere.</p>
      </div>

      <div className="w-full max-w-sm mb-6">
        <label className="block text-sm text-gray-400 mb-1">Your display name</label>
        <input
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
          placeholder="Enter your name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
        />
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xl">
        <div className="flex-1 bg-gray-800 border border-gray-700 rounded-xl p-6 flex flex-col gap-4">
          <h2 className="text-xl font-semibold text-white">Create a Room</h2>
          <p className="text-gray-400 text-sm">Start a new watch party and invite your friends.</p>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="mt-auto bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold py-2 rounded-lg transition-colors"
          >
            {creating ? 'Creating...' : 'Create Room'}
          </button>
        </div>

        <div className="flex-1 bg-gray-800 border border-gray-700 rounded-xl p-6 flex flex-col gap-4">
          <h2 className="text-xl font-semibold text-white">Join a Room</h2>
          <p className="text-gray-400 text-sm">Enter a room code to join your friends.</p>
          <input
            className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
            placeholder="Room code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          />
          <button
            onClick={handleJoin}
            className="bg-purple-600 hover:bg-purple-500 text-white font-semibold py-2 rounded-lg transition-colors"
          >
            Join Room
          </button>
        </div>
      </div>
    </div>
  )
}
