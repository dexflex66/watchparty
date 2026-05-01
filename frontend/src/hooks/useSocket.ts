import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { BACKEND_URL } from '../config'

export function useSocket(): Socket {
  const socketRef = useRef<Socket | null>(null)

  if (!socketRef.current) {
    socketRef.current = io(BACKEND_URL, { autoConnect: true })
  }

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect()
    }
  }, [])

  return socketRef.current
}
