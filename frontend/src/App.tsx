import { useState, useEffect } from 'react'
import Home from './components/Home'
import Room from './components/Room'

type Page = 'home' | 'room'

interface RoomData {
  roomId: string
  userId: string
  userName: string
}

export default function App() {
  const [page, setPage] = useState<Page>('home')
  const [roomData, setRoomData] = useState<RoomData | null>(null)

  // On load, check if URL matches /room/:id pattern
  useEffect(() => {
    const match = window.location.pathname.match(/^\/room\/([^/]+)/)
    if (match) {
      const roomId = match[1]
      const params = new URLSearchParams(window.location.search)
      const userId = params.get('userId') || crypto.randomUUID()
      const userName = params.get('userName') || 'Guest'
      setRoomData({ roomId, userId, userName })
      setPage('room')
    }
  }, [])

  const navigateToRoom = (roomId: string, userId: string, userName: string) => {
    const url = `/room/${roomId}?userId=${encodeURIComponent(userId)}&userName=${encodeURIComponent(userName)}`
    window.history.pushState({}, '', url)
    setRoomData({ roomId, userId, userName })
    setPage('room')
  }

  if (page === 'room' && roomData) {
    return (
      <Room
        roomId={roomData.roomId}
        userId={roomData.userId}
        userName={roomData.userName}
      />
    )
  }

  return <Home onNavigateToRoom={navigateToRoom} />
}
