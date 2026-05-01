import { useEffect, useRef, useState, useCallback } from 'react'
import SimplePeer from 'simple-peer'
import { Socket } from 'socket.io-client'
import { Participant } from '../types'

interface UseVoiceChatOptions {
  socket: Socket
  roomId: string
  localUserId: string
  participants: Participant[]
  enabled: boolean
}

interface UseVoiceChatResult {
  isMuted: boolean
  toggleMute: () => void
  localStream: MediaStream | null
}

export function useVoiceChat({
  socket,
  roomId,
  localUserId,
  participants,
  enabled,
}: UseVoiceChatOptions): UseVoiceChatResult {
  const [isMuted, setIsMuted] = useState(false)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const peersRef = useRef<Map<string, SimplePeer.Instance>>(new Map())
  const streamRef = useRef<MediaStream | null>(null)
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map())

  const destroyPeer = useCallback((userId: string) => {
    const peer = peersRef.current.get(userId)
    if (peer) {
      peer.destroy()
      peersRef.current.delete(userId)
    }
    const audio = audioElementsRef.current.get(userId)
    if (audio) {
      audio.remove()
      audioElementsRef.current.delete(userId)
    }
  }, [])

  const attachStream = useCallback((userId: string, stream: MediaStream) => {
    let audio = audioElementsRef.current.get(userId)
    if (!audio) {
      audio = document.createElement('audio')
      audio.autoplay = true
      document.body.appendChild(audio)
      audioElementsRef.current.set(userId, audio)
    }
    audio.srcObject = stream
  }, [])

  const createPeer = useCallback(
    (targetUserId: string, initiator: boolean, stream: MediaStream) => {
      destroyPeer(targetUserId)

      const peer = new SimplePeer({ initiator, stream, trickle: true })

      peer.on('signal', (data) => {
        if (data.type === 'offer') {
          socket.emit('webrtc-offer', { roomId, targetUserId, signal: data })
        } else if (data.type === 'answer') {
          socket.emit('webrtc-answer', { roomId, targetUserId, signal: data })
        } else {
          socket.emit('webrtc-ice-candidate', { roomId, targetUserId, signal: data })
        }
      })

      peer.on('stream', (remoteStream) => {
        attachStream(targetUserId, remoteStream)
      })

      peer.on('error', () => destroyPeer(targetUserId))
      peer.on('close', () => destroyPeer(targetUserId))

      peersRef.current.set(targetUserId, peer)
      return peer
    },
    [socket, roomId, destroyPeer, attachStream]
  )

  useEffect(() => {
    if (!enabled) {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      setLocalStream(null)
      peersRef.current.forEach((_, id) => destroyPeer(id))
      return
    }

    let cancelled = false

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        setLocalStream(stream)

        participants.forEach((p) => {
          if (p.id === localUserId) return
          const initiator = localUserId > p.id
          createPeer(p.id, initiator, stream)
        })
      })
      .catch(() => {
        // mic denied — stay silent
      })

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      setLocalStream(null)
      peersRef.current.forEach((_, id) => destroyPeer(id))
    }
  }, [enabled]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!enabled || !streamRef.current) return

    const handleOffer = ({
      fromUserId,
      signal,
    }: {
      fromUserId: string
      signal: SimplePeer.SignalData
    }) => {
      let peer = peersRef.current.get(fromUserId)
      if (!peer && streamRef.current) {
        peer = createPeer(fromUserId, false, streamRef.current)
      }
      peer?.signal(signal)
    }

    const handleAnswer = ({
      fromUserId,
      signal,
    }: {
      fromUserId: string
      signal: SimplePeer.SignalData
    }) => {
      peersRef.current.get(fromUserId)?.signal(signal)
    }

    const handleIce = ({
      fromUserId,
      signal,
    }: {
      fromUserId: string
      signal: SimplePeer.SignalData
    }) => {
      peersRef.current.get(fromUserId)?.signal(signal)
    }

    socket.on('webrtc-offer', handleOffer)
    socket.on('webrtc-answer', handleAnswer)
    socket.on('webrtc-ice-candidate', handleIce)

    return () => {
      socket.off('webrtc-offer', handleOffer)
      socket.off('webrtc-answer', handleAnswer)
      socket.off('webrtc-ice-candidate', handleIce)
    }
  }, [enabled, socket, createPeer])

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev
      streamRef.current?.getAudioTracks().forEach((t) => {
        t.enabled = !next
      })
      return next
    })
  }, [])

  return { isMuted, toggleMute, localStream }
}
